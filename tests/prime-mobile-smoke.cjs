'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('../prime/node_modules/playwright');
const root=path.resolve(__dirname,'..');
let networkDown=false;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 if(networkDown){req.socket.destroy();return;}
 const url=new URL(req.url,'http://localhost');
 let pathname=decodeURIComponent(url.pathname).replace(/^\/jozefs-world/,'');
 if(pathname.startsWith('/prime/'))pathname=pathname.replace('/prime/','/prime/dist/');
 const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,body)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(err?'missing':body);});
});
const poll=async(page,fn)=>page.waitForFunction(fn,null,{timeout:20000});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port+'/jozefs-world/prime/';
 let cases=0;
 try{
  const engines=(process.env.PRIME_BROWSERS||'chromium,webkit').split(',');
  for(const name of engines){
   const browser=await ({chromium,webkit})[name].launch({headless:true});
   try{
    for(const viewport of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:844,height:390}]){
     const context=await browser.newContext({viewport,isMobile:true,hasTouch:true});
     const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
     await page.goto(base+'?mode=street',{waitUntil:'load'});
     await poll(page,()=>document.querySelector('#street-panel')?.hidden===false&&!!document.querySelector('canvas'));
     assert.equal(await page.locator('#event-name').textContent(),'STREET // 11','Street deep link selects the actual scene');
     assert.equal(await page.locator('#prime-controls').isVisible(),false);
     await page.locator('#street-go').click();
     assert.equal(await page.locator('#street-go').isEnabled(),false,'countdown cannot start twice');
     await poll(page,()=>document.getElementById('street-go').textContent==='PAUSE');
     await page.locator('#street-go').click();
     assert.equal(await page.locator('#street-go').textContent(),'RESUME');
     const before=await page.locator('#street-time').textContent();
     await page.waitForTimeout(250);
     assert.equal(await page.locator('#street-time').textContent(),before,'pause freezes elapsed run time');
     await page.locator('#street-go').click();
     for(const mode of ['hockey','basketball','baseball','wrestling','football']){
      await page.locator('[data-mode="'+mode+'"]').click();
      await poll(page,()=>!document.getElementById('prime-controls').hidden&&document.getElementById('shoot').textContent.includes('↗'));
      const active=await page.locator('[data-mode="'+mode+'"]').getAttribute('aria-pressed');
      assert.equal(active,'true',mode+' is really selected after the scene transition');
      assert.equal(await page.locator('#street-panel').isVisible(),false);
     }
     const boxes=await page.evaluate(()=>({width:innerWidth,body:document.body.scrollWidth,controls:['game','shoot','sound'].map(id=>{
      const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
     })}));
     assert.ok(boxes.body<=boxes.width+1,'no horizontal page overflow');
     for(const box of boxes.controls){assert.ok(box.width>20&&box.height>20,box.id+' usable size');assert.ok(box.x>=0&&box.right<=viewport.width+1&&box.y>=0&&box.bottom<=viewport.height+1,box.id+' stays on screen '+JSON.stringify(box));}
     await page.locator('#challenge').selectOption('legend');
     assert.equal(await page.locator('#round').textContent(),'01');
     await page.locator('#shoot').click();
     await poll(page,()=>document.getElementById('round').textContent==='02');
     if(process.env.PRIME_SCREENSHOTS){fs.mkdirSync(process.env.PRIME_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.PRIME_SCREENSHOTS,name+'-'+viewport.width+'.png')});}
     assert.deepEqual(errors,[],'no runtime exception');
     cases++;await context.close();
    }
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'?mode=wrestling',{waitUntil:'load'});
    await poll(page,()=>document.getElementById('event-name').textContent==='WRESTLING / SHOWTIME');
    for(const answer of [0,1,2,0,1]){
     await page.locator('[data-aim="'+answer+'"]').click();await page.locator('#shoot').click();
     await poll(page,()=>!document.getElementById('shoot').disabled);
    }
    assert.match(await page.locator('#score').textContent(),/05 POINTS/);
    assert.match(await page.locator('#objective').textContent(),/CLUB XP/);
    const saved=await page.evaluate(()=>({profile:JSON.parse(localStorage.getItem('jozefs-world-player-v1')),records:JSON.parse(localStorage.getItem('jozefs-world-multisport-v1')),events:JSON.parse(localStorage.getItem('jozefs-world-chronicle-v1')).events}));
    assert.equal(saved.profile.xp,20);assert.equal(saved.profile.multisportGames,1);assert.equal(saved.records.wrestling.best,5);assert.equal(saved.events.length,1);
    await page.locator('#shoot').click();
    assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-player-v1')).xp)),20,'restart cannot award completed-event XP twice');
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await poll(page,()=>!!navigator.serviceWorker.controller);
    // The shell may cache HTML before the async Prime asset pre-cache finishes.
    // A real offline replay must have the compiled script AND CSS, not only markup.
    await poll(page,async()=>{
      const cache=await caches.open('jozef-prime-public-v2');
      const entry=new URL(location.href);entry.search='';entry.hash='';
      const assets=[entry.href,...[...document.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(el=>el.src||el.href)];
      return assets.length>=3&&(await Promise.all(assets.map(url=>cache.match(url)))).every(Boolean);
    });
    await page.locator('[data-mode="hockey"]').click();
    await poll(page,()=>document.getElementById('event-name').textContent==='HOCKEY SHOOTOUT');
    // Drop the actual transport. WebKit's setOffline can bypass service workers.
    try{
      networkDown=true;await page.reload({waitUntil:'load'});
      await poll(page,()=>!!document.querySelector('canvas'));
    }finally{networkDown=false;}
    assert.equal(await page.locator('#event-name').textContent(),'HOCKEY SHOOTOUT','offline relaunch works after changing the event URL');
    assert.deepEqual(errors,[]);cases++;await context.close();networkDown=false;
   }finally{await browser.close();}
  }
  console.log('Prime browser checks passed: '+cases+' viewport / reduced-motion / offline scenarios');
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
