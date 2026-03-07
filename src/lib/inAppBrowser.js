/**
 * inAppBrowser.js — Klip4ge Hidden In-App Browser Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a hidden WebView layer for native iOS and Android builds.
 * On web/PWA it falls back to a fetch-based metadata extractor.
 *
 * PURPOSE:
 *   Silently loads a URL in a hidden WebView, extracts metadata
 *   (title, OG image, description, price, category), and returns the result
 *   without the user ever seeing a browser open.
 *
 * USE CASES:
 *   - Enrich a shared URL with full metadata before saving
 *   - Scrape user's Facebook /saved/ page in the background
 *   - Pre-fetch OG data for items added via Share Sheet
 *   - Silent session-based auth on platforms that block API access
 *
 * ARCHITECTURE:
 *   Native (Capacitor):
 *     Uses @capacitor/browser or @capacitor-community/inappbrowser
 *     Opens URL with toolbar hidden, injects JS extractor, captures result
 *     via message bridge (postMessage → Capacitor plugin event)
 *
 *   Web/PWA fallback:
 *     Uses allorigins.win CORS proxy to fetch HTML
 *     Parses OG/Twitter meta tags via DOMParser
 *     No cookies / session possible (for public pages only)
 *
 * PRIVACY:
 *   - Hidden browser ONLY activated when user explicitly enables platform sync
 *   - No data is collected without user consent
 *   - Session cookies are isolated per-platform, never shared
 *   - All extracted data goes directly to user's own Klip4ge vault
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Platform detection ────────────────────────────────────────────────────────

/**
 * Returns true when running inside a Capacitor native shell.
 * Safe to call during SSR / test environments.
 */
export function isNative() {
  return (
    typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() === true
  );
}

export function getPlatform() {
  if (typeof window === 'undefined') return 'web';
  if (window.Capacitor?.getPlatform) return window.Capacitor.getPlatform(); // 'ios'|'android'|'web'
  return 'web';
}

// ── JS extraction script injected into hidden WebView ─────────────────────────
// This runs inside the WebView and posts results back to the native layer.
const EXTRACTOR_SCRIPT = `
(function() {
  function getMeta(attr, val) {
    const el = document.querySelector('meta[' + attr + '="' + val + '"]');
    return el ? (el.content || el.getAttribute('content') || '') : '';
  }

  function extractPrice() {
    const selectors = [
      '[itemprop="price"]', '.price', '#price',
      '[class*="price"]', '[data-price]',
      '.a-price', '.product-price', '.offer-price',
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) {
        const text = el.innerText || el.getAttribute('content') || '';
        const match = text.match(/[\$\€\£\¥]?\\s*([\\d,]+\\.?\\d*)/);
        if (match) return match[0].trim();
      }
    }
    return '';
  }

  function guessCategory(url, title, desc) {
    const combined = (url + ' ' + title + ' ' + desc).toLowerCase();
    if (/recipe|ingredient|cook|bake|food/.test(combined))  return 'recipe';
    if (/deal|sale|off|coupon|discount|promo/.test(combined)) return 'deal';
    if (/event|ticket|concert|festival/.test(combined))      return 'event';
    if (/hotel|flight|travel|resort|trip/.test(combined))    return 'travel';
    if (/shop|product|buy|cart|item/.test(combined))         return 'product';
    if (/gift|wishlist/.test(combined))                      return 'gift_idea';
    return 'article';
  }

  const data = {
    url:         window.location.href,
    title:       getMeta('property', 'og:title')         ||
                 getMeta('name',     'twitter:title')     ||
                 document.title || '',
    description: getMeta('property', 'og:description')   ||
                 getMeta('name',     'twitter:description') ||
                 getMeta('name',     'description') || '',
    image_url:   getMeta('property', 'og:image')         ||
                 getMeta('name',     'twitter:image')     || '',
    site_name:   getMeta('property', 'og:site_name')     || '',
    price:       extractPrice(),
    author:      getMeta('name', 'author')               ||
                 getMeta('property', 'article:author')   || '',
    keywords:    getMeta('name', 'keywords'),
    canonical:   document.querySelector('link[rel="canonical"]')?.href || window.location.href,
  };

  data.category = guessCategory(data.url, data.title, data.description);
  data.tags = data.keywords
    ? data.keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 8)
    : [];

  // Signal extraction complete
  window.__klip4geExtracted = data;

  // For Capacitor bridge — postMessage to native layer
  if (window.webkit?.messageHandlers?.klip4geBridge) {
    window.webkit.messageHandlers.klip4geBridge.postMessage(
      JSON.stringify({ type: 'EXTRACT_COMPLETE', data })
    );
  }

  // For Android WebView interface
  if (window.KlipAndroidBridge?.onExtractComplete) {
    window.KlipAndroidBridge.onExtractComplete(JSON.stringify({ type: 'EXTRACT_COMPLETE', data }));
  }

  return JSON.stringify(data);
})();
`;

// ── Core service class ────────────────────────────────────────────────────────

class InAppBrowserService {
  constructor() {
    this._plugin        = null;   // Capacitor InAppBrowser plugin (lazy-loaded)
    this._activeSession = null;   // Current hidden browser handle
    this._sessionCache  = new Map(); // url → metadata (TTL 10 min)
    this._CACHE_TTL     = 10 * 60 * 1000;
    this._listeners     = new Map();
    this._initialized   = false;
  }

  // ── Init (call once at app startup) ───────────────────────────────────────
  async init() {
    if (this._initialized) return;
    this._initialized = true;

    if (!isNative()) {
      console.debug('[InAppBrowser] Web mode — using fetch fallback');
      return;
    }

    try {
      // Dynamically import to avoid crashing in web/test environments
      const { InAppBrowser } = await import('@capacitor/inappbrowser').catch(() =>
        // Community plugin fallback
        import('@capacitor-community/inappbrowser').catch(() => ({ InAppBrowser: null }))
      );
      this._plugin = InAppBrowser;
      console.debug('[InAppBrowser] Native plugin loaded on', getPlatform());
    } catch (err) {
      console.warn('[InAppBrowser] Plugin unavailable:', err.message);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Extract metadata from a URL silently.
   * On native: opens hidden WebView, injects extractor JS, closes it.
   * On web: uses CORS proxy fetch.
   *
   * @param {string}  url
   * @param {object}  opts
   * @param {boolean} opts.useCache      - Return cached result if fresh (default true)
   * @param {boolean} opts.useSession    - Use existing logged-in session (default false)
   * @param {number}  opts.timeoutMs     - Max wait (default 8000ms)
   * @returns {Promise<{title, url, description, image_url, category, tags, price, site_name}>}
   */
  async extractMetadata(url, opts = {}) {
    const { useCache = true, useSession = false, timeoutMs = 8000 } = opts;

    // Cache check
    if (useCache) {
      const cached = this._getCached(url);
      if (cached) return cached;
    }

    let result;
    if (isNative() && this._plugin) {
      result = await this._extractNative(url, { useSession, timeoutMs });
    } else {
      result = await this._extractWeb(url, timeoutMs);
    }

    if (result) this._setCache(url, result);
    return result;
  }

  /**
   * Open a URL visibly — a standard in-app browser tab the user sees.
   * Used for OAuth flows, viewing a saved item, etc.
   *
   * @param {string} url
   * @param {object} opts - { title, backButtonText }
   */
  async openVisible(url, opts = {}) {
    if (isNative() && this._plugin) {
      try {
        await this._plugin.open({
          url,
          presentationStyle: 'fullscreen',
          toolbarType:        'navigation',
          toolbarColor:       '#0F1117',
          closeButtonText:    opts.backButtonText || '← Back',
          title:              opts.title || '',
        });
      } catch (err) {
        console.warn('[InAppBrowser] openVisible failed:', err);
        // Fall back to system browser
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Start a background session for a platform that requires login.
   * Opens the browser VISIBLY for the login flow, then hides it once
   * the user is authenticated.
   *
   * @param {string}   loginUrl     - URL to open for login
   * @param {string}   successUrl   - URL pattern that signals login success
   * @param {Function} onSuccess    - Called with session info when login detected
   * @param {Function} onCancel     - Called if user closes without logging in
   */
  async startLoginSession(loginUrl, successUrl, onSuccess, onCancel) {
    if (!isNative() || !this._plugin) {
      // Web fallback: open in popup window and poll for redirect
      return this._webLoginSession(loginUrl, successUrl, onSuccess, onCancel);
    }

    try {
      await this._plugin.open({
        url:               loginUrl,
        presentationStyle: 'popover',
        toolbarType:       'navigation',
        toolbarColor:      '#0F1117',
        closeButtonText:   'Cancel',
      });

      // Listen for URL changes — detect when user reaches successUrl
      const removeListener = await this._plugin.addListener(
        'browserPageLoaded',
        async (event) => {
          if (event?.url?.includes(successUrl) || event?.url?.startsWith(successUrl)) {
            // Inject extractor to grab session cookies / tokens
            const sessionInfo = await this._plugin.executeScript({
              code: `JSON.stringify({ url: window.location.href, cookies: document.cookie })`,
            });
            await this._plugin.close();
            removeListener?.remove?.();
            onSuccess?.(sessionInfo);
          }
        }
      );

      // Handle user closing manually
      await this._plugin.addListener('browserClosed', () => {
        removeListener?.remove?.();
        onCancel?.();
      });

    } catch (err) {
      console.error('[InAppBrowser] Login session error:', err);
      onCancel?.(err);
    }
  }

  /**
   * Scrape a paginated list page (e.g. Facebook /saved/) by:
   *  1. Opening the page hidden
   *  2. Injecting a scroll + collect loop
   *  3. Collecting items as they load
   *  4. Returning the full array when done or maxScrolls reached
   *
   * @param {string}   url
   * @param {object}   opts
   * @param {string}   opts.itemSelector   - CSS selector for item cards
   * @param {Function} opts.extractItem    - JS string that runs per card → returns object
   * @param {number}   opts.maxScrolls     - Max scroll iterations (default 30)
   * @param {number}   opts.scrollDelay    - ms between scrolls (default 1200)
   * @param {Function} opts.onProgress     - Called with { count, scrolled } as items load
   * @returns {Promise<Array>}
   */
  async scrapeListPage(url, opts = {}) {
    const {
      itemSelector = 'div[role="article"]',
      maxScrolls   = 30,
      scrollDelay  = 1200,
      onProgress,
    } = opts;

    if (!isNative() || !this._plugin) {
      console.warn('[InAppBrowser] scrapeListPage requires native environment');
      return [];
    }

    const items = [];
    const seen  = new Set();

    const scrollAndCollect = `
      (async function() {
        const results = [];
        const seen = new Set();
        let scrollCount = 0;
        const MAX = ${maxScrolls};
        const DELAY = ${scrollDelay};

        function extractItem(card) {
          const links = Array.from(card.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(h => h && !h.startsWith('javascript'));
          const external = links.find(h => !h.includes('facebook.com') && h.startsWith('http'));
          const fb       = links.find(h => h.includes('facebook.com'));
          const url = external || fb || '';
          const img = card.querySelector('img[src]');
          const heading = card.querySelector('h1,h2,h3,h4,[role="heading"]');
          return {
            url,
            title:     heading?.innerText?.trim() || card.innerText?.trim().slice(0, 100) || '',
            image_url: img?.src || '',
            source:    'facebook_native',
          };
        }

        while (scrollCount < MAX) {
          const cards = document.querySelectorAll('${itemSelector}');
          cards.forEach(card => {
            const item = extractItem(card);
            if (item.url && !seen.has(item.url)) {
              seen.add(item.url);
              results.push(item);
            }
          });
          window.scrollBy(0, window.innerHeight * 0.8);
          scrollCount++;
          await new Promise(r => setTimeout(r, DELAY));
        }

        return JSON.stringify(results);
      })()
    `;

    try {
      await this._plugin.open({
        url,
        presentationStyle: 'fullscreen',
        toolbarType:       'blank',        // hidden toolbar
      });

      // Wait for initial page load
      await sleep(3000);

      const raw = await this._plugin.executeScript({ code: scrollAndCollect });
      const parsed = JSON.parse(raw?.value || '[]');
      parsed.forEach(item => {
        if (item.url && !seen.has(item.url)) {
          seen.add(item.url);
          items.push(item);
          onProgress?.({ count: items.length });
        }
      });

      await this._plugin.close();
    } catch (err) {
      console.error('[InAppBrowser] scrapeListPage error:', err);
      try { await this._plugin.close(); } catch {}
    }

    return items;
  }

  // ── Private: native extraction ────────────────────────────────────────────

  async _extractNative(url, { useSession, timeoutMs }) {
    return new Promise(async (resolve) => {
      const timer = setTimeout(() => {
        try { this._plugin.close(); } catch {}
        resolve(this._emptyMeta(url));
      }, timeoutMs);

      try {
        // Open hidden (blank toolbar = no visible UI on Android)
        await this._plugin.open({
          url,
          presentationStyle: getPlatform() === 'ios' ? 'popover' : 'fullscreen',
          toolbarType:       'blank',
        });

        // Wait for page load event
        const unlistenLoad = await this._plugin.addListener('browserPageLoaded', async () => {
          try {
            const result = await this._plugin.executeScript({ code: EXTRACTOR_SCRIPT });
            const data   = JSON.parse(result?.value || '{}');
            clearTimeout(timer);
            await this._plugin.close();
            unlistenLoad?.remove?.();
            resolve({ ...this._emptyMeta(url), ...data });
          } catch (err) {
            clearTimeout(timer);
            await this._plugin.close().catch(() => {});
            unlistenLoad?.remove?.();
            resolve(this._emptyMeta(url));
          }
        });

      } catch (err) {
        clearTimeout(timer);
        resolve(this._emptyMeta(url));
      }
    });
  }

  // ── Private: web CORS proxy fallback ──────────────────────────────────────

  async _extractWeb(url, timeoutMs) {
    try {
      const proxyUrl = `https://allorigins.win/get?disableCache=true&url=${encodeURIComponent(url)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (!resp.ok) return this._emptyMeta(url);

      const json   = await resp.json();
      const html   = json.contents || '';
      const parser = new DOMParser();
      const doc    = parser.parseFromString(html, 'text/html');

      const getMeta = (attr, val) => {
        const el = doc.querySelector(`meta[${attr}="${val}"]`);
        return el?.content || el?.getAttribute('content') || '';
      };

      const title       = getMeta('property', 'og:title')       || getMeta('name', 'twitter:title') || doc.title || '';
      const description = getMeta('property', 'og:description') || getMeta('name', 'description')   || '';
      const image_url   = getMeta('property', 'og:image')       || getMeta('name', 'twitter:image') || '';
      const site_name   = getMeta('property', 'og:site_name')   || '';
      const keywords    = getMeta('name', 'keywords');

      const combined = (url + ' ' + title + ' ' + description).toLowerCase();
      const category = /recipe|cook/.test(combined)    ? 'recipe'
                     : /deal|sale|off/.test(combined)   ? 'deal'
                     : /event|ticket/.test(combined)    ? 'event'
                     : /travel|hotel/.test(combined)    ? 'travel'
                     : /shop|product/.test(combined)    ? 'product'
                     : 'article';

      return {
        url, title, description, image_url, site_name, category, price: '',
        tags: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 8) : [],
        _source: 'proxy',
      };
    } catch (err) {
      console.debug('[InAppBrowser] Web extract failed:', err.message);
      return this._emptyMeta(url);
    }
  }

  // ── Private: web popup login session ──────────────────────────────────────

  _webLoginSession(loginUrl, successUrl, onSuccess, onCancel) {
    const popup = window.open(loginUrl, 'klip4ge_login', 'width=500,height=650,left=200,top=100');
    if (!popup) { onCancel?.(new Error('Popup blocked')); return; }

    const poll = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(poll);
          onCancel?.();
          return;
        }
        if (popup.location?.href?.includes(successUrl) ||
            popup.location?.href?.startsWith(successUrl)) {
          clearInterval(poll);
          popup.close();
          onSuccess?.({ url: popup.location.href });
        }
      } catch { /* cross-origin — keep polling */ }
    }, 500);

    // Auto-cancel after 5 min
    setTimeout(() => {
      clearInterval(poll);
      if (!popup.closed) popup.close();
      onCancel?.();
    }, 5 * 60 * 1000);
  }

  // ── Cache helpers ─────────────────────────────────────────────────────────

  _getCached(url) {
    const entry = this._sessionCache.get(url);
    if (!entry) return null;
    if (Date.now() - entry.ts > this._CACHE_TTL) {
      this._sessionCache.delete(url);
      return null;
    }
    return entry.data;
  }

  _setCache(url, data) {
    this._sessionCache.set(url, { data, ts: Date.now() });
    // Cap cache at 200 entries
    if (this._sessionCache.size > 200) {
      const oldest = this._sessionCache.keys().next().value;
      this._sessionCache.delete(oldest);
    }
  }

  _emptyMeta(url) {
    return {
      url,
      title:       '',
      description: '',
      image_url:   '',
      site_name:   '',
      category:    'article',
      price:       '',
      tags:        [],
      _source:     'empty',
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
export const inAppBrowser = new InAppBrowserService();

// ── Convenience wrappers ──────────────────────────────────────────────────────

/**
 * Quick one-call metadata extraction. Handles init internally.
 * Use in AddItemDialog, ShareTarget, etc.
 */
export async function extractUrlMetadata(url, opts = {}) {
  await inAppBrowser.init();
  return inAppBrowser.extractMetadata(url, opts);
}

/**
 * Open a URL in the in-app browser (visible to user).
 */
export async function openInApp(url, opts = {}) {
  await inAppBrowser.init();
  return inAppBrowser.openVisible(url, opts);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
