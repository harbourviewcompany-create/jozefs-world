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
  function shotAccuracy(y,shotBonus,difficulty='pro') {
    const factor=DIFFICULTIES[difficulty]||DIFFICULTIES.pro;
    return clamp(Math.max(1,(y-122)/23)*(1-clamp(shotBonus,0,.4))*factor.pressure,1,26);
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
    if(!enabled||reduceMotion) return {x:210,y:300,zoom:1};
    const carrier=ball?.owner==='mate'?ball:actor;
    const attack=clamp((390-carrier.y)/320,0,1);
    const targetZoom=mode==='playing'?1.10+attack*.22:1;
    const maxX=210-210/targetZoom,maxY=300-300/targetZoom;
    const desiredX=clamp(210+(carrier.x-210)*.40,210-maxX,210+maxX);
    const desiredY=clamp(300+(carrier.y-300)*.35,300-maxY,300+maxY);
    const prior=oldCamera||{x:210,y:300,zoom:1};
    const k=clamp((dt||.016)*5,0,1);
    return {
      x:prior.x+(desiredX-prior.x)*k,
      y:prior.y+(desiredY-prior.y)*k,
      zoom:prior.zoom+(targetZoom-prior.zoom)*k
    };
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
    defenderDestination,teammateDestination,shotAccuracy,keeperCommit,readGamepad,
    cameraFor,screenToWorld,dailyKey,CHALLENGES,freshDaily,normalizeDaily,awardDaily,progression
  });
});