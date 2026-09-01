import React, { useState } from "react";
import {
  Cloud,
  HardDrive,
  Film,
  Zap,
  ShieldCheck,
  Share2,
  FolderPlus,
  Play,
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
  X
} from "lucide-react";

export default function LandingPage({ onNavigate, siteSettings }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [demoTab, setDemoTab] = useState("stream"); // 'stream' | 'upload' | 'share'
  const [simulatedProgress, setSimulatedProgress] = useState(74);

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
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 selection:bg-blue-500 selection:text-white font-sans overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
      </div>

      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0b0f17]/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0f172a] rounded-[14px] flex items-center justify-center">
                <Cloud className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  Tele<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Drive</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  Cloud
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Unlimited Telegram Cloud Storage</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">
              Features
            </a>
            <a href="#comparison" className="hover:text-blue-400 transition-colors">
              Comparison
            </a>
            <a href="#how-it-works" className="hover:text-blue-400 transition-colors">
              How It Works
            </a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">
              FAQs
            </a>
            <button
              onClick={() => onNavigate("contact")}
              className="hover:text-blue-400 transition-colors"
            >
              Contact Us
            </button>
          </nav>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => onNavigate("auth_login")}
              className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white rounded-xl hover:bg-slate-800/80 transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate("auth_signup")}
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Announcement Banner (if configured in site settings) */}
      {siteSettings?.announcementBanner && (
        <div className="bg-gradient-to-r from-blue-950/80 via-purple-950/80 to-blue-950/80 border-b border-blue-500/20 py-2.5 px-4 text-center text-xs font-medium text-blue-200">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            {siteSettings.announcementBanner}
          </span>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Floating Top Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-300 mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Powered by Telegram MTProto API • Up to 2GB Per File</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.15] mb-6 sm:mb-8">
          Store <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300">Unlimited Files</span> on Telegram Cloud.
          <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> 100% Free Forever.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          TeleDrive transforms Telegram into an ultra-fast, intuitive Google Drive-style cloud storage system. Store up to 2GB per file, stream 4K videos instantly without downloading, organize folders, and share securely.
        </p>

        {/* Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mb-12 sm:mb-16">
          <button
            onClick={() => onNavigate("auth_signup")}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate("auth_login")}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <span>Open Web Drive</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto mb-16 sm:mb-20 text-xs text-slate-400">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold text-slate-200">2GB Upload Limit</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold text-slate-200">Zero Storage Caps</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold text-slate-200">Instant HD Seeking</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold text-slate-200">No Ads / 100% Free</span>
          </div>
        </div>

        {/* 3. INTERACTIVE LIVE DEMO WIDGET */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 p-3 sm:p-5 shadow-2xl shadow-blue-500/10 text-left">
          {/* Demo Widget Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-slate-400 font-mono ml-2">teledrive-workspace.preview</span>
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <button
                onClick={() => setDemoTab("stream")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  demoTab === "stream" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                🎬 Video Stream Demo
              </button>
              <button
                onClick={() => setDemoTab("upload")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  demoTab === "upload" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                ⚡ 2GB Upload Engine
              </button>
              <button
                onClick={() => setDemoTab("share")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  demoTab === "share" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                🔒 Smart Share Link
              </button>
            </div>
          </div>

          {/* Demo Content Area */}
          <div className="py-6 px-2 sm:px-4">
            {demoTab === "stream" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex-shrink-0">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">SpiderMan.Across.The.SpiderVerse.4K.mkv</p>
                      <p className="text-xs text-slate-400">1.84 GB • Matroska 4K HDR • Telegram MTProto Stream</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Stream Ready
                    </span>
                  </div>
                </div>

                {/* Simulated Video Player UI */}
                <div className="relative aspect-video rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950/40 border border-slate-800 flex flex-col justify-between p-4 overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur font-mono text-[10px] text-cyan-400 border border-cyan-500/30">
                      HD 2160p • 60 FPS
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">01:42:18 / 02:20:00</span>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-xl shadow-blue-500/40 cursor-pointer hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 ml-0.5 fill-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Simulated Multi-Range Buffer Bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                      <div className="absolute left-0 top-0 bottom-0 bg-blue-400/40 w-4/5" />
                      <div className="absolute left-0 top-0 bottom-0 bg-blue-500 w-[72%]" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Multi-DC Range Streaming (Zero lag seeking)</span>
                      <span className="text-emerald-400 font-semibold">12.4 MB/s Telegram CDN</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {demoTab === "upload" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Full_Project_Archive_2026.zip</p>
                        <p className="text-xs text-slate-400">1,940 MB of 2,000 MB • Chunk 242/250</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-purple-400">97%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 w-[97%] transition-all" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Phase: Syncing with Telegram Cloud (97%)</span>
                    <span className="font-mono text-slate-300">Speed: 18.5 MB/s • ETA: 3s</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-slate-400 text-[11px]">Chunk Engine</p>
                    <p className="font-bold text-white mt-0.5">8MB Parallel Chunks</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-slate-400 text-[11px]">Resilience</p>
                    <p className="font-bold text-emerald-400 mt-0.5">Auto-Retry on Timeout</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-slate-400 text-[11px]">Storage Destination</p>
                    <p className="font-bold text-cyan-400 mt-0.5">Encrypted TG Data Centers</p>
                  </div>
                </div>
              </div>
            )}

            {demoTab === "share" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Share2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Design_Presentation_Deck.pdf</p>
                        <p className="text-xs text-slate-400">Public Link with Password & Expiry Protection</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono text-blue-300">
                    <span className="truncate">https://telegram-drive.in/?share=tok_984f1a...</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">Copy</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Password Protected</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Direct Download Enabled</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>In-Browser PDF Viewer</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. FEATURES GRID SECTION */}
      <section id="features" className="relative z-10 py-16 sm:py-24 bg-slate-950/60 border-t border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Unmatched Capabilities</h2>
          <p className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything you need in a modern, limitless cloud drive.
          </p>
          <p className="text-xs sm:text-sm text-slate-400 mt-3">
            Designed for content creators, developers, students, and businesses who want freedom from expensive storage caps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-all hover:shadow-xl hover:shadow-blue-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Unlimited Cloud Storage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Store terabytes of movies, photos, documents, and backups without ever running out of space or paying expensive monthly fees.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all hover:shadow-xl hover:shadow-cyan-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Instant 4K & HD Streaming</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Play MP4, MKV, and WebM videos instantly with full timeline seeking. Our streaming proxy pipes bytes directly from Telegram Data Centers.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">2GB File Upload Support</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload large game files, raw video footage, and heavy software archives with our resilient chunked upload engine.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all hover:shadow-xl hover:shadow-emerald-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Google Drive-Style Folders</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Organize your files with nested folders, drag-and-drop moving, starring favorites, trash recovery, and instant search.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-pink-500/40 transition-all hover:shadow-xl hover:shadow-pink-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Smart Secure Link Sharing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Share individual files or whole folders with public links, optional password locks, custom expiration times, and viewer/editor permissions.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 transition-all hover:shadow-xl hover:shadow-amber-500/5 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Telegram Post Link Importer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Import and stream videos from public or private Telegram channels in seconds. No need to download and re-upload files manually.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CLOUD COMPARISON MATRIX */}
      <section id="comparison" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">Why Switch To TeleDrive?</h2>
          <p className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            See how TeleDrive compares to traditional cloud drives.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="p-4 sm:p-5">Feature</th>
                  <th className="p-4 sm:p-5 text-blue-400 font-extrabold bg-blue-500/10 border-l border-r border-blue-500/20 text-center">
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
                  <td className="p-4 sm:p-5 font-semibold text-white">Max File Size (Free)</td>
                  <td className="p-4 sm:p-5 text-center font-bold text-emerald-400 bg-blue-500/5 border-l border-r border-blue-500/20">
                    2 GB / file
                  </td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">Shared with 15GB</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">2 GB max</td>
                  <td className="p-4 sm:p-5 text-center text-slate-400">Limited bandwidth</td>
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

      {/* 6. HOW IT WORKS (3 STEPS) */}
      <section id="how-it-works" className="relative z-10 py-16 sm:py-24 bg-slate-950/60 border-t border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Simple 3-Step Setup</h2>
          <p className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Get started in under 30 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-black text-lg flex items-center justify-center mx-auto mb-5">
              1
            </div>
            <h3 className="text-base font-bold text-white mb-2">Create Free Account</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sign up with your email address and verify with one click. No credit card or payment info required.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center relative">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 font-black text-lg flex items-center justify-center mx-auto mb-5">
              2
            </div>
            <h3 className="text-base font-bold text-white mb-2">Upload or Import Links</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag & drop files up to 2GB directly into your drive, or paste Telegram channel post links for instant streaming.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-black text-lg flex items-center justify-center mx-auto mb-5">
              3
            </div>
            <h3 className="text-base font-bold text-white mb-2">Stream & Share Anywhere</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stream your videos in 4K, preview PDFs, and create password-protected share links for friends and colleagues.
            </p>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Got Questions?</h2>
          <p className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </p>
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
                  <ChevronUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
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
        <div className="rounded-3xl bg-gradient-to-r from-blue-900/60 via-purple-900/60 to-blue-900/60 border border-blue-500/30 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto relative z-10 space-y-5">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ready to experience truly unlimited cloud storage?
            </h2>
            <p className="text-xs sm:text-sm text-blue-200">
              Join thousands of users storing videos, archives, and documents on Telegram Cloud with zero fees.
            </p>
            <div className="pt-2">
              <button
                onClick={() => onNavigate("auth_signup")}
                className="px-8 py-3.5 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-extrabold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <span>Create Free Account Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="relative z-10 border-t border-slate-800 bg-[#070a10] pt-12 sm:pt-16 pb-12 px-4 sm:px-6 lg:px-8">
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
              Unlimited free Telegram cloud storage platform. Up to 2GB per file, high-speed 4K streaming, and secure link sharing powered by MTProto.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Quick Navigation</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
              </li>
              <li>
                <a href="#comparison" className="hover:text-blue-400 transition-colors">Comparison</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-blue-400 transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-blue-400 transition-colors">FAQs</a>
              </li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Legal & Support</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate("privacy")} className="hover:text-blue-400 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("terms")} className="hover:text-blue-400 transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate("contact")} className="hover:text-blue-400 transition-colors">
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
