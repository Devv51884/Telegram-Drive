import express from "express";
import { getSqliteDb, dbGetFolderById, getSupabaseClient } from "../db.js";
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
      folderQuery += " AND user_id = ?";
      folderParams.push(req.userId);
      fileQuery += " AND user_id = ?";
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

    const [folders, rawFiles] = await Promise.all([
      sqlite.all(folderQuery, folderParams),
      sqlite.all(fileQuery, fileParams)
    ]);

    const files = (rawFiles || []).map((f) => {
      const lower = (f.name || "").toLowerCase().trim();
      let mime = f.mime_type;
      if (lower.endsWith(".mp4") || lower.endsWith(".m4v") || mime === "video/mp2t" || (!mime && f.type === "video")) {
        mime = "video/mp4";
      } else if (lower.endsWith(".pdf") || (!mime && f.type === "pdf")) {
        mime = "application/pdf";
      }
      return { ...f, mime_type: mime };
    });

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
    console.error("Contents fetch error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/drive/stats - Storage statistics by file type
router.get("/stats", async (req, res) => {
  try {
    const sqlite = await getSqliteDb();

    let countQuery = `
      SELECT type, COUNT(*) as totalFiles, SUM(size) as totalBytes
      FROM files
      WHERE is_trash = 0
    `;
    let folderCountQuery = "SELECT COUNT(*) as totalFolders FROM folders WHERE is_trash = 0";
    const params = [];
    const folderParams = [];

    if (req.userId) {
      countQuery += " AND user_id = ?";
      folderCountQuery += " AND user_id = ?";
      params.push(req.userId);
      folderParams.push(req.userId);
    }

    countQuery += " GROUP BY type";

    const rows = await sqlite.all(countQuery, params);
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

// POST /api/drive/bulk-trash - Move multiple files & folders to trash
router.post("/bulk-trash", async (req, res) => {
  try {
    const { fileIds = [], folderIds = [] } = req.body;
    const sqlite = await getSqliteDb();

    if (fileIds.length > 0) {
      const placeholders = fileIds.map(() => "?").join(",");
      await sqlite.run(`UPDATE files SET is_trash = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, fileIds);
    }

    if (folderIds.length > 0) {
      const placeholders = folderIds.map(() => "?").join(",");
      await sqlite.run(`UPDATE folders SET is_trash = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, folderIds);
    }

    (async () => {
      try {
        const supabase = await getSupabaseClient();
        if (supabase) {
          if (fileIds.length > 0) await supabase.from("files").update({ is_trash: 1 }).in("id", fileIds);
          if (folderIds.length > 0) await supabase.from("folders").update({ is_trash: 1 }).in("id", folderIds);
        }
      } catch {}
    })();

    res.json({ success: true, message: `Moved ${fileIds.length + folderIds.length} items to Trash` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/drive/bulk-restore - Restore multiple files & folders from trash
router.post("/bulk-restore", async (req, res) => {
  try {
    const { fileIds = [], folderIds = [] } = req.body;
    const sqlite = await getSqliteDb();

    if (fileIds.length > 0) {
      const placeholders = fileIds.map(() => "?").join(",");
      await sqlite.run(`UPDATE files SET is_trash = 0, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, fileIds);
    }

    if (folderIds.length > 0) {
      const placeholders = folderIds.map(() => "?").join(",");
      await sqlite.run(`UPDATE folders SET is_trash = 0, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, folderIds);
    }

    (async () => {
      try {
        const supabase = await getSupabaseClient();
        if (supabase) {
          if (fileIds.length > 0) await supabase.from("files").update({ is_trash: 0 }).in("id", fileIds);
          if (folderIds.length > 0) await supabase.from("folders").update({ is_trash: 0 }).in("id", folderIds);
        }
      } catch {}
    })();

    res.json({ success: true, message: `Restored ${fileIds.length + folderIds.length} items from Trash` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/drive/bulk-move - Move multiple files & folders to a target folder
router.post("/bulk-move", async (req, res) => {
  try {
    const { fileIds = [], folderIds = [], targetFolderId } = req.body;
    const destination = targetFolderId === "root" || !targetFolderId ? null : targetFolderId;
    const sqlite = await getSqliteDb();

    if (fileIds.length > 0) {
      const placeholders = fileIds.map(() => "?").join(",");
      await sqlite.run(
        `UPDATE files SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [destination, ...fileIds]
      );
    }

    if (folderIds.length > 0) {
      const placeholders = folderIds.map(() => "?").join(",");
      await sqlite.run(
        `UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [destination, ...folderIds]
      );
    }

    (async () => {
      try {
        const supabase = await getSupabaseClient();
        if (supabase) {
          if (fileIds.length > 0) await supabase.from("files").update({ folder_id: destination }).in("id", fileIds);
          if (folderIds.length > 0) await supabase.from("folders").update({ parent_id: destination }).in("id", folderIds);
        }
      } catch {}
    })();

    res.json({ success: true, message: `Moved ${fileIds.length + folderIds.length} items successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/drive/bulk-star - Star / Unstar multiple items
router.post("/bulk-star", async (req, res) => {
  try {
    const { fileIds = [], folderIds = [], isStarred = 1 } = req.body;
    const starVal = isStarred ? 1 : 0;
    const sqlite = await getSqliteDb();

    if (fileIds.length > 0) {
      const placeholders = fileIds.map(() => "?").join(",");
      await sqlite.run(
        `UPDATE files SET is_starred = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [starVal, ...fileIds]
      );
    }

    if (folderIds.length > 0) {
      const placeholders = folderIds.map(() => "?").join(",");
      await sqlite.run(
        `UPDATE folders SET is_starred = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [starVal, ...folderIds]
      );
    }

    (async () => {
      try {
        const supabase = await getSupabaseClient();
        if (supabase) {
          if (fileIds.length > 0) await supabase.from("files").update({ is_starred: starVal }).in("id", fileIds);
          if (folderIds.length > 0) await supabase.from("folders").update({ is_starred: starVal }).in("id", folderIds);
        }
      } catch {}
    })();

    res.json({ success: true, message: `Updated star status on ${fileIds.length + folderIds.length} items` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/drive/bulk-delete - Permanently delete multiple files & folders
router.post("/bulk-delete", async (req, res) => {
  try {
    const { fileIds = [], folderIds = [] } = req.body;
    const sqlite = await getSqliteDb();

    if (fileIds.length > 0) {
      const placeholders = fileIds.map(() => "?").join(",");
      const files = await sqlite.all(`SELECT * FROM files WHERE id IN (${placeholders})`, fileIds);
      for (const file of files) {
        if (file.telegram_message_id && file.telegram_channel_id && file.source_type === "upload") {
          deleteTelegramMessage(file.telegram_message_id, file.telegram_channel_id).catch(() => {});
        }
      }
      await sqlite.run(`DELETE FROM files WHERE id IN (${placeholders})`, fileIds);
    }

    if (folderIds.length > 0) {
      const placeholders = folderIds.map(() => "?").join(",");
      await sqlite.run(`DELETE FROM folders WHERE id IN (${placeholders})`, folderIds);
    }

    (async () => {
      try {
        const supabase = await getSupabaseClient();
        if (supabase) {
          if (fileIds.length > 0) await supabase.from("files").delete().in("id", fileIds);
          if (folderIds.length > 0) await supabase.from("folders").delete().in("id", folderIds);
        }
      } catch {}
    })();

    res.json({ success: true, message: `Deleted ${fileIds.length + folderIds.length} items permanently` });
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
      trashFilesQuery += " AND user_id = ?";
      trashFoldersQuery += " AND user_id = ?";
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
