/* Shared-progress quick dock. No new XP or achievement store is created. */
(()=>{
 'use strict';
 if(!document.querySelector('.navbar')||document.getElementById('jw-family-dock'))return;
 const choices=[['home','HQ'],['versus','VERSUS'],['sports-arcade','SPORTS'],['club','MY CLUB'],['playbook','MISSIONS']];
 const dock=document.createElement('nav');dock.id='jw-family-dock';dock.setAttribute('aria-label','Quick play navigation');
 const buttons=choices.map(([section,label])=>{
  const b=document.createElement('button');b.type='button';b.dataset.section=section;
  b.textContent=label;b.setAttribute('aria-label','Open '+label);
  b.addEventListener('click',()=>{
   if(typeof window.showSection==='function')window.showSection(section);
   else document.querySelector('.navbar .nav-btn[data-section="'+section+'"]')?.click();
   document.body.classList.remove('nav-open');refresh();
  });dock.append(b);return b;
 });
 const xp=document.createElement('span');xp.className='jw-dock-level';xp.setAttribute('aria-label','Current shared level');
 dock.append(xp);document.body.append(dock);
 function progress(){
  try{return JSON.parse(localStorage.getItem('jozefs-world-player-v1')||'{}')||{};}
  catch(_){return {};}
 }
 function refresh(){
  const active=document.querySelector('.section.active')?.id||'home';
  buttons.forEach(b=>{const selected=b.dataset.section===active;b.classList.toggle('is-current',selected);
   if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  const points=Math.max(0,Number(progress().xp)||0);
  xp.textContent='LVL '+(Math.floor(points/100)+1);
  dock.hidden=document.querySelector('#versus.is-playing.active')!==null||
   document.querySelector('#arena.active .arena-game.is-playing')!==null;
 }
 const observer=new MutationObserver(refresh);
 document.querySelectorAll('.section').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
 window.addEventListener('jozef:progress',refresh);
 window.addEventListener('jozef:versus-progress-updated',refresh);
 window.addEventListener('jozef:versus-completed',refresh);
 window.addEventListener('storage',refresh);
 window.addEventListener('pageshow',refresh);
 refresh();
 window.JozefQuickDock=Object.freeze({refresh,sections:choices.map(x=>x[0])});
})();