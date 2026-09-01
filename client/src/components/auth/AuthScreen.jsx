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
  Sparkles,
  Inbox,
  Check,
  Clock,
  ExternalLink
} from "lucide-react";

export default function AuthScreen({ initialTab = "signin", onBack }) {
  const {
    loginUser,
    sendSignupVerificationLink,
    verifyEmailToken,
    resendVerificationLink,
    sendForgotPasswordLink,
    resetPasswordWithToken
  } = useDrive();

  // Active View: 'signin' | 'signup' | 'verification_sent' | 'verify_landing' | 'forgot_password' | 'forgot_sent' | 'reset_landing'
  const [view, setView] = useState(initialTab === "signup" ? "signup" : "signin");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pin, setPin] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Verification Landing State
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Countdown timer for Resend Link
  const [countdown, setCountdown] = useState(0);

  // 1. Detect URL Params for email verification or password reset tokens on page mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const verifyToken = params.get("verify_email");
      const resetToken = params.get("reset_password");

      if (verifyToken) {
        setView("verify_landing");
        handleProcessVerificationToken(verifyToken);
      } else if (resetToken) {
        setView("reset_landing");
      }
    } catch (err) {
      console.warn("URL params check error:", err);
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const switchView = (newView) => {
    setView(newView);
    setError("");
    setSuccessMsg("");
    setRequires2FA(false);
    setPin("");
  };

  // 2. Handle Process Verification Token from Email Link
  const handleProcessVerificationToken = async (token) => {
    setVerifyingToken(true);
    setVerifyError("");
    try {
      const res = await verifyEmailToken(token);
      if (res.success) {
        setVerifiedSuccess(true);
        // Clean URL parameter without reload
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else {
        setVerifyError(res.error || "Invalid or expired verification link.");
      }
    } catch (err) {
      setVerifyError(err.response?.data?.error || err.message || "Failed to verify email link.");
    } finally {
      setVerifyingToken(false);
    }
  };

  // 3. Handle Sign In
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

  // 4. Handle Sign Up: Send Verification Link to Gmail
  const handleSignupSendLink = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!name.trim()) return setError("Full Name is required");
    if (!email || !email.includes("@")) return setError("Please enter a valid Gmail / Email address");
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return setError("Please enter a valid email address format");
    
    if (password.length < 8) return setError("Password must be at least 8 characters long");
    if (!/[A-Z]/.test(password)) return setError("Password must contain at least one uppercase letter (A-Z)");
    if (!/[a-z]/.test(password)) return setError("Password must contain at least one lowercase letter (a-z)");
    if (!/[0-9]/.test(password)) return setError("Password must contain at least one number (0-9)");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) return setError("Password must contain at least one special character (!@#$%^&*)");
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    try {
      const res = await sendSignupVerificationLink(name.trim(), email.trim(), password);
      if (res.success) {
        setView("verification_sent");
        setCountdown(60);
        setSuccessMsg(res.message || `A verification link has been sent to ${email}`);
      } else {
        setError(res.error || "Failed to send verification link.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Signup failed. Please verify your email.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Resend Verification Link
  const handleResendVerification = async () => {
    if (countdown > 0 || !email) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await resendVerificationLink(email.trim());
      if (res.success) {
        setCountdown(60);
        setSuccessMsg(res.message || `A new verification link was sent to ${email}`);
      } else {
        setError(res.error || "Failed to resend link");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Resend failed");
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Forgot Password Send Link
  const handleForgotPasswordSend = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email || !email.includes("@")) {
      return setError("Please enter your registered Gmail address");
    }

    setLoading(true);
    try {
      const res = await sendForgotPasswordLink(email.trim());
      if (res.success) {
        setView("forgot_sent");
        setCountdown(60);
        setSuccessMsg(res.message || `Password reset link sent to ${email}`);
      } else {
        setError(res.error || "Could not send password reset link");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  // 7. Handle Reset Password with Link Token
  const handleResetPasswordWithToken = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (newPassword.length < 8) {
      return setError("Password must be at least 8 characters long");
    }
    if (newPassword !== confirmNewPassword) {
      return setError("Passwords do not match");
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_password");
    if (!token) {
      return setError("Missing reset token in link");
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithToken(token, newPassword);
      if (res.success) {
        // Clean URL parameter
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else {
        setError(res.error || "Failed to reset password");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-slate-950 flex items-center justify-center p-3 sm:p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md bg-slate-900/85 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Back to Landing Page link */}
        {onBack && (
          <div className="mb-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-3 animate-bounce-subtle">
            <Send className="w-6 h-6 -rotate-12 translate-x-[-1px] translate-y-[1px]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>TeleDrive</span>
            <span className="text-xs uppercase font-bold tracking-wider bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
              Cloud
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Unlimited Telegram Cloud Storage & Streaming
          </p>
        </div>

        {/* Tab Switcher (Only on main Sign In / Sign Up views) */}
        {(view === "signin" || view === "signup") && (
          <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 mb-6">
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
        {/* 2. SIGN UP VIEW (WITH DIRECT GMAIL VERIFICATION LINK)        */}
        {/* ============================================================ */}
        {view === "signup" && (
          <form onSubmit={handleSignupSendLink} className="space-y-4">
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
                  placeholder="Your Full Name"
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
                A verification link will be sent to this email address to activate your account.
              </p>
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
                  placeholder="Min. 8 characters (A-Z, a-z, 0-9, !@#)"
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
                <div className="mt-2 space-y-1.5">
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
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                  <span>Sending Verification Link...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Send Verification Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* 3. VERIFICATION EMAIL SENT CONFIRMATION SCREEN               */}
        {/* ============================================================ */}
        {view === "verification_sent" && (
          <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <Inbox className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1.5">Check Your Email</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                We've sent an account verification link to:
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-blue-400 font-bold">
                {email}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Link valid for 24 hours</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Click the verification button in your email to activate your unlimited cloud storage. If you don't see it, please check your spam or promotions folder.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={loading || countdown > 0}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>
                  {countdown > 0 ? `Resend link in ${countdown}s` : "Resend Verification Email"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchView("signup")}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Change email address
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. VERIFY EMAIL LANDING VIEW (User clicked link in email)    */}
        {/* ============================================================ */}
        {view === "verify_landing" && (
          <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-200">
            {verifyingToken ? (
              <>
                <div className="w-16 h-16 rounded-3xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Verifying Email...</h3>
                  <p className="text-xs text-slate-400">
                    Activating your TeleDrive account and allocating cloud storage...
                  </p>
                </div>
              </>
            ) : verifiedSuccess ? (
              <>
                <div className="w-16 h-16 rounded-3xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Email Verified Successfully! 🎉</h3>
                  <p className="text-xs text-emerald-300 font-medium">
                    Welcome to TeleDrive! Your account is active. Loading your drive...
                  </p>
                </div>
                <div className="pt-2">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto" />
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-3xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Verification Failed</h3>
                  <p className="text-xs text-rose-300">
                    {verifyError || "This verification link is invalid or has expired."}
                  </p>
                </div>
                <div className="space-y-2 pt-3">
                  <button
                    onClick={() => switchView("signup")}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Sign Up Again
                  </button>
                  <button
                    onClick={() => switchView("signin")}
                    className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* 5. FORGOT PASSWORD (REQUEST RESET LINK)                      */}
        {/* ============================================================ */}
        {view === "forgot_password" && (
          <form onSubmit={handleForgotPasswordSend} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="text-base font-bold text-white">Reset Your Password</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your Gmail address to receive a secure password reset link.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Registered Gmail / Email
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
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-2xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Password Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchView("signin")}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white pt-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* 6. FORGOT PASSWORD LINK SENT                                 */}
        {/* ============================================================ */}
        {view === "forgot_sent" && (
          <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-rose-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Mail className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1.5">Reset Link Sent</h3>
              <p className="text-xs text-slate-300">
                We've sent a password reset link to:
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-rose-400 font-bold">
                {email}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Open the link in your email to set a new password. The link is valid for 1 hour.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleForgotPasswordSend}
                disabled={loading || countdown > 0}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend Reset Link"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchView("signin")}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 7. RESET PASSWORD LANDING (User opened link in email)        */}
        {/* ============================================================ */}
        {view === "reset_landing" && (
          <form onSubmit={handleResetPasswordWithToken} className="space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Choose a New Password</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter and confirm your new TeleDrive password below.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-rose-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-800/90 border border-slate-700 focus:border-rose-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-2xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
