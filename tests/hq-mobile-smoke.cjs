/* Jozef's World HQ // interactive globe cross-browser and phone smoke. */
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const loc=new URL(req.url,'http://localhost');
 const file=path.resolve(root,'.'+decodeURIComponent(loc.pathname),(loc.pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,body)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':body);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 try{
  for(const engine of (process.env.HQ_BROWSERS||'chromium,webkit').split(',')){
   const browser=await ({chromium,webkit})[engine].launch();
   try{
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
     const page=await browser.newPage({viewport,reducedMotion:'reduce',hasTouch:true});
     const errors=[];page.on('pageerror',e=>errors.push(e.message));
     await page.goto(url,{waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>Boolean(window.JozefWorldCore?.progress),null,{timeout:15000});
     const world=page.locator('#jw-worldcore');
     assert.ok(await world.isVisible(),'new HQ is the first usable game surface');
     const box=await world.boundingBox();
     assert.ok(box.width<=viewport.width+1,'3D HQ fits viewport');
     assert.ok(box.y<160,'globe starts above the fold');
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal scroll');
     const state=await page.evaluate(()=>window.JozefWorldCore.progress());
     assert.equal(state.selected,'adventure');
     assert.equal(await page.locator('.studio-hero').isVisible(),false,'old marketing hero remains optional');
     assert.ok(state.webgl||state.fallback,'game is usable even without graphics support');
     await page.locator('#jw-worldcore-list-toggle').click();
     assert.equal(await page.locator('#jw-worldcore-index button').count(),12,'all plates in the accessible index');
     await page.locator('#jw-worldcore-index button[data-world="1"]').click();
     assert.equal(await page.locator('#jw-worldcore-selected-title').textContent(),'Together');
     await page.locator('#jw-worldcore-index button[data-world="0"]').click();
     assert.equal(await page.locator('#jw-worldcore-selected-title').textContent(),'Adventure');
     if(!state.fallback){
      const canvas=page.locator('#jw-worldcore-canvas');
      await canvas.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowUp');
      assert.ok(await canvas.isVisible(),'webgl canvas still interactive');
      assert.ok((await canvas.boundingBox()).width>140,'touch target is usefully sized');
     }
     await page.locator('#jw-worldcore-enter').click();
     await page.waitForFunction(()=>location.hash==='#adventure'&&document.querySelector('#adventure').classList.contains('active'),null,{timeout:7000});
     await page.goBack();
     await page.waitForFunction(()=>document.querySelector('#home').classList.contains('active'),null,{timeout:7000});
     await page.locator('#jw-worldcore-dashboard').click();
     assert.ok(await page.locator('.hq-launchpad').isVisible(),'legacy launchpad remains accessible behind dashboard');
     assert.equal(await page.locator('.hq-launchpad a').count(),6);
     assert.ok(await page.locator('.hq-details').isVisible());
     await page.locator('#jw-worldcore-dashboard').click();
     assert.equal(await page.locator('.hq-launchpad').isVisible(),false);
     assert.deepEqual(errors,[],'no JavaScript crashes');
     console.log(engine+' '+viewport.width+'x'+viewport.height+' WORLD CORE PASS');
     await page.close();
    }
   }finally{await browser.close();}
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
