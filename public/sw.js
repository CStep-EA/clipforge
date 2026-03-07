/**
 * Klip4ge Service Worker  v4
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 *   - Web Share Target: GET (Android PWA) + POST multipart (newer Android/Samsung)
 *   - Offline cache-first for SavedItem/Board API responses (vault loads offline)
 *   - Stale-while-revalidate for app shell
 *   - Cache-first for icons / screenshots
 *   - Background sync queue for failed share-saves (offline → syncs when back online)
 *   - Chrome/Edge extension relay (/api/extension/save POST)
 *   - Push notification support
 *   - SKIP_WAITING / REFRESH_CACHE message handlers
 *   - Source tagging: shares arrive with source="mobile_share" or "pwa_share"
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Cache versioning ──────────────────────────────────────────────────────────
const CACHE_VERSION = "v4";
const SHELL_CACHE   = `klip4ge-shell-${CACHE_VERSION}`;
const API_CACHE     = `klip4ge-api-${CACHE_VERSION}`;
const API_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

// Background sync tag for offline share-saves
const SHARE_SYNC_TAG   = "klip4ge-share-sync";
const SHARE_QUEUE_KEY  = "klip4ge_share_queue";

// App shell — pre-cached on install
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/share-ios.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Base44 API patterns to cache offline
const CACHEABLE_API_PATTERNS = [
  /entities\/SavedItem/,
  /entities\/SharedBoard/,
  /entities\/StreamingConnection/,
  /entities\/UserPreferences/,
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.debug("[SW v4] Installing");
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache.addAll(SHELL_ASSETS).catch((err) =>
          console.warn("[SW] Shell pre-cache partial failure:", err)
        )
      )
  );
  // Take over immediately — share intents must not go to an old SW
  self.skipWaiting();
});

// ── Activate: clean old caches + claim all clients ────────────────────────────
self.addEventListener("activate", (event) => {
  console.debug("[SW v4] Activating");
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

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (!event.data) return;

  // User tapped "Refresh" in the update toast
  if (event.data.type === "SKIP_WAITING") {
    console.debug("[SW] SKIP_WAITING received");
    self.skipWaiting();
    return;
  }

  // Pull-to-refresh: clear API cache so next fetch is live
  if (event.data.type === "REFRESH_CACHE") {
    caches.delete(API_CACHE).then(() => {
      console.debug("[SW] API cache cleared");
      event.source?.postMessage({ type: "CACHE_CLEARED" });
    });
    return;
  }
});

// ── Fetch handler ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ── 1a. Web Share Target — GET (Android Chrome PWA, standard) ───────────
  if (url.pathname === "/share-target" && req.method === "GET") {
    event.respondWith(handleShareTargetGet(url));
    return;
  }

  // ── 1b. Web Share Target — POST multipart/form-data ─────────────────────
  //   Newer Chrome / Samsung Internet sends a POST with enctype=multipart
  //   when the manifest declares method="POST". We handle both for max compat.
  if (url.pathname === "/share-target" && req.method === "POST") {
    event.respondWith(handleShareTargetPost(req));
    return;
  }

  // ── 1c. iOS share-ios.html handler (GET with query params) ───────────────
  if (url.pathname === "/share-ios.html" && req.method === "GET") {
    // Just serve the file — share-ios.html handles its own redirect logic
    event.respondWith(cacheFirst(req));
    return;
  }

  // ── 1d. Extension save relay (/api/extension/save POST) ──────────────────
  if (url.pathname === "/api/extension/save" && req.method === "POST") {
    event.respondWith(handleExtensionSave(req));
    return;
  }

  // ── 2. Non-GET — pass through (don't intercept PUT/DELETE/PATCH) ─────────
  if (req.method !== "GET") return;

  // ── 3. Base44 / Supabase API — network only, no caching ──────────────────
  if (
    url.href.includes("base44.com") ||
    url.href.includes("supabase.co") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // ── 4. Cacheable entity API calls — cache-first with TTL ─────────────────
  const isEntityApi = CACHEABLE_API_PATTERNS.some((p) => p.test(url.href));
  if (isEntityApi) {
    event.respondWith(apiCacheFirst(req));
    return;
  }

  // ── 5. App shell — stale-while-revalidate ────────────────────────────────
  if (SHELL_ASSETS.includes(url.pathname) || url.pathname === "/index.html") {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ── 6. Icons / screenshots — cache first, long TTL ───────────────────────
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/screenshots/")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ── 7. Everything else — network first, SPA fallback ─────────────────────
  event.respondWith(networkFirstWithFallback(req));
});

// ── Background Sync — retry offline share-saves ──────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === SHARE_SYNC_TAG) {
    console.debug("[SW] Background sync: retrying queued shares");
    event.waitUntil(flushShareQueue());
  }
});

// ── Web Share Target: GET handler ─────────────────────────────────────────────
/**
 * Standard Android Chrome GET share. Reads params, notifies open client via
 * postMessage (main.jsx writes sessionStorage), then redirects to /share-target.
 */
async function handleShareTargetGet(url) {
  const title     = url.searchParams.get("title") || "";
  const text      = url.searchParams.get("text")  || "";
  const sharedUrl = url.searchParams.get("url")   || text || "";

  return redirectToSharePage(title, sharedUrl, text, "mobile_share");
}

// ── Web Share Target: POST handler ───────────────────────────────────────────
/**
 * Newer Chrome / Samsung Internet sends POST multipart/form-data.
 * We parse the form data, queue the item, then redirect.
 *
 * To activate POST mode, manifest share_target needs:
 *   "method": "POST",
 *   "enctype": "multipart/form-data"
 * We support both GET and POST so old + new devices both work.
 */
async function handleShareTargetPost(req) {
  try {
    const formData  = await req.formData();
    const title     = formData.get("title") || "";
    const text      = formData.get("text")  || "";
    const sharedUrl = formData.get("url")   || text || "";

    return redirectToSharePage(title, sharedUrl, text, "mobile_share_post");
  } catch (err) {
    console.error("[SW] Failed to parse share POST:", err);
    // Fallback: redirect to share page with empty params — user can fill manually
    return Response.redirect("/share-target?share=1", 302);
  }
}

/**
 * Core redirect helper used by both GET and POST share handlers.
 * Notifies any open window via postMessage so main.jsx can store sessionStorage,
 * then issues a 302 redirect to the ShareTarget React page.
 */
async function redirectToSharePage(title, sharedUrl, text, source = "mobile_share") {
  const redirectTo =
    "/share-target" +
    "?share=1" +
    "&source=" + encodeURIComponent(source) +
    "&title="  + encodeURIComponent(title) +
    "&url="    + encodeURIComponent(sharedUrl) +
    "&text="   + encodeURIComponent(text);

  // Notify any already-open Klip4ge window
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  if (clientList.length > 0) {
    const client = clientList[0];
    client.postMessage({
      type:   "SHARE_TARGET",
      title,
      url:    sharedUrl,
      text,
      source,
    });
    try { await client.focus(); } catch { /* gesture required */ }
    return Response.redirect(redirectTo, 302);
  }

  // No open window — launch a new one
  await self.clients.openWindow(redirectTo);
  return new Response("", { status: 200 });
}

// ── Offline share queue ───────────────────────────────────────────────────────
/**
 * If the share save fails because the device is offline, store the intent
 * in IndexedDB-backed storage and register a background sync.
 * When connectivity returns, flushShareQueue() retries.
 */
async function queueShareForSync(intent) {
  try {
    const db = await openShareQueueDb();
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").add({ ...intent, queued_at: new Date().toISOString() });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    // Register background sync if supported
    if ("sync" in self.registration) {
      await self.registration.sync.register(SHARE_SYNC_TAG);
      console.debug("[SW] Share queued for background sync");
    }
  } catch (err) {
    console.warn("[SW] Could not queue share for sync:", err);
  }
}

async function flushShareQueue() {
  try {
    const db    = await openShareQueueDb();
    const items = await getAllFromDb(db, "queue");
    for (const item of items) {
      // Notify the app client to process queued share intent
      const clients = await self.clients.matchAll({ type: "window" });
      if (clients.length > 0) {
        clients[0].postMessage({ type: "SHARE_QUEUE_ITEM", payload: item });
        await deleteFromDb(db, "queue", item.id);
      }
    }
  } catch (err) {
    console.warn("[SW] Share queue flush failed:", err);
  }
}

// Minimal IndexedDB helpers for the share queue
function openShareQueueDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("klip4ge-share-queue", 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function getAllFromDb(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function deleteFromDb(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = resolve;
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── Extension save relay ──────────────────────────────────────────────────────
/**
 * Called when the Chrome/Edge extension POSTs to /api/extension/save.
 * Proxies the payload to Base44 REST. Keeps the extension from hardcoding
 * the Base44 server URL at build time.
 */
async function handleExtensionSave(req) {
  const corsHeaders = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Id, X-Klip4ge-Extension",
    "Content-Type": "application/json",
  };

  try {
    const body  = await req.json();
    const auth  = req.headers.get("Authorization") || "";
    const appId = req.headers.get("X-App-Id") || "";

    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders,
      });
    }

    if (!appId) {
      return new Response(
        JSON.stringify({ error: "missing_app_id", hint: "Re-sign-in to sync app config" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const upstream = await fetch(
      `https://api.base44.com/apps/${appId}/entities/SavedItem/`,
      {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": auth,
          "X-App-Id":      appId,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await upstream.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status:  upstream.status,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "relay_error", message: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// ── Caching strategies ────────────────────────────────────────────────────────

async function apiCacheFirst(request) {
  const cache  = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const age = Date.now() - new Date(cached.headers.get("sw-cached-at") || 0).getTime();
    if (age < API_CACHE_TTL) {
      revalidateApiCache(request, cache).catch(() => {});
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, stampResponse(response.clone()));
    return response;
  } catch {
    if (cached) return cached;
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

async function staleWhileRevalidate(request) {
  const cache      = await caches.open(SHELL_CACHE);
  const cached     = await cache.match(request);
  const revalidate = fetch(request)
    .then((r) => { if (r.ok) cache.put(request, r.clone()); return r; })
    .catch(() => null);
  return cached || (await revalidate) || fallback();
}

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

async function networkFirstWithFallback(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || fallback();
  }
}

async function fallback() {
  const cache = await caches.open(SHELL_CACHE);
  return (await cache.match("/index.html")) ||
    new Response("Klip4ge is offline", { status: 503 });
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Klip4ge", {
      body:    data.body   || "You have a new update.",
      icon:    "/icons/icon-192.png",
      badge:   "/icons/icon-96.png",
      data:    { url: data.url || "/" },
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const open = clients.find((c) => c.url.includes(self.registration.scope));
      if (open) {
        open.focus();
        open.navigate(target);
      } else {
        self.clients.openWindow(target);
      }
    })
  );
});
