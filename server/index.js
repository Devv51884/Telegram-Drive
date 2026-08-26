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

import authRouter from "./routes/auth.js";
import foldersRouter from "./routes/folders.js";
import filesRouter from "./routes/files.js";
import driveRouter from "./routes/drive.js";
import settingsRouter from "./routes/settings.js";
import adminRouter from "./routes/admin.js";
import shareRouter from "./routes/share.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

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
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        mediaSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "data:", "blob:", "https:", "http:", "ws:", "wss:"],
        frameSrc: ["'self'", "blob:", "https:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Security Middleware 2: CORS Configuration
app.use(cors());

// Body Parser with payload limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Security Middleware 3: Global Rate Limiting
app.use("/api", apiLimiter);

// Security Middleware 4: Master & User Authentication Protection
app.use("/api", requireAuth);

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/folders", foldersRouter);
app.use("/api/files", filesRouter);
app.use("/api/drive", driveRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/share", shareRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve frontend in production with caching
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath, { maxAge: "7d", immutable: true }));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ success: false, error: "API endpoint not found" });
  }
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
