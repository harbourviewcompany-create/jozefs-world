'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
test('match runs through completion and can restart without a browser crash',()=>{
 const events=new Map(),nodes=new Map(),frames=[];
 const ctx=new Proxy({}, {get(_,k){
  if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
  return ()=>{};
 },set(){return true}});
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const el={
   id,value:id==='arena-upgrade-type'?'speed':'',checked:true,
   hidden:['arena-settings','arena-match-report','arena-replay-banner'].includes(id),
   style:{setProperty(){}},
   classList:{contains(){return true},toggle(){},add(){},remove(){}},
   getBoundingClientRect(){return {left:0,top:0,width:420,height:600}},
   addEventListener(type,fn){events.set(id+':'+type,fn)},
   setAttribute(){},focus(){},querySelector(){return {disabled:false}},
   getContext(){return ctx},setPointerCapture(){}
  };
  nodes.set(id,el);return el;
 };
 const document={
  getElementById:node,querySelector:node,
  addEventListener(type,fn){events.set('document:'+type,fn)},
  activeElement:{tagName:'BODY'}
 };
 const store={values:{},getItem(k){return this.values[k]||null},setItem(k,v){this.values[k]=v}};
 const window={
  devicePixelRatio:1,matchMedia(){return {matches:false}},
  addEventListener(type,fn){events.set('window:'+type,fn)},dispatchEvent(){},
  JozefWorld:{getProgress(){return {kit:'#cafa60',number:11}},record(){}}
 };
 const env={window,document,localStorage:store,navigator:{vibrate(){}},
  requestAnimationFrame:fn=>{frames.push(fn);return frames.length},
  cancelAnimationFrame(){},Event:function Event(){},console};
 vm.createContext(env);
 for(const file of ['arena-systems.js','arena-experience.js','arena-renderer.js','arena.js'])
  vm.runInContext(source(file),env,{filename:file,timeout:2000});
 assert.equal(window.JozefArena.getProgress().mode,'ready');
 events.get('arena-start:click')();
 assert.equal(window.JozefArena.getProgress().mode,'playing');
 assert.ok(window.JozefArena.getProgress().shotChance<.12,
  'kickoff must not award nearly certain goals from Jozef’s own goal');
 events.get('arena-shoot:click')();
 assert.equal(window.JozefArena.getProgress().shots,1);
 events.get('arena-settings-toggle:click')();
 assert.equal(window.JozefArena.getProgress().mode,'paused');
 assert.equal(node('arena-settings').hidden,false);
 events.get('arena-settings-close:click')();
 events.get('arena-start:click')(); // resume
 let tick=0;
 while(tick<4000&&window.JozefArena.getProgress().mode==='playing'){
  const callback=frames.shift();assert.ok(callback,'animation frame scheduled');
  callback((++tick)*36);
 }
 assert.equal(window.JozefArena.getProgress().mode,'over','match must end');
 assert.equal(node('arena-match-report').hidden,false,'report must appear');
 assert.ok(store.values['jozefs-world-arena-v1'],'career must save');
 events.get('arena-rematch:click')();
 assert.equal(window.JozefArena.getProgress().mode,'playing','rematch must start');
 // The standard gamepad mapping must be wired to the live match, not just
 // produce correct values in isolated pure-function tests.
 const pad={
  connected:true,axes:[0,-1],
  buttons:Array.from({length:16},()=>({pressed:false,value:0}))
 };
 env.navigator.getGamepads=()=>[pad];
 events.get('window:gamepadconnected')();
 assert.equal(window.JozefArena.getProgress().controllerConnected,true);
 let now=tick*36;
 for(let i=0;i<44;i++){
  const callback=frames.shift();assert.ok(callback,'gamepad and game frame scheduled');
  callback(now+=16.7);
 }
 assert.ok(window.JozefArena.getProgress().playerY<493,'gamepad stick must move Jozef');
 pad.axes=[0,0];pad.buttons[1].pressed=true;
 for(let i=0;i<12;i++){
  const callback=frames.shift();assert.ok(callback);callback(now+=16.7);
 }
 assert.equal(window.JozefArena.getProgress().shots,1,'gamepad B should fire a single shot');
 pad.buttons[1].pressed=false;
 for(let i=0;i<8;i++){const callback=frames.shift();assert.ok(callback);callback(now+=16.7);}
 pad.buttons[9].pressed=true;
 for(let i=0;i<8;i++){const callback=frames.shift();assert.ok(callback);callback(now+=16.7);}
 assert.equal(window.JozefArena.getProgress().mode,'paused','gamepad Start should pause');
});

