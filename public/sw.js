/* DámMaturu PWA — offline shell only. Never cache App Router HTML (RSC).
 * Caching /app/* previously stored loading.tsx shells and broke navigations. */
const CACHE = "dammaturu-shell-v2";
const PRECACHE = ["/", "/offline", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API, auth, server actions, or Next internals
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/") ||
    req.headers.get("next-action") ||
    req.headers.get("rsc")
  ) {
    return;
  }

  // App Router HTML must always be network-only (avoid caching loading shells).
  if (url.pathname.startsWith("/app/")) {
    event.respondWith(
      fetch(req).catch(async () => {
        const offline = await caches.match("/offline");
        return offline || new Response("Offline", { status: 503 });
      }),
    );
    return;
  }

  // Public marketing pages: network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (url.pathname === "/" || url.pathname === "/offline")) {
          const copy = res.clone();
          void caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const offline = await caches.match("/offline");
        return offline || new Response("Offline", { status: 503 });
      }),
  );
});
