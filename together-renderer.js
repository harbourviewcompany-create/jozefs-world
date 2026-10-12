/* Jozef's World — 2026 Together Mode art director.
   Original offline 2.5D stadium artwork; no tracking, assets or network calls. */
(function(root){
'use strict';
const SCENES=[
 {sky:'#071b34',edge:'#18496b',field:'#102f43',stripe:'#174660',accent:'#caff74',secondary:'#75dbff',title:'AFTER HOURS'},
 {sky:'#061e32',edge:'#164e67',field:'#10374a',stripe:'#1a495a',accent:'#87e7ff',secondary:'#cfff80',title:'POWER RESTORED'},
 {sky:'#170f36',edge:'#473c80',field:'#222749',stripe:'#343664',accent:'#f7bf71',secondary:'#98d7ff',title:'THE CHAMPION VAULT'},
 {sky:'#170d35',edge:'#57437f',field:'#192347',stripe:'#26315b',accent:'#ffd37c',secondary:'#a0e9ff',title:'FINAL SHOWDOWN'},
 {sky:'#13263a',edge:'#826438',field:'#253e49',stripe:'#2b5360',accent:'#ffe79e',secondary:'#c6ff83',title:'OUR SHARED LEGEND'}
];
const BLOCKS=[[4,2],[4,3],[7,4],[7,5],[8,2]];
const p=(n)=>Math.round(n*100)/100;
let cache=null,cacheKey=-1,lastFrame=0;
const positions=[null,null];
const rand=n=>{let s=Math.sin(n*176.324+2.77)*42853.564;return s-Math.floor(s)};
function rounded(c,x,y,w,h,r){
 c.beginPath();c.roundRect(x,y,w,h,r);
}
function ellipse(c,x,y,rx,ry,color,alpha=1){
 c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
}
function bloom(c,x,y,rad,color,power=.4){
 const g=c.createRadialGradient(x,y,0,x,y,rad);
 g.addColorStop(0,color);g.addColorStop(1,'transparent');
 c.globalAlpha=power;c.fillStyle=g;c.fillRect(x-rad,y-rad,rad*2,rad*2);c.globalAlpha=1;
}
function makeBackground(canvas,stage){
 const c=canvas.getContext('2d'),s=SCENES[stage],w=canvas.width,h=canvas.height,tw=w/12,th=h/8;
 const bg=c.createLinearGradient(0,0,0,h);
 bg.addColorStop(0,s.sky);bg.addColorStop(.53,s.edge);bg.addColorStop(1,'#061323');
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 // Stadium silhouette and layered upper seating.
 for(let i=0;i<5;i++){
  const y=i*22-18;
  c.fillStyle=i%2?'#0b263c':'#0a2338';c.fillRect(0,y,w,17);
  c.fillStyle='#a7e6ff';c.globalAlpha=.045+i*.01;
  for(let j=0;j<37;j++)c.fillRect(j*21+(i%2)*9,y+4,7,2);
  c.globalAlpha=1;
 }
 // Architectural floor. Edge borders and tile relief read clearly at phone size.
 for(let y=0;y<8;y++)for(let x=0;x<12;x++){
  const X=x*tw,Y=y*th,wall=x===0||y===0||x===11||y===7||BLOCKS.some(b=>b[0]===x&&b[1]===y);
  c.fillStyle=wall?'#091a2b':(x+y)%2?s.field:s.stripe;
  c.fillRect(X+1.2,Y+1.2,tw-2.4,th-2.4);
  if(wall){
   c.fillStyle='#020b16';c.fillRect(X+7,Y+12,tw-12,th-12);
   const g=c.createLinearGradient(X,Y,X+tw,Y+th);
   g.addColorStop(0,'#4f6f85');g.addColorStop(1,'#1a324a');
   c.fillStyle=g;rounded(c,X+4,Y+3,tw-9,th-15,7);c.fill();
   c.fillStyle='#c3e9ec';c.globalAlpha=.16;c.fillRect(X+8,Y+6,tw-19,2);c.globalAlpha=1;
   c.strokeStyle='#6db8d255';c.lineWidth=1;c.strokeRect(X+8,Y+11,tw-18,th-28);
  }else{
   c.fillStyle='#edffff';c.globalAlpha=.023;c.fillRect(X+5,Y+4,tw-10,2);c.globalAlpha=1;
   c.strokeStyle='#92e5ec21';c.lineWidth=1;c.strokeRect(X+3,Y+3,tw-6,th-6);
   if((x*5+y*3)%9===0){c.fillStyle=s.accent;c.globalAlpha=.18;c.fillRect(X+9,Y+th-11,12,2);c.globalAlpha=1;}
  }
 }
 // Illuminated stadium arcs and pitch lines.
 c.strokeStyle=s.secondary;c.globalAlpha=.2;c.lineWidth=2;
 c.beginPath();c.ellipse(w/2,h/2,158,123,0,0,7);c.stroke();
 c.beginPath();c.ellipse(w/2,h/2,92,70,0,0,7);c.stroke();
 c.globalAlpha=1;
 // Genuine environmental details: score screens, benches, beacons and etched warnings.
 for(const x of [130,550]){
  rounded(c,x,18,70,26,5);c.fillStyle='#020c1c';c.fill();
  c.strokeStyle=s.secondary+'99';c.lineWidth=1;c.stroke();
  c.textAlign='center';c.font='900 11px system-ui';c.fillStyle=s.accent;c.fillText('J  +  D',x+35,35);
 }
 for(const [x,y] of [[2,3],[9,4],[3,6],[8,1]]){
  rounded(c,x*tw+9,y*th+37,tw-18,8,3);c.fillStyle='#031525';c.fill();
  c.fillStyle=s.secondary;c.globalAlpha=.3;c.fillRect(x*tw+17,y*th+39,tw-34,2);c.globalAlpha=1;
 }
 for(let i=0;i<20;i++){
  const x=rand(i+7)*w,y=rand(i+89)*h;
  if(y<80){ellipse(c,x,y,3,2,'#edfff8',.38);}
 }
}
function obtainCanvas(canvas,stage){
 const key=stage*1000000+canvas.width*1000+canvas.height;
 if(!cache||cacheKey!==key){
  cache=document.createElement('canvas');
  cache.width=canvas.width;cache.height=canvas.height;
  makeBackground(cache,stage);
  cacheKey=key;
  positions[0]=positions[1]=null;
 }
 return cache;
}
function shard(c,x,y,t,color,size=12){
 c.save();c.translate(x,y);c.rotate(t*.0006);
 c.fillStyle=color;c.shadowColor=color;c.shadowBlur=18;
 c.beginPath();c.moveTo(0,-size);c.lineTo(size*.62,0);c.lineTo(0,size);c.lineTo(-size*.62,0);c.closePath();c.fill();
 c.shadowBlur=0;c.strokeStyle='#ffffff9c';c.lineWidth=1.5;c.stroke();c.restore();
}
function character(c,x,y,hero,selected,time,moving){
 const tint=hero===0?'#ceff78':'#9fe3ff',light=hero===0?'#6cbd66':'#397fc4';
 // Soft contact shadow and selection footprint.
 ellipse(c,x+1,y+18,25,8,'#010813',.7);
 if(selected){
  c.strokeStyle=tint;c.lineWidth=2.5;c.shadowBlur=15;c.shadowColor=tint;
  c.beginPath();c.ellipse(x,y+13,26,10,0,0,7);c.stroke();c.shadowBlur=0;
 }
 const stride=moving?Math.sin(time*.014+hero)*4:0;
 c.save();c.translate(x,y+stride*.1);
 c.strokeStyle='#071724';c.lineWidth=7;c.lineCap='round';
 c.beginPath();c.moveTo(-10,7);c.lineTo(-12+stride,21);c.moveTo(10,7);c.lineTo(12-stride,21);c.stroke();
 // Trainers have soles and a restrained metal highlight.
 for(const d of [-1,1]){
  c.fillStyle='#e1f4ed';rounded(c,d*12-7+d*stride,16,14,7,3);c.fill();
  c.fillStyle='#0c2735';c.fillRect(d*12-6+d*stride,21,12,2);
 }
 // Dimensional jersey; both figures share the same character style.
 const shirt=c.createLinearGradient(-18,-15,20,15);
 shirt.addColorStop(0,'#ffffff');shirt.addColorStop(.09,tint);shirt.addColorStop(.7,tint);shirt.addColorStop(1,light);
 c.fillStyle=shirt;c.shadowColor='#07101e';c.shadowBlur=8;
 rounded(c,-18,-15,36,33,10);c.fill();c.shadowBlur=0;
 c.fillStyle='#172633';rounded(c,-17,9,34,9,3);c.fill();
 for(const d of [-1,1]){
  c.fillStyle=tint;rounded(c,d*23-8,-13,16,15,5);c.fill();
  c.fillStyle='#d2a17f';rounded(c,d*25-5,-1,11,12,5);c.fill();
 }
 // Face, hair, ears, cheek highlights.
 c.fillStyle='#e1b591';c.beginPath();c.arc(0,-23,12,0,Math.PI*2);c.fill();
 c.fillStyle='#1b2736';c.beginPath();c.arc(0,-27,12,Math.PI*1.07,Math.PI*2.05);c.lineTo(11,-28);c.closePath();c.fill();
 ellipse(c,-5,-23,1.3,1.6,'#162b38');ellipse(c,5,-23,1.3,1.6,'#162b38');
 c.strokeStyle='#965e4e';c.lineWidth=1;c.beginPath();c.arc(0,-19,3,.1,Math.PI-.1);c.stroke();
 c.textAlign='center';c.textBaseline='middle';c.font='900 15px system-ui';c.fillStyle='#14302c';c.fillText(hero===0?'11':'02',0,-1);
 c.restore();
 // Floating player identifier never confuses Dad with Jozef.
 rounded(c,x-28,y-53,56,16,7);c.fillStyle='#020e1ce7';c.fill();
 c.font='900 10px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=tint;
 c.fillText(hero===0?'JOZEF':'DAD',x,y-45);
}
function draw(input){
 const {ctx:c,canvas,stage:stageValue,targets,positions:players,selected=0,time=0,reducedMotion=false,clues=[false,false],battle=null,won=false,fragments=[],difficulty='story'}=input||{};
 if(!c||!canvas)return false;
 const stage=Math.max(0,Math.min(4,stageValue|0)),s=SCENES[stage],w=canvas.width,h=canvas.height,tw=w/12,th=h/8;
 c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.shadowBlur=0;
 c.drawImage(obtainCanvas(canvas,stage),0,0);
 const t=reducedMotion?0:time;
 // Lighting is drawn below all interactive objects to preserve contrast.
 c.globalCompositeOperation='screen';
 for(let i=0;i<3;i++){
  const x=(i+.45)*w/3+Math.sin(t*.00036+i)*48;
  const g=c.createLinearGradient(x-105,0,x+105,h);
  g.addColorStop(0,s.accent+'24');g.addColorStop(.8,'#0a294900');
  c.fillStyle=g;c.beginPath();c.moveTo(x,-12);c.lineTo(x-145,h);c.lineTo(x+145,h);c.closePath();c.fill();
 }
 c.globalCompositeOperation='source-over';
 // Hidden sparks can be discovered by either player, without obstructing the mission.
 for(const item of fragments){
  if(item.collected)continue;
  const cx=(item.x+.5)*tw,cy=(item.y+.5)*th,levitation=reducedMotion?0:Math.sin(t*.003+item.id)*4;
  bloom(c,cx,cy,24,'#ffd27d',.18);
  shard(c,cx,cy+levitation,t+item.id*550,'#f8c875',9);
  c.textAlign='center';c.textBaseline='middle';c.font='900 10px system-ui';c.fillStyle='#ffedbb';
  c.fillText('BONUS',cx,cy-20);
 }
 if(stage<3){
  (targets||[]).forEach(([x,y],i)=>{
   const filled=stage===0&&clues[i],cx=(x+.5)*tw,cy=(y+.5)*th;
   const col=i===0?'#caff6a':'#81ddff',size=reducedMotion?0:Math.sin(t*.004+i)*2;
   bloom(c,cx,cy,57,col,filled?.13:.32);
   c.strokeStyle=col;c.lineWidth=filled?1.6:3;
   c.shadowColor=col;c.shadowBlur=filled?4:18;
   c.beginPath();c.ellipse(cx,cy+14,23+size,9+size*.3,0,0,7);c.stroke();
   c.shadowBlur=0;
   c.fillStyle='#0a2333';rounded(c,cx-17,cy+4,34,12,3);c.fill();
   c.fillStyle=col;rounded(c,cx-13,cy+1,26,10,3);c.fill();
   shard(c,cx,cy-12+size*.6,t*.9+i*500,filled?'#ffffff':col,filled?7:12);
   rounded(c,cx-29,cy-44,58,16,7);c.fillStyle='#051628f4';c.fill();
   c.font='900 10px system-ui';c.textBaseline='middle';c.textAlign='center';c.fillStyle=col;
   c.fillText(filled?'FOUND':i===0?'JOZEF':'DAD',cx,cy-36);
  });
 }
 // Ambient particulate matter is deterministic; no random allocations per frame.
 if(!reducedMotion){
  c.fillStyle='#c9f9fb';
  for(let i=0;i<27;i++){
   const x=(rand(i+89)*w+Math.sin(t*.00014+i)*24+w)%w;
   const y=(rand(i+13)*h+t*(.002+i%3*.002))%h;
   c.globalAlpha=.09+rand(i+19)*.2;
   c.fillRect(p(x),p(y),i%4?1.4:2.5,i%4?1.4:2.5);
  }
  c.globalAlpha=1;
 }
 // Smooth character movement is purely presentation, never alters collision coordinates.
 const dt=Math.max(0,Math.min(60,time-lastFrame||16));
 const easing=reducedMotion?1:1-Math.exp(-dt/74);
 for(let i=0;i<2;i++){
  const goal={x:(players[i].x+.5)*tw,y:(players[i].y+.5)*th};
  if(!positions[i]||Math.hypot(goal.x-positions[i].x,goal.y-positions[i].y)>165)positions[i]={...goal};
  const mover=positions[i],beforeX=mover.x,beforeY=mover.y;
  mover.x+=(goal.x-mover.x)*easing;mover.y+=(goal.y-mover.y)*easing;
  character(c,mover.x,mover.y,i,i===selected,t,Math.hypot(mover.x-beforeX,mover.y-beforeY)>1);
 }
 lastFrame=time;
 if(stage>=3){
  // The vault becomes a large, readable championship stage, not an opaque generic panel.
  c.fillStyle='#030f21e9';rounded(c,66,161,w-132,153,19);c.fill();
  c.strokeStyle=s.accent;c.lineWidth=2.5;c.shadowColor=s.accent;c.shadowBlur=14;c.stroke();c.shadowBlur=0;
  c.textAlign='center';c.textBaseline='middle';c.font='900 15px system-ui';c.fillStyle=s.secondary;
  c.fillText(stage===4?'THE MIDNIGHT STADIUM CUP':'TAG TEAM / FINAL ROUND',w/2,191);
  c.fillStyle='#f2ffe9';c.font='900 32px system-ui';c.fillText(stage===4?'CHAMPIONS TOGETHER':'THE FINAL SHOWDOWN',w/2,229);
  c.font='800 15px system-ui';c.fillStyle=s.accent;
  c.fillText(stage===4?'JOZEF  +  DAD  /  FOREVER':'EVERY HERO NEEDS TWO POINTS',w/2,272);
  if(stage===3&&battle){
   c.font='900 14px system-ui';c.fillStyle='#ffdfb0';
   c.fillText((battle.turn===0?'JOZEF':'DAD')+' / YOUR SHOT',w/2,296);
  }
 }
 // Subtle angular frame and stage marker anchor the cinematic art.
 c.strokeStyle=s.secondary+'44';c.lineWidth=3;c.strokeRect(3,3,w-6,h-6);
 c.font='900 11px system-ui';c.textAlign='left';c.textBaseline='top';c.fillStyle='#e8fff0';
 c.fillText('JW / DUO',15,12);
 c.font='800 10px system-ui';c.textAlign='right';c.fillStyle=s.accent;
 c.fillText(s.title+(difficulty==='challenge'?' / CHALLENGE':''),w-15,13);
 c.restore();return true;
}
root.JozefTogetherRenderer=Object.freeze({draw,SCENES});
if(typeof module!=='undefined'&&module.exports)module.exports={SCENES,shieldFor:null};
})(typeof window!=='undefined'?window:globalThis);
