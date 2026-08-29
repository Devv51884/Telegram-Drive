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
  const from = dbFrom || process.env.SMTP_FROM || (user ? `"TeleDrive Cloud" <${user}>` : '"TeleDrive Cloud" <no-reply@telegram-drive.in>');

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
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 12000
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
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });
}

let cachedBrevoSender = null;
let lastBrevoSenderFetch = 0;

async function getBrevoVerifiedSender(apiKey, preferredEmail = "") {
  const now = Date.now();
  if (cachedBrevoSender && now - lastBrevoSenderFetch < 15 * 60 * 1000) {
    return cachedBrevoSender;
  }

  // 1. Check explicit environment variable or db setting
  const explicitEmail = (process.env.BREVO_SENDER_EMAIL || (await dbGetSetting("BREVO_SENDER_EMAIL")) || "").trim();
  const explicitName = (process.env.BREVO_SENDER_NAME || (await dbGetSetting("BREVO_SENDER_NAME")) || "TeleDrive Cloud").trim();
  if (explicitEmail) {
    cachedBrevoSender = { email: explicitEmail, name: explicitName };
    lastBrevoSenderFetch = now;
    return cachedBrevoSender;
  }

  // 2. Fetch list of verified senders directly from Brevo account API
  try {
    const res = await fetch("https://api.brevo.com/v3/senders", {
      headers: { "api-key": apiKey, Accept: "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      const senders = data.senders || [];
      if (senders.length > 0) {
        const match = senders.find((s) => s.email?.toLowerCase() === preferredEmail?.toLowerCase() && s.active);
        const activeSender = match || senders.find((s) => s.active) || senders[0];
        if (activeSender && activeSender.email) {
          cachedBrevoSender = {
            email: activeSender.email.trim(),
            name: activeSender.name || "TeleDrive Cloud"
          };
          lastBrevoSenderFetch = now;
          console.log(`📧 [BREVO AUTO-DETECT] Using verified sender from Brevo account: ${cachedBrevoSender.email}`);
          return cachedBrevoSender;
        }
      }
    }
  } catch (err) {
    console.warn("Brevo verified senders lookup warning:", err.message);
  }

  // 3. Fallback to configured user or gmail
  const fallback = preferredEmail || process.env.GMAIL_USER || "devv5920@gmail.com";
  cachedBrevoSender = { email: fallback.trim(), name: "TeleDrive Cloud" };
  lastBrevoSenderFetch = now;
  return cachedBrevoSender;
}

// =========================================================================
// CENTRAL UNIFIED EMAIL SENDER
// Supports: Brevo HTTPS (443), Resend HTTPS (443), SendGrid HTTPS (443),
// and SMTP (587, 465, Gmail Service).
// =========================================================================
export async function sendUnifiedEmail({
  to,
  toName = "TeleDrive User",
  subject,
  html,
  text,
  fromName = "TeleDrive Cloud",
  fromEmail
}) {
  const cleanTo = (to || "").trim().toLowerCase();
  if (!cleanTo || !cleanTo.includes("@")) {
    throw new Error("Invalid recipient email address");
  }

  const emailConfig = await getEmailConfig();
  const rawBrevoKey = process.env.BREVO_API_KEY || (await dbGetSetting("BREVO_API_KEY")) || "";
  const brevoApiKey = rawBrevoKey.replace(/['"]+/g, "").trim();
  const rawResendKey = process.env.RESEND_API_KEY || (await dbGetSetting("RESEND_API_KEY")) || "";
  const resendApiKey = rawResendKey.replace(/['"]+/g, "").trim();
  const rawSendgridKey = process.env.SENDGRID_API_KEY || (await dbGetSetting("SENDGRID_API_KEY")) || "";
  const sendgridApiKey = rawSendgridKey.replace(/['"]+/g, "").trim();

  const senderEmail = fromEmail || emailConfig.user || "no-reply@telegram-drive.in";
  const senderName = fromName || "TeleDrive Cloud";
  const fromHeader = emailConfig.user ? `"${senderName}" <${emailConfig.user}>` : `"${senderName}" <${senderEmail}>`;

  const errors = [];

  // =========================================================================
  // 1. BREVO HTTPS API (Port 443 - 300 free emails/day, 100% open on Render/Cloud)
  // =========================================================================
  if (brevoApiKey) {
    try {
      const brevoSender = await getBrevoVerifiedSender(brevoApiKey, fromEmail || emailConfig.user);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: { name: senderName || brevoSender.name, email: brevoSender.email },
          to: [{ email: cleanTo, name: toName }],
          subject: subject,
          htmlContent: html,
          textContent: text || subject
        })
      });
      const data = await response.json();
      if (response.ok && (data.messageId || data.id)) {
        console.log(`✅ Email delivered via Brevo HTTPS API to ${cleanTo} (MessageId: ${data.messageId || data.id}, Sender: ${brevoSender.email})`);
        return { success: true, provider: "brevo", messageId: data.messageId || data.id };
      } else {
        const errMsg = data.message || JSON.stringify(data);
        console.warn(`⚠️ Brevo API error (Sender: ${brevoSender.email}): ${errMsg}`);
        errors.push(`Brevo: ${errMsg}`);
      }
    } catch (err) {
      console.warn(`⚠️ Brevo HTTPS API network error:`, err.message);
      errors.push(`Brevo: ${err.message}`);
    }
  }

  // =========================================================================
  // 2. RESEND HTTPS API (Port 443 - 3000 free emails/month, open on Render/Cloud)
  // =========================================================================
  if (resendApiKey) {
    try {
      const resendSender = senderEmail.endsWith("@gmail.com")
        ? `TeleDrive <onboarding@resend.dev>`
        : `"${senderName}" <${senderEmail}>`;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: resendSender,
          to: [cleanTo],
          subject: subject,
          html: html,
          text: text || subject
        })
      });
      const data = await response.json();
      if (response.ok && data.id) {
        console.log(`✅ Email delivered via Resend HTTPS API to ${cleanTo} (Id: ${data.id})`);
        return { success: true, provider: "resend", messageId: data.id };
      } else {
        const errMsg = data.message || JSON.stringify(data);
        console.warn(`⚠️ Resend API error: ${errMsg}`);
        errors.push(`Resend: ${errMsg}`);
      }
    } catch (err) {
      console.warn(`⚠️ Resend HTTPS API network error:`, err.message);
      errors.push(`Resend: ${err.message}`);
    }
  }

  // =========================================================================
  // 3. SENDGRID HTTPS API (Port 443 - 100 free emails/day)
  // =========================================================================
  if (sendgridApiKey) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: cleanTo, name: toName }] }],
          from: { email: senderEmail, name: senderName },
          subject: subject,
          content: [
            { type: "text/html", value: html }
          ]
        })
      });
      if (response.ok || response.status === 202) {
        console.log(`✅ Email delivered via SendGrid HTTPS API to ${cleanTo}`);
        return { success: true, provider: "sendgrid" };
      } else {
        const errText = await response.text();
        console.warn(`⚠️ SendGrid API error: ${errText}`);
        errors.push(`SendGrid: ${errText}`);
      }
    } catch (err) {
      console.warn(`⚠️ SendGrid HTTPS API network error:`, err.message);
      errors.push(`SendGrid: ${err.message}`);
    }
  }

  // =========================================================================
  // 4. SMTP NODEMAILER (Port 587 STARTTLS, Port 465 SSL, Gmail Service)
  // =========================================================================
  if (emailConfig.isConfigured) {
    // 4a. Try Port 587 (IPv4 STARTTLS)
    try {
      const transporter587 = await getTransporter(587);
      if (transporter587) {
        const info = await transporter587.sendMail({
          from: fromHeader,
          to: cleanTo,
          subject: subject,
          text: text || subject,
          html: html
        });
        console.log(`✅ Email delivered via SMTP Port 587 to ${cleanTo} (MessageId: ${info.messageId})`);
        return { success: true, provider: "smtp_587", messageId: info.messageId };
      }
    } catch (err587) {
      errors.push(`SMTP 587: ${err587.message}`);
      console.warn(`SMTP 587 failed, trying Port 465 SSL:`, err587.message);
    }

    // 4b. Try Port 465 (IPv4 SSL)
    try {
      const transporter465 = await getTransporter(465);
      if (transporter465) {
        const info = await transporter465.sendMail({
          from: fromHeader,
          to: cleanTo,
          subject: subject,
          text: text || subject,
          html: html
        });
        console.log(`✅ Email delivered via SMTP Port 465 to ${cleanTo} (MessageId: ${info.messageId})`);
        return { success: true, provider: "smtp_465", messageId: info.messageId };
      }
    } catch (err465) {
      errors.push(`SMTP 465: ${err465.message}`);
      console.warn(`SMTP 465 failed, trying Gmail Service transport:`, err465.message);
    }

    // 4c. Try Gmail Service
    try {
      const serviceTransporter = await getTransporter(null, true);
      if (serviceTransporter) {
        const info = await serviceTransporter.sendMail({
          from: fromHeader,
          to: cleanTo,
          subject: subject,
          text: text || subject,
          html: html
        });
        console.log(`✅ Email delivered via Gmail Service to ${cleanTo} (MessageId: ${info.messageId})`);
        return { success: true, provider: "gmail_service", messageId: info.messageId };
      }
    } catch (servErr) {
      errors.push(`Gmail Service: ${servErr.message}`);
    }
  } else {
    errors.push("SMTP credentials (GMAIL_USER & GMAIL_APP_PASSWORD) not configured in .env/database");
  }

  // Check if failure is due to cloud host firewall blocking outbound SMTP ports
  const isHostBlocked = errors.some(
    (e) =>
      e.includes("ENETUNREACH") ||
      e.includes("ETIMEDOUT") ||
      e.includes("ECONNREFUSED") ||
      e.includes("Greeting timed out") ||
      e.includes("Connection timeout")
  );

  if (isHostBlocked) {
    console.error(`\n🚨 [EMAIL DELIVERY BLOCKED BY HOST FIREWALL]`);
    console.error(`Your hosting provider (e.g. Render Free Tier) blocks outbound SMTP ports (25, 465, 587).`);
    console.error(`👉 SOLUTION: Add BREVO_API_KEY (Free 300 emails/day) or RESEND_API_KEY in your Render Environment Variables.`);
    console.error(`Get a free Brevo API key in 30 seconds: https://app.brevo.com/settings/keys/api\n`);

    return {
      success: false,
      blockedByHost: true,
      error: "Host firewall blocks outbound SMTP ports. Please set BREVO_API_KEY in Render environment variables for 100% reliable delivery.",
      details: errors
    };
  }

  return {
    success: false,
    error: `Failed to deliver email: ${errors.join(" | ")}`,
    details: errors
  };
}

// =========================================================================
// 1. SEND DIRECT EMAIL VERIFICATION LINK (SIGNUP FLOW)
// =========================================================================
export async function sendVerificationEmail({ to, name = "TeleDrive User", token, appUrl, validityHours = 24 }) {
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

  const textContent = `Welcome to TeleDrive, ${name}!\n\nPlease verify your email address to activate your account by clicking the link below:\n${verifyUrl}\n\nThis verification link is valid for ${validityHours} hours.`;

  const result = await sendUnifiedEmail({
    to,
    toName: name,
    subject: `[TeleDrive] Verify your email address to activate your account`,
    html: htmlContent,
    text: textContent
  });

  return {
    ...result,
    verifyUrl
  };
}

// =========================================================================
// 2. SEND 6-DIGIT OTP EMAIL (SIGNUP / FORGOT PASSWORD)
// =========================================================================
export async function sendOtpEmail({ to, name = "TeleDrive User", otp, type = "signup" }) {
  const isSignup = type === "signup";
  const title = isSignup ? "Verify Your Email Address" : "Reset Your TeleDrive Password";
  const actionText = isSignup
    ? "Thank you for creating an account with TeleDrive. Use the 6-digit verification code below to verify your Gmail address and activate unlimited cloud storage."
    : "We received a request to reset the password for your TeleDrive account. Use the 6-digit code below to set a new password.";

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

  const textContent = `${isSignup ? "Your TeleDrive Verification Code is:" : "Your TeleDrive Password Reset Code is:"} ${otp}. Valid for 10 minutes.`;

  return await sendUnifiedEmail({
    to,
    toName: name,
    subject: isSignup ? `[TeleDrive] ${otp} is your verification code` : `[TeleDrive] ${otp} is your password reset code`,
    html: htmlContent,
    text: textContent
  });
}

// =========================================================================
// 3. SEND PASSWORD RESET LINK EMAIL
// =========================================================================
export async function sendPasswordResetEmail({ to, name = "TeleDrive User", token, appUrl, validityHours = 1 }) {
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

  const textContent = `Hello ${name},\n\nWe received a request to reset the password for your TeleDrive account. Open this link to set a new password:\n${resetUrl}\n\nThis link is valid for ${validityHours} hour.`;

  const result = await sendUnifiedEmail({
    to,
    toName: name,
    subject: `[TeleDrive] Reset your password`,
    html: htmlContent,
    text: textContent
  });

  return {
    ...result,
    resetUrl
  };
}

// =========================================================================
// 4. SEND ACCESS REQUEST EMAIL TO FILE/FOLDER OWNER
// =========================================================================
export async function sendAccessRequestEmail({
  toOwner,
  ownerName,
  requesterEmail,
  requesterName,
  itemName,
  itemType = "file",
  message = "",
  shareUrl
}) {
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
          <div style="font-size: 15px; font-weight: 700; color: #ffffff;">${itemType === "folder" ? "📁" : "📄"} ${itemName}</div>
          <div style="font-size: 12px; color: #38bdf8; margin-top: 6px;">Requester: ${requesterEmail}</div>
          ${message ? `<div style="font-size: 12px; color: #cbd5e1; margin-top: 10px; padding: 10px; background: #0f172a; border-radius: 8px; font-style: italic;">"${message}"</div>` : ""}
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

  return await sendUnifiedEmail({
    to: toOwner,
    toName: ownerName,
    subject: `[TeleDrive] Access request for "${itemName}" from ${requesterName || requesterEmail}`,
    html: htmlContent,
    text: `${requesterName || requesterEmail} requested access to "${itemName}". Manage access at: ${shareUrl}`
  });
}

// =========================================================================
// 5. SEND ACCESS GRANTED EMAIL TO REQUESTER
// =========================================================================
export async function sendAccessGrantedEmail({
  toRequester,
  requesterName,
  ownerName,
  itemName,
  itemType = "file",
  shareUrl,
  permission = "viewer"
}) {
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
          <div style="font-size: 15px; font-weight: 700; color: #ffffff;">${itemType === "folder" ? "📁" : "📄"} ${itemName}</div>
          <div style="font-size: 12px; color: #34d399; margin-top: 4px;">Role: ${permission}</div>
        </div>

        <a href="${shareUrl}" class="btn" target="_blank">Open ${itemType === "folder" ? "Folder" : "File"} in TeleDrive</a>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} TeleDrive Cloud
      </div>
    </div>
  </body>
  </html>
  `;

  return await sendUnifiedEmail({
    to: toRequester,
    toName: requesterName,
    subject: `[TeleDrive] Access granted for "${itemName}"`,
    html: htmlContent,
    text: `Your access request for "${itemName}" has been granted. Open at: ${shareUrl}`
  });
}

// =========================================================================
// 6. SEND FILE / FOLDER SHARE NOTIFICATION EMAIL
// =========================================================================
export async function sendShareNotificationEmail({
  to,
  senderName,
  itemName,
  itemType = "folder",
  permission = "viewer",
  shareUrl
}) {
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
            <div style="font-size: 14px; font-weight: 700; color: #fff;">${itemType === "folder" ? "📁" : "📄"} ${itemName}</div>
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

  return await sendUnifiedEmail({
    to,
    subject: `[TeleDrive] ${senderName} shared "${itemName}" with you`,
    html: htmlContent,
    text: `${senderName} shared a ${itemType} ("${itemName}") with you. Open: ${shareUrl}`
  });
}

// =========================================================================
// 7. SEND TEST EMAIL (FOR ADMIN DASHBOARD BENCHMARKING)
// =========================================================================
export async function sendTestEmail({ toEmail }) {
  const cleanTo = (toEmail || "").trim().toLowerCase();
  if (!cleanTo || !cleanTo.includes("@")) {
    throw new Error("Please provide a valid destination email address.");
  }

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>TeleDrive Email Gateway Test</title>
    <style>
      body { margin: 0; padding: 0; background-color: #070b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
      .container { max-width: 520px; margin: 40px auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #10b981, #0284c7); padding: 30px; text-align: center; color: #ffffff; }
      .content { padding: 30px; text-align: center; }
      .badge { display: inline-block; background: #064e3b; color: #34d399; font-weight: 700; padding: 6px 14px; border-radius: 10px; font-size: 12px; margin: 16px 0; }
      .footer { background: #090d18; padding: 16px; text-align: center; font-size: 11px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 22px;">☁️ TeleDrive Cloud</h1>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Email Gateway Diagnostics</div>
      </div>
      <div class="content">
        <div class="badge">✅ Delivery Successful</div>
        <h2 style="font-size: 17px; color: #ffffff; margin: 0 0 10px 0;">Outbound Email Dispatch Active</h2>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0;">
          This test email confirms that your TeleDrive Cloud email service is properly configured and delivering messages to inboxes.
        </p>
        <p style="font-size: 11px; color: #64748b; margin-top: 20px;">
          Timestamp: ${new Date().toUTCString()}
        </p>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} TeleDrive Cloud Gateway
      </div>
    </div>
  </body>
  </html>
  `;

  return await sendUnifiedEmail({
    to: cleanTo,
    subject: `[TeleDrive] Email Gateway Test Message - Success`,
    html: htmlContent,
    text: `TeleDrive Email Gateway Test: Outbound email delivery is working properly!`
  });
}
