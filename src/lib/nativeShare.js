/**
 * nativeShare.js — Klip4ge Native Share Intent Handler
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles incoming share intents from other apps on iOS and Android.
 *
 * On native (Capacitor):
 *   - Registers an App URL listener for deep links (klip4ge://)
 *   - Listens for share extension data via @capacitor/app
 *   - iOS Share Extension passes data via app group UserDefaults
 *   - Android intent filter passes data via getIntent() extras
 *
 * On web/PWA:
 *   - Reads URL params on /share-target route (handled by ShareTarget.jsx)
 *   - Reads sessionStorage set by Service Worker (sw.js)
 *
 * FLOW:
 *   Other app → Share → Klip4ge
 *   ↓
 *   Native: App.addListener('appUrlOpen') fires with URL
 *   ↓
 *   nativeShare.js parses the intent and emits SHARE_INTENT event
 *   ↓
 *   usePlatformSync hook receives it and navigates to ShareTarget
 *   ↓
 *   ShareTarget.jsx enriches with AI + saves to vault
 *
 * DEEP LINK FORMAT:
 *   klip4ge://share?url=https://...&title=...&source=ios_share
 *   klip4ge://save?url=https://...
 *   klip4ge://open?page=saves
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { isNative, getPlatform } from './inAppBrowser.js';


// ── Safe dynamic importer (hides specifiers from Vite's static analyser) ──
const _capImport = /* @__PURE__ */ (mod) =>
  new Function('m', 'return import(m)')(mod).catch(() => ({}));
// ── Intent types ──────────────────────────────────────────────────────────────
export const INTENT_TYPE = {
  SHARE_URL:    'share_url',     // Share a URL from another app
  SHARE_TEXT:   'share_text',    // Share text/selection
  SHARE_IMAGE:  'share_image',   // Share an image file
  DEEP_LINK:    'deep_link',     // Navigate to a Klip4ge page
  OAUTH_RETURN: 'oauth_return',  // Return from OAuth flow
};

// ── State ─────────────────────────────────────────────────────────────────────
let _listeners       = [];
let _pendingIntent   = null;   // Intent received before listeners registered
let _initialized     = false;
let _appPlugin       = null;

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Initialize the native share handler.
 * Call once at app startup in App.jsx.
 */
export async function initNativeShare() {
  if (_initialized) return;
  _initialized = true;

  if (isNative()) {
    await _initNativeListeners();
  } else {
    _initWebListeners();
  }

  // Process any URL that launched the app (cold start)
  await _checkLaunchUrl();

  console.debug('[NativeShare] Initialized on', getPlatform());
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register a listener for incoming share intents.
 * @param {Function} fn - Called with { type, url, title, text, source, raw }
 * @returns {Function} Cleanup / unsubscribe function
 */
export function onShareIntent(fn) {
  _listeners.push(fn);

  // Deliver any intent that arrived before this listener registered
  if (_pendingIntent) {
    try { fn(_pendingIntent); } catch { /* ignore */ }
    _pendingIntent = null;
  }

  return () => {
    _listeners = _listeners.filter(l => l !== fn);
  };
}

/**
 * Check if the app was launched via a share intent (cold start).
 * Call in your root component to handle the launch URL.
 * @returns {Promise<object|null>}
 */
export async function getLaunchIntent() {
  if (!isNative() || !_appPlugin) return _getWebIntent();

  try {
    const launchUrl = await _appPlugin.getLaunchUrl();
    if (launchUrl?.url) {
      return parseIntent(launchUrl.url);
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Programmatically share content from Klip4ge to another app.
 * @param {object} payload - { title, text, url, files }
 */
export async function shareToOtherApp(payload) {
  if (isNative()) {
    try {
      const { Share = null } = await _capImport('@capacitor/share');
      if (!Share) throw new Error('Capacitor Share plugin not available');
      await Share.share({
        title:        payload.title || 'Check this out',
        text:         payload.text  || payload.title || '',
        url:          payload.url   || '',
        dialogTitle:  'Share via',
      });
    } catch (err) {
      console.warn('[NativeShare] Share failed:', err.message);
      // Fallback to Web Share API
      await _webShare(payload);
    }
  } else {
    await _webShare(payload);
  }
}

/**
 * Parse a deep link URL or share intent URL into a structured intent object.
 * @param {string} url
 * @returns {object} intent
 */
export function parseIntent(url) {
  try {
    const parsed = new URL(url);

    // ── klip4ge:// deep link ──────────────────────────────────────────────
    if (parsed.protocol === 'klip4ge:') {
      const page     = parsed.hostname; // share, save, open, oauth
      const params   = parsed.searchParams;

      if (page === 'share' || page === 'save') {
        return {
          type:   INTENT_TYPE.SHARE_URL,
          url:    params.get('url')    || '',
          title:  params.get('title')  || '',
          text:   params.get('text')   || '',
          source: params.get('source') || _sourceFromPlatform(),
          raw:    url,
        };
      }

      if (page === 'open') {
        return {
          type:   INTENT_TYPE.DEEP_LINK,
          page:   params.get('page') || 'dashboard',
          raw:    url,
        };
      }

      if (page === 'oauth' || url.includes('oauth')) {
        return {
          type:   INTENT_TYPE.OAUTH_RETURN,
          code:   params.get('code')  || '',
          state:  params.get('state') || '',
          raw:    url,
        };
      }
    }

    // ── https:// share-target redirect ───────────────────────────────────
    if (parsed.pathname === '/share-target') {
      return {
        type:   INTENT_TYPE.SHARE_URL,
        url:    parsed.searchParams.get('url')    || '',
        title:  parsed.searchParams.get('title')  || '',
        text:   parsed.searchParams.get('text')   || '',
        source: parsed.searchParams.get('source') || _sourceFromPlatform(),
        raw:    url,
      };
    }

    // ── Unknown / external URL ────────────────────────────────────────────
    return {
      type:   INTENT_TYPE.SHARE_URL,
      url,
      title:  '',
      text:   '',
      source: _sourceFromPlatform(),
      raw:    url,
    };

  } catch {
    return null;
  }
}

// ── Private: native listeners ─────────────────────────────────────────────────

async function _initNativeListeners() {
  try {
    const { App = null } = await _capImport('@capacitor/app');
    _appPlugin = App;
    if (!App) {
      console.warn('[NativeShare] Capacitor App plugin not available — falling back to web');
      _initWebListeners();
      return;
    }

    // URL-based deep links / share extension returns
    App.addListener('appUrlOpen', (event) => {
      console.debug('[NativeShare] appUrlOpen:', event.url);
      const intent = parseIntent(event.url);
      if (intent) _dispatchIntent(intent);
    });

    // App resumed from background (Android back stack)
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        // Check if a share was pending (e.g. iOS Share Extension wrote to App Group)
        _checkSharedDefaults();
      }
    });

  } catch (err) {
    console.warn('[NativeShare] App plugin unavailable:', err.message);
  }
}

// ── Private: iOS App Group shared defaults ────────────────────────────────────
/**
 * iOS Share Extension writes shared data to NSUserDefaults (App Group).
 * We read it here when the app becomes active.
 *
 * Requires native/ios/App/App/ShareExtension to be implemented.
 * The extension writes JSON to UserDefaults suite "group.app.klip4ge.app".
 */
async function _checkSharedDefaults() {
  try {
    // This requires a custom Capacitor plugin or the UserDefaults bridge
    // We use localStorage as a temporary bridge in development
    const pending = localStorage.getItem('klip4ge_share_extension_pending');
    if (pending) {
      localStorage.removeItem('klip4ge_share_extension_pending');
      const data = JSON.parse(pending);
      _dispatchIntent({
        type:   INTENT_TYPE.SHARE_URL,
        url:    data.url   || '',
        title:  data.title || '',
        text:   data.text  || '',
        source: 'ios_share_extension',
        raw:    pending,
      });
    }
  } catch { /* ignore */ }
}

// ── Private: web listeners ────────────────────────────────────────────────────

function _initWebListeners() {
  // SW message for share target
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.type === 'SHARE_TARGET') {
      _dispatchIntent({
        type:   INTENT_TYPE.SHARE_URL,
        url:    event.data.url    || '',
        title:  event.data.title  || '',
        text:   event.data.text   || '',
        source: event.data.source || 'pwa_share',
        raw:    JSON.stringify(event.data),
      });
    }
  });

  // Handle URL params if we're already on /share-target
  if (window.location.pathname.startsWith('/share-target')) {
    const intent = _getWebIntent();
    if (intent) setTimeout(() => _dispatchIntent(intent), 100);
  }
}

function _getWebIntent() {
  const params = new URLSearchParams(window.location.search);
  const url    = params.get('url')    || params.get('text') || '';
  const title  = params.get('title')  || '';
  const source = params.get('source') || 'pwa_share';

  if (!url && !title) return null;

  return {
    type:   INTENT_TYPE.SHARE_URL,
    url, title,
    text:   params.get('text') || '',
    source,
    raw:    window.location.search,
  };
}

// ── Private: launch URL check ─────────────────────────────────────────────────

async function _checkLaunchUrl() {
  if (isNative() && _appPlugin) {
    try {
      const launch = await _appPlugin.getLaunchUrl();
      if (launch?.url) {
        const intent = parseIntent(launch.url);
        if (intent) {
          // Defer slightly to let app mount first
          setTimeout(() => _dispatchIntent(intent), 500);
        }
      }
    } catch { /* ignore */ }
  }
}

// ── Private: dispatch ─────────────────────────────────────────────────────────

function _dispatchIntent(intent) {
  if (!intent) return;
  console.debug('[NativeShare] Dispatching intent:', intent.type, intent.url || intent.page || '');

  if (_listeners.length === 0) {
    // Store until a listener registers
    _pendingIntent = intent;
    return;
  }

  _listeners.forEach(fn => {
    try { fn(intent); } catch (err) {
      console.error('[NativeShare] Listener error:', err);
    }
  });
}

// ── Private: helpers ──────────────────────────────────────────────────────────

function _sourceFromPlatform() {
  const p = getPlatform();
  if (p === 'ios')     return 'ios_share';
  if (p === 'android') return 'android_share';
  return 'pwa_share';
}

async function _webShare(payload) {
  if ('share' in navigator) {
    try {
      await navigator.share({
        title: payload.title || '',
        text:  payload.text  || '',
        url:   payload.url   || '',
      });
    } catch { /* user cancelled */ }
  } else {
    // Final fallback: copy to clipboard
    const text = payload.url || payload.title || '';
    await navigator.clipboard.writeText(text).catch(() => {});
  }
}
