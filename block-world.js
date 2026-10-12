/* Daddy & Jozef Block World gameplay — 2026 */

(function(){
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
if(!ctx){$('health').textContent='This browser needs Canvas 2D';return;}
const TILE=40,W=180,H=72,KEY='jozefs-world-block-v3';
const names=['Air','Grass','Dirt','Stone','Wood','Leaves','Sand','Planks','Cobblestone','Gravel','Coal Ore','Iron Ore','Glass','Water','Bedrock','Clay','Snow','Gold Ore','Diamond Ore','Stick','Furnace','Copper Ore','Emerald Ore','Lapis Ore','Redstone Ore','Coal','Iron Ingot','Gold Ingot','Copper Ingot','Emerald','Lapis','Redstone'];
const colors=['#000','#6ab553','#936039','#7c8994','#805231','#43834c','#e3c77d','#ba854f','#7a828b','#a7a4a0','#697780','#677b90','#a7eaf4','#369bc1','#31343c','#a88a77','#eef5fd','#a68956','#518baf','#ad8653','#646979','#9d7050','#6ca77b','#627caa','#885b65'];
const solid=id=>id!==0&&id!==5&&id!==13;
const blockable=[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17,18,20,21,22,23,24];
const hotItems=[2,3,4,7,8,6,12,20];
let cssW=0,cssH=0,dpr=1,world=[],surface=[],creative=true,active=0,selected=2;
let focus=null,camX=0,camY=0,clock=0,ticks=0,dirty=false,saveTimer=0;
let noticeEnd=0,recipeIndex=0,craftingOpen=false,actionCooldown=0,lastTime=performance.now(),acc=0;
const touch={left:false,right:false,jump:false};
const down=new Set();
const textures={};
const players=[
 {name:'Daddy',x:0,y:0,vx:0,vy:0,w:22,h:39,ground:false,facing:1,health:100,inventory:{},walk:0},
 {name:'Jozef',x:0,y:0,vx:0,vy:0,w:21,h:35,ground:false,facing:1,health:100,inventory:{},walk:0}
];
const recipes=[
 {name:'Planks ×4',needs:{4:1},makes:{7:4}},
 {name:'Sticks ×4',needs:{7:2},makes:{19:4}},
 {name:'Cobblestone Furnace',needs:{8:8},makes:{20:1}},
 {name:'Glass ×2',needs:{6:2,25:1},makes:{12:2}},
 {name:'Iron Ingot',needs:{11:1,25:1},makes:{26:1}},
 {name:'Gold Ingot',needs:{17:1,25:1},makes:{27:1}},
 {name:'Copper Ingot',needs:{21:1,25:1},makes:{28:1}}
];
function resize(){
 cssW=window.innerWidth||800;cssH=window.innerHeight||600;dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.floor(cssW*dpr);canvas.height=Math.floor(cssH*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
}
resize();addEventListener('resize',resize);
function rand(x,y,z=0){let v=Math.imul(x+z*13,374761393)+Math.imul(y+17,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;}
function tex(id){
 if(textures[id])return textures[id];
 const c=document.createElement('canvas');c.width=c.height=32;
 const g=c.getContext('2d');const main=colors[id]||'#898989';g.fillStyle=main;g.fillRect(0,0,32,32);
 if(id===1){g.fillStyle='#5b3f2f';g.fillRect(0,9,32,23);g.fillStyle='#73ca62';g.fillRect(0,0,32,9);}
 if(id===4){for(let k=0;k<4;k++){g.fillStyle=k%2?'#5e3c24':'#a47040';g.fillRect(0,k*8,32,2);}}
 if(id===7){g.fillStyle='#66462b';for(let k=0;k<4;k++)g.fillRect(0,k*9,32,2);g.fillRect(16,0,2,32);}
 if([10,11,17,18,21,22,23,24].includes(id)){g.fillStyle='#63747f';g.fillRect(0,0,32,32);}
 if(id===12){g.fillStyle='#bbf8ff';g.globalAlpha=.6;g.fillRect(3,3,26,26);g.globalAlpha=1;g.fillStyle='#f8ffff';g.fillRect(5,5,3,20);}
 if(id===20){g.fillStyle='#171f2c';g.fillRect(6,8,20,17);g.fillStyle='#f4a438';g.fillRect(10,17,12,5);}
 let fleck=id===1?'#439943':id===2?'#b68b57':id===5?'#79b963':id===6?'#f8e5a7':id===4?'#b38355':'#b2b9b5';
 if([10,11,17,18,21,22,23,24].includes(id)){fleck=({10:'#252a31',11:'#c3a5a0',17:'#f3c957',18:'#7bdef0',21:'#dc975e',22:'#49e49b',23:'#5b90f3',24:'#df5759'})[id];}
 if(id!==12){for(let n=0;n<37;n++){const x=Math.floor(rand(id,n)*31),y=Math.floor(rand(id,n,5)*30);g.globalAlpha=.28+rand(id,n,8)*.5;g.fillStyle=n%4===0?'#17242f':fleck;g.fillRect(x,y,2+Math.floor(rand(id,n,1)*4),2+Math.floor(rand(id,n,2)*3));}g.globalAlpha=1;}
 g.fillStyle='#00000024';g.fillRect(0,30,32,2);g.fillRect(30,0,2,32);
 textures[id]=c;return c;
}
function say(message,duration=2100){const el=$('notice');el.textContent=message;el.classList.add('visible');noticeEnd=performance.now()+duration;}
function get(x,y){return x<0||x>=W||y>=H?14:y<0?0:world[y][x];}
function set(x,y,id){if(x<0||x>=W||y<0||y>=H||get(x,y)===14)return false;world[y][x]=id;dirty=true;queueSave();return true;}
function generate(){
 world=Array.from({length:H},()=>Array(W).fill(0));surface=new Array(W);
 for(let x=0;x<W;x++){
  const top=Math.max(31,Math.min(48,Math.floor(38+Math.sin(x*.075)*4+Math.sin(x*.23)*1.7)));
  surface[x]=top;
  for(let y=top;y<H;y++){
   let id=y===top?1:y<top+4?2:3;
   if(y>top+5){const r=rand(x,y);if(r<.075)id=8;if(r>.960)id=10;if(y>top+10&&r>.986)id=11;if(y>top+15&&r>.993)id=21;if(y>top+20&&r>.996)id=17;if(y>top+23&&r>.9975)id=18;}
   if(y===H-1)id=14;
   world[y][x]=id;
  }
 }
 for(let i=0;i<55;i++){
  const x=3+Math.floor(rand(i,3)* (W-6)),y=47+Math.floor(rand(i,5)*17),r=1+Math.floor(rand(i,7)*3);
  for(let oy=-r;oy<=r;oy++)for(let ox=-r*2;ox<=r*2;ox++){const xx=x+ox,yy=y+oy;if(xx>=2&&xx<W-2&&yy>surface[xx]+5&&yy<H-2&&((ox/(r*2))**2+(oy/r)**2)<1)world[yy][xx]=0;}
 }
 for(let x=6;x<W-6;x++)if(x<67||x>82){if(rand(x,10)<.10&&get(x,surface[x])===1){
  const trunk=3+Math.floor(rand(x,11)*3),y=surface[x];
  for(let j=1;j<=trunk;j++)world[y-j][x]=4;
  for(let dy=-2;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dy)<4&&rand(x+dx,y+dy,8)>.13&&get(x+dx,y-trunk+dy)===0)world[y-trunk+dy][x+dx]=5;
 }}
 for(let x=65;x<81;x++)for(let y=surface[x]-4;y<surface[x];y++)world[y][x]=0;
}
function initPlayers(){
 [71,74].forEach((x,i)=>{const p=players[i];p.x=x*TILE;p.y=surface[x]*TILE-p.h-.1;p.vx=p.vy=0;p.ground=true;p.facing=1;p.walk=0;p.inventory={};});
 players[0].inventory={2:24,4:12,7:24,6:10,8:15};
 players[1].inventory={2:24,4:12,7:24,6:10,8:15};
}
function readSave(){
 try{
  const raw=localStorage.getItem(KEY);if(!raw)return false;const s=JSON.parse(raw);
  if(s.version!==3||!Array.isArray(s.world)||s.world.length!==H||s.world.some(row=>!Array.isArray(row)||row.length!==W))return false;
  world=s.world;surface=new Array(W);for(let x=0;x<W;x++){let found=38;for(let y=0;y<H;y++)if(world[y][x]===1){found=y;break;}surface[x]=found;}
  creative=!!s.creative;active=s.active===1?1:0;selected=blockable.includes(s.selected)?s.selected:2;
  players.forEach((p,i)=>{const data=s.players?.[i];if(!data)return;p.x=Number.isFinite(data.x)?Math.max(0,Math.min(W*TILE-p.w,data.x)):p.x;p.y=Number.isFinite(data.y)?Math.max(0,Math.min(H*TILE-p.h,data.y)):p.y;p.inventory=data.inventory&&typeof data.inventory==='object'?data.inventory:p.inventory;p.facing=data.facing===-1?-1:1;p.vx=p.vy=0;});
  return true;
 }catch(err){console.warn('Block World save unavailable',err);return false;}
}
function save(){
 if(!dirty)return;
 try{localStorage.setItem(KEY,JSON.stringify({version:3,world,creative,selected,active,players:players.map(p=>({x:p.x,y:p.y,facing:p.facing,inventory:p.inventory}))}));dirty=false;$('save').textContent='Saved ✓';setTimeout(()=>$('save').textContent='Save',1100);}
 catch(err){say('Storage full: progress could not be saved',4000);}
}
function queueSave(){dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(save,1700);}
function collision(p,x,y){
 if(x<0||x+p.w>W*TILE||y+p.h>H*TILE)return true;
 const x0=Math.floor((x+.5)/TILE),x1=Math.floor((x+p.w-.5)/TILE),y0=Math.floor((y+.5)/TILE),y1=Math.floor((y+p.h-.5)/TILE);
 for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++)if(solid(get(xx,yy)))return true;
 return false;
}
function moveAxis(p,delta,axis){
 const steps=Math.ceil(Math.abs(delta)/6)||1,step=delta/steps;
 for(let j=0;j<steps;j++){
  const nx=p.x+(axis==='x'?step:0),ny=p.y+(axis==='y'?step:0);
  if(collision(p,nx,ny)){if(axis==='x')p.vx=0;else{if(step>0)p.ground=true;p.vy=0;}return;}
  p.x=nx;p.y=ny;
 }
}
function update(dt){
 if(craftingOpen)return;
 clock+=dt;actionCooldown=Math.max(0,actionCooldown-dt);
 players.forEach((p,i)=>{
  const left=i===0?down.has('KeyA'):down.has('ArrowLeft');
  const right=i===0?down.has('KeyD'):down.has('ArrowRight');
  const dir=Number(right||(i===active&&touch.right))-Number(left||(i===active&&touch.left));
  p.vx=dir*205;
  if(dir){p.facing=dir;p.walk+=dt*12;}
  if((i===0?down.has('KeyW'):down.has('ArrowUp'))||(i===active&&touch.jump)){
   if(p.ground){p.vy=-430;p.ground=false;}
  }
  p.ground=false;p.vy=Math.min(760,p.vy+1100*dt);
  moveAxis(p,p.vx*dt,'x');moveAxis(p,p.vy*dt,'y');
  if(!p.ground&&collision(p,p.x,p.y+1)){p.ground=true;p.vy=0;}
 });
 ticks++;
 if(ticks%150===0&&players.some(p=>Math.abs(p.vx)>1||Math.abs(p.vy)>1))queueSave();
}
function blockCoords(){const p=players[active];return {x:Math.floor((p.x+p.w/2+p.facing*TILE*1.15)/TILE),y:Math.floor((p.y+p.h*.65)/TILE)};}
function reachable(x,y){const p=players[active];return Math.hypot((x+.5)*TILE-(p.x+p.w/2),(y+.5)*TILE-(p.y+p.h/2))<TILE*4.3;}
function aim(){if(focus&&reachable(focus.x,focus.y))return focus;focus=null;return blockCoords();}
function mine(){
 if(craftingOpen)return;
 const a=aim();let x=a.x,y=a.y,id=get(x,y);
 if(!id){for(let dy=1;dy<=2&&!id;dy++){const test=get(x,y+dy);if(test&&reachable(x,y+dy)){id=test;y+=dy;}}}
 if(!id||id===14){say('Aim at a nearby block to mine');return;}
 if(!reachable(x,y)){say('Move closer to mine');return;}
 if(set(x,y,0)){
  const p=players[active];const drop=({1:2,3:8,10:25,11:11,17:17,18:18,21:21,22:29,23:30,24:31})[id]||id;
  p.inventory[drop]=(p.inventory[drop]||0)+1;
  focus=null;renderHotbar();say('+1 '+names[drop],900);
 }
}
function place(){
 if(craftingOpen)return;
 let a=aim(),x=a.x,y=a.y;
 if(get(x,y)!==0){x+=players[active].facing;if(get(x,y)!==0)y--;}
 if(!reachable(x,y)||get(x,y)!==0||selected===14){say('Aim at an empty nearby space');return;}
 const p=players[active];
 if(!creative&&(p.inventory[selected]||0)<1){say('Mine '+names[selected]+' first');return;}
 if(players.some(q=>x*TILE<q.x+q.w&&x*TILE+TILE>q.x&&y*TILE<q.y+q.h&&y*TILE+TILE>q.y)){say('Cannot build inside a player');return;}
 if(set(x,y,selected)){
  if(!creative)p.inventory[selected]--;
  focus=null;renderHotbar();say('Placed '+names[selected],800);
 }
}
function playerSwitch(){active=1-active;focus=null;dirty=true;renderHotbar();queueSave();say('Playing as '+players[active].name);}
function renderHotbar(){
 const bar=$('hotbar');bar.replaceChildren();const ids=hotItems.includes(selected)?hotItems:[selected,...hotItems.slice(0,7)];
 ids.forEach((id,k)=>{
  const slot=document.createElement('button');slot.className='slot'+(selected===id?' selected':'');slot.type='button';slot.title=names[id];slot.setAttribute('aria-label','Select '+names[id]);slot.setAttribute('aria-pressed',selected===id?'true':'false');
  const img=document.createElement('canvas');img.width=img.height=32;img.getContext('2d').drawImage(tex(id),0,0);
  slot.appendChild(img);
  if(!creative){const count=document.createElement('span');count.className='count';count.textContent=players[active].inventory[id]||'0';slot.appendChild(count);}
  slot.addEventListener('click',()=>{selected=id;focus=null;queueSave();renderHotbar();});
  bar.appendChild(slot);
 });
 $('mode').textContent=creative?'CREATIVE':'SURVIVAL';
 $('health').textContent=players[active].name+' · '+(creative?'Unlimited blocks':'Resources')+'  |  D '+Math.round(players[0].health)+' · J '+Math.round(players[1].health);
}
function ingredientLabel(need){return Object.entries(need).map(([id,n])=>n+' '+names[id]).join(', ');}
function renderCrafting(){
 $('craft-player').textContent='Active: '+players[active].name+' · '+(creative?'Creative':'Survival');
 const list=$('inv-list');list.replaceChildren();
 const p=players[active];const owned=Object.entries(p.inventory).filter(([id,n])=>Number(n)>0).sort((a,b)=>Number(a[0])-Number(b[0]));
 list.textContent=owned.length?owned.map(([id,n])=>names[id]+' ×'+n).join('    •    '):'No resources yet. Mine some nearby blocks.';
 let area=$('recipe-area');
 if(!area){area=document.createElement('div');area.id='recipe-area';area.className='recipe-area';$('craft-player').after(area);}
 area.replaceChildren();
 const label=document.createElement('label');label.textContent='Select recipe';
 const select=document.createElement('select');select.id='recipe';
 recipes.forEach((r,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=r.name+' ('+ingredientLabel(r.needs)+')';select.appendChild(opt);});
 select.value=String(recipeIndex);select.addEventListener('change',()=>{recipeIndex=Number(select.value);renderCrafting();});
 const msg=document.createElement('div');msg.className='panel-info';msg.textContent='Mine blocks to collect materials. Craft planks, sticks, glass, a furnace and metal ingots. Creative mode gives unlimited building blocks.';
 area.append(label,select,msg);
}
function openCrafting(){craftingOpen=true;touch.left=touch.right=touch.jump=false;$('crafting').setAttribute('aria-hidden','false');renderCrafting();}
function closeCrafting(){craftingOpen=false;$('crafting').setAttribute('aria-hidden','true');}
function craftItem(){
 const r=recipes[recipeIndex],p=players[active];
 if(Object.entries(r.needs).some(([id,n])=>(p.inventory[id]||0)<n)){say('Not enough materials: '+ingredientLabel(r.needs));return;}
 for(const [id,n] of Object.entries(r.needs))p.inventory[id]-=n;
 for(const [id,n] of Object.entries(r.makes))p.inventory[id]=(p.inventory[id]||0)+n;
 queueSave();renderCrafting();renderHotbar();say('Crafted '+r.name);
}
function smeltItem(){recipeIndex=4;renderCrafting();say('Select an ingot recipe and press Craft');}
Object.assign(window,{craftItem,smeltItem,closeCrafting});
function drawBackground(){
 const grad=ctx.createLinearGradient(0,0,0,cssH);grad.addColorStop(0,'#4e83d6');grad.addColorStop(.6,'#a4d8ec');grad.addColorStop(1,'#e8dab5');
 ctx.fillStyle=grad;ctx.fillRect(0,0,cssW,cssH);
 const sunX=cssW*.75-Math.sin(clock*.03)*25,sunY=cssH*.22;
 ctx.fillStyle='#ffe8a3';ctx.beginPath();ctx.arc(sunX,sunY,35,0,Math.PI*2);ctx.fill();
 for(let layer=0;layer<3;layer++){
  const offset=camX*(.08+layer*.1),baseline=cssH*.60+layer*58;
  ctx.fillStyle=['#90bad5','#6f9ab7','#507996'][layer];
  ctx.beginPath();ctx.moveTo(0,cssH);ctx.lineTo(0,baseline);
  for(let x=-80;x<cssW+100;x+=48)ctx.lineTo(x,baseline-25-Math.sin((x+offset)/175)*33-Math.sin((x+offset)/74)*13);
  ctx.lineTo(cssW,cssH);ctx.closePath();ctx.fill();
 }
}
let cameraZoom=1;
function draw(){
 ctx.setTransform(dpr*cameraZoom,0,0,dpr*cameraZoom,0,0);ctx.imageSmoothingEnabled=false;
 const viewW=cssW/cameraZoom,viewH=cssH/cameraZoom;
 const p=players[active],goalX=p.x+p.w/2-viewW*.5,goalY=p.y+p.h/2-viewH*.52;
 camX+=(Math.max(0,Math.min(W*TILE-viewW,goalX))-camX)*.14;
 camY+=(Math.max(0,Math.min(H*TILE-viewH,goalY))-camY)*.14;
 drawBackground();
 const sx=Math.max(0,Math.floor(camX/TILE)-1),ex=Math.min(W,Math.ceil((camX+viewW)/TILE)+1);
 const sy=Math.max(0,Math.floor(camY/TILE)-1),ey=Math.min(H,Math.ceil((camY+viewH)/TILE)+1);
 for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++){const id=world[y][x];if(!id)continue;ctx.drawImage(tex(id),Math.round(x*TILE-camX),Math.round(y*TILE-camY),TILE+1,TILE+1);}
 players.forEach((q,i)=>{
  const x=Math.round(q.x-camX),y=Math.round(q.y-camY),bob=q.ground&&Math.abs(q.vx)>5?Math.sin(q.walk)*1.8:0;
  ctx.fillStyle='#14294466';ctx.beginPath();ctx.ellipse(x+q.w/2,y+q.h+1,15,4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=i===0?'#2365d0':'#3d9a55';ctx.fillRect(x+2,y+15+bob,q.w-4,17);
  ctx.fillStyle='#293e5d';ctx.fillRect(x+3,y+30+bob,7,9);ctx.fillRect(x+q.w-10,y+30-bob,7,9);
  ctx.fillStyle='#e8b78d';ctx.fillRect(x+3,y+3+bob,q.w-6,14);
  ctx.fillStyle=i===0?'#49352a':'#714c30';ctx.fillRect(x+2,y+bob,q.w-4,6);
  ctx.fillStyle='#1b2a3b';const eye=q.facing===1?x+q.w-8:x+5;ctx.fillRect(eye,y+9+bob,3,3);
  ctx.fillStyle='#f6fbff';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.shadowColor='#001321';ctx.shadowBlur=4;ctx.fillText(q.name,x+q.w/2,y-8);ctx.shadowBlur=0;
  if(i===active){ctx.strokeStyle='#ffed83';ctx.lineWidth=2;ctx.strokeRect(x-4,y-4,q.w+8,q.h+8);}
 });
 const a=aim();
 if(a.x>=0&&a.x<W&&a.y>=0&&a.y<H&&reachable(a.x,a.y)){ctx.strokeStyle='#ffed7d';ctx.lineWidth=2;ctx.setLineDash([7,4]);ctx.strokeRect(Math.round(a.x*TILE-camX)+2,Math.round(a.y*TILE-camY)+2,TILE-4,TILE-4);ctx.setLineDash([]);}
 if(performance.now()>noticeEnd)$('notice').classList.remove('visible');
}
function frame(now){
 const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;acc+=dt;
 let n=0;while(acc>=1/60&&n<4){update(1/60);acc-=1/60;n++;}
 draw();requestAnimationFrame(frame);
}
function bindButton(id,key,once){
 const el=$('btn-'+id);el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',id==='switch'?'Switch active player':id);
 const press=e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);el.classList.add('pressed');if(once)once();else touch[key]=true;};
 const release=e=>{e.preventDefault();el.classList.remove('pressed');if(key)touch[key]=false;};
 el.addEventListener('pointerdown',press);el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
 el.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(once)once();else touch[key]=true;}});
 el.addEventListener('keyup',e=>{if(key&&(e.code==='Space'||e.code==='Enter'))touch[key]=false;});
}

/* Block World Adventures v4: cooperative objectives, seeded biomes, character
   skills, craft/build templates, exploration, visual effects and safe backups. */
let adventureSeed=Math.floor(Math.random()*999999)+1,questStage=0;
let goals={wood:0,build:0,explore:0,diamond:0,portal:0};
let explored={},teamFollow=true,nightClock=0,weatherType='clear',soundEnabled=false,particles=[];
let friends=[],achievements=[],changedBlocks=[],portalUnlocked=false,season=0,lastWorldX=0;
const Q=[
 ['The Forest Expedition','Collect eight pieces of wood','wood',8],
 ['Our First Headquarters','Place twelve blocks or build a house','build',12],
 ['Explore the New Frontier','Travel to the desert biome','explore',1],
 ['The Hidden Treasure','Mine a diamond ore deep underground','diamond',1],
 ['The Team Portal','Bring both heroes to the portal and activate it','portal',1]
];
const portalX=W-13;
const zoneNames=['Meadow','Forest','Desert','Snowfall Ridge','Crystal Cliffs'];
const biome=x=>Math.min(4,Math.max(0,Math.floor(x/W*5)));
const noise=(x,y,k=0)=>rand(x+adventureSeed%983,y+Math.floor(adventureSeed/983),k);
const tilesForBiome=[1,1,6,16,3];
const advSaveKey='jozef-block-adventure-v4';
function createAdventureUi(){
 const e=document.createElement('style');
 e.textContent='#bw-mission{position:fixed;z-index:14;top:132px;right:8px;max-width:min(245px,42vw);padding:9px 10px;border-radius:12px;border:1px solid #a4d2fa88;background:#0b2339dd;color:#eef8ff;font:11px/1.5 system-ui;pointer-events:none;backdrop-filter:blur(8px)}#bw-mission strong{display:block;color:#fff0a7;font-size:12px}#bw-mission small{opacity:.85}#bw-actions{position:fixed;z-index:17;top:140px;left:max(8px,env(safe-area-inset-left));max-width:54vw;display:flex;flex-wrap:wrap;gap:4px}#bw-actions button{margin:0;background:#092943de;border:1px solid #8fcef07a;padding:7px 9px;border-radius:9px;font:700 10px system-ui;backdrop-filter:blur(8px)}#bw-panel{position:fixed;z-index:31;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,94vw);max-height:78dvh;overflow-y:auto;padding:16px;border-radius:17px;border:1px solid #9ac5e9;background:#10243bf7;color:#eef9ff;font:13px/1.55 system-ui;box-shadow:0 20px 55px #0009}#bw-panel[hidden]{display:none!important}#bw-panel button{padding:10px;border-radius:10px;font-weight:700}#bw-panel p{font-size:12px}#bw-map-canvas{max-width:100%;width:100%;height:100px;image-rendering:pixelated}#bw-mission .progress{height:5px;background:#ffffff44;border-radius:10px;overflow:hidden;margin-top:6px}#bw-mission .progress i{display:block;height:100%;background:#ffe08d}@media(max-width:550px){#bw-mission{top:132px;right:5px;font-size:9px;padding:6px;max-width:43vw}#bw-mission strong{font-size:10px}#bw-actions{top:154px;max-width:53vw}#bw-actions button{padding:6px;font-size:9px}}@media(max-height:470px){#bw-mission{top:5px;right:17%;max-width:23vw}#bw-mission small{display:none}#bw-actions{top:53px}}';
 document.head.appendChild(e);
 const q=document.createElement('aside');q.id='bw-mission';q.setAttribute('aria-live','polite');document.body.appendChild(q);
 const actions=document.createElement('nav');actions.id='bw-actions';actions.setAttribute('aria-label','Adventure tools');document.body.appendChild(actions);
 const panel=document.createElement('section');panel.id='bw-panel';panel.hidden=true;document.body.appendChild(panel);
 function action(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);actions.appendChild(b);return b;}
 const followButton=action('FOLLOW ✓',()=>{teamFollow=!teamFollow;followButton.textContent=teamFollow?'FOLLOW ✓':'FOLLOW OFF';say(teamFollow?'Companion follows the leader':'Both players move independently');queueSave();});
 action('BUILD KIT',()=>showKit());
 action('MAP',()=>showMap());
 action('TEAM PORTAL',()=>activateTeamPortal());
 action('UNDO',()=>undoBlock());
 action('EXPORT',()=>backupAdventure());
 action('IMPORT',()=>showImport());
 action('HELP',()=>showHelp());
 function showKit(){
  panel.hidden=false;panel.replaceChildren();
  const h=document.createElement('h3');h.textContent='BUILDING BLUEPRINTS';panel.appendChild(h);
  const info=document.createElement('p');info.textContent='Select a structure. Creative: unlimited blocks. Survival: wood/planks and stone must be collected.';panel.appendChild(info);
  for(const [type,title] of [['home','Build our home'],['bridge','Build a bridge'],['tower','Build a watchtower']]){const b=document.createElement('button');b.textContent=title;b.onclick=()=>{buildBlueprint(type);panel.hidden=true;};panel.appendChild(b);}
  const x=document.createElement('button');x.textContent='Close';x.onclick=()=>panel.hidden=true;panel.appendChild(x);
 }
 function showMap(){
  panel.hidden=false;panel.innerHTML='<h3>OUR EXPLORATION MAP</h3><canvas id="bw-map-canvas" width="360" height="100"></canvas><p>Blue = Daddy · Green = Jozef · Gold = Team Portal</p>';
  const g=document.getElementById('bw-map-canvas').getContext('2d');g.fillStyle='#203a57';g.fillRect(0,0,360,100);
  for(let x=0;x<W;x++){let y=0;for(;y<H&&world[y][x]===0;y++);g.fillStyle=['#60ba5b','#328858','#dbbb72','#c5e6fa','#8c9ec2'][biome(x)];g.fillRect(x/W*360,y/H*95,3,100);}
  players.forEach((p,i)=>{g.fillStyle=i?'#8bf18f':'#6cb0ff';g.fillRect(p.x/(W*TILE)*360,Math.max(0,p.y/(H*TILE)*100-3),5,7);});
  g.fillStyle='#ffea81';g.fillRect(portalX/W*360,10,4,30);
  const b=document.createElement('button');b.textContent='Close map';b.onclick=()=>panel.hidden=true;panel.appendChild(b);
 }
 function showHelp(){
  panel.hidden=false;panel.innerHTML='<h3>DADDY & JOZEF · QUICK GUIDE</h3><p>Mobile: move, jump, tap any nearby tile to mine/place, and switch heroes. Follow keeps your companion nearby. Desktop: Daddy uses WASD and Jozef uses arrows simultaneously. E mines, R places, I opens inventory.</p><p>Complete five shared missions, explore five biomes, build together, and use TEAM PORTAL when both characters reach the glowing gate.</p><p>Backup: EXPORT creates a file. IMPORT restores a compatible Block World save. Your older world is kept unless you choose New World.</p>';
  const b=document.createElement('button');b.textContent='Close';b.onclick=()=>panel.hidden=true;panel.appendChild(b);
 }
 function showImport(){
  panel.hidden=false;panel.replaceChildren();const h=document.createElement('h3');h.textContent='IMPORT A WORLD BACKUP';panel.appendChild(h);
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';panel.appendChild(input);
  const b=document.createElement('button');b.textContent='Restore selected file';b.onclick=async()=>{
    try{const file=input.files?.[0];if(!file||file.size>2000000)throw Error('Choose a backup under 2 MB.');
      const data=JSON.parse(await file.text());if(data.format!=='DaddyJozefBlockWorld'||!Array.isArray(data.world)||data.world.length!==H||data.world.some(row=>!Array.isArray(row)||row.length!==W||row.some(id=>!Number.isInteger(id)||id<0||id>31)))throw Error('Invalid world save.');
      if(!confirm('Replace the current world with this backup?'))return;
      const original=localStorage.getItem(KEY);if(original)localStorage.setItem(KEY+'-backup',original);
      world=data.world;players.forEach((p,i)=>{const other=data.players?.[i];if(!other)return;p.x=Math.max(0,Math.min(W*TILE-p.w,other.x));p.y=Math.max(0,Math.min(H*TILE-p.h,other.y));p.inventory=other.inventory||{};p.vx=p.vy=0;});
      adventureSeed=data.seed||adventureSeed;questStage=data.questStage||0;goals=Object.assign({wood:0,build:0,explore:0,diamond:0,portal:0},data.goals||{});achievements=data.achievements||[];explored=data.explored||{};portalUnlocked=!!data.portalUnlocked;
      panel.hidden=true;queueSave();save();renderHotbar();questHud();say('Your world has been restored.');
    }catch(err){say('Import error: '+err.message,3500);}
  };panel.appendChild(b);
  const close=document.createElement('button');close.textContent='Cancel';close.onclick=()=>panel.hidden=true;panel.appendChild(close);
 }
 document.addEventListener('keydown',ev=>{if(ev.code==='Escape')panel.hidden=true;});
 questHud();
}
function questHud(){
 const q=$('bw-mission');if(!q)return;
 if(questStage>=Q.length){q.innerHTML='<strong>★ OUR WORLD IS UNLOCKED</strong><small>Five missions completed. Keep exploring and creating.</small>';return;}
 const m=Q[questStage],n=Math.min(goals[m[2]]||0,m[3]);
 q.innerHTML='<strong>MISSION '+(questStage+1)+'/5 · '+m[0]+'</strong><small>'+m[1]+'</small><div class="progress"><i style="width:'+(n/m[3]*100)+'%"></i></div><small>'+n+' / '+m[3]+' · '+zoneNames[biome(Math.floor(players[active].x/TILE))]+'</small>';
}
function gain(field,n=1){
 goals[field]=(goals[field]||0)+n;
 while(questStage<Q.length&&goals[Q[questStage][2]]>=Q[questStage][3]){
  achievements.push(Q[questStage][0]);questStage++;chime();say('MISSION COMPLETE · '+Q[questStage-1][0],3000);
 }
 questHud();queueSave();
}
let speaker;
function chime(){if(!soundEnabled)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;if(!speaker)speaker=new A();const o=speaker.createOscillator(),g=speaker.createGain();o.frequency.value=690;g.gain.setValueAtTime(.035,speaker.currentTime);g.gain.exponentialRampToValueAtTime(.001,speaker.currentTime+.18);o.connect(g).connect(speaker.destination);o.start();o.stop(speaker.currentTime+.18);}catch(_){}}
function backupAdventure(){
 save();const blob=new Blob([JSON.stringify({format:'DaddyJozefBlockWorld',version:4,seed:adventureSeed,world,creative,selected,active,players:players.map(p=>({x:p.x,y:p.y,inventory:p.inventory})),questStage,goals,achievements,explored,portalUnlocked})],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='daddy-jozef-world-'+adventureSeed+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),900);say('World backup downloaded');
}
function buildBlueprint(type){
 const p=players[active],cx=Math.floor(p.x/TILE)+p.facing*3,base=Math.floor((p.y+p.h)/TILE);
 const cells=[];const add=(dx,dy,id)=>cells.push({x:cx+dx,y:base+dy,id});
 if(type==='home'){for(let x=0;x<9;x++){add(x,0,7);add(x,-6,7);}for(let y=-5;y<0;y++){add(0,y,4);add(8,y,4);}add(2,-3,12);add(6,-3,12);}
 else if(type==='bridge'){for(let x=0;x<15;x++){add(x,0,7);if(x%4===0)add(x,-1,4);}}
 else{for(let y=-9;y<0;y++){add(0,y,4);add(5,y,4);}for(let x=0;x<=5;x++){add(x,0,8);add(x,-9,7);}}
 const open=cells.filter(c=>c.x>0&&c.x<W&&c.y>0&&c.y<H-1&&get(c.x,c.y)===0&&!players.some(q=>c.x*TILE<q.x+q.w&&c.x*TILE+TILE>q.x&&c.y*TILE<q.y+q.h&&c.y*TILE+TILE>q.y));
 if(open.length<cells.length*.7){say('Find more open space for the blueprint');return;}
 const costs={};open.forEach(c=>costs[c.id]=(costs[c.id]||0)+1);
 if(!creative&&Object.entries(costs).some(([id,n])=>(p.inventory[id]||0)<n)){say('Not enough materials; mine or select Creative');return;}
 open.forEach(c=>{set(c.x,c.y,c.id);if(!creative)p.inventory[c.id]--;});
 gain('build',open.length);chime();renderHotbar();say(type.toUpperCase()+' BUILT · '+open.length+' blocks',2800);
}
function undoBlock(){
 const c=changedBlocks.pop();if(!c){say('Nothing to undo yet');return;}
 if(get(c.x,c.y)!==c.after){say('The last block has changed');return;}
 if(set(c.x,c.y,c.before)){if(!creative&&c.spent)players[c.owner].inventory[c.spent]=(players[c.owner].inventory[c.spent]||0)+1;renderHotbar();say('Undid one block');}
}
function activateTeamPortal(){
 const p0=players[0],p1=players[1],goal=portalX*TILE;
 if(Math.abs(p0.x-goal)>4*TILE||Math.abs(p1.x-goal)>4*TILE){say('Both Daddy and Jozef must reach the portal');return;}
 if(questStage<4){say('Complete your other missions before using the portal');return;}
 if(!portalUnlocked){portalUnlocked=true;gain('portal');spark(goal,(surface[portalX]-3)*TILE,60);chime();}
 say('WORLD PORTAL OPENED TOGETHER!',4000);
}
function spark(x,y,count=8){
 for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*170,vy:-50-Math.random()*130,ttl:.6+Math.random()*.6});
 if(particles.length>280)particles.splice(0,particles.length-280);
}
const baseGenerate=generate;
generate=function(){
 world=Array.from({length:H},()=>Array(W).fill(0));surface=new Array(W);
 for(let x=0;x<W;x++){
  const z=biome(x),v=Math.sin((x+adventureSeed%77)*.09)*3+Math.sin((x+adventureSeed%61)*.21)*2+Math.sin(x*.026)*4;
  const h=Math.max(26,Math.min(47,Math.floor([33,33,37,31,29][z]+v)));surface[x]=h;
  for(let y=h;y<H;y++){
   let id=y===h?tilesForBiome[z]:y<h+4?(z===2?6:z===3?16:2):3;
   if(y>h+6){const n=noise(x,y);if(n>.993&&y>h+18)id=18;else if(n>.976)id=11;else if(n>.955)id=10;else if(n>.942)id=8;
    if(y<H-3&&Math.sin(x*.21+y*.19+adventureSeed*.001)+Math.cos(x*.13-y*.14)>1.63)id=0;}
   world[y][x]=y===H-1?14:id;
  }
 }
 for(let x=3;x<W-3;x++){
  if(noise(x,3)<[.08,.21,.02,.10,.08][biome(x)]){
   let y=0;while(y<H-5&&get(x,y)===0)y++;
   if(y>=H-5)continue;const height=3+Math.floor(noise(x,4)*3);
   for(let k=1;k<=height;k++)world[y-k][x]=4;
   for(let ox=-2;ox<=2;ox++)for(let oy=-2;oy<=1;oy++)if(Math.abs(ox)+Math.abs(oy)<4){const xx=x+ox,yy=y-height+oy;if(xx>0&&xx<W&&yy>0&&get(xx,yy)===0)world[yy][xx]=biome(x)===3?16:5;}
   x+=2;
  }
 }
 for(let x=68;x<=77;x++){let y=0;while(y<H&&get(x,y)===0)y++;for(let k=1;k<5;k++)if(y-k>0)world[y-k][x]=0;}
 const px=portalX;let sy=0;while(sy<H&&get(px,sy)===0)sy++;
 for(let j=1;j<=5;j++){world[sy-j][px-2]=18;world[sy-j][px+2]=18;}for(let x=px-2;x<=px+2;x++)world[sy-5][x]=18;
 const oreX=Math.floor(W*.7);let oreY=0;while(oreY<H&&get(oreX,oreY)===0)oreY++;world[Math.min(H-4,oreY+17)][oreX]=18;
 friends=Array.from({length:12},(_,i)=>{const x=8+Math.floor(noise(i,20)*(W-16));let y=0;while(y<H&&get(x,y)===0)y++;return {x:x*TILE,y:y*TILE-16,home:x*TILE,vx:(i%2?1:-1)*20,c:i%4,phase:i};});
 questStage=0;goals={wood:0,build:0,explore:0,diamond:0,portal:0};explored={};achievements=[];changedBlocks=[];portalUnlocked=false;
};
const baseRead=readSave;
readSave=function(){
 const wasLoaded=baseRead();
 try{const s=JSON.parse(localStorage.getItem(advSaveKey)||'null');if(s){adventureSeed=s.adventureSeed||adventureSeed;questStage=Math.max(0,Math.min(Q.length,s.questStage||0));goals=Object.assign(goals,s.goals||{});explored=s.explored||{};achievements=s.achievements||[];portalUnlocked=!!s.portalUnlocked;teamFollow=s.teamFollow!==false;cameraZoom=Math.max(1,Math.min(2,Number(s.cameraZoom)||1));}}catch(_){}
 return wasLoaded;
};
const baseSave=save;
save=function(){
 const should=dirty;baseSave();
 if(should)try{localStorage.setItem(advSaveKey,JSON.stringify({adventureSeed,questStage,goals,explored,achievements,portalUnlocked,teamFollow,cameraZoom}));}catch(_){}
};
const baseMine=mine;
mine=function(){
 const a=aim(),id=get(a.x,a.y),woodBefore=players[active].inventory[4]||0;
 baseMine();const gained=(players[active].inventory[4]||0)-woodBefore;
 if(gained>0)gain('wood',gained);
 if(id===18&&get(a.x,a.y)===0)gain('diamond');
 if(id&&id!==14){spark(a.x*TILE+20,a.y*TILE+20,9);chime();}
};
const basePlace=place;
place=function(){
 const a=aim(),before=get(a.x,a.y);
 basePlace();
 if(get(a.x,a.y)!==before){gain('build');changedBlocks.push({x:a.x,y:a.y,before,after:get(a.x,a.y),spent:creative?0:selected,owner:active});if(changedBlocks.length>50)changedBlocks.shift();}
};
const baseUpdate=update;
update=function(dt){
 baseUpdate(dt);if(craftingOpen)return;
 nightClock+=dt;season+=dt;
 if(season>48){season=0;weatherType=noise(Math.floor(nightClock/48),1)>.68?'rain':'clear';}
 if(teamFollow){const p=players[active],q=players[1-active],dx=p.x-q.x;
   if(Math.abs(dx)>85&&Math.abs(dx)<600){q.facing=Math.sign(dx);moveAxis(q,Math.sign(dx)*130*dt,'x');
     if(q.ground&&collision(q,q.x+q.facing*10,q.y)){q.vy=-430;q.ground=false;}}}
 friends.forEach(c=>{c.phase+=dt*2;c.x+=c.vx*dt;if(Math.abs(c.x-c.home)>TILE*3)c.vx=-c.vx;let y=0,xx=Math.max(0,Math.min(W-1,Math.floor(c.x/TILE)));while(y<H&&get(xx,y)===0)y++;c.y=y*TILE-16;});
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;p.ttl-=dt;if(p.ttl<0)particles.splice(i,1);}
 const x=Math.floor(players[active].x/TILE),z=biome(x);
 if(z>=2&&!explored[z]){explored[z]=1;gain('explore');say('DISCOVERED · '+zoneNames[z],2200);}
 if(ticks%90===0){questHud();lastWorldX=x;}
};
const baseDraw=draw;
draw=function(){
 baseDraw();ctx.save();
 for(const c of friends){const x=c.x-camX,y=c.y-camY+Math.sin(c.phase)*2;if(x<0||x>cssW||y<0||y>cssH)continue;
   ctx.fillStyle=['#a4db87','#e4bd84','#86d9cf','#b2a1ed'][c.c];ctx.fillRect(x,y+4,18,11);ctx.fillRect(x+3,y,12,6);
   ctx.fillStyle='#203442';ctx.fillRect(x+5,y+5,2,2);ctx.fillRect(x+12,y+5,2,2);}
 players.forEach((p,i)=>{const x=Math.round(p.x-camX),y=Math.round(p.y-camY),step=Math.sin(p.walk)*Math.min(3,Math.abs(p.vx)/40);
   ctx.fillStyle='#27354c';ctx.fillRect(x+3,y+30,6,9+step);ctx.fillRect(x+p.w-9,y+30,6,9-step);
   ctx.fillStyle=i===0?'#2363cb':'#36b06d';ctx.fillRect(x+1,y+15,p.w-2,15);
   ctx.fillStyle='#edb992';ctx.fillRect(x+3,y+3,p.w-6,14);
   ctx.fillStyle=i===0?'#46372a':'#916a40';ctx.fillRect(x+2,y,p.w-4,6);
   ctx.fillStyle='#1e3043';ctx.fillRect(x+(p.facing>0?p.w-9:5),y+10,3,3);
 });
 for(const p of particles){const x=p.x-camX,y=p.y-camY;if(x<0||x>cssW||y<0||y>cssH)continue;ctx.globalAlpha=Math.min(1,p.ttl);ctx.fillStyle='#ffe6a4';ctx.fillRect(x,y,3,3);}ctx.globalAlpha=1;
 let sy=0;while(sy<H&&get(portalX,sy)===0)sy++;
 const px=(portalX-1)*TILE-camX,py=(sy-5)*TILE-camY;
 if(px> -180&&px<cssW+180){ctx.fillStyle='rgba(161,95,253,'+(.4+.2*Math.sin(nightClock*2))+')';ctx.fillRect(px,py,3*TILE,5*TILE);
   ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff9d0';ctx.fillText(portalUnlocked?'PORTAL OPEN':'TEAM PORTAL',px+60,py-9);}
 const dark=Math.max(0,Math.sin(nightClock/120*Math.PI*2))*.20;
 if(dark){ctx.fillStyle='rgba(12,18,57,'+dark+')';ctx.fillRect(0,0,cssW,cssH);}
 if(weatherType==='rain'){ctx.strokeStyle='#b8ddff88';for(let i=0;i<35;i++){const x=(i*83+nightClock*120)%(cssW+40),y=(i*97+nightClock*230)%(cssH+50);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5,y+11);ctx.stroke();}}
 ctx.restore();
};
createAdventureUi();

/* Compact mobile action drawer, block catalog, survival hazards and recipes. */
(function(){
 const actions=$('bw-actions');
 if(!actions)return;
 actions.classList.add('closed');
 const menu=document.createElement('button');menu.type='button';menu.id='bw-menu-toggle';menu.textContent='☰ WORLD MENU';
 menu.setAttribute('aria-expanded','false');
 menu.addEventListener('click',()=>{
  const opened=actions.classList.toggle('closed')===false;
  menu.setAttribute('aria-expanded',String(opened));
  menu.textContent=opened?'✕ CLOSE MENU':'☰ WORLD MENU';
 });
 actions.insertBefore(menu,actions.firstChild);
 const picker=document.createElement('button');picker.type='button';picker.textContent='BLOCK CATALOG';
 picker.addEventListener('click',()=>{
  const panel=$('bw-panel');panel.hidden=false;panel.replaceChildren();
  const title=document.createElement('h3');title.textContent='CHOOSE A BUILDING BLOCK';panel.appendChild(title);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(85px,1fr));gap:5px';
  blockable.forEach(id=>{
    const item=document.createElement('button');item.type='button';item.textContent=names[id];item.style.cssText='min-height:48px;padding:7px;border:1px solid #b4dbf178;background:#17334f;color:white;font-size:11px';
    item.addEventListener('click',()=>{selected=id;renderHotbar();panel.hidden=true;queueSave();say('Selected '+names[id]);});
    grid.appendChild(item);
  });panel.appendChild(grid);
  const close=document.createElement('button');close.type='button';close.textContent='Close';close.onclick=()=>panel.hidden=true;panel.appendChild(close);
 });
 actions.appendChild(picker);
 const toggleSound=document.createElement('button');toggleSound.type='button';toggleSound.textContent='SOUND OFF';
 toggleSound.addEventListener('click',()=>{
  soundEnabled=!soundEnabled;toggleSound.textContent=soundEnabled?'SOUND ON':'SOUND OFF';
  if(soundEnabled)chime();queueSave();
 });actions.appendChild(toggleSound);
 const playerSkill=document.createElement('p');playerSkill.id='bw-character-skill';playerSkill.style.cssText='position:fixed;top:117px;left:10px;z-index:12;margin:0;padding:4px 7px;border-radius:8px;background:#0e2543bb;color:#dcefff;font:10px system-ui;pointer-events:none';
 document.body.appendChild(playerSkill);
 const style=document.createElement('style');
 style.textContent='#bw-actions.closed button:not(:first-child){display:none}#bw-actions{top:150px;left:8px;max-width:min(200px,49vw)}#bw-actions:not(.closed){max-height:45dvh;overflow-y:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:min(230px,58vw);padding:6px;background:#102943ef;border:1px solid #a3d5f760;border-radius:12px}#bw-actions:not(.closed) button:first-child{grid-column:1/-1}#bw-character-skill{max-width:65vw}@media(max-width:550px){#bw-actions{top:134px}#bw-character-skill{top:111px;font-size:9px}}@media(max-height:480px){#bw-character-skill{display:none}#bw-actions{top:57px}}';
 document.head.appendChild(style);
 const updateSkill=()=>playerSkill.textContent=active===0?'DADDY · Strong Builder':'JOZEF · Agile Explorer';
 updateSkill();
 const oldSwitch=playerSwitch;
 playerSwitch=function(){oldSwitch();updateSkill();};
 recipes.push({name:'Clay Blocks ×2',needs:{2:2,6:1},makes:{15:2}},
  {name:'Cobblestone ×2',needs:{3:2},makes:{8:2}},
  {name:'Emerald Jewel',needs:{22:1,26:1},makes:{29:1}},
  {name:'Lapis Crystal',needs:{23:1},makes:{30:1}},
  {name:'Redstone Powder ×2',needs:{24:1},makes:{31:2}});
 let hazardCooldown=0;
 const prevUpdate=update;
 update=function(dt){
  prevUpdate(dt);if(craftingOpen)return;
  hazardCooldown=Math.max(0,hazardCooldown-dt);
  if(!creative&&hazardCooldown===0){
    for(const c of friends){
      if(c.c!==3)continue;
      const hit=players.find(p=>Math.abs(p.x-c.x)<22&&Math.abs(p.y-c.y)<25);
      if(hit){hit.health=Math.max(0,hit.health-8);hazardCooldown=2.4;spark(hit.x,hit.y,14);
        say('Crystal slime! Avoid it or jump over it');
        if(hit.health===0){const slot=players.indexOf(hit),spawn=slot?74:71;hit.x=spawn*TILE;hit.y=surface[spawn]*TILE-hit.h;hit.vx=hit.vy=0;hit.health=100;say(hit.name+' returned safely to the base');}
        break;}
    }
  }
  for(const p of players){if(Math.abs(p.x-players[1-players.indexOf(p)].x)<TILE*2&&p.health<100&&ticks%120===0)p.health=Math.min(100,p.health+2);}
 };
})();


/* Gamepad, camera UI and player role abilities. */
(function(){
 const toolbar=$('bw-actions');
 function addAction(label,callback){if(!toolbar)return;const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',callback);toolbar.appendChild(b);}
 addAction('ZOOM +',()=>setCameraZoom(cameraZoom+.2));
 addAction('ZOOM −',()=>setCameraZoom(cameraZoom-.2));
 const gamepadHeld={mine:false,place:false,switch:false,inventory:false};
 const baseInputUpdate=update;
 update=function(dt){
  if(typeof navigator!=='undefined'&&navigator.getGamepads){
   const pad=Array.from(navigator.getGamepads()||[]).find(Boolean);
   if(pad){
    const axis=pad.axes?.[0]||0;
    touch.left=axis<-.28;touch.right=axis>.28;
    touch.jump=!!pad.buttons?.[0]?.pressed;
    for(const [name,button,act] of [['mine',2,()=>mine()],['place',3,()=>place()],['switch',4,()=>playerSwitch()],['inventory',9,()=>craftingOpen?closeCrafting():openCrafting()]]){
     const pressed=!!pad.buttons?.[button]?.pressed;
     if(pressed&&!gamepadHeld[name])act();
     gamepadHeld[name]=pressed;
    }
   }
  }
  baseInputUpdate(dt);
 };
 const oldMineHeavy=mine;
 mine=function(){const a=aim(),id=get(a.x,a.y);oldMineHeavy();
  if(active===0&&id===3&&get(a.x,a.y)===0){const p=players[0];p.inventory[8]=(p.inventory[8]||0)+1;renderHotbar();say('Daddy bonus: +1 Cobblestone',950);}
 };
 let secondJumpUsed=false;
 const extraJump=()=>{
  if(active!==1)return;
  const p=players[1];
  if(!p.ground&&!secondJumpUsed&&p.vy>0){secondJumpUsed=true;p.vy=-370;spark(p.x,p.y+p.h,8);say('Jozef double jump!',850);}
 };
 $('btn-jump').addEventListener('pointerdown',extraJump);
 addEventListener('keydown',e=>{if(e.code==='ArrowUp'&&!e.repeat)extraJump();});
 const baseUpdateJump=update;
 update=function(dt){baseUpdateJump(dt);if(players[1].ground)secondJumpUsed=false;};
})();


/* IndexedDB autosave mirror and recovery, with legacy localStorage continuity. */
(function(){
 const DB_NAME='jozef-dad-block-world',STORE='worlds',ID='autosave';
 let opening=null;
 function openDB(){
  if(opening)return opening;
  if(typeof window.indexedDB==='undefined')return Promise.resolve(null);
  opening=new Promise(resolve=>{
   try{
    const request=window.indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>resolve(null);
    request.onblocked=()=>resolve(null);
   }catch(_){resolve(null);}
  });
  return opening;
 }
 function snapshot(){return {
  version:4,seed:adventureSeed,world:world.map(row=>row.slice()),creative,active,selected,
  players:players.map(p=>({x:p.x,y:p.y,facing:p.facing,inventory:Object.assign({},p.inventory)})),
  extra:{questStage,goals:Object.assign({},goals),explored:Object.assign({},explored),achievements:achievements.slice(),portalUnlocked,teamFollow,cameraZoom}
 };}
 function mirror(){
  openDB().then(db=>{
   if(!db)return;
   try{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(snapshot(),ID);tx.onerror=()=>console.warn('Block World IndexedDB write failed');}
   catch(err){console.warn('Block World IndexedDB storage unavailable',err);}
  });
 }
 const priorSave=save;
 save=function(){const write=dirty;priorSave();if(write)mirror();};
 const previousRead=readSave;
 readSave=function(){
  const loaded=previousRead();
  if(!loaded){
   openDB().then(db=>{
    if(!db)return;
    try{
     const transaction=db.transaction(STORE,'readonly'),get=transaction.objectStore(STORE).get(ID);
     get.onsuccess=()=>{
      const data=get.result;
      if(!data||data.version!==4||ticks>80||dirty||!Array.isArray(data.world)||data.world.length!==H||
         data.world.some(row=>!Array.isArray(row)||row.length!==W))return;
      world=data.world;adventureSeed=data.seed||adventureSeed;creative=!!data.creative;
      active=data.active===1?1:0;selected=blockable.includes(data.selected)?data.selected:2;
      players.forEach((p,i)=>{const q=data.players?.[i];if(!q)return;
       if(Number.isFinite(q.x))p.x=Math.max(0,Math.min(W*TILE-p.w,q.x));
       if(Number.isFinite(q.y))p.y=Math.max(0,Math.min(H*TILE-p.h,q.y));
       p.vx=p.vy=0;p.facing=q.facing===-1?-1:1;p.inventory=q.inventory&&typeof q.inventory==='object'?q.inventory:{};
      });
      const e=data.extra||{};questStage=Math.max(0,Math.min(Q.length,Number(e.questStage)||0));goals=Object.assign(goals,e.goals||{});
      explored=e.explored||{};achievements=Array.isArray(e.achievements)?e.achievements:[];portalUnlocked=!!e.portalUnlocked;
      teamFollow=e.teamFollow!==false;cameraZoom=Math.max(1,Math.min(2,Number(e.cameraZoom)||1));
      dirty=true;save();renderHotbar();questHud();say('Recovered your world from offline storage',3600);
     };
    }catch(err){console.warn('Offline recovery unavailable',err);}
   });
  }
  return loaded;
 };
})();

bindButton('left','left');bindButton('right','right');bindButton('jump','jump');
bindButton('mine',null,mine);bindButton('place',null,place);bindButton('switch',null,playerSwitch);
const canvasTouches=new Map();let tapTimer=0,pinchGap=0;
function doWorldTap(clientX,clientY){
 if(craftingOpen)return;
 const rect=canvas.getBoundingClientRect();
 const x=Math.floor(((clientX-rect.left)/cameraZoom+camX)/TILE),y=Math.floor(((clientY-rect.top)/cameraZoom+camY)/TILE);
 if(!reachable(x,y)){say('Move closer to interact');return;}
 focus={x,y};if(get(x,y)!==0)mine();else place();
}
function setCameraZoom(v){cameraZoom=Math.max(1,Math.min(2,Math.round(v*20)/20));queueSave();say('Camera '+Math.round(cameraZoom*100)+'%',800);}
canvas.addEventListener('pointerdown',e=>{
 if(craftingOpen)return;
 if(e.pointerType==='touch'){
  canvasTouches.set(e.pointerId,{x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY});
  if(canvasTouches.size===2){
   clearTimeout(tapTimer);
   const v=[...canvasTouches.values()];pinchGap=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);return;
  }
  if(canvasTouches.size===1){tapTimer=setTimeout(()=>{if(canvasTouches.size<=1)doWorldTap(e.clientX,e.clientY);},130);return;}
 }
 doWorldTap(e.clientX,e.clientY);
});
canvas.addEventListener('pointermove',e=>{
 if(!canvasTouches.has(e.pointerId))return;
 const p=canvasTouches.get(e.pointerId);p.x=e.clientX;p.y=e.clientY;
 if(Math.hypot(p.x-p.ox,p.y-p.oy)>14)clearTimeout(tapTimer);
 if(canvasTouches.size===2){
  clearTimeout(tapTimer);
  const v=[...canvasTouches.values()],d=Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y);
  if(pinchGap>4&&d>4)cameraZoom=Math.max(1,Math.min(2,cameraZoom*d/pinchGap));
  pinchGap=d;
 }
});
for(const ev of ['pointerup','pointercancel','lostpointercapture']){
 canvas.addEventListener(ev,e=>{canvasTouches.delete(e.pointerId);if(!canvasTouches.size)pinchGap=0;});
}
canvas.addEventListener('wheel',e=>{e.preventDefault();setCameraZoom(cameraZoom+(e.deltaY<0?.1:-.1));},{passive:false});
addEventListener('keydown',e=>{if(e.code==='Equal'||e.code==='NumpadAdd')setCameraZoom(cameraZoom+.15);if(e.code==='Minus'||e.code==='NumpadSubtract')setCameraZoom(cameraZoom-.15);});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','ArrowUp','Space','Tab'].includes(e.code))e.preventDefault();
 if(e.repeat){down.add(e.code);return;}
 down.add(e.code);
 if(e.code==='Tab')playerSwitch();
 else if(e.code==='KeyE'||e.code==='Space')mine();
 else if(e.code==='KeyR'||e.code==='KeyF')place();
 else if(e.code==='KeyI'){craftingOpen?closeCrafting():openCrafting();}
 else if(e.code==='Escape')closeCrafting();
 else if(e.code.startsWith('Digit')){const idx=Number(e.code.slice(5))-1;if(idx>=0&&idx<9){selected=hotItems[idx];renderHotbar();queueSave();}}
});
addEventListener('keyup',e=>down.delete(e.code));
addEventListener('blur',()=>{down.clear();touch.left=touch.right=touch.jump=false;save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
addEventListener('pagehide',save);
$('inventory').addEventListener('click',()=>craftingOpen?closeCrafting():openCrafting());
$('save').addEventListener('click',()=>{dirty=true;save();say('World saved on this device');});
$('mode').addEventListener('click',()=>{creative=!creative;queueSave();renderHotbar();say(creative?'Creative: unlimited building':'Survival: collect and spend materials');});
$('reset').addEventListener('click',()=>{
 if(!confirm('Start a new Block World? This permanently replaces the saved world on this device.'))return;
 try{const previous=localStorage.getItem(KEY);if(previous)localStorage.setItem(KEY+'-backup',previous);localStorage.removeItem(KEY);localStorage.removeItem(advSaveKey);}catch(_){}
 adventureSeed=Math.floor(Math.random()*999999)+1;generate();initPlayers();creative=true;active=0;selected=2;focus=null;camX=camY=0;queueSave();renderHotbar();say('Fresh new world created');
});
$('crafting').setAttribute('role','dialog');$('crafting').setAttribute('aria-modal','true');$('crafting').setAttribute('aria-hidden','true');
generate();initPlayers();const restored=readSave();renderHotbar();say(restored?'Welcome back to your saved world!':'Daddy & Jozef: explore, mine and build!',3600);
requestAnimationFrame(frame);
})();

