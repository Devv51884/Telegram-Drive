import React, { useState, useEffect, useRef } from "react";
import {
  Cloud,
  HardDrive,
  Film,
  Zap,
  ShieldCheck,
  Share2,
  FolderPlus,
  Play,
  Pause,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Lock,
  Download,
  Eye,
  FileText,
  Mail,
  HelpCircle,
  ExternalLink,
  Layers,
  Send,
  Check,
  X,
  Menu,
  Server,
  Activity,
  Shield,
  Clock,
  Smartphone,
  Laptop,
  Copy,
  Folder,
  Sliders,
  Maximize2,
  Volume2,
  VolumeX,
  Flame,
  Globe,
  Infinity,
  LayoutGrid,
  List,
  Users,
  Upload,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

/**
 * Motion Primitives: Spotlight Card
 * Tracks mouse coordinates and illuminates a subtle radial glow behind content.
 */
function SpotlightCard({ children, className = "", spotlightColor = "rgba(99, 102, 241, 0.15)" }) {
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0f121d]/85 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 ${className}`}
      style={{
        background: isHovered
          ? `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 70%), #0f121d`
          : undefined
      }}
    >
      {children}
    </div>
  );
}

/**
 * Motion Primitives: Shimmer Button
 * Button with moving gradient shine beam and neon glow.
 */
function ShimmerButton({ children, onClick, className = "", variant = "primary" }) {
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-2xl font-bold tracking-tight transition-all duration-300 active:scale-95 ${
        variant === "primary"
          ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] text-white shadow-xl shadow-indigo-600/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
          : "border border-white/10 bg-white/[0.04] text-slate-200 backdrop-blur-md hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
      } ${className}`}
    >
      {/* Light Shimmer Effect Sweep */}
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}

export default function LandingPage({ onNavigate, siteSettings }) {
  const [openFaq, setOpenFaq] = useState(0);
  const [demoTab, setDemoTab] = useState("explorer"); // 'explorer' | 'share' | 'upload' | 'stream'
  const [explorerView, setExplorerView] = useState("grid"); // 'grid' | 'table' | 'menu'
  const [activeModalOverlay, setActiveModalOverlay] = useState(null); // null | 'share' | 'upload'
  const [productTourTab, setProductTourTab] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulatedTime, setSimulatedTime] = useState(42);
  const [uploadPercent, setUploadPercent] = useState(78);
  const [isMuted, setIsMuted] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Simulated video playback timer in demo
  useEffect(() => {
    let interval;
    if (isPlaying && demoTab === "stream") {
      interval = setInterval(() => {
        setSimulatedTime((prev) => (prev >= 180 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, demoTab]);

  // Simulated upload progress in demo
  useEffect(() => {
    let interval;
    if (demoTab === "upload" || activeModalOverlay === "upload") {
      interval = setInterval(() => {
        setUploadPercent((prev) => (prev >= 100 ? 15 : prev + 1));
      }, 600);
    }
    return () => clearInterval(interval);
  }, [demoTab, activeModalOverlay]);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const productScreenshots = [
    {
      id: "grid",
      num: "01",
      badge: "Visual Workspace",
      tabTitle: "01 Grid View",
      title: "Interactive File Grid",
      shortDesc: "Browse directories with instant visual previews for Excel, PDF, and 4K footage.",
      image: "/landing/grid-view.png",
      tag: "Live Previews",
      chips: ["Instant Thumbnails", "Folder Hierarchies", "Multi-Select"],
      accentGlow: "rgba(99, 102, 241, 0.25)"
    },
    {
      id: "table",
      num: "02",
      badge: "Power Explorer",
      tabTitle: "02 Table View",
      title: "Detailed List View",
      shortDesc: "Sort, filter, and inspect files with byte-level accuracy and instant search.",
      image: "/landing/table-view.png",
      tag: "Byte Precision",
      chips: ["Fast Sizing", "Date Stamping", "Format Filters"],
      accentGlow: "rgba(6, 182, 212, 0.25)"
    },
    {
      id: "share",
      num: "03",
      badge: "Collaborative Drive",
      tabTitle: "03 Team Sharing",
      title: "Granular Team Access",
      shortDesc: "Invite collaborators via email, assign roles, and issue password-locked public links.",
      image: "/landing/share-modal.png",
      tag: "Enterprise Access",
      chips: ["Viewer / Editor Roles", "Access Requests", "Password Locks"],
      accentGlow: "rgba(59, 130, 246, 0.25)"
    },
    {
      id: "upload",
      num: "04",
      badge: "High-Speed Ingest",
      tabTitle: "04 2GB Uploader",
      title: "Parallel Multi-Chunk",
      shortDesc: "Upload files up to 2GB each with automatic 20MB chunking and zero dropped transfers.",
      image: "/landing/upload-modal.png",
      tag: "2GB Ceiling",
      chips: ["48.2 MB/s Concurrency", "Auto-Resume", "Drag & Drop"],
      accentGlow: "rgba(16, 185, 129, 0.25)"
    },
    {
      id: "menu",
      num: "05",
      badge: "Instant Control",
      tabTitle: "05 Quick Actions",
      title: "1-Click Context Menu",
      shortDesc: "Star, share, rename, relocate, inspect metadata, or safely restore from trash.",
      image: "/landing/context-menu.png",
      tag: "1-Click Control",
      chips: ["Instant Star", "Quick Share", "Safe Trash"],
      accentGlow: "rgba(168, 85, 247, 0.25)"
    }
  ];

  const supportEmail = siteSettings?.supportEmail || "support@telegram-drive.in";
  const telegramChannel = siteSettings?.telegramChannel || "https://t.me/telegram_drive_in";

  const faqs = [
    {
      q: "How does TeleDrive offer 100% free and unlimited storage?",
      a: "TeleDrive leverages high-speed globally distributed cloud infrastructure. Files are streamed and stored across secure multi-DC edge nodes with chunked parallel distribution. With zero cloud rental or storage hosting markups, we pass 100% unlimited storage freely to you."
    },
    {
      q: "What is the maximum upload size for a single file?",
      a: "You can upload individual files up to 2GB each. Our chunked streaming engine automatically handles large 4K video files, software ISOs, raw photo batches, zip archives, and multi-gigabyte project libraries."
    },
    {
      q: "Can I stream 4K videos without downloading the whole file?",
      a: "Yes! TeleDrive incorporates an advanced Multi-DC byte-range streaming engine. You can instantly play 4K, 1080p, and 720p MKV, MP4, and WebM videos with full seekbar scrubbing, instant playback, and zero pre-download wait times."
    },
    {
      q: "How do secure public sharing links work?",
      a: "With TeleDrive's Instant Share engine, you can generate public share links for any file or folder. You can configure optional password protection, maximum download limits, and automatic link expiration for complete privacy control."
    },
    {
      q: "How is my personal data secured?",
      a: "All network traffic is encrypted via TLS 1.3. File streams are authenticated using cryptographically signed tokens. When sharing files, you can configure access passwords and automatic time-based expiry."
    },
    {
      q: "Do I need to install any software or mobile app?",
      a: "Zero installations required. TeleDrive is a progressive, ultra-responsive web application engineered for Android, iOS, Windows, macOS, and Linux."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. HAIKEI.APP GENERATIVE SVG BACKGROUNDS & AMBIENT GLOW MESH             */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dot Matrix Circuit Overlay */}
        <div className="absolute inset-0 bg-dot-grid opacity-60" />
        <div className="absolute inset-0 bg-cyber-grid opacity-40" />

        {/* Generative Haikei Organic Ambient Mesh Blobs */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-cyan-500/20 blur-[130px] rounded-full animate-pulse-glow" />
        <div className="absolute top-[35%] -left-48 w-[600px] h-[600px] bg-gradient-to-br from-indigo-700/15 to-purple-800/15 blur-[140px] rounded-full" />
        <div className="absolute top-[60%] -right-48 w-[650px] h-[650px] bg-gradient-to-bl from-cyan-600/15 via-blue-600/10 to-indigo-800/15 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-[700px] h-[450px] bg-gradient-to-t from-purple-900/20 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING GLASSMORPHIC NAVIGATION BAR                                   */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 px-4 sm:px-8 py-3.5 backdrop-blur-xl bg-[#07080c]/75 border-b border-white/[0.06] transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-[#07080c] rounded-[14px] flex items-center justify-center">
                <Cloud className="w-5 h-5 text-indigo-400 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white flex items-center">
                  TELE<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">DRIVE</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  v2.0
                </span>
              </div>
              <p className="hidden md:block text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                Next-Gen Unlimited Cloud Drive
              </p>
            </div>
          </div>

          {/* Center Navigation Links (Sheryians Style) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-full backdrop-blur-md text-xs font-semibold text-slate-300">
            <a
              href="#demo"
              className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Interactive Demo
            </a>
            <a
              href="#bento"
              className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Features & Architecture
            </a>
            <a
              href="#comparison"
              className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Why TeleDrive
            </a>
            <a
              href="#faqs"
              className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.06] transition-all"
            >
              FAQs
            </a>
            <a
              href={telegramChannel}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-full hover:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-1 text-indigo-400 font-bold transition-all"
            >
              <span>Community</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate("auth", "signin")}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              Sign In
            </button>

            <ShimmerButton
              onClick={() => onNavigate("auth", "signup")}
              className="px-5 py-2 text-xs"
            >
              <span>Launch Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </ShimmerButton>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pt-4 pb-3 border-t border-white/10 mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <a
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
            >
              Interactive Demo
            </a>
            <a
              href="#bento"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
            >
              Features & Bento Grid
            </a>
            <a
              href="#tour"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
            >
              Visual Tour
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
            >
              Compare Storage
            </a>
            <a
              href="#faqs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.06]"
            >
              FAQs
            </a>

            <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
              <ShimmerButton
                onClick={() => { setMobileMenuOpen(false); onNavigate("auth", "signup"); }}
                className="w-full py-3 text-xs"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </ShimmerButton>

              <button
                onClick={() => { setMobileMenuOpen(false); onNavigate("auth", "signin"); }}
                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-200 hover:bg-white/[0.08] transition-all"
              >
                Sign In to Existing Account
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 3. HERO SECTION (SHERYIANS HIGH-VOLTAGE AESTHETIC)                        */}
      {/* ========================================================================= */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto text-center">
        {/* Animated Radar Status Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 backdrop-blur-md mb-8 shadow-inner shadow-indigo-500/20 animate-in fade-in duration-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-indigo-300 to-cyan-400">
            100% UNLIMITED STORAGE • ULTRA-LOW 85MS LATENCY • ZERO FEES
          </span>
        </div>

        {/* Mega Editorial Headline */}
        <div className="mb-2">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-indigo-400">
            Next-Gen Unlimited Cloud Storage
          </span>
        </div>
        <h1 className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] uppercase max-w-5xl mx-auto px-2">
          <span className="text-white block">STORE. STREAM. SHARE.</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 block mt-1">
            WITHOUT LIMITS.
          </span>
        </h1>

        {/* High-Impact Subtitle */}
        <p className="mt-6 text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Say goodbye to Google Drive’s 15GB ceiling. TeleDrive provides high-speed distributed cloud infrastructure for your personal, lightning-fast, 100% free unlimited cloud storage.
        </p>

        {/* Dual Primary Call-to-Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <ShimmerButton
            onClick={() => onNavigate("auth", "signup")}
            className="w-full sm:w-auto px-8 py-4 text-sm sm:text-base font-black shadow-2xl shadow-indigo-600/30"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </ShimmerButton>

          <a
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-sm font-bold text-slate-200 backdrop-blur-md transition-all hover:scale-[1.02]"
          >
            <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" />
            <span>Watch Live Interactive Demo</span>
          </a>
        </div>

        {/* Direct Sign In Link */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Already have an account?</span>
          <button
            onClick={() => onNavigate("auth", "signin")}
            className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-4"
          >
            Sign In here
          </button>
        </div>

        {/* High-Contrast Floating Feature Pills */}
        <div className="mt-14 pt-6 border-t border-white/[0.06] max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-white">2GB File Ceiling</p>
              <p className="text-[11px] text-slate-400">Per single upload</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-white">85ms Gateway Ping</p>
              <p className="text-[11px] text-slate-400">Multi-DC Cloud Edge</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-white">4K Range Stream</p>
              <p className="text-[11px] text-slate-400">Zero pre-download</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-white">100% Free Forever</p>
              <p className="text-[11px] text-slate-400">Zero subscription</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INFINITE MARQUEE TICKER (SHERYIANS STYLE)                              */}
      {/* ========================================================================= */}
      <div className="relative z-10 py-6 border-y border-white/[0.06] bg-[#0c0e15]/70 backdrop-blur-md overflow-hidden select-none">
        <div className="animate-marquee gap-8 items-center text-xs font-black uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-2 text-white">
            <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400" />
            85MS DIRECT EDGE STREAMING
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-2 text-cyan-400">
            <HardDrive className="w-4 h-4" />
            UNLIMITED DISTRIBUTED STORAGE
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-2 text-white">
            <Film className="w-4 h-4 text-purple-400" />
            4K BYTE-RANGE SEEKING
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            END-TO-END TLS ENCRYPTION
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-2 text-white">
            <Share2 className="w-4 h-4 text-indigo-400" />
            SECURE PASSWORD-PROTECTED SHARES
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-2 text-purple-300">
            <Sparkles className="w-4 h-4" />
            180GB+ MEDIA STREAMED
          </span>
          <span className="text-slate-600">•</span>
          {/* Duplicate set for smooth infinite loop */}
          <span className="flex items-center gap-2 text-white">
            <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400" />
            85MS DIRECT EDGE STREAMING
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-2 text-cyan-400">
            <HardDrive className="w-4 h-4" />
            UNLIMITED DISTRIBUTED STORAGE
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-2 text-white">
            <Film className="w-4 h-4 text-purple-400" />
            4K BYTE-RANGE SEEKING
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            END-TO-END TLS ENCRYPTION
          </span>
          <span className="text-slate-600">•</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE LIVE WORKSPACE DEMO (AUTHENTIC UI SCREENSHOTS + SIMULATOR) */}
      {/* ========================================================================= */}
      <section id="demo" className="relative z-10 py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Experience</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Test Drive The Next-Gen Interface
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
            Interact with live workspace views, granular sharing dialogs, chunked uploads, and direct 4K streaming.
          </p>
        </div>

        {/* macOS Style Interactive Window */}
        <div className="rounded-3xl border border-white/[0.12] bg-[#0c0e17] shadow-2xl shadow-indigo-950/50 overflow-hidden backdrop-blur-2xl">
          {/* Window Chrome / Titlebar */}
          <div className="h-12 bg-white/[0.03] border-b border-white/[0.06] px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/40" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/40" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/40" />
            </div>

            {/* Fake Omnibox */}
            <div className="flex-1 max-w-md hidden sm:flex items-center justify-center">
              <div className="w-full py-1 px-3 bg-black/40 border border-white/[0.06] rounded-xl text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  https://teledrive.app/my_drive
                </span>
                <span className="text-[10px] text-indigo-400 font-bold">Cloud Edge DC2</span>
              </div>
            </div>

            {/* Live User Badge */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-black text-white">
                AL
              </div>
              <span className="hidden xs:inline">Aalo lelo</span>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="p-3 bg-white/[0.01] border-b border-white/[0.06] flex flex-wrap gap-2 justify-between items-center">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setDemoTab("explorer"); setActiveModalOverlay(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  demoTab === "explorer"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Drive Workspace</span>
              </button>

              <button
                onClick={() => { setDemoTab("share"); setActiveModalOverlay(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  demoTab === "share"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Team Sharing & Access</span>
              </button>

              <button
                onClick={() => { setDemoTab("upload"); setActiveModalOverlay(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  demoTab === "upload"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Chunked 2GB Uploader</span>
              </button>

              <button
                onClick={() => { setDemoTab("stream"); setActiveModalOverlay(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  demoTab === "stream"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Film className="w-4 h-4" />
                <span>4K Video Streamer</span>
              </button>
            </div>

            {/* Quick Action Simulators for Explorer View */}
            {demoTab === "explorer" && (
              <div className="flex items-center gap-1.5 pt-2 sm:pt-0">
                <div className="bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] flex items-center gap-1">
                  <button
                    onClick={() => { setExplorerView("grid"); setActiveModalOverlay(null); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                      explorerView === "grid" && !activeModalOverlay
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Thumbnail Grid View"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                  <button
                    onClick={() => { setExplorerView("table"); setActiveModalOverlay(null); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                      explorerView === "table" && !activeModalOverlay
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Detailed List / Table View"
                  >
                    <List className="w-3 h-3" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                  <button
                    onClick={() => { setExplorerView("menu"); setActiveModalOverlay(null); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                      explorerView === "menu" && !activeModalOverlay
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Folder Context Menu"
                  >
                    <MoreVertical className="w-3 h-3" />
                    <span className="hidden sm:inline">Menu</span>
                  </button>
                </div>

                <button
                  onClick={() => setActiveModalOverlay(activeModalOverlay === "share" ? null : "share")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                    activeModalOverlay === "share"
                      ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                      : "bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <Share2 className="w-3 h-3 text-blue-400" />
                  <span className="hidden md:inline">Test Share Modal</span>
                </button>

                <button
                  onClick={() => setActiveModalOverlay(activeModalOverlay === "upload" ? null : "upload")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                    activeModalOverlay === "upload"
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                      : "bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  <Upload className="w-3 h-3 text-emerald-400" />
                  <span className="hidden md:inline">Test Upload Modal</span>
                </button>
              </div>
            )}
          </div>

          {/* Interactive Tab Body */}
          <div className="p-4 sm:p-6 min-h-[420px] flex items-center justify-center relative">
            {/* TAB 1: DRIVE WORKSPACE (REAL SCREENSHOTS WITH INTERACTIVE OVERLAYS) */}
            {demoTab === "explorer" && (
              <div className="w-full relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Visual Image Render */}
                <div className="relative group cursor-pointer" onClick={() => {
                  const targetImg = explorerView === "grid" 
                    ? { src: "/landing/grid-view.png", title: "Visual Thumbnail Grid", desc: "Interactive file grid with instant PDF, Excel, and video thumbnails" }
                    : explorerView === "table"
                    ? { src: "/landing/table-view.png", title: "Detailed Metadata Table", desc: "Structured list view with fast sorting by size, date, and type" }
                    : { src: "/landing/context-menu.png", title: "Folder Context Operations", desc: "1-click actions: Open, Share, Star, Rename, Move, Details, Trash" };
                  setLightboxImg(targetImg);
                }}>
                  <img
                    src={
                      explorerView === "grid"
                        ? "/landing/grid-view.png"
                        : explorerView === "table"
                        ? "/landing/table-view.png"
                        : "/landing/context-menu.png"
                    }
                    alt="TeleDrive UI Preview"
                    className="w-full h-auto object-cover max-h-[580px] rounded-xl"
                  />

                  {/* Interactive Hotspot Pills (Overlaid on Grid View) */}
                  {explorerView === "grid" && !activeModalOverlay && (
                    <>
                      <div className="absolute top-[22%] left-[28%] hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-indigo-500/40 text-[10px] font-bold text-white shadow-xl pointer-events-none animate-pulse">
                        <Folder className="w-3 h-3 text-indigo-400" />
                        <span>Documents & Photos Folders</span>
                      </div>

                      <div className="absolute bottom-[30%] left-[38%] hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 shadow-xl pointer-events-none">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Live Excel & PDF Previews</span>
                      </div>

                      <div className="absolute bottom-[8%] left-[5%] hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 shadow-xl pointer-events-none">
                        <HardDrive className="w-3 h-3 text-cyan-400" />
                        <span>Unlimited Cloud Storage</span>
                      </div>
                    </>
                  )}

                  {/* Expand Fullscreen Hint */}
                  <div className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white border border-white/10 flex items-center gap-1.5 backdrop-blur-md">
                    <Maximize2 className="w-3 h-3 text-indigo-400" />
                    <span>Expand High-Res</span>
                  </div>
                </div>

                {/* MODAL OVERLAY: SHARE DIALOG SIMULATOR */}
                {activeModalOverlay === "share" && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-indigo-500/40 bg-[#0c0e17] shadow-2xl shadow-indigo-950/80 p-2 sm:p-4">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3 px-2">
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold text-white">Live Share Dialog Preview</span>
                        </div>
                        <button
                          onClick={() => setActiveModalOverlay(null)}
                          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="relative rounded-xl overflow-hidden border border-white/10 mb-3">
                        <img
                          src="/landing/share-modal.png"
                          alt="Share Modal UI"
                          className="w-full h-auto max-h-[380px] object-contain"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 px-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Restricted & Public Modes Included</span>
                        </div>
                        <button
                          onClick={handleCopyLink}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/30"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? "Link Copied!" : "Simulate Copy Link"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL OVERLAY: UPLOAD DIALOG SIMULATOR */}
                {activeModalOverlay === "upload" && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative max-w-xl w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-emerald-500/40 bg-[#0c0e17] shadow-2xl shadow-emerald-950/80 p-2 sm:p-4">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3 px-2">
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white">Live Cloud Uploader Preview</span>
                        </div>
                        <button
                          onClick={() => setActiveModalOverlay(null)}
                          className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="relative rounded-xl overflow-hidden border border-white/10 mb-3">
                        <img
                          src="/landing/upload-modal.png"
                          alt="Upload Modal UI"
                          className="w-full h-auto max-h-[380px] object-contain"
                        />
                      </div>

                      <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-bold">Simulated Parallel Chunk Upload</span>
                          <span className="text-emerald-400 font-mono font-bold">{uploadPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-300"
                            style={{ width: `${uploadPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Speed: 48.2 MB/s</span>
                          <span>4 Parts Concurrent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TEAM SHARING & PERMISSIONS (DETAILED BREAKDOWN + SCREENSHOT) */}
            {demoTab === "share" && (
              <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in zoom-in-95 duration-200">
                <div className="lg:col-span-7">
                  <div
                    onClick={() => setLightboxImg({ src: "/landing/share-modal.png", title: "Granular Team Sharing & Access Control", desc: "Invite collaborators via email, assign roles, and issue password-protected links" })}
                    className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl cursor-pointer group hover:border-blue-500/50 transition-all"
                  >
                    <img
                      src="/landing/share-modal.png"
                      alt="Share Modal"
                      className="w-full h-auto object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3 text-blue-400" />
                      <span>Click to Enlarge</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4 text-left">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold border border-blue-500/30 uppercase tracking-wider">
                      Collaborative Drive
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                      Granular Sharing & Access
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      TeleDrive incorporates enterprise-grade permission management designed just like Google Drive.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>Email Invitations & Roles</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Add users with Viewer or Editor roles with instant permission syncing.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Access Requests Approval</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Incoming requests from unauthorized viewers can be approved or rejected with 1 click.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Protected Public Links</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Create public links with custom passwords, expiration dates, and download limits.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? "Protected Link Copied!" : "Simulate Copy Share Link"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: CHUNKED 2GB UPLOADER DEMO */}
            {demoTab === "upload" && (
              <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-in fade-in zoom-in-95 duration-200">
                <div className="lg:col-span-7">
                  <div
                    onClick={() => setLightboxImg({ src: "/landing/upload-modal.png", title: "High-Speed Chunked Cloud Uploader", desc: "Drag and drop up to 2GB files with parallel chunk streaming" })}
                    className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl cursor-pointer group hover:border-emerald-500/50 transition-all"
                  >
                    <img
                      src="/landing/upload-modal.png"
                      alt="Upload Modal"
                      className="w-full h-auto object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3 text-emerald-400" />
                      <span>Click to Enlarge</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4 text-left">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-wider">
                      Parallel Pipeline
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                      2GB Chunked Uploader
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Files are split into 20MB parts and uploaded concurrently. Zero drops even on flaky network connections.
                    </p>
                  </div>

                  {/* Live Telemetry Card */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                          ISO
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Ubuntu_24.04_LTS_Server.iso</p>
                          <p className="text-[10px] text-slate-400">1.84 GB • Speed: 48.2 MB/s</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">{uploadPercent}%</span>
                    </div>

                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${uploadPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Chunks 74/92 Dispatched
                      </span>
                      <span>ETA: 4 seconds</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Concurrency</span>
                      <span className="text-xs font-mono font-black text-white">4 Parts Parallel</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Max File Size</span>
                      <span className="text-xs font-mono font-black text-emerald-400">2.0 GB / File</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 4K VIDEO STREAMER DEMO */}
            {demoTab === "stream" && (
              <div className="w-full max-w-3xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between p-4 sm:p-6 group">
                  {/* Subtle Video Background Simulation */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-slate-900 to-purple-950 opacity-80" />
                  
                  {/* Glowing Animated Audio Waves / Visualizer */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-30">
                    {[40, 75, 100, 60, 90, 45, 80, 110, 65, 95, 50, 70, 85].map((h, i) => (
                      <div
                        key={i}
                        className="w-2 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{
                          height: isPlaying ? `${(h * ((simulatedTime % 5) + 1)) / 4}px` : "20px"
                        }}
                      />
                    ))}
                  </div>

                  {/* Top Bar of Video */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        4K 60FPS • Direct Edge Stream
                      </span>
                      <span className="hidden sm:inline-block text-xs font-semibold text-slate-300 truncate max-w-xs">
                        Cinematic_Showreel_2026_4K.mkv
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                        85ms Range Seek
                      </span>
                    </div>
                  </div>

                  {/* Center Play/Pause Trigger */}
                  <div className="relative z-10 flex items-center justify-center">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 transition-transform duration-200 hover:scale-110 active:scale-95"
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8 fill-white" />
                      ) : (
                        <Play className="w-8 h-8 fill-white ml-1" />
                      )}
                    </button>
                  </div>

                  {/* Bottom Video Controls */}
                  <div className="relative z-10 space-y-2 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10">
                    {/* Seek Progress Bar */}
                    <div className="relative w-full h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${(simulatedTime / 180) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white">
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white">
                          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <span>
                          {Math.floor(simulatedTime / 60)}:
                          {(simulatedTime % 60).toString().padStart(2, "0")} / 03:00
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                          H.265 Direct Buffer
                        </span>
                        <Maximize2 className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SHERYIANS-STYLE BENTO GRID (MOTION PRIMITIVES SPOTLIGHT CARDS)         */}
      {/* ========================================================================= */}
      <section id="bento" className="relative z-10 py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-black uppercase tracking-wider mb-3">
            <Flame className="w-3.5 h-3.5 text-indigo-400" />
            <span>Architecture & Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white">
            Built For Speed. Designed Without Limits.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Six architectural breakthroughs that make TeleDrive the most capable next-gen personal cloud drive on the web.
          </p>
        </div>

        {/* Asymmetrical Sheryians Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: 2-Column Wide - Multi-DC Streaming */}
          <SpotlightCard className="md:col-span-2 p-8 sm:p-10 flex flex-col justify-between min-h-[340px]">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                Multi-DC Direct Streaming Engine
              </h3>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                Our high-speed multi-DC streaming engine communicates directly with global cloud edge nodes. Stream 4K video files, seek forward without downloading, and enjoy 85ms gateway response times.
              </p>
            </div>

            <div className="pt-8 flex flex-wrap items-center gap-3 text-xs font-mono text-indigo-300">
              <span className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
                Range: bytes=0-1048576
              </span>
              <span className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
                Parallel DC Chunks
              </span>
              <span className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
                0% Transcoding Lag
              </span>
            </div>
          </SpotlightCard>

          {/* Card 2: 1-Column - Unlimited Cloud Storage */}
          <SpotlightCard className="p-8 flex flex-col justify-between min-h-[340px]">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                Zero Storage Quotas
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Store 500GB, 2TB, or 10TB with zero monthly invoices. Your files reside on encrypted distributed object storage backed by unlimited cloud scale.
              </p>
            </div>

            <div className="pt-6">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Your Cloud Quota:</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  <Infinity className="w-4 h-4 inline" /> Unlimited
                </span>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 3: 1-Column - Universal Document & Media Previewer */}
          <SpotlightCard className="p-8 flex flex-col justify-between min-h-[340px]">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                Universal File Previews
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Direct browser previews for PDF documents, spreadsheets, Markdown, code syntax, images, and lossless audio with zero extra plugins required.
              </p>
            </div>

            <div className="pt-6 flex items-center gap-2 text-xs font-bold text-cyan-400">
              <span>PDF, Code, Audio & Media</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </SpotlightCard>

          {/* Card 4: 1-Column - 2GB File Ceiling */}
          <SpotlightCard className="p-8 flex flex-col justify-between min-h-[340px]">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                2GB Per File Upload
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Handle massive ISO files, zipped datasets, raw 4K drone footage, and code archives. Auto-chunked transfer guarantees resilient uploads even on unstable networks.
              </p>
            </div>

            <div className="pt-6">
              <span className="text-xs font-mono font-bold text-slate-400">
                Chunk Concurrency: 4 Parts Parallel
              </span>
            </div>
          </SpotlightCard>

          {/* Card 5: 1-Column - Zero-Knowledge Security */}
          <SpotlightCard className="p-8 flex flex-col justify-between min-h-[340px]">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                Signed Token Security
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Zero tracking, zero ad-retargeting. Protect public shared folders with custom passwords, view counts, and expiration dates for ultimate control.
              </p>
            </div>

            <div className="pt-6 flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>TLS 1.3 Strict HTTPS</span>
            </div>
          </SpotlightCard>

          {/* Card 6: 2-Column Wide - Granular Permissions & Team Sharing */}
          <SpotlightCard className="md:col-span-2 p-8 sm:p-10 flex flex-col justify-between min-h-[340px] relative overflow-hidden group">
            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                Granular Permissions & Team Sharing
              </h3>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                Collaborate effortlessly with precision access control. Add people by email, assign Viewer or Editor rights, approve Google Drive-style access requests, and create password-protected links with custom expiration.
              </p>
            </div>

            <div className="pt-8 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300 relative z-10">
              <span className="px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 font-sans font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Email Invites (Viewer / Editor)
              </span>
              <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10">
                Google Drive-Style Access Requests
              </span>
              <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10">
                Restricted & Public Link Modes
              </span>
              <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10">
                Password & Expiry Protection
              </span>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6.5 VISUAL PRODUCT TOUR (SHERYIANS HIGH-VOLTAGE SHOWCASE)                */}
      {/* ========================================================================= */}
      <section id="tour" className="relative z-10 py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 text-xs font-black uppercase tracking-wider mb-4 shadow-inner shadow-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>PLATFORM SHOWCASE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight">
            INSIDE THE TELEDRIVE EXPERIENCE.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-lg mx-auto font-normal">
            Simple, lightning-fast, and distraction-free. Browse the real production interface below.
          </p>
        </div>

        {/* Sheryians-Style Animated Top Tab Controls with Next/Prev Arrows */}
        <div className="flex items-center justify-center gap-2 pb-2 mb-6">
          <button
            onClick={() => setProductTourTab((prev) => (prev === 0 ? productScreenshots.length - 1 : prev - 1))}
            className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all active:scale-95 flex-shrink-0"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex overflow-x-auto no-scrollbar items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md select-none max-w-full">
            {productScreenshots.map((item, idx) => {
              const isActive = productTourTab === idx;
              return (
                <button
                  key={item.id}
                  onClick={() => setProductTourTab(idx)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black tracking-tight whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30 scale-105"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className={`text-[10px] font-mono ${isActive ? "text-indigo-200" : "text-slate-500"}`}>
                    {item.num}
                  </span>
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setProductTourTab((prev) => (prev === productScreenshots.length - 1 ? 0 : prev + 1))}
            className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all active:scale-95 flex-shrink-0"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Featured Showcase Card (Sheryians Aesthetic) */}
        {(() => {
          const current = productScreenshots[productTourTab];
          return (
            <div className="relative rounded-3xl border border-white/[0.12] bg-[#0c0e17]/90 backdrop-blur-2xl p-5 sm:p-8 md:p-10 shadow-2xl shadow-indigo-950/70 overflow-hidden transition-all duration-500">
              {/* Dynamic Ambient Glow Behind Active Card */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] blur-[140px] pointer-events-none rounded-full transition-all duration-700 opacity-60"
                style={{ backgroundColor: current.accentGlow }}
              />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
                {/* Left: Punchy Minimal Info */}
                <div className="lg:col-span-5 space-y-4 sm:space-y-5 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-white font-mono text-[11px] font-bold">
                      {current.num} / 05
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                      {current.badge}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {current.tag}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[1.15]">
                    {current.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {current.shortDesc}
                  </p>

                  {/* Minimal Visual Feature Chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {current.chips.map((chip, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-semibold text-slate-300"
                      >
                        • {chip}
                      </span>
                    ))}
                  </div>

                  {/* Dual Actions */}
                  <div className="pt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setLightboxImg({ src: current.image, title: current.title, desc: current.shortDesc })}
                      className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Expand High-Res</span>
                    </button>

                    <button
                      onClick={() => onNavigate("auth", "signup")}
                      className="px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold transition-all"
                    >
                      Try Live In App
                    </button>
                  </div>
                </div>

                {/* Right: Modern Frame with Hover Zoom */}
                <div className="lg:col-span-7">
                  <div
                    onClick={() => setLightboxImg({ src: current.image, title: current.title, desc: current.shortDesc })}
                    className="relative group rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-black/70 shadow-2xl cursor-pointer transition-all duration-500 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/25"
                  >
                    {/* Mini Top Chrome Bar */}
                    <div className="h-8 bg-black/60 border-b border-white/10 px-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 truncate">
                        teledrive_{current.id}_view.png
                      </span>
                      <Maximize2 className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                    </div>

                    {/* High-Res Image Display */}
                    <div className="relative overflow-hidden bg-black/40">
                      <img
                        src={current.image}
                        alt={current.title}
                        className="w-full h-auto object-cover max-h-[420px] sm:max-h-[500px] transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                        <span className="px-4 py-2.5 rounded-2xl bg-black/80 text-white text-xs font-black border border-white/20 flex items-center gap-2 shadow-2xl scale-95 group-hover:scale-100 transition-transform">
                          <Maximize2 className="w-4 h-4 text-indigo-400" />
                          <span>View In Full High-Res</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Sheryians-Style Thumbnail Strip Navigation */}
        <div className="mt-6 flex overflow-x-auto no-scrollbar items-center gap-3 pb-2 select-none">
          {productScreenshots.map((item, idx) => {
            const isActive = productTourTab === idx;
            return (
              <div
                key={item.id}
                onClick={() => setProductTourTab(idx)}
                className={`flex-1 min-w-[140px] sm:min-w-[180px] p-2 rounded-2xl border cursor-pointer transition-all duration-300 group ${
                  isActive
                    ? "bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-600/20 scale-[1.02]"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 opacity-70 hover:opacity-100"
                }`}
              >
                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 mb-2 bg-black/40">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {isActive && (
                    <div className="absolute inset-0 border-2 border-indigo-400 rounded-xl pointer-events-none" />
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] px-0.5">
                  <span className={`font-mono font-bold ${isActive ? "text-indigo-300" : "text-slate-500"}`}>
                    {item.num}
                  </span>
                  <span className={`font-bold truncate ${isActive ? "text-white" : "text-slate-400"}`}>
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SHERYIANS-STYLE STORAGE COMPARISON TABLE                               */}
      {/* ========================================================================= */}
      <section id="comparison" className="relative z-10 py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-black uppercase tracking-wider mb-3">
            <Activity className="w-3.5 h-3.5" />
            <span>Honest Benchmark</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Why Switch From Legacy Cloud Drives?
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
            Traditional cloud services charge monthly fees for arbitrary storage tiers. See how TeleDrive compares.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs sm:text-sm">
              <thead className="bg-white/[0.03] border-b border-white/[0.08] text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4 sm:p-5">Feature</th>
                  <th className="p-4 sm:p-5 text-indigo-400 font-black">TeleDrive</th>
                  <th className="p-4 sm:p-5 text-slate-400">Google Drive</th>
                  <th className="p-4 sm:p-5 text-slate-400">Dropbox</th>
                  <th className="p-4 sm:p-5 text-slate-400">Mega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-white">Free Storage Ceiling</td>
                  <td className="p-4 sm:p-5 font-black text-emerald-400">Unlimited</td>
                  <td className="p-4 sm:p-5 text-slate-400">15 GB Max</td>
                  <td className="p-4 sm:p-5 text-slate-400">2 GB Max</td>
                  <td className="p-4 sm:p-5 text-slate-400">20 GB Max</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-white">Monthly Cost</td>
                  <td className="p-4 sm:p-5 font-black text-emerald-400">$0 Free Forever</td>
                  <td className="p-4 sm:p-5 text-slate-400">$2.99 / mo</td>
                  <td className="p-4 sm:p-5 text-slate-400">$9.99 / mo</td>
                  <td className="p-4 sm:p-5 text-slate-400">$5.99 / mo</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-white">4K Byte-Range Streaming</td>
                  <td className="p-4 sm:p-5 font-black text-emerald-400">Instant (85ms)</td>
                  <td className="p-4 sm:p-5 text-slate-400">Transcode Delay</td>
                  <td className="p-4 sm:p-5 text-slate-400">No Seek Bar</td>
                  <td className="p-4 sm:p-5 text-slate-400">Transfer Quotas</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-white">Instant Protected Share Links</td>
                  <td className="p-4 sm:p-5 font-black text-emerald-400">Included (Password & Expiry)</td>
                  <td className="p-4 sm:p-5 text-slate-400">Basic Link</td>
                  <td className="p-4 sm:p-5 text-slate-400">Paid Tier Only</td>
                  <td className="p-4 sm:p-5 text-slate-400">Basic Link</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 sm:p-5 font-bold text-white">Single File Upload Limit</td>
                  <td className="p-4 sm:p-5 font-black text-white">2 GB Per File</td>
                  <td className="p-4 sm:p-5 text-slate-400">Subject to Quota</td>
                  <td className="p-4 sm:p-5 text-slate-400">2 GB Free</td>
                  <td className="p-4 sm:p-5 text-slate-400">Bandwidth Capped</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. INTERACTIVE FAQ ACCORDION                                              */}
      {/* ========================================================================= */}
      <section id="faqs" className="relative z-10 py-20 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-black uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Everything you need to know about TeleDrive storage and security.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-[#0f121d] border-indigo-500/40 shadow-xl shadow-indigo-500/5"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/10"
                }`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-mono text-indigo-400">0{index + 1}.</span>
                    <span>{faq.q}</span>
                  </span>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform duration-200 ${
                      isOpen ? "bg-indigo-600 text-white rotate-180" : "bg-white/[0.05] text-slate-400"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. HIGH-VOLTAGE FINAL CTA (SHERYIANS CYBERPUNK NEON CARD)                 */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="relative rounded-3xl p-8 sm:p-14 md:p-16 overflow-hidden border border-indigo-500/30 bg-gradient-to-b from-[#111425] via-[#0d0f1c] to-[#07080c] shadow-2xl shadow-indigo-600/20 text-center">
          {/* Neon Light Flares */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/25 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instant Cloud Setup</span>
            </div>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight">
              Ready To Ditch 15GB Storage Limits?
            </h2>

            <p className="text-sm sm:text-base text-slate-400">
              Join thousands of users storing videos, datasets, and documents on unlimited private cloud. No credit card required.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <ShimmerButton
                onClick={() => onNavigate("auth", "signup")}
                className="px-9 py-4 text-base font-black"
              >
                <span>Launch TeleDrive Now</span>
                <ArrowRight className="w-4 h-4" />
              </ShimmerButton>

              <button
                onClick={() => onNavigate("auth", "signin")}
                className="px-7 py-4 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-sm font-bold text-slate-200 transition-all"
              >
                Sign In With Existing Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. MODERN FOOTER                                                         */}
      {/* ========================================================================= */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#050609] py-14 px-4 sm:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-2 max-w-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white">
                <Cloud className="w-4 h-4" />
              </div>
              <span className="font-black text-base text-white tracking-tight">TELEDRIVE</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Unlimited, high-speed, secure private cloud storage engineered with modern distributed architecture.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational • High-Speed 85ms Edge</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Product</p>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigate("auth", "signup")}
                  className="hover:text-indigo-300 text-indigo-400 font-bold transition-colors text-left"
                >
                  Create Free Account
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("auth", "signin")}
                  className="hover:text-white transition-colors text-left"
                >
                  Sign In to Drive
                </button>
              </li>
              <li>
                <a href="#demo" className="hover:text-white transition-colors">Interactive Demo</a>
              </li>
              <li>
                <a href="#tour" className="hover:text-white transition-colors">Visual Tour</a>
              </li>
              <li>
                <a href="#bento" className="hover:text-white transition-colors">Bento Architecture</a>
              </li>
              <li>
                <a href="#comparison" className="hover:text-white transition-colors">Storage Comparison</a>
              </li>
              <li>
                <a href="#faqs" className="hover:text-white transition-colors">FAQs</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Support */}
          <div className="space-y-2">
            <p className="font-bold text-white uppercase tracking-wider text-[11px]">Legal & Support</p>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="hover:text-white transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("contact")}
                  className="hover:text-white transition-colors text-left"
                >
                  Contact Support
                </button>
              </li>
              <li>
                <a
                  href={telegramChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-semibold"
                >
                  <span>Community Channel</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} TeleDrive. Engineered for privacy, speed, and unlimited storage.</p>
          <p>Encrypted End-to-End • Zero Third-Party Tracking</p>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 11. HIGH-RESOLUTION LIGHTBOX MODAL                                       */}
      {/* ========================================================================= */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxImg(null)}
        >
          <div 
            className="relative max-w-5xl w-full bg-[#0c0e17] border border-white/20 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-950/80 p-4 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 px-1">
              <div>
                <h3 className="text-base sm:text-xl font-black text-white">{lightboxImg.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{lightboxImg.desc}</p>
              </div>
              <button
                onClick={() => setLightboxImg(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/10 max-h-[75vh] flex items-center justify-center bg-black/60 p-1">
              <img 
                src={lightboxImg.src} 
                alt={lightboxImg.title} 
                className="w-full h-auto max-h-[72vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
