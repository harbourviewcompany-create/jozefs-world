/* Daddy + Jozef Block World 3D. Native WebGL; offline-first; procedural chunk streaming. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),canvas=$('view'),gl=canvas.getContext('webgl',{antialias:false,alpha:false})||canvas.getContext('experimental-webgl');
if(!gl){$('fallback').hidden=false;$('mission').textContent='WebGL is unavailable on this device.';return;}
const CH=12,MAX_Y=27,R=2,KEY='jozefs-block-3d-v1';
const types=['Air','Grass','Dirt','Stone','Wood','Leaves','Sand','Snow','Crystal','Planks','Brick','Glass'];
const col=[[0,0,0],[.34,.72,.36],[.53,.38,.26],[.53,.60,.68],[.53,.32,.16],[.20,.51,.32],[.87,.74,.47],[.86,.92,.96],[.38,.80,.95],[.73,.51,.30],[.60,.36,.29],[.70,.85,.93]];
const faces=[[[0,1,0],[[0,1,0],[0,1,1],[1,1,1],[1,1,0]]],[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],[[1,0,0],[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]],[[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]]];
const missions=[['Gather wood','Mine eight wood blocks','wood',8,25],['Build our base','Place twelve blocks together','placed',12,30],['Explore a biome','Discover the far desert or snow ridge','explore',1,35],['Mine a crystal','Find a rare glowing crystal','crystal',1,40],['Defeat the Crystal Golem','Find the guardian at 32, 32','boss',1,60],['Activate the portal','Bring both heroes to 40, 40','portal',1,80]];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
let seed=Math.floor(Math.random()*1e9),realm=0,baseSeed=seed,dimensions={},edits=new Map(),chunks=new Map(),queue=[],lastCX=Infinity,lastCZ=Infinity;
const DIMKEY='jozefs-block-3d-dimensions-v1';
let selected=4,creative=true,third=false,sound=false,stage=0,stats={wood:0,placed:0,explore:0,crystal:0,boss:0,portal:0},rewards=[],discovered={},defeated=false,portalOpened=false;
const hero={x:2.5,y:12,z:2.5,vy:0,yaw:0,pitch:-.07,role:0,hp:100,ground:false,double:false,inventory:{}};
const companion={x:4.5,y:12,z:4.5,role:1,hp:100};
let boss={x:32.5,y:12,z:32.5,hp:120,alive:true},mobs=[],clock=0,last=0,frames=0,dirty=false,saveClock=0,skyPhase=0;
let guestActive=false;
let bossPhase=0,bossWarned=false,lastMobSpawn=0;
let keys={},joy={x:0,y:0},gamepadHeld={mine:false,place:false,attack:false},jumpWasDown=false,look=null,peer=null,conn=null,host=false,invite='',lastNet=0,remote=false,noticeTo=0,renderOk=false;
const rnd=(x,z,s)=>{let n=Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(s|0,2246822519);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
function noise(x,z,s){let X=Math.floor(x/s),Z=Math.floor(z/s),u=x/s-X,v=z/s-Z;
 u=u*u*(3-2*u);v=v*v*(3-2*v);
 const mix=(a,b,t)=>a+(b-a)*t;
 return mix(mix(rnd(X,Z,seed),rnd(X+1,Z,seed),u),mix(rnd(X,Z+1,seed),rnd(X+1,Z+1,seed),u),v);
}
const surfaceCache=new Map(),biomeCache=new Map(),treeCache=new Map();
function memo(cache,key,fn){if(cache.has(key))return cache.get(key);if(cache.size>50000)cache.clear();const v=fn();cache.set(key,v);return v;}
function height(x,z){x=Math.floor(x);z=Math.floor(z);return memo(surfaceCache,seed+':'+x+':'+z,()=>{
 const b=biome(x,z),base=4+noise(x,z,26)*8+noise(x,z,9)*4;
 const m=b==='Mountains'?noise(x,z,18)*10:0;
 return clamp(Math.floor(base+m),3,22);
});}
function biome(x,z){x=Math.floor(x);z=Math.floor(z);return memo(biomeCache,seed+':'+x+':'+z,()=>{
 const n=noise(x+132,z-45,75),h=noise(x,z,40),r=noise(x-60,z+80,55);
 if(n>.74)return 'Snow Ridge';
 if(n<.26)return 'Desert';
 if(h>.64)return 'Mountains';
 if(r>.7)return 'Volcanic';
 if(n>.58&&n<.68)return 'Swamp';
 if(n>.5)return 'Evergreen Forest';
 if(r<.35)return 'Plains';
 return 'Meadows';
});}
function tree(x,z){return memo(treeCache,seed+':'+x+':'+z,()=>rnd(x,z,seed+42)>.982&&biome(x,z)!=='Desert');}
const tag=(x,y,z)=>x+','+y+','+z;
function natural(x,y,z){
 if(y<0)return 3;if(y>=MAX_Y)return 0;
 const h=height(x,z),b=biome(x,z);
 if(y<=h){
  if(y>1&&y<h-3&&Math.sin(x*.42+y*.67+seed*.00003)+Math.cos(z*.35-y*.63)>1.78)return 0;
  if(y===h)return b==='Desert'?6:b==='Snow Ridge'?7:b==='Swamp'?2:b==='Mountains'?3:b==='Volcanic'?3:b==='Plains'?1:1;
  if(y>h-3)return b==='Desert'?6:2;
  return rnd(x+y,z,seed+98)>.993?8:3;
 }
 if(y>h+7)return 0;
 if(b==='Mountains'&&y===h+1&&rnd(x,z,seed+7)>.94)return 3;
 if(b==='Swamp'&&y===h+1&&rnd(x,z,seed+8)>.97)return 4;
 for(let ox=-2;ox<=2;ox++)for(let oz=-2;oz<=2;oz++){
  const X=x+ox,Z=z+oz;if(!tree(X,Z))continue;
  const th=height(X,Z);
  if(!ox&&!oz&&y>th&&y<=th+4)return 4;
  if(y>=th+3&&y<=th+6&&Math.abs(ox)+Math.abs(oz)+Math.abs(y-th-5)<=4)return 5;
 }
 return 0;
}
function block(x,y,z){x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);const k=tag(x,y,z);return edits.has(k)?edits.get(k):natural(x,y,z);}
