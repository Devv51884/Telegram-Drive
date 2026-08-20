import express from "express";
import { getSqliteDb, dbGetFolderById } from "../db.js";
import { deleteTelegramMessage } from "../telegram.js";

const router = express.Router();

// GET /api/drive/contents - Get folder contents based on current view/filter
router.get("/contents", async (req, res) => {
  try {
    const { folderId, section, search, type, sort = "name", order = "asc" } = req.query;
    const sqlite = await getSqliteDb();

    let folderQuery = "SELECT * FROM folders WHERE 1=1";
    let fileQuery = "SELECT * FROM files WHERE 1=1";
    const folderParams = [];
    const fileParams = [];

    // Filter by user if logged in
    if (req.userId) {
      folderQuery += " AND (user_id = ? OR user_id IS NULL)";
      folderParams.push(req.userId);
      fileQuery += " AND (user_id = ? OR user_id IS NULL)";
      fileParams.push(req.userId);
    }

    // Filter by Section
    if (section === "trash") {
      folderQuery += " AND is_trash = 1";
      fileQuery += " AND is_trash = 1";
    } else if (section === "starred") {
      folderQuery += " AND is_trash = 0 AND is_starred = 1";
      fileQuery += " AND is_trash = 0 AND is_starred = 1";
    } else if (section === "telegram_imports") {
      folderQuery += " AND 1=0";
      fileQuery += " AND is_trash = 0 AND source_type = 'telegram_post'";
    } else if (section === "recent") {
      folderQuery += " AND is_trash = 0";
      fileQuery += " AND is_trash = 0";
    } else {
      // Standard "My Drive" folder view
      folderQuery += " AND is_trash = 0";
      fileQuery += " AND is_trash = 0";

      if (folderId && folderId !== "root") {
        folderQuery += " AND parent_id = ?";
        folderParams.push(folderId);

        fileQuery += " AND folder_id = ?";
        fileParams.push(folderId);
      } else if (!search && !type) {
        folderQuery += " AND parent_id IS NULL";
        fileQuery += " AND folder_id IS NULL";
      }
    }

    // Search query filter
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      folderQuery += " AND name LIKE ?";
      folderParams.push(searchPattern);

      fileQuery += " AND (name LIKE ? OR telegram_channel_title LIKE ?)";
      fileParams.push(searchPattern, searchPattern);
    }

    // Type filter
    if (type && type !== "all") {
      folderQuery += " AND 1=0";
      fileQuery += " AND type = ?";
      fileParams.push(type);
    }

    // Sorting
    const sortFieldMap = {
      name: "name",
      size: "size",
      date: "updated_at"
    };
    const sortField = sortFieldMap[sort] || "name";
    const sortOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";

    folderQuery += ` ORDER BY name ${sortOrder}`;
    fileQuery += ` ORDER BY ${sortField} ${sortOrder}`;

    const [folders, files] = await Promise.all([
      sqlite.all(folderQuery, folderParams),
      sqlite.all(fileQuery, fileParams)
    ]);

    // Current folder info & breadcrumb path
    let currentFolder = null;
    const breadcrumbs = [{ id: "root", name: "My Drive" }];

    if (folderId && folderId !== "root") {
      currentFolder = await dbGetFolderById(folderId);

      // Build breadcrumbs path
      let curr = currentFolder;
      const trail = [];
      while (curr) {
        trail.unshift({ id: curr.id, name: curr.name });
        if (curr.parent_id) {
          curr = await dbGetFolderById(curr.parent_id);
        } else {
          curr = null;
        }
      }
      breadcrumbs.push(...trail);
    }

    res.json({
      success: true,
      currentFolder,
      breadcrumbs,
      folders,
      files
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/drive/stats - Storage breakdown
router.get("/stats", async (req, res) => {
  try {
    const sqlite = await getSqliteDb();
    let statsQuery = `
      SELECT 
        COUNT(id) as totalFiles,
        COALESCE(SUM(size), 0) as totalBytes,
        type
      FROM files 
      WHERE is_trash = 0
    `;
    const params = [];
    if (req.userId) {
      statsQuery += " AND (user_id = ? OR user_id IS NULL)";
      params.push(req.userId);
    }
    statsQuery += " GROUP BY type";

    const rows = await sqlite.all(statsQuery, params);

    let folderCountQuery = "SELECT COUNT(id) as totalFolders FROM folders WHERE is_trash = 0";
    const folderParams = [];
    if (req.userId) {
      folderCountQuery += " AND (user_id = ? OR user_id IS NULL)";
      folderParams.push(req.userId);
    }
    const folderCount = await sqlite.get(folderCountQuery, folderParams);

    const stats = {
      totalFiles: 0,
      totalFolders: folderCount?.totalFolders || 0,
      totalBytes: 0,
      byType: {
        video: 0,
        image: 0,
        pdf: 0,
        audio: 0,
        document: 0,
        archive: 0,
        other: 0
      }
    };

    for (const r of rows) {
      stats.totalFiles += r.totalFiles;
      stats.totalBytes += r.totalBytes;
      if (stats.byType[r.type] !== undefined) {
        stats.byType[r.type] += r.totalBytes;
      } else {
        stats.byType.other += r.totalBytes;
      }
    }

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/drive/empty-trash - Permanently delete all items in trash
router.post("/empty-trash", async (req, res) => {
  try {
    const sqlite = await getSqliteDb();

    let trashFilesQuery = "SELECT * FROM files WHERE is_trash = 1";
    let trashFoldersQuery = "SELECT * FROM folders WHERE is_trash = 1";
    const params = [];
    if (req.userId) {
      trashFilesQuery += " AND (user_id = ? OR user_id IS NULL)";
      trashFoldersQuery += " AND (user_id = ? OR user_id IS NULL)";
      params.push(req.userId);
    }

    const trashFiles = await sqlite.all(trashFilesQuery, params);
    const trashFolders = await sqlite.all(trashFoldersQuery, params);

    for (const file of trashFiles) {
      if (file.telegram_message_id && file.telegram_channel_id && file.source_type === "upload") {
        await deleteTelegramMessage(file.telegram_message_id, file.telegram_channel_id);
      }
      await sqlite.run("DELETE FROM files WHERE id = ?", [file.id]);
    }

    for (const folder of trashFolders) {
      await sqlite.run("DELETE FROM folders WHERE id = ?", [folder.id]);
    }

    res.json({
      success: true,
      message: `Deleted ${trashFiles.length} files and ${trashFolders.length} folders permanently`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
