import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLoginAlertEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and 6-digit OTP code are required" },
        { status: 400 }
      );
    }

    const lowerEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    // Verify token
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: lowerEmail,
        token: cleanOtp,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Invalid verification code. Please check your email or request a new code." },
        { status: 400 }
      );
    }

    if (tokenRecord.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { token: tokenRecord.token },
      });
      return NextResponse.json(
        { error: "Verification code has expired. Please click resend to get a fresh code." },
        { status: 400 }
      );
    }

    // Mark user as verified
    const verifiedUser = await prisma.user.update({
      where: { email: lowerEmail },
      data: { emailVerified: new Date() },
      select: { name: true, email: true, username: true },
    });

    // Delete token
    await prisma.verificationToken.delete({
      where: { token: tokenRecord.token },
    });

    await sendLoginAlertEmail({
      eventType: "USER_VERIFIED",
      name: verifiedUser.name,
      email: verifiedUser.email,
      username: verifiedUser.username,
      provider: "Email OTP Verified",
    }).catch(() => {});

    return NextResponse.json(
      { success: true, message: "Email verified successfully! You can now log in." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("OTP Verification error:", err);
    return NextResponse.json(
      { error: "Internal server error occurred during verification" },
      { status: 500 }
    );
  }
}
