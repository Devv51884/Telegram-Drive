import React, { useState } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import {
  Cloud,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

export default function AuthScreen() {
  const { loginUser, signupUser } = useDrive();
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (!isLoginMode) {
      if (!name.trim()) {
        setError("Please enter your full name");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      if (isLoginMode) {
        const success = await loginUser(email, password);
        if (!success) {
          setError("Invalid email or password. Please try again.");
        }
      } else {
        const success = await signupUser(name, email, password);
        if (!success) {
          setError("Failed to create account. Please check your details.");
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#1e1b4b] p-4 text-slate-100 overflow-y-auto select-none">
      {/* Background glowing blur spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-700/60 shadow-2xl p-8 animate-in zoom-in-95 duration-200 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3.5">
            <Cloud className="w-9 h-9 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            TeleDrive <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">CLOUD</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Unlimited Telegram Cloud Storage with Fast 4K Streaming & Document Readers
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl mb-6 border border-slate-700/50">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(true);
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              isLoginMode
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(false);
              setError("");
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              !isLoginMode
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
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
                  placeholder="Dev Sharma"
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLoginMode && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isLoginMode ? "Signing In..." : "Creating Account..."}</span>
              </>
            ) : (
              <>
                <span>{isLoginMode ? "Sign In to Drive" : "Create Account & Get Unlimited Storage"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Feature Badges */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
          <div className="flex flex-col items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Fast Stream</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Unlimited TBs</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
