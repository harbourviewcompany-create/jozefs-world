/* Jozef FC / Campaign graphics 2026. Visual-only, with existing local save APIs. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 function label(id,value){const n=$(id);if(n)n.textContent=String(value);}
 const number=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
 function update(){
   const c=window.JozefCareer?.getProgress?.()||{};
   const t=window.JozefTour?.getProgress?.()||{};
   const played=Math.min(6,number(c.played)),points=number(c.points),careerCups=number(c.cups);
   const round=Math.min(5,number(t.round)),tourCups=number(t.cups);
   for(let i=0;i<6;i++){
     const n=$('career-visual-round-'+i);
     if(n)n.className='career-season-round'+(i<played?' is-done':i===played?' is-current':'');
   }
   for(let i=0;i<5;i++){
     const n=$('tour-passport-'+i);
     if(n)n.className='tour-passport-stamp'+(i<round?' is-stamped':i===round?' is-current':'');
   }
   label('career-visual-status',played>=6?'SEASON COMPLETE': 'MATCH '+String(played+1).padStart(2,'0')+' / NEXT UP');
   label('career-visual-points',points+' LEAGUE POINTS');
   label('career-visual-cups',careerCups+' LEAGUE CUPS');
   label('tour-passport-status',round>=5?'PASSPORT COMPLETE':'DESTINATION '+String(round+1).padStart(2,'0'));
   label('tour-passport-progress',round+' / 5 STAMPS');
   label('tour-passport-cups',tourCups+' WORLD CUPS');
 }
 window.addEventListener('jozef:profile-updated',update);
 window.addEventListener('jozef:progress',update);
 window.addEventListener('pageshow',update);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 // A game state can update without dispatching a global event; entering a mode refreshes its visual.
 document.addEventListener('click',event=>{
   if(event.target?.closest?.('[data-section="career"],[data-section="tour"],[onclick*="showSection"]'))update();
 });
 update();
})();