/* Jozef's World: parent-approved, device-to-device transfer of existing saves.
 * PeerJS supplies encrypted WebRTC data channel; no remote save server is used.
 * Sending and applying require separate local user gestures. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root){root.JozefFamilyTransfer=api;if(root.document)api.mount(root);}
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const PART=12000,MAX_BYTES=8000000,MAX_PARTS=700;
 const clamp=(n)=>Math.min(1e8,Math.max(0,Math.floor(Number(n)||0)));
 const PROGRESS_ARRAYS=['earned','multiSports','rewardedTours','rewardedGeography','rewardedTitles',
  'rewardedCareer','rewardedTraining','rewardedLeague','blockWorldRewards'];
 const MONOTONIC=['xp','goals','saves','memory','quizzes','perfect','scrambles','keepyBest','targetBest',
  'tourWins','championships','geography','careerGames','careerWins','trainingSuccess',
  'leagueTitles','streetRuns','streetBest','arenaGames','arenaWins','arenaGoals','multisportGames'];
 function mergeProfile(local,incoming){
  if(!local||typeof local!=='object'||Array.isArray(local))local={};
  if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))throw Error('Invalid incoming progress');
  // Preserve this device's name, avatar and kit. Scores/counters are maxima to
  // avoid double-paying XP for the same match on two devices.
  const result={...incoming,...local};
  for(const key of MONOTONIC)result[key]=Math.max(clamp(local[key]),clamp(incoming[key]));
  for(const key of PROGRESS_ARRAYS){
   const a=Array.isArray(local[key])?local[key]:[],b=Array.isArray(incoming[key])?incoming[key]:[];
   result[key]=[...new Set([...a,...b].filter(v=>typeof v==='string'&&v.length<180))].slice(0,1500);
  }
  for(const key of ['allSportCup','rivalCircuitChampion'])result[key]=local[key]===true||incoming[key]===true;
  if(local.day===incoming.day&&local.day){
   result.day=local.day;result.daily={...incoming.daily,...local.daily};
   for(const k of Object.keys(incoming.daily||{}))result.daily[k]=Math.max(clamp(local.daily?.[k]),clamp(incoming.daily[k]));
   if(incoming.dailyHero===result.day||local.dailyHero===result.day)result.dailyHero=result.day;
  }else if(!local.day&&incoming.day){result.day=incoming.day;result.daily=incoming.daily||{};result.dailyHero=incoming.dailyHero||'';}
  return result;
 }
 function mergePack(pack,storage,kit){
  const valid=kit.validate(pack),key='jozefs-world-player-v1',raw=valid.data[key];
  if(!raw)throw Error('This backup has no shared XP record. Choose full restore instead.');
  const profile=JSON.parse(raw),prior=JSON.parse(storage.getItem(key)||'{}');
  const data=Object.create(null);data[key]=JSON.stringify(mergeProfile(prior,profile));
  return {...valid,data};
 }
 async function fingerprint(text){
  const bytes=new TextEncoder().encode(text);
  if(bytes.length>MAX_BYTES)throw Error('Transfer exceeds 8 MB; use the Club backup file instead.');
  if(!crypto?.subtle?.digest)throw Error('Secure hashing requires HTTPS.');
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
 }
 function validateMeta(m){
  return m?.t==='begin'&&Number.isInteger(m.length)&&m.length>0&&m.length<=MAX_BYTES&&
   Number.isInteger(m.bytes)&&m.bytes>0&&m.bytes<=MAX_BYTES&&
   Number.isInteger(m.parts)&&m.parts===Math.ceil(m.length/PART)&&m.parts<=MAX_PARTS&&
   typeof m.sha==='string'&&/^[a-f0-9]{64}$/.test(m.sha);
 }
 function mount(w){
  const kit=w.JozefFamilyBackup,card=w.document.querySelector('.clubhouse-backup');
  if(!kit||!card||w.document.getElementById('jw-family-transfer'))return;
  const el=w.document.createElement('section');el.id='jw-family-transfer';
  el.innerHTML='<h4>TRANSFER TO ANOTHER DEVICE</h4>'+
   '<p>Dad starts a private transfer. The sender must approve sending, and the receiving device must approve importing. Nothing is automatically synchronized.</p>'+
   '<div class="jw-family-transfer-controls"><button type="button" id="ft-host">DAD: START SHARING</button>'+
   '<input id="ft-code" autocomplete="off" spellcheck="false" aria-label="Private transfer code" placeholder="Private 32-character code">'+
   '<button type="button" id="ft-join">RECEIVE FROM DAD</button></div>'+
   '<div class="jw-family-transfer-controls"><button type="button" id="ft-send" hidden>APPROVE SENDING SAVES</button>'+
   '<label id="ft-mode-wrap" hidden>Import option <select id="ft-mode">'+
   '<option value="merge">Merge XP + achievements (recommended)</option>'+
   '<option value="replace">Restore all included games and worlds (replaces saves)</option></select></label>'+
   '<label id="ft-confirm-wrap" hidden><input id="ft-confirm" type="checkbox"> An adult approved this import; I have backed up this device.</label>'+
   '<button type="button" id="ft-apply" hidden disabled>APPROVE IMPORT</button>'+
   '<button type="button" id="ft-stop" hidden>CANCEL</button></div>'+
   '<p id="ft-status" role="status" aria-live="polite">Offline backup files remain available above.</p>';
  card.append(el);
  const $=id=>w.document.getElementById(id);
  let peer=null,conn=null,role='',code='',incoming=null,parts=[],meta=null,raw='',approved=false,sent=0;
  const info=m=>{$('ft-status').textContent=m;};
  function close(){
   try{conn?.close();peer?.destroy();}catch(_){}
   peer=conn=null;role='';incoming=null;parts=[];meta=null;raw='';approved=false;sent=0;
   $('ft-send').hidden=$('ft-apply').hidden=$('ft-stop').hidden=true;
   $('ft-mode-wrap').hidden=$('ft-confirm-wrap').hidden=true;
   $('ft-confirm').checked=false;$('ft-apply').disabled=true;
   $('ft-host').disabled=$('ft-join').disabled=false;
  }
  function send(m){try{if(conn?.open)conn.send(m);}catch(_){info('Connection interrupted; no saves were modified.');}}
  function transferId(){
   const bytes=w.crypto.getRandomValues(new Uint8Array(16));
   return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  function live(){
   if(!w.Peer||!w.crypto?.subtle||!w.crypto?.getRandomValues){info('Secure sharing unavailable. Use the family backup file above.');return false;}
   return true;
  }
  function bind(c){
   if(conn){try{c.close();}catch(_){}return;}
   conn=c;
   c.on('open',()=>{
    if(conn!==c)return;
    if(role==='dad'){$('ft-send').hidden=false;info('Receiving device connected. Dad must tap APPROVE SENDING SAVES.');}
    else info('Connected to Dad. Awaiting his approval.');
   });
   c.on('data',async m=>{
    if(conn!==c||!m||typeof m!=='object')return;
    try{
     if(role==='dad'){
      if(m.t==='ready'&&approved&&m.n===0){sent=0;send({t:'part',n:0,data:raw.slice(0,PART)});}
      else if(m.t==='ack'&&approved&&Number.isInteger(m.n)&&m.n===sent){
       sent++;
       if(sent<meta.parts){send({t:'part',n:sent,data:raw.slice(sent*PART,(sent+1)*PART)});info('Transferring '+Math.round(sent/meta.parts*100)+'%');}
       else {send({t:'done'});info('Sent. Parent confirmation on the receiving phone is still required.');}
      }else if(m.t==='applied'){info('Receiving device confirmed import completed.');}
      return;
     }
     if(m.t==='begin'&&validateMeta(m)&&!meta){
      meta=m;parts=[];info('Receiving '+meta.parts+' verified pieces. No saved data has been changed.');
      send({t:'ready',n:0});return;
     }
     if(m.t==='part'&&meta&&!incoming){
      if(!Number.isInteger(m.n)||m.n!==parts.length||typeof m.data!=='string'||m.data.length>PART){throw Error('Invalid transfer part');}
      parts.push(m.data);send({t:'ack',n:m.n});
      if(parts.length===meta.parts){
       const received=parts.join('');if(received.length!==meta.length)throw Error('Incomplete transfer');
       if(new TextEncoder().encode(received).length!==meta.bytes||await fingerprint(received)!==meta.sha)throw Error('Transfer integrity check failed');
       incoming=kit.validate(received);parts=[];
       const count=Object.keys(incoming.data).length;
       $('ft-mode-wrap').hidden=$('ft-confirm-wrap').hidden=$('ft-apply').hidden=false;
       info('Verified '+count+' saved activities. Choose merge or full restore, then confirm import on this device.');
      }else if(parts.length%12===0)info('Receiving '+Math.round(parts.length/meta.parts*100)+'%');
     }
    }catch(error){info('Transfer rejected: '+error.message);incoming=null;parts=[];meta=null;send({t:'cancel'});}
   });
   c.on('close',()=>{if(conn===c){conn=null;info(incoming?'Transfer received; choose whether to apply.':'Connection closed; local saves remain intact.');}});
   c.on('error',()=>{if(conn===c){conn=null;info('Connection failed; no saves were modified.');}});
  }
  $('ft-host').addEventListener('click',()=>{
   if(!live())return;close();role='dad';code=transferId();
   peer=new w.Peer('jw-family-'+code);$('ft-code').value=code;
   $('ft-stop').hidden=false;$('ft-host').disabled=$('ft-join').disabled=true;
   peer.on('open',()=>info('Private code ready. Copy it to Jozef’s device; keep this screen open.'));
   peer.on('connection',c=>bind(c));
   peer.on('error',()=>info('Could not host transfer; use offline backup file instead.'));
  });
  $('ft-join').addEventListener('click',()=>{
   const token=String($('ft-code').value||'').trim().toLowerCase();
   if(!/^[a-f0-9]{32}$/.test(token)){info('Enter the 32-character private transfer code from Dad.');return;}
   if(!live())return;close();role='jo';code=token;
   $('ft-stop').hidden=false;$('ft-host').disabled=$('ft-join').disabled=true;
   peer=new w.Peer();
   peer.on('open',()=>{bind(peer.connect('jw-family-'+code,{reliable:true}));});
   peer.on('error',()=>info('Could not connect. Check code and that Dad is hosting.'));
   info('Connecting to Dad’s device…');
  });
  $('ft-send').addEventListener('click',async()=>{
   if(role!=='dad'||!conn?.open||approved)return;
   try{
    const current=await kit.readIndexedDb();
    const pack=kit.create(w.localStorage,current);
    raw=JSON.stringify(pack);
    const sha=await fingerprint(raw);
    meta={t:'begin',length:raw.length,bytes:new TextEncoder().encode(raw).length,parts:Math.ceil(raw.length/PART),sha};
    if(meta.parts>MAX_PARTS)throw Error('Transfer too large; use Club export.');
    approved=true;$('ft-send').disabled=true;
    send(meta);info('Dad approved sending '+Object.keys(pack.data).length+' saved activities.');
   }catch(err){info('Cannot prepare transfer: '+err.message);}
  });
  $('ft-confirm').addEventListener('change',()=>{$('ft-apply').disabled=!$('ft-confirm').checked;});
  $('ft-apply').addEventListener('click',async()=>{
   if(role!=='jo'||!incoming||!$('ft-confirm').checked)return;
   $('ft-apply').disabled=true;
   try{
    const mode=$('ft-mode').value;
    if(!w.confirm(mode==='replace'?
       'Replace included games and worlds on this device with Dad’s backup?':'Merge shared XP and achievements without overwriting local worlds?')){
      $('ft-apply').disabled=false;return;
    }
    const pack=mode==='replace'?incoming:mergePack(incoming,w.localStorage,kit);
    const result=await kit.restore(pack,w.localStorage);
    send({t:'applied',activities:result.activities});
    info('Import complete ('+result.activities+' activities). Reloading saved progress…');
    w.location.reload();
   }catch(err){info('Import was not completed: '+err.message);$('ft-apply').disabled=false;}
  });
  $('ft-stop').addEventListener('click',()=>{close();info('Transfer cancelled. Local progress was not changed.');});
 }
 return Object.freeze({PART,MAX_BYTES,MAX_PARTS,mergeProfile,mergePack,validateMeta,fingerprint,mount});
});
