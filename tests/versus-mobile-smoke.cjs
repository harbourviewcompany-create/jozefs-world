'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root)){res.writeHead(403).end();return;}const file=p===root?path.join(root,'index.html'):p;fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);});});
// Test transport exercises two independent browser pages without depending on a public signaling server.
const transport=`(()=>{const bus=new BroadcastChannel('versus-test');const peers=new Map();class Events{constructor(){this.events={};}on(k,f){(this.events[k]??=[]).push(f);return this;}emit(k,v){for(const f of this.events[k]||[])f(v);}}class Conn extends Events{constructor(owner,remote){super();this.owner=owner;this.peer=remote;this.open=false;}send(data){bus.postMessage({type:'data',from:this.owner.id,to:this.peer,data});}close(){this.open=false;bus.postMessage({type:'close',from:this.owner.id,to:this.peer});this.emit('close');}}class Peer extends Events{constructor(id){super();this.id=id||crypto.randomUUID();this.connections=new Map();peers.set(this.id,this);setTimeout(()=>this.emit('open',this.id),10);}connect(id){const c=new Conn(this,id);this.connections.set(id,c);bus.postMessage({type:'connect',from:this.id,to:id});return c;}destroy(){peers.delete(this.id);}}bus.onmessage=({data:m})=>{const p=peers.get(m.to);if(!p)return;if(m.type==='connect'){const c=new Conn(p,m.from);p.connections.set(m.from,c);p.emit('connection',c);c.open=true;c.emit('open');bus.postMessage({type:'accept',from:p.id,to:m.from});}else{const c=p.connections.get(m.from);if(!c)return;if(m.type==='accept'){c.open=true;c.emit('open');}if(m.type==='data')c.emit('data',m.data);if(m.type==='close'){c.open=false;c.emit('close');}}};window.Peer=Peer;})();`;
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';try{
for(const engine of (process.env.VERSUS_BROWSERS||'chromium,webkit').split(',')){
 const browser=await ({chromium,webkit})[engine].launch();
 try{
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});if(!process.env.VERSUS_LIVE)await context.route('**/peerjs*',r=>r.fulfill({contentType:'text/javascript',body:transport}));
 await context.route('**/versus.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'versus.js'),'utf8').replace('syncUI();draw();requestAnimationFrame(frame);','window.__versusTest={state,room,step,targets,onData};syncUI();draw();requestAnimationFrame(frame);')}));
 const host=await context.newPage(),guest=await context.newPage();const errors=[];for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
 await host.goto(url+'#versus');await guest.goto(url+'#versus');
 await host.locator('#versus-open').click();await host.waitForFunction(()=>document.querySelector('#versus-room-code').textContent.length===6);
 const code=await host.locator('#versus-room-code').textContent();await guest.locator('#versus-code').fill(code);await guest.locator('#versus-join').click();await guest.waitForFunction(()=>!document.querySelector('#versus-ready').disabled);
 assert.match(await guest.locator('#versus-status').textContent(),/Jozef/);
 await host.locator('#versus-ready').click();assert.equal(await host.locator('#versus-clock').textContent(),'2:00');
 await guest.locator('#versus-ready').click();await host.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 for(const p of [host,guest]){
 const box=await p.locator('#versus-kick').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height,'shoot within viewport');const stick=await p.locator('#versus-stick').boundingBox();assert.ok(stick.y+stick.height<=viewport.height,'stick within viewport');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow');
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
 await host.waitForFunction(()=>!document.querySelector('#versus-again').hidden);await guest.waitForFunction(()=>!document.querySelector('#versus-again').hidden);
 await host.waitForTimeout(150);assert.equal(await host.locator('#versus-clock').textContent(),'0:00');
 await guest.locator('#versus-again').click();await host.waitForFunction(()=>!document.querySelector('#versus-ready').disabled);
 await host.locator('#versus-ready').click();await guest.locator('#versus-ready').click();await host.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);
 await host.locator('#versus-leave').click();await guest.waitForFunction(()=>document.querySelector('#versus-status').textContent.includes('disconnected'));
 await guest.locator('#versus-practice').click();await guest.waitForFunction(()=>!document.querySelector('#versus-kick').disabled);await guest.locator('#versus-leave').click();
 assert.deepEqual(errors,[]);console.log(engine+' '+viewport.width+'x'+viewport.height+' versus PASS');await context.close();
 }
 }finally{await browser.close();}
}
}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
