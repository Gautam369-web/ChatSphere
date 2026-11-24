import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import sanitizeHtml from "sanitize-html";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMessageSchema } from "@/lib/validations/message";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await context.params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  try {
    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a member" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        // Exclude messages deleted for this user
        NOT: {
          deletedFor: {
            has: session.user.id,
          },
        },
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
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
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        attachments: true,
        statuses: {
          select: {
            userId: true,
            status: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id || null;
    }

    // Return messages in chronological ascending order for chat window rendering
    return NextResponse.json({
      messages: messages.reverse(),
      nextCursor,
    });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await context.params;
  const userId = session.user.id;

  try {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a member of this chat" }, { status: 403 });
    }

    const body = await req.json();
    const result = sendMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid message payload", details: result.error.flatten() }, { status: 400 });
    }

    const { content, type, replyToId, mediaUrl, fileName, fileSize, voiceDuration, voiceWaveform } = result.data;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: "Message must contain text or media" }, { status: 400 });
    }

    // Sanitize content against XSS
    const sanitizedContent = content
      ? sanitizeHtml(content, {
          allowedTags: [], // plain text only, no raw HTML
          allowedAttributes: {},
        })
      : null;

    // Create message with initial status
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: sanitizedContent,
        type,
        replyToId: replyToId || null,
        mediaUrl: mediaUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        voiceDuration: voiceDuration || null,
        voiceWaveform: voiceWaveform || null,
        statuses: {
          create: {
            userId,
            status: "SENT",
          },
        },
      },
      include: {
        sender: {
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
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        reactions: true,
        attachments: true,
        statuses: true,
      },
    });

    // Update conversation updatedAt timestamp & sender's lastReadAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
