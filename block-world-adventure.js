/* Read-only shared adventure journal. Uses authoritative game state; never writes guest saves. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),g=window.BlockWorld2D;
if(!g||!$('bw-adventure'))return;
const missions=[
 'Gather wood to prepare your first camp.',
 'Build a shelter together before exploring farther.',
 'Explore the world and discover new places.',
 'Search deeper for rare materials and diamonds.',
 'Unlock the portal and visit another realm.',
 'Adventure complete! Keep building your shared home.'
];
const goalNames={wood:'Wood gathered',build:'Blocks built',explore:'Exploration',diamond:'Diamonds',portal:'Portals'};
function update(){
 const panel=$('bw-adventure');if(!panel.open)return;
 const s=g.getState?.();if(!s)return;
 const stage=Math.min(5,Math.max(0,Number(s.questStage)||0));
 $('bw-adventure-mission').textContent=missions[stage];
 $('bw-adventure-progress').value=stage;
 const coop=window.BlockWorldConnectionDiagnostics?.();
 $('bw-adventure-team').textContent=coop?.channelOpen&&coop?.ready?'Dad and Jozef are playing together':coop?.role==='host'?'Waiting for Jozef to join':coop?.role==='guest'?'Reconnecting to Dad’s world':'Solo play — open PLAY TOGETHER to invite Jozef';
 const goals=Object.entries(s.goals||{}).filter(([key,value])=>key in goalNames&&Number.isFinite(value));
 $('bw-adventure-goals').textContent=goals.map(([key,value])=>goalNames[key]+': '+Math.max(0,Math.floor(value))).join(' · ');
 $('bw-adventure-regroup').disabled=!(coop?.channelOpen&&coop?.ready);
 const health=(s.players||[]).map((p,i)=>(i?'Jozef':'Dad')+': '+Math.max(0,Math.round(p.health||0))+' HP');
 const team=$('bw-adventure-health');if(team)team.textContent=health.join(' · ');
}
$('bw-adventure').addEventListener('toggle',update);
$('bw-adventure-regroup').addEventListener('click',()=>{
 const s=g.getState?.(),c=window.BlockWorldCoop;
 if(!s||!c?.connected?.()){g.setStatus?.('Connect both players before regrouping.');return;}
 if(c.role?.()==='guest'){g.setStatus?.('Ask Dad to use the regroup action.');return;}
 const success=g.regroup?.(0);
 g.setStatus?.(success?'Regrouped with Jozef.':'Move farther apart before regrouping.');
});

const backupKey='jozefs-block-shared-backups-v1',challengeKey='jozefs-block-build-challenge-v1';
const blueprints={cabin:{title:'Forest Cabin',materials:{4:12,7:16,12:4}},bridge:{title:'River Bridge',materials:{7:24,4:8}},tower:{title:'Lookout Tower',materials:{3:20,7:12,12:4}}};
let challenge=null,backupTimer=0;
try{challenge=JSON.parse(localStorage.getItem(challengeKey)||'null');}catch(_){}
const isGuest=()=>window.BlockWorldCoop?.role?.()==='guest';
const hostCanSave=()=>!isGuest();
const notifyBackup=t=>{const e=$('bw-backup-status');if(e)e.textContent=t;};
function backups(){try{const b=JSON.parse(localStorage.getItem(backupKey)||'[]');return Array.isArray(b)?b:[]}catch(_){return []}}
function snapshot(){const world=g.getWorld?.();if(!world||!Array.isArray(world.world)||world.world.length!==72)return null;return {format:'JozefBlockSharedBackup',version:1,createdAt:new Date().toISOString(),world};}
function backup(){if(!hostCanSave()){notifyBackup('Only Dad’s hosting device can back up the shared world.');return false;}const b=snapshot();if(!b)return false;try{const history=backups();history.unshift(b);localStorage.setItem(backupKey,JSON.stringify(history.slice(0,3)));g.saveHost?.();notifyBackup('Saved '+new Date(b.createdAt).toLocaleString()+' · '+Math.min(history.length,3)+' restore points on this device');return true;}catch(_){notifyBackup('Storage is full. Export a backup file instead.');return false;}}
function exportBackup(){const b=snapshot();if(!b)return;const blob=new Blob([JSON.stringify(b)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dad-jozef-shared-world-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('bw-backup-now').onclick=backup;
$('bw-backup-export').onclick=exportBackup;
$('bw-backup-import').onclick=()=>{if(isGuest()){notifyBackup('Only the host can restore a world.');return;}$('bw-backup-import-file').click();};
$('bw-backup-import-file').onchange=async e=>{const file=e.target.files?.[0];if(!file||file.size>1200000)return notifyBackup('Invalid or oversized backup file.');try{const b=JSON.parse(await file.text()),w=b.world;if(b.format!=='JozefBlockSharedBackup'||b.version!==1||w?.w!==180||w?.h!==72||!Array.isArray(w.world)||w.world.length!==72||!w.world.every(row=>Array.isArray(row)&&row.length===180&&row.every(v=>Number.isInteger(v)&&v>=0&&v<=31))||!Array.isArray(w.players)||w.players.length!==2)throw Error('Invalid world data');if(!confirm('Replace the current world with this backup?'))return;backup();if(!g.useWorld(w))throw Error('Restore rejected');g.saveHost?.();notifyBackup('Backup restored on host. Reconnect Jozef to synchronize.');}catch(_){notifyBackup('Backup could not be restored.');}finally{e.target.value='';}};
function countMaterials(spec){const counts={};const w=g.getWorld?.();for(const row of w?.world||[])for(const id of row)if(id in spec.materials)counts[id]=(counts[id]||0)+1;return counts;}
function refreshChallenge(){const e=$('bw-build-progress');if(!e)return;if(!challenge||!blueprints[challenge.id]){e.textContent='Choose a blueprint to begin.';return;}const spec=blueprints[challenge.id],counts=countMaterials(spec),base=challenge.baseline||{};const parts=Object.entries(spec.materials).map(([id,required])=>{const placed=Math.max(0,(counts[id]||0)-(base[id]||0));return id+': '+Math.min(required,placed)+'/'+required;});const complete=Object.entries(spec.materials).every(([id,required])=>(counts[id]||0)-(base[id]||0)>=required);e.textContent=spec.title+' · '+parts.join(' · ')+(complete?' · MATERIAL GOAL COMPLETE!':' · Build with newly placed blocks');}
$('bw-build-start').onclick=()=>{if(isGuest()){g.setStatus?.('Ask Dad to start the team challenge.');return;}const id=$('bw-build-blueprint').value;if(!blueprints[id])return;challenge={id,startedAt:Date.now(),baseline:countMaterials(blueprints[id])};try{localStorage.setItem(challengeKey,JSON.stringify(challenge));}catch(_){}window.BlockWorldCoop?.broadcastTeamMessage?.('challenge:'+id+':'+JSON.stringify(challenge.baseline));refreshChallenge();};
window.addEventListener('blockworld-team-message',e=>{const m=e.detail?.message||'';if(m.startsWith('challenge:')){const rest=m.slice(10),sep=rest.indexOf(':'),id=sep<0?rest:rest.slice(0,sep);if(blueprints[id]){let baseline={};try{baseline=sep<0?{}:JSON.parse(rest.slice(sep+1));}catch(_){}challenge={id,startedAt:Date.now(),baseline};refreshChallenge();}}});
setInterval(()=>{if(!document.hidden){refreshChallenge();if(hostCanSave()&&Date.now()-backupTimer>300000){backupTimer=Date.now();backup();}}},12000);

setInterval(update,1500);
})();