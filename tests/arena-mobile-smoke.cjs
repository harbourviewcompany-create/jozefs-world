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
     // Match entry offers an intentional walkout intro on the first visit.
     // Complete or skip it before interacting with the controls behind it.
     if(await page.locator('#walkout').isVisible()) await page.locator('#walkout-skip').click();
     const result=await page.evaluate(()=>{
      const section=document.querySelector('#arena.section.active');
      const game=document.querySelector('#arena .arena-game');
      const ids=['arena-start','arena-canvas','arena-pass','arena-shoot','arena-settings-toggle','arena-skill'];
      const elements=Object.fromEntries(ids.map(id=>{
       const e=document.getElementById(id),r=e?.getBoundingClientRect();
       return [id,{found:!!e,visible:!!r&&r.width>=(id==='arena-settings-toggle'?27:35)&&r.height>=20,box:r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right}:null}];
      }));
      const gameRect=game.getBoundingClientRect(),sectionRect=section.getBoundingClientRect();
      return {active:!!section,gameBottom:gameRect.bottom,gameTop:gameRect.top,gameHeight:gameRect.height,
        sectionBottom:sectionRect.bottom,sectionTop:sectionRect.top,screenHeight:innerHeight,
        viewportWidth:innerWidth,visualHeight:window.visualViewport?.height,
        pitchTouchAction:getComputedStyle(document.getElementById('arena-canvas')).touchAction,
        bodyScrollHeight:document.body.scrollHeight,elements,scroll:section.scrollHeight-section.clientHeight};
     });
     console.log('Arena viewport metrics',engine.name(),JSON.stringify(viewport),JSON.stringify({...result,elements:undefined}));
     assert.equal(result.active,true,'Arena should be visible');
     assert.ok(result.gameBottom<=result.screenHeight+2,'Arena bottom fits visible viewport '+JSON.stringify(viewport)+'; actual '+JSON.stringify({gameBottom:result.gameBottom,screenHeight:result.screenHeight,gameTop:result.gameTop,sectionBottom:result.sectionBottom}));
     for(const [id,data] of Object.entries(result.elements))
       assert.ok(data.found&&data.visible,id+' should be visible at '+JSON.stringify(viewport));
     assert.ok(result.scroll<=2,'game view must not vertically overflow');
     assert.equal(result.pitchTouchAction,'none','Touch pitch must not trigger browser panning');
     await page.locator('#arena-start').click();
     await page.waitForTimeout(60);
     if(engine===chromium&&viewport.width===390){
      const pitch=await page.locator('#arena-canvas').boundingBox();
      assert.ok(pitch&&pitch.height>120,'Playable pitch must have a touch target');
      await page.mouse.move(pitch.x+pitch.width/2,pitch.y+pitch.height*.85);
      await page.mouse.down();
      await page.mouse.move(pitch.x+pitch.width/2,pitch.y+pitch.height*.3,{steps:5});
      await page.waitForTimeout(200);
      await page.mouse.up();
      assert.ok((await page.evaluate(()=>window.JozefArena.getProgress().playerY))<485,
       'Drag on the pitch must move Jozef toward the finger');
     }
     let game=await page.evaluate(()=>window.JozefArena?.getProgress?.());
     assert.equal(game?.mode,'playing','Kickoff must start');
     const shotQuality=await page.locator('#arena-shot-quality').textContent();
     assert.match(shotQuality,/^\d+%$/,'Aiming HUD must show the shot-on-target estimate');
     assert.ok(game.shotChance<.12,'Shooting from kickoff must be low probability');
     await page.locator('#arena-shoot').click();
     game=await page.evaluate(()=>window.JozefArena?.getProgress?.());
     assert.ok(game.shots>=1,'Shoot button must fire shot');
     await page.locator('#arena-settings-toggle').click();
     assert.equal(await page.locator('#arena-settings').isVisible(),true,'Settings opens');
     await page.locator('#arena-difficulty').selectOption('legend');
     assert.equal(await page.inputValue('#arena-difficulty'),'legend','Difficulty selects');
     await page.locator('#arena-control-mode').selectOption('joystick');
     await page.locator('#arena-handedness').selectOption('flipped');
     await page.locator('#arena-settings-close').click();
     assert.equal(await page.locator('#arena .arena-controller').evaluate(el=>el.classList.contains('swap-controls')),true,'Handedness changes button order');
     assert.equal(await page.locator('#arena-joystick').isVisible(),true,'Joystick is visible in joystick mode');
     await page.locator('#arena-start').click();
     assert.equal((await page.evaluate(()=>window.JozefArena.getProgress())).mode,'playing','Resume after settings');
     const before=await page.evaluate(()=>window.JozefArena.getProgress().playerY);
     const box=await page.locator('#arena-joystick').boundingBox();
     assert.ok(box&&box.width>=55,'Joystick touch area visible');
     await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
     await page.mouse.down();
     await page.mouse.move(box.x+box.width/2,box.y+box.height/2-20,{steps:4});
     await page.waitForTimeout(200);
     await page.mouse.up();
     const after=await page.evaluate(()=>window.JozefArena.getProgress().playerY);
     assert.ok(after<before-1,'Virtual joystick must actually move Jozef');
     await page.locator('#arena-start').click();
     assert.equal((await page.evaluate(()=>window.JozefArena.getProgress())).mode,'paused','Pause button stops game');
     await page.locator('#arena-start').click();
     assert.equal((await page.evaluate(()=>window.JozefArena.getProgress())).mode,'playing','Resume button restarts game');
     await page.close();
     console.log(engine.name(),viewport.width+'x'+viewport.height,'PASS');tested++;
     if(errors.length)throw new Error('Browser script errors: '+errors.join('; '));
    }
   }finally{await browser.close();}
  }
 }finally{await close();}
 console.log('Arena mobile browser smoke: '+tested+' viewport/browser combinations passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
