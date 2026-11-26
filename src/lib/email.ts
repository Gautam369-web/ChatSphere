import nodemailer from "nodemailer";

interface SendOtpOptions {
  to: string;
  name: string;
  otp: string;
}

interface LoginAlertOptions {
  eventType: "NEW_USER_REGISTERED" | "USER_VERIFIED" | "USER_LOGIN";
  name?: string | null;
  email: string;
  username?: string | null;
  provider?: string;
}

function createSmtpTransporter() {
  const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST || (process.env.GMAIL_USER ? "smtp.gmail.com" : undefined);
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD || process.env.GMAIL_APP_PASSWORD;
  const smtpPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || "587", 10);

  if (!smtpHost || !smtpUser || !smtpPass) return null;

  return {
    smtpUser,
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
    }),
  };
}

export async function sendLoginAlertEmail({
  eventType,
  name,
  email,
  username,
  provider = "Credentials",
}: LoginAlertOptions): Promise<{ success: boolean; simulated?: boolean }> {
  const alertRecipient = process.env.ADMIN_ALERT_EMAIL || "gkk.devx@gmail.com";
  const smtp = createSmtpTransporter();
  const fromEmail =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    (smtp?.smtpUser ? `ChatSphere <${smtp.smtpUser}>` : "ChatSphere <no-reply@chatsphere.io>");
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const label =
    eventType === "NEW_USER_REGISTERED"
      ? "New User Registered"
      : eventType === "USER_VERIFIED"
      ? "New User Verified & Joined"
      : "User Logged In";

  if (smtp) {
    try {
      await smtp.transporter.sendMail({
        from: fromEmail,
        to: alertRecipient,
        subject: `[ChatSphere Alert] ${label}: ${name || username || email}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
            <div style="margin-bottom: 18px;">
              <span style="display: inline-block; padding: 8px 14px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 10px; font-weight: 700; font-size: 14px; color: #ffffff;">
                🔔 ChatSphere Account Alert
              </span>
            </div>
            <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #ffffff;">${label}</h2>
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px;">
              A user activity was detected on your ChatSphere app.
            </p>
            <div style="background: #1e293b; border-radius: 12px; padding: 16px; font-size: 13px; line-height: 1.7;">
              <div><strong style="color: #cbd5e1;">Name:</strong> ${name || "N/A"}</div>
              <div><strong style="color: #cbd5e1;">Username:</strong> ${username ? `@${username}` : "N/A"}</div>
              <div><strong style="color: #cbd5e1;">Email:</strong> ${email}</div>
              <div><strong style="color: #cbd5e1;">Provider:</strong> ${provider}</div>
              <div><strong style="color: #cbd5e1;">Time (IST):</strong> ${timestamp}</div>
            </div>
          </div>
        `,
      });
      console.log(`[Email] ✅ Alert sent to ${alertRecipient} (${label}: ${email})`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Email] ❌ Failed to send login alert email:`, err.message);
    }
  }

  console.log(`[ChatSphere Alert -> ${alertRecipient}] ${label} | ${name || ""} (${email}) via ${provider} at ${timestamp}`);
  return { success: true, simulated: true };
}

export async function sendOtpEmail({ to, name, otp }: SendOtpOptions): Promise<{ success: boolean; simulated?: boolean }> {
  const smtp = createSmtpTransporter();
  const fromEmail =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    (smtp?.smtpUser ? `ChatSphere <${smtp.smtpUser}>` : "ChatSphere <no-reply@chatsphere.io>");

  // If SMTP is configured, send the real email!
  if (smtp) {
    try {
      await smtp.transporter.sendMail({
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
