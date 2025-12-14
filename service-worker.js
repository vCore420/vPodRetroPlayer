const CACHE_NAME = `vmusic-cache-2.8.1`;
const toCache = [
  "./",
  "index.html",
  "manifest.json",
  "src/js/core.js",
  "src/js/main.js",
  "src/js/nav.js",
  "src/js/handler.js",
  "src/js/audio.js",
  "src/js/ui/mainUi.js",
  "src/js/ui/mainMenu.js",
  "src/js/ui/loadMenu.js",
  "src/js/ui/recapMenu.js",
  "src/js/ui/nowPlaying.js",
  "src/js/ui/playlists.js",
  "src/js/ui/albumMenu.js",
  "src/js/ui/artistMenu.js",
  "src/js/ui/songsMenu.js",
  "src/js/ui/gamesMenu.js",
  "src/js/ui/settingsMenu.js",
  "src/js/ui/suggestions.js",
  "src/css/styles.css",
  "src/css/themes.css",
  "src/img/icon-192.png",
  "src/img/icon-512.png",
  "src/img/default-cover.png",
  "src/img/flailing_bird.png",
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
