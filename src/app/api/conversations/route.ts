import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createConversationSchema } from "@/lib/validations/message";
import { resolveMessageStatus } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true,
                bio: true,
                statusMessage: true,
                role: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true,
                role: true,
                isOnline: true,
                lastSeen: true,
              },
            },
            reactions: true,
            statuses: {
              select: {
                userId: true,
                status: true,
              },
            },
          },
        },
        pinnedMessages: {
          include: {
            message: {
              include: {
                sender: {
                  select: { id: true, name: true, username: true, email: true, image: true, role: true, isOnline: true, lastSeen: true },
                },
                reactions: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Calculate unread counts in a single batch query instead of N+1 per-conversation counts
    const convLastReadMap = new Map<string, number>();
    let minLastRead = new Date();
    const convIds: string[] = [];

    for (const conv of conversations) {
      convIds.push(conv.id);
      const myMember = conv.members.find((m) => m.userId === userId);
      const lr = myMember?.lastReadAt ? new Date(myMember.lastReadAt) : new Date(0);
      convLastReadMap.set(conv.id, lr.getTime());
      if (lr < minLastRead) minLastRead = lr;
    }

    const unreadCountsMap = new Map<string, number>();
    if (convIds.length > 0) {
      const recentUnreadCandidates = await prisma.message.findMany({
        where: {
          conversationId: { in: convIds },
          createdAt: { gt: minLastRead },
          senderId: { not: userId },
        },
        select: {
          conversationId: true,
          createdAt: true,
        },
      });

      for (const msg of recentUnreadCandidates) {
        const threshold = convLastReadMap.get(msg.conversationId) ?? 0;
        if (msg.createdAt.getTime() > threshold) {
          unreadCountsMap.set(msg.conversationId, (unreadCountsMap.get(msg.conversationId) || 0) + 1);
        }
      }
    }

    const formatted = conversations.map((conv) => {
      const formattedMessages = conv.messages.map((msg) => ({
        ...msg,
        status: resolveMessageStatus(msg, conv.members),
      }));

      return {
        ...conv,
        messages: formattedMessages,
        unreadCount: unreadCountsMap.get(conv.id) || 0,
      };
    });

    return NextResponse.json({ conversations: formatted });
  } catch (error: any) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Failed to load chats" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const result = createConversationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.flatten() }, { status: 400 });
    }

    const { recipientId, isGroup, name, description, memberIds, isPublic, isChannel } = result.data;

    // Handle 1-to-1 conversation
    if (!isGroup) {
      if (!recipientId) {
        return NextResponse.json({ error: "Recipient ID is required for direct chat" }, { status: 400 });
      }

      if (recipientId === userId) {
        return NextResponse.json({ error: "Cannot create chat with yourself" }, { status: 400 });
      }

      // Check if direct conversation already exists
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: recipientId } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true,
                  image: true,
                  bio: true,
                  statusMessage: true,
                  role: true,
                  isOnline: true,
                  lastSeen: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              sender: {
                select: { id: true, name: true, username: true, email: true, image: true, role: true, isOnline: true, lastSeen: true },
              },
              reactions: true,
            },
          },
        },
      });

      if (existing) {
        return NextResponse.json({ conversation: existing });
      }

      // Create new 1-to-1 conversation
      const newConv = await prisma.conversation.create({
        data: {
          isGroup: false,
          members: {
            create: [
              { userId, role: "MEMBER" },
              { userId: recipientId, role: "MEMBER" },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  email: true,
                  image: true,
                  bio: true,
                  statusMessage: true,
                  role: true,
                  isOnline: true,
                  lastSeen: true,
                },
              },
            },
          },
          messages: true,
        },
      });

      return NextResponse.json({ conversation: newConv }, { status: 201 });
    }

    // Handle Group conversation
    if (!name?.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const uniqueMemberIds = Array.from(new Set([userId, ...(memberIds || [])]));

    const newGroup = await prisma.conversation.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isGroup: true,
        isChannel: isChannel || false,
        isPublic: isPublic || false,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        members: {
          create: uniqueMemberIds.map((mId) => ({
            userId: mId,
            role: mId === userId ? "OWNER" : "MEMBER",
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true,
                bio: true,
                statusMessage: true,
                role: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: true,
      },
    });

    return NextResponse.json({ conversation: newGroup }, { status: 201 });
  } catch (error: any) {
    console.error("Conversation creation error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
