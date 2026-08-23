import React, { useState, useEffect, useRef } from "react";
import DriveAPI from "../../services/api.js";
import { Film, Play } from "lucide-react";

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
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";

      const streamUrl = DriveAPI.getStreamUrl(file.id);
      video.src = streamUrl;

      const handleLoadedMetadata = () => {
        // Seek to 1 second or 10% of video
        try {
          const seekTime = Math.min(1.0, (video.duration || 10) * 0.1);
          video.currentTime = seekTime;
        } catch {
          setIsExtracting(false);
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

          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          if (dataUrl && dataUrl.length > 100) {
            setThumbUrl(dataUrl);
            saveCachedThumbnail(file.id, dataUrl);
          }
        } catch (err) {
          console.debug("Video thumbnail extraction fallback:", err.message);
        } finally {
          setIsExtracting(false);
          cleanup();
        }
      };

      const handleError = () => {
        if (!isCancelled) setIsExtracting(false);
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

      // Safety timeout after 5 seconds to avoid stalling
      const timeoutId = setTimeout(() => {
        if (!isCancelled) {
          setIsExtracting(false);
          cleanup();
        }
      }, 5000);

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
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900 ${className}`}>
      {thumbUrl ? (
        <>
          <img
            src={thumbUrl}
            alt={file.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Subtle dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
          
          {/* Hover Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="w-9 h-9 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 ml-0.5 fill-current" />
            </div>
          </div>
        </>
      ) : (
        /* Sleek Video Placeholder while generating thumbnail */
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-2 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 text-rose-400 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Film className="w-5 h-5 text-rose-500" />
          </div>
          {isExtracting && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center">
              <div className="h-0.5 w-12 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse w-full" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
