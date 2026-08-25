import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import ContextMenu from "./ContextMenu.jsx";
import VideoThumbnail from "./VideoThumbnail.jsx";
import useLongPress from "../../hooks/useLongPress.js";
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
  Play,
  Check,
  Globe,
  Share2
} from "lucide-react";

export default function FileGrid() {
  const {
    folders,
    files,
    openFolder,
    selectedItem,
    setSelectedItem,
    selectedItems,
    isMultiSelectMode,
    enterMultiSelectMode,
    toggleSelectItem,
    isItemSelected,
    setPreviewItem,
    toggleStar,
    moveItem,
    openShareModal
  } = useDrive();

  const [contextMenu, setContextMenu] = useState(null); // { x, y, item }
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  // Long press handler for touch / mobile
  const { handlers: getLongPressHandlers, isLongPress } = useLongPress(
    (item) => {
      enterMultiSelectMode(item);
    },
    null,
    { delay: 420 }
  );

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
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

  // Context menu handler
  const handleContextMenu = (e, item, isFolder) => {
    e.preventDefault();
    e.stopPropagation();
    const itemWithFlag = { ...item, isFolder };
    if (!isItemSelected(item.id)) {
      toggleSelectItem(itemWithFlag, isMultiSelectMode);
    }
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 230),
      y: Math.min(e.clientY, window.innerHeight - 300),
      item: itemWithFlag
    });
  };

  // Drag & Drop handlers for moving files into folders
  const handleDragStart = (e, item, isFolder) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ ...item, isFolder }));
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    setDragOverFolderId(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data && data.id !== targetFolderId) {
        await moveItem(data, targetFolderId);
      }
    } catch (err) {
      console.error("Drop move failed:", err);
    }
  };

  return (
    <div className="space-y-6 select-none" onClick={() => setContextMenu(null)}>
      {/* ============================================================ */}
      {/* 1. GOOGLE DRIVE STYLE FOLDERS GRID (Image 2 Redesign)          */}
      {/* ============================================================ */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
            Folders ({folders.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
            {folders.map((folder) => {
              const isSelected = isItemSelected(folder.id);
              const isDragTarget = dragOverFolderId === folder.id;
              const folderWithFlag = { ...folder, isFolder: true };
              const longPressProps = getLongPressHandlers(folderWithFlag);
              const isSharedPublic = folder.share_access === "public";

              return (
                <div
                  key={folder.id}
                  data-item-id={folder.id}
                  data-item-folder="true"
                  data-item-name={folder.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, folder, true)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  {...longPressProps}
                  onClick={(e) => {
                    if (isLongPress()) return;
                    e.stopPropagation();
                    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey || isMultiSelectMode;
                    toggleSelectItem(folderWithFlag, isMulti);
                  }}
                  onDoubleClick={() => openFolder(folder.id)}
                  onContextMenu={(e) => handleContextMenu(e, folder, true)}
                  className={`group relative flex flex-col justify-between h-36 sm:h-40 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer overflow-hidden p-3 ${
                    isSelected
                      ? "bg-blue-50/95 dark:bg-[#1a2333] border-blue-500 shadow-md ring-2 ring-blue-500/20"
                      : isDragTarget
                      ? "bg-blue-100 dark:bg-blue-900/60 border-blue-500 scale-[1.02]"
                      : "bg-[#f8fafd] dark:bg-[#1e1f20] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-[#f0f4f9] dark:hover:bg-[#252628] hover:shadow-sm"
                  }`}
                >
                  {/* Top Header Row: Icon + Name + 3-dots menu (Image 2 style) */}
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <div
                      className="flex items-center gap-1.5 truncate flex-1 min-w-0"
                      onClick={(e) => {
                        if (isLongPress()) return;
                        if (isSelected && !isMultiSelectMode) {
                          e.stopPropagation();
                          openFolder(folder.id);
                        }
                      }}
                    >
                      {/* Multi-Select Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectItem(folderWithFlag, true);
                        }}
                        className={`w-4 h-4 rounded-md border items-center justify-center transition-all flex-shrink-0 ${
                          isMultiSelectMode
                            ? "flex opacity-100"
                            : "hidden sm:flex opacity-0 sm:group-hover:opacity-100"
                        } ${
                          isSelected && isMultiSelectMode
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-[#282a2c] hover:border-blue-500"
                        }`}
                      >
                        {isSelected && isMultiSelectMode && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      {/* Folder Icon / Shared Indicator */}
                      {isSharedPublic ? (
                        <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Folder
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 fill-current/30"
                          style={{ color: folder.color || "#4285f4" }}
                        />
                      )}

                      <span
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate select-none"
                        title={folder.name}
                      >
                        {folder.name}
                      </span>
                    </div>

                    {/* Top Right Action Buttons */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {folder.is_starred ? (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 mr-0.5" />
                      ) : null}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, folder, true);
                        }}
                        className="p-1 hover:bg-slate-200/70 dark:hover:bg-[#333538] rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Folder Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Center Silhouette Graphic (Image 2 style) */}
                  <div
                    className="flex-1 flex items-center justify-center my-1"
                    onClick={(e) => {
                      if (isLongPress()) return;
                      e.stopPropagation();
                      openFolder(folder.id);
                    }}
                  >
                    <div className="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                      {/* Large Filled Folder Illustration */}
                      <svg
                        className="w-16 h-12 sm:w-20 sm:h-14 text-slate-300/80 dark:text-slate-700/80 fill-current drop-shadow-sm"
                        viewBox="0 0 24 24"
                      >
                        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                      </svg>
                      {isSharedPublic && (
                        <div className="absolute bottom-0 right-0 p-1 bg-emerald-600 text-white rounded-full shadow-md scale-75">
                          <Globe className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Folder Meta / Color accent line */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                    <span>Folder</span>
                    {folder.color && folder.color !== "#4285f4" && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: folder.color }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. GOOGLE DRIVE STYLE FILES GRID (Image 3 with Video Thumbs)   */}
      {/* ============================================================ */}
      {files.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
            Files ({files.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
            {files.map((file) => {
              const isSelected = isItemSelected(file.id);
              const fileWithFlag = { ...file, isFolder: false };
              const longPressProps = getLongPressHandlers(fileWithFlag);
              const isSharedPublic = file.share_access === "public";

              return (
                <div
                  key={file.id}
                  data-item-id={file.id}
                  data-item-folder="false"
                  data-item-name={file.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file, false)}
                  {...longPressProps}
                  onClick={(e) => {
                    if (isLongPress()) return;
                    e.stopPropagation();
                    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey || isMultiSelectMode;
                    toggleSelectItem(fileWithFlag, isMulti);
                  }}
                  onDoubleClick={() => setPreviewItem(file)}
                  onContextMenu={(e) => handleContextMenu(e, file, false)}
                  className={`group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? "bg-blue-50/95 dark:bg-[#1a2333] border-blue-500 shadow-md ring-2 ring-blue-500/20"
                      : "bg-[#f8fafd] dark:bg-[#1e1f20] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-[#f0f4f9] dark:hover:bg-[#252628] hover:shadow-md"
                  }`}
                >
                  {/* File Card Header: Type icon + Name + 3-dots (Image 3 style) */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/80 dark:bg-[#252628] border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1">
                      {/* Multi-Select Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectItem(fileWithFlag, true);
                        }}
                        className={`w-4 h-4 rounded-md border items-center justify-center transition-all flex-shrink-0 ${
                          isMultiSelectMode
                            ? "flex opacity-100"
                            : "hidden sm:flex opacity-0 sm:group-hover:opacity-100"
                        } ${
                          isSelected && isMultiSelectMode
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-[#282a2c] hover:border-blue-500"
                        }`}
                      >
                        {isSelected && isMultiSelectMode && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      {getFileIcon(file.type)}
                      <span
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate select-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                      {file.is_starred ? (
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      ) : null}

                      {isSharedPublic && (
                        <Globe className="w-3.5 h-3.5 text-emerald-500" title="Public Link Active" />
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, file, false);
                        }}
                        className="p-1 hover:bg-slate-200/70 dark:hover:bg-[#333538] rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="File Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Media Preview Box (Image 3 style) */}
                  <div
                    className="h-32 sm:h-36 w-full bg-slate-100/80 dark:bg-[#141517] flex items-center justify-center relative overflow-hidden transition-colors"
                    onClick={(e) => {
                      if (isLongPress()) return;
                      e.stopPropagation();
                      setPreviewItem(file);
                    }}
                  >
                    {file.type === "video" ? (
                      /* Real Video Frame Snapshot Thumbnail / Rich Video Card */
                      <VideoThumbnail file={file} />
                    ) : file.type === "image" ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-900 overflow-hidden">
                        <img
                          src={DriveAPI.getStreamUrl(file.id)}
                          alt={file.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0">
                          <ImageIcon className="w-8 h-8 text-blue-500/40" />
                        </div>
                      </div>
                    ) : file.type === "pdf" ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-500/10 via-slate-900/60 to-slate-950 p-3 text-center overflow-hidden">
                        <div className="absolute w-20 h-20 bg-red-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-500 flex items-center justify-center shadow-lg shadow-red-500/10 group-hover:scale-110 transition-transform">
                          <FileText className="w-6 h-6 text-red-500" />
                        </div>
                        <span className="mt-2 text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          PDF Document
                        </span>
                      </div>
                    ) : file.type === "audio" ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/10 via-slate-900/60 to-slate-950 p-3 text-center overflow-hidden">
                        <div className="absolute w-20 h-20 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10 group-hover:scale-110 transition-transform">
                          <Music className="w-6 h-6 text-purple-400" />
                        </div>
                        <span className="mt-2 text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          Audio Track
                        </span>
                      </div>
                    ) : file.type === "archive" ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-950 p-3 text-center overflow-hidden">
                        <div className="absolute w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                        <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform">
                          <Archive className="w-6 h-6 text-amber-400" />
                        </div>
                        <span className="mt-2 text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Archive ZIP
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-950 p-3 text-center overflow-hidden">
                        <div className="relative w-11 h-11 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <File className="w-6 h-6 text-slate-400" />
                        </div>
                        <span className="mt-2 text-[9px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded-full truncate max-w-[90px]">
                          {file.name.split(".").pop() || "File"}
                        </span>
                      </div>
                    )}

                    {/* Telegram Channel Source Tag Badge */}
                    {file.source_type === "telegram_post" && (
                      <div
                        className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-600/90 text-white text-[9px] font-medium backdrop-blur-md shadow-sm"
                        title={`Imported from ${file.telegram_channel_title || "Telegram Channel"}`}
                      >
                        <Send className="w-2.5 h-2.5 -rotate-12" />
                        <span className="truncate max-w-[85px]">
                          {file.telegram_channel_title || "Telegram"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* File Info Footer */}
                  <div className="p-2.5 bg-white dark:bg-[#1e1f20] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="font-medium">{formatBytes(file.size)}</span>
                    <span>{new Date(file.updated_at || file.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
