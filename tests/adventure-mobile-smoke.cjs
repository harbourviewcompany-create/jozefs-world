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
      assert.deepEqual(errors,[],'no uncaught browser script errors');
      console.log(browserName+' '+viewport.width+'x'+viewport.height+' adventure PASS');
     }finally{await page.close();}
    }
   }finally{await browser.close();}
  }
 }finally{await close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
