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
window.BlockWorldVisuals=Object.freeze({version:'2026.10.1',menuOpen:()=>!content.hidden,missionExpanded:()=>!!mission?.classList.contains('expanded')});
})();
