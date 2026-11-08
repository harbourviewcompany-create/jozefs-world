/* Browser-level startup gate: the 2D world must render real terrain on mobile WebKit. */
'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.txt':'text/plain','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  let decoded;
  try{decoded=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(root,'.'+decoded+(decoded.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,bytes)=>{
    res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(err?'not found':bytes);
  });
});
const painted=()=>{
  const canvas=document.getElementById('game');
  if(!canvas||canvas.width<100||canvas.height<100)return false;
  const ctx=canvas.getContext('2d');
  if(!ctx)return false;
  const seen=new Set();
  try{
    for(let y=1;y<=5;y++)for(let x=1;x<=5;x++){
      const px=Math.min(canvas.width-1,Math.floor(canvas.width*x/6));
      const py=Math.min(canvas.height-1,Math.floor(canvas.height*y/6));
      const d=ctx.getImageData(px,py,1,1).data;
      if(d[3])seen.add(d[0]+','+d[1]+','+d[2]);
    }
  }catch{return false;}
  return seen.size>=2;
};
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port+'/block-world.html';
  let cases=0;
  try{
    for(const name of (process.env.JW2D_BROWSERS||'webkit,chromium').split(',')){
      const browser=await ({webkit,chromium})[name].launch({headless:true});
      try{
        for(const viewport of [{width:390,height:844},{width:320,height:568}]){
          const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
          const page=await context.newPage();
          const errors=[];
          page.on('pageerror',error=>errors.push(error.message));
          await page.addInitScript(()=>{
            localStorage.setItem('jw2d-family-role-v4','Daddy');
            localStorage.setItem('jw-player-role','daddy');
          });
          try{
            await page.goto(base,{waitUntil:'domcontentloaded',timeout:40000});
            await page.waitForFunction(()=>Boolean(window.BlockWorld2D)&&
              document.getElementById('game')?.width>100,null,{timeout:40000});
            await page.waitForFunction(painted,null,{timeout:25000});
            assert.equal(await page.locator('#jw2d-startup-error').count(),0,'no startup error overlay');
            const jump=await page.locator('#btn-jump').boundingBox();
            const pad=await page.locator('#movement-pad').boundingBox();
            assert.ok(jump&&jump.width>35&&pad&&pad.width>35,'mobile controls remain usable');
            const layout=await page.evaluate(()=>({body:document.documentElement.scrollWidth,width:innerWidth}));
            assert.ok(layout.body<=layout.width+2,'no horizontal overflow');
            cases++;
            process.stdout.write('2D mobile world rendered: '+name+' '+viewport.width+'x'+viewport.height+'\n');
          }catch(err){
            const state=await page.evaluate(()=>({
              health:document.getElementById('health')?.textContent,
              error:window.__jw2dLoadFailure,
              api:typeof window.BlockWorld2D,
              canvas:[document.getElementById('game')?.width,document.getElementById('game')?.height]
            })).catch(()=>({}));
            throw new Error(name+' '+viewport.width+'x'+viewport.height+': '+err.message+
              '; state='+JSON.stringify(state)+'; pageErrors='+JSON.stringify(errors.slice(0,5)));
          }finally{await context.close();}
        }
      }finally{await browser.close();}
    }
    assert.ok(cases>=2,'at least two real browser viewport checks executed');
  }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
