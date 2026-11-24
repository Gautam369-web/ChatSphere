import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
      createdAt: true,
      profile: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name,
      username,
      bio,
      statusMessage,
      image,
      theme,
      soundEnabled,
      notificationsEnabled,
      privacyLastSeen,
      privacyReadReceipts,
    } = result.data;

    // If username is changing, verify availability
    if (username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase().trim(),
          NOT: { id: session.user.id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username: username.toLowerCase().trim() }),
        ...(bio !== undefined && { bio }),
        ...(statusMessage !== undefined && { statusMessage }),
        ...(image !== undefined && { image }),
        profile: {
          upsert: {
            create: {
              ...(theme !== undefined && { theme }),
              ...(soundEnabled !== undefined && { soundEnabled }),
              ...(notificationsEnabled !== undefined && { notificationsEnabled }),
              ...(privacyLastSeen !== undefined && { privacyLastSeen }),
              ...(privacyReadReceipts !== undefined && { privacyReadReceipts }),
            },
            update: {
              ...(theme !== undefined && { theme }),
              ...(soundEnabled !== undefined && { soundEnabled }),
              ...(notificationsEnabled !== undefined && { notificationsEnabled }),
              ...(privacyLastSeen !== undefined && { privacyLastSeen }),
              ...(privacyReadReceipts !== undefined && { privacyReadReceipts }),
            },
          },
        },
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
        profile: true,
      },
    });

    return NextResponse.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
