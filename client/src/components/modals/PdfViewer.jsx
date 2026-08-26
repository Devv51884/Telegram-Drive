import React, { useState, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.js?url";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle,
  Download,
  ExternalLink,
  RotateCw,
  RefreshCw,
  Eye,
  FileText,
  Layers,
  Sparkles
} from "lucide-react";

// Configure PDF.js worker using Vite's bundled same-origin asset
if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (e) {
    console.warn("PDF worker assignment warning:", e);
  }
}

export default function PdfViewer({ url, fileName, downloadUrl }) {
  const [viewMode, setViewMode] = useState("native"); // 'native' | 'canvas'
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(0);

  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF Document for Canvas Reader Mode
  useEffect(() => {
    if (viewMode !== "canvas") return;

    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadingTask = pdfjsLib.getDocument({
      url,
      withCredentials: false
    });

    loadingTask.promise
      .then((pdf) => {
        if (isCancelled) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn("PDF.js worker note:", err.message);
        setError("Failed to load PDF canvas stream. Switching to Native Streamer.");
        setLoading(false);
        // Fallback automatically to native streamer
        setViewMode("native");
      });

    return () => {
      isCancelled = true;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [url, viewMode]);

  // Render current page onto canvas when in Canvas Mode
  useEffect(() => {
    if (viewMode !== "canvas" || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    setRendering(true);

    pdfDoc
      .getPage(currentPage)
      .then((page) => {
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const containerWidth = containerRef.current ? containerRef.current.clientWidth - 48 : 600;
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        
        const baseScale = Math.min(1.6, Math.max(0.5, (containerWidth / unscaledViewport.width)));
        const finalScale = baseScale * scale;

        const viewport = page.getViewport({ scale: finalScale, rotation });
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        renderTask.promise
          .then(() => {
            if (!isCancelled) setRendering(false);
          })
          .catch((err) => {
            if (err.name !== "RenderingCancelledException") {
              console.warn("Page render notice:", err.message);
            }
            if (!isCancelled) setRendering(false);
          });
      })
      .catch((err) => {
        console.warn("Get page notice:", err.message);
        if (!isCancelled) setRendering(false);
      });

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, scale, rotation, viewMode]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((p) => p + 1);
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(2.5, s + 0.2));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(0.6, s - 0.2));
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-5xl h-[82vh] bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
    >
      {/* Top Floating Controls Toolbar */}
      <div className="h-12 px-2.5 sm:px-5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between flex-shrink-0 z-20 gap-2">
        {/* Left: View Mode Toggle (Native Streamer vs Canvas Reader) */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode("native")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "native"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Native PDF Streamer (HTTP 206 Partial Stream)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Native Streamer</span>
            <span className="xs:hidden">Native</span>
          </button>

          <button
            onClick={() => setViewMode("canvas")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "canvas"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Canvas Reader (Interactive Custom Controls)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Canvas Reader</span>
            <span className="xs:hidden">Canvas</span>
          </button>
        </div>

        {/* Middle / Right: Controls for Canvas Mode */}
        {viewMode === "canvas" && (
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || loading}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono font-medium text-slate-300 px-1">
              {loading ? "..." : `${currentPage} / ${numPages}`}
            </span>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages || loading}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5 sm:mx-1 hidden sm:block" />

            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.6 || loading}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors hidden sm:block"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 2.5 || loading}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors hidden sm:block"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleRotate}
              disabled={loading}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors hidden sm:block"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right: Open in Tab & Download */}
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Open PDF in Full Browser Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Tab</span>
          </a>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={fileName}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 relative">
        {viewMode === "native" ? (
          /* NATIVE PDF STREAMER EMBED */
          <iframe
            src={`${url}#toolbar=1&navpanes=1&statusbar=1&view=FitH`}
            title={fileName || "PDF Document"}
            className="w-full h-full border-0 rounded-xl bg-white shadow-2xl"
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-xs font-medium">Rendering PDF Pages...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 max-w-md">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Canvas Render Notice</h4>
            <p className="text-xs mb-4 text-slate-400">{error}</p>
            <button
              onClick={() => setViewMode("native")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
            >
              Switch to Native Streamer
            </button>
          </div>
        ) : (
          <div className="relative flex flex-col items-center shadow-2xl rounded-lg overflow-hidden bg-white max-h-full overflow-auto">
            {rendering && (
              <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            )}
            <canvas ref={canvasRef} className="block transition-all" />
          </div>
        )}
      </div>
    </div>
  );
}
