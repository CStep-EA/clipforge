/**
 * ClipForge Service Worker
 * - Caches app shell for offline use
 * - Handles share_target GET requests (Android Web Share API)
 * - Registers push-notification support stubs
 */

const CACHE_NAME = "clipforge-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ─────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first with shell fallback ────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ── Handle Web Share Target (/share-target) ────────────────────────────
  // Android fires a GET to /share-target?title=...&text=...&url=...
  if (url.pathname === "/share-target" && event.request.method === "GET") {
    event.respondWith(
      (async () => {
        // Extract shared params
        const title = url.searchParams.get("title") || "";
        const text  = url.searchParams.get("text")  || "";
        const sharedUrl = url.searchParams.get("url") || text || "";

        // Store in IndexedDB / sessionStorage for the ShareTarget page to pick up
        const clients = await self.clients.matchAll({ type: "window" });

        // Open or focus the app then navigate to share-target page
        if (clients.length > 0) {
          const client = clients[0];
          await client.focus();
          client.postMessage({
            type: "SHARE_TARGET",
            title,
            url: sharedUrl,
            text,
          });
          return Response.redirect("/?share=1&title=" + encodeURIComponent(title) + "&url=" + encodeURIComponent(sharedUrl), 302);
        }

        // No open window — open one
        await self.clients.openWindow(
          "/?share=1&title=" + encodeURIComponent(title) + "&url=" + encodeURIComponent(sharedUrl)
        );
        return new Response("", { status: 200 });
      })()
    );
    return;
  }

  // ── Default: network first, fallback to cache ──────────────────────────
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET responses
        if (
          event.request.method === "GET" &&
          response.ok &&
          !url.href.includes("base44") // Don't cache API calls
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match("/index.html"))
      )
  );
});

// ── Push notification stubs ────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "ClipForge", {
      body: data.body || "You have a new update.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url: data.url || "/" },
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
        if (clients.length > 0) {
          clients[0].focus();
          clients[0].navigate(target);
        } else {
          self.clients.openWindow(target);
        }
      })
  );
});
