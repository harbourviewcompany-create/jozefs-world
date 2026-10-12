/* Classic 2D two-phone position sync. Runs after block-world.js. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const canvas=$('game');
 if(!canvas)return;
 const ctx=canvas.getContext('2d');
 let remote=null,lastSend=0;
 function sendPos(){
  if(!window.BlockWorld2D||!window.BlockWorld2D.send)return;
  const now=performance.now();
  if(now-lastSend<120)return;
  lastSend=now;
  // Read approximate position from the health text or fall back
  window.BlockWorld2D.send({t:'pos',x:0,y:0,name:'Remote'});
 }
 function drawRemote(){
  if(!remote)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  ctx.save();
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const x=remote.x||100,y=remote.y||200;
  ctx.fillStyle='#3d9a55';
  ctx.fillRect(x-10,y-30,20,28);
  ctx.fillStyle='#e8b78d';
  ctx.fillRect(x-8,y-42,16,14);
  ctx.fillStyle='#fff';
  ctx.font='bold 11px system-ui';
  ctx.textAlign='center';
  ctx.fillText(remote.name||'Jozef',x,y-48);
  ctx.restore();
 }
 // Hook into the existing frame loop by wrapping requestAnimationFrame
 const orig=window.requestAnimationFrame;
 window.requestAnimationFrame=function(cb){
  return orig.call(window,function(t){
   sendPos();
   const result=cb(t);
   drawRemote();
   return result;
  });
 };
 window.BlockWorld2D=window.BlockWorld2D||{};
 window.BlockWorld2D.onRemote=function(data){
  if(data&&data.t==='pos')remote=data;
 };
})();
