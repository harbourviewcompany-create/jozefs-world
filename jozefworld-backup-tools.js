import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const cfg=window.JW_FAMILY_CLOUD,universe=window.JWUniverse;
const out=document.getElementById('backup-history-output');
document.getElementById('backup-export')?.addEventListener('click',()=>{
const data=JSON.stringify({format:'jozefworld-achievements-v1',exported_at:new Date().toISOString(),world:localStorage.getItem('jw-world-code'),progress:universe.read()},null,2);
const blob=new Blob([data],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='jozefworld-achievements-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);
});
document.getElementById('backup-history')?.addEventListener('click',async()=>{
if(!cfg?.url||!cfg?.publishableKey){out.textContent='Cloud unavailable';return}
out.textContent='Loading versions…';
const db=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await db.rpc('jw_backup_versions',{p_world:localStorage.getItem('jw-world-code')});
if(error){out.textContent='Unable to load versions';return}
out.replaceChildren();
for(const v of data||[]){const row=document.createElement('div');row.style.padding='8px';row.textContent=new Date(v.at).toLocaleString()+' · '+Object.keys(v.achievements||{}).length+' achievements';out.append(row)}
if(!data?.length)out.textContent='No cloud versions yet';
});
