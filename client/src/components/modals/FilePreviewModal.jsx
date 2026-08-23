import React, { useState, useEffect, useRef } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import PdfViewer from "./PdfViewer.jsx";
import mammoth from "mammoth";
import {
  X,
  Download,
  Star,
  ExternalLink,
  Film,
  Image as ImageIcon,
  FileText,
  Music,
  File,
  Send,
  ZoomIn,
  ZoomOut,
  Loader2,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  BookOpen
} from "lucide-react";

export default function FilePreviewModal() {
  const { previewItem, setPreviewItem, toggleStar, showToast } = useDrive();
  const [zoom, setZoom] = useState(1);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Document & Text State
  const [docHtml, setDocHtml] = useState("");
  const [textContent, setTextContent] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);

  const handleClose = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      } catch {}
    }
    setPreviewItem(null);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute("src");
          videoRef.current.load();
        } catch {}
      }
    };
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileExtension = (filename = "") => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  useEffect(() => {
    setZoom(1);
    setVideoLoading(true);
    setVideoError(false);
    setDocHtml("");
    setTextContent("");
    setDocLoading(false);
    setDocError("");
    setCopied(false);

    if (!previewItem) return;

    const ext = getFileExtension(previewItem.name);
    const isDocx = ext === "docx" || ext === "doc";
    const isText = [
      "txt",
      "md",
      "json",
      "csv",
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "html",
      "css",
      "sql",
      "xml",
      "log",
      "yaml",
      "yml",
      "env",
      "sh"
    ].includes(ext);

    const streamUrl = DriveAPI.getStreamUrl(previewItem.id);

    // 1. Fetch & parse Word Documents (.docx)
    if (isDocx) {
      setDocLoading(true);
      fetch(streamUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.arrayBuffer();
        })
        .then(async (arrayBuffer) => {
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setDocHtml(result.value || "<p>Document is empty</p>");
          } catch (mErr) {
            console.error("Mammoth DOCX parsing error:", mErr);
            setDocError("Could not render Word document formatting. Please download to view.");
          }
        })
        .catch((err) => {
          console.error("Fetch DOCX error:", err);
          setDocError("Failed to load document stream.");
        })
        .finally(() => setDocLoading(false));
    }

    // 2. Fetch & display Text / Code / Markdown / CSV files
    if (isText) {
      setDocLoading(true);
      fetch(streamUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
        })
        .catch((err) => {
          console.error("Fetch text error:", err);
          setDocError("Failed to load text content.");
        })
        .finally(() => setDocLoading(false));
    }
  }, [previewItem]);

  if (!previewItem) return null;

  const streamUrl = DriveAPI.getStreamUrl(previewItem.id);
  const downloadUrl = DriveAPI.getDownloadUrl(previewItem.id);
  const ext = getFileExtension(previewItem.name);

  const isDocx = ext === "docx" || ext === "doc";
  const isText = [
    "txt",
    "md",
    "json",
    "csv",
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "html",
    "css",
    "sql",
    "xml",
    "log",
    "yaml",
    "yml",
    "env",
    "sh"
  ].includes(ext);
  const isPdf = previewItem.type === "pdf" || ext === "pdf";

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    showToast("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRetryVideo = () => {
    setVideoError(false);
    setVideoLoading(true);
    if (videoRef.current) {
      const retryUrl = `${streamUrl}${streamUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`;
      videoRef.current.src = retryUrl;
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  const getVideoMimeType = (item) => {
    if (!item) return "video/mp4";
    const extension = getFileExtension(item.name);
    if (extension === "webm" || item.mime_type === "video/webm") return "video/webm";
    if (extension === "ogg" || extension === "ogv" || item.mime_type === "video/ogg") return "video/ogg";
    return "video/mp4";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="h-14 sm:h-16 px-2.5 sm:px-6 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 truncate max-w-[60vw] sm:max-w-xl">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 flex-shrink-0">
            {previewItem.type === "video" ? (
              <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : previewItem.type === "image" ? (
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : previewItem.type === "audio" ? (
              <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : isPdf || isDocx ? (
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            ) : (
              <File className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </div>
          <span className="font-semibold text-white text-xs sm:text-sm truncate">
            {previewItem.name}
          </span>
          <span className="hidden sm:inline text-xs text-slate-400 font-mono flex-shrink-0">
            {formatBytes(previewItem.size)}
          </span>

          {previewItem.source_type === "telegram_post" && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-sky-400 bg-sky-950/60 border border-sky-800/80 px-2 py-0.5 rounded-full flex-shrink-0">
              <Send className="w-2.5 h-2.5" />
              {previewItem.telegram_channel_title || "Telegram Channel"}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {isText && textContent && (
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Copy Content"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </button>
          )}

          {isPdf && (
            <a
              href={streamUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              title="Open PDF in Full Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Tab</span>
            </a>
          )}

          {previewItem.telegram_post_url && (
            <a
              href={previewItem.telegram_post_url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
              title="Open Telegram Post"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          )}

          <button
            onClick={() => toggleStar(previewItem)}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
            title="Star"
          >
            <Star
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                previewItem.is_starred ? "fill-amber-400 text-amber-400" : ""
              }`}
            />
          </button>

          <a
            href={downloadUrl}
            download={previewItem.name}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            title="Download File"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Download</span>
          </a>

          <div className="h-4 w-px bg-slate-800 mx-0.5 sm:mx-1" />

          <button
            onClick={handleClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Main Preview Player / Viewer Canvas */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-auto">
        {/* 1. VIDEO PREVIEW */}
        {previewItem.type === "video" ? (
          <div className="relative w-full max-w-5xl max-h-[82vh] flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            {videoLoading && !videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">
                  Streaming from Telegram Cloud...
                </p>
              </div>
            )}

            {videoError ? (
              <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center text-slate-400 max-w-md">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">Video Stream Error</h4>
                <p className="text-xs mb-4 text-slate-400">
                  {previewItem.source_type === "telegram_post"
                    ? "Could not buffer video stream. Ensure your bot or connected Telegram account has access to this channel post."
                    : "Could not buffer video stream. Please check your storage bot connection or retry."}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRetryVideo}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Stream</span>
                  </button>
                  <a
                    href={downloadUrl}
                    download={previewItem.name}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Instead</span>
                  </a>
                </div>
              </div>
            ) : (
              <video
                key={previewItem.id}
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
                  console.error("Video stream error:", videoRef.current?.error);
                  setVideoLoading(false);
                  setVideoError(true);
                }}
                className="w-full h-full max-h-[80vh] object-contain rounded-3xl"
              >
                Your browser does not support HTML5 video streaming.
              </video>
            )}
          </div>
        ) : previewItem.type === "image" ? (
          /* 2. IMAGE PREVIEW */
          <div className="relative flex flex-col items-center justify-center max-w-full max-h-full">
            <img
              src={streamUrl}
              alt={previewItem.name}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-200"
            />
            {/* Zoom Controls */}
            <div className="absolute bottom-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full px-3 py-1.5 flex items-center gap-3 text-white">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="hover:text-blue-400 p-1"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="hover:text-blue-400 p-1"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : isPdf ? (
          /* 3. PDF PREVIEW (Canvas-based with mobile support) */
          <PdfViewer
            url={streamUrl}
            fileName={previewItem.name}
            downloadUrl={downloadUrl}
          />
        ) : isDocx ? (
          /* 4. WORD DOCUMENT (.DOCX) PREVIEW */
          <div className="w-full max-w-4xl max-h-[80vh] bg-white text-slate-900 rounded-2xl shadow-2xl overflow-auto border border-slate-800 p-6 md:p-10">
            {docLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm font-medium">Rendering Word Document...</p>
              </div>
            ) : docError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-600">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
                <h4 className="text-base font-bold text-slate-800 mb-1">Document Formatting Notice</h4>
                <p className="text-xs mb-4 text-slate-500 max-w-sm">{docError}</p>
                <a
                  href={downloadUrl}
                  download={previewItem.name}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Document</span>
                </a>
              </div>
            ) : (
              <div
                className="prose prose-slate max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: docHtml }}
              />
            )}
          </div>
        ) : isText ? (
          /* 5. TEXT / CODE PREVIEW */
          <div className="w-full max-w-4xl max-h-[80vh] bg-slate-900 text-slate-100 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col">
            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">{previewItem.name}</span>
              <span>{textContent.split("\n").length} lines</span>
            </div>
            <div className="p-4 overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
              {docLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading text...</span>
                </div>
              ) : (
                textContent
              )}
            </div>
          </div>
        ) : previewItem.type === "audio" ? (
          /* 6. AUDIO PREVIEW */
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-md w-full">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
              <Music className="w-10 h-10" />
            </div>
            <div className="text-center truncate max-w-full">
              <h3 className="text-base font-bold text-white truncate">{previewItem.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">{formatBytes(previewItem.size)}</p>
            </div>
            <audio controls src={streamUrl} className="w-full" autoPlay>
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : (
          /* 7. GENERIC UNSUPPORTED FILE PREVIEW */
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-md w-full">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
              <File className="w-10 h-10" />
            </div>
            <h3 className="text-base font-bold text-white truncate max-w-full mb-1">
              {previewItem.name}
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-mono">{formatBytes(previewItem.size)}</p>
            <p className="text-xs text-slate-400 mb-6">
              Preview is not supported for this file type. You can download it directly.
            </p>
            <a
              href={downloadUrl}
              download={previewItem.name}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors shadow-lg shadow-blue-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
