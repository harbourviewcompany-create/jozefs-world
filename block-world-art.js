/* Block World Scenic Renderer · procedural gameplay graphics, no generated/mockup image.
   Terrain and characters are drawn from live game state. All assets are offline-safe. */
(function(){
'use strict';
const textures={},twopi=Math.PI*2;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function hash(a,b,c=1){let n=Math.imul((a|0)+c*1013,1597334677)^Math.imul((b|0)+193,3812015801);n=Math.imul(n^(n>>>15),2246822519);return((n^(n>>>13))>>>0)/4294967296;}
function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(x,y,w,h);}
function path(g,points,col){g.fillStyle=col;g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();}
function tile(id){
 if(textures[id])return textures[id];
 const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');
 if(!g)return c;
 const dirt='#71442a',stone='#697887',grass='#64b93d';
 const palettes={
  1:['#886040','#985e39','#b07e48'],2:['#68402d','#835235','#ac7047'],
  3:['#607183','#7a8793','#a0aeb8'],4:['#694022','#996036','#bd8647'],
  5:['#285d29','#3e913c','#6cc956'],6:['#c7a463','#dfca88','#f8e1ab'],
  7:['#81512d','#ac7541','#dcaa62'],8:['#6e7781','#88959f','#bdc3c6'],
  9:['#7a817f','#979b97','#bebdb3'],10:['#6d7a89','#899baa','#bdd0dd'],
  11:['#697481','#8497a5','#bac3c9'],12:['#70bdd3','#b1e8f4','#e2ffff'],
  13:['#1972a2','#3eb6d9','#80e9fa'],14:['#202532','#353849','#616273'],
  15:['#917267','#b49a8b','#dfcbbb'],16:['#e6eef8','#f7fafe','#ffffff'],
  17:['#646c79','#8c9aa9','#f5c651'],18:['#4e6c83','#7a9fb3','#59e5ff'],
  20:['#4b5364','#626e74','#ffad43'],21:['#6c7785','#96a3ad','#de9658'],
  22:['#587d77','#879e95','#55e8a0'],23:['#576888','#748bb7','#5a9df9'],
  24:['#665b6b','#91818e','#f45d69']
 };
 const p=palettes[id]||['#6d7780','#8996a1','#b5c1ce'];
 rect(g,0,0,32,32,p[0]);
 if(id===1){
  rect(g,0,0,32,7,'#3e842c');rect(g,0,0,32,3,'#a1ec59');
  for(let x=0;x<32;x+=4){const h=5+Math.floor(hash(x,id)*8);rect(g,x,5,3,h,'#377b29');rect(g,x,5,3,2,'#69ce42');}
 }else if(id===4){rect(g,0,0,32,32,'#75401f');for(let y=0;y<32;y+=7){rect(g,0,y,32,3,'#c48b4b');rect(g,0,y+4,32,1,'#4a281c');}rect(g,4,0,2,32,'#5c311e');rect(g,23,0,2,32,'#bd7c3b');}
 else if(id===5){rect(g,0,0,32,32,'#2c742e');}
 else if(id===7){rect(g,0,0,32,32,'#aa6d38');for(let y=0;y<32;y+=10){rect(g,0,y,32,2,'#e0a75d');rect(g,(y%20?4:18),y,2,10,'#6c4127');}}
 else if(id===12){rect(g,0,0,32,32,'#62b5cb');rect(g,2,2,28,28,'#b4edee');rect(g,6,1,4,31,'#eafff6');rect(g,11,18,20,3,'#ddfffd');}
 else if(id===13){rect(g,0,0,32,32,'#146ba6');for(let i=0;i<5;i++)rect(g,1,i*7,30,2,i%2?'#42e2ef':'#249ed6');}
 else if(id===16){rect(g,0,0,32,32,'#dfe8f3');rect(g,0,0,32,7,'#fff');rect(g,0,7,32,4,'#aac6e0');}
 else if(id===20){rect(g,0,0,32,32,'#59616d');rect(g,4,8,24,19,'#222b33');rect(g,8,16,16,7,'#f49331');rect(g,11,17,10,4,'#ffe07b');}
 if(id!==12&&id!==13){
  for(let i=0;i<62;i++){
   const x=Math.floor(hash(i,id,41)*32),y=Math.floor(hash(i,id,87)*32);
   if(id===1&&y<6)continue;
   const v=hash(i,id,19);
   rect(g,x,y,1+Math.floor(v*4),1+Math.floor(hash(i,id,24)*3),v>.42?p[2]:p[1]);
  }
  if([3,8,9,10,11,14,17,18,21,22,23,24].includes(id)){
   for(let i=0;i<8;i++){const x=hash(i,id,7)*30,y=hash(i,id,11)*30;rect(g,x,y,3,1,'#3b536480');}
  }
  const ores={10:'#1c2838',11:'#e7b79c',17:'#ffe071',18:'#65eaff',21:'#d99a64',22:'#4effb5',23:'#568ffb',24:'#ef5266'};
  if(ores[id])for(let i=0;i<7;i++){const x=Math.floor(hash(id,i,3)*26)+2,y=Math.floor(hash(id,i,5)*26)+2;
   rect(g,x+1,y+1,6,5,'#283c4b');rect(g,x,y,5,4,ores[id]);rect(g,x,y,2,2,'#ffffff90');
  }
 }
 // Bevel and cube edges convey voxel volume in the same side-view collision grid.
 rect(g,0,0,32,2,'#ffffff23');rect(g,0,0,2,32,'#ffffff18');
 rect(g,0,30,32,2,'#09203765');rect(g,30,0,2,32,'#08203455');
 if(id===1)for(let x=0;x<32;x+=5)rect(g,x,0,2,2,'#c9fa79');
 textures[id]=c;return c;
}
function sun(g,x,y,r,time){
 g.save();
 const glow=g.createRadialGradient(x,y,2,x,y,r*2.9);
 glow.addColorStop(0,'#fffaddaa');glow.addColorStop(.35,'#ffe69b4b');glow.addColorStop(1,'#fff8d000');
 g.fillStyle=glow;g.fillRect(x-r*3,y-r*3,r*6,r*6);
 // Small warm pixel sun rather than the giant concentric circles in the previous release.
 rect(g,x-r*.64,y-r*.64,r*1.28,r*1.28,'#fff0ab');
 rect(g,x-r*.45,y-r*.45,r*.9,r*.9,'#fff9dc');
 g.restore();
}
function cloud(g,x,y,size,alpha){
 g.save();g.globalAlpha=alpha;
 for(let j=0;j<2;j++)for(let i=0;i<4;i++){
  rect(g,x+i*size*.39+j*size*.18,y+j*size*.28-(i===1?size*.2:0),size*.48,size*.38,j?'#cde7ff':'#ffffff');
 }
 rect(g,x+size*.15,y+size*.45,size*1.45,size*.18,'#c3e0fd');g.restore();
}
function mountains(g,w,h,pan,t){
 const baseline=h*.79;
 // Mountain silhouettes stay behind the playing field; no huge white triangular peak.
 for(let layer=0;layer<3;layer++){
  const period=128+layer*54,scroll=pan*(.035+layer*.034),offset=((scroll%period)+period)%period;
  const base=baseline+layer*h*.018;
  for(let i=-2;i<Math.ceil(w/period)+3;i++){
   const world=Math.floor(scroll/period)+i;
   const x=i*period-offset;
   const peak=h*(.09+layer*.028+hash(world,layer,17)*.055);
   const summit=base-peak,half=period*.83;
   const left=x-half,right=x+half;
   const ridge=[[left,base+28],[left+half*.22,base-peak*.19],[x-half*.47,base-peak*.46],
    [x-half*.21,base-peak*.73],[x,summit],[x+half*.18,base-peak*.74],
    [x+half*.40,base-peak*.48],[x+half*.66,base-peak*.24],[right,base+24]];
   path(g,[...ridge,[right,h],[left,h]],['#a7cdea','#83b4d7','#557ea7'][layer]);
   path(g,[[x,summit],[x+half*.18,base-peak*.74],[x+half*.4,base-peak*.48],
    [right,base+24],[right,h],[x+half*.08,h]],['#86b3da','#6596c3','#426d99'][layer]);
   const snowTop=summit+peak*.19;
   path(g,[[x,summit],[x-half*.20,base-peak*.74],[x-half*.12,snowTop+peak*.10],
    [x-half*.035,snowTop],[x+half*.045,snowTop+peak*.07],
    [x+half*.16,base-peak*.73]],'#ecf7ff');
   path(g,[[x,summit],[x+half*.16,base-peak*.73],[x+half*.06,snowTop+peak*.045]],
     '#bfdcf0');
  }
 }
}
function distantTrees(g,w,h,cam,t){
 const spacing=67,scroll=cam*.16,treeFloor=h*.88;
 for(let i=-2;i<Math.ceil(w/spacing)+3;i++){
  const world=Math.floor(scroll/spacing)+i,x=i*spacing-scroll%spacing;
  const hei=20+hash(world,2,4)*31;
  const y=treeFloor+Math.sin(world*.83)*28;
  rect(g,x,y-hei,6,hei,'#355d57');
  for(let l=0;l<3;l++){const width=19+hash(world,l,5)*18;path(g,[[x-width*.6,y-hei+l*12+16],[x+3,y-hei-l*10],[x+width*.7,y-hei+l*12+16]],l%2?'#3c886c':'#2d795b');}
 }
}
function cliff(g,w,h,cam,t){
 // Distant waterfall tucked to the right of the valley, behind the editable terrain.
 const offset=cam*.11,cliffX=w*.90+Math.sin(offset/400)*25,cliffY=h*.71;
 const end=Math.min(h,cliffY+h*.23);
 for(let i=0;i<4;i++){
  const x=cliffX+i*21,y=cliffY-(i%2)*11;
  rect(g,x,y,24,end-y,'#577e78');rect(g,x,y,24,5,'#6ba75c');
  rect(g,x+5,y+8,12,end-y,'#496d7c');
  for(let k=0;k<5;k++)rect(g,x+hash(i,k,4)*19,y+11+k*16,5,3,'#96b9b58a');
 }
 const wx=cliffX+35;
 g.save();g.globalAlpha=.55;
 const fall=g.createLinearGradient(wx,cliffY,wx+20,end);
 fall.addColorStop(0,'#e4ffff');fall.addColorStop(.5,'#72d9ef');fall.addColorStop(1,'#b2edff');
 g.fillStyle=fall;g.fillRect(wx,cliffY,17,end-cliffY);
 g.fillStyle='#eafbff';
 for(let i=0;i<3;i++)g.fillRect(wx+3+i*6,cliffY+((t*14+i*28)%70),2,12);
 g.restore();
}
function background(g,o){
 const w=o.w,h=o.h,t=o.time||0,pan=o.camX||0;
 g.save();g.setTransform(o.dpr*o.zoom,0,0,o.dpr*o.zoom,0,0);
 const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#0678dd');sky.addColorStop(.42,'#5cc7f8');sky.addColorStop(.78,'#c2f4fe');sky.addColorStop(1,'#f4e6b8');g.fillStyle=sky;g.fillRect(0,0,w,h);
 sun(g,w*.59,h*.19,18,t);
 for(let i=0;i<9;i++){const x=((i*151-pan*.09+t*(i%3+1)*.28)%(w+320)+(w+320))%(w+320)-150,y=h*(.14+.29*hash(i,0,9));cloud(g,x,y,21+hash(i,2,15)*28,.55+.38*hash(i,6,3));}
 mountains(g,w,h,pan,t);distantTrees(g,w,h,pan,t);cliff(g,w,h,pan,t);
 const haze=g.createLinearGradient(0,h*.56,0,h);haze.addColorStop(0,'#daebff00');haze.addColorStop(1,'#9fd3e550');g.fillStyle=haze;g.fillRect(0,h*.55,w,h*.45);
 g.restore();
}
function caveBackdrop(g,o){
 const {surface,camX,camY,tileSize:T,w,h}=o;
 const start=clamp(Math.floor(camX/T)-1,0,surface.length-1);
 const stop=clamp(Math.ceil((camX+w)/T)+1,0,surface.length-1);
 const dark=g.createLinearGradient(0,Math.min(h*.60,h),0,h);
 dark.addColorStop(0,'#304f69');dark.addColorStop(.48,'#1c344e');dark.addColorStop(1,'#0a192c');
 g.save();
 for(let x=start;x<=stop;x++){
  const sx=x*T-camX,y=surface[x]*T-camY;
  if(y>=h)continue;
  g.fillStyle=dark;g.fillRect(sx,Math.max(-1,y),T+1,h-Math.max(-1,y));
  // Low-frequency mineral striations only appear through mined-out cave gaps.
  if(hash(x,9,17)>.64){
   g.globalAlpha=.16;
   rect(g,sx+4,y+58,19,3,'#87b0be');
   g.globalAlpha=1;
  }
 }
 g.restore();
}
function embellish(g,o){
 const {world,surface,camX,camY,tileSize,w,h,time}=o,T=tileSize;
 const start=clamp(Math.floor(camX/T)-1,0,surface.length-1),stop=clamp(Math.ceil((camX+w)/T)+1,0,surface.length-1);
 g.save();
 for(let x=start;x<=stop;x++){
  const sy=surface[x],id=world[sy]?.[x],wx=x*T-camX,wy=sy*T-camY;
  if(wy< -90||wy>h+75||!id||![1,6,16].includes(id))continue;
  const k=hash(x,5,7);
  if(k>.22){
   // Reeds, animated bright-tipped grass and moss strands at the actual ground surface.
   const sway=Math.sin(time*1.5+x*.89)*2;
   g.strokeStyle=id===16?'#b7dcf0':'#287c32';g.lineWidth=2;
   for(let i=0;i<3;i++){g.beginPath();g.moveTo(wx+9+i*10,wy+3);g.lineTo(wx+7+i*10+sway,wy-8-(i%2)*6);g.stroke();}
   g.fillStyle=id===16?'#f3faff':'#85ef54';g.fillRect(wx+8+sway,wy-14,4,4);
  }
  if(k>.79){
   const fx=wx+24,fy=wy-10;
   g.strokeStyle='#2c8643';g.lineWidth=2;g.beginPath();g.moveTo(fx,fy+9);g.lineTo(fx,fy-2);g.stroke();
   g.fillStyle=k>.9?'#f8bc53':'#fff9ee';
   for(let i=0;i<5;i++){const a=i*twopi/5;g.fillRect(fx+Math.cos(a)*5-3,fy+Math.sin(a)*5-3,6,6);}
   rect(g,fx-2,fy-2,5,5,'#ffcb49');
  }
  // Glowing warm torches are environmental decorations only; the tile below remains editable.
  if(hash(x,6,9)>.986&&id===1){
   rect(g,wx+19,wy-30,4,29,'#6c4025');rect(g,wx+17,wy-32,9,12,'#f48c25');rect(g,wx+20,wy-35,5,9,'#fff7aa');
   const light=g.createRadialGradient(wx+22,wy-28,3,wx+22,wy-28,42);
   light.addColorStop(0,'#ffec9a65');light.addColorStop(1,'#ffac3e00');g.fillStyle=light;g.fillRect(wx-20,wy-70,84,84);
  }
 }
 // Real, mineable ore deposits emit soft coloured light in deep cave layers.
 const firstY=clamp(Math.floor(camY/T)-1,0,world.length-1),lastY=clamp(Math.ceil((camY+h)/T)+1,0,world.length-1);
 for(let y=firstY;y<=lastY;y++)for(let x=start;x<=stop;x++){
  const id=world[y]?.[x];if(![17,18,22,23].includes(id))continue;
  const cx=x*T-camX+T*.5,cy=y*T-camY+T*.5;
  const tint=id===18?'#4cf0ff':id===17?'#ffe18f':id===22?'#53ffad':'#5c92ff';
  g.save();g.globalCompositeOperation='screen';
  const light=g.createRadialGradient(cx,cy,1,cx,cy,39);
  light.addColorStop(0,tint+'a0');light.addColorStop(.32,tint+'46');light.addColorStop(1,tint+'00');
  g.fillStyle=light;g.fillRect(cx-39,cy-39,78,78);
  const sparkle=Math.sin(time*2.9+x*3+y*4);
  if(sparkle>.83){g.fillStyle='#fff';g.fillRect(cx-1,cy-5,2,10);g.fillRect(cx-5,cy-1,10,2);}
  g.restore();
 }
 g.restore();
}
function shadow(g,x,y,w){
 g.fillStyle='#10223155';g.beginPath();g.ellipse(x+w/2,y+2,w*.65,4,0,0,twopi);g.fill();
}
function pickaxe(g,x,y,flip){
 g.save();g.translate(x,y);g.scale(flip,1);g.rotate(-.28);
 rect(g,-1,-13,4,25,'#563321');rect(g,0,-12,2,24,'#b77f42');
 path(g,[[-11,-13],[-9,-18],[0,-22],[10,-20],[14,-15],[5,-17],[-5,-16]],'#e1f2f8');
 rect(g,-4,-19,8,3,'#6e8aa0');g.restore();
}
function character(g,p,i,o){
 const x=Math.round(p.renderX-o.camX),y=Math.round(p.renderY-o.camY),w=p.w,h=p.h;
 if(x< -70||x>o.w+70||y< -75||y>o.h+80)return;
 const walk=Math.sin(p.walk||0)*Math.min(3,Math.abs(p.vx||0)*.05),fl=p.facing===-1?-1:1;
 g.save();shadow(g,x,y+h,w);
 // Pixel characters occupy exact collision-space feet with a bit of decorative silhouette.
 rect(g,x+4,y+27+walk,7,11-walk,'#2a3348');rect(g,x+w-11,y+27-walk,7,11+walk,'#273249');
 rect(g,x+3,y+34+walk,10,4,'#493025');rect(g,x+w-13,y+34-walk,10,4,'#493025');
 rect(g,x+2,y+15,w-4,16,i===0?'#159edb':'#37b75b');
 rect(g,x+2,y+16,4,13,i===0?'#76e5ff':'#8aed92');
 rect(g,x+w-6,y+16,4,13,i===0?'#0b5185':'#187c42');
 rect(g,x+4,y+5,w-8,13,'#ffc895');rect(g,x+3,y+4,w-6,5,i===0?'#3c241b':'#73431e');
 rect(g,x+4,y+1,w-9,5,i===0?'#4a3023':'#9c602a');
 rect(g,x+2,y+12,4,9,'#ce8c6d');
 const ex=fl===1?x+w-9:x+6;
 rect(g,ex,y+10,4,4,'#172c40');rect(g,ex+1,y+11,1,1,'#fff');
 if(i===0){rect(g,ex-1,y+14,6,3,'#623d30');rect(g,x+8,y+17,8,3,'#4a3125');}
 rect(g,x+w-3,y+18,5,8,'#e4a77b');
 pickaxe(g,x+w/2+fl*14,y+20,fl);
 g.font='800 10px system-ui';g.textAlign='center';g.lineWidth=2.5;g.strokeStyle='#08283c';g.strokeText(p.name,x+w/2,y-10);
 g.fillStyle='#fff';g.fillText(p.name,x+w/2,y-10);
 if(o.active===i){g.strokeStyle='#84f4ff';g.lineWidth=1.7;g.strokeRect(x-3,y-3,w+6,h+6);}
 g.restore();
}
function creature(g,c,o){
 const x=c.x-o.camX,y=c.y-o.camY+Math.sin(c.phase||0)*2;
 if(x< -45||x>o.w+45||y< -35||y>o.h+45)return;
 const type=c.c%4;
 g.save();shadow(g,x,y+17,18);
 if(type===3){
  rect(g,x,y-4,22,22,'#278b41');rect(g,x+3,y,16,10,'#48dd50');
  rect(g,x+4,y+3,5,5,'#0a302b');rect(g,x+14,y+3,5,5,'#0a302b');
  rect(g,x+8,y+11,7,4,'#0a302b');rect(g,x+6,y+15,5,4,'#0a302b');rect(g,x+14,y+15,5,4,'#0a302b');
 }else if(type===1){
  rect(g,x,y+2,23,13,'#8f5a3c');rect(g,x+3,y,13,9,'#faf2d9');rect(g,x+15,y+5,12,9,'#f4e7d0');
  rect(g,x+4,y+13,3,7,'#6d4331');rect(g,x+18,y+13,3,7,'#6d4331');
  rect(g,x+20,y+8,3,3,'#2b2d31');rect(g,x+9,y+4,7,6,'#754b39');
 }else if(type===2){
  rect(g,x,y+7,20,12,'#74dcd1');rect(g,x+4,y,13,11,'#3abcb0');rect(g,x+6,y+5,3,3,'#103c4a');rect(g,x+13,y+5,3,3,'#103c4a');
 }else{
  rect(g,x+1,y+5,20,14,'#85b872');rect(g,x+4,y+2,14,8,'#b9df91');rect(g,x+7,y+7,3,3,'#2e463c');rect(g,x+15,y+7,3,3,'#2e463c');
 }
 g.restore();
}
function foreground(g,o){
 const {w,h,time}=o;
 g.save();
 // Tiny moving fireflies and atmospheric sunlight particles, reduced at low quality.
 g.globalCompositeOperation='screen';
 for(let i=0;i<17;i++){
  const x=(hash(i,5,3)*w+Math.sin(time*(.3+hash(i,1,8)) + i)*22+w)%w;
  const y=(hash(i,6,4)*h+Math.cos(time*.4+i)*18+h)%h;
  g.globalAlpha=.16+.20*(.5+.5*Math.sin(time*2+i));
  rect(g,x,y,2,2,i%3?'#d4ff9c':'#ffee9d');
 }
 g.globalAlpha=1;g.restore();
}
window.BlockWorldArt=Object.freeze({tile,background,caveBackdrop,embellish,character,creature,foreground});
})();
