import React, { useState, useEffect } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  Shield,
  X,
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
  ExternalLink
} from "lucide-react";

export default function AdminPanelModal() {
  const { activeModal, setActiveModal, currentUser, showToast } = useDrive();
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'users', 'files', 'system'
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

  // Reset password modal state
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const isOpen = activeModal === "admin";

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
      if (activeTab === "users") fetchUsers();
      if (activeTab === "files") fetchFiles();
    }
  }, [isOpen, activeTab]);

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
        showToast(res.message || "User role updated");
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
        showToast(res.message || "User status updated");
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
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}" and all their files?`)) {
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
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}"?`)) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1e1f20] w-full max-w-5xl h-[88vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-50/50 dark:bg-[#282a2c]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                  TeleDrive Admin Panel
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  v1.2 Control Center
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage users, system storage, Telegram Cloud infrastructure & global files
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchOverview();
                if (activeTab === "users") fetchUsers();
                if (activeTab === "files") fetchFiles();
              }}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-shrink-0 bg-slate-100/50 dark:bg-[#18191a]/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "overview"
                ? "bg-white dark:bg-[#282a2c] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview & Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-white dark:bg-[#282a2c] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Management</span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "files"
                ? "bg-white dark:bg-[#282a2c] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Global File Explorer</span>
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "system"
                ? "bg-white dark:bg-[#282a2c] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>System Health</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && overviewData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-[#282a2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Total Users</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {overviewData.totalUsers}
                  </p>
                  <p className="text-[10px] text-emerald-500 font-medium mt-1">
                    Active & Registered
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-[#282a2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Cloud Files</span>
                    <FileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {overviewData.totalFiles}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    {overviewData.totalUploaded} uploaded • {overviewData.totalImports} imported
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-[#282a2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Storage Consumed</span>
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {formatBytes(overviewData.totalStorage)}
                  </p>
                  <p className="text-[10px] text-emerald-500 font-medium mt-1">
                    Unlimited Telegram Cloud
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-[#282a2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold">Today's Bandwidth</span>
                    <Activity className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {formatBytes(overviewData.todayBandwidth)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    {overviewData.todayUploads} new uploads today
                  </p>
                </div>
              </div>

              {/* Infrastructure Status */}
              <div className="bg-slate-50 dark:bg-[#282a2c] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Infrastructure & Connected Gateways
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-[#1e1f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">
                        Telegram Bot API
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {overviewData.systemHealth?.bot?.username
                          ? `@${overviewData.systemHealth.bot.username}`
                          : "Bot Upload Channel"}
                      </p>
                    </div>
                    {overviewData.systemHealth?.bot?.connected ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3 h-3" />
                        Offline
                      </span>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#1e1f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">
                        MTProto Streaming
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {overviewData.systemHealth?.mtproto?.user?.firstName || "Multi-DC Client"}
                      </p>
                    </div>
                    {overviewData.systemHealth?.mtproto?.connected ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3 h-3" />
                        Not Logged In
                      </span>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#1e1f20] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">
                        Storage Channel
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {overviewData.systemHealth?.storageChannelId}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                      <Radio className="w-3 h-3" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Uploads Table */}
              <div className="bg-slate-50 dark:bg-[#282a2c] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Recent Global Uploads
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700/60 text-slate-400">
                        <th className="pb-2 font-semibold">File Name</th>
                        <th className="pb-2 font-semibold">Owner</th>
                        <th className="pb-2 font-semibold">Size</th>
                        <th className="pb-2 font-semibold">Type</th>
                        <th className="pb-2 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {overviewData.recentFiles?.map((file) => (
                        <tr key={file.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-2.5 font-medium flex items-center gap-2 truncate max-w-xs">
                            <span className="truncate">{file.name}</span>
                          </td>
                          <td className="py-2.5 text-slate-500">{file.user_name || "Owner"}</td>
                          <td className="py-2.5 text-slate-400">{formatBytes(file.size)}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {file.type || "file"}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400">
                            {new Date(file.created_at).toLocaleDateString()}
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  {filteredUsers.length} Users Total
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#282a2c] rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-[#18191a]/70 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Files / Storage</th>
                      <th className="p-3.5">2FA</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-100/50 dark:hover:bg-[#242628]">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                              {u.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === "admin"
                                ? "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {u.role?.toUpperCase() || "USER"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === "active"
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {u.status?.toUpperCase() || "ACTIVE"}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {u.file_count || 0} files ({formatBytes(u.storage_used)})
                        </td>
                        <td className="p-3.5">
                          {u.is_2fa_enabled ? (
                            <span className="text-emerald-500 font-bold text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Enabled
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Disabled</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-500 transition-colors"
                            title={u.role === "admin" ? "Demote to User" : "Promote to Admin"}
                          >
                            {u.role === "admin" ? (
                              <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-amber-500 transition-colors"
                            title={u.status === "active" ? "Disable Account" : "Enable Account"}
                          >
                            {u.status === "active" ? (
                              <UserX className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingUser(u)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-500 transition-colors"
                            title="Reset Password"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          {u.email !== "devv5412@gmail.com" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search all files..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchFiles()}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={fileTypeFilter}
                    onChange={(e) => {
                      setFileTypeFilter(e.target.value);
                      setTimeout(fetchFiles, 50);
                    }}
                    className="px-3 py-2 bg-slate-50 dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="all">All File Types</option>
                    <option value="video">Videos</option>
                    <option value="document">Documents</option>
                    <option value="image">Images</option>
                    <option value="audio">Audio</option>
                  </select>
                  <button
                    onClick={fetchFiles}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Filter
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-[#282a2c] rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-[#18191a]/70 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-3.5">File</th>
                      <th className="p-3.5">Owner</th>
                      <th className="p-3.5">Source</th>
                      <th className="p-3.5">Size</th>
                      <th className="p-3.5">Telegram IDs</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                    {filesList.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-100/50 dark:hover:bg-[#242628]">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2 max-w-xs truncate">
                            {f.type === "video" ? (
                              <Film className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : f.type === "image" ? (
                              <ImageIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : f.type === "audio" ? (
                              <Music className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            ) : (
                              <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 dark:text-white truncate">
                              {f.name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-500">{f.user_name || "Owner"}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              f.source_type === "upload"
                                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                                : "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {f.source_type === "upload" ? "Direct Upload" : "TG Import"}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">{formatBytes(f.size)}</td>
                        <td className="p-3.5 text-slate-400 font-mono text-[10px]">
                          Msg #{f.telegram_message_id} • Chan {f.telegram_channel_id}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(f.id, f.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Force Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM & DIAGNOSTICS */}
          {activeTab === "system" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-50 dark:bg-[#282a2c] p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                      Telegram Latency & Connectivity Test
                    </h3>
                    <p className="text-xs text-slate-400">
                      Measure real-time RPC ping time to Telegram MTProto and Bot API servers
                    </p>
                  </div>
                  <button
                    onClick={handlePing}
                    disabled={pinging}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2"
                  >
                    <Radio className={`w-3.5 h-3.5 ${pinging ? "animate-spin" : ""}`} />
                    <span>{pinging ? "Pinging..." : "Run Ping Diagnostic"}</span>
                  </button>
                </div>

                {pingResult && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white dark:bg-[#1e1f20] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-400">MTProto Streaming Latency</p>
                      <p className="text-xl font-black text-emerald-500 mt-1">
                        {pingResult.mtprotoPingMs >= 0 ? `${pingResult.mtprotoPingMs} ms` : "Offline"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-[#1e1f20] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-400">Bot API Endpoint Latency</p>
                      <p className="text-xl font-black text-blue-500 mt-1">
                        {pingResult.botPingMs >= 0 ? `${pingResult.botPingMs} ms` : "Offline"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reset Password Modal Overlay */}
        {resettingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#282a2c] w-full max-w-sm rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  Reset Password for {resettingUser.name}
                </h4>
                <p className="text-xs text-slate-400">{resettingUser.email}</p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <input
                  type="password"
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
