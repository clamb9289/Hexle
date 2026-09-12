// Hexle service worker: caches the static app shell for install/offline support.
// Bump CACHE_NAME whenever a shipped file changes so clients pick up the new version.
const CACHE_NAME = "hexle-shell-v2";

const SHELL_FILES = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/colors-data.js",
  "/targets.js",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/favicon-32.png",
  "/favicon-16.png",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never touch cross-origin requests (e.g. the stats API, Cloudflare beacon) —
  // those need a live network round-trip every time.
  if (url.origin !== self.location.origin) return;

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
