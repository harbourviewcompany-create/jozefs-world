import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD||{};
const panel=document.getElementById('cloud-login');
if(cfg.url&&cfg.publishableKey){
 const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 panel.hidden=false;
 const status=document.getElementById('cloud-status'),send=document.getElementById('cloud-send'),signout=document.getElementById('cloud-signout');
 const state=async()=>{const {data:{user},error}=await db.auth.getUser();if(error||!user){status.textContent='Sign in to access the shared family album.';signout.hidden=true;send.hidden=false;return}const {data:membership,error:membershipError}=await db.from('family_members').select('family_id,role').eq('user_id',user.id).maybeSingle();signout.hidden=false;send.hidden=true;if(membershipError||!membership){status.textContent='Signed in, but this account has not been approved for the family album.';return}status.textContent='Signed in as '+user.email+' · Family role: '+membership.role;window.dispatchEvent(new CustomEvent('jw-family-cloud-ready',{detail:{client:db,familyId:membership.family_id,userId:user.id}}))};
 send.onclick=async()=>{const email=document.getElementById('cloud-email').value.trim();if(!email){status.textContent='Enter your email address.';return}send.disabled=true;const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:false}});status.textContent=error?'Unable to send sign-in link: '+error.message:'Check your email for the sign-in link.';send.disabled=false};
 signout.onclick=async()=>{await db.auth.signOut();location.reload()};
 db.auth.onAuthStateChange(()=>setTimeout(state,0));await state();
}
