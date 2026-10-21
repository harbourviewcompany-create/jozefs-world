#!/usr/bin/env node
/* Browser-based 2D performance sampling. Emulation is NOT physical iPhone certification. */
'use strict';
const {chromium,webkit}=require('../prime/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(err?'not found':data)});
});
const percentile=(values,p)=>values[Math.min(values.length-1,Math.floor((values.length-1)*p))];
async function sample(engine,viewport){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__frames=[];
   const raf=window.requestAnimationFrame.bind(window);
   window.requestAnimationFrame=callback=>raf(t=>{window.__frames.push(t);if(window.__frames.length>5000)window.__frames.shift();callback(t)});
  });
  const start=Date.now();
  await page.goto('http://127.0.0.1:'+server.address().port+'/block-world.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.BlockWorld2D,{timeout:20000});
  await page.waitForTimeout(4500);
  const data=await page.evaluate(()=>{
   const t=window.__frames;
   const deltas=t.slice(1).map((v,i)=>v-t[i]).filter(v=>v>0&&v<1000).sort((a,b)=>a-b);
   return {deltas,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
    heapBytes:performance.memory?.usedJSHeapSize??null,
    canvasCount:document.querySelectorAll('canvas').length};
  });
  assert.ok(data.deltas.length>30,'insufficient animation samples');
  assert.ok(data.canvasCount>0,'game canvas missing');
  assert.deepEqual(errors,[],'browser script exceptions');
  const p50=percentile(data.deltas,.5),p95=percentile(data.deltas,.95);
  const result={engine:engine.name(),viewport,loadMs:Date.now()-start,
   frameSamples:data.deltas.length,medianFrameMs:+p50.toFixed(2),
   p95FrameMs:+p95.toFixed(2),estimatedMedianFps:+(1000/p50).toFixed(1),
   estimatedP95Fps:+(1000/p95).toFixed(1),heapBytes:data.heapBytes,
   horizontalOverflowPx:Math.max(0,data.scrollWidth-data.viewport),errors};
  console.log(JSON.stringify(result));
  await page.close();
  return result;
 }finally{await browser.close()}
}
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 try{
  const results=[];
  for(const engine of [chromium,webkit])for(const viewport of [{width:390,height:844},{width:320,height:568}])
   results.push(await sample(engine,viewport));
  fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(root,'artifacts/block-world-browser-performance.json'),JSON.stringify({kind:'desktop-browser-mobile-emulation',physicalDevice:false,results},null,2));
 }finally{await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exitCode=1});
