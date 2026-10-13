/* Block World premium mobile interaction layer.
   Enhances real game controls; intentionally leaves physics and session ownership in BlockWorld2D. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const menu=$('menu-toggle'),content=$('toolbar-extra'),pad=$('movement-pad'),knob=$('pad-knob');
if(!menu||!content||!pad||!knob)return;
// Consolidate the formerly floating WORLD MENU into the main HUD menu.
// Keep the original action buttons and their handlers, rather than cloning them.
const worldActions=$('bw-actions');
if(worldActions){content.appendChild(worldActions);worldActions.classList.remove('closed');}
const worldToggle=$('bw-menu-toggle');if(worldToggle)worldToggle.hidden=true;
// Graphics preset is entirely client-side and doesn't touch player/world saves.
const QUALKEY='jozefs-block-visual-quality-v1';
let qualityPref='auto',qualityFrames=0,qualityStart=0,qualityResolved=false;
try{const stored=localStorage.getItem(QUALKEY);if(['auto','cinematic','balanced'].includes(stored))qualityPref=stored;}catch(_){}
const reduceMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const qualityButton=document.createElement('button');
qualityButton.type='button';qualityButton.id='bw-quality';qualityButton.className='bw-quality';
function effectiveQuality(){return qualityPref==='auto'?(reduceMotion||qualityResolved?'balanced':'cinematic'):qualityPref;}
function applyQuality(){
 const level=effectiveQuality();
 window.BlockWorldArt?.setQuality?.(level);
 qualityButton.textContent='GRAPHICS · '+qualityPref.toUpperCase()+(qualityPref==='auto'?' ('+level+')':'');
 document.body.classList?.toggle?.('bw-balanced',level==='balanced');
}
qualityButton.addEventListener('click',()=>{
 qualityPref=qualityPref==='auto'?'cinematic':qualityPref==='cinematic'?'balanced':'auto';
 qualityFrames=0;qualityStart=0;qualityResolved=false;
 try{localStorage.setItem(QUALKEY,qualityPref);}catch(_){}
 applyQuality();
});
content.appendChild(qualityButton);
applyQuality();
function sampleFrame(now){
 if(qualityPref!=='auto'||qualityResolved||reduceMotion)return;
 if(!qualityStart){qualityStart=now;return;}
 qualityFrames++;
 if(now-qualityStart<4800)return;
 const fps=qualityFrames*1000/(now-qualityStart);
 // Avoid switching profiles for a brief startup stutter.
 if(fps<37){qualityResolved=true;applyQuality();}
 else{qualityStart=now;qualityFrames=0;}
}

const mission=$('bw-mission');
if(mission){
 mission.classList.add('compact');mission.setAttribute('role','button');
 mission.setAttribute('tabindex','0');mission.setAttribute('aria-label','Show mission details');
 mission.setAttribute('aria-expanded','false');
 const toggleMission=()=>{
  const open=mission.classList.toggle('expanded');
  mission.setAttribute('aria-expanded',String(open));
  mission.setAttribute('aria-label',open?'Hide mission details':'Show mission details');
 };
 mission.addEventListener('click',toggleMission);
 mission.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleMission();}});
}
function openMenu(open){content.hidden=!open;menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕ CLOSE':'☰ MENU';}
menu.addEventListener('click',()=>openMenu(content.hidden));
document.addEventListener('keydown',e=>{if(e.code==='Escape')openMenu(false);});
const exitLinks=content.querySelectorAll?.('a')||[];
for(const a of exitLinks)a.addEventListener('click',()=>openMenu(false));
for(const b of content.querySelectorAll?.('button')||[])if(b!==menu)b.addEventListener('click',()=>{if(b!==worldToggle)openMenu(false);});
let pointer=null;
function move(e){
 const rect=pad.getBoundingClientRect(),middle=rect.left+rect.width/2;
 const dx=(e.clientX-middle)/(rect.width*.35);
 const value=Math.max(-1,Math.min(1,dx));
 window.BlockWorld2D?.setStick?.(value);
 knob.style.transform='translateX('+(value*rect.width*.24)+'px)';
}
pad.addEventListener('pointerdown',e=>{
 if(pointer!==null)return;
 pointer=e.pointerId;
 pad.setPointerCapture?.(pointer);
 move(e);
});
pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move(e);});
function release(e){
 if(e&&pointer!==null&&e.pointerId!==pointer)return;
 pointer=null;window.BlockWorld2D?.setStick?.(0);knob.style.transform='';
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,release);
window.addEventListener('blur',()=>release());
document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
// Support touchscreen users whose first contact lands on the translucent directional
// control, and desktop keyboard users who expect left/right arrows.
pad.addEventListener('dblclick',e=>e.preventDefault());
window.BlockWorldVisuals=Object.freeze({version:'2026.10.2',menuOpen:()=>!content.hidden,missionExpanded:()=>!!mission?.classList.contains('expanded'),graphics:()=>effectiveQuality(),onFrame:sampleFrame});
})();
