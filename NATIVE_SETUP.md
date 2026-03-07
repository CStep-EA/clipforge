# Klip4ge — Native Mobile Build Guide

> Klip4ge uses **Capacitor** to wrap the existing React/Vite web app in a native iOS and Android shell.
> The PWA already covers ~90% of the experience. Native builds unlock:
> - Background sync (silent, system-scheduled)
> - Deeper Share Sheet integration (iOS Share Extension, Android Intent filter)
> - Hidden in-app WebView for metadata enrichment
> - Native push notifications
> - Home screen widget (roadmap)

---

## Quick Start

### Prerequisites
| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 | `node --version` |
| npm | ≥ 9 | Included with Node |
| Xcode | ≥ 15 | macOS only, for iOS builds |
| Android Studio | ≥ Hedgehog | For Android builds |
| CocoaPods | ≥ 1.12 | `sudo gem install cocoapods` |
| Java JDK | ≥ 17 | For Android builds |

### 1. Install Capacitor

```bash
cd /path/to/clipforge-fix

# Install Capacitor core + CLI
npm install @capacitor/core @capacitor/cli

# Install required plugins
npm install \
  @capacitor/app \
  @capacitor/browser \
  @capacitor/haptics \
  @capacitor/keyboard \
  @capacitor/network \
  @capacitor/preferences \
  @capacitor/push-notifications \
  @capacitor/local-notifications \
  @capacitor/share \
  @capacitor/splash-screen \
  @capacitor/status-bar

# Background fetch (community plugin)
npm install @transistorsoft/capacitor-background-fetch
```

### 2. Build Web Assets

```bash
npm run build
# Creates /dist folder — this is what gets bundled into the native app
```

### 3. Add Native Platforms

```bash
npx cap add android
npx cap add ios
```

### 4. Sync Web Build to Native

```bash
npx cap sync
# Copies /dist into native/android/app/src/main/assets/public/
# and native/ios/App/App/public/
```

### 5. Open in IDE

```bash
npx cap open android   # Opens Android Studio
npx cap open ios       # Opens Xcode (macOS only)
```

---

## Development Workflow

```bash
# After making web code changes:
npm run build && npx cap sync

# Live reload during development (no rebuild needed):
# Set server.url in capacitor.config.ts to your local Vite server
# Then open in Android Studio / Xcode and run
```

---

## In-App Browser (Hidden WebView)

The `src/lib/inAppBrowser.js` service manages a hidden WebView layer that:
- Silently loads URLs to extract metadata (title, OG image, description, price)
- Works in the background without showing any visible browser UI
- Falls back to a CORS-proxy fetch on web/PWA

**How it works on native:**
1. `inAppBrowser.extractMetadata(url)` is called with a URL
2. A hidden InAppBrowser window opens (0px height, no toolbar)
3. An extraction script runs inside the WebView
4. Results are returned via Capacitor's message bridge
5. The WebView closes automatically

**Privacy:** The hidden browser only runs when the user has explicitly enabled a platform sync. No data is collected without user consent.

---

## Background Sync

`src/lib/backgroundSync.js` manages periodic background tasks:

| Platform | Mechanism | Min Interval |
|---|---|---|
| iOS | BGAppRefreshTask (via BackgroundFetch plugin) | ~15 min (OS-controlled) |
| Android | WorkManager (via BackgroundFetch plugin) | 15 min |
| Web/PWA | Visibility-change heartbeat + SW Background Sync API | Foreground only |

**Registered sync handlers:**
- `facebookSync` — flush extension captures, trigger scraper if no recent heartbeat
- `platformSync` — sync connected social platforms (Instagram, Pinterest, etc.)
- `offlineQueue` — flush offline share items saved while disconnected
- `metaEnrich` — fetch OG metadata for items saved without enrichment

---

## Share Intent Flow

### Android
1. User taps Share in any app → chooses Klip4ge
2. Android fires `ACTION_SEND` intent → received by `MainActivity`
3. Capacitor's App plugin fires `appUrlOpen` event
4. `nativeShare.js` parses the intent and emits `SHARE_INTENT`
5. `usePlatformSync` hook navigates to `/share-target`
6. `ShareTarget.jsx` enriches with AI and saves to vault

### iOS (PWA Share Sheet — no native app needed)
1. User taps Share in any app → chooses Klip4ge (must be added to Home Screen)
2. iOS calls the PWA's registered share target (`manifest.json` → `share_target`)
3. Service Worker (`sw.js`) intercepts the POST request
4. SW posts `SHARE_TARGET` message to open clients
5. `main.jsx` receives message → navigates to `/share-target`
6. `ShareTarget.jsx` enriches and saves

### iOS (Native App — Share Extension)
1. User taps Share → chooses "Klip4ge" (from native app's Share Extension)
2. `ShareViewController.swift` stores URL in App Group UserDefaults
3. Main app reads on next foreground activation
4. Routes to `/share-target` via Capacitor bridge

---

## Folder Structure

```
native/
├── android/
│   ├── README.md          ← Android-specific setup guide
│   └── .gitkeep           ← Placeholder (npx cap add android generates actual files)
└── ios/
    ├── README.md          ← iOS-specific setup guide
    └── .gitkeep           ← Placeholder (npx cap add ios generates actual files)

src/lib/
├── inAppBrowser.js        ← Hidden WebView metadata extraction service
├── backgroundSync.js      ← Native background sync service
└── nativeShare.js         ← Share intent handler (native + PWA)

src/hooks/
└── usePlatformSync.js     ← Master hook wiring all native services

capacitor.config.ts        ← Capacitor configuration (plugins, server, etc.)
```

---

## Current Status

| Feature | PWA | Android | iOS |
|---|---|---|---|
| Save from browser | ✅ Extension | ✅ Share Intent | ✅ Share Sheet |
| Share Sheet | ✅ manifest share_target | ✅ Intent filter | ✅ Add to Home Screen |
| Background sync | ⚠️ Foreground only | 📋 WorkManager (planned) | 📋 BGAppRefresh (planned) |
| Facebook real-time sync | ✅ Chrome Extension | 📋 WebView hook (planned) | 📋 WebView hook (planned) |
| Push notifications | ✅ SW Push API | 📋 FCM (planned) | 📋 APNS (planned) |
| Offline saves | ✅ SW Background Sync | ✅ Via web layer | ✅ Via web layer |
| Hidden metadata WebView | ⚠️ CORS proxy fallback | 📋 InAppBrowser (planned) | 📋 InAppBrowser (planned) |

Legend: ✅ Live  ⚠️ Partial  📋 Roadmap

---

*For questions, open a support ticket at klip4ge.app/support or check the FAQ.*
