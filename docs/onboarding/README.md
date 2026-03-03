# Klip4ge Onboarding Video System

## Overview

Klip4ge uses short (30–90 s) walkthrough videos to onboard new users on their first visit to each major page.  
Videos auto-play once per user, are fully escapable (Skip, X, Esc), and honour `prefers-reduced-motion`.  
Progress is persisted in **localStorage** (instant) and **Base44 `UserOnboardingProgress` entity** (cross-device).

---

## Architecture

```
src/
├── hooks/
│   └── useOnboarding.ts            # Central state, persistence, shouldShowVideo/Tour
├── components/onboarding/
│   ├── OnboardingVideoPlayer.tsx   # Reusable video player overlay
│   └── BetaSystemTour.tsx          # Full-screen modal tour (6 videos in sequence)
├── pages/
│   ├── Dashboard.jsx               # Uses "dashboard" video
│   ├── Saves.jsx                   # Uses "saves" video
│   ├── Support.jsx                 # Uses "support" video
│   ├── FAQ.jsx                     # /FAQ page with embedded videos per section
│   └── Settings.jsx                # Onboarding toggle + "Replay tour" button
└── Layout.jsx                      # Mounts <BetaSystemTour /> globally

public/videos/onboarding/
├── dashboard.mp4           ← 60–75 s  (replace placeholder)
├── dashboard-poster.jpg    ← 1280×720 still frame
├── saves.mp4               ← 45–60 s
├── saves-poster.jpg
├── sharing.mp4             ← 60–70 s
├── sharing-poster.jpg
├── support.mp4             ← 45–55 s
├── support-poster.jpg
├── subscription.mp4        ← 40–50 s
├── subscription-poster.jpg
├── events.mp4              ← 50–60 s
└── events-poster.jpg
```

---

## Video Registry (`useOnboarding.ts`)

| Key            | Title                    | Page       | Target Duration |
|----------------|--------------------------|------------|-----------------|
| `dashboard`    | Welcome to Klip4ge     | Dashboard  | 75 s            |
| `saves`        | Saving Items             | Saves      | 60 s            |
| `sharing`      | Sharing & Collaboration  | Friends    | 70 s            |
| `support`      | Getting Support          | Support    | 55 s            |
| `subscription` | Plans & Upgrades         | Pricing    | 50 s            |
| `events`       | Events & Calendar        | Events     | 60 s            |

---

## Persistence Strategy

### Layer 1 – localStorage (instant, offline-safe)
- Key format: `cf_onboarding_<videoId>_seen`
- `cf_onboarding_tour_seen`  
- `cf_onboarding_videos_enabled`

### Layer 2 – Base44 entity `UserOnboardingProgress`
Schema:
```json
{
  "user_email":      "string (indexed)",
  "seen_videos":     "array of strings",
  "tour_seen":       "boolean",
  "videos_enabled":  "boolean"
}
```
**Source of truth when user is signed in.** On mount, `useOnboarding` fetches remote state, merges (union — never un-marks seen), then reconciles localStorage.

---

## Accessibility

- All dialogs/overlays have `role="dialog"`, `aria-modal="true"`, `aria-label`
- Keyboard: **Esc** = close, **Space** = play/pause, **M** = mute, **←/→** = seek 5 s
- `prefers-reduced-motion`: shows static poster + manual Play button instead of autoplay
- Progress bar has `role="slider"` with `aria-valuenow/min/max`
- Skip / Close buttons have `aria-label`

---

## How to Trigger the System Tour

| Trigger                   | Behaviour                                     |
|---------------------------|-----------------------------------------------|
| First login (new user)    | Auto-shows if `tourSeen === false`            |
| `?tour=true` URL param    | Forces tour regardless of seen state          |
| Settings → "Replay tour"  | Calls `resetAll()` then tour shows next visit |

---

## Adding a New Page Video

1. Record the video (see scripts below) and export as `<key>.mp4` + `<key>-poster.jpg`
2. Place in `public/videos/onboarding/`
3. Add entry to `ONBOARDING_VIDEOS` and `TOUR_SEQUENCE` in `useOnboarding.ts`
4. Import and use `useOnboarding` + `OnboardingVideoPlayer` in the target page (follow the Dashboard pattern)

---

## Video Production Specs

- **Resolution**: 1280 × 720 (HD) minimum, 1920 × 1080 preferred
- **Format**: H.264 MP4, AAC audio
- **Length**: 30–90 s (keep under 10 MB for web delivery)
- **Style**: Screen recording + voiceover; no background music on first 3 s (autoplay muted)
- **Poster frame**: First or most representative frame, exported as JPEG, max 200 KB

---

## Video Scripts & Storyboards

See `VIDEO_SCRIPTS.md` in this directory for full scripts.

---

## Base44 Setup Checklist

- [ ] Create `UserOnboardingProgress` entity in Base44 with fields:
  - `user_email` (Text, required, indexed)
  - `seen_videos` (List of Text)
  - `tour_seen` (Boolean, default false)
  - `videos_enabled` (Boolean, default true)
- [ ] Set permissions: authenticated user can read/write their own record only
- [ ] Add `FAQ` to `pages.config.js` ✅ (already done)
- [ ] Replace `.placeholder` files with real `.mp4` and `.jpg` files before production launch
