import React, { useState, useEffect, useRef, useMemo } from "react";
import DriveAPI from "../../services/api.js";
import PdfViewer from "../modals/PdfViewer.jsx";
import mammoth from "mammoth";
import {
  Download,
  Film,
  Image as ImageIcon,
  FileText,
  File,
  Folder,
  Music,
  Archive,
  Loader2,
  AlertCircle,
  Lock,
  ExternalLink,
  RefreshCw,
  Play,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  X,
  Copy,
  Check,
  Globe,
  HardDrive,
  Clock,
  Eye,
  FolderOpen
} from "lucide-react";

export default function PublicShareView({ shareToken, onBackToApp }) {
  // Main Data State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [folderLoading, setFolderLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRestricted, setIsRestricted] = useState(false);

  // Navigation State
  const getInitialFolderFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("folder") || null;
    } catch {
      return null;
    }
  };

  const [currentFolderId, setCurrentFolderId] = useState(getInitialFolderFromUrl);

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [sortBy, setSortBy] = useState("name"); // 'name' | 'size' | 'date'
  const [sortOrder, setSortOrder] = useState("asc");

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [docHtml, setDocHtml] = useState("");
  const [textContent, setTextContent] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);

  // Fetch Shared Data
  const loadShareData = (targetFolderId = null, isInitial = false) => {
    if (!shareToken) return;
    if (isInitial) setLoading(true);
    else setFolderLoading(true);
    setError(null);
    setIsRestricted(false);

    DriveAPI.getPublicShareInfo(shareToken, targetFolderId)
      .then((res) => {
        if (res.success) {
          setData(res);
          if (res.currentFolder?.id) {
            setCurrentFolderId(res.currentFolder.id);
          }
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
      .finally(() => {
        setLoading(false);
        setFolderLoading(false);
      });
  };

  useEffect(() => {
    loadShareData(currentFolderId, true);
  }, [shareToken]);

  // Navigate into subfolder
  const handleOpenFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setSearchQuery("");
    try {
      const url = new URL(window.location);
      if (folderId && data?.rootFolder?.id && folderId !== data.rootFolder.id) {
        url.searchParams.set("folder", folderId);
      } else {
        url.searchParams.delete("folder");
      }
      window.history.pushState({}, "", url);
    } catch {}
    loadShareData(folderId, false);
  };

  // Format File Size
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Format Date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Get file icon helper
  const getFileIcon = (type, name = "") => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (type === "video" || ["mp4", "mkv", "avi", "mov", "webm"].includes(ext)) {
      return <Film className="w-5 h-5 text-rose-500 flex-shrink-0" />;
    }
    if (type === "image" || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    }
    if (type === "pdf" || ext === "pdf") {
      return <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />;
    }
    if (type === "audio" || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) {
      return <Music className="w-5 h-5 text-purple-500 flex-shrink-0" />;
    }
    if (type === "archive" || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return <Archive className="w-5 h-5 text-amber-500 flex-shrink-0" />;
    }
    return <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />;
  };

  // Filter & Sort folders and files
  const filteredFolders = useMemo(() => {
    if (!data?.contents?.folders) return [];
    let list = [...data.contents.folders];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [data?.contents?.folders, searchQuery]);

  const filteredFiles = useMemo(() => {
    if (!data?.contents?.files) return [];
    let list = [...data.contents.files];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Filter by category type
    if (typeFilter !== "all") {
      list = list.filter((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        if (typeFilter === "video") return f.type === "video" || ["mp4", "mkv", "avi", "mov", "webm"].includes(ext);
        if (typeFilter === "image") return f.type === "image" || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
        if (typeFilter === "pdf") return f.type === "pdf" || ext === "pdf";
        if (typeFilter === "audio") return f.type === "audio" || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext);
        if (typeFilter === "document") {
          return (
            f.type === "document" ||
            ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "json"].includes(ext)
          );
        }
        if (typeFilter === "archive") return f.type === "archive" || ["zip", "rar", "7z", "tar", "gz"].includes(ext);
        return true;
      });
    }

    // Sort files
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "size") {
        comparison = (Number(a.size) || 0) - (Number(b.size) || 0);
      } else if (sortBy === "date") {
        comparison = new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return list;
  }, [data?.contents?.files, searchQuery, typeFilter, sortBy, sortOrder]);

  // File Preview Handlers
  const handleOpenFilePreview = (file) => {
    setPreviewFile(file);
    setZoom(1);
    setVideoLoading(true);
    setVideoError(false);
    setDocHtml("");
    setTextContent("");
    setDocLoading(false);
    setDocError("");
    setCopied(false);
  };

  const handleClosePreview = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      } catch {}
    }
    setPreviewFile(null);
  };

  // Next / Previous file navigation in preview
  const currentFileIndex = useMemo(() => {
    if (!previewFile || !filteredFiles.length) return -1;
    return filteredFiles.findIndex((f) => f.id === previewFile.id);
  }, [previewFile, filteredFiles]);

  const handlePrevFile = () => {
    if (currentFileIndex > 0) {
      handleOpenFilePreview(filteredFiles[currentFileIndex - 1]);
    }
  };

  const handleNextFile = () => {
    if (currentFileIndex >= 0 && currentFileIndex < filteredFiles.length - 1) {
      handleOpenFilePreview(filteredFiles[currentFileIndex + 1]);
    }
  };

  // Preview URL helpers
  const getStreamUrlForFile = (file) => {
    if (data?.type === "file") {
      return DriveAPI.getPublicShareStreamUrl(shareToken);
    }
    return DriveAPI.getPublicFolderFileStreamUrl(shareToken, file.id);
  };

  const getDownloadUrlForFile = (file) => {
    if (data?.type === "file") {
      return DriveAPI.getPublicShareDownloadUrl(shareToken);
    }
    return DriveAPI.getPublicFolderFileDownloadUrl(shareToken, file.id);
  };

  // Load document / text preview when previewFile changes
  useEffect(() => {
    if (!previewFile) return;

    const ext = previewFile.name.split(".").pop()?.toLowerCase() || "";
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
      "html",
      "css",
      "py",
      "java",
      "c",
      "cpp",
      "sql",
      "xml",
      "yaml",
      "yml",
      "log",
      "env",
      "sh",
      "bat"
    ].includes(ext);

    if (isDocx) {
      setDocLoading(true);
      setDocError("");
      const docStreamUrl = getStreamUrlForFile(previewFile);
      fetch(docStreamUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          return res.arrayBuffer();
        })
        .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
        .then((result) => {
          setDocHtml(result.value);
          setDocLoading(false);
        })
        .catch((err) => {
          console.error("Docx parse error:", err);
          setDocError("Could not render document preview. You can download the file to view.");
          setDocLoading(false);
        });
    } else if (isText) {
      setDocLoading(true);
      setDocError("");
      const textStreamUrl = getStreamUrlForFile(previewFile);
      fetch(textStreamUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setDocLoading(false);
        })
        .catch((err) => {
          console.error("Text load error:", err);
          setDocError("Could not read text content. Please download the file to view.");
          setDocLoading(false);
        });
    }
  }, [previewFile]);

  // Video retry handler
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

  // 1. Initial Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white gap-4 p-4 font-sans">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-slate-300">Connecting to Telegram Cloud...</p>
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
              This item is private. Ask the owner for access, or sign in with an authorized account.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = window.location.origin;
            }}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/20"
          >
            Sign in to TeleDrive
          </button>
        </div>
      </div>
    );
  }

  // 3. Error / Not Found State
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

  const { type, item, rootFolder, currentFolder, breadcrumbs } = data;
  const currentTitle = type === "folder" ? currentFolder?.name || rootFolder?.name || "Shared Folder" : item?.name;
  const singleFileStreamUrl = type === "file" ? DriveAPI.getPublicShareStreamUrl(shareToken) : "";
  const singleFileDownloadUrl = type === "file" ? DriveAPI.getPublicShareDownloadUrl(shareToken) : "";

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* ============================================================ */}
      {/* 1. TOP HEADER BAR                                             */}
      {/* ============================================================ */}
      <header className="h-16 px-4 sm:px-8 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between flex-shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-3 truncate max-w-[65vw]">
          <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-white flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline">TeleDrive Cloud</span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-1.5 truncate text-xs sm:text-sm font-semibold text-slate-200">
            {type === "folder" ? (
              <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
            ) : (
              getFileIcon(item?.type, item?.name)
            )}
            <span className="truncate">{currentTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {type === "file" && (
            <a
              href={singleFileDownloadUrl}
              download={item.name}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-md shadow-blue-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          )}

          <a
            href={window.location.origin}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors hidden sm:block"
          >
            Open TeleDrive
          </a>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA                                         */}
      {/* ============================================================ */}
      {type === "folder" ? (
        <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Breadcrumb Navigation Trail */}
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-800/80">
            <nav className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap">
              {breadcrumbs && breadcrumbs.length > 0 ? (
                breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.id || idx}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                      <button
                        onClick={() => handleOpenFolder(crumb.id)}
                        disabled={isLast}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                          isLast
                            ? "font-bold text-white bg-slate-800/80 cursor-default shadow-sm"
                            : "font-medium text-slate-400 hover:text-white hover:bg-slate-800/40"
                        }`}
                      >
                        {idx === 0 ? (
                          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{crumb.name}</span>
                      </button>
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Folder className="w-4 h-4 text-blue-400" />
                  <span>{currentTitle}</span>
                </div>
              )}
            </nav>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Bar & Category Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search in this folder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
              {[
                { id: "all", label: "All" },
                { id: "video", label: "Videos", icon: Film },
                { id: "image", label: "Photos", icon: ImageIcon },
                { id: "pdf", label: "PDFs", icon: FileText },
                { id: "audio", label: "Audio", icon: Music },
                { id: "document", label: "Docs", icon: FileText },
                { id: "archive", label: "Archives", icon: Archive }
              ].map((pill) => {
                const isActive = typeFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setTypeFilter(pill.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                    }`}
                  >
                    {pill.icon && <pill.icon className="w-3 h-3" />}
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading Indicator for subfolders */}
          {folderLoading && (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="text-xs text-slate-400">Loading folder contents...</span>
            </div>
          )}

          {!folderLoading && (
            <>
              {/* ============================================================ */}
              {/* SUBFOLDERS SECTION                                           */}
              {/* ============================================================ */}
              {filteredFolders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Folders ({filteredFolders.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredFolders.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => handleOpenFolder(f.id)}
                        className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-blue-500/50 hover:bg-slate-850/90 cursor-pointer transition-all shadow-sm hover:shadow-lg hover:shadow-blue-500/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: `${f.color || "#4285f4"}20`, color: f.color || "#4285f4" }}
                          >
                            <Folder className="w-5 h-5 fill-current" />
                          </div>
                          <div className="truncate">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                              {f.name}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {(f.file_count || 0) + (f.folder_count || 0)} items
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* FILES SECTION                                                */}
              {/* ============================================================ */}
              {filteredFiles.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Files ({filteredFiles.length})
                  </h3>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {filteredFiles.map((file) => {
                        const downloadUrl = DriveAPI.getPublicFolderFileDownloadUrl(shareToken, file.id);

                        return (
                          <div
                            key={file.id}
                            onClick={() => handleOpenFilePreview(file)}
                            className="group relative flex flex-col justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-blue-500/50 hover:bg-slate-850/90 cursor-pointer transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5"
                          >
                            {/* Card Top Preview Box */}
                            <div className="w-full aspect-video rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center mb-3 relative overflow-hidden group-hover:border-slate-700 transition-colors">
                              <div className="p-3 rounded-2xl bg-slate-900/80 shadow-inner">
                                {getFileIcon(file.type, file.name)}
                              </div>

                              {/* Play badge for videos */}
                              {file.type === "video" && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Card File Info */}
                            <div className="min-w-0 mb-2">
                              <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors" title={file.name}>
                                {file.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {formatBytes(file.size)}
                              </p>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                              <span className="text-[10px] text-slate-500">
                                {formatDate(file.updated_at || file.created_at)}
                              </span>

                              <div className="flex items-center gap-1">
                                <a
                                  href={downloadUrl}
                                  download={file.name}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* LIST VIEW TABLE */
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-850 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                            <th className="py-3 px-4 hidden md:table-cell">Date</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredFiles.map((file) => {
                            const downloadUrl = DriveAPI.getPublicFolderFileDownloadUrl(shareToken, file.id);

                            return (
                              <tr
                                key={file.id}
                                onClick={() => handleOpenFilePreview(file)}
                                className="hover:bg-slate-850/80 cursor-pointer transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5 truncate max-w-md">
                                    {getFileIcon(file.type, file.name)}
                                    <span className="font-semibold text-slate-200 truncate">{file.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                                  {formatBytes(file.size)}
                                </td>
                                <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                                  {formatDate(file.updated_at || file.created_at)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleOpenFilePreview(file)}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                      title="Preview"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <a
                                      href={downloadUrl}
                                      download={file.name}
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                                      title="Download"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Empty Folder State */}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8">
                  <div className="w-16 h-16 rounded-3xl bg-slate-850 flex items-center justify-center text-slate-500 mb-3">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    {searchQuery ? "No matching files or folders" : "This folder is empty"}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {searchQuery
                      ? "Try searching for a different keyword or clearing your filter."
                      : "No subfolders or files have been added to this directory yet."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ============================================================ */
        /* 3. SINGLE FILE DIRECT VIEW                                   */
        /* ============================================================ */
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-auto">
          {item.type === "video" ? (
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
                      Could not stream video directly in browser. Please download the file to play offline.
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
                        href={singleFileDownloadUrl}
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
                    src={singleFileStreamUrl}
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

              <div className="w-full flex items-center justify-between mt-3 px-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">{item.name}</span>
                <span>{formatBytes(item.size)}</span>
              </div>
            </div>
          ) : item.type === "image" ? (
            <div className="flex flex-col items-center justify-center max-w-5xl max-h-[82vh]">
              <img
                src={singleFileStreamUrl}
                alt={item.name}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
              <div className="mt-3 text-xs text-slate-400 font-medium">
                {item.name} • {formatBytes(item.size)}
              </div>
            </div>
          ) : item.type === "pdf" ? (
            <div className="w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
              <PdfViewer url={singleFileStreamUrl} fileName={item.name} downloadUrl={singleFileDownloadUrl} />
            </div>
          ) : (
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white truncate">{item.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{formatBytes(item.size)}</p>
              </div>
              <a
                href={singleFileDownloadUrl}
                download={item.name}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-lg shadow-blue-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Download Document</span>
              </a>
            </div>
          )}
        </main>
      )}

      {/* ============================================================ */}
      {/* 4. INTERACTIVE FILE PREVIEW MODAL (LIGHTBOX)                 */}
      {/* ============================================================ */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-2 sm:p-6 animate-in fade-in duration-150">
          <div className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="h-14 px-4 sm:px-6 bg-slate-850/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5 truncate max-w-[60vw]">
                {getFileIcon(previewFile.type, previewFile.name)}
                <span className="text-xs sm:text-sm font-bold text-white truncate">{previewFile.name}</span>
                <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md hidden sm:inline">
                  {formatBytes(previewFile.size)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Navigation arrows */}
                {filteredFiles.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 mr-2">
                    <button
                      onClick={handlePrevFile}
                      disabled={currentFileIndex <= 0}
                      className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Previous file"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 px-1">
                      {currentFileIndex + 1} / {filteredFiles.length}
                    </span>
                    <button
                      onClick={handleNextFile}
                      disabled={currentFileIndex >= filteredFiles.length - 1}
                      className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Next file"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <a
                  href={getDownloadUrlForFile(previewFile)}
                  download={previewFile.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-sm"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                <button
                  onClick={handleClosePreview}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-1"
                  title="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Type-Specific Viewer */}
            <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-auto bg-slate-950/60 relative">
              {previewFile.type === "video" ? (
                /* VIDEO VIEWER */
                <div className="relative w-full h-full flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-slate-800">
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
                      <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                      <h4 className="text-sm font-bold text-white mb-1">Playback Error</h4>
                      <p className="text-xs mb-3 text-slate-400">
                        Could not stream video buffer. Please download the file to play offline.
                      </p>
                      <button
                        onClick={handleRetryVideo}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      src={getStreamUrlForFile(previewFile)}
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
              ) : previewFile.type === "image" ? (
                /* IMAGE VIEWER WITH ZOOM */
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <div className="flex-1 flex items-center justify-center overflow-auto w-full">
                    <img
                      src={getStreamUrlForFile(previewFile)}
                      alt={previewFile.name}
                      style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease-out" }}
                      className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
                    />
                  </div>

                  {/* Zoom Controls */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-1.5 shadow-xl backdrop-blur-md">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-300 w-12 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoom(1)}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white hover:bg-slate-800 ml-1"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ) : previewFile.type === "pdf" || previewFile.name.toLowerCase().endsWith(".pdf") ? (
                /* PDF VIEWER */
                <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-800">
                  <PdfViewer
                    url={getStreamUrlForFile(previewFile)}
                    fileName={previewFile.name}
                    downloadUrl={getDownloadUrlForFile(previewFile)}
                  />
                </div>
              ) : previewFile.type === "audio" ? (
                /* AUDIO VIEWER */
                <div className="flex flex-col items-center justify-center max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
                    <Music className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white truncate">{previewFile.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{formatBytes(previewFile.size)}</p>
                  </div>
                  <audio
                    src={getStreamUrlForFile(previewFile)}
                    controls
                    autoPlay
                    className="w-full rounded-xl"
                  />
                </div>
              ) : docLoading ? (
                /* DOC LOADING */
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-400">Loading document preview...</p>
                </div>
              ) : docHtml ? (
                /* DOCX VIEWER */
                <div className="w-full h-full overflow-auto bg-white text-slate-900 p-8 rounded-2xl border border-slate-800 shadow-inner font-serif prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: docHtml }} />
                </div>
              ) : textContent ? (
                /* TEXT / CODE VIEWER */
                <div className="w-full h-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">Document Preview</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(textContent);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {textContent}
                  </pre>
                </div>
              ) : (
                /* GENERIC DOWNLOAD CARD */
                <div className="flex flex-col items-center justify-center max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto">
                    <File className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white truncate">{previewFile.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{formatBytes(previewFile.size)}</p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {docError || "Preview is not available for this file type. Please download to view."}
                  </p>
                  <a
                    href={getDownloadUrlForFile(previewFile)}
                    download={previewFile.name}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-lg shadow-blue-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
