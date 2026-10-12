/* Real GPU/browser checks for 2026 Block World 3D. */
'use strict';
const {chromium}=require('../prime/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+name,name.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data)});
});
async function check(width,height){
 const browser=await chromium.launch({args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-web-security=false']});
 try{
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<700,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/block-world-3d.html',{waitUntil:'domcontentloaded',timeout:20000});
   const webgl=await page.evaluate(()=>!!document.getElementById('view')?.getContext('webgl'));
   assert.ok(webgl,'software WebGL must initialize on CI runner');
   await page.waitForFunction(()=>window.BlockWorld3D?.status().renderOk===true,null,{timeout:20000});
   const before=await page.evaluate(()=>window.BlockWorld3D.status());
   assert.ok(before.loadedChunks>0,'terrain chunks should stream');
   const box=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    radar:document.querySelector('#minimap').getBoundingClientRect().toJSON(),
    controls:[...document.querySelectorAll('.actions button')].map(b=>b.getBoundingClientRect().toJSON())
   }));
   assert.ok(box.width<=width+1,'no horizontal overflow');
   assert.ok(box.radar.right<=width+1&&box.radar.width>65,'radar visible');
   for(const b of box.controls)assert.ok(b.left>=-1&&b.right<=width+1,'actions stay on-screen');
   await page.locator('#options').click();
   await page.locator('#quality').click();
   assert.equal(await page.evaluate(()=>window.BlockWorld3D.status().quality),'ECO');
   await page.locator('#quality').click();
   assert.equal(await page.evaluate(()=>window.BlockWorld3D.status().quality),'QUALITY');
   await page.locator('#close').click();
   await page.keyboard.down('w');await page.waitForTimeout(320);await page.keyboard.up('w');
   const after=await page.evaluate(()=>window.BlockWorld3D.status());
   assert.ok(Number.isFinite(after.hero.z)&&Math.abs(after.hero.z-before.hero.z)>.05,'player responds to movement');
   assert.deepEqual(errors,[],'no uncaught WebGL exceptions');
   await page.screenshot({path:path.join(root,'block3d-'+width+'x'+height+'.png')});
   console.log('Chromium '+width+'x'+height+' Block World 3D GPU + game controls PASS');
  }finally{await page.close();}
 }finally{await browser.close()}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await check(390,844);await check(320,568);await check(1280,720);}
 finally{await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1});
