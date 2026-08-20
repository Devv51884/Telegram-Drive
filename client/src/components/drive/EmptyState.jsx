import React from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import { FolderPlus, Upload, Link2, Folder, HardDrive, Star, Trash2 } from "lucide-react";

export default function EmptyState() {
  const { section, setActiveModal, searchQuery } = useDrive();

  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#282a2c] flex items-center justify-center text-slate-400 mb-4">
          <HardDrive className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
          No results found
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          No files or folders matched your search "{searchQuery}".
        </p>
      </div>
    );
  }

  if (section === "starred") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 mb-4">
          <Star className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
          No starred files or folders
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Add stars to items you want to access easily anytime.
        </p>
      </div>
    );
  }

  if (section === "trash") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#282a2c] flex items-center justify-center text-slate-400 mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Trash is empty
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Items moved to trash will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500 mb-4">
        <Folder className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
        This folder is empty
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6">
        Upload files to your Telegram Cloud storage or import media links directly from your subscribed Telegram channels.
      </p>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <button
          onClick={() => setActiveModal("upload")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Upload File to Telegram</span>
        </button>

        <button
          onClick={() => setActiveModal("import_link")}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#282a2c] hover:bg-slate-200 dark:hover:bg-[#323437] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
        >
          <Link2 className="w-4 h-4 text-sky-500" />
          <span>Import Telegram Link</span>
        </button>

        <button
          onClick={() => setActiveModal("new_folder")}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#282a2c] hover:bg-slate-200 dark:hover:bg-[#323437] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
        >
          <FolderPlus className="w-4 h-4 text-amber-500" />
          <span>New Folder</span>
        </button>
      </div>
    </div>
  );
}
