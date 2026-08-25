import express from "express";
import crypto from "crypto";
import {
  dbGetFileById,
  dbGetFolderById,
  dbUpdateFile,
  dbUpdateFolder,
  dbGetFileByShareToken,
  dbGetFolderByShareToken,
  dbGetSharedFolderContents,
  dbIsFolderDescendant,
  dbGetFolderBreadcrumbTrail,
  dbIsFileInSharedFolderTree
} from "../db.js";
import {
  streamGramMedia,
  getTelegramFileStreamUrl
} from "../telegram.js";
import axios from "axios";

const router = express.Router();

// Helper: Stream file via Telegram Bot CDN with Range slicing
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

  const axiosHeaders = { "User-Agent": "TeleDrive/1.0" };
  if (range) axiosHeaders["Range"] = range;

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

      if (chunkEnd < start) return;
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

// ================================================================
// OWNER MANAGEMENT ENDPOINTS (Requires Auth)
// ================================================================

// GET /api/share/manage/:type/:id - Get share settings
router.get("/manage/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    let item = null;

    if (type === "folder") {
      item = await dbGetFolderById(id);
    } else {
      item = await dbGetFileById(id);
    }

    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    let shareToken = item.share_token;
    if (!shareToken) {
      shareToken = `s_${crypto.randomBytes(8).toString("hex")}`;
      if (type === "folder") {
        await dbUpdateFolder(id, { share_token: shareToken });
      } else {
        await dbUpdateFile(id, { share_token: shareToken });
      }
    }

    const host = req.get("host") || "localhost:5173";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const shareUrl = `${protocol}://${host}/?share=${shareToken}`;

    res.json({
      success: true,
      share_access: item.share_access || "private",
      share_token: shareToken,
      share_url: shareUrl,
      item: {
        id: item.id,
        name: item.name,
        type: type === "folder" ? "folder" : item.type,
        size: item.size || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/share/manage/:type/:id - Update share access (public / private)
router.post("/manage/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const { share_access } = req.body;

    const access = share_access === "public" ? "public" : "private";
    let item = null;

    if (type === "folder") {
      item = await dbGetFolderById(id);
    } else {
      item = await dbGetFileById(id);
    }

    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    let shareToken = item.share_token;
    if (!shareToken) {
      shareToken = `s_${crypto.randomBytes(8).toString("hex")}`;
    }

    if (type === "folder") {
      await dbUpdateFolder(id, { share_access: access, share_token: shareToken });
    } else {
      await dbUpdateFile(id, { share_access: access, share_token: shareToken });
    }

    const host = req.get("host") || "localhost:5173";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const shareUrl = `${protocol}://${host}/?share=${shareToken}`;

    res.json({
      success: true,
      share_access: access,
      share_token: shareToken,
      share_url: shareUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================================================================
// PUBLIC SHARING ENDPOINTS (No Login Required)
// ================================================================

// GET /api/share/public/:token - Get public shared metadata
router.get("/public/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, error: "Token required" });

    // Check if it's a file
    const file = await dbGetFileByShareToken(token);
    if (file) {
      if (file.share_access !== "public") {
        return res.status(403).json({
          success: false,
          isRestricted: true,
          error: "This file is private. Only authorized users can access it.",
          item: { id: file.id, name: file.name, type: file.type }
        });
      }

      return res.json({
        success: true,
        type: "file",
        item: {
          id: file.id,
          name: file.name,
          size: file.size,
          mime_type: file.mime_type,
          type: file.type,
          share_token: file.share_token,
          updated_at: file.updated_at
        }
      });
    }

    // Check if it's a folder
    const folder = await dbGetFolderByShareToken(token);
    if (folder) {
      if (folder.share_access !== "public") {
        return res.status(403).json({
          success: false,
          isRestricted: true,
          error: "This folder is private. Only authorized users can access it.",
          item: { id: folder.id, name: folder.name, type: "folder" }
        });
      }

      const { folderId } = req.query;
      let targetFolder = folder;

      if (folderId && folderId !== folder.id && folderId !== "root") {
        const isDescendant = await dbIsFolderDescendant(folderId, folder.id);
        if (!isDescendant) {
          return res.status(403).json({
            success: false,
            error: "Requested folder is not inside the shared directory."
          });
        }
        const subFolder = await dbGetFolderById(folderId);
        if (!subFolder || subFolder.is_trash) {
          return res.status(404).json({
            success: false,
            error: "Subfolder not found or has been deleted."
          });
        }
        targetFolder = subFolder;
      }

      const contents = await dbGetSharedFolderContents(targetFolder.id);
      const breadcrumbs = await dbGetFolderBreadcrumbTrail(targetFolder.id, folder.id);

      return res.json({
        success: true,
        type: "folder",
        rootFolder: {
          id: folder.id,
          name: folder.name,
          color: folder.color,
          share_token: folder.share_token,
          updated_at: folder.updated_at
        },
        currentFolder: {
          id: targetFolder.id,
          name: targetFolder.name,
          color: targetFolder.color,
          parent_id: targetFolder.parent_id,
          share_token: folder.share_token,
          updated_at: targetFolder.updated_at
        },
        breadcrumbs,
        contents: {
          folders: contents.folders,
          files: contents.files
        }
      });
    }

    return res.status(404).json({ success: false, error: "Shared item not found or link has expired." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/share/public/:token/stream - Public media streaming
router.get("/public/:token/stream", async (req, res) => {
  try {
    const { token } = req.params;
    const file = await dbGetFileByShareToken(token);

    if (!file) {
      return res.status(404).send("File not found or link expired");
    }

    if (file.share_access !== "public") {
      return res.status(403).send("This file is restricted to private access");
    }

    const range = req.headers.range;
    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const fileSize = Number(file.size) || 0;
    const isUploaded = file.source_type === "upload" || !file.source_type;

    if (isUploaded) {
      if (file.telegram_file_id) {
        try {
          await streamTelegramBotFile(file, range, req, res);
          return;
        } catch (botErr) {
          console.warn("Public Bot CDN stream failed, trying MTProto:", botErr.message);
        }
      }

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
            false,
            true,
            file.telegram_file_reference || null,
            file.telegram_access_hash || null
          );
          return;
        } catch (mtprotoErr) {
          console.warn("Public MTProto stream failed for uploaded file:", mtprotoErr.message);
        }
      }

      return res.status(500).send("Streaming failed");
    }

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
          false,
          false
        );
        return;
      } catch (mtprotoErr) {
        console.warn("Public MTProto stream failed for imported post:", mtprotoErr.message);
      }
    }

    res.status(400).send("No valid streaming source found");
  } catch (err) {
    console.error("Public stream error:", err.message);
    if (!res.headersSent) res.status(500).send("Streaming error");
  }
});

// GET /api/share/public/:token/download - Public download
router.get("/public/:token/download", async (req, res) => {
  try {
    const { token } = req.params;
    const file = await dbGetFileByShareToken(token);

    if (!file) {
      return res.status(404).send("File not found or link expired");
    }

    if (file.share_access !== "public") {
      return res.status(403).send("This file is restricted to private access");
    }

    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const isUploaded = file.source_type === "upload" || !file.source_type;

    if (file.telegram_file_id && isUploaded) {
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
        console.warn("Public bot download failed, trying MTProto:", botErr.message);
      }
    }

    if (targetChannelId && file.telegram_message_id) {
      await streamGramMedia(
        targetChannelId,
        file.telegram_message_id,
        null,
        req,
        res,
        file.mime_type,
        file.name,
        true,
        isUploaded
      );
      return;
    }

    res.status(400).send("No valid download source found");
  } catch (err) {
    console.error("Public download error:", err.message);
    if (!res.headersSent) res.status(500).send("Download error");
  }
});

// GET /api/share/public/:token/file/:fileId/stream - Stream file from shared folder
router.get("/public/:token/file/:fileId/stream", async (req, res) => {
  try {
    const { token, fileId } = req.params;
    const folder = await dbGetFolderByShareToken(token);
    if (!folder || folder.share_access !== "public") {
      return res.status(403).send("Shared folder is private or invalid");
    }

    const file = await dbGetFileById(fileId);
    if (!file) return res.status(404).send("File not found");

    const isAllowed = await dbIsFileInSharedFolderTree(fileId, folder.id);
    if (!isAllowed) {
      return res.status(403).send("File is not part of this shared folder");
    }

    const range = req.headers.range;
    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const isUploaded = file.source_type === "upload" || !file.source_type;

    if (isUploaded && file.telegram_file_id) {
      try {
        await streamTelegramBotFile(file, range, req, res);
        return;
      } catch (botErr) {
        console.warn("Folder subfile bot stream failed, trying MTProto:", botErr.message);
      }
    }

    if (targetChannelId && file.telegram_message_id) {
      await streamGramMedia(
        targetChannelId,
        file.telegram_message_id,
        range,
        req,
        res,
        file.mime_type,
        file.name,
        false,
        isUploaded,
        file.telegram_file_reference || null,
        file.telegram_access_hash || null
      );
      return;
    }

    res.status(400).send("Streaming reference not available");
  } catch (err) {
    console.error("Public folder file stream error:", err.message);
    if (!res.headersSent) res.status(500).send("Streaming error");
  }
});

// GET /api/share/public/:token/file/:fileId/download - Download file from shared folder
router.get("/public/:token/file/:fileId/download", async (req, res) => {
  try {
    const { token, fileId } = req.params;
    const folder = await dbGetFolderByShareToken(token);
    if (!folder || folder.share_access !== "public") {
      return res.status(403).send("Shared folder is private or invalid");
    }

    const file = await dbGetFileById(fileId);
    if (!file) return res.status(404).send("File not found");

    const isAllowed = await dbIsFileInSharedFolderTree(fileId, folder.id);
    if (!isAllowed) {
      return res.status(403).send("File is not part of this shared folder");
    }

    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const isUploaded = file.source_type === "upload" || !file.source_type;

    if (isUploaded && file.telegram_file_id) {
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
        console.warn("Public folder file download failed:", botErr.message);
      }
    }

    if (targetChannelId && file.telegram_message_id) {
      await streamGramMedia(
        targetChannelId,
        file.telegram_message_id,
        null,
        req,
        res,
        file.mime_type,
        file.name,
        true,
        isUploaded,
        file.telegram_file_reference || null,
        file.telegram_access_hash || null
      );
      return;
    }

    res.status(400).send("Download reference not available");
  } catch (err) {
    console.error("Public folder file download error:", err.message);
    if (!res.headersSent) res.status(500).send("Download error");
  }
});

export default router;
