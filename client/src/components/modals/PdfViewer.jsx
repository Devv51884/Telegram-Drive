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
  Eye
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
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setUseIframeFallback(false);

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
        console.error("PDF.js loading error:", err);
        setError("Failed to parse PDF canvas stream.");
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [url]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || useIframeFallback) return;

    let isCancelled = false;
    setRendering(true);

    pdfDoc
      .getPage(currentPage)
      .then((page) => {
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        // Cancel previous render task if still active
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        // Calculate responsive viewport
        const containerWidth = containerRef.current ? containerRef.current.clientWidth - 32 : 600;
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        
        // Base scale fits container width on mobile nicely
        const baseScale = Math.min(1.5, Math.max(0.6, (containerWidth / unscaledViewport.width)));
        const finalScale = baseScale * scale;

        const viewport = page.getViewport({ scale: finalScale, rotation });
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5); // Crisp high-DPI canvas rendering

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
              console.error("Page render error:", err);
            }
            if (!isCancelled) setRendering(false);
          });
      })
      .catch((err) => {
        console.error("Get page error:", err);
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
  }, [pdfDoc, currentPage, scale, rotation, useIframeFallback]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((p) => p + 1);
    }
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
      className="relative w-full max-w-5xl h-[82vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
    >
      {/* Top Floating / Fixed PDF Controls Toolbar */}
      <div className="h-12 px-3 sm:px-6 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between flex-shrink-0 z-20 gap-2">
        {/* Page Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading || useIframeFallback}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-medium text-slate-300 px-1 sm:px-2">
            {loading ? "..." : useIframeFallback ? "PDF View" : `${currentPage} / ${numPages}`}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading || useIframeFallback}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {!useIframeFallback && (
            <>
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.6 || loading}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono font-medium text-slate-400 min-w-[40px] text-center hidden xs:inline">
                {Math.round(scale * 100)}%
              </span>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 2.5 || loading}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              <button
                onClick={handleRotate}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
            title="Open PDF in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-3 sm:p-6 bg-slate-950/80">
        {useIframeFallback ? (
          <iframe
            src={url}
            title={fileName}
            className="w-full h-full border-0 rounded-2xl bg-white"
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center my-auto gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            <p className="text-xs font-medium">Rendering PDF Document...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center my-auto p-6 text-center text-slate-400 max-w-md">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
            <h4 className="text-sm font-bold text-white mb-2">Could Not Render PDF Canvas</h4>
            <p className="text-xs mb-5 text-slate-400">
              Your browser blocked the PDF canvas worker. You can switch to native viewer, open in tab, or download.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => setUseIframeFallback(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Try Embed Viewer</span>
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center shadow-2xl rounded-lg overflow-hidden bg-white">
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
