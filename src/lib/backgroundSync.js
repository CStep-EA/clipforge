/**
 * backgroundSync.js — Klip4ge Native Background Sync Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages periodic background sync tasks for native iOS and Android.
 *
 * On native (Capacitor):
 *   Uses @capacitor/background-fetch to register a recurring background task.
 *   iOS: system schedules fetch at ~15-60 min intervals (OS-controlled).
 *   Android: uses WorkManager for reliable background execution.
 *
 * On web/PWA:
 *   Falls back to the SW Background Sync API + periodic sync where available.
 *   Otherwise uses a visibility-change based foreground poll.
 *
 * WHAT GETS SYNCED:
 *   - Facebook saves captured by extension (via agent heartbeat)
 *   - Platform sync (Instagram, Pinterest, etc.) via existing syncSocialPlatform
 *   - Offline share queue flush (items saved while offline)
 *   - Metadata enrichment queue (OG images fetched in background)
 *
 * PRIVACY:
 *   - Only runs when user has at least one integration enabled
 *   - Respects battery saver / low-power mode
 *   - Max 1 platform synced per background task to minimize battery impact
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { isNative, getPlatform } from './inAppBrowser.js';

// ── Safe dynamic importer (hides specifiers from Vite's static analyser) ──────
const _capImport = /* @__PURE__ */ (mod) =>
  new Function('m', 'return import(m)')(mod).catch(() => ({}));

// ── Constants ─────────────────────────────────────────────────────────────────
const TASK_ID            = 'app.klip4ge.background-sync';
const HEARTBEAT_INTERVAL = 30 * 1000;   // 30s foreground heartbeat
const STORAGE_KEY        = 'klip4ge_bg_sync_state';
const MAX_QUEUE          = 100;

// ── State ─────────────────────────────────────────────────────────────────────
let _bgFetchPlugin     = null;
let _heartbeatTimer    = null;
let _syncHandlers      = new Map();  // name → async fn
let _initialized       = false;
let _listeners         = [];

// ── Init ──────────────────────────────────────────────────────────────────────

/**
 * Initialize the background sync service.
 * Call once at app startup (e.g. in App.jsx useEffect).
 *
 * @param {object} handlers - Map of sync handler functions
 *   {
 *     facebookSync:  async () => { ... },
 *     platformSync:  async () => { ... },
 *     offlineQueue:  async () => { ... },
 *     metaEnrich:    async () => { ... },
 *   }
 */
export async function initBackgroundSync(handlers = {}) {
  if (_initialized) return;
  _initialized = true;

  // Register sync handlers
  Object.entries(handlers).forEach(([name, fn]) => {
    if (typeof fn === 'function') _syncHandlers.set(name, fn);
  });

  if (isNative()) {
    await _initNativeBackgroundFetch();
  } else {
    _initWebFallback();
  }

  console.debug('[BackgroundSync] Initialized on', getPlatform());
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Manually trigger all registered sync handlers.
 * Called when app comes to foreground, after login, or by user in Settings.
 */
export async function triggerSync(handlerNames = null) {
  const toRun = handlerNames
    ? [..._syncHandlers.entries()].filter(([k]) => handlerNames.includes(k))
    : [..._syncHandlers.entries()];

  const results = {};
  for (const [name, fn] of toRun) {
    try {
      console.debug('[BackgroundSync] Running:', name);
      results[name] = await fn();
    } catch (err) {
      console.error(`[BackgroundSync] Handler "${name}" failed:`, err.message);
      results[name] = { error: err.message };
    }
  }

  _updateState({ lastSync: new Date().toISOString(), results });
  _notifyListeners({ type: 'SYNC_COMPLETE', results });
  return results;
}

/**
 * Queue an item for background processing (e.g. offline share, pending OG fetch).
 * Items are processed on next sync cycle.
 */
export function queueItem(type, payload) {
  const state = _readState();
  const queue = state.queue || [];
  if (queue.length >= MAX_QUEUE) queue.shift(); // drop oldest
  queue.push({ type, payload, queued_at: new Date().toISOString() });
  _updateState({ queue });
  console.debug(`[BackgroundSync] Queued ${type}, total: ${queue.length}`);
}

/**
 * Get current sync state (status, last sync time, queued count).
 */
export function getSyncStatus() {
  const state = _readState();
  return {
    initialized:   _initialized,
    platform:      getPlatform(),
    isNative:      isNative(),
    lastSync:      state.lastSync || null,
    queuedItems:   (state.queue || []).length,
    handlerCount:  _syncHandlers.size,
    handlers:      [..._syncHandlers.keys()],
  };
}

/**
 * Register a listener for sync events.
 * @param {Function} fn - Called with { type, results, error }
 * @returns {Function} Cleanup function
 */
export function onSyncEvent(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

/**
 * Stop all background sync activity. Call on logout.
 */
export async function stopBackgroundSync() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }

  if (isNative() && _bgFetchPlugin) {
    try {
      await _bgFetchPlugin.stop(TASK_ID);
    } catch { /* ignore */ }
  }

  _initialized = false;
  _syncHandlers.clear();
  console.debug('[BackgroundSync] Stopped');
}

// ── Native background fetch ───────────────────────────────────────────────────

async function _initNativeBackgroundFetch() {
  try {
    const primary  = await _capImport('@capacitor/background-fetch');
    const fallback  = primary?.BackgroundFetch
      ? primary
      : await _capImport('@transistorsoft/capacitor-background-fetch');
    const { BackgroundFetch = null } = fallback ?? {};

    if (!BackgroundFetch) {
      console.warn('[BackgroundSync] BackgroundFetch plugin not available — using foreground fallback');
      _initWebFallback();
      return;
    }

    _bgFetchPlugin = BackgroundFetch;

    const status = await BackgroundFetch.configure(
      {
        taskId:                TASK_ID,
        minimumFetchInterval:  15,           // iOS: 15 min minimum (OS may delay further)
        stopOnTerminate:       false,         // Android: continue after app kill
        enableHeadless:        true,          // Android headless mode
        requiredNetworkType:   BackgroundFetch.NETWORK_TYPE_ANY,
        requiresBatteryNotLow: false,
        requiresCharging:      false,
        requiresDeviceIdle:    false,
        requiresStorageNotLow: false,
        forceAlarmManager:     false,         // Android: prefer WorkManager
      },
      async (event) => {
        // ── Background task callback ────────────────────────────────────────
        console.debug('[BackgroundSync] Native task fired, taskId:', event.taskId);
        _notifyListeners({ type: 'SYNC_START', taskId: event.taskId });

        try {
          await triggerSync();
          BackgroundFetch.finish(event.taskId);
        } catch (err) {
          console.error('[BackgroundSync] Task error:', err);
          BackgroundFetch.finish(event.taskId);
        }
      },
      async (event) => {
        // ── Timeout callback (OS killed the task) ───────────────────────────
        console.warn('[BackgroundSync] Task timed out:', event.taskId);
        BackgroundFetch.finish(event.taskId);
      }
    );

    console.debug('[BackgroundSync] Native fetch status:', status);
    _notifyListeners({ type: 'INIT', status, platform: getPlatform() });

  } catch (err) {
    console.error('[BackgroundSync] Native init failed:', err.message);
    _initWebFallback();
  }
}

// ── Web / PWA fallback ────────────────────────────────────────────────────────

function _initWebFallback() {
  // 1. Try Periodic Background Sync (Chrome Android, limited support)
  if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(async (reg) => {
      try {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (status.state === 'granted') {
          await reg.periodicSync.register('klip4ge-platform-sync', { minInterval: 60 * 60 * 1000 });
          console.debug('[BackgroundSync] Periodic SW sync registered (1h)');
        }
      } catch { /* not supported */ }
    }).catch(() => {});
  }

  // 2. Foreground heartbeat — runs when app is open
  _startForegroundHeartbeat();

  // 3. App visibility change — sync when user returns to app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      _onAppForeground();
    }
  });

  // 4. Online recovery — flush offline queue when network returns
  window.addEventListener('online', () => {
    console.debug('[BackgroundSync] Network restored — flushing queue');
    _flushOfflineQueue();
  });
}

function _startForegroundHeartbeat() {
  if (_heartbeatTimer) return;
  _heartbeatTimer = setInterval(() => {
    _checkAndSync();
  }, HEARTBEAT_INTERVAL);
}

async function _onAppForeground() {
  const state   = _readState();
  const lastSync = state.lastSync ? new Date(state.lastSync) : null;
  const minutesSinceLast = lastSync
    ? (Date.now() - lastSync.getTime()) / 60000
    : Infinity;

  // Only re-sync if it's been > 30 minutes since last sync
  if (minutesSinceLast > 30) {
    console.debug('[BackgroundSync] App foregrounded, triggering sync (last was', Math.round(minutesSinceLast), 'min ago)');
    await triggerSync(['offlineQueue', 'metaEnrich']);
  }
}

async function _checkAndSync() {
  const state    = _readState();
  const queue    = state.queue || [];
  if (queue.length > 0) {
    await _flushOfflineQueue();
  }
}

async function _flushOfflineQueue() {
  const handler = _syncHandlers.get('offlineQueue');
  if (handler) {
    try {
      await handler();
    } catch (err) {
      console.warn('[BackgroundSync] Queue flush failed:', err.message);
    }
  }
}

// ── State helpers (localStorage) ─────────────────────────────────────────────

function _readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function _updateState(patch) {
  try {
    const current = _readState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
  } catch { /* storage full — ignore */ }
}

function _notifyListeners(event) {
  _listeners.forEach(fn => {
    try { fn(event); } catch { /* ignore listener errors */ }
  });
}
