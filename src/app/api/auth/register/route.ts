import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, username, email, password } = result.data;
    const lowerEmail = email.toLowerCase().trim();
    const lowerUsername = username.toLowerCase().trim();

    // Check existing email
    const existingEmail = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Check existing username
    const existingUsername = await prisma.user.findUnique({
      where: { username: lowerUsername },
    });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique 5-digit connect code e.g. 45632
    const connectCode = Math.floor(10000 + Math.random() * 90000).toString();

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        name,
        username: lowerUsername,
        email: lowerEmail,
        connectCode,
        password: hashedPassword,
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        profile: {
          create: {
            theme: "dark",
            notificationsEnabled: true,
            soundEnabled: true,
            privacyLastSeen: "everyone",
            privacyReadReceipts: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "Account created successfully", user },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while creating account" },
      { status: 500 }
    );
  }
}
