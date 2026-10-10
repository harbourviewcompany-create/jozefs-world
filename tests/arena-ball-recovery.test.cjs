'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');

test('repeated stationary deep shots cannot produce guaranteed goals or endless loose balls',()=>{
 const events=new Map(),nodes=new Map(),frames=[];
 const ctx=new Proxy({},{get(_,k){
  if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
  return ()=>{};
 },set(){return true}});
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const n={id,hidden:true,value:id==='arena-upgrade-type'?'speed':'',
   checked:true,style:{setProperty(){}},
   classList:{contains(){return true},toggle(){},add(){},remove(){}},
   getBoundingClientRect(){return {left:0,top:0,width:420,height:600}},
   addEventListener(type,fn){events.set(id+':'+type,fn)},
   setAttribute(){},focus(){},querySelector(){return {disabled:false}},
   getContext(){return ctx},setPointerCapture(){}
  };
  nodes.set(id,n);return n;
 };
 const document={
  getElementById:node,querySelector:node,hidden:false,
  addEventListener(type,fn){events.set('document:'+type,fn)},
  activeElement:{tagName:'BODY'}
 };
 const math=Object.create(Math);
 math.random=()=>.99; // Force every low-probability long-range shot to miss.
 const window={devicePixelRatio:1,matchMedia(){return {matches:false}},
  addEventListener(type,fn){events.set('window:'+type,fn)},dispatchEvent(){},
  JozefWorld:{getProgress(){return {kit:'#cafa60',number:10}},record(){}}
 };
 const stored={};
 const env={window,document,Math:math,localStorage:{
  getItem(k){return stored[k]||null},setItem(k,v){stored[k]=v}
 },navigator:{vibrate(){}},console,
 requestAnimationFrame:fn=>{frames.push(fn);return frames.length},
 cancelAnimationFrame(){},Event:function Event(){}};
 vm.createContext(env);
 for(const name of ['arena-systems.js','arena-experience.js','arena-renderer.js','arena.js']){
  vm.runInContext(read(name),env,{filename:name,timeout:2000});
 }
 events.get('arena-start:click')();
 assert.equal(window.JozefArena.getProgress().mode,'playing');
 assert.ok(window.JozefArena.getProgress().shotChance<.12);
 events.get('arena-shoot:click')();
 let now=0, recovered=false;
 for(let i=0;i<430;i++){
  const fn=frames.shift();assert.ok(fn,'match loop remains scheduled');
  fn(now+=16.67);
  const state=window.JozefArena.getProgress();
  if(i>75&&state.ballOwner==='actor'){recovered=true;break;}
 }
 assert.equal(window.JozefArena.getProgress().matchGoals,0,'a missed deep shot does not count as a goal');
 assert.ok(recovered,'the ball returns to a playable state within seconds');
 assert.equal(window.JozefArena.getProgress().mode,'playing','match continues');
});
