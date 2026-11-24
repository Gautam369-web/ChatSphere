import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  try {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } }, // exclude oneself
          q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { username: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
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
      take: 20,
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
