/* Open two-player world. No accounts: select Daddy or Jozef on any device. */
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD,game=window.BlockWorld2D,el=document.getElementById('bw-cloud-status');
if(cfg?.url&&cfg?.publishableKey&&game&&el){
 const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const key='jw2d-family-role-v4',worldId='jozef-daddy';
 let player=localStorage.getItem(key),owner=false,revision=0,lastSaved='',loaded=false,saving=false,relay=false,channel=null,busy=false,transferSeq=0,offlineEdits=false,offlineBase=null,lastPoll=0;
 const valid=w=>w&&['180x72','280x110'].includes(w.w+'x'+w.h)&&Array.isArray(w.world)&&w.world.length===w.h&&w.world.every(r=>Array.isArray(r)&&r.length===w.w)&&Array.isArray(w.players)&&w.players.length===2;
 const set=t=>{el.textContent=t;};
 const localKey='jw-block-open-offline-'+player;
 const cacheLocal=()=>{try{const w=game.getWorld?.();if(valid(w))localStorage.setItem(localKey,JSON.stringify({world:w,revision,at:Date.now()}));}catch(_){}};
 const restoreLocal=()=>{try{const v=JSON.parse(localStorage.getItem(localKey)||'null');if(valid(v?.world)){game.useWorld(v.world);revision=v.revision||0;loaded=true;set('Local world restored · connecting…');return true;}}catch(_){}return false;};

 let editSaveTimer=0;
 const previousBlockChanged=game.onBlockChanged;
 game.onBlockChanged=(...args)=>{previousBlockChanged?.(...args);cacheLocal();if(!relay)offlineEdits=true;if(owner){clearTimeout(editSaveTimer);editSaveTimer=setTimeout(save,1800);}};
 const transfers=new Map();
 const maxChunk=6000;
 async function pack(raw){
  if(typeof CompressionStream==='undefined'||raw.length<12000)return {raw,encoding:'json'};
  try{const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));const bytes=new Uint8Array(await new Response(stream).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {raw:btoa(binary),encoding:'gzip'};}catch(_){return {raw,encoding:'json'};}
 }
 async function unpack(raw,encoding){
  if(encoding!=='gzip')return raw;
  const binary=atob(raw),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  return await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 }
 async function sendRelay(message){
  if(!relay||!message||typeof message.t!=='string')return false;
  const packed=await pack(JSON.stringify(message));const raw=packed.raw;
  const id=player+'-'+Date.now()+'-'+(++transferSeq);
  if(raw.length>maxChunk){
   const total=Math.ceil(raw.length/maxChunk);
   if(total>320){set('World too large to synchronize.');return false;}
   for(let i=0;i<total;i++)channel.send({type:'broadcast',event:'game-chunk',payload:{from:player,id,index:i,total,part:raw.slice(i*maxChunk,(i+1)*maxChunk),encoding:packed.encoding}});
  }else channel.send({type:'broadcast',event:'game-action',payload:{from:player,message}});
  return true;
 }
 async function acceptChunk(p){
  if(!p||!['json','gzip'].includes(p.encoding)||p.from===player||!['Daddy','Jozef'].includes(p.from)||typeof p.id!=='string'||p.id.length>100||!Number.isInteger(p.total)||p.total<1||p.total>320||!Number.isInteger(p.index)||p.index<0||p.index>=p.total||typeof p.part!=='string'||p.part.length>maxChunk)return;
  for(const [id,t] of transfers)if(Date.now()-t.at>20000)transfers.delete(id);
  let t=transfers.get(p.id);
  if(!t){t={at:Date.now(),total:p.total,encoding:p.encoding,parts:Array(p.total)};transfers.set(p.id,t);}
  if(t.total!==p.total||t.encoding!==p.encoding)return;
  t.parts[p.index]=p.part;
  if(t.parts.filter(part=>typeof part==='string').length===t.total){
   transfers.delete(p.id);
   try{const m=JSON.parse(await unpack(t.parts.join(''),t.encoding));if(m&&typeof m.t==='string')window.BlockWorldCoop?.relayMessage?.(m);}catch(_){}
  }
 }

 async function load(){
  const {data,error}=await db.from('block_world_open').select('world,revision').eq('id',worldId).single();
  if(error){restoreLocal();set('Cloud temporarily unavailable · playing locally');return false;}
  if(data.world&&valid(data.world)){
   try{if(game.useWorld(data.world)===false)throw Error('World rejected');game.saveHost?.();}catch(e){set('Restore failed: '+e.message);return false;}
  }
  revision=data.revision;lastSaved=data.world?JSON.stringify(data.world):'';loaded=true;cacheLocal();
  set(data.world?'Shared world restored.':'New shared world ready.');
  return true;
 }
 async function save(){
  cacheLocal();if(!owner||!loaded||saving)return;
  const world=game.getWorld?.();if(!valid(world))return;
  const json=JSON.stringify(world);if(json===lastSaved)return;
  saving=true;
  try{
   const {data,error}=await db.rpc('block_world_open_save',{p_player:player,p_revision:revision,p_world:world});
   if(error)throw error;
   revision=data;lastSaved=json;offlineEdits=false;cacheLocal();set('World saved · '+new Date().toLocaleTimeString());
  }catch(e){set('Save pending: '+e.message);}
  finally{saving=false;}
 }
 async function session(){
  if(!['Daddy','Jozef'].includes(player)||busy||document.hidden)return;
  busy=true;
  try{
   const {data,error}=await db.rpc('block_world_open_claim',{p_player:player});
   if(error)throw error;
   const previous=owner;owner=data===true;
   if(owner&&!previous){
    if(!await load())return;
    window.BlockWorldCoop?.automaticHost?.();
    set('Playing as '+player+' · shared world');
   }else if(!owner){
    if(previous)await load();
    if(relay)window.BlockWorldCoop?.automaticJoin?.();
    set(relay?'Joined '+(player==='Daddy'?'Jozef':'Daddy')+'’s world':'Shared world online · live connection retrying');
   }
  }catch(e){set('Reconnecting: '+e.message);}
  finally{busy=false;}
 }
 async function start(){
  if(!['Daddy','Jozef'].includes(player))return;
  if(channel)return;
  restoreLocal();
  set('Connecting as '+player+'…');
  channel=db.channel('block-world-open-'+worldId,{config:{broadcast:{self:false}}});
  channel.on('broadcast',{event:'game-action'},({payload})=>{
   if(!payload||payload.from===player||!['Daddy','Jozef'].includes(payload.from))return;
   if(!payload.message||typeof payload.message.t!=='string')return;
   window.BlockWorldCoop?.relayMessage?.(payload.message);
  });
  channel.on('broadcast',{event:'game-chunk'},({payload})=>acceptChunk(payload));
  channel.on('broadcast',{event:'world-request'},async()=>{
   if(!owner)return;
   const world=game.getWorld?.();
   if(valid(world))sendRelay({t:'world',w:world,stamp:Date.now()});
  });
  channel.on('broadcast',{event:'world-snapshot'},({payload})=>{
   if(owner||window.BlockWorldCoop?.role?.()!=='guest'||!valid(payload?.world))return;
   try{game.useWorld(payload.world);set('Live world synchronized.');}catch(_){}
  });
  channel.subscribe(async state=>{
   relay=state==='SUBSCRIBED';
   if(relay)await session();
   else {set('Live connection retrying · cloud saves still available');const live=document.getElementById('coop-live');if(live){live.textContent='● SHARED WORLD · CONNECTING';live.classList.remove('online');}}
  });
 }
 window.BlockWorldRelay=Object.freeze({
  connected:()=>relay,
  send:sendRelay
 });
 window.BlockWorldCloud=Object.freeze({save,restore:load,status:()=>({player,owner,revision,connected:relay})});
 window.addEventListener('blockworld-player-selected',e=>{
  const next=e.detail?.player;
  if(!['Daddy','Jozef'].includes(next))return;
  if(player&&player!==next){location.reload();return;}
  player=next;start();
 });
 if(['Daddy','Jozef'].includes(player))start();
 setInterval(session,10000);
 setInterval(async()=>{if(relay||owner||!loaded||document.hidden||Date.now()-lastPoll<4500)return;lastPoll=Date.now();try{const {data,error}=await db.from('block_world_open').select('world,revision').eq('id',worldId).single();if(!error&&data?.revision>revision&&valid(data.world)){game.useWorld(data.world);revision=data.revision;lastSaved=JSON.stringify(data.world);set('Shared world updated · reconnecting live play');}}catch(_){}},5000);
 setInterval(save,15000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cacheLocal();save();}else session();});
 window.addEventListener('pagehide',()=>{cacheLocal();save();});
}
