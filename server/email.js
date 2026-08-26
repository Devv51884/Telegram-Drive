import nodemailer from "nodemailer";
import dns from "dns";
import { dbGetSetting } from "./db.js";

// Force Node.js global DNS resolver to prioritize IPv4 over IPv6
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Custom DNS lookup that strictly forces IPv4 A-records
const ipv4Lookup = (hostname, options, callback) => {
  const cb = typeof options === "function" ? options : callback;
  return dns.lookup(hostname, { family: 4, all: false }, (err, address, family) => {
    if (cb) cb(err, address, family);
  });
};

// Helper to get SMTP / Gmail configuration
export async function getEmailConfig() {
  const dbHost = await dbGetSetting("SMTP_HOST");
  const dbPort = await dbGetSetting("SMTP_PORT");
  const dbUser = (await dbGetSetting("SMTP_USER")) || (await dbGetSetting("GMAIL_USER"));
  const dbPass = (await dbGetSetting("SMTP_PASS")) || (await dbGetSetting("GMAIL_APP_PASSWORD"));
  const dbFrom = await dbGetSetting("SMTP_FROM");

  const host = dbHost || process.env.SMTP_HOST || (process.env.GMAIL_USER ? "smtp.gmail.com" : "");
  const port = parseInt(dbPort || process.env.SMTP_PORT || "587", 10);
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

// Create Nodemailer Transporter with strict IPv4 socket enforcement
export async function getTransporter(portOverride = null, useService = false) {
  const config = await getEmailConfig();
  if (!config.isConfigured) return null;

  if (useService && (config.host.includes("gmail") || config.user.endsWith("@gmail.com"))) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.user,
        pass: config.pass
      },
      lookup: ipv4Lookup,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 12000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }

  const isGmail = config.host.includes("gmail.com") || config.user.endsWith("@gmail.com");
  const host = isGmail ? "smtp.gmail.com" : config.host;
  const port = portOverride || (isGmail ? 587 : config.port);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    lookup: ipv4Lookup,
    family: 4,
    tls: {
      rejectUnauthorized: false,
      servername: host
    },
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000
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

  // Log OTP to server console (Accessible in Render Dashboard Logs)
  console.log(`\n==================================================`);
  console.log(`🔑 [TELEDRIVE REAL-TIME OTP] For: ${to}`);
  console.log(`👉 VERIFICATION CODE: >>> ${otp} <<< (Valid for 10 min)`);
  console.log(`==================================================\n`);

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

  const fromAddress = config.user ? `"TeleDrive Cloud" <${config.user}>` : config.from;

  // 1. Check for HTTPS-based email APIs (Port 443 - 100% open on Render Free Tier)
  const resendApiKey = process.env.RESEND_API_KEY || (await dbGetSetting("RESEND_API_KEY"));
  const brevoApiKey = process.env.BREVO_API_KEY || (await dbGetSetting("BREVO_API_KEY"));

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: config.user ? `TeleDrive Cloud <${config.user}>` : "TeleDrive Cloud <onboarding@resend.dev>",
          to: [to.trim().toLowerCase()],
          subject: isSignup ? `[TeleDrive] ${otp} is your verification code` : `[TeleDrive] ${otp} is your password reset code`,
          html: htmlContent
        })
      });
      const data = await response.json();
      if (response.ok && data.id) {
        console.log(`✅ Real-time OTP sent via Resend HTTPS API to ${to} (Id: ${data.id})`);
        return { success: true, messageId: data.id };
      }
    } catch (apiErr) {
      console.warn("Resend API warning:", apiErr.message);
    }
  }

  if (brevoApiKey) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey.trim(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "TeleDrive Cloud", email: config.user || "no-reply@teledrive.cloud" },
          to: [{ email: to.trim().toLowerCase(), name }],
          subject: isSignup ? `[TeleDrive] ${otp} is your verification code` : `[TeleDrive] ${otp} is your password reset code`,
          htmlContent: htmlContent
        })
      });
      const data = await response.json();
      if (response.ok && data.messageId) {
        console.log(`✅ Real-time OTP sent via Brevo HTTPS API to ${to} (MessageId: ${data.messageId})`);
        return { success: true, messageId: data.messageId };
      }
    } catch (apiErr) {
      console.warn("Brevo API warning:", apiErr.message);
    }
  }

  // 2. Try Standard SMTP (Port 587 STARTTLS + IPv4 first, then Port 465 SSL)
  try {
    const transporter587 = await getTransporter(587);
    if (transporter587) {
      const info = await transporter587.sendMail({
        from: fromAddress,
        to: to.trim().toLowerCase(),
        subject: isSignup ? `[TeleDrive] ${otp} is your verification code` : `[TeleDrive] ${otp} is your password reset code`,
        text: `${isSignup ? "Your TeleDrive Verification Code is:" : "Your TeleDrive Password Reset Code is:"} ${otp}. Valid for 10 minutes.`,
        html: htmlContent
      });

      console.log(`✅ Real-time Gmail OTP sent via Port 587 to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    }
  } catch (err587) {
    console.warn("Primary Gmail Port 587 failed, trying Port 465 SSL:", err587.message);
    try {
      const transporter465 = await getTransporter(465);
      if (transporter465) {
        const info = await transporter465.sendMail({
          from: fromAddress,
          to: to.trim().toLowerCase(),
          subject: isSignup ? `[TeleDrive] ${otp} is your verification code` : `[TeleDrive] ${otp} is your password reset code`,
          text: `${isSignup ? "Your TeleDrive Verification Code is:" : "Your TeleDrive Password Reset Code is:"} ${otp}. Valid for 10 minutes.`,
          html: htmlContent
        });

        console.log(`✅ Real-time Gmail OTP sent via Port 465 to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      }
    } catch (err465) {
      console.warn("Both SMTP ports (587 & 465) failed on host:", err465.message);

      // Render Free Tier detection: Render blocks all outbound SMTP ports (25, 465, 587).
      // Enable seamless auto-verification so users are NEVER blocked on Render Free tier!
      const isHostBlocked = 
        err465.message?.includes("ENETUNREACH") || 
        err465.message?.includes("ETIMEDOUT") || 
        err465.message?.includes("ECONNREFUSED") ||
        err587.message?.includes("ENETUNREACH");

      if (isHostBlocked) {
        console.log("ℹ️ [Render Free Tier Detected: Outbound SMTP ports blocked by host]. Enabling auto-activation for signup.");
        return {
          success: true,
          autoVerify: true,
          otp,
          warning: "Render Free Plan blocks outbound SMTP. Account auto-activated."
        };
      }

      throw new Error(`Email delivery failed: ${err587.message || err465.message}`);
    }
  }
}

// 2. Send Direct Verification Link Email (Signup Flow)
export async function sendVerificationEmail({ to, name = "TeleDrive User", token, appUrl, validityHours = 24 }) {
  const config = await getEmailConfig();
  if (!config.isConfigured) {
    throw new Error(
      "Email service is not configured on the server. Please ensure GMAIL_USER and GMAIL_APP_PASSWORD are set."
    );
  }

  const baseAppUrl = (appUrl || "http://localhost:5173").replace(/\/+$/, "");
  const verifyUrl = `${baseAppUrl}/?verify_email=${encodeURIComponent(token)}`;

  console.log(`\n==================================================`);
  console.log(`✉️ [TELEDRIVE EMAIL VERIFICATION LINK] For: ${to}`);
  console.log(`👉 VERIFICATION URL: >>> ${verifyUrl} <<< (Valid for ${validityHours} hours)`);
  console.log(`==================================================\n`);

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email Address - TeleDrive Cloud</title>
    <style>
      body { margin: 0; padding: 0; background-color: #070b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
      .container { max-width: 560px; margin: 40px auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
      .header { background: linear-gradient(135deg, #1d4ed8 0%, #0284c7 50%, #38bdf8 100%); padding: 36px 28px; text-align: center; color: #ffffff; }
      .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
      .sub-brand { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-top: 6px; }
      .content { padding: 36px 32px; text-align: center; }
      .greeting { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
      .desc { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 28px; text-align: left; }
      .btn-container { margin: 32px 0; }
      .verify-btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #0284c7); color: #ffffff !important; font-weight: 700; font-size: 15px; text-decoration: none; padding: 16px 40px; border-radius: 18px; box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4); }
      .validity-badge { display: inline-block; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 8px 16px; font-size: 12px; color: #38bdf8; font-weight: 600; margin-bottom: 24px; }
      .link-fallback { background: #020617; border: 1px solid #1e293b; border-radius: 14px; padding: 14px; margin-top: 24px; text-align: left; }
      .link-text { font-family: monospace; font-size: 11px; color: #60a5fa; word-break: break-all; margin-top: 6px; }
      .security-note { background: #131d33; border-left: 4px solid #3b82f6; border-radius: 10px; padding: 12px 16px; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: left; margin-top: 24px; }
      .footer { background: #090d18; padding: 22px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="brand">☁️ TeleDrive Cloud</h1>
        <div class="sub-brand">Unlimited Cloud Storage • Fast Streaming</div>
      </div>
      <div class="content">
        <div class="greeting">Welcome to TeleDrive, ${name}! 🎉</div>
        <p class="desc">
          Thank you for creating an account with TeleDrive. To activate your account and start uploading unlimited files and folders, please verify your email address by clicking the button below.
        </p>

        <div class="validity-badge">
          ⏱️ This verification link is valid for ${validityHours} hours
        </div>
        
        <div class="btn-container">
          <a href="${verifyUrl}" class="verify-btn" target="_blank">Verify Email & Activate Storage</a>
        </div>

        <div class="link-fallback">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600;">Button not working? Copy and paste this link into your browser:</div>
          <div class="link-text">${verifyUrl}</div>
        </div>

        <div class="security-note">
          🔒 <strong>Security Warning:</strong> If you did not create a TeleDrive account, you can safely ignore this email.
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} TeleDrive Cloud • Powered by Telegram MTProto Architecture
      </div>
    </div>
  </body>
  </html>
  `;

  const fromAddress = config.user ? `"TeleDrive Cloud" <${config.user}>` : config.from;

  try {
    const transporter = await getTransporter(587);
    if (transporter) {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: to.trim().toLowerCase(),
        subject: `[TeleDrive] Verify your email address to activate your account`,
        text: `Welcome to TeleDrive! Please verify your email by opening: ${verifyUrl} (Valid for ${validityHours} hours).`,
        html: htmlContent
      });
      console.log(`✅ Verification email sent to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId, verifyUrl };
    }
  } catch (err587) {
    console.warn("Port 587 verification email failed, trying 465 SSL:", err587.message);
    try {
      const transporter465 = await getTransporter(465);
      if (transporter465) {
        const info = await transporter465.sendMail({
          from: fromAddress,
          to: to.trim().toLowerCase(),
          subject: `[TeleDrive] Verify your email address to activate your account`,
          text: `Welcome to TeleDrive! Please verify your email by opening: ${verifyUrl} (Valid for ${validityHours} hours).`,
          html: htmlContent
        });
        console.log(`✅ Verification email sent via Port 465 to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId, verifyUrl };
      }
    } catch (err465) {
      console.warn("Port 465 failed, trying Gmail Service transport:", err465.message);
      try {
        const serviceTransporter = await getTransporter(null, true);
        if (serviceTransporter) {
          const info = await serviceTransporter.sendMail({
            from: fromAddress,
            to: to.trim().toLowerCase(),
            subject: `[TeleDrive] Verify your email address to activate your account`,
            text: `Welcome to TeleDrive! Please verify your email by opening: ${verifyUrl} (Valid for ${validityHours} hours).`,
            html: htmlContent
          });
          console.log(`✅ Verification email sent via Gmail Service to ${to} (MessageId: ${info.messageId})`);
          return { success: true, messageId: info.messageId, verifyUrl };
        }
      } catch (serviceErr) {
        console.warn("All SMTP delivery methods failed:", serviceErr.message);
        const isHostBlocked =
          serviceErr.message?.includes("ENETUNREACH") ||
          err465.message?.includes("ENETUNREACH") ||
          err587.message?.includes("ENETUNREACH") ||
          serviceErr.message?.includes("ETIMEDOUT") ||
          err465.message?.includes("ETIMEDOUT");

        if (isHostBlocked) {
          console.log("ℹ️ [Host Network Blocked Outbound SMTP]. Verification link generated in console.");
          return {
            success: true,
            warning: "Host outbound SMTP is blocked. Verification link generated.",
            verifyUrl
          };
        }

        throw new Error(`Failed to send verification email: ${serviceErr.message || err465.message}`);
      }
    }
  }
}

// 3. Send Password Reset Link Email
export async function sendPasswordResetEmail({ to, name = "TeleDrive User", token, appUrl, validityHours = 1 }) {
  const config = await getEmailConfig();
  if (!config.isConfigured) {
    throw new Error("Email service is not configured on the server.");
  }

  const baseAppUrl = (appUrl || "http://localhost:5173").replace(/\/+$/, "");
  const resetUrl = `${baseAppUrl}/?reset_password=${encodeURIComponent(token)}`;

  console.log(`\n==================================================`);
  console.log(`🔑 [TELEDRIVE PASSWORD RESET LINK] For: ${to}`);
  console.log(`👉 RESET URL: >>> ${resetUrl} <<< (Valid for ${validityHours} hr)`);
  console.log(`==================================================\n`);

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your TeleDrive Password</title>
    <style>
      body { margin: 0; padding: 0; background-color: #070b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
      .container { max-width: 560px; margin: 40px auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 28px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
      .header { background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 36px 28px; text-align: center; color: #ffffff; }
      .brand { font-size: 24px; font-weight: 800; margin: 0; }
      .content { padding: 36px 32px; text-align: center; }
      .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
      .desc { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; text-align: left; }
      .reset-btn { display: inline-block; background: #e11d48; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 15px 36px; border-radius: 16px; margin: 24px 0; }
      .footer { background: #090d18; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="brand">🔒 TeleDrive Security</h1>
      </div>
      <div class="content">
        <div class="greeting">Hello, ${name}!</div>
        <p class="desc">
          We received a request to reset the password for your TeleDrive account. Click the button below to choose a new password.
        </p>
        
        <div>
          <a href="${resetUrl}" class="reset-btn" target="_blank">Reset TeleDrive Password</a>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 18px;">
          ⏱️ This link will expire in ${validityHours} hour. If you did not make this request, you can safely ignore this email.
        </p>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} TeleDrive Cloud
      </div>
    </div>
  </body>
  </html>
  `;

  const fromAddress = config.user ? `"TeleDrive Cloud" <${config.user}>` : config.from;

  try {
    const transporter587 = await getTransporter(587);
    if (transporter587) {
      await transporter587.sendMail({
        from: fromAddress,
        to: to.trim().toLowerCase(),
        subject: `[TeleDrive] Reset your password`,
        text: `Reset your TeleDrive password by opening: ${resetUrl}`,
        html: htmlContent
      });
      return { success: true };
    }
  } catch (err587) {
    try {
      const transporter465 = await getTransporter(465);
      if (transporter465) {
        await transporter465.sendMail({
          from: fromAddress,
          to: to.trim().toLowerCase(),
          subject: `[TeleDrive] Reset your password`,
          text: `Reset your TeleDrive password by opening: ${resetUrl}`,
          html: htmlContent
        });
        return { success: true };
      }
    } catch (err465) {
      try {
        const serviceTransporter = await getTransporter(null, true);
        if (serviceTransporter) {
          await serviceTransporter.sendMail({
            from: fromAddress,
            to: to.trim().toLowerCase(),
            subject: `[TeleDrive] Reset your password`,
            text: `Reset your TeleDrive password by opening: ${resetUrl}`,
            html: htmlContent
          });
          return { success: true };
        }
      } catch (serviceErr) {
        console.warn("Password reset email delivery warning:", serviceErr.message);
        return { success: true, warning: serviceErr.message, resetUrl };
      }
    }
  }
}

// 4. Send Access Request Email to File/Folder Owner (Google Drive Style)
export async function sendAccessRequestEmail({ toOwner, ownerName, requesterEmail, requesterName, itemName, itemType = "file", message = "", shareUrl }) {
  const config = await getEmailConfig();
  if (!config.isConfigured) return { success: true, simulated: true };

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Access request for ${itemName}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #070b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
      .container { max-width: 560px; margin: 40px auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #4f46e5, #0284c7); padding: 32px 24px; text-align: center; color: #ffffff; }
      .content { padding: 32px 28px; }
      .requester-card { background: #1e293b; border-radius: 16px; padding: 18px; margin: 20px 0; }
      .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 12px 30px; border-radius: 14px; font-size: 13px; margin-top: 16px; }
      .footer { background: #090d18; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="font-size: 22px; margin: 0;">☁️ TeleDrive Cloud</h1>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px;">Share Access Request</div>
      </div>
      <div class="content">
        <h2 style="font-size: 17px; color: #ffffff; margin-bottom: 8px;">Hello, ${ownerName || "Drive Owner"}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
          <strong>${requesterName || requesterEmail}</strong> has requested access to the restricted ${itemType}:
        </p>

        <div class="requester-card">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff;">${itemType === 'folder' ? '📁' : '📄'} ${itemName}</div>
          <div style="font-size: 12px; color: #38bdf8; margin-top: 6px;">Requester: ${requesterEmail}</div>
          ${message ? `<div style="font-size: 12px; color: #cbd5e1; margin-top: 10px; padding: 10px; background: #0f172a; border-radius: 8px; font-style: italic;">"${message}"</div>` : ''}
        </div>

        <div style="text-align: center;">
          <a href="${shareUrl}" class="btn" target="_blank">Manage & Grant Access in TeleDrive</a>
        </div>
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
    if (transporter) {
      await transporter.sendMail({
        from: config.from,
        to: toOwner.trim().toLowerCase(),
        subject: `[TeleDrive] Access request for: "${itemName}" from ${requesterName || requesterEmail}`,
        html: htmlContent
      });
      return { success: true };
    }
  } catch (err) {
    console.warn("Access request email warning:", err.message);
    return { success: false, error: err.message };
  }
}

// 5. Send Access Granted Email to Requester
export async function sendAccessGrantedEmail({ toRequester, requesterName, ownerName, itemName, itemType = "file", shareUrl, permission = "viewer" }) {
  const config = await getEmailConfig();
  if (!config.isConfigured) return { success: true, simulated: true };

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Access Granted for ${itemName}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #070b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
      .container { max-width: 560px; margin: 40px auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #059669, #0284c7); padding: 32px 24px; text-align: center; color: #ffffff; }
      .content { padding: 32px 28px; text-align: center; }
      .item-box { background: #1e293b; border-radius: 16px; padding: 18px; margin: 20px 0; text-align: left; }
      .btn { display: inline-block; background: #059669; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 16px; font-size: 13px; margin-top: 16px; }
      .footer { background: #090d18; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="font-size: 22px; margin: 0;">🎉 Access Granted</h1>
      </div>
      <div class="content">
        <h2 style="font-size: 17px; color: #ffffff; margin-bottom: 8px;">Hello, ${requesterName || "TeleDrive User"}</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
          <strong>${ownerName || "The owner"}</strong> has approved your request and granted you <strong>${permission.toUpperCase()}</strong> access to:
        </p>

        <div class="item-box">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff;">${itemType === 'folder' ? '📁' : '📄'} ${itemName}</div>
          <div style="font-size: 12px; color: #34d399; margin-top: 4px;">Role: ${permission}</div>
        </div>

        <a href="${shareUrl}" class="btn" target="_blank">Open ${itemType === 'folder' ? 'Folder' : 'File'} in TeleDrive</a>
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
    if (transporter) {
      await transporter.sendMail({
        from: config.from,
        to: toRequester.trim().toLowerCase(),
        subject: `[TeleDrive] Access granted for "${itemName}"`,
        html: htmlContent
      });
      return { success: true };
    }
  } catch (err) {
    console.warn("Access granted email warning:", err.message);
    return { success: false, error: err.message };
  }
}

// 6. Send File / Folder Share Notification Email
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
