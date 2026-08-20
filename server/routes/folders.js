import express from "express";
import {
  getSqliteDb,
  getSupabaseClient,
  generateId,
  dbGetFolderById,
  dbInsertFolder,
  dbUpdateFolder,
  dbDeleteFolder
} from "../db.js";
import { sanitizeFileName } from "../security.js";

const router = express.Router();

// GET /api/folders - List folders
router.get("/", async (req, res) => {
  try {
    const { parentId, isTrash } = req.query;
    const supabase = await getSupabaseClient();

    if (supabase) {
      let query = supabase.from("folders").select("*");
      if (isTrash === "true") {
        query = query.eq("is_trash", 1);
      } else {
        query = query.eq("is_trash", 0);
        if (parentId === "root" || !parentId) {
          query = query.is("parent_id", null);
        } else {
          query = query.eq("parent_id", parentId);
        }
      }
      query = query.order("name", { ascending: true });
      const { data, error } = await query;
      if (!error && data) {
        return res.json({ success: true, folders: data });
      }
    }

    const sqlite = await getSqliteDb();
    let query = "SELECT * FROM folders WHERE 1=1";
    const params = [];

    if (isTrash === "true") {
      query += " AND is_trash = 1";
    } else {
      query += " AND is_trash = 0";
      if (parentId === "root" || !parentId) {
        query += " AND parent_id IS NULL";
      } else {
        query += " AND parent_id = ?";
        params.push(parentId);
      }
    }

    query += " ORDER BY name ASC";
    const folders = await sqlite.all(query, params);
    res.json({ success: true, folders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/folders/tree - Full folder tree for Move Picker / Sidebar
router.get("/tree", async (req, res) => {
  try {
    let allFolders = [];
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("folders")
        .select("id, name, parent_id, color")
        .eq("is_trash", 0)
        .order("name", { ascending: true });
      if (!error && data) {
        allFolders = data;
      }
    }

    if (allFolders.length === 0) {
      const sqlite = await getSqliteDb();
      allFolders = await sqlite.all(
        "SELECT id, name, parent_id, color FROM folders WHERE is_trash = 0 ORDER BY name ASC"
      );
    }

    // Build tree
    const map = {};
    const roots = [];

    allFolders.forEach((f) => {
      map[f.id] = { ...f, children: [] };
    });

    allFolders.forEach((f) => {
      if (f.parent_id && map[f.parent_id]) {
        map[f.parent_id].children.push(map[f.id]);
      } else {
        roots.push(map[f.id]);
      }
    });

    res.json({ success: true, tree: roots, all: allFolders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/folders - Create folder with input sanitization
router.post("/", async (req, res) => {
  try {
    const { name, parentId, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Folder name is required" });
    }

    const cleanName = sanitizeFileName(name.trim());
    const id = generateId("f_");
    const parent = parentId === "root" || !parentId ? null : parentId;

    const folder = await dbInsertFolder({
      id,
      name: cleanName,
      parent_id: parent,
      color: color || "#4285f4",
      is_starred: 0,
      is_trash: 0
    });

    res.json({ success: true, folder });
  } catch (err) {
    console.error("Create folder error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/folders/:id - Rename, Move, Star, Trash, Restore
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, isStarred, isTrash, color } = req.body;

    const folder = await dbGetFolderById(id);
    if (!folder) return res.status(404).json({ success: false, error: "Folder not found" });

    const updates = {};
    if (name !== undefined) updates.name = sanitizeFileName(name.trim());
    if (parentId !== undefined) {
      if (parentId === id) {
        return res.status(400).json({ success: false, error: "Cannot move a folder into itself" });
      }
      updates.parent_id = parentId === "root" || !parentId ? null : parentId;
    }
    if (isStarred !== undefined) updates.is_starred = isStarred ? 1 : 0;
    if (isTrash !== undefined) updates.is_trash = isTrash ? 1 : 0;
    if (color !== undefined) updates.color = color;

    const updated = await dbUpdateFolder(id, updates);
    res.json({ success: true, folder: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/folders/:id - Permanent delete
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sqlite = await getSqliteDb();

    // Cascading delete folder & subfolders
    await sqlite.run("DELETE FROM files WHERE folder_id = ?", [id]);
    await dbDeleteFolder(id);

    res.json({ success: true, message: "Folder deleted permanently" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
