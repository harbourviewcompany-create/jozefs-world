/* JozefWorld 2D native engine v1: standalone, deterministic simulation, no remote engine assets. */
(()=>{'use strict';
const canvas=document.getElementById('game');if(!canvas)return;
const ctx=canvas.getContext('2d',{alpha:false});if(!ctx){window.Jozef2DStartup?.fail('Canvas 2D is unavailable.');return;}
const W=384,H=160,T=24,seed=29,blocks=new Map(),keys=new Set();
const SAVE_KEY='jozefworld-native-2d-test-v1';let saveTimer=0;let saveStatus='';
function snapshot(){return {version:1,player:{x:player.x,y:player.y,health:player.health},selected,blocks:Array.from(blocks.entries()).slice(0,50000)};}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot()));saveStatus='Saved';return true;}catch(e){saveStatus='Save unavailable';return false;}}
function restore(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;const data=JSON.parse(raw);if(data?.version!==1||!Array.isArray(data.blocks))return;for(const entry of data.blocks.slice(0,50000)){if(Array.isArray(entry)&&/^[-]?\d+,[-]?\d+$/.test(entry[0])&&Number.isInteger(entry[1])&&entry[1]>=0&&entry[1]<=8)blocks.set(entry[0],entry[1]);}if(Number.isFinite(data.player?.x)&&Number.isFinite(data.player?.y)&&Math.abs(data.player.x)<100000&&Math.abs(data.player.y)<100000){player.x=data.player.x;player.y=data.player.y;}if(types.includes(data.selected))selected=data.selected;saveStatus='Restored';}catch(e){saveStatus='New test world';}}
const key=(x,y)=>x+','+y;const ground=x=>Math.round(103+9*Math.sin(x*.12)+5*Math.sin(x*.031));
const tile=(x,y)=>{const k=key(x,y);if(blocks.has(k))return blocks.get(k);const g=ground(x);return y<g?0:y===g?1:y<g+4?2:3;};
const set=(x,y,v)=>{if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(v)||v<0||v>8)return;blocks.set(key(x,y),v);saveTimer=2;};
const player={x:8,y:ground(8)-2,vx:0,vy:0,face:1,onGround:false,health:100};
let camera=0,acc=0,last=0,selected=1,frames=0;
const colors=['','#57b765','#8c5d3d','#656d7a','#b67a43','#287f59','#e4c78c','#d9ecf2','#65c4e7'];
const types=[1,2,3,4,5,6,7,8];
restore();
const hotbar=document.getElementById('hotbar');if(hotbar){hotbar.innerHTML='';types.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.textContent=['Grass','Dirt','Stone','Wood','Leaves','Sand','Snow','Crystal'][i];b.style.cssText='min-width:58px;padding:9px 5px;background:#153c58;color:white;border:2px solid '+(t===selected?'#8efaff':'#547b9d')+';border-radius:10px;font:11px system-ui';b.onclick=()=>{selected=t;saveTimer=2;for(const e of hotbar.children)e.style.borderColor='#547b9d';b.style.borderColor='#8efaff';};hotbar.appendChild(b);});}
const act={left:false,right:false};function bind(id,down,up){const el=document.getElementById(id);if(!el)return;el.style.touchAction='none';el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);down();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>up?.());}
bind('btn-left',()=>act.left=true,()=>act.left=false);bind('btn-right',()=>act.right=true,()=>act.right=false);
function jump(){if(player.onGround){player.vy=-10;player.onGround=false;}}
function edit(place){const x=Math.floor(player.x+player.face*2),y=Math.floor(player.y+1);if(place){if(!tile(x,y))set(x,y,selected);}else if(tile(x,y))set(x,y,0);}
bind('btn-jump',jump);bind('btn-mine',()=>edit(false));bind('btn-place',()=>edit(true));bind('btn-attack',()=>{});
document.addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if([' ','arrowup'].includes(e.key.toLowerCase())){e.preventDefault();jump();}if(e.key.toLowerCase()==='e')edit(true);if(e.key.toLowerCase()==='q')edit(false);});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function solid(x,y){return tile(Math.floor(x),Math.floor(y))!==0;}
function step(dt){const left=act.left||keys.has('a')||keys.has('arrowleft'),right=act.right||keys.has('d')||keys.has('arrowright');player.vx=(Number(right)-Number(left))*5;if(player.vx)player.face=Math.sign(player.vx);
const nx=player.x+player.vx*dt;if(!solid(nx,player.y)&&!solid(nx,player.y+1.5))player.x=nx;
player.vy=Math.min(16,player.vy+25*dt);const ny=player.y+player.vy*dt;
if(player.vy>=0&&solid(player.x,ny+1.6)){player.y=Math.floor(ny+1.6)-1.6;player.vy=0;player.onGround=true;}else if(player.vy<0&&solid(player.x,ny)){player.vy=0;}else{player.y=ny;player.onGround=false;}
camera+=(player.x-14-camera)*Math.min(1,dt*5);if(saveTimer>0){saveTimer-=dt;if(saveTimer<=0)save();}}
function render(){const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.fillStyle='#7dc7f5';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff0b3';ctx.beginPath();ctx.arc(310,32,14,0,Math.PI*2);ctx.fill();
const scale=H/18,ox=W/2-player.x*scale,oy=H*.43-player.y*scale;
const x0=Math.floor((-ox)/scale)-1,x1=Math.ceil((W-ox)/scale)+1,y0=Math.floor((-oy)/scale)-1,y1=Math.ceil((H-oy)/scale)+1;
for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const t=tile(x,y);if(!t)continue;ctx.fillStyle=colors[t]||'#777';ctx.fillRect(Math.floor(ox+x*scale),Math.floor(oy+y*scale),Math.ceil(scale)+1,Math.ceil(scale)+1);ctx.fillStyle='#ffffff15';ctx.fillRect(ox+x*scale,oy+y*scale,scale,2);}
const px=ox+player.x*scale,py=oy+player.y*scale;ctx.fillStyle='#233b75';ctx.fillRect(px-scale*.35,py+scale*.85,scale*.7,scale*.7);ctx.fillStyle='#258bd3';ctx.fillRect(px-scale*.4,py+scale*.2,scale*.8,scale*.7);ctx.fillStyle='#f0b58a';ctx.fillRect(px-scale*.35,py-scale*.4,scale*.7,scale*.65);ctx.fillStyle='#442a1f';ctx.fillRect(px-scale*.38,py-scale*.48,scale*.76,scale*.18);ctx.fillStyle='#15283c';ctx.fillRect(px+player.face*scale*.13,py-scale*.1,scale*.1,scale*.1);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});window.addEventListener('pagehide',save);
function frame(now){if(!last)last=now;acc+=Math.min(.05,(now-last)/1000);last=now;let n=0;while(acc>=1/60&&n++<4){step(1/60);acc-=1/60;}render();frames++;requestAnimationFrame(frame);}
window.BlockWorld2D={player,tile,set,save,snapshot,version:'native-v2'};window.__blockWorldReady=true;
const health=document.getElementById('health');if(health)health.textContent='2D READY · LOCAL TEST WORLD';requestAnimationFrame(frame);
})();