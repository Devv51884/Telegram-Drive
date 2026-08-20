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
  Play,
  RotateCcw
} from "lucide-react";

export default function UploadModal() {
  const { activeModal, setActiveModal, currentFolderId, refresh } = useDrive();
  const [dragActive, setDragActive] = useState(false);
  const [uploadList, setUploadList] = useState([]);
  const fileInputRef = useRef(null);

  if (activeModal !== "upload") return null;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
      id: `up_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
      file: f,
      name: f.name,
      size: f.size,
      loadedBytes: 0,
      percent: 0,
      speed: "",
      phase: "Queued",
      status: "pending", // 'pending' | 'uploading' | 'saving' | 'done' | 'error' | 'cancelled'
      error: null,
      controller: new AbortController(),
      lastLoaded: 0,
      lastTime: Date.now()
    }));

    setUploadList((prev) => [...prev, ...newItems]);

    // Start uploading items concurrently
    newItems.forEach((item) => {
      startUpload(item);
    });
  };

  const startUpload = async (item) => {
    const controller = new AbortController();
    updateItem(item.id, {
      status: "uploading",
      percent: 1,
      loadedBytes: 0,
      phase: "Uploading to server...",
      controller
    });

    let lastLoaded = 0;
    let lastTime = Date.now();

    try {
      await DriveAPI.uploadFile(
        item.file,
        currentFolderId,
        (progress) => {
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          let speedStr = "";

          if (timeDiff >= 0.5) {
            const bytesDiff = progress.loaded - lastLoaded;
            const bytesPerSec = bytesDiff / timeDiff;
            speedStr = `${formatBytes(bytesPerSec)}/s`;
            lastLoaded = progress.loaded;
            lastTime = now;
          }

          updateItem(item.id, {
            loadedBytes: progress.loaded,
            percent: progress.percent,
            speed: speedStr || item.speed,
            phase:
              progress.percent >= 100
                ? "Saving to Telegram Cloud..."
                : `Uploading (${progress.percent}%)`
          });
        },
        controller.signal
      );

      updateItem(item.id, {
        status: "done",
        percent: 100,
        loadedBytes: item.size,
        speed: "",
        phase: "Saved to Telegram Cloud!"
      });
      refresh();
    } catch (err) {
      if (err.name === "CanceledError" || err.message === "canceled" || controller.signal.aborted) {
        updateItem(item.id, {
          status: "cancelled",
          phase: "Upload cancelled",
          speed: ""
        });
      } else {
        const errorMsg = err.response?.data?.error || err.message || "Upload failed";
        updateItem(item.id, {
          status: "error",
          error: errorMsg,
          phase: "Upload failed",
          speed: ""
        });
      }
    }
  };

  const cancelUpload = (item) => {
    if (item.controller && item.status === "uploading") {
      item.controller.abort();
    }
    updateItem(item.id, {
      status: "cancelled",
      phase: "Cancelled by user",
      speed: ""
    });
  };

  const cancelAllUploads = () => {
    uploadList.forEach((item) => {
      if (item.status === "uploading" && item.controller) {
        item.controller.abort();
      }
    });
    setUploadList((prev) =>
      prev.map((item) =>
        item.status === "uploading" || item.status === "pending"
          ? { ...item, status: "cancelled", phase: "Cancelled by user", speed: "" }
          : item
      )
    );
  };

  const isAnyUploading = uploadList.some(
    (item) => item.status === "uploading" || item.status === "pending"
  );

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
                Upload Files to Telegram
              </h3>
              <p className="text-xs text-slate-400">
                Multi-file parallel upload with real-time byte tracking & cancel support
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveModal(null);
              setUploadList([]);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
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
            Select multiple videos, photos, PDFs, documents (up to 2GB per file on Telegram Cloud)
          </p>
        </div>

        {/* Upload List & Synchronized Real-Time Progress */}
        {uploadList.length > 0 && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
              <span>Queue ({uploadList.length} files)</span>
              {isAnyUploading && (
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

                {/* Progress Bar & Byte Count */}
                {item.status === "uploading" && (
                  <div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-150 rounded-full"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>
                        {formatBytes(item.loadedBytes)} / {formatBytes(item.size)} ({item.percent}%)
                      </span>
                      <span>
                        {item.speed ? `${item.speed} • ` : ""}
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
        <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
          <button
            onClick={() => {
              setActiveModal(null);
              setUploadList([]);
            }}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
          >
            {isAnyUploading ? "Close Window (Uploads Continue)" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
