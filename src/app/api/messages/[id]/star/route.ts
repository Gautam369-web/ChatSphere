import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await context.params;

  try {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isStarred: !message.isStarred },
    });

    return NextResponse.json({ isStarred: updated.isStarred });
  } catch (error: any) {
    console.error("Error starring message:", error);
    return NextResponse.json({ error: "Failed to star message" }, { status: 500 });
  }
}
