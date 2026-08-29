import axios from "axios";
import FormData from "form-data";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { computeCheck } from "telegram/Password.js";
import bigInt from "big-integer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  dbGetSetting,
  dbSetSetting,
  dbGetActiveTelegramSession,
  dbSaveTelegramSession,
  dbDeactivateTelegramSessions,
  generateId
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get Telegram Bot & Account credentials
export async function getTelegramConfig() {
  const dbBot = await dbGetSetting("BOT_TOKEN");
  const dbChat = (await dbGetSetting("STORAGE_CHAT_ID")) || (await dbGetSetting("STORAGE_CHANNEL_ID"));
  const dbApiId = await dbGetSetting("API_ID");
  const dbApiHash = await dbGetSetting("API_HASH");

  const botToken = (dbBot && dbBot.trim()) || (process.env.BOT_TOKEN && process.env.BOT_TOKEN.trim()) || "";
  const chatId =
    (dbChat && dbChat.trim()) ||
    (process.env.STORAGE_CHAT_ID && process.env.STORAGE_CHAT_ID.trim()) ||
    (process.env.STORAGE_CHANNEL_ID && process.env.STORAGE_CHANNEL_ID.trim()) ||
    "";
  const apiId = (dbApiId && dbApiId.trim()) || (process.env.API_ID && process.env.API_ID.trim()) || "";
  const apiHash = (dbApiHash && dbApiHash.trim()) || (process.env.API_HASH && process.env.API_HASH.trim()) || "";

  return {
    botToken: botToken.trim(),
    chatId: chatId.trim(),
    apiId: apiId ? parseInt(apiId.trim(), 10) : undefined,
    apiHash: apiHash.trim()
  };
}

// Multi-user isolated MTProto TelegramClient map: userId -> TelegramClient
const userGramClients = new Map();
const userSessionStrings = new Map();
let activeBotGramClient = null;
let activeBotToken = null;
let activeBotSessionString = "";

// Dedicated Storage Bot MTProto Client (Streams and downloads files from Owner's Storage Channel up to 2GB)
export async function getStorageGramClient() {
  const config = await getTelegramConfig();
  if (!config.apiId || !config.apiHash) {
    return null;
  }

  if (config.botToken) {
    if (activeBotGramClient && activeBotToken === config.botToken) {
      if (!activeBotGramClient.connected) {
        try {
          await activeBotGramClient.connect();
        } catch {}
      }
      return activeBotGramClient;
    }

    if (activeBotGramClient) {
      try {
        await activeBotGramClient.disconnect();
      } catch {}
    }

    let savedSession = activeBotSessionString;
    if (!savedSession) {
      try {
        const { dbGetSetting } = await import("./db.js");
        savedSession = await dbGetSetting("storage_bot_session");
      } catch {}
    }

    try {
      const botSession = new StringSession(savedSession || "");
      const botClient = new TelegramClient(botSession, config.apiId, config.apiHash, {
        connectionRetries: 3,
        useWSS: false
      });

      if (savedSession) {
        await botClient.connect();
        try {
          const isAuth = await botClient.checkAuthorization();
          if (isAuth) {
            activeBotSessionString = savedSession;
            activeBotGramClient = botClient;
            activeBotToken = config.botToken;
            return activeBotGramClient;
          }
        } catch {}
      }

      await botClient.start({
        botAuthToken: config.botToken
      });

      const newSession = botClient.session.save();
      activeBotSessionString = newSession;
      activeBotGramClient = botClient;
      activeBotToken = config.botToken;

      try {
        const { dbSetSetting } = await import("./db.js");
        await dbSetSetting("storage_bot_session", newSession);
      } catch {}

      console.log("🤖 MTProto Storage Bot Client active for high-speed channel streaming/downloads.");
      return activeBotGramClient;
    } catch (botGramErr) {
      console.error("Failed to initialize MTProto Storage Bot Client:", botGramErr.message);
    }
  }

  // Fallback to active telegram session if bot token fails
  return getUserGramClient(null);
}

// User Account MTProto Client (Used for importing user's personal channel/group post links)
export async function getUserGramClient(userId = null) {
  const config = await getTelegramConfig();
  if (!config.apiId || !config.apiHash) {
    return null;
  }

  const sessionRow = await dbGetActiveTelegramSession(userId);
  const sessionStr = sessionRow?.session_string || "";

  if (!sessionStr) {
    return null;
  }

  const key = userId || "global";
  const existingClient = userGramClients.get(key);
  const existingSessionStr = userSessionStrings.get(key);

  if (existingClient && existingSessionStr === sessionStr) {
    if (!existingClient.connected) {
      try {
        await existingClient.connect();
      } catch {}
    }
    return existingClient;
  }

  if (existingClient) {
    try {
      await existingClient.disconnect();
    } catch {}
    userGramClients.delete(key);
    userSessionStrings.delete(key);
  }

  try {
    const session = new StringSession(sessionStr);
    const client = new TelegramClient(session, config.apiId, config.apiHash, {
      connectionRetries: 3,
      useWSS: false
    });

    await client.connect();

    // Verify session authorization safely
    try {
      const isAuth = await client.checkAuthorization();
      if (!isAuth) {
        console.warn(`Telegram session authorization returned false for user ${key}. Deactivating expired session.`);
        userGramClients.delete(key);
        userSessionStrings.delete(key);
        await dbDeactivateTelegramSessions(userId);
        return null;
      }
    } catch (authCheckErr) {
      if (
        authCheckErr.errorMessage === "AUTH_KEY_UNREGISTERED" ||
        authCheckErr.errorMessage === "SESSION_REVOKED" ||
        authCheckErr.code === 401 ||
        authCheckErr.message?.includes("AUTH_KEY_UNREGISTERED") ||
        authCheckErr.message?.includes("SESSION_REVOKED")
      ) {
        console.warn(`Telegram session permanently revoked for user ${key} (AUTH_KEY_UNREGISTERED). Deactivating expired session.`);
        userGramClients.delete(key);
        userSessionStrings.delete(key);
        await dbDeactivateTelegramSessions(userId);
        return null;
      }
      console.warn(`Non-fatal Telegram auth check warning for user ${key}:`, authCheckErr.message);
    }

    userGramClients.set(key, client);
    userSessionStrings.set(key, sessionStr);
    return client;
  } catch (userGramErr) {
    if (
      userGramErr.errorMessage === "AUTH_KEY_UNREGISTERED" ||
      userGramErr.errorMessage === "SESSION_REVOKED" ||
      userGramErr.code === 401 ||
      userGramErr.message?.includes("AUTH_KEY_UNREGISTERED") ||
      userGramErr.message?.includes("SESSION_REVOKED")
    ) {
      console.warn(`Telegram session permanently revoked for user ${key} (AUTH_KEY_UNREGISTERED). Deactivating expired session.`);
      userGramClients.delete(key);
      userSessionStrings.delete(key);
      await dbDeactivateTelegramSessions(userId);
      return null;
    } else {
      console.warn(`User MTProto session connect glitch (user: ${key}):`, userGramErr.message);
    }
    return null;
  }
}

// Periodic Telegram MTProto socket keepalive to prevent Telegram from disconnecting idle connections
setInterval(async () => {
  try {
    for (const [key, client] of userGramClients.entries()) {
      if (client) {
        try {
          if (!client.connected) {
            await client.connect().catch(() => {});
          } else {
            await client.getMe().catch(() => {});
          }
        } catch {}
      }
    }
    if (activeBotGramClient) {
      try {
        if (!activeBotGramClient.connected) {
          await activeBotGramClient.connect().catch(() => {});
        } else {
          await activeBotGramClient.getMe().catch(() => {});
        }
      } catch {}
    }
  } catch {}
}, 4 * 60 * 1000);

// General Gram Client resolver (Supports both Storage Bot and User Account)
export async function getGramClient(userId = null, preferStorageBot = false) {
  if (preferStorageBot) {
    const storageClient = await getStorageGramClient();
    if (storageClient) return storageClient;
  }
  const userClient = await getUserGramClient(userId);
  if (userClient) return userClient;
  return getStorageGramClient();
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

  // ==========================================
  // Strategy 1: High-Speed Telegram Bot API Direct Upload (Files <= 20MB)
  // 100% reliable Bot CDN streaming limit is 20MB
  // ==========================================
  if (config.botToken && config.chatId && fileSize <= 20 * 1024 * 1024) {
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

  // ==========================================
  // Strategy 2: Large File MTProto GramJS Upload (up to 2GB)
  // Used for files > 50MB up to 2GB directly into storage channel
  // ==========================================
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
        const msgId = res.id?.toString();
        const channelId = targetPeer.toString();

        console.log(`✅ Large file "${originalname}" successfully stored in Storage Channel (#${res.id}).`);        

        // Pre-populate mediaLocationCache so first video stream request is instant 0ms
        if (msgId && doc) {
          try {
            let location = null;
            if (res.media.document) {
              location = new Api.InputDocumentFileLocation({
                id: doc.id,
                accessHash: doc.accessHash,
                fileReference: doc.fileReference,
                thumbSize: ""
              });
            } else if (res.media.photo) {
              const sizes = doc.sizes || [];
              const largest = sizes.filter((s) => s.size || (s.w && s.h)).pop() || sizes[sizes.length - 1];
              location = new Api.InputPhotoFileLocation({
                id: doc.id,
                accessHash: doc.accessHash,
                fileReference: doc.fileReference,
                thumbSize: largest?.type || "y"
              });
            }
            if (location) {
              const cacheKey = `${channelId}_${msgId}`;
              mediaLocationCache.set(cacheKey, {
                totalSize: Number(doc.size || fileSize),
                location,
                dcId: doc.dcId
              });
              setTimeout(() => mediaLocationCache.delete(cacheKey), 30 * 60 * 1000);
            }
          } catch {}
        }

        return {
          sourceType: "upload",
          fileId: null,
          fileUniqueId: doc.id?.toString(),
          fileSize: Number(doc.size || fileSize),
          messageId: res.id.toString(),
          channelId: targetPeer.toString(),
          accessHash: doc.accessHash?.toString() || null,
          fileReference: doc.fileReference ? Buffer.from(doc.fileReference).toString("base64") : null
        };
      }
    } catch (gramErr) {
      console.error("MTProto storage channel upload failed:", gramErr.message);
      throw new Error(`Upload failed: ${gramErr.message}`);
    }
  }

  throw new Error(
    "Upload failed: No connected Telegram account or active storage channel available. Please configure your Telegram bot token and storage channel in Settings."
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
export async function completeTelegramLogin(userId, phoneNumber, phoneCode, password2FA = "", phoneCodeHash = "") {
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

  const targetHash = phoneCodeHash || authState?.phoneCodeHash;
  if (!targetHash) {
    throw new Error("Phone code hash is missing. Please request a new verification code.");
  }

  let user = null;

  try {
    if (password2FA) {
      // 2FA Password Check
      const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
      const passwordSrpCheck = await computeCheck(passwordSrpResult, password2FA);
      const res = await client.invoke(
        new Api.auth.CheckPassword({
          password: passwordSrpCheck
        })
      );
      user = res.user;
    } else {
      // OTP Code Check
      const res = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: cleanPhone,
          phoneCodeHash: targetHash,
          phoneCode: phoneCode.trim()
        })
      );
      user = res.user;
    }
  } catch (err) {
    if (
      err.message?.includes("SESSION_PASSWORD_NEEDED") ||
      err.errorMessage === "SESSION_PASSWORD_NEEDED" ||
      err.message?.includes("2FA")
    ) {
      if (!password2FA) {
        return {
          requires2FA: true,
          message: "2-Step Verification password is required for this account."
        };
      }
    }
    throw err;
  }

  if (!user) {
    throw new Error("Telegram authentication failed. Please check code or try again.");
  }

  const sessionString = client.session.save();
  const sessionId = generateId("tgsess_");
  const userInfoObj = {
    id: user.id?.toString() || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    username: user.username || "",
    phoneNumber: cleanPhone
  };

  await dbDeactivateTelegramSessions(userId);
  await dbSaveTelegramSession({
    id: sessionId,
    user_id: userId || null,
    phone_number: cleanPhone,
    session_string: sessionString,
    user_info: JSON.stringify(userInfoObj),
    username: user.username || null,
    first_name: user.firstName || null,
    last_name: user.lastName || null,
    is_active: 1
  });

  const key = userId || "global";
  userGramClients.set(key, client);
  userSessionStrings.set(key, sessionString);
  activeAuthClients.delete(cleanPhone);

  return {
    success: true,
    user: {
      id: user.id?.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: cleanPhone
    }
  };
}

// Get connected Telegram User information
export async function getConnectedTelegramUser(userId = null) {
  const sessionRow = await dbGetActiveTelegramSession(userId);
  if (!sessionRow || !sessionRow.session_string) {
    return { connected: false };
  }

  let parsedInfo = {};
  if (sessionRow.user_info) {
    try {
      parsedInfo = typeof sessionRow.user_info === "string" ? JSON.parse(sessionRow.user_info) : sessionRow.user_info;
    } catch {}
  }

  const firstName = parsedInfo.firstName || parsedInfo.first_name || sessionRow.first_name || "Telegram User";
  const lastName = parsedInfo.lastName || parsedInfo.last_name || sessionRow.last_name || "";
  const rawUsername = parsedInfo.username || sessionRow.username || "";
  const username = rawUsername ? (rawUsername.startsWith("@") ? rawUsername : `@${rawUsername}`) : "";
  const phone = sessionRow.phone_number || parsedInfo.phoneNumber || parsedInfo.phone || "";
  const telegramId = parsedInfo.id || sessionRow.id || "";

  return {
    connected: true,
    phoneNumber: phone,
    username: username || (phone ? `+${phone.replace(/\D/g, "")}` : firstName),
    firstName,
    lastName,
    info: {
      id: telegramId,
      firstName,
      lastName,
      username: username || rawUsername || firstName
    }
  };
}

// Logout & Disconnect Telegram User Account
export async function logoutTelegramUser(userId = null) {
  const key = userId || "global";
  const client = userGramClients.get(key);
  if (client) {
    try {
      await client.disconnect();
    } catch {}
    userGramClients.delete(key);
    userSessionStrings.delete(key);
  }
  await dbDeactivateTelegramSessions(userId);
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
export async function parseAndFetchTelegramPost(postUrl, userId = null) {
  const parsed = parseTelegramPostUrl(postUrl);
  if (!parsed) {
    throw new Error(
      "Invalid Telegram link format. Expected https://t.me/channel_name/123 or https://t.me/c/1234567890/123"
    );
  }

  const client = await getGramClient(userId);
  if (!client) {
    throw new Error(
      "No Telegram user account is connected. Please connect your Telegram account in Settings to import channel media."
    );
  }

  let peer = parsed.channelId;
  const messageId = parsed.messageId;

  // Resolve target peer entity with automatic cache warmup for private channels/groups
  let targetPeer = peer;
  try {
    targetPeer = await client.getInputEntity(peer);
  } catch (err1) {
    // If not found in cache, fetch recent dialogs to populate GramJS entity cache
    try {
      await client.getDialogs({ limit: 100 });
      targetPeer = await client.getInputEntity(peer);
    } catch (err2) {
      const rawNum = parsed.rawChannelId || parsed.channelId.replace("-100", "");
      try {
        targetPeer = await client.getInputEntity(bigInt(rawNum));
      } catch (err3) {
        try {
          targetPeer = await client.getInputEntity(bigInt(`-100${rawNum}`));
        } catch (err4) {
          try {
            const dialogs = await client.getDialogs({ limit: 200 });
            const found = dialogs.find((d) => {
              const idStr = d.id?.toString() || "";
              return (
                idStr === rawNum ||
                idStr === `-100${rawNum}` ||
                idStr === `100${rawNum}` ||
                d.entity?.username === parsed.channelUsername
              );
            });
            if (found && found.inputEntity) {
              targetPeer = found.inputEntity;
            }
          } catch {}
        }
      }
    }
  }

  try {
    const messages = await client.getMessages(targetPeer, { ids: [messageId] });
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

    let fileReference = null;
    let accessHash = null;
    let dcId = null;

    if (msg.media.document) {
      const doc = msg.media.document;
      fileSize = Number(doc.size || 0);
      mimeType = doc.mimeType || "application/octet-stream";
      fileReference = doc.fileReference ? Buffer.from(doc.fileReference).toString("base64") : null;
      accessHash = doc.accessHash ? doc.accessHash.toString() : null;
      dcId = doc.dcId;

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
      const photo = msg.media.photo;
      fileReference = photo.fileReference ? Buffer.from(photo.fileReference).toString("base64") : null;
      accessHash = photo.accessHash ? photo.accessHash.toString() : null;
      dcId = photo.dcId;
      const sizes = photo.sizes || [];
      const largest = sizes.filter((s) => s.size || (s.w && s.h)).pop() || sizes[sizes.length - 1];
      fileSize = Number(largest?.size || 1024 * 500);
    }

    let channelTitle = "Telegram Channel";
    try {
      const chat = await client.getEntity(peer);
      channelTitle = chat.title || chat.username || "Telegram Channel";
    } catch {}

    // Pre-populate mediaLocationCache so immediate stream request is instant 0ms
    if (msg.media) {
      let location = null;
      if (msg.media.document) {
        const doc = msg.media.document;
        location = new Api.InputDocumentFileLocation({
          id: doc.id,
          accessHash: doc.accessHash,
          fileReference: doc.fileReference,
          thumbSize: ""
        });
      } else if (msg.media.photo) {
        const photo = msg.media.photo;
        const sizes = photo.sizes || [];
        const largest = sizes.filter((s) => s.size || (s.w && s.h)).pop() || sizes[sizes.length - 1];
        location = new Api.InputPhotoFileLocation({
          id: photo.id,
          accessHash: photo.accessHash,
          fileReference: photo.fileReference,
          thumbSize: largest?.type || "y"
        });
      }
      if (location) {
        const cacheKey = `${peer.toString()}_${messageId.toString()}`;
        mediaLocationCache.set(cacheKey, {
          totalSize: Number(fileSize),
          location,
          dcId: dcId || client.session.dcId
        });
        setTimeout(() => mediaLocationCache.delete(cacheKey), 30 * 60 * 1000);
      }
    }

    const docId = msg.media.document?.id?.toString() || msg.media.photo?.id?.toString() || null;

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
      duration,
      docId,
      fileReference,
      accessHash,
      dcId
    };
  } catch (err) {
    throw new Error(`Failed to fetch Telegram message: ${err.message}`);
  }
}

// In-memory media location cache to eliminate MTProto roundtrips on range requests
const mediaLocationCache = new Map();

// Download/Stream chunk from GramJS MTProto message with HTTP Range support & direct download (Multi-DC Streaming)
export async function streamGramMedia(
  channelId,
  messageId,
  rangeHeader = null,
  req = null,
  res = null,
  mimeType = "",
  fileName = "",
  isDownload = false,
  useStorageBot = true,
  storedFileRef = null,    // base64 fileReference from DB
  storedAccessHash = null, // accessHash string from DB
  storedDocId = null,      // docId string from DB
  fileSize = 0,            // totalSize from DB
  userId = null
) {
  // Set explicit CORS and media headers on stream response
  if (res && !res.headersSent) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, X-Access-Token");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    res.setHeader("Accept-Ranges", "bytes");
  }

  // Use User account client for imported posts; Use Storage Bot for platform uploads; fallback seamlessly
  let client = null;
  if (!useStorageBot) {
    client = await getUserGramClient(userId);
    if (!client) client = await getStorageGramClient();
  } else {
    client = await getStorageGramClient();
    if (!client) client = await getUserGramClient(userId);
  }
  if (!client) {
    client = await getGramClient(userId);
  }
  if (!client) {
    throw new Error("Telegram MTProto streaming client unavailable");
  }

  const cacheKey = `${channelId}_${messageId}`;
  let mediaCache = mediaLocationCache.get(cacheKey);

  // Fast path: If docId, accessHash and fileRef are in DB, build location directly with 0ms delay
  if (!mediaCache && storedDocId && storedAccessHash && storedFileRef) {
    try {
      const isPhoto = mimeType?.startsWith("image/") || (fileName && fileName.match(/\.(png|jpg|jpeg|webp)$/i));
      let location = null;
      if (!isPhoto) {
        location = new Api.InputDocumentFileLocation({
          id: bigInt(storedDocId.toString()),
          accessHash: bigInt(storedAccessHash.toString()),
          fileReference: Buffer.from(storedFileRef, "base64"),
          thumbSize: ""
        });
      } else {
        location = new Api.InputPhotoFileLocation({
          id: bigInt(storedDocId.toString()),
          accessHash: bigInt(storedAccessHash.toString()),
          fileReference: Buffer.from(storedFileRef, "base64"),
          thumbSize: "y"
        });
      }
      mediaCache = {
        totalSize: Number(fileSize) || 0,
        location,
        dcId: null // Let it resolve dynamically or use active DC
      };
      mediaLocationCache.set(cacheKey, mediaCache);
    } catch (directLocErr) {
      console.warn("Direct location build notice:", directLocErr.message);
    }
  }

  async function resolveAndCacheMedia() {
    const msgId = parseInt(messageId, 10);
    let msg = null;

    // 1. Try direct getMessages
    try {
      const messages = await client.getMessages(channelId, { ids: [msgId] });
      if (messages && messages[0] && messages[0].media) {
        msg = messages[0];
      }
    } catch (e1) {}

    // 2. Try entity resolution (only fetch dialogs on user client, bots cannot call getDialogs)
    if (!msg || !msg.media) {
      try {
        let targetEntity = null;
        try {
          targetEntity = await client.getInputEntity(channelId);
        } catch {
          // If not bot, try dialogs cache
          if (!activeBotToken || client !== activeBotGramClient) {
            try {
              await client.getDialogs({ limit: 100 });
              targetEntity = await client.getInputEntity(channelId);
            } catch {}
          }
        }

        if (!targetEntity) {
          const rawNum = channelId.toString().replace(/^-100/, "").replace(/^-/, "");
          try {
            targetEntity = await client.getInputEntity(bigInt(rawNum));
          } catch {
            try {
              targetEntity = await client.getInputEntity(bigInt(`-100${rawNum}`));
            } catch {}
          }
        }

        if (!targetEntity && (!activeBotToken || client !== activeBotGramClient)) {
          const dialogs = await client.getDialogs({ limit: 200 });
          const rawNum = channelId.toString().replace(/^-100/, "").replace(/^-/, "");
          const found = dialogs.find((d) => {
            const idStr = d.id?.toString() || "";
            return (
              idStr === rawNum ||
              idStr === `-100${rawNum}` ||
              idStr === `100${rawNum}` ||
              d.entity?.username === channelId
            );
          });
          if (found) {
            targetEntity = found.inputEntity || found.entity;
          }
        }

        if (targetEntity) {
          const messages = await client.getMessages(targetEntity, { ids: [msgId] });
          if (messages && messages[0] && messages[0].media) {
            msg = messages[0];
          }
        }
      } catch (e2) {}
    }

    // 3. Try alternate client fallback (User <-> Storage Bot)
    if (!msg || !msg.media) {
      try {
        const altClient = await getGramClient(userId, !useStorageBot);
        if (altClient && altClient !== client) {
          try {
            const messages = await altClient.getMessages(channelId, { ids: [msgId] });
            if (messages && messages[0] && messages[0].media) {
              msg = messages[0];
              client = altClient;
            }
          } catch {}
          if (!msg || !msg.media) {
            if (!activeBotToken || altClient !== activeBotGramClient) {
              try {
                await altClient.getDialogs({ limit: 100 });
              } catch {}
            }
            try {
              const entity = await altClient.getEntity(channelId);
              if (entity) {
                const messages = await altClient.getMessages(entity, { ids: [msgId] });
                if (messages && messages[0] && messages[0].media) {
                  msg = messages[0];
                  client = altClient;
                }
              }
            } catch {}
          }
        }
      } catch (e3) {}
    }

    if (!msg || !msg.media) {
      // If message is not resolvable but we have storedAccessHash & storedDocId, construct location
      if (storedDocId && storedAccessHash && storedFileRef) {
        const isPhoto = mimeType?.startsWith("image/") || (fileName && fileName.match(/\.(png|jpg|jpeg|webp)$/i));
        const location = !isPhoto
          ? new Api.InputDocumentFileLocation({
              id: bigInt(storedDocId.toString()),
              accessHash: bigInt(storedAccessHash.toString()),
              fileReference: Buffer.from(storedFileRef, "base64"),
              thumbSize: ""
            })
          : new Api.InputPhotoFileLocation({
              id: bigInt(storedDocId.toString()),
              accessHash: bigInt(storedAccessHash.toString()),
              fileReference: Buffer.from(storedFileRef, "base64"),
              thumbSize: "y"
            });
        return {
          totalSize: Number(fileSize) || 0,
          location,
          dcId: client.session.dcId
        };
      }
      throw new Error(`Telegram media post #${msgId} not found in channel ${channelId}`);
    }

    const media = msg.media;
    let totalSize = 0;
    let location = null;
    let dcId = undefined;
    let foundHash = null;
    let foundRef = null;
    let foundDocId = null;

    if (media.document) {
      const doc = media.document;
      totalSize = Number(doc.size || 0);
      location = new Api.InputDocumentFileLocation({
        id: bigInt(doc.id.toString()),
        accessHash: bigInt(doc.accessHash.toString()),
        fileReference: doc.fileReference,
        thumbSize: ""
      });
      dcId = doc.dcId;
      foundHash = doc.accessHash ? doc.accessHash.toString() : null;
      foundRef = doc.fileReference ? Buffer.from(doc.fileReference).toString("base64") : null;
      foundDocId = doc.id ? doc.id.toString() : null;
    } else if (media.photo) {
      const photo = media.photo;
      const sizes = photo.sizes || [];
      const largest = sizes.filter((s) => s.size || (s.w && s.h)).pop() || sizes[sizes.length - 1];
      totalSize = Number(largest?.size || (largest?.bytes ? largest.bytes.length : 1024 * 500));
      location = new Api.InputPhotoFileLocation({
        id: bigInt(photo.id.toString()),
        accessHash: bigInt(photo.accessHash.toString()),
        fileReference: photo.fileReference,
        thumbSize: largest?.type || "y"
      });
      dcId = photo.dcId;
      foundHash = photo.accessHash ? photo.accessHash.toString() : null;
      foundRef = photo.fileReference ? Buffer.from(photo.fileReference).toString("base64") : null;
      foundDocId = photo.id ? photo.id.toString() : null;
    } else {
      throw new Error("Unsupported media type for MTProto streaming");
    }

    // Auto-backfill to SQLite and Supabase if file was previously unhashed or ref changed
    if (foundHash) {
      (async () => {
        try {
          const { getSqliteDb, getSupabaseClient } = await import("./db.js");
          const sqlite = await getSqliteDb();
          await sqlite.run(
            "UPDATE files SET telegram_file_id = CASE WHEN telegram_file_id IS NULL THEN ? ELSE telegram_file_id END, telegram_access_hash = ?, telegram_file_reference = ?, size = CASE WHEN size = 0 THEN ? ELSE size END WHERE telegram_message_id = ? AND (telegram_channel_id = ? OR telegram_channel_id LIKE ?)",
            [foundDocId, foundHash, foundRef, totalSize, messageId.toString(), channelId.toString(), `%${channelId.toString().replace(/^-100/, "").replace(/^-/, "")}%`]
          );
          const supabase = await getSupabaseClient();
          if (supabase) {
            await supabase
              .from("files")
              .update({ telegram_file_id: foundDocId, telegram_access_hash: foundHash, telegram_file_reference: foundRef })
              .eq("telegram_message_id", messageId.toString());
          }
        } catch {}
      })();
    }

    const resolved = { totalSize, location, dcId };
    mediaLocationCache.set(cacheKey, resolved);
    setTimeout(() => mediaLocationCache.delete(cacheKey), 30 * 60 * 1000);
    return resolved;
  }

  if (!mediaCache) {
    mediaCache = await resolveAndCacheMedia();
  }

  let { totalSize, location, dcId } = mediaCache;

  const lowerName = (fileName || "").toLowerCase().trim();
  let contentType = "application/octet-stream";
  if (lowerName.endsWith(".webm") || mimeType?.includes("webm")) {
    contentType = "video/webm";
  } else if (lowerName.endsWith(".mkv") || mimeType?.includes("matroska")) {
    contentType = "video/x-matroska";
  } else if (
    lowerName.endsWith(".mp4") ||
    lowerName.endsWith(".m4v") ||
    lowerName.endsWith(".mov") ||
    lowerName.endsWith(".ts") ||
    mimeType?.includes("mp4") ||
    mimeType === "video/mp2t" ||
    (!mimeType?.includes("audio") && !mimeType?.includes("image") && !mimeType?.includes("pdf") && !lowerName.match(/\.(png|jpg|jpeg|gif|webp|pdf|mp3|m4a|ogg|docx|txt|json)$/))
  ) {
    contentType = "video/mp4";
  } else if (lowerName.endsWith(".mp3") || lowerName.endsWith(".m4a") || mimeType?.includes("audio")) {
    contentType = "audio/mpeg";
  } else if (lowerName.endsWith(".pdf") || mimeType?.includes("pdf")) {
    contentType = "application/pdf";
  } else if (lowerName.endsWith(".png")) {
    contentType = "image/png";
  } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    contentType = "image/jpeg";
  } else if (lowerName.endsWith(".webp")) {
    contentType = "image/webp";
  } else if (mimeType && mimeType !== "video/mp2t") {
    contentType = mimeType;
  } else {
    contentType = "video/mp4";
  }

  const dispositionType = isDownload ? "attachment" : "inline";
  const contentDisposition = `${dispositionType}; filename="${encodeURIComponent(fileName || "media")}"`;

  const CHUNK_SIZE = 128 * 1024; // 128KB MTProto compliant chunk size

  async function getActiveSender(targetDc) {
    try {
      return await client.getSender(targetDc || dcId || client.session.dcId);
    } catch {
      try {
        return await client.getSender(client.session.dcId);
      } catch {
        return null;
      }
    }
  }

  let sender = await getActiveSender(dcId);

  async function fetchMtprotoChunk(chunkOffset, retryCount = 0) {
    const reqObj = new Api.upload.GetFile({
      location: location,
      offset: bigInt(chunkOffset.toString()),
      limit: CHUNK_SIZE,
      precise: true
    });

    try {
      if (sender) {
        const res = await client.invokeWithSender(reqObj, sender);
        return res?.bytes;
      }
      const res = await client.invoke(reqObj);
      return res?.bytes;
    } catch (err) {
      if (err.newDc) {
        dcId = err.newDc;
        sender = await getActiveSender(err.newDc);
        if (sender) {
          const res = await client.invokeWithSender(reqObj, sender);
          return res?.bytes;
        }
      }
      if (err.errorMessage === "TIMEOUT" && retryCount < 2) {
        await new Promise((r) => setTimeout(r, 400));
        return fetchMtprotoChunk(chunkOffset, retryCount + 1);
      }
      // Auto-refresh file reference on expiration and retry
      if (
        (err.message?.includes("FILE_REFERENCE") ||
          err.message?.includes("FILEREF") ||
          err.errorMessage?.includes("FILE_REFERENCE")) &&
        retryCount < 2
      ) {
        mediaLocationCache.delete(cacheKey);
        const refreshed = await resolveAndCacheMedia();
        location = refreshed.location;
        dcId = refreshed.dcId;
        totalSize = refreshed.totalSize;
        sender = await getActiveSender(dcId);
        return fetchMtprotoChunk(chunkOffset, retryCount + 1);
      }
      throw err;
    }
  }

  if (rangeHeader && totalSize > 0) {
    // Parse Range: bytes=start-end
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;

    if (start >= totalSize) {
      res.writeHead(416, {
        "Content-Range": `bytes */${totalSize}`
      });
      return res.end();
    }

    const rawEnd = parts[1] && parts[1].trim() !== "" ? parseInt(parts[1], 10) : totalSize - 1;
    const end = Math.min(rawEnd, totalSize - 1);
    const requestedLength = Math.max(0, end - start + 1);

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${totalSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": requestedLength,
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
    });

    let clientDisconnected = false;
    if (req) {
      req.on("close", () => {
        clientDisconnected = true;
      });
    }

    try {
      const initialChunkIndex = Math.floor(start / CHUNK_SIZE);
      let currentChunkOffset = initialChunkIndex * CHUNK_SIZE;
      let bytesSent = 0;

      while (bytesSent < requestedLength && currentChunkOffset < totalSize) {
        if (clientDisconnected || res.writableEnded || res.destroyed) break;

        const chunk = await fetchMtprotoChunk(currentChunkOffset);
        if (!chunk || chunk.length === 0) break;

        const isFirstChunk = currentChunkOffset === initialChunkIndex * CHUNK_SIZE;
        const skip = isFirstChunk ? (start - currentChunkOffset) : 0;
        const available = Math.max(0, chunk.length - skip);
        const toTake = Math.min(available, requestedLength - bytesSent);

        if (toTake > 0) {
          const slice = chunk.subarray(skip, skip + toTake);
          res.write(slice);
          bytesSent += slice.length;
        }

        currentChunkOffset += CHUNK_SIZE;

        // End of range reached or EOF reached
        if (bytesSent >= requestedLength || chunk.length < CHUNK_SIZE) break;
      }

      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    } catch (streamErr) {
      if (!clientDisconnected) {
        console.warn("MTProto streaming notice:", streamErr.message);
      }
      if (streamErr.message?.includes("FILE_REFERENCE") || streamErr.message?.includes("FILEREF")) {
        mediaLocationCache.delete(cacheKey);
      }
      if (!res.headersSent) {
        res.status(500).send("Error streaming media");
      } else if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    }
  } else {
    // Full content stream / download (HTTP 200)
    res.writeHead(200, {
      "Content-Length": totalSize > 0 ? totalSize : undefined,
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
    });

    let clientDisconnected = false;
    if (req) {
      req.on("close", () => {
        clientDisconnected = true;
      });
    }

    try {
      let currentChunkOffset = 0;
      let totalSent = 0;

      while (totalSize === 0 || totalSent < totalSize) {
        if (clientDisconnected || res.writableEnded || res.destroyed) break;

        const chunk = await fetchMtprotoChunk(currentChunkOffset);
        if (!chunk || chunk.length === 0) break;

        res.write(chunk);
        currentChunkOffset += CHUNK_SIZE;
        totalSent += chunk.length;

        if (chunk.length < CHUNK_SIZE || (totalSize > 0 && totalSent >= totalSize)) break;
      }

      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    } catch (streamErr) {
      if (!clientDisconnected) {
        console.warn("MTProto download notice:", streamErr.message);
      }
      if (streamErr.message?.includes("FILE_REFERENCE") || streamErr.message?.includes("FILEREF")) {
        mediaLocationCache.delete(cacheKey);
      }
      if (!res.headersSent) res.status(500).send("Error downloading file");
      else if (!res.writableEnded && !res.destroyed) res.end();
    }
  }
}

// Automatic background repair to populate missing Telegram access hashes in SQLite & Supabase
export async function autoHealTelegramImportReferences() {
  try {
    const { getSqliteDb, getSupabaseClient } = await import("./db.js");
    const sqlite = await getSqliteDb();

    const unlinkedFiles = await sqlite.all(
      "SELECT id, telegram_channel_id, telegram_message_id, telegram_post_url, user_id FROM files WHERE source_type = 'telegram_post' AND (telegram_access_hash IS NULL OR telegram_file_reference IS NULL) LIMIT 50"
    );

    if (!unlinkedFiles || unlinkedFiles.length === 0) return;

    const userClients = new Map();
    let storageBotClient = null;

    async function getClientForUser(uId) {
      const key = uId || "default";
      if (userClients.has(key)) return userClients.get(key);
      try {
        const uClient = await getUserGramClient(uId);
        userClients.set(key, uClient);
        return uClient;
      } catch {
        userClients.set(key, null);
        return null;
      }
    }

    async function getBotClient() {
      if (storageBotClient !== null) return storageBotClient;
      try {
        storageBotClient = await getStorageGramClient();
      } catch {
        storageBotClient = null;
      }
      return storageBotClient;
    }

    let healedCount = 0;

    for (const f of unlinkedFiles) {
      try {
        if (!f.telegram_channel_id || !f.telegram_message_id) continue;
        const msgId = parseInt(f.telegram_message_id, 10);
        if (isNaN(msgId)) continue;

        const isPrivateOrSaved = f.telegram_channel_id === "me" || f.telegram_channel_id.startsWith("-100") || (f.telegram_post_url && f.telegram_post_url.includes("/c/"));

        // 1. Try User's Telegram Session
        let clientToUse = await getClientForUser(f.user_id);

        // 2. If no user session and channel is not strictly private Saved Messages, only try Storage Bot if public
        if (!clientToUse && !isPrivateOrSaved) {
          clientToUse = await getBotClient();
        }

        if (!clientToUse) continue;

        let msg = null;

        // Try safely resolving message
        try {
          const messages = await clientToUse.getMessages(f.telegram_channel_id, { ids: [msgId] });
          if (messages && messages[0] && messages[0].media) {
            msg = messages[0];
          }
        } catch (e1) {
          // If error is CHANNEL_INVALID or bot has no access to this private channel, silently skip
          if (e1.errorMessage === "CHANNEL_INVALID" || e1.errorMessage === "CHANNEL_PRIVATE" || e1.code === 400) {
            continue;
          }
        }

        // If not found and client is a user client, try entity lookup from dialogs
        if (!msg && clientToUse !== storageBotClient) {
          try {
            const rawNum = f.telegram_channel_id.replace(/^-100/, "").replace(/^-/, "");
            const targetPeer = await clientToUse.getInputEntity(bigInt(rawNum)).catch(() => null);
            if (targetPeer) {
              const messages = await clientToUse.getMessages(targetPeer, { ids: [msgId] }).catch(() => null);
              if (messages && messages[0] && messages[0].media) msg = messages[0];
            }
          } catch {}
        }

        if (msg && msg.media) {
          let foundHash = null;
          let foundRef = null;
          let foundDocId = null;
          let fileSize = 0;

          if (msg.media.document) {
            foundHash = msg.media.document.accessHash ? msg.media.document.accessHash.toString() : null;
            foundRef = msg.media.document.fileReference ? Buffer.from(msg.media.document.fileReference).toString("base64") : null;
            foundDocId = msg.media.document.id ? msg.media.document.id.toString() : null;
            fileSize = Number(msg.media.document.size || 0);
          } else if (msg.media.photo) {
            foundHash = msg.media.photo.accessHash ? msg.media.photo.accessHash.toString() : null;
            foundRef = msg.media.photo.fileReference ? Buffer.from(msg.media.photo.fileReference).toString("base64") : null;
            foundDocId = msg.media.photo.id ? msg.media.photo.id.toString() : null;
          }

          if (foundHash) {
            await sqlite.run(
              "UPDATE files SET telegram_file_id = CASE WHEN telegram_file_id IS NULL THEN ? ELSE telegram_file_id END, telegram_access_hash = ?, telegram_file_reference = ?, size = CASE WHEN size = 0 THEN ? ELSE size END WHERE id = ?",
              [foundDocId, foundHash, foundRef, fileSize, f.id]
            );
            const supabase = await getSupabaseClient();
            if (supabase) {
              await supabase
                .from("files")
                .update({ telegram_file_id: foundDocId, telegram_access_hash: foundHash, telegram_file_reference: foundRef })
                .eq("id", f.id);
            }
            healedCount++;
          }
        }
      } catch (itemErr) {
        if (
          itemErr.errorMessage === "AUTH_KEY_UNREGISTERED" ||
          itemErr.code === 401 ||
          itemErr.message?.includes("AUTH_KEY_UNREGISTERED")
        ) {
          await dbDeactivateTelegramSessions(f.user_id);
          userClients.delete(f.user_id || "default");
        }
      }
    }

    if (healedCount > 0) {
      console.log(`✅ Auto-healed ${healedCount} Telegram import reference(s).`);
    }
  } catch (err) {
    if (
      err.errorMessage === "AUTH_KEY_UNREGISTERED" ||
      err.code === 401 ||
      err.message?.includes("AUTH_KEY_UNREGISTERED")
    ) {
      await dbDeactivateTelegramSessions(null);
    }
  }
}
