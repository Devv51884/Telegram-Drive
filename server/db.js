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
const dbPath = path.join(__dirname, "drive.db");

let sqliteInstance = null;
let supabaseInstance = null;
let cachedSupabaseConfig = null;

// Reload environment variables helper
export function reloadEnv() {
  const envPathRoot = path.join(__dirname, "../.env");
  const envPathServer = path.join(__dirname, ".env");
  if (fs.existsSync(envPathRoot)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPathRoot, "utf8"));
    for (const k in envConfig) {
      if (envConfig[k]) process.env[k] = envConfig[k];
    }
  }
  if (fs.existsSync(envPathServer)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPathServer, "utf8"));
    for (const k in envConfig) {
      if (envConfig[k]) process.env[k] = envConfig[k];
    }
  }
}

// Initialize SQLite database instance
export async function getSqliteDb() {
  if (sqliteInstance) return sqliteInstance;

  sqliteInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await sqliteInstance.exec(`
    PRAGMA foreign_keys = ON;

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      color TEXT DEFAULT '#4285f4',
      is_starred INTEGER DEFAULT 0,
      is_trash INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );
  `);

  // Seed default folders if empty
  const folderCount = await sqliteInstance.get("SELECT COUNT(*) as count FROM folders");
  if (folderCount.count === 0) {
    const defaultFolders = [
      { id: "f-docs", name: "Documents", color: "#4285f4" },
      { id: "f-media", name: "Media & Photos", color: "#34a853" },
      { id: "f-tg-imports", name: "Telegram Channel Imports", color: "#0088cc" }
    ];

    for (const f of defaultFolders) {
      await sqliteInstance.run(
        "INSERT INTO folders (id, name, color, parent_id) VALUES (?, ?, ?, NULL)",
        [f.id, f.name, f.color]
      );
    }
  }

  return sqliteInstance;
}

export async function getDb() {
  return getSqliteDb();
}

// Get Supabase Client if configured
export async function getSupabaseClient() {
  reloadEnv();
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

// Check if Supabase is active and working
export async function testSupabaseConnection() {
  try {
    const client = await getSupabaseClient();
    if (!client) {
      return { success: false, error: "Supabase URL and Key are not configured in .env" };
    }

    const { error } = await client.from("folders").select("id").limit(1);
    if (error) {
      return {
        success: false,
        error: error.message,
        hint: "Make sure you executed the SQL in 'supabase_schema.sql' in your Supabase SQL Editor."
      };
    }

    return { success: true, message: "Successfully connected to Supabase PostgreSQL database!" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Sync all data from local SQLite into Supabase
export async function syncSqliteToSupabase() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured in .env");
  }

  const sqlite = await getSqliteDb();

  // 1. Sync Settings
  const settingsRows = await sqlite.all("SELECT * FROM settings");
  if (settingsRows.length > 0) {
    for (const row of settingsRows) {
      await supabase.from("settings").upsert({ key: row.key, value: row.value });
    }
  }

  // 2. Sync Telegram Sessions
  const sessionRows = await sqlite.all("SELECT * FROM telegram_sessions");
  if (sessionRows.length > 0) {
    for (const row of sessionRows) {
      await supabase.from("telegram_sessions").upsert({
        id: row.id,
        phone_number: row.phone_number,
        session_string: row.session_string,
        user_info: row.user_info,
        is_active: row.is_active
      });
    }
  }

  // 3. Sync Folders
  const folderRows = await sqlite.all("SELECT * FROM folders");
  if (folderRows.length > 0) {
    for (const row of folderRows) {
      await supabase.from("folders").upsert({
        id: row.id,
        name: row.name,
        parent_id: row.parent_id,
        color: row.color,
        is_starred: row.is_starred,
        is_trash: row.is_trash
      });
    }
  }

  // 4. Sync Files
  const fileRows = await sqlite.all("SELECT * FROM files");
  if (fileRows.length > 0) {
    for (const row of fileRows) {
      await supabase.from("files").upsert({
        id: row.id,
        name: row.name,
        folder_id: row.folder_id,
        size: row.size,
        mime_type: row.mime_type,
        type: row.type,
        source_type: row.source_type,
        telegram_file_id: row.telegram_file_id,
        telegram_message_id: row.telegram_message_id,
        telegram_channel_id: row.telegram_channel_id,
        telegram_post_url: row.telegram_post_url,
        telegram_channel_title: row.telegram_channel_title,
        telegram_access_hash: row.telegram_access_hash,
        telegram_file_reference: row.telegram_file_reference,
        thumbnail_url: row.thumbnail_url,
        is_starred: row.is_starred,
        is_trash: row.is_trash
      });
    }
  }

  return {
    success: true,
    synced: {
      settings: settingsRows.length,
      sessions: sessionRows.length,
      folders: folderRows.length,
      files: fileRows.length
    }
  };
}

// ==========================================
// UNIFIED DATABASE OPERATIONS
// ==========================================

// FILES OPERATIONS
export async function dbGetFileById(id) {
  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("files").select("*").eq("id", id).maybeSingle();
    if (!error && data) return data;
  }
  const sqlite = await getSqliteDb();
  return sqlite.get("SELECT * FROM files WHERE id = ?", [id]);
}

export async function dbInsertFile(fileRecord) {
  const sqlite = await getSqliteDb();
  await sqlite.run(
    `INSERT INTO files (
      id, name, folder_id, size, mime_type, type, source_type,
      telegram_file_id, telegram_message_id, telegram_channel_id,
      telegram_post_url, telegram_channel_title, telegram_access_hash,
      telegram_file_reference, thumbnail_url, is_starred, is_trash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("files").upsert(fileRecord);
    } catch (err) {
      console.warn("Supabase insert file warning:", err.message);
    }
  }

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

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("files").update(updateFields).eq("id", id);
    } catch (err) {
      console.warn("Supabase update file warning:", err.message);
    }
  }

  return dbGetFileById(id);
}

export async function dbDeleteFile(id) {
  const sqlite = await getSqliteDb();
  await sqlite.run("DELETE FROM files WHERE id = ?", [id]);

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("files").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete file warning:", err.message);
    }
  }
}

// FOLDERS OPERATIONS
export async function dbGetFolderById(id) {
  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from("folders").select("*").eq("id", id).maybeSingle();
    if (!error && data) return data;
  }
  const sqlite = await getSqliteDb();
  return sqlite.get("SELECT * FROM folders WHERE id = ?", [id]);
}

export async function dbInsertFolder(folderRecord) {
  // Normalize parent_id
  let parent = folderRecord.parent_id === "root" || !folderRecord.parent_id ? null : folderRecord.parent_id;

  // Validate parent exists if provided
  if (parent) {
    const parentFolder = await dbGetFolderById(parent);
    if (!parentFolder) parent = null;
  }

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

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("folders").upsert(record);
    } catch (err) {
      console.warn("Supabase insert folder warning:", err.message);
    }
  }

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

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("folders").update(updateFields).eq("id", id);
    } catch (err) {
      console.warn("Supabase update folder warning:", err.message);
    }
  }

  return dbGetFolderById(id);
}

export async function dbDeleteFolder(id) {
  const sqlite = await getSqliteDb();
  await sqlite.run("DELETE FROM folders WHERE id = ?", [id]);

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("folders").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase delete folder warning:", err.message);
    }
  }
}

// TELEGRAM SESSIONS OPERATIONS
export async function dbGetActiveTelegramSession() {
  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("telegram_sessions")
      .select("*")
      .eq("is_active", 1)
      .limit(1)
      .maybeSingle();
    if (!error && data) return data;
  }
  const sqlite = await getSqliteDb();
  return sqlite.get("SELECT * FROM telegram_sessions WHERE is_active = 1 LIMIT 1");
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

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("telegram_sessions").update({ is_active: 0 }).neq("id", sessionRecord.id);
      await supabase.from("telegram_sessions").upsert({
        id: sessionRecord.id,
        phone_number: sessionRecord.phone_number,
        session_string: sessionRecord.session_string,
        user_info: sessionRecord.user_info,
        is_active: 1
      });
    } catch (err) {
      console.warn("Supabase session upsert warning:", err.message);
    }
  }
}

export async function dbDeactivateTelegramSessions() {
  const sqlite = await getSqliteDb();
  await sqlite.run("UPDATE telegram_sessions SET is_active = 0");

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("telegram_sessions").update({ is_active: 0 });
    } catch (err) {
      console.warn("Supabase session deactivate warning:", err.message);
    }
  }
}

// SETTINGS OPERATIONS
export async function dbGetSettings() {
  const config = {};
  const sqlite = await getSqliteDb();
  const rows = await sqlite.all("SELECT key, value FROM settings");
  for (const r of rows) {
    config[r.key] = r.value;
  }

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        for (const r of data) {
          config[r.key] = r.value;
        }
      }
    } catch {}
  }

  return config;
}

export async function dbGetSetting(key) {
  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
      if (data && data.value !== undefined) return data.value;
    } catch {}
  }
  const sqlite = await getSqliteDb();
  const row = await sqlite.get("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value || null;
}

export async function dbSetSetting(key, value) {
  const sqlite = await getSqliteDb();
  await sqlite.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    [key, value]
  );

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("settings").upsert({ key, value });
    } catch (err) {
      console.warn("Supabase set setting warning:", err.message);
    }
  }
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
