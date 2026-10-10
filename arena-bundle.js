/* Jozef FC Arena runtime bundle. Generated from the four source modules; do not edit directly. */
/* BEGIN arena-systems.js */
/* Jozef FC Arena systems: deterministic helpers, independently testable in Node. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JozefArenaSystems = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const DIFFICULTIES = Object.freeze({
    rookie: Object.freeze({speed:.70, keeper:.68, pressure:.68, reward:1, label:'ROOKIE'}),
    pro: Object.freeze({speed:1, keeper:1, pressure:1, reward:2, label:'PRO'}),
    legend: Object.freeze({speed:1.24, keeper:1.2, pressure:1.17, reward:3, label:'LEGEND'})
  });
  function joystickVector(dx,dy,radius=42) {
    const r=Math.max(1,radius), magnitude=Math.hypot(dx,dy);
    if(magnitude<r*.13) return {x:0,y:0,px:0,py:0};
    const magnitudeClamped=Math.min(r,magnitude);
    const x=dx/magnitude*magnitudeClamped/r;
    const y=dy/magnitude*magnitudeClamped/r;
    return {x,y,px:x*r,py:y*r};
  }
  // Press, cover the pass, then protect the centre lane: opponents have distinct jobs.
  function defenderDestination(index, defender, actor, mate, ball, goalX=210) {
    const leader=ball.owner==='mate'?mate:actor;
    if(index===0) return {x:clamp(leader.x+(leader.x-defender.x)*.08,24,396),y:clamp(leader.y-8,78,534),role:'PRESS'};
    if(index===1) {
      const t=.46;
      return {x:clamp(actor.x*(1-t)+mate.x*t,36,384),y:clamp(actor.y*(1-t)+mate.y*t-16,105,515),role:'INTERCEPT'};
    }
    return {x:clamp(leader.x*.36+goalX*.64,43,377),y:clamp(Math.min(leader.y-85,174),85,245),role:'COVER'};
  }
  function teammateDestination(actor, mate, tactic, defenders) {
    const baseX=actor.x<210?actor.x+75:actor.x-75;
    let x=baseX;
    if(Array.isArray(defenders)) {
      for(const d of defenders) if(Math.hypot(d.x-x,d.y-(actor.y-122))<66) x+=x<210?55:-55;
    }
    return {x:clamp(x,44,376),y:clamp(actor.y-(tactic==='attack'?150:tactic==='defence'?105:127),122,494)};
  }
  // A visible defensive phase: the rival advances toward Jozef's goal.
  // The bot cannot teleport or score immediately after a tackle.
  function rivalRunTarget(carrier, actor, elapsed=0, difficulty='pro') {
    const pressure=DIFFICULTIES[difficulty]||DIFFICULTIES.pro;
    const drift=Math.sin(clamp(elapsed,0,8)*1.15)*30;
    return {
      x:clamp(carrier.x*.76+210*.24+drift,35,385),
      y:clamp(carrier.y+120*pressure.speed,70,545)
    };
  }
  // The supporting player helps press in defence, then makes a wide run
  // into space when Jozef wins possession. No random position jumps.
  function counterSupportTarget(actor, mate, defenders, advantage=0) {
    const ahead=advantage>0?146:112;
    const marker=Array.isArray(defenders)?defenders.find(d=>distance(d,mate)<80):null;
    const wing=actor.x<210?1:-1;
    const flank=marker?wing*42:wing*8;
    return {
      x:clamp(actor.x+wing*82+flank,40,380),
      y:clamp(actor.y-ahead,105,505)
    };
  }
  function rivalThreatChance(y, difficulty='pro', cover=0, teammateDistance=100) {
    const d=DIFFICULTIES[difficulty]||DIFFICULTIES.pro;
    const advance=clamp((y-315)/210,0,1);
    const pressureBonus=teammateDistance<42?.12:0;
    return clamp((.08+.25*advance+.07*(d.pressure-1)-.23*clamp(cover,0,1)-pressureBonus),.025,.42);
  }

  function shotAccuracy(y,shotBonus,difficulty='pro') {
    const factor=DIFFICULTIES[difficulty]||DIFFICULTIES.pro;
    return clamp(Math.max(1,(y-122)/23)*(1-clamp(shotBonus,0,.4))*factor.pressure,1,26);
  }
  // Probability that a shot is actually on target. Deep strikes remain possible,
  // but advancing upfield and completing a pass creates much better chances.
  // Goalkeeper saves and interceptions still apply separately.
  function shotProfile(y, passChain=0, shotBonus=0, difficulty='pro') {
    const progress=clamp((495-y)/350,0,1);
    const combos=clamp(passChain,0,3);
    const upgrades=clamp(shotBonus,0,.4);
    const rival=DIFFICULTIES[difficulty]||DIFFICULTIES.pro;
    const onTarget=clamp(.085+.72*Math.pow(progress,1.75)+
      .10*Math.min(1,combos)+.05*Math.max(0,combos-1)+
      .12*upgrades-(rival.pressure-1)*.18,.06,.94);
    return {
      onTarget,
      label:onTarget<.25?'LONG SHOT':onTarget<.55?'BUILD ATTACK':'GOOD CHANCE',
      progress,
      passBonus:combos>0
    };
  }
  function shotTarget(aimIndex, zones, profile, random=.5, missRandom=.5, goalLeft=148, goalRight=272) {
    const index=Math.max(0,Math.min(zones.length-1,Math.floor(Number(aimIndex)||0)));
    const x=zones[index].x;
    const success=clamp(profile?.onTarget??0,0,1);
    if(random<success) {
      // Even good shots retain a little variation. At the end of an attack,
      // the selected corner remains reliable, unlike a deep speculative shot.
      const spread=5+(1-success)*12;
      return {x:clamp(x+(missRandom-.5)*2*spread,goalLeft+5,goalRight-5),onTarget:true};
    }
    const direction=index===0?-1:index===zones.length-1?1:(missRandom<.5?-1:1);
    const excess=20+Math.abs(missRandom-.5)*52;
    return {x:direction<0?goalLeft-excess:goalRight+excess,onTarget:false};
  }

  function keeperCommit(aimIndex, zones, difficulty='pro', random=.5) {
    const d=DIFFICULTIES[difficulty]||DIFFICULTIES.pro;
    const readChance=clamp(.22*d.keeper,.12,.45);
    if(random<readChance) return zones[aimIndex].x;
    const alternative=(aimIndex+1+(Math.floor((random-readChance)/(1-readChance)*2)%2))%3;
    return zones[alternative].x;
  }
  // Standard Gamepad mapping: left stick / D-pad for movement, A to pass,
  // B to shoot, X to skill, shoulders to aim, Start to pause/resume.
  function readGamepad(pad) {
    const blank={x:0,y:0,pass:false,shoot:false,skill:false,aimLeft:false,aimRight:false,toggle:false};
    if(!pad||pad.connected===false)return blank;
    const pressed=id=>Boolean(pad.buttons?.[id]?.pressed||(Number(pad.buttons?.[id]?.value)||0)>.55);
    const ax=clamp(Number(pad.axes?.[0])||0,-1,1),ay=clamp(Number(pad.axes?.[1])||0,-1,1);
    const analog=joystickVector(ax*42,ay*42,42);
    const x=pressed(15)?1:pressed(14)?-1:analog.x;
    const y=pressed(13)?1:pressed(12)?-1:analog.y;
    const norm=Math.max(1,Math.hypot(x,y));
    return {
      x:x/norm,y:y/norm,pass:pressed(0),shoot:pressed(1),
      skill:pressed(2),aimLeft:pressed(4),aimRight:pressed(5),
      toggle:pressed(9)
    };
  }

  function cameraFor(actor, ball, mode, oldCamera, dt, reduceMotion=false, enabled=true) {
    if(!enabled||reduceMotion||mode!=='playing') return {x:210,y:300,zoom:1};
    const carrier=ball?.owner==='mate'?ball:actor;
    const actorY=clamp(actor?.y??495,0,600);
    // Keep the entire goal visible while zooming in only on attacking runs.
    // The kickoff view remains wide; the zoom grows as Jozef approaches goal.
    const attacking=clamp((440-carrier.y)/350,0,1);
    const requestedZoom=1+attacking*.23;
    // Avoid cutting Jozef off when his teammate is further up the pitch.
    const safeZoom=clamp(600/(actorY+30),1,1.23);
    const targetZoom=Math.min(requestedZoom,safeZoom);
    const previous=oldCamera||{x:210,y:300,zoom:1};
    const k=clamp((dt||.016)*5,0,1);
    const zoom=Math.min(safeZoom,clamp(previous.zoom+(targetZoom-previous.zoom)*k,1,1.23));
    const horizontalRange=210-210/zoom;
    const requestedX=210+(carrier.x-210)*.55;
    const x=clamp(previous.x+(requestedX-previous.x)*k,
      210-horizontalRange,210+horizontalRange);
    // Anchor the top of the camera to the goal line. The goalkeeper, target
    // marker and crossbar must never disappear above the visible canvas.
    const y=300/zoom;
    return {x,y,zoom};
  }
  function screenToWorld(x,y,camera) {
    const zoom=clamp(camera?.zoom||1,.5,2.5);
    return {x:(x-210)/zoom+(camera?.x??210),y:(y-300)/zoom+(camera?.y??300)};
  }
  function dailyKey(date=new Date()) {
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  }
  const CHALLENGES=Object.freeze([
    Object.freeze({id:'shots',label:'3 shots',target:3}),
    Object.freeze({id:'passes',label:'3 passes',target:3}),
    Object.freeze({id:'goals',label:'2 goals',target:2}),
    Object.freeze({id:'wins',label:'1 win',target:1})
  ]);
  function freshDaily(day=dailyKey()) {
    return {day,shots:0,passes:0,goals:0,wins:0,rewarded:[]};
  }
  function normalizeDaily(value,day=dailyKey()) {
    if(!value||value.day!==day) return freshDaily(day);
    const out=freshDaily(day);
    for(const key of ['shots','passes','goals','wins']) out[key]=Math.floor(clamp(Number(value[key]),0,99999));
    out.rewarded=Array.isArray(value.rewarded)?value.rewarded.filter(id=>CHALLENGES.some(c=>c.id===id)):[];
    return out;
  }
  function awardDaily(value,event,day=dailyKey()) {
    const next=normalizeDaily(value,day);
    if(['shots','passes','goals','wins'].includes(event)) next[event]++;
    const newlyCompleted=[];
    for(const challenge of CHALLENGES){
      if(next[challenge.id]>=challenge.target&&!next.rewarded.includes(challenge.id)){
        next.rewarded.push(challenge.id);newlyCompleted.push(challenge.id);
      }
    }
    return {state:next,newlyCompleted,completed:next.rewarded.length,total:CHALLENGES.length};
  }
  function progression(stats, daily) {
    const goals=Math.max(0,stats?.goals||0),wins=Math.max(0,stats?.wins||0);
    const points=goals*15+wins*40+Math.max(0,stats?.matches||stats?.games||0)*5;
    const level=1+Math.floor(points/150);
    const badges=[
      {id:'first-goal',label:'First goal',earned:goals>=1},
      {id:'hat-trick',label:'Hat-trick',earned:Math.max(0,stats?.best||0)>=3},
      {id:'city-hero',label:'City hero',earned:wins>=2},
      {id:'legend',label:'Legend',earned:wins>=5},
      {id:'daily-star',label:'Daily star',earned:(daily?.rewarded?.length||0)>=3}
    ];
    return {points,level,badges,earned:badges.filter(b=>b.earned).length};
  }
  return Object.freeze({
    clamp,distance,DIFFICULTIES,joystickVector,
    defenderDestination,teammateDestination,rivalRunTarget,counterSupportTarget,rivalThreatChance,shotAccuracy,shotProfile,shotTarget,keeperCommit,readGamepad,
    cameraFor,screenToWorld,dailyKey,CHALLENGES,freshDaily,normalizeDaily,awardDaily,progression
  });
});
;
/* BEGIN arena-experience.js */
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
  const immersive=prefs.mobileLayout==='immersive' && (window.matchMedia?.('(orientation: portrait) and (max-width: 1100px)')?.matches!==false);
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
 // Pointer capture is unreliable in some embedded WebKit builds. Track
 // the active pointer globally until its genuine up/cancel event arrives.
 function trackPointer(ev){
  if(stickPointer!==null&&stickPointer===ev.pointerId){
   if(ev.cancelable)ev.preventDefault();
   relative(ev);
  }
 }
 window.addEventListener('pointermove',trackPointer,{passive:false});
 joystick?.addEventListener('pointerup',clear);
 window.addEventListener('pointerup',clear);
 joystick?.addEventListener('pointercancel',clear);
 window.addEventListener('pointercancel',clear);
 joystick?.addEventListener('lostpointercapture',ev=>{
  if(ev.buttons===0)clear(ev);
 });
 // Some in-app browsers generate mouse events without matching pointermove.
 joystick?.addEventListener('mousedown',ev=>{
  if(api.getMode()!=='playing'||stickPointer!==null)return;
  stickPointer='mouse';
  joystick.classList.add('engaged');relative(ev);
 });
 window.addEventListener('mousemove',ev=>{
  if(stickPointer!==null&&(ev.buttons&1)===1)relative(ev);
 });
 window.addEventListener('mouseup',()=>clear());
 window.addEventListener('blur',()=>clear());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&dialogOpen){ev.preventDefault();openSettings(false);}});
 window.addEventListener('orientationchange',ui);
 // Embedded browsers often resize the viewport without an orientationchange event.
 window.addEventListener('resize',ui,{passive:true});
 ui();
 return Object.freeze({prefs,record,reset,finish,kitColor,haptic,ui,clearJoystick:clear,passCount:()=>passes});
}
window.JozefArenaExperience=Object.freeze({mount});
})();
;
/* BEGIN arena-renderer.js */
/* JOZEF FC // NIGHT STADIUM renderer v2.
   Display only: physics, collisions, scoring, XP and local save data remain in arena.js.
   No textures, fonts or requests are fetched. */
(() => {
'use strict';
const TAU=Math.PI*2;
const clip=(n,a,b)=>Math.max(a,Math.min(b,n));
const circle=(c,x,y,r,fill)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill()};
const strokeCircle=(c,x,y,r,color,width=1)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.lineWidth=width;c.strokeStyle=color;c.stroke()};
const rounded=(c,x,y,w,h,r,fill)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill()};
function paintStadium(c,s){
 const level=clip(s.stadium||0,0,2);
 const palettes=[
  {grass:'#125342',alt:'#104a3c',light:'#275e4a',fog:'#77ddaa',glow:'#c8ff5a',stand:'#102d35'},
  {grass:'#125565',alt:'#104b5c',light:'#246c71',fog:'#74ecf0',glow:'#7ce9e5',stand:'#112b45'},
  {grass:'#35564d',alt:'#2c5046',light:'#657663',fog:'#f6c56b',glow:'#ffd98e',stand:'#302f3b'}
 ];
 const p=palettes[level];
 c.fillStyle='#071c25';c.fillRect(0,0,420,600);
 // Stadium stand: dark tiered terraces with illuminated spectator pixels.
 c.fillStyle=p.stand;c.fillRect(0,0,420,38);c.fillRect(0,566,420,34);
 for(let row=0;row<2;row++){
  for(let i=0;i<61;i++){
   const x=9+i*6.8,y=6+row*12;
   circle(c,x,y,1.15,(i+row)%9===0?p.glow:(i*7+row)%4===0?'#92b7bd':'#315967');
   circle(c,x,578+row*9,1.12,(i*3+row)%11===0?p.glow:'#41616b');
  }
 }
 // LED ribbon and shadow pitch boundary.
 rounded(c,10,22,400,553,9,'#071719');
 const grass=c.createLinearGradient(0,26,420,578);
 grass.addColorStop(0,p.light);grass.addColorStop(.3,p.grass);grass.addColorStop(1,p.alt);
 rounded(c,15,27,390,546,5,grass);
 c.save();c.beginPath();c.rect(15,27,390,546);c.clip();
 for(let y=30;y<580;y+=56){
  c.fillStyle=y%112===30?'#ffffff0c':'#061a1a12';c.fillRect(15,y,390,56);
 }
 // Fine mowing texture and subtle floodlight reflections. Sparse and deterministic.

 c.strokeStyle='#c6fff508';c.lineWidth=.7;
 for(let x=22;x<405;x+=13){c.beginPath();c.moveTo(x,29);c.lineTo(x-6,574);c.stroke()}
 // Floodlight beams: no image downloads; inexpensive linear gradients.
 const beam=c.createLinearGradient(0,35,420,565);
 beam.addColorStop(0,'#ddffe10d');beam.addColorStop(.38,'#ffffff01');beam.addColorStop(1,'#07111526');
 c.fillStyle=beam;c.fillRect(15,27,390,546);
 // Light pools on the turf make the pitch feel like a lit arena, not a flat graphic.
 const pool=c.createRadialGradient(210,125,10,210,125,290);
 pool.addColorStop(0,'#d7ffd910');
 pool.addColorStop(.63,'#f1ffde05');
 pool.addColorStop(1,'#00000000');
 c.fillStyle=pool;c.fillRect(15,27,390,546);
 c.restore();
 // Stadium pitch markings and technical zones.
 c.strokeStyle='#edfff2aa';c.lineWidth=1.5;
 c.strokeRect(23,33,374,530);
 c.beginPath();c.moveTo(23,298);c.lineTo(397,298);c.stroke();
 strokeCircle(c,210,298,56,'#f4fff1a8',1.7);
 circle(c,210,298,3,'#e9ffee');
 c.strokeRect(119,33,182,100);c.strokeRect(159,33,102,42);
 c.strokeRect(119,463,182,100);c.strokeRect(159,521,102,42);
 circle(c,210,114,3,'#d7ffe1');circle(c,210,482,3,'#d7ffe1');
 c.beginPath();c.arc(210,114,50,.25*Math.PI,.75*Math.PI);c.stroke();
 c.beginPath();c.arc(210,482,50,1.25*Math.PI,1.75*Math.PI);c.stroke();
 // Goal depth, posts and mesh.
 rounded(c,144,12,132,19,2,'#051b20');
 c.strokeStyle='#ddffdf91';c.lineWidth=.65;
 for(let x=150;x<=270;x+=12){c.beginPath();c.moveTo(x,14);c.lineTo(x,33);c.stroke()}
 for(let y=15;y<=33;y+=5){c.beginPath();c.moveTo(145,y);c.lineTo(275,y);c.stroke()}
 c.strokeStyle='#f1ffe6';c.lineWidth=3;
 c.beginPath();c.moveTo(146,34);c.lineTo(146,15);c.lineTo(274,15);c.lineTo(274,34);c.stroke();
 // LED boards and floodlights along the sideline
 c.fillStyle=p.glow;c.fillRect(15,27,390,2);
 c.fillStyle=p.fog+'8a';c.fillRect(15,571,390,2);
 // Glowing touchlines and a restrained spectator glow for depth.
 c.fillStyle='#c0fb8060';c.fillRect(12,28,2,542);c.fillRect(406,28,2,542);
 c.fillStyle='#0a2d2d';c.fillRect(16,578,388,21);
 c.textAlign='center';c.font='900 12px system-ui';c.fillStyle='#c6e9dc';
 c.fillText('JOZEF FC     //     '+(s.venue||'NIGHT STADIUM'),210,592);
 return p;
}
// Painting the static crowd, net, mowing lines and lighting every frame is
// wasteful on iPhones. Cache one retina stadium surface and only redraw actors.
let stadiumCache=null;
function stadium(c,s){
 const venue=String(s.venue||'NIGHT STADIUM'),level=clip(s.stadium||0,0,2);
 const scale=Math.min(2,Math.max(1,Number(window.devicePixelRatio)||1));
 const key=level+'|'+venue+'|'+scale;
 if(stadiumCache?.key===key){
  c.drawImage(stadiumCache.canvas,0,0,420,600);
  return stadiumCache.palette;
 }
 let sheet=null;
 try{
  if(typeof document!=='undefined'&&typeof document.createElement==='function'){
   sheet=document.createElement('canvas');
   sheet.width=Math.round(420*scale);
   sheet.height=Math.round(600*scale);
   const buffer=sheet.getContext('2d');
   if(buffer){
    buffer.scale(scale,scale);
    const palette=paintStadium(buffer,s);
    // drawImage is fast on repeat frames and keeps antialiasing at phone DPR.
    c.drawImage(sheet,0,0,420,600);
    stadiumCache={key,canvas:sheet,palette};
    return palette;
   }
  }
 }catch(_){stadiumCache=null;}
 // Browsers that reject an offscreen buffer still render normally.
 return paintStadium(c,s);
}

function athlete(c,x,y,jersey,num,kind,phase,active,moving){
 c.save();c.translate(x,y);
 // Enlarge the captain and ball-carriers so he is recognizable on a phone.
 const scale=kind==='captain'?1.15:active?1.1:kind==='opponent'?1.05:1.04;
 c.scale(scale,scale);
 // Realistic direction and run cycle without affecting hitboxes.
 const bob=moving?Math.sin(phase*13+(x+y)*.02)*1.2:0;
 const stride=moving?Math.sin(phase*13+(x+y)*.02)*3:0;
 c.shadowColor='#00181f';c.shadowBlur=11;
 c.fillStyle='#0010157a';c.beginPath();c.ellipse(0,13,18,6,0,0,TAU);c.fill();
 c.shadowBlur=0;
 if(active){
  circle(c,0,3,27,'#a8ff5b13');
  strokeCircle(c,0,3,23,'#d2ff73e3',2.3);
  strokeCircle(c,0,3,28,'#d2ff735a',1);
 }
 // Legs and boots: angled toward the goal.
 rounded(c,-10,3+stride,8,13,3,'#102a33');
 rounded(c,2,3-stride,8,13,3,'#102a33');
 rounded(c,-10,15+stride,8,4,2,'#f8ffea');
 rounded(c,2,15-stride,8,4,2,'#f8ffea');
 // Kit sleeves and arms under torso.
 rounded(c,-19,-9+bob,9,18,4,jersey);
 rounded(c,10,-9+bob,9,18,4,jersey);
 rounded(c,-16,-3+bob,5,8,3,kind==='opponent'?'#f7bc96':'#d6a882');
 rounded(c,11,-3+bob,5,8,3,kind==='opponent'?'#f7bc96':'#d6a882');
 const g=c.createLinearGradient(-10,-15,11,14);
 g.addColorStop(0,'#ffffff52');g.addColorStop(.4,jersey);g.addColorStop(1,'#001c2733');
 c.beginPath();c.roundRect(-13,-13+bob,26,27,7);
 c.fillStyle=g;c.fill();
 c.strokeStyle='#faffef66';c.lineWidth=1;c.stroke();
 // Shirt striping, collar and readable jersey number.
 c.fillStyle='#ffffff36';c.fillRect(-10,-10+bob,4,19);
 c.fillStyle='#ffffff1b';c.fillRect(6,-10+bob,2,19);
 rounded(c,-6,-13+bob,12,4,2,'#102b2f');
 c.fillStyle='#faffee';c.font='900 12px system-ui';
 c.textAlign='center';c.fillText(String(num),0,7+bob);
 // Head, defined hairline and face direction.
 circle(c,0,-18+bob,9,kind==='opponent'?'#dfaa88':'#c99670');
 c.beginPath();c.arc(0,-20+bob,9,Math.PI*1.05,Math.PI*1.98);
 c.fillStyle=kind==='keeper'?'#26373a':'#1b282b';c.fill();
 circle(c,-3,-15+bob,1,'#24312b');
 circle(c,3,-15+bob,1,'#24312b');
 // Captain insignia and keeper gloves.
 if(kind==='captain'){
  circle(c,15,-11+bob,3,'#cfff66');
  c.fillStyle='#071821';c.font='900 6px system-ui';c.fillText('C',15,-9+bob);
  // A small captain callout separates Jozef from the other numbered shirts.
  rounded(c,-21,-43,42,12,5,'#08272dea');
  c.fillStyle='#d9ff84';c.font='900 9px system-ui';
  c.fillText('JOZEF',0,-34);
 }
 if(kind==='keeper'){
  circle(c,-18,1+bob,4,'#eafffa');circle(c,18,1+bob,4,'#eafffa');
 }
 c.restore();
}
function ball(c,s,phase,motion){
 const b=s.ball||{x:210,y:300,vx:0,vy:0,owner:'free'};
 c.save();
 const velocity=Math.hypot(b.vx||0,b.vy||0);
 if(motion&&velocity>40&&(b.owner==='shot'||b.owner==='free')){
  const dx=(b.vx||0)/velocity,dy=(b.vy||0)/velocity;
  for(let i=5;i>=1;i--){
   const x=b.x-dx*i*6,y=b.y-dy*i*6;
   circle(c,x,y,Math.max(1,5-i*.55),'rgba(206,255,208,'+(0.05+(6-i)*.045)+')');
  }
 }
 circle(c,b.x+2,b.y+5,9,'#001e206a');
 c.shadowColor='#d4fff4';c.shadowBlur=16;
 circle(c,b.x,b.y,9.2,'#fff9e9');c.shadowBlur=0;
 circle(c,b.x-2,b.y-2,4,'#d0dfdf');
 c.beginPath();c.moveTo(b.x-1,b.y-4);c.lineTo(b.x+4,b.y-1);c.lineTo(b.x+2,b.y+3);
 c.closePath();c.fillStyle='#1c5457';c.fill();
 c.restore();
}
function aimLine(c,s){
 const zones=s.shotZones||[];
 const target=zones[s.aim||0]?.x||171;
 strokeCircle(c,target,20,13,'#f0ffaeaa',2);
 strokeCircle(c,target,20,7,'#c8ff5aaf',1);
 c.strokeStyle='#e5ff8b96';c.lineWidth=1;
 c.beginPath();c.moveTo(target-19,20);c.lineTo(target+19,20);c.moveTo(target,2);c.lineTo(target,38);c.stroke();
 if(s.ball?.owner==='actor'){
  c.save();c.setLineDash([4,7]);c.strokeStyle='#d5ffb55c';c.lineWidth=1.3;
  c.beginPath();c.moveTo(s.actor.x,s.actor.y-17);c.lineTo(target,25);c.stroke();
  c.restore();
 }
}
function fx(c,s,p,phase,motion){
 if(s.ball?.owner==='shot'&&motion){
  const b=s.ball;
  strokeCircle(c,b.x,b.y,12+2*Math.sin(phase*20),p.glow+'9e',1);
 }
 if(s.skillTime>0){
  const a=s.actor,ring=20+s.skillTime*18;
  strokeCircle(c,a.x,a.y,ring,'#d5ff8bb3',2.5);
  if(motion){
   c.strokeStyle='#c8ff5a87';c.lineWidth=3;
   for(let i=0;i<3;i++){c.beginPath();c.moveTo(a.x-15-i*7,a.y+10+i*5);c.lineTo(a.x-29-i*10,a.y+21+i*6);c.stroke()}
  }
 }
 if(s.flash){
  c.fillStyle=s.flash>0?'#c8ff5a2a':'#ff7b7224';c.fillRect(0,0,420,600);
  if(s.flash>0){
   rounded(c,41,239,338,110,12,'#041923de');
   c.textAlign='center';c.fillStyle='#d8ff89';c.font='900 64px Impact,system-ui';
   c.fillText('GOOOAL!',210,294);
   c.font='800 15px system-ui';c.fillStyle='#efffe5';
   c.fillText('JOZEF FC     '+s.us+'  :  '+s.them,210,321);
  }
 }
}
function matchScreen(c,s){
 if(s.mode==='playing')return;
 c.save();
 // Floating game-state panel: field and players remain visible at kickoff.
 const x=37,y=231,w=346,h=122;
 rounded(c,x,y,w,h,14,'#061b24ea');
 c.strokeStyle='#b3ff8180';c.lineWidth=1.5;
 c.strokeRect(x+6,y+6,w-12,h-12);
 c.fillStyle='#cafa60';c.fillRect(x+16,y+17,28,3);
 c.fillStyle='#82ebdb';c.fillRect(x+47,y+17,12,3);
 c.textAlign='center';
 c.fillStyle='#e4ff9a';c.font='900 30px Impact,system-ui';
 const heading=s.mode==='ready'?'OWN THE PITCH':s.mode==='paused'?'MATCH PAUSED':'FULL TIME';
 c.fillText(heading,210,y+56);
 c.fillStyle='#e4f7ed';c.font='800 12px system-ui';
 const subtitle=s.mode==='ready'?'MOVE   •   PASS   •   SHOOT':
  s.mode==='paused'?'TAP RESUME TO KEEP PLAYING':s.us+'  :  '+s.them+'   •   PLAY AGAIN';
 c.fillText(subtitle,210,y+85);
 c.restore();
}
function render(c,s){
 const phase=Math.max(0,Number(s.phase)||0);
 const motion=s.reducedMotion!==true;
 const cam=s.camera||{x:210,y:300,zoom:1};
 const zoom=clip(Number(cam.zoom)||1,1,1.34);
 const boundX=210-210/zoom,boundY=300-300/zoom;
 const focusX=clip(Number(cam.x)||210,210-boundX,210+boundX);
 const focusY=clip(Number(cam.y)||300,300-boundY,300+boundY);
 c.save();
 c.fillStyle='#061e25';c.fillRect(0,0,420,600);
 c.translate(210,300);c.scale(zoom,zoom);c.translate(-focusX,-focusY);
 const p=stadium(c,s);
 aimLine(c,s);
 const defensive=(s.defenders||[]);
 for(let i=0;i<defensive.length;i++){
  const d=defensive[i];
  const carrying=s.ball?.owner==='rival'&&s.rivalCarrier===i;
  strokeCircle(c,d.x,d.y,carrying?29:22,carrying?'#ffd18dda':'#ff9d8764',carrying?3:1);
  if(carrying){
   circle(c,d.x,d.y+2,31,'#ffbe5d1c');
   rounded(c,d.x-31,d.y-47,62,12,6,'#38241fe6');
   c.textAlign='center';c.font='900 8px system-ui';c.fillStyle='#ffe7ae';
   c.fillText('RIVAL BALL',d.x,d.y-38);
  }
  athlete(c,d.x,d.y,'#f2786b',String(i+2),'opponent',phase,carrying,motion&&s.mode==='playing');
 }
 const keeper=s.keeper||{x:210,y:48};
 athlete(c,keeper.x,keeper.y,'#f0b75e','GK','keeper',phase,false,motion&&s.ball?.owner==='shot');
 const lineup=s.squad?.lineup||{};
 const jerseys={rookie:'11',goal:'9',explorer:'7',captain:'10',scholar:'8',super:'11',champion:'99'};
 const number=key=>jerseys[key]||null;
 const ax=s.actor||{x:210,y:495},mate=s.mate||{x:300,y:310};
 athlete(c,210+(ax.x-210)*.12,535,'#5db6d2',number(lineup.back)||'5','team',phase,false,false);
 athlete(c,210,558,'#e2bd71',number(lineup.keeper)||'1','keeper',phase,false,false);
 if(s.counterTime>0&&s.ball?.owner!=='rival'){
  strokeCircle(c,mate.x,mate.y,30,'#a2fff2ae',2);
  rounded(c,mate.x-27,mate.y-46,54,12,5,'#0c4441ed');
  c.font='900 9px system-ui';c.fillStyle='#bdfff0';c.textAlign='center';
  c.fillText('RUN!',mate.x,mate.y-37);
 }
 athlete(c,mate.x,mate.y,'#78e8dc',number(lineup.mid||lineup.striker)||'7','team',phase,s.ball?.owner==='mate',motion&&s.mode==='playing');
 const identity=s.identity||{};
 const color=/^#[\da-fA-F]{6}$/.test(identity.kit)?identity.kit:'#c8ff5a';
 const n=Number.isInteger(identity.number)&&identity.number>=1&&identity.number<=99?identity.number:11;
 athlete(c,ax.x,ax.y,color,n,'captain',phase,true,motion&&s.mode==='playing');
 ball(c,s,phase,motion);
 fx(c,s,p,phase,motion);
 c.restore();
 matchScreen(c,s);
}
window.JozefArenaGraphics=Object.freeze({render});
})();
;
/* BEGIN arena.js */
/* JOZEF FC / ARENA: standalone top-down football game. No external APIs. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('arena-canvas');
if(!canvas)return;
const ctx=canvas.getContext('2d');
if(!ctx){$('arena-status').textContent='A newer browser with Canvas support is needed.';return;}
const W=420,H=600,GOAL={left:148,right:272,top:16},MATCH_LENGTH=75;
const KEY='jozefs-world-arena-v1', MATCH_SNAPSHOT_KEY='jozef-arena-match-snapshot-v1';
const systems=window.JozefArenaSystems;
if(!systems){$('arena-status').textContent='Arena game systems unavailable. Refresh to retry.';return;}
let experience=null, camera={x:210,y:300,zoom:1},replay=null,replayHistory=[],replayWait=0,joystick={x:0,y:0};
let padVector={x:0,y:0},padPrevious={},padConnected=false,padRaf=0;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const msg=s=>{const t=$('arena-status');if(t)t.textContent=s;};
const put=(id,s)=>{const e=$(id);if(e)e.textContent=String(s);};
const fresh=()=>({games:0,wins:0,draws:0,goals:0,best:0,stadium:0,coins:0,upgradeSpeed:0,upgradeShot:0,upgradePass:0});
function load(){
 try{
  const d=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!d||typeof d!=='object'||Array.isArray(d))return fresh();
  const s=fresh();
  for(const k of Object.keys(s))s[k]=clamp(Number.isFinite(Number(d[k]))?Math.floor(Number(d[k])):0,0,99999);
  return s;
 }catch(_){return fresh();}
}
const lifetime=load();
const venues=[
  {name:'NEIGHBOURHOOD COURT',accent:'#cafa60',need:0,rival:'THE ROOFTOP ROVERS',story:'The neighbourhood knows your name. Earn two wins to unlock the lights of Neon City.'},
  {name:'NEON CITY',accent:'#73f7da',need:2,rival:'MIDNIGHT CITY FC',story:'The city has heard about Jozef. Earn five total victories to enter the Legend Arena.'},
  {name:'LEGEND ARENA',accent:'#ffd180',need:5,rival:'THE NEON ROYALS',story:'The final gates are open. You face the city champions. Keep winning to write your own legend.'}
];
let mode='ready',time=MATCH_LENGTH,us=0,them=0,streak=0,flash=0,last=0,raf=0;
let lastFrameTick=0,rawFrameTick=0,slowFrameCount=0,stableFrameCount=0,autoBattery=false,checkpointElapsed=0;
let actor={x:210,y:494},mate={x:298,y:320},ball={x:210,y:482,owner:'actor',vx:0,vy:0};
let defenders=[],keeper={x:210,y:48},keys=new Set(),stick={x:0,y:0},target=null,shotCooldown=0,tackleCooldown=0,passCooldown=0;
const SHOT_ZONES=[{name:'LEFT POST',x:171},{name:'CENTRE',x:210},{name:'RIGHT POST',x:249}];
// Track individual touches: two directional buttons may be held together for diagonal runs.
const heldDirections=new Map();
function updateTouchVector(){
 let x=0,y=0;
 for(const dir of heldDirections.values()){x+=dir.x;y+=dir.y;}
 const len=Math.hypot(x,y);
 stick=len>1?{x:x/len,y:y/len}:{x,y};
}
let aim=0,skillCooldown=0,skillTime=0,keeperDestination=210,keeperReact=0,passRecipient=null,mateTime=0,shots=0,keeperSaves=0,lastHudTick=-1;
let passChain=0,blockedShots=0,looseBallElapsed=0;
let rivalCarrier=-1,rivalElapsed=0,counterTime=0,counterRecoveries=0,rivalAttacks=0;
function getSquad(){
 const api=window.JozefSquad?.getSquad?.();
 const val=api?.bonuses||{};
 return {
  speed:clamp((Number(val.speed)||0)+lifetime.upgradeSpeed*.035,0,.4),
  pass:clamp((Number(val.pass)||0)+lifetime.upgradePass*.035,0,.4),
  shot:clamp((Number(val.shot)||0)+lifetime.upgradeShot*.035,0,.4),
  defence:clamp(Number(val.defence)||0,0,.35),
  keeper:clamp(Number(val.keeper)||0,0,.35),
  lineup:{...(api?.slots||{})},
  tactic:['balanced','attack','defence'].includes(api?.tactic)?api.tactic:'balanced'
 };
}
let squad=getSquad();
// Small synthesized stadium sounds. Nothing is fetched or autoplayed.
// Jozef must enable Sound in My Club and interact with the game first.
let audioCtx=null;
function cue(event){
 if(window.JozefWorld?.getProgress?.()?.sound!==true)return;
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio)return;
 try{
  if(!audioCtx)audioCtx=new Audio();
  const notes={
   start:[392,494],pass:[420],shot:[264,528],goal:[523,659,784,1046],
   save:[310,260],tackle:[220,174],victory:[523,659,784]
  }[event]||[];
  const now=audioCtx.currentTime;
  notes.forEach((hz,i)=>{
   const osc=audioCtx.createOscillator();
   const gain=audioCtx.createGain();
   osc.type=event==='goal'||event==='victory'?'triangle':'sine';
   const t=now+i*.10;
   osc.frequency.setValueAtTime(hz,t);
   gain.gain.setValueAtTime(.001,t);
   gain.gain.exponentialRampToValueAtTime(.045,t+.018);
   gain.gain.exponentialRampToValueAtTime(.001,t+.14);
   osc.connect(gain);gain.connect(audioCtx.destination);
   osc.start(t);osc.stop(t+.15);
  });
 }catch(_){/* Audio is strictly optional. Gameplay never depends on it. */}
}
function refreshGraphics(){
 const quality=experience?.prefs?.graphics||'auto';
 const cap=quality==='battery'?1:quality==='quality'?2:1.5;
 const dpr=Math.max(1,Math.min(window.devicePixelRatio||1,cap));
 const width=Math.round(W*dpr),height=Math.round(H*dpr);
 if(canvas.width!==width||canvas.height!==height){
  canvas.width=width;canvas.height=height;
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);
 lastFrameTick=0;
}
refreshGraphics();
window.addEventListener('resize',refreshGraphics,{passive:true});
function resetPositions(){
 actor={x:210,y:493};mate={x:301,y:310};
 ball={x:actor.x,y:actor.y-14,owner:'actor',vx:0,vy:0};
 defenders=[{x:144,y:260,speed:89},{x:279,y:205,speed:90},{x:204,y:143,speed:82}];
 keeper={x:210,y:48};
 shotCooldown=0;tackleCooldown=1.2;passCooldown=0;passRecipient=null;mateTime=0;
 keeperDestination=210;keeperReact=0;passChain=0;looseBallElapsed=0;
 rivalCarrier=-1;rivalElapsed=0;counterTime=0;keys.clear();heldDirections.clear();stick={x:0,y:0};target=null;
}
function ensureShotQualityUI(){
 if($('arena-shot-quality')||!document.createElement)return;
 const c=document.querySelector('#arena .arena-aim-caption');
 const label=c?.querySelector('#arena-aim-label');
 if(!label)return;
 const span=document.createElement('span'),odds=document.createElement('b');
 odds.id='arena-shot-quality';odds.textContent='9%';
 span.append('SHOT ',odds);c.replaceChildren(span,label);
}
function hud(){
 ensureShotQualityUI();
 put('arena-score',us+' : '+them);put('arena-clock',String(Math.ceil(Math.max(0,time))).padStart(2,'0')+'s');
 const venue=venues[Math.min(venues.length-1,lifetime.stadium)];
 put('arena-venue',venue.name);put('arena-rival',venue.rival);put('arena-story',venue.story);
 put('arena-wins',lifetime.wins);put('arena-goals',lifetime.goals);
 put('arena-matches',lifetime.games);put('arena-tactic',squad.tactic.toUpperCase());
 put('arena-shots',shots);put('arena-keeper-saves',keeperSaves);
 put('arena-aim-label',SHOT_ZONES[aim].name);
 const shooter=ball.owner==='mate'?mate:actor;
 const chance=systems.shotProfile(shooter.y,passChain,squad.shot+Math.min(.18,counterTime*.033),experience?.prefs.difficulty||'pro');
 put('arena-shot-quality',ball.owner==='rival'?'DEFEND':Math.round(chance.onTarget*100)+'%');
 const chanceLabel=$('arena-shot-quality');if(chanceLabel)chanceLabel.title=chance.label+' · Pass and move forward to improve your shooting chance.';
 put('arena-skill-status',skillCooldown>0?'READY IN '+Math.ceil(skillCooldown)+'s':'SKILL READY');
 const skillButton=$('arena-skill');if(skillButton){skillButton.disabled=mode!=='playing'||skillCooldown>0;skillButton.textContent=experience?.prefs.mobileLayout==='immersive'?(ball.owner==='rival'?'TACKLE':'BOOST'):(ball.owner==='rival'?'TACKLE BURST L':'SKILL BURST L');}
 for(let i=0;i<3;i++){const b=$('arena-aim-'+i);if(b){b.setAttribute('aria-pressed',String(aim===i));b.classList.toggle('selected',aim===i);}}

 const b=$('arena-start');if(b)b.textContent=mode==='ready'?'KICK OFF →':mode==='playing'?'PAUSE':mode==='paused'?'RESUME →':'PLAY AGAIN →';
 canvas.setAttribute('aria-label','Football pitch, '+mode+'. Jozef FC '+us+' to '+them+'. '+Math.ceil(Math.max(0,time))+' seconds. Move with arrow keys or touch controls. Pass with J, shoot with K.');
}
// A short-lived, local-only checkpoint protects a match when mobile browsers
// suspend or discard a tab. Never stores accounts, contacts, or other user data.
function clearMatchSnapshot(){
 try{localStorage.removeItem?.(MATCH_SNAPSHOT_KEY);}catch(_){}
}
function saveMatchSnapshot(){
 if(mode!=='playing'&&mode!=='paused')return;
 try{
  localStorage.setItem(MATCH_SNAPSHOT_KEY,JSON.stringify({
   version:1,savedAt:Date.now(),time,us,them,shots,keeperSaves,
   actor,mate,ball,defenders,keeper,aim,skillCooldown,skillTime,
   shotCooldown,tackleCooldown,passCooldown,passChain,
   rivalCarrier,rivalElapsed,counterTime,counterRecoveries,rivalAttacks
  }));
 }catch(_){}
}
function restoreMatchSnapshot(){
 try{
  const old=JSON.parse(localStorage.getItem(MATCH_SNAPSHOT_KEY)||'null');
  if(!old||old.version!==1||!Number.isFinite(old.savedAt)||
    Date.now()-old.savedAt>2*60*60*1000||old.savedAt>Date.now()+60000)return false;
  if(!(old.time>0&&old.time<=MATCH_LENGTH))return false;
  const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&
    p.x>=0&&p.x<=W&&p.y>=0&&p.y<=H;
  if(!validPoint(old.actor)||!validPoint(old.mate)||!validPoint(old.ball)||
    !validPoint(old.keeper)||!Array.isArray(old.defenders)||
    old.defenders.length!==3||!old.defenders.every(validPoint))return false;
  if(!['actor','mate','free','pass','shot','rival'].includes(old.ball.owner))return false;
  time=old.time;us=clamp(Number(old.us)||0,0,99);them=clamp(Number(old.them)||0,0,99);
  shots=clamp(Number(old.shots)||0,0,99);keeperSaves=clamp(Number(old.keeperSaves)||0,0,99);
  actor=old.actor;mate=old.mate;ball=old.ball;defenders=old.defenders;keeper=old.keeper;
  aim=clamp(Number(old.aim)||0,0,2);
  skillCooldown=clamp(Number(old.skillCooldown)||0,0,10);
  skillTime=clamp(Number(old.skillTime)||0,0,1);
  shotCooldown=clamp(Number(old.shotCooldown)||0,0,2);
  tackleCooldown=clamp(Number(old.tackleCooldown)||0,0,2);
  passCooldown=clamp(Number(old.passCooldown)||0,0,2);
  passChain=clamp(Number(old.passChain)||0,0,3);
  rivalCarrier=clamp(Number(old.rivalCarrier)||0,-1,2);
  rivalElapsed=clamp(Number(old.rivalElapsed)||0,0,10);
  counterTime=clamp(Number(old.counterTime)||0,0,6);
  counterRecoveries=clamp(Number(old.counterRecoveries)||0,0,99);
  rivalAttacks=clamp(Number(old.rivalAttacks)||0,0,99);
  if(ball.owner==='rival'&&rivalCarrier<0)return false;
  squad=getSquad();mode='paused';last=0;lastFrameTick=0;rawFrameTick=0;
  return true;
 }catch(_){return false;}
}
function start(){
 clearMatchSnapshot();checkpointElapsed=0;
 mode='playing';time=MATCH_LENGTH;us=0;them=0;streak=0;flash=0;last=0;
 shots=0;keeperSaves=0;blockedShots=0;counterRecoveries=0;rivalAttacks=0;skillCooldown=0;skillTime=0;lastHudTick=-1;
 camera={x:210,y:300,zoom:1};replay=null;replayHistory=[];replayWait=0;joystick={x:0,y:0};padVector={x:0,y:0};experience?.reset();
 squad=getSquad();resetPositions();hud();cue('start');
 msg('KICK OFF! Move, pass to your teammate, and shoot into the top goal.');
 last=0;lastFrameTick=0;rawFrameTick=0;
 cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function pause(){
 if(mode==='playing'){mode='paused';cancelAnimationFrame(raf);keys.clear();heldDirections.clear();stick={x:0,y:0};joystick={x:0,y:0};padVector={x:0,y:0};experience?.clearJoystick();last=0;saveMatchSnapshot();msg('Half-time breather. Your score is safe.');}
 else if(mode==='paused'){mode='playing';last=0;msg('Back on the ball!');raf=requestAnimationFrame(loop);}
 hud();
}
function end(){
 if(mode!=='playing')return;
 clearMatchSnapshot();
 mode='over';cancelAnimationFrame(raf);keys.clear();heldDirections.clear();stick={x:0,y:0};joystick={x:0,y:0};padVector={x:0,y:0};experience?.clearJoystick();
 lifetime.games=Math.min(99999,lifetime.games+1);
 lifetime.goals=Math.min(99999,lifetime.goals+us);
 lifetime.best=Math.max(lifetime.best,us);
 const won=us>them;
 if(won)lifetime.wins=Math.min(99999,lifetime.wins+1);
 else if(us===them)lifetime.draws=Math.min(99999,lifetime.draws+1);
 lifetime.stadium=lifetime.wins>=5?2:lifetime.wins>=2?1:0;
 const unlocked=won&&(lifetime.wins===2||lifetime.wins===5);

 try{localStorage.setItem(KEY,JSON.stringify(lifetime));}catch(_){}
 window.JozefWorld?.record?.('arena',{result:won?'win':us===them?'draw':'loss',goals:us});
 if(won)cue('victory');
 const result=won?'VICTORY!':us===them?'A HARD-FOUGHT DRAW.':'FULL TIME. REMATCH?';
 msg(result+' '+us+'–'+them+'. '+(unlocked?'NEW STADIUM UNLOCKED!':won?'Your club has earned a win!':'Every match builds your skills.'));
 finishReplay();
 window.dispatchEvent?.(new Event('jozef:progress'));
 // A fully finished match counts toward today's shared HQ activities.
 window.dispatchEvent?.(new Event('jozef:arena-completed'));
 hud();draw();experience?.finish({won,us,them,shots,saves:keeperSaves});
}
function move(deltaX,deltaY,dt){
 const len=Math.hypot(deltaX,deltaY);
 if(len<.1)return;
 const speed=190*(1+squad.speed)*(skillTime>0?1.85:1);
 actor.x=clamp(actor.x+deltaX/Math.max(len,1)*speed*dt,24,396);
 actor.y=clamp(actor.y+deltaY/Math.max(len,1)*speed*dt,102,565);
}
function receive(){
 if(ball.owner!=='free')return;
 if(dist(ball,actor)<25){ball.owner='actor';passChain=0;msg('POSSESSION! Advance or pass to find a better shot.');}
 else if(dist(ball,mate)<24){ball.owner='mate';passChain=0;msg('Great recovery! Get closer to goal for the shot.');}
}
function setAim(i){
 if(!Number.isInteger(i)||i<0||i>=SHOT_ZONES.length)return;
 aim=i;hud();
 if(mode==='playing')msg('AIM SET: '+SHOT_ZONES[aim].name+'. Create space, then shoot!');
}
function skillMove(){
 if(mode!=='playing'||replay||skillCooldown>0)return;
 skillCooldown=5.5;skillTime=.66;experience?.haptic(20);
 msg('SKILL MOVE! Burst past the press!');
 hud();
}
function pass(){
 if(mode!=='playing'||replay||passCooldown>0)return;
 if(ball.owner!=='actor'&&ball.owner!=='mate'){msg('Recover the ball first!');return;}
 const sender=ball.owner==='actor'?actor:mate;
 const receiver=ball.owner==='actor'?mate:actor;
 const gap=dist(sender,receiver);
 if(gap>345){msg('Your teammate is too far away. Move closer!');return;}
 passRecipient=ball.owner==='actor'?'mate':'actor';
 ball={x:sender.x,y:sender.y-8,vx:0,vy:0,owner:'pass'};
 passCooldown=.48;cue('pass');experience?.haptic(12);
 msg(passRecipient==='mate'?'PERFECT WEIGHT! The ball is heading to your teammate.':'ONE-TWO! Jozef is getting the return pass.');
}
function shoot(holdCharge=0){
 if(mode!=='playing'||replay||shotCooldown>0)return;
 if(ball.owner!=='actor'&&ball.owner!=='mate'){msg('Get possession first!');return;}
 const p=ball.owner==='mate'?mate:actor;
 // Intentional corner aiming beats random, unstoppable goalkeeper animations.
 // Short-range attempts have tighter accuracy. Squad strength helps long shots.
 const quality=systems.shotProfile(p.y,passChain,squad.shot+Math.min(.18,counterTime*.033)+Math.min(.06,holdCharge*.06),experience?.prefs.difficulty||'pro');
 const placement=systems.shotTarget(aim,SHOT_ZONES,quality,Math.random(),Math.random(),GOAL.left,GOAL.right);
 const goalX=placement.x;
 const dy=GOAL.top-p.y,dx=goalX-p.x,div=Math.max(1,Math.hypot(dx,dy));
 const power=490+110*squad.shot+Math.min(1,Math.max(0,holdCharge))*100;
 ball={x:p.x,y:p.y-7,vx:dx/div*power,vy:dy/div*power,owner:'shot'};
 // Keeper has to guess and commit. A save is earned, not guaranteed.
 keeperDestination=systems.keeperCommit(aim,SHOT_ZONES,experience?.prefs.difficulty||'pro',Math.random());
 keeperReact=.16/(systems.DIFFICULTIES[experience?.prefs.difficulty||'pro']?.keeper||1);shotCooldown=.65;mateTime=0;shots++;streak=.45;cue('shot');experience?.haptic(22);experience?.record('shots');
 msg(p.y>360?'LONG SHOT! Get closer or pass for a better chance.':
  'SHOOTING AT THE '+SHOT_ZONES[aim].name+'! '+(quality.passBonus?'GREAT BUILDUP!':'FIND THE CORNER!'));
 hud();
}
function resetAfterMiss(){
 resetPositions();shotCooldown=.8;flash=-.08;
 msg('OFF TARGET! BRING THE BALL FORWARD AND TRY AGAIN.');hud();
}
// Rival possession is a real, playable defensive phase, not an instant reset.
function rivalTakeover(index,reason='BALL LOST! CHASE THE RIVAL AND WIN IT BACK!'){
 if(mode!=='playing'||!defenders.length)return;
 rivalCarrier=clamp(Math.floor(index),0,defenders.length-1);
 const rival=defenders[rivalCarrier];
 ball={x:rival.x,y:rival.y-12,vx:0,vy:0,owner:'rival'};
 rivalElapsed=0;counterTime=0;passChain=0;passRecipient=null;mateTime=0;
 tackleCooldown=.75;looseBallElapsed=0;flash=-.14;cue('tackle');
 msg(reason);hud();
}
function recoverCounter(who){
 rivalCarrier=-1;rivalElapsed=0;counterTime=4.2;passChain=0;
 const winner=who==='mate'?mate:actor;
 ball={x:winner.x,y:winner.y-13,vx:0,vy:0,owner:who};
 tackleCooldown=1.25;passCooldown=0;looseBallElapsed=0;
 counterRecoveries++;experience?.haptic([16,25,16]);
 msg(who==='mate'?'TEAMMATE WINS IT! PASS BACK TO JOZEF OR SHOOT!':
  'BALL WON! FAST BREAK — PASS TO YOUR RUNNER OR DRIBBLE!');
 hud();
}
function finishRivalAttack(){
 if(ball.owner!=='rival')return;
 rivalAttacks++;
 const carrier=defenders[rivalCarrier]||{x:210,y:535};
 const cover=Math.min(1,squad.defence*.8+squad.keeper*.9);
 const chance=systems.rivalThreatChance(carrier.y,experience?.prefs.difficulty||'pro',
  cover,dist(mate,carrier));
 if(Math.random()<chance){
  them++;flash=-.65;cue('tackle');resetPositions();
  msg('RIVALS SCORE AFTER A COUNTER! WIN THE BALL BACK!');
  if(them>=4){end();return;}
  hud();
 }else{
  keeperSaves++;recoverCounter('mate');cue('save');
  msg('YOUR TEAM STOPS THE COUNTER! BREAK FOR THE OTHER GOAL!');
 }
}
function updateRivalBreak(dt,difficulty){
 rivalElapsed+=dt;
 const runner=defenders[rivalCarrier];
 if(!runner){resetPositions();return;}
 const dest=systems.rivalRunTarget(runner,actor,rivalElapsed,
  experience?.prefs.difficulty||'pro');
 const dx=dest.x-runner.x,dy=dest.y-runner.y,length=Math.hypot(dx,dy);
 const speed=(94+10*Math.min(rivalElapsed,2))*difficulty.speed;
 if(length>1){
  const step=Math.min(length,speed*dt);
  runner.x=clamp(runner.x+dx/length*step,24,396);
  runner.y=clamp(runner.y+dy/length*step,80,545);
 }
 ball.x=runner.x;ball.y=runner.y-12;
 // Teammate chases the ball, providing an assisted defensive recovery.
 const tx=runner.x+(runner.x<210?17:-17),ty=runner.y+12;
 const mdx=tx-mate.x,mdy=ty-mate.y,ml=Math.hypot(mdx,mdy);
 if(ml>1){
  const step=Math.min(ml,(116+20*squad.defence)*dt);
  mate.x=clamp(mate.x+mdx/ml*step,24,396);
  mate.y=clamp(mate.y+mdy/ml*step,100,565);
 }
 if(dist(actor,runner)<(skillTime>0?48:30)){recoverCounter('actor');return;}
 if(dist(mate,runner)<23){recoverCounter('mate');return;}
 if(runner.y>=528||rivalElapsed>=6.25)finishRivalAttack();
}
function loseBall(tackler){
 if(tackleCooldown>0||ball.owner==='rival')return;
 const index=Number.isInteger(tackler)?tackler:Math.max(0,defenders.findIndex(d=>dist(d,actor)<40));
 rivalTakeover(index);
}
function startReplay(title){
 if(mode!=='playing'||replayHistory.length<6||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
 replay={title,frames:replayHistory.slice(-27),elapsed:0,duration:1.25};
 const banner=$('arena-replay-banner');if(banner){banner.hidden=false;banner.textContent=title+' · REPLAY · TAP PITCH TO SKIP';}
}
function captureHistory(dt){
 replayWait+=dt;if(replayWait<.057)return;
 replayWait=0;
 replayHistory.push({
  actor:{...actor},mate:{...mate},ball:{...ball},
  defenders:defenders.map(d=>({...d})),keeper:{...keeper},
  camera:{...camera},phase:MATCH_LENGTH-time,
  rivalCarrier,counterTime,aim,skillTime,flash
 });
 if(replayHistory.length>37)replayHistory.shift();
}
function finishReplay(){
 replay=null;
 const banner=$('arena-replay-banner');if(banner)banner.hidden=true;
}
function goal(){
 us+=1;flash=.75;cue('goal');experience?.haptic([40,40,40]);experience?.record('goals');startReplay('GOAL');msg('GOOOOOAL! JOZEF FC SCORES! '+us+'–'+them);
 if(us>=5){resetPositions();end();return;}
 resetPositions();
}
function update(dt){
 time-=dt;flash=flash>0?Math.max(0,flash-dt):Math.min(0,flash+dt);
 skillCooldown=Math.max(0,skillCooldown-dt);skillTime=Math.max(0,skillTime-dt);
 counterTime=Math.max(0,counterTime-dt);
 keeperReact=Math.max(0,keeperReact-dt);
 shotCooldown=Math.max(0,shotCooldown-dt);passCooldown=Math.max(0,passCooldown-dt);
 tackleCooldown=Math.max(0,tackleCooldown-dt);
 let dx=stick.x+joystick.x+padVector.x+(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);
 let dy=stick.y+joystick.y+padVector.y+(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);
 if(target){
  const td=dist(actor,target);
  if(td>10){dx=target.x-actor.x;dy=target.y-actor.y;}else target=null;
 }
 move(dx,dy,dt);
 const difficulty=systems.DIFFICULTIES[experience?.prefs.difficulty||'pro']||systems.DIFFICULTIES.pro;
 if(ball.owner==='rival'){
  updateRivalBreak(dt,difficulty);
  if(time<=0){time=0;end();return;}
  if(Math.ceil(time*5)!==lastHudTick){lastHudTick=Math.ceil(time*5);hud();}
  return;
 }
 if(ball.owner==='actor'){ball.x=actor.x;ball.y=actor.y-15;}
 if(ball.owner==='mate'){ball.x=mate.x;ball.y=mate.y-12;mateTime+=dt;}
 const wanted=counterTime>0?systems.counterSupportTarget(actor,mate,defenders,counterTime):systems.teammateDestination(actor,mate,squad.tactic,defenders);
 const dir=dist(wanted,mate);
 if(dir>5){mate.x+=(wanted.x-mate.x)/dir*Math.min(dir,(counterTime>0?160:squad.tactic==='attack'?125:96)*dt);mate.y+=(wanted.y-mate.y)/dir*Math.min(dir,(counterTime>0?165:112)*dt);}
 // Hold possession long enough for the player to request a return pass.
 // Teammates make a shot of their own after a brief window.
 if(ball.owner==='mate'){
  mate.y=Math.max(138,mate.y-115*dt);
  if(mateTime>1.7&&mate.y<330&&shotCooldown<=0)shoot();
 }
 const leader=ball.owner==='mate'?mate:actor;
 for(let i=0;i<defenders.length;i++){
  const d=defenders[i];
  const dest=systems.defenderDestination(i,d,actor,mate,ball);
  const distance=dist(d,dest);
  if(distance>3){
   const movement=Math.min(distance,d.speed*difficulty.speed*(1+Math.max(0,lifetime.wins)*.012)*dt);
   d.x=clamp(d.x+(dest.x-d.x)/distance*movement,22,398);
   d.y=clamp(d.y+(dest.y-d.y)/distance*movement,80,535);
  }
  if((ball.owner==='actor'||ball.owner==='mate')&&dist(d,leader)<22*difficulty.pressure&&tackleCooldown<=0&&skillTime<=0){
   loseBall(i);return;
  }
 }
 // The goalkeeper commits toward the chosen post after a realistic reaction delay.
 const keeperAim=ball.owner==='shot'?keeperDestination:210;
 const keeperSpeed=(ball.owner==='shot'&&keeperReact<=0?138:ball.owner==='shot'?0:72)*(systems.DIFFICULTIES[experience?.prefs.difficulty||'pro']?.keeper||1);
 keeper.x+=clamp(keeperAim-keeper.x,-keeperSpeed*dt,keeperSpeed*dt);
 if(ball.owner==='pass'){
  const receiving=passRecipient==='mate'?mate:actor;
  const remaining=dist(ball,receiving),step=470*(1+squad.pass)*dt;
  if(remaining<=step+17){
   ball.owner=passRecipient;passRecipient=null;mateTime=0;
   ball.x=receiving.x;ball.y=receiving.y-13;
   passChain=Math.min(3,passChain+1);
   experience?.record('passes');
   hud();
   msg(ball.owner==='mate'?'PASS COMPLETE! Press PASS again for the one-two.':'ONE-TWO COMPLETE! SHOOT!');
  }else{
   ball.x+=(receiving.x-ball.x)/remaining*step;
   ball.y+=(receiving.y-ball.y)/remaining*step;
  }
 }
 // Defenders can cut out passing lanes instead of only tackling Jozef.
 if(ball.owner==='pass'&&tackleCooldown<=0){
  const interceptor=defenders.find(d=>dist(d,ball)<17*difficulty.pressure);
  if(interceptor){
   rivalTakeover(defenders.indexOf(interceptor),'PASS INTERCEPTED! PRESS THE CARRIER!');
   return;
  }
 }
 if(ball.owner==='shot'||ball.owner==='free'){
  ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
  // Shots travel through the actual defenders. A clear passing or dribbling
  // lane earns the chance to test the goalkeeper.
  if(ball.owner==='shot'){
   const blocker=defenders.find(d=>dist(d,ball)<18*difficulty.pressure);
   if(blocker){
    ball.owner='free';looseBallElapsed=0;ball.vx=(ball.x-blocker.x)*6;
    ball.vy=175;blockedShots++;flash=-.15;
    cue('save');msg('SHOT BLOCKED! MOVE INTO SPACE AND TRY AGAIN.');
   }
  }
  if(ball.owner==='free'){
   // Rivals can collect a rebound if Jozef does not win the race.
   if(looseBallElapsed>.45){
    const winner=defenders.findIndex(d=>dist(d,ball)<22*difficulty.pressure);
    if(winner>=0){rivalTakeover(winner,'RIVAL COLLECTS THE REBOUND! CHASE HIM!');return;}
   }
   ball.vx*=Math.max(0,1-1.0*dt);ball.vy*=Math.max(0,1-1.0*dt);
   receive();
   if(ball.owner==='free'){
    looseBallElapsed+=dt;
    if(looseBallElapsed>3.25){
     resetPositions();shotCooldown=.65;
     msg('BALL RECOVERED! START A NEW ATTACK.');
     hud();return;
    }
   }else looseBallElapsed=0;
  }
  if(ball.owner==='shot'&&ball.y<64&&Math.abs(ball.x-keeper.x)<18*(systems.DIFFICULTIES[experience?.prefs.difficulty||'pro']?.keeper||1)){
    ball.owner='free';looseBallElapsed=0;ball.vy=220;ball.vx=ball.x<keeper.x?-85:85;
    keeperSaves++;cue('save');msg('WHAT A SAVE! FOLLOW UP ON THE REBOUND!');flash=-.22;experience?.haptic([15,30,15]);startReplay('GREAT SAVE');
  }else if(ball.owner==='shot'&&ball.y<=22){
    if(ball.x>GOAL.left&&ball.x<GOAL.right){goal();return;}
    resetAfterMiss();return;
  }
  if(ball.x<14||ball.x>406){ball.x=clamp(ball.x,14,406);ball.vx*=-.55;}
  if(ball.y>578){
   if(ball.owner==='free'){
    resetPositions();shotCooldown=.65;
    msg('OUT OF PLAY! RESTART AND BUILD AN ATTACK.');hud();return;
   }
   ball.y=578;ball.vy=-90;
  }
 }
 if(time<=0){time=0;end();return;}
 if(Math.ceil(time*5)!==lastHudTick){lastHudTick=Math.ceil(time*5);hud();}
}
function round(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function player(x,y,color,number){
 ctx.shadowColor=color;ctx.shadowBlur=18;
 round(x-14,y-15,28,31,10,color);ctx.shadowBlur=0;
 ctx.fillStyle='#06171d';ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillText(String(number),x,y+5);
}
function draw(){
 const sample=replay&&replay.frames.length?
   replay.frames[Math.min(replay.frames.length-1,Math.floor(replay.elapsed/replay.duration*replay.frames.length))]:null;
 // Presentation layer is isolated from the physics. If graphics are blocked by
 // an older device, fall back to the original playable canvas renderer.
 if(window.JozefArenaGraphics?.render){
  try{
   window.JozefArenaGraphics.render(ctx,{
    venue:venues[Math.min(lifetime.stadium,2)].name,stadium:lifetime.stadium,
    actor:sample?.actor||actor,mate:sample?.mate||mate,ball:sample?.ball||ball,
    defenders:sample?.defenders||defenders,keeper:sample?.keeper||keeper,
    rivalCarrier:sample?.rivalCarrier??rivalCarrier,counterTime:sample?.counterTime??counterTime,
    squad,identity:{
      ...(window.JozefWorld?.getProgress?.()||{}),
      ...(experience?.kitColor()?{kit:experience.kitColor()}:{})
    },camera:sample?.camera||camera,
    shotZones:SHOT_ZONES,aim:sample?.aim??aim,phase:sample?.phase??(MATCH_LENGTH-time),
    skillTime:sample?.skillTime??skillTime,flash:sample?.flash??flash,streak,time,us,them,mode:replay?'playing':mode,
    reducedMotion:Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
   });
   return;
  }catch(_){/* Keep football playable with the classic renderer. */}
 }
 const venue=venues[Math.min(lifetime.stadium,2)];
 const grad=ctx.createLinearGradient(0,0,0,H);
 if(lifetime.stadium>=2){grad.addColorStop(0,'#59442b');grad.addColorStop(.55,'#6a5540');grad.addColorStop(1,'#2b2b33');}
 else if(lifetime.stadium===1){grad.addColorStop(0,'#07435a');grad.addColorStop(.55,'#145b65');grad.addColorStop(1,'#092c45');}
 else{grad.addColorStop(0,'#0a463a');grad.addColorStop(.55,'#105443');grad.addColorStop(1,'#06302b');}
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 for(let y=0;y<H;y+=80){ctx.fillStyle=y%160===0?'#eaffbd09':'#00000006';ctx.fillRect(0,y,W,80);}
 ctx.strokeStyle='#e6ffe763';ctx.lineWidth=2.3;
 ctx.strokeRect(18,20,384,562);
 ctx.beginPath();ctx.moveTo(18,300);ctx.lineTo(402,300);ctx.stroke();
 ctx.beginPath();ctx.arc(210,300,59,0,Math.PI*2);ctx.stroke();
 ctx.strokeRect(110,20,200,115);ctx.strokeRect(151,20,118,43);
 ctx.strokeRect(110,465,200,117);ctx.strokeRect(151,538,118,43);
 round(148,3,124,18,4,'#d3fe77');
 ctx.strokeStyle='#d3fe77';ctx.strokeRect(156,0,108,11);
 ctx.textAlign='center';ctx.fillStyle='#d6f6e9';ctx.font='800 13px system-ui';ctx.fillText('JOZEF FC // '+venue.name,210,593);
 // Defenders, keeper, partner and captain.
 for(const d of defenders)player(d.x,d.y,'#fb8170','X');
 player(keeper.x,48,'#ffca67','GK');
 // The squad Jozef builds is represented on the pitch, not just in menus.
 const shirts={rookie:'11',goal:'9',explorer:'7',captain:'10',scholar:'8',super:'11',champion:'99'};
 const teammateNo=shirts[squad.lineup.mid||squad.lineup.striker]||'7';
 const defenderNo=shirts[squad.lineup.back]||'5';
 const goalkeeperNo=shirts[squad.lineup.keeper]||'1';
 player(210+(actor.x-210)*.12,535,'#7bb9e7',defenderNo);
 player(210,560,'#eec875',goalkeeperNo);
 player(mate.x,mate.y,'#70dceb',teammateNo);
 const identity=window.JozefWorld?.getProgress?.()||{};
 const jersey=/^#[0-9a-fA-F]{6}$/.test(identity.kit)?identity.kit:'#d4fb73';
 const number=Number.isInteger(identity.number)&&identity.number>=1&&identity.number<=99?identity.number:11;
 // Translucent target, speed trail and directional shot preview.
 const targetX=SHOT_ZONES[aim].x;
 ctx.strokeStyle='#edffad88';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(targetX,17,14,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#d9ff8c';ctx.font='800 11px system-ui';ctx.fillText('↓',targetX,34);
 if(ball.owner==='actor'){
   ctx.strokeStyle='#d0ff9580';ctx.setLineDash([5,5]);
   ctx.beginPath();ctx.moveTo(actor.x,actor.y-17);ctx.lineTo(targetX,25);ctx.stroke();ctx.setLineDash([]);
 }
 if(skillTime>0){
   ctx.strokeStyle='#caff91';ctx.lineWidth=3;ctx.beginPath();
   ctx.arc(actor.x,actor.y,25+Math.round(skillTime*8),0,Math.PI*2);ctx.stroke();
 }
 player(actor.x,actor.y,jersey,number);
 ctx.shadowColor=ball.owner==='shot'?'#ffe970':'#c9faff';ctx.shadowBlur=16;
 ctx.beginPath();ctx.arc(ball.x,ball.y,8,0,Math.PI*2);
 ctx.fillStyle='#fffbe5';ctx.fill();ctx.shadowBlur=0;
 ctx.font='11px system-ui';ctx.fillStyle='#173934';ctx.fillText('✦',ball.x,ball.y+4);
 if(flash){
  ctx.fillStyle=flash>0?'#d0ff4450':'#fa353535';ctx.fillRect(0,0,W,H);
  if(flash>0){
   ctx.fillStyle='#e5ffb8';ctx.textAlign='center';
   ctx.font='900 66px Impact,system-ui';ctx.fillText('GOOOAL!',210,290);
   ctx.font='800 17px system-ui';ctx.fillText('JOZEF FC // '+us+'–'+them,210,321);
  }
 }
 if(mode!=='playing'){
  ctx.fillStyle='#061a23cc';ctx.fillRect(15,210,390,166);
  ctx.textAlign='center';ctx.fillStyle='#dcfe92';ctx.font='900 39px Impact,system-ui';
  ctx.fillText(mode==='ready'?'YOUR PITCH. YOUR RULES.':mode==='paused'?'PAUSED':'FULL TIME',210,273);
  ctx.fillStyle='#e6fbf2';ctx.font='700 16px system-ui';
  ctx.fillText(mode==='ready'?'MOVE • PASS • SHOOT':mode==='paused'?'RESUME WHEN READY':us+' : '+them+'  /  PLAY AGAIN',210,312);
 }
}
function loop(t){
 if(mode!=='playing')return;
 if($('arena')?.classList?.contains('active')===false){pause();draw();return;}
 const graphics=experience?.prefs?.graphics||'auto';
 const rawDelta=rawFrameTick?Math.max(0,t-rawFrameTick):16.667;
 rawFrameTick=t;
 if(graphics==='auto'){
  if(rawDelta>23){slowFrameCount=Math.min(90,slowFrameCount+1);stableFrameCount=0;}
  else {slowFrameCount=Math.max(0,slowFrameCount-2);if(autoBattery&&rawDelta<19)stableFrameCount++;else stableFrameCount=0;}
  if(slowFrameCount>35)autoBattery=true;
  if(stableFrameCount>200){autoBattery=false;slowFrameCount=0;stableFrameCount=0;}
 }
 const fps=graphics==='battery'||(graphics==='auto'&&autoBattery)?30:60;
 if(lastFrameTick&&t-lastFrameTick<(1000/fps)-.7){
  raf=requestAnimationFrame(loop);
  return;
 }
 lastFrameTick=t;
 const dt=last?clamp((t-last)/1000,0,.037):0;last=t;
 if(replay){
  replay.elapsed+=dt;
  if(replay.elapsed>=replay.duration)finishReplay();
 }else if(dt){
  checkpointElapsed+=dt;
  if(checkpointElapsed>=2.5){checkpointElapsed=0;saveMatchSnapshot();}
  captureHistory(dt);update(dt);
  camera=systems.cameraFor(actor,ball,mode,camera,dt,
   Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches),experience?.prefs.camera!==false);
 }
 draw();
 if(mode==='playing')raf=requestAnimationFrame(loop);
}
function bindMove(id,x,y){
 const b=$(id);if(!b)return;
 function down(ev){
  if(mode!=='playing')return;
  ev.preventDefault();
  // Separate pointer IDs allow iPhone players to hold up+left, up+right, etc.
  const key=ev.pointerId==null?id:ev.pointerId;
  heldDirections.set(key,{x,y});
  updateTouchVector();target=null;
  b.classList.add('is-pressed');
  if(b.setPointerCapture&&ev.pointerId!=null){
   try{b.setPointerCapture(ev.pointerId);}catch(_){}
  }
 }
 function up(ev){
  heldDirections.delete(ev.pointerId==null?id:ev.pointerId);
  updateTouchVector();
  if(![...heldDirections.values()].some(d=>d.x===x&&d.y===y))b.classList.remove('is-pressed');
 }
 b.addEventListener('pointerdown',down);
 b.addEventListener('pointerup',up);
 b.addEventListener('pointercancel',up);
 b.addEventListener('lostpointercapture',up);
 b.addEventListener('click',()=>{if(mode!=='playing')return;move(x,y,.13);});
}
bindMove('arena-up',0,-1);bindMove('arena-down',0,1);bindMove('arena-left',-1,0);bindMove('arena-right',1,0);
for(let i=0;i<3;i++)$('arena-aim-'+i)?.addEventListener('click',()=>setAim(i));
$('arena-skill')?.addEventListener('click',skillMove);
$('arena-pass')?.addEventListener('click',pass);
// Swipe left/right on SHOOT for the target corner. Holding briefly charges
// a modest power bonus. Classic clicks, keyboard and gamepads still shoot.
let shootTouch=null,suppressShootClickUntil=0;
const shootButton=$('arena-shoot');
shootButton?.addEventListener('pointerdown',ev=>{
 if(experience?.prefs.mobileLayout!=='immersive'||mode!=='playing'||replay)return;
 if(ev.pointerType==='mouse'&&!window.matchMedia?.('(pointer:coarse)')?.matches)return;
 ev.preventDefault();
 shootTouch={id:ev.pointerId,x:ev.clientX,at:Date.now()};
 shootButton.classList.add('is-charging');
 shootButton.style.setProperty('--arena-charge','0%');
 try{shootButton.setPointerCapture(ev.pointerId);}catch(_){}
});
shootButton?.addEventListener('pointermove',ev=>{
 if(!shootTouch||shootTouch.id!==ev.pointerId)return;
 ev.preventDefault();
 const dx=ev.clientX-shootTouch.x;
 if(dx<-19&&aim!==0)setAim(0);
 else if(dx>19&&aim!==2)setAim(2);
 else if(Math.abs(dx)<10&&aim!==1)setAim(1);
 const charge=Math.min(1,(Date.now()-shootTouch.at)/900);
 shootButton.style.setProperty('--arena-charge',Math.round(charge*88)+'%');
});
function clearCharge(){
 shootTouch=null;
 shootButton?.classList.remove('is-charging');
 shootButton?.style.setProperty('--arena-charge','0%');
}
shootButton?.addEventListener('pointerup',ev=>{
 if(!shootTouch||shootTouch.id!==ev.pointerId)return;
 ev.preventDefault();
 const dx=ev.clientX-shootTouch.x;
 if(dx<-19)setAim(0);
 else if(dx>19)setAim(2);
 else setAim(1);
 const charge=Math.min(1,(Date.now()-shootTouch.at)/900);
 suppressShootClickUntil=Date.now()+450;
 clearCharge();shoot(charge);
});
shootButton?.addEventListener('pointercancel',clearCharge);
shootButton?.addEventListener('lostpointercapture',clearCharge);
shootButton?.addEventListener('click',ev=>{
 if((ev?.detail||0)>0&&Date.now()<suppressShootClickUntil)return;
 shoot();
});
$('arena-start')?.addEventListener('click',()=>{if(mode==='ready'||mode==='over')start();else pause();if(mode!=='playing')draw();});
function aimMovementAtPointer(ev){
 const r=canvas.getBoundingClientRect();
 if(r.width<1||r.height<1)return;
 const point=systems.screenToWorld((ev.clientX-r.left)/r.width*W,(ev.clientY-r.top)/r.height*H,camera);
 target={x:clamp(point.x,24,396),y:clamp(point.y,102,565)};
}
let pitchPointer=null;
canvas.addEventListener('pointerdown',ev=>{
 if(mode==='ready'){start();return;}
 if(replay){finishReplay();return;}
 if(mode!=='playing')return;
 ev.preventDefault();
 pitchPointer=ev.pointerId;
 try{canvas.setPointerCapture?.(ev.pointerId);}catch(_){}
 aimMovementAtPointer(ev);
});
canvas.addEventListener('pointermove',ev=>{
 // Pointer capture keeps drag-to-move responsive when a finger crosses the pitch edge.
 if(mode==='playing'&&!replay&&pitchPointer===ev.pointerId)aimMovementAtPointer(ev);
});
canvas.addEventListener('pointerup',ev=>{
 if(pitchPointer===ev.pointerId)pitchPointer=null;
});
canvas.addEventListener('pointercancel',ev=>{
 if(pitchPointer===ev.pointerId){pitchPointer=null;target=null;}
});
canvas.addEventListener('lostpointercapture',ev=>{
 if(pitchPointer===ev.pointerId)pitchPointer=null;
});
document.addEventListener('keydown',ev=>{
 if(!$('arena')?.classList.contains('active'))return;
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName||''))return;
 const k=ev.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){ev.preventDefault();keys.add(k.startsWith('arrow')?'Arrow'+k.slice(5)[0].toUpperCase()+k.slice(6):k);target=null;}
 if(['1','2','3'].includes(k)){ev.preventDefault();if(!ev.repeat)setAim(Number(k)-1);}
 if(k==='l'){ev.preventDefault();if(!ev.repeat)skillMove();}
 if(k==='j'){ev.preventDefault();if(!ev.repeat)pass();}
 if(k==='k'){ev.preventDefault();if(!ev.repeat)shoot();}
 if(k==='escape'&&mode==='playing')pause();
});
document.addEventListener('keyup',ev=>{
 const k=ev.key.toLowerCase();
 keys.delete(k.startsWith('arrow')?'Arrow'+k.slice(5)[0].toUpperCase()+k.slice(6):k);
});
// Optional physical controllers. The polling loop only runs while a pad is
// connected, and stops on disconnect or when the page becomes hidden.
function pollGamepad(){
 padRaf=0;
 if(!padConnected||document.hidden)return;
 let pads=[];
 try{pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);}catch(_){}
 const active=pads[0];
 if(active){
  const p=systems.readGamepad(active),previous=padPrevious;
  const edge=key=>p[key]&&!previous[key];
  const onArena=$('arena')?.classList?.contains('active')!==false;
  if(onArena){
   padVector=mode==='playing'&&!replay?{x:p.x,y:p.y}:{x:0,y:0};
   if(p.x||p.y)target=null;
   if(edge('toggle')&&$('arena-settings')?.hidden!==false&&$('arena-match-report')?.hidden!==false){
    if(mode==='ready'||mode==='over')start();
    else pause();
   }
   if(mode==='playing'){
    if(replay&&(edge('shoot')||edge('pass')||edge('skill')))finishReplay();
    else if(!replay){
     if(edge('pass'))pass();
     if(edge('shoot'))shoot();
     if(edge('skill'))skillMove();
     if(edge('aimLeft'))setAim((aim+2)%3);
     if(edge('aimRight'))setAim((aim+1)%3);
    }
   }
  }else padVector={x:0,y:0};
  padPrevious=p;
 }else{padVector={x:0,y:0};padPrevious={};}
 padRaf=requestAnimationFrame(pollGamepad);
}
function startGamepadPolling(){
 if(padRaf||!padConnected||document.hidden)return;
 padRaf=requestAnimationFrame(pollGamepad);
}
window.addEventListener('gamepadconnected',()=>{
 padConnected=true;padPrevious={};msg('CONTROLLER READY: A PASS · B SHOOT · X SKILL · START PAUSE');
 startGamepadPolling();
});
window.addEventListener('gamepaddisconnected',()=>{
 let hasPad=false;
 try{hasPad=Array.from(navigator.getGamepads?.()||[]).some(p=>p?.connected);}catch(_){}
 padConnected=hasPad;
 if(!hasPad){
  if(padRaf)cancelAnimationFrame(padRaf);
  padRaf=0;padPrevious={};padVector={x:0,y:0};
 }
});
try{padConnected=Array.from(navigator.getGamepads?.()||[]).some(p=>p?.connected);}catch(_){}
startGamepadPolling();

document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing'){pause();draw();}if(!document.hidden)startGamepadPolling();});
window.addEventListener('blur',()=>{if(mode==='playing'){pause();draw();}});
window.addEventListener('pagehide',()=>{if(mode==='playing')pause();});
window.addEventListener('jozef:squad-updated',()=>{squad=getSquad();hud();});
experience=window.JozefArenaExperience?.mount({
 lifetime,getMode:()=>mode,pause,start,
 saveLifetime:()=>{try{localStorage.setItem(KEY,JSON.stringify(lifetime));}catch(_){}},
 setJoystick:(x,y)=>{joystick={x,y};if(x||y)target=null;},
 refreshGraphics,
 refreshSquad:()=>{squad=getSquad();hud();}
})||null;
window.JozefArena=Object.freeze({getProgress:()=>({...lifetime,score:us+'-'+them,mode,
  matchGoals:us,opponentGoals:them,shots,saves:keeperSaves,aim:SHOT_ZONES[aim].name,
  playerX:actor.x,playerY:actor.y,ballOwner:ball.owner,skillReady:skillCooldown<=0,
  passChain,blockedShots,counterRecoveries,rivalAttacks,counterSeconds:counterTime,
  shotChance:systems.shotProfile((ball.owner==='mate'?mate:actor).y,passChain,squad.shot+Math.min(.18,counterTime*.033),experience?.prefs.difficulty||'pro').onTarget,
  difficulty:experience?.prefs.difficulty||'pro',coins:lifetime.coins,level:systems.progression(lifetime).level,
  controllerConnected:padConnected})});
if(restoreMatchSnapshot())msg('MATCH RESTORED! TAP RESUME WHEN READY.');
hud();draw();
})();
;
