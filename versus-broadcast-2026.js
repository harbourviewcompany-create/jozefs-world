/* Lightweight, non-authoritative match presentation, reads existing score UI. */
(()=>{
 'use strict';
 const section=document.getElementById('versus'),stage=section?.querySelector('.versus-stage');
 if(!stage||document.getElementById('versus-broadcast'))return;
 const ribbon=document.createElement('div');ribbon.id='versus-broadcast';ribbon.setAttribute('aria-hidden','true');
 const signal=document.createElement('span');signal.className='vs-broadcast-signal';
 const label=document.createElement('strong');label.className='vs-broadcast-call';
 const role=document.createElement('span');role.className='vs-broadcast-role';
 ribbon.append(signal,label,role);stage.append(ribbon);
 const crowd=document.createElement('div');crowd.className='vs-crowd-glow';crowd.setAttribute('aria-hidden','true');stage.append(crowd);
 let previous='',lastCall='';
 function refresh(){
  const playing=section.classList.contains('active')&&section.classList.contains('is-playing');
  ribbon.hidden=!playing;crowd.hidden=!playing;
  if(!playing){previous='';lastCall='';return;}
  const dad=document.getElementById('versus-score-dad')?.textContent||'0';
  const jo=document.getElementById('versus-score-jozef')?.textContent||'0';
  const score=dad+':'+jo;
  const status=document.getElementById('versus-status')?.textContent||'';
  const clock=document.getElementById('versus-clock')?.textContent||'';
  signal.textContent=/reconnect|disconnected|paused/i.test(status)?'PAUSED':clock==='0:00'?'FULL TIME':'LIVE';
  role.textContent=(document.getElementById('versus-who')?.value||'DAD').toUpperCase()+' / '+clock;
  if(previous&&score!==previous){ribbon.classList.remove('scored');void ribbon.offsetWidth;ribbon.classList.add('scored');}
  previous=score;
  const scene=/reconnect|disconnected/i.test(status)?'RECONNECTING / MATCH SAFE':
   signal.textContent==='FULL TIME'?'MATCH COMPLETE':'JOZEF WORLD // MATCHDAY';
  if(scene!==lastCall){label.textContent=scene;lastCall=scene;}
 }
 new MutationObserver(refresh).observe(section,{attributes:true,attributeFilter:['class']});
 ['versus-score-dad','versus-score-jozef','versus-status'].forEach(id=>{
  const el=document.getElementById(id);if(el)new MutationObserver(refresh).observe(el,{childList:true,characterData:true,subtree:true});
 });
 const timer=setInterval(()=>{if(!document.hidden&&section.classList.contains('active'))refresh();},500);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 refresh();
})();