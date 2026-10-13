/* Family-scoped presence. Private pairing is opt-in and never sends a child's profile. */
(() => {
  'use strict';
  const WHO='jozefs-world-who',PAIR='jozefs-world-family-pair-v1',VOICE='jozefs-world-voice-alerts';
  const $=id=>document.getElementById(id);
  const normalize=value=>typeof value==='string'&&/^[a-f0-9]{32}$/i.test(value.trim())?value.trim().toLowerCase():'';
  const role=()=>{try{return localStorage.getItem(WHO)==='Jozef'?'Jozef':'Dad';}catch(_){return 'Dad';}};
  const other=()=>role()==='Dad'?'Jozef':'Dad';
  const getPair=()=>{try{return normalize(localStorage.getItem(PAIR));}catch(_){return '';}};
  const alertsOn=()=>{try{return localStorage.getItem(VOICE)!=='off';}catch(_){return true;}};
  let peer=null,connection=null,interval=0,serial=0,online=false;
  const status=message=>{const node=$('live-status');if(node)node.textContent=message;};
  function chime(up){
    if(!alertsOn())return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      const ctx=new Audio(),notes=up?[523,659,784]:[392,330];
      notes.forEach((freq,i)=>{
        const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+i*.12;
        osc.type='sine';osc.frequency.value=freq;
        gain.gain.setValueAtTime(.0001,t);
        gain.gain.exponentialRampToValueAtTime(.15,t+.02);
        gain.gain.exponentialRampToValueAtTime(.0001,t+.28);
        osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.3);
      });
    }catch(_){/* Audio is optional, especially before a user gesture. */}
  }
  function announce(who,text){
    if(!alertsOn()||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
    try{window.speechSynthesis.cancel();const s=new SpeechSynthesisUtterance(text);s.rate=.95;s.pitch=who==='Dad'?.8:1.2;window.speechSynthesis.speak(s);}catch(_){}
  }
  function paint(value,message){
    const before=online;online=!!value;
    $('dot-'+role().toLowerCase())?.classList.add('on');
    $('dot-'+other().toLowerCase())?.classList.toggle('on',online);
    status(message||(online?other()+' is here.':getPair()?'Waiting for '+other()+'…':'Pair your family phones to see who is here.'));
    if(before!==online){chime(online);announce(other(),other()+(online?' joined your world.':' left your world.'));if(online)try{navigator.vibrate?.(30);}catch(_){}}
  }
  function stop(){
    ++serial;clearInterval(interval);interval=0;
    const old=connection,p=peer;connection=null;peer=null;
    try{old?.close();}catch(_){}
    try{p?.destroy();}catch(_){}
    online=false;
    $('dot-dad')?.classList.remove('on');$('dot-jozef')?.classList.remove('on');
  }
  function showCode(){
    const code=getPair(),input=$('family-pair-code'),panel=$('family-pair-panel');
    if(input)input.value=code.toUpperCase();
    const caption=$('family-pair-help');
    if(caption)caption.textContent=code?'Paired as '+role()+'. Only a device with this private code can appear as '+other()+'.':'Dad creates a private code, then Jozef enters it on the other phone.';
    if(panel&&!panel.hidden)status(code?'Private family pairing saved on this phone.':'Pair your family phones to see who is here.');
  }
  async function begin(){
    stop();showCode();
    const code=getPair(),token=serial;
    if(!code){paint(false);return;}
    if(!window.Peer||!window.crypto?.subtle||!window.TextEncoder){paint(false,'Private presence needs HTTPS and an available connection.');return;}
    try{
      // Signalling identifiers contain only a hash, never the private invite code.
      const bytes=new TextEncoder().encode('jozefs-world-family-presence-v1:'+code);
      const digest=new Uint8Array(await window.crypto.subtle.digest('SHA-256',bytes));
      if(token!==serial)return;
      const scope=[...digest.slice(0,16)].map(n=>n.toString(16).padStart(2,'0')).join('');
      const mine='jw-family-'+scope+'-'+role().toLowerCase(),opponent='jw-family-'+scope+'-'+other().toLowerCase();
      const p=new window.Peer(mine);peer=p;
      let pending=false;
      function accept(c){
        if(token!==serial||c.peer!==opponent||connection){try{c.close();}catch(_){}return;}
        connection=c;
        const connected=()=>{if(token!==serial||connection!==c)return;pending=false;paint(true);};
        const closed=()=>{
          if(token!==serial||connection!==c)return;
          connection=null;pending=false;paint(false);
        };
        c.on('open',connected);c.on('close',closed);c.on('error',closed);
        if(c.open)connected();
      }
      function dial(){
        if(token!==serial||role()!=='Jozef'||connection||pending||p.disconnected)return;
        pending=true;
        try{
          const c=p.connect(opponent,{reliable:true});
          // A failed dial must release its retry slot even if PeerJS emits no close.
          c.on('error',()=>{pending=false;});
          c.on('close',()=>{pending=false;});
          accept(c);
        }catch(_){pending=false;}
      }
      p.on('open',()=>{
        if(token!==serial)return;
        paint(false);
        if(role()==='Jozef'){dial();interval=setInterval(dial,8000);}
      });
      p.on('connection',accept);
      p.on('disconnected',()=>{if(token!==serial)return;if(!connection)paint(false,'Connection interrupted. Reconnecting…');try{p.reconnect?.();}catch(_){}});
      p.on('error',err=>{
        if(token!==serial)return;
        if(!connection)paint(false,err?.type==='unavailable-id'?'This role is already online on another device. Choose the correct phone.':'Presence unavailable. You can still play the games.');
      });
    }catch(_){if(token===serial)paint(false,'Private pairing could not start on this browser.');}
  }
  const open=$('family-pair-open'),panel=$('family-pair-panel');
  open?.addEventListener('click',()=>{
    if(!panel)return;panel.hidden=!panel.hidden;open.setAttribute('aria-expanded',String(!panel.hidden));showCode();
  });
  $('family-pair-create')?.addEventListener('click',()=>{
    if(!window.crypto?.getRandomValues){status('A secure browser is required to create a family code.');return;}
    const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);
    const code=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
    try{localStorage.setItem(PAIR,code);localStorage.setItem(WHO,'Dad');}catch(_){status('Local storage unavailable. Cannot save a pairing.');return;}
    begin();
  });
  $('family-pair-join')?.addEventListener('click',()=>{
    const raw=$('family-pair-code')?.value||'';
    const code=normalize(raw);
    if(!code){status('Enter the complete 32-character private family code from Dad.');return;}
    try{localStorage.setItem(PAIR,code);localStorage.setItem(WHO,'Jozef');}catch(_){status('Local storage unavailable. Cannot save a pairing.');return;}
    begin();
  });
  $('family-pair-copy')?.addEventListener('click',()=>{
    const code=getPair();if(!code){status('Create a private family code first.');return;}
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code.toUpperCase()).then(()=>status('Family code copied. Send it privately to Jozef.'),()=>status('Select the code to copy it.'));
    else { $('family-pair-code')?.select?.();status('Select and copy the code. Share it privately.'); }
  });
  $('family-pair-forget')?.addEventListener('click',()=>{
    stop();try{localStorage.removeItem(PAIR);}catch(_){}
    showCode();paint(false,'Family pairing disconnected on this phone.');
  });
  document.querySelectorAll('[data-live-who]').forEach(button=>button.addEventListener('click',()=>{
    const who=button.dataset.liveWho;if(!['Dad','Jozef'].includes(who))return;
    try{localStorage.setItem(WHO,who);}catch(_){}
    begin();
  }));
  $('voice-alerts')?.addEventListener('click',()=>{
    try{localStorage.setItem(VOICE,alertsOn()?'off':'on');}catch(_){}
    const button=$('voice-alerts');if(button)button.textContent=alertsOn()?'Voice alerts on':'Voice alerts off';
  });
  if($('voice-alerts'))$('voice-alerts').textContent=alertsOn()?'Voice alerts on':'Voice alerts off';
  window.addEventListener?.('pagehide',stop);
  begin();
})();
