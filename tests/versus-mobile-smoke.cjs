'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root)){res.writeHead(403).end();return;}const file=p===root?path.join(root,'index.html'):p;fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);});});
// Test transport exercises two independent browser pages without depending on a public signaling server.
const transport=`(()=>{const post=m=>window.__versusBus(m);const peers=new Map();class Events{constructor(){this.events={};}on(k,f){(this.events[k]??=[]).push(f);return this;}emit(k,v){for(const f of this.events[k]||[])f(v);}}class Conn extends Events{constructor(owner,remote){super();this.owner=owner;this.peer=remote;this.open=false;}send(data){post({type:'data',from:this.owner.id,to:this.peer,data});}close(){this.open=false;post({type:'close',from:this.owner.id,to:this.peer});this.emit('close');}}class Peer extends Events{constructor(id){super();this.id=id||crypto.randomUUID();this.connections=new Map();peers.set(this.id,this);setTimeout(()=>this.emit('open',this.id),10);}connect(id){const c=new Conn(this,id);this.connections.set(id,c);post({type:'connect',from:this.id,to:id});return c;}destroy(){peers.delete(this.id);}}window.__versusBusReceive=(m)=>{const p=peers.get(m.to);if(!p)return;if(m.type==='connect'){const c=new Conn(p,m.from);p.connections.set(m.from,c);p.emit('connection',c);c.open=true;c.emit('open');post({type:'accept',from:p.id,to:m.from});}else{const c=p.connections.get(m.from);if(!c)return;if(m.type==='accept'){c.open=true;c.emit('open');}if(m.type==='data')c.emit('data',m.data);if(m.type==='close'){c.open=false;c.emit('close');}}};window.Peer=Peer;})();`;
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';try{
for(const engine of (process.env.VERSUS_BROWSERS||'chromium,webkit').split(',')){
 const browser=await ({chromium,webkit})[engine].launch();
 try{
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
 const context=await browser.newContext({viewport,reducedMotion:'reduce',serviceWorkers:'block'});
 const clients=new Set();
 if(!process.env.VERSUS_LIVE){
  // Relay events across actual browser pages, not WebKit's occasionally delayed BroadcastChannel.
  await context.exposeBinding('__versusBus',({page},message)=>
   Promise.all([...clients].filter(other=>other!==page&&!other.isClosed()).map(other=>
    other.evaluate(msg=>window.__versusBusReceive?.(msg),message).catch(()=>{}))));
  await context.route(url=>url.pathname.endsWith('/peerjs.min.js'),r=>r.fulfill({contentType:'text/javascript',body:transport}));
 }
 await context.route(url=>url.pathname.endsWith('/versus.js'),r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'versus.js'),'utf8').replace('syncUI();draw();requestAnimationFrame(frame);','window.__versusTest={state,room,step,targets,onData,camera:()=>({portrait,cameraFlipped,screenScale,screenY})};syncUI();draw();requestAnimationFrame(frame);')}));
 const host=await context.newPage(),guest=await context.newPage();clients.add(host);clients.add(guest);const errors=[];for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
 await host.goto(url+'#versus');await guest.goto(url+'#versus');
 await guest.locator('#versus-tutorial-open').click();
 assert.equal(await guest.locator('#versus-tutorial-title').textContent(),'MOVE');
 await guest.locator('#versus-tutorial-next').click();
 assert.equal(await guest.locator('#versus-tutorial-title').textContent(),'DEFEND');
 await guest.locator('#versus-tutorial-close').click();
 assert.equal(await guest.locator('#versus-tutorial-panel').isVisible(),false);
 await host.locator('#versus-open').click();await host.waitForFunction(()=>document.querySelector('#versus-room-code').textContent.length===6);
 const code=await host.locator('#versus-room-code').textContent();await guest.locator('#versus-code').fill(code);await guest.locator('#versus-join').click();
 await host.waitForFunction(()=>!document.querySelector('#versus-approval').hidden,{},{timeout:7000});
 assert.equal(await host.locator('#versus-ready').isDisabled(),true,'unauthorized guest cannot ready the match');
 await host.locator('#versus-approve').click();
 await guest.waitForFunction(()=>!document.querySelector('#versus-ready').disabled,undefined,{timeout:20000}).catch(async err=>{throw Error('Versus join timeout: host='+await host.locator('#versus-status').textContent()+' guest='+await guest.locator('#versus-status').textContent()+'; '+err.message);});
 assert.match(await guest.locator('#versus-status').textContent(),/Connected as Jozef|You are Jozef/);
 assert.equal(await guest.inputValue('#versus-who'),'Jozef','joining guest retains the assigned opposite player');
 // Joining updates the local camera on the next animation frame, not synchronously.
 await host.waitForFunction(()=>window.__versusTest.camera().portrait=== (innerHeight>innerWidth));
 await guest.waitForFunction(expected=>window.__versusTest.camera().cameraFlipped===expected,
   viewport.height>viewport.width,{timeout:3500});
 const hostCamera=await host.evaluate(()=>window.__versusTest.camera());
 const guestCamera=await guest.evaluate(()=>window.__versusTest.camera());
 assert.equal(hostCamera.cameraFlipped,false,'Dad sees his attacking side from the lower pitch');
 assert.equal(guestCamera.cameraFlipped,viewport.height>viewport.width,'Jozef camera places Jozef at the lower attacking end');

 await host.locator('#versus-ready').click();assert.equal(await host.locator('#versus-clock').textContent(),'2:00');
 await guest.locator('#versus-ready').click();await host.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);

 if(viewport.height>viewport.width){
   for(const page of [host,guest]){
     const framing=()=> {
       const camera=window.__versusTest.camera();
       const state=window.__versusTest.state;
       const who=window.__versusTest.room.who;
       const canvas=document.querySelector('#versus-canvas').getBoundingClientRect();
       const board=document.querySelector('.versus-scoreboard').getBoundingClientRect();
       const controls=document.querySelector('.versus-play').getBoundingClientRect();
       const worldX=x=>camera.cameraFlipped?720-x:x;
       const actor=who==='Dad'?state.dad:state.jozef;
       return {pitchWidth:420*camera.screenScale,screenWidth:canvas.width,
         playerY:canvas.top+camera.screenY+worldX(actor.x)*camera.screenScale,
         ballY:canvas.top+camera.screenY+worldX(state.ball.x)*camera.screenScale,
         boardBottom:board.bottom,controlsTop:controls.top,phase:window.__versusTest.room.phase};
     };
     // Capture the visible pitch before assertions, including on a failing run.
     if(process.env.VERSUS_SCREENSHOTS)await page.screenshot({path:path.join(process.env.VERSUS_SCREENSHOTS,
       engine+'-'+viewport.width+'-'+(page===host?'dad':'jozef')+'-framing.png')});
     await page.waitForFunction(()=>{
       const camera=window.__versusTest.camera(),state=window.__versusTest.state;
       const me=window.__versusTest.room.who==='Dad'?state.dad:state.jozef;
       const actorX=camera.cameraFlipped?720-me.x:me.x;
       const canvas=document.querySelector('#versus-canvas').getBoundingClientRect();
       const controls=document.querySelector('.versus-play').getBoundingClientRect();
       return window.__versusTest.room.phase==='playing'&&
         Math.abs(420*camera.screenScale-canvas.width)<2&&
         canvas.top+camera.screenY+actorX*camera.screenScale<controls.top-16;
     },undefined,{timeout:5000}).catch(async err=>{
       const frame=await page.evaluate(()=>{
         const camera=window.__versusTest.camera(),state=window.__versusTest.state;
         const me=window.__versusTest.room.who==='Dad'?state.dad:state.jozef;
         const rect=el=>{const r=document.querySelector(el).getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
         return {camera,phase:window.__versusTest.room.phase,player:me,ball:state.ball,
           canvas:rect('#versus-canvas'),controls:rect('.versus-play'),scoreboard:rect('.versus-scoreboard'),
           viewport:{width:innerWidth,height:innerHeight}};
       });
       throw Error('Versus camera could not maintain visible player: '+JSON.stringify(frame)+'; '+err.message);
     });
     const frame=await page.evaluate(framing);
     assert.ok(Math.abs(frame.pitchWidth-frame.screenWidth)<2,
       'pitch should fill mobile width without stretching: '+JSON.stringify(frame));
     assert.ok(frame.playerY>frame.boardBottom+4,
       'active player must not hide under match HUD: '+JSON.stringify(frame));
     assert.ok(frame.playerY<frame.controlsTop-16,
       'active player must stay above thumb controls: '+JSON.stringify(frame));
     assert.ok(frame.ballY>frame.boardBottom-28&&frame.ballY<frame.controlsTop+16,
       'ball stays near the unobstructed play area: '+JSON.stringify(frame));
   }
 }

 for(const p of [host,guest]){
 const box=await p.locator('#versus-kick').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height,'shoot within viewport');const stick=await p.locator('#versus-stick').boundingBox();assert.ok(stick.y>=0&&stick.y+stick.height<=viewport.height,'stick within viewport');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow');
 const dims=await p.locator('#versus-canvas').evaluate(c=>({width:c.width,height:c.height}));assert.equal(dims.width>dims.height,viewport.width>viewport.height,'stadium camera follows orientation rather than viewport width');
 }
 await host.locator('#versus-canvas').focus();await host.keyboard.down('ArrowLeft');await host.waitForTimeout(200);await host.keyboard.up('ArrowLeft');await host.keyboard.press('Space');
 if(process.env.VERSUS_SCREENSHOTS){
   await host.screenshot({path:path.join(process.env.VERSUS_SCREENSHOTS,engine+'-'+viewport.width+'-dad.png')});
   await guest.screenshot({path:path.join(process.env.VERSUS_SCREENSHOTS,engine+'-'+viewport.width+'-jozef.png')});
 }
 await host.evaluate(()=>{const t=window.__versusTest;t.onData({type:'active',active:false});const before=t.state.matchLeft;t.step();if(t.state.matchLeft!==before)throw Error('paused clock advanced');t.onData({type:'active',active:true});});
 // Simulate a broken real-time data channel. Both players must resume the same match.
 const matchBefore=await host.evaluate(()=>window.__versusTest.state.matchId);
 await guest.evaluate(()=>window.__versusTest.room.conn.close());
 await host.waitForFunction(()=>window.__versusTest.room.remoteActive===false,undefined,{timeout:4000});
 const clockWhileOffline=await host.evaluate(()=>window.__versusTest.state.matchLeft);
 await host.waitForTimeout(150);
 assert.equal(await host.evaluate(()=>window.__versusTest.state.matchLeft),clockWhileOffline,'host pauses physics during disconnect');
 await guest.waitForFunction(()=>window.__versusTest.room.remoteActive&&!window.__versusTest.room.reconnecting&&
   window.__versusTest.room.phase==='playing',undefined,{timeout:15000});
 await host.waitForFunction(()=>window.__versusTest.room.remoteActive,undefined,{timeout:5000});
 assert.equal(await host.evaluate(()=>window.__versusTest.state.matchId),matchBefore,'reconnect resumes original match');
 // A guest cannot choose which player to move or inject the host's state.
 await host.evaluate(()=>{const t=window.__versusTest;t.onData({type:'aim',who:'Dad',x:200,y:150});});
 assert.equal(await host.evaluate(()=>window.__versusTest.targets.Dad),null);
 // Remote release clears the authoritative movement target.
 await guest.locator('#versus-stick').dispatchEvent('pointerup');
 await host.evaluate(()=>window.__versusTest.onData({type:'aim',x:null,y:null}));
 assert.equal(await host.evaluate(()=>window.__versusTest.targets.Jozef),null);
 await host.evaluate(()=>{const t=window.__versusTest;t.targets.Dad=null;t.targets.Jozef=null;Object.assign(t.state.dad,{x:400,y:210,vx:0,vy:0});Object.assign(t.state.ball,{x:380,y:210,vx:0,vy:0});t.state.kick='Dad';t.step();t.step();if(t.state.ball.vx>=-5)throw Error('shot was swallowed by dribbling');});
 await host.evaluate(()=>{window.__versusTest.state.matchLeft=.02;});
 await host.waitForFunction(()=>window.__versusTest.state.overtime&&window.__versusTest.state.matchLeft>25);
 await host.waitForFunction(()=>/0:3[0-9]/.test(document.querySelector('#versus-clock')?.textContent||''),undefined,{timeout:5000});
 await host.evaluate(()=>{window.__versusTest.state.matchLeft=.02;});
 await host.waitForFunction(()=>!document.querySelector('#versus-again').hidden);await guest.waitForFunction(()=>!document.querySelector('#versus-again').hidden);
 await host.waitForFunction(()=>document.querySelector('#versus-clock').textContent==='0:00',undefined,{timeout:5000});
 const finalState=await host.evaluate(()=>JSON.parse(JSON.stringify(window.__versusTest.state)));
 // Result saving may wait for another same-origin tab's Web Lock.
 await host.waitForFunction(id=>{
   try{return JSON.parse(localStorage.getItem('jozefs-world-season-match-ids')||'[]').includes(id)}
   catch{return false}
 },finalState.matchId,{timeout:5000});
 await guest.evaluate(state=>{
   const t=window.__versusTest;
   for(let i=0;i<4;i++)t.onData({type:'state',state,phase:'finished',active:true});
 },finalState);
 for(const p of [host,guest]){
   const scores=await p.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-season')||'[]'));
   assert.equal(scores.length,1,'one match only counts once despite repeated finished packets');
    const ids=await p.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-season-match-ids')||'[]'));
    assert.deepEqual(ids,[finalState.matchId],'host and guest share one recorded match ID');
 }
 await guest.locator('#versus-finish-next').click();await host.waitForFunction(()=>!document.querySelector('#versus-ready').disabled);
 await host.locator('#versus-ready').click();await guest.locator('#versus-ready').click();await host.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 await host.locator('#versus-leave').click({timeout:7000});await guest.waitForFunction(()=>document.querySelector('#versus-status').textContent.includes('disconnected'));
 await guest.locator('#versus-leave').click();
 await guest.locator('#versus-cpu-difficulty').selectOption('legend');
 await guest.locator('#versus-practice-length').selectOption('60');
 await guest.locator('#versus-practice').click();await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 assert.ok(await guest.evaluate(()=>window.__versusTest.state.matchLeft<=60&&window.__versusTest.state.matchLeft>55),'Quick practice starts with a one-minute clock');
 assert.ok((await guest.locator('.vs-team-dad .vs-team-name').innerText()).includes('ROVERS'),
   'solo challenger scoreboard identifies the rival');

 await guest.evaluate(()=>{window.__versusTest.state.score.dad=1;window.__versusTest.state.matchLeft=.02;});
 await guest.waitForFunction(()=>!document.querySelector('#versus-again').hidden);
 const solo=await guest.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-versus-v1')));
 assert.equal(solo.played,1,'one full-time Solo Challenge equals one local record');
 assert.match(await guest.locator('#versus-practice-record').textContent(),/1 PLAYED/);
 await guest.locator('#versus-leave').click();
 // The new modes are real match rules, not cosmetic lobby selections.
 await guest.locator('#versus-match-mode').selectOption('first5');
 await guest.locator('#versus-practice').click();
 await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 assert.equal(await guest.evaluate(()=>window.__versusTest.room.mode),'first5');
 assert.ok(await guest.evaluate(()=>window.__versusTest.state.matchLeft>175),'First to Five starts a three-minute match');
 await guest.evaluate(()=>{const t=window.__versusTest;t.state.score.jozef=5;t.state.freeze=0;t.state.matchLeft=40;});
 await guest.waitForFunction(()=>window.__versusTest.room.phase==='finished',{},{timeout:3000});
 await guest.locator('#versus-leave').click();

 await guest.locator('#versus-match-mode').selectOption('golden');
 await guest.locator('#versus-practice').click();
 await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 assert.equal(await guest.evaluate(()=>window.__versusTest.room.mode),'golden');
 await guest.evaluate(()=>{
   const t=window.__versusTest;
   t.state.score.jozef=0;t.state.score.dad=0;t.state.matchLeft=.005;t.state.freeze=0;t.step();
   if(t.room.phase!=='playing'||t.state.matchLeft<29)throw Error('Golden Goal incorrectly ended scoreless');
   t.state.score.jozef=1;
 });
 await guest.waitForFunction(()=>window.__versusTest.room.phase==='finished',{},{timeout:3000});
 await guest.locator('#versus-leave').click();

 await guest.locator('#versus-match-mode').selectOption('penalties');
 await guest.locator('#versus-practice').click();
 await guest.waitForFunction(()=>window.__versusTest.room.phase==='playing');
 assert.equal(await guest.evaluate(()=>window.__versusTest.state.penalty?.active),'Dad');
 await guest.evaluate(()=>{
   const t=window.__versusTest;
   t.state.penalty.frames=539;t.state.penalty.shot=false;t.step();
   if(t.state.penalty.turn!==1)throw Error('Penalty timeout did not award next turn');
   t.state.penalty.pause=1;t.step();
   if(t.state.penalty.active!=='Jozef')throw Error('Penalty rounds did not alternate');
   t.state.keepers.right=160;
   t.state.kick='Jozef';t.step();
   if(!t.state.penalty.shot)throw Error('Human penalty kick was not registered');
   Object.assign(t.state.ball,{x:688,y:210,vx:9,vy:0});
   t.step();
   if(t.state.score.jozef!==1)throw Error('Goal did not count in penalty shootout');
   t.state.score.dad=10;t.state.score.jozef=10;
   t.state.penalty.turn=20;t.state.penalty.pause=0;t.state.penalty.shot=false;
   t.state.penalty.frames=539;t.step();
   if(t.room.phase!=='playing'||t.state.penalty.turn!==21)throw Error('Sudden death ended a tied shootout');

 });
 await guest.locator('#versus-leave').click();

 await guest.locator('#versus-match-mode').selectOption('cup');
 await guest.locator('#versus-practice').click();
 for(const title of ['Rookie Cup','Pro Cup','Legends Final']){
   await guest.waitForFunction(()=>window.__versusTest.room.phase==='playing',{},{timeout:6000});
   assert.equal(await guest.locator('#versus-mode-label').textContent(),title);
   await guest.evaluate(()=>{const t=window.__versusTest;t.state.score.jozef=3;t.state.freeze=0;});
   await guest.waitForFunction(()=>window.__versusTest.room.phase==='finished',{},{timeout:2500});
   if(title!=='Legends Final')await guest.locator('#versus-finish-next').click();
 }
 assert.equal(await guest.evaluate(()=>localStorage.getItem('jozefs-world-versus-cup')),'won','winning three cup rounds awards a persistent trophy');
 assert.equal(await guest.locator('#versus-finish').isVisible(),true,'match report appears after final whistle');
 assert.match(await guest.locator('#versus-finish-title').textContent(),/WIN/);
 await guest.locator('#versus-leave').click();
 await guest.locator('.vs-progress-transfer summary').click();
 await guest.locator('#versus-progress-export').click();
 const transferCode=await guest.inputValue('#versus-progress-code');
 assert.match(transferCode,/"cup":true/);
 await guest.locator('#versus-progress-code').fill(transferCode);
 await guest.locator('#versus-progress-import').click();
 assert.match(await guest.locator('#versus-progress-status').textContent(),/Progress imported/);
 // Real two-device Same Team now faces two host-authoritative Rovers defenders.
 await host.locator('#versus-match-mode').selectOption('duo');
 await host.locator('#versus-together').click();
 await host.waitForFunction(()=>document.querySelector('#versus-room-code').textContent.length===6);
 const teamCode=await host.locator('#versus-room-code').textContent();
 await guest.locator('#versus-code').fill(teamCode);await guest.locator('#versus-join').click();
 await host.waitForFunction(()=>!document.querySelector('#versus-approval').hidden,undefined,{timeout:7000});
 await host.locator('#versus-approve').click();
 await guest.waitForFunction(()=>!document.querySelector('#versus-ready').disabled,undefined,{timeout:20000});
 assert.equal(await guest.evaluate(()=>window.__versusTest.room.together),true,'joined mode is cooperative');
 assert.equal(await host.evaluate(()=>window.__versusTest.room.mode),'duo','host selected the two-defender mode');
 assert.equal(await guest.evaluate(()=>window.__versusTest.room.mode),'duo','guest receives the approved host mode');
 assert.equal(await guest.locator('.vs-team-jozef .vs-team-name').innerText().then(s=>s.includes('DAD + JO')),true,'co-op scoreboard names the team');
 if(viewport.height>viewport.width){
   await host.waitForFunction(()=>window.__versusTest.camera().cameraFlipped,{},{timeout:3500});
   await guest.waitForFunction(()=>window.__versusTest.camera().cameraFlipped,{},{timeout:3500});
 }

 await host.locator('#versus-ready').click();await guest.locator('#versus-ready').click();
 await host.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 assert.ok(await host.evaluate(()=>Number.isFinite(window.__versusTest.state.rival2.x)),'2v2 creates the second rival');
 assert.equal(await host.locator('#versus-pass .vs-action-label').textContent(),'PASS','co-op uses real passing');
 assert.equal(await host.locator('#versus-pass .vs-action-icon').count(),1,'co-op keeps the PASS icon');
 await host.evaluate(()=>{
   const t=window.__versusTest;
   t.targets.Dad=t.targets.Jozef=null;
   Object.assign(t.state.dad,{x:220,y:210,vx:0,vy:0});
   Object.assign(t.state.jozef,{x:400,y:210,vx:0,vy:0});
   Object.assign(t.state.ball,{x:380,y:210,vx:0,vy:0});
   t.onData({type:'kick',mode:'pass',power:1,aim:1});t.step();
   if(t.state.ball.vx>=0)throw Error('coop pass did not target Dad');
   Object.assign(t.state.jozef,{x:400,y:210,vx:0,vy:0});
   Object.assign(t.state.ball,{x:410,y:210,vx:0,vy:0});
   const before=t.state.jozef.x;t.onData({type:'deke'});
   if(t.state.jozef.x<=before)throw Error('host did not execute validated guest deke');
   t.room.otherSpot='keeper';t.onData({type:'keeper',y:160});t.step();
   if(!(t.state.keepers.left<210))throw Error('remote goalkeeper was not controlled by host');
   t.room.otherSpot='forward';
 });
 await host.evaluate(()=>{const t=window.__versusTest;t.state.score.jozef=1;t.state.matchLeft=.02;});
 await host.waitForFunction(()=>!document.querySelector('#versus-again').hidden);
 await guest.waitForFunction(()=>!document.querySelector('#versus-again').hidden);
 assert.equal(await host.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-season')||'[]').length),1,'coop match must not pollute competitive season');
 await host.locator('#versus-leave').click();
 assert.equal(await host.evaluate(()=>window.__versusTest.room.together),false,'leaving clears co-op mode');
 assert.deepEqual(errors,[]);console.log(engine+' '+viewport.width+'x'+viewport.height+' versus PASS');await context.close();
 }
 }finally{await browser.close();}
}
}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
