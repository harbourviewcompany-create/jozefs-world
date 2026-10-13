'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function render(){
 const events=[];
 const gradient={addColorStop(){}};
 const c=new Proxy({}, {get(target,key){
   if(key==='createLinearGradient'||key==='createRadialGradient')return()=>gradient;
   if(key==='fillText')return text=>events.push(['text',text]);
   if(key==='fillRect'||key==='strokeRect')return()=>events.push([key]);
   if(key==='roundRect')return()=>events.push(['roundRect']);
   if(key==='arc'||key==='ellipse')return()=>events.push([key]);
   if(key==='setLineDash')return()=>{};
   return target[key]||(()=>{});
 },set(target,key,value){target[key]=value;return true;}});
 const window={};vm.runInNewContext(read('versus-visual-2026.js'),{window,Math},{timeout:3000});
 return {c,events,g:window.JozefVersusVisual};
}
test('stadium, actors, glowing star and ball render offline without external assets',()=>{
 const {c,events,g}=render();
 assert.equal(typeof g.stadium,'function');
 g.stadium(c,720,420);
 g.player(c,{x:280,y:200,face:1,vx:2,vy:0},'#6dd5ff','Jozef',true,true,30);
 g.player(c,{x:460,y:200,face:-1,vx:0,vy:0},'#d7ff4a','Dad',false,true,30);
 g.star(c,{x:340,y:140},30,false);
 g.ball(c,{x:280,y:200},5);
 assert.ok(events.filter(e=>e[0]==='roundRect').length>8,'layered stadium and sprites');
 assert.ok(events.filter(e=>e[0]==='arc').length>5,'heads, targets and details');
 assert.ok(events.some(e=>e[0]==='text'&&e[1]==='Jozef'));
 assert.ok(events.some(e=>e[0]==='text'&&e[1]==='Dad'));
});
test('both published pages use the new renderer before gameplay and retain all match actions',()=>{
 const html=read('index.html');
 assert.equal(html,read('world.html'),'published homepage and world must be identical');
 const a=html.indexOf('src="versus-visual-2026.js?v=1"'),b=html.indexOf('src="versus.js?v=86"');
 assert.ok(a>=0&&b>a,'art renderer precedes match controller');
 for(const id of ['versus-score-jozef','versus-score-dad','versus-clock','versus-stick','versus-aim','versus-deke','versus-pass','versus-sprint','versus-kick','versus-again','versus-leave']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' id must be unique');
 }
 assert.match(read('versus.js'),/screenScale=Math.max\(width\/vw,height\/vh\)/,'uniform cover camera, not stretch');
 assert.match(read('site-experience.css'),/2026 SOCCER SHOWDOWN/);
 assert.match(read('sw.js'),/versus-visual-2026\.js/);
});
