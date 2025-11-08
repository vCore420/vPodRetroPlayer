const CACHE_NAME = "vmusic-cache-v8";
const toCache = [
  "./",
  "index.html",
  "src/js/main.js",
  "src/js/ui.js",
  "src/js/nav.js",
  "src/js/playlist.js",
  "src/js/handler.js",
  "src/js/audio.js",
  "src/css/styles.css",
  "src/json/manifest.json",
  "src/img/icon-192.png",
  "src/img/icon-512.png",
  "src/img/default-cover.png",
  "src/img/logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(toCache))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});