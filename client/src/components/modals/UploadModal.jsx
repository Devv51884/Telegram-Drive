import React, { useState, useRef } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  File,
  Cloud,
  Loader2,
  Ban,
  Maximize2
} from "lucide-react";

export default function UploadModal() {
  const { activeModal, setActiveModal, currentFolderId, refresh } = useDrive();
  const [dragActive, setDragActive] = useState(false);
  const [uploadList, setUploadList] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef(null);

  const hasActiveUploads = uploadList.some(
    (item) => item.status === "uploading" || item.status === "pending"
  );

  const formatBytes = (bytes) => {
    const num = Number(bytes);
    if (!num || num <= 0 || isNaN(num) || !isFinite(num)) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(num) / Math.log(k))));
    return parseFloat((num / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatETA = (seconds) => {
    const num = Number(seconds);
    if (!num || num <= 0 || !isFinite(num) || isNaN(num)) return "";
    if (num < 60) return `~${Math.round(num)}s left`;
    const mins = Math.floor(num / 60);
    const secs = Math.round(num % 60);
    return `~${mins}m ${secs}s left`;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const updateItem = (id, updates) => {
    setUploadList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;

    const newItems = files.map((f, idx) => ({
      id: `up_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
      file: f,
      name: f.name || "File",
      size: Number(f.size) || 0,
      loadedBytes: 0,
      percent: 1,
      speed: "",
      eta: "",
      phase: "Queued",
      status: "pending",
      error: null,
      controller: new AbortController()
    }));

    setUploadList((prev) => [...prev, ...newItems]);

    newItems.forEach((item) => {
      startUpload(item);
    });
  };

  const startUpload = async (item) => {
    const controller = new AbortController();
    let lastLoaded = 0;
    let lastTime = Date.now();

    updateItem(item.id, {
      status: "uploading",
      percent: 1,
      loadedBytes: 0,
      phase: "Starting upload...",
      controller
    });

    try {
      await DriveAPI.uploadFile(
        item.file,
        currentFolderId,
        (browserProgress) => {
          const loaded = Number(browserProgress.loaded) || 0;
          const total = Number(browserProgress.total) || item.size || 1;
          const rawPercent = Math.min(99, Math.max(1, Math.round((loaded * 100) / total)));

          const now = Date.now();
          const timeDiff = Math.max(0.1, (now - lastTime) / 1000);
          let speedStr = "";
          let etaStr = "";

          if (timeDiff >= 0.3 && loaded > lastLoaded) {
            const bytesDiff = loaded - lastLoaded;
            const bytesPerSec = bytesDiff / timeDiff;
            speedStr = `${formatBytes(bytesPerSec)}/s`;
            if (bytesPerSec > 0) {
              const remainingBytes = Math.max(0, total - loaded);
              etaStr = formatETA(remainingBytes / bytesPerSec);
            }
            lastLoaded = loaded;
            lastTime = now;
          }

          updateItem(item.id, {
            loadedBytes: loaded,
            percent: rawPercent,
            speed: speedStr || item.speed || "",
            eta: etaStr || item.eta || "",
            phase: rawPercent >= 99 ? "Saving to Telegram Cloud..." : `Uploading to Telegram Cloud (${rawPercent}%)`
          });
        },
        controller.signal,
        item.id
      );

      updateItem(item.id, {
        status: "done",
        percent: 100,
        loadedBytes: item.size,
        speed: "",
        eta: "",
        phase: "Saved to Telegram Cloud!"
      });
      refresh();
    } catch (err) {
      if (err.name === "CanceledError" || err.message === "canceled" || controller.signal.aborted) {
        updateItem(item.id, {
          status: "cancelled",
          phase: "Upload cancelled by user",
          speed: "",
          eta: ""
        });
        const errorMsg = err.response?.data?.error || err.message || "Upload failed";
        updateItem(item.id, {
          status: "error",
          error: errorMsg,
          phase: "Upload failed",
          speed: "",
          eta: ""
        });
      }
    }
  };

  const cancelUpload = (item) => {
    if (item.controller) {
      item.controller.abort();
    }
    updateItem(item.id, {
      status: "cancelled",
      phase: "Cancelled by user",
      speed: "",
      eta: ""
    });
  };

  const cancelAllUploads = () => {
    uploadList.forEach((item) => {
      if (item.controller && (item.status === "uploading" || item.status === "pending")) {
        item.controller.abort();
      }
    });
    setUploadList((prev) =>
      prev.map((item) =>
        item.status === "uploading" || item.status === "pending"
          ? { ...item, status: "cancelled", phase: "Cancelled by user", speed: "", eta: "" }
          : item
      )
    );
  };

  if (activeModal !== "upload" && !hasActiveUploads) return null;

  // Render Minimized Floating Dock Widget
  if (isMinimized || (activeModal !== "upload" && hasActiveUploads)) {
    const activeCount = uploadList.filter(
      (i) => i.status === "uploading" || i.status === "pending"
    ).length;
    const completedCount = uploadList.filter((i) => i.status === "done").length;

    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
        <div className="w-80 sm:w-96 bg-white dark:bg-[#1e1f20] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3.5 flex flex-col gap-2.5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                {activeCount > 0 ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {activeCount > 0
                    ? `Uploading ${activeCount} file${activeCount > 1 ? "s" : ""}`
                    : `All ${completedCount} uploads complete`}
                </p>
                <p className="text-[10px] text-slate-400">
                  {uploadList.length} total files in queue
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsMinimized(false);
                  setActiveModal("upload");
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#282a2c] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Expand upload window"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelAllUploads();
                  setUploadList([]);
                  setActiveModal(null);
                  setIsMinimized(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#282a2c] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mini-list */}
          <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
            {uploadList.slice(0, 3).map((item) => (
              <div key={item.id} className="text-[11px]">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-0.5">
                  <span className="truncate max-w-[180px] font-medium">{item.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {item.status === "done" ? "Done" : `${item.percent || 1}%`}
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 rounded-full ${
                      item.status === "done"
                        ? "bg-emerald-500"
                        : item.status === "error"
                        ? "bg-rose-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.max(2, item.percent || 1)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-[#282a2c] w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Upload Files to Telegram Cloud
              </h3>
              <p className="text-xs text-slate-400">
                100% Real-time byte sync, speed & remaining time
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveModal(null);
              if (!hasActiveUploads) setUploadList([]);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1e1f20] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Close window"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all flex-shrink-0 ${
            dragActive
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-[#1e1f20]/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(Array.from(e.target.files));
              }
            }}
          />
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-2">
            <Cloud className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Drag & drop multiple files here, or <span className="text-blue-500 font-bold">browse</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Supports videos, photos, PDFs, audio, documents (up to 2GB per file on Telegram Cloud)
          </p>
        </div>

        {/* Upload List & Real-Time Progress */}
        {uploadList.length > 0 && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
              <span>Queue ({uploadList.length} files)</span>
              {hasActiveUploads && (
                <button
                  type="button"
                  onClick={cancelAllUploads}
                  className="text-rose-500 hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Ban className="w-3 h-3" />
                  <span>Cancel All</span>
                </button>
              )}
            </div>

            {uploadList.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 text-xs shadow-sm"
              >
                {/* Title & Status */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      ({formatBytes(item.size)})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === "uploading" && (
                      <>
                        <span className="text-blue-500 font-bold text-[11px] flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {item.percent}%
                        </span>
                        <button
                          type="button"
                          onClick={() => cancelUpload(item)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Cancel upload"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {item.status === "done" && (
                      <span className="flex items-center gap-1 text-emerald-500 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </span>
                    )}

                    {item.status === "cancelled" && (
                      <span className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                        <Ban className="w-3.5 h-3.5" />
                        Cancelled
                      </span>
                    )}

                    {item.status === "error" && (
                      <span className="flex items-center gap-1 text-rose-500 font-bold text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Real-Time Byte Counter */}
                {item.status === "uploading" && (
                  <div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200 rounded-full"
                        style={{ width: `${Math.max(2, item.percent || 1)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>
                        {formatBytes(item.loadedBytes)} of {formatBytes(item.size)} ({item.percent}%)
                      </span>
                      <span>
                        {item.speed ? `${item.speed} • ` : ""}
                        {item.eta ? `${item.eta} • ` : ""}
                        {item.phase}
                      </span>
                    </div>
                  </div>
                )}

                {item.error && (
                  <p className="text-[10px] text-rose-500 mt-1 font-medium">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end items-center mt-4 flex-shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              if (hasActiveUploads) {
                setIsMinimized(true);
              }
              setActiveModal(null);
              if (!hasActiveUploads) setUploadList([]);
            }}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
          >
            {hasActiveUploads ? "Keep Uploading in Background" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
