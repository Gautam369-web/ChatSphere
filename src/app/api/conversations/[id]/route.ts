import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
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
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check membership
    const isMember = conversation.members.some((m) => m.userId === session.user.id);
    if (!isMember && !conversation.isPublic) {
      return NextResponse.json({ error: "You are not a member of this chat" }, { status: 403 });
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await req.json();
    const { name, description, avatar, isPublic } = body;

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: session.user.id,
        },
      },
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return NextResponse.json({ error: "Only admins can edit group details" }, { status: 403 });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(avatar !== undefined && { avatar }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json({ conversation: updated });
  } catch (error: any) {
    console.error("Error updating conversation:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: session.user.id,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 404 });
    }

    // If owner of group, delete conversation entirely
    if (member.role === "OWNER") {
      await prisma.conversation.delete({ where: { id } });
      return NextResponse.json({ message: "Conversation deleted" });
    }

    // Otherwise leave the group
    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({ message: "Left conversation" });
  } catch (error: any) {
    console.error("Error leaving conversation:", error);
    return NextResponse.json({ error: "Failed to leave conversation" }, { status: 500 });
  }
}
