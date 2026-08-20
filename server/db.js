import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

let sqliteDbInstance = null;

// Initialize & open local SQLite database with WAL mode for high concurrency
export async function getSqliteDb() {
  if (sqliteDbInstance) return sqliteDbInstance;

  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "teledrive.db");
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable WAL mode & foreign keys for ultra-fast performance
  await db.exec("PRAGMA journal_mode = WAL;");
  await db.exec("PRAGMA foreign_keys = ON;");

  // Create SQLite Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS telegram_sessions (
      id TEXT PRIMARY KEY,
      phone_number TEXT,
      session_string TEXT,
      user_info TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#4285f4',
      parent_id TEXT,
      is_starred INTEGER DEFAULT 0,
      is_trash INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folder_id TEXT,
      size INTEGER DEFAULT 0,
      mime_type TEXT,
      type TEXT,
      source_type TEXT DEFAULT 'upload',
      telegram_file_id TEXT,
      telegram_message_id TEXT,
      telegram_channel_id TEXT,
      telegram_post_url TEXT,
      telegram_channel_title TEXT,
      telegram_access_hash TEXT,
      telegram_file_reference TEXT,
      thumbnail_url TEXT,
      is_starred INTEGER DEFAULT 0,
      is_trash INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  sqliteDbInstance = db;
  return sqliteDbInstance;
}

// Global Supabase Client
let supabaseInstance = null;
let cachedSupabaseConfig = null;

export async function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY;

  if (!url || !key) {
    return null;
  }

  if (supabaseInstance && cachedSupabaseConfig === `${url}:${key}`) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url.trim(), key.trim(), {
      auth: { persistSession: false }
    });
    cachedSupabaseConfig = `${url}:${key}`;
    return supabaseInstance;
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err.message);
    return null;
  }
}

// Initial Database Boot
export async function getDb() {
  const sqlite = await getSqliteDb();
  // Async bootstrap Supabase client
  getSupabaseClient().catch(() => {});
  return sqlite;
}

// ==========================================
// ULTRA-FAST UNIFIED DATABASE CRUD
// (Instant Local Performance + Async Cloud Sync)
// ==========================================

// FILES OPERATIONS
export async function dbGetFileById(id) {
  const sqlite = await getSqliteDb();
  const file = await sqlite.get("SELECT * FROM files WHERE id = ?", [id]);
  if (file) return file;

  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("files").select("*").eq("id", id).maybeSingle();
    if (!error && data) return data;
  }
  return null;
}

export async function dbInsertFile(fileRecord) {
  const sqlite = await getSqliteDb();
  await sqlite.run(
    `INSERT INTO files (
      id, name, folder_id, size, mime_type, type, source_type,
      telegram_file_id, telegram_message_id, telegram_channel_id,
      telegram_post_url, telegram_channel_title, telegram_access_hash,
      telegram_file_reference, thumbnail_url, is_starred, is_trash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      folder_id = excluded.folder_id,
      size = excluded.size,
      mime_type = excluded.mime_type,
      type = excluded.type,
      source_type = excluded.source_type,
      telegram_file_id = excluded.telegram_file_id,
      telegram_message_id = excluded.telegram_message_id,
      telegram_channel_id = excluded.telegram_channel_id,
      telegram_post_url = excluded.telegram_post_url,
      telegram_channel_title = excluded.telegram_channel_title,
      is_starred = excluded.is_starred,
      is_trash = excluded.is_trash,
      updated_at = CURRENT_TIMESTAMP`,
    [
      fileRecord.id,
      fileRecord.name,
      fileRecord.folder_id,
      fileRecord.size || 0,
      fileRecord.mime_type,
      fileRecord.type,
      fileRecord.source_type || "upload",
      fileRecord.telegram_file_id || null,
      fileRecord.telegram_message_id || null,
      fileRecord.telegram_channel_id || null,
      fileRecord.telegram_post_url || null,
      fileRecord.telegram_channel_title || null,
      fileRecord.telegram_access_hash || null,
      fileRecord.telegram_file_reference || null,
      fileRecord.thumbnail_url || null,
      fileRecord.is_starred || 0,
      fileRecord.is_trash || 0
    ]
  );

  // Background Cloud Sync to Supabase
  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("files").upsert(fileRecord);
      }
    } catch (err) {
      console.warn("Supabase background file sync:", err.message);
    }
  })();

  return dbGetFileById(fileRecord.id);
}

export async function dbUpdateFile(id, updateFields) {
  const sqlite = await getSqliteDb();
  const keys = Object.keys(updateFields);
  if (keys.length > 0) {
    const setClauses = keys.map((k) => `${k} = ?`).join(", ");
    const values = Object.values(updateFields);
    await sqlite.run(`UPDATE files SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  }

  // Background Cloud Sync to Supabase
  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("files").update(updateFields).eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase background update file:", err.message);
    }
  })();

  return dbGetFileById(id);
}

export async function dbDeleteFile(id) {
  const sqlite = await getSqliteDb();
  await sqlite.run("DELETE FROM files WHERE id = ?", [id]);

  // Background Cloud Sync to Supabase
  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("files").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase background delete file:", err.message);
    }
  })();
}

// FOLDERS OPERATIONS
export async function dbGetFolderById(id) {
  const sqlite = await getSqliteDb();
  const folder = await sqlite.get("SELECT * FROM folders WHERE id = ?", [id]);
  if (folder) return folder;

  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("folders").select("*").eq("id", id).maybeSingle();
    if (!error && data) return data;
  }
  return null;
}

export async function dbInsertFolder(folderRecord) {
  let parent = folderRecord.parent_id === "root" || !folderRecord.parent_id ? null : folderRecord.parent_id;

  const record = {
    id: folderRecord.id,
    name: folderRecord.name,
    parent_id: parent,
    color: folderRecord.color || "#4285f4",
    is_starred: folderRecord.is_starred || 0,
    is_trash: folderRecord.is_trash || 0
  };

  const sqlite = await getSqliteDb();
  await sqlite.run(
    "INSERT INTO folders (id, name, color, parent_id, is_starred, is_trash) VALUES (?, ?, ?, ?, ?, ?)",
    [record.id, record.name, record.color, record.parent_id, record.is_starred, record.is_trash]
  );

  // Background Cloud Sync to Supabase
  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("folders").upsert(record);
      }
    } catch (err) {
      console.warn("Supabase background folder sync:", err.message);
    }
  })();

  return dbGetFolderById(record.id);
}

export async function dbUpdateFolder(id, updateFields) {
  const sqlite = await getSqliteDb();
  const keys = Object.keys(updateFields);
  if (keys.length > 0) {
    const setClauses = keys.map((k) => `${k} = ?`).join(", ");
    const values = Object.values(updateFields);
    await sqlite.run(`UPDATE folders SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  }

  // Background Cloud Sync to Supabase
  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("folders").update(updateFields).eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase background update folder:", err.message);
    }
  })();

  return dbGetFolderById(id);
}

export async function dbDeleteFolder(id) {
  const sqlite = await getSqliteDb();
  await sqlite.run("DELETE FROM folders WHERE id = ?", [id]);

  // Background Cloud Sync to Supabase
  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("folders").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase background delete folder:", err.message);
    }
  })();
}

// TELEGRAM SESSIONS
export async function dbGetActiveTelegramSession() {
  const sqlite = await getSqliteDb();
  const session = await sqlite.get("SELECT * FROM telegram_sessions WHERE is_active = 1 LIMIT 1");
  if (session) return session;

  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("telegram_sessions")
      .select("*")
      .eq("is_active", 1)
      .maybeSingle();
    if (!error && data) return data;
  }
  return null;
}

export async function dbSaveTelegramSession(sessionRecord) {
  const sqlite = await getSqliteDb();
  await sqlite.run("UPDATE telegram_sessions SET is_active = 0");
  await sqlite.run(
    `INSERT INTO telegram_sessions (id, phone_number, session_string, user_info, is_active)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET session_string = excluded.session_string, user_info = excluded.user_info, is_active = 1`,
    [sessionRecord.id, sessionRecord.phone_number, sessionRecord.session_string, sessionRecord.user_info]
  );

  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("telegram_sessions").update({ is_active: 0 }).neq("id", sessionRecord.id);
        await supabase.from("telegram_sessions").upsert({
          id: sessionRecord.id,
          phone_number: sessionRecord.phone_number,
          session_string: sessionRecord.session_string,
          user_info: sessionRecord.user_info,
          is_active: 1
        });
      }
    } catch (err) {
      console.warn("Supabase session upsert warning:", err.message);
    }
  })();
}

export async function dbDeactivateTelegramSessions() {
  const sqlite = await getSqliteDb();
  await sqlite.run("UPDATE telegram_sessions SET is_active = 0");

  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("telegram_sessions").update({ is_active: 0 });
      }
    } catch (err) {
      console.warn("Supabase session deactivate warning:", err.message);
    }
  })();
}

// SETTINGS OPERATIONS
export async function dbGetSettings() {
  const config = {};
  const sqlite = await getSqliteDb();
  const rows = await sqlite.all("SELECT key, value FROM settings");
  for (const r of rows) {
    config[r.key] = r.value;
  }
  return config;
}

export async function dbGetSetting(key) {
  const sqlite = await getSqliteDb();
  const row = await sqlite.get("SELECT value FROM settings WHERE key = ?", [key]);
  if (row?.value !== undefined && row.value !== null) return row.value;

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
      if (data && data.value !== undefined) {
        // Cache to local sqlite
        await sqlite.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING", [key, data.value]);
        return data.value;
      }
    } catch {}
  }
  return null;
}

export async function dbSetSetting(key, value) {
  const sqlite = await getSqliteDb();
  await sqlite.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    [key, value]
  );

  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("settings").upsert({ key, value });
      }
    } catch (err) {
      console.warn("Supabase set setting warning:", err.message);
    }
  })();
}

export function generateId(prefix = "") {
  return prefix + crypto.randomBytes(8).toString("hex");
}

export function detectFileType(mimeType, fileName = "") {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return "image";
  }
  if (mimeType?.startsWith("video/") || ["mp4", "mkv", "avi", "mov", "webm", "m4v", "flv", "wmv"].includes(ext)) {
    return "video";
  }
  if (mimeType?.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac", "aac", "opus"].includes(ext)) {
    return "audio";
  }
  if (mimeType === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (
    mimeType?.includes("word") ||
    mimeType?.includes("excel") ||
    mimeType?.includes("powerpoint") ||
    mimeType?.includes("text") ||
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "json", "rtf"].includes(ext)
  ) {
    return "document";
  }
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) {
    return "archive";
  }
  return "other";
}
