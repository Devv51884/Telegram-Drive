import React, { useState, useEffect } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  Shield,
  ArrowLeft,
  Users,
  HardDrive,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Trash2,
  Lock,
  UserCheck,
  UserX,
  ShieldCheck,
  ShieldAlert,
  Server,
  Radio,
  Eye,
  Film,
  Image as ImageIcon,
  Music,
  File as FileIcon,
  Archive,
  ExternalLink,
  ChevronRight,
  Database,
  Cloud,
  Layers,
  Clock,
  Sparkles
} from "lucide-react";

export default function AdminPage() {
  const { currentUser, setSection, showToast, refresh, setPreviewItem, setActiveModal } = useDrive();
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'users', 'files', 'system', 'security'
  const [loading, setLoading] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [filesTotal, setFilesTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [pingResult, setPingResult] = useState(null);
  const [pinging, setPinging] = useState(false);

  // Password reset modal state
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const isAdmin = currentUser?.role === "admin" || currentUser?.email === "devv5412@gmail.com";

  useEffect(() => {
    if (isAdmin) {
      fetchOverview();
      if (activeTab === "users") fetchUsers();
      if (activeTab === "files") fetchFiles();
    }
  }, [activeTab, isAdmin]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await DriveAPI.getAdminOverview();
      if (res.success) {
        setOverviewData(res.data);
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to load admin overview", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await DriveAPI.getAdminUsers();
      if (res.success) {
        setUsersList(res.users);
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await DriveAPI.getAdminFiles({
        search: fileSearch,
        type: fileTypeFilter,
        limit: 50
      });
      if (res.success) {
        setFilesList(res.files);
        setFilesTotal(res.total);
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to fetch files", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await DriveAPI.updateUserRole(userId, newRole);
      if (res.success) {
        showToast(res.message || "User role updated successfully");
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update role", "error");
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    try {
      const res = await DriveAPI.updateUserStatus(userId, newStatus);
      if (res.success) {
        showToast(res.message || "User status updated successfully");
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update status", "error");
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resettingUser || !newPassword) return;
    try {
      const res = await DriveAPI.adminResetPassword(resettingUser.id, newPassword);
      if (res.success) {
        showToast(res.message || "Password reset successfully");
        setResettingUser(null);
        setNewPassword("");
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to reset password", "error");
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}" and all their files from TeleDrive?`)) {
      return;
    }
    try {
      const res = await DriveAPI.deleteAdminUser(userId);
      if (res.success) {
        showToast(res.message || "User deleted");
        fetchUsers();
        fetchOverview();
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete user", "error");
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}" from Cloud & Database?`)) {
      return;
    }
    try {
      const res = await DriveAPI.deleteAdminFile(fileId);
      if (res.success) {
        showToast(res.message || "File deleted");
        fetchFiles();
        fetchOverview();
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete file", "error");
    }
  };

  const handlePing = async () => {
    setPinging(true);
    try {
      const res = await DriveAPI.pingTelegramSystem();
      if (res.success) {
        setPingResult(res);
        showToast(`Ping: MTProto ${res.mtprotoPingMs}ms | Bot ${res.botPingMs}ms`);
      }
    } catch (err) {
      showToast("Ping test failed", "error");
    } finally {
      setPinging(false);
    }
  };

  const formatBytes = (bytes) => {
    const num = Number(bytes);
    if (!num || num <= 0 || isNaN(num) || !isFinite(num)) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(num) / Math.log(k))));
    return parseFloat((num / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // If user is not admin, show 403 Forbidden Access Screen
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#131314] p-6 text-center animate-in fade-in duration-200">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-5 shadow-xl border border-rose-200 dark:border-rose-800">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
          403 - Admin Privileges Required
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
          This portal is reserved strictly for TeleDrive Administrators. Your account (
          <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser?.email}</span>
          ) does not have administrator privileges.
        </p>
        <button
          onClick={() => setSection("my_drive")}
          className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to My Drive</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#131314] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Admin Navigation Bar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f20] px-4 md:px-8 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSection("my_drive")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#282a2c] hover:bg-slate-200 dark:hover:bg-[#323437] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200/80 dark:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Admin</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:border-slate-700" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-slate-800 dark:text-white tracking-tight">
                  TeleDrive Admin Control Center
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  Owner Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Full infrastructure management, live analytics & user controls
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Badges & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePing}
            disabled={pinging}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 transition-all hover:bg-emerald-100"
            title="Ping Telegram MTProto Gateway"
          >
            <Radio className={`w-3.5 h-3.5 ${pinging ? "animate-spin" : ""}`} />
            <span>{pingResult ? `MTProto: ${pingResult.mtprotoPingMs}ms` : "Test Gateway"}</span>
          </button>

          <button
            onClick={() => {
              fetchOverview();
              if (activeTab === "users") fetchUsers();
              if (activeTab === "files") fetchFiles();
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#282a2c] hover:bg-slate-200 dark:hover:bg-[#323437] text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/80 dark:border-slate-700"
            title="Refresh All Admin Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Admin Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Admin Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1f20] p-3 flex flex-col justify-between flex-shrink-0 overflow-y-auto">
          <div className="space-y-1.5">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </p>

            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "overview"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#282a2c] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Overview & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "users"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#282a2c] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </button>

            <button
              onClick={() => setActiveTab("files")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "files"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#282a2c] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Global File Explorer</span>
            </button>

            <button
              onClick={() => setActiveTab("system")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                activeTab === "system"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#282a2c] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Server className="w-4 h-4" />
              <span>System & Gateway Health</span>
            </button>
          </div>

          {/* Quick Admin User Badge */}
          <div className="p-3 bg-slate-50 dark:bg-[#282a2c] rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-purple-500 text-white flex items-center justify-center font-bold text-xs">
                {currentUser?.name?.charAt(0) || "A"}
              </div>
              <div className="truncate">
                <p className="font-bold text-slate-800 dark:text-white truncate">
                  {currentUser?.name}
                </p>
                <p className="text-[10px] text-purple-500 font-bold truncate">Super Administrator</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Admin Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-[#161718] space-y-6">
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === "overview" && overviewData && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
              {/* Stat Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">
                    {overviewData.totalUsers}
                  </p>
                  <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Full access enabled
                  </p>
                </div>

                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Cloud Files</span>
                    <FileText className="w-5 h-5 text-indigo-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">
                    {overviewData.totalFiles}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {overviewData.totalUploaded} uploaded • {overviewData.totalImports} imported
                  </p>
                </div>

                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Cloud Storage Used</span>
                    <HardDrive className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">
                    {formatBytes(overviewData.totalStorage)}
                  </p>
                  <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5" /> Free Unlimited Storage
                  </p>
                </div>

                <div className="bg-white dark:bg-[#1e1f20] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Today's Traffic</span>
                    <Activity className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">
                    {formatBytes(overviewData.todayBandwidth)}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {overviewData.todayUploads} new uploads today
                  </p>
                </div>
              </div>

              {/* Infrastructure Gateway Cards */}
              <div className="bg-white dark:bg-[#1e1f20] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-500" />
                  Infrastructure & Connected Gateways
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-[#282a2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Telegram Bot Uploads</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {overviewData.systemHealth?.bot?.username
                          ? `@${overviewData.systemHealth.bot.username}`
                          : "Telegram Bot API"}
                      </p>
                    </div>
                    {overviewData.systemHealth?.bot?.connected ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-xl">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-3 py-1 rounded-xl">
                        <AlertCircle className="w-3.5 h-3.5" /> Offline
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-[#282a2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">MTProto Multi-DC Streamer</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {overviewData.systemHealth?.mtproto?.user?.firstName || "Multi-DC GramJS"}
                      </p>
                    </div>
                    {overviewData.systemHealth?.mtproto?.connected ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-xl">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-xl">
                        <AlertCircle className="w-3.5 h-3.5" /> Unlinked
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-[#282a2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">Bot Storage Channel</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {overviewData.systemHealth?.storageChannelId}
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-3 py-1 rounded-xl">
                      <Radio className="w-3.5 h-3.5" /> Connected
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Global Activity Table */}
              <div className="bg-white dark:bg-[#1e1f20] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Recent Uploads Across All Users
                  </h3>
                  <button
                    onClick={() => setActiveTab("files")}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <span>View All Files</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                        <th className="pb-3">File Name</th>
                        <th className="pb-3">Owner</th>
                        <th className="pb-3">Size</th>
                        <th className="pb-3">Source</th>
                        <th className="pb-3">Upload Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {overviewData.recentFiles?.map((file) => (
                        <tr key={file.id} className="hover:bg-slate-50 dark:hover:bg-[#282a2c] transition-colors">
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 truncate max-w-sm">
                            {file.type === "video" ? (
                              <Film className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : file.type === "image" ? (
                              <ImageIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{file.name}</span>
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-400">
                            {file.user_name || "Owner"}
                          </td>
                          <td className="py-3 text-slate-500 dark:text-slate-400">
                            {formatBytes(file.size)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                file.source_type === "upload"
                                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                                  : "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                              }`}
                            >
                              {file.source_type === "upload" ? "Direct Upload" : "Telegram Import"}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400">
                            {new Date(file.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === "users" && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    {filteredUsers.length} Total Users Registered
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1e1f20] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#282a2c] border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">User Account</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Files & Storage</th>
                      <th className="p-4">2FA Security</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-[#242628] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white text-sm">{u.name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              u.role === "admin"
                                ? "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {u.role || "USER"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              u.status === "active"
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {u.status || "ACTIVE"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                          {u.file_count || 0} files ({formatBytes(u.storage_used)})
                        </td>
                        <td className="p-4">
                          {u.is_2fa_enabled ? (
                            <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Disabled</span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-purple-500 transition-colors"
                            title={u.role === "admin" ? "Demote to User" : "Promote to Admin"}
                          >
                            {u.role === "admin" ? (
                              <ShieldAlert className="w-4 h-4 text-purple-500" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-500 transition-colors"
                            title={u.status === "active" ? "Disable Account" : "Enable Account"}
                          >
                            {u.status === "active" ? (
                              <UserX className="w-4 h-4 text-amber-500" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-emerald-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingUser(u)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-500 transition-colors"
                            title="Reset User Password"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          {u.email !== "devv5412@gmail.com" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GLOBAL FILE EXPLORER */}
          {activeTab === "files" && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[260px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search all files by name or user..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchFiles()}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => {
                      setFileTypeFilter(e.target.value);
                      setTimeout(fetchFiles, 50);
                    }}
                    className="px-4 py-2.5 bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none shadow-sm"
                  >
                    <option value="all">All File Types</option>
                    <option value="video">Videos</option>
                    <option value="document">Documents</option>
                    <option value="image">Images</option>
                    <option value="audio">Audio</option>
                  </select>
                  <button
                    onClick={fetchFiles}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-semibold shadow-md transition-all"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1e1f20] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#282a2c] border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">File Name</th>
                      <th className="p-4">Owner</th>
                      <th className="p-4">Source Type</th>
                      <th className="p-4">File Size</th>
                      <th className="p-4">Telegram References</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filesList.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/80 dark:hover:bg-[#242628] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3 max-w-sm truncate">
                            {f.type === "video" ? (
                              <Film className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : f.type === "image" ? (
                              <ImageIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : f.type === "audio" ? (
                              <Music className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            ) : (
                              <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="font-bold text-slate-800 dark:text-white truncate">
                              {f.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                          {f.user_name || "Owner"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              f.source_type === "upload"
                                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                                : "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {f.source_type === "upload" ? "Direct Upload" : "TG Post Link"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-semibold">
                          {formatBytes(f.size)}
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-[11px]">
                          Msg #{f.telegram_message_id} • Channel {f.telegram_channel_id}
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(f)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-500 transition-colors"
                            title="Preview File"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(f.id, f.name)}
                            className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Force Delete File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM & GATEWAY HEALTH */}
          {activeTab === "system" && (
            <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-[#1e1f20] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      Telegram Latency & RPC Benchmarking
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Measure roundtrip ping times to Telegram MTProto and Bot API servers
                    </p>
                  </div>
                  <button
                    onClick={handlePing}
                    disabled={pinging}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-semibold shadow-md flex items-center gap-2 transition-all"
                  >
                    <Radio className={`w-3.5 h-3.5 ${pinging ? "animate-spin" : ""}`} />
                    <span>{pinging ? "Testing Ping..." : "Run Gateway Benchmark"}</span>
                  </button>
                </div>

                {pingResult && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 dark:bg-[#282a2c] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        MTProto Streaming Latency
                      </p>
                      <p className="text-3xl font-black text-emerald-500 mt-2">
                        {pingResult.mtprotoPingMs >= 0 ? `${pingResult.mtprotoPingMs} ms` : "Offline"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">Multi-DC Direct Connection</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#282a2c] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Bot API Response Latency
                      </p>
                      <p className="text-3xl font-black text-blue-500 mt-2">
                        {pingResult.botPingMs >= 0 ? `${pingResult.botPingMs} ms` : "Offline"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">HTTPS Bot Gateway</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Admin Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-white dark:bg-[#1e1f20] w-full max-w-sm rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                Admin Password Reset
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Set new password for <span className="font-semibold text-slate-700 dark:text-slate-200">{resettingUser.name}</span> ({resettingUser.email})
              </p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <input
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                minLength={6}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
