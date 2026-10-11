'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.resolve(__dirname,'..',name),'utf8');

test('an attacking shot into an open corner can actually score during a match',()=>{
 const events=new Map(),nodes=new Map(),frames=[];
 const ctx=new Proxy({}, {get(_,key){
  if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});
  return ()=>{};
 },set(){return true}});
 function el(id){
  if(nodes.has(id))return nodes.get(id);
  const node={id,hidden:true,checked:true,value:id==='arena-upgrade-type'?'speed':'',
   classList:{contains(){return true},toggle(){},add(){},remove(){}},
   style:{setProperty(){}},
   getBoundingClientRect(){return {left:0,top:0,width:420,height:600}},
   addEventListener(type,fn){events.set(id+':'+type,fn)},
   setAttribute(){},focus(){},getContext(){return ctx},
   querySelector(){return {disabled:false}},setPointerCapture(){}
  };
  nodes.set(id,node);return node;
 }
 const document={getElementById:el,querySelector:el,hidden:false,
  activeElement:{tagName:'BODY'},addEventListener(k,fn){events.set('document:'+k,fn)}};
 const window={devicePixelRatio:1,matchMedia(){return {matches:false}},
  addEventListener(k,fn){events.set('window:'+k,fn)},dispatchEvent(){},
  JozefWorld:{getProgress(){return {kit:'#cafa60',number:10}},record(){}}
 };
 const gameMath=Object.create(Math);gameMath.random=()=>0;
 const env={window,document,Math:gameMath,localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  navigator:{vibrate(){}},console,Event:function Event(){},
  requestAnimationFrame:fn=>{frames.push(fn);return frames.length},cancelAnimationFrame(){}};
 vm.createContext(env);
 vm.runInContext(read('arena-systems.js'),env,{filename:'arena-systems.js'});
 const original=window.JozefArenaSystems;
 // Clear the lane and make the keeper choose the opposite corner. This isolates
 // scoring from interception AI, while exercising the real match physics.
 window.JozefArenaSystems={...original,
  defenderDestination:()=>({x:396,y:100}),
  keeperCommit:()=>272};
 for(const f of ['arena-experience.js','arena-renderer.js','arena.js'])
  vm.runInContext(read(f),env,{filename:f});
 events.get('arena-start:click')();
 // Exercise the actual held touch-arrow control. The settings layer also
 // registers keydown listeners, so keyboard dispatch is tested separately.
 events.get('arena-up:pointerdown')({pointerId:19,preventDefault(){}});
 let now=0;
 for(let i=0;i<89;i++){
  const frame=frames.shift();assert.ok(frame,'running match must schedule animation');
  frame(now+=16.67);
 }
 events.get('arena-up:pointerup')({pointerId:19});
 const ready=window.JozefArena.getProgress();
 assert.ok(ready.playerY<300&&ready.playerY>130,
  'Jozef must dribble into the attacking half first: '+ready.playerY);
 assert.equal(ready.ballOwner,'actor');
 events.get('arena-aim-0:click')();
 events.get('arena-shoot:click')();
 let scored=false;
 for(let i=0;i<100;i++){
  const frame=frames.shift();assert.ok(frame);
  frame(now+=16.67);
  if(window.JozefArena.getProgress().matchGoals>0){scored=true;break;}
 }
 assert.equal(scored,true,'a clear well-placed close shot should be able to score');
});
