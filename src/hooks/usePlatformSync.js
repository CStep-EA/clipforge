/**
 * usePlatformSync.js — Klip4ge Platform Sync Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Master hook that wires together:
 *   - inAppBrowser (hidden WebView metadata extraction)
 *   - backgroundSync (periodic native background tasks)
 *   - nativeShare (incoming share intents from other apps)
 *
 * Usage in App.jsx:
 *   const { syncStatus, triggerManualSync, shareIntent } = usePlatformSync();
 *
 * Usage in ShareTarget.jsx:
 *   const { pendingIntent, clearIntent } = usePlatformSync();
 *
 * Usage in AddItemDialog.jsx:
 *   const { enrichUrl } = usePlatformSync();
 *   const meta = await enrichUrl('https://...');
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }   from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 }        from '@/api/base44Client';

import { inAppBrowser, extractUrlMetadata, isNative, getPlatform }
  from '@/lib/inAppBrowser.js';
import { initBackgroundSync, triggerSync, getSyncStatus, queueItem, onSyncEvent }
  from '@/lib/backgroundSync.js';
import { initNativeShare, onShareIntent, shareToOtherApp, INTENT_TYPE }
  from '@/lib/nativeShare.js';

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlatformSync() {
  const navigate       = useNavigate();
  const [syncStatus,   setSyncStatus]   = useState(getSyncStatus());
  const [shareIntent,  setShareIntent]  = useState(null);   // latest incoming share
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError,    setSyncError]    = useState(null);
  const initRef        = useRef(false);

  // ── One-time init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    _bootstrap();

    // Update sync status every 30s while mounted
    const timer = setInterval(() => {
      setSyncStatus(getSyncStatus());
    }, 30_000);

    return () => clearInterval(timer);
  }, []);

  // ── Bootstrap: init all services ──────────────────────────────────────────
  async function _bootstrap() {
    try {
      // 1. Init in-app browser (lazy loads Capacitor plugin if native)
      await inAppBrowser.init();

      // 2. Init background sync with all handlers
      await initBackgroundSync({
        offlineQueue: _handleOfflineQueue,
        platformSync: _handlePlatformSync,
        metaEnrich:   _handleMetaEnrich,
      });

      // 3. Init native share listener
      await initNativeShare();

      // 4. Listen for incoming share intents
      const unsubShare = onShareIntent(_onShareIntent);

      // 5. Listen for sync events
      const unsubSync = onSyncEvent(_onSyncEvent);

      // 6. Process any offline queue items stored in sessionStorage
      _flushSessionQueue();

      setSyncStatus(getSyncStatus());

      return () => {
        unsubShare();
        unsubSync();
      };
    } catch (err) {
      console.warn('[usePlatformSync] Bootstrap error:', err.message);
    }
  }

  // ── Share intent handler ───────────────────────────────────────────────────
  function _onShareIntent(intent) {
    console.debug('[usePlatformSync] Share intent received:', intent.type);

    if (intent.type === INTENT_TYPE.SHARE_URL || intent.type === INTENT_TYPE.SHARE_TEXT) {
      setShareIntent(intent);
      // Navigate to share target page
      navigate(
        createPageUrl('ShareTarget') +
        '?share=1' +
        '&source=' + encodeURIComponent(intent.source || 'native_share') +
        '&title='  + encodeURIComponent(intent.title  || '') +
        '&url='    + encodeURIComponent(intent.url    || '') +
        '&text='   + encodeURIComponent(intent.text   || '')
      );
    }

    if (intent.type === INTENT_TYPE.DEEP_LINK) {
      const pageMap = {
        saves:         'Saves',
        dashboard:     'Dashboard',
        integrations:  'Integrations',
        settings:      'Settings',
        boards:        'Boards',
      };
      const page = pageMap[intent.page] || 'Dashboard';
      navigate(createPageUrl(page));
    }

    if (intent.type === INTENT_TYPE.OAUTH_RETURN) {
      // Let the Integrations page handle OAuth code exchange
      navigate(createPageUrl('Integrations') + '?oauth_code=' + encodeURIComponent(intent.code || ''));
    }
  }

  // ── Sync event handler ─────────────────────────────────────────────────────
  function _onSyncEvent(event) {
    if (event.type === 'SYNC_COMPLETE') {
      setIsSyncing(false);
      setLastSyncTime(new Date().toISOString());
      setSyncStatus(getSyncStatus());
    }
    if (event.type === 'SYNC_START') {
      setIsSyncing(true);
      setSyncError(null);
    }
  }

  // ── Background sync handlers ───────────────────────────────────────────────

  async function _handleOfflineQueue() {
    // Flush items saved while offline (sessionStorage fallback)
    _flushSessionQueue();

    // Flush IndexedDB queue via SW background sync message
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg?.sync) {
        await reg.sync.register('klip4ge-share-sync').catch(() => {});
      }
    }

    return { handler: 'offlineQueue', ok: true };
  }

  async function _handlePlatformSync() {
    // Trigger server-side platform sync for connected integrations
    try {
      const connections = await base44.entities.StreamingConnection.list().catch(() => []);
      const syncable = (connections || []).filter(c =>
        c.is_active && c.platform !== 'facebook' // FB handled by extension/agent
      );

      let synced = 0;
      for (const conn of syncable.slice(0, 2)) { // max 2 per background task
        try {
          await base44.functions.invoke('syncSocialPlatform', {
            connection_id: conn.id,
            platform:      conn.platform,
          });
          synced++;
        } catch { /* non-critical */ }
      }

      return { handler: 'platformSync', synced };
    } catch {
      return { handler: 'platformSync', synced: 0 };
    }
  }

  async function _handleMetaEnrich() {
    // Enrich any saved items that are missing image_url
    // (runs silently, only enriches 5 items per cycle to stay fast)
    try {
      const items = await base44.entities.SavedItem.list({
        filters: [
          { field: 'image_url', operator: 'eq', value: '' },
          { field: 'url',       operator: 'ne', value: '' },
        ],
        limit: 5,
      }).catch(() => []);

      let enriched = 0;
      for (const item of (items || [])) {
        try {
          const meta = await extractUrlMetadata(item.url, {
            useCache:  true,
            timeoutMs: 5000,
          });
          if (meta.image_url) {
            await base44.entities.SavedItem.update(item.id, { image_url: meta.image_url });
            enriched++;
          }
        } catch { /* non-critical */ }
      }

      return { handler: 'metaEnrich', enriched };
    } catch {
      return { handler: 'metaEnrich', enriched: 0 };
    }
  }

  // ── Session queue flush ────────────────────────────────────────────────────

  function _flushSessionQueue() {
    try {
      const raw = sessionStorage.getItem('cf_share_queue');
      if (!raw) return;

      const queue = JSON.parse(raw);
      sessionStorage.removeItem('cf_share_queue');

      queue.forEach((item) => {
        base44.entities.SavedItem.create(item).catch(() => {
          // Re-queue on failure
          queueItem('share_save', item);
        });
      });

      if (queue.length > 0) {
        console.debug('[usePlatformSync] Flushed', queue.length, 'offline items');
      }
    } catch { /* ignore */ }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Manually trigger a sync cycle (e.g. called from Settings → "Sync Now").
   */
  const triggerManualSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const results = await triggerSync();
      setLastSyncTime(new Date().toISOString());
      setSyncStatus(getSyncStatus());
      return results;
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Enrich a URL with metadata using the hidden WebView (native)
   * or CORS proxy (web). Use in AddItemDialog for instant thumbnails.
   */
  const enrichUrl = useCallback(async (url, opts = {}) => {
    if (!url) return null;
    try {
      return await extractUrlMetadata(url, { useCache: true, ...opts });
    } catch {
      return null;
    }
  }, []);

  /**
   * Open a URL inside the app (no browser context switch).
   */
  const openInAppUrl = useCallback(async (url, opts = {}) => {
    const { openInApp } = await import('@/lib/inAppBrowser.js');
    return openInApp(url, opts);
  }, []);

  /**
   * Share content to another app (native share sheet / Web Share API).
   */
  const shareOut = useCallback(async (payload) => {
    return shareToOtherApp(payload);
  }, []);

  /**
   * Clear the current share intent (call after processing).
   */
  const clearIntent = useCallback(() => {
    setShareIntent(null);
  }, []);

  return {
    // State
    syncStatus,
    isSyncing,
    lastSyncTime,
    syncError,
    shareIntent,
    platform:    getPlatform(),
    isNative:    isNative(),

    // Actions
    triggerManualSync,
    enrichUrl,
    openInAppUrl,
    shareOut,
    clearIntent,
  };
}

// ── Standalone hooks for specific use cases ───────────────────────────────────

/**
 * Lightweight hook for URL enrichment only (AddItemDialog, SavedItemCard).
 * Does NOT init the full platform sync stack.
 */
export function useUrlEnrich() {
  const enrich = useCallback(async (url, opts = {}) => {
    if (!url) return null;
    try {
      return await extractUrlMetadata(url, { useCache: true, timeoutMs: 6000, ...opts });
    } catch {
      return null;
    }
  }, []);

  return { enrichUrl: enrich };
}

/**
 * Lightweight hook for share-out only.
 */
export function useNativeShare() {
  const share = useCallback(async (payload) => {
    return shareToOtherApp(payload);
  }, []);

  return { share };
}
