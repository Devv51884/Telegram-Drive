import React, { useState, useEffect } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  User,
  Key,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  Lock,
  Loader2,
  Send,
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  Mail,
  Save,
  LogOut,
  Sparkles,
  HardDrive,
  Cloud,
  Film,
  Image as ImageIcon,
  FileText,
  Music,
  Archive,
  Smartphone,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Clock,
  ShieldAlert
} from "lucide-react";

export default function SettingsPage() {
  const {
    currentUser,
    updateProfile,
    updatePassword,
    update2FAPin,
    deleteAccount,
    logoutUser,
    settings,
    stats,
    refresh,
    showToast,
    navigateToSection
  } = useDrive();

  // Active Section Tab: 'profile' | 'security' | 'telegram' | 'storage' | 'danger'
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Edit State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA Security PIN State
  const [pin, setPin] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isUpdating2FA, setIsUpdating2FA] = useState(false);

  // Telegram MTProto Account Auth State
  const [step, setStep] = useState("input_phone"); // 'input_phone' | 'input_code' | 'input_2fa'
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password2FA, setPassword2FA] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [telegramError, setTelegramError] = useState("");

  // Danger Zone State
  const [deletePass, setDeletePass] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setEmail(currentUser.email || "");
      setIs2FAEnabled(Boolean(currentUser.is2FAEnabled));
    }
  }, [currentUser]);

  // Format Bytes helper
  const formatBytes = (bytes, decimals = 1) => {
    const num = Number(bytes) || 0;
    if (num === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(num) / Math.pow(k, i));
    return parseFloat((num / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Password strength check
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, label: "", color: "" };
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-400" };
    if (score <= 4) return { score: 2, label: "Medium", color: "bg-amber-500", text: "text-amber-400" };
    return { score: 3, label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
  };

  // 1. Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast("Full Name is required", "error");
    if (!email.trim() || !email.includes("@")) return showToast("Valid email is required", "error");

    setIsUpdatingProfile(true);
    await updateProfile(name.trim(), email.trim());
    setIsUpdatingProfile(false);
  };

  // 2. Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) return showToast("Current password is required", "error");
    if (!newPassword || newPassword.length < 8) {
      return showToast("New password must be at least 8 characters long", "error");
    }
    if (newPassword !== confirmNewPassword) {
      return showToast("New passwords do not match", "error");
    }

    setIsUpdatingPassword(true);
    const success = await updatePassword(currentPassword, newPassword);
    setIsUpdatingPassword(false);
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  // 3. Update 2FA PIN
  const handleUpdate2FA = async (e) => {
    e.preventDefault();
    if (!pinPassword) {
      return showToast("Enter your account password to modify 2FA settings", "error");
    }

    if (is2FAEnabled) {
      if (!pin || pin.length < 4 || pin.length > 6) {
        return showToast("Security PIN must be 4 to 6 digits", "error");
      }
    }

    setIsUpdating2FA(true);
    const success = await update2FAPin(pin, is2FAEnabled, pinPassword);
    setIsUpdating2FA(false);
    if (success) {
      setPinPassword("");
    }
  };

  // 4. Send Telegram Phone Code
  const handleSendTelegramCode = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return setTelegramError("Phone number is required");

    setAuthLoading(true);
    setTelegramError("");

    try {
      const res = await DriveAPI.sendTelegramCode({ phoneNumber: phoneNumber.trim() });
      if (res.success) {
        if (res.phoneCodeHash) {
          setPhoneCodeHash(res.phoneCodeHash);
        }
        setStep("input_code");
        showToast("Verification code sent to your Telegram app!");
      } else {
        setTelegramError(res.error || "Failed to send verification code");
      }
    } catch (err) {
      setTelegramError(err.response?.data?.error || err.message || "Failed to connect to Telegram");
    } finally {
      setAuthLoading(false);
    }
  };

  // 5. Submit Telegram Code / 2FA
  const handleLoginTelegram = async (e) => {
    e.preventDefault();
    if (!otpCode && !password2FA) return setTelegramError("Verification code is required");
    setTelegramError("");
    setAuthLoading(true);

    try {
      const payload = {
        phoneNumber: phoneNumber.trim(),
        code: otpCode.trim(),
        phoneCodeHash: phoneCodeHash
      };
      if (password2FA) payload.password = password2FA.trim();

      const res = await DriveAPI.loginTelegram(payload);
      if (res.success) {
        showToast("Telegram account connected successfully!");
        refresh();
        setStep("input_phone");
        setOtpCode("");
        setPassword2FA("");
      } else if (res.requires2FA || res.requiresPassword) {
        setStep("input_2fa");
        showToast(res.message || "Telegram 2-Step Verification password required", "info");
      } else {
        setTelegramError(res.error || "Failed to authenticate with Telegram");
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.requires2FA) {
        setStep("input_2fa");
        showToast(errorData.message || "Telegram 2-Step Verification password required", "info");
      } else {
        setTelegramError(errorData?.error || err.message || "Authentication failed");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // 6. Disconnect Telegram Account
  const handleLogoutTelegram = async () => {
    if (!window.confirm("Are you sure you want to disconnect this Telegram account?")) return;
    setAuthLoading(true);
    try {
      const res = await DriveAPI.logoutTelegram();
      if (res.success) {
        showToast("Telegram account disconnected");
        refresh();
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to disconnect Telegram", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // 7. Delete Account Permanently
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePass) return showToast("Password is required to delete account", "error");
    if (!window.confirm("CRITICAL: Are you absolutely sure? All files and folders will be deleted permanently.")) {
      return;
    }

    setIsDeleting(true);
    await deleteAccount(deletePass);
    setIsDeleting(false);
  };

  const navItems = [
    { id: "profile", label: "Profile & Account", icon: User, desc: "Personal info and email" },
    { id: "security", label: "Security & 2FA", icon: Shield, desc: "Password and 2-step PIN" },
    { id: "telegram", label: "Telegram Integration", icon: Send, desc: "Cloud MTProto connection" },
    { id: "storage", label: "Storage & Analytics", icon: HardDrive, desc: "Cloud capacity breakdown" },
    { id: "danger", label: "Danger Zone", icon: ShieldAlert, desc: "Delete account permanently" }
  ];

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="h-16 px-4 sm:px-8 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateToSection("my_drive")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Drive</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Account Settings</span>
          </h1>
        </div>

        <button
          onClick={logoutUser}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-6">
        
        {/* Navigation Sidebar / Tabs */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-3 shadow-xl space-y-1">
            {/* User Mini Profile Card */}
            <div className="p-3.5 mb-2 rounded-2xl bg-gradient-to-br from-blue-600/10 via-slate-850 to-slate-850 border border-slate-800/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/20 flex-shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="truncate">
                <h3 className="text-xs font-bold text-white truncate">{currentUser?.name || "TeleDrive User"}</h3>
                <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
              </div>
            </div>

            {/* Nav Tab Buttons */}
            <div className="flex md:flex-col gap-1 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left whitespace-nowrap md:whitespace-normal w-full ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                    } ${item.id === "danger" && !isActive ? "hover:text-rose-400" : ""}`}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
                    <div className="truncate">
                      <div>{item.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl space-y-6 animate-in fade-in duration-150">
            
            {/* ============================================================ */}
            {/* 1. PROFILE SETTINGS                                          */}
            {/* ============================================================ */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Profile Information</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Update your account full name, email address, and personal preferences.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Gmail / Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@gmail.com"
                        className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Account notifications, share requests, and security alerts will be sent here.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUpdatingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save Profile</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ============================================================ */}
            {/* 2. SECURITY & 2FA SETTINGS                                   */}
            {/* ============================================================ */}
            {activeTab === "security" && (
              <div className="space-y-8">
                {/* Change Password Form */}
                <div className="space-y-4 max-w-lg">
                  <div>
                    <h2 className="text-lg font-bold text-white">Change Password</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ensure your account is protected with a strong, unique password.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showCurrentPass ? "text" : "password"}
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPass ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Strength bar */}
                      {newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Strength:</span>
                            <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
                            <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : "bg-slate-700"} flex-1`} />
                            <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : "bg-slate-700"} flex-1`} />
                            <div className={`h-full rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : "bg-slate-700"} flex-1`} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPass ? "text" : "password"}
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPassword || !currentPassword}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      <span>Update Password</span>
                    </button>
                  </form>
                </div>

                <div className="h-px bg-slate-800 my-6" />

                {/* 2-Factor Authentication (2FA PIN) */}
                <div className="space-y-4 max-w-lg">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span>2-Factor Security PIN</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Add a secondary numeric PIN to your account required on every sign in.
                    </p>
                  </div>

                  <form onSubmit={handleUpdate2FA} className="space-y-4">
                    {/* Toggle Checkbox */}
                    <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-850 border border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={is2FAEnabled}
                        onChange={(e) => setIs2FAEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded bg-slate-700 border-slate-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-white">Enable 2-Step PIN Verification</span>
                        <p className="text-[11px] text-slate-400">Protects your account even if someone discovers your password.</p>
                      </div>
                    </label>

                    {is2FAEnabled && (
                      <div className="space-y-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            Set 4 to 6 Digit Security PIN
                          </label>
                          <input
                            type="password"
                            maxLength={6}
                            required={is2FAEnabled}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter 4-6 digits (e.g. 1234)"
                            className="w-full bg-slate-800/90 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-center tracking-widest text-sm font-mono text-white placeholder-slate-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Confirm with Account Password
                      </label>
                      <input
                        type="password"
                        required
                        value={pinPassword}
                        onChange={(e) => setPinPassword(e.target.value)}
                        placeholder="Your current account password"
                        className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdating2FA || !pinPassword}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 text-xs transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUpdating2FA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save 2FA Preferences</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 3. TELEGRAM INTEGRATION                                      */}
            {/* ============================================================ */}
            {activeTab === "telegram" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Telegram MTProto Connection</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect your personal Telegram account to stream unlimited cloud storage and sync channel media.
                  </p>
                </div>

                {/* Connection Status Card */}
                <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${
                        settings?.telegramUser?.connected
                          ? "bg-gradient-to-tr from-sky-500 to-blue-600 shadow-sky-500/20"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      <Send className="w-6 h-6 -rotate-12 translate-x-[-1px]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{settings?.telegramUser?.connected ? "Telegram Connected" : "Not Connected"}</span>
                        {settings?.telegramUser?.connected && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                            Active MTProto
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {settings?.telegramUser?.connected
                          ? `Logged in as ${settings.telegramUser.username || (settings.telegramUser.info?.username ? `@${settings.telegramUser.info.username.replace(/^@/, '')}` : null) || settings.telegramUser.phoneNumber || settings.telegramUser.phone || "Telegram User"}`
                          : "Connect your Telegram account to enable direct cloud uploads."}
                      </p>
                    </div>
                  </div>

                  {settings?.telegramUser?.connected && (
                    <button
                      onClick={handleLogoutTelegram}
                      disabled={authLoading}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>

                {/* Telegram Login Form (If not connected) */}
                {!settings?.telegramUser?.connected && (
                  <div className="p-5 rounded-2xl bg-slate-850/60 border border-slate-800 space-y-4 max-w-lg">
                    <h3 className="text-sm font-bold text-white">Connect Telegram Account</h3>

                    {telegramError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{telegramError}</span>
                      </div>
                    )}

                    {step === "input_phone" && (
                      <form onSubmit={handleSendTelegramCode} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Phone Number with Country Code
                          </label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              required
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="+91 9876543210"
                              className="w-full bg-slate-800 border border-slate-700 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={authLoading || !phoneNumber.trim()}
                          className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span>Send Verification Code</span>
                        </button>
                      </form>
                    )}

                    {(step === "input_code" || step === "input_2fa") && (
                      <form onSubmit={handleLoginTelegram} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Telegram Verification Code
                          </label>
                          <input
                            type="text"
                            required
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="Enter 5-digit code from Telegram"
                            className="w-full bg-slate-800 border border-slate-700 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-center font-mono tracking-widest text-white placeholder-slate-500 outline-none transition-all"
                          />
                        </div>

                        {step === "input_2fa" && (
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                              Telegram 2-Step Password
                            </label>
                            <input
                              type="password"
                              required
                              value={password2FA}
                              onChange={(e) => setPassword2FA(e.target.value)}
                              placeholder="Your Telegram cloud password"
                              className="w-full bg-slate-800 border border-slate-700 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setStep("input_phone")}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={authLoading || !otpCode.trim()}
                            className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Complete Authentication</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* 4. STORAGE & ANALYTICS                                       */}
            {/* ============================================================ */}
            {activeTab === "storage" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Storage & Analytics</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time breakdown of your cloud storage footprint powered by TeleDrive high-speed infrastructure.
                  </p>
                </div>

                {/* Storage Overview Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Stored</span>
                    <h3 className="text-xl font-black text-white">{formatBytes(stats?.totalBytes)}</h3>
                    <span className="text-[10px] text-emerald-400 font-semibold">Unlimited Quota</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Files</span>
                    <h3 className="text-xl font-black text-white">{stats?.totalFiles || 0}</h3>
                    <span className="text-[10px] text-blue-400 font-semibold">Across all directories</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Folders</span>
                    <h3 className="text-xl font-black text-white">{stats?.totalFolders || 0}</h3>
                    <span className="text-[10px] text-purple-400 font-semibold">Nested trees</span>
                  </div>
                </div>

                {/* Storage Category Bars */}
                <div className="p-5 rounded-2xl bg-slate-850 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">File Type Distribution</h4>

                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                    <div className="h-full bg-rose-500 w-[45%]" title="Videos" />
                    <div className="h-full bg-blue-500 w-[25%]" title="Photos" />
                    <div className="h-full bg-red-500 w-[15%]" title="PDFs" />
                    <div className="h-full bg-purple-500 w-[10%]" title="Audio" />
                    <div className="h-full bg-amber-500 w-[5%]" title="Archives & Other" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-rose-500" />
                      <span className="text-slate-300">Videos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span className="text-slate-300">Photos & Images</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span className="text-slate-300">PDFs & Docs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-purple-500" />
                      <span className="text-slate-300">Audio & Music</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 5. DANGER ZONE                                               */}
            {/* ============================================================ */}
            {activeTab === "danger" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    <span>Danger Zone</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Irreversible account operations. Proceed with extreme caution.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Delete TeleDrive Account</h3>
                    <p className="text-xs text-rose-300 mt-1 leading-relaxed">
                      Permanently delete your user account, stored files, folders, and shared links. This action cannot be undone.
                    </p>
                  </div>

                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-lg shadow-rose-600/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete My Account...</span>
                    </button>
                  ) : (
                    <form onSubmit={handleDeleteAccount} className="space-y-3 pt-2 max-w-sm">
                      <div>
                        <label className="block text-xs font-bold text-rose-300 mb-1">
                          Confirm Account Password
                        </label>
                        <input
                          type="password"
                          required
                          value={deletePass}
                          onChange={(e) => setDeletePass(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full bg-slate-900 border border-rose-500/50 focus:border-rose-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isDeleting || !deletePass}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          <span>Permanently Delete</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
