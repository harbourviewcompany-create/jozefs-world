/* Real mobile-browser regression for Adventure, including progress restoration. */
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const rel=decodeURIComponent(url.pathname);
 const filename=path.resolve(root,'.'+rel,rel.endsWith('/')?'index.html':'');
 if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(filename,(err,bytes)=>{
  if(err){res.writeHead(404);res.end('not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'});res.end(bytes);
 });
});
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=()=>new Promise(resolve=>server.close(resolve));
(async()=>{
 const port=await listen();
 try{
  for(const browserName of (process.env.ADVENTURE_BROWSERS||'chromium,webkit').split(',')){
   const browser=await ({chromium,webkit})[browserName].launch();
   try{
    for(const viewport of [{width:390,height:844},{width:320,height:568}]){
     const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
     const errors=[];page.on('pageerror',error=>errors.push(error.message));
     try{
      await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>Boolean(window.JozefAdventure?.getProgress));
      await page.evaluate(()=>window.showSection('adventure'));
      await page.waitForFunction(()=>document.getElementById('adventure')?.classList.contains('active'));
      const canvas=await page.locator('#jw-adventure-canvas').boundingBox();
      assert.ok(canvas&&canvas.width>=200&&canvas.height>=120,'game map must be visible');
      assert.equal(await page.locator('#jw-adventure-worlds button').count(),4,'four stage selectors');
      assert.equal(await page.locator('#jw-adventure-outfits button').count(),5,'five earned outfits');
      assert.equal(await page.locator('#jw-adventure-worlds button').nth(1).isDisabled(),true,'future stages begin locked');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'adventure has no horizontal overflow');
      const touchTarget=await page.locator('.jw-adventure-dpad .up').boundingBox();
      assert.ok(touchTarget?.width>=43&&touchTarget?.height>=43,
        'direction pad should provide usable thumb targets even on 320px phones');
      const layout=await page.evaluate(()=>{
       const selectors=['#adventure','.jw-adventure-board','.jw-adventure-sidebar','.jw-adventure-controls',
         '#jw-adventure-interact','#jw-adventure-guide','#jw-adventure-coop','#jw-adventure-retry','.jw-adventure-exit'];
       return selectors.map(sel=>{
        const el=document.querySelector(sel),r=el.getBoundingClientRect();
        return {sel,left:r.left,right:r.right,width:r.width};
       });
      });
      for(const item of layout)assert.ok(item.width>0&&item.left>=-1&&item.right<=viewport.width+1,
        item.sel+' clipped: '+JSON.stringify(item));
      assert.ok(await page.locator('.jw-adventure-exit').isVisible(),'mobile game retains an accessible exit');
      assert.equal(await page.locator('.jw-adventure-collection').evaluate(el=>el.open),false,
        'optional kits start collapsed so the game stays playable');
      assert.equal(await page.locator('.phone-dock').isVisible(),false,
        'global navigation is replaced by compact game controls');
      await page.locator('.jw-adventure-collection summary').click();
      assert.equal(await page.locator('.jw-adventure-collection').evaluate(el=>el.open),true,
        'kits remain accessible using the disclosure');
      await page.locator('#jw-adventure-guide').click();
      await page.waitForFunction(()=>window.JozefAdventure.getProgress().stars>=1,null,{timeout:5000});
      assert.ok(await page.evaluate(()=>window.JozefAdventure.getProgress().stars)>=1,'guided route collects an actual star');
      await page.locator('#jw-adventure-coop').click();
      assert.equal(await page.evaluate(()=>window.JozefAdventure.getProgress().coop),true,'co-op can be enabled');
      await page.locator('#jw-adventure-switch').click();
      assert.match(await page.locator('#jw-adventure-active').textContent(),/Dad/,'second adventurer is selectable');
      await page.locator('#jw-adventure-retry').click();
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>Boolean(window.JozefAdventure?.getProgress));
      const progress=await page.evaluate(()=>window.JozefAdventure.getProgress());
      assert.ok(progress.stars>=1,'earned progress persists after reload');
      assert.equal(progress.coop,true,'player mode remains private and saved');
      // A second playable chapter: verify both heroes actually contribute.
      await page.evaluate(()=>window.JozefTogether.start());
      await page.waitForFunction(()=>!document.querySelector('#jw-together-game').hidden);
      await page.waitForFunction(()=>document.querySelector('#adventure')?.classList.contains('active'),null,{timeout:5000});
      assert.ok((await page.locator('#jw-together-canvas').boundingBox()).width>=200,'Together canvas visible');
      assert.equal(await page.locator('#jw-together-hero-0').count(),1);
      assert.equal(await page.locator('#jw-together-hero-1').count(),1);
      assert.equal(await page.locator('#jw-together-difficulty').count(),1);
      await page.evaluate(()=>window.JozefTogether.toggleDifficulty());
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().difficulty),'challenge');
      await page.evaluate(()=>window.JozefTogether.toggleDifficulty());
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().difficulty),'story');
      for(let stage=0;stage<3;stage++){
       for(let who=0;who<2;who++){
        await page.evaluate(id=>{window.JozefTogether.choose(id);window.JozefTogether.guide();},who);
        if(stage===0&&who===0)
         await page.waitForFunction(()=>window.JozefTogether.progress().clues[0],null,{timeout:6500});
        else if(who===1){
         if(stage===1)await page.evaluate(()=>window.JozefTogether.teamPulse(1));
         await page.waitForFunction(s=>window.JozefTogether.progress().stage>s,stage,{timeout:6500});
        }
        else {
         await page.waitForFunction(s=>{
          const p=window.JozefTogether.progress().positions[0],t=[[3,2],[3,5],[5,2]][s];
          return p.x===t[0]&&p.y===t[1];
         },stage,{timeout:6500});
         if(stage===1)await page.evaluate(()=>window.JozefTogether.teamPulse(0));
        }
       }
      }
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().stage),3,'two people opened the finale');
      await page.evaluate(()=>{window.JozefTogether.close();window.JozefTogether.start();});
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().stage),3,'pausing and resuming restores a fair finale');
      for(let round=0;round<4;round++){
       const guarded=(round*2+1)%3;
       assert.equal(await page.evaluate(lane=>window.JozefTogether.shoot(lane),(guarded+1)%3),true);
      }
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().stage),4,'both champions scored twice');
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().won),true,'shared trophy recorded');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>Boolean(window.JozefTogether));
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().won),true,'shared trophy survives reload');
      await page.evaluate(()=>window.JozefTogether.replay());
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().stage),0,'replay starts a fresh mystery');
      assert.equal(await page.evaluate(()=>window.JozefTogether.progress().won),true,'replay never removes shared cup');
      assert.deepEqual(errors,[],'no uncaught browser script errors');
      console.log(browserName+' '+viewport.width+'x'+viewport.height+' adventure PASS');
     }finally{await page.close();}
    }
   }finally{await browser.close();}
  }
 }finally{await close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
