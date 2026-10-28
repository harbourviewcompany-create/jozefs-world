/* Daddy + Jozef co-op. Fixed family room. Kid-friendly join + loading animation. */
(()=>{
'use strict';
const g=window.BlockWorld2D,$=id=>document.getElementById(id);
if(!g||!$('coop-panel'))return;
let peer=null,conn=null,role='solo',invite='',ready=false;
let stateAt=0,inputAt=0,snapshotAt=0,lastRealm=-1,lastInput={left:false,right:false,jump:false};
let lastPacketAt=0,editCount=0,lastActionAt=0,joinTimeout=0,lastGiveAt=0,lastRegroupAt=[-15000,-15000];
let hostRetryTimer=0,hostRetryCount=0,heartbeatTimer=0,lastPongAt=0,heartbeatNonce=0,heartbeatSentAt=0,heartbeatRttMs=null;
let hostGeneration=0,lastResyncRequestAt=0,peerReady=false;
let retryTimer=0,retryCount=0,joiningCode='';
const cfg=window.BLOCK_WORLD_NETWORK||{};
const endpoint=cfg.peerServer||{};
const iceServers=Array.isArray(cfg.iceServers)&&cfg.iceServers.length?cfg.iceServers:[{urls:'stun:stun.l.google.com:19302'}];
function peerOptions(){return {host:endpoint.host||'0.peerjs.com',port:endpoint.port||443,path:endpoint.path||'/',secure:true,debug:0,config:{iceServers,iceTransportPolicy:'all'}}}
const TAB_KEY='jozefs-block-2d-guest-tab-v1';
const COOP_RE=/^[0-9a-f]{32}$/i;
function familyRoom(){return 'dadd1e70cef2a7e0b10c4a9d3e5f6781';}
const rejoin=()=>{try{const s=JSON.parse(sessionStorage.getItem(TAB_KEY)||'null');return s&&Date.now()-s.at<3600000&&COOP_RE.test(s.room||'')?s:null;}catch(_){return null;}};
const bookmark=s=>{try{sessionStorage.setItem(TAB_KEY,JSON.stringify({...s,at:Date.now()}));}catch(_){}};
const clearBookmark=()=>{try{sessionStorage.removeItem(TAB_KEY);}catch(_){}};
function ownPeerId(room){const saved=rejoin();if(saved?.room===room&&saved.peerId)return saved.peerId;const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);return 'jw2d-guest-'+[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');}
const copyInput=s=>({left:!!s?.left,right:!!s?.right,jump:!!s?.jump});
const connected=()=>!!conn?.open;
g.isHost=()=>role==='host'&&connected()&&ready;
g.isGuest=()=>role==='guest';
g.connected=()=>role!=='solo'&&connected()&&ready;
g.remoteInput=lastInput;
g.requestCraft=recipe=>{if(role==='guest'&&ready&&Number.isInteger(recipe))send({t:'craft',recipe});};
g.requestAttack=()=>{if(role==='guest'&&ready)send({t:'attack'});};
g.requestAction=(kind,a,tile)=>{if(role!=='guest'||!connected()||!ready)return;if(!['mine','place'].includes(kind)||!a)return;send({t:'action',kind,x:a.x,y:a.y,tile,seq:++editCount});};
g.onBlockChanged=(x,y,id)=>{if(g.isHost())send({t:'edit',x,y,id});};
function showLoader(on){const el=$('jozef-loading');if(!el)return;el.classList.toggle('show',!!on);}
function setStatus(msg){
 const e=$('coop-status');if(e){e.textContent=msg;e.className=/fail|error|unable|timed|lost|Could not/i.test(msg)?'err':/in!|Waiting|Connected|playing|Here we go|Yay/i.test(msg)?'ok':'';}
 const bar=$('coop-live');if(bar){bar.textContent=role==='host'?(ready?'● DADDY + JO · CONNECTED':'● DADDY · WAITING'):role==='guest'?(ready?'● JO · CONNECTED':'● JO · CONNECTING'):'● 2D SOLO';bar.className=ready?'coop-live online':'coop-live';}
 // Keep loader up while Jozef is connecting
 if(role==='guest'&&!ready)showLoader(true);
 else showLoader(false);
}
function show(){$('coop-panel').classList.add('open');}
function hide(){$('coop-panel').classList.remove('open');}
function send(value){try{if(connected())conn.send(value);}catch(_){setStatus('Connection interrupted');}}
function validPlayer(p){return p&&['x','y','health','facing'].every(k=>Number.isFinite(p[k]))&&p.inventory&&typeof p.inventory==='object';}
function validWorld(s){return s&&s.w===180&&s.h===72&&Array.isArray(s.world)&&s.world.length===72&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(validPlayer);}
function validState(s){return s&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(validPlayer);}
function fullWorld(){const w=g.getWorld();send({t:'world',w,stamp:Date.now()});lastRealm=w.realmIndex;snapshotAt=performance.now();}
function onMessage(m){
 if(!m||typeof m!=='object')return;lastPacketAt=performance.now();
 if(m.t==='heartbeat'){send({t:'heartbeat-ack',nonce:m.nonce});return;}
 if(m.t==='heartbeat-ack'){lastPongAt=performance.now();if(m.nonce===heartbeatNonce)heartbeatRttMs=Math.round(lastPongAt-heartbeatSentAt);return;}
 if(m.t==='world'&&role==='guest'){
  if(!validWorld(m.w)){setStatus('Something went wrong. Try again.');return;}
  g.useWorld(m.w);g.role(1);ready=true;retryCount=0;lastRealm=m.w.realmIndex;
  bookmark({room:joiningCode,peerId:peer?.id,active:true});
  clearTimeout(retryTimer);clearTimeout(joinTimeout);
  send({t:'ready'});showLoader(false);setStatus('Yay! You are Jozef. Let’s play!');
  if($('btn-switch'))$('btn-switch').style.display='none';
  ['reset','mode','save'].forEach(id=>{if($(id))$(id).disabled=true;});
  if($('partner-tools'))$('partner-tools').hidden=false;hide();
 }else if(m.t==='ready'&&role==='host'){
  ready=true;g.role(0);setStatus('Jozef is here! Let’s play!');
  if($('btn-switch'))$('btn-switch').style.display='none';
  if($('partner-tools'))$('partner-tools').hidden=false;hide();
 }else if(m.t==='input'&&g.isHost()){g.remoteInput=copyInput(m.input);}
 else if(m.t==='action'&&g.isHost()){const now=performance.now();if(now-lastActionAt<90)return;lastActionAt=now;if(!['mine','place'].includes(m.kind))return;g.action(1,m.kind,{x:m.x,y:m.y},m.tile);}
 else if(m.t==='attack'&&g.isHost()){const now=performance.now();if(now-lastActionAt<350)return;lastActionAt=now;g.attack(1);}
 else if(m.t==='craft'&&g.isHost()){const now=performance.now();if(now-lastActionAt<90)return;lastActionAt=now;g.craftFor(1,m.recipe);}
 else if(m.t==='give'&&g.isHost()){const now=performance.now();if(now-lastGiveAt<220)return;lastGiveAt=now;g.giveTo(1,m.tile);}
 else if(m.t==='regroup'&&g.isHost()){const now=performance.now();if(now-lastRegroupAt[1]<15000)return;if(g.regroup(1))lastRegroupAt[1]=now;}
 else if(m.t==='feedback'&&role==='guest'){g.setStatus(String(m.msg||'').slice(0,100));}
 else if(m.t==='state'&&role==='guest'&&ready){if(!validState(m.s))return;if(m.s.realmIndex!==lastRealm){if(performance.now()-lastResyncRequestAt>=1500){lastResyncRequestAt=performance.now();send({t:'resync'});}return;}g.useState(m.s);}
 else if(m.t==='edit'&&role==='guest'&&ready){if([m.x,m.y,m.id].every(Number.isInteger))g.useEdit(m.x,m.y,m.id);}
 else if(m.t==='resync'&&g.isHost())fullWorld();
}
function tryReconnect(){if(role!=='guest'||ready||connected()||!joiningCode)return;if(!peerReady){if(peer?.disconnected)try{peer.reconnect();}catch(_){}setStatus('Trying again…');return;}try{attach(peer.connect('jw2d-'+joiningCode,{reliable:true,serialization:'json'}));}catch(_){scheduleReconnect();}}
function scheduleReconnect(){if(role!=='guest'||ready)return;clearTimeout(retryTimer);if(retryCount>=6){showLoader(false);setStatus('Ask Daddy to press START, then tap green again.');show();return;}retryCount++;setStatus('Trying again…');retryTimer=setTimeout(()=>{if(role==='guest'&&!ready){if(peerReady)tryReconnect();else scheduleReconnect();}},[1000,2000,3500,6000,8500,11000][retryCount-1]||3000);}
function stopHeartbeat(){clearInterval(heartbeatTimer);heartbeatTimer=0;}
function startHeartbeat(){stopHeartbeat();lastPongAt=performance.now();heartbeatTimer=setInterval(()=>{if(!connected()||document.hidden)return;if(performance.now()-lastPongAt>22000){const s=conn;stopHeartbeat();try{s?.close();}catch(_){}if(conn===s)onConnectionLost('Daddy left');return;}heartbeatSentAt=performance.now();send({t:'heartbeat',nonce:++heartbeatNonce});},5000);}
function onConnectionLost(reason){stopHeartbeat();conn=null;ready=false;g.remoteInput={left:false,right:false,jump:false};if($('partner-tools'))$('partner-tools').hidden=true;if(role==='host'){setStatus(reason+' · waiting for Jozef');$('coop-disconnect').disabled=false;}else if(role==='guest'){showLoader(false);show();setStatus('Lost Daddy. Tap green to try again.');scheduleReconnect();}}
function attach(connection){if(conn?.open){connection.close();return;}if(conn&&conn!==connection)try{conn.close();}catch(_){}conn=connection;connection.on('open',()=>{if(conn!==connection)return;lastPacketAt=performance.now();startHeartbeat();retryCount=0;clearTimeout(retryTimer);$('coop-disconnect').disabled=false;if(role==='host'){ready=false;g.role(0);setStatus('Jozef is joining…');fullWorld();}else{ready=false;g.role(1);setStatus('Almost there…');}});connection.on('data',m=>{if(conn===connection)onMessage(m);});connection.on('close',()=>{if(conn===connection)onConnectionLost('Disconnected');});connection.on('error',()=>{if(conn===connection)onConnectionLost('Connection failed');});}
function leave(options={}){showLoader(false);stopHeartbeat();++hostGeneration;clearTimeout(hostRetryTimer);clearTimeout(joinTimeout);clearTimeout(retryTimer);clearBookmark();retryCount=0;joiningCode='';peerReady=false;const guest=role==='guest',c=conn,p=peer;conn=null;peer=null;ready=false;role='solo';invite='';lastRealm=-1;g.remoteInput={left:false,right:false,jump:false};$('coop-share').disabled=true;$('coop-disconnect').disabled=true;if($('btn-switch'))$('btn-switch').style.display='';['reset','mode','save'].forEach(id=>{if($(id))$(id).disabled=false;});if($('partner-tools'))$('partner-tools').hidden=true;try{c?.close();}catch(_){}try{p?.destroy();}catch(_){}setStatus(options.reason||'Solo play');if(guest&&!options.skipReload)location.reload();else if(!guest){g.role(0);}}
function startHost(recover=false){if(!window.Peer){setStatus('Not ready yet. Try again.');return;}if(role!=='solo'&&!recover)leave({skipReload:true});const generation=++hostGeneration;try{if(!recover)hostRetryCount=0;invite=familyRoom();role='host';g.saveHost();g.role(0);setStatus('Starting…');if(generation!==hostGeneration)return;peer=new window.Peer('jw2d-'+invite,peerOptions());peer.on('open',()=>{if(generation!==hostGeneration)return;peerReady=true;hostRetryCount=0;$('coop-code').value=invite;$('coop-share').disabled=false;$('coop-disconnect').disabled=false;setStatus('Waiting for Jozef… Keep this open.');const hint=$('coop-hint');if(hint)hint.textContent='Now Jozef taps the big green button on his phone.';});peer.on('connection',c=>{if(generation!==hostGeneration){c.close();return;}if(conn?.open||ready){c.close();return;}attach(c);});peer.on('disconnected',()=>{if(generation!==hostGeneration)return;peerReady=false;if(peer.reconnect)try{peer.reconnect();}catch(_){}});peer.on('error',e=>{if(generation!==hostGeneration)return;if(connected())return;const type=e?.type||'network';if(['network','server-error','socket-error','socket-closed','disconnected'].includes(type)&&hostRetryCount<5){const delay=[1500,3500,7000,12000,18000][hostRetryCount++];setStatus('Retrying…');clearTimeout(hostRetryTimer);hostRetryTimer=setTimeout(()=>{if(role==='host'&&!peerReady){try{peer?.destroy();}catch(_){}peer=null;startHost(true);}},delay);return;}leave({reason:'Could not start. Check internet.',skipReload:true});show();});}catch(e){leave({reason:e.message,skipReload:true});}}
function extractCode(input){const s=String(input||'').trim();const raw=s.match(/(?:^|[=#\/])(jw2d-)?([a-f0-9]{32})(?:$|[&#])/i);return raw?raw[2].toLowerCase():(COOP_RE.test(s)?s.toLowerCase():null);}
function join(){if(!window.Peer){setStatus('Not ready yet. Try again.');return;}let code=extractCode($('coop-code').value)||familyRoom();$('coop-code').value=code;if(role==='host'){setStatus('Stop first, then join.');return;}if(role==='guest'){if(!connected()&&!ready)tryReconnect();return;}g.saveHost();role='guest';ready=false;joiningCode=code;retryCount=0;peerReady=false;$('coop-disconnect').disabled=false;showLoader(true);try{const peerId=ownPeerId(code);bookmark({room:code,peerId});setStatus('Finding Daddy…');peer=new window.Peer(peerId,peerOptions());const current=peer;peer.on('open',()=>{if(peer!==current||role!=='guest')return;peerReady=true;attach(peer.connect('jw2d-'+code,{reliable:true,serialization:'json'}));});peer.on('error',()=>{if(peer===current&&role==='guest'&&!ready){setStatus('Is Daddy waiting? Tap green again.');scheduleReconnect();}});peer.on('disconnected',()=>{if(peer===current&&role==='guest'){peerReady=false;if(!ready)scheduleReconnect();}});joinTimeout=setTimeout(()=>{if(role==='guest'&&!ready){showLoader(false);leave({reason:'Daddy needs to press START first.',skipReload:true});show();}},45000);}catch(e){showLoader(false);setStatus(e.message||'Try again');}}
function tick(){if(!g.connected())return;const now=performance.now();if(role==='guest'&&now-inputAt>50){inputAt=now;const left=!!g.touch?.left,right=!!g.touch?.right,jump=!!g.touch?.jump;if(left!==lastInput.left||right!==lastInput.right||jump!==lastInput.jump||now-stateAt>200){lastInput={left,right,jump};send({t:'input',input:lastInput});stateAt=now;}}if(role==='host'&&ready&&now-snapshotAt>100){snapshotAt=now;try{const s=g.getState();if(s)send({t:'state',s});}catch(_){}}}
setInterval(tick,40);
$('coop-give')?.addEventListener('click',()=>{if(!g.connected())return;const now=performance.now();if(now-lastGiveAt<220)return;if(role==='guest'){send({t:'give',tile:g.selected});lastGiveAt=now;return;}g.giveTo(0,g.selected);lastGiveAt=now;});
$('coop-regroup')?.addEventListener('click',()=>{if(!g.connected())return;const now=performance.now(),who=role==='guest'?1:0;if(now-lastRegroupAt[who]<15000)return;if(role==='guest'){send({t:'regroup'});lastRegroupAt[who]=now;return;}if(g.regroup(0))lastRegroupAt[0]=now;});
$('open-coop')?.addEventListener('click',show);
$('coop-close')?.addEventListener('click',hide);
$('coop-host')?.addEventListener('click',()=>startHost(false));
$('coop-join')?.addEventListener('click',join);
$('coop-disconnect')?.addEventListener('click',()=>leave({reason:'Stopped'}));
$('coop-share')?.addEventListener('click',async()=>{if(!invite||role!=='host')return;const url=new URL(location.href);url.hash='coop='+invite;try{if(navigator.share)await navigator.share({title:'Block World',text:'Tap the green button to play with Daddy!',url:url.href});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);setStatus('Link copied — send to Jozef');}}catch(_){setStatus('Waiting for Jozef…');}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&connected())lastPongAt=performance.now();});
window.addEventListener('pagehide',()=>{if(role==='host')g.saveHost();});
const incoming=extractCode(location.hash);
if(incoming){
 $('coop-code').value=incoming;show();
 setStatus('Joining Daddy…');
 try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}
 setTimeout(()=>{if(role==='solo')join();},600);
}else{
 try{$('coop-code').value=familyRoom();}catch(_){}
 setStatus('Jozef: tap the green button');
}
window.BlockWorldCoop=Object.freeze({role:()=>role,connected,host:startHost,join,disconnect:()=>leave({reason:'Stopped'}),code:()=>invite});
})();
