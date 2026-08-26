import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
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
  Check,
  CheckSquare,
  Square
} from "lucide-react";

export default function FileList() {
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
    selectAll,
    clearSelection,
    isItemSelected,
    setPreviewItem,
    toggleStar,
    moveItem
  } = useDrive();

  const [contextMenu, setContextMenu] = useState(null);

  // Long press handler for touch / mobile
  const { handlers: getLongPressHandlers, isLongPress } = useLongPress(
    (item) => {
      enterMultiSelectMode(item);
    },
    null,
    { delay: 420 }
  );

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "-";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "video":
        return <Film className="w-4 h-4 text-rose-500" />;
      case "image":
        return <ImageIcon className="w-4 h-4 text-blue-500" />;
      case "pdf":
        return <FileText className="w-4 h-4 text-red-500" />;
      case "audio":
        return <Music className="w-4 h-4 text-purple-500" />;
      case "archive":
        return <Archive className="w-4 h-4 text-amber-500" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

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

  const allItemsCount = folders.length + files.length;
  const isAllSelected = allItemsCount > 0 && selectedItems.length === allItemsCount;

  return (
    <div className="select-none" onClick={() => setContextMenu(null)}>
      <div className="w-full border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#1e1f20] overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-slate-50/80 dark:bg-[#252628] border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider items-center">
          <div className="col-span-8 sm:col-span-6 md:col-span-5 flex items-center gap-2">
            <button
              type="button"
              onClick={isAllSelected ? clearSelection : selectAll}
              className="p-0.5 rounded text-slate-400 hover:text-blue-500"
              title={isAllSelected ? "Deselect All" : "Select All"}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <span>Name</span>
          </div>
          <div className="hidden md:block col-span-3">Source / Channel</div>
          <div className="hidden sm:block col-span-3 md:col-span-2">Last Modified</div>
          <div className="col-span-2 sm:col-span-2 md:col-span-1 text-right">Size</div>
          <div className="col-span-2 sm:col-span-1 text-right"></div>
        </div>

        {/* List Content */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* Folders */}
          {folders.map((folder) => {
            const isSelected = isItemSelected(folder.id);
            const folderWithFlag = { ...folder, isFolder: true };
            const longPressProps = getLongPressHandlers(folderWithFlag);

            return (
              <div
                key={folder.id}
                data-item-id={folder.id}
                data-item-folder="true"
                data-item-name={folder.name}
                {...longPressProps}
                onClick={(e) => {
                  if (isLongPress()) return;
                  e.stopPropagation();
                  const isMulti = e.ctrlKey || e.metaKey || e.shiftKey || isMultiSelectMode;
                  if (isMulti) {
                    toggleSelectItem(folderWithFlag, true);
                  } else {
                    openFolder(folder.id);
                  }
                }}
                onDoubleClick={() => openFolder(folder.id)}
                onContextMenu={(e) => handleContextMenu(e, folder, true)}
                className={`grid grid-cols-12 gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 items-center text-xs transition-colors cursor-pointer group ${
                  isSelected
                    ? "bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200"
                    : "hover:bg-slate-50 dark:hover:bg-[#252628] text-slate-800 dark:text-slate-200"
                }`}
              >
                <div
                  className="col-span-8 sm:col-span-6 md:col-span-5 flex items-center gap-2 sm:gap-2.5 truncate pr-1"
                  onClick={(e) => {
                    if (isLongPress()) return;
                    e.stopPropagation();
                    if (isMultiSelectMode || e.ctrlKey || e.metaKey) {
                      toggleSelectItem(folderWithFlag, true);
                    } else {
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
                    className={`w-4 h-4 rounded border items-center justify-center transition-all flex-shrink-0 ${
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

                  <Folder
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: folder.color || "#4285f4" }}
                  />
                  <span className="font-semibold truncate text-xs sm:text-sm">{folder.name}</span>
                </div>

                <div className="hidden md:block col-span-3 text-slate-400 truncate">
                  Folder
                </div>

                <div className="hidden sm:block col-span-3 md:col-span-2 text-slate-400 text-[11px]">
                  {new Date(folder.updated_at).toLocaleDateString()}
                </div>

                <div className="col-span-2 sm:col-span-2 md:col-span-1 text-right text-slate-400 text-[11px]">
                  -
                </div>

                <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-0.5 sm:gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(folderWithFlag);
                    }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-[#323437] rounded text-slate-400 hover:text-amber-500"
                    title="Star Folder"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        folder.is_starred ? "fill-amber-400 text-amber-500" : "opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                      }`}
                    />
                  </button>
                  <button
                    onClick={(e) => handleContextMenu(e, folder, true)}
                    className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-[#323437] rounded text-slate-400 hover:text-slate-600"
                    title="Options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Files */}
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
                {...longPressProps}
                onClick={(e) => {
                  if (isLongPress()) return;
                  e.stopPropagation();
                  const isMulti = e.ctrlKey || e.metaKey || e.shiftKey || isMultiSelectMode;
                  toggleSelectItem(fileWithFlag, isMulti);
                }}
                onDoubleClick={() => setPreviewItem(file)}
                onContextMenu={(e) => handleContextMenu(e, file, false)}
                className={`grid grid-cols-12 gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 items-center text-xs transition-colors cursor-pointer group ${
                  isSelected
                    ? "bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200"
                    : "hover:bg-slate-50 dark:hover:bg-[#252628] text-slate-800 dark:text-slate-200"
                }`}
              >
                <div
                  className="col-span-8 sm:col-span-6 md:col-span-5 flex items-center gap-2 sm:gap-2.5 truncate pr-1"
                  onClick={(e) => {
                    if (isLongPress()) return;
                    if (isSelected && !isMultiSelectMode) {
                      e.stopPropagation();
                      setPreviewItem(file);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectItem(fileWithFlag, true);
                    }}
                    className={`w-4 h-4 rounded border items-center justify-center transition-all flex-shrink-0 ${
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
                  <span className="font-medium truncate text-xs sm:text-sm">{file.name}</span>
                </div>

                <div className="hidden md:block col-span-3 text-slate-400 truncate">
                  {file.source_type === "telegram_post" ? (
                    <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                      <Send className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{file.telegram_channel_title || "Telegram Channel"}</span>
                    </span>
                  ) : (
                    "Direct Upload"
                  )}
                </div>

                <div className="hidden sm:block col-span-3 md:col-span-2 text-slate-400 text-[11px]">
                  {new Date(file.updated_at).toLocaleDateString()}
                </div>

                <div className="col-span-2 sm:col-span-2 md:col-span-1 text-right text-slate-400 text-[11px] font-mono">
                  {formatBytes(file.size)}
                </div>

                <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-0.5 sm:gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar({ ...file, isFolder: false });
                    }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-[#323437] rounded text-slate-400 hover:text-amber-500"
                    title="Star File"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        file.is_starred ? "fill-amber-400 text-amber-500" : "opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                      }`}
                    />
                  </button>
                  <button
                    onClick={(e) => handleContextMenu(e, file, false)}
                    className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-[#323437] rounded text-slate-400 hover:text-slate-600"
                    title="Options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
