const CACHE_NAME = 'vmusic-cache-2.9.99';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'src/js/core.js',
  'src/js/main.js',
  'src/js/nav.js',
  'src/js/handler.js',
  'src/js/audio.js',
  'src/js/ui/mainUi.js',
  'src/js/ui/mainMenu.js',
  'src/js/ui/loadMenu.js',
  'src/js/ui/recapMenu.js',
  'src/js/ui/nowPlaying.js',
  'src/js/ui/playlists.js',
  'src/js/ui/albumMenu.js',
  'src/js/ui/artistMenu.js',
  'src/js/ui/songsMenu.js',
  'src/js/ui/gamesMenu.js',
  'src/js/ui/settingsMenu.js',
  'src/js/ui/suggestions.js',
  'src/css/styles.css',
  'src/css/themes.css',
  'src/img/icon-192.png',
  'src/img/icon-512.png',
  'src/img/default-cover.png',
  'src/img/flailing_bird.png',
  'src/img/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  const isNavigate = request.mode === 'navigate';
  const isCodeAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html');

  const isStaticAsset =
    request.destination === 'image' ||
    request.destination === 'manifest';

  if (isNavigate || isCodeAsset) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});