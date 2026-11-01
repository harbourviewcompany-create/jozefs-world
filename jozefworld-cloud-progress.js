import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD,universe=window.JWUniverse;
const status=document.getElementById('cloud-status');
const show=t=>{if(status)status.textContent=t};
if(cfg?.url&&cfg?.publishableKey&&universe){
 const db=createClient(cfg.url,cfg.publishableKey);
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){show('Local progress only · sign in through the family area to enable cloud sync');}
 else {
  const {data:member,error:memberError}=await db.from('family_members').select('family_id').eq('user_id',user.id).maybeSingle();
  if(memberError||!member){show('Family membership required before cloud sync');}
  else{
   const familyId=member.family_id;
   const {data:remote,error:loadError}=await db.from('family_world_progress').select('xp,stars,achievements').eq('family_id',familyId).maybeSingle();
   if(loadError){show('Cloud unavailable · local progress preserved');}
   else{
    const local=universe.read();
    const merged={...(remote?.achievements||{}),...local.completed};
    const values=Object.values(merged);
    const xp=values.reduce((sum,v)=>sum+Math.min(1000,Math.max(0,Number(v?.xp)||10)),0);
    const stars=values.reduce((sum,v)=>sum+Math.min(100,Math.max(0,Number(v?.stars)||1)),0);
    const {error:saveError}=await db.from('family_world_progress').upsert({family_id:familyId,xp:Math.max(remote?.xp||0,local.xp,xp),stars:Math.max(remote?.stars||0,local.stars,stars),achievements:merged,updated_at:new Date().toISOString()},{onConflict:'family_id'});
    if(saveError)show('Cloud write failed · local progress preserved');
    else{universe.merge({completed:merged,xp:Math.max(remote?.xp||0,local.xp,xp),stars:Math.max(remote?.stars||0,local.stars,stars)});show('Family progress synced to cloud');}
   }
  }
 }
}
