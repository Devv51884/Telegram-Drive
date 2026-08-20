import React from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  X,
  File,
  Folder,
  Download,
  Star,
  Send,
  ExternalLink,
  Calendar,
  HardDrive,
  Film,
  Image as ImageIcon,
  FileText,
  Music
} from "lucide-react";

export default function DetailsDrawer() {
  const { selectedItem, isDetailsOpen, setIsDetailsOpen, toggleStar, setPreviewItem } = useDrive();

  if (!isDetailsOpen || !selectedItem) return null;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f20] h-[calc(100vh-4rem)] p-4 flex flex-col justify-between flex-shrink-0 overflow-y-auto animate-in slide-in-from-right duration-150">
      <div className="space-y-4">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Details & Info
          </h3>
          <button
            onClick={() => setIsDetailsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnail Preview / Icon */}
        <div className="h-36 w-full rounded-2xl bg-slate-100 dark:bg-[#282a2c] flex items-center justify-center overflow-hidden relative border border-slate-200 dark:border-slate-700">
          {selectedItem.isFolder ? (
            <Folder className="w-16 h-16" style={{ color: selectedItem.color || "#4285f4" }} />
          ) : selectedItem.type === "image" ? (
            <img
              src={DriveAPI.getStreamUrl(selectedItem.id)}
              alt={selectedItem.name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setPreviewItem(selectedItem)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <File className="w-12 h-12 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {selectedItem.type}
              </span>
            </div>
          )}
        </div>

        {/* Item Title */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white break-words">
            {selectedItem.name}
          </h4>
          <p className="text-xs text-slate-400 capitalize mt-0.5">
            {selectedItem.isFolder ? "Folder" : `${selectedItem.type} File`}
          </p>
        </div>

        {/* Metadata Properties */}
        <div className="space-y-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-400 block mb-0.5">Storage Size</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {formatBytes(selectedItem.size)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Storage Source</span>
            {selectedItem.source_type === "telegram_post" ? (
              <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                <Send className="w-3 h-3" />
                Channel: {selectedItem.telegram_channel_title || "Telegram"}
              </span>
            ) : (
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Telegram Bot Storage Channel
              </span>
            )}
          </div>

          {selectedItem.telegram_post_url && (
            <div>
              <span className="text-slate-400 block mb-0.5">Original Post</span>
              <a
                href={selectedItem.telegram_post_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline flex items-center gap-1 truncate"
              >
                <span>View on Telegram</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}

          <div>
            <span className="text-slate-400 block mb-0.5">Last Modified</span>
            <span className="text-slate-700 dark:text-slate-300">
              {new Date(selectedItem.updated_at).toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Created Date</span>
            <span className="text-slate-700 dark:text-slate-300">
              {new Date(selectedItem.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!selectedItem.isFolder && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            onClick={() => setPreviewItem(selectedItem)}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-500/20"
          >
            Preview / Play
          </button>
          <a
            href={DriveAPI.getDownloadUrl(selectedItem.id)}
            download={selectedItem.name}
            className="w-full py-2 rounded-xl bg-slate-100 dark:bg-[#282a2c] hover:bg-slate-200 dark:hover:bg-[#323437] text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      )}
    </aside>
  );
}
