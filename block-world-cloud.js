/* Open two-player world. No accounts: select Daddy or Jozef on any device. */
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD,game=window.BlockWorld2D,el=document.getElementById('bw-cloud-status');
if(cfg?.url&&cfg?.publishableKey&&game&&el){
 const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const key='jw2d-family-role-v4',worldId='jozef-daddy';
 let player=localStorage.getItem(key),owner=false,revision=0,lastSaved='',loaded=false,saving=false,relay=false,channel=null,busy=false;
 const valid=w=>w&&['180x72','280x110'].includes(w.w+'x'+w.h)&&Array.isArray(w.world)&&w.world.length===w.h&&w.world.every(r=>Array.isArray(r)&&r.length===w.w)&&Array.isArray(w.players)&&w.players.length===2;
 const set=t=>{el.textContent=t;};
 async function load(){
  const {data,error}=await db.from('block_world_open').select('world,revision').eq('id',worldId).single();
  if(error){set('World connection failed: '+error.message);return false;}
  if(data.world&&valid(data.world)){
   try{if(game.useWorld(data.world)===false)throw Error('World rejected');game.saveHost?.();}catch(e){set('Restore failed: '+e.message);return false;}
  }
  revision=data.revision;lastSaved=data.world?JSON.stringify(data.world):'';loaded=true;
  set(data.world?'Shared world restored.':'New shared world ready.');
  return true;
 }
 async function save(){
  if(!owner||!loaded||saving)return;
  const world=game.getWorld?.();if(!valid(world))return;
  const json=JSON.stringify(world);if(json===lastSaved)return;
  saving=true;
  try{
   const {data,error}=await db.rpc('block_world_open_save',{p_player:player,p_revision:revision,p_world:world});
   if(error)throw error;
   revision=data;lastSaved=json;set('World saved · '+new Date().toLocaleTimeString());
  }catch(e){set('Save pending: '+e.message);}
  finally{saving=false;}
 }
 async function session(){
  if(!['Daddy','Jozef'].includes(player)||busy||document.hidden||!relay)return;
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
    window.BlockWorldCoop?.automaticJoin?.();
    set('Joined '+(player==='Daddy'?'Jozef':'Daddy')+'’s world');
   }
  }catch(e){set('Reconnecting: '+e.message);}
  finally{busy=false;}
 }
 async function start(){
  if(!['Daddy','Jozef'].includes(player))return;
  if(channel)return;
  set('Connecting as '+player+'…');
  channel=db.channel('block-world-open-'+worldId,{config:{broadcast:{self:false}}});
  channel.on('broadcast',{event:'game-action'},({payload})=>{
   if(!payload||payload.from===player||!['Daddy','Jozef'].includes(payload.from))return;
   if(!payload.message||typeof payload.message.t!=='string')return;
   window.BlockWorldCoop?.relayMessage?.(payload.message);
  });
  channel.on('broadcast',{event:'world-request'},async()=>{
   if(!owner)return;
   const world=game.getWorld?.();
   if(valid(world))channel.send({type:'broadcast',event:'world-snapshot',payload:{world}});
  });
  channel.on('broadcast',{event:'world-snapshot'},({payload})=>{
   if(owner||window.BlockWorldCoop?.role?.()!=='guest'||!valid(payload?.world))return;
   try{game.useWorld(payload.world);set('Live world synchronized.');}catch(_){}
  });
  channel.subscribe(async state=>{
   relay=state==='SUBSCRIBED';
   if(relay)await session();
   else set('World connection interrupted. Reconnecting…');
  });
 }
 window.BlockWorldRelay=Object.freeze({
  connected:()=>relay,
  send:message=>{
   if(!relay||!message||typeof message.t!=='string')return false;
   channel.send({type:'broadcast',event:'game-action',payload:{from:player,message}});
   return true;
  }
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
 setInterval(save,15000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else session();});
 window.addEventListener('pagehide',()=>{save();});
}
