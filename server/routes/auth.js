import express from "express";
import {
  dbFindUserByEmail,
  dbFindUserById,
  dbCreateUser,
  dbInsertFolder,
  generateId
} from "../db.js";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  authLimiter
} from "../security.js";

const router = express.Router();

// POST /api/auth/signup - Register new account
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
      password_hash: passwordHash
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
        email: newUser.email
      }
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login - Sign in
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

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
        email: user.email
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
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout - Logout
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
