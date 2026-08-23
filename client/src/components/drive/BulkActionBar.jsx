import React from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import {
  FolderInput,
  Star,
  Trash2,
  RotateCcw,
  X,
  CheckSquare,
  Sparkles,
  AlertTriangle
} from "lucide-react";

export default function BulkActionBar() {
  const {
    selectedItems,
    isMultiSelectMode,
    clearSelection,
    selectAll,
    bulkTrash,
    bulkRestore,
    bulkDeletePermanently,
    bulkToggleStar,
    setActiveModal,
    setModalTargetItem,
    section
  } = useDrive();

  if (!selectedItems || selectedItems.length === 0 || (!isMultiSelectMode && selectedItems.length <= 1)) return null;

  const count = selectedItems.length;
  const isTrashSection = section === "trash";
  const anyUnstarred = selectedItems.some((i) => !i.is_starred);

  const handleOpenBulkMove = () => {
    setModalTargetItem({ isBulk: true, count, items: selectedItems });
    setActiveModal("move");
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-max animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-1.5 sm:gap-3 bg-slate-900/95 dark:bg-[#1e1f20]/95 backdrop-blur-xl border border-slate-700/70 shadow-2xl px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-white overflow-x-auto max-w-full">
        {/* Count chip */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-700/80">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">
            {count}
          </div>
          <span className="text-xs font-semibold hidden sm:inline text-slate-200">
            {count} {count === 1 ? "item" : "items"} selected
          </span>
        </div>

        {/* Select All */}
        <button
          onClick={selectAll}
          className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
          title="Select all items in this view"
        >
          <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">Select All</span>
        </button>

        {/* Action: Move To */}
        {!isTrashSection && (
          <button
            onClick={handleOpenBulkMove}
            className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
            title="Move selected items to folder"
          >
            <FolderInput className="w-3.5 h-3.5 text-indigo-400" />
            <span>Move</span>
          </button>
        )}

        {/* Action: Star / Unstar */}
        {!isTrashSection && (
          <button
            onClick={bulkToggleStar}
            className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
            title={anyUnstarred ? "Star selected items" : "Unstar selected items"}
          >
            <Star className={`w-3.5 h-3.5 ${anyUnstarred ? "text-amber-400" : "fill-amber-400 text-amber-400"}`} />
            <span className="hidden sm:inline">{anyUnstarred ? "Star" : "Unstar"}</span>
          </button>
        )}

        {/* Action: Trash / Restore */}
        {isTrashSection ? (
          <button
            onClick={bulkRestore}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            title="Restore selected items"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore</span>
          </button>
        ) : (
          <button
            onClick={bulkTrash}
            className="px-2.5 py-1.5 rounded-xl hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 text-xs font-medium transition-all flex items-center gap-1.5"
            title="Move selected items to trash"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash</span>
          </button>
        )}

        {/* Action: Permanent Delete */}
        <button
          onClick={bulkDeletePermanently}
          className="px-2.5 py-1.5 rounded-xl hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
          title="Permanently delete selected items"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Delete Forever</span>
        </button>

        {/* Deselect / Close */}
        <button
          onClick={clearSelection}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all ml-1"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
