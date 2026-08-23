import React, { useEffect, useRef } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  Eye,
  Download,
  Star,
  Edit2,
  FolderInput,
  Trash2,
  RotateCcw,
  Info,
  ExternalLink,
  FolderOpen,
  Share2
} from "lucide-react";

export default function ContextMenu({ x, y, item, onClose }) {
  const menuRef = useRef(null);
  const {
    openFolder,
    setPreviewItem,
    setActiveModal,
    setModalTargetItem,
    toggleStar,
    trashItem,
    restoreItem,
    deletePermanent,
    section,
    setIsDetailsOpen,
    openShareModal
  } = useDrive();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!item) return null;

  return (
    <div
      ref={menuRef}
      style={{ top: `${y}px`, left: `${x}px` }}
      className="fixed z-50 w-56 bg-white dark:bg-[#282a2c] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100"
    >
      {item.isFolder ? (
        <button
          onClick={() => {
            openFolder(item.id);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
        >
          <FolderOpen className="w-4 h-4 text-blue-500" />
          <span>Open Folder</span>
        </button>
      ) : (
        <>
          <button
            onClick={() => {
              setPreviewItem(item);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left font-medium text-blue-600 dark:text-blue-400"
          >
            <Eye className="w-4 h-4" />
            <span>Preview / Play</span>
          </button>
          <a
            href={DriveAPI.getDownloadUrl(item.id)}
            download={item.name}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download</span>
          </a>
        </>
      )}

      {item.telegram_post_url && (
        <a
          href={item.telegram_post_url}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left text-sky-600 dark:text-sky-400"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Original Telegram Post</span>
        </a>
      )}

      {/* Share / Get Link */}
      <button
        onClick={() => {
          openShareModal(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left font-medium text-emerald-600 dark:text-emerald-400"
      >
        <Share2 className="w-4 h-4" />
        <span>Share / Get link</span>
      </button>

      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

      {/* Star / Unstar */}
      <button
        onClick={() => {
          toggleStar(item);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
      >
        <Star
          className={`w-4 h-4 ${
            item.is_starred ? "fill-amber-400 text-amber-500" : "text-slate-500"
          }`}
        />
        <span>{item.is_starred ? "Remove from Starred" : "Add to Starred"}</span>
      </button>

      {/* Rename */}
      <button
        onClick={() => {
          setModalTargetItem(item);
          setActiveModal("rename");
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
      >
        <Edit2 className="w-4 h-4 text-slate-500" />
        <span>Rename</span>
      </button>

      {/* Move to */}
      <button
        onClick={() => {
          setModalTargetItem(item);
          setActiveModal("move");
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
      >
        <FolderInput className="w-4 h-4 text-slate-500" />
        <span>Move to...</span>
      </button>

      {/* Details */}
      <button
        onClick={() => {
          setIsDetailsOpen(true);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
      >
        <Info className="w-4 h-4 text-slate-500" />
        <span>File info & details</span>
      </button>

      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

      {/* Trash or Restore / Delete Forever */}
      {section === "trash" ? (
        <>
          <button
            onClick={() => {
              restoreItem(item);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left text-emerald-600"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore</span>
          </button>
          <button
            onClick={() => {
              deletePermanent(item);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left text-rose-600"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete forever</span>
          </button>
        </>
      ) : (
        <button
          onClick={() => {
            trashItem(item);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left text-rose-600"
        >
          <Trash2 className="w-4 h-4" />
          <span>Move to trash</span>
        </button>
      )}
    </div>
  );
}
