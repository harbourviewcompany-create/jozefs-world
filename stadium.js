/* JOZEF FC // AFTER DARK: immersive navigation and player HUD, no account or tracking. */
(() => {
'use strict';
const ids=['home','street','arena','games','career','tour','club','playbook','matchday','training','learn','news','notes','album','sports','watch','sports-arcade','chronicle','fun'];
const el=id=>document.getElementById(id);
const txt=(id,x)=>{const n=el(id);if(n)n.textContent=String(x)};
const get=key=>{try{return localStorage.getItem(key)}catch(_){return null}};
let skipHistory=false;
function valid(id){return ids.includes(id)&&Boolean(el(id))}
function updateHud(){
 const career=window.JozefCareer?.getProgress?.()||{};
 const tour=window.JozefTour?.getProgress?.()||{};
 const street=window.JozefStreet?.getProgress?.()||{};
 txt('studio-career-points',String(career.points||0).padStart(2,'0'));
 txt('studio-career-stage','SEASON '+String(career.season||1).padStart(2,'0'));
 txt('studio-tour-stops',String(tour.round||0).padStart(2,'0')+' / 05');
 txt('studio-tour-stage',tour.cups>0?'CHAMPION · '+tour.cups+' CUPS':'STAMP YOUR PASSPORT');
 txt('studio-street-best',String(street.best??get('jozefs-world-street-best-v1')??0).padStart(3,'0'));
}
function updateFixture(){
 let m;
 try{m=JSON.parse(get('jozefs-world-matchday-v1')||'null')}catch(_){}
 if(!m?.date||!m?.time){txt('studio-fixture-head','NEXT KICKOFF?');txt('studio-fixture-copy','Plan your next match, build a formation, and check your kit.');return;}
 const d=new Date(m.date+'T'+m.time);
 if(!Number.isFinite(d.getTime())||d.getTime()<Date.now()){txt('studio-fixture-head','READY FOR THE NEXT?');txt('studio-fixture-copy','Set the next kickoff in Matchday Central.');return;}
 txt('studio-fixture-head',d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}).toUpperCase());
 txt('studio-fixture-copy','Jozef FC vs '+String(m.opponent||'Rivals').slice(0,35)+' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+'. Pack your gear!');
}
function navState(){
 const current=document.querySelector('.section.active')?.id||'home';
 document.querySelectorAll('.nav-btn').forEach(btn=>{
  if(btn.dataset.section===current)btn.setAttribute('aria-current','page');
  else btn.removeAttribute('aria-current');
 });
 document.title=current==='home'?'Jozef FC // After Dark':(current==='street'?'Street//11':current[0].toUpperCase()+current.slice(1))+' | Jozef FC';
 const explore=el('jw-explore');
 if(explore){
  const visible=['home','arena','sports-arcade','playbook','club'].includes(current);
  explore.classList.toggle('is-active',!visible);
  explore.setAttribute('aria-label',visible?'Explore all games and sections':'Explore all games and sections, currently '+current);
 }
}
function navigation(){
 const prev=window.showSection;
 if(typeof prev!=='function')return;
 window.showSection=function(id){
  if(!valid(id))return;
  const act=()=>prev(id);
  if(document.startViewTransition&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   try{document.startViewTransition(act);}catch(_){act();}
  }else act();
  if(!skipHistory&&location.hash!=='#'+id){
   try{history.pushState(null,'','#'+id)}catch(_){}
  }
  navState();updateHud();
 };
 const goBack=()=>{
  const id=location.hash.slice(1);
  if(!valid(id))return;
  skipHistory=true;window.showSection(id);skipHistory=false;
 };
 window.addEventListener('popstate',goBack);
 window.addEventListener('hashchange',goBack);
 if(valid(location.hash.slice(1)))goBack();
 navState();
}
function commandDeck(){
 if(el('studio-launcher'))return;
 const button=document.createElement('button');button.id='studio-launcher';button.type='button';button.className='studio-launcher';
 button.setAttribute('aria-label','Open Jozef FC quick navigation');
 button.innerHTML='<strong>J<span>/11</span></strong><small>QUICK JUMP</small>';
 const dialog=document.createElement('dialog');dialog.id='studio-command';dialog.className='studio-command';
 dialog.setAttribute('aria-label','Jozef FC control room');
 const header=document.createElement('div');header.className='studio-command-header';
 header.innerHTML='<div><span class="studio-kicker">THE CONTROL ROOM</span><h2>WHERE TO, <em>CAPTAIN?</em></h2></div><button type="button" class="studio-command-close" aria-label="Close quick navigation">✕</button>';
 const links=document.createElement('div');links.className='studio-command-options';
 // One complete menu, keeping the primary navigation compact on small screens.
 const options=[
  ['home','00','CLUB HQ','BACK TO YOUR WORLD'],
  ['arena','01','FOOTBALL ARENA','LIVE FOOTBALL MATCH'],
  ['street','02','STREET//11','THE NIGHT RUN'],
  ['sports-arcade','03','SPORTS ARCADE','HOCKEY · BASEBALL · BASKETBALL · WRESTLING'],
  ['playbook','04','COACH PLAYBOOK','MISSIONS ACROSS EVERY SPORT'],
  ['club','05','MY CLUB','SQUAD · KITS · TROPHIES'],
  ['career','06','FOOTBALL CAREER','BUILD YOUR SEASONS'],
  ['tour','07','WORLD TOUR','CHASE THE CUP'],
  ['chronicle','08','CLUB CHRONICLE','MATCH HIGHLIGHTS · PRINT POSTER'],
  ['games','09','FOOTBALL SKILLS','MINIGAMES · TARGETS'],
  ['training','10','TRAINING','PRACTICE YOUR SKILLS'],
  ['matchday','11','MATCHDAY','YOUR REAL-LIFE FIXTURE'],
  ['sports','12','LIVE SPORTS','NHL · MLB · NBA'],
  ['news','13','FOOTBALL SCORES','SCOREBOARD'],
  ['learn','14','LEARN','FOOTBALL INTELLIGENCE'],
  ['album','15','STICKER ALBUM','COLLECT YOUR REWARDS'],
  ['fun','16','LOCKER ROOM','MATCHDAY EXTRAS'],
  ['notes','17','CLUB NOTES','SHARED PRIVATE BOARD']
 ];
 const open=()=>dialog.showModal?dialog.showModal():dialog.setAttribute('open','');
 const close=()=>{if(dialog.close)dialog.close();else dialog.removeAttribute('open');button.focus()};
 for(const [id,num,name,desc] of options){
  const item=document.createElement('button');item.type='button';item.className='studio-command-option';
  const index=document.createElement('span');index.className='studio-command-num';index.textContent=num;
  const label=document.createElement('span');label.className='studio-command-name';label.textContent=name;
  const detail=document.createElement('small');detail.textContent=desc;label.appendChild(detail);
  const arrow=document.createElement('span');arrow.className='studio-command-arrow';arrow.textContent='↗';
  item.append(index,label,arrow);item.addEventListener('click',()=>{close();window.showSection(id)});links.appendChild(item);
 }
 dialog.append(header,links);document.body.append(button,dialog);
 button.addEventListener('click',open);
 header.querySelector('button').addEventListener('click',close);
 dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
 document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();dialog.open?close():open()}
 });
}
function boot(){
 document.body.classList.add('studio-v2');
 navigation();commandDeck();
 el('jw-explore')?.addEventListener('click',()=>el('studio-launcher')?.click());
 updateHud();updateFixture();
 window.addEventListener('jozef:profile-updated',updateHud);
 window.addEventListener('jozef:progress',updateHud);
 document.addEventListener('click',e=>{
  if(e.target.closest('#md-save'))queueMicrotask(updateFixture);
  if(e.target.closest('.nav-btn'))queueMicrotask(navState);
  if(e.target.closest('#street-start'))window.setTimeout(updateHud,70);
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateHud();updateFixture()}});
 window.setInterval(()=>{updateHud();updateFixture()},60000);
 // Installable offline app. Cache only same-origin public HTML/CSS/JS, never player data.
 if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
 }
 // No forced tunnel, confusing onboarding prompts, or automatic sound.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
