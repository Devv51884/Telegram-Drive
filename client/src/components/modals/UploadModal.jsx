import React, { useState, useRef } from "react";
import { useDrive } from "../../context/DriveContext.jsx";
import DriveAPI from "../../services/api.js";
import { X, Upload, CheckCircle2, AlertCircle, File, Cloud, Loader2 } from "lucide-react";

export default function UploadModal() {
  const { activeModal, setActiveModal, currentFolderId, refresh } = useDrive();
  const [dragActive, setDragActive] = useState(false);
  const [uploadList, setUploadList] = useState([]);
  const fileInputRef = useRef(null);

  if (activeModal !== "upload") return null;

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

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    const newItems = files.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      progress: 0,
      phase: "Starting upload...",
      status: "pending",
      error: null
    }));

    setUploadList((prev) => [...prev, ...newItems]);

    // Process uploads sequentially
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      updateItemStatus(item.name, { status: "uploading", progress: 5, phase: "Uploading to server..." });

      let telegramProgressInterval = null;

      try {
        await DriveAPI.uploadFile(item.file, currentFolderId, (browserPercent) => {
          // Map browser upload to 0% -> 60%
          const mapped = Math.round(browserPercent * 0.6);
          updateItemStatus(item.name, {
            progress: Math.max(5, mapped),
            phase: mapped >= 60 ? "Saving to Telegram Cloud..." : `Uploading (${browserPercent}%)`
          });

          if (browserPercent >= 100 && !telegramProgressInterval) {
            // Once sent to server, smoothly advance from 60% to 98% while Telegram processes
            let current = 60;
            telegramProgressInterval = setInterval(() => {
              if (current < 96) {
                current += 4;
                updateItemStatus(item.name, {
                  progress: current,
                  phase: "Saving to Telegram Cloud..."
                });
              }
            }, 300);
          }
        });

        if (telegramProgressInterval) clearInterval(telegramProgressInterval);
        updateItemStatus(item.name, { status: "done", progress: 100, phase: "Saved to Telegram Cloud!" });
      } catch (err) {
        if (telegramProgressInterval) clearInterval(telegramProgressInterval);
        const errorMsg = err.response?.data?.error || err.message || "Upload failed";
        updateItemStatus(item.name, { status: "error", error: errorMsg });
      }
    }

    refresh();
  };

  const updateItemStatus = (fileName, updates) => {
    setUploadList((prev) =>
      prev.map((item) => (item.name === fileName ? { ...item, ...updates } : item))
    );
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-[#282a2c] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Upload Files to Telegram
              </h3>
              <p className="text-xs text-slate-400">
                Uploaded files are stored safely on Telegram Cloud
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
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
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
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-3">
            <Cloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Drag and drop files here, or <span className="text-blue-500">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Supports videos, images, PDFs, audio, documents (up to 2GB per file on Telegram Cloud)
          </p>
        </div>

        {/* Upload List & Synchronized Progress */}
        {uploadList.length > 0 && (
          <div className="mt-4 max-h-56 overflow-y-auto space-y-2.5 pr-1">
            {uploadList.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                    <span className="text-slate-400 text-[10px]">({formatBytes(item.size)})</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.status === "uploading" && (
                      <span className="flex items-center gap-1 text-blue-500 font-bold text-[11px]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {item.progress}%
                      </span>
                    )}
                    {item.status === "done" && (
                      <span className="flex items-center gap-1 text-emerald-500 font-bold text-[11px]">
                        <CheckCircle2 className="w-4 h-4" />
                        Done
                      </span>
                    )}
                    {item.status === "error" && (
                      <span className="flex items-center gap-1 text-rose-500 font-bold text-[11px]">
                        <AlertCircle className="w-4 h-4" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {item.status === "uploading" && (
                  <div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">{item.phase}</p>
                  </div>
                )}

                {item.error && (
                  <p className="text-[10px] text-rose-500 mt-1 font-medium">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              setActiveModal(null);
              setUploadList([]);
            }}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
