import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import {
  Plus,
  FolderPlus,
  Upload,
  Link2,
  HardDrive,
  Users,
  Star,
  Trash2,
  Send,
  Cloud,
  CheckCircle2,
  UserCheck,
  Lock,
  Shield,
  Settings,
  X
} from "lucide-react";

export default function Sidebar() {
  const {
    section,
    navigateToSection,
    stats,
    settings,
    setActiveModal,
    currentUser,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen
  } = useDrive();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isAdmin = currentUser?.role === "admin" || currentUser?.email === "devv5412@gmail.com";

  const handleNavClick = (sectionName) => {
    navigateToSection(sectionName);
    setIsMobileSidebarOpen(false);
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full p-3 space-y-4">
      <div className="space-y-4">
        {/* Mobile Header with Close Button */}
        {isMobile && (
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="TeleDrive"
                className="w-8 h-8 rounded-xl object-contain shadow-md shadow-blue-500/20"
              />
              <span className="font-bold text-base text-slate-800 dark:text-white">TeleDrive</span>
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#282a2c]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* "+ New" Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white dark:bg-[#282a2c] text-slate-800 dark:text-white font-medium text-sm shadow-md hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#323437] w-full"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white">
              <Plus className="w-4 h-4" />
            </div>
            <span>New</span>
          </button>

          {isNewMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNewMenuOpen(false)}
              />
              <div className="absolute top-14 left-0 w-60 bg-white dark:bg-[#282a2c] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    if (isMobile) setIsMobileSidebarOpen(false);
                    setActiveModal("new_folder");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
                >
                  <FolderPlus className="w-4 h-4 text-blue-500" />
                  <span>New Folder</span>
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    if (isMobile) setIsMobileSidebarOpen(false);
                    setActiveModal("upload");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
                >
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Upload Files to Cloud</span>
                </button>
                <button
                  onClick={() => {
                    setIsNewMenuOpen(false);
                    if (isMobile) setIsMobileSidebarOpen(false);
                    setActiveModal("import_link");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
                >
                  <Link2 className="w-4 h-4 text-sky-500" />
                  <span>Import via Stream / Channel Link</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-1">
          {/* My Drive */}
          <div
            onClick={() => handleNavClick("my_drive")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              section === "my_drive"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282a2c]"
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-500" />
            <span>My Drive</span>
          </div>

          {/* Shared with me */}
          <div
            onClick={() => handleNavClick("shared_with_me")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              section === "shared_with_me"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282a2c]"
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>Shared with me</span>
          </div>

          {/* Imported Media */}
          <div
            onClick={() => handleNavClick("telegram_imports")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              section === "telegram_imports"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282a2c]"
            }`}
          >
            <Send className="w-4 h-4 text-sky-500" />
            <span>Imported Media</span>
          </div>

          {/* Starred */}
          <div
            onClick={() => handleNavClick("starred")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              section === "starred"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282a2c]"
            }`}
          >
            <Star className="w-4 h-4 text-amber-500" />
            <span>Starred</span>
          </div>

          {/* Trash */}
          <div
            onClick={() => handleNavClick("trash")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              section === "trash"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282a2c]"
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Trash</span>
          </div>

          {/* Account Settings */}
          <div
            onClick={() => handleNavClick("settings")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors ${
              section === "settings"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282a2c]"
            }`}
          >
            <Settings className="w-4 h-4 text-blue-500" />
            <span>Account Settings</span>
          </div>

          {/* Admin Panel Button */}
          {isAdmin && (
            <div
              onClick={() => handleNavClick("admin")}
              className={`flex items-center gap-3 px-4 py-2.5 mt-2 rounded-full text-sm font-medium cursor-pointer transition-all ${
                section === "admin"
                  ? "bg-purple-600 text-white font-semibold shadow-md shadow-purple-500/20"
                  : "bg-gradient-to-r from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20"
              }`}
            >
              <Shield className="w-4 h-4 text-purple-500" />
              <span className="font-semibold">Admin Panel</span>
            </div>
          )}
        </nav>
      </div>

      {/* Storage Indicator, Cloud Account & Lock Button */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {/* Storage Widget */}
        <div className="bg-slate-50 dark:bg-[#282a2c] p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-blue-500" />
              Storage
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">Unlimited</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {formatBytes(stats?.totalBytes)} stored in TeleDrive Cloud
          </p>

          {/* Storage mini progress bar */}
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500 w-2/5" title="Videos & Photos" />
            <div className="h-full bg-emerald-500 w-1/4" title="PDFs & Documents" />
            <div className="h-full bg-purple-500 w-1/5" title="Audio" />
            <div className="h-full bg-amber-500 w-1/10" title="Other" />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
            {stats?.totalFiles || 0} files in {stats?.totalFolders || 0} folders
          </p>
        </div>

        {/* Cloud Connection Widget & Lock button */}
        <div className="flex items-center gap-2">
          <div
            onClick={() => handleNavClick("settings")}
            className="flex-1 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2">
              {settings?.telegramUser?.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <UserCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
              <div className="truncate">
                <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {settings?.telegramUser?.connected
                    ? (settings.telegramUser.username || (settings.telegramUser.info?.username ? `@${settings.telegramUser.info.username.replace(/^@/, '')}` : null) || settings.telegramUser.info?.firstName || "Cloud Node")
                    : "Connect Cloud Node"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {settings?.telegramUser?.connected
                    ? (settings.telegramUser.phoneNumber ? `Phone: ${settings.telegramUser.phoneNumber}` : "Connected")
                    : "Click to connect cloud sync"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNavClick("settings")}
            title="Account & Security Settings"
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-[#282a2c] transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Permanent Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 h-[calc(100vh-4rem)] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f20] flex-col justify-between flex-shrink-0 overflow-y-auto">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile & Tablet Off-Canvas Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Slide-In Sidebar Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#1e1f20] shadow-2xl z-50 animate-in slide-in-from-left duration-200 flex flex-col overflow-y-auto border-r border-slate-200 dark:border-slate-800">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
