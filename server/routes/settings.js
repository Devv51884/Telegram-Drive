import express from "express";
import {
  sendTelegramPhoneCode,
  completeTelegramLogin,
  getConnectedTelegramUser,
  logoutTelegramUser,
  getTelegramConfig
} from "../telegram.js";
import {
  dbGetSetting,
  dbSetSetting
} from "../db.js";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  authLimiter
} from "../security.js";

const router = express.Router();

// ==========================================
// 1. MASTER AUTHENTICATION ENDPOINTS
// ==========================================

// GET /api/settings/auth/status - Check setup & session status
router.get("/auth/status", async (req, res) => {
  try {
    const masterHash = (await dbGetSetting("MASTER_PASSWORD_HASH")) || process.env.MASTER_PASSWORD_HASH;
    const isSetup = Boolean(masterHash);

    let isAuthenticated = false;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      isAuthenticated = await verifySessionToken(token);
    }

    res.json({
      success: true,
      isSetup,
      isAuthenticated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/auth/setup - First-time Master PIN / Password setup
router.post("/auth/setup", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: "Password / PIN must be at least 4 characters long"
      });
    }

    const existingHash = (await dbGetSetting("MASTER_PASSWORD_HASH")) || process.env.MASTER_PASSWORD_HASH;
    if (existingHash) {
      return res.status(400).json({
        success: false,
        error: "Master password has already been set. Use Login or Change Password."
      });
    }

    const hashed = hashPassword(password.trim());
    await dbSetSetting("MASTER_PASSWORD_HASH", hashed);

    const token = await createSessionToken();
    res.json({
      success: true,
      message: "Master Password configured successfully!",
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/auth/login - Master PIN / Password Login
router.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: "Password is required" });
    }

    const storedHash = (await dbGetSetting("MASTER_PASSWORD_HASH")) || process.env.MASTER_PASSWORD_HASH;
    if (!storedHash) {
      return res.status(400).json({
        success: false,
        error: "Master password not configured yet. Please complete initial setup."
      });
    }

    const isValid = verifyPassword(password.trim(), storedHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Incorrect Master PIN / Password"
      });
    }

    const token = await createSessionToken();
    res.json({
      success: true,
      message: "Access granted",
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/auth/change-password - Change Master Password
router.post("/auth/change-password", authLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 4 characters long"
      });
    }

    const storedHash = (await dbGetSetting("MASTER_PASSWORD_HASH")) || process.env.MASTER_PASSWORD_HASH;
    if (storedHash) {
      const isValid = verifyPassword(currentPassword.trim(), storedHash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: "Current password is incorrect" });
      }
    }

    const hashed = hashPassword(newPassword.trim());
    await dbSetSetting("MASTER_PASSWORD_HASH", hashed);

    const token = await createSessionToken();
    res.json({
      success: true,
      message: "Master Password changed successfully!",
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/auth/logout - Logout
router.post("/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

// ==========================================
// 2. SYSTEM STATUS (SANITIZED & SAFE)
// ==========================================

// GET /api/settings - Safe read-only status (no infrastructure/secret leakage)
router.get("/", async (req, res) => {
  try {
    const user = await getConnectedTelegramUser();
    res.json({
      success: true,
      settings: {
        telegramUser: user
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. TELEGRAM USER AUTHENTICATION
// ==========================================

// POST /api/settings/telegram-auth/send-code - Send OTP to phone
router.post("/telegram-auth/send-code", authLimiter, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number with country code is required (e.g. +919876543210)"
      });
    }

    const config = await getTelegramConfig();
    if (!config.apiId || !config.apiHash) {
      return res.status(500).json({
        success: false,
        error: "Server Error: API_ID and API_HASH are missing in the server's .env file."
      });
    }

    const result = await sendTelegramPhoneCode(phoneNumber.trim());
    res.json({
      success: true,
      message: "Verification code sent to your Telegram app / SMS",
      phoneCodeHash: result.phoneCodeHash
    });
  } catch (err) {
    let msg = err.message || "Failed to send code";
    if (msg.includes("API_ID_INVALID") || msg.includes("api_id is invalid") || msg.includes("400: API_ID_INVALID")) {
      msg = "Telegram rejected the API credentials (API_ID_INVALID). Please verify API_ID and API_HASH in your .env file.";
    } else if (msg.includes("PHONE_NUMBER_INVALID")) {
      msg = "Invalid phone number format. Please include your country code (e.g. +919876543210).";
    } else if (msg.includes("PHONE_NUMBER_FLOOD") || msg.includes("FLOOD_WAIT") || msg.includes("420: FLOOD_WAIT")) {
      msg = "Too many attempts. Telegram has temporarily rate limited this phone number. Please wait a few minutes before trying again.";
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/settings/telegram-auth/login - Verify OTP & 2FA
router.post("/telegram-auth/login", authLimiter, async (req, res) => {
  try {
    const { phoneNumber, code, password, phoneCodeHash } = req.body;
    if (!code && !password) {
      return res.status(400).json({ success: false, error: "Verification code is required" });
    }

    const result = await completeTelegramLogin(
      phoneNumber,
      code ? code.trim() : "",
      password ? password.trim() : "",
      phoneCodeHash
    );

    if (result.requires2FA) {
      return res.json({
        success: false,
        requires2FA: true,
        message: result.message || "2-Step Verification password is required for this account."
      });
    }

    res.json({
      success: true,
      message: "Telegram account connected successfully!",
      user: result.user
    });
  } catch (err) {
    let msg = err.message || "Login verification failed";
    if (msg.includes("PHONE_CODE_INVALID") || msg.includes("CODE_INVALID")) {
      msg = "Invalid verification code. Please check the code sent to your Telegram app.";
    } else if (msg.includes("PHONE_CODE_EXPIRED")) {
      msg = "The verification code has expired. Please request a new code.";
    } else if (msg.includes("PASSWORD_HASH_INVALID") || msg.includes("PASSWORD_INVALID")) {
      msg = "Incorrect 2FA password. Please check your Telegram 2-step verification password.";
    }
    res.status(400).json({ success: false, error: msg });
  }
});

// POST /api/settings/telegram-auth/logout - Disconnect account
router.post("/telegram-auth/logout", async (req, res) => {
  try {
    await logoutTelegramUser();
    res.json({ success: true, message: "Telegram account disconnected" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
