const CACHE_NAME = "mindcare-shell-v1";
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/mindcare-1024.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // Nunca se almacenan respuestas de API ni datos emocionales en Cache Storage.
  if (new URL(request.url).pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
