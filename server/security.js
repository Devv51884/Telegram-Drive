import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { dbGetSetting, dbSetSetting } from "./db.js";

// Ensure a persistent server secret key for HMAC token signing
let cachedServerSecret = null;

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

  // Generate random 64-byte secret key on first run
  const newSecret = crypto.randomBytes(64).toString("hex");
  await dbSetSetting("APP_SECRET", newSecret);
  cachedServerSecret = newSecret;
  return newSecret;
}

// 1. Cryptographically Secure Password Hashing with Scrypt & Salt
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
export async function createSessionToken(expiresInDays = 7) {
  const secret = await getServerSecret();
  const payload = {
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
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  try {
    const [payloadBase64, signature] = token.split(".");
    const secret = await getServerSecret();
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    if (Date.now() > payload.exp) {
      return false; // Token expired
    }

    return true;
  } catch {
    return false;
  }
}

// 3. Authentication Middleware
export async function requireAuth(req, res, next) {
  const fullUrl = req.originalUrl || req.url || "";
  const path = req.path || "";

  // Public paths that do not require authentication
  const isPublic =
    path === "/health" ||
    path === "/settings/auth/status" ||
    path === "/settings/auth/login" ||
    path === "/settings/auth/setup" ||
    fullUrl.includes("/api/health") ||
    fullUrl.includes("/api/settings/auth/status") ||
    fullUrl.includes("/api/settings/auth/login") ||
    fullUrl.includes("/api/settings/auth/setup");

  if (isPublic) {
    return next();
  }

  // Check if Master Password is configured
  const masterHash = (await dbGetSetting("MASTER_PASSWORD_HASH")) || process.env.MASTER_PASSWORD_HASH;
  if (!masterHash) {
    // Master password has not been setup yet -> allow setup
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
      error: "Authentication required. Please enter your Master PIN/Password to access TeleDrive."
    });
  }

  const isValid = await verifySessionToken(token);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: "Session invalid or expired. Please login again."
    });
  }

  next();
}

// 4. DDoS & Brute-Force Rate Limiters
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication attempts from this IP. Please try again after 15 minutes."
  }
});

export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 40, // Max 40 uploads / link imports per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Upload rate limit exceeded. Please wait a few minutes before uploading or importing more files."
  }
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // Max 600 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => (req.originalUrl || req.url || "").includes("/stream") // Don't rate limit video chunks streaming
});

// 5. Input Sanitization & Security Helpers
export function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== "string") return "file";

  // Strip null bytes, path traversal, control chars, and HTML/script tags
  let clean = fileName
    .replace(/\0/g, "")
    .replace(/<[^>]*>?/gm, "") // Remove HTML tags
    .replace(/[\r\n\t]/g, "")
    .replace(/\.\.+[/\\]/g, "") // Remove ../ and ..\
    .replace(/[/\\]/g, "_") // Replace path slashes
    .trim();

  // Strip leading dots to prevent hidden files on unix/storage
  clean = clean.replace(/^\.+/, "");

  // Fallback if cleaned string is empty
  if (!clean || clean.length === 0) {
    clean = `file_${crypto.randomBytes(4).toString("hex")}`;
  }

  // Max 255 characters limit
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
  // Strictly validate telegram post URLs to prevent SSRF
  const pattern = /^https?:\/\/(t\.me|telegram\.me)\/(c\/\d+\/\d+|[a-zA-Z0-9_]+\/\d+)$/i;
  return pattern.test(trimmed);
}

export function maskSecret(secret, visible = 4) {
  if (!secret) return "";
  if (secret.length <= visible * 2) return "********";
  return `${secret.slice(0, visible)}...${secret.slice(-visible)}`;
}
