/**
 * Studio — Service Worker
 * Strategy:
 *  - Static assets (JS/CSS/fonts/images): cache-first, background refresh
 *  - Navigation (HTML pages): network-first, fallback to cache, then /offline
 *  - Supabase / API calls: network-only (never cache auth/data)
 */

const CACHE = "studio-v2";
const OFFLINE_URL = "/offline";

// Assets to pre-cache on install
const PRECACHE = [
  "/offline",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (Supabase, Google, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internals and API routes (auth, data, Drive, etc.)
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/")
  ) {
    // For _next/static we still want caching — override below
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  // Static public assets: cache-first
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2|woff|ttf|otf)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request));
});

// ─── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Serve offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response("<h1>Sin conexión</h1>", {
      headers: { "Content-Type": "text/html" },
    });
  }
}
