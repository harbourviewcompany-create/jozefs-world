/* Jozef FC offline shell: only same-origin public game assets. Never caches personal progress. */
const CACHE='jozef-fc-app-shell-v8';
const CORE=[
 './','./index.html','./world.html','./favicon.svg','./manifest.webmanifest',
 './styles.css','./pitch.css','./extras.css','./tournament.css','./career.css',
 './clubhouse.css','./scramble-positions.css','./stadium.css','./arcade.css','./arena.css','./who.css',
 './matchday.css','./training.css','./jersey-bingo.css',
 './app.js','./extras.js','./tournament.js','./career.js','./clubhouse.js',
 './scramble-positions.js','./celebrate.js','./training.js',
 './jersey-bingo.js','./matchday.js','./street.js','./stadium.js','./arcade.js','./roblox.js','./squad.js','./arena.js','./who.js','./notes.js'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE)
  .then(cache=>cache.addAll(CORE.map(path=>new URL(path,self.registration.scope).href)))
  .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(
  keys.filter(k=>k.startsWith('jozef-fc-app-shell-')&&k!==CACHE).map(k=>caches.delete(k))
 )).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 const root=new URL(self.registration.scope);
 if(url.origin!==root.origin||!url.pathname.startsWith(root.pathname))return;
 // Online must always prefer up-to-date gameplay. Cached shell is an offline fallback.
 event.respondWith(
  fetch(request).then(response=>{
   if(response.ok&&response.type!=='opaque'){
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
   }
   return response;
  }).catch(async()=>{
   const cached=await caches.match(request);
   if(cached)return cached;
   if(request.mode==='navigate'){
    const fallback=await caches.match(new URL('./index.html',root.href));
    if(fallback)return fallback;
   }
   return Response.error();
  })
 );
});
