const CACHE_NAME = "vmusic-cache-v4";
const toCache = [
  "./",
  "index.html",
  "main.js",
  "styles.css",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "default-cover.png"
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