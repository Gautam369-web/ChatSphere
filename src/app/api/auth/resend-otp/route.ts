import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "This email is already verified. You can sign in directly." },
        { status: 200 }
      );
    }

    // Delete prior tokens
    await prisma.verificationToken.deleteMany({
      where: { identifier: lowerEmail },
    });

    // Generate fresh OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.verificationToken.create({
      data: {
        identifier: lowerEmail,
        token: otp,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const emailRes = await sendOtpEmail({
      to: lowerEmail,
      name: user.name || "User",
      otp,
    });

    return NextResponse.json({
      success: true,
      message: "A new 6-digit verification code has been sent to your email.",
      simulatedOtp: emailRes.simulated ? otp : undefined,
    });
  } catch (err: any) {
    console.error("Resend OTP error:", err);
    return NextResponse.json(
      { error: "Internal server error occurred while resending code" },
      { status: 500 }
    );
  }
}
