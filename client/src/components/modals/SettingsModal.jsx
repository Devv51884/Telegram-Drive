import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  X,
  UserCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Phone,
  Lock,
  Loader2,
  Sparkles,
  ShieldCheck,
  Send,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield
} from "lucide-react";

export default function SettingsModal() {
  const {
    activeModal,
    setActiveModal,
    settings,
    refresh,
    showToast,
    lockMaster
  } = useDrive();

  // Active Tab: 'telegram' | 'security'
  const [activeTab, setActiveTab] = useState("telegram");

  // --- Telegram Auth State ---
  const [step, setStep] = useState("input_phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password2FA, setPassword2FA] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // --- Change Password State ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");

  if (activeModal !== "settings") return null;

  // --- Step 1: Send OTP to Phone ---
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      showToast("Please enter your Telegram phone number", "error");
      return;
    }

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

  // --- Step 2: Verify OTP ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      showToast("Please enter the verification code", "error");
      return;
    }

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
        setPassword2FA("");
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

  // --- Step 3: Verify 2FA ---
  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!password2FA.trim()) {
      showToast("Please enter your 2FA password", "error");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await DriveAPI.loginTelegram({
        phoneNumber: phoneNumber.trim(),
        code: otpCode.trim(),
        password: password2FA.trim(),
        phoneCodeHash
      });

      if (res.success) {
        showToast(`Connected as ${res.user?.firstName || "Telegram User"}!`);
        refresh();
        setStep("input_phone");
        setOtpCode("");
        setPassword2FA("");
      } else {
        showToast(res.error || "Login failed", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message || "Incorrect 2FA password", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // --- Disconnect Telegram Account ---
  const handleLogout = async () => {
    try {
      await DriveAPI.logoutTelegram();
      showToast("Telegram account disconnected");
      refresh();
    } catch (err) {
      showToast("Failed to disconnect", "error");
    }
  };

  // --- Change Master PIN / Password ---
  const handleChangeMasterPassword = async (e) => {
    e.preventDefault();
    setPwdError("");

    if (newPassword !== confirmNewPassword) {
      setPwdError("New passwords do not match");
      return;
    }

    if (newPassword.length < 4) {
      setPwdError("Password must be at least 4 characters");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await DriveAPI.changeMasterPassword(currentPassword, newPassword);
      if (res.success) {
        localStorage.setItem("teledrive_auth_token", res.token);
        showToast("Master Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (err) {
      setPwdError(err.response?.data?.error || err.message || "Failed to update password");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-[#282a2c] w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Settings & Account
            </h3>
            <p className="text-xs text-slate-400">
              Manage your connected Telegram account and security lock
            </p>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#1e1f20] rounded-2xl mb-5 border border-slate-200/80 dark:border-slate-700/60">
          <button
            onClick={() => setActiveTab("telegram")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "telegram"
                ? "bg-white dark:bg-[#282a2c] text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Telegram Account</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "security"
                ? "bg-white dark:bg-[#282a2c] text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Master PIN & Security</span>
          </button>
        </div>

        {/* TAB 1: TELEGRAM ACCOUNT */}
        {activeTab === "telegram" && (
          <div className="space-y-4 animate-in fade-in duration-100">
            {settings?.telegramUser?.connected ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                      {settings.telegramUser.info?.firstName?.[0] || "U"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                        {settings.telegramUser.info?.firstName} {settings.telegramUser.info?.lastName || ""}
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {settings.telegramUser.info?.username ? `@${settings.telegramUser.info.username} • ` : ""}
                        {settings.telegramUser.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Ready to Stream Channel Media & Videos</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Your Telegram account is connected. You can import post links from your subscribed private and public channels to stream video, PDFs, and photos instantly!
                  </p>
                </div>
              </div>
            ) : step === "input_phone" ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 rounded-2xl p-3.5 text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-semibold flex items-center gap-1.5 mb-1 text-blue-700 dark:text-blue-300">
                    <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    Step 1: Enter Telegram Phone Number
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Enter your phone number with country code. You will receive a 5-digit verification code directly in your official Telegram app chats.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Telegram Phone Number (with country code)
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type="tel"
                      required
                      autoFocus
                      placeholder="+919876543210 or +1..."
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={authLoading || !phoneNumber.trim()}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 -rotate-12" />
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : step === "input_code" ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 rounded-2xl p-3.5 text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Step 2: Enter Verification Code
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Verification code has been sent to <b>{phoneNumber}</b>. Check your official Telegram app.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Telegram Verification Code
                  </label>
                  <div className="relative flex items-center">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter 5-digit OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-mono tracking-widest text-center text-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("input_phone")}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Number</span>
                  </button>

                  <button
                    type="submit"
                    disabled={authLoading || !otpCode.trim()}
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Complete Login</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <Lock className="w-4 h-4 text-amber-500" />
                    Two-Step Verification (2FA)
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Your Telegram account has 2-Step Verification enabled. Please enter your password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Telegram 2FA Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoFocus
                      placeholder="Enter your 2FA password"
                      value={password2FA}
                      onChange={(e) => setPassword2FA(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none text-slate-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("input_code")}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to OTP</span>
                  </button>

                  <button
                    type="submit"
                    disabled={authLoading || !password2FA.trim()}
                    className="px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying 2FA...</span>
                      </>
                    ) : (
                      <span>Submit Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: SECURITY & MASTER LOCK */}
        {activeTab === "security" && (
          <div className="space-y-4 animate-in fade-in duration-100">
            {/* Lock Now Button */}
            <div className="bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Lock Drive Now
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Immediately lock TeleDrive and require PIN to re-enter
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  lockMaster();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 transition-colors"
              >
                Lock App
              </button>
            </div>

            {/* Change Master Password Form */}
            <form onSubmit={handleChangeMasterPassword} className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Change Master PIN / Password
              </h4>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  New Master PIN / Password
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-slate-800 dark:text-white"
                />
              </div>

              {pwdError && (
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
                  {pwdError}
                </div>
              )}

              <button
                type="submit"
                disabled={pwdLoading || !currentPassword.trim() || !newPassword.trim()}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pwdLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Master Password</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
