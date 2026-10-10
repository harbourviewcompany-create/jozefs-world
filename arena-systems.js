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