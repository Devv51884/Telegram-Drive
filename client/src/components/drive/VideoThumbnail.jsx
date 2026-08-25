import React, { useState, useEffect, useRef } from "react";
import DriveAPI from "../../services/api.js";
import { Film, Play, Sparkles } from "lucide-react";

// Global in-memory thumbnail cache across component mounts
const memoryThumbnailCache = new Map();

// Helper: Get or open IndexedDB cache for video thumbnails
function getThumbnailDB() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("TeleDriveThumbnails", 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("thumbnails")) {
          db.createObjectStore("thumbnails", { keyPath: "id" });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getCachedThumbnail(fileId) {
  if (memoryThumbnailCache.has(fileId)) {
    return memoryThumbnailCache.get(fileId);
  }
  try {
    const db = await getThumbnailDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction("thumbnails", "readonly");
      const store = tx.objectStore("thumbnails");
      const req = store.get(fileId);
      req.onsuccess = () => {
        if (req.result && req.result.dataUrl) {
          memoryThumbnailCache.set(fileId, req.result.dataUrl);
          resolve(req.result.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveCachedThumbnail(fileId, dataUrl) {
  memoryThumbnailCache.set(fileId, dataUrl);
  try {
    const db = await getThumbnailDB();
    if (!db) return;
    const tx = db.transaction("thumbnails", "readwrite");
    const store = tx.objectStore("thumbnails");
    store.put({ id: fileId, dataUrl, timestamp: Date.now() });
  } catch {}
}

export default function VideoThumbnail({ file, className = "" }) {
  const [thumbUrl, setThumbUrl] = useState(
    () => memoryThumbnailCache.get(file.id) || file.thumbnail_url || null
  );
  const [isExtracting, setIsExtracting] = useState(!thumbUrl);
  const [extractFailed, setExtractFailed] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    // If we already have a thumbnail, no need to extract
    if (thumbUrl) return;

    // Check IndexedDB
    getCachedThumbnail(file.id).then((cached) => {
      if (isCancelled) return;
      if (cached) {
        setThumbUrl(cached);
        setIsExtracting(false);
        return;
      }

      // If not cached, extract frame dynamically
      const video = document.createElement("video");
      videoRef.current = video;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";

      const streamUrl = DriveAPI.getStreamUrl(file.id);
      video.src = streamUrl;

      const handleLoadedMetadata = () => {
        try {
          const seekTime = Math.min(1.0, (video.duration || 10) * 0.1);
          video.currentTime = seekTime;
        } catch {
          setIsExtracting(false);
          setExtractFailed(true);
        }
      };

      const handleSeeked = () => {
        if (isCancelled) return;
        try {
          const canvas = document.createElement("canvas");
          const targetWidth = 320;
          const aspectRatio = (video.videoHeight || 9) / (video.videoWidth || 16);
          canvas.width = targetWidth;
          canvas.height = Math.round(targetWidth * aspectRatio);

          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          if (dataUrl && dataUrl.length > 100) {
            setThumbUrl(dataUrl);
            saveCachedThumbnail(file.id, dataUrl);
          } else {
            setExtractFailed(true);
          }
        } catch (err) {
          setExtractFailed(true);
        } finally {
          setIsExtracting(false);
          cleanup();
        }
      };

      const handleError = () => {
        if (!isCancelled) {
          setIsExtracting(false);
          setExtractFailed(true);
        }
        cleanup();
      };

      const cleanup = () => {
        try {
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
          video.removeEventListener("seeked", handleSeeked);
          video.removeEventListener("error", handleError);
          video.removeAttribute("src");
          video.load();
        } catch {}
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
      video.addEventListener("seeked", handleSeeked, { once: true });
      video.addEventListener("error", handleError, { once: true });

      // Safety timeout after 4 seconds
      const timeoutId = setTimeout(() => {
        if (!isCancelled) {
          setIsExtracting(false);
          setExtractFailed(true);
          cleanup();
        }
      }, 4000);

      return () => {
        clearTimeout(timeoutId);
        cleanup();
      };
    });

    return () => {
      isCancelled = true;
      if (videoRef.current) {
        try {
          videoRef.current.removeAttribute("src");
          videoRef.current.load();
        } catch {}
      }
    };
  }, [file.id, file.thumbnail_url]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 select-none ${className}`}>
      {thumbUrl ? (
        <>
          <img
            src={thumbUrl}
            alt={file.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Ambient gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

          {/* Hover Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px]">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/90 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform border border-white/20">
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            </div>
          </div>
        </>
      ) : (
        /* Rich Modern Video Preview Card */
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#131b2e] to-[#0f172a] p-3 text-center overflow-hidden">
          {/* Subtle glowing radial gradient in background */}
          <div className="absolute w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Film Reel & Play Center Badge */}
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 group-hover:scale-110 transition-all duration-200">
            <Film className="w-5 h-5 text-rose-400 group-hover:hidden" />
            <Play className="w-5 h-5 text-rose-400 fill-current hidden group-hover:block ml-0.5" />
          </div>

          {/* Video Tag Pill */}
          <span className="mt-2 text-[9px] font-black uppercase tracking-wider text-rose-400/80 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            Video
          </span>
        </div>
      )}
    </div>
  );
}
