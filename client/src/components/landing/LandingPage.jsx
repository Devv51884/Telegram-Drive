import React, { useState, useEffect } from "react";
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
  Laptop
} from "lucide-react";

export default function LandingPage({ onNavigate, siteSettings }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [demoTab, setDemoTab] = useState("stream"); // 'stream' | 'upload' | 'share' | 'import'
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulatedTime, setSimulatedTime] = useState(42);
  const [uploadPercent, setUploadPercent] = useState(86);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Simulated video playback timer in demo
  useEffect(() => {
    let interval;
    if (isPlaying && demoTab === "stream") {
      interval = setInterval(() => {
        setSimulatedTime((prev) => (prev >= 120 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, demoTab]);

  // Simulated upload progress in demo
  useEffect(() => {
    let interval;
    if (demoTab === "upload") {
      interval = setInterval(() => {
        setUploadPercent((prev) => (prev >= 99 ? 45 : prev + 1));
      }, 800);
    }
    return () => clearInterval(interval);
  }, [demoTab]);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const supportEmail = siteSettings?.supportEmail || "support@telegram-drive.in";
  const telegramChannel = siteSettings?.telegramChannel || "https://t.me/telegram_drive_in";

  const faqs = [
    {
      q: "Is TeleDrive really 100% free and unlimited?",
      a: "Yes! TeleDrive connects directly to Telegram's official MTProto cloud infrastructure. Telegram allows users to store files and documents in personal cloud channels with zero storage caps. TeleDrive organizes this into a modern Google Drive-like interface with zero storage limits."
    },
    {
      q: "What is the maximum file upload size?",
      a: "You can upload individual files up to 2GB each. Our chunked streaming engine automatically handles large video files, software archives, raw photos, and documents."
    },
    {
      q: "Can I stream videos and preview PDFs without downloading?",
      a: "Absolutely! TeleDrive features an advanced multi-DC byte-range video streaming engine. You can instantly play 4K, 1080p, and 720p MP4, MKV, and WebM videos with full seek bar support without downloading the entire file."
    },
    {
      q: "How does TeleDrive keep my files secure and private?",
      a: "All file transfers are protected with TLS/SSL encryption and stored on Telegram's encrypted distributed cloud servers. Your files are accessible only to you via signed JWT tokens, and shared files can be password-protected with custom expiration limits."
    },
    {
      q: "Can I import files from my Telegram channels or groups?",
      a: "Yes! With our Telegram Post Link Importer, you can paste any public or private channel post link (e.g. https://t.me/channel/123) and stream or manage that file directly inside your TeleDrive workspace."
    },
    {
      q: "Do I need to install any app to use TeleDrive?",
      a: "No installation is required. TeleDrive runs seamlessly in any web browser on Android, iOS, Windows, macOS, and Linux."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden">
      {/* Background Animated Ambient Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 -right-48 w-[600px] h-[600px] bg-gradient-to-bl from-cyan-500/15 via-purple-600/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-48 left-1/4 w-[700px] h-[700px] bg-gradient-to-tr from-sky-600/15 via-blue-900/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#07090e]/85 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/25 group-hover:scale-105 group-hover:shadow-blue-500/40 transition-all">
              <div className="w-full h-full bg-[#0b0f17] rounded-[14px] flex items-center justify-center">
                <Cloud className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white">
                  Tele<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-400">Drive</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                  Cloud
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Unlimited Telegram Cloud Storage</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-cyan-400 transition-colors">
              Features
            </a>
            <a href="#preview" className="hover:text-cyan-400 transition-colors">
              Live Demo
            </a>
            <a href="#comparison" className="hover:text-cyan-400 transition-colors">
              Comparison
            </a>
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">
              FAQs
            </a>
            <button
              onClick={() => onNavigate("contact")}
              className="hover:text-cyan-400 transition-colors"
            >
              Contact
            </button>
          </nav>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate("auth_login")}
              className="px-3.5 sm:px-4 py-2 text-xs font-bold text-slate-200 hover:text-white rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate("auth_signup")}
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-850 border border-slate-700 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0e17] border-b border-slate-800 px-5 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 text-sm">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 font-medium py-1"
            >
              Features
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 font-medium py-1"
            >
              Live Demo
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 font-medium py-1"
            >
              Comparison
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 font-medium py-1"
            >
              How It Works
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyan-400 font-medium py-1"
            >
              FAQs
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate("contact");
              }}
              className="block text-left w-full text-slate-300 hover:text-cyan-400 font-medium py-1"
            >
              Contact Support
            </button>
          </div>
        )}
      </header>

      {/* Announcement Banner */}
      {siteSettings?.announcementBanner && (
        <div className="bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-blue-950/90 border-b border-blue-500/30 py-2.5 px-4 text-center text-xs font-medium text-blue-200">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            {siteSettings.announcementBanner}
          </span>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Floating Top Pill Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-300 mb-6 sm:mb-8 backdrop-blur-md shadow-lg shadow-blue-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
          <span>Powered by Telegram MTProto Cloud • 2GB File Limits • 100% Free Forever</span>
        </div>

        {/* Main Hero Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.12] mb-6 sm:mb-8">
          Unlimited Cloud Storage,
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-teal-300">
            Powered by Telegram.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base lg:text-xl text-slate-300 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed font-normal">
          Turn your Telegram account into a lightning-fast, unlimited Google Drive-style cloud. Upload up to 2GB per file, stream 4K videos instantly without downloading, organize folders, and share securely.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mb-12 sm:mb-16 max-w-md mx-auto">
          <button
            onClick={() => onNavigate("auth_signup")}
            className="w-full sm:w-auto flex-1 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#preview"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
            <span>Interactive Demo</span>
          </a>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-16 sm:mb-20 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md text-center">
            <p className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Unlimited
            </p>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">Free Storage Cap</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md text-center">
            <p className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">
              2.0 GB
            </p>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">Max Single File Size</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md text-center">
            <p className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">
              Zero Buffering
            </p>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">Multi-DC 4K Streaming</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md text-center">
            <p className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
              $0 / Month
            </p>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">100% Free Forever</p>
          </div>
        </div>

        {/* 3. INTERACTIVE LIVE DEMO WIDGET */}
        <div id="preview" className="max-w-5xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-750 p-3 sm:p-6 shadow-2xl shadow-blue-500/10 text-left backdrop-blur-xl">
          {/* Demo Widget Window Header & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-slate-400 font-mono ml-2">teledrive.cloud/workspace</span>
            </div>

            {/* Tab Selector */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800 text-xs">
              <button
                onClick={() => setDemoTab("stream")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  demoTab === "stream" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                🎬 4K Video Stream
              </button>
              <button
                onClick={() => setDemoTab("upload")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  demoTab === "upload" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                ⚡ 2GB Chunk Upload
              </button>
              <button
                onClick={() => setDemoTab("share")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  demoTab === "share" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                🔒 Smart Share Link
              </button>
              <button
                onClick={() => setDemoTab("import")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  demoTab === "import" ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                }`}
              >
                📥 Channel Importer
              </button>
            </div>
          </div>

          {/* Demo Content Showcase */}
          <div className="py-5 px-1 sm:px-3">
            {/* TAB 1: 4K Video Streaming */}
            {demoTab === "stream" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-cyan-400 flex-shrink-0">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Interstellar.IMAX.2160p.HDR.x265.mkv</p>
                      <p className="text-xs text-slate-400">1.94 GB • 4K UHD Matroska • Telegram MTProto Byte-Range Stream</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/25 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Stream Ready
                    </span>
                  </div>
                </div>

                {/* Simulated Video Player */}
                <div className="relative aspect-video max-h-[360px] rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950/60 border border-slate-800 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400 z-10">
                    <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md font-mono text-[10px] text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                      4K 2160p • 60 FPS • TLS 1.3
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono bg-black/60 px-2.5 py-1 rounded-lg backdrop-blur">
                      01:{simulatedTime < 10 ? `0${simulatedTime}` : simulatedTime}:18 / 02:49:00
                    </span>
                  </div>

                  <div className="flex items-center justify-center z-10">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-16 h-16 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl shadow-blue-500/50 hover:scale-110 active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 ml-1 fill-white" />}
                    </button>
                  </div>

                  <div className="space-y-2 z-10">
                    <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden relative cursor-pointer">
                      <div className="absolute left-0 top-0 bottom-0 bg-blue-400/40 w-4/5" />
                      <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-500 to-cyan-400 w-[65%]" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Multi-DC Range Streaming (Zero buffering seeking)</span>
                      <span className="text-emerald-400 font-bold font-mono">18.2 MB/s Telegram CDN</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 2GB Upload Engine */}
            {demoTab === "upload" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Unreal_Engine_Project_Archive.zip</p>
                        <p className="text-xs text-slate-400">1,940 MB of 2,000 MB • Chunk 242/250 (8MB Parallel Chunks)</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      {uploadPercent}%
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      Status: Syncing with Telegram MTProto Storage
                    </span>
                    <span className="font-mono text-cyan-300 font-semibold">Speed: 24.8 MB/s • ETA: 2s</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <p className="text-slate-400 text-[11px] font-semibold">Chunk Engine</p>
                    <p className="font-bold text-white mt-1">8MB Parallel Streams</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <p className="text-slate-400 text-[11px] font-semibold">Network Resilience</p>
                    <p className="font-bold text-emerald-400 mt-1">Automatic Retry on Drop</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <p className="text-slate-400 text-[11px] font-semibold">Destination</p>
                    <p className="font-bold text-cyan-400 mt-1">Encrypted Telegram DCs</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Smart Share Link */}
            {demoTab === "share" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <Share2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Q3_Financial_Presentation_Deck.pdf</p>
                        <p className="text-xs text-slate-400">Protected Share Link with Password & View Limits</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-300">
                    <span className="truncate">https://telegram-drive.in/?share=tok_984f1a09bc2</span>
                    <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">
                      Copy Link
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Password Protected</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Direct Download Allowed</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>In-Browser PDF Viewer</span>
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Expires in 7 Days</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Channel Importer */}
            {demoTab === "import" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                      <Send className="w-6 h-6 -rotate-12" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Import from Any Telegram Channel</p>
                      <p className="text-xs text-slate-400">Paste any public or private channel post link to import instantly</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://t.me/tech_courses_library/8412"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 font-mono outline-none"
                    />
                    <button className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-600/30">
                      Import Now
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Full React Masterclass 2026.mp4 (1.42 GB) synced in 0.8s</span>
                    </span>
                    <span className="text-cyan-400 font-semibold">Zero Bandwidth Used</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. FEATURES BENTO GRID SECTION */}
      <section id="features" className="relative z-10 py-16 sm:py-24 bg-slate-950/70 border-t border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
            Core Features
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Everything you need for modern, limitless cloud storage.
          </h2>
          <p className="text-xs sm:text-base text-slate-400 mt-3">
            Built for creators, developers, students, and businesses who want freedom from monthly storage fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Bento Card 1 */}
          <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 transition-all hover:shadow-2xl hover:shadow-blue-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Unlimited MTProto Cloud</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Store terabytes of movies, documents, raw photos, and software backups with zero storage caps and zero subscription bills.
            </p>
          </div>

          {/* Bento Card 2 */}
          <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition-all hover:shadow-2xl hover:shadow-cyan-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant 4K & HD Streaming</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Play MP4, MKV, and WebM video files instantly with smooth timeline seeking. Zero need to download large files first.
            </p>
          </div>

          {/* Bento Card 3 */}
          <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 transition-all hover:shadow-2xl hover:shadow-purple-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">2GB File Upload Engine</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              High-speed multi-chunk assembly engine with automatic network retries, real-time speed meters, and time-remaining calculations.
            </p>
          </div>

          {/* Bento Card 4 */}
          <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Google Drive-Style Workspace</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Intuitive nested folders, drag-and-drop organization, starred items, trash bin restoration, and fast global search.
            </p>
          </div>

          {/* Bento Card 5 */}
          <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-pink-500/40 transition-all hover:shadow-2xl hover:shadow-pink-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-white transition-all">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Secure Protected Sharing</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Share individual files or whole folders with public links, optional password locks, download restrictions, and expiry dates.
            </p>
          </div>

          {/* Bento Card 6 */}
          <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 transition-all hover:shadow-2xl hover:shadow-amber-500/10 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all">
              <Send className="w-6 h-6 -rotate-12" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Telegram Channel Importer</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Stream and manage files from public or private Telegram channels in seconds without consuming local internet bandwidth.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CLOUD COMPARISON MATRIX */}
      <section id="comparison" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">
            Comparison
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            How TeleDrive Compares to Others
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Clear, transparent comparison between TeleDrive and legacy cloud storage providers.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="p-4 sm:p-5">Feature</th>
                  <th className="p-4 sm:p-5 text-cyan-300 font-extrabold bg-blue-500/15 border-l border-r border-blue-500/30 text-center">
                    TeleDrive Cloud
                  </th>
                  <th className="p-4 sm:p-5 text-center">Google Drive</th>
                  <th className="p-4 sm:p-5 text-center">Dropbox</th>
                  <th className="p-4 sm:p-5 text-center">Mega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Free Storage Limit</td>
                  <td className="p-4 sm:p-5 text-center font-bold text-emerald-400 bg-blue-500/5 border-l border-r border-blue-500/20">
                    Unlimited
                  </td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">15 GB max</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">2 GB max</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">20 GB max</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Max Single File Size</td>
                  <td className="p-4 sm:p-5 text-center font-bold text-emerald-400 bg-blue-500/5 border-l border-r border-blue-500/20">
                    2 GB / file
                  </td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">Limited by 15GB</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">2 GB total</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">Bandwidth limit</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">4K / HD Video Seeking</td>
                  <td className="p-4 sm:p-5 text-center font-bold text-emerald-400 bg-blue-500/5 border-l border-r border-blue-500/20">
                    <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                  </td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">Transcoded 720p</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">15 min preview limit</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">Download required</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Telegram Channel Importer</td>
                  <td className="p-4 sm:p-5 text-center font-bold text-emerald-400 bg-blue-500/5 border-l border-r border-blue-500/20">
                    <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                  </td>
                  <td className="p-4 sm:p-5 text-center text-slate-400"><X className="w-5 h-5 text-rose-400 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center text-slate-400"><X className="w-5 h-5 text-rose-400 mx-auto" /></td>
                  <td className="p-4 sm:p-5 text-center text-slate-400"><X className="w-5 h-5 text-rose-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-white">Monthly Subscription Cost</td>
                  <td className="p-4 sm:p-5 text-center font-bold text-emerald-400 bg-blue-500/5 border-l border-r border-blue-500/20">
                    $0.00 (Free Forever)
                  </td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">$1.99 - $9.99/mo</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">$9.99/mo</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">$5.40/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 py-16 sm:py-24 bg-slate-950/70 border-t border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">
            Easy Setup
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Get Started in Under 30 Seconds
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-7 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center relative hover:border-blue-500/40 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-black text-xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
              1
            </div>
            <h3 className="text-base font-bold text-white mb-2">Create Free Account</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Sign up with your email address in seconds. No credit card or billing information is ever required.
            </p>
          </div>

          <div className="p-7 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center relative hover:border-purple-500/40 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-black text-xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/20">
              2
            </div>
            <h3 className="text-base font-bold text-white mb-2">Upload Files or Import Links</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Drag & drop files up to 2GB each into your drive, or paste Telegram channel links to import media directly.
            </p>
          </div>

          <div className="p-7 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center relative hover:border-emerald-500/40 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-black text-xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
              3
            </div>
            <h3 className="text-base font-bold text-white mb-2">Stream & Share Anywhere</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Instantly stream 4K videos without buffering, preview documents, and share password-protected links.
            </p>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">
            Knowledge Base
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 hover:bg-slate-800/40 transition-colors"
              >
                <span className="font-bold text-sm sm:text-base text-slate-200">{faq.q}</span>
                {openFaq === index ? (
                  <ChevronUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
              </button>
              {openFaq === index && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 animate-in fade-in duration-200">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. BOTTOM CTA BANNER */}
      <section className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-cyan-900/60 border border-blue-500/40 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto relative z-10 space-y-5">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ready to experience truly unlimited cloud storage?
            </h2>
            <p className="text-xs sm:text-sm text-blue-200">
              Join thousands of users organizing and streaming files with zero monthly storage fees.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate("auth_signup")}
                className="px-8 py-4 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <span>Create Free Account Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="relative z-10 border-t border-slate-800 bg-[#05070b] pt-12 sm:pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5">
                <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <span className="font-extrabold text-lg text-white">TeleDrive Cloud</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Unlimited Telegram cloud storage platform. Up to 2GB per file, high-speed 4K streaming, and secure link sharing powered by MTProto.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Quick Navigation</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
              </li>
              <li>
                <a href="#preview" className="hover:text-cyan-400 transition-colors">Live Demo</a>
              </li>
              <li>
                <a href="#comparison" className="hover:text-cyan-400 transition-colors">Comparison</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQs</a>
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Legal & Support</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate("privacy")} className="hover:text-cyan-400 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("terms")} className="hover:text-cyan-400 transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("contact")} className="hover:text-cyan-400 transition-colors">
                  Contact Support
                </button>
              </li>
              {telegramChannel && (
                <li>
                  <a href={telegramChannel} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                    <span>Telegram Channel</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} TeleDrive. All rights reserved. Powered by Telegram MTProto API.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate("privacy")} className="hover:text-slate-400">Privacy</button>
            <button onClick={() => onNavigate("terms")} className="hover:text-slate-400">Terms</button>
            <button onClick={() => onNavigate("contact")} className="hover:text-slate-400">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
