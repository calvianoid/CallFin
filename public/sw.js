/* CallFin service worker — minimal & safe.
 * Network-first for page navigations (so users always get fresh HTML when
 * online, but a cached page or the login screen when offline). Hashed JS/CSS
 * assets are left to the browser/Next's own long-term caching — we never
 * precache them, to avoid ever serving a stale build. */
const CACHE = "callfin-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Only intercept top-level navigations.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match("/login");
      })
  );
});
