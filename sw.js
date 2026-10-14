/* Jozef FC offline shell: only same-origin public game assets. Never caches personal progress. */
const CACHE='jozef-fc-app-shell-v136';
const CORE=[
 './','./index.html','./world.html','./block-world.html','./block-world.js','./block-world-coop.js','./block-world-art.js','./block-world-art-forest.js','./block-world-ui.js','./block-world-premium.css','./block-world-premium-forest.css','./block-world-art-forest.js?v=20261013-forest3','./block-world.js?v=20261013-forest3','./block-world-coop.js?v=20261013-forest3','./block-world-ui.js?v=20261013-forest3','./block-world-premium-forest.css?v=20261013-forest3','./block-world.css','./block-world-3d.html','./block-world-3d.js','./block-world-3d-textures.js','./block-world-3d-textures.js?v=20261013-forest-coop6','./block-world-3d.css','./block-world-3d-next.css','./block-world-3d-premium.css','./block-world-3d-premium.css?v=20261013-forest-coop6','./block-world-3d.js?v=20261013-forest-coop6','./block-world-3d-next.css?v=20261013-forest-coop6','./block-quest.html','./site-foundation.css','./site-experience.css',
 './favicon.svg','./manifest.webmanifest','./matchday.css','./training.css','./jersey-bingo.css',
 './tournament.js','./career.js','./family-backup.js','./clubhouse.js','./scramble-positions.js','./celebrate.js',
 './training.js','./jersey-bingo.js','./matchday.js','./street.js','./adventure.js','./together-renderer.js','./together.js','./versus-physics.js','./versus-experience-2026.js','./versus-modes-2026.js','./versus-visual-2026.js','./versus.js','./presence.js','./peerjs.min.js','./street-phaser.js','./phaser.min.js','./arcade.js',
 './roblox.js','./squad.js','./site-core.js','./site-features.js','./arena-bundle.js',
 './visual-2026.js','./campaign-2026.js','./club-hq.js','./chronicle.js','./playbook.js',
 './world-core.js','./world-core.css','./family-navigation-2026.js','./family-navigation-2026.css','./versus-broadcast-2026.js','./versus-broadcast-2026.css',
 './prime/'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  // An optional missing file must not prevent the entire offline shell from installing.
  await Promise.all(CORE.map(async path=>{
   try{await cache.add(new URL(path,self.registration.scope).href);}
   catch(err){console.warn('Offline asset unavailable:',path,err);}
  }));
  // Cache versioned compiled assets for Prime's two offline game entries.
  // Prime's entry HTML names the actual hashed bundles: no stale hashes or API data.
  const assetUrls=new Set();
  for(const page of ['./prime/','./prime/neon.html']){
   const pageUrl=new URL(page,self.registration.scope);
   let response=await cache.match(pageUrl);
   if(!response){try{await cache.add(pageUrl);response=await cache.match(pageUrl);}catch(_){/* Optional generated chapter. */}}
   if(!response)continue;
   const html=await response.text();
   for(const match of html.matchAll(/(?:src|href)="(\.\/assets\/[A-Za-z0-9._-]+\.(?:js|css))"/g)){
    assetUrls.add(new URL(match[1],pageUrl).href);
   }
  }
  await Promise.all([...assetUrls].map(async url=>{
   try{await cache.add(url);}catch(err){console.warn('Prime offline asset unavailable:',url,err);}
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
 // Prime uses hashed, immutable bundles. Serve its most recent versioned shell
 // immediately when already cached, even if WebKit is disconnecting the network.
 // Revalidate online without delaying the playable first frame.
 const isPrime=url.pathname.startsWith(new URL('./prime/',root.href).pathname);
 if(isPrime){
  event.respondWith((async()=>{
   const shell=await caches.open(CACHE);
   const cached=await shell.match(request,{ignoreSearch:true})||
     await caches.match(request,{ignoreSearch:true});
   if(cached){
    event.waitUntil(fetch(request).then(response=>{
     if(response.ok&&response.type!=='opaque')return shell.put(request,response.clone());
    }).catch(()=>{}));
    return cached;
   }
   try{
    const response=await fetch(request);
    if(response.ok&&response.type!=='opaque')
     event.waitUntil(shell.put(request,response.clone()).catch(()=>{}));
    return response;
   }catch{
    return request.mode==='navigate'
      ?(await shell.match(new URL('./prime/',root.href))||Response.error())
      :Response.error();
   }
  })());
  return;
 }
 // Online must always prefer up-to-date gameplay. Cached shell is an offline fallback.
 event.respondWith(
  fetch(request).then(response=>{
   if(response.ok&&response.type!=='opaque'){
    const copy=response.clone();
    event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
   }
   return response;
  }).catch(async()=>{
   // Versioned same-path game assets can still use the precached file offline.
   const cached=await caches.match(request,{ignoreSearch:true});
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
