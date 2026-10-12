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
let lastPacketAt=0,editCount=0;
const COOP_RE=/^[0-9a-f]{32}$/i;
const copyInput=s=>({left:!!s?.left,right:!!s?.right,jump:!!s?.jump});
const connected=()=>!!conn?.open;
g.isHost=()=>role==='host'&&connected()&&ready;
g.isGuest=()=>role==='guest';
g.connected=()=>role!=='solo'&&connected()&&ready;
g.remoteInput=lastInput;
g.requestAction=(kind,a,tile)=>{
 if(role!=='guest'||!connected()||!ready)return;
 if(!['mine','place'].includes(kind)||!a||!Number.isInteger(a.x)||!Number.isInteger(a.y))return;
 send({t:'action',kind,x:a.x,y:a.y,tile,seq:++editCount});
};
g.onBlockChanged=(x,y,id)=>{
 if(g.isHost())send({t:'edit',x,y,id});
};
function setStatus(msg){
 const e=$('coop-status');if(e)e.textContent=msg;
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
 if(m.t==='world'&&role==='guest'){
  if(!validWorld(m.w)){setStatus('Invalid game data from host');return;}
  g.useWorld(m.w);g.role(1);ready=true;lastRealm=m.w.realmIndex;
  send({t:'ready'});setStatus('Connected! You are Jozef. Both of you can play.');
  $('btn-switch').style.display='none';
  $('reset').disabled=true;$('mode').disabled=true;
  $('inventory').disabled=true;$('bw-actions')?.querySelectorAll?.('button').forEach(b=>b.disabled=true);
  hide();
 }else if(m.t==='ready'&&role==='host'){
  ready=true;g.role(0);setStatus('Connected! You control Daddy; Jo controls Jozef.');
  $('btn-switch').style.display='none';hide();
 }else if(m.t==='input'&&g.isHost()){
  g.remoteInput=copyInput(m.input);
  lastPacketAt=performance.now();
 }else if(m.t==='action'&&g.isHost()){
  const x=m.x,y=m.y;
  if(!['mine','place'].includes(m.kind)||!Number.isInteger(x)||!Number.isInteger(y)||
    x<0||x>=180||y<0||y>=72||!Number.isInteger(m.seq))return;
  // Reach and resource checks are performed by the actual game engine on the host.
  if(m.kind==='place'&&(!Number.isInteger(m.tile)||m.tile<1||m.tile>31))return;
  g.action(1,m.kind,{x,y},m.tile);
 }else if(m.t==='state'&&role==='guest'&&ready){
  if(!validState(m.s))return;
  if(m.s.realmIndex!==lastRealm){send({t:'resync'});return;}
  g.useState(m.s);
 }else if(m.t==='edit'&&role==='guest'&&ready){
  if([m.x,m.y,m.id].every(Number.isInteger)&&m.x>=0&&m.x<180&&m.y>=0&&m.y<72&&m.id>=0&&m.id<=31)g.useEdit(m.x,m.y,m.id);
 }else if(m.t==='resync'&&g.isHost())fullWorld();
}
function attach(connection){
 if(conn?.open){connection.close();return;}conn=connection;
 connection.on('open',()=>{
  if(role==='host'){
   ready=false;g.role(0);setStatus('Jozef joined. Synchronizing your shared world…');
   fullWorld();
  }else{
   ready=false;g.role(1);setStatus('Connected. Loading the shared world…');
  }
 });
 connection.on('data',onMessage);
 connection.on('close',()=>disconnect('Connection ended'));
 connection.on('error',()=>disconnect('Connection failed'));
}
function leave(options={}){
 const guest=role==='guest',c=conn,p=peer;
 conn=null;peer=null;ready=false;role='solo';invite='';lastRealm=-1;
 g.remoteInput={left:false,right:false,jump:false};
 $('coop-share').disabled=true;$('coop-disconnect').disabled=true;
 $('btn-switch').style.display='';$('reset').disabled=false;$('mode').disabled=false;$('inventory').disabled=false;
 $('bw-actions')?.querySelectorAll?.('button').forEach(b=>b.disabled=false);
 if(c){try{c.close();}catch(_){}}
 if(p){try{p.destroy();}catch(_){}}
 setStatus(options.reason||'Offline · your solo world is safe');
 if(guest&&!options.skipReload){location.reload();}
 else if(!guest){g.role(0);g.setStatus('Disconnected. You can keep playing solo.');}
}
function disconnect(reason){if(role==='solo')return;leave({reason});}
function startHost(){
 if(!window.Peer){setStatus('Online co-op is unavailable: PeerJS could not load.');return;}
 if(role!=='solo')leave({skipReload:true});
 try{
  invite=secureCode();
  role='host';g.saveHost();g.role(0);
  peer=new window.Peer('jw2d-'+invite);
  peer.on('open',()=>{
   $('coop-code').value=invite;
   $('coop-share').disabled=false;$('coop-disconnect').disabled=false;
   setStatus('Private invite ready. Send the link to Jo, then keep this page open.');
  });
  peer.on('connection',c=>{if(conn||ready){c.close();return;}attach(c);});
  peer.on('disconnected',()=>{if(!connected())setStatus('Signalling disconnected. Waiting to reconnect…');});
  peer.on('error',e=>{setStatus('Could not host: '+(e?.type||'network error'));});
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
 if(role==='guest'){setStatus('Already connecting');return;}
 g.saveHost();
 role='guest';ready=false;
 try{
  peer=new window.Peer();
  peer.on('open',()=>{setStatus('Connecting to Daddy…');
   attach(peer.connect('jw2d-'+code,{reliable:true,serialization:'json'}));
  });
  peer.on('error',e=>{setStatus('Unable to join: '+(e?.type||'network error')+'. Check the invitation.');});
  setStatus('Opening private connection…');
 }catch(e){leave({reason:e.message,skipReload:true});}
}
g.onFrame=now=>{
 if(!connected()||!ready)return;
 if(role==='host'){
  if(now-stateAt>100){stateAt=now;send({t:'state',s:g.getState()});}
  const r=g.getState().realmIndex;
  if(r!==lastRealm||now-snapshotAt>18000)fullWorld();
  if(now-lastPacketAt>2000){g.remoteInput={left:false,right:false,jump:false};}
 }else if(role==='guest'&&now-inputAt>65){
  inputAt=now;send({t:'input',input:g.input()});
 }
};
$('open-coop').addEventListener('click',show);
$('coop-close').addEventListener('click',hide);
$('coop-host').addEventListener('click',startHost);
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
 show();setStatus('Invitation detected. Tap JOIN GAME to play as Jozef.');
 // Remove the invitation from the address bar to avoid accidentally sharing the secret.
 try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}
}
setStatus('Offline · two players on keyboard, or invite Jo on another device');
window.BlockWorldCoop=Object.freeze({role:()=>role,connected,host:startHost,join,disconnect,code:()=>invite});
})();
