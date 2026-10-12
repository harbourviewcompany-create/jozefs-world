/* Real-browser regression: complete shared cup on iPhone-size screens. */
'use strict';
const {chromium,webkit}=require('../prime/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const u=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.resolve(root,'.'+u,u.endsWith('/')?'index.html':'');
 if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':path.extname(f)==='.html'?'text/html':'text/javascript'});res.end(e?'not found':b)});
});
async function travel(page,to){
 const answer=await page.evaluate(at=>{
  const g=window.JozefBlock,r=g.path(at);if(!r)return {error:'no route',at};
  for(const [x,y] of r){const s=g.progress(),p=s.pos[s.active];if(!g.move(x-p[0],y-p[1]))return {error:'blocked',at:[x,y]}}
  return {ok:true};
 },to);assert.ok(answer.ok,JSON.stringify(answer));
}
async function play(engine,width,height){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/block-quest.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.JozefBlock&&document.querySelector('canvas')?.width>100,null,{timeout:15000});
   const boxes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,
    buttons:[...document.querySelectorAll('.controls button')].map(b=>b.getBoundingClientRect().toJSON())}));
   assert.ok(boxes.scroll<=width+1,'no horizontal overflow: '+JSON.stringify(boxes));
   for(const b of boxes.buttons)assert.ok(b.left>=-1&&b.right<=width+1&&b.width>=43&&b.height>=43,'thumb controls visible: '+JSON.stringify(b));
   const initial=await page.evaluate(()=>window.JozefBlock.view());
   await page.keyboard.press('Equal');
   const enlarged=await page.evaluate(()=>window.JozefBlock.view());
   assert.ok(enlarged.zoom>initial.zoom,'keyboard zoom enlarges the 3D game camera');
   await page.keyboard.press('Minus');
   await page.locator('#rotate').click();
   assert.equal(await page.evaluate(()=>window.JozefBlock.view().rotation),(initial.rotation+1)%4);
   await page.locator('#guide').click();
   await page.waitForFunction(()=>window.JozefBlock.progress().wood.length>=1,null,{timeout:6000});
   for(const at of [[2,2],[3,7],[4,5]])await travel(page,at);
   await page.locator('#act').click();assert.equal(await page.evaluate(()=>window.JozefBlock.progress().bridge),true);
   for(const at of [[3,3],[7,2],[8,7],[8,5]])await travel(page,at);
   await page.locator('#swap').click();await travel(page,[7,5]);await page.locator('#act').click();
   assert.equal(await page.evaluate(()=>window.JozefBlock.progress().won),true);
   assert.equal(await page.locator('#victory').isVisible(),true);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-player-v1')).blockCup),true);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.JozefBlock,null,{timeout:15000});
   assert.equal(await page.evaluate(()=>window.JozefBlock.progress().won),true,'cup restored');
   assert.deepEqual(errors,[],'browser script errors');
   console.log(engine.name()+' '+width+'x'+height+' Block World PASS');
  }finally{await page.close()}
 }finally{await browser.close()}
}
(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));try{
 await play(chromium,390,844);await play(webkit,390,844);await play(chromium,320,568);
}finally{await new Promise(ok=>server.close(ok))}})().catch(e=>{console.error(e);process.exitCode=1});
