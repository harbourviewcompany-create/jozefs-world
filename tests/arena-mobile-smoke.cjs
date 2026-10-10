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
 const port=await listen(),url='http://127.0.0.1:'+port+'/';
 let tested=0;
 try{
  for(const engine of [chromium,webkit]){
   const browser=await engine.launch({headless:true});
   try{
    for(const viewport of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:844,height:390}]){
     const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
     const errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     await page.goto(url,{waitUntil:'domcontentloaded'});
     await page.evaluate(()=>window.showSection('arena'));
     await page.waitForTimeout(150);
     const result=await page.evaluate(()=>{
      const section=document.querySelector('#arena.section.active');
      const game=document.querySelector('#arena .arena-game');
      const ids=['arena-start','arena-canvas','arena-pass','arena-shoot','arena-settings-toggle','arena-skill','arena-joystick'];
      const elements=Object.fromEntries(ids.map(id=>{
       const e=document.getElementById(id),r=e?.getBoundingClientRect();
       return [id,{found:!!e,visible:!!r&&r.width>=40&&r.height>=20,box:r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null}];
      }));
      return {active:!!section,gameBottom:game.getBoundingClientRect().bottom,screenHeight:innerHeight,
        viewportWidth:innerWidth,elements,scroll:section.scrollHeight-section.clientHeight};
     });
     assert.equal(result.active,true,'Arena should be visible');
     assert.ok(result.gameBottom<=viewport.height+2,'Arena bottom fits viewport '+JSON.stringify(viewport));
     for(const [id,data] of Object.entries(result.elements))
       assert.ok(data.found&&data.visible,id+' should be visible at '+JSON.stringify(viewport));
     assert.ok(result.scroll<=2,'game view must not vertically overflow');
     await page.locator('#arena-start').click();
     await page.waitForTimeout(60);
     let game=await page.evaluate(()=>window.JozefArena?.getProgress?.());
     assert.equal(game?.mode,'playing','Kickoff must start');
     await page.locator('#arena-shoot').click();
     game=await page.evaluate(()=>window.JozefArena?.getProgress?.());
     assert.ok(game.shots>=1,'Shoot button must fire shot');
     await page.locator('#arena-settings-toggle').click();
     assert.equal(await page.locator('#arena-settings').isVisible(),true,'Settings opens');
     await page.locator('#arena-difficulty').selectOption('legend');
     assert.equal(await page.inputValue('#arena-difficulty'),'legend','Difficulty selects');
     await page.locator('#arena-settings-close').click();
     await page.close();
     console.log(engine.name(),viewport.width+'x'+viewport.height,'PASS');tested++;
     if(errors.length)throw new Error('Browser script errors: '+errors.join('; '));
    }
   }finally{await browser.close();}
  }
 }finally{await close();}
 console.log('Arena mobile browser smoke: '+tested+' viewport/browser combinations passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
