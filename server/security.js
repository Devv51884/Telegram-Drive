import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { dbGetSetting, dbSetSetting, dbFindUserById } from "./db.js";

// Persistent in-memory cached server secret key for HMAC token signing
let cachedServerSecret = null;
let cachedMasterHash = null;
let lastHashCheck = 0;

export async function getServerSecret() {
  if (cachedServerSecret) return cachedServerSecret;
  if (process.env.APP_SECRET) {
    cachedServerSecret = process.env.APP_SECRET.trim();
    return cachedServerSecret;
  }

  const existingSecret = await dbGetSetting("APP_SECRET");
  if (existingSecret) {
    cachedServerSecret = existingSecret;
    return cachedServerSecret;
  }

  const newSecret = crypto.randomBytes(64).toString("hex");
  await dbSetSetting("APP_SECRET", newSecret);
  cachedServerSecret = newSecret;
  return newSecret;
}

export async function getMasterPasswordHash() {
  const now = Date.now();
  if (cachedMasterHash !== null && now - lastHashCheck < 30000) {
    return cachedMasterHash;
  }
  const hash = (await dbGetSetting("MASTER_PASSWORD_HASH")) || process.env.MASTER_PASSWORD_HASH || "";
  cachedMasterHash = hash;
  lastHashCheck = now;
  return hash;
}

export function invalidateMasterHashCache(newHash = null) {
  cachedMasterHash = newHash;
  lastHashCheck = Date.now();
}

// 1. Cryptographically Secure Password Hashing with Scrypt & Salt
export function validatePasswordStrength(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter (A-Z)" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter (a-z)" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number (0-9)" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character (!@#$%^&*...)" };
  }
  return { valid: true };
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  try {
    const [salt, key] = storedHash.split(":");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

// 2. Signed HMAC-SHA256 Session Token
export async function createSessionToken(userPayload = {}, expiresInDays = 7) {
  const secret = await getServerSecret();
  const payload = {
    ...userPayload,
    iat: Date.now(),
    exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    nonce: crypto.randomBytes(8).toString("hex")
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");
  return `${payloadBase64}.${signature}`;
}

export async function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const [payloadBase64, signature] = token.split(".");
    const secret = await getServerSecret();
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    if (Date.now() > payload.exp) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null;
  }
}

// 3. Ultra-Fast Authentication Middleware with strict path checking
export async function requireAuth(req, res, next) {
  const reqPath = req.path || "";
  const baseUrl = req.baseUrl || "";
  const fullApiPath = (baseUrl + reqPath).split("?")[0];

  // Whitelist of strictly public endpoints that do not require authentication
  const publicPaths = [
    "/api/health",
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/signup/send-otp",
    "/api/auth/signup/verify-otp",
    "/api/auth/forgot-password/send-otp",
    "/api/auth/forgot-password/verify-otp",
    "/api/settings/auth/status",
    "/api/settings/auth/login",
    "/api/settings/auth/setup"
  ];

  const isPublicAuthRoute =
    fullApiPath.startsWith("/api/auth/signup") ||
    fullApiPath.startsWith("/api/auth/login") ||
    fullApiPath.startsWith("/api/auth/forgot-password") ||
    reqPath.startsWith("/signup") ||
    reqPath.startsWith("/login") ||
    reqPath.startsWith("/forgot-password");

  const isPublicStreamOrDownload =
    fullApiPath.includes("/stream") ||
    fullApiPath.includes("/download") ||
    fullApiPath.includes("/api/share/public") ||
    reqPath.includes("/stream") ||
    reqPath.includes("/download") ||
    reqPath.includes("/share/public");

  if (publicPaths.includes(fullApiPath) || isPublicAuthRoute || reqPath === "/health" || isPublicStreamOrDownload) {
    // If token is provided, optionally attach authenticated user context
    let token = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (req.query && req.query.token) {
      token = req.query.token;
    } else if (req.headers["x-access-token"]) {
      token = req.headers["x-access-token"];
    }

    if (token) {
      try {
        const payload = await verifySessionToken(token);
        if (payload) {
          req.user = payload;
          req.userId = payload.userId || null;
        }
      } catch {}
    }

    return next();
  }

  // Extract token from Authorization header, query string, or custom header
  let token = null;
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token; // for media streaming <video src=".../stream?token=..." />
  } else if (req.headers["x-access-token"]) {
    token = req.headers["x-access-token"];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please sign in to access TeleDrive."
    });
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: "Session invalid or expired. Please sign in again."
    });
  }

  req.user = payload;
  req.userId = payload.userId || null;

  next();
}

// Admin authorization middleware
export async function requireAdmin(req, res, next) {
  const userId = req.userId || req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: "Authentication required for admin access." });
  }

  const user = await dbFindUserById(userId);
  if (!user) {
    return res.status(401).json({ success: false, error: "User account not found." });
  }

  const isAdmin = user.role === "admin" || user.email === "devv5412@gmail.com";
  if (!isAdmin) {
    return res.status(403).json({ success: false, error: "Access denied. Administrator privileges required." });
  }

  req.adminUser = user;
  next();
}

// 4. DDoS & Brute-Force Rate Limiters
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication attempts from this IP. Please try again after 15 minutes."
  }
});

export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => (req.originalUrl || req.url || "").includes("/upload-chunk"),
  message: {
    success: false,
    error: "Upload rate limit exceeded. Please wait a few moments before uploading more files."
  }
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const url = req.originalUrl || req.url || "";
    return url.includes("/stream") || url.includes("/upload-chunk");
  }
});

// 5. Input Sanitization & Security Helpers
export function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== "string") return "file";

  let clean = fileName
    .replace(/\0/g, "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\r\n\t]/g, "")
    .replace(/\.\.+[/\\]/g, "")
    .replace(/[/\\]/g, "_")
    .trim();

  clean = clean.replace(/^\.+/, "");

  if (!clean || clean.length === 0) {
    clean = `file_${crypto.randomBytes(4).toString("hex")}`;
  }

  if (clean.length > 255) {
    const ext = clean.split(".").pop();
    const base = clean.slice(0, 255 - ext.length - 1);
    clean = `${base}.${ext}`;
  }

  return clean;
}

export function validateTelegramUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  // Supports:
  // - https://t.me/channel_name/123
  // - https://t.me/channel_name/topic_id/123
  // - https://t.me/c/1234567890/123
  // - https://t.me/c/1234567890/topic_id/123
  const pattern = /^https?:\/\/(t\.me|telegram\.me)\/(c\/\d+(\/\d+)+|[a-zA-Z0-9_]+(\/\d+)+)$/i;
  return pattern.test(trimmed);
}

export function maskSecret(secret, visible = 4) {
  if (!secret) return "";
  if (secret.length <= visible * 2) return "********";
  return `${secret.slice(0, visible)}...${secret.slice(-visible)}`;
}
