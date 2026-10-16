/* Only cache this app's public static assets. Never cache API responses or private data. */
const CACHE = 'yuanhang-static-v14-sync-safari-r2-20261016';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './usage.js', './cloud.js?v=20261016-sync-r2','./wendao/engine.js','./wendao/story.js','./wendao/app.js','./wendao/transport.js','./wendao/style.css','./wendao/assets/study-room.webp','./wendao/assets/sister-calm.webp','./wendao/assets/lamp-study.webp','./wendao/assets/sister-tired.webp','./wendao/assets/sister-concerned.webp','./wendao/assets/sister-ill.webp?v=20261016-ill','./wendao/assets/sister-injured.webp?v=20261016-unbound','./wendao/assets/sister-relieved.webp'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith('yuanhang-static-') && k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req=event.request, url=new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin ||
      !url.pathname.startsWith(new URL(self.registration.scope).pathname) ||
      !/(?:\/wendao\/(?:engine\.js|story\.js|app\.js|transport\.js|style\.css|assets\/[a-z-]+\.webp)$|\/(?:cloud\.js|usage\.js|index\.html|manifest\.webmanifest|icon\.svg)?$)/.test(url.pathname)) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok) {
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(c => c.put(req,copy)));
    }
    return response;
  }).catch(() => caches.match(req)));
});
