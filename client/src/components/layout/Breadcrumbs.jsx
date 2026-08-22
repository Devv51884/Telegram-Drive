import React from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  ChevronRight,
  Eye,
  Download,
  Star,
  Edit2,
  FolderInput,
  Trash2,
  RotateCcw,
  Info,
  Film,
  Image as ImageIcon,
  FileText,
  Music,
  Files,
  Trash
} from "lucide-react";

export default function Breadcrumbs() {
  const {
    breadcrumbs,
    openFolder,
    section,
    selectedItem,
    setSelectedItem,
    typeFilter,
    setTypeFilter,
    setActiveModal,
    setModalTargetItem,
    setPreviewItem,
    toggleStar,
    trashItem,
    restoreItem,
    deletePermanent,
    emptyTrash,
    isDetailsOpen,
    setIsDetailsOpen
  } = useDrive();

  const typeButtons = [
    { key: "all", label: "All", icon: Files },
    { key: "video", label: "Videos", icon: Film },
    { key: "image", label: "Photos", icon: ImageIcon },
    { key: "pdf", label: "PDFs", icon: FileText },
    { key: "audio", label: "Audio", icon: Music },
    { key: "document", label: "Docs", icon: FileText }
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f20] px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
      {/* Breadcrumb Navigation Trail */}
      <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm flex-wrap max-w-full">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <React.Fragment key={crumb.id || idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />}
              <button
                onClick={() => {
                  if (crumb.id === "root" || crumb.id.startsWith("f_") || crumb.id.startsWith("f-")) {
                    openFolder(crumb.id);
                  }
                }}
                className={`font-medium transition-colors px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg truncate max-w-[120px] sm:max-w-[200px] ${
                  isLast
                    ? "text-slate-900 dark:text-white font-semibold cursor-default"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#282a2c]"
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Selected Item Action Toolbar or Filter Chips */}
      {selectedItem ? (
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-[#282a2c] p-1 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100 max-w-full overflow-x-auto">
          <span className="text-xs font-semibold px-2 text-slate-600 dark:text-slate-300 truncate max-w-[100px] sm:max-w-[150px]">
            {selectedItem.name}
          </span>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-0.5 sm:mx-1 flex-shrink-0" />

          {/* Preview (for files) */}
          {!selectedItem.isFolder && (
            <button
              onClick={() => setPreviewItem(selectedItem)}
              className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#37393b] hover:text-blue-500 transition-colors flex-shrink-0"
              title="Preview / Play"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Download (for files) */}
          {!selectedItem.isFolder && (
            <a
              href={DriveAPI.getDownloadUrl(selectedItem.id)}
              download={selectedItem.name}
              target="_blank"
              rel="noreferrer"
              className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#37393b] hover:text-blue-500 transition-colors inline-flex flex-shrink-0"
              title="Download"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
          )}

          {/* Star / Favorite */}
          <button
            onClick={() => toggleStar(selectedItem)}
            className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#37393b] hover:text-amber-500 transition-colors flex-shrink-0"
            title={selectedItem.is_starred ? "Unstar" : "Star"}
          >
            <Star
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                selectedItem.is_starred ? "fill-amber-400 text-amber-500" : ""
              }`}
            />
          </button>

          {/* Rename */}
          <button
            onClick={() => {
              setModalTargetItem(selectedItem);
              setActiveModal("rename");
            }}
            className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#37393b] hover:text-blue-500 transition-colors flex-shrink-0"
            title="Rename"
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Move to... */}
          <button
            onClick={() => {
              setModalTargetItem(selectedItem);
              setActiveModal("move");
            }}
            className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#37393b] hover:text-blue-500 transition-colors flex-shrink-0"
            title="Move to..."
          >
            <FolderInput className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Trash or Restore / Delete Forever */}
          {section === "trash" ? (
            <>
              <button
                onClick={() => restoreItem(selectedItem)}
                className="p-1 sm:p-1.5 rounded-lg text-emerald-600 hover:bg-white dark:hover:bg-[#37393b] transition-colors flex-shrink-0"
                title="Restore"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => deletePermanent(selectedItem)}
                className="p-1 sm:p-1.5 rounded-lg text-rose-600 hover:bg-white dark:hover:bg-[#37393b] transition-colors flex-shrink-0"
                title="Delete Forever"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => trashItem(selectedItem)}
              className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#37393b] hover:text-rose-500 transition-colors flex-shrink-0"
              title="Move to Trash"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Details toggle */}
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className={`p-1 sm:p-1.5 rounded-lg transition-colors flex-shrink-0 ${
              isDetailsOpen
                ? "bg-blue-500 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#37393b]"
            }`}
            title="View Details"
          >
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      ) : section === "trash" ? (
        <button
          onClick={emptyTrash}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors"
        >
          <Trash className="w-3.5 h-3.5" />
          Empty Trash
        </button>
      ) : (
        /* Filter chips */
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5 no-scrollbar">
          {typeButtons.map((tb) => {
            const Icon = tb.icon;
            const isActive = typeFilter === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTypeFilter(tb.key)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-all flex-shrink-0 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "bg-slate-100 dark:bg-[#282a2c] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#323437]"
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                <span>{tb.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
