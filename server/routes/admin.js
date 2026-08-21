import express from "express";
import bcrypt from "bcryptjs";
import {
  dbGetAdminOverview,
  dbGetAllUsersWithStats,
  dbFindUserById,
  dbUpdateUser,
  dbDeleteUserCascade,
  dbGetAllFilesAdmin,
  dbGetFileById,
  dbDeleteFile,
  dbGetSetting,
  dbSetSetting
} from "../db.js";
import { requireAdmin } from "../security.js";
import {
  getGramClient,
  getTelegramUserStatus,
  deleteTelegramMessage
} from "../telegram.js";
import axios from "axios";

const router = express.Router();

// Apply requireAdmin middleware to all admin endpoints
router.use(requireAdmin);

// GET /api/admin/overview - Analytics, Storage & System Status
router.get("/overview", async (req, res) => {
  try {
    const overview = await dbGetAdminOverview();

    // Check Telegram Bot API status
    let botConnected = false;
    let botUsername = "";
    const botToken = process.env.BOT_TOKEN;
    if (botToken) {
      try {
        const botRes = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 3000 });
        if (botRes.data?.ok) {
          botConnected = true;
          botUsername = botRes.data.result.username;
        }
      } catch {}
    }

    // Check MTProto User status
    let mtprotoConnected = false;
    let mtprotoUser = null;
    try {
      const tgStatus = await getTelegramUserStatus();
      if (tgStatus.connected) {
        mtprotoConnected = true;
        mtprotoUser = tgStatus.info;
      }
    } catch {}

    const storageChannelId = process.env.STORAGE_CHANNEL_ID || "-1003808048037";

    res.json({
      success: true,
      data: {
        ...overview,
        systemHealth: {
          bot: {
            configured: Boolean(botToken),
            connected: botConnected,
            username: botUsername
          },
          mtproto: {
            connected: mtprotoConnected,
            user: mtprotoUser
          },
          storageChannelId,
          database: "SQLite (WAL Mode) + Supabase Sync"
        }
      }
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users - List all users
router.get("/users", async (req, res) => {
  try {
    const users = await dbGetAllUsersWithStats();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:id/role - Update user role (admin / user)
router.post("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role. Must be 'admin' or 'user'." });
    }

    const user = await dbFindUserById(id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    // Prevent removing admin role from primary owner
    if (user.email === "devv5412@gmail.com" && role !== "admin") {
      return res.status(403).json({ success: false, error: "Cannot demote the primary owner account." });
    }

    const updated = await dbUpdateUser(id, { role });
    res.json({ success: true, user: updated, message: `Role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:id/status - Toggle user active / disabled status
router.post("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status. Must be 'active' or 'disabled'." });
    }

    const user = await dbFindUserById(id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    if (user.email === "devv5412@gmail.com") {
      return res.status(403).json({ success: false, error: "Cannot disable the primary owner account." });
    }

    const updated = await dbUpdateUser(id, { status });
    res.json({ success: true, user: updated, message: `Account status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:id/reset-password - Admin reset password for any user
router.post("/users/:id/reset-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }

    const user = await dbFindUserById(id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const password_hash = await bcrypt.hash(newPassword, 10);
    await dbUpdateUser(id, { password_hash });

    res.json({ success: true, message: `Password for ${user.name} has been reset successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/users/:id - Delete a user and cascade clean their data
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await dbFindUserById(id);

    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (user.email === "devv5412@gmail.com") {
      return res.status(403).json({ success: false, error: "Cannot delete the primary owner account." });
    }

    await dbDeleteUserCascade(id);
    res.json({ success: true, message: `User ${user.name} (${user.email}) and associated data deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/files - Global searchable file manager
router.get("/files", async (req, res) => {
  try {
    const { search = "", type = "all", page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const data = await dbGetAllFilesAdmin({
      search,
      type,
      limit: limitNum,
      offset
    });

    res.json({
      success: true,
      total: data.total,
      page: pageNum,
      limit: limitNum,
      files: data.files
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/files/:id - Force delete any file
router.delete("/files/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const file = await dbGetFileById(id);

    if (!file) return res.status(404).json({ success: false, error: "File not found" });

    if (file.telegram_message_id && file.telegram_channel_id && file.source_type === "upload") {
      await deleteTelegramMessage(file.telegram_message_id, file.telegram_channel_id);
    }

    await dbDeleteFile(id);
    res.json({ success: true, message: `File "${file.name}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/system/ping - Test Telegram latency
router.post("/system/ping", async (req, res) => {
  try {
    const t0 = Date.now();
    const client = await getGramClient();
    let mtprotoPing = -1;
    if (client) {
      await client.getMe();
      mtprotoPing = Date.now() - t0;
    }

    let botPing = -1;
    const botToken = process.env.BOT_TOKEN;
    if (botToken) {
      const tb0 = Date.now();
      await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 3000 });
      botPing = Date.now() - tb0;
    }

    res.json({
      success: true,
      mtprotoPingMs: mtprotoPing,
      botPingMs: botPing,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
