import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import { X, FolderInput, Folder, ChevronRight, ChevronDown, HardDrive } from "lucide-react";

export default function MoveModal() {
  const { activeModal, setActiveModal, modalTargetItem, folderTree, moveItem, bulkMove } = useDrive();
  const [selectedFolderId, setSelectedFolderId] = useState("root");
  const [expanded, setExpanded] = useState({ root: true });
  const [loading, setLoading] = useState(false);

  if (activeModal !== "move" || !modalTargetItem) return null;

  const isBulk = Boolean(modalTargetItem.isBulk);

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTreeItem = (folder, depth = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const isSelf = !isBulk && modalTargetItem.isFolder && modalTargetItem.id === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expanded[folder.id];

    if (isSelf) return null; // Cannot move folder into itself

    return (
      <div key={folder.id} className="select-none">
        <div
          onClick={() => setSelectedFolderId(folder.id)}
          className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
            isSelected
              ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#323437]"
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(folder.id, e)}
              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Folder
            className="w-4 h-4 flex-shrink-0"
            style={{ color: folder.color || "#4285f4" }}
          />
          <span className="truncate">{folder.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div>{folder.children.map((child) => renderTreeItem(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const handleMove = async () => {
    setLoading(true);
    if (isBulk) {
      await bulkMove(selectedFolderId);
    } else {
      await moveItem(modalTargetItem, selectedFolderId);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-[#282a2c] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Move to Folder
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">
                {isBulk
                  ? `Moving ${modalTargetItem.count} selected items`
                  : `Moving: ${modalTargetItem.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Folder Tree Selector */}
        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl p-2 bg-slate-50/50 dark:bg-[#1e1f20]/50 space-y-1">
          {/* Root Option */}
          <div
            onClick={() => setSelectedFolderId("root")}
            className={`flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
              selectedFolderId === "root"
                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#323437]"
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-500" />
            <span>My Drive (Root Directory)</span>
          </div>

          {/* Folder Branches */}
          {folderTree.map((folder) => renderTreeItem(folder, 1))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#323437] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            {loading ? "Moving..." : "Move Here"}
          </button>
        </div>
      </div>
    </div>
  );
}
