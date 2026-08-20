import express from "express";
import {
  getSqliteDb,
  dbGetFolderById,
  dbInsertFolder,
  dbUpdateFolder,
  dbDeleteFolder,
  generateId
} from "../db.js";
import { sanitizeFileName } from "../security.js";

const router = express.Router();

// GET /api/folders - List root folders or subfolders
router.get("/", async (req, res) => {
  try {
    const { parentId } = req.query;
    const sqlite = await getSqliteDb();

    let query = "SELECT * FROM folders WHERE is_trash = 0";
    const params = [];

    if (req.userId) {
      query += " AND (user_id = ? OR user_id IS NULL)";
      params.push(req.userId);
    }

    if (parentId && parentId !== "root") {
      query += " AND parent_id = ?";
      params.push(parentId);
    } else {
      query += " AND parent_id IS NULL";
    }

    query += " ORDER BY name ASC";
    const folders = await sqlite.all(query, params);

    res.json({ success: true, folders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/folders/tree - Hierarchical folder structure
router.get("/tree", async (req, res) => {
  try {
    const sqlite = await getSqliteDb();
    let query = "SELECT id, name, color, parent_id FROM folders WHERE is_trash = 0";
    const params = [];

    if (req.userId) {
      query += " AND (user_id = ? OR user_id IS NULL)";
      params.push(req.userId);
    }

    query += " ORDER BY name ASC";
    const allFolders = await sqlite.all(query, params);

    const folderMap = new Map();
    allFolders.forEach((f) => folderMap.set(f.id, { ...f, children: [] }));

    const roots = [];
    allFolders.forEach((f) => {
      const node = folderMap.get(f.id);
      if (f.parent_id && folderMap.has(f.parent_id)) {
        folderMap.get(f.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    res.json({ success: true, tree: roots, all: allFolders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/folders - Create folder
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
      user_id: req.userId || null,
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

// PATCH /api/folders/:id - Rename, Move, Star, Trash
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
    await dbDeleteFolder(id);
    res.json({ success: true, message: "Folder permanently deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
