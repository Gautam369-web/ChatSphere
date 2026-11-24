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
    const reports = await prisma.report.findMany({
      include: {
        reporter: {
          select: { id: true, name: true, username: true, email: true },
        },
        reportedUser: {
          select: { id: true, name: true, username: true, email: true },
        },
        message: {
          select: { id: true, content: true, type: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error("Admin reports error:", error);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { reportId, status } = body; // "RESOLVED" | "DISMISSED"

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { status },
    });

    return NextResponse.json({ message: "Report status updated", report: updated });
  } catch (error: any) {
    console.error("Admin update report error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
