import express from "express";
import crypto from "crypto";
import {
  dbFindUserByEmail,
  dbFindUserById,
  dbCreateUser,
  dbUpdateUser,
  dbDeleteUser,
  dbInsertFolder,
  dbSaveOtp,
  dbVerifyOtp,
  generateId
} from "../db.js";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  authLimiter
} from "../security.js";
import { sendOtpEmail } from "../email.js";

const router = express.Router();

// ==========================================
// 1. GMAIL OTP SIGNUP FLOW (REAL-TIME VERIFICATION)
// ==========================================

// POST /api/auth/signup/send-otp - Step 1: Send real-time OTP to Gmail
router.post("/signup/send-otp", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Full Name is required" });
    }
    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid Gmail/Email address is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if user already exists
    const existing = await dbFindUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "An account with this email already exists. Please sign in or reset password."
      });
    }

    // Generate 6-digit OTP code
    const otp = crypto.randomInt(100000, 999999).toString();
    const passwordHash = hashPassword(password);

    // Store OTP in database (10 minute expiry) with pending registration metadata
    await dbSaveOtp(cleanEmail, otp, "signup", {
      name: cleanName,
      password_hash: passwordHash
    }, 10);

    // Send real-time verification email
    const emailResult = await sendOtpEmail({
      to: cleanEmail,
      name: cleanName,
      otp,
      type: "signup"
    });

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}`,
      simulated: emailResult.simulated || false
    });
  } catch (err) {
    console.error("Signup OTP error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/signup/verify-otp - Step 2: Verify OTP and activate account
router.post("/signup/verify-otp", authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "Email and 6-digit verification code are required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const verification = await dbVerifyOtp(cleanEmail, cleanOtp, "signup");
    if (!verification.valid || !verification.metadata) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification code. Please request a new one."
      });
    }

    const { name, password_hash } = verification.metadata;

    // Double check user doesn't exist
    const existing = await dbFindUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Account is already registered. Please sign in."
      });
    }

    // Create user
    const userId = generateId("u_");
    const newUser = await dbCreateUser({
      id: userId,
      name: name || "TeleDrive User",
      email: cleanEmail,
      password_hash: password_hash,
      is_2fa_enabled: 0
    });

    // Create starter folders
    await Promise.all([
      dbInsertFolder({
        id: generateId("f_"),
        name: "Documents",
        color: "#4285f4",
        parent_id: null,
        user_id: userId
      }),
      dbInsertFolder({
        id: generateId("f_"),
        name: "Media & Photos",
        color: "#34a853",
        parent_id: null,
        user_id: userId
      }),
      dbInsertFolder({
        id: generateId("f_"),
        name: "Telegram Channel Imports",
        color: "#0088cc",
        parent_id: null,
        user_id: userId
      })
    ]);

    // Issue signed session token
    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    res.json({
      success: true,
      message: "Gmail verified and account created successfully!",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || (newUser.email === "devv5412@gmail.com" ? "admin" : "user"),
        status: newUser.status || "active",
        is2FAEnabled: false
      }
    });
  } catch (err) {
    console.error("Signup verify error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy direct signup endpoint (fallback compatibility)
router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Full Name is required" });
    }
    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email address is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if user already exists
    const existing = await dbFindUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "An account with this email already exists. Please login instead."
      });
    }

    // Create user
    const userId = generateId("u_");
    const passwordHash = hashPassword(password);

    const newUser = await dbCreateUser({
      id: userId,
      name: cleanName,
      email: cleanEmail,
      password_hash: passwordHash,
      is_2fa_enabled: 0
    });

    // Create default starter folders for new user
    await Promise.all([
      dbInsertFolder({
        id: generateId("f_"),
        name: "Documents",
        color: "#4285f4",
        parent_id: null,
        user_id: userId
      }),
      dbInsertFolder({
        id: generateId("f_"),
        name: "Media & Photos",
        color: "#34a853",
        parent_id: null,
        user_id: userId
      }),
      dbInsertFolder({
        id: generateId("f_"),
        name: "Telegram Channel Imports",
        color: "#0088cc",
        parent_id: null,
        user_id: userId
      })
    ]);

    // Issue signed session token
    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    res.json({
      success: true,
      message: "Account created successfully!",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || (newUser.email === "devv5412@gmail.com" ? "admin" : "user"),
        status: newUser.status || "active",
        is2FAEnabled: false
      }
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. FORGOT PASSWORD FLOW VIA GMAIL OTP
// ==========================================

// POST /api/auth/forgot-password/send-otp - Step 1: Send reset OTP to Gmail
router.post("/forgot-password/send-otp", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid Gmail/Email address is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await dbFindUserByEmail(cleanEmail);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "No TeleDrive account found with this email address."
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    await dbSaveOtp(cleanEmail, otp, "forgot_password", { userId: user.id }, 10);

    const emailResult = await sendOtpEmail({
      to: cleanEmail,
      name: user.name,
      otp,
      type: "forgot_password"
    });

    res.json({
      success: true,
      message: `A password reset code has been sent to ${cleanEmail}`,
      simulated: emailResult.simulated || false
    });
  } catch (err) {
    console.error("Forgot password send OTP error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/forgot-password/verify-otp - Step 2: Verify OTP and set new password
router.post("/forgot-password/verify-otp", authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Email, OTP code, and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const verification = await dbVerifyOtp(cleanEmail, cleanOtp, "forgot_password");
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset code. Please request a new code."
      });
    }

    const user = await dbFindUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: "User account not found" });
    }

    const newHash = hashPassword(newPassword);
    await dbUpdateUser(user.id, { password_hash: newHash });

    // Issue new session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      success: true,
      message: "Password reset successfully! You are now signed in.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error("Forgot password verify error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login - Sign in
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password, pin } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await dbFindUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "No account found with this email. Please sign up."
      });
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Incorrect password. Please try again."
      });
    }

    // Check if 2-Factor PIN is enabled on this user account
    if (user.is_2fa_enabled && user.pin_hash) {
      if (!pin) {
        return res.json({
          success: false,
          requires2FAPin: true,
          message: "Please enter your 2-Factor Security PIN to complete login."
        });
      }
      const isPinValid = verifyPassword(pin, user.pin_hash);
      if (!isPinValid) {
        return res.status(401).json({
          success: false,
          error: "Incorrect 2-Factor Security PIN. Please try again."
        });
      }
    }

    // Issue signed session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    res.json({
      success: true,
      message: "Logged in successfully!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || (user.email === "devv5412@gmail.com" ? "admin" : "user"),
        status: user.status || "active",
        is2FAEnabled: Boolean(user.is_2fa_enabled && user.pin_hash)
      }
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me - Get current logged-in user profile
router.get("/me", async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const user = await dbFindUserById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || (user.email === "devv5412@gmail.com" ? "admin" : "user"),
        status: user.status || "active",
        is2FAEnabled: Boolean(user.is_2fa_enabled && user.pin_hash),
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile - Update User Profile (Name, Email)
router.put("/profile", async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, error: "Not authenticated" });

    const { name, email } = req.body;
    const updates = {};

    if (name && name.trim()) updates.name = name.trim();
    if (email && email.trim() && email.includes("@")) {
      const cleanEmail = email.trim().toLowerCase();
      // Check duplicate
      const existing = await dbFindUserByEmail(cleanEmail);
      if (existing && existing.id !== req.userId) {
        return res.status(400).json({ success: false, error: "This email is already in use by another account." });
      }
      updates.email = cleanEmail;
    }

    const updated = await dbUpdateUser(req.userId, updates);
    res.json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        is2FAEnabled: Boolean(updated.is_2fa_enabled && updated.pin_hash)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/password - Change User Password
router.put("/password", async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, error: "Not authenticated" });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
    }

    const user = await dbFindUserById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const isMatch = verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Current password is incorrect." });
    }

    const newHash = hashPassword(newPassword);
    await dbUpdateUser(req.userId, { password_hash: newHash });

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/2fa-pin - Configure / Update 2-Factor Security PIN
router.put("/2fa-pin", async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, error: "Not authenticated" });

    const { pin, isEnabled, currentPassword } = req.body;
    const user = await dbFindUserById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    if (currentPassword) {
      const isMatch = verifyPassword(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: "Current account password is incorrect." });
      }
    }

    const updates = {};
    if (isEnabled !== undefined) {
      updates.is_2fa_enabled = isEnabled ? 1 : 0;
    }

    if (pin && pin.trim()) {
      if (pin.trim().length < 4) {
        return res.status(400).json({ success: false, error: "Security PIN must be at least 4 digits." });
      }
      updates.pin_hash = hashPassword(pin.trim());
      updates.is_2fa_enabled = 1;
    }

    const updated = await dbUpdateUser(req.userId, updates);

    res.json({
      success: true,
      message: updates.is_2fa_enabled ? "2-Factor Security PIN is active!" : "2-Factor Security PIN disabled.",
      is2FAEnabled: Boolean(updated.is_2fa_enabled && updated.pin_hash)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/verify-pin - Verify User's 2FA PIN
router.post("/verify-pin", async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, error: "Not authenticated" });

    const { pin } = req.body;
    const user = await dbFindUserById(req.userId);
    if (!user || !user.pin_hash) {
      return res.json({ success: true }); // No PIN configured
    }

    const isValid = verifyPassword(pin, user.pin_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Incorrect Security PIN." });
    }

    res.json({ success: true, message: "PIN verified!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/auth/account - Delete Account & Wipe User's Drive
router.delete("/account", async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, error: "Not authenticated" });

    const { password } = req.body;
    const user = await dbFindUserById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Incorrect password. Account deletion cancelled." });
    }

    await dbDeleteUser(req.userId);
    res.json({ success: true, message: "Account and personal drive permanently deleted." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout - Logout
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
