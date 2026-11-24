import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Accepted Contacts
    const contacts = await prisma.contact.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, email: true, image: true, bio: true, statusMessage: true, isOnline: true, lastSeen: true },
        },
        receiver: {
          select: { id: true, name: true, username: true, email: true, image: true, bio: true, statusMessage: true, isOnline: true, lastSeen: true },
        },
      },
    });

    // 2. Pending Received Requests
    const receivedRequests = await prisma.contact.findMany({
      where: {
        receiverId: userId,
        status: "PENDING",
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, email: true, image: true, bio: true, statusMessage: true, isOnline: true, lastSeen: true },
        },
      },
    });

    // 3. Pending Sent Requests
    const sentRequests = await prisma.contact.findMany({
      where: {
        senderId: userId,
        status: "PENDING",
      },
      include: {
        receiver: {
          select: { id: true, name: true, username: true, email: true, image: true, bio: true, statusMessage: true, isOnline: true, lastSeen: true },
        },
      },
    });

    const formattedContacts = contacts.map((c) => {
      const friend = c.senderId === userId ? c.receiver : c.sender;
      return {
        contactId: c.id,
        user: friend,
      };
    });

    return NextResponse.json({
      contacts: formattedContacts,
      receivedRequests,
      sentRequests,
    });
  } catch (error: any) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
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
    const { targetUsername, targetUserId } = body;

    let target = null;
    if (targetUserId) {
      target = await prisma.user.findUnique({ where: { id: targetUserId } });
    } else if (targetUsername) {
      target = await prisma.user.findUnique({ where: { username: targetUsername.toLowerCase().trim() } });
    }

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.id === userId) {
      return NextResponse.json({ error: "Cannot add yourself as a contact" }, { status: 400 });
    }

    // Check existing relationship
    const existing = await prisma.contact.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: target.id },
          { senderId: target.id, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        return NextResponse.json({ message: "You are already connected with this user" });
      }
      return NextResponse.json({ message: "A request is already pending between you" });
    }

    const newRequest = await prisma.contact.create({
      data: {
        senderId: userId,
        receiverId: target.id,
        status: "PENDING",
      },
      include: {
        receiver: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
    });

    return NextResponse.json({ message: "Friend request sent!", request: newRequest }, { status: 201 });
  } catch (error: any) {
    console.error("Error sending contact request:", error);
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
  }
}
