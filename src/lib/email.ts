import nodemailer from "nodemailer";

interface SendOtpOptions {
  to: string;
  name: string;
  otp: string;
}

export async function sendOtpEmail({ to, name, otp }: SendOtpOptions): Promise<{ success: boolean; simulated?: boolean }> {
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD;
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || "587", 10);
  const fromEmail = process.env.SMTP_FROM || process.env.EMAIL_FROM || "ChatSphere <no-reply@chatsphere.io>";

  // If SMTP is configured, send the real email!
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: fromEmail,
        to,
        subject: `Your ChatSphere Verification Code: ${otp}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; padding: 12px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; font-weight: bold; font-size: 20px; color: #ffffff;">
                💬 ChatSphere
              </div>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 8px; color: #ffffff;">Verify Your Email Address</h2>
            <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-bottom: 24px;">
              Hi <strong>${name}</strong>, use the 6-digit verification code below to activate your ChatSphere account:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; background: #1e1b4b; color: #a5b4fc; border: 2px dashed #6366f1; border-radius: 12px;">
                ${otp}
              </span>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
              This code will expire in 10 minutes. If you didn't create a ChatSphere account, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      console.log(`[Email] ✅ Real verification OTP sent to ${to}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Email] ❌ Failed to send SMTP email:`, err.message);
    }
  }

  // Fallback logger for development / when SMTP credentials are not yet set
  console.log("==================================================");
  console.log(`🔑 [ChatSphere OTP Verification for ${to}]`);
  console.log(`👉 Verification Code: ${otp}`);
  console.log("==================================================");

  return { success: true, simulated: true };
}
