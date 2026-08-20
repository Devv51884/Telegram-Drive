import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";
import {
  dbGetFileById,
  dbInsertFile,
  dbUpdateFile,
  dbDeleteFile,
  generateId,
  detectFileType
} from "../db.js";
import {
  uploadFileToTelegram,
  getTelegramFileStreamUrl,
  streamGramMedia,
  deleteTelegramMessage,
  parseAndFetchTelegramPost
} from "../telegram.js";
import {
  sanitizeFileName,
  validateTelegramUrl,
  uploadLimiter
} from "../security.js";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure temporary uploads directory exists
const uploadDir = path.join(__dirname, "../data/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk storage engine for large streaming uploads up to 2GB
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configure Multer to support up to 2GB per file
const upload = multer({
  storage: storage,
  limits: { fileSize: 2000 * 1024 * 1024 } // 2000 MB (2GB)
});

// Active server-to-telegram live upload progress map
const activeUploadProgress = new Map();

// GET /api/files/upload-progress/:uploadId - Poll live server-to-telegram upload progress
router.get("/upload-progress/:uploadId", (req, res) => {
  const { uploadId } = req.params;
  const progress = activeUploadProgress.get(uploadId) || null;
  res.json({ success: true, progress });
});

// POST /api/files/upload - Direct File Upload to Telegram Cloud (up to 2GB)
router.post("/upload", uploadLimiter, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file provided" });
  }

  const tempFilePath = req.file.path;
  const uploadId = req.body.uploadId || null;

  try {
    const { folderId } = req.body;
    const cleanName = sanitizeFileName(req.file.originalname);
    const mimeType = req.file.mimetype || "application/octet-stream";
    const type = detectFileType(mimeType, cleanName);
    const targetFolder = folderId === "root" || !folderId ? null : folderId;

    if (uploadId) {
      activeUploadProgress.set(uploadId, {
        loaded: 0,
        total: req.file.size,
        percent: 0,
        status: "telegram_uploading"
      });
    }

    // Upload disk file to Telegram Cloud (Dual-Strategy: Bot or Connected Account)
    const result = await uploadFileToTelegram(
      tempFilePath,
      cleanName,
      mimeType,
      `Uploaded to TeleDrive: ${cleanName}`,
      (progressData) => {
        if (uploadId) {
          activeUploadProgress.set(uploadId, {
            ...progressData,
            status: "telegram_uploading",
            updatedAt: Date.now()
          });
        }
      }
    );

    if (uploadId) {
      activeUploadProgress.set(uploadId, {
        loaded: req.file.size,
        total: req.file.size,
        percent: 100,
        status: "done"
      });
    }

    const fileId = generateId("file_");
    const fileRecord = {
      id: fileId,
      user_id: req.userId || null,
      name: cleanName,
      folder_id: targetFolder,
      size: result.fileSize || req.file.size,
      mime_type: mimeType,
      type: type,
      source_type: result.sourceType || "upload",
      telegram_file_id: result.fileId || null,
      telegram_message_id: result.messageId ? result.messageId.toString() : null,
      telegram_channel_id: result.channelId ? result.channelId.toString() : null,
      telegram_access_hash: result.accessHash || null,
      telegram_file_reference: result.fileReference || null,
      is_starred: 0,
      is_trash: 0
    };

    const saved = await dbInsertFile(fileRecord);

    res.json({
      success: true,
      file: saved
    });
  } catch (err) {
    if (uploadId) {
      activeUploadProgress.delete(uploadId);
    }
    console.error("Upload error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (uploadId) {
      setTimeout(() => activeUploadProgress.delete(uploadId), 10000);
    }
    // Delete temporary file from local disk
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.promises.unlink(tempFilePath).catch(() => {});
    }
  }
});

// POST /api/files/import-link - Import media from a Telegram post URL
router.post("/import-link", uploadLimiter, async (req, res) => {
  try {
    const { postUrl, folderId, customName } = req.body;

    if (!postUrl || !validateTelegramUrl(postUrl)) {
      return res.status(400).json({
        success: false,
        error: "Valid Telegram post URL is required (e.g., https://t.me/channel_name/123 or https://t.me/c/1234567890/123)"
      });
    }

    const mediaInfo = await parseAndFetchTelegramPost(postUrl);
    const fileName = customName ? sanitizeFileName(customName) : sanitizeFileName(mediaInfo.fileName);
    const targetFolder = folderId === "root" || !folderId ? null : folderId;

    const fileId = generateId("file_");
    const fileRecord = {
      id: fileId,
      user_id: req.userId || null,
      name: fileName,
      folder_id: targetFolder,
      size: mediaInfo.fileSize,
      mime_type: mediaInfo.mimeType,
      type: mediaInfo.type,
      source_type: "telegram_post",
      telegram_post_url: postUrl.trim(),
      telegram_message_id: mediaInfo.messageId,
      telegram_channel_id: mediaInfo.channelId,
      telegram_channel_title: mediaInfo.channelTitle,
      is_starred: 0,
      is_trash: 0
    };

    const saved = await dbInsertFile(fileRecord);

    res.json({
      success: true,
      file: saved
    });
  } catch (err) {
    console.error("Import link error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/files/:id/stream - Video/Audio/PDF/Document Streaming
router.get("/:id/stream", async (req, res) => {
  try {
    const { id } = req.params;
    const file = await dbGetFileById(id);

    if (!file) {
      return res.status(404).send("File not found");
    }

    const range = req.headers.range;

    // Strategy 1: Bot API File Id (Fast Direct Bot CDN Streaming for all uploaded files)
    if (file.telegram_file_id) {
      try {
        const downloadUrl = await getTelegramFileStreamUrl(file.telegram_file_id);
        const headers = { "User-Agent": "TeleDrive/1.0" };
        if (range) headers.Range = range;

        const response = await axios({
          method: "GET",
          url: downloadUrl,
          responseType: "stream",
          headers,
          timeout: 0
        });

        const isPdf = file.name?.toLowerCase().endsWith(".pdf") || file.mime_type === "application/pdf";
        const contentType = isPdf ? "application/pdf" : file.mime_type || "application/octet-stream";

        res.status(response.status);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);

        if (response.headers["content-range"]) {
          res.setHeader("Content-Range", response.headers["content-range"]);
        }
        if (response.headers["content-length"]) {
          res.setHeader("Content-Length", response.headers["content-length"]);
        }
        if (response.headers["accept-ranges"]) {
          res.setHeader("Accept-Ranges", response.headers["accept-ranges"]);
        }

        response.data.pipe(res);
        return;
      } catch (botErr) {
        console.warn("Bot stream failed, falling back to MTProto:", botErr.message);
      }
    }

    // Strategy 2: MTProto Channel Post or Account Saved Message
    if (file.telegram_channel_id && file.telegram_message_id) {
      await streamGramMedia(
        file.telegram_channel_id,
        file.telegram_message_id,
        range,
        req,
        res,
        file.mime_type,
        file.name
      );
      return;
    }

    res.status(400).send("No valid Telegram reference found for this file");
  } catch (err) {
    console.error("Stream error:", err.message);
    if (!res.headersSent) {
      res.status(500).send(`Streaming failed: ${err.message}`);
    }
  }
});

// GET /api/files/:id/download - Direct Download Attachment
router.get("/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    const file = await dbGetFileById(id);

    if (!file) {
      return res.status(404).send("File not found");
    }

    if (file.telegram_file_id) {
      try {
        const downloadUrl = await getTelegramFileStreamUrl(file.telegram_file_id);
        const response = await axios({
          method: "GET",
          url: downloadUrl,
          responseType: "stream",
          timeout: 0
        });

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
        if (response.headers["content-length"]) {
          res.setHeader("Content-Length", response.headers["content-length"]);
        }
        if (file.mime_type) {
          res.setHeader("Content-Type", file.mime_type);
        }

        response.data.pipe(res);
        return;
      } catch (botErr) {
        console.warn("Bot download failed, falling back to MTProto:", botErr.message);
      }
    }

    if (file.telegram_channel_id && file.telegram_message_id) {
      await streamGramMedia(
        file.telegram_channel_id,
        file.telegram_message_id,
        null,
        req,
        res,
        file.mime_type,
        file.name
      );
      return;
    }

    res.status(400).send("No valid Telegram reference found for this file");
  } catch (err) {
    console.error("Download error:", err.message);
    if (!res.headersSent) {
      res.status(500).send(`Download failed: ${err.message}`);
    }
  }
});

// PATCH /api/files/:id - Rename, Move, Star, Trash
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, folderId, isStarred, isTrash } = req.body;

    const file = await dbGetFileById(id);
    if (!file) return res.status(404).json({ success: false, error: "File not found" });

    const updates = {};
    if (name !== undefined) updates.name = sanitizeFileName(name.trim());
    if (folderId !== undefined) updates.folder_id = folderId === "root" || !folderId ? null : folderId;
    if (isStarred !== undefined) updates.is_starred = isStarred ? 1 : 0;
    if (isTrash !== undefined) updates.is_trash = isTrash ? 1 : 0;

    const updated = await dbUpdateFile(id, updates);
    res.json({ success: true, file: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/files/:id - Permanent delete
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const file = await dbGetFileById(id);

    if (!file) return res.status(404).json({ success: false, error: "File not found" });

    if (file.telegram_message_id && file.telegram_channel_id && file.source_type === "upload") {
      await deleteTelegramMessage(file.telegram_message_id, file.telegram_channel_id);
    }

    await dbDeleteFile(id);
    res.json({ success: true, message: "File permanently deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
