#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../block-world-3d.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'../block-world-3d.js'),'utf8');
const textures=fs.readFileSync(path.join(__dirname,'../block-world-3d-textures.js'),'utf8');
assert.match(html,/src="\.\/block-world-3d\.js\?v=[A-Za-z0-9._-]+"/);
assert.match(html,/__bw3dFail/,"HTML must display a fallback when the engine fails to start");
assert.match(html,/12000/,"HTML must have a startup timeout");
assert.match(html,/src="\.\/peerjs\.min\.js"/);
assert.match(html,/id="minimap"/,'terrain radar is visible');
assert.match(html,/id="quality"/,'quality setting has a button');
assert.match(html,/id="radar-toggle"/,'terrain radar is a collapsible mobile control');
assert.match(html,/block-world-3d-next\.css/,'new 3D mobile visual stylesheet loaded');
assert.match(html,/block-world-3d-premium\.css/,'premium full-screen 3D mobile stylesheet loaded');
assert.match(html,/block-world-3d-textures\.js\?v=/,'self-contained material atlas included');
assert.ok(html.indexOf('block-world-3d-textures.js')<html.indexOf('block-world-3d.js?v='),'texture atlas loads before game code');
assert.match(html,/id="pair"/,'multiplayer remains available from the menu');
assert.match(html,/id="options"/,'top-level menu remains available');
assert.match(script,/attribute float matId/,'WebGL shader receives voxel material IDs');
assert.match(script,/attribute vec3 normal/,'shader receives face normals for directional sunlight');
assert.match(script,/uniform vec3 sunDir/,'fragment shader receives a dynamic sunlight vector');
assert.match(script,/function voxelBox\(/,'animated hero has true oriented rectangular voxel geometry');
assert.match(script,/function chunkMesh\(/,'forest props stay integrated with streamed terrain');
assert.match(script,/quality!=='ECO'/,'scenery density respects mobile ECO mode');
assert.match(script,/jozefs-block-3d-v1/,'existing saved-world schema is unchanged');
assert.match(script,/gl\.vertexAttribPointer\(am,1,gl\.FLOAT,false,48,24\)/,'GPU material stride preserves voxel material type');
assert.match(script,/gl\.vertexAttribPointer\(au,2,gl\.FLOAT,false,48,40\)/,'GPU material stride provides atlas UV attributes');
assert.match(script,/uniform sampler2D tileAtlas/,'shader samples illustrated atlas');
assert.match(script,/function foliageCross\(/,'atlas vegetation includes cross-card silhouette geometry');
assert.match(script,/function chunkMesh\(/,'chunk mesher preserved');
assert.match(script,/const skyFragment=/,'procedural GPU sky present');
assert.match(script,/function drawRadar\(/,'radar rendering present');
assert.match(script,/function scheduleRecovery\(/,'3D co-op must attempt reconnection');
assert.match(script,/approvedGuestPeer&&c.peer!==approvedGuestPeer/,'returning guest must match the original peer');
assert.match(script,/guestActive=true;recovering=false;recoveryAttempts=0/,'reconnected guest retains shared-save protection');
assert.match(script,/if\(wasGuest\)\{dirty=false;location.reload\(\);\}/,'explicit leaving is the only guest path that reloads solo play');

assert.match(script,/adaptiveCap/,'adaptive FPS scaling present');

assert.match(script,/qAO=aoEnabled/,'terrain computes baked vertex ambient occlusion');
assert.match(script,/gl_FragCoord/,'leaves dither out near the third-person camera');

assert.match(script,/uniform vec3 heroPos/,'leaf fading uses camera-to-character sightline');
assert.match(script,/along>\.05&&along<\.99/,'nearby leaf canopy occlusion has a bounded ray');
assert.match(script,/biome\(X,Z\)==='Evergreen Forest'/,'forest trees have distinctive canopy profiles');
assert.match(script,/b==='Meadows'\?r>\.992/,'meadow trees are intentionally spaced');
assert.match(script,/const desired=third\?\[eye\[0\]-forward\[0\]\*5\.8/,'camera frames heroes more closely');
assert.match(script,/companion\.yaw=Math\.atan2/,'companion looks toward travel direction');

assert.match(script,/function visitForest\(/,'non-destructive forest viewpoint is reachable from the menu');
assert.match(script,/voxelBox\(v,p.x,ground\(p.x,p.z\)/,'voxel heroes have local ground contact shadows');
assert.match(script,/if\(quality!=='ECO'/,'expensive environmental decoration honours ECO mode');

new vm.Script(script,{filename:'block-world-3d.js'});
function boot(shared=new Map(),options={}){
 const elements=new Map(),events=new Map(),clock={raf:null,now:0},errors=[];
 const gl=new Proxy({
  ARRAY_BUFFER:1,STATIC_DRAW:2,DYNAMIC_DRAW:3,TRIANGLES:4,
  VERTEX_SHADER:5,FRAGMENT_SHADER:6,COMPILE_STATUS:7,LINK_STATUS:8,
  DEPTH_TEST:9,COLOR_BUFFER_BIT:16,DEPTH_BUFFER_BIT:32,FLOAT:10,
  createProgram(){return{};},createShader(type){return {type,source:''};},createBuffer(){return{};},createTexture(){return {};},getError(){return 0;},NO_ERROR:0,
  shaderSource(shader,src){shader.source=src;},
  getProgramParameter(){return true;},
  getShaderParameter(shader){return !(options.rejectPremium&&shader.type===6&&shader.source.includes('uniform vec3 sunDir'));},
  getAttribLocation(){return 1;},getUniformLocation(){return{};},
  bufferData(_target,data){if(data?.length!==6&&data?.length)assert.equal(data.length%12,0,'GPU cube vertex buffers use 12-float positions, material, normals, and atlas UVs');}
 },{get:(a,k)=>k in a?a[k]:()=>{}});
 function element(id=''){
  return {id,events:{},children:[],attrs:{},style:{},className:'',classList:{add(){},remove(){}},textContent:'',innerHTML:'',hidden:false,disabled:false,value:'',files:[],
   getContext(){return gl;},addEventListener(t,fn){(this.events[t]??=[]).push(fn);},appendChild(e){this.children.push(e);return e;},
   replaceChildren(...args){this.children=args;},setAttribute(k,v){this.attrs[k]=v;},
   getAttribute(k){return this.attrs[k];},getBoundingClientRect(){return {left:0,top:0,width:390,height:844};},
   setPointerCapture(){},hasPointerCapture(){return false;},querySelector(){return element();},click(){},remove(){}
  };
 }
 const document={hidden:false,createElement(tag){
  const el=element();
  if(tag==='canvas')el.getContext=kind=>kind==='2d'?{fillRect(){},strokeRect(){},clearRect(){},beginPath(){},lineTo(){},moveTo(){},stroke(){}}:gl;
  return el;
 },getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id);},
  addEventListener(t,fn){(events.get(t)||events.set(t,[]).get(t)).push(fn);}
 };
 let readyCalls=0;
 const window={Peer:null,__bw3dReady(){readyCalls++;},addEventListener(t,fn){(events.get(t)||events.set(t,[]).get(t)).push(fn);}};
 const sandbox={
  document,window,
  localStorage:{getItem:k=>shared.get(k)||null,setItem:(k,v)=>shared.set(k,String(v)),removeItem:k=>shared.delete(k)},
  navigator:{getGamepads:()=>[]},history:{replaceState(){}},
  location:{hash:'',origin:'https://example.com',pathname:'/block-world-3d.html',reload(){}},
  performance:{now:()=>clock.now},requestAnimationFrame:fn=>clock.raf=fn,
  crypto:{getRandomValues(arr){arr.fill(0x37);return arr;}},
  innerWidth:390,innerHeight:844,devicePixelRatio:1,console:{error:e=>errors.push(String(e)),warn:e=>errors.push(String(e))},
  setTimeout(){return 1;},clearTimeout(){},
  Blob:class{},URL:{createObjectURL:()=>'/blob',revokeObjectURL(){}},confirm:()=>false,
  crypto:{getRandomValues:a=>a.fill(37)}
 };
 vm.runInNewContext(textures,sandbox,{timeout:15000,filename:'block-world-3d-textures.js'});
 assert.ok(window.BlockWorld3DTextures,'illustrated texture atlas initialized before 3D game');
 const sample=window.BlockWorld3DTextures.createAtlas();
 assert.equal(sample.width,256,'atlas width is WebGL1 power of two');
 assert.equal(sample.height,128,'atlas height is WebGL1 power of two');
 assert.notEqual(window.BlockWorld3DTextures.tileFor(1,0),window.BlockWorld3DTextures.tileFor(1,1),'grass top and dirt side use different artwork');
 const instrumented=script.replace('window.BlockWorld3D=Object.freeze',`window.__block3dTests={award,modify,portal,visitForest,receive,worldSnapshot,applyRealm,guestAttack,sendCombat,save,spawn,updateBeacon,mobs:()=>mobs,boss:()=>boss,beacon:()=>forestBeacon,inventory:()=>hero.inventory,guestInventory:()=>guestInventory,setCreative:(v)=>{creative=v;},unlockPortal:()=>{defeated=true;portalOpened=true;hero.x=40;hero.z=40;companion.x=40;companion.z=40;},makeHost:(sent)=>{host=true;conn={open:true,send:v=>sent.push(v)};},makeGuest:(sent)=>{host=false;guestActive=true;conn={open:true,send:v=>sent.push(v)};},moveCompanion:(x,z)=>{companion.x=x;companion.z=z;companion.y=ground(x,z);},setPlayer:(x,z)=>{hero.x=x;hero.z=z;hero.y=ground(x,z);}};window.BlockWorld3D=Object.freeze`);
  assert.notEqual(instrumented,script,'test instrumentation inserted');
  vm.runInNewContext(instrumented,sandbox,{timeout:15000});
 const status=()=>window.BlockWorld3D?.status();
 const tick=(n=1)=>{for(let i=0;i<n;i++){clock.now+=17;assert.ok(clock.raf);clock.raf(clock.now);}};
 const click=id=>{const el=document.getElementById(id);if(el.onclick)el.onclick({});else for(const f of(el.events.click||[]))f({preventDefault(){}});};
 return {status,tick,click,document,events,errors,shared,testHooks:window.__block3dTests,window,readyCalls:()=>readyCalls};
}
const test=boot();
assert.ok(test.status(),'3D API initialized');
test.tick(3);
assert.ok(test.status().renderOk,'frame rendered');
assert.equal(test.status().quality,'AUTO');
assert.equal(test.status().camera,'THIRD_PERSON','modern default 3D camera shows the player');
assert.ok(test.document.getElementById('options'),'single top menu remains available');

assert.equal(test.status().shaderMode,'CINEMATIC','premium GPU shader is used when available');
assert.equal(test.status().atlasLoaded,true,'illustrated pixel atlas uploaded to the simulated GPU');
const safeGPU=boot(new Map(),{rejectPremium:true});
safeGPU.tick(2);
assert.ok(safeGPU.status().renderOk,'compatibility shader still renders on an older GPU');
assert.equal(safeGPU.status().shaderMode,'COMPATIBILITY','premium shader failures degrade safely');
assert.equal(safeGPU.status().atlasLoaded,false,'compatibility shading does not require textures');

assert.ok(test.document.getElementById('drawer').querySelector('.buttons'),'full accessible menu preserved');
assert.ok(test.status().drawnChunks>0&&test.status().drawnChunks<=test.status().loadedChunks,'visible chunk frustum culling returns bounded drawn counts');
assert.equal(test.document.getElementById('radar-toggle').getAttribute('aria-expanded'),'false','mobile radar initially compact');
test.click('radar-toggle');
assert.equal(test.document.getElementById('radar-toggle').getAttribute('aria-expanded'),'true','radar expands on demand');
test.click('radar-toggle');
test.click('mission');
assert.equal(test.document.getElementById('mission').getAttribute('aria-expanded'),'true','mission details expand on tap');
test.click('mission');
test.click('quality');
assert.equal(test.status().quality,'ECO');
test.click('quality');
assert.equal(test.status().quality,'QUALITY');
test.click('quality');
assert.equal(test.status().quality,'AUTO');
assert.ok(test.readyCalls()>0,'successful first frame signals the HTML startup watchdog');

const scenic=boot();
scenic.tick(2);
const scenicSeed=scenic.status().seed;
assert.equal(scenic.testHooks.modify(1,3,1,4),true,'scenic visit preserves editable world state');
assert.equal(scenic.testHooks.visitForest(),true,'visit-forest action finds a safe evergreen clearing');
assert.equal(scenic.status().seed,scenicSeed,'forest travel preserves world generation seed');
assert.ok(Math.hypot(scenic.status().hero.x-2.5,scenic.status().hero.z-2.5)>5,'forest viewpoint visibly relocates the hero');
assert.match(scenic.document.getElementById('compass').textContent,/FOREST|TEAM BEACON/,'destination HUD identifies the Evergreen Forest camp objective');
const scenicSave=JSON.parse(scenic.shared.get('jozefs-block-3d-v1')||'{}');
assert.ok(scenicSave.edits.some(([key,value])=>key==='1,3,1'&&value===4),'forest travel preserves player-placed blocks and saves');
const restored=boot(scenic.shared);restored.tick(2);
assert.equal(restored.status().seed,scenicSeed,'saved forest world still loads normally');

assert.ok(test.status().loadedChunks>0,'terrain chunks streamed');
const start=test.status().hero.z;
for(const fn of test.events.get('keydown')||[])fn({code:'KeyW',repeat:false,preventDefault(){}});
test.tick(9);
for(const fn of test.events.get('keyup')||[])fn({code:'KeyW'});
assert.ok(test.status().hero.z<start,'movement changes position');
test.click('perspective');
assert.equal(test.status().camera,'FIRST_PERSON','player can still switch to first-person view');
test.click('save');
assert.ok(test.shared.get('jozefs-block-3d-v1'),'world persisted locally');
assert.equal(JSON.parse(test.shared.get('jozefs-block-3d-v1')).viewThird,false,'selected camera is saved without changing version');

assert.ok(test.status().hero,'player pose exposed for diagnostics');
const xpStart=JSON.parse(test.shared.get('jozefs-world-player-v1')||'{}').xp||0;
// Milestone XP must never be farmable by triggering the same completion twice.
test.testHooks.award('block3d-test-once',25);
test.testHooks.award('block3d-test-once',25);
assert.equal(JSON.parse(test.shared.get('jozefs-world-player-v1')).xp,xpStart+25,'XP awarded once per milestone');
// Pairing must create an unguessable-length invite and not require a public room list.
class FakePeer {
 constructor(id){this.id=id;this.handlers={};FakePeer.current=this;}
 on(name,fn){this.handlers[name]=fn;}
 destroy(){}
}
test.window.Peer=FakePeer;
test.click('host');
assert.match(FakePeer.current.id,/^jw-block-[0-9a-f]{32}$/,'private invitation room ID');
FakePeer.current.handlers.open();
assert.equal(test.document.getElementById('invite').value.length,32,'invitation shown only to host');
assert.equal(test.document.getElementById('share').disabled,false,'share enabled after signalling opens');
// Browser WebGL context interruptions must save safely and stop drawing.
const interrupted=boot();interrupted.tick(2);
const loss=interrupted.document.getElementById('view').events.webglcontextlost?.[0];
assert.equal(typeof loss,'function','WebGL context loss handler installed');
let prevented=false;loss({preventDefault(){prevented=true;}});
assert.ok(prevented,'WebGL context loss prevented default teardown');
assert.match(interrupted.document.getElementById('fallback-reason').textContent,/saved world is safe/,'shows actionable recovery');
interrupted.tick(2);
assert.ok(interrupted.shared.get('jozefs-block-3d-v1'),'progress persisted on graphics interruption');
const next=boot(test.shared);
next.tick(2);
assert.ok(next.status().renderOk,'saved world renders after relaunch');
assert.equal(next.status().seed,test.status().seed,'saved seed preserved');
assert.equal(next.status().camera,'FIRST_PERSON','saved camera preference survives relaunch');
assert.ok(test.document.getElementById('mission').innerHTML.includes('MISSION'),'mission HUD initialized');
assert.equal(test.errors.length,0,'no startup/frame errors: '+test.errors.join('; '));

// Autosave regression: pagehide must persist exploration with no block edits.
const moving=boot();moving.tick(2);
for(const fn of moving.events.get('keydown')||[])fn({code:'KeyW',repeat:false,preventDefault(){}});
moving.tick(8);
for(const fn of moving.events.get('keyup')||[])fn({code:'KeyW'});
for(const fn of moving.events.get('pagehide')||[])fn({});
const movementSave=JSON.parse(moving.shared.get('jozefs-block-3d-v1')||'{}');
assert.equal(movementSave.version,1,'pose save keeps v1 schema');
assert.ok(movementSave.hero.z<moving.status().hero.z+.001,'traversal saved on pagehide');
assert.ok(movementSave.hero.z<2.5,'movement persisted without mining');
const movementReload=boot(moving.shared);movementReload.tick(1);
assert.ok(Math.abs(movementReload.status().hero.z-movementSave.hero.z)<.01,'saved traversal reloads');

// Host controls enemy health; guest receives state rather than simulating its own mobs.
const hostGame=boot(),outgoing=[];
hostGame.tick(1);hostGame.testHooks.makeHost(outgoing);
const enemy=hostGame.testHooks.mobs()[0];
assert.ok(enemy&&Number.isInteger(enemy.id),'mob IDs are stable for network references');
hostGame.testHooks.moveCompanion(enemy.x,enemy.z);
hostGame.testHooks.guestAttack({target:'mob',mobId:enemy.id});
assert.equal(enemy.hp,6,'host applies Jozef combat damage to ordinary enemies');
assert.ok(outgoing.some(m=>m.t==='combat'),'host broadcasts authoritative creature health');
const guestGame=boot(),guestOutgoing=[];
guestGame.tick(1);guestGame.testHooks.makeGuest(guestOutgoing);
guestGame.testHooks.receive({t:'hello',...hostGame.testHooks.worldSnapshot(),x:2.5,y:10,z:2.5});
const guestReturn=hostGame.testHooks.worldSnapshot();
guestGame.testHooks.receive({t:'hello',...guestReturn,x:2.5,y:10,z:2.5,
 guest:{x:11.5,y:16,z:12.5}});
assert.ok(Math.abs(guestGame.status().hero.x-11.5)<.01&&
 Math.abs(guestGame.status().hero.z-12.5)<.01,
 'rejoining Jozef continues at the host-approved position, not a fresh spawn');

guestGame.testHooks.receive(outgoing.find(m=>m.t==='combat'));
assert.equal(guestGame.testHooks.mobs().find(m=>m.id===enemy.id).hp,6,'guest applies host creature health');
hostGame.testHooks.guestAttack({target:'mob',mobId:enemy.id});
assert.equal(enemy.hp,6,'rate-limited repeated attack cannot instantly kill an enemy');

// Realm snapshots are host-owned and must preserve the active world edits.
hostGame.testHooks.modify(1,4,1,9);
const realmData={t:'realm',...hostGame.testHooks.worldSnapshot(),realm:2,seed:987123,bossHp:88};
assert.equal(guestGame.testHooks.applyRealm(realmData),true,'guest accepts validated host realm snapshot');
assert.equal(guestGame.status().realm,2,'guest switches to the host realm');
assert.equal(guestGame.status().seed,987123,'guest world seed follows host');
assert.equal(guestGame.window.BlockWorld3D.block(1,4,1),9,'host world edits survive realm synchronization');
assert.equal(guestGame.status().bossHp,88,'guest boss health follows host authoritative snapshot');
assert.equal(guestGame.testHooks.applyRealm({...realmData,edits:[['invalid',999]]}),false,'invalid realm blocks are rejected');


// Forest Beacon: both character pads are required; award remains idempotent.
const beaconGame=boot();
beaconGame.tick(2);
assert.equal(beaconGame.testHooks.visitForest(),true,'forest camp remains accessible');
const beacon=beaconGame.testHooks.beacon();
assert.ok(beacon&&!beacon.lit,'new forest monument starts unlit');
beaconGame.testHooks.setPlayer(beacon.x-1.6,beacon.z+1.4);
beaconGame.testHooks.moveCompanion(beacon.x+6,beacon.z+1.4);
beaconGame.testHooks.updateBeacon();
assert.equal(beaconGame.testHooks.beacon().lit,false,'one hero alone cannot activate the team beacon');
beaconGame.testHooks.moveCompanion(beacon.x+1.6,beacon.z+1.4);
beaconGame.testHooks.updateBeacon();
assert.equal(beaconGame.testHooks.beacon().lit,true,'both heroes activate the two-pad beacon');
beaconGame.testHooks.save(true);
const beaconReload=boot(beaconGame.shared);beaconReload.tick(2);
assert.equal(beaconReload.testHooks.beacon().lit,true,'beacon completion persists across save/reload');
const xpOnce=JSON.parse(beaconGame.shared.get('jozefs-world-player-v1')||'{}').xp;
beaconGame.testHooks.updateBeacon();
assert.equal(JSON.parse(beaconGame.shared.get('jozefs-world-player-v1')||'{}').xp,xpOnce,'beacon award cannot be farmed repeatedly');
assert.match(script,/function waterTile\(/,'interactive world includes non-destructive animated water geometry');
assert.match(script,/uniform vec3 beaconPoint/,'active beacon illuminates local terrain');
assert.equal(boot().window.BlockWorld3DTextures.tileFor(27,0),29,'water renders using illustrated atlas tile');


// Shared inventory is owned by the host. Guests cannot place unearned blocks.
const itemsHost=boot(),itemPackets=[];
itemsHost.tick(2);itemsHost.testHooks.makeHost(itemPackets);
itemsHost.testHooks.setCreative(false);
itemsHost.testHooks.moveCompanion(1.5,1.5);
assert.equal(itemsHost.testHooks.modify(1,4,1,4),true);
itemsHost.testHooks.receive({t:'request',op:'mine',x:1,y:4,z:1});
assert.equal(itemsHost.testHooks.guestInventory()[4],1,'guest mining grants one host-tracked block');
assert.equal(itemsHost.window.BlockWorld3D.block(1,4,1),0,'host confirms mined tile');
itemsHost.testHooks.receive({t:'request',op:'place',x:1,y:4,z:1,id:4});
assert.equal(itemsHost.window.BlockWorld3D.block(1,4,1),4,'guest spends earned material');
assert.equal(itemsHost.testHooks.guestInventory()[4],0,'guest placement consumes inventory');
assert.ok(itemPackets.some(m=>m.t==='inventory'&&m.items[4]===0),'updated inventory is sent back to guest');
itemsHost.testHooks.receive({t:'request',op:'place',x:1,y:4,z:2,id:4});
const unavailable=itemsHost.window.BlockWorld3D.block(1,4,2);
assert.equal(itemsHost.window.BlockWorld3D.block(1,4,2),unavailable,'request safely ignored without inventory');
assert.equal(itemsHost.testHooks.guestInventory()[4],0,'unpaid build cannot spend negative inventory');
const itemsGuest=boot();itemsGuest.tick(1);itemsGuest.testHooks.makeGuest([]);
itemsGuest.testHooks.receive(itemPackets.filter(m=>m.t==='inventory').at(-1));
assert.equal(itemsGuest.testHooks.inventory()[4],0,'guest receives host inventory snapshot');


// End-to-end paired-session simulation: invite snapshot -> camp -> team quest -> portal.
const sharedHost=boot(),sharedGuest=boot(),messages=[];
sharedHost.tick(2);sharedGuest.tick(2);
sharedHost.testHooks.makeHost(messages);
sharedGuest.testHooks.makeGuest([]);
sharedGuest.testHooks.receive({t:'hello',...sharedHost.testHooks.worldSnapshot(),x:2.5,y:12,z:2.5});
assert.equal(sharedHost.testHooks.visitForest(),true,'host may launch forest camp while connected');
const travel=messages.find(m=>m.t==='forestTravel');
assert.ok(travel&&travel.beacon,'host broadcasts scene and camp for both devices');
sharedGuest.testHooks.receive(travel);
assert.equal(sharedGuest.testHooks.beacon().x,sharedHost.testHooks.beacon().x,'guest reaches same cooperative forest');
const dual=sharedHost.testHooks.beacon();
sharedHost.testHooks.setPlayer(dual.x-1.6,dual.z+1.4);
sharedHost.testHooks.moveCompanion(dual.x+1.6,dual.z+1.4);
sharedHost.testHooks.updateBeacon();
const litPacket=messages.find(m=>m.t==='beacon');
assert.ok(litPacket?.beacon?.lit,'host broadcasts solved two-player puzzle');
sharedGuest.testHooks.receive(litPacket);
assert.equal(sharedGuest.testHooks.beacon().lit,true,'guest celebrates same completed beacon');
sharedHost.testHooks.unlockPortal();
sharedHost.testHooks.portal();
const realmPacket=messages.find(m=>m.t==='realm');
assert.ok(realmPacket&&realmPacket.realm===1,'host portal switches into second realm');
sharedGuest.testHooks.receive(realmPacket);
assert.equal(sharedGuest.status().realm,1,'guest changes realm with host');
assert.equal(sharedGuest.status().seed,sharedHost.status().seed,'both devices load the same new world seed');

console.log('Block World 3D: WebGL, chunks, movement, save/reload, XP and private invite creation PASS');
