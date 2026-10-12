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
  let portrait=false;
  function fitCamera(){
    const next = window.innerWidth < 900;
    if (next !== portrait || !canvas.width) {
      portrait = next;
      canvas.width = (portrait ? H : W) * dpr;
      canvas.height = (portrait ? W : H) * dpr;
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.aspectRatio = 'auto';
    canvas.style.maxHeight = 'none';
    canvas.style.objectFit = 'cover';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (portrait) { ctx.translate(H, 0); ctx.rotate(Math.PI / 2); }
  }
  const GOAL = { x: 36, y: 150, w: 18, h: 120 };
  const room = { code: '', who: 'Dad', spot: 'forward', together: false, peer: null, conn: null, host: false, other: '', ready: false, remoteReady: false, practice: false, phase: 'lobby', remoteActive: true };
  let connectTimer, countdownTimer, lastPacket = 0, lastSent = 0, lastHello = 0, localActive = true;
  let stickVector=null;
  const SHOT_LANES=[160,210,260],shotOptions={Dad:{aim:1,power:1},Jozef:{aim:1,power:1}};
  let selectedAim=1,chargingSince=0,chargeFill=0;
  function pickAim(value){
    selectedAim=Math.max(0,Math.min(2,Math.round(value)));
    const label=['TOP','MIDDLE','BOTTOM'][selectedAim];
    $('versus-aim').textContent=label+' ↻';
    $('versus-aim').setAttribute('aria-label','Aim '+label+'. Tap to change.');
  }
  function localKick(power=1){
    if(room.phase!=='playing'||!localActive||!room.remoteActive)return;
    const p=room.who==='Dad'?state.dad:state.jozef;
    if(Math.hypot(p.x-state.ball.x,p.y-state.ball.y)>92){$('versus-tip').textContent='GET CLOSE TO THE BALL';return;}
    const shot={aim:selectedAim,power:Math.max(.9,Math.min(1.6,power))};
    if(room.host){shotOptions[room.who]=shot;state.kick=room.who;}
    else send({type:'kick',aim:shot.aim,power:shot.power});
    $('versus-tip').textContent='TARGET '+['TOP','MIDDLE','BOTTOM'][selectedAim];
  }
  const keys = new Set();
  const state = {
    ball: { x: 360, y: 210, vx: 0, vy: 0 },
    dad: { x: 560, y: 210, vx: 0, vy: 0, face: -1 },
    jozef: { x: 160, y: 210, vx: 0, vy: 0, face: 1 },
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
  let lastCall = '';
  let shake = 0;

  function tone(freqs, type) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try { if (localStorage.getItem('jozefs-world-voice-alerts') === 'off') return; } catch { /* play */ }
    const ctx = new AudioCtx();
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
  function chime() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try { if (localStorage.getItem('jozefs-world-voice-alerts') === 'off') return; } catch { /* play */ }
    const ctx = new AudioCtx();
    [494, 659, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.08 + 0.24);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.26);
    });
  }
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
    if(!result||room.phase!=='finished'||resultRecorded||!/wins|draw/.test(text))return;
    resultRecorded=true; // A repeated state packet must not count as another match.
    result.textContent=text;
    try{
      localStorage.setItem('jozefs-world-versus-result',text);
      const season=readSeason();
      season.unshift(state.score.jozef+'-'+state.score.dad);
      localStorage.setItem('jozefs-world-season',JSON.stringify(season.slice(0,5)));
    }catch(_){/* Device storage can be disabled or full. */}
    paintSeason();
  }
  function lights() {
    $('light-dad')?.classList.toggle('on', room.who === 'Dad' || room.other === 'Dad');
    $('light-jozef')?.classList.toggle('on', room.who === 'Jozef' || room.other === 'Jozef');
  }

  // Static stadium is rendered once; animation only redraws athletes and effects.
  const stadium = document.createElement('canvas'); stadium.width = W * dpr; stadium.height = H * dpr;
  const paint = stadium.getContext('2d'); paint.scale(dpr,dpr);
  function buildStadium() {
    const sky=paint.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0b1c33');sky.addColorStop(1,'#050d16');paint.fillStyle=sky;paint.fillRect(0,0,W,H);
    for(let row=0;row<7;row++){
      for(let seat=0;seat<90;seat++){
        paint.fillStyle=['#1d3a52','#274862','#c0392b','#1e6b4a','#f1c40f'][(row+seat)%5];
        paint.fillRect(8+seat*8, 4+row*5, 6, 4);
      }
    }
    paint.fillStyle='#0a1622';paint.fillRect(18,14,684,392);
    for(let x=28;x<692;x+=36){paint.fillStyle=x%72?'#1a6b38':'#22884a';paint.fillRect(x,22,36,376);}
    const shade=paint.createLinearGradient(0,22,0,398);shade.addColorStop(0,'rgba(0,0,0,.18)');shade.addColorStop(.5,'rgba(255,255,255,.04)');shade.addColorStop(1,'rgba(0,0,0,.22)');paint.fillStyle=shade;paint.fillRect(28,22,664,376);
    paint.fillStyle='rgba(255,255,255,.05)';paint.fillRect(28,286,664,54);
    paint.strokeStyle='rgba(236,255,244,.82)';paint.lineWidth=2;paint.strokeRect(28,22,664,376);
    paint.beginPath();paint.moveTo(360,22);paint.lineTo(360,398);paint.stroke();
    paint.beginPath();paint.arc(360,210,52,0,Math.PI*2);paint.stroke();
    paint.beginPath();paint.arc(360,210,3,0,Math.PI*2);paint.fillStyle='#eafff4';paint.fill();
    paint.strokeRect(28,108,96,204);paint.strokeRect(596,108,96,204);
    paint.strokeRect(28,154,40,112);paint.strokeRect(652,154,40,112);
    paint.beginPath();paint.arc(124,210,3,0,Math.PI*2);paint.fill();paint.beginPath();paint.arc(596,210,3,0,Math.PI*2);paint.fill();
    for(const x of [8,690]){
      paint.fillStyle='rgba(200,250,255,.12)';paint.fillRect(x,146,22,128);
      paint.strokeStyle='rgba(220,245,255,.35)';paint.lineWidth=1;
      for(let y=146;y<=274;y+=7){paint.beginPath();paint.moveTo(x,y);paint.lineTo(x+22,y);paint.stroke();}
      for(let k=0;k<=22;k+=5){paint.beginPath();paint.moveTo(x+k,146);paint.lineTo(x+k,274);paint.stroke();}
      paint.strokeStyle='#f4feff';paint.lineWidth=4;paint.strokeRect(x,146,22,128);
    }
    for(const x of [40,680]){const beam=paint.createRadialGradient(x,0,0,x,80,280);beam.addColorStop(0,'rgba(220,255,255,.28)');beam.addColorStop(1,'rgba(255,255,255,0)');paint.fillStyle=beam;paint.fillRect(0,0,W,H);}
  }
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
  function player(p,color,name){
    const speed=Math.hypot(p.vx,p.vy);
    const moving=speed>.25;
    const phase=tick*(0.22+speed*0.12);
    const stride=moving?Math.sin(phase)*(7+speed*1.8):0;
    const bob=moving?Math.abs(Math.sin(phase*2))*-2.2:0;
    const lean=Math.max(-0.28,Math.min(0.28,(p.vx||0)*0.05));
    const kicking=kickLock>8 && state.call;
    ctx.save();ctx.translate(p.x,p.y+bob);if(portrait)ctx.rotate(-Math.PI/2);ctx.scale(p.face||1,1);ctx.rotate(lean);ctx.scale(1.35,1.35);
    ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(1,20,11,3.5,0,0,Math.PI*2);ctx.fill();
    if(name===room.who){ctx.strokeStyle=color;ctx.globalAlpha=.55;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,18,16,6,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='#1d2430';ctx.lineWidth=5;
    const kick=kicking?14:0;
    ctx.beginPath();ctx.moveTo(-4,8);ctx.lineTo(-5+stride*.4,16);ctx.lineTo(-7+stride,22);ctx.moveTo(4,8);ctx.lineTo(5-stride*.4+kick,16);ctx.lineTo(8-stride+kick,22);ctx.stroke();
    ctx.strokeStyle='#f2f5f3';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-5+stride*.2,12);ctx.lineTo(-5+stride*.2,17);ctx.moveTo(5-stride*.2,12);ctx.lineTo(5-stride*.2,17);ctx.stroke();
    ctx.fillStyle='#1b1f27';ctx.beginPath();ctx.ellipse(-6+stride,21,4,2,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6-stride,21,4,2,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e0b08a';ctx.lineWidth=3.5;
    ctx.beginPath();ctx.moveTo(-7,-2);ctx.lineTo(-13,-stride*.7);ctx.moveTo(7,-2);ctx.lineTo(13,stride*.7);ctx.stroke();
    const kit=ctx.createLinearGradient(-9,-12,9,10);kit.addColorStop(0,color);kit.addColorStop(1,'#00000033');ctx.fillStyle=kit;ctx.beginPath();ctx.moveTo(-9,-9);ctx.quadraticCurveTo(0,-13,9,-9);ctx.lineTo(8,7);ctx.quadraticCurveTo(0,10,-8,7);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffffffcc';ctx.fillRect(-8,4,16,3);
    ctx.fillStyle='#fff';ctx.font='700 8px system-ui';ctx.textAlign='center';ctx.fillText('11',0,1);
    const dad=name==='Dad';
    ctx.fillStyle='#e7b898';ctx.beginPath();ctx.ellipse(-6.2,-15,1.4,2.2,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(6.2,-15,1.4,2.2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=dad?'#e8b48a':'#f3c7a6';ctx.beginPath();ctx.ellipse(0,-14.5,6.4,7.2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=dad?'#3a2a22':'#241c18';ctx.beginPath();ctx.ellipse(0,dad?-18.5:-19.2,6.6,dad?4.2:5.4,0,Math.PI,0);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-2.1,-14.6,1.5,1.1,0,0,Math.PI*2);ctx.ellipse(2.1,-14.6,1.5,1.1,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#243044';ctx.beginPath();ctx.arc(-2,-14.5,.7,0,Math.PI*2);ctx.arc(2,-14.5,.7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#c49274';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(0,-12.2);ctx.stroke();
    ctx.strokeStyle=dad?'#b8886c':'#d7a48c';ctx.beginPath();ctx.arc(0,-11.2,2,.15,Math.PI-.15);ctx.stroke();
    if(dad){ctx.fillStyle='#c4a08a88';ctx.beginPath();ctx.ellipse(0,-10.4,3.2,1.4,0,0,Math.PI);ctx.fill();}
    ctx.fillStyle='#071724e6';ctx.beginPath();ctx.roundRect(-22,-36,44,13,4);ctx.fill();
    ctx.fillStyle='#f4fffb';ctx.font='700 9px system-ui';ctx.fillText(name,0,-27);
    ctx.restore();
  }

  function keeper(side, color, name) {
    const body = { x: side === 'left' ? 52 : 668, y: state.keepers?.[side] || 210, vx: 0, vy: 0, face: side === 'left' ? 1 : -1 };
    player(body, color, name);
  }
  function mindKeepers() {
    const ball = state.ball;
    state.keepers = state.keepers || { left: 210, right: 210 };
    for (const side of ['left', 'right']) {
      const mind = keeperState[side];
      const shot = side === 'left' ? ball.vx < -2.4 && ball.x < 220 : ball.vx > 2.4 && ball.x > 500;
      if (shot && mind.commit <= 0) {
        const guess = ball.y < 190 ? 168 : ball.y > 230 ? 252 : 210;
        mind.target = guess;
        mind.commit = 26;
      }
      if (mind.commit > 0) {
        state.keepers[side] += (mind.target - state.keepers[side]) * 0.22;
        mind.commit -= 1;
      } else {
        const watch = side === 'left' ? ball.x < 360 : ball.x > 360;
        const home = watch ? 210 + (ball.y - 210) * 0.25 : 210;
        state.keepers[side] += (home - state.keepers[side]) * 0.05;
      }
      state.keepers[side] = Math.max(GOAL.y + 12, Math.min(GOAL.y + GOAL.h - 12, state.keepers[side]));
    }
  }
  function save(side) {
    if (keeperState[side].commit < 10) return false;
    return Math.abs(state.ball.y - (state.keepers?.[side] || 210)) < 12;
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
    const me=room.who==='Dad'?state.dad:state.jozef;
    if(room.phase==='playing'&&Math.hypot(me.x-ball.x,me.y-ball.y)<110){
      const gx=room.who==='Dad'?34:686,gy=SHOT_LANES[selectedAim];
      ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle=room.who==='Dad'?'#d7ff4a':'#7ee0ff';ctx.lineWidth=2;
      ctx.setLineDash([6,9]);ctx.beginPath();ctx.moveTo(ball.x,ball.y);ctx.lineTo(gx,gy);ctx.stroke();
      ctx.setLineDash([]);ctx.globalAlpha=1;ctx.beginPath();ctx.arc(gx,gy,12,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    // Readable possession halo makes it clear when shooting is possible.
    if(room.phase==='playing'&&Math.hypot(me.x-ball.x,me.y-ball.y)<45){
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
    lastCall = state.call;
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 8) trail.shift();
    trail.forEach((bit, i) => {
      ctx.fillStyle = 'rgba(255,255,255,' + (i / trail.length * 0.35) + ')';
      ctx.beginPath(); ctx.arc(bit.x, bit.y, 3 + i * 0.3, 0, Math.PI * 2); ctx.fill();
    });
    sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.life -= 1; ctx.fillStyle = s.color; ctx.globalAlpha = Math.max(0, s.life / 18); ctx.fillRect(s.x, s.y, 4, 4); ctx.globalAlpha = 1; });
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    if (state.star?.on) {
      ctx.save(); ctx.translate(state.star.x, state.star.y); ctx.rotate(tick*0.05); ctx.fillStyle='#ffe14a';
      ctx.beginPath(); for(let i=0;i<5;i++){const a=i*1.256-1.57,b=a+0.628;ctx.lineTo(Math.cos(a)*10,Math.sin(a)*10);ctx.lineTo(Math.cos(b)*4,Math.sin(b)*4);} ctx.closePath(); ctx.fill(); ctx.restore();
    }
    player(visualPose(state.jozef,'jozef'), jozefKit(), room.practice && room.who!=='Jozef' ? 'Rovers' : 'Jozef');
    player(visualPose(state.dad,'dad'), '#d7ff4a', room.practice && room.who!=='Dad' ? 'Rovers' : 'Dad');
    keeper('left', '#f4f7f2', 'Keeper');
    keeper('right', '#f4f7f2', 'Keeper');
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(ball.x + 2, ball.y + 5, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor='#e2faff';ctx.shadowBlur=Math.hypot(state.ball.vx,state.ball.vy)>4?15:4;
    const pace=Math.hypot(state.ball.vx,state.ball.vy);
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(ball.x+2,ball.y+7,7+pace*.2,3,0,0,Math.PI*2);ctx.fill();
    const ballGrad=ctx.createRadialGradient(ball.x-2.4,ball.y-2.6,1,ball.x,ball.y,8);
    ballGrad.addColorStop(0,'#ffffff');ballGrad.addColorStop(.7,'#e7eeea');ballGrad.addColorStop(1,'#b7c2bc');
    ctx.fillStyle=ballGrad;ctx.beginPath();ctx.arc(ball.x,ball.y,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='#24303a';ctx.lineWidth=1.1;ctx.stroke();
    ctx.strokeStyle='#8e9aa3';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(ball.x-6,ball.y-2);ctx.lineTo(ball.x-1,ball.y-6);ctx.lineTo(ball.x+4,ball.y-3);ctx.lineTo(ball.x+1,ball.y+2);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(ball.x-2,ball.y+2);ctx.lineTo(ball.x-5,ball.y+6);ctx.moveTo(ball.x+2,ball.y+1);ctx.lineTo(ball.x+6,ball.y+4);ctx.stroke();
    /* scoreboard is accessible HTML outside the canvas */
    /* ctx.fillStyle = '#08140f';
    ctx.fillRect(W / 2 - 78, 4, 156, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '800 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.score.jozef + '  ·  ' + state.score.dad + '   ' + Math.ceil(state.matchLeft || 0) + 's', W / 2, 22);
    */
    if (/scores/.test(state.call)) { ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(state.ball.x<W/2?20:W-20, state.ball.y, 16, 28, 0, 0, Math.PI*2); ctx.fill(); }
    if (state.call) {
      const pop = /scores|Full time/.test(state.call) ? 1.15 : 1;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      if(portrait)ctx.rotate(-Math.PI/2);
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
    if (!forced && kickLock > 0) return;
    const dx = state.ball.x - p.x, dy = state.ball.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > (forced ? 92 : 30)) return;
    if (forced) {
      if (kickLock > 0) return;
      const who=p===state.dad?'Dad':'Jozef',shot=shotOptions[who];
      const goalX = p === state.dad ? 18 : W-18;
      const goalY=Math.max(GOAL.y+14,Math.min(GOAL.y+GOAL.h-14,SHOT_LANES[shot.aim]));
      const sx=goalX-state.ball.x, sy=goalY-state.ball.y, length=Math.hypot(sx,sy)||1;
      const wobble = Math.min(0.35, length / 900);
      const speed=(state.super===who?15:(shot.power > 1.15 ? 12.4 : 8.6))*shot.power; if(state.super===who){state.super='';state.call='SUPER';}
      state.ball.vx=sx/length*speed; state.ball.vy=sy/length*speed + (Math.random()-0.5)*wobble*8;
      shot.power=1; kickLock=16; state.shots = (state.shots||0)+1;
      burst(state.ball.x, state.ball.y, '#fff', 10);
      return;
    }
    const speed = Math.hypot(p.vx, p.vy);
    if (speed < 0.4) return;
    const pace = Math.hypot(p.vx, p.vy);
    const ahead = 14 + Math.min(8, pace * 2);
    const leadX = p.x + (p.face || 1) * ahead;
    const first = Math.hypot(state.ball.vx, state.ball.vy) > pace * 1.8 ? 0.12 : 0.2;
    state.ball.x += (leadX - state.ball.x) * first;
    state.ball.y += (p.y - state.ball.y) * first;
    state.ball.vx += (p.vx * 0.85 - state.ball.vx) * 0.18;
    state.ball.vy += (p.vy * 0.85 - state.ball.vy) * 0.18;
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
    if(room.together){
      const mate=room.who==='Dad'?'Jozef':'Dad', bot=mate==='Dad'?state.dad:state.jozef, ball=state.ball;
      targets[mate]={x:Math.max(80,Math.min(640,ball.x-40)), y:ball.y};
      return 4.0;
    }
    const who=room.who==='Dad'?'Jozef':'Dad',bot=who==='Dad'?state.dad:state.jozef,ball=state.ball;
    const distance=Math.hypot(bot.x-ball.x,bot.y-ball.y);
    const homeX = who==='Dad' ? W-150 : 150;
    const ballInHisHalf = who==='Dad' ? ball.x > 300 : ball.x < 420;
    const go = ballInHisHalf || distance < 240;
    const lead = go ? 18 : 0;
    if(bot.stun>0){bot.stun--;targets[who]=null;}
    else targets[who]={
      x:Math.max(70,Math.min(W-70, go ? ball.x + (who==='Dad'?-lead:lead) : homeX)),
      y:Math.max(50,Math.min(H-50, go ? ball.y : 210))
    };
    if(distance<40) bot.carry=(bot.carry||0)+1; else bot.carry=0;
    if(bot.carry>18&&kickLock===0&&tick-lastBotKick>50){
      const miss=cpuDifficulty==='pro'&&Math.random()<0.3;
      const aim=cpuDifficulty==='legend'?(state.keepers?.[who==='Dad'?'left':'right']>210?0:2):(miss?1:(state.ball.y<185?0:state.ball.y>235?2:1));
      shotOptions[who]={aim, power:cpuDifficulty==='legend'?1.2:1.05};
      state.kick=who;lastBotKick=tick;bot.carry=0;
    }
    return cpuDifficulty==='legend'?4.6:cpuDifficulty==='rookie'?3.2:4.0;
  }
  function step() {
    if (!room.host || room.phase !== 'playing' || !localActive || !room.remoteActive) return;
    if (state.freeze > 0) { state.freeze -= 1; state.ball.vx = 0; state.ball.vy = 0; if (state.freeze === 1) reset(state.score.dad >= state.score.jozef ? 1 : -1); broadcast(); return; }
    // Freeze the simulation briefly after a goal: players can read the score,
    // the clock stays fair, and the fresh kickoff does not instantly deflect.
    if(kickoffHold>0){kickoffHold--;broadcast();return;}
    const cpuPace=practiceRival();
    const now=performance.now();
    move(state.dad,targets.Dad,room.practice&&room.who!=='Dad'?cpuPace:(now<sprintUntil.Dad?6.2:4.4));
    move(state.jozef,targets.Jozef,room.practice&&room.who!=='Jozef'?cpuPace:(now<sprintUntil.Jozef?6.2:4.4));
    touch(state.dad, state.kick === "Dad"); touch(state.jozef, state.kick === "Jozef"); state.kick = "";
    if (kickLock) kickLock -= 1;
    const physics = window.JozefPhysics;
    physics.integrate(state.ball, physics.BALL);
    if (!kickLock) {
      physics.collide(state.dad, state.ball, physics.PLAYER, physics.BALL);
      physics.collide(state.jozef, state.ball, physics.PLAYER, physics.BALL);
      physics.collide(state.dad, state.jozef, physics.PLAYER, physics.PLAYER);
    }
    if (state.star?.on) {
      for (const p of [state.dad, state.jozef]) {
        if (Math.hypot(p.x-state.star.x, p.y-state.star.y) < 22) { state.star.on=false; state.super=p===state.dad?'Dad':'Jozef'; state.call='Star'; setTimeout(()=>{state.star={x:120+Math.random()*480,y:80+Math.random()*260,on:true};}, 4000); }
      }
    }
    mindKeepers();
    physics.walls(state.ball, W, H, inGoal);
    state.matchLeft = Math.max(0, state.matchLeft - 1/60);
    if ((state.score.dad>=3||state.score.jozef>=3) && state.call!=='Full time') { state.call='Full time'; room.phase='finished'; finishPractice(); syncUI(); say((state.score.dad>state.score.jozef?'Dad':'Jozef')+' wins, first to 3.'); }
    else if (state.matchLeft <= 0 && state.call !== 'Full time') {
      if (state.score.dad===state.score.jozef) { state.call='Penalties'; state.ball={x:room.who==='Dad'?180:540,y:210,vx:0,vy:0}; say('Level. Penalties. Shoot.'); }
      else { state.call='Full time'; room.phase='finished'; finishPractice(); syncUI(); say((state.score.dad>state.score.jozef?'Dad':'Jozef')+' wins! Ready for a rematch?'); }
    }
    if (state.call === 'Full time') { broadcast(); return; }
    const post = state.ball.y < GOAL.y + 4 || state.ball.y > GOAL.y + GOAL.h - 4;
    if (state.ball.x < 40 && inGoal(state.ball.y) && !post) {
      if (save('left') && state.call!=='SUPER') { state.saves += 1; state.ball.x = 56; state.ball.vx = 5.5; state.ball.vy *= 0.4; state.call = 'Saved'; kickLock = 20; }
      else { state.score.dad += 1; state.call = 'GOAL Dad'; state.freeze = 70; burst(state.ball.x, state.ball.y, '#ffe14a', 40); }
    }
    else if (state.ball.x > W - 40 && inGoal(state.ball.y) && !post) {
      if (save('right') && state.call!=='SUPER') { state.saves += 1; state.ball.x = W - 56; state.ball.vx = -5.5; state.ball.vy *= 0.4; state.call = 'Saved'; kickLock = 20; }
      else { state.score.jozef += 1; state.call = 'GOAL Jozef'; state.freeze = 70; burst(state.ball.x, state.ball.y, '#7ee0ff', 40); }
    }
    else if ((state.ball.x < 40 || state.ball.x > W - 40) && post && inGoal(state.ball.y)) { state.ball.x = state.ball.x < W/2 ? 70 : W-70; state.ball.y = 60; state.ball.vx = 0; state.ball.vy = 0; state.call = 'Corner'; }
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
    state.dad.x = room.together?220:560; state.dad.y = 210;
    state.jozef.x = room.together?160:160; state.jozef.y = room.together?250:210;
    targets.Dad = null; targets.Jozef = null;
    for(const p of [state.dad,state.jozef]){p.vx=0;p.vy=0;}
    state.dad.face=-1;state.jozef.face=1;
    state.keepers={left:210,right:210};keeperState.left.commit=0;keeperState.right.commit=0;
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
    $('versus').classList.toggle('is-playing',playing);
    const stage=document.querySelector('.versus-stage'), play=document.querySelector('.versus-play'), board=document.querySelector('.versus-scoreboard'), card=document.querySelector('.versus-card');
    if(playing){
      if(card){card.style.cssText='position:relative;height:100dvh;padding:0;overflow:hidden;background:#061018';}
      if(stage){stage.style.cssText='position:absolute;inset:0;z-index:0';}
      if(canvas){canvas.style.cssText='width:100%;height:100%;object-fit:cover;display:block';}
      if(board){board.style.cssText='position:absolute;top:6px;left:8px;right:8px;z-index:4;margin:0;padding:4px 10px;background:rgba(6,16,24,.4);border-radius:12px';}
      if(play){play.style.cssText='position:absolute;left:0;right:0;bottom:0;z-index:4;background:transparent;padding:8px 10px 16px';}
      ['versus-aim','versus-deke','versus-pass'].forEach(id=>{const b=$(id);if(b)b.style.cssText='background:rgba(8,22,32,.4);color:#fff;border:1px solid rgba(255,255,255,.3)';});
      const kick=$('versus-kick'); if(kick) kick.style.background='rgba(208,255,105,.55)';
      const tip=$('versus-tip'); if(tip) tip.style.display='none';
    }
    document.body.classList.toggle('versus-focused',connected&&$('versus').classList.contains('active'));
    document.querySelectorAll('.versus-role').forEach(b=>{b.classList.toggle('is-on',b.dataset.who===room.who);b.setAttribute('aria-pressed',String(b.dataset.who===room.who));});
    $('versus-who').value=room.who; try{localStorage.setItem('jozefs-world-who', room.who);}catch(_){ }
    $('versus-cpu-label').hidden=!room.practice;
    renderPracticeRecord();
  }
  function stopInput(){keys.clear();stickVector=null;targets[room.who]=null;send({type:'aim',x:null,y:null});const nub=$('versus-nub'),stick=$('versus-stick');nub.style.left=(stick.clientWidth-nub.offsetWidth)/2+'px';nub.style.top=(stick.clientHeight-nub.offsetHeight)/2+'px';}
  function cleanup(){clearTimeout(connectTimer);clearTimeout(countdownTimer);const oldConn=room.conn,oldPeer=room.peer;room.conn=null;room.peer=null;oldConn?.close();oldPeer?.destroy();room.other='';room.ready=false;room.remoteReady=false;room.host=false;room.practice=false;room.remoteActive=true;room.phase='lobby';stopInput();syncUI();}
  function fail(message){cleanup();say(message);}
  function freshMatch(){state.kick='';state.score={dad:0,jozef:0};state.matchLeft=room.practice?practiceSeconds:120;state.call='Kickoff';kickLock=0;lastBotKick=-100;savedMatch=false;resultRecorded=false;nextLocalSprint=0;sprintUntil.Dad=sprintUntil.Jozef=0;sprintReady.Dad=sprintReady.Jozef=0;reset(0);
    const length=Math.ceil(state.matchLeft);$('versus-clock').textContent=Math.floor(length/60)+':'+String(length%60).padStart(2,'0');
  }
  function startMatch(){
    if(!room.host||!room.ready||!room.remoteReady||room.phase==='countdown')return;
    freshMatch();room.phase='countdown';let count=3;state.call='3';syncUI();broadcast();
    const next=()=>{if(room.phase!=='countdown')return;if(!localActive||!room.remoteActive){countdownTimer=setTimeout(next,250);return;}count--;state.call=count?String(count):'KICKOFF';if(!count){room.phase='playing';syncUI();say(room.practice?'Solo challenge / '+cpuDifficulty.toUpperCase()+' computer rival.':room.who+' vs '+room.other+' — game on.');setTimeout(()=>{if(state.call==='KICKOFF')state.call='';},800);}else countdownTimer=setTimeout(next,1000);broadcast();};
    countdownTimer=setTimeout(next,1000);
  }
  function ready(){if(!room.other||room.ready)return;room.ready=true;syncUI();send({type:'ready'});startMatch();}
  function validState(v){return v&&['dad','jozef','ball'].every(k=>v[k]&&['x','y','vx','vy'].every(n=>Number.isFinite(v[k][n])&&Math.abs(v[k][n])<2000))&&v.score&&['dad','jozef'].every(k=>Number.isInteger(v.score[k])&&v.score[k]>=0&&v.score[k]<10000)&&Number.isFinite(v.matchLeft)&&v.matchLeft>=0&&v.matchLeft<=120&&typeof v.call==='string'&&v.call.length<80;}
  function onData(msg){
    if(!msg||typeof msg!=='object')return;lastPacket=performance.now();
    if(msg.type==='hello'&&!room.host&&['Dad','Jozef'].includes(msg.hostWho)){
      room.other=msg.hostWho;room.who=msg.hostWho==='Dad'?'Jozef':'Dad';room.phase='waiting';syncUI();send({type:'joined'});say('You are '+room.who+'. Both players tap Ready.');
    }else if(msg.type==='joined'&&room.host&&room.phase==='waiting'){room.other=room.who==='Dad'?'Jozef':'Dad';send({type:'ack'});syncUI();say(room.other+' joined. Both players tap Ready.');}
    else if(msg.type==='ack'&&!room.host&&room.phase==='waiting'){say('Connected as '+room.who+'. Both players tap Ready.');}
    else if(msg.type==='ready'&&room.host&&room.phase==='waiting'){room.remoteReady=true;startMatch();}
    else if(msg.type==='aim'&&room.host&&room.phase==='playing'){
      if(msg.x===null&&msg.y===null)targets[room.other]=null;
      else if(Number.isFinite(msg.x)&&Number.isFinite(msg.y))targets[room.other]={x:Math.max(30,Math.min(690,msg.x)),y:Math.max(30,Math.min(390,msg.y))};
    }else if(msg.type==='sprint'&&room.host&&room.phase==='playing'){activateSprint(room.other);
    }else if(msg.type==='kick'&&room.host&&room.phase==='playing'){
      shotOptions[room.other]={aim:Number.isInteger(msg.aim)&&msg.aim>=0&&msg.aim<=2?msg.aim:1,
        power:Number.isFinite(msg.power)?Math.max(.9,Math.min(1.6,msg.power)):1};
      state.kick=room.other;
    }
    else if(msg.type==='state'&&!room.host&&validState(msg.state)&&['waiting','countdown','playing','finished'].includes(msg.phase)){
      if(msg.phase==='countdown'&&room.phase!=='countdown')resultRecorded=false;
      Object.assign(state,msg.state);const changed=room.phase!==msg.phase||room.remoteActive!==(msg.active!==false);room.phase=msg.phase;room.remoteActive=msg.active!==false;if(changed){syncUI();if(!room.remoteActive)say('Paused — opponent switched away.');}
      if(room.phase==='finished')say(state.score.dad===state.score.jozef?'Full time — a draw. Rematch?':(state.score.dad>state.score.jozef?'Dad':'Jozef')+' wins! Ready for a rematch?');
    }else if(msg.type==='active'){room.remoteActive=msg.active===true;if(!room.remoteActive)targets[room.other]=null;syncUI();say(room.remoteActive?'Opponent is back.':'Paused — opponent switched away.');}
    else if(msg.type==='rematch'&&room.host&&room.phase==='finished'){prepareRematch();}
    else if(msg.type==='lobby'&&!room.host){room.phase='waiting';room.ready=false;room.remoteReady=false;resultRecorded=false;syncUI();say('Rematch — both players tap Ready.');}
    else if(msg.type==='ping')send({type:'pong'});
  }
  function prepareRematch(){if(room.practice){room.ready=room.remoteReady=true;startMatch();return;}room.phase='waiting';room.ready=false;room.remoteReady=false;syncUI();send({type:'lobby'});say('Rematch — both players tap Ready.');}
  function wire(conn){
    if(room.conn){conn.close();return;}room.conn=conn;conn.on('data',onData);
    let opened=false;
    const onOpen=()=>{if(opened||room.conn!==conn)return;opened=true;clearTimeout(connectTimer);lastPacket=performance.now();room.phase='waiting';if(room.host)send({type:'hello',hostWho:room.who});else if(room.other)send({type:'joined'});syncUI();};
    conn.on('open',onOpen);
    // WebKit can open a data channel before an event handler attaches.
    if(conn.open)queueMicrotask(onOpen);
    conn.on('close',()=>{if(room.conn!==conn)return;room.conn=null;fail('Opponent disconnected. Create or join a room to play again.');});
    conn.on('error',()=>fail('Connection lost. Create or join a room to retry.'));
  }
  function connect(host){
    if(!window.Peer){say('Online play is unavailable. Try Practice solo or reload when connected.');return;}
    const code=host?Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[n%24]).join(''):$('versus-code').value.trim().toUpperCase();
    if(!/^[A-Z]{6}$/.test(code)){say('Enter the six-letter code from the other player.');$('versus-code').focus();return;}
    cleanup();room.code=code;room.host=host;room.phase='connecting';syncUI();say(host?'Creating your room…':'Joining room…');
    const peer=new Peer(host?'jw-rival-'+code:undefined);room.peer=peer;
    connectTimer=setTimeout(()=>{if(room.phase==='connecting')fail('Could not connect. Check the code and connection, then retry.');},15000);
    peer.on('open',()=>{if(room.peer!==peer)return;if(host){clearTimeout(connectTimer);room.phase='waiting';syncUI();say('Share the code. Your opponent joins automatically as the other player.');}else wire(peer.connect('jw-rival-'+code,{reliable:true}));});
    peer.on('connection',conn=>{if(!room.host||room.conn){conn.on('open',()=>conn.close());return;}wire(conn);});
    peer.on('error',err=>{if(room.peer===peer)fail(err.type==='peer-unavailable'?'Room not found. Check the code and ask the host to keep it open.':'Could not open the room. Try again or practice solo.');});
  }
  document.querySelectorAll('.versus-role').forEach(b=>b.addEventListener('click',()=>{if(room.phase==='lobby'){room.who=b.dataset.who;syncUI();}}));
  $('versus-open').addEventListener('click',()=>connect(true));$('versus-join').addEventListener('click',()=>connect(false));
  $('versus-code').addEventListener('keydown',e=>{if(e.key==='Enter')connect(false);});
  $('versus-ready').addEventListener('click',ready);
  $('versus-leave').addEventListener('click',()=>{cleanup();say('Create a room, join with a code, or warm up solo.');});
  document.querySelectorAll('.versus-spot').forEach(b=>b.addEventListener('click',()=>{if(room.phase!=='lobby')return;room.spot=b.dataset.spot;document.querySelectorAll('.versus-spot').forEach(n=>{n.classList.toggle('is-on',n===b);n.setAttribute('aria-pressed',String(n===b));});}));
  $('versus-together')?.addEventListener('click',()=>{
    const chosen=$('versus-cpu-difficulty').value;
    cpuDifficulty=Object.hasOwn(cpuOptions,chosen)?chosen:'pro';
    practiceSeconds=$('versus-practice-length').value==='60'?60:120;
    cleanup();room.host=true;room.practice=true;room.together=true;room.ready=room.remoteReady=true;room.phase='waiting';startMatch();
    say('Same team. You and '+ (room.who==='Dad'?'Jozef':'Dad') +' against Rovers.');
  });
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
      const side=room.together||room.who==='Jozef'?'left':'right';
      state.keepers[side]=Math.max(GOAL.y+16,Math.min(GOAL.y+GOAL.h-16,y));
      if(!room.host)send({type:'keeper',y:state.keepers[side]});
      return;
    }
    targets[room.who]={x,y};if(!room.host)send({type:'aim',x,y});
  }
  function aimFrom(e){const r=canvas.getBoundingClientRect(),vw=portrait?H:W,vh=portrait?W:H,scale=Math.min(r.width/vw,r.height/vh),x=(e.clientX-r.left-(r.width-vw*scale)/2)/scale,y=(e.clientY-r.top-(r.height-vh*scale)/2)/scale;aim(portrait?y:x,portrait?H-x:y);}
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
  function deke(){
    if(room.phase!=='playing')return;
    const me=room.who==='Dad'?state.dad:state.jozef;
    const other=room.who==='Dad'?state.jozef:state.dad;
    const gap=Math.hypot(me.x-other.x, me.y-other.y);
    const step=(me.face||1)*46;
    me.x+=step; me.y+= (other.y>me.y?-18:18);
    state.ball.x=me.x+(me.face||1)*16; state.ball.y=me.y; state.ball.vx=me.vx; state.ball.vy=0;
    if(gap<70){ other.stun=40; other.vy+=(other.y>me.y?3:-3); state.call='Ankles'; burst(other.x, other.y, '#ffe14a', 16); navigator.vibrate?.(25); }
    else state.call='Deke';
  }
  function shoot(){
    localKick(1+chargeFill*.6);chargeFill=0;chargingSince=0;
    $('versus-kick').style.setProperty('--shot-charge','0%');
  }
  $('versus-aim').addEventListener('click',()=>pickAim((selectedAim+1)%3));
  $('versus-deke')?.addEventListener('click', deke);
  $('versus-pass')?.addEventListener('click', () => localKick(0.7));
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
  function activity(){const active=!document.hidden&&$('versus').classList.contains('active');if(active!==localActive){localActive=active;stopInput();send({type:'active',active});syncUI();}document.body.classList.toggle('versus-focused',active&&room.phase!=='lobby');}
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
      if(vector&&now-lastSent>40){aim(me.x+(portrait?vector.y:vector.x)*90,me.y+(portrait?-vector.x:vector.y)*90);lastSent=now;}
      else if(!vector && room.phase==='playing' && now-lastSent>80){aim(state.ball.x, state.ball.y);lastSent=now;}
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
    if(room.host&&room.conn?.open&&room.phase==='waiting'&&!room.other&&now-lastHello>900){send({type:'hello',hostWho:room.who});lastHello=now;}
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
