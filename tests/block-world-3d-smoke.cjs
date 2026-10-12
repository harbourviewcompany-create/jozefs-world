#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../block-world-3d.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'../block-world-3d.js'),'utf8');
assert.match(html,/src="\.\/block-world-3d\.js"/);
assert.match(html,/src="\.\/peerjs\.min\.js"/);
new vm.Script(script,{filename:'block-world-3d.js'});
function boot(shared=new Map()){
 const elements=new Map(),events=new Map(),clock={raf:null,now:0},errors=[];
 const gl=new Proxy({
  ARRAY_BUFFER:1,STATIC_DRAW:2,DYNAMIC_DRAW:3,TRIANGLES:4,
  VERTEX_SHADER:5,FRAGMENT_SHADER:6,COMPILE_STATUS:7,LINK_STATUS:8,
  DEPTH_TEST:9,COLOR_BUFFER_BIT:16,DEPTH_BUFFER_BIT:32,FLOAT:10,
  createProgram(){return{};},createShader(){return{};},createBuffer(){return{};},
  getProgramParameter(){return true;},getShaderParameter(){return true;},
  getAttribLocation(){return 1;},getUniformLocation(){return{};}
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
 const window={Peer:null,addEventListener(t,fn){(events.get(t)||events.set(t,[]).get(t)).push(fn);}};
 const sandbox={
  document,window,
  localStorage:{getItem:k=>shared.get(k)||null,setItem:(k,v)=>shared.set(k,String(v)),removeItem:k=>shared.delete(k)},
  navigator:{getGamepads:()=>[]},history:{replaceState(){}},
  location:{hash:'',origin:'https://example.com',pathname:'/block-world-3d.html',reload(){}},
  performance:{now:()=>clock.now},requestAnimationFrame:fn=>clock.raf=fn,
  innerWidth:390,innerHeight:844,devicePixelRatio:1,console:{error:e=>errors.push(String(e)),warn:e=>errors.push(String(e))},
  setTimeout(){return 1;},clearTimeout(){},
  Blob:class{},URL:{createObjectURL:()=>'/blob',revokeObjectURL(){}},confirm:()=>false,
  crypto:{getRandomValues:a=>a.fill(37)}
 };
 vm.runInNewContext(script,sandbox,{timeout:15000});
 const status=()=>window.BlockWorld3D?.status();
 const tick=(n=1)=>{for(let i=0;i<n;i++){clock.now+=17;assert.ok(clock.raf);clock.raf(clock.now);}};
 const click=id=>{const el=document.getElementById(id);if(el.onclick)el.onclick({});else for(const f of(el.events.click||[]))f({preventDefault(){}});};
 return {status,tick,click,document,events,errors,shared};
}
const test=boot();
assert.ok(test.status(),'3D API initialized');
test.tick(3);
assert.ok(test.status().renderOk,'frame rendered');
assert.ok(test.status().loadedChunks>0,'terrain chunks streamed');
const start=test.status().hero.z;
for(const fn of test.events.get('keydown')||[])fn({code:'KeyW',repeat:false,preventDefault(){}});
test.tick(9);
for(const fn of test.events.get('keyup')||[])fn({code:'KeyW'});
assert.ok(test.status().hero.z<start,'movement changes position');
test.click('save');
assert.ok(test.shared.get('jozefs-block-3d-v1'),'world persisted locally');
const next=boot(test.shared);
next.tick(2);
assert.ok(next.status().renderOk,'saved world renders after relaunch');
assert.equal(next.status().seed,test.status().seed,'saved seed preserved');
assert.ok(test.document.getElementById('mission').innerHTML.includes('MISSION'),'mission HUD initialized');
assert.equal(test.errors.length,0,'no startup/frame errors: '+test.errors.join('; '));
console.log('Block World 3D: WebGL startup, chunk streaming, movement, HUD, save and reload PASS');
