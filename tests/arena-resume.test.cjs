'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function boot(store){
 const listeners=new Map(),elements=new Map(),frames=[];
 const ctx=new Proxy({}, {get(_,key){
  if(key==='createLinearGradient'||key==='createRadialGradient')
   return ()=>({addColorStop(){}});
  return ()=>{};
 },set(){return true}});
 function element(id){
  if(elements.has(id))return elements.get(id);
  const n={id,hidden:true,checked:true,
   value:id==='arena-upgrade-type'?'speed':'',
   style:{setProperty(){}},
   classList:{contains(){return true},toggle(){},add(){},remove(){}},
   getBoundingClientRect(){return {left:0,top:0,width:420,height:600}},
   addEventListener(name,fn){listeners.set(id+':'+name,fn)},
   setAttribute(){},focus(){},
   querySelector(){return {disabled:false}},
   getContext(){return ctx},setPointerCapture(){}
  };
  elements.set(id,n);return n;
 }
 const document={getElementById:element,querySelector:element,hidden:false,
  activeElement:{tagName:'BODY'},addEventListener(k,fn){listeners.set('document:'+k,fn)}};
 const window={devicePixelRatio:2,matchMedia(){return {matches:false}},
  addEventListener(k,fn){listeners.set('window:'+k,fn)},dispatchEvent(){},
  JozefWorld:{getProgress(){return {kit:'#cafa60',number:10}},record(){}}
 };
 const env={window,document,localStorage:store,navigator:{vibrate(){}},console,
  requestAnimationFrame:fn=>{frames.push(fn);return frames.length},
  cancelAnimationFrame(){},Event:function Event(){}};
 vm.createContext(env);
 for(const file of ['arena-systems.js','arena-experience.js','arena-renderer.js','arena.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),env,{filename:file});
 return {window,listeners,frames};
}
test('mobile interruptions restore a live match paused without losing score or timer',()=>{
 const state={};
 const store={getItem:k=>state[k]??null,setItem(k,v){state[k]=v},removeItem(k){delete state[k]}};
 const first=boot(store);
 first.listeners.get('arena-start:click')();
 let now=0;
 for(let i=0;i<200;i++){
  const frame=first.frames.shift();assert.ok(frame);
  frame(now+=16.667);
 }
 const before=first.window.JozefArena.getProgress();
 first.listeners.get('window:pagehide')();
 assert.ok(state['jozef-arena-match-snapshot-v1'],'pagehide must checkpoint');
 const second=boot(store);
 const after=second.window.JozefArena.getProgress();
 assert.equal(after.mode,'paused','reopen to paused, never auto-play');
 assert.equal(after.matchGoals,before.matchGoals);
 assert.equal(after.opponentGoals,before.opponentGoals);
 assert.ok(after.score===before.score);
 assert.ok(after.playerY>=100&&after.playerY<=565);
 second.listeners.get('arena-start:click')();
 assert.equal(second.window.JozefArena.getProgress().mode,'playing');
});
test('stale interrupted matches expire after two hours',()=>{
 const state={'jozef-arena-match-snapshot-v1':JSON.stringify({
  version:1,savedAt:Date.now()-3*60*60*1000,time:42
 })};
 const store={getItem:k=>state[k]??null,setItem(k,v){state[k]=v},removeItem(k){delete state[k]}};
 assert.equal(boot(store).window.JozefArena.getProgress().mode,'ready');
});
