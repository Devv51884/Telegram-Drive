import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import ContextMenu from "./ContextMenu.jsx";
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
  Check
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
    moveItem
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
        return <Film className="w-5 h-5 text-rose-500" />;
      case "image":
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "audio":
        return <Music className="w-5 h-5 text-purple-500" />;
      case "archive":
        return <Archive className="w-5 h-5 text-amber-500" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
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
      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
            Folders ({folders.length})
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
            {folders.map((folder) => {
              const isSelected = isItemSelected(folder.id);
              const isDragTarget = dragOverFolderId === folder.id;
              const folderWithFlag = { ...folder, isFolder: true };
              const longPressProps = getLongPressHandlers(folderWithFlag);

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
                  className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                      : isDragTarget
                      ? "bg-blue-100 dark:bg-blue-900/60 border-blue-500 scale-[1.02]"
                      : "bg-white dark:bg-[#1e1f20] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
                  }`}
                >
                  <div
                    className="flex items-center gap-2 truncate pr-1 flex-1"
                    onClick={(e) => {
                      if (isLongPress()) return;
                      // On single selected folder in non-multi mode, allow opening
                      if (isSelected && !isMultiSelectMode) {
                        e.stopPropagation();
                        openFolder(folder.id);
                      }
                    }}
                  >
                    {/* Multi-Select Checkbox: Only visible in multi-select mode or on desktop hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectItem(folderWithFlag, true);
                      }}
                      className={`w-5 h-5 rounded-lg border items-center justify-center transition-all flex-shrink-0 ${
                        isMultiSelectMode
                          ? "flex opacity-100"
                          : "hidden sm:flex opacity-0 sm:group-hover:opacity-100"
                      } ${
                        isSelected && isMultiSelectMode
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-[#282a2c] hover:border-blue-500"
                      }`}
                    >
                      {isSelected && isMultiSelectMode && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <Folder
                      className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ color: folder.color || "#4285f4" }}
                    />
                    <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {folder.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(folderWithFlag);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-[#282a2c] rounded-lg text-slate-400 hover:text-amber-500"
                      title="Star Folder"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          folder.is_starred ? "fill-amber-400 text-amber-500 opacity-100" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => handleContextMenu(e, folder, true)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-[#282a2c] rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Folder Options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
            Files ({files.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {files.map((file) => {
              const isSelected = isItemSelected(file.id);
              const fileWithFlag = { ...file, isFolder: false };
              const longPressProps = getLongPressHandlers(fileWithFlag);

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
                  className={`group relative flex flex-col justify-between rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? "bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                      : "bg-white dark:bg-[#1e1f20] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                  }`}
                >
                  {/* File Card Header */}
                  <div className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-50/60 dark:bg-[#252628] border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 truncate">
                      {/* Multi-Select Checkbox: Only visible in multi-select mode or on desktop hover */}
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
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 truncate">
                        {file.name.split(".").pop() || file.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {file.is_starred ? (
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-500" />
                      ) : null}
                      <button
                        onClick={(e) => handleContextMenu(e, file, false)}
                        className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 hover:bg-slate-200 dark:hover:bg-[#323437] rounded text-slate-400 hover:text-slate-600 transition-opacity"
                        title="File Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Media Preview Box */}
                  <div className="h-28 w-full bg-slate-100/70 dark:bg-[#282a2c] flex items-center justify-center relative overflow-hidden group-hover:bg-slate-100 transition-colors">
                    {file.type === "image" ? (
                      <img
                        src={DriveAPI.getStreamUrl(file.id)}
                        alt={file.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : file.type === "video" ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-slate-900/10 dark:bg-slate-900/30">
                        <div className="w-10 h-10 rounded-full bg-slate-900/70 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>
                      </div>
                    ) : file.type === "pdf" ? (
                      <div className="flex flex-col items-center justify-center text-red-500/80 gap-1">
                        <FileText className="w-8 h-8" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PDF Document</span>
                      </div>
                    ) : file.type === "audio" ? (
                      <div className="flex flex-col items-center justify-center text-purple-500 gap-1">
                        <Music className="w-8 h-8" />
                        <span className="text-[10px] font-medium text-slate-400">Audio Track</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                        <File className="w-8 h-8" />
                      </div>
                    )}

                    {/* Source Tag Badge */}
                    {file.source_type === "telegram_post" && (
                      <div
                        className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-500/90 text-white text-[9px] font-medium backdrop-blur-sm shadow-sm"
                        title={`Imported from ${file.telegram_channel_title || "Telegram Channel"}`}
                      >
                        <Send className="w-2.5 h-2.5 -rotate-12" />
                        <span className="truncate max-w-[80px]">
                          {file.telegram_channel_title || "Telegram"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* File Info Footer */}
                  <div className="p-2.5">
                    <p
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                      <span>{formatBytes(file.size)}</span>
                      <span>{new Date(file.updated_at).toLocaleDateString()}</span>
                    </div>
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
