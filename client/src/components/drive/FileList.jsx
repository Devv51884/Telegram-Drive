import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import ContextMenu from "./ContextMenu.jsx";
import {
  Folder,
  Film,
  Image as ImageIcon,
  FileText,
  Music,
  File,
  Archive,
  Star,
  MoreVertical,
  Send,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";

export default function FileList() {
  const {
    folders,
    files,
    openFolder,
    selectedItem,
    setSelectedItem,
    setPreviewItem,
    toggleStar,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
  } = useDrive();

  const [contextMenu, setContextMenu] = useState(null);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "video":
        return <Film className="w-4 h-4 text-rose-500 flex-shrink-0" />;
      case "image":
        return <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />;
      case "pdf":
        return <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />;
      case "audio":
        return <Music className="w-4 h-4 text-purple-500 flex-shrink-0" />;
      case "archive":
        return <Archive className="w-4 h-4 text-amber-500 flex-shrink-0" />;
      default:
        return <File className="w-4 h-4 text-slate-400 flex-shrink-0" />;
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-blue-500" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-500" />
    );
  };

  const handleContextMenu = (e, item, isFolder) => {
    e.preventDefault();
    e.stopPropagation();
    const itemWithFlag = { ...item, isFolder };
    setSelectedItem(itemWithFlag);
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 230),
      y: Math.min(e.clientY, window.innerHeight - 300),
      item: itemWithFlag
    });
  };

  return (
    <div className="select-none overflow-x-auto" onClick={() => setContextMenu(null)}>
      <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
        {/* Table Header */}
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <th
              onClick={() => handleSort("name")}
              className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <span>Name</span>
                {renderSortIcon("name")}
              </div>
            </th>
            <th className="py-3 px-4 hidden md:table-cell">Source / Location</th>
            <th
              onClick={() => handleSort("date")}
              className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 hidden sm:table-cell"
            >
              <div className="flex items-center gap-1.5">
                <span>Last Modified</span>
                {renderSortIcon("date")}
              </div>
            </th>
            <th
              onClick={() => handleSort("size")}
              className="py-3 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <span>File Size</span>
                {renderSortIcon("size")}
              </div>
            </th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* Folders */}
          {folders.map((folder) => {
            const isSelected = selectedItem?.id === folder.id && selectedItem?.isFolder;

            return (
              <tr
                key={folder.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem({ ...folder, isFolder: true });
                }}
                onDoubleClick={() => openFolder(folder.id)}
                onContextMenu={(e) => handleContextMenu(e, folder, true)}
                className={`group cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                    : "hover:bg-slate-50 dark:hover:bg-[#252628]"
                }`}
              >
                <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-3 truncate max-w-sm sm:max-w-md">
                    <Folder
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: folder.color || "#4285f4" }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400 hidden md:table-cell">Folder</td>
                <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                  {new Date(folder.updated_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-slate-400">—</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar({ ...folder, isFolder: true });
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-amber-500"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          folder.is_starred ? "fill-amber-400 text-amber-500" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => handleContextMenu(e, folder, true)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {/* Files */}
          {files.map((file) => {
            const isSelected = selectedItem?.id === file.id && !selectedItem?.isFolder;

            return (
              <tr
                key={file.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem({ ...file, isFolder: false });
                }}
                onDoubleClick={() => setPreviewItem(file)}
                onContextMenu={(e) => handleContextMenu(e, file, false)}
                className={`group cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium"
                    : "hover:bg-slate-50 dark:hover:bg-[#252628]"
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3 truncate max-w-xs sm:max-w-sm md:max-w-md">
                    {getFileIcon(file.type)}
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400 hidden md:table-cell">
                  {file.source_type === "telegram_post" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-medium bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-full">
                      <Send className="w-2.5 h-2.5" />
                      {file.telegram_channel_title || "Telegram Channel"}
                    </span>
                  ) : (
                    "Uploaded to Bot"
                  )}
                </td>
                <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                  {new Date(file.updated_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-slate-500 font-medium">{formatBytes(file.size)}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(file);
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-amber-500"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          file.is_starred ? "fill-amber-400 text-amber-500" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => handleContextMenu(e, file, false)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
