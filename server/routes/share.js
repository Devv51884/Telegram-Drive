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
  dbIsFileInSharedFolderTree,
  dbAddUserPermission,
  dbRemoveUserPermission,
  dbGetItemPermissions,
  dbGetSharedWithMe,
  dbHasUserAccessToItem,
  dbFindUserByEmail,
  dbFindUserById,
  dbCreateShareRequest,
  dbGetPendingShareRequestsForOwner,
  dbGetShareRequestById,
  dbUpdateShareRequestStatus
} from "../db.js";
import {
  streamGramMedia,
  getTelegramFileStreamUrl
} from "../telegram.js";
import {
  sendShareNotificationEmail,
  sendAccessRequestEmail,
  sendAccessGrantedEmail
} from "../email.js";
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

  if (res && !res.headersSent) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, X-Access-Token");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    res.setHeader("Accept-Ranges", "bytes");
  }

  const response = await axios({
    method: "GET",
    url: downloadUrl,
    responseType: "stream",
    timeout: 0,
    validateStatus: (status) => status < 400
  });

  const remoteContentLength = parseInt(response.headers["content-length"] || "0", 10);
  const actualTotalSize = totalSize > 0 ? totalSize : remoteContentLength;

  let clientClosed = false;
  if (req) {
    req.on("close", () => {
      clientClosed = true;
      if (response.data?.destroy) {
        try {
          response.data.destroy();
        } catch {}
      }
    });
  }

  if (response.status === 206) {
    res.writeHead(206, {
      "Content-Range": response.headers["content-range"] || (range ? `${range.replace("=", " ")}/${actualTotalSize}` : undefined),
      "Accept-Ranges": "bytes",
      "Content-Length": response.headers["content-length"] || (remoteContentLength > 0 ? remoteContentLength : undefined),
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
    });
    response.data.pipe(res);
    return;
  }

  if (range && actualTotalSize > 0) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;
    const rawEnd = parts[1] && parts[1].trim() !== "" ? parseInt(parts[1], 10) : actualTotalSize - 1;
    const end = Math.min(rawEnd, actualTotalSize - 1);
    const chunkLength = Math.max(0, end - start + 1);

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${actualTotalSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkLength,
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
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
        if (response.data?.destroy) {
          try { response.data.destroy(); } catch {}
        }
        return;
      }

      const sliceStart = Math.max(0, start - chunkStart);
      const sliceEnd = Math.min(chunk.length, end - chunkStart + 1);
      const slice = chunk.subarray(sliceStart, sliceEnd);

      res.write(slice);
      bytesSent += slice.length;

      if (bytesSent >= chunkLength) {
        if (!res.writableEnded && !res.destroyed) res.end();
        if (response.data?.destroy) {
          try { response.data.destroy(); } catch {}
        }
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
// EMAIL COLLABORATOR ACCESS ENDPOINTS (Google Drive Style)
// ================================================================

// GET /api/share/collaborators/:type/:id - List all users shared by email
router.get("/collaborators/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const permissions = await dbGetItemPermissions(id, type);
    res.json({ success: true, collaborators: permissions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/share/collaborators/:type/:id - Grant access to an email address
router.post("/collaborators/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const { email, permission = "viewer", notify = true } = req.body;

    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid email address is required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify recipient user exists in database
    const recipientUser = await dbFindUserByEmail(cleanEmail);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        error: `No registered TeleDrive account found for "${cleanEmail}". The user must first register an account with this Gmail on TeleDrive to receive shared access.`
      });
    }

    // Verify item exists
    let item = type === "folder" ? await dbGetFolderById(id) : await dbGetFileById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    // Add or update permission
    const result = await dbAddUserPermission({
      itemId: id,
      itemType: type,
      ownerId: req.userId || item.user_id,
      sharedEmail: cleanEmail,
      permission: permission === "editor" ? "editor" : "viewer"
    });

    // Optionally send email notification
    if (notify) {
      const host = req.get("host") || "localhost:5173";
      const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
      const shareUrl = item.share_token
        ? `${protocol}://${host}/?share=${item.share_token}`
        : `${protocol}://${host}/?section=shared_with_me`;

      sendShareNotificationEmail({
        to: cleanEmail,
        senderName: req.user?.name || "A TeleDrive User",
        itemName: item.name,
        itemType: type,
        permission,
        shareUrl
      }).catch(() => {});
    }

    const updatedPermissions = await dbGetItemPermissions(id, type);

    res.json({
      success: true,
      message: `Access granted to ${cleanEmail} as ${permission}`,
      collaborators: updatedPermissions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/share/collaborators/:type/:id/:email - Revoke access for an email
router.delete("/collaborators/:type/:id/:email", async (req, res) => {
  try {
    const { type, id, email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    await dbRemoveUserPermission(id, type, decodeURIComponent(email));
    const updatedPermissions = await dbGetItemPermissions(id, type);

    res.json({
      success: true,
      message: `Access revoked for ${email}`,
      collaborators: updatedPermissions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================================================================
// PUBLIC SHARING ENDPOINTS (No Login Required)
// ================================================================

// GET /api/share/public/:token - Get public shared metadata (Supports Google Drive-style Restricted sharing)
router.get("/public/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, error: "Token required" });

    const userEmail = req.user?.email || null;
    const userId = req.user?.userId || null;

    // Check if it's a file
    const file = await dbGetFileByShareToken(token);
    if (file) {
      const isPublic = file.share_access === "public";
      let hasAccess = isPublic;

      if (!hasAccess && (userEmail || userId)) {
        hasAccess = await dbHasUserAccessToItem(file.id, "file", userEmail, userId);
      }

      if (!hasAccess) {
        let owner = null;
        if (file.user_id) {
          owner = await dbFindUserById(file.user_id);
        }

        return res.status(403).json({
          success: true,
          isRestricted: true,
          error: "This file is private. You need access to view or download it.",
          item: {
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            share_token: file.share_token,
            owner_name: owner?.name || "TeleDrive User",
            owner_email: owner?.email || ""
          }
        });
      }

      return res.json({
        success: true,
        type: "file",
        isAuthorized: true,
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
      const isPublic = folder.share_access === "public";
      let hasAccess = isPublic;

      if (!hasAccess && (userEmail || userId)) {
        hasAccess = await dbHasUserAccessToItem(folder.id, "folder", userEmail, userId);
      }

      if (!hasAccess) {
        let owner = null;
        if (folder.user_id) {
          owner = await dbFindUserById(folder.user_id);
        }

        return res.status(403).json({
          success: true,
          isRestricted: true,
          error: "This folder is private. You need access to view its contents.",
          item: {
            id: folder.id,
            name: folder.name,
            type: "folder",
            share_token: folder.share_token,
            owner_name: owner?.name || "TeleDrive User",
            owner_email: owner?.email || ""
          }
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
        isAuthorized: true,
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

// POST /api/share/request-access/:token - Google Drive Style Request Access
router.post("/request-access/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { email, name, message } = req.body;

    const requesterEmail = (email || req.user?.email || "").trim().toLowerCase();
    const requesterName = (name || req.user?.name || "").trim();

    if (!requesterEmail || !requesterEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "Valid Gmail/Email address is required to request access" });
    }

    // Find file or folder
    const file = await dbGetFileByShareToken(token);
    const folder = !file ? await dbGetFolderByShareToken(token) : null;
    const item = file || folder;

    if (!item) {
      return res.status(404).json({ success: false, error: "Shared item not found" });
    }

    const itemType = folder ? "folder" : "file";
    const ownerId = item.user_id;
    let owner = null;
    if (ownerId) {
      owner = await dbFindUserById(ownerId);
    }

    // Save request in DB
    const requestRecord = await dbCreateShareRequest({
      shareToken: token,
      itemId: item.id,
      itemType,
      ownerId: ownerId || null,
      requesterEmail,
      requesterName,
      message: message || ""
    });

    // Send email notification to the owner
    if (owner && owner.email) {
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5173";
      const proto = req.get("x-forwarded-proto") || req.protocol || "http";
      const shareUrl = `${proto}://${host}/?share=${token}`;

      sendAccessRequestEmail({
        toOwner: owner.email,
        ownerName: owner.name,
        requesterEmail,
        requesterName: requesterName || requesterEmail,
        itemName: item.name,
        itemType,
        message,
        shareUrl
      }).catch((err) => console.warn("Failed to send access request email:", err.message));
    }

    res.json({
      success: true,
      message: "Access request sent successfully! The owner has been notified via email.",
      request: requestRecord
    });
  } catch (err) {
    console.error("Share request access error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/share/requests - Owner view all pending access requests
router.get("/requests", async (req, res) => {
  try {
    const ownerId = req.userId || req.user?.userId;
    if (!ownerId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const requests = await dbGetPendingShareRequestsForOwner(ownerId);
    res.json({ success: true, requests: requests || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/share/requests/:id/respond - Owner Approve or Reject an access request
router.post("/requests/:id/respond", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, permission = "viewer" } = req.body; // action: 'approve' | 'reject'
    const ownerId = req.userId || req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const request = await dbGetShareRequestById(id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Access request not found" });
    }

    if (request.owner_id && request.owner_id !== ownerId) {
      return res.status(403).json({ success: false, error: "You are not authorized to manage this request" });
    }

    if (action === "approve") {
      // Add collaborator permission
      await dbAddUserPermission({
        itemId: request.item_id,
        itemType: request.item_type,
        ownerId,
        sharedEmail: request.requester_email,
        permission: permission === "editor" ? "editor" : "viewer"
      });

      await dbUpdateShareRequestStatus(id, "approved");

      // Notify requester via email
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:5173";
      const proto = req.get("x-forwarded-proto") || req.protocol || "http";
      const shareUrl = `${proto}://${host}/?share=${request.share_token}`;

      sendAccessGrantedEmail({
        toRequester: request.requester_email,
        requesterName: request.requester_name,
        ownerName: req.user?.name || "TeleDrive Owner",
        itemName: request.item_name || "Shared Item",
        itemType: request.item_type,
        shareUrl,
        permission
      }).catch(() => {});

      return res.json({
        success: true,
        message: `Access granted to ${request.requester_email} as ${permission}`
      });
    } else {
      await dbUpdateShareRequestStatus(id, "rejected");
      return res.json({
        success: true,
        message: `Access request from ${request.requester_email} rejected`
      });
    }
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
      const userEmail = req.user?.email || null;
      const userId = req.user?.userId || null;
      const hasAccess = (userEmail || userId) ? await dbHasUserAccessToItem(file.id, "file", userEmail, userId) : false;
      if (!hasAccess) {
        return res.status(403).send("This file is restricted to private access");
      }
    }

    if (res && !res.headersSent) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, X-Access-Token");
      res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
      res.setHeader("Accept-Ranges", "bytes");
    }

    const range = req.headers.range;
    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const fileSize = Number(file.size) || 0;
    const isUploaded = file.source_type === "upload" || !file.source_type;
    const isBotApiFileId = file.telegram_file_id && !file.telegram_file_id.match(/^\d+$/);
    const targetUserId = file.user_id || req.userId || null;

    if (isUploaded && isBotApiFileId) {
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
          isUploaded,
          file.telegram_file_reference || null,
          file.telegram_access_hash || null,
          file.telegram_file_id || null,
          fileSize,
          targetUserId
        );
        return;
      } catch (mtprotoErr) {
        console.warn("Public MTProto stream failed, trying alternative client:", mtprotoErr.message);
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
            !isUploaded,
            file.telegram_file_reference || null,
            file.telegram_access_hash || null,
            file.telegram_file_id || null,
            fileSize,
            targetUserId
          );
          return;
        } catch (secErr) {
          console.warn("Public MTProto fallback also failed:", secErr.message);
        }
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
      const userEmail = req.user?.email || null;
      const userId = req.user?.userId || null;
      const hasAccess = (userEmail || userId) ? await dbHasUserAccessToItem(file.id, "file", userEmail, userId) : false;
      if (!hasAccess) {
        return res.status(403).send("This file is restricted to private access");
      }
    }

    if (res && !res.headersSent) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, X-Access-Token");
      res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
      res.setHeader("Accept-Ranges", "bytes");
    }

    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const fileSize = Number(file.size) || 0;
    const isUploaded = file.source_type === "upload" || !file.source_type;
    const isBotApiFileId = file.telegram_file_id && !file.telegram_file_id.match(/^\d+$/);
    const targetUserId = file.user_id || req.userId || null;

    if (file.telegram_file_id && isUploaded && isBotApiFileId) {
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
        isUploaded,
        file.telegram_file_reference || null,
        file.telegram_access_hash || null,
        file.telegram_file_id || null,
        fileSize,
        targetUserId
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
    if (!folder) {
      return res.status(404).send("Shared folder not found");
    }

    if (folder.share_access !== "public") {
      const userEmail = req.user?.email || null;
      const userId = req.user?.userId || null;
      const hasAccess = (userEmail || userId) ? await dbHasUserAccessToItem(folder.id, "folder", userEmail, userId) : false;
      if (!hasAccess) {
        return res.status(403).send("Shared folder is private or invalid");
      }
    }

    const file = await dbGetFileById(fileId);
    if (!file) return res.status(404).send("File not found");

    const isAllowed = await dbIsFileInSharedFolderTree(fileId, folder.id);
    if (!isAllowed) {
      return res.status(403).send("File is not part of this shared folder");
    }

    if (res && !res.headersSent) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, X-Access-Token");
      res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
      res.setHeader("Accept-Ranges", "bytes");
    }

    const range = req.headers.range;
    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const fileSize = Number(file.size) || 0;
    const isUploaded = file.source_type === "upload" || !file.source_type;
    const isBotApiFileId = file.telegram_file_id && !file.telegram_file_id.match(/^\d+$/);
    const targetUserId = file.user_id || req.userId || null;

    if (isUploaded && isBotApiFileId) {
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
        file.telegram_access_hash || null,
        file.telegram_file_id || null,
        fileSize,
        targetUserId
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
    if (!folder) {
      return res.status(404).send("Shared folder not found");
    }

    if (folder.share_access !== "public") {
      const userEmail = req.user?.email || null;
      const userId = req.user?.userId || null;
      const hasAccess = (userEmail || userId) ? await dbHasUserAccessToItem(folder.id, "folder", userEmail, userId) : false;
      if (!hasAccess) {
        return res.status(403).send("Shared folder is private or invalid");
      }
    }

    const file = await dbGetFileById(fileId);
    if (!file) return res.status(404).send("File not found");

    const isAllowed = await dbIsFileInSharedFolderTree(fileId, folder.id);
    if (!isAllowed) {
      return res.status(403).send("File is not part of this shared folder");
    }

    if (res && !res.headersSent) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, X-Access-Token");
      res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
      res.setHeader("Accept-Ranges", "bytes");
    }

    const targetChannelId = file.telegram_channel_id || process.env.STORAGE_CHAT_ID || process.env.STORAGE_CHANNEL_ID;
    const fileSize = Number(file.size) || 0;
    const isUploaded = file.source_type === "upload" || !file.source_type;
    const isBotApiFileId = file.telegram_file_id && !file.telegram_file_id.match(/^\d+$/);

    if (isUploaded && isBotApiFileId) {
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
        file.telegram_access_hash || null,
        file.telegram_file_id || null,
        fileSize,
        file.user_id || req.userId || null
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
