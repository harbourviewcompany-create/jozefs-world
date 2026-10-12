/* Browser smoke checks run in CI with Playwright: real DOM, canvas, and mobile input. */
'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const abs=path.resolve(root,'.'+pathname,(pathname.endsWith('/')?'index.html':''));
 if(!abs.startsWith(root+path.sep) && abs!==path.join(root,'index.html')){res.writeHead(403);res.end();return;}
 fs.readFile(abs,(err,body)=>{
  if(err){res.writeHead(404);res.end('not found');return;}
  res.writeHead(200,{'Content-Type':types[path.extname(abs)]||'application/octet-stream'});res.end(body);
 });
});
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=()=>new Promise(resolve=>server.close(resolve));
(async()=>{
 const port=await listen();
 try{
  for(const name of (process.env.HQ_BROWSERS||'chromium,webkit').split(',')){
   const browser=await ({chromium,webkit})[name].launch();
   try{
    for(const viewport of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
     const page=await browser.newPage({viewport,reducedMotion:'reduce'});
     const errors=[];page.on('pageerror',e=>errors.push(e.message));
     await page.goto('http://127.0.0.1:'+port);
     const launch=page.locator('.hq-launchpad');
     assert.equal(await launch.locator('a').count(),6);
     for(const mode of ['football','hockey','basketball','baseball','wrestling','street']){
      const link=launch.locator('a[href="prime/?mode='+mode+'"]');
      assert.equal(await link.count(),1);
      assert.ok((await link.boundingBox()).height>=44);
      assert.ok((await page.request.get(new URL(await link.getAttribute('href'),page.url()).href)).ok());
     }
     assert.equal(await page.locator('.hq-details').getAttribute('open'),null);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
     if(viewport.height>=800)assert.ok((await launch.boundingBox()).y+(await launch.boundingBox()).height<viewport.height-70,'games above dock');
     await page.locator('.hq-details summary').focus();await page.keyboard.press('Enter');
     assert.ok(await page.locator('#team-picker').isVisible());
     await page.locator('#today-play-versus').click();
     await page.waitForFunction(()=>location.hash==='#versus'&&document.querySelector('#versus').classList.contains('active'));
     assert.equal(await page.locator('[data-dock-section="versus"]').getAttribute('aria-current'),'page');
     await page.goBack();await page.waitForFunction(()=>document.querySelector('#home').classList.contains('active'));
     assert.ok(await page.locator('#team-picker').isVisible(),'disclosure survives navigation');
     assert.deepEqual(errors,[]);
     console.log(name+' '+viewport.width+'x'+viewport.height+' HQ PASS');
     await page.close();
    }
   }finally{await browser.close();}
  }
 }finally{await close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
