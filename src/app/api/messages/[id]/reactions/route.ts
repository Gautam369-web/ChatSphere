import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reactionSchema } from "@/lib/validations/message";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await context.params;
  const userId = session.user.id;

  try {
    const body = await req.json();
    const result = reactionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    const { emoji } = result.data;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: message.conversationId,
          userId,
        },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if reaction already exists
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      // Toggle off / delete reaction
      await prisma.reaction.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ action: "removed", emoji, userId, messageId });
    } else {
      // Add reaction
      const reaction = await prisma.reaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
        },
      });
      return NextResponse.json({ action: "added", reaction });
    }
  } catch (error: any) {
    console.error("Error managing reaction:", error);
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }
}
