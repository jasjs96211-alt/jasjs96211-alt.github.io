/* Only cache this app's public static assets. Never cache API responses or private data. */
const CACHE = 'yuanhang-static-v2-20261010';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
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
      !/\/(?:index\.html|manifest\.webmanifest|icon\.svg)?$/.test(url.pathname)) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok) {
      const copy=response.clone();
      event.waitUntil(caches.open(CACHE).then(c => c.put(req,copy)));
    }
    return response;
  }).catch(() => caches.match(req)));
});