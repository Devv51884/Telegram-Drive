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

  // Create SQLite Tables with Users and User ID associations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      pin_hash TEXT,
      is_2fa_enabled INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
      first_name TEXT,
      last_name TEXT,
      username TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
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
      user_id TEXT,
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

    CREATE TABLE IF NOT EXISTS email_otps (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      type TEXT NOT NULL,
      metadata TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS item_permissions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      owner_id TEXT,
      shared_with_email TEXT NOT NULL,
      permission TEXT DEFAULT 'viewer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, item_type, shared_with_email)
    );

    CREATE TABLE IF NOT EXISTS share_requests (
      id TEXT PRIMARY KEY,
      share_token TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      owner_id TEXT,
      requester_email TEXT NOT NULL,
      requester_name TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Run lightweight migrations
  try {
    await db.exec("ALTER TABLE users ADD COLUMN pin_hash TEXT;");
  } catch {}
  try {
    await db.exec("ALTER TABLE users ADD COLUMN is_2fa_enabled INTEGER DEFAULT 0;");
  } catch {}
  try {
    await db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';");
  } catch {}
  try {
    await db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';");
  } catch {}
  try {
    await db.exec("UPDATE users SET role = 'admin' WHERE email = 'devv5412@gmail.com' OR id IN (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);");
  } catch {}
  try {
    await db.exec("ALTER TABLE folders ADD COLUMN user_id TEXT;");
  } catch {}
  try {
    await db.exec("ALTER TABLE files ADD COLUMN user_id TEXT;");
  } catch {}
  try {
    await db.exec("ALTER TABLE telegram_sessions ADD COLUMN user_id TEXT;");
  } catch {}
  try {
    await db.exec("ALTER TABLE telegram_sessions ADD COLUMN first_name TEXT;");
  } catch {}
  try {
    await db.exec("ALTER TABLE telegram_sessions ADD COLUMN last_name TEXT;");
  } catch {}
  try {
    await db.exec("ALTER TABLE telegram_sessions ADD COLUMN username TEXT;");
  } catch {}
  try {
    await db.exec("UPDATE files SET mime_type = 'video/mp4' WHERE mime_type = 'video/mp2t' OR name LIKE '%.mp4';");
  } catch {}
  try {
    await db.exec("ALTER TABLE files ADD COLUMN share_access TEXT DEFAULT 'private';");
  } catch {}
  try {
    await db.exec("ALTER TABLE files ADD COLUMN share_token TEXT;");
  } catch {}
  try {
    await db.exec("ALTER TABLE folders ADD COLUMN share_access TEXT DEFAULT 'private';");
  } catch {}
  try {
    await db.exec("ALTER TABLE folders ADD COLUMN share_token TEXT;");
  } catch {}
  try {
    // Assign legacy unassigned files & folders to the main account
    await db.exec("UPDATE files SET user_id = 'u_ed2e45a80d67df50' WHERE user_id IS NULL;");
    await db.exec("UPDATE folders SET user_id = 'u_ed2e45a80d67df50' WHERE user_id IS NULL;");
  } catch {}

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

// Full bidirectional cloud sync from Supabase on server boot
export async function syncFromSupabase() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    console.log("ℹ️ Running in standalone SQLite mode (no Supabase configured).");
    return;
  }

  const sqlite = await getSqliteDb();

  try {
    // 1. Sync Settings
    const { data: settings } = await supabase.from("settings").select("*");
    if (settings && settings.length > 0) {
      for (const s of settings) {
        await sqlite.run(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
          [s.key, s.value]
        );
      }
    }

    // 2. Sync Users
    const { data: users, error: userErr } = await supabase.from("users").select("*");
    if (userErr) {
      console.warn("⚠️ Supabase sync users warning:", userErr.message);
    } else if (users && users.length > 0) {
      for (const u of users) {
        await sqlite.run("DELETE FROM users WHERE email = ? AND id != ?", [u.email.toLowerCase(), u.id]);
        await sqlite.run(
          `INSERT INTO users (id, name, email, password_hash, pin_hash, is_2fa_enabled, role, status, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            password_hash = excluded.password_hash,
            pin_hash = excluded.pin_hash,
            is_2fa_enabled = excluded.is_2fa_enabled,
            role = excluded.role,
            status = excluded.status,
            avatar_url = excluded.avatar_url`,
          [
            u.id,
            u.name,
            u.email.toLowerCase(),
            u.password_hash,
            u.pin_hash || null,
            u.is_2fa_enabled || 0,
            u.role || (u.email.toLowerCase() === "devv5412@gmail.com" ? "admin" : "user"),
            u.status || "active",
            u.avatar_url || null,
            u.created_at || new Date().toISOString(),
            u.updated_at || new Date().toISOString()
          ]
        );
      }
      console.log(`✅ Synced ${users.length} user(s) from Supabase.`);
    }

    // 3. Sync Folders
    const { data: folders, error: folderErr } = await supabase.from("folders").select("*");
    if (!folderErr && folders && folders.length > 0) {
      for (const f of folders) {
        await sqlite.run(
          `INSERT INTO folders (id, user_id, name, color, parent_id, is_starred, is_trash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            color = excluded.color,
            parent_id = excluded.parent_id,
            is_starred = excluded.is_starred,
            is_trash = excluded.is_trash`,
          [
            f.id,
            f.user_id || null,
            f.name,
            f.color || "#4285f4",
            f.parent_id,
            f.is_starred || 0,
            f.is_trash || 0,
            f.created_at || new Date().toISOString(),
            f.updated_at || new Date().toISOString()
          ]
        );
      }
    }

    // 4. Sync Files
    const { data: files, error: fileErr } = await supabase.from("files").select("*");
    if (!fileErr && files && files.length > 0) {
      for (const file of files) {
        await sqlite.run(
          `INSERT INTO files (
            id, user_id, name, folder_id, size, mime_type, type, source_type,
            telegram_file_id, telegram_message_id, telegram_channel_id,
            telegram_post_url, telegram_channel_title, telegram_access_hash,
            telegram_file_reference, thumbnail_url, is_starred, is_trash, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            is_trash = excluded.is_trash`,
          [
            file.id,
            file.user_id || null,
            file.name,
            file.folder_id || null,
            file.size || 0,
            file.mime_type,
            file.type,
            file.source_type || "upload",
            file.telegram_file_id || null,
            file.telegram_message_id || null,
            file.telegram_channel_id || null,
            file.telegram_post_url || null,
            file.telegram_channel_title || null,
            file.telegram_access_hash || null,
            file.telegram_file_reference || null,
            file.thumbnail_url || null,
            file.is_starred || 0,
            file.is_trash || 0,
            file.created_at || new Date().toISOString(),
            file.updated_at || new Date().toISOString()
          ]
        );
      }
    }

    // 5. Sync Telegram Active Session
    const { data: sessionData, error: sessErr } = await supabase
      .from("telegram_sessions")
      .select("*")
      .eq("is_active", 1)
      .maybeSingle();

    if (!sessErr && sessionData) {
      const infoStr = typeof sessionData.user_info === "object" ? JSON.stringify(sessionData.user_info) : sessionData.user_info;
      let parsedInfo = {};
      try {
        parsedInfo = JSON.parse(infoStr);
      } catch {}

      await sqlite.run(
        `INSERT INTO telegram_sessions (id, phone_number, session_string, user_info, first_name, last_name, username, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
          session_string = excluded.session_string,
          user_info = excluded.user_info,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          username = excluded.username,
          is_active = excluded.is_active`,
        [
          sessionData.id,
          sessionData.phone_number,
          sessionData.session_string,
          infoStr,
          sessionData.first_name || parsedInfo.firstName || null,
          sessionData.last_name || parsedInfo.lastName || null,
          sessionData.username || parsedInfo.username || null,
          sessionData.is_active
        ]
      );
    }
  } catch (err) {
    console.error("❌ Supabase bootstrap sync error:", err.message);
  }
}

// Initial Database Boot & Background Session Cache
export async function getDb() {
  const sqlite = await getSqliteDb();
  // Auto-sync full cloud data from Supabase on boot asynchronously
  syncFromSupabase().catch((e) => {
    console.warn("Bootstrap cloud sync warning:", e.message);
  });
  return sqlite;
}

// ==========================================
// USER AUTHENTICATION & PROFILE CRUD
// ==========================================

export async function dbFindUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const sqlite = await getSqliteDb();
  const user = await sqlite.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [cleanEmail]);
  if (user) return user;

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").ilike("email", cleanEmail).maybeSingle();
      if (error) {
        console.warn("Supabase find user by email warning:", error.message);
      }
      if (data) {
        // Cache user into SQLite for instant fast query resolution
        await sqlite.run(
          `INSERT INTO users (id, name, email, password_hash, pin_hash, is_2fa_enabled, role, status, avatar_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            password_hash = excluded.password_hash,
            pin_hash = excluded.pin_hash,
            is_2fa_enabled = excluded.is_2fa_enabled,
            role = excluded.role,
            status = excluded.status,
            avatar_url = excluded.avatar_url`,
          [
            data.id,
            data.name,
            data.email.toLowerCase(),
            data.password_hash,
            data.pin_hash || null,
            data.is_2fa_enabled || 0,
            data.role || (data.email.toLowerCase() === "devv5412@gmail.com" ? "admin" : "user"),
            data.status || "active",
            data.avatar_url || null
          ]
        );
        return data;
      }
    } catch (err) {
      console.warn("Supabase dbFindUserByEmail catch:", err.message);
    }
  }
  return null;
}

export async function dbFindUserById(id) {
  if (!id) return null;
  const sqlite = await getSqliteDb();
  const user = await sqlite.get("SELECT * FROM users WHERE id = ?", [id]);
  if (user) return user;

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.warn("Supabase find user by id warning:", error.message);
      }
      if (data) {
        await sqlite.run(
          `INSERT INTO users (id, name, email, password_hash, pin_hash, is_2fa_enabled, role, status, avatar_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            password_hash = excluded.password_hash,
            pin_hash = excluded.pin_hash,
            is_2fa_enabled = excluded.is_2fa_enabled,
            role = excluded.role,
            status = excluded.status,
            avatar_url = excluded.avatar_url`,
          [
            data.id,
            data.name,
            data.email.toLowerCase(),
            data.password_hash,
            data.pin_hash || null,
            data.is_2fa_enabled || 0,
            data.role || (data.email.toLowerCase() === "devv5412@gmail.com" ? "admin" : "user"),
            data.status || "active",
            data.avatar_url || null
          ]
        );
        return data;
      }
    } catch (err) {
      console.warn("Supabase dbFindUserById catch:", err.message);
    }
  }
  return null;
}

export async function dbCreateUser(userRecord) {
  const role = userRecord.role || (userRecord.email.toLowerCase() === "devv5412@gmail.com" ? "admin" : "user");
  const status = userRecord.status || "active";
  const sqlite = await getSqliteDb();
  await sqlite.run(
    "INSERT INTO users (id, name, email, password_hash, pin_hash, is_2fa_enabled, role, status, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      userRecord.id,
      userRecord.name,
      userRecord.email.toLowerCase(),
      userRecord.password_hash,
      userRecord.pin_hash || null,
      userRecord.is_2fa_enabled || 0,
      role,
      status,
      userRecord.avatar_url || null
    ]
  );

  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("users").upsert({
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email.toLowerCase(),
          password_hash: userRecord.password_hash,
          pin_hash: userRecord.pin_hash || null,
          is_2fa_enabled: userRecord.is_2fa_enabled || 0,
          role,
          status,
          avatar_url: userRecord.avatar_url || null
        });
      }
    } catch (err) {
      console.warn("Supabase user insert:", err.message);
    }
  })();

  return dbFindUserById(userRecord.id);
}

export async function dbUpdateUser(id, updateFields) {
  const sqlite = await getSqliteDb();
  const keys = Object.keys(updateFields);
  if (keys.length > 0) {
    const setClauses = keys.map((k) => `${k} = ?`).join(", ");
    const values = Object.values(updateFields);
    await sqlite.run(`UPDATE users SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  }

  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("users").update(updateFields).eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase user update:", err.message);
    }
  })();

  return dbFindUserById(id);
}

export async function dbDeleteUser(id) {
  const sqlite = await getSqliteDb();
  await sqlite.run("DELETE FROM files WHERE user_id = ?", [id]);
  await sqlite.run("DELETE FROM folders WHERE user_id = ?", [id]);
  await sqlite.run("DELETE FROM users WHERE id = ?", [id]);

  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        await supabase.from("files").delete().eq("user_id", id);
        await supabase.from("folders").delete().eq("user_id", id);
        await supabase.from("users").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase user delete:", err.message);
    }
  })();
}

// ==========================================
// FILES CRUD
// ==========================================

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
      id, user_id, name, folder_id, size, mime_type, type, source_type,
      telegram_file_id, telegram_message_id, telegram_channel_id,
      telegram_post_url, telegram_channel_title, telegram_access_hash,
      telegram_file_reference, thumbnail_url, is_starred, is_trash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      fileRecord.user_id || null,
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

// ==========================================
// FOLDERS CRUD
// ==========================================

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
    user_id: folderRecord.user_id || null,
    name: folderRecord.name,
    parent_id: parent,
    color: folderRecord.color || "#4285f4",
    is_starred: folderRecord.is_starred || 0,
    is_trash: folderRecord.is_trash || 0
  };

  const sqlite = await getSqliteDb();
  await sqlite.run(
    "INSERT INTO folders (id, user_id, name, color, parent_id, is_starred, is_trash) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [record.id, record.user_id, record.name, record.color, record.parent_id, record.is_starred, record.is_trash]
  );

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
export async function dbGetActiveTelegramSession(userId = null) {
  const sqlite = await getSqliteDb();
  let session = null;

  // 1. If userId is provided, strictly lookup only this user's active session
  if (userId) {
    session = await sqlite.get(
      "SELECT * FROM telegram_sessions WHERE user_id = ? AND is_active = 1 ORDER BY updated_at DESC LIMIT 1",
      [userId]
    );

    if (session && session.session_string) return session;

    const supabase = await getSupabaseClient();
    if (supabase) {
      try {
        const { data: userSession } = await supabase
          .from("telegram_sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", 1)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (userSession && userSession.session_string) {
          const infoStr = typeof userSession.user_info === "object" ? JSON.stringify(userSession.user_info) : userSession.user_info;
          await sqlite.run(
            `INSERT INTO telegram_sessions (id, user_id, phone_number, session_string, user_info, first_name, last_name, username, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
             ON CONFLICT(id) DO UPDATE SET is_active=1, session_string=excluded.session_string, user_id=excluded.user_id`,
            [
              userSession.id,
              userId,
              userSession.phone_number,
              userSession.session_string,
              infoStr || null,
              userSession.first_name || null,
              userSession.last_name || null,
              userSession.username || null
            ]
          ).catch(() => {});
          return userSession;
        }
      } catch (err) {
        console.warn("Supabase user session fetch error:", err.message);
      }
    }
    // Strict isolation: Return null if this user has not connected Telegram yet
    return null;
  }

  // 2. Only if no userId was provided (system/guest level)
  session = await sqlite.get(
    "SELECT * FROM telegram_sessions WHERE (user_id IS NULL OR user_id = '') AND is_active = 1 ORDER BY updated_at DESC LIMIT 1"
  );
  if (session && session.session_string) return session;

  const supabase = await getSupabaseClient();
  if (supabase) {
    try {
      const { data: anySession } = await supabase
        .from("telegram_sessions")
        .select("*")
        .is("user_id", null)
        .eq("is_active", 1)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anySession && anySession.session_string) {
        return anySession;
      }
    } catch {}
  }

  return null;
}

export async function dbSaveTelegramSession(sessionRecord) {
  const sqlite = await getSqliteDb();
  const targetUserId = sessionRecord.user_id || null;
  if (targetUserId) {
    await sqlite.run("UPDATE telegram_sessions SET is_active = 0 WHERE user_id = ?", [targetUserId]);
  } else {
    await sqlite.run("UPDATE telegram_sessions SET is_active = 0");
  }

  await sqlite.run(
    `INSERT INTO telegram_sessions (id, user_id, phone_number, session_string, user_info, first_name, last_name, username, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      session_string = excluded.session_string,
      user_info = excluded.user_info,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      username = excluded.username,
      is_active = 1`,
    [
      sessionRecord.id,
      targetUserId,
      sessionRecord.phone_number,
      sessionRecord.session_string,
      sessionRecord.user_info,
      sessionRecord.first_name || null,
      sessionRecord.last_name || null,
      sessionRecord.username || null
    ]
  );

  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        if (targetUserId) {
          await supabase.from("telegram_sessions").update({ is_active: 0 }).eq("user_id", targetUserId);
        } else {
          await supabase.from("telegram_sessions").update({ is_active: 0 }).neq("id", sessionRecord.id);
        }
        await supabase.from("telegram_sessions").upsert({
          id: sessionRecord.id,
          user_id: targetUserId,
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

export async function dbDeactivateTelegramSessions(userId = null) {
  const sqlite = await getSqliteDb();
  if (userId) {
    await sqlite.run("UPDATE telegram_sessions SET is_active = 0 WHERE user_id = ?", [userId]);
  } else {
    await sqlite.run("UPDATE telegram_sessions SET is_active = 0");
  }

  (async () => {
    try {
      const supabase = await getSupabaseClient();
      if (supabase) {
        if (userId) {
          await supabase.from("telegram_sessions").update({ is_active: 0 }).eq("user_id", userId);
        } else {
          await supabase.from("telegram_sessions").update({ is_active: 0 });
        }
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

// ==========================================
// ADMIN DASHBOARD & MANAGEMENT QUERIES
// ==========================================

export async function dbGetAdminOverview() {
  const sqlite = await getSqliteDb();
  const totalUsers = (await sqlite.get("SELECT COUNT(*) as count FROM users"))?.count || 0;
  const totalFiles = (await sqlite.get("SELECT COUNT(*) as count FROM files WHERE is_trash = 0"))?.count || 0;
  const totalFolders = (await sqlite.get("SELECT COUNT(*) as count FROM folders WHERE is_trash = 0"))?.count || 0;
  const totalStorage = (await sqlite.get("SELECT SUM(size) as total FROM files WHERE is_trash = 0"))?.total || 0;
  const totalUploaded = (await sqlite.get("SELECT COUNT(*) as count FROM files WHERE source_type = 'upload' AND is_trash = 0"))?.count || 0;
  const totalImports = (await sqlite.get("SELECT COUNT(*) as count FROM files WHERE source_type = 'telegram_post' AND is_trash = 0"))?.count || 0;
  const todayUploads = (await sqlite.get("SELECT COUNT(*) as count FROM files WHERE created_at >= datetime('now', '-1 day')"))?.count || 0;
  const todayBandwidth = (await sqlite.get("SELECT SUM(size) as total FROM files WHERE created_at >= datetime('now', '-1 day')"))?.total || 0;

  const typeStats = await sqlite.all("SELECT type, COUNT(*) as count, SUM(size) as size FROM files WHERE is_trash = 0 GROUP BY type");
  const recentFiles = await sqlite.all(`
    SELECT f.id, f.name, f.size, f.type, f.mime_type, f.source_type, f.created_at, f.telegram_channel_id, f.telegram_message_id, u.name as user_name, u.email as user_email 
    FROM files f 
    LEFT JOIN users u ON f.user_id = u.id 
    ORDER BY f.created_at DESC 
    LIMIT 10
  `);

  return {
    totalUsers,
    totalFiles,
    totalFolders,
    totalStorage,
    totalUploaded,
    totalImports,
    todayUploads,
    todayBandwidth,
    typeStats,
    recentFiles
  };
}

export async function dbGetAllUsersWithStats() {
  const sqlite = await getSqliteDb();
  const users = await sqlite.all(`
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      COALESCE(u.role, 'user') as role, 
      COALESCE(u.status, 'active') as status, 
      u.is_2fa_enabled, 
      u.avatar_url, 
      u.created_at, 
      u.updated_at,
      COUNT(f.id) as file_count,
      COALESCE(SUM(f.size), 0) as storage_used
    FROM users u
    LEFT JOIN files f ON f.user_id = u.id AND f.is_trash = 0
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return users;
}

export async function dbGetAllFilesAdmin({ search, type, limit = 50, offset = 0 } = {}) {
  const sqlite = await getSqliteDb();
  let whereClauses = ["1=1"];
  let params = [];

  if (search) {
    whereClauses.push("(f.name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (type && type !== "all") {
    whereClauses.push("f.type = ?");
    params.push(type);
  }

  const whereStr = whereClauses.join(" AND ");
  const countRow = await sqlite.get(`SELECT COUNT(*) as total FROM files f LEFT JOIN users u ON f.user_id = u.id WHERE ${whereStr}`, params);
  const files = await sqlite.all(`
    SELECT 
      f.*,
      u.name as user_name,
      u.email as user_email
    FROM files f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE ${whereStr}
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  return {
    total: countRow?.total || 0,
    files
  };
}

export async function dbDeleteUserCascade(userId) {
  const sqlite = await getSqliteDb();
  await sqlite.run("DELETE FROM files WHERE user_id = ?", [userId]);
  await sqlite.run("DELETE FROM folders WHERE user_id = ?", [userId]);
  await sqlite.run("DELETE FROM users WHERE id = ?", [userId]);
  return { success: true };
}

// ==========================================
// PUBLIC LINK SHARING HELPERS
// ==========================================

export async function dbGetFileByShareToken(token) {
  if (!token) return null;
  const sqlite = await getSqliteDb();
  const file = await sqlite.get("SELECT * FROM files WHERE share_token = ?", [token]);
  if (file) return file;
  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from("files").select("*").eq("share_token", token).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function dbGetFolderByShareToken(token) {
  if (!token) return null;
  const sqlite = await getSqliteDb();
  const folder = await sqlite.get("SELECT * FROM folders WHERE share_token = ?", [token]);
  if (folder) return folder;
  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data } = await supabase.from("folders").select("*").eq("share_token", token).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function dbGetSharedFolderContents(folderId) {
  const sqlite = await getSqliteDb();
  const folders = await sqlite.all(
    `SELECT 
      f.id, f.name, f.color, f.parent_id, f.is_starred, f.share_access, f.share_token, f.created_at, f.updated_at,
      (SELECT COUNT(*) FROM files WHERE folder_id = f.id AND is_trash = 0) as file_count,
      (SELECT COUNT(*) FROM folders WHERE parent_id = f.id AND is_trash = 0) as folder_count
    FROM folders f 
    WHERE f.parent_id = ? AND f.is_trash = 0 
    ORDER BY f.name COLLATE NOCASE ASC`,
    [folderId]
  );
  const files = await sqlite.all(
    "SELECT id, name, size, mime_type, type, source_type, thumbnail_url, is_starred, share_access, share_token, created_at, updated_at FROM files WHERE folder_id = ? AND is_trash = 0 ORDER BY name COLLATE NOCASE ASC",
    [folderId]
  );
  return { folders, files };
}

// Checks whether targetFolderId is equal to rootFolderId or is a subfolder inside rootFolderId's hierarchy
export async function dbIsFolderDescendant(targetFolderId, rootFolderId) {
  if (!targetFolderId || !rootFolderId) return false;
  if (targetFolderId === rootFolderId) return true;

  let currentId = targetFolderId;
  let depth = 0;
  const maxDepth = 50;

  while (currentId && depth < maxDepth) {
    const folder = await dbGetFolderById(currentId);
    if (!folder || folder.is_trash) return false;
    if (folder.parent_id === rootFolderId || folder.id === rootFolderId) {
      return true;
    }
    if (!folder.parent_id || folder.parent_id === "root") {
      return false;
    }
    currentId = folder.parent_id;
    depth++;
  }

  return false;
}

// Computes the breadcrumb trail from rootFolderId down to targetFolderId
export async function dbGetFolderBreadcrumbTrail(targetFolderId, rootFolderId) {
  if (!targetFolderId || !rootFolderId) return [];
  const root = await dbGetFolderById(rootFolderId);
  if (!root) return [];

  if (targetFolderId === rootFolderId) {
    return [{ id: root.id, name: root.name, color: root.color }];
  }

  const trail = [];
  let currentId = targetFolderId;
  let depth = 0;
  const maxDepth = 50;

  while (currentId && depth < maxDepth) {
    const folder = await dbGetFolderById(currentId);
    if (!folder) break;
    trail.unshift({ id: folder.id, name: folder.name, color: folder.color });
    if (folder.id === rootFolderId) {
      return trail;
    }
    if (!folder.parent_id || folder.parent_id === "root") {
      break;
    }
    currentId = folder.parent_id;
    depth++;
  }

  // If rootFolderId was not found in the upward ancestor chain, prepend root
  if (trail.length === 0 || trail[0].id !== rootFolderId) {
    return [{ id: root.id, name: root.name, color: root.color }];
  }

  return trail;
}

// Validates whether a file is located in the shared folder or any of its subfolders
export async function dbIsFileInSharedFolderTree(fileId, rootFolderId) {
  if (!fileId || !rootFolderId) return false;
  const file = await dbGetFileById(fileId);
  if (!file || file.is_trash) return false;
  if (!file.folder_id) return false;
  if (file.folder_id === rootFolderId) return true;
  return dbIsFolderDescendant(file.folder_id, rootFolderId);
}

// ==========================================
// EMAIL OTP MANAGEMENT (SIGNUP & PASSWORD RESET)
// ==========================================

export async function dbSaveOtp(email, otp, type = "signup", metadata = null, expiresInMinutes = 10) {
  const sqlite = await getSqliteDb();
  const cleanEmail = email.trim().toLowerCase();
  const id = generateId("otp_");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  const metaStr = metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null;

  // Clear previous OTPs for this email and type
  await sqlite.run("DELETE FROM email_otps WHERE email = ? AND type = ?", [cleanEmail, type]);

  await sqlite.run(
    "INSERT INTO email_otps (id, email, otp, type, metadata, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, cleanEmail, otp.trim(), type, metaStr, expiresAt]
  );

  return { id, email: cleanEmail, expiresAt };
}

export async function dbVerifyOtp(email, otp, type = "signup") {
  const sqlite = await getSqliteDb();
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = (otp || "").trim();

  const record = await sqlite.get(
    `SELECT * FROM email_otps 
     WHERE email = ? AND otp = ? AND type = ? AND expires_at > CURRENT_TIMESTAMP 
     ORDER BY created_at DESC LIMIT 1`,
    [cleanEmail, cleanOtp, type]
  );

  if (!record) return { valid: false };

  let metadata = null;
  if (record.metadata) {
    try {
      metadata = JSON.parse(record.metadata);
    } catch {
      metadata = record.metadata;
    }
  }

  // Consume OTP so it cannot be reused
  await sqlite.run("DELETE FROM email_otps WHERE id = ?", [record.id]);

  return { valid: true, record, metadata };
}

// ==========================================
// EMAIL-BASED SHARING & PERMISSIONS
// ==========================================

export async function dbAddUserPermission({ itemId, itemType, ownerId, sharedEmail, permission = "viewer" }) {
  const sqlite = await getSqliteDb();
  const cleanEmail = sharedEmail.trim().toLowerCase();
  const id = generateId("perm_");

  await sqlite.run(
    `INSERT INTO item_permissions (id, item_id, item_type, owner_id, shared_with_email, permission)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(item_id, item_type, shared_with_email) DO UPDATE SET
       permission = excluded.permission,
       updated_at = CURRENT_TIMESTAMP`,
    [id, itemId, itemType, ownerId || null, cleanEmail, permission]
  );

  return sqlite.get("SELECT * FROM item_permissions WHERE item_id = ? AND item_type = ? AND shared_with_email = ?", [
    itemId,
    itemType,
    cleanEmail
  ]);
}

export async function dbRemoveUserPermission(itemId, itemType, sharedEmail) {
  const sqlite = await getSqliteDb();
  const cleanEmail = sharedEmail.trim().toLowerCase();
  await sqlite.run(
    "DELETE FROM item_permissions WHERE item_id = ? AND item_type = ? AND shared_with_email = ?",
    [itemId, itemType, cleanEmail]
  );
  return { success: true };
}

export async function dbGetItemPermissions(itemId, itemType) {
  const sqlite = await getSqliteDb();
  const rows = await sqlite.all(
    `SELECT p.id, p.item_id, p.item_type, p.shared_with_email, p.permission, p.created_at, u.name as user_name, u.avatar_url
     FROM item_permissions p
     LEFT JOIN users u ON LOWER(u.email) = LOWER(p.shared_with_email)
     WHERE p.item_id = ? AND p.item_type = ?
     ORDER BY p.created_at ASC`,
    [itemId, itemType]
  );
  return rows;
}

export async function dbGetSharedWithMe(userEmail) {
  const sqlite = await getSqliteDb();
  const cleanEmail = (userEmail || "").trim().toLowerCase();
  if (!cleanEmail) return { folders: [], files: [] };

  // 1. Get Shared Folders
  const folders = await sqlite.all(
    `SELECT f.*, p.permission, u.name as owner_name, u.email as owner_email,
      (SELECT COUNT(*) FROM files WHERE folder_id = f.id AND is_trash = 0) as file_count,
      (SELECT COUNT(*) FROM folders WHERE parent_id = f.id AND is_trash = 0) as folder_count
     FROM folders f
     INNER JOIN item_permissions p ON p.item_id = f.id AND p.item_type = 'folder'
     LEFT JOIN users u ON f.user_id = u.id
     WHERE LOWER(p.shared_with_email) = ? AND f.is_trash = 0
     ORDER BY f.name COLLATE NOCASE ASC`,
    [cleanEmail]
  );

  // 2. Get Shared Files
  const files = await sqlite.all(
    `SELECT files.*, p.permission, u.name as owner_name, u.email as owner_email
     FROM files
     INNER JOIN item_permissions p ON p.item_id = files.id AND p.item_type = 'file'
     LEFT JOIN users u ON files.user_id = u.id
     WHERE LOWER(p.shared_with_email) = ? AND files.is_trash = 0
     ORDER BY files.name COLLATE NOCASE ASC`,
    [cleanEmail]
  );

  return { folders, files };
}

export async function dbHasUserAccessToItem(itemId, itemType, userEmail, userId = null) {
  if (!itemId) return false;
  const sqlite = await getSqliteDb();
  const cleanEmail = (userEmail || "").trim().toLowerCase();

  // Check if user is the direct owner
  if (itemType === "folder") {
    const folder = await sqlite.get("SELECT * FROM folders WHERE id = ?", [itemId]);
    if (!folder) return false;
    if (userId && folder.user_id === userId) return true;
  } else {
    const file = await sqlite.get("SELECT * FROM files WHERE id = ?", [itemId]);
    if (!file) return false;
    if (userId && file.user_id === userId) return true;
  }

  // Check explicit email permission
  if (cleanEmail) {
    const perm = await sqlite.get(
      "SELECT * FROM item_permissions WHERE item_id = ? AND item_type = ? AND LOWER(shared_with_email) = ?",
      [itemId, itemType, cleanEmail]
    );
    if (perm) return true;
  }

  return false;
}

// ==========================================
// EMAIL VERIFICATION & RESET TOKEN HELPERS
// ==========================================

export async function dbSaveVerificationToken(email, token, type = "signup_link", metadata = null, expiryHours = 24) {
  const sqlite = await getSqliteDb();
  const cleanEmail = email.trim().toLowerCase();
  const id = generateId("tok_");
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
  const metaStr = metadata ? JSON.stringify(metadata) : null;

  // Clean previous tokens of this type for the email
  await sqlite.run("DELETE FROM email_otps WHERE email = ? AND type = ?", [cleanEmail, type]);

  await sqlite.run(
    "INSERT INTO email_otps (id, email, otp, type, metadata, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, cleanEmail, token.trim(), type, metaStr, expiresAt]
  );

  return { id, email: cleanEmail, expiresAt, token: token.trim() };
}

export async function dbVerifyToken(token, type = "signup_link") {
  const sqlite = await getSqliteDb();
  const cleanToken = (token || "").trim();
  if (!cleanToken) return { valid: false };

  const record = await sqlite.get(
    `SELECT * FROM email_otps 
     WHERE otp = ? AND type = ? AND expires_at > CURRENT_TIMESTAMP 
     ORDER BY created_at DESC LIMIT 1`,
    [cleanToken, type]
  );

  if (!record) return { valid: false };

  let metadata = null;
  if (record.metadata) {
    try {
      metadata = JSON.parse(record.metadata);
    } catch {
      metadata = record.metadata;
    }
  }

  return { valid: true, record, metadata };
}

export async function dbConsumeVerificationToken(token, type = "signup_link") {
  const sqlite = await getSqliteDb();
  const cleanToken = (token || "").trim();
  const verification = await dbVerifyToken(cleanToken, type);
  if (!verification.valid) return verification;

  // Delete consumed token
  await sqlite.run("DELETE FROM email_otps WHERE id = ?", [verification.record.id]);
  return verification;
}

// ==========================================
// GOOGLE DRIVE STYLE SHARE ACCESS REQUESTS
// ==========================================

export async function dbCreateShareRequest({ shareToken, itemId, itemType, ownerId, requesterEmail, requesterName, message }) {
  const sqlite = await getSqliteDb();
  const id = generateId("req_");
  const cleanEmail = requesterEmail.trim().toLowerCase();

  // Check if there is already a pending request from this email
  const existing = await sqlite.get(
    "SELECT * FROM share_requests WHERE item_id = ? AND LOWER(requester_email) = ? AND status = 'pending'",
    [itemId, cleanEmail]
  );

  if (existing) {
    await sqlite.run(
      "UPDATE share_requests SET message = ?, requester_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [message || "", requesterName || "", existing.id]
    );
    return { ...existing, message, requester_name: requesterName };
  }

  await sqlite.run(
    `INSERT INTO share_requests (id, share_token, item_id, item_type, owner_id, requester_email, requester_name, message, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, shareToken, itemId, itemType, ownerId || null, cleanEmail, requesterName || "", message || ""]
  );

  return sqlite.get("SELECT * FROM share_requests WHERE id = ?", [id]);
}

export async function dbGetPendingShareRequestsForOwner(ownerId) {
  const sqlite = await getSqliteDb();
  return sqlite.all(
    `SELECT r.*, 
       CASE WHEN r.item_type = 'folder' THEN f.name ELSE fi.name END as item_name,
       CASE WHEN r.item_type = 'folder' THEN 'folder' ELSE fi.type END as media_type
     FROM share_requests r
     LEFT JOIN folders f ON r.item_id = f.id AND r.item_type = 'folder'
     LEFT JOIN files fi ON r.item_id = fi.id AND r.item_type = 'file'
     WHERE r.owner_id = ? AND r.status = 'pending'
     ORDER BY r.created_at DESC`,
    [ownerId]
  );
}

export async function dbGetShareRequestById(id) {
  const sqlite = await getSqliteDb();
  return sqlite.get(
    `SELECT r.*, 
       CASE WHEN r.item_type = 'folder' THEN f.name ELSE fi.name END as item_name,
       CASE WHEN r.item_type = 'folder' THEN 'folder' ELSE fi.type END as media_type
     FROM share_requests r
     LEFT JOIN folders f ON r.item_id = f.id AND r.item_type = 'folder'
     LEFT JOIN files fi ON r.item_id = fi.id AND r.item_type = 'file'
     WHERE r.id = ?`,
    [id]
  );
}

export async function dbUpdateShareRequestStatus(id, status) {
  const sqlite = await getSqliteDb();
  await sqlite.run(
    "UPDATE share_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status, id]
  );
  return dbGetShareRequestById(id);
}



