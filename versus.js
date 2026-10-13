/* Versus: a private two-player pitch. Host runs the ball. Live only while both are in the room. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('versus-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 720, H = 420;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  let portrait=false,cameraFlipped=false,screenScale=1,screenX=0,screenY=0,cameraW=0,cameraH=0;
  function fitCamera(){
    const next=window.innerHeight>window.innerWidth;
    cameraFlipped=next&&(room.together||room.who==='Jozef');
    const width=Math.max(1,Math.round(canvas.clientWidth||canvas.parentElement?.clientWidth||(next?420:720)));
    const height=Math.max(1,Math.round(canvas.clientHeight||canvas.parentElement?.clientHeight||(next?720:420)));
    if(next!==portrait||width!==cameraW||height!==cameraH){portrait=next;cameraW=width;cameraH=height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    canvas.style.width='100%';canvas.style.height='100%';canvas.style.maxHeight='none';canvas.style.aspectRatio='auto';canvas.style.objectFit='fill';
    const vw=portrait?H:W,vh=portrait?W:H;
    screenScale=Math.max(width/vw,height/vh);
    screenX=(width-vw*screenScale)/2;screenY=(height-vh*screenScale)/2;
    // During portrait matches, keep the defending goal below the score HUD and
    // the controlled attacker above the action controls. Scale is still uniform.
    if(portrait && ['playing','countdown','finished'].includes(room.phase)){
      const rect=canvas.getBoundingClientRect();
      const scoreboard=document.querySelector('#versus .versus-scoreboard')?.getBoundingClientRect();
      const controls=document.querySelector('#versus .versus-play')?.getBoundingClientRect();
      const hudBottom=scoreboard?.bottom-rect.top||0;
      const controlsTop=controls?.top-rect.top||height;
      const topInset=Math.max(72,Math.min(height*.3,hudBottom+18));
      const playableEnd=Math.min(height-65,controlsTop-54);
      if(playableEnd>topInset+100){
        // Initial attacker starts 560 world units from the opposing goal.
        // Reserve room for the player sprite, the scoreboard and touch controls.
        const scale=(playableEnd-topInset)/560;
        screenScale=Math.max(.3,Math.min(width/vw,scale));
        screenX=(width-vw*screenScale)/2;
        screenY=topInset;
      }
    }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(portrait){
      if(cameraFlipped){ctx.translate(screenX,screenY+W*screenScale);ctx.scale(screenScale,screenScale);ctx.rotate(-Math.PI/2);}
      else {ctx.translate(screenX+H*screenScale,screenY);ctx.scale(screenScale,screenScale);ctx.rotate(Math.PI/2);}
    }else{ctx.translate(screenX,screenY);ctx.scale(screenScale,screenScale);}
  }
  const GOAL = { x: 36, y: 150, w: 18, h: 120 };
  const room = { code: '', who: 'Dad', spot: 'forward', otherSpot: 'forward', pending: null, together: false, peer: null, conn: null, host: false, other: '', ready: false, remoteReady: false, practice: false, phase: 'lobby', remoteActive: true };
  const keeperTargets={left:null,right:null},dekeReady={Dad:0,Jozef:0};
  const keeperSide=who=>room.together?'left':who==='Dad'?'right':'left';
  const isKeeper=who=>who===room.who?room.spot==='keeper':room.otherSpot==='keeper';
  let connectTimer, countdownTimer, lastPacket = 0, lastSent = 0, lastHello = 0, localActive = true;
  let stickVector=null;
  const SHOT_LANES=[160,210,260],shotOptions={Dad:{aim:1,power:1},Jozef:{aim:1,power:1},Rovers:{aim:1,power:1,mode:'shot'}};
  let selectedAim=1,chargingSince=0,chargeFill=0;
  function pickAim(value){
    selectedAim=Math.max(0,Math.min(2,Math.round(value)));
    const label=['TOP','MIDDLE','BOTTOM'][selectedAim];
    const aimLabel=$('versus-aim').querySelector('.vs-action-label');if(aimLabel)aimLabel.textContent=label;else $('versus-aim').textContent=label+' ↻';
    $('versus-aim').setAttribute('aria-label','Aim '+label+'. Tap to change.');
  }
  function localKick(power=1){
    if(room.phase!=='playing'||!localActive||!room.remoteActive||isKeeper(room.who))return;
    const p=room.who==='Dad'?state.dad:state.jozef;
    if(Math.hypot(p.x-state.ball.x,p.y-state.ball.y)>92){$('versus-tip').textContent='GET CLOSE TO THE BALL';return;}
    const shot={aim:selectedAim,power:Math.max(.9,Math.min(1.6,power)),mode:'shot'};
    if(room.host){shotOptions[room.who]=shot;state.kick=room.who;}
    else send({type:'kick',aim:shot.aim,power:shot.power,mode:shot.mode});
    $('versus-tip').textContent='TARGET '+['TOP','MIDDLE','BOTTOM'][selectedAim];
  }
  const keys = new Set();
  const state = {
    ball: { x: 360, y: 210, vx: 0, vy: 0 },
    dad: { x: 560, y: 210, vx: 0, vy: 0, face: -1 },
    jozef: { x: 160, y: 210, vx: 0, vy: 0, face: 1 },
    rival: { x: 530, y: 210, vx: 0, vy: 0, face: -1, stun: 0 },
    overtime: false,
    matchId: '',
    score: { dad: 0, jozef: 0 },
    matchLeft: 120,
    call: 'Kickoff',
    star: { x: 360, y: 120, on: true }, super: '',
    keepers: { left: 210, right: 210 },
    shots: 0, saves: 0
  };
  const keeperState = { left: { commit: 0, target: 210 }, right: { commit: 0, target: 210 } };
  const targets = { Dad: null, Jozef: null };
  let kickLock = 0;
  // Host-authoritative stamina keeps two-player matches fair.
  const sprintUntil={Dad:0,Jozef:0},sprintReady={Dad:0,Jozef:0};
  let nextLocalSprint=0;
  function activateSprint(who){
    if(!room.host||room.phase!=='playing'||!['Dad','Jozef'].includes(who))return false;
    const now=performance.now();
    if(now<sprintReady[who])return false;
    sprintUntil[who]=now+1100;sprintReady[who]=now+6200;return true;
  }
  function sprint(){
    if(room.phase!=='playing'||!localActive||!room.remoteActive)return;
    const now=performance.now();if(now<nextLocalSprint)return;
    if(room.host&&!activateSprint(room.who))return;
    if(!room.host)send({type:'sprint'});
    nextLocalSprint=now+6200;
    $('versus-tip').textContent='SPRINT BURST / GET OPEN';
  }
  const PRACTICE_KEY='jozefs-world-versus-v1';
  const cpuOptions={rookie:1.55,pro:2.45,legend:3.2};
  let cpuDifficulty='pro',lastBotKick=-100,savedMatch=false,practiceSeconds=120,kickoffHold=0;
  const safeCount=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,99999):0;
  function readPractice(){
    try{const r=JSON.parse(localStorage.getItem(PRACTICE_KEY)||'null');
      if(!r||typeof r!=='object'||Array.isArray(r))throw Error('No record');
      return {played:safeCount(r.played),wins:safeCount(r.wins),draws:safeCount(r.draws),
        streak:safeCount(r.streak),bestStreak:safeCount(r.bestStreak)};
    }catch(_){return {played:0,wins:0,draws:0,streak:0,bestStreak:0};}
  }
  function renderPracticeRecord(){
    const r=readPractice(),node=$('versus-practice-record');
    if(node)node.textContent=r.played+' PLAYED / '+r.wins+' WON / BEST STREAK '+r.bestStreak;
  }
  function finishPractice(){
    if(!room.practice||savedMatch)return;
    savedMatch=true;
    const r=readPractice(),winner=state.score.dad===state.score.jozef?'Draw':
      state.score.dad>state.score.jozef?'Dad':'Jozef';
    r.played=Math.min(99999,r.played+1);
    if(winner==='Draw')r.draws=Math.min(99999,r.draws+1);
    if(winner===room.who){r.wins=Math.min(99999,r.wins+1);r.streak=Math.min(99999,r.streak+1);}
    else r.streak=0;
    r.bestStreak=Math.max(r.bestStreak,r.streak);
    try{localStorage.setItem(PRACTICE_KEY,JSON.stringify(r));}catch(_){/* Privacy mode. */}
    renderPracticeRecord();
    window.dispatchEvent(new CustomEvent('jozef:versus-completed',{
      detail:{practice:true,winner,difficulty:cpuDifficulty,dad:state.score.dad,jozef:state.score.jozef}
    }));
  }
  const trail = [];
  const sparks = [];
  let tick = 0;
  let lastCall = '',callFlashUntil=0;
  let shake = 0;

  let soundContext=null;
  function tone(freqs, type) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try { if (localStorage.getItem('jozefs-world-voice-alerts') === 'off') return; } catch { /* play */ }
    try { if(!soundContext)soundContext=new AudioCtx(); } catch { return; }
    const ctx=soundContext;
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.08 + 0.22);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.24);
    });
  }
  function whistle() { tone([880, 880], 'square'); }
  function net() { tone([220, 180, 140], 'sawtooth'); }
  function punch() { tone([140], 'square'); }
  function chime() { tone([494,659,880], 'sine'); }
  function voice(line) {
    try { if (localStorage.getItem('jozefs-world-voice-alerts') === 'off' || !window.speechSynthesis) return; } catch { /* speak */ }
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const call = new SpeechSynthesisUtterance(line);
    call.rate = 0.95;
    call.pitch = /Dad/.test(line) ? 0.75 : 1.25;
    window.speechSynthesis.speak(call);
  }
  // Imported device backups are user-controlled data: validate before rendering.
  function readSeason(){
    try{
      const raw=JSON.parse(localStorage.getItem('jozefs-world-season')||'[]');
      return Array.isArray(raw)?raw.filter(s=>typeof s==='string'&&/^\d{1,2}-\d{1,2}$/.test(s)).slice(0,5):[];
    }catch(_){return [];}
  }
  let resultRecorded=false;
  function paintSeason(){
    const season=readSeason(),list=$('versus-season-list'),line=$('versus-season');
    if(list)list.replaceChildren(...season.map(score=>{
      const li=document.createElement('li');li.textContent=score;return li;
    }));
    if(!line)return;
    const dad=season.filter(s=>{const [j,d]=s.split('-').map(Number);return d>j;}).length;
    const jozef=season.filter(s=>{const [j,d]=s.split('-').map(Number);return j>d;}).length;
    const text=season.length?'Season: Jozef '+jozef+' · Dad '+dad:'Season: no matches yet.';
    line.textContent=text;
    const lobby=$('versus-season-line'); if(lobby) lobby.textContent=text;
    const streak=Number(localStorage.getItem('jozefs-world-versus-streak')||0);
    const trophy=$('hq-trophy'), cup=$('versus-trophy');
    if(trophy) trophy.hidden=streak<3;
    if(cup) cup.hidden=streak<3;
  }
  function say(text){
    const node=$('versus-status');
    if(node)node.textContent=text;
    const stats=$('versus-stats');
    if(stats)stats.textContent=(state.shots||0)+' shots · '+(state.saves||0)+' saves';
    const result=$('today-versus-result');
    if(!result||room.phase!=='finished'||room.practice||resultRecorded||!/wins|draw/i.test(text))return;
    resultRecorded=true; // Duplicate network packets are never counted twice in this tab.
    result.textContent=text;
    const matchId=typeof state.matchId==='string'&&/^[A-Za-z0-9-]{10,80}$/.test(state.matchId)?state.matchId:'';
    if(room.together){
      try{localStorage.setItem('jozefs-world-coop-result',text);}catch(_){}
      return;
    }
    const score=state.score.jozef+'-'+state.score.dad;
    const persist=()=>{
      try {
        // A named Web Lock serializes read-modify-write across same-origin tabs.
        // Without the lock, two tabs can both read the old list and count once each.
        const idKey='jozefs-world-season-match-ids';
        const old=JSON.parse(localStorage.getItem(idKey)||'[]');
        const ids=Array.isArray(old)?old.filter(x=>typeof x==='string').slice(0,19):[];
        if(!matchId||!ids.includes(matchId)){
          const season=readSeason();
          season.unshift(score);
          localStorage.setItem('jozefs-world-season',JSON.stringify(season.slice(0,5)));
          if(matchId)localStorage.setItem(idKey,JSON.stringify([matchId,...ids].slice(0,20)));
          localStorage.setItem('jozefs-world-versus-result',text);
        }
      }catch(_){/* Storage can be disabled or full. */}
      paintSeason();
    };
    if(matchId&&typeof navigator.locks?.request==='function'){
      navigator.locks.request('jozefs-world-versus-season',persist).catch(persist);
    }else persist();
  }
  function lights() {
    $('light-dad')?.classList.toggle('on', room.who === 'Dad' || room.other === 'Dad');
    $('light-jozef')?.classList.toggle('on', room.who === 'Jozef' || room.other === 'Jozef');
  }

  // Static stadium is rendered once; animation only redraws athletes and effects.
  const stadium = document.createElement('canvas'); stadium.width = W * dpr; stadium.height = H * dpr;
  const paint = stadium.getContext('2d'); paint.scale(dpr,dpr);
  function buildStadium(){window.JozefVersusVisual.stadium(paint,W,H);}
    buildStadium();
  function pitch(){ctx.drawImage(stadium,0,0,W,H);}
  function jozefKit() {
    try {
      const saved = JSON.parse(localStorage.getItem('jozefs-world-sports-v1') || '{}');
      const team = saved.soccer && saved.soccer.team;
      const colors = { 'Atlético Ottawa': '#e10600', 'Inter Miami CF': '#f7b5cd', Arsenal: '#ef0107', Liverpool: '#c8102e', 'Manchester City': '#6cabdd', Chelsea: '#034694', Barcelona: '#a50044', 'Real Madrid': '#f5f5f5' };
      return colors[team] || '#60c5ff';
    } catch { return '#60c5ff'; }
  }
  function player(p,color,name){window.JozefVersusVisual.player(ctx,p,color,name,name===room.who,portrait,tick,cameraFlipped);}

    function keeper(side, color, name) {
    const body = { x: side === 'left' ? 52 : 668, y: state.keepers?.[side] || 210, vx: 0, vy: 0, face: side === 'left' ? 1 : -1 };
    player(body, color, name);
  }
  function mindKeepers() {
    state.keepers=state.keepers||{left:210,right:210};
    for(const side of ['left','right']){
      const controlled=[room.who,room.other].some(who=>['Dad','Jozef'].includes(who)&&isKeeper(who)&&keeperSide(who)===side);
      if(controlled){
        const target=keeperTargets[side];
        if(Number.isFinite(target))state.keepers[side]+=Math.max(-5,Math.min(5,target-state.keepers[side]));
      }else{
        const mind=keeperState[side],ball=state.ball;
        const shot=side==='left'?ball.vx< -2.4&&ball.x<220:ball.vx>2.4&&ball.x>500;
        if(shot&&mind.commit<=0){mind.target=ball.y<190?168:ball.y>230?252:210;mind.commit=26;}
        if(mind.commit>0){state.keepers[side]+=(mind.target-state.keepers[side])*.22;mind.commit--;}
        else {const watch=side==='left'?ball.x<360:ball.x>360;
          state.keepers[side]+=((watch?210+(ball.y-210)*.25:210)-state.keepers[side])*.05;}
      }
      state.keepers[side]=Math.max(GOAL.y+12,Math.min(GOAL.y+GOAL.h-12,state.keepers[side]));
    }
  }
  function save(side) {
    const manual=[room.who,room.other].some(who=>['Dad','Jozef'].includes(who)&&isKeeper(who)&&keeperSide(who)===side);
    if(!manual&&keeperState[side].commit<10)return false;
    return Math.abs(state.ball.y-(state.keepers?.[side]||210))<(manual?20:12);
  }
  function burst(x, y, color, n) {
    if(reduced.matches)return;
    for (let i = 0; i < n; i++) sparks.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.8) * 6, life: 18, color });
  }
  const visualPositions={};
  function visualPose(p,key){
    const previous=visualPositions[key];
    if(room.host||room.phase!=='playing'||!previous||Math.hypot(previous.x-p.x,previous.y-p.y)>120){visualPositions[key]={...p};}
    else {previous.x+=(p.x-previous.x)*.4;previous.y+=(p.y-previous.y)*.4;previous.vx=p.vx;previous.vy=p.vy;previous.face=p.face;}
    return visualPositions[key];
  }
  function draw() {
    if (!ctx) return;
    fitCamera();
    tick += 1;
    const ball=visualPose(state.ball,'ball');
    ctx.save();
    if (shake > 0 && !reduced.matches) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake -= 1; }
    pitch();
    if (/GOAL|scores/.test(state.call||'')) { ctx.fillStyle='rgba(255,220,80,.08)'; ctx.fillRect(0,0,W,H); }
    for (const side of ['left','right']) {
      const x = side==='left'?10:688, near = side==='left'?state.ball.x<80:state.ball.x>W-80;
      if (near) { ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(x,150); ctx.quadraticCurveTo(x+(side==='left'?18:-18), state.ball.y, x, 270); ctx.stroke(); }
    }
    const me=room.who==='Dad'?state.dad:state.jozef;
    if(room.phase==='playing'&&!isKeeper(room.who)&&Math.hypot(me.x-ball.x,me.y-ball.y)<110){
      const gx=room.together?686:room.who==='Dad'?34:686,gy=SHOT_LANES[selectedAim];
      ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle=room.who==='Dad'?'#d7ff4a':'#7ee0ff';ctx.lineWidth=2;
      ctx.setLineDash([6,9]);ctx.beginPath();ctx.moveTo(ball.x,ball.y);ctx.lineTo(gx,gy);ctx.stroke();
      ctx.setLineDash([]);ctx.globalAlpha=1;ctx.beginPath();ctx.arc(gx,gy,12,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    // Readable possession halo makes it clear when shooting is possible.
    if(room.phase==='playing'&&!isKeeper(room.who)&&Math.hypot(me.x-ball.x,me.y-ball.y)<45){
      ctx.save();ctx.strokeStyle=room.who==='Dad'?'#d7ff4a':'#77e4ff';
      ctx.globalAlpha=.7;ctx.lineWidth=2.2;
      ctx.beginPath();ctx.ellipse(me.x,me.y+23,30,11,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    const sweep = (Math.sin(tick * 0.02) + 1) / 2;
    const glow = ctx.createRadialGradient(80 + sweep * 560, 8, 10, 360, 180, 420);
    glow.addColorStop(0, 'rgba(180,255,255,0.10)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    if (state.call && state.call !== lastCall && /scores|GOAL|Saved|Full time|post|Kickoff|Star|SUPER/.test(state.call)) { burst(ball.x, ball.y, state.call.includes('Dad') ? '#d7ff4a' : '#7ee0ff', 36); shake = 14; if (/scores/.test(state.call)) { net(); navigator.vibrate?.(40); } else if (/Saved/.test(state.call)) { punch(); navigator.vibrate?.(20); } else if (/Kickoff/.test(state.call)) whistle(); else chime(); voice(state.call); document.querySelector('.versus-scoreboard')?.classList.add('goal'); setTimeout(() => document.querySelector('.versus-scoreboard')?.classList.remove('goal'), 900); }
    if(state.call!==lastCall)callFlashUntil=performance.now()+950;
    lastCall = state.call;
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 8) trail.shift();
    trail.forEach((bit, i) => {
      ctx.fillStyle = 'rgba(74,221,255,' + (i / trail.length * 0.48) + ')';
      ctx.beginPath(); ctx.arc(bit.x, bit.y, 3 + i * 0.3, 0, Math.PI * 2); ctx.fill();
    });
    sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.life -= 1; ctx.fillStyle = s.color; ctx.globalAlpha = Math.max(0, s.life / 18); ctx.fillRect(s.x, s.y, 4, 4); ctx.globalAlpha = 1; });
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    if (state.star?.on) window.JozefVersusVisual.star(ctx,state.star,tick,reduced.matches);
    for (const p of [state.dad, state.jozef]) {
      if (Math.hypot(p.vx,p.vy)>1.2 && tick%4===0) sparks.push({x:p.x,y:p.y+16,vx:(Math.random()-.5)*.4,vy:.2,life:10,color:'#c8b48a'});
    }
    if(!isKeeper('Jozef'))player(visualPose(state.jozef,'jozef'),jozefKit(),room.practice&&room.who!=='Jozef'?'Rovers':'Jozef');
    if(!isKeeper('Dad'))player(visualPose(state.dad,'dad'),'#d7ff4a',room.practice&&room.who!=='Dad'?'Rovers':'Dad');
    if(room.together)player(visualPose(state.rival,'rival'),'#ff866f','Rovers');
    const userKeeper=side=>[room.who,room.other].find(who=>['Dad','Jozef'].includes(who)&&isKeeper(who)&&keeperSide(who)===side);
    keeper('left','#f4f7f2',userKeeper('left')||'Keeper');
    keeper('right','#f4f7f2',userKeeper('right')||'Keeper');
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.33)';ctx.beginPath();ctx.ellipse(ball.x+3,ball.y+6,9,3,0,0,Math.PI*2);ctx.fill();
    window.JozefVersusVisual.ball(ctx,ball,Math.hypot(state.ball.vx,state.ball.vy));
    ctx.restore();
    /* scoreboard is accessible HTML outside the canvas */
    /* ctx.fillStyle = '#08140f';
    ctx.fillRect(W / 2 - 78, 4, 156, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '800 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.score.jozef + '  ·  ' + state.score.dad + '   ' + Math.ceil(state.matchLeft || 0) + 's', W / 2, 22);
    */
    if (/scores/.test(state.call)) { ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(state.ball.x<W/2?20:W-20, state.ball.y, 16, 28, 0, 0, Math.PI*2); ctx.fill(); }
    if (state.call && performance.now()<callFlashUntil) {
      const pop = /scores|Full time/.test(state.call) ? 1.15 : 1;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      if(portrait)ctx.rotate(cameraFlipped?Math.PI/2:-Math.PI/2);
      ctx.scale(pop, pop);
      ctx.fillStyle = /scores/.test(state.call) ? 'rgba(202,250,96,.92)' : 'rgba(8,20,15,.82)';
      ctx.fillRect(-120, -22, 240, 44);
      ctx.fillStyle = /scores/.test(state.call) ? '#102018' : '#fff';
      ctx.font = '900 22px system-ui';
      ctx.fillText(state.call, 0, 6);
      ctx.restore();
    }
    ctx.restore();
  }

  function move(p, target, pace = 3.1) {
    const speed = Math.hypot(p.vx, p.vy);
    if (!target) { p.vx *= 0.86; p.vy *= 0.86; }
    else {
      const dx = target.x - p.x, dy = target.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const want = dist < 10 ? 0 : Math.min(pace, 1.2 + dist * 0.035);
      const braking = speed > 1 && (p.vx * dx + p.vy * dy) < 0;
      const turn = braking ? 0.08 : 0.16;
      p.vx += (dx / dist * want - p.vx) * turn;
      p.vy += (dy / dist * want - p.vy) * turn;
      if (braking) { p.vx *= 0.92; p.vy *= 0.92; }
      if (Math.abs(p.vx) > 0.35) p.face = p.vx > 0 ? 1 : -1;
    }
    p.x = Math.max(46, Math.min(W - 46, p.x + p.vx));
    p.y = Math.max(40, Math.min(H - 40, p.y + p.vy));
  }

  function touch(p, forced) {
    if(!forced&&kickLock>0)return;
    const dx=state.ball.x-p.x,dy=state.ball.y-p.y,dist=Math.hypot(dx,dy)||1;
    if(dist>(forced?92:30))return;
    if(forced){
      if(kickLock>0)return;
      const who=p===state.dad?'Dad':p===state.jozef?'Jozef':'Rovers';
      const shot=shotOptions[who]||{aim:1,power:1,mode:'shot'},mode=shot.mode||'shot';
      let targetX,targetY;
      if(mode==='pass'&&room.together&&who!=='Rovers'){
        const teammate=who==='Dad'?state.jozef:state.dad;
        targetX=Math.max(46,Math.min(W-46,teammate.x+(teammate.vx||0)*8));
        targetY=Math.max(40,Math.min(H-40,teammate.y+(teammate.vy||0)*8));
      }else{
        targetX=(room.together?who==='Rovers':who==='Dad')?18:W-18;
        targetY=mode==='push'?state.ball.y:SHOT_LANES[shot.aim];
        targetY=Math.max(GOAL.y+14,Math.min(GOAL.y+GOAL.h-14,targetY));
      }
      const sx=targetX-state.ball.x,sy=targetY-state.ball.y,length=Math.hypot(sx,sy)||1;
      const bouncing=Math.hypot(state.ball.vx,state.ball.vy)>3.2;
      const power=Math.max(.9,Math.min(1.6,shot.power||1));
      const base=mode==='pass'?6.6:mode==='push'?5.2:state.super===who?15:power>1.15?12.4:8.6;
      const speed=base*power;
      if(mode==='shot'&&state.super===who){state.super='';state.call='SUPER';}
      state.ball.vx=sx/length*speed;
      state.ball.vy=sy/length*speed+(Math.random()-.5)*(bouncing?1.4:.35)*(mode==='shot'?8:2);
      if(bouncing)state.call='Off balance';
      shot.power=1;kickLock=16;
      if(mode==='shot')state.shots=(state.shots||0)+1;
      burst(state.ball.x,state.ball.y,mode==='pass'?'#9affef':'#fff',10);
      return;
    }
    const speed=Math.hypot(p.vx,p.vy);
    if(speed<.4)return;
    const incoming=Math.hypot(state.ball.vx,state.ball.vy);
    if(incoming>speed+4&&Math.random()<.45){
      state.ball.vx*=.4;state.ball.vy+=(Math.random()-.5)*3;state.call='Heavy touch';return;
    }
    const ahead=14+Math.min(8,speed*2);
    const leadX=p.x+(p.face||1)*ahead;
    state.ball.x+=(leadX-state.ball.x)*.18;
    state.ball.y+=(p.y-state.ball.y)*.18;
    state.ball.vx+=(p.vx*.85-state.ball.vx)*.16;
    state.ball.vy+=(p.vy*.85-state.ball.vy)*.16;
  }

  function inGoal(y) { return y > GOAL.y && y < GOAL.y + GOAL.h; }
  function separate(p) {
    const dx = state.ball.x - p.x, dy = state.ball.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 22) {
      state.ball.x += dx / dist * (22 - dist);
      state.ball.y += dy / dist * (22 - dist);
      state.ball.vx += dx / dist * 0.8;
      state.ball.vy += dy / dist * 0.8;
    }
  }

  function practiceRival(){
    if(!room.practice)return 4.4;
    const who=room.who==='Dad'?'Jozef':'Dad',bot=who==='Dad'?state.dad:state.jozef,ball=state.ball;
    const distance=Math.hypot(bot.x-ball.x,bot.y-ball.y);
    const homeX = who==='Dad' ? W-150 : 150;
    const ballInHisHalf = who==='Dad' ? ball.x > 300 : ball.x < 420;
    const go = ballInHisHalf || distance < 240;
    const lead = go ? 18 : 0;
    const jockey = Math.sin(tick * 0.08) * 28;
    if(bot.stun>0){bot.stun--;targets[who]=null;}
    else targets[who]={
      x:Math.max(70,Math.min(W-70, go ? ball.x + (who==='Dad'?-36:36) : homeX)),
      y:Math.max(50,Math.min(H-50, go ? ball.y + jockey : 210))
    };
    if (distance < 26 && Math.random() < (cpuDifficulty==='legend'?0.08:0.22)) { state.call = 'Missed tackle'; }
    if(distance<40) bot.carry=(bot.carry||0)+1; else bot.carry=0;
    if(bot.carry>18&&kickLock===0&&tick-lastBotKick>50){
      const miss=cpuDifficulty==='pro'&&Math.random()<0.3;
      const aim=cpuDifficulty==='legend'?(state.keepers?.[who==='Dad'?'left':'right']>210?0:2):(miss?1:(state.ball.y<185?0:state.ball.y>235?2:1));
      shotOptions[who]={aim, power:cpuDifficulty==='legend'?1.2:1.05};
      state.kick=who;lastBotKick=tick;bot.carry=0;
    }
    return cpuDifficulty==='legend'?4.6:cpuDifficulty==='rookie'?3.2:4.0;
  }
  function cooperativeRival(){
    if(!room.together)return;
    const bot=state.rival,ball=state.ball;
    if(bot.stun>0){bot.stun--;move(bot,null,3.3);return;}
    const distance=Math.hypot(bot.x-ball.x,bot.y-ball.y);
    const defend=ball.x>370||distance<150;
    move(bot,{x:Math.max(65,Math.min(W-65,defend?ball.x+25:500)),
      y:Math.max(50,Math.min(H-50,defend?ball.y:210))},3.6);
    if(distance<34)bot.carry=(bot.carry||0)+1;else bot.carry=0;
    if(bot.carry>17&&kickLock===0&&tick-lastBotKick>46){
      shotOptions.Rovers={aim:Math.floor(Math.random()*3),power:1.05,mode:'shot'};
      state.kick='Rovers';lastBotKick=tick;bot.carry=0;
    }
  }
  function endMatch(){
    state.matchLeft=0;room.phase='finished';state.call='Full time';finishPractice();syncUI();
    $('versus-clock').textContent='0:00';
    const winner=state.score.dad===state.score.jozef?'A draw':
      room.together?(state.score.jozef>state.score.dad?'Dad & Jozef':'Rovers'):
      (state.score.dad>state.score.jozef?'Dad':'Jozef');
    say(winner==='A draw'?'Full time — a draw. Rematch?':winner+(winner==='Dad & Jozef'?' win!':' wins!')+' Ready for a rematch?');
  }
  function step(){
    if(!room.host||room.phase!=='playing'||!localActive||!room.remoteActive)return;
    if(state.freeze>0){state.freeze--;state.ball.vx=0;state.ball.vy=0;
      if(state.freeze===1)reset(state.score.dad>=state.score.jozef?1:-1);
      broadcast();return;}
    if(kickoffHold>0){kickoffHold--;broadcast();return;}
    const cpuPace=practiceRival(),now=performance.now();
    if(!isKeeper('Dad'))move(state.dad,targets.Dad,room.practice&&room.who!=='Dad'?cpuPace:(now<sprintUntil.Dad?6.2:4.4));
    if(!isKeeper('Jozef'))move(state.jozef,targets.Jozef,room.practice&&room.who!=='Jozef'?cpuPace:(now<sprintUntil.Jozef?6.2:4.4));
    cooperativeRival();
    if(!isKeeper('Dad'))touch(state.dad,state.kick==='Dad');
    if(!isKeeper('Jozef'))touch(state.jozef,state.kick==='Jozef');
    if(room.together)touch(state.rival,state.kick==='Rovers');
    state.kick='';
    if(kickLock)kickLock--;
    const physics = window.JozefPhysics;
    physics.integrate(state.ball, physics.BALL);
    if (!kickLock) {
      if(!isKeeper('Dad'))physics.collide(state.dad,state.ball,physics.PLAYER,physics.BALL);
      if(!isKeeper('Jozef'))physics.collide(state.jozef,state.ball,physics.PLAYER,physics.BALL);
      if(!isKeeper('Dad')&&!isKeeper('Jozef'))physics.collide(state.dad,state.jozef,physics.PLAYER,physics.PLAYER);
      if(room.together)physics.collide(state.rival,state.ball,physics.PLAYER,physics.BALL);
    }
    if (state.score.dad || state.score.jozef) state.star.on = false;
    if (state.star?.on) {
      for (const p of [state.dad, state.jozef]) {
        if (Math.hypot(p.x-state.star.x, p.y-state.star.y) < 22) { state.star.on=false; state.super=p===state.dad?'Dad':'Jozef'; state.call='Star'; setTimeout(()=>{state.star={x:120+Math.random()*480,y:80+Math.random()*260,on:true};}, 4000); }
      }
    }
    mindKeepers();
    physics.walls(state.ball, W, H, inGoal);
    state.matchLeft=Math.max(0,state.matchLeft-1/60);
    if(state.matchLeft<=0){
      if(state.score.dad===state.score.jozef&&!state.overtime){
        state.overtime=true;state.matchLeft=30;state.call='GOLDEN GOAL';reset(0);
        kickoffHold=40;broadcast();return;
      }
      endMatch();broadcast();return;
    }
    if((state.score.dad>=3||state.score.jozef>=3)||
      (state.overtime&&state.score.dad!==state.score.jozef)){
      endMatch();broadcast();return;
    }
    const post = state.ball.y < GOAL.y + 4 || state.ball.y > GOAL.y + GOAL.h - 4;
    if (state.ball.x < 40 && inGoal(state.ball.y) && !post) {
      if (save('left') && state.call!=='SUPER') { state.saves += 1; state.ball.x = 56; state.ball.vx = 5.5; state.ball.vy *= 0.4; state.call = 'Saved'; kickLock = 20; }
      else { state.score.dad += 1; state.call = room.together ? 'Rovers scores' : 'GOAL Dad'; state.freeze = 70; burst(state.ball.x, state.ball.y, '#ffe14a', 40); }
    }
    else if (state.ball.x > W - 40 && inGoal(state.ball.y) && !post) {
      if (save('right') && state.call!=='SUPER') { state.saves += 1; state.ball.x = W - 56; state.ball.vx = -5.5; state.ball.vy *= 0.4; state.call = 'Saved'; kickLock = 20; }
      else { state.score.jozef += 1; state.call = room.together ? 'TEAM GOAL' : 'GOAL Jozef'; state.freeze = 70; burst(state.ball.x, state.ball.y, '#7ee0ff', 40); }
    }
    else if ((state.ball.x < 40 || state.ball.x > W - 40) && post && inGoal(state.ball.y)) { state.ball.x = state.ball.x < W/2 ? 46 : W-46; state.ball.y = 48; state.ball.vx = 0; state.ball.vy = 0; state.call = 'Corner'; }
    else if (!inGoal(state.ball.y) && state.ball.x < 34) { state.ball.x = 34; state.ball.vx = Math.abs(state.ball.vx) + 0.6; }
    else if (!inGoal(state.ball.y) && state.ball.x > W - 34) { state.ball.x = W - 34; state.ball.vx = -Math.abs(state.ball.vx) - 0.6; }
    if (state.ball.x < 70 && state.ball.y < 70 && Math.hypot(state.ball.vx, state.ball.vy) < 1) { state.ball.vx += 1.4; state.ball.vy += 1.4; }
    if (state.ball.x > W - 70 && state.ball.y < 70 && Math.hypot(state.ball.vx, state.ball.vy) < 1) { state.ball.vx -= 1.4; state.ball.vy += 1.4; }
    if (Math.hypot(state.ball.vx, state.ball.vy) < 0.4) state.call = state.call === 'Kickoff' ? state.call : '';
    broadcast();
  }

  function reset(dir) {
    state.ball = { x: 360, y: 210, vx: dir * 1.4, vy: 0 };
    kickoffHold=dir?36:0;
    state.dad.x=room.together?220:560;state.dad.y=210;
    state.jozef.x=160;state.jozef.y=room.together?250:210;
    Object.assign(state.rival,{x:540,y:210,vx:0,vy:0,face:-1,stun:0,carry:0});
    targets.Dad = null; targets.Jozef = null;
    for(const p of [state.dad,state.jozef]){p.vx=0;p.vy=0;}
    state.dad.face=-1;state.jozef.face=1;
    state.keepers={left:210,right:210};keeperState.left.commit=0;keeperState.right.commit=0;
    keeperTargets.left=null;keeperTargets.right=null;
    setTimeout(() => { if (room.phase === 'playing' && state.call !== 'Full time') state.call = ''; }, 1400);
  }
  function send(msg){if(room.conn?.open)room.conn.send(msg);}
  let lastBroadcast=0;
  function broadcast(){const now=performance.now();if(room.phase==='playing'&&now-lastBroadcast<50)return;lastBroadcast=now;send({type:'state',state,phase:room.phase,active:localActive&&room.remoteActive});}
  function syncUI(){
    const connected=room.phase!=='lobby';const playing=['playing','finished','countdown'].includes(room.phase);
    $('versus-lobby').hidden=connected;$('versus-room').hidden=!connected||playing||room.practice;
    $('versus-leave').hidden=!connected;$('versus-again').hidden=room.phase!=='finished';
    $('versus-kick').disabled=room.phase!=='playing'||!localActive||!room.remoteActive;
    if ($('versus-sprint')) $('versus-sprint').disabled=room.phase!=='playing'||!localActive||!room.remoteActive;
    $('versus-ready').disabled=!room.other||room.ready;
    $('versus-ready').textContent=room.ready?'Ready — waiting for opponent':room.other?'Ready to play':'Waiting for opponent';
    $('versus-room-code').textContent=room.code;
    const approval=$('versus-approval');if(approval)approval.hidden=!room.host||!room.pending;
    $('versus').classList.toggle('is-playing',playing);
    const stage=document.querySelector('.versus-stage'), play=document.querySelector('.versus-play'), board=document.querySelector('.versus-scoreboard'), card=document.querySelector('.versus-card');
    // Styles are owned by CSS and return to lobby without lingering inline sizing.
    for(const el of [card,stage,canvas,board,play])if(el)el.removeAttribute('style');
    const pass=$('versus-pass');
    if(pass){
      const label=pass.querySelector('.vs-action-label');
      const name=room.together?'PASS':'PUSH';
      if(label)label.textContent=name;else pass.textContent=name;
      pass.setAttribute('aria-label',room.together?'Pass to teammate':'Push ball forward');
    }
    const team=$('versus').querySelector('.vs-team-jozef .vs-team-name');
    const opposition=$('versus').querySelector('.vs-team-dad .vs-team-name');
    if(team){team.firstChild.textContent=room.together?'DAD + JO':'JOZEF';const small=team.querySelector('small');if(small)small.textContent=room.together?'TEAM':'HOME';}
    if(opposition){opposition.firstChild.textContent=room.together?'ROVERS':'DAD';const small=opposition.querySelector('small');if(small)small.textContent=room.together?'RIVAL':'AWAY';}
    $('versus').classList.toggle('is-coop',room.together);
    document.body.classList.toggle('versus-focused',connected&&$('versus').classList.contains('active'));
    document.querySelectorAll('.versus-role').forEach(b=>{b.classList.toggle('is-on',b.dataset.who===room.who);b.setAttribute('aria-pressed',String(b.dataset.who===room.who));});
    $('versus-who').value=room.who; try{localStorage.setItem('jozefs-world-who', room.who);}catch(_){ }
    $('versus-cpu-label').hidden=!room.practice;
    renderPracticeRecord();
  }
  function stopInput(){keys.clear();stickVector=null;targets[room.who]=null;send({type:'aim',x:null,y:null});const nub=$('versus-nub'),stick=$('versus-stick');nub.style.left=(stick.clientWidth-nub.offsetWidth)/2+'px';nub.style.top=(stick.clientHeight-nub.offsetHeight)/2+'px';}
  function cleanup(){clearTimeout(connectTimer);clearTimeout(countdownTimer);const pending=room.pending,oldConn=room.conn,oldPeer=room.peer;room.pending=null;room.conn=null;room.peer=null;pending?.close();oldConn?.close();oldPeer?.destroy();room.other='';room.ready=false;room.remoteReady=false;room.host=false;room.practice=false;room.together=false;room.otherSpot='forward';room.remoteActive=true;room.phase='lobby';stopInput();syncUI();}
  function fail(message){cleanup();say(message);}
  function freshMatch(){state.matchId=crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');state.kick='';state.score={dad:0,jozef:0};state.matchLeft=room.practice?practiceSeconds:120;state.call='Kickoff';kickLock=0;lastBotKick=-100;savedMatch=false;resultRecorded=false;state.overtime=false;state.star={x:360,y:120,on:true};state.super='';nextLocalSprint=0;dekeReady.Dad=dekeReady.Jozef=0;sprintUntil.Dad=sprintUntil.Jozef=0;sprintReady.Dad=sprintReady.Jozef=0;reset(0);
    const length=Math.ceil(state.matchLeft);$('versus-clock').textContent=Math.floor(length/60)+':'+String(length%60).padStart(2,'0');
  }
  function startMatch(){
    if(!room.host||!room.ready||!room.remoteReady||room.phase==='countdown')return;
    freshMatch();room.phase='countdown';let count=3;state.call='3';syncUI();broadcast();
    const next=()=>{if(room.phase!=='countdown')return;if(!localActive||!room.remoteActive){countdownTimer=setTimeout(next,250);return;}count--;state.call=count?String(count):'KICKOFF';if(!count){room.phase='playing';syncUI();say(room.practice?'Solo challenge / '+cpuDifficulty.toUpperCase()+' computer rival.':room.together?'Dad and Jozef vs Rovers — game on.':room.who+' vs '+room.other+' — game on.');setTimeout(()=>{if(state.call==='KICKOFF')state.call='';},800);}else countdownTimer=setTimeout(next,1000);broadcast();};
    countdownTimer=setTimeout(next,1000);
  }
  function ready(){if(!room.other||room.ready)return;room.ready=true;syncUI();send({type:'ready'});startMatch();}
  function validState(v){return v&&['dad','jozef','ball'].every(k=>v[k]&&['x','y','vx','vy'].every(n=>Number.isFinite(v[k][n])&&Math.abs(v[k][n])<2000))&&v.score&&['dad','jozef'].every(k=>Number.isInteger(v.score[k])&&v.score[k]>=0&&v.score[k]<10000)&&Number.isFinite(v.matchLeft)&&v.matchLeft>=0&&v.matchLeft<=120&&typeof v.call==='string'&&v.call.length<80&&typeof v.matchId==='string'&&/^[A-Za-z0-9-]{10,80}$/.test(v.matchId)&&(!v.rival||['x','y','vx','vy'].every(n=>Number.isFinite(v.rival[n])&&Math.abs(v.rival[n])<2000));}
  function onData(msg){
    if(!msg||typeof msg!=='object')return;lastPacket=performance.now();
    if(msg.type==='hello'&&!room.host&&['Dad','Jozef'].includes(msg.hostWho)){
      room.other=msg.hostWho;room.who=msg.hostWho==='Dad'?'Jozef':'Dad';room.phase='waiting';room.together=msg.together===true;room.otherSpot=msg.hostSpot==='keeper'?'keeper':'forward';syncUI();send({type:'joined',spot:room.spot});say('You are '+room.who+'. Both players tap Ready.');
    }else if(msg.type==='joined'&&room.host&&room.phase==='waiting'){room.other=room.who==='Dad'?'Jozef':'Dad';room.otherSpot=msg.spot==='keeper'?'keeper':'forward';send({type:'ack'});syncUI();say(room.other+' joined. Both players tap Ready.');}
    else if(msg.type==='ack'&&!room.host&&room.phase==='waiting'){say('Connected as '+room.who+'. Both players tap Ready.');}
    else if(msg.type==='ready'&&room.host&&room.phase==='waiting'){room.remoteReady=true;startMatch();}
    else if(msg.type==='aim'&&room.host&&room.phase==='playing'){
      if(msg.x===null&&msg.y===null)targets[room.other]=null;
      else if(Number.isFinite(msg.x)&&Number.isFinite(msg.y))targets[room.other]={x:Math.max(30,Math.min(690,msg.x)),y:Math.max(30,Math.min(390,msg.y))};
    }else if(msg.type==='keeper'&&room.host&&room.phase==='playing'&&room.otherSpot==='keeper'){
      if(Number.isFinite(msg.y))keeperTargets[keeperSide(room.other)]=Math.max(GOAL.y+12,Math.min(GOAL.y+GOAL.h-12,msg.y));
    }else if(msg.type==='deke'&&room.host&&room.phase==='playing'){activateDeke(room.other);
    }else if(msg.type==='sprint'&&room.host&&room.phase==='playing'){activateSprint(room.other);
    }else if(msg.type==='kick'&&room.host&&room.phase==='playing'){
      shotOptions[room.other]={aim:Number.isInteger(msg.aim)&&msg.aim>=0&&msg.aim<=2?msg.aim:1,
        power:Number.isFinite(msg.power)?Math.max(.9,Math.min(1.6,msg.power)):1,
        mode:msg.mode==='pass'&&room.together?'pass':msg.mode==='push'?'push':'shot'};
      state.kick=room.other;
    }
    else if(msg.type==='state'&&!room.host&&validState(msg.state)&&['waiting','countdown','playing','finished'].includes(msg.phase)){
      if(msg.phase==='countdown'&&room.phase!=='countdown')resultRecorded=false;
      if(room.together&&!msg.state.rival)return;
      Object.assign(state,msg.state);const changed=room.phase!==msg.phase||room.remoteActive!==(msg.active!==false);room.phase=msg.phase;room.remoteActive=msg.active!==false;if(changed){syncUI();if(!room.remoteActive)say('Paused — opponent switched away.');}
      if(room.phase==='finished')say(state.score.dad===state.score.jozef?'Full time — a draw. Rematch?':(room.together?(state.score.jozef>state.score.dad?'Dad & Jozef':'Rovers'):(state.score.dad>state.score.jozef?'Dad':'Jozef'))+' wins! Ready for a rematch?');
    }else if(msg.type==='active'){room.remoteActive=msg.active===true;if(!room.remoteActive)targets[room.other]=null;syncUI();say(room.remoteActive?'Opponent is back.':'Paused — opponent switched away.');}
    else if(msg.type==='rematch'&&room.host&&room.phase==='finished'){prepareRematch();}
    else if(msg.type==='lobby'&&!room.host){room.phase='waiting';room.ready=false;room.remoteReady=false;resultRecorded=false;syncUI();say('Rematch — both players tap Ready.');}
    else if(msg.type==='ping')send({type:'pong'});
  }
  function prepareRematch(){if(room.practice){room.ready=room.remoteReady=true;startMatch();return;}room.phase='waiting';room.ready=false;room.remoteReady=false;syncUI();send({type:'lobby'});say('Rematch — both players tap Ready.');}
  function wire(conn){
    if(room.conn){conn.close();return;}room.conn=conn;conn.on('data',onData);
    let opened=false;
    const onOpen=()=>{if(opened||room.conn!==conn)return;opened=true;clearTimeout(connectTimer);lastPacket=performance.now();room.phase='waiting';if(room.host)send({type:'hello',hostWho:room.who,hostSpot:room.spot,together:room.together});else if(room.other)send({type:'joined',spot:room.spot});syncUI();};
    conn.on('open',onOpen);
    // WebKit can open a data channel before an event handler attaches.
    if(conn.open)queueMicrotask(onOpen);
    conn.on('close',()=>{if(room.conn!==conn)return;room.conn=null;fail('Opponent disconnected. Create or join a room to play again.');});
    conn.on('error',()=>fail('Connection lost. Create or join a room to retry.'));
  }
  function connect(host,together=false){
    if(!window.Peer){say('Online play is unavailable. Try Practice solo or reload when connected.');return;}
    const code=host?Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[n%24]).join(''):$('versus-code').value.trim().toUpperCase();
    if(!/^[A-Z]{6}$/.test(code)){say('Enter the six-letter code from the other player.');$('versus-code').focus();return;}
    cleanup();room.code=code;room.host=host;room.together=together;room.phase='connecting';syncUI();say(host?'Creating your room…':'Joining room…');
    const peer=new Peer(host?'jw-rival-'+code:undefined);room.peer=peer;
    connectTimer=setTimeout(()=>{if(room.phase==='connecting')fail('Could not connect. Check the code and connection, then retry.');},15000);
    peer.on('open',()=>{if(room.peer!==peer)return;if(host){clearTimeout(connectTimer);room.phase='waiting';syncUI();say('Share the code. Your opponent joins automatically as the other player.');}else wire(peer.connect('jw-rival-'+code,{reliable:true}));});
    peer.on('connection',conn=>{
      if(!room.host||room.conn||room.pending||room.phase!=='waiting'){conn.on('open',()=>conn.close());if(conn.open)conn.close();return;}
      room.pending=conn;
      conn.on('close',()=>{if(room.pending===conn){room.pending=null;syncUI();say('Player cancelled the join request.');}});
      syncUI();say('Someone wants to join. Approve only if you shared the room code.');
    });
    peer.on('error',err=>{if(room.peer===peer)fail(err.type==='peer-unavailable'?'Room not found. Check the code and ask the host to keep it open.':'Could not open the room. Try again or practice solo.');});
  }
  document.querySelectorAll('.versus-role').forEach(b=>b.addEventListener('click',()=>{if(room.phase==='lobby'){room.who=b.dataset.who;syncUI();}}));
  $('versus-open').addEventListener('click',()=>connect(true));$('versus-join').addEventListener('click',()=>connect(false));
  $('versus-approve')?.addEventListener('click',()=>{
    if(!room.host||!room.pending||room.phase!=='waiting')return;
    const conn=room.pending;room.pending=null;wire(conn);syncUI();say('Approved. Both players can now tap Ready.');
  });
  $('versus-decline')?.addEventListener('click',()=>{
    const conn=room.pending;room.pending=null;conn?.close();syncUI();say('Join request declined. Room remains private.');
  });
  $('versus-code').addEventListener('keydown',e=>{if(e.key==='Enter')connect(false);});
  $('versus-ready').addEventListener('click',ready);
  $('versus-leave').addEventListener('click',()=>{cleanup();say('Create a room, join with a code, or warm up solo.');});
  document.querySelectorAll('.versus-spot').forEach(b=>b.addEventListener('click',()=>{if(room.phase!=='lobby')return;room.spot=b.dataset.spot;document.querySelectorAll('.versus-spot').forEach(n=>{n.classList.toggle('is-on',n===b);n.setAttribute('aria-pressed',String(n===b));});}));
  $('versus-together')?.addEventListener('click',()=>connect(true,true));
  $('versus-practice').addEventListener('click',()=>{
    const chosen=$('versus-cpu-difficulty').value;
    cpuDifficulty=Object.hasOwn(cpuOptions,chosen)?chosen:'pro';
    practiceSeconds=$('versus-practice-length').value==='60'?60:120;
    cleanup();room.host=true;room.practice=true;room.ready=room.remoteReady=true;room.phase='waiting';startMatch();
  });
  $('versus-share').addEventListener('click',async()=>{const url=new URL(location.href);url.hash='versus';url.searchParams.set('room',room.code);try{await navigator.clipboard.writeText(url.href);say('Invite copied. Send it to your opponent.');}catch{say('Your room code is '+room.code+'. Share it with your opponent.');}});
  $('versus-again').addEventListener('click',()=>{if(room.phase!=='finished')return;if(room.host)prepareRematch();else{send({type:'rematch'});say('Rematch requested.');}});
  function aim(x,y){
    if(room.phase!=='playing')return;
    if(room.spot==='keeper'){
      const side=keeperSide(room.who);
      const next=Math.max(GOAL.y+12,Math.min(GOAL.y+GOAL.h-12,y));
      if(room.host)keeperTargets[side]=next;else send({type:'keeper',y:next});
      return;
    }
    targets[room.who]={x,y};if(!room.host)send({type:'aim',x,y});
  }
  function aimFrom(e){
    const r=canvas.getBoundingClientRect();
    const cx=(e.clientX-r.left)*cameraW/r.width,cy=(e.clientY-r.top)*cameraH/r.height;
    const px=(cx-screenX)/screenScale,py=(cy-screenY)/screenScale;
    aim(portrait?(cameraFlipped?W-py:py):px,portrait?(cameraFlipped?px:H-px):py);
  }
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);aimFrom(e);});canvas.addEventListener('pointermove',e=>{if(e.buttons)aimFrom(e);});canvas.addEventListener('pointercancel',stopInput);
  const stick=$('versus-stick'),nub=$('versus-nub');
  function fromStick(e){
    const r=stick.getBoundingClientRect(),radius=Math.max(18,Math.min(r.width,r.height)*.35);
    let x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;
    const raw=Math.hypot(x,y);
    const length=Math.max(1,raw);x/=length;y/=length;stickVector={x,y};
    if (raw > 0.92) sprint();
    const travel=Math.max(8,(Math.min(r.width,r.height)-nub.offsetWidth)/2-3);
    nub.style.left=(r.width-nub.offsetWidth)/2+x*travel+'px';
    nub.style.top=(r.height-nub.offsetHeight)/2+y*travel+'px';
  }
  let lastStick=0;
  stick.addEventListener('pointerdown',e=>{
    stick.setPointerCapture(e.pointerId);fromStick(e);
    const now=performance.now();
    if(now-lastStick<280) deke();
    lastStick=now;
  });stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))fromStick(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,stopInput);
  function activateDeke(who){
    if(!room.host||room.phase!=='playing'||isKeeper(who))return false;
    const now=performance.now();if(now<dekeReady[who])return false;
    const me=who==='Dad'?state.dad:state.jozef;
    if(Math.hypot(me.x-state.ball.x,me.y-state.ball.y)>42)return false;
    dekeReady[who]=now+1600;
    const other=room.together?state.rival:who==='Dad'?state.jozef:state.dad;
    const gap=Math.hypot(me.x-other.x,me.y-other.y),direction=room.together?1:(me.face||1);
    me.x=Math.max(46,Math.min(W-46,me.x+direction*28));
    me.y=Math.max(40,Math.min(H-40,me.y+(other.y>me.y?-10:10)));
    state.ball.x=me.x+direction*16;state.ball.y=me.y;state.ball.vx=me.vx;state.ball.vy=me.vy;
    if(gap<68){other.stun=(room.practice||room.together)?24:8;
      other.vy+=(other.y>me.y?2:-2);burst(other.x,other.y,'#ffe14a',12);navigator.vibrate?.(20);}
    state.call='DEKE';return true;
  }
  function deke(){
    if(room.phase!=='playing'||!localActive||!room.remoteActive)return;
    if(room.host)activateDeke(room.who);else send({type:'deke'});
  }
  function passBall(){
    if(room.phase!=='playing'||!localActive||!room.remoteActive||isKeeper(room.who))return;
    const me=room.who==='Dad'?state.dad:state.jozef;
    if(Math.hypot(me.x-state.ball.x,me.y-state.ball.y)>92)return;
    const mode=room.together?'pass':'push';
    if(room.host){shotOptions[room.who]={aim:selectedAim,power:1,mode};state.kick=room.who;}
    else send({type:'kick',aim:selectedAim,power:1,mode});
  }
  function shoot(){
    localKick(1+chargeFill*.6);chargeFill=0;chargingSince=0;
    $('versus-kick').style.setProperty('--shot-charge','0%');
  }
  $('versus-aim').addEventListener('click',()=>pickAim((selectedAim+1)%3));
  $('versus-deke')?.addEventListener('click', deke);
  $('versus-pass')?.addEventListener('click',passBall);
  $('versus-sprint')?.addEventListener('click',sprint);
  const shootButton=$('versus-kick');
  shootButton.addEventListener('pointerdown',e=>{
    if(shootButton.disabled)return;
    chargingSince=performance.now();chargeFill=0;
    try{shootButton.setPointerCapture(e.pointerId)}catch(_){}
  });
  shootButton.addEventListener('pointercancel',()=>{
    chargingSince=0;chargeFill=0;shootButton.style.setProperty('--shot-charge','0%');
  });
  shootButton.addEventListener('click',shoot);
  window.addEventListener('keydown',e=>{if(!$('versus').classList.contains('active')||room.phase!=='playing'||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(key===' '&&e.target.tagName==='BUTTON')return;
    if(['1','2','3'].includes(key)&&!e.repeat){pickAim(Number(key)-1);return;}if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key)){e.preventDefault();keys.add(key);if(key===' '&&!e.repeat)shoot();}});
  window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(!keys.size)stopInput();});
  function activity(){
    const section=$('versus');
    const playing=['countdown','playing','finished'].includes(room.phase);
    // SPA navigation may reapply section classes while a live match continues.
    // Keep the immersive layout bound to the authoritative game phase.
    if(section.classList.contains('is-playing')!==playing)section.classList.toggle('is-playing',playing);
    const active=!document.hidden&&section.classList.contains('active');
    if(active!==localActive){localActive=active;stopInput();send({type:'active',active});syncUI();}
    document.body.classList.toggle('versus-focused',active&&room.phase!=='lobby');
  }
  document.addEventListener('visibilitychange',activity);window.addEventListener('blur',stopInput);
  new MutationObserver(activity).observe($('versus'),{attributes:true,attributeFilter:['class']});
  const invite=new URLSearchParams(location.search).get('room');if(invite&&/^[A-Z]{6}$/.test(invite))$('versus-code').value=invite;
  let previous=performance.now(),accumulator=0,heartbeat=0,uiTime=0,lastPaint=0;
  function frame(now){
    const dt=Math.min((now-previous)/1000,.1);previous=now;activity();
    if(localActive){
      if(chargingSince&&room.phase==='playing'){
        chargeFill=Math.min(1,(now-chargingSince)/900);
        $('versus-kick').style.setProperty('--shot-charge',Math.round(chargeFill*100)+'%');
      }
      const me=room.who==='Dad'?state.dad:state.jozef;
      const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
      const vector=stickVector||(x||y?{x,y}:null);
      const inRange=Math.hypot(me.x-state.ball.x,me.y-state.ball.y)<92;
      $('versus-kick')?.classList.toggle('in-range', inRange && room.phase==='playing');
      if(vector&&now-lastSent>40){
        const worldDx=portrait?(cameraFlipped?-vector.y:vector.y):vector.x;
        const worldDy=portrait?(cameraFlipped?vector.x:-vector.x):vector.y;
        aim(me.x+worldDx*90,me.y+worldDy*90);lastSent=now;
      }
      // Releasing movement stops the player rather than auto-chasing the ball.
      // Skip idle physics and lower render frequency in the lobby or after full time.
      // Live matches retain their deterministic 60 Hz simulation and animation.
      if(room.phase==='playing'&&room.remoteActive){
        accumulator=Math.min(.1,accumulator+dt);
        while(accumulator>=1/60){step();accumulator-=1/60;}
      }else accumulator=0;
      if((room.phase==='playing'&&room.remoteActive)||room.phase==='countdown'||now-lastPaint>120){
        draw();lastPaint=now;
      }
      if(now-uiTime>100){
        if(room.phase==='playing'){
          const distance=Math.hypot(me.x-state.ball.x,me.y-state.ball.y);
          const tip=$('versus-tip');
          const advice=distance<38?'BALL CONTROL / AIM & SHOOT':
            distance<65?'SHOT RANGE / HOLD TO CHARGE':'CHASE THE BALL / SPRINT TO CLOSE';
          if(tip.dataset.guide!==advice){tip.dataset.guide=advice;tip.textContent=advice;}
        }
        const remain=Math.max(0,Math.ceil((nextLocalSprint-now)/1000));
        if ($('versus-sprint')) { $('versus-sprint').disabled=room.phase!=='playing'||!localActive||!room.remoteActive||remain>0; $('versus-sprint').textContent=remain?'SPRINT '+remain+'s':'SPRINT'; }
        $('versus-score-dad').textContent=state.score.dad;$('versus-score-jozef').textContent=state.score.jozef;const seconds=Math.ceil(state.matchLeft);$('versus-clock').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');uiTime=now;}
    }else accumulator=0;
    // Retransmit an unacknowledged room invitation: initial WebRTC packets can be lost.
    if(room.host&&room.conn?.open&&room.phase==='waiting'&&!room.other&&now-lastHello>900){send({type:'hello',hostWho:room.who,hostSpot:room.spot,together:room.together});lastHello=now;}
    if(room.conn?.open&&now-heartbeat>2000){
      heartbeat=now;
      if(localActive&&room.remoteActive){send({type:'ping'});if(now-lastPacket>16000)fail('Connection interrupted. Rejoin to start a fresh match.');}
      else lastPacket=now; // Background tabs must not be treated as a dead connection.
    }
    requestAnimationFrame(frame);
  }
  const savedResult = (() => { try { return localStorage.getItem('jozefs-world-versus-result'); } catch { return ''; } })();
  if (savedResult && $('today-versus-result')) $('today-versus-result').textContent = savedResult;
  paintSeason();
  pickAim(1);syncUI();draw();requestAnimationFrame(frame);
})();
