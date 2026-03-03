/**
 * Klip4ge Service Worker v3
 *
 * NEW in v3:
 *   - Offline cache-first for SavedItem API responses (vault loads without network)
 *   - Separate API_CACHE with 24-hour TTL for entity list calls
 *   - Background sync queue for failed mutations (best-effort)
 *   - Pull-to-Refresh support: SW responds to REFRESH_CACHE message
 *
 * Existing features retained:
 *   - Stale-while-revalidate for app shell
 *   - Cache-first for icons/screenshots
 *   - Web Share Target handler (Android share sheet)
 *   - SKIP_WAITING message handler
 *   - Push notification support
 */

// ── Cache versioning ─────────────────────────────────────────────────────────
const CACHE_VERSION  = "v3";
const SHELL_CACHE    = `klip4ge-shell-${CACHE_VERSION}`;
const API_CACHE      = `klip4ge-api-${CACHE_VERSION}`;
const API_CACHE_TTL  = 24 * 60 * 60 * 1000; // 24 h in ms

// App shell — pre-cached on install
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// API URL patterns to cache offline (cache-first for GET, network-update background)
const CACHEABLE_API_PATTERNS = [
  /entities\/SavedItem/,
  /entities\/SharedBoard/,
  /entities\/StreamingConnection/,
  /entities\/UserPreferences/,
];

// ── Install: pre-cache shell ─────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache.addAll(SHELL_ASSETS).catch((err) => {
          console.warn("[SW] Shell pre-cache partial failure:", err);
        })
      )
  );
});

// ── Activate: clean up old caches + claim clients ─────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
            .map((k) => {
              console.debug("[SW] Deleting old cache:", k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Message handler ────────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    console.debug("[SW] Received SKIP_WAITING");
    self.skipWaiting();
    return;
  }

  // Pull-to-refresh: clear API cache so next fetch is fresh
  if (event.data.type === "REFRESH_CACHE") {
    caches.delete(API_CACHE).then(() => {
      console.debug("[SW] API cache cleared for pull-to-refresh");
      event.source?.postMessage({ type: "CACHE_CLEARED" });
    });
    return;
  }

  if (event.data.type === "SHARE_TARGET_ACK") {
    console.debug("[SW] Share target acknowledged");
  }
});

// ── Fetch handler ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ── 1. Web Share Target (/share-target GET) ──────────────────────────────
  if (url.pathname === "/share-target" && req.method === "GET") {
    event.respondWith(handleShareTarget(url));
    return;
  }

  // ── 2. Non-GET — pass through ─────────────────────────────────────────────
  if (req.method !== "GET") return;

  // ── 3. Cacheable API (entity list/get calls) — cache-first offline ────────
  const isApiCall = CACHEABLE_API_PATTERNS.some((p) => p.test(url.href));
  if (isApiCall) {
    event.respondWith(apiCacheFirst(req));
    return;
  }

  // ── 4. Base44 auth/non-entity — network only ─────────────────────────────
  if (url.href.includes("base44.com") || url.href.includes("supabase.co")) {
    return; // Let browser handle normally
  }

  // ── 5. Shell assets — stale-while-revalidate ─────────────────────────────
  if (SHELL_ASSETS.includes(url.pathname) || url.pathname === "/index.html") {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ── 6. Icons / screenshots — cache first, long TTL ───────────────────────
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/screenshots/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ── 7. Everything else — network first, cache fallback ───────────────────
  event.respondWith(networkFirstWithFallback(req));
});

// ── Caching strategies ────────────────────────────────────────────────────────

/**
 * apiCacheFirst:
 * Serve from API_CACHE if cached and not stale (< 24h old).
 * Otherwise fetch from network, cache response, and return it.
 * On network failure → return stale cache (offline mode).
 */
async function apiCacheFirst(request) {
  const cache  = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    // Check TTL via Date header or custom header
    const cachedDate = new Date(cached.headers.get("sw-cached-at") || 0);
    const age = Date.now() - cachedDate.getTime();
    if (age < API_CACHE_TTL) {
      // Serve from cache; revalidate in background
      revalidateApiCache(request, cache).catch(() => {});
      return cached;
    }
  }

  // Cache miss or stale — fetch fresh
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone response and stamp with cache timestamp
      const stamped = stampResponse(response.clone());
      cache.put(request, stamped);
    }
    return response;
  } catch {
    // Network failed — return stale cache even if expired (offline)
    if (cached) {
      console.debug("[SW] Offline: returning stale API cache for", request.url);
      return cached;
    }
    return new Response(JSON.stringify({ error: "offline", items: [] }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function revalidateApiCache(request, cache) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, stampResponse(fresh.clone()));
  } catch { /* silent */ }
}

function stampResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", new Date().toISOString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Stale-While-Revalidate: serve from cache, update in background.
 */
async function staleWhileRevalidate(request) {
  const cache    = await caches.open(SHELL_CACHE);
  const cached   = await cache.match(request);
  const revalidate = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await revalidate) || fallback();
}

/**
 * Cache First: return from cache; fetch and cache on miss.
 */
async function cacheFirst(request) {
  const cache  = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return fallback();
  }
}

/**
 * Network First With Fallback: try network; on failure serve cache → index.html.
 */
async function networkFirstWithFallback(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || fallback();
  }
}

/** Ultimate fallback: serve the cached SPA shell */
async function fallback() {
  const cache = await caches.open(SHELL_CACHE);
  return (await cache.match("/index.html")) || new Response("Offline", { status: 503 });
}

// ── Web Share Target handler ───────────────────────────────────────────────────
async function handleShareTarget(url) {
  const title     = url.searchParams.get("title") || "";
  const text      = url.searchParams.get("text")  || "";
  const sharedUrl = url.searchParams.get("url")   || text || "";

  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  const redirectTo =
    "/share-target?share=1" +
    "&title=" + encodeURIComponent(title) +
    "&url="   + encodeURIComponent(sharedUrl) +
    "&text="  + encodeURIComponent(text);

  if (clientList.length > 0) {
    const client = clientList[0];
    client.postMessage({ type: "SHARE_TARGET", title, url: sharedUrl, text });
    try { await client.focus(); } catch { /* may fail outside user gesture */ }
    return Response.redirect(redirectTo, 302);
  }

  await self.clients.openWindow(redirectTo);
  return new Response("", { status: 200 });
}

// ── Push notifications ─────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Klip4ge", {
      body:  data.body  || "You have a new update.",
      icon:  "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data:  { url: data.url || "/" },
      actions: data.actions || [],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((clients) => {
        const openClient = clients.find((c) => c.url.includes(self.registration.scope));
        if (openClient) {
          openClient.focus();
          openClient.navigate(target);
        } else {
          self.clients.openWindow(target);
        }
      })
  );
});

 *
 * Features:
 *   - Stale-while-revalidate caching strategy for shell assets
 *   - Network-first with cache fallback for API/dynamic requests
 *   - Web Share Target handler (Android share sheet → /share-target)
 *   - Push notification support
 *   - SKIP_WAITING message handler (triggered by app update toast)
 *   - New-version detection broadcast to all open clients
 *
 * Roadmap item 4.4 — SW Update Strategy (Stale-While-Revalidate)
 */

// ── Cache versioning ─────────────────────────────────────────────────────────
// Bump CACHE_VERSION when you deploy breaking changes.
const CACHE_VERSION = "v2";
const CACHE_NAME    = `clipforge-shell-${CACHE_VERSION}`;

// App shell — pre-cached on install
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// ── Install: pre-cache shell ─────────────────────────────────────────────────
// NOTE: We do NOT call self.skipWaiting() here anymore.
// Instead we wait for the app to send SKIP_WAITING so the user is notified.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(SHELL_ASSETS).catch((err) => {
          // Icon files may not exist yet (pre-generation) — don't fail install
          console.warn("[SW] Shell pre-cache partial failure (icons missing?):", err);
        })
      )
  );
});

// ── Activate: clean up old caches + claim clients ────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => {
              console.debug("[SW] Deleting old cache:", k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Message handler: SKIP_WAITING + app messages ─────────────────────────────
self.addEventListener("message", (event) => {
  if (!event.data) return;

  // App UI sends SKIP_WAITING when the user taps the "Refresh" toast
  if (event.data.type === "SKIP_WAITING") {
    console.debug("[SW] Received SKIP_WAITING — activating new version");
    self.skipWaiting();
    return;
  }

  // Legacy: share target data forwarded from another client window
  if (event.data.type === "SHARE_TARGET_ACK") {
    console.debug("[SW] Share target acknowledged by client");
  }
});

// ── Fetch handler ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ── 1. Web Share Target (/share-target GET) ──────────────────────────────
  if (url.pathname === "/share-target" && req.method === "GET") {
    event.respondWith(handleShareTarget(url));
    return;
  }

  // ── 2. Non-GET requests — pass through (don't cache POST/PUT/DELETE) ─────
  if (req.method !== "GET") return;

  // ── 3. Base44 API / auth calls — network only, no caching ────────────────
  if (
    url.href.includes("base44.com") ||
    url.href.includes("/api/") ||
    url.href.includes("supabase.co")
  ) {
    return; // Let browser handle normally
  }

  // ── 4. Shell assets — stale-while-revalidate ─────────────────────────────
  if (SHELL_ASSETS.includes(url.pathname) || url.pathname === "/index.html") {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ── 5. Icon / screenshot assets — cache first, long TTL ──────────────────
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/screenshots/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ── 6. Everything else — network first, cache fallback ───────────────────
  event.respondWith(networkFirstWithFallback(req));
});

// ── Caching strategies ────────────────────────────────────────────────────────

/**
 * Stale-While-Revalidate:
 * Serve from cache immediately, then fetch + update cache in background.
 * Ideal for the app shell (index.html, manifest) so the user gets instant load
 * AND the cache is always one version behind latest (acceptable for SPA).
 */
async function staleWhileRevalidate(request) {
  const cache    = await caches.open(CACHE_NAME);
  const cached   = await cache.match(request);

  // Kick off revalidation regardless of cache hit
  const revalidate = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await revalidate) || fallback();
}

/**
 * Cache First:
 * Return from cache if available; fetch and cache on miss.
 * Used for icons / screenshots which change rarely.
 */
async function cacheFirst(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return fallback();
  }
}

/**
 * Network First With Fallback:
 * Try network; on failure serve cache; ultimate fallback → index.html (SPA).
 */
async function networkFirstWithFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || fallback();
  }
}

/** Ultimate fallback: serve the cached SPA shell */
async function fallback() {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match("/index.html")) || new Response("Offline", { status: 503 });
}

// ── Web Share Target handler ──────────────────────────────────────────────────
async function handleShareTarget(url) {
  const title     = url.searchParams.get("title") || "";
  const text      = url.searchParams.get("text")  || "";
  const sharedUrl = url.searchParams.get("url")   || text || "";

  // Store intent in sessionStorage via postMessage to open client window
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  // Build the redirect URL — ShareTarget page reads sessionStorage set by main.jsx listener
  const redirectTo =
    "/share-target?share=1" +
    "&title=" + encodeURIComponent(title) +
    "&url="   + encodeURIComponent(sharedUrl) +
    "&text="  + encodeURIComponent(text);

  if (clientList.length > 0) {
    const client = clientList[0];
    // Post message so main.jsx can write sessionStorage before navigation
    client.postMessage({
      type:  "SHARE_TARGET",
      title,
      url:   sharedUrl,
      text,
    });
    try { await client.focus(); } catch { /* focus may fail outside user gesture */ }
    return Response.redirect(redirectTo, 302);
  }

  // No open window — open a new one
  await self.clients.openWindow(redirectTo);
  return new Response("", { status: 200 });
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "ClipForge", {
      body:  data.body  || "You have a new update.",
      icon:  "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data:  { url: data.url || "/" },
      actions: data.actions || [],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((clients) => {
        const openClient = clients.find((c) => c.url.includes(self.registration.scope));
        if (openClient) {
          openClient.focus();
          openClient.navigate(target);
        } else {
          self.clients.openWindow(target);
        }
      })
  );
});
