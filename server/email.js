import nodemailer from "nodemailer";
import { dbGetSetting } from "./db.js";

// Helper to get SMTP / Gmail configuration
export async function getEmailConfig() {
  const dbHost = await dbGetSetting("SMTP_HOST");
  const dbPort = await dbGetSetting("SMTP_PORT");
  const dbUser = (await dbGetSetting("SMTP_USER")) || (await dbGetSetting("GMAIL_USER"));
  const dbPass = (await dbGetSetting("SMTP_PASS")) || (await dbGetSetting("GMAIL_APP_PASSWORD"));
  const dbFrom = await dbGetSetting("SMTP_FROM");

  const host = dbHost || process.env.SMTP_HOST || (process.env.GMAIL_USER ? "smtp.gmail.com" : "");
  const port = parseInt(dbPort || process.env.SMTP_PORT || "465", 10);
  const user = dbUser || process.env.SMTP_USER || process.env.GMAIL_USER || "";
  const rawPass = dbPass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
  const pass = rawPass.replace(/\s+/g, "").trim();
  const from = dbFrom || process.env.SMTP_FROM || (user ? `"TeleDrive Cloud" <${user}>` : '"TeleDrive Cloud" <no-reply@teledrive.cloud>');

  return {
    host: host.trim(),
    port,
    secure: port === 465,
    user: user.trim(),
    pass,
    from: from.trim(),
    isConfigured: Boolean(user && pass)
  };
}

// Create Nodemailer Transporter with universal cloud compatibility (Gmail preset & Port 465 SSL)
export async function getTransporter() {
  const config = await getEmailConfig();
  if (!config.isConfigured) return null;

  const isGmail = config.host.includes("gmail.com") || config.user.endsWith("@gmail.com");

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.user,
        pass: config.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 12000,
      socketTimeout: 20000
    });
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 12000,
    socketTimeout: 20000
  });
}

// 1. Send 6-Digit Real-Time OTP Email (Signup or Forgot Password)
export async function sendOtpEmail({ to, name = "TeleDrive User", otp, type = "signup" }) {
  const config = await getEmailConfig();
  if (!config.isConfigured) {
    throw new Error(
      "Email service is not configured on the server. Please ensure GMAIL_USER and GMAIL_APP_PASSWORD are set."
    );
  }

  const isSignup = type === "signup";
  const title = isSignup ? "Verify Your Email Address" : "Reset Your TeleDrive Password";
  const actionText = isSignup
    ? "Thank you for creating an account with TeleDrive. Use the 6-digit verification code below to verify your Gmail address and activate unlimited cloud storage."
    : "We received a request to reset the password for your TeleDrive account. Use the 6-digit code below to set a new password.";

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
      .container { max-width: 540px; margin: 40px auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
      .header { background: linear-gradient(135deg, #1d4ed8, #0284c7); padding: 32px 24px; text-align: center; color: #ffffff; }
      .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
      .sub-brand { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-top: 4px; }
      .content { padding: 36px 32px; text-align: center; }
      .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
      .desc { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 28px; }
      .otp-box { background: #0f172a; border: 2px dashed #2563eb; border-radius: 16px; padding: 20px; margin: 0 auto 28px; display: inline-block; }
      .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; margin: 0; }
      .validity { font-size: 11px; color: #64748b; margin-top: 6px; }
      .security-note { background: #1e293b; border-radius: 12px; padding: 14px 16px; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: left; margin-bottom: 24px; }
      .footer { background: #0f172a; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="brand">☁️ TeleDrive Cloud</h1>
        <div class="sub-brand">Unlimited Cloud Storage & Fast Streaming</div>
      </div>
      <div class="content">
        <div class="greeting">Hello, ${name}!</div>
        <p class="desc">${actionText}</p>
        
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div class="validity">⏱️ This code will expire in 10 minutes</div>
        </div>

        <div class="security-note">
          🔒 <strong>Security Warning:</strong> If you did not initiate this request, please ignore this email or change your password immediately. Never share this code with anyone.
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} TeleDrive Cloud • Secure Telegram Storage System
      </div>
    </div>
  </body>
  </html>
  `;

  const transporter = await getTransporter();
  if (!transporter) {
    throw new Error("Unable to initialize email transporter. Please verify Gmail credentials.");
  }

  const fromAddress = config.user ? `"TeleDrive Cloud" <${config.user}>` : config.from;

  const info = await transporter.sendMail({
    from: fromAddress,
    to: to.trim().toLowerCase(),
    subject: isSignup ? `[TeleDrive] ${otp} is your verification code` : `[TeleDrive] ${otp} is your password reset code`,
    text: `${isSignup ? "Your TeleDrive Verification Code is:" : "Your TeleDrive Password Reset Code is:"} ${otp}. Valid for 10 minutes.`,
    html: htmlContent
  });

  console.log(`✅ Real-time Gmail OTP sent to ${to} (MessageId: ${info.messageId})`);
  return { success: true, messageId: info.messageId };
}

// 2. Send File / Folder Share Notification Email
export async function sendShareNotificationEmail({ to, senderName, itemName, itemType = "folder", permission = "viewer", shareUrl }) {
  const config = await getEmailConfig();
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Shared with you on TeleDrive</title>
    <style>
      body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
      .container { max-width: 540px; margin: 40px auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #2563eb, #0ea5e9); padding: 32px 24px; text-align: center; color: #ffffff; }
      .content { padding: 36px 32px; text-align: center; }
      .item-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 18px; margin: 20px 0; text-align: left; display: flex; align-items: center; }
      .btn { display: inline-block; background: #2563eb; color: #ffffff; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 14px; font-size: 13px; margin-top: 10px; }
      .footer { background: #0f172a; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="font-size: 22px; margin:0;">☁️ TeleDrive Cloud</h1>
      </div>
      <div class="content">
        <h2 style="font-size: 18px; color: #fff; margin-bottom: 8px;">${senderName} shared a ${itemType} with you</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">You have been granted <strong>${permission.toUpperCase()}</strong> access to the ${itemType} below.</p>
        
        <div class="item-card">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #fff;">${itemType === 'folder' ? '📁' : '📄'} ${itemName}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Role: ${permission}</div>
          </div>
        </div>

        <a href="${shareUrl}" class="btn">Open in TeleDrive</a>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} TeleDrive Cloud
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    const transporter = await getTransporter();
    if (!transporter) return { success: true, simulated: true };

    await transporter.sendMail({
      from: config.from,
      to: to.trim().toLowerCase(),
      subject: `[TeleDrive] ${senderName} shared "${itemName}" with you`,
      html: htmlContent
    });
    return { success: true };
  } catch (err) {
    console.warn("Share email notification warning:", err.message);
    return { success: false, error: err.message };
  }
}
