import React, { useState, useEffect, useRef } from "react";
import DriveAPI from "../../services/api.js";
import {
  Download,
  Film,
  Image as ImageIcon,
  FileText,
  File,
  Folder,
  Loader2,
  AlertCircle,
  Lock,
  ExternalLink,
  RefreshCw,
  Play,
  ArrowLeft,
  Share2,
  Check,
  Globe
} from "lucide-react";

export default function PublicShareView({ shareToken, onBackToApp }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRestricted, setIsRestricted] = useState(false);

  // Video Streaming State
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  // Active subfolder inside shared folder
  const [activeFolderItem, setActiveFolderItem] = useState(null);
  const [previewSubItem, setPreviewSubItem] = useState(null);

  useEffect(() => {
    if (!shareToken) return;
    setLoading(true);
    setError(null);
    setIsRestricted(false);

    DriveAPI.getPublicShareInfo(shareToken)
      .then((res) => {
        if (res.success) {
          setData(res);
        } else {
          setError(res.error || "Shared item not found");
        }
      })
      .catch((err) => {
        console.error("Public share error:", err);
        if (err.response?.status === 403 || err.response?.data?.isRestricted) {
          setIsRestricted(true);
          setData(err.response?.data);
        } else {
          setError(err.response?.data?.error || "Shared link is invalid or has expired.");
        }
      })
      .finally(() => setLoading(false));
  }, [shareToken]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleRetryVideo = () => {
    setVideoError(false);
    setVideoLoading(true);
    if (videoRef.current) {
      const currentSrc = videoRef.current.src;
      videoRef.current.src = `${currentSrc.split("&_t=")[0]}&_t=${Date.now()}`;
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white gap-4 p-4 font-sans">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-slate-300">Loading shared content...</p>
      </div>
    );
  }

  // 2. Restricted / Private State
  if (isRestricted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1.5">You need access</h2>
            <p className="text-xs text-slate-400">
              This file is private. Ask the owner for access, or switch to an account with permission.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = window.location.origin;
            }}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/20"
          >
            Sign in with TeleDrive
          </button>
        </div>
      </div>
    );
  }

  // 3. Not Found / Error State
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Item not available</h2>
          <p className="text-xs text-slate-400">{error || "The link you followed may be expired or broken."}</p>
          <button
            onClick={() => {
              window.location.href = window.location.origin;
            }}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Go to TeleDrive
          </button>
        </div>
      </div>
    );
  }

  const { type, item, contents } = data;
  const streamUrl = DriveAPI.getPublicShareStreamUrl(shareToken);
  const downloadUrl = DriveAPI.getPublicShareDownloadUrl(shareToken);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-8 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3 truncate max-w-[60vw]">
          <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-white flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline">TeleDrive Cloud</span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="truncate text-xs sm:text-sm font-semibold text-slate-200">
            {item.name}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={downloadUrl}
            download={item.name}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-md shadow-blue-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>

          <a
            href={window.location.origin}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors hidden sm:block"
          >
            Open TeleDrive
          </a>
        </div>
      </header>

      {/* Main Public Content Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 overflow-auto">
        {type === "file" && item.type === "video" ? (
          /* ============================================================ */
          /* 1. PUBLIC VIDEO PLAYER (Full streaming with HTTP 206)        */
          /* ============================================================ */
          <div className="w-full max-w-5xl flex flex-col items-center">
            <div className="relative w-full aspect-video max-h-[78vh] flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
              {videoLoading && !videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 gap-3">
                  <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-300 font-medium">
                    Streaming directly from Telegram Cloud...
                  </p>
                </div>
              )}

              {videoError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 max-w-md">
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">Playback Error</h4>
                  <p className="text-xs mb-4 text-slate-400">
                    Could not buffer video stream in this browser. Please download the file to play offline.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRetryVideo}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                    <a
                      href={downloadUrl}
                      download={item.name}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={streamUrl}
                  controls
                  autoPlay
                  preload="metadata"
                  playsInline
                  onLoadedMetadata={() => setVideoLoading(false)}
                  onLoadedData={() => {
                    setVideoLoading(false);
                    setVideoError(false);
                  }}
                  onCanPlay={() => setVideoLoading(false)}
                  onWaiting={() => setVideoLoading(true)}
                  onPlaying={() => {
                    setVideoLoading(false);
                    setVideoError(false);
                  }}
                  onError={(e) => {
                    const err = videoRef.current?.error;
                    if (err && err.code !== 1) {
                      setVideoLoading(false);
                      setVideoError(true);
                    }
                  }}
                  className="w-full h-full object-contain"
                >
                  Your browser does not support HTML5 video streaming.
                </video>
              )}
            </div>

            {/* Video File Meta Footer */}
            <div className="w-full flex items-center justify-between mt-3 px-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">{item.name}</span>
              <span>{formatBytes(item.size)}</span>
            </div>
          </div>
        ) : type === "file" && item.type === "image" ? (
          /* ============================================================ */
          /* 2. PUBLIC IMAGE VIEWER                                       */
          /* ============================================================ */
          <div className="flex flex-col items-center justify-center max-w-5xl max-h-[82vh]">
            <img
              src={streamUrl}
              alt={item.name}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
            <div className="mt-3 text-xs text-slate-400 font-medium">
              {item.name} • {formatBytes(item.size)}
            </div>
          </div>
        ) : type === "folder" ? (
          /* ============================================================ */
          /* 3. PUBLIC SHARED FOLDER EXPLORER                             */
          /* ============================================================ */
          <div className="w-full max-w-5xl bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400">
                <Folder className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{item.name}</h2>
                <p className="text-xs text-slate-400">
                  Shared folder contents ({contents?.files?.length || 0} files)
                </p>
              </div>
            </div>

            {contents?.files?.length === 0 && contents?.folders?.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                This folder is currently empty.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {contents?.files?.map((f) => {
                  const subStreamUrl = DriveAPI.getPublicFolderFileStreamUrl(shareToken, f.id);
                  const subDownloadUrl = DriveAPI.getPublicFolderFileDownloadUrl(shareToken, f.id);

                  return (
                    <div
                      key={f.id}
                      className="group relative flex flex-col justify-between p-3 rounded-2xl bg-slate-850/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-2 truncate mb-2">
                        {f.type === "video" ? (
                          <Film className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        ) : f.type === "image" ? (
                          <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-slate-200 truncate" title={f.name}>
                          {f.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                        <span>{formatBytes(f.size)}</span>
                        <a
                          href={subDownloadUrl}
                          download={f.name}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* 4. OTHER GENERIC DOCUMENTS (PDF / Archive / Text)            */
          /* ============================================================ */
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white truncate">{item.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{formatBytes(item.size)}</p>
            </div>
            <a
              href={downloadUrl}
              download={item.name}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-lg shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Document</span>
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
