/* Arena experience layer: input customization, achievements, rewards and results.
   Gameplay remains local and completely offline. */
(function(){
'use strict';
const S=window.JozefArenaSystems;
const $=id=>document.getElementById(id);
if(!S)return;
const SETTINGS_KEY='jozef-arena-settings-v1',DAY_KEY='jozef-arena-daily-v1';
function saved(key,fallback){
 try{const val=JSON.parse(localStorage.getItem(key)||'null');return val&&typeof val==='object'?val:fallback;}
 catch(_){return fallback;}
}
function mount(api){
 const defaultControls=window.matchMedia?.('(pointer:coarse)')?.matches?'joystick':'arrows';
 const prev=saved(SETTINGS_KEY,{});
 const prefs={
  difficulty:S.DIFFICULTIES[prev.difficulty]?prev.difficulty:'pro',
  controls:['joystick','arrows'].includes(prev.controls)?prev.controls:defaultControls,
  camera:prev.camera!==false,haptics:prev.haptics!==false,
  kit:['club','night','gold'].includes(prev.kit)?prev.kit:'club',
  handedness:prev.handedness==='flipped'?'flipped':'standard',
  mobileLayout:['immersive','classic'].includes(prev.mobileLayout)?prev.mobileLayout:(defaultControls==='joystick'?'immersive':'classic'),
  graphics:['auto','quality','battery'].includes(prev.graphics)?prev.graphics:'auto'
 };
 let daily=S.normalizeDaily(saved(DAY_KEY,null));
 let passes=0,earned=0,stickPointer=null,dialogOpen=false;
 const lifetime=api.lifetime;
 const save=()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(prefs));}catch(_){}};
 const saveDaily=()=>{try{localStorage.setItem(DAY_KEY,JSON.stringify(daily));}catch(_){}};
 function haptic(v=15){
  if(prefs.haptics&&!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
   try{navigator.vibrate?.(v);}catch(_){}
 }
 function ui(){
  if(daily.day!==S.dailyKey()) {daily=S.freshDaily();saveDaily();}
  const p=S.progression(lifetime,daily);
  const dailyChip=$('arena-daily-progress');
  if(dailyChip){dailyChip.textContent='DAILY '+daily.rewarded.length+'/4';dailyChip.title=S.CHALLENGES.map(c=>c.label+' '+Math.min(c.target,daily[c.id])+'/'+c.target).join(' · ');}
  const dir=document.querySelector('#arena .arena-direction');
  dir?.classList.toggle('is-joystick',prefs.controls==='joystick');
  document.querySelector('#arena .arena-controller')?.classList.toggle('swap-controls',prefs.handedness==='flipped');
  const arena=$('arena'),actions=document.querySelector('#arena .arena-actions');
  const skill=$('arena-skill'),originalStrip=document.querySelector('#arena .arena-skill-strip');
  const immersive=prefs.mobileLayout==='immersive';
  arena?.classList.toggle('mobile-immersive',immersive);
  if(skill&&actions&&originalStrip){
    if(immersive&&skill.parentElement!==actions&&typeof actions.appendChild==='function')actions.appendChild(skill);
    if(!immersive&&skill.parentElement!==originalStrip&&typeof originalStrip.insertBefore==='function')originalStrip.insertBefore(skill,originalStrip.firstChild);
  }
  const layout=$('arena-mobile-layout'),graphics=$('arena-graphics-mode');
  if(layout)layout.value=prefs.mobileLayout;
  if(graphics)graphics.value=prefs.graphics;
  arena?.setAttribute('data-graphics-mode',prefs.graphics);
  const v=$('arena-difficulty'),c=$('arena-control-mode'),cam=$('arena-camera-toggle'),hap=$('arena-haptics-toggle'),kit=$('arena-kit-select');
  if($('arena-handedness'))$('arena-handedness').value=prefs.handedness;
  if(v)v.value=prefs.difficulty;if(c)c.value=prefs.controls;
  if(cam)cam.checked=prefs.camera;if(hap)hap.checked=prefs.haptics;
  if(kit){
   kit.querySelector('[value="night"]').disabled=(lifetime.wins||0)<2;
   kit.querySelector('[value="gold"]').disabled=(lifetime.wins||0)<5;
   if((prefs.kit==='night'&&lifetime.wins<2)||(prefs.kit==='gold'&&lifetime.wins<5)){prefs.kit='club';save();}
   kit.value=prefs.kit;
  }
  const levelName=$('arena-upgrade-type')?.value||'speed';
  const key='upgrade'+levelName[0].toUpperCase()+levelName.slice(1);
  const level=lifetime[key]||0,button=$('arena-buy-upgrade');
  if(button){button.disabled=(lifetime.coins||0)<3||level>=3;button.textContent=level>=3?'MAX LEVEL':'UPGRADE · 3 STARS · LV '+level+'/3';}
  const earn=$('arena-earnings');
  if(earn)earn.textContent=(lifetime.coins||0)+' stars · Level '+p.level+' · '+p.earned+' badges';
  const challenges=$('arena-challenge-list');
  if(challenges)challenges.innerHTML=S.CHALLENGES.map(c=>{
   const count=Math.min(c.target,daily[c.id]),done=count>=c.target;
   return '<div class="arena-challenge'+(done?' complete':'')+'"><span>'+c.label+'</span><b>'+count+'/'+c.target+'</b></div>';
  }).join('');
 }
 function record(kind){
  const r=S.awardDaily(daily,kind);daily=r.state;
  if(r.newlyCompleted.length){
   lifetime.coins=Math.min(99999,(lifetime.coins||0)+r.newlyCompleted.length);
   earned+=r.newlyCompleted.length;
   api.saveLifetime();
   haptic([25,35,25]);
  }
  if(kind==='passes')passes++;
  saveDaily();ui();
  return r;
 }
 function openSettings(open){
  const panel=$('arena-settings'),button=$('arena-settings-toggle');
  if(!panel)return;
  if(open&&api.getMode()==='playing')api.pause();
  dialogOpen=open;panel.hidden=!open;
  button?.setAttribute('aria-expanded',String(open));
  if(open){ui();$('arena-settings-close')?.focus();}
  else if(!open)button?.focus();
 }
 function reset(){
  passes=0;earned=0;
  const panel=$('arena-match-report');
  if(panel)panel.hidden=true;
  const banner=$('arena-replay-banner');if(banner)banner.hidden=true;
  if(dialogOpen)openSettings(false);
  ui();
 }
 function finish(info){
  if(info.won){
   record('wins');
   const amount=S.DIFFICULTIES[prefs.difficulty].reward;
   lifetime.coins=Math.min(99999,(lifetime.coins||0)+amount);
   earned+=amount;api.saveLifetime();
  }
  const prog=S.progression(lifetime,daily);
  const panel=$('arena-match-report');if(!panel)return;
  const title=info.won?'VICTORY!':info.them===info.us?'HARD-FOUGHT DRAW':'FULL TIME';
  $('arena-report-title').textContent=title;
  $('arena-report-score').textContent=info.us+' : '+info.them;
  $('arena-report-summary').textContent=S.DIFFICULTIES[prefs.difficulty].label+' MATCH · LEVEL '+prog.level;
  const stats=$('arena-report-stats');
  if(stats)stats.innerHTML='<span>SHOTS<b>'+info.shots+'</b></span><span>PASSES<b>'+passes+'</b></span><span>SAVES<b>'+info.saves+'</b></span>';
  const badges=prog.badges.filter(b=>b.earned).map(b=>b.label);
  $('arena-report-unlocks').textContent='+'+earned+' stars earned · '+lifetime.coins+' total · '+(badges.join(' · ')||'New badges ahead');
  panel.hidden=false;ui();$('arena-rematch')?.focus();
 }
 function kitColor(){
  if(prefs.kit==='gold'&&lifetime.wins>=5)return '#ffd37b';
  if(prefs.kit==='night'&&lifetime.wins>=2)return '#8bf0e6';
  return null;
 }
 function purchase(){
  const name=$('arena-upgrade-type')?.value||'speed';
  const key='upgrade'+name[0].toUpperCase()+name.slice(1);
  if(!['upgradeSpeed','upgradeShot','upgradePass'].includes(key))return;
  if((lifetime.coins||0)<3||(lifetime[key]||0)>=3)return;
  lifetime.coins-=3;lifetime[key]=(lifetime[key]||0)+1;api.saveLifetime();
  api.refreshSquad();
  haptic([18,35,18]);ui();
 }
 $('arena-settings-toggle')?.addEventListener('click',()=>openSettings(!dialogOpen));
 $('arena-daily-progress')?.addEventListener('click',()=>openSettings(true));
 $('arena-settings-close')?.addEventListener('click',()=>openSettings(false));
 $('arena-report-close')?.addEventListener('click',()=>{$('arena-match-report').hidden=true;});
 $('arena-rematch')?.addEventListener('click',()=>api.start());
 $('arena-upgrade-type')?.addEventListener('change',ui);
 $('arena-buy-upgrade')?.addEventListener('click',purchase);
 const options={difficulty:'arena-difficulty',controls:'arena-control-mode',kit:'arena-kit-select',handedness:'arena-handedness',mobileLayout:'arena-mobile-layout',graphics:'arena-graphics-mode'};
 for(const [key,id] of Object.entries(options)){
  $(id)?.addEventListener('change',e=>{prefs[key]=e.target.value;save();ui();api.refreshGraphics?.();});
 }
 for(const [key,id] of [['camera','arena-camera-toggle'],['haptics','arena-haptics-toggle']]){
  $(id)?.addEventListener('change',e=>{prefs[key]=e.target.checked;save();ui();});
 }
 const joystick=$('arena-joystick'),knob=$('arena-joystick-knob');
 function setStick(x,y){
  const dx=joystick?.getBoundingClientRect().width||85;
  const radius=Math.max(20,dx*.35);
  const v=S.joystickVector(x,y,radius);
  knob?.style.setProperty('--stick-x',v.px+'px');knob?.style.setProperty('--stick-y',v.py+'px');
  api.setJoystick(v.x,v.y);
 }
 function relative(ev){
  const box=joystick.getBoundingClientRect();
  setStick(ev.clientX-box.left-box.width/2,ev.clientY-box.top-box.height/2);
 }
 function clear(ev){
  if(stickPointer!==null&&ev&&ev.pointerId!==stickPointer)return;
  stickPointer=null;api.setJoystick(0,0);
  joystick?.classList.remove('engaged');
  knob?.style.setProperty('--stick-x','0px');knob?.style.setProperty('--stick-y','0px');
 }
 joystick?.addEventListener('pointerdown',ev=>{
  if(api.getMode()!=='playing'||stickPointer!==null)return;
  ev.preventDefault();stickPointer=ev.pointerId;
  joystick.classList.add('engaged');relative(ev);
  try{joystick.setPointerCapture(ev.pointerId);}catch(_){}
 });
 joystick?.addEventListener('pointermove',ev=>{if(ev.pointerId===stickPointer){ev.preventDefault();relative(ev);}});
 joystick?.addEventListener('pointerup',clear);
 joystick?.addEventListener('pointercancel',clear);
 joystick?.addEventListener('lostpointercapture',clear);
 window.addEventListener('blur',()=>clear());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&dialogOpen){ev.preventDefault();openSettings(false);}});
 ui();
 return Object.freeze({prefs,record,reset,finish,kitColor,haptic,ui,clearJoystick:clear,passCount:()=>passes});
}
window.JozefArenaExperience=Object.freeze({mount});
})();
