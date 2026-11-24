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
    const totalUsers = await prisma.user.count();
    const totalMessages = await prisma.message.count();
    const totalConversations = await prisma.conversation.count();
    const totalReports = await prisma.report.count({ where: { status: "PENDING" } });

    // Recent 24 hour messages
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messagesLast24h = await prisma.message.count({
      where: { createdAt: { gte: oneDayAgo } },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalMessages,
        totalConversations,
        pendingReports: totalReports,
        messagesLast24h,
      },
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
