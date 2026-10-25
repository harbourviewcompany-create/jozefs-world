import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD||{};
const panel=document.getElementById('cloud-login');
if(cfg.url&&cfg.publishableKey){
 window.JW_CLOUD_CONFIGURED=true;
 const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 panel.hidden=false;
 const status=document.getElementById('cloud-status'),send=document.getElementById('cloud-send'),signout=document.getElementById('cloud-signout'),codeWrap=document.getElementById('cloud-code-wrap'),verify=document.getElementById('cloud-verify');
 const state=async()=>{const {data:{user},error}=await db.auth.getUser();if(error||!user){status.textContent='Sign in to access the shared family album.';signout.hidden=true;send.hidden=false;return}const {data:membership,error:membershipError}=await db.from('family_members').select('family_id,role').eq('user_id',user.id).maybeSingle();signout.hidden=false;send.hidden=true;codeWrap.hidden=true;if(membershipError||!membership){status.textContent='Signed in, but this account has not been approved for the family album.';return}status.textContent='Signed in as '+user.email+' · Family role: '+membership.role;window.dispatchEvent(new CustomEvent('jw-family-cloud-ready',{detail:{client:db,familyId:membership.family_id,userId:user.id}}))};
 send.onclick=async()=>{const email=document.getElementById('cloud-email').value.trim();if(!email){status.textContent='Enter your email address.';return}send.disabled=true;const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:true}});status.textContent=error?'Unable to send email: '+error.message:'Check your email. Enter the verification code below if provided, or use the sign-in link. If the link opens localhost, use the code instead.';codeWrap.hidden=!!error;send.disabled=false};
 verify.onclick=async()=>{const email=document.getElementById('cloud-email').value.trim(),token=document.getElementById('cloud-code').value.trim();if(!email||!token){status.textContent='Enter your email and verification code.';return}verify.disabled=true;const {error}=await db.auth.verifyOtp({email,token,type:'email'});verify.disabled=false;if(error){status.textContent='Code not accepted: '+error.message;return}await state()};
 signout.onclick=async()=>{await db.auth.signOut();location.reload()};
 db.auth.onAuthStateChange(()=>setTimeout(state,0));await state();
}
