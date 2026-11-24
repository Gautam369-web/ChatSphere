import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.id;

  try {
    const body = await req.json();
    const rawCode = (body.code || "").toString().trim().toUpperCase();

    if (!rawCode || rawCode.length < 3) {
      return NextResponse.json(
        { error: "Please enter a valid Direct ID / Room Code (at least 3 characters)" },
        { status: 400 }
      );
    }

    // 1. Check if the code belongs to another user's personal Direct ID / connectCode
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { connectCode: rawCode },
          { username: rawCode.toLowerCase() },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        connectCode: true,
      },
    });

    if (targetUser && targetUser.id !== currentUserId) {
      // Find existing 1-to-1 conversation between current user and target user
      let conv = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId: currentUserId } } },
            { members: { some: { userId: targetUser.id } } },
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
                  connectCode: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              sender: { select: { id: true, name: true, username: true } },
            },
          },
        },
      });

      if (!conv) {
        // Create direct chat
        conv = await prisma.conversation.create({
          data: {
            isGroup: false,
            members: {
              create: [
                { userId: currentUserId, role: "MEMBER" },
                { userId: targetUser.id, role: "MEMBER" },
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
                    connectCode: true,
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
              include: {
                sender: { select: { id: true, name: true, username: true } },
              },
            },
          },
        });
      }

      return NextResponse.json({
        conversation: conv,
        connectedWith: targetUser.name || targetUser.username,
        message: `Connected directly with ${targetUser.name || targetUser.username}!`,
      });
    }

    // 2. Check if the code matches a Shared Room Code (inviteCode on Conversation)
    let roomConv = await prisma.conversation.findFirst({
      where: { inviteCode: rawCode },
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
                connectCode: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    if (roomConv) {
      // Check if user is already a member
      const isMember = roomConv.members.some((m) => m.userId === currentUserId);
      if (!isMember) {
        await prisma.conversationMember.create({
          data: {
            conversationId: roomConv.id,
            userId: currentUserId,
            role: "MEMBER",
          },
        });

        // Re-fetch with new member
        roomConv = await prisma.conversation.findUnique({
          where: { id: roomConv.id },
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
                    connectCode: true,
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
              include: {
                sender: { select: { id: true, name: true, username: true } },
              },
            },
          },
        });
      }

      return NextResponse.json({
        conversation: roomConv,
        message: `Joined shared room #${rawCode}!`,
      });
    }

    // 3. If no room exists yet with this code, create a dedicated private direct pairing room with this code!
    const newRoom = await prisma.conversation.create({
      data: {
        name: `Room #${rawCode}`,
        inviteCode: rawCode,
        isGroup: true,
        description: `Direct private room created with code ${rawCode}`,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${rawCode}`,
        members: {
          create: [{ userId: currentUserId, role: "OWNER" }],
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
                connectCode: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    return NextResponse.json({
      conversation: newRoom,
      message: `Room #${rawCode} created! Share code "${rawCode}" with your partner so they can connect instantly.`,
    });
  } catch (error: any) {
    console.error("Connect code error:", error);
    return NextResponse.json(
      { error: "Failed to connect via code" },
      { status: 500 }
    );
  }
}
