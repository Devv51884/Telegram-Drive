import express from "express";
import rateLimit from "express-rate-limit";
import {
  dbSaveContactMessage,
  dbGetContactMessages,
  dbUpdateContactMessageStatus,
  dbDeleteContactMessage,
  dbGetSiteSettings,
  dbBulkUpdateSiteSettings
} from "../db.js";
import { requireAdmin } from "../security.js";
import { sendEmailSafely } from "../email.js";

const router = express.Router();

// Rate limiter for contact form submissions (Max 5 submissions per 15 minutes per IP)
const contactSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many messages sent. Please wait a few minutes before submitting another inquiry."
  }
});

// ==========================================
// 1. PUBLIC CONTACT ENDPOINTS
// ==========================================

// GET /api/contact/settings - Public read-only contact information & banner
router.get("/settings", async (req, res) => {
  try {
    const settings = await dbGetSiteSettings();
    res.json({
      success: true,
      settings: {
        supportEmail: settings.supportEmail || "support@telegram-drive.in",
        telegramSupport: settings.telegramSupport || "@TeleDriveSupport",
        telegramChannel: settings.telegramChannel || "https://t.me/telegram_drive_in",
        announcementBanner: settings.announcementBanner || "",
        enableContactForm: settings.enableContactForm !== "false",
        brandName: settings.brandName || "TeleDrive",
        contactHeading: settings.contactHeading || "We'd love to hear from you",
        contactSubheading: settings.contactSubheading || "Have a question, feedback, or need assistance? Get in touch with our team directly."
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/contact/submit - Submit contact inquiry form
router.post("/submit", contactSubmitLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Please enter your name." });
    }
    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, error: "Please select or enter a subject." });
    }
    if (!message || !message.trim() || message.trim().length < 10) {
      return res.status(400).json({ success: false, error: "Message must be at least 10 characters long." });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    const saved = await dbSaveContactMessage({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
      ip_address: typeof ip === "string" ? ip.split(",")[0].trim() : null
    });

    // Send confirmation email copy if email service is active (non-blocking)
    (async () => {
      try {
        const siteSettings = await dbGetSiteSettings();
        await sendEmailSafely({
          to: email.trim(),
          subject: `Thank you for contacting ${siteSettings.brandName || "TeleDrive"} [${saved.id}]`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
              <h2 style="color: #38bdf8; margin-top: 0;">Inquiry Received</h2>
              <p>Hi <strong>${name.trim()}</strong>,</p>
              <p>We have successfully received your message regarding <strong>"${subject.trim()}"</strong>.</p>
              <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #38bdf8;">
                <p style="margin: 0; font-style: italic; color: #cbd5e1;">"${message.trim()}"</p>
              </div>
              <p style="color: #94a3b8; font-size: 13px;">Our support team will review your inquiry and get back to you at this email address shortly.</p>
              <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;" />
              <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">${siteSettings.brandName || "TeleDrive"} Support Team</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.warn("Contact acknowledgment email notice:", mailErr.message);
      }
    })();

    res.json({
      success: true,
      message: "Thank you! Your message has been sent successfully. We'll get back to you soon.",
      inquiryId: saved.id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. ADMIN CONTACT INQUIRIES & SITE SETTINGS
// ==========================================

// GET /api/admin/contact-messages - List all inquiries
router.get("/admin/messages", requireAdmin, async (req, res) => {
  try {
    const { status = "all", search = "", page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const data = await dbGetContactMessages({
      status,
      search,
      limit: limitNum,
      offset
    });

    res.json({
      success: true,
      total: data.total,
      page: pageNum,
      limit: limitNum,
      messages: data.messages
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/contact-messages/:id - Update message status (unread / read / replied)
router.patch("/admin/messages/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["unread", "read", "replied", "archived"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value." });
    }

    const updated = await dbUpdateContactMessageStatus(id, status);
    res.json({ success: true, message: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/contact-messages/:id - Delete inquiry
router.delete("/admin/messages/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await dbDeleteContactMessage(id);
    res.json({ success: true, message: "Contact inquiry deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/site-settings - Get full site settings for admin editing
router.get("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const settings = await dbGetSiteSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/site-settings - Update site settings
router.post("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ success: false, error: "Invalid settings payload." });
    }

    const updated = await dbBulkUpdateSiteSettings(settings);
    res.json({
      success: true,
      message: "Site settings updated successfully across SQLite and Supabase!",
      settings: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
