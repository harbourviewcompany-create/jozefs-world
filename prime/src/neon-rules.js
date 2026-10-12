/** Deterministic, offline Neon City game rules.
 * Compatible with the existing Adventure Circuit's original save format.
 */
export const KEY='jozefs-world-adventure-v1';
export const COLS=16,ROWS=10;
export const STARS=[[3,2],[7,2],[10,5],[12,7],[4,7]];
export const SECRETS=[[12,1],[2,7]];
export const BEACONS=[[5,4],[11,6]];
export const WALLS=[[4,1],[4,2],[4,3],[7,4],[8,4],[9,4],[6,6],[6,7],[8,7],[10,2]];
export const fresh=()=>({completed:[],stars:[],secrets:[],switches:[],outfit:'classic',coop:false,zone:0});
const unique=(a)=>[...new Set(a)];
function ids(xs,kind,max){
 const allowed=new Set(Array.from({length:4},(_,z)=>Array.from({length:max},(_,i)=>z+'-'+kind+'-'+i)).flat());
 return Array.isArray(xs)?unique(xs.filter(x=>typeof x==='string'&&allowed.has(x))).slice(0,4*max):[];
}
export function clean(raw){
 const v=fresh();if(!raw||typeof raw!=='object'||Array.isArray(raw))return v;
 v.completed=Array.isArray(raw.completed)?unique(raw.completed.filter(x=>Number.isInteger(x)&&x>=0&&x<4)).sort():[];
 v.stars=ids(raw.stars,'star',5);v.secrets=ids(raw.secrets,'secret',2);v.switches=ids(raw.switches,'switch',2);
 const outfit=['classic','neon','frost','skyline','legend'];
 v.outfit=outfit.includes(raw.outfit)&&outfit.indexOf(raw.outfit)<=v.completed.length?raw.outfit:'classic';
 v.coop=raw.coop===true;
 v.zone=Number.isInteger(raw.zone)?Math.max(0,Math.min(3,v.completed.length,raw.zone)):0;
 return v;
}
export function load(storage){try{return clean(JSON.parse(storage.getItem(KEY)||'null'))}catch{return fresh()}}
export function save(storage,state){try{storage.setItem(KEY,JSON.stringify(clean(state)));return true}catch{return false}}
export const code=(kind,index)=>'0-'+kind+'-'+index;
export function traversable(x,y){
 return Number.isInteger(x)&&Number.isInteger(y)&&x>0&&y>0&&x<COLS-1&&y<ROWS-1&&!WALLS.some(p=>p[0]===x&&p[1]===y);
}
export function path(from,to,avoid=null){
 if(!traversable(...from)||!traversable(...to)||(avoid&&avoid[0]===to[0]&&avoid[1]===to[1]))return null;
 const start=from[1]*COLS+from[0],end=to[1]*COLS+to[0];
 if(start===end)return [];
 const seen=new Set([start]),prev=new Map(),queue=[start];
 for(let k=0;k<queue.length;k++){
  const cur=queue[k],x=cur%COLS,y=Math.floor(cur/COLS);
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
   const xx=x+dx,yy=y+dy,id=yy*COLS+xx;
   if(seen.has(id)||!traversable(xx,yy)||(avoid&&avoid[0]===xx&&avoid[1]===yy))continue;
   seen.add(id);prev.set(id,cur);queue.push(id);
   if(id===end){
    const result=[];let at=id;
    while(at!==start){result.unshift([at%COLS,Math.floor(at/COLS)]);at=prev.get(at)}
    return result;
   }
  }
 }
 return null;
}
export function collect(state,pos){
 const next=clean(state);
 for(const [kind,list,key] of [['star',STARS,'stars'],['secret',SECRETS,'secrets'],['switch',BEACONS,'switches']]){
  for(let i=0;i<list.length;i++){
   if(list[i][0]!==pos[0]||list[i][1]!==pos[1])continue;
   const id=code(kind,i);if(next[key].includes(id))continue;
   next[key].push(id);return {state:next,event:kind};
  }
 }
 return {state:next,event:null};
}
export function ready(s){
 return s.stars.filter(x=>x.startsWith('0-star-')).length>=2&&s.switches.filter(x=>x.startsWith('0-switch-')).length>=2;
}
export function champion(s){
 if(!ready(s))return clean(s);
 const next=clean(s);next.completed=unique([...next.completed,0]).sort();next.outfit='neon';return next;
}
export function objective(s,from){
 if(s.completed.includes(0))return {kind:'exit',at:[14,8]};
 const possibilities=s.stars.filter(x=>x.startsWith('0-star-')).length<2?
  STARS.map((p,i)=>({kind:'star',at:p,id:code('star',i)})).filter(x=>!s.stars.includes(x.id)):
  s.switches.filter(x=>x.startsWith('0-switch-')).length<2?
  BEACONS.map((p,i)=>({kind:'beacon',at:p,id:code('switch',i)})).filter(x=>!s.switches.includes(x.id)):
  [{kind:'champion',at:[13,7]}];
 const reachable=possibilities.map(x=>({...x,path:path(from,x.at)})).filter(x=>x.path!==null).sort((a,b)=>a.path.length-b.path.length);
 return reachable[0]||null;
}
