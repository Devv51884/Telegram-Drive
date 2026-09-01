import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import {
  Shield,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  HardDrive
} from "lucide-react";

export default function LockScreen() {
  const { isSetupRequired, loginMaster, setupMaster, showToast } = useDrive();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");
    try {
      if (isSetupRequired) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        if (password.length < 4) {
          setError("Password must be at least 4 characters");
          setLoading(false);
          return;
        }
        await setupMaster(password.trim());
      } else {
        await loginMaster(password.trim());
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Incorrect PIN or Password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (digit) => {
    if (password.length < 20) {
      setPassword((prev) => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setPassword((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center">
        {/* App Logo & Lock Icon */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
            <Shield className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-white dark:border-[#1e1f20] flex items-center justify-center text-amber-400 shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
          {isSetupRequired ? "Secure Your TeleDrive" : "TeleDrive is Locked"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
          {isSetupRequired
            ? "Set a Master PIN or Password to protect your private files & cloud storage."
            : "Enter your Master PIN or Password to access your cloud files."}
        </p>

        {/* Form */}
        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <div>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                required
                placeholder={isSetupRequired ? "Create Master PIN / Password" : "Enter Master PIN / Password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm bg-slate-100 dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white font-medium text-center transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSetupRequired && (
            <div>
              <div className="relative flex items-center">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Confirm Master PIN / Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm bg-slate-100 dark:bg-[#282a2c] border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white font-medium text-center transition-all"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 text-xs font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim() || (isSetupRequired && !confirmPassword.trim())}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>{isSetupRequired ? "Set Password & Unlock" : "Unlock TeleDrive"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Info Badge */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted with Scrypt & HMAC-SHA256</span>
        </div>
      </div>
    </div>
  );
}
