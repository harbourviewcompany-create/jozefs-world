'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../arena-renderer.js'),'utf8');
const gradient={addColorStop(){}};
function fakeContext(onDraw){
 return new Proxy({},{
  get(_,key){
   if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>gradient;
   if(key==='drawImage')return ()=>onDraw?.();
   return ()=>{};
  },
  set(){return true;}
 });
}
test('stadium background is cached across gameplay frames and invalidated for each venue',()=>{
 let allocated=0,blits=0;
 const canvasFactory={
  createElement(tag){
   assert.equal(tag,'canvas');
   allocated++;
   return {width:0,height:0,getContext(){return fakeContext();}};
  }
 };
 const window={devicePixelRatio:2};
 vm.runInNewContext(source,{window,document:canvasFactory},{filename:'arena-renderer.js'});
 const render=window.JozefArenaGraphics.render;
 const c=fakeContext(()=>blits++);
 const state={
  stadium:0,venue:'NEIGHBOURHOOD COURT',mode:'playing',
  actor:{x:210,y:400},mate:{x:300,y:300},ball:{x:210,y:385,owner:'actor'},
  defenders:[],keeper:{x:210,y:45},aim:0,shotZones:[{x:171},{x:210},{x:249}],
  squad:{lineup:{}},identity:{number:10,kit:'#aaff77'},phase:0,us:0,them:0
 };
 for(let frame=0;frame<20;frame++){state.phase=frame*.016;render(c,state);}
 assert.equal(allocated,1,'twenty gameplay frames should allocate one stadium surface');
 assert.equal(blits,20,'each frame blits cached pitch and renders dynamic characters');
 state.venue='NEON CITY';state.stadium=1;render(c,state);
 assert.equal(allocated,2,'unlocked stadium must rebuild the static stadium art once');
 render(c,state);assert.equal(allocated,2,'next frame reuses the new stadium');
});
test('renderer falls back to direct painting when offscreen canvas is unavailable',()=>{
 const window={devicePixelRatio:1};
 vm.runInNewContext(source,{window,document:{}},{filename:'arena-renderer.js'});
 assert.doesNotThrow(()=>window.JozefArenaGraphics.render(fakeContext(),{
  venue:'COURT',stadium:0,mode:'ready',ball:{x:210,y:450,owner:'actor'},
  actor:{x:210,y:470},mate:{x:280,y:200},keeper:{x:210,y:48},
  squad:{lineup:{}},shotZones:[{x:171}],defenders:[]
 }));
});
