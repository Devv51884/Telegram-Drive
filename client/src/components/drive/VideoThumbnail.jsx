import React, { useState } from "react";
import DriveAPI from "../../services/api.js";
import { Film, Play } from "lucide-react";

export default function VideoThumbnail({ file, className = "" }) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasError, setHasError] = useState(false);
  const streamUrl = DriveAPI.getStreamUrl(file.id);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 select-none group ${className}`}
    >
      {file.thumbnail_url && !hasError ? (
        <img
          src={file.thumbnail_url}
          alt={file.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setHasError(true)}
        />
      ) : (
        /* High-Performance Instant Video Card */
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#131b2e] to-[#0f172a] p-3 text-center overflow-hidden">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 group-hover:scale-110 transition-transform">
            <Film className="w-5 h-5 text-rose-400" />
          </div>
          <span className="mt-2 text-[9px] font-black uppercase tracking-wider text-rose-400/80 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            Video
          </span>
        </div>
      )}

      {/* Ambient gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />

      {/* Hover Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px] pointer-events-none">
        <div className="w-10 h-10 rounded-2xl bg-blue-600/90 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform border border-white/20">
          <Play className="w-5 h-5 ml-0.5 fill-current" />
        </div>
      </div>
    </div>
  );
}
