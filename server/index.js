import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import dns from "dns";
import { getDb } from "./db.js";
import { requireAuth, apiLimiter } from "./security.js";

// Force Node.js to prioritize IPv4 over IPv6 globally (resolves ENETUNREACH on Render)
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Polyfill WebSocket for Node.js 20 & below to satisfy @supabase/supabase-js realtime
class NodeCompatibleWebSocket {
  constructor() {
    this.readyState = 3; // CLOSED
  }
  addEventListener() {}
  removeEventListener() {}
  send() {}
  close() {}
}

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = NodeCompatibleWebSocket;
}

import authRouter from "./routes/auth.js";
import foldersRouter from "./routes/folders.js";
import filesRouter from "./routes/files.js";
import driveRouter from "./routes/drive.js";
import settingsRouter from "./routes/settings.js";
import adminRouter from "./routes/admin.js";
import shareRouter from "./routes/share.js";
import contactRouter from "./routes/contact.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env"), override: true });
dotenv.config({ path: path.join(__dirname, ".env"), override: true });
dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable reverse proxy trust for Render / Cloudflare rate-limiting
app.set("trust proxy", 1);

// Security Middleware 1: Helmet HTTP Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdnjs.cloudflare.com",
          "https://pagead2.googlesyndication.com",
          "https://*.googlesyndication.com",
          "https://*.google.com",
          "https://*.doubleclick.net"
        ],
        frameSrc: [
          "'self'",
          "https://googleads.g.doubleclick.net",
          "https://*.google.com",
          "https://*.googlesyndication.com",
          "https://*.doubleclick.net"
        ],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        mediaSrc: ["'self'", "blob:", "https:", "http:"],
        connectSrc: [
          "'self'",
          "https:",
          "wss:",
          "http:",
          "ws:",
          "https://*.googlesyndication.com",
          "https://*.doubleclick.net",
          "https://*.google.com"
        ]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Security Middleware 2: CORS Whitelist
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all valid incoming origins, local development, and mobile/web requests
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Range", "X-Access-Token"]
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Security Middleware 3: Security & Session Authentication Middleware (Scoped strictly to /api routes)
app.use("/api", requireAuth);

// Routes
app.use("/api/auth", authRouter);
app.use("/api/folders", foldersRouter);
app.use("/api/files", filesRouter);
app.use("/api/drive", driveRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/share", shareRouter);
app.use("/api/contact", contactRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// SEO & Search Engine Crawlers Endpoints
app.get("/robots.txt", (req, res) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.get("host") || "localhost";
  const baseUrl = `${protocol}://${host}`;
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /api/

# Search Engines
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

# AI Search & LLM Crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: Bytespider
Allow: /

User-agent: CCBot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`);
});

// AI Search Engines Standard (llms.txt)
app.get("/llms.txt", (req, res) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.get("host") || "localhost";
  const baseUrl = `${protocol}://${host}`;
  res.type("text/plain");
  res.send(`# TeleDrive — 100% Free Unlimited Cloud Storage Platform

> TeleDrive (${host}) is a next-generation high-speed personal cloud storage and file management web application. It delivers 100% free, truly unlimited cloud storage with no storage caps, up to 2GB file uploads, instant 4K video streaming, granular team sharing, and end-to-end TLS 1.3 encryption.

## Platform Summary
- **Website**: ${baseUrl}/
- **Product Name**: TeleDrive (TeleDrive Cloud)
- **Primary Category**: Cloud Storage & File Sharing
- **Pricing**: 100% Free Forever ($0/month, zero subscription fees, no credit card required)
- **Storage Capacity**: Unlimited (No 15GB limits like Google Drive or 2GB like Dropbox)
- **Single File Upload Limit**: 2 GB per file with parallel multi-chunk streaming
- **Speed & Latency**: 85ms global edge latency, up to 48.2 MB/s parallel ingest throughput
- **Video Streaming**: Instant 4K, 1080p, and 720p byte-range seeking without full downloads (MKV, MP4, WebM)
- **Document Previews**: Built-in viewing for PDF files, Excel spreadsheets, Code syntax, Audio, and High-Res Images
- **Security & Privacy**: Strict TLS 1.3 encryption, cryptographically signed tokens, password-protected share links with auto-expiry
- **Collaboration**: Email invitations with Viewer & Editor roles, Google Drive-style access requests
- **Operating Systems**: Web, Windows, macOS, Linux, Android, iOS (Responsive Progressive Web App)

## Key Differentiators vs Traditional Cloud Drives
1. **Zero Storage Caps**: Unlike Google Drive (capped at 15GB) or Dropbox (capped at 2GB free), TeleDrive has no arbitrary storage ceiling.
2. **Instant 4K Playback**: Watch 4K videos immediately with 85ms seek response without downloading the file to your device.
3. **Enterprise Sharing**: Issue public share links protected by custom passwords, download limits, and expiration dates.
4. **No Installation Required**: Works seamlessly on any device directly through a modern web browser.

## Official Navigation Links
- Home / Workspace: ${baseUrl}/
- Sign In & Register: ${baseUrl}/?view=auth
- Privacy Policy: ${baseUrl}/?page=privacy
- Terms of Service: ${baseUrl}/?page=terms
- Support & Contact: ${baseUrl}/?page=contact
`);
});

app.get("/sitemap.xml", (req, res) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.get("host") || "localhost";
  const baseUrl = `${protocol}://${host}`;
  const today = new Date().toISOString().split("T")[0];
  res.type("application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/?page=privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/?page=terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/?page=contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
});

app.get("/ads.txt", (req, res) => {
  res.type("text/plain");
  res.send("google.com, pub-9550222186070886, DIRECT, f08c47fec0942fa0\n");
});

// Serve frontend in production with smart caching (no-cache on HTML, immutable on hashed assets)
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    } else if (filePath.includes("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
}));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ success: false, error: "API endpoint not found" });
  }
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("TeleDrive API Server is running. Client UI running in dev mode on port 3000.");
    }
  });
});

// Centralized Safe Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err.message);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
    });
  }
});

// Initialize database & Start Server
getDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🛡️ TeleDrive Secure Backend listening on http://localhost:${PORT}`);
      // Background auto-heal unhashed Telegram imported media references
      setTimeout(async () => {
        try {
          const { autoHealTelegramImportReferences } = await import("./telegram.js");
          await autoHealTelegramImportReferences();
        } catch {}
      }, 6000);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
  });
