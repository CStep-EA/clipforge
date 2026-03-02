/**
 * useOnboarding.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central hook for ClipForge's onboarding video system.
 *
 * Persistence strategy (dual-layer):
 *   1. localStorage  – instant, offline-safe, per-browser
 *   2. Base44        – cross-device, synced per user (UserOnboardingProgress entity)
 *
 * When the user is signed in, Base44 is the source of truth.
 * localStorage is the fallback for anonymous/offline states and is reconciled
 * on every successful Base44 read.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

// ── Video registry ──────────────────────────────────────────────────────────

export const ONBOARDING_VIDEOS = {
  dashboard: {
    id: "dashboard",
    title: "Welcome to ClipForge",
    description: "Save, organise, and share your favourite content",
    src: "/videos/onboarding/dashboard.mp4",
    poster: "/videos/onboarding/dashboard-poster.jpg",
    duration: 75, // seconds (for progress ring)
    page: "Dashboard",
  },
  saves: {
    id: "saves",
    title: "Saving Items",
    description: "Quick-save anything from the web in seconds",
    src: "/videos/onboarding/saves.mp4",
    poster: "/videos/onboarding/saves-poster.jpg",
    duration: 60,
    page: "Saves",
  },
  sharing: {
    id: "sharing",
    title: "Sharing & Collaboration",
    description: "Share boards with family, friends, or your partner",
    src: "/videos/onboarding/sharing.mp4",
    poster: "/videos/onboarding/sharing-poster.jpg",
    duration: 70,
    page: "Friends",
  },
  support: {
    id: "support",
    title: "Getting Support",
    description: "AI support bot, ticket system, and documentation",
    src: "/videos/onboarding/support.mp4",
    poster: "/videos/onboarding/support-poster.jpg",
    duration: 55,
    page: "Support",
  },
  subscription: {
    id: "subscription",
    title: "Plans & Upgrades",
    description: "Free 7-day trial, Pro features, and family plans",
    src: "/videos/onboarding/subscription.mp4",
    poster: "/videos/onboarding/subscription-poster.jpg",
    duration: 50,
    page: "Pricing",
  },
  events: {
    id: "events",
    title: "Events & Calendar",
    description: "Discover, save, and add events to your calendar",
    src: "/videos/onboarding/events.mp4",
    poster: "/videos/onboarding/events-poster.jpg",
    duration: 60,
    page: "Events",
  },
} as const;

export type VideoKey = keyof typeof ONBOARDING_VIDEOS;
export type VideoConfig = typeof ONBOARDING_VIDEOS[VideoKey];

// The ordered list for the system tour
export const TOUR_SEQUENCE: VideoKey[] = [
  "dashboard",
  "saves",
  "sharing",
  "subscription",
  "support",
  "events",
];

// ── localStorage helpers ────────────────────────────────────────────────────

const LS_PREFIX = "cf_onboarding_";
const LS_TOUR_SEEN = "cf_onboarding_tour_seen";
const LS_VIDEOS_ENABLED = "cf_onboarding_videos_enabled";

function lsKey(videoId: string): string {
  return `${LS_PREFIX}${videoId}_seen`;
}

function lsMarkSeen(videoId: string): void {
  try {
    localStorage.setItem(lsKey(videoId), "true");
  } catch {
    // localStorage blocked (private mode, etc.) — silently ignore
  }
}

function lsIsSeen(videoId: string): boolean {
  try {
    return localStorage.getItem(lsKey(videoId)) === "true";
  } catch {
    return false;
  }
}

function lsMarkTourSeen(): void {
  try {
    localStorage.setItem(LS_TOUR_SEEN, "true");
  } catch {}
}

function lsIsTourSeen(): boolean {
  try {
    return localStorage.getItem(LS_TOUR_SEEN) === "true";
  } catch {
    return false;
  }
}

function lsGetVideosEnabled(): boolean {
  try {
    const v = localStorage.getItem(LS_VIDEOS_ENABLED);
    return v === null ? true : v === "true"; // default ON
  } catch {
    return true;
  }
}

function lsSetVideosEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LS_VIDEOS_ENABLED, String(enabled));
  } catch {}
}

// ── Base44 helpers ──────────────────────────────────────────────────────────
// Entity: UserOnboardingProgress
// Schema: { user_email, seen_videos: string[], tour_seen: boolean, videos_enabled: boolean }

async function fetchProgress(userEmail: string) {
  try {
    const results = await (base44.entities as any).UserOnboardingProgress.filter(
      { user_email: userEmail }
    );
    return results?.[0] ?? null;
  } catch {
    return null;
  }
}

async function upsertProgress(
  userEmail: string,
  seenVideos: string[],
  tourSeen: boolean,
  videosEnabled: boolean
) {
  try {
    const existing = await fetchProgress(userEmail);
    const payload = {
      user_email: userEmail,
      seen_videos: seenVideos,
      tour_seen: tourSeen,
      videos_enabled: videosEnabled,
    };
    if (existing) {
      await (base44.entities as any).UserOnboardingProgress.update(existing.id, payload);
    } else {
      await (base44.entities as any).UserOnboardingProgress.create(payload);
    }
  } catch {
    // Base44 unavailable — localStorage already saved, silently ignore
  }
}

// ── Main hook ───────────────────────────────────────────────────────────────

export interface OnboardingState {
  /** Set of video IDs the user has already seen */
  seenVideos: Set<string>;
  /** Has the user completed (or dismissed) the full tour? */
  tourSeen: boolean;
  /** Global on/off toggle for all onboarding videos */
  videosEnabled: boolean;
  /** Loading state while fetching from Base44 */
  isLoading: boolean;
  /** Mark a single video as seen (localStorage + Base44) */
  markVideoSeen: (videoId: string) => void;
  /** Mark the system tour as completed */
  markTourSeen: () => void;
  /** Toggle global videos on/off setting */
  setVideosEnabled: (enabled: boolean) => void;
  /** Reset everything (for "watch tour again") */
  resetAll: () => void;
  /** Should a specific page video auto-show? */
  shouldShowVideo: (videoId: string) => boolean;
  /** Should the system tour show? */
  shouldShowTour: (forceTour?: boolean) => boolean;
}

export function useOnboarding(userEmail?: string): OnboardingState {
  const [seenVideos, setSeenVideos] = useState<Set<string>>(
    () => new Set(Object.keys(ONBOARDING_VIDEOS).filter(lsIsSeen))
  );
  const [tourSeen, setTourSeen] = useState<boolean>(lsIsTourSeen);
  const [videosEnabled, setVideosEnabledState] = useState<boolean>(lsGetVideosEnabled);
  const [isLoading, setIsLoading] = useState(false);

  // Track if we've already synced from Base44 this session
  const syncedRef = useRef(false);

  // Sync from Base44 once per session when userEmail is available
  useEffect(() => {
    if (!userEmail || syncedRef.current) return;
    syncedRef.current = true;

    setIsLoading(true);
    fetchProgress(userEmail)
      .then((remote) => {
        if (!remote) return;

        // Merge: union of localStorage + remote (never un-mark seen)
        const remoteSeen = new Set<string>(remote.seen_videos ?? []);
        const localSeen = new Set<string>(
          Object.keys(ONBOARDING_VIDEOS).filter(lsIsSeen)
        );
        const merged = new Set([...remoteSeen, ...localSeen]);

        merged.forEach(lsMarkSeen); // reconcile localStorage
        setSeenVideos(merged);

        const mergedTourSeen = remote.tour_seen || lsIsTourSeen();
        if (mergedTourSeen) lsMarkTourSeen();
        setTourSeen(mergedTourSeen);

        // remote wins for videos_enabled if it's explicitly set
        if (remote.videos_enabled !== undefined) {
          lsSetVideosEnabled(remote.videos_enabled);
          setVideosEnabledState(remote.videos_enabled);
        }
      })
      .finally(() => setIsLoading(false));
  }, [userEmail]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const markVideoSeen = useCallback(
    (videoId: string) => {
      lsMarkSeen(videoId);
      setSeenVideos((prev) => {
        const next = new Set(prev);
        next.add(videoId);
        if (userEmail) {
          const nextArr = [...next];
          upsertProgress(userEmail, nextArr, tourSeen, videosEnabled);
        }
        return next;
      });
    },
    [userEmail, tourSeen, videosEnabled]
  );

  const markTourSeen = useCallback(() => {
    lsMarkTourSeen();
    setTourSeen(true);
    if (userEmail) {
      const seenArr = [...seenVideos];
      upsertProgress(userEmail, seenArr, true, videosEnabled);
    }
  }, [userEmail, seenVideos, videosEnabled]);

  const setVideosEnabled = useCallback(
    (enabled: boolean) => {
      lsSetVideosEnabled(enabled);
      setVideosEnabledState(enabled);
      if (userEmail) {
        upsertProgress(userEmail, [...seenVideos], tourSeen, enabled);
      }
    },
    [userEmail, seenVideos, tourSeen]
  );

  const resetAll = useCallback(() => {
    // Clear localStorage
    try {
      Object.keys(ONBOARDING_VIDEOS).forEach((id) =>
        localStorage.removeItem(lsKey(id))
      );
      localStorage.removeItem(LS_TOUR_SEEN);
    } catch {}
    setSeenVideos(new Set());
    setTourSeen(false);
    syncedRef.current = false;
    if (userEmail) {
      upsertProgress(userEmail, [], false, videosEnabled);
    }
  }, [userEmail, videosEnabled]);

  // ── Computed helpers ──────────────────────────────────────────────────────

  const shouldShowVideo = useCallback(
    (videoId: string): boolean => {
      if (!videosEnabled) return false;
      // Respect prefers-reduced-motion
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return false;
      return !seenVideos.has(videoId);
    },
    [videosEnabled, seenVideos]
  );

  const shouldShowTour = useCallback(
    (forceTour = false): boolean => {
      if (!videosEnabled) return false;
      if (forceTour) return true;
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return false;
      return !tourSeen;
    },
    [videosEnabled, tourSeen]
  );

  return {
    seenVideos,
    tourSeen,
    videosEnabled,
    isLoading,
    markVideoSeen,
    markTourSeen,
    setVideosEnabled,
    resetAll,
    shouldShowVideo,
    shouldShowTour,
  };
}
