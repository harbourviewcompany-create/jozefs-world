/* No-login two-device progress relay. Data stays on each device and synchronizes when both devices are online. */
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD,universe=window.JWUniverse;
const status=document.getElementById('world-sync-status');
const say=t=>{if(status)status.textContent=t};
const valid=t=>/^[a-f0-9]{32}$/.test(t||'');
const url=new URL(location.href);
let world=url.searchParams.get('world');
if(!valid(world))world=localStorage.getItem('jw-world-code');
if(!valid(world)){world=crypto.randomUUID().replaceAll('-','');localStorage.setItem('jw-world-code',world)}
else localStorage.setItem('jw-world-code',world);
url.searchParams.set('world',world);history.replaceState(null,'',url);window.JWWorldId=world;
document.querySelectorAll('[data-world-game]').forEach(a=>{const target=new URL(a.href);target.searchParams.set('world',world);a.href=target.href});
const share=document.getElementById('share-world');
if(share)share.onclick=async()=>{try{await navigator.share({title:'JozefWorld',url:url.href})}catch(e){if(e.name==='AbortError')return;try{await navigator.clipboard.writeText(url.href);say('Family link copied · open on the other phone')}catch{prompt('Copy family link',url.href)}}};
if(!cfg?.url||!cfg?.publishableKey){say('Offline · saved on this phone');}
else{
 const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const channel=db.channel('jw-world-progress-'+world,{config:{broadcast:{self:false},presence:{key:crypto.randomUUID()}}});
 let connected=false,peer=false,lastSend=0,backupBusy=false,backupPending=false,backupTimer=null;const restore=async()=>{if(backupBusy){backupPending=true;return}backupBusy=true;try{const local=universe.read();const {data,error}=await db.rpc('jw_backup_sync',{p_world:world,p_achievements:local.completed});if(error)throw error;const values=Object.values(data||{});const xp=values.reduce((n,v)=>n+(Number(v?.xp)||10),0),stars=values.reduce((n,v)=>n+(Number(v?.stars)||1),0);universe.merge({completed:data||{},xp,stars});say('Cloud backup saved · '+new Date().toLocaleTimeString());}catch(e){say('Cloud backup unavailable · local copy safe');}finally{backupBusy=false;if(backupPending){backupPending=false;setTimeout(restore,800)}}};const queueBackup=()=>{clearTimeout(backupTimer);backupTimer=setTimeout(restore,900)};
 const send=()=>{if(!connected)return;lastSend=Date.now();channel.send({type:'broadcast',event:'progress',payload:{type:'snapshot',state:universe.read()}})};
 channel.on('broadcast',{event:'progress'},({payload})=>{if(payload?.type!=='snapshot'||!payload.state||typeof payload.state!=='object')return;const entries=Object.entries(payload.state.completed||{}).filter(([k,v])=>/^[a-z0-9:_-]{1,80}$/i.test(k)&&v&&typeof v==='object').slice(0,300);const completed=Object.fromEntries(entries);universe.merge({completed,xp:Math.min(1e7,Number(payload.state.xp)||0),stars:Math.min(1e6,Number(payload.state.stars)||0)});say('Connected · progress shared with other phone');queueBackup()});
 channel.on('presence',{event:'sync'},()=>{const members=Object.values(channel.presenceState()).flat();peer=members.length>1;if(peer){say('Both phones connected · sharing progress');send()}else say('Waiting for other phone · use SHARE FAMILY LINK')});
 channel.subscribe(async state=>{if(state==='SUBSCRIBED'){connected=true;await channel.track({role:localStorage.getItem('jw-player-role')||'player'});send();say('Ready · share the family link to connect')}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)){connected=false;say('Offline · progress saved on this phone')}});
 addEventListener('jw:progress',()=>{queueBackup();if(connected&&Date.now()-lastSend>1200)send()});
 setInterval(()=>{if(connected&&peer)send();if(!document.hidden)restore()},30000);restore();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){send();restore()}});
}
