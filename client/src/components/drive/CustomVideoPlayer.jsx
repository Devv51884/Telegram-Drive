import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  PictureInPicture,
  Loader2,
  Check,
  Zap,
  Sliders,
  Film
} from "lucide-react";

export default function CustomVideoPlayer({
  src,
  fileName = "Video",
  downloadUrl,
  autoPlay = true,
  onClose
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideControlsTimer = useRef(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // Settings Menu state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [currentMenuTab, setCurrentMenuTab] = useState("main"); // 'main' | 'quality' | 'speed'
  const [selectedQuality, setSelectedQuality] = useState("Auto (Original)");
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const qualityOptions = [
    { label: "Auto (Original)", resolution: "Auto", badge: "HD" },
    { label: "1080p Full HD", resolution: "1080p", badge: "FHD" },
    { label: "720p HD", resolution: "720p", badge: "HD" },
    { label: "480p SD", resolution: "480p", badge: "SD" },
    { label: "360p Data Saver", resolution: "360p", badge: "360p" }
  ];

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // Auto-hide controls logic
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [isPlaying, showSettingsMenu]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Handle Time Update & Buffer
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (videoRef.current.buffered.length > 0) {
      setBuffered(
        videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
      );
    }
  };

  // Handle Seek
  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handle Volume Change
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 0.8;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // Handle Speed Change
  const handleSpeedSelect = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setCurrentMenuTab("main");
  };

  // Handle Quality Change
  const handleQualitySelect = (q) => {
    setSelectedQuality(q.label);
    setCurrentMenuTab("main");
    // Switch video stream quality parameter seamlessly
    if (videoRef.current) {
      const currTime = videoRef.current.currentTime;
      const isCurrentlyPlaying = !videoRef.current.paused;
      
      const baseUrl = src.split("?")[0];
      const params = new URLSearchParams(src.includes("?") ? src.split("?")[1] : "");
      if (q.resolution !== "Auto") {
        params.set("quality", q.resolution);
      } else {
        params.delete("quality");
      }
      
      const newUrl = `${baseUrl}?${params.toString()}`;
      videoRef.current.src = newUrl;
      videoRef.current.currentTime = currTime;
      videoRef.current.load();
      if (isCurrentlyPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {}
  };

  // Format Seconds to MM:SS or HH:MM:SS
  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore when user is typing in an input
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, isMuted, volume]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && !showSettingsMenu && setShowControls(false)}
      className="relative w-full h-full max-h-[82vh] flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 select-none group"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
          }
          setIsLoading(false);
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        className="w-full h-full max-h-[80vh] object-contain cursor-pointer"
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10 pointer-events-none gap-2">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-300 font-medium">Buffering Telegram 4K Stream...</span>
        </div>
      )}

      {/* Center Big Play/Pause Animation Overlay (when clicked) */}
      {!isPlaying && !isLoading && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity z-10"
        >
          <div className="w-16 h-16 rounded-3xl bg-blue-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform border border-white/20">
            <Play className="w-8 h-8 ml-1 fill-current" />
          </div>
        </div>
      )}

      {/* Video Quality Badge Indicator (Top-Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/15 shadow-sm flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400 fill-current" />
          {selectedQuality.split(" ")[0]}
        </span>
      </div>

      {/* Settings Popover Menu (Quality & Speed) */}
      {showSettingsMenu && (
        <div className="absolute bottom-16 right-4 z-30 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2 shadow-2xl text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150">
          {currentMenuTab === "main" && (
            <div className="space-y-1">
              <div className="px-2.5 py-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                Playback Settings
              </div>
              <button
                onClick={() => setCurrentMenuTab("quality")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Quality</span>
                </div>
                <span className="text-slate-400 font-medium text-[11px] truncate max-w-[90px]">
                  {selectedQuality.split(" ")[0]}
                </span>
              </button>
              <button
                onClick={() => setCurrentMenuTab("speed")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400" />
                  <span>Playback Speed</span>
                </div>
                <span className="text-slate-400 font-medium text-[11px]">
                  {playbackSpeed === 1.0 ? "Normal" : `${playbackSpeed}x`}
                </span>
              </button>
            </div>
          )}

          {currentMenuTab === "quality" && (
            <div className="space-y-1">
              <button
                onClick={() => setCurrentMenuTab("main")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-400 hover:text-white text-[11px] font-bold border-b border-slate-800 mb-1"
              >
                ← Back to Settings
              </button>
              {qualityOptions.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleQualitySelect(q)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    selectedQuality === q.label
                      ? "bg-blue-600 text-white font-semibold"
                      : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selectedQuality === q.label && <Check className="w-3.5 h-3.5" />}
                    <span>{q.label}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono">
                    {q.badge}
                  </span>
                </button>
              ))}
            </div>
          )}

          {currentMenuTab === "speed" && (
            <div className="space-y-1">
              <button
                onClick={() => setCurrentMenuTab("main")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-400 hover:text-white text-[11px] font-bold border-b border-slate-800 mb-1"
              >
                ← Back to Settings
              </button>
              {speedOptions.map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedSelect(spd)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    playbackSpeed === spd
                      ? "bg-blue-600 text-white font-semibold"
                      : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {playbackSpeed === spd && <Check className="w-3.5 h-3.5" />}
                    <span>{spd === 1.0 ? "Normal (1.0x)" : `${spd}x`}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 transition-opacity duration-200 z-20 ${
          showControls || showSettingsMenu ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar / Scrubber */}
        <div className="relative w-full flex items-center mb-2.5 group/progress cursor-pointer">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2.5 transition-all"
          />
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Mute / Unmute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500 hidden sm:block"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[11px] font-mono text-slate-300">
              <span>{formatTime(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Quality/Speed Settings Gear, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Settings Gear (Quality & Speed) */}
            <button
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setCurrentMenuTab("main");
              }}
              className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors ${
                showSettingsMenu ? "bg-white/20 text-blue-400" : "text-white"
              }`}
              title="Quality & Playback Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Picture in Picture */}
            <button
              onClick={togglePiP}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors hidden sm:block"
              title="Picture in Picture"
            >
              <PictureInPicture className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
