#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../block-world-3d.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'../block-world-3d.js'),'utf8');
assert.match(html,/src="\.\/block-world-3d\.js\?v=[A-Za-z0-9._-]+"/);
assert.match(html,/__bw3dFail/,"HTML must display a fallback when the engine fails to start");
assert.match(html,/12000/,"HTML must have a startup timeout");
assert.match(html,/src="\.\/peerjs\.min\.js"/);
assert.match(html,/id="minimap"/,'terrain radar is visible');
assert.match(html,/id="quality"/,'quality setting has a button');
assert.match(html,/id="radar-toggle"/,'terrain radar is a collapsible mobile control');
assert.match(html,/block-world-3d-next\.css/,'new 3D mobile visual stylesheet loaded');
assert.match(html,/block-world-3d-premium\.css/,'premium full-screen 3D mobile stylesheet loaded');
assert.match(html,/id="pair"/,'multiplayer remains available from the menu');
assert.match(html,/id="options"/,'top-level menu remains available');
assert.match(script,/attribute float matId/,'WebGL shader receives voxel material IDs');
assert.match(script,/attribute vec3 normal/,'shader receives face normals for directional sunlight');
assert.match(script,/uniform vec3 sunDir/,'fragment shader receives a dynamic sunlight vector');
assert.match(script,/function voxelBox\(/,'animated hero has true oriented rectangular voxel geometry');
assert.match(script,/function chunkMesh\(/,'forest props stay integrated with streamed terrain');
assert.match(script,/quality!=='ECO'/,'scenery density respects mobile ECO mode');
assert.match(script,/jozefs-block-3d-v1/,'existing saved-world schema is unchanged');
assert.match(script,/gl\.vertexAttribPointer\(am,1,gl\.FLOAT,false,40,24\)/,'GPU material stride includes texture type');
assert.match(script,/function chunkMesh\(/,'chunk mesher preserved');
assert.match(script,/const skyFragment=/,'procedural GPU sky present');
assert.match(script,/function drawRadar\(/,'radar rendering present');
assert.match(script,/adaptiveCap/,'adaptive FPS scaling present');
new vm.Script(script,{filename:'block-world-3d.js'});
function boot(shared=new Map()){
 const elements=new Map(),events=new Map(),clock={raf:null,now:0},errors=[];
 const gl=new Proxy({
  ARRAY_BUFFER:1,STATIC_DRAW:2,DYNAMIC_DRAW:3,TRIANGLES:4,
  VERTEX_SHADER:5,FRAGMENT_SHADER:6,COMPILE_STATUS:7,LINK_STATUS:8,
  DEPTH_TEST:9,COLOR_BUFFER_BIT:16,DEPTH_BUFFER_BIT:32,FLOAT:10,
  createProgram(){return{};},createShader(){return{};},createBuffer(){return{};},
  getProgramParameter(){return true;},getShaderParameter(){return true;},
  getAttribLocation(){return 1;},getUniformLocation(){return{};},
  bufferData(_target,data){if(data?.length!==6&&data?.length)assert.equal(data.length%10,0,'GPU cube vertex buffers use 10-float positions, material and normals');}
 },{get:(a,k)=>k in a?a[k]:()=>{}});
 function element(id=''){
  return {id,events:{},children:[],attrs:{},style:{},className:'',classList:{add(){},remove(){}},textContent:'',innerHTML:'',hidden:false,disabled:false,value:'',files:[],
   getContext(){return gl;},addEventListener(t,fn){(this.events[t]??=[]).push(fn);},appendChild(e){this.children.push(e);return e;},
   replaceChildren(...args){this.children=args;},setAttribute(k,v){this.attrs[k]=v;},
   getAttribute(k){return this.attrs[k];},getBoundingClientRect(){return {left:0,top:0,width:390,height:844};},
   setPointerCapture(){},hasPointerCapture(){return false;},querySelector(){return element();},click(){},remove(){}
  };
 }
 const document={hidden:false,createElement(){return element();},getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id);},
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
 const instrumented=script.replace('window.BlockWorld3D=Object.freeze','window.__block3dTests={award,modify,portal};window.BlockWorld3D=Object.freeze');
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
console.log('Block World 3D: WebGL, chunks, movement, save/reload, XP and private invite creation PASS');
