/* Jozef FC offline shell: only same-origin public game assets. Never caches personal progress. */
const CACHE='jozef-fc-app-shell-v86';
const CORE=[
 './','./index.html','./world.html','./site-foundation.css','./site-experience.css',
 './favicon.svg','./manifest.webmanifest','./matchday.css','./training.css','./jersey-bingo.css',
 './tournament.js','./career.js','./clubhouse.js','./scramble-positions.js','./celebrate.js',
 './training.js','./jersey-bingo.js','./matchday.js','./street.js','./adventure.js','./versus-physics.js','./versus.js','./presence.js','./peerjs.min.js','./street-phaser.js','./phaser.min.js','./arcade.js',
 './roblox.js','./squad.js','./site-core.js','./site-features.js','./arena-bundle.js',
 './visual-2026.js','./campaign-2026.js','./club-hq.js','./chronicle.js','./playbook.js'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  // An optional missing file must not prevent the entire offline shell from installing.
  await Promise.all(CORE.map(async path=>{
   try{await cache.add(new URL(path,self.registration.scope).href);}
   catch(err){console.warn('Offline asset unavailable:',path,err);}
  }));
  await self.skipWaiting();
 }));
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
    if(url.pathname.startsWith(new URL('./prime/',root.href).pathname)){
     const prime=await caches.match(new URL('./prime/',root.href),{ignoreSearch:true})||await caches.match(new URL('./prime/index.html',root.href),{ignoreSearch:true});
     if(prime)return prime;
    }
    const fallback=await caches.match(new URL('./index.html',root.href));
    if(fallback)return fallback;
   }
   return Response.error();
  })
 );
});
