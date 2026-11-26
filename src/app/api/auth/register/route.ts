import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { sendOtpEmail, sendLoginAlertEmail } from "@/lib/email";

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

    if (existingEmail && existingEmail.emailVerified) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Check existing username
    const existingUsername = await prisma.user.findUnique({
      where: { username: lowerUsername },
    });

    if (existingUsername && existingUsername.id !== existingEmail?.id) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const connectCode = Math.floor(10000 + Math.random() * 90000).toString();

    // Create or update unverified user
    if (existingEmail && !existingEmail.emailVerified) {
      await prisma.user.update({
        where: { id: existingEmail.id },
        data: {
          name,
          username: lowerUsername,
          password: hashedPassword,
          connectCode: existingEmail.connectCode || connectCode,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name,
          username: lowerUsername,
          email: lowerEmail,
          connectCode,
          password: hashedPassword,
          emailVerified: null,
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
      });
    }

    // Clean any prior tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: lowerEmail },
    });

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.verificationToken.create({
      data: {
        identifier: lowerEmail,
        token: otp,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Send verification email
    const emailRes = await sendOtpEmail({
      to: lowerEmail,
      name,
      otp,
    });

    // Notify admin alert email non-blocking
    void sendLoginAlertEmail({
      eventType: "NEW_USER_REGISTERED",
      name,
      email: lowerEmail,
      username: lowerUsername,
      provider: "Email Registration",
    }).catch(() => {});

    return NextResponse.json(
      {
        message: "Verification code sent to your email",
        email: lowerEmail,
        requiresOtp: true,
        simulatedOtp: emailRes.simulated ? otp : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while creating account" },
      { status: 500 }
    );
  }
}
