import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD,universe=window.JWUniverse,status=document.getElementById('cloud-status');
const show=t=>{if(status)status.textContent=t};
if(cfg?.url&&cfg?.publishableKey&&universe){
const db=createClient(cfg.url,cfg.publishableKey);let familyId=null,busy=false,merging=false;
async function sync(){
if(busy||!familyId)return;busy=true;
try{
const {data:remote,error:loadError}=await db.from('family_world_progress').select('xp,stars,achievements').eq('family_id',familyId).maybeSingle();
if(loadError)throw loadError;
const local=universe.read(),merged={...(remote?.achievements||{}),...local.completed};
const xp=Math.max(remote?.xp||0,local.xp,Object.values(merged).reduce((n,a)=>n+(Number(a?.xp)||10),0));
const stars=Math.max(remote?.stars||0,local.stars,Object.values(merged).reduce((n,a)=>n+(Number(a?.stars)||1),0));
const {error}=await db.from('family_world_progress').upsert({family_id:familyId,xp,stars,achievements:merged,updated_at:new Date().toISOString()},{onConflict:'family_id'});
if(error)throw error;
merging=true;universe.merge({completed:merged,xp,stars});merging=false;
show('Family cloud synced · '+new Date().toLocaleTimeString());
}catch(e){merging=false;show('Sync unavailable · local achievements kept');}finally{busy=false}}
async function authenticate(){
const {data:{user}}=await db.auth.getUser();if(!user){familyId=null;show('Sign in to synchronize family achievements');return}
const {data:member,error}=await db.from('family_members').select('family_id').eq('user_id',user.id).maybeSingle();
if(error||!member){familyId=null;show('Family membership required');return}
familyId=member.family_id;await sync();
}
window.addEventListener('jw:family-ready',authenticate);
window.addEventListener('jw:progress',()=>{if(!merging)sync()});
db.auth.onAuthStateChange(()=>{setTimeout(authenticate,0)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
setInterval(()=>{if(!document.hidden)sync()},30000);
await authenticate();
}
