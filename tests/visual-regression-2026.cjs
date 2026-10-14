/* Screenshot-based reload visual regression on mobile browser engines.
 * Saves real PNG artifacts for before/after inspection. No network services. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.visual-artifacts');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,body)=>{
  res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  res.end(error?'Not found':body);
 });
});
const noMotion='*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';
async function settle(page,scene){
 await page.waitForFunction(()=>!!document.getElementById('jw-family-dock'),null,{timeout:20000});
 if(scene==='versus'){
  await page.evaluate(()=>window.showSection('versus'));
  await page.waitForFunction(()=>document.getElementById('versus')?.classList.contains('active'));
 }else{
  await page.evaluate(()=>window.showSection('home'));
  await page.waitForFunction(()=>!!window.JozefWorldCore);
 }
 await page.addStyleTag({content:noMotion});
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.waitForTimeout(450);
}
async function comparePixels(page,first,second,excluded=null){
 return page.evaluate(async ([a,b,excluded])=>{
  const image=src=>new Promise((resolve,reject)=>{
   const node=new Image();node.onload=()=>resolve(node);node.onerror=reject;node.src='data:image/png;base64,'+src;
  });
  const [left,right]=await Promise.all([image(a),image(b)]);
  if(left.width!==right.width||left.height!==right.height)return {changed:1,width:0,height:0};
  const sample=src=>{const canvas=document.createElement('canvas');canvas.width=src.width;canvas.height=src.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;};
  const x=sample(left),y=sample(right);let mismatched=0,visible=0,measured=0;
  for(let i=0;i<x.length;i+=4){
   const pixel=i/4,px=pixel%left.width,py=Math.floor(pixel/left.width);
   if(Math.max(x[i],x[i+1],x[i+2])>38)visible++;
   // WebGL's time-dependent shading and driver compositing can legitimately
   // differ after reload on WebKit. Keep both full PNGs for visual review,
   // but compare the deterministic HTML/HUD chrome rather than the GPU canvas.
   if(excluded&&px>=excluded.x&&px<=excluded.x+excluded.width&&
     py>=excluded.y&&py<=excluded.y+excluded.height)continue;
   measured++;
   if(Math.abs(x[i]-y[i])>55||Math.abs(x[i+1]-y[i+1])>55||Math.abs(x[i+2]-y[i+2])>55)mismatched++;
  }
  return {changed:mismatched/Math.max(1,measured),visible:visible/(x.length/4),width:left.width,height:left.height};
 },[first.toString('base64'),second.toString('base64'),excluded]);
}
async function check(engine,viewport,scene,url){
 const browser=await engine.launch({args:engine===chromium?['--use-gl=angle','--use-angle=swiftshader']:[]});
 try{
  const context=await browser.newContext({viewport,reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});await settle(page,scene);
  const layout=await page.evaluate(()=>{
   const dock=document.getElementById('jw-family-dock'),bounds=[...dock.querySelectorAll('button')].map(x=>x.getBoundingClientRect().toJSON());
   return {overflow:document.documentElement.scrollWidth-innerWidth,buttons:bounds,hidden:dock.hidden};
  });
  assert.ok(layout.overflow<=2,'unexpected mobile horizontal overflow '+JSON.stringify({scene,viewport,layout}));
  if(scene==='home'){
   assert.equal(layout.hidden,false,'quick play navigation available in HQ');
   assert.equal(layout.buttons.length,5,'all 5 primary destinations reachable');
   for(const b of layout.buttons)assert.ok(b.left>=0&&b.right<=viewport.width+1&&b.height>=43,'thumb targets fit screen');
  }
  const label=(engine===webkit?'webkit':'chromium')+'-'+viewport.width+'x'+viewport.height+'-'+scene;
  const before=await page.screenshot({animations:'disabled'});
  fs.writeFileSync(path.join(out,label+'-before.png'),before);
  await page.reload({waitUntil:'domcontentloaded'});await settle(page,scene);
  const after=await page.screenshot({animations:'disabled'});
  fs.writeFileSync(path.join(out,label+'-after.png'),after);
  const excluded=scene==='home'?await page.locator('#jw-worldcore-canvas').boundingBox():null;
  const diff=await comparePixels(page,before,after,excluded);
  assert.ok(diff.visible>.025,'screenshot renders blank or missing interface '+label);
  assert.ok(diff.changed<.17,'reload visibly changed the scene '+label+' changed='+diff.changed.toFixed(3));
  assert.deepEqual(errors,[],'no browser page exceptions '+label);
  console.log('SCREENSHOT PASS',label,JSON.stringify(diff));
  await context.close();
 }finally{await browser.close();}
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/';
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
   for(const viewport of [{width:320,height:568},{width:390,height:844}]){
    for(const scene of ['home','versus'])await check(engine,viewport,scene,url);
   }
  }
 }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
