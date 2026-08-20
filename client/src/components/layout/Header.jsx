import React, { useState, useRef, useEffect } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import {
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Send,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Shield,
  X
} from "lucide-react";

export default function Header() {
  const {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    settings,
    setActiveModal,
    refresh,
    loading,
    currentUser,
    logoutUser
  } = useDrive();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f20] px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 w-64 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Send className="w-5 h-5 -rotate-12 translate-x-[-1px] translate-y-[1px]" />
        </div>
        <div>
          <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5">
            TeleDrive
            <span className="text-[10px] uppercase font-semibold tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded">
              Cloud
            </span>
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Telegram Cloud Storage</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex-1 max-w-2xl mx-4">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search in Drive or Telegram channel posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 text-sm bg-slate-100 dark:bg-[#282a2c] text-slate-800 dark:text-slate-200 placeholder-slate-400 rounded-full border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-[#1e1f20] outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Action Controls & User Profile */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Telegram Account Status Indicator */}
        <button
          onClick={() => setActiveModal("settings")}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#282a2c] hover:bg-slate-200 dark:hover:bg-[#323437] transition-colors border border-slate-200/60 dark:border-slate-700"
          title="Telegram Account"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              settings?.telegramUser?.connected
                ? "bg-emerald-500 animate-pulse"
                : "bg-blue-500"
            }`}
          />
          <span className="text-slate-700 dark:text-slate-300">
            {settings?.telegramUser?.connected
              ? `@${settings.telegramUser.info?.username || settings.telegramUser.info?.firstName || "Connected"}`
              : "Connect Telegram"}
          </span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282a2c] transition-colors disabled:opacity-50"
          title="Refresh Drive"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-[#282a2c] rounded-lg p-0.5 border border-slate-200/60 dark:border-slate-700">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "grid"
                ? "bg-white dark:bg-[#37393b] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "list"
                ? "bg-white dark:bg-[#37393b] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* User Account Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#282a2c] border border-slate-200 dark:border-slate-700 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {getInitials(currentUser?.name)}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
              {currentUser?.name || "My Account"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-[#282a2c] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
              {/* User Details */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="font-bold text-sm text-slate-800 dark:text-white truncate">
                  {currentUser?.name || "TeleDrive User"}
                </p>
                <p className="text-slate-400 text-[11px] truncate mt-0.5">
                  {currentUser?.email || "user@teledrive.cloud"}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    setActiveModal("settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#323437] transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Account & Telegram Settings</span>
                </button>
              </div>

              <div className="h-px bg-slate-100 dark:border-slate-700 my-1" />

              {/* Logout Button */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logoutUser();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
