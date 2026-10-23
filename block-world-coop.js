/* Daddy + Jozef: real simultaneous two-device co-op for Classic Block World 2D.
   A parent-host controls Daddy, a joining player controls Jozef.
   Host is authoritative for physics, edits and progress; guests never overwrite solo saves.
   Requires bundled PeerJS + third-party signalling; no public lobby or chat. */
(()=>{
'use strict';
const g=window.BlockWorld2D,$=id=>document.getElementById(id);
if(!g||!$('coop-panel'))return;
let peer=null,conn=null,role='solo',invite='',ready=false,closed=false;
let stateAt=0,inputAt=0,snapshotAt=0,lastRealm=-1,lastInput={left:false,right:false,jump:false};
let lastPacketAt=0,editCount=0,lastActionAt=0,joinTimeout=0,lastGiveAt=0,lastRegroupAt=[-15000,-15000],lastLocatorAt=0;
let hostRetryTimer=0,hostRetryCount=0;
let hostGeneration=0;
let lastResyncRequestAt=0;
let diagnosticPhase='offline',diagnosticError='',diagnosticChangedAt=performance.now();
function diagnostic(phase,error=''){diagnosticPhase=phase;diagnosticError=error;diagnosticChangedAt=performance.now();}
function connectionReport(){return {role,phase:diagnosticPhase,ready,channelOpen:connected(),signallingReady:peerReady,peerDisconnected:!!peer?.disconnected,lastPacketAgeMs:lastPacketAt?Math.round(performance.now()-lastPacketAt):null,phaseAgeMs:Math.round(performance.now()-diagnosticChangedAt),error:diagnosticError,transport:'PeerJS WebRTC (STUN only)'};}
function refreshDiagnostics(){const d=$('coop-diagnostics');if(!d)return;const r=connectionReport();d.textContent='Connection: '+r.phase+' · Signalling: '+(r.signallingReady?'ready':'waiting')+' · Data: '+(r.channelOpen?'open':'closed')+(r.lastPacketAgeMs===null?'':' · Last packet: '+(r.lastPacketAgeMs/1000).toFixed(1)+'s')+(r.error?' · '+r.error:'');}
window.BlockWorldConnectionDiagnostics=()=>connectionReport();
// Deployment may inject a dedicated PeerServer and short-lived TURN credentials.
// Never embed long-lived TURN secrets in a public GitHub Pages bundle.
const cfg=window.BLOCK_WORLD_NETWORK||{};
const endpoint=cfg.peerServer||{};
const iceServers=Array.isArray(cfg.iceServers)&&cfg.iceServers.length?cfg.iceServers:
 [{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
const PEER_OPTIONS={
 host:endpoint.host||'0.peerjs.com',
 port:endpoint.port||443,
 path:endpoint.path||'/',
 secure:true,
 debug:0,
 config:{iceServers,iceTransportPolicy:'all'}
};
// Free STUN-only mode: no credential service, billing or third-party TURN account.
function peerOptions(){return PEER_OPTIONS;}
let retryTimer=0,retryCount=0,joiningCode='',peerReady=false,foregroundAt=performance.now();
const TAB_KEY='jozefs-block-2d-guest-tab-v1';
const rejoin=()=>{
 try{const s=JSON.parse(sessionStorage.getItem(TAB_KEY)||'null');
  return s&&Date.now()-s.at<3600000&&COOP_RE.test(s.room||'')&&
   /^jw2d-guest-[a-f0-9]{32}$/.test(s.peerId||'')?s:null;
 }catch(_){return null;}
};
const bookmark=s=>{try{sessionStorage.setItem(TAB_KEY,JSON.stringify({...s,at:Date.now()}));}catch(_){}};
const clearBookmark=()=>{try{sessionStorage.removeItem(TAB_KEY);}catch(_){}};
function ownPeerId(room){
 const saved=rejoin();if(saved?.room===room)return saved.peerId;
 const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);
 return 'jw2d-guest-'+[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
}
const COOP_RE=/^[0-9a-f]{32}$/i;
const copyInput=s=>({left:!!s?.left,right:!!s?.right,jump:!!s?.jump});
const connected=()=>!!conn?.open;
g.isHost=()=>role==='host'&&connected()&&ready;
g.isGuest=()=>role==='guest';
g.connected=()=>role!=='solo'&&connected()&&ready;
g.remoteInput=lastInput;
g.requestCraft=recipe=>{if(role==='guest'&&ready&&Number.isInteger(recipe))send({t:'craft',recipe});};
g.requestAttack=()=>{if(role==='guest'&&ready)send({t:'attack'});};
g.requestAction=(kind,a,tile)=>{
 if(role!=='guest'||!connected()||!ready)return;
 if(!['mine','place'].includes(kind)||!a||!Number.isInteger(a.x)||!Number.isInteger(a.y))return;
 send({t:'action',kind,x:a.x,y:a.y,tile,seq:++editCount});
};
g.onBlockChanged=(x,y,id)=>{
 if(g.isHost())send({t:'edit',x,y,id});
};
function setStatus(msg){
 if(role==='solo')diagnostic('offline');
 else if(ready&&connected())diagnostic('playing');
 else if(/reconnect|interrupted|stalled|lost|ended/i.test(msg))diagnostic('recovering',msg);
 else if(/invalid|unable|failed|error|timed out|unavailable/i.test(msg))diagnostic('error',msg);
 else if(/synchroniz|loading the shared world/i.test(msg))diagnostic('synchronizing');
 else diagnostic('connecting');
 const e=$('coop-status');if(e)e.textContent=msg;
 refreshDiagnostics();
 const bar=$('coop-live');if(bar){
  bar.textContent=role==='host'?(ready?'● DADDY + JO · CONNECTED':'● DADDY · WAITING'):role==='guest'?(ready?'● JO · CONNECTED':'● JO · CONNECTING'):'● 2D SOLO';
  bar.className=ready?'coop-live online':'coop-live';
 }
}
function show(){ $('coop-panel').classList.add('open'); $('coop-panel').setAttribute('aria-hidden','false'); }
function hide(){ $('coop-panel').classList.remove('open'); $('coop-panel').setAttribute('aria-hidden','true'); }
function send(value){try{if(connected())conn.send(value);}catch(e){setStatus('Connection interrupted');}}
function secureCode(){
 const rng=window.crypto;
 if(!rng?.getRandomValues)throw Error('A secure browser is required to host');
 const bytes=new Uint8Array(16);rng.getRandomValues(bytes);
 return [...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function validPlayer(p){
 return p&&['x','y','health','facing'].every(k=>Number.isFinite(p[k]))&&
 Math.abs(p.x)<100000&&Math.abs(p.y)<100000&&p.health>=0&&p.health<=100&&
 p.inventory&&typeof p.inventory==='object';
}
function validWorld(s){
 return s&&s.w===180&&s.h===72&&Array.isArray(s.world)&&s.world.length===72&&
 s.world.every(row=>Array.isArray(row)&&row.length===180&&row.every(n=>Number.isInteger(n)&&n>=0&&n<=31))&&
 Array.isArray(s.surface)&&s.surface.length===180&&s.surface.every(Number.isFinite)&&
 Array.isArray(s.players)&&s.players.length===2&&s.players.every(validPlayer)&&
 Number.isInteger(s.questStage)&&s.questStage>=0&&s.questStage<=5&&
 Number.isInteger(s.realmIndex)&&s.realmIndex>=0&&s.realmIndex<=3&&
 s.goals&&typeof s.goals==='object';
}
function validState(s){
 return s&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(validPlayer)&&
 Number.isInteger(s.questStage)&&s.questStage>=0&&s.questStage<=5&&
 Number.isInteger(s.realmIndex)&&s.realmIndex>=0&&s.realmIndex<=3&&
 s.goals&&typeof s.goals==='object';
}
function fullWorld(){
 const w=g.getWorld();
 send({t:'world',w,stamp:Date.now()});
 lastRealm=w.realmIndex;
 snapshotAt=performance.now();
}
function onMessage(m){
 if(!m||typeof m!=='object')return;
 lastPacketAt=performance.now();
 if(m.t==='world'&&role==='guest'){
  if(!validWorld(m.w)){setStatus('Invalid game data from host');return;}
  g.useWorld(m.w);g.role(1);ready=true;retryCount=0;lastResyncRequestAt=0;
  const previous=rejoin();if(previous?.room===joiningCode)bookmark({...previous,active:true});clearTimeout(retryTimer);retryTimer=0;clearTimeout(joinTimeout);joinTimeout=0;lastRealm=m.w.realmIndex;
  send({t:'ready'});setStatus('Connected! You are Jozef. Both of you can play.');
  $('btn-switch').style.display='none';
  $('reset').disabled=true;$('mode').disabled=true;
  $('save').disabled=true;
   $('bw-actions')?.querySelectorAll?.('button').forEach(b=>{if(/BUILD KIT|UNDO|REALMS|TEAM PORTAL|IMPORT/.test(b.textContent))b.disabled=true;});
   $('partner-tools').hidden=false;
  hide();
 }else if(m.t==='ready'&&role==='host'){
  ready=true;g.role(0);setStatus('Connected! You control Daddy; Jo controls Jozef.');
  $('btn-switch').style.display='none';$('partner-tools').hidden=false;hide();
 }else if(m.t==='input'&&g.isHost()){
  g.remoteInput=copyInput(m.input);
  lastPacketAt=performance.now();
 }else if(m.t==='action'&&g.isHost()){
  const now=performance.now();if(now-lastActionAt<90)return;lastActionAt=now;
  const x=m.x,y=m.y;
  if(!['mine','place'].includes(m.kind)||!Number.isInteger(x)||!Number.isInteger(y)||
    x<0||x>=180||y<0||y>=72||!Number.isInteger(m.seq))return;
  // Reach and resource checks are performed by the actual game engine on the host.
  if(m.kind==='place'&&(!Number.isInteger(m.tile)||m.tile<1||m.tile>31))return;
  g.action(1,m.kind,{x,y},m.tile);
 }else if(m.t==='attack'&&g.isHost()){
  const now=performance.now();if(now-lastActionAt<350)return;lastActionAt=now;
  g.attack(1);
 }else if(m.t==='craft'&&g.isHost()){
  const now=performance.now();if(now-lastActionAt<90)return;lastActionAt=now;
  if(!Number.isInteger(m.recipe)||m.recipe<0||m.recipe>30)return;
  const ok=g.craftFor(1,m.recipe);send({t:'feedback',msg:ok?'Crafted item in the shared world':'Not enough materials to craft'});
 }else if(m.t==='give'&&g.isHost()){
  const now=performance.now();if(now-lastGiveAt<220)return;lastGiveAt=now;
  const ok=g.giveTo(1,m.tile);send({t:'feedback',msg:ok?'Gave one block to Daddy':'Move closer or collect this block first'});
 }else if(m.t==='regroup'&&g.isHost()){
  const now=performance.now();if(now-lastRegroupAt[1]<15000)return;
  if(g.regroup(1)){lastRegroupAt[1]=now;send({t:'feedback',msg:'You regrouped with Daddy'});}
  else send({t:'feedback',msg:'Already nearby or no safe spot'});
 }else if(m.t==='feedback'&&role==='guest'){
  g.setStatus(String(m.msg||'').slice(0,100));
 }else if(m.t==='state'&&role==='guest'&&ready){
  if(!validState(m.s))return;
  if(m.s.realmIndex!==lastRealm){
   const now=performance.now();
   if(now-lastResyncRequestAt>=1500){lastResyncRequestAt=now;send({t:'resync'});}
   return;
  }
  g.useState(m.s);
 }else if(m.t==='edit'&&role==='guest'&&ready){
  if([m.x,m.y,m.id].every(Number.isInteger)&&m.x>=0&&m.x<180&&m.y>=0&&m.y<72&&m.id>=0&&m.id<=31)g.useEdit(m.x,m.y,m.id);
 }else if(m.t==='resync'&&g.isHost())fullWorld();
}

function tryReconnect(){
 if(role!=='guest'||ready||connected()||!joiningCode)return;
 if(!peerReady){
  if(peer?.disconnected&&typeof peer.reconnect==='function')try{peer.reconnect();}catch(_){}
  setStatus('Reconnecting to Daddy…');return;
 }
 try{attach(peer.connect('jw2d-'+joiningCode,{reliable:true,serialization:'json'}));setStatus('Rejoining Daddy’s shared world…');}
 catch(e){scheduleReconnect();}
}
function scheduleReconnect(){
 if(role!=='guest'||ready)return;
 clearTimeout(retryTimer);
 if(retryCount>=6){setStatus('Connection lost. Tap JOIN AS JOZEF to retry.');show();return;}
 const delay=[1000,2000,3500,6000,8500,11000][retryCount++];
 setStatus('Reconnecting ('+retryCount+'/6)…');
 retryTimer=setTimeout(()=>{
  if(role!=='guest'||ready)return;
  if(peer?.disconnected&&typeof peer.reconnect==='function')try{peer.reconnect();}catch(_){}
  if(peerReady)tryReconnect();
  if(role==='guest'&&!ready)retryTimer=setTimeout(()=>{if(role==='guest'&&!ready)scheduleReconnect();},4000);
 },delay);
}
function onConnectionLost(reason){
 conn=null;ready=false;lastResyncRequestAt=0;clearTimeout(joinTimeout);joinTimeout=0;
 g.remoteInput={left:false,right:false,jump:false};
 $('partner-tools').hidden=true;
 if(role==='host'){setStatus(reason+' · waiting for Jozef to reconnect');$('coop-disconnect').disabled=false;}
 else if(role==='guest'){show();scheduleReconnect();}
}
function attach(connection){
 if(conn?.open){connection.close();return;}
 if(conn&&conn!==connection){try{conn.close();}catch(_){}}
 conn=connection;
 connection.on('open',()=>{
  if(conn!==connection){try{connection.close();}catch(_){}return;}
  lastPacketAt=foregroundAt=performance.now();
  retryCount=0;clearTimeout(retryTimer);retryTimer=0;
  $('coop-disconnect').disabled=false;
  if(role==='host'){
   ready=false;g.role(0);setStatus('Jozef joined. Synchronizing your shared world…');
   fullWorld();
  }else{
   ready=false;g.role(1);setStatus('Connected. Loading the shared world…');
  }
 });
 connection.on('data',message=>{if(conn===connection)onMessage(message);});
 connection.on('close',()=>{if(conn===connection)onConnectionLost('Connection ended');});
 connection.on('error',()=>{if(conn===connection)onConnectionLost('Connection failed');});
}
function leave(options={}){
 ++hostGeneration;
 clearTimeout(hostRetryTimer);hostRetryTimer=0;hostRetryCount=0;
 clearBookmark();
 clearTimeout(joinTimeout);joinTimeout=0;clearTimeout(retryTimer);retryTimer=0;retryCount=0;joiningCode='';peerReady=false;
 const guest=role==='guest',c=conn,p=peer;
 conn=null;peer=null;ready=false;role='solo';invite='';lastRealm=-1;lastResyncRequestAt=0;
 g.remoteInput={left:false,right:false,jump:false};
 $('coop-share').disabled=true;$('coop-disconnect').disabled=true;
 $('btn-switch').style.display='';$('reset').disabled=false;$('mode').disabled=false;$('inventory').disabled=false;$('save').disabled=false;
 $('partner-tools').hidden=true;
 $('bw-actions')?.querySelectorAll?.('button').forEach(b=>b.disabled=false);
 if(c){try{c.close();}catch(_){}}
 if(p){try{p.destroy();}catch(_){}}
 setStatus(options.reason||'Offline · your solo world is safe');
 if(guest&&!options.skipReload){location.reload();}
 else if(!guest){g.role(0);g.setStatus('Disconnected. You can keep playing solo.');}
}
function disconnect(reason){if(role==='solo')return;leave({reason});}
function startHost(recover=false){
 if(!window.Peer){setStatus('Online co-op is unavailable: PeerJS could not load.');return;}
 if(role!=='solo'&&!recover)leave({skipReload:true});
 const generation=++hostGeneration;
 try{
  if(!recover)hostRetryCount=0;
  invite=recover&&invite?invite:secureCode();
  role='host';g.saveHost();g.role(0);
  setStatus('Preparing direct multiplayer connection…');
  const options=peerOptions();
  if(generation!==hostGeneration||role!=='host')return;
  peer=new window.Peer('jw2d-'+invite,options);
  peer.on('open',()=>{
   if(generation!==hostGeneration)return;
   peerReady=true;hostRetryCount=0;clearTimeout(hostRetryTimer);hostRetryTimer=0;$('coop-code').value=invite;
   $('coop-share').disabled=false;$('coop-disconnect').disabled=false;
   setStatus('Private invite ready. Send the link to Jo, then keep this page open.');
  });
  peer.on('connection',c=>{if(generation!==hostGeneration){c.close();return;}if(conn?.open||ready){c.close();return;}attach(c);});
  peer.on('disconnected',()=>{if(generation!==hostGeneration)return;peerReady=false;if(typeof peer.reconnect==='function')try{peer.reconnect();}catch(_){};if(!connected())setStatus('Signalling interrupted · reconnecting…');});
  peer.on('error',e=>{
   if(generation!==hostGeneration)return;
   if(connected()){setStatus('Game connected · signalling temporarily interrupted');return;}
   const type=e?.type||'network';
   if(['network','server-error','socket-error','socket-closed','disconnected'].includes(type)&&hostRetryCount<5){
    const delay=[1500,3500,7000,12000,18000][hostRetryCount++];
    setStatus('Signalling unavailable ('+type+'). Retrying '+hostRetryCount+'/5…');
    clearTimeout(hostRetryTimer);
    hostRetryTimer=setTimeout(()=>{
     if(role!=='host'||peerReady)return;
     try{peer?.destroy();}catch(_){}
     peer=null;
     startHost(true);
    },delay);
    return;
   }
   const reason='Could not host ('+type+'). Check internet access and try again.';
   leave({reason,skipReload:true});show();
  });
  setStatus('Creating private game…');
 }catch(e){leave({reason:e.message,skipReload:true});}
}
function extractCode(input){
 const s=String(input||'').trim();
 const raw=s.match(/(?:^|[=#\/])(jw2d-)?([a-f0-9]{32})(?:$|[&#])/i);
 return raw?raw[2].toLowerCase():(COOP_RE.test(s)?s.toLowerCase():null);
}
function join(){
 if(!window.Peer){setStatus('Online co-op is unavailable: PeerJS could not load.');return;}
 const code=extractCode($('coop-code').value);
 if(!code){setStatus('Paste a valid invitation from Daddy.');return;}
 if(role==='host'){setStatus('Close your hosted game before joining another');return;}
 if(role==='guest'){if(!connected()&&!ready){clearTimeout(retryTimer);retryTimer=0;tryReconnect();}else setStatus('Already connecting');return;}
 g.saveHost();
 role='guest';ready=false;joiningCode=code;retryCount=0;peerReady=false;$('coop-disconnect').disabled=false;
 try{
  const old=rejoin(),peerId=ownPeerId(code);
  bookmark({room:code,peerId,active:!!(old?.room===code&&old.active)});
  setStatus('Preparing direct multiplayer connection…');
  const options=peerOptions();
  if(role!=='guest'||joiningCode!==code)return;
  peer=new window.Peer(peerId,options);
  const currentPeer=peer;
  peer.on('open',()=>{if(peer!==currentPeer||role!=='guest')return;peerReady=true;setStatus('Connecting to Daddy…');
   attach(peer.connect('jw2d-'+code,{reliable:true,serialization:'json'}));
  });
  peer.on('error',e=>{if(peer!==currentPeer||role!=='guest')return;const reason='Unable to join: '+(e?.type||'network error')+'. Check the invitation.';if(role==='guest'&&!ready){setStatus(reason);scheduleReconnect();}});
  peer.on('disconnected',()=>{if(peer!==currentPeer||role!=='guest')return;peerReady=false;if(typeof peer.reconnect==='function')try{peer.reconnect();}catch(_){};if(role==='guest'&&!ready)scheduleReconnect();});
  joinTimeout=setTimeout(()=>{if(role==='guest'&&!ready){leave({reason:'Connection timed out. Daddy must show “Private invite ready” before Jozef joins. If hosting fails, check the network or signalling service.',skipReload:true});show();}},90000);
  setStatus('Opening private connection…');
 }catch(e){leave({reason:e.message,skipReload:true});}
}
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden){foregroundAt=lastPacketAt=performance.now();
  if(role==='guest'&&!ready&&!connected()&&joiningCode){retryCount=0;scheduleReconnect();}
 }
});
g.onFrame=now=>{
 if(!connected()||!ready||document.hidden)return;
 if(now-foregroundAt>20000&&now-lastPacketAt>25000){
  setStatus('Shared game stalled · reconnecting…');
  try{conn?.close();}catch(_){}
  return;
 }
 if(now-lastLocatorAt>220){lastLocatorAt=now;partnerTools(now);refreshDiagnostics();}
 if(role==='host'){
  if(now-stateAt>100){stateAt=now;send({t:'state',s:g.getState()});}
  const r=g.getState().realmIndex;
  if(r!==lastRealm||now-snapshotAt>18000)fullWorld();
  if(now-lastPacketAt>2000){g.remoteInput={left:false,right:false,jump:false};}
 }else if(role==='guest'&&now-inputAt>65){
  inputAt=now;send({t:'input',input:g.input()});
 }
};

function partnerTools(now){
 if(!g.connected())return;
 const p=g.getState().players,own=role==='guest'?1:0;
 const dx=p[1-own].x-p[own].x,dy=p[1-own].y-p[own].y;
 const distance=Math.round(Math.hypot(dx,dy)/40);
 const direction=dx>30?'→':dx< -30?'←':'↕';
 $('partner-location').textContent=(own===0?'JO':'DADDY')+' '+direction+' '+distance+' blocks';
 $('coop-give').disabled=distance>4;
 $('coop-regroup').disabled=distance<5;
}
$('coop-give').addEventListener('click',()=>{
 if(!g.connected())return;
 const item=g.selected();
 if(role==='guest'){send({t:'give',tile:item});return;}
 const ok=g.giveTo(0,item);
 g.setStatus(ok?'Shared one block with Jozef':'Stand within 4 blocks and hold a collected item');
});
$('coop-regroup').addEventListener('click',()=>{
 if(!g.connected())return;
 const now=performance.now(),who=role==='guest'?1:0;
 if(now-lastRegroupAt[who]<15000){g.setStatus('Regroup is cooling down');return;}
 if(role==='guest'){send({t:'regroup'});lastRegroupAt[who]=now;return;}
 if(g.regroup(0)){lastRegroupAt[0]=now;g.setStatus('Regrouped with Jozef');}
 else g.setStatus('Already nearby or no safe space');
});
$('open-coop').addEventListener('click',show);
$('coop-close').addEventListener('click',hide);
$('coop-host').addEventListener('click',()=>startHost(false));
$('coop-join').addEventListener('click',join);
$('coop-disconnect').addEventListener('click',()=>leave({reason:'Disconnected'}));
$('coop-share').addEventListener('click',async()=>{
 if(!invite||role!=='host')return;
 const url=new URL(location.href);url.hash='coop='+invite;
 try{
  if(navigator.share)await navigator.share({title:'Play Block World with me',text:'Join our private Daddy + Jozef 2D world',url:url.href});
  else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);setStatus('Invite link copied. Send it privately to Jo.');}
  else setStatus('Copy your invitation code and send it privately: '+invite);
 }catch(e){setStatus('Invite ready; copy the code if sharing was cancelled.');}
});
window.addEventListener('pagehide',()=>{
 if(role==='host')g.saveHost();
});
const incoming=extractCode(location.hash);
if(incoming){
 $('coop-code').value=incoming;
 show();setStatus('Invitation detected. Tap JOIN AS JOZEF to enter the shared world.');
 // Remove the invitation from the address bar to avoid accidentally sharing the secret.
 try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}
}
if(!incoming){
 const previous=rejoin();
 if(previous?.active&&window.Peer){
  $('coop-code').value=previous.room;show();
  setStatus('Restoring approved shared world after reload…');
  join();
 }else setStatus('Offline · two players on keyboard, or invite Jo on another device');
}
window.BlockWorldCoop=Object.freeze({role:()=>role,connected,host:startHost,join,disconnect,code:()=>invite});
})();
