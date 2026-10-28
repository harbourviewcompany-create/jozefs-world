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
let hostRetryTimer=0,hostRetryCount=0,heartbeatTimer=0,lastPongAt=0,heartbeatNonce=0,heartbeatSentAt=0,heartbeatRttMs=null;
let hostGeneration=0;
let lastResyncRequestAt=0;
let diagnosticPhase='offline',diagnosticError='',diagnosticChangedAt=performance.now();
function diagnostic(phase,error=''){diagnosticPhase=phase;diagnosticError=error;diagnosticChangedAt=performance.now();}
function connectionReport(){return {role,phase:diagnosticPhase,ready,channelOpen:connected(),signallingReady:peerReady,peerDisconnected:!!peer?.disconnected,lastPacketAgeMs:lastPacketAt?Math.round(performance.now()-lastPacketAt):null,phaseAgeMs:Math.round(performance.now()-diagnosticChangedAt),error:diagnosticError,heartbeatRttMs,transport:'PeerJS WebRTC'};}
function refreshDiagnostics(){const d=$('coop-diagnostics');if(!d)return;const r=connectionReport();d.textContent='Connection: '+r.phase+' · Signalling: '+(r.signallingReady?'ready':'waiting')+' · Data: '+(r.channelOpen?'open':'closed')+(r.lastPacketAgeMs===null?'':' · Last packet: '+(r.lastPacketAgeMs/1000).toFixed(1)+'s')+(r.heartbeatRttMs===null?'':' · Peer RTT: '+Math.round(r.heartbeatRttMs)+'ms')+(r.error?' · '+r.error:'');}
window.BlockWorldConnectionDiagnostics=()=>connectionReport();

let certification=null,certificationResult=null;
const certButton=$('coop-certify'),exportButton=$('coop-certify-export'),certStatus=$('coop-certify-status');
if(certButton)certButton.addEventListener('click',()=>{
 if(certification)return;
 const start=performance.now(),frames=[],phases=[],connectedAtStart=g.connected();
 certButton.disabled=true;if(certStatus)certStatus.textContent='Measuring 60 seconds…';
 certification={start,frames,phases,connectedAtStart};
 const record=t=>{
  if(certification?.start!==start)return;
  frames.push(t);if(frames.length>5000)frames.shift();
  if(t-start<60000){requestAnimationFrame(record);return;}
  const intervals=frames.slice(1).map((v,i)=>v-frames[i]).filter(v=>v>0&&v<1000).sort((a,b)=>a-b);
  const percentile=p=>intervals[Math.floor((intervals.length-1)*p)]??null;
  certificationResult={kind:'physical-device-browser-measurement',collectedAt:new Date().toISOString(),userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},durationMs:Math.round(t-start),frameSamples:intervals.length,medianFrameMs:percentile(.5),p95FrameMs:percentile(.95),connectedAtStart,connectedAtEnd:g.connected(),connection:connectionReport(),visibilityChanges:phases};
  certification=null;certButton.disabled=false;if(exportButton)exportButton.disabled=false;
  if(certStatus)certStatus.textContent='60s test complete · '+intervals.length+' samples';
 };
 requestAnimationFrame(record);
});
document.addEventListener('visibilitychange',()=>{if(certification)certification.phases.push({atMs:Math.round(performance.now()-certification.start),hidden:document.hidden});});
if(exportButton)exportButton.addEventListener('click',()=>{
 if(!certificationResult)return;
 const blob=new Blob([JSON.stringify(certificationResult,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='block-world-device-certification-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
});

const cfg=window.BLOCK_WORLD_NETWORK||{};
const endpoint=cfg.peerServer||{};
const iceServers=Array.isArray(cfg.iceServers)&&cfg.iceServers.length?cfg.iceServers:
 [{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
const PEER_OPTIONS={host:endpoint.host||'0.peerjs.com',port:endpoint.port||443,path:endpoint.path||'/',secure:true,debug:0,config:{iceServers,iceTransportPolicy:'all'}};
function peerOptions(){return PEER_OPTIONS;}
let retryTimer=0,retryCount=0,joiningCode='',peerReady=false,foregroundAt=performance.now();
const TAB_KEY='jozefs-block-2d-guest-tab-v1';
const rejoin=()=>{try{const s=JSON.parse(sessionStorage.getItem(TAB_KEY)||'null');return s&&Date.now()-s.at<3600000&&COOP_RE.test(s.room||'')&&/^jw2d-guest-[a-f0-9]{32}$/.test(s.peerId||'')?s:null;}catch(_){return null;}};
const bookmark=s=>{try{sessionStorage.setItem(TAB_KEY,JSON.stringify({...s,at:Date.now()}));}catch(_){}};
const clearBookmark=()=>{try{sessionStorage.removeItem(TAB_KEY);}catch(_){}};
function ownPeerId(room){const saved=rejoin();if(saved?.room===room)return saved.peerId;const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);return 'jw2d-guest-'+[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');}
const COOP_RE=/^[0-9a-f]{32}$/i;
const copyInput=s=>({left:!!s?.left,right:!!s?.right,jump:!!s?.jump});
const connected=()=>!!conn?.open;
g.isHost=()=>role==='host'&&connected()&&ready;
g.isGuest=()=>role==='guest';
g.connected=()=>role!=='solo'&&connected()&&ready;
g.remoteInput=lastInput;
g.requestCraft=recipe=>{if(role==='guest'&&ready&&Number.isInteger(recipe))send({t:'craft',recipe});};
g.requestAttack=()=>{if(role==='guest'&&ready)send({t:'attack'});};
g.requestAction=(kind,a,tile)=>{if(role!=='guest'||!connected()||!ready)return;if(!['mine','place'].includes(kind)||!a||!Number.isInteger(a.x)||!Number.isInteger(a.y))return;send({t:'action',kind,x:a.x,y:a.y,tile,seq:++editCount});};
g.onBlockChanged=(x,y,id)=>{if(g.isHost())send({t:'edit',x,y,id});};
function setStatus(msg){
 if(role==='solo')diagnostic('offline');
 else if(ready&&connected())diagnostic('playing');
 else if(/reconnect|interrupted|stalled|lost|ended/i.test(msg))diagnostic('recovering',msg);
 else if(/invalid|unable|failed|error|timed out|unavailable/i.test(msg))diagnostic('error',msg);
 else if(/synchroniz|loading the shared world/i.test(msg))diagnostic('synchronizing');
 else diagnostic('connecting');
 const e=$('coop-status');if(e){e.textContent=msg;e.className=/fail|error|unable|timed/i.test(msg)?'err':/Connected|in!|playing|ready/i.test(msg)?'ok':'';}
 refreshDiagnostics();
 const bar=$('coop-live');if(bar){bar.textContent=role==='host'?(ready?'● DADDY + JO · CONNECTED':'● DADDY · WAITING'):role==='guest'?(ready?'● JO · CONNECTED':'● JO · CONNECTING'):'● 2D SOLO';bar.className=ready?'coop-live online':'coop-live';}
}
function show(){$('coop-panel').classList.add('open');$('coop-panel').setAttribute('aria-hidden','false');}
function hide(){$('coop-panel').classList.remove('open');$('coop-panel').setAttribute('aria-hidden','true');}
function send(value){try{if(connected())conn.send(value);}catch(e){setStatus('Connection interrupted');}}
function secureCode(){const rng=window.crypto;if(!rng?.getRandomValues)throw Error('A secure browser is required to host');const bytes=new Uint8Array(16);rng.getRandomValues(bytes);return [...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');}
function validPlayer(p){return p&&['x','y','health','facing'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.x)<100000&&Math.abs(p.y)<100000&&p.health>=0&&p.health<=100&&p.inventory&&typeof p.inventory==='object';}
function validWorld(s){return s&&s.w===180&&s.h===72&&Array.isArray(s.world)&&s.world.length===72&&s.world.every(row=>Array.isArray(row)&&row.length===180&&row.every(n=>Number.isInteger(n)&&n>=0&&n<=31))&&Array.isArray(s.surface)&&s.surface.length===180&&s.surface.every(Number.isFinite)&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(validPlayer)&&Number.isInteger(s.questStage)&&s.questStage>=0&&s.questStage<=5&&Number.isInteger(s.realmIndex)&&s.realmIndex>=0&&s.realmIndex<=3&&s.goals&&typeof s.goals==='object';}
function validState(s){return s&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(validPlayer)&&Number.isInteger(s.questStage)&&s.questStage>=0&&s.questStage<=5&&Number.isInteger(s.realmIndex)&&s.realmIndex>=0&&s.realmIndex<=3&&s.goals&&typeof s.goals==='object';}
function fullWorld(){const w=g.getWorld();send({t:'world',w,stamp:Date.now()});lastRealm=w.realmIndex;snapshotAt=performance.now();}
function onMessage(m){
 if(!m||typeof m!=='object')return;lastPacketAt=performance.now();
 if(m.t==='team-message'&&typeof m.message==='string'&&m.message.length<160){window.dispatchEvent(new CustomEvent('blockworld-team-message',{detail:{message:m.message,from:role==='host'?'Jozef':'Dad'}}));return;}
 if(m.t==='heartbeat'){send({t:'heartbeat-ack',nonce:m.nonce});return;}
 if(m.t==='heartbeat-ack'){lastPongAt=performance.now();if(m.nonce===heartbeatNonce)heartbeatRttMs=Math.round(lastPongAt-heartbeatSentAt);refreshDiagnostics();return;}
 if(m.t==='world'&&role==='guest'){
  if(!validWorld(m.w)){setStatus('Invalid game data from host');return;}
  g.useWorld(m.w);g.role(1);ready=true;retryCount=0;lastResyncRequestAt=0;
  const previous=rejoin();if(previous?.room===joiningCode)bookmark({...previous,active:true});clearTimeout(retryTimer);retryTimer=0;clearTimeout(joinTimeout);joinTimeout=0;lastRealm=m.w.realmIndex;
  send({t:'ready'});setStatus('You are in! You control Jozef. Start playing.');
  $('btn-switch').style.display='none';$('reset').disabled=true;$('mode').disabled=true;$('save').disabled=true;$('partner-tools').hidden=false;hide();
 }else if(m.t==='ready'&&role==='host'){
  ready=true;g.role(0);setStatus('Jozef is in! You control Daddy. Start playing.');
  $('btn-switch').style.display='none';$('partner-tools').hidden=false;hide();
 }else if(m.t==='input'&&g.isHost()){g.remoteInput=copyInput(m.input);lastPacketAt=performance.now();}
 else if(m.t==='action'&&g.isHost()){const now=performance.now();if(now-lastActionAt<90)return;lastActionAt=now;const x=m.x,y=m.y;if(!['mine','place'].includes(m.kind)||!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=180||y<0||y>=72||!Number.isInteger(m.seq))return;if(m.kind==='place'&&(!Number.isInteger(m.tile)||m.tile<1||m.tile>31))return;g.action(1,m.kind,{x,y},m.tile);}
 else if(m.t==='attack'&&g.isHost()){const now=performance.now();if(now-lastActionAt<350)return;lastActionAt=now;g.attack(1);}
 else if(m.t==='craft'&&g.isHost()){const now=performance.now();if(now-lastActionAt<90)return;lastActionAt=now;if(!Number.isInteger(m.recipe)||m.recipe<0||m.recipe>30)return;const ok=g.craftFor(1,m.recipe);send({t:'feedback',msg:ok?'Crafted item in the shared world':'Not enough materials to craft'});}
 else if(m.t==='give'&&g.isHost()){const now=performance.now();if(now-lastGiveAt<220)return;lastGiveAt=now;const ok=g.giveTo(1,m.tile);send({t:'feedback',msg:ok?'Gave one block to Daddy':'Move closer or collect this block first'});}
 else if(m.t==='regroup'&&g.isHost()){const now=performance.now();if(now-lastRegroupAt[1]<15000)return;if(g.regroup(1)){lastRegroupAt[1]=now;send({t:'feedback',msg:'You regrouped with Daddy'});}else send({t:'feedback',msg:'Already nearby or no safe spot'});}
 else if(m.t==='feedback'&&role==='guest'){g.setStatus(String(m.msg||'').slice(0,100));}
 else if(m.t==='state'&&role==='guest'&&ready){if(!validState(m.s))return;if(m.s.realmIndex!==lastRealm){const now=performance.now();if(now-lastResyncRequestAt>=1500){lastResyncRequestAt=now;send({t:'resync'});}return;}g.useState(m.s);}
 else if(m.t==='edit'&&role==='guest'&&ready){if([m.x,m.y,m.id].every(Number.isInteger)&&m.x>=0&&m.x<180&&m.y>=0&&m.y<72&&m.id>=0&&m.id<=31)g.useEdit(m.x,m.y,m.id);}
 else if(m.t==='resync'&&g.isHost())fullWorld();
}
function tryReconnect(){if(role!=='guest'||ready||connected()||!joiningCode)return;if(!peerReady){if(peer?.disconnected&&typeof peer.reconnect==='function')try{peer.reconnect();}catch(_){}setStatus('Reconnecting to Daddy…');return;}try{attach(peer.connect('jw2d-'+joiningCode,{reliable:true,serialization:'json'}));setStatus('Rejoining…');}catch(e){scheduleReconnect();}}
function scheduleReconnect(){if(role!=='guest'||ready)return;clearTimeout(retryTimer);if(retryCount>=6){setStatus('Connection lost. Tap JOIN AS JOZEF to retry.');show();return;}const delay=[1000,2000,3500,6000,8500,11000][retryCount++];setStatus('Reconnecting ('+retryCount+'/6)…');retryTimer=setTimeout(()=>{if(role!=='guest'||ready)return;if(peer?.disconnected&&typeof peer.reconnect==='function')try{peer.reconnect();}catch(_){}if(peerReady)tryReconnect();if(role==='guest'&&!ready)retryTimer=setTimeout(()=>{if(role==='guest'&&!ready)scheduleReconnect();},4000);},delay);}
function stopHeartbeat(){clearInterval(heartbeatTimer);heartbeatTimer=0;lastPongAt=0;heartbeatRttMs=null;}
function startHeartbeat(){stopHeartbeat();lastPongAt=performance.now();heartbeatTimer=setInterval(()=>{if(!connected()||document.hidden)return;const now=performance.now();if(!document.hidden&&now-lastPongAt>22000){const stale=conn;stopHeartbeat();try{stale?.close()}catch(_){}if(conn===stale)onConnectionLost('Partner stopped responding');return;}heartbeatSentAt=now;send({t:'heartbeat',nonce:++heartbeatNonce});},5000);}
function onConnectionLost(reason){stopHeartbeat();conn=null;ready=false;lastResyncRequestAt=0;clearTimeout(joinTimeout);joinTimeout=0;g.remoteInput={left:false,right:false,jump:false};$('partner-tools').hidden=true;if(role==='host'){setStatus(reason+' · waiting for Jozef to reconnect');$('coop-disconnect').disabled=false;}else if(role==='guest'){show();scheduleReconnect();}}
function attach(connection){if(conn?.open){connection.close();return;}if(conn&&conn!==connection){try{conn.close();}catch(_){}}conn=connection;connection.on('open',()=>{if(conn!==connection){try{connection.close();}catch(_){}return;}lastPacketAt=foregroundAt=performance.now();startHeartbeat();retryCount=0;clearTimeout(retryTimer);retryTimer=0;$('coop-disconnect').disabled=false;if(role==='host'){ready=false;g.role(0);setStatus('Jozef joined — loading the shared world…');fullWorld();}else{ready=false;g.role(1);setStatus('Almost there — loading Daddy’s world…');}});connection.on('data',message=>{if(conn===connection)onMessage(message);});connection.on('close',()=>{if(conn===connection)onConnectionLost('Connection ended');});connection.on('error',()=>{if(conn===connection)onConnectionLost('Connection failed');});}
function leave(options={}){stopHeartbeat();++hostGeneration;clearTimeout(hostRetryTimer);hostRetryTimer=0;hostRetryCount=0;clearBookmark();clearTimeout(joinTimeout);joinTimeout=0;clearTimeout(retryTimer);retryTimer=0;retryCount=0;joiningCode='';peerReady=false;const guest=role==='guest',c=conn,p=peer;conn=null;peer=null;ready=false;role='solo';invite='';lastRealm=-1;lastResyncRequestAt=0;g.remoteInput={left:false,right:false,jump:false};$('coop-share').disabled=true;$('coop-disconnect').disabled=true;$('btn-switch').style.display='';$('reset').disabled=false;$('mode').disabled=false;$('inventory').disabled=false;$('save').disabled=false;$('partner-tools').hidden=true;if(c){try{c.close();}catch(_){}}if(p){try{p.destroy();}catch(_){}}setStatus(options.reason||'Offline · your solo world is safe');if(guest&&!options.skipReload){location.reload();}else if(!guest){g.role(0);g.setStatus('Disconnected. You can keep playing solo.');}}
function startHost(recover=false){if(!window.Peer){setStatus('Online co-op is unavailable: PeerJS could not load.');return;}if(role!=='solo'&&!recover)leave({skipReload:true});const generation=++hostGeneration;try{if(!recover)hostRetryCount=0;invite=recover&&invite?invite:secureCode();role='host';g.saveHost();g.role(0);setStatus('Preparing connection…');const options=peerOptions();if(generation!==hostGeneration||role!=='host')return;peer=new window.Peer('jw2d-'+invite,options);peer.on('open',()=>{if(generation!==hostGeneration)return;peerReady=true;hostRetryCount=0;clearTimeout(hostRetryTimer);hostRetryTimer=0;$('coop-code').value=invite;$('coop-share').disabled=false;$('coop-disconnect').disabled=false;setStatus('Invite ready! Tap SHARE LINK, then keep this screen open.');});peer.on('connection',c=>{if(generation!==hostGeneration){c.close();return;}if(conn?.open||ready){c.close();return;}attach(c);});peer.on('disconnected',()=>{if(generation!==hostGeneration)return;peerReady=false;if(typeof peer.reconnect==='function')try{peer.reconnect();}catch(_){};if(!connected())setStatus('Reconnecting…');});peer.on('error',e=>{if(generation!==hostGeneration)return;if(connected()){setStatus('Connected · signalling briefly interrupted');return;}const type=e?.type||'network';if(['network','server-error','socket-error','socket-closed','disconnected'].includes(type)&&hostRetryCount<5){const delay=[1500,3500,7000,12000,18000][hostRetryCount++];setStatus('Signalling busy. Retrying '+hostRetryCount+'/5…');clearTimeout(hostRetryTimer);hostRetryTimer=setTimeout(()=>{if(role!=='host'||peerReady)return;try{peer?.destroy();}catch(_){}peer=null;startHost(true);},delay);return;}const reason='Could not host. Check internet and try again.';leave({reason,skipReload:true});show();});setStatus('Creating private game…');}catch(e){leave({reason:e.message,skipReload:true});}}
function extractCode(input){const s=String(input||'').trim();const raw=s.match(/(?:^|[=#\/])(jw2d-)?([a-f0-9]{32})(?:$|[&#])/i);return raw?raw[2].toLowerCase():(COOP_RE.test(s)?s.toLowerCase():null);}
function join(){if(!window.Peer){setStatus('Online co-op is unavailable: PeerJS could not load.');return;}const code=extractCode($('coop-code').value);if(!code){setStatus('Paste a valid invitation from Daddy.');return;}if(role==='host'){setStatus('Close your hosted game before joining another');return;}if(role==='guest'){if(!connected()&&!ready){clearTimeout(retryTimer);retryTimer=0;tryReconnect();}else setStatus('Already connecting');return;}g.saveHost();role='guest';ready=false;joiningCode=code;retryCount=0;peerReady=false;$('coop-disconnect').disabled=false;try{const old=rejoin(),peerId=ownPeerId(code);bookmark({room:code,peerId,active:!!(old?.room===code&&old.active)});setStatus('Connecting to Daddy…');const options=peerOptions();if(role!=='guest'||joiningCode!==code)return;peer=new window.Peer(peerId,options);const currentPeer=peer;peer.on('open',()=>{if(peer!==currentPeer||role!=='guest')return;peerReady=true;setStatus('Connecting to Daddy…');attach(peer.connect('jw2d-'+code,{reliable:true,serialization:'json'}));});peer.on('error',e=>{if(peer!==currentPeer||role!=='guest')return;if(role==='guest'&&!ready){setStatus('Unable to join. Check the invitation and try again.');scheduleReconnect();}});peer.on('disconnected',()=>{if(peer!==currentPeer||role!=='guest')return;peerReady=false;if(typeof peer.reconnect==='function')try{peer.reconnect();}catch(_){};if(role==='guest'&&!ready)scheduleReconnect();});joinTimeout=setTimeout(()=>{if(role==='guest'&&!ready){leave({reason:'Timed out. Ask Daddy to Host again, then Share link.',skipReload:true});show();}},45000);}catch(e){setStatus(e.message||'Join failed');}}
function tick(){if(!g.connected())return;const now=performance.now();if(role==='guest'&&now-inputAt>50){inputAt=now;const left=!!g.touch?.left,right=!!g.touch?.right,jump=!!g.touch?.jump;if(left!==lastInput.left||right!==lastInput.right||jump!==lastInput.jump||now-stateAt>200){lastInput={left,right,jump};send({t:'input',input:lastInput});stateAt=now;}}if(role==='host'&&ready&&now-snapshotAt>100){snapshotAt=now;try{const s=g.getState();if(s)send({t:'state',s});}catch(_){}}}
setInterval(tick,40);
$('coop-give')?.addEventListener('click',()=>{if(!g.connected())return;const now=performance.now();if(now-lastGiveAt<220)return;if(role==='guest'){send({t:'give',tile:g.selected});lastGiveAt=now;return;}const ok=g.giveTo(0,g.selected);g.setStatus(ok?'Gave one block to Jozef':'Move closer or collect this block first');lastGiveAt=now;});
$('coop-regroup')?.addEventListener('click',()=>{if(!g.connected())return;const now=performance.now(),who=role==='guest'?1:0;if(now-lastRegroupAt[who]<15000){g.setStatus('Regroup is cooling down');return;}if(role==='guest'){send({t:'regroup'});lastRegroupAt[who]=now;return;}if(g.regroup(0)){lastRegroupAt[0]=now;g.setStatus('Regrouped with Jozef');}else g.setStatus('Already nearby or no safe space');});
$('open-coop').addEventListener('click',show);
$('coop-close').addEventListener('click',hide);
$('coop-host').addEventListener('click',()=>startHost(false));
$('coop-join').addEventListener('click',join);
$('coop-disconnect').addEventListener('click',()=>leave({reason:'Disconnected'}));
$('coop-share').addEventListener('click',async()=>{if(!invite||role!=='host')return;const url=new URL(location.href);url.hash='coop='+invite;try{if(navigator.share)await navigator.share({title:'Play Block World with me',text:'Join our private Daddy + Jozef 2D world',url:url.href});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);setStatus('Invite link copied. Send it to Jozef.');}else setStatus('Copy this code and send it: '+invite);}catch(e){setStatus('Invite ready — copy the code if sharing was cancelled.');}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&connected())lastPongAt=performance.now();});
window.addEventListener('pagehide',()=>{if(role==='host')g.saveHost();});
const incoming=extractCode(location.hash);
if(incoming){$('coop-code').value=incoming;show();setStatus('Invitation detected. Tap JOIN AS JOZEF.');try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}}
if(!incoming){const previous=rejoin();if(previous?.active&&window.Peer){$('coop-code').value=previous.room;show();setStatus('Restoring shared world…');join();}else setStatus('Ready when you are');}
window.BlockWorldCoop=Object.freeze({role:()=>role,connected,host:startHost,join,disconnect:()=>leave({reason:'Disconnected'}),code:()=>invite,sendTeamMessage:(message)=>{if(role==='guest'&&connected()&&ready&&typeof message==='string'&&message.length<160)send({t:'team-message',message});},broadcastTeamMessage:(message)=>{if(role==='host'&&connected()&&ready&&typeof message==='string'&&message.length<160)send({t:'team-message',message});}});
})();
