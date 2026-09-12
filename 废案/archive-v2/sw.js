/**
 * VidaOS — Service Worker
 * 缓存优先（Cache-First）：静态资源离线可用，更新时整包换缓存。
 */
const CACHE_NAME = 'vidaos-v2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/icons.js',
  './js/vendor/marked.min.js',
  './js/vendor/purify.min.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 仅处理同源请求（数据在 IndexedDB，不走网络）
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
