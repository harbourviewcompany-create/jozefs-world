/* Daddy + Jozef two-phone co-op — reliable rewrite.
   Fixed family room for only the two of you. No invite link required.
   One public PeerJS broker + TURN. */
(()=>{
'use strict';
const g=window.BlockWorld2D,$=id=>document.getElementById(id);
if(!g||!$('coop-panel'))return;

/* Fixed family room — only Daddy & Jozef. No invite link required. */
const FIXED_HOST_ID='jw2d-dadd1e70cef2a7e0b10c4a9d3e5f6781';
const ROOM=FIXED_HOST_ID;
const HOST_KEY='jw2d-family-host-v5';
const FAMILY_GUEST_KEY='jw2d-family-daddy-peer-v5';
const FAMILY_ROLE_KEY='jw2d-family-role-v4';
function savedHostId(){
  try{localStorage.setItem(HOST_KEY,FIXED_HOST_ID);localStorage.setItem(FAMILY_GUEST_KEY,FIXED_HOST_ID);}catch(_){}
  return FIXED_HOST_ID;
}
let hostId=FIXED_HOST_ID;
let invitedHost=FIXED_HOST_ID;
try{
  const m=location.hash.match(/(?:^#|&)coop=(jw2d-[a-f0-9]{32})(?:&|$)/i);
  if(m){localStorage.setItem(FAMILY_ROLE_KEY,'Jozef');}
  localStorage.setItem(FAMILY_GUEST_KEY,FIXED_HOST_ID);
}catch(_){}
const TAB_KEY='jozefs-block-2d-guest-v2';
const MAX_TILE=62;
const WORLD_SIZES=new Set(['280x110','180x72']);
const MAX_WORLD_CELLS=40000;

let peer=null,conn=null,role='solo',ready=false,peerReady=false;
let hostGen=0,joinTimer=0,retryTimer=0,retryCount=0,hbTimer=0;
let lastPong=0,hbNonce=0,hbSent=0;
let lastInput={left:false,right:false,jump:false};
let inputAt=0,stateAt=0,snapshotAt=0,lastRealm=-1,editCount=0;
let lastActionAt=0,lastGiveAt=0,lastRegroupAt=[-15000,-15000],lastResync=0;

const cfg=window.BLOCK_WORLD_NETWORK||{};
const ep=cfg.peerServer||{host:'0.peerjs.com',port:443,path:'/',secure:true};
const ice=Array.isArray(cfg.iceServers)&&cfg.iceServers.length?cfg.iceServers:[
 {urls:'stun:stun.l.google.com:19302'},
 {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
 {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'}
];
function opts(){return{host:ep.host,port:ep.port||443,path:ep.path||'/',secure:ep.secure!==false,debug:0,config:{iceServers:ice,iceTransportPolicy:'all'}}}

const myIndex=()=>localStorage.getItem(FAMILY_ROLE_KEY)==='Jozef'?1:0;
const otherIndex=()=>1-myIndex();
const otherName=()=>myIndex()===0?'Jozef':'Daddy';
const playerName=()=>myIndex()===0?'Daddy':'Jozef';
const connected=()=>!!conn?.open||(!!window.BlockWorldRelay?.connected?.()&&role!=='solo');
g.isHost=()=>role==='host'&&connected()&&ready;
g.isGuest=()=>role==='guest';
g.connected=()=>role!=='solo'&&connected()&&ready;
g.remoteInput=lastInput;
g.requestCraft=r=>{if(role==='guest'&&ready&&Number.isInteger(r))send({t:'craft',recipe:r});};
g.requestAttack=()=>{if(role==='guest'&&ready)send({t:'attack'});};
g.requestAction=(kind,a,tile)=>{if(role!=='guest'||!ready||!a)return;send({t:'action',kind,x:a.x,y:a.y,tile,seq:++editCount});};
g.onBlockChanged=(x,y,id)=>{if(g.isHost())send({t:'edit',x,y,id});};

function loader(on){const el=$('jozef-loading');if(el)el.classList.toggle('show',!!on);}
function status(msg, keepLoader){
 const e=$('coop-status');
 if(e){e.textContent=msg;e.className=/fail|error|Could not|lost|timeout|not ready|offline/i.test(msg)?'err':/Waiting|Yay|here|in!|Connected|LIVE|joined|Ready/i.test(msg)?'ok':'';}
 const bar=$('coop-live');
 if(bar){
  const live=ready&&connected();
  bar.textContent=role==='host'?(live?'● DADDY + JOZEF · LIVE':'● DADDY · WAITING FOR JOZEF'):role==='guest'?(live?'● JOZEF · LIVE WITH DADDY':'● JOZEF · FINDING DADDY'):'● SOLO';
  bar.className=live?'coop-live online':'coop-live';
 }
 // Keep the kid-friendly loader up until we are fully connected
 if(!keepLoader && !(role==='guest' && !ready)) loader(false);
 if(keepLoader) loader(true);
}
function show(){$('coop-panel').classList.add('open');}
function hide(){$('coop-panel').classList.remove('open');}
function send(v){try{if(conn?.open){conn.send(v);return;}if(window.BlockWorldRelay?.connected?.())window.BlockWorldRelay.send(v);}catch(_){}}

function guestId(){
 try{
  const s=JSON.parse(sessionStorage.getItem(TAB_KEY)||'null');
  // Generate a fresh guest PeerJS ID on every reconnect to avoid stale ID collisions.
 }catch(_){}
 const b=new Uint8Array(8);crypto.getRandomValues(b);
 const id='jw2d-g-'+[...b].map(n=>n.toString(16).padStart(2,'0')).join('');
 try{sessionStorage.setItem(TAB_KEY,JSON.stringify({id,at:Date.now()}));}catch(_){}
 return id;
}

function validPlayer(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<100000&&Math.abs(p.y)<100000&&Number.isFinite(p.health)&&Number.isFinite(p.facing)&&p.inventory&&typeof p.inventory==='object'&&!Array.isArray(p.inventory);}
function validWorld(s){return s&&Number.isInteger(s.w)&&Number.isInteger(s.h)&&WORLD_SIZES.has(s.w+'x'+s.h)&&s.w*s.h<=MAX_WORLD_CELLS&&Array.isArray(s.world)&&s.world.length<=MAX_WORLD_CELLS&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(validPlayer);}
function validState(s){return s&&Array.isArray(s.players)&&s.players.length===2&&s.players.every(validPlayer);}

function fullWorld(){
 try{
  const w=g.getWorld();
  send({t:'world',w,stamp:Date.now()});
  lastRealm=w.realmIndex;snapshotAt=performance.now();
 }catch(_){}
}

function onMsg(m){
 if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.t!=='string'||m.t.length>32)return;
 if(m.t==='heartbeat'){send({t:'heartbeat-ack',nonce:m.nonce});return;}
 if(m.t==='heartbeat-ack'){if(m.nonce===hbNonce)lastPong=performance.now();return;}
 if(m.t==='world'&&role==='guest'){
  if(!validWorld(m.w)){status('Bad world data. Try again.');return;}
  g.useWorld(m.w);g.role(myIndex());ready=true;retryCount=0;lastRealm=m.w.realmIndex;
  clearTimeout(joinTimer);clearTimeout(retryTimer);
  send({t:'ready'});loader(false);status('Connected as '+(myIndex()===0?'Daddy':'Jozef')+'!');
  if($('btn-switch'))$('btn-switch').style.display='none';
  ['reset','save'].forEach(id=>{if($(id))$(id).disabled=true;});
  if($('partner-tools'))$('partner-tools').hidden=false;hide();
  return;
 }
 if(m.t==='ready'&&role==='host'){
  ready=true;g.role(myIndex());status(otherName()+' joined your world!');
  if($('btn-switch'))$('btn-switch').style.display='none';
  if($('partner-tools'))$('partner-tools').hidden=false;hide();
  return;
 }
 if(m.t==='mode-request'&&role==='host'&&['creative','survival'].includes(m.mode)){g.setMode?.(m.mode);send({t:'mode-changed',mode:m.mode});return;}
 if(m.t==='mode-changed'&&role==='guest'&&['creative','survival'].includes(m.mode)){g.useState?.({...g.getState(),creative:m.mode==='creative'});return;}
 if(m.t==='input'&&g.isHost()){g.remoteInput={left:!!m.input?.left,right:!!m.input?.right,jump:!!m.input?.jump};return;}
 if(m.t==='action'&&g.isHost()){
  const now=performance.now();if(now-lastActionAt<80)return;lastActionAt=now;
  if(['mine','place'].includes(m.kind))g.action(otherIndex(),m.kind,{x:m.x,y:m.y},m.tile);
  return;
 }
 if(m.t==='attack'&&g.isHost()){const now=performance.now();if(now-lastActionAt<300)return;lastActionAt=now;g.attack(otherIndex());return;}
 if(m.t==='craft'&&g.isHost()){const now=performance.now();if(now-lastActionAt<80)return;lastActionAt=now;g.craftFor(otherIndex(),m.recipe);return;}
 if(m.t==='give'&&g.isHost()){const now=performance.now();if(now-lastGiveAt<200)return;lastGiveAt=now;g.giveTo(otherIndex(),m.tile);return;}
 if(m.t==='regroup'&&g.isHost()){const now=performance.now();if(now-lastRegroupAt[otherIndex()]<15000)return;if(g.regroup(otherIndex()))lastRegroupAt[otherIndex()]=now;return;}
 if(m.t==='feedback'&&role==='guest'){g.setStatus(String(m.msg||'').slice(0,100));return;}
 if(m.t==='state'&&role==='guest'&&ready){
  if(!validState(m.s))return;
  if(m.s.realmIndex!==lastRealm){if(performance.now()-lastResync>1500){lastResync=performance.now();send({t:'resync'});}return;}
  g.useState(m.s);return;
 }
 if(m.t==='edit'&&role==='guest'&&ready){
  if([m.x,m.y,m.id].every(Number.isInteger)&&m.id>=0&&m.id<=MAX_TILE)g.useEdit(m.x,m.y,m.id);
  return;
 }
 if(m.t==='resync'&&role==='host')fullWorld();
}

function stopHb(){clearInterval(hbTimer);hbTimer=0;}
function startHb(){
 if(!conn?.open)return;
 stopHb();lastPong=performance.now();
 hbTimer=setInterval(()=>{
  if(!connected()||document.hidden)return;
  if(performance.now()-lastPong>20000){
   const c=conn;stopHb();try{c?.close();}catch(_){}
   if(conn===c)lost('Connection timed out');
   return;
  }
  hbSent=performance.now();send({t:'heartbeat',nonce:++hbNonce});
 },4000);
}

function lost(reason){
 stopHb();conn=null;ready=false;
 g.remoteInput={left:false,right:false,jump:false};
 if($('partner-tools'))$('partner-tools').hidden=true;
 if(role==='host'){
  status(reason+' · still waiting for Jozef');
  if($('coop-disconnect'))$('coop-disconnect').disabled=false;
 }else if(role==='guest'){
  status('Lost Daddy. Trying again…', true);
  scheduleGuestRetry();
 }
}

function attach(c){
 if(conn?.open){try{c.close();}catch(_){}return;}
 if(conn&&conn!==c)try{conn.close();}catch(_){}
 conn=c;
 c.on('open',()=>{
  if(conn!==c)return;
  startHb();retryCount=0;clearTimeout(retryTimer);clearTimeout(joinTimer);
  if($('coop-disconnect'))$('coop-disconnect').disabled=false;
  if(role==='host'){
   ready=false;g.role(myIndex());status('Jozef is joining…');
   fullWorld();
   setTimeout(()=>{if(conn===c&&c.open&&role==='host')fullWorld();},400);
   setTimeout(()=>{if(conn===c&&c.open&&role==='host')fullWorld();},1200);
  }else{
   ready=false;g.role(myIndex());status('Almost there…', true);
  }
 });
 c.on('data',m=>{if(conn===c)onMsg(m);});
 c.on('close',()=>{if(conn===c)lost('Disconnected');});
 c.on('error',()=>{if(conn===c)lost('Connection failed');});
}

function destroyPeer(){
 stopHb();
 try{conn?.close();}catch(_){}
 try{peer?.destroy();}catch(_){}
 conn=null;peer=null;peerReady=false;
}

function leave(opts={}){
 const gen=++hostGen;
 clearTimeout(joinTimer);clearTimeout(retryTimer);clearTimeout(hbTimer);
 const wasGuest=role==='guest';
 destroyPeer();
 ready=false;role='solo';retryCount=0;lastRealm=-1;
 g.remoteInput={left:false,right:false,jump:false};
 if($('coop-share'))$('coop-share').disabled=true;
 if($('coop-disconnect'))$('coop-disconnect').disabled=true;
 if($('btn-switch'))$('btn-switch').style.display='';
 ['reset','mode','save'].forEach(id=>{if($(id))$(id).disabled=false;});
 if($('partner-tools'))$('partner-tools').hidden=true;
 loader(false);
 status(opts.reason||'Solo play');
 if(wasGuest&&!opts.skipReload)location.reload();
 else if(!wasGuest)g.role(myIndex());
}

function startHost(){
 hostId=savedHostId();invitedHost=FIXED_HOST_ID;
 try{localStorage.setItem(FAMILY_ROLE_KEY,'Daddy');}catch(_){}
 if(!window.Peer&&!window.BlockWorldRelay?.connected?.()){status('Not ready yet. Refresh the page.');return;}
 leave({skipReload:true,reason:'Starting…'});
 const gen=++hostGen;
 role='host';ready=false;retryCount=0;
 if(window.BlockWorldRelay?.connected?.())setTimeout(relayOnline,0);
 try{g.saveHost();}catch(_){}
 g.role(myIndex());
 status('Starting…');
 if($('coop-disconnect'))$('coop-disconnect').disabled=false;

 function attempt(){
  if(gen!==hostGen||role!=='host')return;
  destroyPeer();
  status(retryCount?'Reclaiming room…':'Starting…');
  try{
   peer=new window.Peer(hostId,opts());
  }catch(e){status('Could not start. Try again.');return;}
  const p=peer;
  p.on('open',()=>{
   if(gen!==hostGen||peer!==p)return;
   peerReady=true;retryCount=0;
   if($('coop-code'))$('coop-code').value=hostId;
   if($('coop-share'))$('coop-share').disabled=false;
   status('Ready! Keep this open. Jozef taps the green PLAY TOGETHER button.');
   const hint=$('coop-hint');
   if(hint)hint.textContent='Jozef: open the same game and tap the big green button.';
  });
  p.on('connection',c=>{
   if(gen!==hostGen){try{c.close();}catch(_){}return;}
   if(conn?.open||ready){try{c.close();}catch(_){}return;}
   attach(c);
  });
  p.on('disconnected',()=>{
   if(gen!==hostGen||peer!==p)return;
   peerReady=false;
   try{p.reconnect();}catch(_){}
  });
  p.on('error',e=>{
   if(gen!==hostGen||peer!==p)return;
   if(connected())return;
   const type=e?.type||'';
   if(type==='unavailable-id'||type==='network'||type==='server-error'||type==='socket-error'||type==='socket-closed'){
    if(retryCount>=8){status('Could not start. Close other tabs of this game, wait 10s, try again.');show();return;}
    retryCount++;
    if(type==='unavailable-id'){status('Daddy’s room is already open on another tab. Close the other tab and try again.');show();return;}
    status('Connecting… ('+retryCount+'/8)');
    setTimeout(()=>{if(gen===hostGen&&role==='host'&&!peerReady)attempt();},1000+retryCount*400);
    return;
   }
   status('Could not start. Check internet and try again.');
   show();
  });
 }
 attempt();
}

function scheduleGuestRetry(){
 if(role!=='guest'||ready)return;
 clearTimeout(retryTimer);
 retryCount++;
 status('Still looking for Daddy… ('+retryCount+')', true);
 retryTimer=setTimeout(()=>{if(role==='guest'&&!ready)join(true);},Math.min(12000,600+retryCount*400));
}

function join(isRetry){
 invitedHost=FIXED_HOST_ID;
 try{localStorage.setItem(FAMILY_ROLE_KEY,'Jozef');localStorage.setItem(FAMILY_GUEST_KEY,FIXED_HOST_ID);}catch(_){}
 if(!window.Peer&&!window.BlockWorldRelay?.connected?.()){status('Not ready yet. Refresh the page.');return;}
 if(role==='host'){status('Stop first, then join.');return;}
 if(role==='guest'&&!isRetry&&(connected()||ready))return;

 clearTimeout(joinTimer);clearTimeout(retryTimer);
 destroyPeer();
 role='guest';ready=false;peerReady=false;
 if(window.BlockWorldRelay?.connected?.())setTimeout(relayOnline,0);
 if(!isRetry)retryCount=0;
 try{g.saveHost();}catch(_){}
 if($('coop-disconnect'))$('coop-disconnect').disabled=false;
 loader(true);
 status('Finding Daddy…', true);

 const id=guestId();
 try{
  peer=new window.Peer(id,opts());
 }catch(e){loader(false);status('Could not join. Try again.');return;}
 const p=peer;

 p.on('open',()=>{
  if(peer!==p||role!=='guest')return;
  peerReady=true;
  status('Connecting to Daddy…', true);
  try{
   const c=p.connect(FIXED_HOST_ID,{reliable:true,serialization:'json'});
   attach(c);
  }catch(_){scheduleGuestRetry();}
 });
 p.on('error',e=>{
  if(peer!==p||role!=='guest'||ready)return;
  status('Still looking for Daddy…', true);
  scheduleGuestRetry();
 });
 p.on('disconnected',()=>{
  if(peer!==p||role!=='guest')return;
  peerReady=false;
  if(!ready)scheduleGuestRetry();
 });

 joinTimer=setTimeout(()=>{
  if(role==='guest'&&!ready){
   status('Daddy is offline. Keep this open — trying again…', true);
   scheduleGuestRetry();
  }
 },20000);
}

function tick(){
 if(!g.connected())return;
 const now=performance.now();
 if(role==='guest'&&now-inputAt>50){
  inputAt=now;
  const left=!!g.touch?.left,right=!!g.touch?.right,jump=!!g.touch?.jump;
  if(left!==lastInput.left||right!==lastInput.right||jump!==lastInput.jump||now-stateAt>180){
   lastInput={left,right,jump};
   send({t:'input',input:lastInput});
   stateAt=now;
  }
 }
 if(role==='host'&&ready&&now-snapshotAt>100){
  snapshotAt=now;
  try{const s=g.getState();if(s)send({t:'state',s});}catch(_){}
 }
}
setInterval(tick,40);

$('coop-give')?.addEventListener('click',()=>{
 if(!g.connected())return;
 const now=performance.now();if(now-lastGiveAt<200)return;
 if(role==='guest'){send({t:'give',tile:g.selected});lastGiveAt=now;return;}
 g.giveTo(myIndex(),g.selected);lastGiveAt=now;
});
$('coop-regroup')?.addEventListener('click',()=>{
 if(!g.connected())return;
 const now=performance.now(),who=myIndex();
 if(now-lastRegroupAt[who]<15000)return;
 if(role==='guest'){send({t:'regroup'});lastRegroupAt[who]=now;return;}
 if(g.regroup(myIndex()))lastRegroupAt[myIndex()]=now;
});
$('open-coop')?.addEventListener('click',show);
$('coop-close')?.addEventListener('click',hide);
$('coop-host')?.addEventListener('click',startHost);
$('coop-join')?.addEventListener('click',()=>join(false));
$('coop-disconnect')?.addEventListener('click',()=>leave({reason:'Stopped'}));
$('coop-share')?.addEventListener('click',async()=>{
 if(role!=='host'||!peerReady){status('Wait for Daddy’s room to be ready.');return;}
 status('No link needed — Jozef just taps the green button on his phone.');
});

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&connected())lastPong=performance.now();});
window.addEventListener('pagehide',()=>{if(role==='host')try{g.saveHost();}catch(_){}});

if($('coop-code'))$('coop-code').value=FIXED_HOST_ID;
try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}
status('Daddy starts the room. Jozef taps the green button. Same game, two phones.');

function relayMessage(m){
 if(role==='solo'||conn?.open)return;
 if(m?.t==='world'&&role==='guest')ready=false;
 onMsg(m);
}
function relayOnline(){
 if(!window.BlockWorldRelay?.connected?.()||conn?.open)return;
 if(role==='host'){ready=false;g.role(myIndex());fullWorld();status('Shared world ready · playing as '+playerName());}
 if(role==='guest'){ready=false;send({t:'resync'});status('Joining '+otherName()+' through family relay…');}
}
function automaticHost(){
 if(role==='host')return;
 leave({skipReload:true,reason:'Shared world ready'});
 role='host';ready=false;g.role(myIndex());hide();relayOnline();
}
function automaticJoin(){
 if(role==='guest')return;
 leave({skipReload:true,reason:'Joining shared world'});
 role='guest';ready=false;g.role(myIndex());hide();relayOnline();
}
window.BlockWorldCoop=Object.freeze({
 role:()=>role,connected,host:startHost,join:()=>join(false),
 disconnect:()=>leave({reason:'Stopped'}),requestMode:mode=>{if(['creative','survival'].includes(mode))send({t:'mode-request',mode});},code:()=>hostId||invitedHost,relayMessage,relayOnline,automaticHost,automaticJoin
});
})();
