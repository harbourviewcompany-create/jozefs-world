/* Neon City 2026: real touchscreen browser regression and legacy-save continuity. */
'use strict';
const {chromium,webkit}=require('../prime/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(error,data)=>{
  if(error){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);
 });
});
async function run(engine,viewport){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='http://127.0.0.1:'+server.address().port+'/prime/neon.html';
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#neon-stage canvas')?.width>100,null,{timeout:15000});
   const ui=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,width:innerWidth,stage:document.getElementById('neon-stage').getBoundingClientRect().toJSON(),
    arrows:[...document.querySelectorAll('.dpad button')].map(x=>x.getBoundingClientRect().toJSON()),
    buttons:[...document.querySelectorAll('.actions button')].map(x=>x.getBoundingClientRect().toJSON())
   }));
   assert.ok(ui.scroll<=ui.width+1,'no page-level horizontal overflow '+JSON.stringify(ui));
   assert.ok(ui.stage.width>=viewport.width-28,'playfield uses the screen width');
   for(const btn of [...ui.arrows,...ui.buttons]){
    assert.ok(btn.width>=43&&btn.height>=40,'touch target is large enough');
    assert.ok(btn.right<=viewport.width+1,'control is not clipped on the right');
   }
   // A canvas can exist before Phaser finishes running Scene.create().
   await page.waitForFunction(()=>document.getElementById('neon-status')?.textContent.includes('A new night'),null,{timeout:12000})
     .catch(async error=>{throw Error('Neon scene failed to initialize: '+await page.locator('#neon-status').textContent()+' browser errors: '+errors.join(' | ')+' '+error.message)});
   await page.locator('#neon-guide').click();
   await page.waitForFunction(()=>document.getElementById('neon-progress').textContent.includes('1/5'),null,{timeout:8000})
     .catch(async error=>{throw Error('Neon guided movement failed: status='+await page.locator('#neon-status').textContent()+
       ' progress='+await page.locator('#neon-progress').textContent()+' browser errors='+errors.join(' | ')+' '+error.message)});
   const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-adventure-v1')));
   assert.ok(first.stars.includes('0-star-0'),'guided movement collected a real Adventure star');
   // Continue the SAME original Adventure save from an unlocked keeper.
   await page.evaluate(()=>{
    const key='jozefs-world-adventure-v1',d=JSON.parse(localStorage.getItem(key));
    d.stars=['0-star-0','0-star-1','2-star-2'];
    d.switches=['0-switch-0','0-switch-1'];d.secrets=['1-secret-0'];
    localStorage.setItem(key,JSON.stringify(d));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#neon-stage canvas')?.width>100,null,{timeout:15000});
   await page.locator('#neon-guide').click();
   await page.locator('#neon-finale').waitFor({state:'visible',timeout:15000});
   await page.locator('#neon-shot-0').click();
   await page.locator('#neon-shot-0').click();
   await page.locator('#neon-finale').waitFor({state:'hidden',timeout:5000});
   const win=await page.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-adventure-v1')));
   assert.ok(win.completed.includes(0),'champion unlocks original world #1');
   assert.ok(win.stars.includes('2-star-2'),'other world progress preserved');
   assert.ok(win.secrets.includes('1-secret-0'),'secret collectibles preserved');
   assert.equal(win.outfit,'neon','earned kit is shared with original Adventure');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#neon-stage canvas')?.width>100,null,{timeout:15000});
   assert.match(await page.locator('#neon-mission').textContent(),/CHAMPION/);
   assert.deepEqual(errors,[],'no uncaught browser errors');
   console.log(engine.name()+' '+viewport.width+'x'+viewport.height+' Neon City PASS');
  }finally{await page.close()}
 }finally{await browser.close()}
}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{for(const engine of [chromium,webkit])await run(engine,{width:390,height:844});
     await run(chromium,{width:320,height:568});}
 finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
