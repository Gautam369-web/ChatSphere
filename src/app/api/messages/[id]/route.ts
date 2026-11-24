import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import sanitizeHtml from "sanitize-html";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editMessageSchema } from "@/lib/validations/message";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = params;
  const userId = session.user.id;

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.senderId !== userId) {
      return NextResponse.json({ error: "Forbidden: You can only edit your own messages" }, { status: 403 });
    }

    if (message.deletedAt) {
      return NextResponse.json({ error: "Cannot edit a deleted message" }, { status: 400 });
    }

    const body = await req.json();
    const result = editMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid content", details: result.error.flatten() }, { status: 400 });
    }

    const sanitized = sanitizeHtml(result.data.content, {
      allowedTags: [],
      allowedAttributes: {},
    });

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: sanitized,
        editedAt: new Date(),
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
              select: { id: true, name: true, username: true },
            },
          },
        },
        reactions: true,
        attachments: true,
        statuses: true,
      },
    });

    return NextResponse.json({ message: updated });
  } catch (error: any) {
    console.error("Error editing message:", error);
    return NextResponse.json({ error: "Failed to edit message" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = params;
  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const deleteForEveryone = searchParams.get("everyone") === "true";

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (deleteForEveryone) {
      if (message.senderId !== userId) {
        return NextResponse.json({ error: "Only the sender can delete for everyone" }, { status: 403 });
      }

      await prisma.message.update({
        where: { id: messageId },
        data: {
          content: "This message was deleted",
          deletedAt: new Date(),
          mediaUrl: null,
          fileName: null,
          voiceWaveform: null,
        },
      });

      return NextResponse.json({ message: "Deleted for everyone", deletedForEveryone: true });
    } else {
      // Delete for me (append userId to deletedFor array)
      const currentDeletedFor = message.deletedFor || [];
      if (!currentDeletedFor.includes(userId)) {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            deletedFor: {
              push: userId,
            },
          },
        });
      }

      return NextResponse.json({ message: "Deleted for you", deletedForEveryone: false });
    }
  } catch (error: any) {
    console.error("Error deleting message:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
