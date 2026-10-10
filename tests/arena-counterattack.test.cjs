'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');

test('a tackle opens real rival possession and a live counterattack recovery',()=>{
 const listeners=new Map(),nodes=new Map(),frames=[];
 const ctx=new Proxy({},{get(_,k){
  if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
  return ()=>{};
 },set(){return true}});
 const element=id=>{
  if(nodes.has(id))return nodes.get(id);
  const e={id,value:id==='arena-upgrade-type'?'speed':'',checked:true,hidden:true,
   style:{setProperty(){}},classList:{contains(){return true},toggle(){},add(){},remove(){}},
   getBoundingClientRect(){return {left:0,top:0,width:420,height:600}},
   addEventListener(k,fn){listeners.set(id+':'+k,fn)},
   setAttribute(){},focus(){},querySelector(){return {disabled:false}},
   getContext(){return ctx},setPointerCapture(){}
  };nodes.set(id,e);return e;
 };
 const document={getElementById:element,querySelector:element,hidden:false,
  addEventListener(k,fn){listeners.set('document:'+k,fn)},activeElement:{tagName:'BODY'}};
 const window={devicePixelRatio:1,matchMedia(){return {matches:false}},
  addEventListener(k,fn){listeners.set('window:'+k,fn)},dispatchEvent(){},
  JozefWorld:{getProgress(){return {kit:'#cafa60',number:10}},record(){}}
 };
 const store={getItem(){return null},setItem(){}};
 const environment={window,document,localStorage:store,navigator:{vibrate(){}},
  requestAnimationFrame:fn=>{frames.push(fn);return frames.length},
  cancelAnimationFrame(){},console,Event:function Event(){}};
 vm.createContext(environment);
 vm.runInContext(read('arena-systems.js'),environment,{filename:'arena-systems.js'});
 // Make defenders deliberately press the stationary player so this is a
 // deterministic integration test of the actual tackle/recovery state machine.
 const systems=window.JozefArenaSystems;
 window.JozefArenaSystems={...systems,defenderDestination:(index,d,actor)=>({x:actor.x,y:actor.y,role:'PRESS'})};
 for(const name of ['arena-experience.js','arena-renderer.js','arena.js'])
  vm.runInContext(read(name),environment,{filename:name});
 listeners.get('arena-start:click')();
 let rivalSeen=false,wonBack=false,firstRivalGoals=null,t=0;
 for(let i=0;i<900&&window.JozefArena.getProgress().mode==='playing';i++){
  const frame=frames.shift();assert.ok(frame,'the match frame must continue');
  frame((t+=16.67));
  const state=window.JozefArena.getProgress();
  if(state.ballOwner==='rival'){
   rivalSeen=true;
   if(firstRivalGoals===null)firstRivalGoals=state.opponentGoals;
  }
  if(rivalSeen&&state.counterRecoveries>0&&state.ballOwner!=='rival'){
   wonBack=true;
   assert.ok(state.counterSeconds>0,'recovered ball grants a fast-break window');
   break;
  }
 }
 assert.equal(rivalSeen,true,'defender must take possession rather than resetting instantly');
 assert.equal(firstRivalGoals,0,'a tackle cannot award a rival goal immediately');
 assert.equal(wonBack,true,'Jozef or a teammate must be able to regain possession');
 assert.ok(window.JozefArena.getProgress().counterRecoveries>=1);
});
