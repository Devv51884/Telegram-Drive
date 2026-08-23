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
  const folderId = req.body.folderId || null;

  try {
    const cleanName = sanitizeFileName(req.file.originalname);
    const lowerName = cleanName.toLowerCase();
    let mimeType = req.file.mimetype || "application/octet-stream";
    if (lowerName.endsWith(".mp4") || mimeType === "video/mp2t" || mimeType.includes("mp4")) mimeType = "video/mp4";
    else if (lowerName.endsWith(".webm")) mimeType = "video/webm";
    else if (lowerName.endsWith(".mkv")) mimeType = "video/x-matroska";
    else if (lowerName.endsWith(".mov")) mimeType = "video/quicktime";
    else if (lowerName.endsWith(".mp3") || lowerName.endsWith(".m4a")) mimeType = "audio/mpeg";
    else if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
    else if (lowerName.endsWith(".png")) mimeType = "image/png";
    else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) mimeType = "image/jpeg";
    
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

// Helper: Stream file via Telegram Bot CDN with precise HTTP 206 Range slicing & Direct Range Forwarding
async function streamTelegramBotFile(file, range, req, res) {
  if (!file.telegram_file_id) {
    throw new Error("No telegram_file_id available for Bot streaming");
  }

  const downloadUrl = await getTelegramFileStreamUrl(file.telegram_file_id);
  const totalSize = Number(file.size) || 0;

  const lowerName = (file.name || "").toLowerCase().trim();
  let contentType = "application/octet-stream";
  if (lowerName.endsWith(".webm") || file.mime_type?.includes("webm")) {
    contentType = "video/webm";
  } else if (lowerName.endsWith(".mkv") || file.mime_type?.includes("matroska")) {
    contentType = "video/x-matroska";
  } else if (
    lowerName.endsWith(".mp4") ||
    lowerName.endsWith(".m4v") ||
    lowerName.endsWith(".mov") ||
    lowerName.endsWith(".ts") ||
    file.mime_type?.includes("mp4") ||
    file.mime_type === "video/mp2t" ||
    file.type === "video" ||
    (!file.mime_type?.includes("audio") && !file.mime_type?.includes("image") && !file.mime_type?.includes("pdf") && !lowerName.match(/\.(png|jpg|jpeg|gif|webp|pdf|mp3|m4a|ogg|docx|txt|json)$/))
  ) {
    contentType = "video/mp4";
  } else if (lowerName.endsWith(".mp3") || lowerName.endsWith(".m4a") || file.mime_type?.includes("audio") || file.type === "audio") {
    contentType = "audio/mpeg";
  } else if (lowerName.endsWith(".pdf") || file.mime_type === "application/pdf" || file.type === "pdf") {
    contentType = "application/pdf";
  } else if (lowerName.endsWith(".png")) {
    contentType = "image/png";
  } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    contentType = "image/jpeg";
  } else if (lowerName.endsWith(".webp")) {
    contentType = "image/webp";
  } else if (file.mime_type && file.mime_type !== "video/mp2t") {
    contentType = file.mime_type;
  } else {
    contentType = "video/mp4";
  }

  // Forward incoming Range header directly to Telegram Bot API CDN for native HTTP 206 slicing
  const axiosHeaders = {
    "User-Agent": "TeleDrive/1.0"
  };
  if (range) {
    axiosHeaders["Range"] = range;
  }

  const response = await axios({
    method: "GET",
    url: downloadUrl,
    responseType: "stream",
    headers: axiosHeaders,
    timeout: 0,
    validateStatus: (status) => status < 400
  });

  const remoteContentLength = parseInt(response.headers["content-length"] || "0", 10);
  const actualTotalSize = totalSize > 0 ? totalSize : remoteContentLength;

  let clientClosed = false;
  req.on("close", () => {
    clientClosed = true;
    if (response.data?.destroy) {
      try {
        response.data.destroy();
      } catch {}
    }
  });

  // 1. If Telegram CDN natively returned HTTP 206 Partial Content
  if (response.status === 206) {
    res.writeHead(206, {
      "Content-Range": response.headers["content-range"] || (range ? `${range.replace("=", " ")}/${actualTotalSize}` : undefined),
      "Accept-Ranges": "bytes",
      "Content-Length": response.headers["content-length"] || (remoteContentLength > 0 ? remoteContentLength : undefined),
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate"
    });
    response.data.pipe(res);
    return;
  }

  // 2. If client asked for Range but Telegram CDN returned HTTP 200 -> Slice stream in real-time
  if (range && actualTotalSize > 0) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;
    const rawEnd = parts[1] ? parseInt(parts[1], 10) : actualTotalSize - 1;
    const end = Math.min(rawEnd, actualTotalSize - 1);
    const chunkLength = Math.max(0, end - start + 1);

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${actualTotalSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkLength,
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate"
    });

    let bytesRead = 0;
    let bytesSent = 0;

    response.data.on("data", (chunk) => {
      if (clientClosed || res.writableEnded || res.destroyed) return;
      const chunkStart = bytesRead;
      const chunkEnd = bytesRead + chunk.length - 1;
      bytesRead += chunk.length;

      // Skip chunks before requested range start
      if (chunkEnd < start) return;

      // Finish if chunk is beyond requested range end
      if (chunkStart > end) {
        if (!res.writableEnded && !res.destroyed) res.end();
        if (response.data?.destroy) response.data.destroy();
        return;
      }

      const sliceStart = Math.max(0, start - chunkStart);
      const sliceEnd = Math.min(chunk.length, end - chunkStart + 1);
      const slice = chunk.subarray(sliceStart, sliceEnd);

      res.write(slice);
      bytesSent += slice.length;

      if (bytesSent >= chunkLength) {
        if (!res.writableEnded && !res.destroyed) res.end();
        if (response.data?.destroy) response.data.destroy();
      }
    });

    response.data.on("end", () => {
      if (!res.writableEnded && !res.destroyed) res.end();
    });

    response.data.on("error", () => {
      if (!res.writableEnded && !res.destroyed) res.end();
    });
  } else {
    // 3. Full Stream (HTTP 200)
    res.writeHead(200, {
      "Content-Length": actualTotalSize > 0 ? actualTotalSize : undefined,
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    });
    response.data.pipe(res);
  }
}

// GET /api/files/:id/stream - Video/Audio/PDF/Document Streaming
router.get("/:id/stream", async (req, res) => {
  try {
    const { id } = req.params;
    const file = await dbGetFileById(id);

    if (!file) {
      return res.status(404).send("File not found");
    }

    const range = req.headers.range;
    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const fileSize = Number(file.size) || 0;
    const isUploaded = file.source_type === "upload" || !file.source_type;

    // Strategy 1: Telegram Bot API CDN Stream (Only for files <= 20MB where telegram_file_id is valid)
    if (file.telegram_file_id && fileSize > 0 && fileSize <= 20 * 1024 * 1024) {
      try {
        await streamTelegramBotFile(file, range, req, res);
        return;
      } catch (botErr) {
        console.warn("Bot CDN stream attempt failed, falling back to MTProto:", botErr.message);
      }
    }

    // Strategy 2: High-Speed MTProto Multi-DC Direct Stream (Works for files of any size up to 2GB)
    if (targetChannelId && file.telegram_message_id) {
      try {
        await streamGramMedia(
          targetChannelId,
          file.telegram_message_id,
          range,
          req,
          res,
          file.mime_type,
          file.name,
          false, // isDownload = false
          isUploaded // useStorageBot = true for uploaded files
        );
        return;
      } catch (mtprotoErr) {
        console.warn("MTProto streaming failed:", mtprotoErr.message);
      }
    }

    res.status(400).send("No valid Telegram streaming reference found for this file");
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

    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const fileSize = Number(file.size) || 0;
    const isUploaded = file.source_type === "upload" || !file.source_type;

    // Strategy 1: Telegram Bot API direct download (Only for files <= 20MB where telegram_file_id is valid)
    if (file.telegram_file_id && fileSize > 0 && fileSize <= 20 * 1024 * 1024) {
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

    // Strategy 2: High-Speed MTProto Multi-DC Direct Stream (Works for files of any size up to 2GB)
    if (targetChannelId && file.telegram_message_id) {
      await streamGramMedia(
        targetChannelId,
        file.telegram_message_id,
        null,
        req,
        res,
        file.mime_type,
        file.name,
        true, // isDownload = true
        isUploaded // useStorageBot = true for uploaded files
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

    const isAdmin = req.user?.role === "admin" || req.user?.email === "devv5412@gmail.com";
    if (file.user_id && req.userId && file.user_id !== req.userId && !isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied. You do not own this file." });
    }

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

    const isAdmin = req.user?.role === "admin" || req.user?.email === "devv5412@gmail.com";
    if (file.user_id && req.userId && file.user_id !== req.userId && !isAdmin) {
      return res.status(403).json({ success: false, error: "Access denied. You do not own this file." });
    }

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
