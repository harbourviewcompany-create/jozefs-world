/* 2026 art-direction layer. A tiny local-only live rival dossier on the homepage.
   No tracking, accounts or persisted state. Visual enhancements never block gameplay. */
(() => {
  'use strict';
  const find=id=>document.getElementById(id);
  const text=(id,value)=>{const node=find(id);if(node)node.textContent=String(value);};
  function update(){
    const info=window.JozefArena?.getProgress?.()||{};
    const wins=Math.max(0,Math.floor(Number(info.wins)||0));
    const stages=[
      {rival:'THE ROOFTOP ROVERS',venue:'NEIGHBOURHOOD COURT',
       line:'Your first chapter starts under the neighbourhood lights. Win two matches to light up Neon City.',
       target:2,start:0,next:'NEON CITY'},
      {rival:'MIDNIGHT CITY FC',venue:'NEON CITY',
       line:'The city knows your name. Beat the midnight defenders and earn five total wins to reach the Legend Arena.',
       target:5,start:2,next:'LEGEND ARENA'},
      {rival:'THE NEON ROYALS',venue:'LEGEND ARENA',
       line:'The final gates have opened. You have reached the home of the champions. Defend your legacy.',
       target:5,start:5,next:'LEGEND STATUS'}
    ];
    const index=wins>=5?2:wins>=2?1:0;
    const stage=stages[index];
    const current=index===2?1:Math.min(1,Math.max(0,(wins-stage.start)/(stage.target-stage.start)));
    text('visual-rival-name',stage.rival);
    text('visual-rival-venue',stage.venue);
    text('visual-rival-story',stage.line);
    text('visual-rival-chapter',String(index+1).padStart(2,'0'));
    text('visual-rival-unlock',index===2?'LEGEND ARENA UNLOCKED':wins+' / '+stage.target+' WINS · NEXT: '+stage.next);
    const bar=find('visual-rival-meter');
    if(bar){
      bar.style.width=Math.round(current*100)+'%';
      bar.parentElement?.setAttribute('aria-valuenow',String(Math.round(current*100)));
    }
  }
  find('visual-rival-play')?.addEventListener('click',()=>{
    if(typeof window.showSection==='function')window.showSection('arena');
  });
  window.addEventListener('jozef:profile-updated',update);
  window.addEventListener('jozef:progress',update);
  window.addEventListener('pageshow',update);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
  update();
})();