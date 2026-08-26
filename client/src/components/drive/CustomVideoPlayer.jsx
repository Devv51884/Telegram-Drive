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
  Film,
  RotateCw,
  RefreshCw,
  FastForward,
  Rewind
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
  const lastTapRef = useRef(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [skipAnimation, setSkipAnimation] = useState(null); // 'forward' | 'backward' | null

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
  const handleUserActivity = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu) {
        setShowControls(false);
      }
    }, 3500);
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
      try {
        const lastIdx = videoRef.current.buffered.length - 1;
        setBuffered(videoRef.current.buffered.end(lastIdx));
      } catch {}
    }
  };

  // Handle Seek
  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Fast skip 10s
  const skipTime = (seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setSkipAnimation(seconds > 0 ? "forward" : "backward");
    setTimeout(() => setSkipAnimation(null), 700);
    handleUserActivity();
  };

  // Double tap handler for mobile
  const handleContainerClick = (e) => {
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const isLeft = clickX < rect.width / 3;
    const isRight = clickX > (rect.width * 2) / 3;

    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (isLeft) {
        skipTime(-10);
      } else if (isRight) {
        skipTime(10);
      } else {
        togglePlay();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      handleUserActivity();
    }
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
    setShowSettingsMenu(false);
  };

  // Handle Quality Change
  const handleQualitySelect = (q) => {
    setSelectedQuality(q.label);
    setCurrentMenuTab("main");
    setShowSettingsMenu(false);
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

  // Retry Video
  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (videoRef.current) {
      const currTime = currentTime;
      const retryUrl = `${src}${src.includes("?") ? "&" : "?"}_t=${Date.now()}`;
      videoRef.current.src = retryUrl;
      videoRef.current.load();
      videoRef.current.currentTime = currTime;
      videoRef.current.play().catch(() => {});
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
    if (isNaN(secs) || secs < 0) return "0:00";
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
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        skipTime(-5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        skipTime(5);
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

  const playedPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, Math.max(0, (buffered / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={handleContainerClick}
      className="relative w-full h-full max-h-[82vh] min-h-[260px] flex items-center justify-center bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 select-none group"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        onPlay={() => {
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleTimeUpdate}
        onLoadedData={() => setIsLoading(false)}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
          }
          setIsLoading(false);
        }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false);
          const errCode = videoRef.current?.error?.code;
          if (errCode === 3 || errCode === 4) {
            setHasError(true);
          }
        }}
        className="w-full h-full max-h-[80vh] object-contain cursor-pointer"
      />

      {/* Double Tap Skip Ripple Animations */}
      {skipAnimation === "backward" && (
        <div className="absolute left-8 sm:left-16 z-30 flex flex-col items-center justify-center p-4 rounded-full bg-black/60 text-white animate-out fade-out zoom-out duration-500 pointer-events-none">
          <Rewind className="w-8 h-8 fill-current text-blue-400" />
          <span className="text-xs font-bold mt-1">-10s</span>
        </div>
      )}
      {skipAnimation === "forward" && (
        <div className="absolute right-8 sm:right-16 z-30 flex flex-col items-center justify-center p-4 rounded-full bg-black/60 text-white animate-out fade-out zoom-out duration-500 pointer-events-none">
          <FastForward className="w-8 h-8 fill-current text-blue-400" />
          <span className="text-xs font-bold mt-1">+10s</span>
        </div>
      )}

      {/* Playback Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md z-30 p-4 sm:p-6 text-center text-slate-300 gap-3">
          <Film className="w-10 h-10 sm:w-12 sm:h-12 text-rose-500 mb-1" />
          <h4 className="text-sm sm:text-base font-bold text-white">Playback Notice</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Video stream had a glitch or uses a format not natively supported by your browser.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Stream</span>
            </button>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              Open in Tab
            </a>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={fileName}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                Download
              </a>
            )}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 pointer-events-none gap-2">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-300 font-medium tracking-wide">Buffering Partial Stream (206)...</span>
        </div>
      )}

      {/* Center Big Play Button Overlay */}
      {!isPlaying && !isLoading && !hasError && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity z-10"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-blue-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/20">
            <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-current" />
          </div>
        </div>
      )}

      {/* Video Quality Badge Indicator (Top-Left) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 pointer-events-none">
        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold border border-white/15 shadow-sm flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400 fill-current" />
          {selectedQuality.split(" ")[0]}
        </span>
      </div>

      {/* Settings Popover Menu (Quality & Speed) */}
      {showSettingsMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-16 right-3 sm:right-4 z-30 w-56 sm:w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2 shadow-2xl text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          {currentMenuTab === "main" && (
            <div className="space-y-1">
              <div className="px-2.5 py-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                Playback Settings
              </div>
              <button
                onClick={() => setCurrentMenuTab("quality")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>Quality</span>
                </div>
                <span className="text-slate-400 font-medium text-[11px] truncate max-w-[90px]">
                  {selectedQuality.split(" ")[0]}
                </span>
              </button>
              <button
                onClick={() => setCurrentMenuTab("speed")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 sm:px-4 pt-4 pb-3 transition-opacity duration-200 z-20 ${
          showControls || showSettingsMenu ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Layered Progress Bar / Scrubber with Buffer Visualizer */}
        <div className="relative w-full h-3 flex items-center mb-2 group/progress cursor-pointer">
          {/* Background Track */}
          <div className="absolute inset-x-0 h-1 sm:h-1.5 bg-slate-800/90 rounded-full overflow-hidden" />

          {/* Buffered Track (shows real-time 206 chunk loading) */}
          <div
            className="absolute left-0 h-1 sm:h-1.5 bg-slate-500/50 rounded-full transition-all duration-150"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* Played Progress Track */}
          <div
            className="absolute left-0 h-1 sm:h-1.5 bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"
            style={{ width: `${playedPercent}%` }}
          />

          {/* Scrubber Input Range slider */}
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white text-xs gap-2">
          {/* Left Controls: Play/Pause, Skip Buttons, Volume, Time */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={togglePlay}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Skip -10s */}
            <button
              onClick={() => skipTime(-10)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Skip +10s */}
            <button
              onClick={() => skipTime(10)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
              title="Fast Forward 10s"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1 group/volume">
              <button
                onClick={toggleMute}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Mute / Unmute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-12 sm:w-16 md:w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500 hidden sm:block"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[10px] sm:text-[11px] font-mono text-slate-300 whitespace-nowrap ml-0.5">
              <span>{formatTime(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Quality/Speed Settings Gear, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Settings Gear (Quality & Speed) */}
            <button
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setCurrentMenuTab("main");
              }}
              className={`p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors ${
                showSettingsMenu ? "bg-white/20 text-blue-400" : "text-white"
              }`}
              title="Quality & Playback Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Picture in Picture */}
            <button
              onClick={togglePiP}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors hidden sm:block text-slate-300 hover:text-white"
              title="Picture in Picture"
            >
              <PictureInPicture className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/20 transition-colors text-slate-300 hover:text-white"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
