import express from "express";
import multer from "multer";
import axios from "axios";
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
  deleteTelegramMessage,
  parseAndFetchTelegramPost,
  streamGramMedia,
  getTelegramConfig
} from "../telegram.js";
import {
  uploadLimiter,
  sanitizeFileName,
  validateTelegramUrl
} from "../security.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 } // 50MB Bot API limit
});

// POST /api/files/upload - Upload file to Telegram & store record
router.post("/upload", uploadLimiter, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file provided" });
    }

    const { folderId } = req.body;
    const targetFolder = folderId === "root" || !folderId ? null : folderId;
    const file = req.file;
    const safeName = sanitizeFileName(file.originalname);
    const fileType = detectFileType(file.mimetype, safeName);

    let telegramData = null;
    try {
      telegramData = await uploadFileToTelegram(
        file.buffer,
        safeName,
        file.mimetype,
        `Uploaded via TeleDrive: ${safeName}`
      );
    } catch (tgErr) {
      console.error("Telegram upload error:", tgErr.message);
      return res.status(500).json({
        success: false,
        error: `Telegram upload failed: ${tgErr.message}`
      });
    }

    const id = generateId("file_");
    const saved = await dbInsertFile({
      id,
      name: safeName,
      folder_id: targetFolder,
      size: file.size,
      mime_type: file.mimetype,
      type: fileType,
      source_type: telegramData.sourceType || "upload",
      telegram_file_id: telegramData.fileId || null,
      telegram_message_id: telegramData.messageId?.toString() || null,
      telegram_channel_id: telegramData.channelId?.toString() || null
    });

    res.json({ success: true, file: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/files/import-link - Import media from Telegram Post Link
router.post("/import-link", uploadLimiter, async (req, res) => {
  try {
    const { postUrl, folderId } = req.body;
    if (!postUrl || !validateTelegramUrl(postUrl)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Telegram post URL. Example: https://t.me/channel_name/123 or https://t.me/c/1234567890/123"
      });
    }

    const targetFolder = folderId === "root" || !folderId ? null : folderId;
    const mediaInfo = await parseAndFetchTelegramPost(postUrl);

    const safeFileName = sanitizeFileName(mediaInfo.fileName);
    const id = generateId("tg_");

    const fileRecord = await dbInsertFile({
      id,
      name: safeFileName,
      folder_id: targetFolder,
      size: mediaInfo.fileSize,
      mime_type: mediaInfo.mimeType,
      type: mediaInfo.type,
      source_type: "telegram_post",
      telegram_message_id: mediaInfo.messageId,
      telegram_channel_id: mediaInfo.channelId,
      telegram_post_url: mediaInfo.postUrl,
      telegram_channel_title: mediaInfo.channelTitle
    });

    res.json({ success: true, file: fileRecord, mediaInfo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/files/:id/stream - Stream media for in-browser Video / Audio / Image / PDF / Doc
router.get("/:id/stream", async (req, res) => {
  try {
    const { id } = req.params;
    const file = await dbGetFileById(id);

    if (!file) return res.status(404).send("File not found");

    const range = req.headers.range;

    // Case A: Imported from Telegram Post Link or MTProto Client
    if (file.source_type === "telegram_post" && file.telegram_channel_id && file.telegram_message_id) {
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

    // Case B: Uploaded via Telegram Bot API
    if (file.telegram_file_id) {
      const streamUrl = await getTelegramFileStreamUrl(file.telegram_file_id);

      const headers = {};
      if (range) headers["Range"] = range;

      const response = await axios({
        method: "get",
        url: streamUrl,
        responseType: "stream",
        headers
      });

      res.status(response.status);
      Object.keys(response.headers).forEach((key) => {
        if (["content-type", "content-length", "content-range", "accept-ranges"].includes(key.toLowerCase())) {
          res.setHeader(key, response.headers[key]);
        }
      });
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.name)}"`);

      response.data.pipe(res);
      return;
    }

    res.status(404).send("No streamable media source available for this file");
  } catch (err) {
    console.error("Stream error:", err.message);
    if (!res.headersSent) res.status(500).send(`Streaming error: ${err.message}`);
  }
});

// GET /api/files/:id/download - Download file
router.get("/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    const file = await dbGetFileById(id);

    if (!file) return res.status(404).send("File not found");

    if (file.source_type === "telegram_post" && file.telegram_channel_id && file.telegram_message_id) {
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

    if (file.telegram_file_id) {
      const streamUrl = await getTelegramFileStreamUrl(file.telegram_file_id);
      const response = await axios({
        method: "get",
        url: streamUrl,
        responseType: "stream"
      });

      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
      if (file.size) res.setHeader("Content-Length", file.size);

      response.data.pipe(res);
      return;
    }

    res.status(404).send("File media source unavailable");
  } catch (err) {
    res.status(500).send(`Download error: ${err.message}`);
  }
});

// PATCH /api/files/:id - Rename, Move, Star, Trash, Restore
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
