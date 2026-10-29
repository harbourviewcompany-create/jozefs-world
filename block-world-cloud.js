/* Authenticated shared-world persistence. Daddy is the authoritative writer. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD;
const game=window.BlockWorld2D;
const status=document.getElementById('bw-cloud-status');
const email=document.getElementById('bw-cloud-email');
const button=document.getElementById('bw-cloud-login');
const restore=document.getElementById('bw-cloud-restore');
if(cfg?.url&&cfg?.publishableKey&&game&&status){
 const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 let familyId=null,role=null,userId=null,loaded=false,saving=false,allowSave=false,lastSaved='',lastRevision=0;
 const set=t=>{status.textContent=t;};
 const valid=w=>w&&['180x72','280x110'].includes(w.w+'x'+w.h)&&Array.isArray(w.world)&&w.world.length===w.h&&w.world.every(row=>Array.isArray(row)&&row.length===w.w)&&Array.isArray(w.players)&&w.players.length===2;
 const host=()=>window.BlockWorldCoop?.role?.()!=='guest'&&localStorage.getItem('jw2d-family-role-v4')==='Daddy';
 const parent=()=>['parent','dad','daddy','owner','admin'].includes(String(role).toLowerCase());
 async function load(force=false){
  if(!familyId||(!force&&loaded))return;
  const {data,error}=await db.from('family_block_worlds').select('world,revision,updated_at').eq('family_id',familyId).maybeSingle();
  if(error){set('Cloud restore unavailable: '+error.message);return;}
  loaded=true;
  if(!data){allowSave=true;set('Cloud ready. Your first world will be saved from Daddy’s phone.');return;}
  if(!valid(data.world)){set('Cloud world has an unsupported format; local world kept.');return;}
  if(window.BlockWorldCoop?.connected?.()){set('Cloud save found. Disconnect before restoring.');return;}
  if(!host()){set('Cloud world available. Jozef receives it from Daddy when connected.');return;}
  if(!force&&!confirm('A shared cloud world exists. Load it on Daddy’s phone? Your local world will be backed up first.')){set('Local world retained. Tap Restore Cloud World to load later.');return;}
  try{game.saveHost?.();if(game.useWorld(data.world)===false)throw Error('World rejected');game.saveHost?.();lastRevision=data.revision;lastSaved=JSON.stringify(data.world);allowSave=true;set('Shared world restored from cloud.');}
  catch(e){set('Restore failed; local world retained: '+e.message);}
 }
 async function save(){
  if(!familyId||!parent()||!host()||!loaded||!allowSave||saving)return;
  const world=game.getWorld?.();
  if(!valid(world))return;
  const json=JSON.stringify(world);
  if(json===lastSaved)return;
  saving=true;
  try{
   const payload={family_id:familyId,world,updated_by:userId,updated_at:new Date().toISOString()};
   let result;
   if(lastRevision){
    result=await db.from('family_block_worlds').update(payload).eq('family_id',familyId).eq('revision',lastRevision).select('revision').maybeSingle();
    if(!result.error&&!result.data){set('Cloud save changed on another device. Restore before saving again.');return;}
   }else{
    result=await db.from('family_block_worlds').upsert(payload,{onConflict:'family_id'}).select('revision').single();
   }
   if(result.error)throw result.error;
   lastRevision=result.data?.revision||lastRevision;
   lastSaved=json;set('Cloud saved · '+new Date().toLocaleTimeString());
  }catch(e){set('Cloud save pending: '+e.message);}
  finally{saving=false;}
 }
 async function init(){
  const {data:{user}}=await db.auth.getUser();
  if(!user){set('Cloud backup: sign in once with your family email.');email.hidden=false;button.hidden=false;return;}
  userId=user.id;
  const {data,error}=await db.from('family_members').select('family_id,role').eq('user_id',user.id).maybeSingle();
  if(error||!data){set('Signed in, but this account is not an approved family member.');return;}
  familyId=data.family_id;role=data.role;
  email.hidden=true;button.hidden=true;restore.hidden=!parent();
  set('Family cloud connected. Checking for saved world…');
  await load();
 }
 button.onclick=async()=>{
  const address=email.value.trim();if(!address)return set('Enter your family email.');
  button.disabled=true;
  const {error}=await db.auth.signInWithOtp({email:address,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:false}});
  button.disabled=false;set(error?'Sign-in failed: '+error.message:'Check your email for the sign-in link, then return here.');
 };
 restore.onclick=()=>load(true);
 db.auth.onAuthStateChange(()=>setTimeout(init,0));
 await init();
 setInterval(save,30000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});
 window.addEventListener('pagehide',()=>{save();});
 window.BlockWorldCloud=Object.freeze({save,restore:()=>load(true),status:()=>({connected:!!familyId,role,lastRevision})});
}
