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
/* Adjacent soil and rock form seamless autotiled surfaces. Decorative variations
   are cached by material, exposed edges, and deterministic position variants. */
const terrainCache=new Map();
let quality='cinematic';
const sameMaterial=(a,b)=>{
 if(!a||!b)return false;
 const group=n=>[1,2].includes(n)?1:([3,8,9,10,11,14,17,18,21,22,23,24].includes(n)?3:n);
 return group(a)===group(b);
};
function terrain(world,id,x,y){
 const up=world[y-1]?.[x]||0,down=world[y+1]?.[x]||0,left=world[y]?.[x-1]||0,right=world[y]?.[x+1]||0;
 const joins=(sameMaterial(id,up)?1:0)|(sameMaterial(id,right)?2:0)|
  (sameMaterial(id,down)?4:0)|(sameMaterial(id,left)?8:0);
 const variant=Math.floor(hash(x,y,id+801)*3);
 const k=id+':'+joins+':'+variant;
 if(terrainCache.has(k))return terrainCache.get(k);
 const c=document.createElement('canvas');c.width=c.height=32;
 const g=c.getContext('2d');if(!g)return tile(id);
 g.drawImage(tile(id),0,0);
 // Remove repeated cube outlines only on joined sides.
 const main=[1,2].includes(id)?['#81512f','#9e6a42','#7d4d31'][variant]:
  [3,8,9,10,11,17,18,21,22,23,24].includes(id)?['#798793','#8996a1','#71808b'][variant]:null;
 if(main){
  if(joins&8)rect(g,0,2,2,28,main);
  if(joins&2)rect(g,30,2,2,28,main);
  if(joins&1&&id!==1)rect(g,2,0,28,2,main);
  if(joins&4)rect(g,2,30,28,2,main);
 }
 if(id===1){
  // Grass fringe follows open cliff edges but never changes block collision.
  if(!(joins&8)){rect(g,0,3,3,8,'#48912d');rect(g,2,9,2,5,'#3e812d');}
  if(!(joins&2)){rect(g,29,2,3,9,'#5aa637');rect(g,29,11,2,4,'#3a812c');}
  if(up===0){
   for(let i=0;i<5;i++){const px=3+i*6,hh=2+Math.floor(hash(x,y,i)*6);
    rect(g,px,0,2,hh,i%2?'#c8ef69':'#82d94c');
   }
  }
 }else if(id===3||id===8){
  if(!(joins&1))rect(g,4,0,20,2,'#d0d9df55');
  if(!(joins&4))rect(g,3,29,25,2,'#2137495a');
  if(variant===2){rect(g,9,9,10,2,'#33495945');rect(g,17,11,2,7,'#33495945');}
 }else if(id===2){
  if(variant===1){rect(g,5,8,6,2,'#54382880');rect(g,11,9,2,7,'#54382860');}
  if(variant===2){rect(g,20,18,7,2,'#c7986580');}
 }
 if(terrainCache.size>600)terrainCache.clear();
 terrainCache.set(k,c);return c;
}
function setQuality(v){
 quality=v==='balanced'?'balanced':'cinematic';
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
/* Forest backdrop is biome-aware. Every silhouette is fixed to world
   coordinates so it scrolls naturally instead of sliding across the screen. */
function forestBackdrop(g,w,h,cam,t){
 const spacing=106,scroll=cam*.12,offset=((scroll%spacing)+spacing)%spacing;
 for(let i=-2;i<Math.ceil(w/spacing)+3;i++){
  const ix=Math.floor(scroll/spacing)+i,x=i*spacing-offset;
  const y=h*.80+hash(ix,4,1)*23,ht=50+hash(ix,7,2)*40;
  const thick=9+Math.floor(hash(ix,3,7)*5);
  rect(g,x,y-ht,thick,h-y+ht,'#376a6a');
  // Conifer silhouettes in three tiers create near/mid/far depth.
  for(let tier=0;tier<3;tier++){
   const yy=y-ht+12+tier*17,ww=24+tier*10+hash(ix,tier,11)*15;
   path(g,[[x+thick/2,yy-23],[x-ww/2,yy+16],
    [x+thick/2,yy+7],[x+thick/2+ww/2,yy+16]],
    tier%2?'#307968':'#399a75');
   rect(g,x-2,yy+11,thick+4,3,'#35775a');
  }
  if(hash(ix,9,4)>.72){
   const cy=y-ht+13;
   rect(g,x-14,cy,5,18,'#557b67');rect(g,x-22,cy-2,21,5,'#54a77b');
  }
 }
 // Slender animated sunbeams between the trees.
 if(quality==='cinematic'){
  g.save();g.globalAlpha=.11;g.fillStyle='#fff8c3';
  for(let i=0;i<3;i++){
   const x=(i*237-scroll*.4+900)%Math.max(1,w);
   path(g,[[x-6,h*.27],[x+9,h*.25],[x+58,h*.87],[x+11,h*.87]],'#fff3ba');
  }
  g.restore();
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

/* Forest atmosphere: depth layers are deterministic and follow the camera,
   while cinematic effects can be disabled by the existing graphics preset. */
function forestAtmosphere(g,w,h,pan,t){
 const layers=quality==='balanced'?1:3;
 for(let layer=0;layer<layers;layer++){
  const speed=[.14,.27,.43][layer],spacing=[112,83,64][layer];
  const baseline=h*(.80+layer*.055);
  const offset=((pan*speed)%spacing+spacing)%spacing;
  const count=Math.ceil(w/spacing)+3;
  g.save();
  g.globalAlpha=[.18,.20,.16][layer];
  for(let i=-1;i<count;i++){
   const index=Math.floor(pan*speed/spacing)+i;
   const x=i*spacing-offset;
   const height=(.14+hash(index,layer,62)*.16)*h;
   const top=baseline-height;
   g.fillStyle=['#2d7b89','#196d79','#14586b'][layer];
   g.fillRect(x+spacing*.44,top+height*.38,Math.max(4,spacing*.11),height*.64);
   g.beginPath();
   g.ellipse(x+spacing*.5,top+height*.3,spacing*(.36+hash(index,4,31)*.11),height*.35,0,0,twopi);
   g.fill();
   if(quality==='cinematic'){
    g.fillStyle='#b7f7d0';
    g.globalAlpha=.045;
    g.beginPath();g.ellipse(x+spacing*.35,top+height*.2,spacing*.17,height*.14,0,0,twopi);g.fill();
    g.globalAlpha=[.18,.20,.16][layer];
   }
  }
  g.restore();
 }
 if(quality!=='cinematic')return;
 // Low-opacity sunlight shafts behind terrain, not over characters or controls.
 g.save();g.globalCompositeOperation='screen';
 for(let i=0;i<3;i++){
  const x=w*(.18+i*.34)+Math.sin(t*.10+i)*12;
  const ray=g.createLinearGradient(x-75,0,x+105,h*.85);
  ray.addColorStop(0,'#fff8b900');ray.addColorStop(.5,'#fff2af12');ray.addColorStop(1,'#f3eaa000');
  g.fillStyle=ray;g.beginPath();g.moveTo(x-9,h*.12);g.lineTo(x+16,h*.12);g.lineTo(x+110,h*.88);g.lineTo(x-88,h*.88);g.closePath();g.fill();
 }
 g.restore();
}

function background(g,o){
 const w=o.w,h=o.h,t=o.time||0,pan=o.camX||0;
 g.save();g.setTransform(o.dpr*o.zoom,0,0,o.dpr*o.zoom,0,0);
 const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#0678dd');sky.addColorStop(.42,'#5cc7f8');sky.addColorStop(.78,'#c2f4fe');sky.addColorStop(1,'#f4e6b8');g.fillStyle=sky;g.fillRect(0,0,w,h);
 sun(g,w*.59,h*.19,18,t);
 for(let i=0;i<(quality==='balanced'?5:9);i++){const x=((i*151-pan*.09+t*(i%3+1)*.28)%(w+320)+(w+320))%(w+320)-150,y=h*(.14+.29*hash(i,0,9));cloud(g,x,y,21+hash(i,2,15)*28,.55+.38*hash(i,6,3));}
 mountains(g,w,h,pan,t);
 if(o.biome===1){forestBackdrop(g,w,h,pan,t);distantTrees(g,w,h,pan,t);}
 else distantTrees(g,w,h,pan,t);
 cliff(g,w,h,pan,t);
 forestAtmosphere(g,w,h,pan,t);
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
  if(quality==='cinematic'&&k>.54&&k<.69&&id===1){
   const bx=wx+10,by=wy-3;
   g.fillStyle='#275b36';g.fillRect(bx-5,by-4,3,5);g.fillRect(bx+4,by-7,3,8);
   g.fillStyle='#76cf64';g.fillRect(bx-7+Math.sin(time+x)*1.5,by-9,5,6);g.fillRect(bx+2-Math.sin(time*.8+x)*1.5,by-12,6,6);
  }
  if(hash(x,6,9)>.986&&id===1){
   rect(g,wx+19,wy-30,4,29,'#6c4025');rect(g,wx+17,wy-32,9,12,'#f48c25');rect(g,wx+20,wy-35,5,9,'#fff7aa');
   const light=g.createRadialGradient(wx+22,wy-28,3,wx+22,wy-28,42);
   light.addColorStop(0,'#ffec9a65');light.addColorStop(1,'#ffac3e00');g.fillStyle=light;g.fillRect(wx-20,wy-70,84,84);
  }
 }
 // Forest-only detail layer: fallen leaves, mushrooms, ferns and a trail sign.
 // These sit on the real surface but don't introduce invisible collision geometry.
 for(let x=start;x<=stop;x++){
  const zone=Math.floor(x/36);
  if(zone!==1||world[surface[x]]?.[x]!==1)continue;
  const wx=x*T-camX,wy=surface[x]*T-camY,seed=hash(x,83,9);
  if(wy<0||wy>h+30)continue;
  if(seed>.38&&seed<.72){
   const fx=wx+12,fy=wy;
   rect(g,fx,fy-9,3,9,'#2a784c');
   rect(g,fx-8,fy-12,10,4,'#4aa86a');
   rect(g,fx+1,fy-17,8,4,'#82d98b');
   rect(g,fx-5,fy-23,3,6,'#5abb70');
  }
  if(seed>.79&&seed<.94){
   const mx=wx+20,my=wy-2;
   rect(g,mx,my-11,4,10,'#f6dfae');
   rect(g,mx-6,my-12,16,5,'#e45955');
   rect(g,mx-3,my-15,11,4,'#f27e58');
   rect(g,mx+2,my-13,3,2,'#fff7db');
  }
  if(quality==='cinematic'&&hash(x,9,31)>.82){
   const px=wx+8+hash(x,4,6)*17,py=wy-14+Math.sin(time*1.2+x)*6;
   rect(g,px,py,3,3,'#f6d85e');rect(g,px-3,py-2,3,3,'#b0f0e7');
  }
 }
 if(start<=68&&stop>=68&&world[surface[68]]?.[68]===1){
  const sx=68*T-camX,sy=surface[68]*T-camY;
  rect(g,sx+15,sy-57,5,58,'#80542d');rect(g,sx-17,sy-60,65,28,'#704628');
  rect(g,sx-14,sy-57,59,22,'#bd8551');rect(g,sx-11,sy-55,53,2,'#f4c781');
  g.font='bold 8px system-ui';g.textAlign='center';g.fillStyle='#fef3bc';
  g.fillText('OUR FOREST',sx+15,sy-43);
  rect(g,sx-11,sy-38,18,2,'#ecd397');
 }
 // Real, mineable ore deposits emit soft coloured light in deep cave layers.
 const firstY=clamp(Math.floor(camY/T)-1,0,world.length-1),lastY=clamp(Math.ceil((camY+h)/T)+1,0,world.length-1);
 for(let y=firstY;y<=lastY;y++)for(let x=start;x<=stop;x++){
  const id=world[y]?.[x];if(quality==='balanced'||![17,18,22,23].includes(id))continue;
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
/* A small deterministic sprite atlas keeps detailed hero animations inexpensive.
   Both characters share the same silhouette and movements, with their own colours. */
const heroSprites=new Map();
function heroSprite(i,pose,frame){
 const key=i+':'+pose+':'+frame;
 if(heroSprites.has(key))return heroSprites.get(key);
 const canvas=document.createElement('canvas');canvas.width=32;canvas.height=48;
 const g=canvas.getContext('2d');if(!g)return canvas;
 const bob=pose==='run'?(frame%2?1:-1):pose==='idle'?(frame===2?1:0):0;
 const leg=pose==='run'?[0,4,-2,3][frame]:pose==='jump'?-3:pose==='fall'?2:0;
 const hoodie=i===0?'#148cc5':'#36b86a',highlight=i===0?'#58d7f8':'#83ef91';
 const dark=i===0?'#14527f':'#207b4c';
 // Boots and animated legs.
 rect(g,7,33+leg,7,10-leg,'#30445f');rect(g,19,33-leg,7,10+leg,'#273951');
 rect(g,5,41+leg,11,4,'#46382b');rect(g,18,41-leg,11,4,'#48382c');
 rect(g,8,33+leg,3,7-leg,'#6e87a6');rect(g,20,33-leg,3,7+leg,'#6385a4');
 // Shirt, backpack, arms, badge and belt.
 rect(g,4,18+bob,24,18,'#082c42');
 rect(g,7,17+bob,19,18,hoodie);rect(g,7,18+bob,4,14,highlight);
 rect(g,22,18+bob,4,14,dark);
 rect(g,9,29+bob,16,3,'#1a3e56');
 rect(g,15,29+bob,5,3,'#f3c96b');
 rect(g,4,19+bob,4,14,'#ecb38b');rect(g,25,19+bob,4,14,'#edbc8d');
 rect(g,10,20+bob,13,6,i===0?'#dce9f6':'#ddfbde');
 rect(g,14,20+bob,4,5,i===0?'#236cad':'#2b8b50');
 // Face, brows, nose and smile.
 rect(g,7,5+bob,19,15,'#ffcc9f');
 rect(g,8,8+bob,3,10,'#e0a175');
 rect(g,24,10+bob,2,8,'#ffe0b8');
 rect(g,11,11+bob,5,2,'#68412e');
 rect(g,20,11+bob,4,2,'#68412e');
 rect(g,13,13+bob,3,4,'#142e41');
 rect(g,21,13+bob,3,4,'#142e41');
 rect(g,14,14+bob,1,1,'#fff');rect(g,22,14+bob,1,1,'#fff');
 rect(g,17,17+bob,4,1,'#b9785c');
 rect(g,17,18+bob,3,1,'#914a46');
 // Hair styles: Dad has a short dark swept cut; Jo has a light fringe.
 if(i===0){
  rect(g,6,4+bob,22,6,'#38291f');rect(g,7,9+bob,4,3,'#38291f');
  rect(g,10,2+bob,15,3,'#5b3a26');rect(g,15,5+bob,11,2,'#67432d');
  rect(g,12,17+bob,4,2,'#9d6e58');rect(g,21,17+bob,2,2,'#9d6e58');
 }else{
  rect(g,6,5+bob,22,5,'#77451f');rect(g,7,3+bob,19,3,'#a36b36');
  rect(g,9,9+bob,5,3,'#77451f');rect(g,17,7+bob,7,3,'#b17c47');
 }
 // Gloved tool hand for resource gathering.
 if(pose==='mine'||pose==='attack'){
  rect(g,25,26+bob,5,5,i===0?'#f4d182':'#9ce5d2');
 }
 if(pose==='jump')rect(g,3,17+bob,6,5,'#ffc899');
 if(pose==='fall')rect(g,3,25+bob,6,5,'#ffc899');
 if(heroSprites.size>70)heroSprites.clear();
 heroSprites.set(key,canvas);return canvas;
}
function character(g,p,i,o){
 const x=p.renderX-o.camX,y=p.renderY-o.camY,w=p.w,h=p.h;
 if(x< -70||x>o.w+70||y< -70||y>o.h+70)return;
 const anim=p.actionT>0?p.action||'mine':!p.ground?(p.vy<0?'jump':'fall'):(Math.abs(p.vx)>5?'run':'idle');
 const frame=anim==='run'?Math.abs(Math.floor((p.walk||0)*.55))%4:Math.floor((o.time||0)*2.3)%4;
 const fl=p.facing===-1?-1:1;
 const scale=1.0;
 const px=Math.round(x+w/2),feet=Math.round(y+h);
 g.save();
 shadow(g,x-2,feet,w+4);
 if(o.active===i){
  g.strokeStyle='#8df7ff';g.lineWidth=2;g.beginPath();
  g.ellipse(px,feet+3,w*.75,5,0,0,twopi);g.stroke();
 }
 g.translate(px,feet);g.scale(fl*scale,scale);
 g.drawImage(heroSprite(i,anim,frame),-16,-47);
 if(anim==='mine'||anim==='attack'){
  g.save();g.rotate((-0.34+Math.sin((1-(p.actionT||0)) *17)*.42));
  pickaxe(g,19,-23,1);g.restore();
 }else{
  pickaxe(g,20,-15,1);
 }
 g.restore();
 g.save();
 const label=p.name|| (i===0?'Daddy':'Jozef');
 g.font='900 10px system-ui';g.textAlign='center';g.lineWidth=2.5;
 g.strokeStyle='#092a3ed8';g.strokeText(label,px,y-12);
 g.fillStyle='#f6fcff';g.fillText(label,px,y-12);
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
 for(let i=0;i<(quality==='balanced'?5:17);i++){
  const x=(hash(i,5,3)*w+Math.sin(time*(.3+hash(i,1,8)) + i)*22+w)%w;
  const y=(hash(i,6,4)*h+Math.cos(time*.4+i)*18+h)%h;
  g.globalAlpha=.16+.20*(.5+.5*Math.sin(time*2+i));
  rect(g,x,y,2,2,i%3?'#d4ff9c':'#ffee9d');
 }
 g.globalAlpha=1;g.restore();
}
window.BlockWorldArt=Object.freeze({tile,terrain,setQuality,getQuality:()=>quality,background,caveBackdrop,embellish,character,creature,foreground});
})();
