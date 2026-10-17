/* Offline app shell first. Large portraits must not prevent the updated code
   from installing over mobile data. No API responses or user data are cached. */
const CACHE='yuanhang-static-v24-ui-v16-20261017';
const SHELL=[
 './','./index.html','./manifest.webmanifest','./icon.svg',
 './usage.js','./cloud.js?v=20261016-sync-r4',
 './wendao/novel.js?v=20261016-v15','./wendao/story.js?v=20261016-v15','./wendao/transport.js',
 './wendao/engine.js?v=20261017-v16-review-fix','./wendao/app.js?v=20261017-v16-ui2',
 './wendao/world.js?v=20261017-v16-dynamic','./wendao/interaction.js?v=20261017-v16-review-fix',
 './wendao/motion.js?v=20261017-v16-review-fix','./wendao/companion.js?v=20261017-v16-ui2',
 './wendao/style.css?v=20261016-v15','./wendao/companion.css?v=20261016-v15',
 './wendao/world.css?v=20261017-v16-dynamic','./wendao/motion.css?v=20261017-v16-dynamic',
 './wendao/ui-v16.css?v=20261017-v16-ui2'
];
const ARTWORK=[
 ...['walk','read','herbs','meditate'].flatMap(id=>['cycle','still'].map(kind=>'./wendao/assets/zhiyao-'+id+'-'+kind+'.webp')),
 ...['study','herbs','garden','corridor','bedroom','terrace'].map(id=>'./wendao/assets/world-'+id+'.webp'),
 './wendao/assets/zhiyao-recovery-cg.webp',
 './wendao/assets/study-room.webp','./wendao/assets/lamp-study.webp',
 './wendao/assets/sister-calm.webp','./wendao/assets/sister-tired.webp',
 './wendao/assets/sister-concerned.webp','./wendao/assets/sister-relieved.webp',
 './wendao/assets/sister-ill.webp?v=20261016-ill',
 './wendao/assets/sister-injured.webp?v=20261016-unbound'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  const old=keys.filter(key=>key.startsWith('yuanhang-static-')&&key!==CACHE);
  const target=await caches.open(CACHE);
  // Reuse already-downloaded pictures: some are 1.4-1.7 MB.
  for(const name of old){
   const source=await caches.open(name);
   for(const asset of ARTWORK){
    if(await target.match(asset))continue;
    const saved=await source.match(asset);
    if(saved?.ok){try{await target.put(asset,saved)}catch{/* Optional art must not block activation on a full Safari cache. */}}
   }
  }
  await Promise.all(old.map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||
    !url.pathname.startsWith(new URL(self.registration.scope).pathname)||
    !/(?:\/wendao\/(?:novel\.js|engine\.js|story\.js|app\.js|transport\.js|companion\.js|world\.js|motion\.js|interaction\.js|style\.css|companion\.css|world\.css|motion\.css|ui-v16\.css|assets\/[a-z0-9-]+\.webp)$|\/(?:cloud\.js|usage\.js|index\.html|manifest\.webmanifest|icon\.svg)?$)/.test(url.pathname))return;
 event.respondWith(fetch(req).then(response=>{
  if(response.ok){
   const copy=response.clone();
   event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));
  }
  return response;
 }).catch(async()=>{
  const exact=await caches.match(req);
  if(exact)return exact;
  if(url.pathname.endsWith('.webp'))return caches.match(req,{ignoreSearch:true});
  throw Error('离线状态下，此静态资源尚未缓存');
 }));
});
