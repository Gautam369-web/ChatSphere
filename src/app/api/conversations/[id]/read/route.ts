import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await context.params;
  const userId = session.user.id;

  try {
    // Update reader's lastReadAt
    await prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { lastReadAt: new Date() },
    });

    // Mark all other members' messages in this chat as SEEN for this user
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
      },
      select: { id: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    for (const msg of unreadMessages) {
      await prisma.messageStatus.upsert({
        where: {
          messageId_userId: {
            messageId: msg.id,
            userId,
          },
        },
        create: {
          messageId: msg.id,
          userId,
          status: "SEEN",
        },
        update: {
          status: "SEEN",
        },
      });
    }

    return NextResponse.json({ success: true, count: unreadMessages.length });
  } catch (error: any) {
    console.error("Error marking messages read:", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
