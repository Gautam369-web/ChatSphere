import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { action } = body; // "ACCEPT" | "DECLINE"

    const request = await prisma.contact.findUnique({ where: { id } });
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.receiverId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "ACCEPT") {
      const updated = await prisma.contact.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });
      return NextResponse.json({ message: "Request accepted", contact: updated });
    } else {
      await prisma.contact.delete({ where: { id } });
      return NextResponse.json({ message: "Request declined" });
    }
  } catch (error: any) {
    console.error("Error updating contact request:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const userId = session.user.id;

  try {
    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.senderId !== userId && contact.receiverId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ message: "Contact removed" });
  } catch (error: any) {
    console.error("Error deleting contact:", error);
    return NextResponse.json({ error: "Failed to remove contact" }, { status: 500 });
  }
}
