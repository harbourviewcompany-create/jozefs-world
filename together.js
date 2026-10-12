/* Together Mode / The Midnight Stadium Mystery — original, device-only co-op chapter. */
(function(root){
'use strict';
const KEY='jozefs-world-together-v1', W=12,H=8;
const WALLS=[[4,2],[4,3],[7,4],[7,5],[8,2]];
const STAGES=[
 {title:'01 / THE HIDDEN CLUES',detail:'Jozef finds the lime clue. Dad finds the blue clue. Each of you must reach your own marker.',targets:[[3,2],[9,5]]},
 {title:'02 / RESTORE THE LIGHTS',detail:'Stand on both illuminated consoles at the same time. Moving off a console turns it off.',targets:[[3,5],[9,2]]},
 {title:'03 / THE CHAMPION VAULT',detail:'Find both vault pads together to open the final arena.',targets:[[5,2],[6,5]]},
 {title:'04 / THE TAG-TEAM FINALE',detail:'Take turns choosing a free shot. Jozef and Dad must each score twice.',targets:[]},
 {title:'CHAPTER CLEARED',detail:'The Midnight Stadium Cup belongs to both Jozef and Dad.',targets:[]}
];
const HEROES=[{name:'JOZEF',shirt:'#caff6a',glow:'#92ffab',start:[1,1]},{name:'DAD',shirt:'#81dfff',glow:'#7bc7ff',start:[1,6]}];
const own=(x,y)=>x>=1&&x<W-1&&y>=1&&y<H-1&&!WALLS.some(([a,b])=>a===x&&b===y);
const clamp=(n,min,max)=>Number.isInteger(n)?Math.max(min,Math.min(max,n)):min;
const at=(p,t)=>p.x===t[0]&&p.y===t[1];
function fresh(){return {stage:0,clues:[false,false],won:false,positions:HEROES.map(h=>({x:h.start[0],y:h.start[1]}))};}
function sanitize(input){
 const s=fresh();
 if(!input||typeof input!=='object'||Array.isArray(input))return s;
 s.clues=Array.isArray(input.clues)?[input.clues[0]===true,input.clues[1]===true]:s.clues;
 s.won=input.won===true;
 s.stage=clamp(input.stage,0,4);
 if(s.stage>0&&!s.clues.every(Boolean))s.stage=0;
 if(s.stage===4&&!s.won)s.stage=2;
 if(s.stage===3)s.stage=2; // A refreshed boss fight always starts at a safe checkpoint.
 if(Array.isArray(input.positions)&&input.positions.length===2){
  const p=input.positions.map((v,i)=>({x:Number.isInteger(v?.x)?v.x:HEROES[i].start[0],y:Number.isInteger(v?.y)?v.y:HEROES[i].start[1]}));
  if(p.every(v=>own(v.x,v.y))&&!(p[0].x===p[1].x&&p[0].y===p[1].y))s.positions=p;
 }
 return s;
}
function pathTo(a,b,occupied){
 if(!own(b[0],b[1])||(occupied&&at(occupied,b)))return null;
 const start=a.y*W+a.x,goal=b[1]*W+b[0],queue=[start],seen=new Set([start]),previous=new Map();
 if(start===goal)return [];
 for(let i=0;i<queue.length;i++){
  const x=queue[i]%W,y=Math.floor(queue[i]/W);
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
   const nx=x+dx,ny=y+dy,id=ny*W+nx;
   if(!own(nx,ny)||occupied&&(occupied.x===nx&&occupied.y===ny)||seen.has(id))continue;
   seen.add(id);previous.set(id,queue[i]);
   if(id===goal){
    const path=[];let v=id;
    while(v!==start){path.unshift([v%W,Math.floor(v/W)]);v=previous.get(v);}
    return path;
   }
   queue.push(id);
  }
 }
 return null;
}
const shieldFor=round=>(round*2+1)%3;
function readPad(pad){
 if(!pad?.connected)return {dx:0,dy:0,act:false,switchHero:false};
 const pressed=n=>pad.buttons?.[n]?.pressed===true;
 const axis=n=>Number.isFinite(pad.axes?.[n])?pad.axes[n]:0;
 const x=pressed(14)?-1:pressed(15)?1:axis(0)<-.48?-1:axis(0)>.48?1:0;
 const y=pressed(12)?-1:pressed(13)?1:axis(1)<-.48?-1:axis(1)>.48?1:0;
 // The physical D-pad takes priority. Grid exploration never moves diagonally.
 const dpadHorizontal=pressed(14)||pressed(15),dpadVertical=pressed(12)||pressed(13);
 const horizontal=dpadHorizontal?x:dpadVertical?0:Math.abs(axis(0))>=Math.abs(axis(1))?x:0;
 return {dx:horizontal,dy:horizontal?0:y,act:pressed(0),switchHero:pressed(2)};
}
const rules=Object.freeze({KEY,W,H,WALLS,STAGES,HEROES,own,fresh,sanitize,pathTo,shieldFor,readPad});
if(typeof module!=='undefined'&&module.exports)module.exports=rules;
if(typeof document==='undefined')return;
const $=id=>document.getElementById(id);
const rootGame=$('jw-together-game'),canvas=$('jw-together-canvas');
if(!rootGame||!canvas)return;
const ctx=canvas.getContext('2d');
let state;
try{state=sanitize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(_){state=fresh()}
let opened=false,selected=0,battle=null,walking=null,walkToken=0,lastFrame=0;
let controllerLane=1,lastPadTick=0,lastPadButtons=[{act:false,switchHero:false},{act:false,switchHero:false}];
const motionReduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
function notify(s){const el=$('jw-together-status');if(el)el.textContent=s;}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(state));}
 catch(_){notify('Device storage unavailable. You can play, but this chapter may not save.');}
 root.dispatchEvent?.(new Event('jozef:together-updated'));
}
function stop(){walkToken++;if(walking!==null)clearTimeout(walking);walking=null;}
function progress(){return {stage:state.stage,clues:state.clues.slice(),won:state.won,positions:state.positions.map(p=>({...p})),selected,opened,shots:battle?battle.hits.slice():null};}
function start(){
 opened=true;lastPadTick=0;lastPadButtons=[{act:false,switchHero:false},{act:false,switchHero:false}];rootGame.hidden=false;root.showSection?.('adventure');
 selected=0;
 checkpoint();hud();
 notify(state.stage===4?'Your shared Stadium Cup is ready. Replay to start a new mission.':'Story ready. Both players have equal challenges and a turn in the finale.');
 draw(performance.now?.()||0);
 return true;
}
function close(){
 opened=false;lastPadButtons=[{act:false,switchHero:false},{act:false,switchHero:false}];rootGame.hidden=true;stop();battle=null;
 notify('Together Mode paused. Your progress is saved on this device.');
 return true;
}
function replay(){
 stop();const trophyPreviouslyWon=state.won;state=fresh();state.won=trophyPreviouslyWon;battle=null;selected=0;persist();
 start();notify('New mystery started! Both players can explore and discover clues.');
 return true;
}
function choose(i){if(i!==0&&i!==1)return false;stop();selected=i;hud();draw(performance.now?.()||0);return true;}
function checkpoint(){
 if(state.stage===0){
  let found=false;
  for(let i=0;i<2;i++)if(!state.clues[i]&&at(state.positions[i],STAGES[0].targets[i])){state.clues[i]=true;found=true;}
  if(state.clues.every(Boolean)){state.stage=1;stop();notify('BOTH CLUES DISCOVERED! Restore the stadium lights by standing on both consoles.');}
  else if(found)notify('Clue found! '+(state.clues[0]?'Jozef ✓ ':'Jozef needs his clue. ')+(state.clues[1]?'Dad ✓':'Dad needs his clue.'));
  if(found){persist();hud();}
  return found;
 }
 if(state.stage===1||state.stage===2){
  const targets=STAGES[state.stage].targets;
  if(targets.every((point,i)=>at(state.positions[i],point))){
   state.stage++;
   stop();persist();hud();
   if(state.stage===2)notify('THE LIGHTS ARE ON! Both heroes must enter the champion vault.');
   else {battle={turn:0,hits:[0,0],blocks:0,round:0};controllerLane=1;notify('FINALE UNLOCKED! Jozef shoots first. Each of you needs two scores.');}
   return true;
  }
 }
 return false;
}
function move(who,dx,dy){
 if(!opened||state.stage>=3||![0,1].includes(who)||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
 const p=state.positions[who],other=state.positions[1-who],x=p.x+dx,y=p.y+dy;
 if(!own(x,y)||other.x===x&&other.y===y)return false;
 p.x=x;p.y=y;
 persist();checkpoint();hud();draw(performance.now?.()||0);
 return true;
}
function guide(){
 if(!opened||state.stage>=3){notify('The finale uses the three shot choices below.');return false;}
 if(state.stage===0&&state.clues[selected])choose(1-selected);
 const target=STAGES[state.stage].targets[selected];
 const path=pathTo(state.positions[selected],target,state.positions[1-selected]);
 if(!path){notify('Your teammate is blocking this route. Move their character first.');return false;}
 if(!path.length){notify('Ready! Switch to the other hero and guide them to their marker.');checkpoint();return true;}
 stop();const token=walkToken,hero=selected,phase=state.stage;
 notify('Guiding '+HEROES[hero].name+' to their glowing objective.');
 let i=0;
 function advance(){
  if(token!==walkToken||!opened||state.stage!==phase||i>=path.length)return;
  const [x,y]=path[i++],p=state.positions[hero];
  if(!move(hero,x-p.x,y-p.y))return;
  if(i<path.length&&state.stage===phase)walking=setTimeout(advance,115);
 }
 advance();return true;
}
function shoot(lane){
 if(!opened||state.stage!==3||!battle||!Number.isInteger(lane)||lane<0||lane>2)return false;
 const actor=battle.turn,blocked=lane===shieldFor(battle.round);
 if(blocked)battle.blocks++;else battle.hits[actor]++;
 battle.round++;battle.turn=1-actor;
 if(battle.hits.every(n=>n>=2)){
  state.stage=4;state.won=true;battle=null;persist();hud();
  notify('STADIUM CUP WON! Jozef and Dad both scored and saved the Midnight Stadium!');
  root.dispatchEvent?.(new CustomEvent('jozef:together-completed',{detail:{chapter:'The Midnight Stadium Mystery'}}));
 }else if(battle.blocks>=3){
  battle=null;state.stage=2;state.positions=HEROES.map(h=>({x:h.start[0],y:h.start[1]}));selected=0;
  persist();hud();notify('Three blocks. The vault checkpoint is safe — return together and try again.');
 }else{
  hud();notify((blocked?'BLOCKED! ':'SCORED! ')+HEROES[battle.turn].name+' has the next shot.');
 }
 draw(performance.now?.()||0);return true;
}
function hud(){
 const st=STAGES[state.stage];
 const phase=$('jw-together-phase'),detail=$('jw-together-detail');
 if(phase)phase.textContent=st.title;
 if(detail)detail.textContent=st.detail;
 const score=$('jw-together-score');
 if(score)score.textContent=state.stage===3&&battle?'JOZEF '+battle.hits[0]+'/2 · DAD '+battle.hits[1]+'/2 · BLOCKS '+battle.blocks+'/3':state.stage===4?'JOZEF + DAD / CHAMPIONS':'CHAPTER 01 / '+(state.stage+1)+' OF 5';
 const trophy=$('jw-together-trophy');if(trophy)trophy.hidden=!state.won;
 const shots=$('jw-together-shots');if(shots)shots.hidden=state.stage!==3;
 const defender=$('jw-together-defender');if(defender)defender.textContent=state.stage===3&&battle?
   HEROES[battle.turn].name+' SHOOTS · RIVAL BLOCKS '+['LEFT','CENTRE','RIGHT'][shieldFor(battle.round)]:
   '';
 for(let i=0;i<2;i++){
  const btn=$('jw-together-hero-'+i);
  if(btn){btn.setAttribute('aria-pressed',String(selected===i));btn.textContent=(i===0?'JOZEF':'DAD')+(selected===i?' · CONTROLLING':' · SWITCH');}
 }
 for(const button of document.querySelectorAll('[data-together-shot]')){
  const n=Number(button.dataset.togetherShot),blocked=state.stage===3&&battle&&shieldFor(battle.round)===n;
  button.classList.toggle('is-blocked',!!blocked);
  button.classList.toggle('is-selected',state.stage===3&&n===controllerLane);
  button.setAttribute('aria-pressed',String(state.stage===3&&n===controllerLane));
  button.setAttribute('aria-label',['Left','Centre','Right'][n]+(blocked?' defended by rival':' open to score'));
 }
 const guideButton=$('jw-together-guide');
 if(guideButton)guideButton.disabled=state.stage>=3;
 const replayButton=$('jw-together-replay');if(replayButton)replayButton.hidden=!state.won;
}
function draw(t){
 if(!ctx||!opened)return;
 const tw=canvas.width/W,th=canvas.height/H;
 const bg=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
 bg.addColorStop(0,'#102d47');bg.addColorStop(1,'#050e1b');ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const px=x*tw,py=y*th,wall=!own(x,y);
  ctx.fillStyle=wall?'#0a1225':(x+y)%2?'#102e43':'#14364b';ctx.fillRect(px+1,py+1,tw-2,th-2);
  if(wall){
   ctx.fillStyle='#29475c';ctx.fillRect(px+5,py+5,tw-10,th-13);
   ctx.fillStyle='#55778c';ctx.fillRect(px+5,py+5,tw-10,3);
  }else{
   ctx.strokeStyle='rgba(155,235,226,.055)';ctx.strokeRect(px+3,py+3,tw-6,th-6);
  }
 }
 // Stadium lighting and stadium logo are purely decorative; hit targets stay high-contrast.
 ctx.strokeStyle='#80dfff26';ctx.lineWidth=2;
 for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(i*144,0);ctx.lineTo(i*144,canvas.height);ctx.stroke();}
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#caff6a16';ctx.font='900 102px system-ui';ctx.fillText('J / D',canvas.width/2,canvas.height/2);
 if(state.stage<3){
  STAGES[state.stage].targets.forEach(([x,y],i)=>{
   const done=state.stage===0&&state.clues[i],p=state.positions[i];
   const cx=(x+.5)*tw,cy=(y+.5)*th,lit=at(p,[x,y]);
   const scale=motionReduced?0:Math.sin(t/430+i)*3;
   ctx.fillStyle=i===0?'#caff6a':'#80daff';
   ctx.globalAlpha=done?0.22:0.17;ctx.beginPath();ctx.arc(cx,cy,26+scale,0,Math.PI*2);ctx.fill();
   ctx.globalAlpha=1;ctx.strokeStyle=i===0?'#caff6a':'#80daff';ctx.lineWidth=lit?5:3;ctx.beginPath();ctx.arc(cx,cy,21+scale,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle=done?'#ffffff':i===0?'#e2ffad':'#c7edff';ctx.font='900 12px system-ui';ctx.fillText(done?'✓':HEROES[i].name,cx,cy-31);
   ctx.font='900 24px system-ui';ctx.fillText(done?'✓':'✦',cx,cy+1);
  });
 }
 for(let i=0;i<2;i++){
  const p=state.positions[i],hero=HEROES[i],cx=(p.x+.5)*tw,cy=(p.y+.5)*th;
  ctx.fillStyle='#02091799';ctx.beginPath();ctx.ellipse(cx,cy+19,19,8,0,0,7);ctx.fill();
  ctx.strokeStyle=i===selected?'#fff':hero.glow;ctx.lineWidth=i===selected?3:1.5;
  ctx.beginPath();ctx.arc(cx,cy,26,0,7);ctx.stroke();
  ctx.fillStyle=hero.shirt;ctx.beginPath();ctx.roundRect(cx-17,cy-15,34,32,9);ctx.fill();
  ctx.fillStyle='#e6bd9a';ctx.beginPath();ctx.arc(cx,cy-18,11,0,7);ctx.fill();
  ctx.fillStyle='#092536';ctx.font='900 14px system-ui';ctx.fillText(i===0?'11':'02',cx,cy+1);
  ctx.fillStyle='#f7fbff';ctx.font='800 11px system-ui';ctx.fillText(hero.name,cx,cy-36);
 }
 if(state.stage>=3){
  const label=state.stage===4?'CHAMPIONS TOGETHER':'CHAMPION SHOWDOWN';
  ctx.fillStyle='#030a16b8';ctx.fillRect(55,168,canvas.width-110,135);
  ctx.strokeStyle=state.stage===4?'#ffe0a0':'#95daff';ctx.lineWidth=2;ctx.strokeRect(55,168,canvas.width-110,135);
  ctx.fillStyle='#f7ffe9';ctx.font='900 33px system-ui';ctx.fillText(label,canvas.width/2,213);
  ctx.fillStyle='#caff92';ctx.font='750 17px system-ui';ctx.fillText(state.stage===4?'THE MIDNIGHT STADIUM CUP IS YOURS':'JOZEF + DAD / TWO SCORES EACH',canvas.width/2,251);
 }
}
function pollGamepads(t){
 if(!opened||document.hidden||!$('adventure')?.classList.contains('active')||t-lastPadTick<155)return;
 lastPadTick=t;
 let pads=[];
 try{pads=Array.from(navigator.getGamepads?.()||[]).filter(p=>p?.connected).slice(0,2);}catch(_){}
 if(!pads.length){lastPadButtons=[{act:false,switchHero:false},{act:false,switchHero:false}];return;}
 const two=pads.length>1;
 for(let i=0;i<pads.length;i++){
  const input=readPad(pads[i]),prior=lastPadButtons[i]||{act:false,switchHero:false};
  const hero=two?i:selected;
  if(input.switchHero&&!prior.switchHero&&!two&&state.stage<3)choose(1-selected);
  if(state.stage===3){
   if(!battle)continue;
   if(input.dx&&(!two||i===battle.turn)){
    controllerLane=(controllerLane+input.dx+3)%3;
    hud();
   }
   if(input.act&&!prior.act&&(!two||i===battle.turn))shoot(controllerLane);
  }else if(input.dx||input.dy){
   stop();move(hero,input.dx,input.dy);
  }
  lastPadButtons[i]={act:input.act,switchHero:input.switchHero};
 }
}
function tick(t){if(opened&&!document.hidden){pollGamepads(t);if(t-lastFrame>=34){draw(t);lastFrame=t;}}root.requestAnimationFrame?.(tick);}
function init(){
 document.querySelectorAll('[data-start-together]').forEach(el=>el.addEventListener('click',start));
 $('jw-together-start')?.addEventListener('click',start);
 $('jw-together-close')?.addEventListener('click',close);
 $('jw-together-replay')?.addEventListener('click',replay);
 $('jw-together-guide')?.addEventListener('click',guide);
 for(let i=0;i<2;i++)$('jw-together-hero-'+i)?.addEventListener('click',()=>choose(i));
 document.querySelectorAll('[data-together-step]').forEach(button=>button.addEventListener('click',()=>{
  const [dx,dy]=button.dataset.togetherStep.split(',').map(Number);stop();move(selected,dx,dy);
 }));
 document.querySelectorAll('[data-together-shot]').forEach(button=>button.addEventListener('click',()=>{controllerLane=Number(button.dataset.togetherShot);shoot(controllerLane);}));
 canvas.addEventListener('click',e=>{
  if(!opened||state.stage>=3)return;
  const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*W),y=Math.floor((e.clientY-r.top)/r.height*H);
  const path=pathTo(state.positions[selected],[x,y],state.positions[1-selected]);
  if(!path){notify('That path is blocked. Choose an open square.');return;}
  stop();const token=walkToken,who=selected,phase=state.stage;let i=0;
  function walk(){
   if(token!==walkToken||phase!==state.stage||i>=path.length)return;
   const [nx,ny]=path[i++],p=state.positions[who];
   if(!move(who,nx-p.x,ny-p.y))return;
   if(i<path.length&&phase===state.stage)walking=setTimeout(walk,115);
  }
  walk();
 });
 document.addEventListener('keydown',e=>{
  if(!opened||!$('adventure')?.classList.contains('active')||e.repeat||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.target.closest('button,input,select,textarea,dialog'))return;
  if(state.stage===3&&['1','2','3'].includes(e.key)){e.preventDefault();controllerLane=Number(e.key)-1;shoot(controllerLane);return;}
  if(state.stage===3&&[' ','Enter'].includes(e.key)){e.preventDefault();shoot(controllerLane);return;}
  if(state.stage===3&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();controllerLane=(controllerLane+(e.key==='ArrowLeft'?2:1))%3;hud();return;}
  const direction={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],ArrowUp:[0,-1],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowRight:[1,0]}[e.key];
  if(!direction)return;
  e.preventDefault();stop();move(e.key.startsWith('Arrow')?1:0,...direction);
 });
 hud();root.requestAnimationFrame?.(tick);
}
root.JozefTogether=Object.freeze({start,close,replay,choose,move,guide,shoot,progress});
init();
})(typeof window!=='undefined'?window:globalThis);
