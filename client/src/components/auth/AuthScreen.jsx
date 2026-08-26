import React, { useState, useEffect } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import {
  Cloud,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  RefreshCw,
  Send,
  Sparkles
} from "lucide-react";

export default function AuthScreen() {
  const {
    loginUser,
    signupSendOtp,
    signupVerifyOtp,
    forgotPasswordSendOtp,
    forgotPasswordVerifyOtp
  } = useDrive();

  // Active View: 'signin' | 'signup' | 'forgot_password'
  const [view, setView] = useState("signin");

  // Step for OTP Verification: 'input' | 'otp'
  const [otpStep, setOtpStep] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Countdown timer for Resend OTP
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const switchView = (newView) => {
    setView(newView);
    setOtpStep(false);
    setError("");
    setSuccessMsg("");
    setOtp("");
    setRequires2FA(false);
    setPin("");
  };

  // 1. Handle Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !email.includes("@")) {
      return setError("Please enter a valid Gmail / Email address");
    }
    if (!password) {
      return setError("Password is required");
    }

    setLoading(true);
    try {
      const res = await loginUser(email.trim(), password, pin);
      if (res.requires2FAPin) {
        setRequires2FA(true);
        setError("");
      } else if (!res.success) {
        setError(res.error || "Incorrect email, password, or security PIN.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  // Password Strength Evaluator
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

  const isPasswordValid = (pass) => {
    return (
      pass.length >= 8 &&
      /[A-Z]/.test(pass) &&
      /[a-z]/.test(pass) &&
      /[0-9]/.test(pass) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass)
    );
  };

  // 2. Handle Sign Up Step 1: Send OTP to Gmail
  const handleSignupSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!name.trim()) return setError("Full Name is required");
    if (!email || !email.includes("@")) return setError("Please enter a valid Gmail / Email address");
    if (password.length < 8) return setError("Password must be at least 8 characters long");
    if (!/[A-Z]/.test(password)) return setError("Password must contain at least one uppercase letter (A-Z)");
    if (!/[a-z]/.test(password)) return setError("Password must contain at least one lowercase letter (a-z)");
    if (!/[0-9]/.test(password)) return setError("Password must contain at least one number (0-9)");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) return setError("Password must contain at least one special character (!@#$)");
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    try {
      const res = await signupSendOtp(name.trim(), email.trim(), password);
      if (res.success) {
        setOtpStep(true);
        setCountdown(60);
        setSuccessMsg(res.message || `A 6-digit verification code was sent to ${email}`);
      } else {
        setError(res.error || "Failed to send verification code");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Sign Up Step 2: Verify OTP
  const handleSignupVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!otp.trim() || otp.trim().length !== 6) {
      return setError("Please enter the complete 6-digit verification code");
    }

    setLoading(true);
    try {
      const res = await signupVerifyOtp(email.trim(), otp.trim());
      if (!res.success) {
        setError(res.error || "Invalid or expired verification code");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Forgot Password Step 1: Send Reset OTP
  const handleForgotPasswordSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !email.includes("@")) {
      return setError("Please enter your registered Gmail / Email address");
    }

    setLoading(true);
    try {
      const res = await forgotPasswordSendOtp(email.trim());
      if (res.success) {
        setOtpStep(true);
        setCountdown(60);
        setSuccessMsg(res.message || `A password reset code was sent to ${email}`);
      } else {
        setError(res.error || "No account found with this email");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Forgot Password Step 2: Verify OTP & Reset
  const handleForgotPasswordVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!otp.trim() || otp.trim().length !== 6) {
      return setError("Please enter the 6-digit reset code sent to your email");
    }
    if (!password || password.length < 6) {
      return setError("New password must be at least 6 characters long");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      const res = await forgotPasswordVerifyOtp(email.trim(), otp.trim(), password);
      if (!res.success) {
        setError(res.error || "Failed to reset password. Please check your code.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Helper
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError("");
    setLoading(true);

    try {
      if (view === "signup") {
        const res = await signupSendOtp(name.trim(), email.trim(), password);
        if (res.success) {
          setCountdown(60);
          setSuccessMsg("A fresh 6-digit code has been sent to your Gmail!");
        }
      } else if (view === "forgot_password") {
        const res = await forgotPasswordSendOtp(email.trim());
        if (res.success) {
          setCountdown(60);
          setSuccessMsg("A fresh password reset code has been sent to your Gmail!");
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-[#0b1120] to-[#1e1b4b] p-3 sm:p-6 text-slate-100 overflow-y-auto select-none font-sans">
      {/* Ambient background glow spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-700/60 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-xl shadow-blue-500/25 mb-3">
            <Cloud className="w-8 h-8 sm:w-9 sm:h-9 text-white animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            TeleDrive <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">CLOUD</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Unlimited Telegram Cloud Storage with Fast 4K Streaming & Real-time Gmail Security
          </p>
        </div>

        {/* Tab Switcher (Only in standard Signin / Signup mode) */}
        {view !== "forgot_password" && (
          <div className="flex bg-slate-800/80 p-1 rounded-2xl mb-5 border border-slate-700/50">
            <button
              type="button"
              onClick={() => switchView("signin")}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                view === "signin"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchView("signup")}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                view === "signup"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Status Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* 1. SIGN IN VIEW                                              */}
        {/* ============================================================ */}
        {view === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-4">
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
                  placeholder="you@gmail.com"
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => switchView("forgot_password")}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
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

            {requires2FA && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-in fade-in zoom-in-95 duration-150">
                <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>2-Factor Security PIN</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 4-6 digit PIN"
                    className="w-full bg-slate-800/90 border border-emerald-500/60 focus:border-emerald-400 rounded-xl pl-10 pr-4 py-2.5 text-sm tracking-widest text-center text-white placeholder-slate-500 outline-none font-mono transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Drive</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* 2. SIGN UP VIEW (WITH REAL-TIME GMAIL OTP)                   */}
        {/* ============================================================ */}
        {view === "signup" && !otpStep && (
          <form onSubmit={handleSignupSendOtp} className="space-y-4">
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

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Password Strength:</span>
                    <span className={`font-bold ${getPasswordStrength(password).text}`}>
                      {getPasswordStrength(password).label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full rounded-full transition-all duration-300 flex-1 ${getPasswordStrength(password).score >= 1 ? getPasswordStrength(password).color : "bg-slate-700"}`} />
                    <div className={`h-full rounded-full transition-all duration-300 flex-1 ${getPasswordStrength(password).score >= 2 ? getPasswordStrength(password).color : "bg-slate-700"}`} />
                    <div className={`h-full rounded-full transition-all duration-300 flex-1 ${getPasswordStrength(password).score >= 3 ? getPasswordStrength(password).color : "bg-slate-700"}`} />
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                    <div className={`flex items-center gap-1 ${password.length >= 8 ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                      <span>{password.length >= 8 ? "✓" : "○"}</span>
                      <span>8+ Characters</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                      <span>{/[A-Z]/.test(password) ? "✓" : "○"}</span>
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                      <span>{/[0-9]/.test(password) ? "✓" : "○"}</span>
                      <span>Number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password) ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                      <span>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password) ? "✓" : "○"}</span>
                      <span>Special Symbol (!@#)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Gmail OTP...</span>
                </>
              ) : (
                <>
                  <span>Send Gmail Verification Code</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* 2B. SIGN UP OTP VERIFICATION STEP                            */}
        {/* ============================================================ */}
        {view === "signup" && otpStep && (
          <form onSubmit={handleSignupVerify} className="space-y-4 animate-in fade-in duration-150">
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-xs text-slate-300 text-center">
              <p className="font-semibold text-white mb-1">Verify Your Gmail</p>
              <p className="text-slate-400 text-[11px]">
                Enter the 6-digit verification code sent to <strong className="text-blue-400">{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full bg-slate-800/90 border border-blue-500/60 focus:border-blue-400 rounded-2xl py-3 text-lg tracking-[0.4em] text-center font-mono font-bold text-white placeholder-slate-600 outline-none transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Create Account</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setOtpStep(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Details</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || loading}
                className="text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors font-medium"
              >
                {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* 3. FORGOT PASSWORD VIEW (VIA GMAIL OTP)                      */}
        {/* ============================================================ */}
        {view === "forgot_password" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Reset Account Password</h3>
              </div>
              <button
                type="button"
                onClick={() => switchView("signin")}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>

            {!otpStep ? (
              <form onSubmit={handleForgotPasswordSendOtp} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Enter your registered Gmail address. We will send a 6-digit OTP code to securely reset your password.
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Registered Email Address
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Code</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotPasswordVerify} className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-slate-300 text-center">
                  Enter the 6-digit code sent to <strong className="text-amber-400">{email}</strong> and enter your new password.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                    6-Digit Reset Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full bg-slate-800/90 border border-amber-500/60 focus:border-amber-400 rounded-2xl py-2.5 text-base tracking-[0.4em] text-center font-mono font-bold text-white placeholder-slate-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    New Password
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

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm New Password
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

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resetting Password...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Reset Password & Sign In</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setOtpStep(false)}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className="text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors font-medium"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Resend Code"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

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
            <span>Gmail Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
