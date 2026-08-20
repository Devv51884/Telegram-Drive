import axios from "axios";
import FormData from "form-data";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import bigInt from "big-integer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  dbGetSetting,
  dbSetSetting,
  dbGetActiveTelegramSession,
  dbSaveTelegramSession,
  dbDeactivateTelegramSessions
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get Telegram Bot & Account credentials
export async function getTelegramConfig() {
  const botToken = (await dbGetSetting("BOT_TOKEN")) || process.env.BOT_TOKEN || "";
  const chatId = (await dbGetSetting("STORAGE_CHAT_ID")) || process.env.STORAGE_CHAT_ID || "";
  const apiId = (await dbGetSetting("API_ID")) || process.env.API_ID || "";
  const apiHash = (await dbGetSetting("API_HASH")) || process.env.API_HASH || "";

  return {
    botToken: botToken.trim(),
    chatId: chatId.trim(),
    apiId: apiId.trim() ? parseInt(apiId.trim(), 10) : undefined,
    apiHash: apiHash.trim()
  };
}

// Global active MTProto TelegramClient instance
let activeGramClient = null;
let activeSessionString = null;

// Initialize or retrieve the authenticated GramJS client
export async function getGramClient() {
  const config = await getTelegramConfig();
  if (!config.apiId || !config.apiHash) {
    return null;
  }

  const sessionRow = await dbGetActiveTelegramSession();
  const sessionStr = sessionRow?.session_string || process.env.TELEGRAM_SESSION_STRING || "";

  if (!sessionStr) {
    return null;
  }

  if (activeGramClient && activeSessionString === sessionStr) {
    if (!activeGramClient.connected) {
      await activeGramClient.connect();
    }
    return activeGramClient;
  }

  if (activeGramClient) {
    try {
      await activeGramClient.disconnect();
    } catch {}
  }

  const session = new StringSession(sessionStr);
  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
    useWSS: false
  });

  await client.connect();
  activeGramClient = client;
  activeSessionString = sessionStr;
  return activeGramClient;
}

// Test Bot Token Connection
export async function testBotConnection(botToken, chatId) {
  try {
    const res = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 10000 });
    if (!res.data || !res.data.ok) {
      return { success: false, error: "Invalid bot token" };
    }
    const botUser = res.data.result;

    if (chatId) {
      try {
        const chatRes = await axios.get(`https://api.telegram.org/bot${botToken}/getChat`, {
          params: { chat_id: chatId },
          timeout: 10000
        });
        return {
          success: true,
          bot: botUser,
          chat: chatRes.data.result
        };
      } catch (chatErr) {
        return {
          success: true,
          bot: botUser,
          chatWarning: "Bot token is valid, but could not access chat ID (Make sure bot is an Admin in the channel/group)."
        };
      }
    }

    return { success: true, bot: botUser };
  } catch (err) {
    return { success: false, error: err.response?.data?.description || err.message };
  }
}

// Upload a local file stream or buffer to Telegram Cloud with Dual Strategy & Live Progress
export async function uploadFileToTelegram(
  fileInput,
  originalname,
  mimetype,
  caption = "",
  progressCallback = null
) {
  const config = await getTelegramConfig();
  const isFilePath = typeof fileInput === "string";
  let fileSize = 0;
  if (isFilePath) {
    try {
      fileSize = fs.statSync(fileInput).size;
    } catch {}
  } else if (fileInput && fileInput.length) {
    fileSize = fileInput.length;
  }

  // 1. Primary Strategy: Upload via Telegram Bot API to central Storage Channel (Files <= 50MB)
  if (config.botToken && config.chatId && fileSize <= 50 * 1024 * 1024) {
    try {
      const formData = new FormData();
      formData.append("chat_id", config.chatId);
      if (isFilePath) {
        formData.append("document", fs.createReadStream(fileInput), {
          filename: originalname,
          contentType: mimetype,
          knownLength: fileSize
        });
      } else {
        formData.append("document", fileInput, {
          filename: originalname,
          contentType: mimetype
        });
      }
      if (caption) {
        formData.append("caption", caption);
      }

      let formHeaders = formData.getHeaders();
      try {
        const formLen = formData.getLengthSync();
        if (formLen) formHeaders["Content-Length"] = formLen;
      } catch {}

      const response = await axios.post(
        `https://api.telegram.org/bot${config.botToken}/sendDocument`,
        formData,
        {
          headers: formHeaders,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 0,
          onUploadProgress: (p) => {
            if (progressCallback && p.total) {
              const loaded = p.loaded;
              const total = p.total;
              const percent = Math.min(99, Math.round((loaded * 100) / total));
              progressCallback({ loaded, total, percent });
            }
          }
        }
      );

      if (response.data && response.data.ok) {
        if (progressCallback) {
          progressCallback({ loaded: fileSize, total: fileSize, percent: 100 });
        }
        const doc = response.data.result.document || response.data.result.video || response.data.result.audio;
        return {
          sourceType: "upload",
          fileId: doc.file_id,
          fileUniqueId: doc.file_unique_id,
          fileSize: doc.file_size || fileSize,
          messageId: response.data.result.message_id,
          channelId: config.chatId
        };
      }
    } catch (botErr) {
      console.warn(
        "Bot API upload issue, falling back to MTProto Account:",
        botErr.response?.data?.description || botErr.message
      );
    }
  }

  // 2. Secondary Strategy: Large File Upload (up to 2GB) via MTProto to Storage Channel / Cloud
  const gramClient = await getGramClient();
  if (gramClient) {
    try {
      const targetPeer = config.chatId || "me";
      const res = await gramClient.sendFile(targetPeer, {
        file: fileInput,
        caption: caption || originalname,
        forceDocument: true,
        workers: 4,
        progressCallback: (progress) => {
          if (progressCallback) {
            const percent = Math.min(99, Math.round(progress * 100));
            const loaded = Math.round(progress * fileSize);
            progressCallback({ loaded, total: fileSize, percent });
          }
        },
        attributes: [
          new Api.DocumentAttributeFilename({
            fileName: originalname
          })
        ]
      });

      if (res && res.media && (res.media.document || res.media.photo)) {
        if (progressCallback) {
          progressCallback({ loaded: fileSize, total: fileSize, percent: 100 });
        }
        const doc = res.media.document || res.media.photo;
        return {
          sourceType: "upload",
          fileId: null,
          fileUniqueId: doc.id?.toString(),
          fileSize: Number(doc.size || fileSize),
          messageId: res.id.toString(),
          channelId: targetPeer.toString()
        };
      }
    } catch (gramErr) {
      console.error("MTProto storage channel upload failed:", gramErr.message);
      throw new Error(`Upload failed: ${gramErr.message}`);
    }
  }

  throw new Error(
    "Upload failed: No connected Telegram account or active storage channel available."
  );
}

// Bot API: Get download/stream URL
export async function getTelegramFileStreamUrl(fileId) {
  const config = await getTelegramConfig();
  if (!config.botToken) throw new Error("Bot token not configured");

  const fileRes = await axios.get(`https://api.telegram.org/bot${config.botToken}/getFile`, {
    params: { file_id: fileId }
  });

  if (!fileRes.data || !fileRes.data.ok) {
    throw new Error("Could not get file path from Telegram");
  }

  const filePath = fileRes.data.result.file_path;
  return `https://api.telegram.org/file/bot${config.botToken}/${filePath}`;
}

// Bot API: Delete Message
export async function deleteTelegramMessage(messageId, chatId) {
  const config = await getTelegramConfig();
  const targetChat = chatId || config.chatId;
  if (!config.botToken || !targetChat || !messageId) return false;

  try {
    await axios.post(`https://api.telegram.org/bot${config.botToken}/deleteMessage`, {
      chat_id: targetChat,
      message_id: parseInt(messageId, 10)
    });
    return true;
  } catch (err) {
    console.error("Delete Telegram message error:", err.message);
    return false;
  }
}

// Temporary in-memory storage for active MTProto login flows
const activeAuthClients = new Map();

// Step 1: Send Telegram Phone Verification Code
export async function sendTelegramPhoneCode(phoneNumber) {
  const config = await getTelegramConfig();
  if (!config.apiId || !config.apiHash) {
    throw new Error("API_ID and API_HASH are missing in the server .env configuration");
  }

  const session = new StringSession("");
  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
    useWSS: false
  });

  await client.connect();

  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
  const { phoneCodeHash, isCodeViaApp } = await client.sendCode(
    {
      apiId: config.apiId,
      apiHash: config.apiHash
    },
    cleanPhone
  );

  activeAuthClients.set(cleanPhone, {
    client,
    phoneCodeHash,
    createdAt: Date.now()
  });

  return {
    success: true,
    phoneCodeHash,
    isCodeViaApp
  };
}

// Step 2: Complete Telegram Login with OTP (and 2FA if enabled)
export async function completeTelegramLogin(phoneNumber, phoneCode, password2FA = "", phoneCodeHash = "") {
  const config = await getTelegramConfig();
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");

  let authState = activeAuthClients.get(cleanPhone);
  let client;

  if (authState && authState.client) {
    client = authState.client;
    if (!client.connected) await client.connect();
  } else {
    const session = new StringSession("");
    client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 5,
      useWSS: false
    });
    await client.connect();
  }

  try {
    const user = await client.signIn({
      phoneNumber: cleanPhone,
      phoneCodeHash: phoneCodeHash || authState?.phoneCodeHash,
      phoneCode: phoneCode,
      password: async () => password2FA
    });

    const sessionString = client.session.save();

    await dbDeactivateTelegramSessions();
    await dbSaveTelegramSession({
      phone_number: cleanPhone,
      session_string: sessionString,
      user_id: user.id ? user.id.toString() : null,
      username: user.username || null,
      first_name: user.firstName || null,
      last_name: user.lastName || null,
      is_active: 1
    });

    activeGramClient = client;
    activeSessionString = sessionString;
    activeAuthClients.delete(cleanPhone);

    return {
      success: true,
      user: {
        id: user.id.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: cleanPhone
      }
    };
  } catch (err) {
    if (err.message && (err.message.includes("SESSION_PASSWORD_NEEDED") || err.message.includes("2FA"))) {
      if (!password2FA) {
        return {
          requires2FA: true,
          message: "2-Step Verification password is required for this account."
        };
      }
    }
    throw err;
  }
}

// Get connected Telegram User information
export async function getConnectedTelegramUser() {
  const sessionRow = await dbGetActiveTelegramSession();
  if (!sessionRow) {
    return { connected: false };
  }

  let parsedInfo = {};
  if (sessionRow.user_info) {
    try {
      parsedInfo = typeof sessionRow.user_info === "string" ? JSON.parse(sessionRow.user_info) : sessionRow.user_info;
    } catch {}
  }

  const firstName = parsedInfo.firstName || sessionRow.first_name || "Telegram User";
  const lastName = parsedInfo.lastName || sessionRow.last_name || "";
  const username = parsedInfo.username || sessionRow.username || "";

  try {
    const client = await getGramClient();
    if (!client) {
      return {
        connected: true,
        phoneNumber: sessionRow.phone_number,
        info: {
          firstName,
          lastName,
          username
        }
      };
    }

    const me = await client.getMe();
    return {
      connected: true,
      phoneNumber: sessionRow.phone_number,
      info: {
        id: me.id?.toString(),
        firstName: me.firstName || firstName,
        lastName: me.lastName || lastName,
        username: me.username || username
      }
    };
  } catch (err) {
    return {
      connected: true,
      phoneNumber: sessionRow.phone_number,
      info: {
        firstName,
        lastName,
        username
      }
    };
  }
}

// Logout & Disconnect Telegram User Account
export async function logoutTelegramUser() {
  if (activeGramClient) {
    try {
      await activeGramClient.disconnect();
    } catch {}
    activeGramClient = null;
    activeSessionString = null;
  }
  await dbDeactivateTelegramSessions();
  return { success: true };
}

// Parse Telegram Post Link (supports private channel, public channel, and forum topics)
export function parseTelegramPostUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // 1. Private channel / supergroup / forum topic: t.me/c/2643917389/1036/1039 or t.me/c/2643917389/1039
  const privateMatch = trimmed.match(/t\.me\/c\/(\d+)(?:\/(\d+))?\/(\d+)/i);
  if (privateMatch) {
    const rawChannelId = privateMatch[1];
    const messageId = parseInt(privateMatch[3], 10);
    const fullChannelId = rawChannelId.startsWith("-100") ? rawChannelId : `-100${rawChannelId}`;
    return {
      isPrivate: true,
      channelId: fullChannelId,
      rawChannelId,
      messageId
    };
  }

  // 2. Public channel / group / forum topic: t.me/channel_name/1036/1039 or t.me/channel_name/1039
  const publicMatch = trimmed.match(/t\.me\/([a-zA-Z0-9_]+)(?:\/(\d+))?\/(\d+)/i);
  if (publicMatch && publicMatch[1] !== "c") {
    const channelUsername = publicMatch[1];
    const messageId = parseInt(publicMatch[3], 10);
    return {
      isPrivate: false,
      channelUsername,
      channelId: channelUsername,
      messageId
    };
  }

  return null;
}

// Parse and Fetch Telegram Post Media using GramJS MTProto Client
export async function parseAndFetchTelegramPost(postUrl) {
  const parsed = parseTelegramPostUrl(postUrl);
  if (!parsed) {
    throw new Error(
      "Invalid Telegram link format. Expected https://t.me/channel_name/123 or https://t.me/c/1234567890/123"
    );
  }

  const client = await getGramClient();
  if (!client) {
    throw new Error(
      "No Telegram user account is connected. Please connect your Telegram account in Settings to import channel media."
    );
  }

  let peer = parsed.channelId;
  const messageId = parsed.messageId;

  try {
    const messages = await client.getMessages(peer, { ids: [messageId] });
    if (!messages || messages.length === 0 || !messages[0]) {
      throw new Error(`Message #${messageId} not found in this channel.`);
    }

    const msg = messages[0];
    if (!msg.media) {
      throw new Error("This message contains only text and no downloadable file/video media.");
    }

    let fileName = "telegram_media";
    let mimeType = "application/octet-stream";
    let fileSize = 0;
    let type = "other";
    let caption = msg.message || "";
    let duration = 0;

    if (msg.media.document) {
      const doc = msg.media.document;
      fileSize = Number(doc.size || 0);
      mimeType = doc.mimeType || "application/octet-stream";

      const fileAttr = doc.attributes?.find((a) => a.className === "DocumentAttributeFilename");
      const videoAttr = doc.attributes?.find((a) => a.className === "DocumentAttributeVideo");
      const audioAttr = doc.attributes?.find((a) => a.className === "DocumentAttributeAudio");

      if (fileAttr && fileAttr.fileName) {
        fileName = fileAttr.fileName;
      } else if (mimeType.startsWith("video/")) {
        fileName = `video_${messageId}.mp4`;
      } else if (mimeType.startsWith("audio/")) {
        fileName = `audio_${messageId}.mp3`;
      } else if (mimeType === "application/pdf") {
        fileName = `document_${messageId}.pdf`;
      } else {
        fileName = `document_${messageId}`;
      }

      if (videoAttr) {
        type = "video";
        duration = videoAttr.duration || 0;
      } else if (audioAttr) {
        type = "audio";
        duration = audioAttr.duration || 0;
      } else if (mimeType.startsWith("video/")) {
        type = "video";
      } else if (mimeType.startsWith("image/")) {
        type = "image";
      } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
        type = "pdf";
      } else {
        type = "document";
      }
    } else if (msg.media.photo) {
      type = "image";
      mimeType = "image/jpeg";
      fileName = `photo_${messageId}.jpg`;
      const sizes = msg.media.photo.sizes || [];
      const largest = sizes.filter((s) => s.size || (s.w && s.h)).pop() || sizes[sizes.length - 1];
      fileSize = Number(largest?.size || 1024 * 500);
    }

    let channelTitle = "Telegram Channel";
    try {
      const chat = await client.getEntity(peer);
      channelTitle = chat.title || chat.username || "Telegram Channel";
    } catch {}

    return {
      messageId: messageId.toString(),
      channelId: peer.toString(),
      channelTitle,
      postUrl: postUrl.trim(),
      fileName,
      mimeType,
      fileSize,
      type,
      caption,
      duration
    };
  } catch (err) {
    throw new Error(`Failed to fetch Telegram message: ${err.message}`);
  }
}

// Download/Stream chunk from GramJS MTProto message with HTTP Range support
export async function streamGramMedia(channelId, messageId, rangeHeader, req, res, mimeType, fileName) {
  const client = await getGramClient();
  let peer = channelId;
  const msgId = parseInt(messageId, 10);

  const messages = await client.getMessages(peer, { ids: [msgId] });
  if (!messages || messages.length === 0 || !messages[0] || !messages[0].media) {
    res.status(404).send("Telegram media not found");
    return;
  }

  const msg = messages[0];
  const media = msg.media;
  let totalSize = 0;
  let location = null;
  let dcId = undefined;

  if (media.document) {
    const doc = media.document;
    totalSize = Number(doc.size || 0);
    location = new Api.InputDocumentFileLocation({
      id: doc.id,
      accessHash: doc.accessHash,
      fileReference: doc.fileReference,
      thumbSize: ""
    });
    dcId = doc.dcId;
  } else if (media.photo) {
    const photo = media.photo;
    const sizes = photo.sizes || [];
    const largest = sizes.filter((s) => s.size || (s.w && s.h)).pop() || sizes[sizes.length - 1];
    totalSize = Number(largest?.size || (largest?.bytes ? largest.bytes.length : 1024 * 500));
    location = new Api.InputPhotoFileLocation({
      id: photo.id,
      accessHash: photo.accessHash,
      fileReference: photo.fileReference,
      thumbSize: largest?.type || "y"
    });
    dcId = photo.dcId;
  } else {
    res.status(400).send("Unsupported media type for streaming");
    return;
  }

  const lowerName = (fileName || "").toLowerCase();
  let contentType = mimeType || "application/octet-stream";
  if (lowerName.endsWith(".mp4")) contentType = "video/mp4";
  else if (lowerName.endsWith(".webm")) contentType = "video/webm";
  else if (lowerName.endsWith(".mkv")) contentType = "video/x-matroska";
  else if (lowerName.endsWith(".mov")) contentType = "video/quicktime";
  else if (lowerName.endsWith(".avi")) contentType = "video/x-msvideo";
  else if (lowerName.endsWith(".mp3") || lowerName.endsWith(".m4a")) contentType = "audio/mpeg";
  else if (lowerName.endsWith(".pdf")) contentType = "application/pdf";
  else if (lowerName.endsWith(".png")) contentType = "image/png";
  else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) contentType = "image/jpeg";
  else if (lowerName.endsWith(".gif")) contentType = "image/gif";
  else if (lowerName.endsWith(".webp")) contentType = "image/webp";

  const requestSize = 512 * 1024; // 512 KB chunk size

  if (rangeHeader && totalSize > 0) {
    // Parse Range: bytes=start-end
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${totalSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName || "media")}"`,
      "Cache-Control": "public, max-age=3600"
    });

    let clientDisconnected = false;
    if (req) {
      req.on("close", () => {
        clientDisconnected = true;
      });
    }

    try {
      const downloadIter = client.iterDownload({
        file: location,
        dcId: dcId,
        offset: bigInt(start),
        fileSize: bigInt(totalSize),
        requestSize: requestSize,
        stride: requestSize
      });

      let bytesSent = 0;
      for await (const chunk of downloadIter) {
        if (clientDisconnected || res.writableEnded || res.destroyed) {
          break;
        }
        const needed = chunkSize - bytesSent;
        if (needed <= 0) break;
        const chunkToSend = chunk.length > needed ? chunk.subarray(0, needed) : chunk;
        res.write(chunkToSend);
        bytesSent += chunkToSend.length;
        if (bytesSent >= chunkSize) break;
      }
      res.end();
    } catch (streamErr) {
      console.error("GramJS range streaming error:", streamErr.message);
      if (!res.headersSent) res.status(500).send("Error streaming media");
    }
  } else {
    // Full content download / stream
    res.writeHead(200, {
      "Content-Length": totalSize > 0 ? totalSize : undefined,
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName || "file")}"`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600"
    });

    let clientDisconnected = false;
    if (req) {
      req.on("close", () => {
        clientDisconnected = true;
      });
    }

    try {
      const downloadIter = client.iterDownload({
        file: location,
        dcId: dcId,
        requestSize: requestSize,
        stride: requestSize
      });

      for await (const chunk of downloadIter) {
        if (clientDisconnected || res.writableEnded || res.destroyed) {
          break;
        }
        res.write(chunk);
      }
      res.end();
    } catch (streamErr) {
      console.error("GramJS full stream error:", streamErr.message);
      if (!res.headersSent) res.status(500).send("Error streaming media");
    }
  }
}
