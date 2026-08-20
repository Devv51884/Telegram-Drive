import express from "express";
import { getSqliteDb, getSupabaseClient, dbGetFolderById } from "../db.js";
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

    // Filter by Section
    if (section === "trash") {
      folderQuery += " AND is_trash = 1";
      fileQuery += " AND is_trash = 1";
    } else if (section === "starred") {
      folderQuery += " AND is_trash = 0 AND is_starred = 1";
      fileQuery += " AND is_trash = 0 AND is_starred = 1";
    } else if (section === "telegram_imports") {
      folderQuery += " AND 1=0"; // No folders in telegram imports filter
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

    // Type filter (video, image, pdf, audio, document, archive)
    if (type && type !== "all") {
      folderQuery += " AND 1=0"; // Folder doesn't match media type filter
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
    const rows = await sqlite.all(`
      SELECT 
        type, 
        COUNT(*) as count, 
        SUM(size) as total_size 
      FROM files 
      WHERE is_trash = 0 
      GROUP BY type
    `);

    let totalBytes = 0;
    let totalFiles = 0;
    const breakdown = {
      video: { count: 0, size: 0 },
      image: { count: 0, size: 0 },
      pdf: { count: 0, size: 0 },
      audio: { count: 0, size: 0 },
      document: { count: 0, size: 0 },
      archive: { count: 0, size: 0 },
      other: { count: 0, size: 0 }
    };

    rows.forEach((r) => {
      const type = r.type || "other";
      const size = Number(r.total_size || 0);
      const count = Number(r.count || 0);
      if (breakdown[type]) {
        breakdown[type] = { count, size };
      } else {
        breakdown.other.count += count;
        breakdown.other.size += size;
      }
      totalBytes += size;
      totalFiles += count;
    });

    const folderCount = await sqlite.get("SELECT COUNT(*) as count FROM folders WHERE is_trash = 0");

    res.json({
      success: true,
      stats: {
        totalBytes,
        totalFiles,
        totalFolders: folderCount?.count || 0,
        breakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/drive/trash/empty - Empty Trash (Permanently delete all trash files)
router.post("/trash/empty", async (req, res) => {
  try {
    const sqlite = await getSqliteDb();
    const supabase = await getSupabaseClient();
    const trashFiles = await sqlite.all("SELECT * FROM files WHERE is_trash = 1");

    for (const file of trashFiles) {
      if (file.telegram_message_id && file.telegram_channel_id && file.source_type === "upload") {
        try {
          await deleteTelegramMessage(file.telegram_message_id, file.telegram_channel_id);
        } catch {}
      }
    }

    await sqlite.run("DELETE FROM files WHERE is_trash = 1");
    await sqlite.run("DELETE FROM folders WHERE is_trash = 1");

    if (supabase) {
      try {
        await supabase.from("files").delete().eq("is_trash", 1);
        await supabase.from("folders").delete().eq("is_trash", 1);
      } catch {}
    }

    res.json({ success: true, message: "Trash emptied successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
