import React from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import {
  HardDrive,
  Users,
  Star,
  Plus,
  Settings,
  Send,
  Trash2
} from "lucide-react";

export default function BottomNav() {
  const {
    section,
    navigateToSection,
    setActiveModal,
    isMobileSidebarOpen
  } = useDrive();

  // If mobile sidebar drawer is open, don't overlap
  if (isMobileSidebarOpen) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl safe-area-pb">
      {/* 1. My Drive */}
      <button
        onClick={() => navigateToSection("my_drive")}
        className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
          section === "my_drive"
            ? "text-blue-600 dark:text-blue-400 font-bold scale-105"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <HardDrive className="w-5 h-5" />
        <span className="text-[10px]">Drive</span>
      </button>

      {/* 2. Shared with me */}
      <button
        onClick={() => navigateToSection("shared_with_me")}
        className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
          section === "shared_with_me"
            ? "text-blue-600 dark:text-blue-400 font-bold scale-105"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <Users className="w-5 h-5" />
        <span className="text-[10px]">Shared</span>
      </button>

      {/* 3. Central "+ New" Quick Action Button */}
      <button
        onClick={() => setActiveModal("upload")}
        className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-transform -mt-3 border-2 border-white dark:border-[#1e1f20]"
        title="Upload File"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* 4. Channel Imports */}
      <button
        onClick={() => navigateToSection("telegram_imports")}
        className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
          section === "telegram_imports"
            ? "text-blue-600 dark:text-blue-400 font-bold scale-105"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <Send className="w-5 h-5" />
        <span className="text-[10px]">Imports</span>
      </button>

      {/* 5. Settings */}
      <button
        onClick={() => navigateToSection("settings")}
        className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all ${
          section === "settings"
            ? "text-blue-600 dark:text-blue-400 font-bold scale-105"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px]">Settings</span>
      </button>
    </div>
  );
}
