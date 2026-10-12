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

  // Delta-time-stable movement with smooth starts, controlled turns and
  // predictable stops. Works identically for keyboard, touch and gamepads.
  // A brief mobile hold gives a small accuracy and velocity bonus. Tap still
  // fires immediately, and the meter fills only while the finger is down.
  function shotCharge(elapsedMs) {
    return clamp((Number(elapsedMs)||0)/900,0,1);
  }
  function movePlayer(player,velocity,input,dt,speed=190,boost=1,grip=1) {
    const step=clamp(dt,0,.05);
    const mag=Math.hypot(Number(input?.x)||0,Number(input?.y)||0);
    const normalized=mag>.001?{x:(Number(input.x)||0)/Math.max(1,mag),y:(Number(input.y)||0)/Math.max(1,mag)}:{x:0,y:0};
    const response=1-Math.exp(-(mag>.08?15:22)*clamp(grip,.1,1)*step);
    const limit=clamp(speed*boost,0,450);
    const vx=(Number(velocity?.x)||0)+(normalized.x*limit-(Number(velocity?.x)||0))*response;
    const vy=(Number(velocity?.y)||0)+(normalized.y*limit-(Number(velocity?.y)||0))*response;
    const x=clamp((Number(player?.x)||210)+vx*step,24,396);
    const y=clamp((Number(player?.y)||493)+vy*step,102,565);
    return {x,y,vx:x<=24&&vx<0||x>=396&&vx>0?0:vx,vy:y<=102&&vy<0||y>=565&&vy>0?0:vy};
  }
  // Check if a defender is actually between a shooter and a chosen corner.
  // Used for accurate in-game coaching. The physics still resolves real
  // position collisions, so coaching never guarantees a goal.
  function findShotBlocker(shooter,target,defenders,clearance=25) {
    if(!shooter||!target||!Array.isArray(defenders))return null;
    const vx=target.x-shooter.x,vy=target.y-shooter.y,mag2=vx*vx+vy*vy;
    if(mag2<1)return null;
    let closest=null,smallest=Infinity;
    for(const d of defenders){
      if(!d||!Number.isFinite(d.x)||!Number.isFinite(d.y))continue;
      const t=clamp(((d.x-shooter.x)*vx+(d.y-shooter.y)*vy)/mag2,0,1);
      if(t<.12||t>.94)continue;
      const distance=Math.hypot(d.x-(shooter.x+t*vx),d.y-(shooter.y+t*vy));
      if(distance<clearance&&distance<smallest){closest=d;smallest=distance;}
    }
    return closest;
  }
  function feintTargets(actor,defenders,radius=76) {
    if(!actor||!Array.isArray(defenders))return [];
    const max=clamp(radius,24,110);
    const affected=[];
    for(let i=0;i<defenders.length;i++){
      const d=defenders[i];
      if(d&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&
        d.y<=actor.y+22&&distance(actor,d)<=max)affected.push(i);
    }
    return affected;
  }
  const AIM_LANES=Object.freeze([{x:171,name:'LEFT'},{x:210,name:'CENTRE'},{x:249,name:'RIGHT'}]);
  function bestShotLane(shooter,defenders,aimX=210) {
    const selected=AIM_LANES.reduce((closest,z,i)=>
      Math.abs(z.x-aimX)<Math.abs(AIM_LANES[closest].x-aimX)?i:closest,1);
    const blocked=AIM_LANES.map(z=>Boolean(findShotBlocker(shooter,{x:z.x,y:16},defenders)));
    const open=blocked.map((isBlocked,i)=>!isBlocked?i:-1).filter(i=>i>=0);
    // Preserve the player's chosen target whenever it is open. Suggestions
    // never change the actual shot direction or override a swipe.
    const alternative=open.length?open.reduce((best,i)=>
      Math.abs(i-selected)<Math.abs(best-selected)?i:best,open[0]):-1;
    return {selected,blocked,alternative,hasOpenLane:open.length>0};
  }
  function tacticalRead(actor,mate,defenders,ball,aimX=210,accuracy=.2) {
    const owner=ball?.owner;
    if(owner==='rival')return {kind:'defend',label:'CHASE & TACKLE',hint:'Use BOOST to win the ball',threat:false};
    if(owner==='free')return {kind:'recover',label:'CHASE THE BALL',hint:'Collect the rebound',threat:false};
    if(owner==='shot')return {kind:'shoot',label:'BALL IN FLIGHT',hint:'Follow the shot',threat:false};
    if(owner==='pass')return {kind:'pass',label:'PASS IN FLIGHT',hint:'Keep moving',threat:false};
    if(owner==='mate')return {kind:'pass',label:'ONE-TWO READY',hint:'PASS brings Jozef the ball',threat:false};
    const shooter=actor||{x:210,y:493};
    const lanes=bestShotLane(shooter,defenders,aimX);
    const forward=(Number(shooter.y)||493)>300;
    if(forward||accuracy<.37)return {kind:'advance',label:'DRIVE FORWARD',hint:'Get closer for a better shot',threat:false};
    if(lanes.blocked[lanes.selected]){
      if(lanes.hasOpenLane)return {
        kind:'aim',label:'SWIPE '+AIM_LANES[lanes.alternative].name,
        hint:'Clearer shooting lane',threat:true,recommendedAim:lanes.alternative
      };
      return {kind:'pass',label:'PASS INTO SPACE',hint:'Move sideways or PASS',threat:true};
    }
    return {kind:'shoot',label:'SHOOT NOW',hint:'Swipe SHOOT to aim',threat:false};
  }
  // FLOW rewards considered play without making weak long-range shots
  // automatic goals. It is a match-only meter, not a paid currency.
  const FLOW_REWARDS=Object.freeze({pass:18,oneTwo:10,recovery:26,feint:14,goal:20});
  function flowChange(current,event){
    const n=clamp(current,0,100);
    if(event==='lost')return clamp(n-38,0,100);
    if(event==='miss')return clamp(n-14,0,100);
    if(event==='used')return 12;
    return clamp(n+(FLOW_REWARDS[event]||0),0,100);
  }
  function flowShotProfile(profile,current){
    if(!profile)return profile;
    // Full meter adds up to eight percentage points, not guaranteed success.
    return current>=100?{...profile,onTarget:clamp(profile.onTarget+.08,0,.94),flow:true}:profile;
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

  // ---- Wacky Rules: optional silly match twists. Pure helpers, no storage. ----
  const WACKY_RULES=Object.freeze([
    Object.freeze({id:'moon',label:'MOON GRAVITY',icon:'🌙',blurb:'The ball floats and bounces on and on.'}),
    Object.freeze({id:'giant',label:'GIANT BALL',icon:'⚽',blurb:'A huge ball that is easy to grab.'}),
    Object.freeze({id:'tiny',label:'TINY BALL',icon:'🔸',blurb:'A teeny ball. Stay close to keep it!'}),
    Object.freeze({id:'banana',label:'BANANA PITCH',icon:'🍌',blurb:'Everybody slides on the slippery grass.'}),
    Object.freeze({id:'bighead',label:'BIG HEADS',icon:'🤪',blurb:'Every head is enormous. Just for laughs.'}),
    Object.freeze({id:'goldrain',label:'GOLD RAIN',icon:'🪙',blurb:'Coins fall from the sky. Grab them for stars!'}),
    Object.freeze({id:'mirror',label:'MIRROR MODE',icon:'🪞',blurb:'Your controls are flipped. Good luck!'})
  ]);
  const WACKY_IDS=WACKY_RULES.map(r=>r.id);
  function wackyChoiceValid(choice){return choice==='off'||choice==='spin'||choice==='double'||WACKY_IDS.includes(choice);}
  function rulesForChoice(choice,rand=Math.random) {
    if(choice==='spin'||choice==='double'){
      const pool=WACKY_IDS.slice(),want=choice==='double'?2:1,out=[];
      while(out.length<want&&pool.length){
        const index=Math.min(pool.length-1,Math.floor(clamp(rand(),0,.9999)*pool.length));
        const id=pool.splice(index,1)[0];
        // A giant and a tiny ball would cancel out, so never pair them.
        if((id==='giant'&&out.includes('tiny'))||(id==='tiny'&&out.includes('giant')))continue;
        out.push(id);
      }
      return out;
    }
    return WACKY_IDS.includes(choice)?[choice]:[];
  }
  function wackyEffects(ids) {
    const set=new Set(Array.isArray(ids)?ids.filter(id=>WACKY_IDS.includes(id)):[]);
    return {
      rules:WACKY_IDS.filter(id=>set.has(id)),
      friction:set.has('moon')?.25:1,
      bounce:set.has('moon')?.9:.55,
      pickup:set.has('giant')?1.45:set.has('tiny')?.72:1,
      ballScale:set.has('giant')?1.7:set.has('tiny')?.6:1,
      grip:set.has('banana')?.28:1,
      headScale:set.has('bighead')?1.9:1,
      mirror:set.has('mirror'),
      coins:set.has('goldrain')
    };
  }
  // Gold Rain: at most three coins on the pitch, each lasts eight seconds.
  const COIN_LIMIT=3,COIN_LIFE=8;
  const freshCoins=()=>({list:[],clock:1.8,collected:0});
  function spawnCoin(rand=Math.random) {
    return {x:Math.round(46+clamp(rand(),0,1)*328),y:Math.round(130+clamp(rand(),0,1)*350),age:0};
  }
  function stepCoins(state,dt,player,rand=Math.random,radius=24) {
    if(!state||!Array.isArray(state.list))return 0;
    const step=clamp(dt,0,.1);let got=0;
    state.clock+=step;
    for(const coin of state.list)coin.age+=step;
    state.list=state.list.filter(coin=>{
      if(player&&distance(coin,player)<radius){got++;return false;}
      return coin.age<COIN_LIFE;
    });
    if(state.clock>=2.6&&state.list.length<COIN_LIMIT){state.clock=0;state.list.push(spawnCoin(rand));}
    state.collected=(state.collected||0)+got;
    return got;
  }

  // ---- Ghost races: a compact recording of one match that can be raced again,
  // or shared as a short text code. Decoding treats every code as untrusted. ----
  const GHOST_STEP=.2,GHOST_MAX=380,GHOST_PREFIX='JG1.';
  const asInt=(n,lo,hi)=>Math.round(clamp(Number(n),lo,hi));
  function cleanGhostName(name) {
    return String(name==null?'':name).replace(/[^A-Za-z0-9 ]/g,'').replace(/\s+/g,' ').trim().slice(0,12).toUpperCase();
  }
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  // Self-contained base64url: works in any browser or test runtime, with no Buffer or btoa needed.
  function b64Encode(bytes) {
    let out='';
    for(let i=0;i<bytes.length;i+=3){
      const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0;
      const n=(a<<16)|(b<<8)|c;
      out+=B64[(n>>18)&63]+B64[(n>>12)&63];
      if(i+1<bytes.length)out+=B64[(n>>6)&63];
      if(i+2<bytes.length)out+=B64[n&63];
    }
    return out;
  }
  function b64Decode(text) {
    if(typeof text!=='string'||!/^[A-Za-z0-9_-]*$/.test(text)||text.length%4===1)return null;
    const out=[];
    let bits=0,count=0;
    for(let i=0;i<text.length;i++){
      bits=(bits<<6)|B64.indexOf(text[i]);count+=6;
      if(count>=8){count-=8;out.push((bits>>count)&255);bits&=(1<<count)-1;}
    }
    return new Uint8Array(out);
  }
  function encodeGhost(rec) {
    const samples=(Array.isArray(rec?.samples)?rec.samples:[]).slice(0,GHOST_MAX);
    if(samples.length<10)return null;
    const bytes=new Uint8Array(samples.length*2);
    samples.forEach((p,i)=>{
      bytes[i*2]=Math.round(clamp(Array.isArray(p)?p[0]:0,0,420)/2);
      bytes[i*2+1]=Math.round(clamp(Array.isArray(p)?p[1]:0,0,600)/3);
    });
    const header={
      n:cleanGhostName(rec.name)||'GHOST',u:asInt(rec.us,0,99),t:asInt(rec.them,0,99),
      g:(Array.isArray(rec.goals)?rec.goals:[]).slice(0,9).map(x=>Math.round(clamp(x,0,80)*10)/10),
      w:wackyEffects(rec.rules).rules,l:samples.length
    };
    const json=JSON.stringify(header),head=new Uint8Array(json.length);
    for(let i=0;i<json.length;i++)head[i]=json.charCodeAt(i)&127;
    return GHOST_PREFIX+b64Encode(head)+'.'+b64Encode(bytes);
  }
  function decodeGhost(code) {
    if(typeof code!=='string')return null;
    const text=code.trim();
    if(text.length>2600||!text.startsWith(GHOST_PREFIX))return null;
    const parts=text.slice(GHOST_PREFIX.length).split('.');
    if(parts.length!==2)return null;
    const hb=b64Decode(parts[0]),db=b64Decode(parts[1]);
    if(!hb||!db||hb.length>400||db.length%2||db.length<20||db.length>GHOST_MAX*2)return null;
    let header;
    try{header=JSON.parse(String.fromCharCode.apply(null,Array.from(hb)));}catch(_){return null;}
    if(!header||typeof header!=='object'||Array.isArray(header)||header.l!==db.length/2)return null;
    const samples=[];
    for(let i=0;i<db.length;i+=2){
      const x=db[i]*2,y=db[i+1]*3;
      if(x>420||y>600)return null;
      samples.push([x,y]);
    }
    const goals=(Array.isArray(header.g)?header.g:[]).slice(0,9).map(Number).filter(Number.isFinite).map(x=>clamp(x,0,80));
    return {
      name:cleanGhostName(header.n)||'GHOST',us:asInt(header.u,0,99),them:asInt(header.t,0,99),
      goals,rules:wackyEffects(header.w).rules,samples
    };
  }
  function ghostAt(ghost,seconds) {
    const samples=ghost?.samples;
    if(!Array.isArray(samples)||!samples.length)return null;
    const position=clamp(seconds,0,1e6)/GHOST_STEP;
    const last=samples.length-1,index=Math.min(last,Math.floor(position));
    const next=Math.min(last,index+1),mix=Math.min(1,position-index);
    const a=samples[index],b=samples[next];
    return {x:a[0]+(b[0]-a[0])*mix,y:a[1]+(b[1]-a[1])*mix,finished:position>=last};
  }
  function ghostScoreAt(ghost,seconds) {
    return (Array.isArray(ghost?.goals)?ghost.goals:[]).filter(t=>t<=seconds).length;
  }
  const ghostRank=rec=>(Number(rec?.us)||0)-(Number(rec?.them)||0)+(Number(rec?.us)||0)/100;
  return Object.freeze({
    clamp,distance,DIFFICULTIES,joystickVector,
    defenderDestination,teammateDestination,rivalRunTarget,counterSupportTarget,rivalThreatChance,shotCharge,movePlayer,feintTargets,findShotBlocker,bestShotLane,tacticalRead,shotAccuracy,shotProfile,shotTarget,keeperCommit,readGamepad,
    flowChange,flowShotProfile,cameraFor,screenToWorld,dailyKey,CHALLENGES,freshDaily,normalizeDaily,awardDaily,progression,
    WACKY_RULES,wackyChoiceValid,rulesForChoice,wackyEffects,freshCoins,spawnCoin,stepCoins,
    GHOST_STEP,cleanGhostName,encodeGhost,decodeGhost,ghostAt,ghostScoreAt,ghostRank
  });
});