import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        role: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !["USER", "MODERATOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role or userId" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, username: true, role: true },
    });

    return NextResponse.json({ message: "User role updated", user: updated });
  } catch (error: any) {
    console.error("Admin role update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
