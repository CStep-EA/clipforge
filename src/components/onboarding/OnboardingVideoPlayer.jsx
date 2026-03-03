/**
 * OnboardingVideoPlayer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable, fully-accessible onboarding video component for ClipForge.
 *
 * Features:
 * - Auto-plays on first visit to the host page (controlled by useOnboarding)
 * - Big "Skip" + "X" close button + Esc key support
 * - "Don't show again" checkbox (persisted per page)
 * - Reduced-motion: shows static poster + play button instead of autoplay
 * - Keyboard-navigable controls (Space = play/pause, M = mute, Esc = close)
 * - Progress bar with time remaining
 * - Fully styled to ClipForge dark-glass aesthetic
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  KeyboardEvent,
} from "react";
import { X, Play, Pause, Volume2, VolumeX, SkipForward, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VideoConfig } from "@/hooks/useOnboarding";

// ── Props ────────────────────────────────────────────────────────────────────

interface OnboardingVideoPlayerProps {
  /** Video metadata from the registry */
  video: VideoConfig;
  /** Called when the user dismisses (X, Esc, Skip) */
  onClose: () => void;
  /** Called when "Don't show again" is toggled */
  onDontShowAgain?: (checked: boolean) => void;
  /** Whether "Don't show again" is currently checked */
  dontShowAgain?: boolean;
  /** Show a "Watch full walkthrough" link (used inside FAQ) */
  showWalkthroughLink?: boolean;
  /** When true the player auto-plays on mount */
  autoPlay?: boolean;
  /** Extra tailwind classes on the outer container */
  className?: string;
  /** Compact mode: smaller player for FAQ embeds */
  compact?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingVideoPlayer({
  video,
  onClose,
  onDontShowAgain,
  dontShowAgain = false,
  showWalkthroughLink = false,
  autoPlay = false,
  className,
  compact = false,
}: OnboardingVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying]     = useState(false);
  const [muted, setMuted]         = useState(true);   // start muted for autoplay policy
  const [progress, setProgress]   = useState(0);      // 0–100
  const [timeLeft, setTimeLeft]   = useState(video.duration);
  const [showControls, setShowControls] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);
  const [hasEnded, setHasEnded]   = useState(false);

  // Detect reduced-motion preference
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Auto-play on mount ────────────────────────────────────────────────────

  useEffect(() => {
    if (!videoRef.current || !autoPlay || prefersReduced) return;
    const vid = videoRef.current;
    vid.muted = true;
    vid
      .play()
      .then(() => setPlaying(true))
      .catch(() => {}); // browser may block; user can click play
  }, [autoPlay, prefersReduced]);

  // ── Keyboard handler (Esc, Space, M) ─────────────────────────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      const ke = e as globalThis.KeyboardEvent;
      if (ke.key === "Escape") { onClose(); return; }
      if (ke.key === " " || ke.key === "Spacebar") {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (ke.key === "m" || ke.key === "M") {
        toggleMute();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-hide controls ────────────────────────────────────────────────────

  useEffect(() => {
    if (!playing) { setShowControls(true); return; }
    const t = setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3000);
    return () => clearTimeout(t);
  }, [playing, progress]);

  // ── Video event handlers ──────────────────────────────────────────────────

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    setProgress((vid.currentTime / vid.duration) * 100);
    setTimeLeft(Math.max(0, Math.ceil(vid.duration - vid.currentTime)));
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setHasEnded(true);
    setShowControls(true);
    setProgress(100);
  }, []);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      // Unmute on first manual interaction
      if (!userInteracted) {
        vid.muted = false;
        setMuted(false);
        setUserInteracted(true);
      }
      vid.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setPlaying(false);
    }
  }, [userInteracted]);

  const toggleMute = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    if (!vid || !isFinite(vid.duration) || vid.duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * vid.duration;
    if (isFinite(newTime)) vid.currentTime = newTime;
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const wrapperClass = cn(
    "relative rounded-2xl overflow-hidden bg-[#0F1117]",
    "border border-[#2A2D3A] shadow-2xl shadow-black/60",
    compact ? "w-full aspect-video" : "w-full max-w-2xl mx-auto",
    className
  );

  return (
    <div
      ref={containerRef}
      className={wrapperClass}
      role="dialog"
      aria-modal="true"
      aria-label={`Onboarding video: ${video.title}`}
      onMouseMove={() => setShowControls(true)}
      onFocus={() => setShowControls(true)}
    >
      {/* ── Video element ─────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={video.src}
        poster={video.poster}
        muted={muted}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="w-full aspect-video object-cover cursor-pointer"
        onClick={togglePlay}
        aria-label={video.title}
      />

      {/* ── Gradient overlays ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)"
        }}
      />

      {/* ── Top bar: title + close ────────────────────────────── */}
      <div className={cn(
        "absolute top-0 left-0 right-0 flex items-start justify-between p-4",
        "transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div>
          <p className="text-[11px] text-[#00BFFF] font-semibold tracking-widest uppercase mb-0.5">
            Klip4ge Walkthrough
          </p>
          <h3 className="text-sm font-bold text-white leading-tight">{video.title}</h3>
        </div>

        <button
          onClick={onClose}
          aria-label="Close video"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors ml-3 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Play button overlay (when paused / ended) ─────────── */}
      {(!playing || hasEnded) && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
          role="button"
          aria-label={hasEnded ? "Replay video" : "Play video"}
          tabIndex={0}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePlay(); }
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[#00BFFF]/20 border-2 border-[#00BFFF]/60 flex items-center justify-center backdrop-blur-sm hover:bg-[#00BFFF]/30 transition-colors">
            {hasEnded ? (
              <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-0.5">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            ) : (
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            )}
          </div>
        </div>
      )}

      {/* ── Bottom controls bar ───────────────────────────────── */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8",
        "transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        {/* Progress bar */}
        <div
          className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group"
          onClick={handleSeek}
          role="slider"
          aria-label="Video progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={(e: KeyboardEvent) => {
            const vid = videoRef.current;
            if (!vid || !isFinite(vid.duration)) return;
            if (e.key === "ArrowRight") vid.currentTime = Math.min(vid.duration, vid.currentTime + 5);
            if (e.key === "ArrowLeft")  vid.currentTime = Math.max(0, vid.currentTime - 5);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] rounded-full transition-all group-hover:h-2"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Left: play/pause + mute + time */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="text-white/90 hover:text-white transition-colors"
            >
              {playing ? (
                <Pause className="w-4 h-4" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4" fill="currentColor" />
              )}
            </button>

            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="text-white/80 hover:text-white transition-colors"
            >
              {muted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {timeLeft > 0 && (
              <span className="text-[11px] text-white/60 tabular-nums">
                {timeLeft}s left
              </span>
            )}
          </div>

          {/* Right: Skip + watchthrough link */}
          <div className="flex items-center gap-2">
            {showWalkthroughLink && (
              <a
                href="/Support"
                className="flex items-center gap-1 text-[11px] text-[#9370DB] hover:text-[#a78bfa] transition-colors"
                aria-label="Watch full walkthrough"
              >
                <BookOpen className="w-3 h-3" />
                Walkthrough
              </a>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Skip video"
              className="h-7 px-3 text-[11px] text-white/70 hover:text-white hover:bg-white/10 gap-1"
            >
              <SkipForward className="w-3 h-3" />
              Skip
            </Button>
          </div>
        </div>

        {/* "Don't show again" checkbox */}
        {onDontShowAgain && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <input
              id="dont-show-again"
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => onDontShowAgain(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-white/30 bg-transparent accent-[#00BFFF] cursor-pointer"
            />
            <label
              htmlFor="dont-show-again"
              className="text-[11px] text-white/60 cursor-pointer hover:text-white/80 transition-colors select-none"
            >
              Don't show this again for this page
            </label>
          </div>
        )}
      </div>

      {/* ── Reduced-motion overlay ────────────────────────────── */}
      {prefersReduced && !userInteracted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3 p-4 text-center">
          <p className="text-sm text-white/80 max-w-xs">
            Animations are reduced. Click play to watch this walkthrough video at your own pace.
          </p>
          <Button
            onClick={() => { setUserInteracted(true); togglePlay(); }}
            className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" fill="white" />
            Watch walkthrough
          </Button>
          <button
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white/80 underline"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}