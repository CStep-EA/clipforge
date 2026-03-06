/**
 * BetaSystemTour.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen modal tour that plays all onboarding videos in sequence.
 * Triggered on first login after beta launch, or via ?tour=true URL param.
 *
 * Features:
 * - Plays TOUR_SEQUENCE of videos in order
 * - Next / Previous / Skip All / Close controls
 * - Step indicator dots
 * - Progress saved after each video via useOnboarding
 * - Fully keyboard navigable and accessible
 * - Reduced-motion safe
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, SkipForward, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import OnboardingVideoPlayer from "./OnboardingVideoPlayer";
import {
  ONBOARDING_VIDEOS,
  TOUR_SEQUENCE,
  useOnboarding,
  type VideoKey,
} from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

// ── Props ────────────────────────────────────────────────────────────────────

interface BetaSystemTourProps {
  /** Email of the current user (for persistence) */
  userEmail?: string;
  /** Override: force the tour to show regardless of seen state */
  forceTour?: boolean;
}

// ── Step thumbnails ───────────────────────────────────────────────────────────

const STEP_ICONS: Record<VideoKey, string> = {
  dashboard:    "🏠",
  saves:        "🔖",
  sharing:      "👥",
  subscription: "✨",
  support:      "🎧",
  events:       "🎟️",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function BetaSystemTour({ userEmail, forceTour = false }: BetaSystemTourProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const onboarding = useOnboarding(userEmail);

  const [open, setOpen]           = useState(false);
  const [step, setStep]           = useState(0);
  const [completed, setCompleted] = useState(false);

  // ── Determine whether to show ─────────────────────────────────────────────

  useEffect(() => {
    // Don't show while Base44 sync is in progress
    if (onboarding.isLoading) return;

    const urlForceTour = searchParams.get("tour") === "true";
    if (onboarding.shouldShowTour(urlForceTour || forceTour)) {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding.isLoading]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const currentKey  = TOUR_SEQUENCE[step] as VideoKey;
  const currentVideo = ONBOARDING_VIDEOS[currentKey];
  const totalSteps  = TOUR_SEQUENCE.length;
  const isFirst     = step === 0;
  const isLast      = step === totalSteps - 1;

  const goNext = useCallback(() => {
    onboarding.markVideoSeen(currentKey);
    if (isLast) {
      onboarding.markTourSeen();
      setCompleted(true);
    } else {
      setStep((s) => s + 1);
    }
  }, [currentKey, isLast, onboarding]);

  const goPrev = useCallback(() => {
    if (!isFirst) setStep((s) => s - 1);
  }, [isFirst]);

  const skipAll = useCallback(() => {
    onboarding.markTourSeen();
    setOpen(false);
    // Remove ?tour=true from URL
    if (searchParams.has("tour")) {
      searchParams.delete("tour");
      setSearchParams(searchParams);
    }
  }, [onboarding, searchParams, setSearchParams]);

  const handleClose = useCallback(() => {
    skipAll();
  }, [skipAll]);

  const finishTour = useCallback(() => {
    setOpen(false);
    if (searchParams.has("tour")) {
      searchParams.delete("tour");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // ── Keyboard: left/right arrow navigation ─────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, goNext, goPrev]);

  // ── Completion screen ─────────────────────────────────────────────────────

  const CompletionScreen = () => (
    <div className="flex flex-col items-center justify-center gap-6 py-10 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00BFFF]/20 to-[#9370DB]/20 flex items-center justify-center border-2 border-[#00BFFF]/40">
        <CheckCircle2 className="w-10 h-10 text-[#00BFFF]" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#E8E8ED] mb-2">You're all set! 🎉</h2>
        <p className="text-sm text-[#8B8D97] max-w-sm">
          You've completed the Klip4ge beta tour. Explore at your own pace —
          every feature is one click away.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button
          onClick={finishTour}
          className="flex-1 bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white font-semibold h-10"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Start using Klip4ge
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setStep(0);
            setCompleted(false);
            onboarding.resetAll();
          }}
          className="flex-1 border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED] h-10"
        >
          Watch again
        </Button>
      </div>

      <p className="text-[11px] text-[#8B8D97]">
        You can always replay tours from <strong className="text-[#E8E8ED]">Settings → Onboarding</strong>
      </p>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className={cn(
          "w-full sm:max-w-3xl p-0 gap-0 overflow-hidden",
          "bg-[#0F1117] border-[#2A2D3A] shadow-2xl shadow-black/80"
        )}
        aria-describedby="tour-desc"
      >
        {/* ── Header strip ─────────────────────────────────────── */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#2A2D3A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00BFFF] to-[#9370DB] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <DialogTitle className="text-sm font-bold text-[#E8E8ED]">
                Klip4ge Beta Tour
              </DialogTitle>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8B8D97]">
                {step + 1} / {totalSteps}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={skipAll}
                className="h-7 px-2 text-[11px] text-[#8B8D97] hover:text-[#E8E8ED] gap-1"
                aria-label="Skip all"
              >
                <SkipForward className="w-3 h-3" />
                Skip all
              </Button>
              {/* Explicit close (X) button — clearly dismisses the tour dialog */}
              <button
                onClick={handleClose}
                aria-label="Close tour"
                className="flex items-center justify-center w-7 h-7 rounded-full text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#2A2D3A] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <DialogDescription id="tour-desc" className="sr-only">
            Beta tour walkthrough — {totalSteps} videos covering all major features of Klip4ge.
          </DialogDescription>
        </DialogHeader>

        {/* ── Step indicator ────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[#2A2D3A] overflow-x-auto scrollbar-none">
          {TOUR_SEQUENCE.map((key, idx) => (
            <button
              key={key}
              onClick={() => setStep(idx)}
              aria-label={`Go to step ${idx + 1}: ${ONBOARDING_VIDEOS[key as VideoKey].title}`}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap",
                idx === step
                  ? "bg-gradient-to-r from-[#00BFFF]/20 to-[#9370DB]/20 text-[#00BFFF] border border-[#00BFFF]/40"
                  : idx < step
                    ? "bg-[#1A2A3A] text-[#00BFFF]/60 border border-[#00BFFF]/20"
                    : "bg-[#1A1D27] text-[#8B8D97] border border-[#2A2D3A]"
              )}
            >
              <span>{STEP_ICONS[key as VideoKey]}</span>
              <span className="hidden sm:inline">
                {ONBOARDING_VIDEOS[key as VideoKey].title}
              </span>
              <span className="sm:hidden">{idx + 1}</span>
            </button>
          ))}
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5">
          {completed ? (
            <CompletionScreen />
          ) : (
            <>
              {/* Video description */}
              <div className="mb-3">
                <p className="text-xs text-[#8B8D97] leading-relaxed">
                  {currentVideo.description}
                </p>
              </div>

              {/* The video player */}
              <OnboardingVideoPlayer
                video={currentVideo}
                onClose={handleClose}
                autoPlay={true}
                className="rounded-xl"
              />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2D3A]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrev}
                  disabled={isFirst}
                  className={cn(
                    "gap-1.5 border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED] h-9",
                    isFirst && "opacity-30 cursor-not-allowed"
                  )}
                  aria-label="Previous video"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {TOUR_SEQUENCE.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        idx === step
                          ? "w-4 h-2 bg-[#00BFFF]"
                          : idx < step
                            ? "w-2 h-2 bg-[#00BFFF]/40"
                            : "w-2 h-2 bg-[#2A2D3A]"
                      )}
                    />
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={goNext}
                  className={cn(
                    "gap-1.5 h-9",
                    isLast
                      ? "bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white"
                      : "bg-[#1A1D27] border border-[#2A2D3A] text-[#E8E8ED] hover:bg-[#2A2D3A]"
                  )}
                  aria-label={isLast ? "Finish tour" : "Next video"}
                >
                  {isLast ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Finish tour
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
