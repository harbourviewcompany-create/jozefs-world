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
 await context.route(url=>url.pathname.endsWith('/versus.js'),r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'versus.js'),'utf8').replace('syncUI();draw();requestAnimationFrame(frame);','window.__versusTest={state,room,step,targets,onData,camera:()=>({portrait,cameraFlipped})};syncUI();draw();requestAnimationFrame(frame);')}));
 const host=await context.newPage(),guest=await context.newPage();clients.add(host);clients.add(guest);const errors=[];for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
 await host.goto(url+'#versus');await guest.goto(url+'#versus');
 await host.locator('#versus-open').click();await host.waitForFunction(()=>document.querySelector('#versus-room-code').textContent.length===6);
 const code=await host.locator('#versus-room-code').textContent();await guest.locator('#versus-code').fill(code);await guest.locator('#versus-join').click();
 await host.waitForFunction(()=>!document.querySelector('#versus-approval').hidden,{},{timeout:7000});
 assert.equal(await host.locator('#versus-ready').isDisabled(),true,'unauthorized guest cannot ready the match');
 await host.locator('#versus-approve').click();
 await guest.waitForFunction(()=>!document.querySelector('#versus-ready').disabled,undefined,{timeout:20000}).catch(async err=>{throw Error('Versus join timeout: host='+await host.locator('#versus-status').textContent()+' guest='+await guest.locator('#versus-status').textContent()+'; '+err.message);});
 assert.match(await guest.locator('#versus-status').textContent(),/Connected as Jozef|You are Jozef/);
 assert.equal(await guest.inputValue('#versus-who'),'Jozef','joining guest retains the assigned opposite player');
 // In portrait Jozef attacks upward; on landscape both see the same wide pitch.
 await host.waitForFunction(()=>document.querySelector('#versus-canvas').width>0);
 const hostCamera=await host.evaluate(()=>window.__versusTest.camera());
 const guestCamera=await guest.evaluate(()=>window.__versusTest.camera());
 assert.equal(hostCamera.cameraFlipped,false,'Dad sees his attacking side from the lower pitch');
 assert.equal(guestCamera.cameraFlipped,viewport.height>viewport.width,'Jozef camera places Jozef at the lower attacking end');

 await host.locator('#versus-ready').click();assert.equal(await host.locator('#versus-clock').textContent(),'2:00');
 await guest.locator('#versus-ready').click();await host.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 for(const p of [host,guest]){
 const box=await p.locator('#versus-kick').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height,'shoot within viewport');const stick=await p.locator('#versus-stick').boundingBox();assert.ok(stick.y>=0&&stick.y+stick.height<=viewport.height,'stick within viewport');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow');
 const dims=await p.locator('#versus-canvas').evaluate(c=>({width:c.width,height:c.height}));assert.equal(dims.width>dims.height,viewport.width>viewport.height,'stadium camera follows orientation rather than viewport width');
 }
 await host.locator('#versus-canvas').focus();await host.keyboard.down('ArrowLeft');await host.waitForTimeout(200);await host.keyboard.up('ArrowLeft');await host.keyboard.press('Space');
 if(process.env.VERSUS_SCREENSHOTS)await host.screenshot({path:path.join(process.env.VERSUS_SCREENSHOTS,engine+'-'+viewport.width+'.png')});
 await host.evaluate(()=>{const t=window.__versusTest;t.onData({type:'active',active:false});const before=t.state.matchLeft;t.step();if(t.state.matchLeft!==before)throw Error('paused clock advanced');t.onData({type:'active',active:true});});
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
 await guest.locator('#versus-again').click();await host.waitForFunction(()=>!document.querySelector('#versus-ready').disabled);
 await host.locator('#versus-ready').click();await guest.locator('#versus-ready').click();await host.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 await host.locator('#versus-leave').click({timeout:7000});await guest.waitForFunction(()=>document.querySelector('#versus-status').textContent.includes('disconnected'));
 await guest.locator('#versus-cpu-difficulty').selectOption('legend');
 await guest.locator('#versus-practice-length').selectOption('60');
 await guest.locator('#versus-practice').click();await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 assert.ok(await guest.evaluate(()=>window.__versusTest.state.matchLeft<=60&&window.__versusTest.state.matchLeft>55),'Quick practice starts with a one-minute clock');
 await guest.evaluate(()=>{window.__versusTest.state.score.dad=1;window.__versusTest.state.matchLeft=.02;});
 await guest.waitForFunction(()=>!document.querySelector('#versus-again').hidden);
 const solo=await guest.evaluate(()=>JSON.parse(localStorage.getItem('jozefs-world-versus-v1')));
 assert.equal(solo.played,1,'one full-time Solo Challenge equals one local record');
 assert.match(await guest.locator('#versus-practice-record').textContent(),/1 PLAYED/);
 await guest.locator('#versus-leave').click();
 // Real two-device Same Team has both players in the room and a third AI opponent.
 await host.locator('#versus-together').click();
 await host.waitForFunction(()=>document.querySelector('#versus-room-code').textContent.length===6);
 const teamCode=await host.locator('#versus-room-code').textContent();
 await guest.locator('#versus-code').fill(teamCode);await guest.locator('#versus-join').click();
 await host.waitForFunction(()=>!document.querySelector('#versus-approval').hidden,undefined,{timeout:7000});
 await host.locator('#versus-approve').click();
 await guest.waitForFunction(()=>!document.querySelector('#versus-ready').disabled,undefined,{timeout:20000});
 assert.equal(await guest.evaluate(()=>window.__versusTest.room.together),true,'joined mode is cooperative');
 assert.equal(await guest.locator('.vs-team-jozef .vs-team-name').innerText().then(s=>s.includes('DAD + JO')),true,'co-op scoreboard names the team');
 if(viewport.height>viewport.width){
   assert.equal(await host.evaluate(()=>window.__versusTest.camera().cameraFlipped),true,'co-op team attacks toward top goal');
   assert.equal(await guest.evaluate(()=>window.__versusTest.camera().cameraFlipped),true,'both teammates attack toward top goal');
 }

 await host.locator('#versus-ready').click();await guest.locator('#versus-ready').click();
 await host.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
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
