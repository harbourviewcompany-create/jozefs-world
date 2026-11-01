(()=>{'use strict';
const canvas=document.getElementById('world');if(!canvas)return;
const overlay=document.createElement('div');overlay.className='world-mode-bar';
const mode=document.createElement('button');mode.textContent='Explore';mode.setAttribute('aria-pressed','false');
const help=document.createElement('span');help.textContent='Build mode: tap land to construct';
overlay.append(mode,help);canvas.parentElement.append(overlay);
let exploring=false,avatar={x:22,y:22},held=new Set(),frame=0,last=0;
const character=document.createElement('div');character.className='world-character';character.setAttribute('aria-label','Player character');canvas.parentElement.append(character);
const pad=document.createElement('div');pad.className='world-pad';
for(const [label,dx,dy] of [['↑',0,-1],['←',-1,0],['↓',0,1],['→',1,0]]){const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-label','Move '+label);button.onpointerdown=e=>{e.preventDefault();held.add(label);button.setPointerCapture(e.pointerId)};const release=()=>held.delete(label);button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;button.dataset.dx=dx;button.dataset.dy=dy;pad.append(button)}
canvas.parentElement.append(pad);
function refresh(){overlay.classList.toggle('active',exploring);character.hidden=!exploring;pad.hidden=!exploring;mode.textContent=exploring?'Return to Build':'Explore';mode.setAttribute('aria-pressed',String(exploring));help.textContent=exploring?'Move with arrows to explore your world':'Build mode: tap land to construct'}
mode.onclick=()=>{exploring=!exploring;held.clear();refresh()};
function tick(time){frame=requestAnimationFrame(tick);if(!exploring||document.hidden)return;if(time-last<110)return;last=time;let dx=0,dy=0;for(const b of pad.children){if(held.has(b.textContent)){dx+=Number(b.dataset.dx);dy+=Number(b.dataset.dy)}}if(dx||dy){avatar.x=Math.max(0,Math.min(47,avatar.x+Math.sign(dx)));avatar.y=Math.max(0,Math.min(47,avatar.y+Math.sign(dy)))}character.style.left=(50+(avatar.x-22)*1.7)+'%';character.style.top=(50+(avatar.y-22)*1.7)+'%'}
document.addEventListener('visibilitychange',()=>{held.clear()});refresh();frame=requestAnimationFrame(tick);
})();