import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

    const pinned = await prisma.pinnedMessage.upsert({
      where: { messageId },
      create: {
        conversationId: message.conversationId,
        messageId,
        pinnedById: userId,
      },
      update: {},
      include: {
        message: {
          include: {
            sender: {
              select: { id: true, name: true, username: true, image: true },
            },
          },
        },
      },
    });

    await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: true },
    });

    return NextResponse.json({ action: "pinned", pin: pinned });
  } catch (error: any) {
    console.error("Error pinning message:", error);
    return NextResponse.json({ error: "Failed to pin message" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = params;

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await prisma.pinnedMessage.deleteMany({
      where: { messageId },
    });

    await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: false },
    });

    return NextResponse.json({ action: "unpinned", messageId });
  } catch (error: any) {
    console.error("Error unpinning message:", error);
    return NextResponse.json({ error: "Failed to unpin message" }, { status: 500 });
  }
}
