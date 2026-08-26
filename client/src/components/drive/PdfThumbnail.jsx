import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import DriveAPI from "../../services/api.js";
import { FileText, Loader2 } from "lucide-react";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (e) {
    console.warn("PDF worker assignment warning:", e);
  }
}

// In-memory session cache for rendered PDF thumbnails
const pdfThumbCache = new Map();

function getCachedThumb(id) {
  if (pdfThumbCache.has(id)) return pdfThumbCache.get(id);
  try {
    const stored = localStorage.getItem(`teledrive_pdf_thumb_${id}`);
    if (stored) {
      pdfThumbCache.set(id, stored);
      return stored;
    }
  } catch {}
  return null;
}

export default function PdfThumbnail({ file, className = "" }) {
  const [thumbSrc, setThumbSrc] = useState(() => getCachedThumb(file.id));
  const [loading, setLoading] = useState(!getCachedThumb(file.id));
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  // Lazy load thumbnail only when in viewport
  useEffect(() => {
    const cached = getCachedThumb(file.id);
    if (cached) {
      setThumbSrc(cached);
      setLoading(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [file.id]);

  // Render first page of PDF using PDF.js
  useEffect(() => {
    if (!isVisible || pdfThumbCache.has(file.id) || thumbSrc) return;

    let isCancelled = false;
    let renderTask = null;
    setLoading(true);

    async function generatePdfThumb() {
      try {
        const streamUrl = DriveAPI.getStreamUrl(file.id);
        const loadingTask = pdfjsLib.getDocument({
          url: streamUrl,
          withCredentials: false
        });

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        const page = await pdf.getPage(1);
        if (isCancelled) return;

        // Render at a good thumbnail resolution
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { alpha: false });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport
        });

        await renderTask.promise;
        if (isCancelled) return;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        pdfThumbCache.set(file.id, dataUrl);
        try {
          localStorage.setItem(`teledrive_pdf_thumb_${file.id}`, dataUrl);
        } catch {}
        setThumbSrc(dataUrl);
        setLoading(false);
      } catch (err) {
        if (!isCancelled) {
          setHasError(true);
          setLoading(false);
        }
      }
    }

    generatePdfThumb();

    return () => {
      isCancelled = true;
      if (renderTask && renderTask.cancel) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [isVisible, file.id, thumbSrc]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900/60 select-none group ${className}`}
    >
      {/* 1. Rendered PDF First-Page Preview (Google Drive Style) */}
      {thumbSrc && !hasError ? (
        <div className="relative w-full h-full flex items-center justify-center p-2.5 bg-slate-900/80">
          <div className="relative max-w-full max-h-full rounded-md shadow-md border border-slate-700/60 overflow-hidden bg-white group-hover:scale-105 transition-transform duration-200">
            <img
              src={thumbSrc}
              alt={file.name}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
          {/* Subtle PDF red corner badge */}
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[8px] font-black tracking-wider shadow backdrop-blur-sm">
            PDF
          </div>
        </div>
      ) : loading && isVisible ? (
        /* 2. Loading state with smooth skeleton */
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/90 via-slate-900 to-slate-950 p-3 text-center overflow-hidden">
          <div className="relative w-20 h-24 bg-slate-800/80 border border-slate-700/80 rounded-xl shadow-lg flex flex-col p-2.5 space-y-1.5 animate-pulse">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-1">
              <span className="text-[8px] font-black text-rose-500 tracking-wider">PDF</span>
              <Loader2 className="w-3 h-3 text-rose-500 animate-spin" />
            </div>
            <div className="w-full h-1 bg-slate-700/60 rounded-full" />
            <div className="w-4/5 h-1 bg-slate-700/60 rounded-full" />
            <div className="w-full h-1 bg-slate-700/40 rounded-full" />
            <div className="w-3/5 h-1 bg-slate-700/40 rounded-full" />
          </div>
        </div>
      ) : (
        /* 3. High-Quality Fallback Document Card */
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/90 via-slate-900 to-slate-950 p-3 text-center overflow-hidden">
          <div className="relative w-20 h-24 bg-slate-800/80 border border-slate-700/80 rounded-xl shadow-lg flex flex-col p-2.5 space-y-1.5 transform group-hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-1">
              <span className="text-[8px] font-black text-rose-500 tracking-wider">PDF</span>
              <FileText className="w-3 h-3 text-rose-500" />
            </div>
            <div className="w-full h-1 bg-slate-700/60 rounded-full" />
            <div className="w-4/5 h-1 bg-slate-700/60 rounded-full" />
            <div className="w-full h-1 bg-slate-700/40 rounded-full" />
            <div className="w-3/5 h-1 bg-slate-700/40 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
