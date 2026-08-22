import React, { useState, useEffect } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  X,
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
  Sparkles
} from "lucide-react";

export default function SettingsModal() {
  const {
    activeModal,
    setActiveModal,
    settings,
    refresh,
    showToast,
    currentUser,
    updateProfile,
    updatePassword,
    update2FAPin,
    deleteAccount,
    logoutUser
  } = useDrive();

  // Active Tab: 'account' | 'telegram'
  const [activeTab, setActiveTab] = useState("account");

  // Profile Edit State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA Security PIN State
  const [pin, setPin] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isUpdating2FA, setIsUpdating2FA] = useState(false);

  // Danger Zone: Delete Account State
  const [deletePass, setDeletePass] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Telegram Auth State
  const [step, setStep] = useState("input_phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password2FA, setPassword2FA] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setEmail(currentUser.email || "");
      setIs2FAEnabled(Boolean(currentUser.is2FAEnabled));
    }
  }, [currentUser]);

  if (activeModal !== "settings") return null;

  // 1. Save Profile (Name & Email)
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
    if (!newPassword || newPassword.length < 6) {
      return showToast("New password must be at least 6 characters long", "error");
    }
    if (newPassword !== confirmNewPassword) {
      return showToast("New passwords do not match", "error");
    }

    setIsUpdatingPassword(true);
    const success = await updatePassword(currentPassword, newPassword);
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
    setIsUpdatingPassword(false);
  };

  // 3. Configure 2FA PIN
  const handleConfigure2FA = async (e) => {
    e.preventDefault();
    if (!pin && !is2FAEnabled) {
      return showToast("Please enter a 4-6 digit Security PIN", "error");
    }

    setIsUpdating2FA(true);
    await update2FAPin(pin, is2FAEnabled, pinPassword);
    setPin("");
    setPinPassword("");
    setIsUpdating2FA(false);
  };

  // 4. Delete Account
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePass) return showToast("Please enter your account password to confirm deletion", "error");

    setIsDeleting(true);
    await deleteAccount(deletePass);
    setIsDeleting(false);
  };

  // --- Telegram Auth Handlers ---
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return showToast("Please enter your phone number", "error");

    setAuthLoading(true);
    try {
      const res = await DriveAPI.sendTelegramCode(phoneNumber.trim());
      if (res.success) {
        setPhoneCodeHash(res.phoneCodeHash);
        setStep("input_code");
        showToast("Verification code sent to your Telegram app!");
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || "Failed to send code", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) return showToast("Please enter the verification code", "error");

    setAuthLoading(true);
    try {
      const res = await DriveAPI.loginTelegram({
        phoneNumber: phoneNumber.trim(),
        code: otpCode.trim(),
        phoneCodeHash
      });

      if (res.requires2FA) {
        setStep("input_2fa");
        showToast(res.message || "2-Step Verification password is required", "info");
      } else if (res.success) {
        showToast(`Connected as ${res.user?.firstName || "Telegram User"}!`);
        refresh();
        setStep("input_phone");
        setOtpCode("");
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.requires2FA) {
        setStep("input_2fa");
        showToast(errorData.message || "2-Step Verification password is required", "info");
      } else {
        showToast(errorData?.error || err.message || "Verification failed", "error");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!password2FA.trim()) return showToast("Please enter your 2-Step Verification password", "error");

    setAuthLoading(true);
    try {
      const res = await DriveAPI.loginTelegram({
        phoneNumber: phoneNumber.trim(),
        code: otpCode.trim(),
        phoneCodeHash,
        password: password2FA.trim()
      });

      if (res.success) {
        showToast(`Connected as ${res.user?.firstName || "Telegram User"}!`);
        refresh();
        setStep("input_phone");
        setOtpCode("");
        setPassword2FA("");
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || "2FA verification failed", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    try {
      await DriveAPI.logoutTelegram();
      showToast("Telegram account disconnected");
      refresh();
    } catch (err) {
      showToast("Failed to disconnect", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-[#282a2c] w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 flex-shrink-0 gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
              Account Settings & Security
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Manage your personal profile, 2FA PIN lock, and Telegram connection
            </p>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 dark:bg-[#1e1f20] p-1 rounded-2xl mb-5 flex-shrink-0 border border-slate-200/60 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`flex items-center justify-center gap-2 flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === "account"
                ? "bg-white dark:bg-[#282a2c] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account Profile & 2FA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("telegram")}
            className={`flex items-center justify-center gap-2 flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === "telegram"
                ? "bg-white dark:bg-[#282a2c] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Send className="w-3.5 h-3.5 text-sky-500" />
            <span>Telegram Connection</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {activeTab === "account" ? (
            <>
              {/* SECTION 1: Personal Profile CRUD (Name & Email) */}
              <div className="bg-slate-50 dark:bg-[#1e1f20] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Personal Profile Details
                  </h4>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {isUpdatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 2: 2-Factor Security PIN Lock */}
              <div className="bg-slate-50 dark:bg-[#1e1f20] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        2-Factor Security PIN (2FA Lock)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Require a 4-6 digit PIN to access and unlock your TeleDrive
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      is2FAEnabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {is2FAEnabled ? "2FA Active" : "Disabled"}
                  </span>
                </div>

                <form onSubmit={handleConfigure2FA} className="space-y-3">
                  <div className="flex items-center gap-3 bg-white dark:bg-[#282a2c] p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      id="enable2FA"
                      checked={is2FAEnabled}
                      onChange={(e) => setIs2FAEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="enable2FA" className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                      Enable 2-Factor Security PIN on my account
                    </label>
                  </div>

                  {is2FAEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          New Security PIN (4–6 digits)
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                          placeholder="e.g. 1234"
                          className="w-full bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 text-center tracking-widest font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Account Password (to verify)
                        </label>
                        <input
                          type="password"
                          value={pinPassword}
                          onChange={(e) => setPinPassword(e.target.value)}
                          placeholder="Your login password"
                          className="w-full bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isUpdating2FA}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {isUpdating2FA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Update 2FA PIN</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 3: Change Account Password */}
              <div className="bg-slate-50 dark:bg-[#1e1f20] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-purple-500" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Change Account Password
                  </h4>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Current Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        New Password (min 6 chars)
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? "Hide passwords" : "Show passwords"}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      {isUpdatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 4: Danger Zone - Delete Account */}
              <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-rose-600">
                    <AlertCircle className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Danger Zone
                    </h4>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Permanently delete your account and all associated cloud files and folders. This action is irreversible.
                </p>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete My Account</span>
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-3 bg-white dark:bg-[#282a2c] p-3.5 rounded-xl border border-rose-300 dark:border-rose-800">
                    <p className="text-xs font-bold text-rose-600">
                      Confirm Account Deletion:
                    </p>
                    <input
                      type="password"
                      required
                      value={deletePass}
                      onChange={(e) => setDeletePass(e.target.value)}
                      placeholder="Enter your account password to confirm"
                      className="w-full bg-slate-50 dark:bg-[#1e1f20] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-rose-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isDeleting}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>Confirm Permanent Delete</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeletePass("");
                        }}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            <>
              {/* TELEGRAM CONNECTION TAB */}
              {settings?.telegramUser?.connected ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {settings.telegramUser.info?.firstName?.[0] || "T"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                            {settings.telegramUser.info?.firstName || "Telegram User"} {settings.telegramUser.info?.lastName || ""}
                          </h4>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Connected
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          @{settings.telegramUser.info?.username || "username"} • {settings.telegramUser.phoneNumber}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleDisconnectTelegram}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {step === "input_phone" && (
                    <form onSubmit={handleSendCode} className="space-y-3">
                      <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs text-slate-600 dark:text-slate-300">
                        Connect your personal Telegram account to import media from channels and upload directly to Telegram Cloud.
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Phone Number (with Country Code)
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+1234567890"
                            className="w-full bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Send Verification Code</span>
                      </button>
                    </form>
                  )}

                  {step === "input_code" && (
                    <form onSubmit={handleVerifyOtp} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setStep("input_phone")}
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back
                        </button>
                        <span className="text-xs text-slate-400">{phoneNumber}</span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Enter 5-digit Telegram Code
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="12345"
                          className="w-full bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-center text-base tracking-widest font-mono text-slate-800 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Verify & Connect</span>
                      </button>
                    </form>
                  )}

                  {step === "input_2fa" && (
                    <form onSubmit={handleVerify2FA} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Telegram 2-Step Verification Password
                        </label>
                        <input
                          type="password"
                          value={password2FA}
                          onChange={(e) => setPassword2FA(e.target.value)}
                          placeholder="Enter your Telegram 2FA password"
                          className="w-full bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {authLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Verify 2FA Password</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
