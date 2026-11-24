import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const email = result.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal account existence for security
      return NextResponse.json({
        message: "If an account exists with this email, a password reset link has been dispatched.",
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    console.log(`[ChatSphere Email] Password reset requested for ${email}: ${resetLink}`);

    return NextResponse.json({
      message: "Password reset link sent to your email.",
      // Return link in development mode for easy testing without needing live SendGrid account
      devResetLink: process.env.NODE_ENV !== "production" ? resetLink : undefined,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process password reset" }, { status: 500 });
  }
}
