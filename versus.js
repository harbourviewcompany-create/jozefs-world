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
  function fitCamera(){const r=canvas.parentElement.getBoundingClientRect();const next=r.height>r.width*1.15;if(next===portrait)return;portrait=next;canvas.width=(portrait?H:W)*dpr;canvas.height=(portrait?W:H)*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);if(portrait){ctx.translate(H,0);ctx.rotate(Math.PI/2);}}
  const GOAL = { x: 36, y: 150, w: 18, h: 120 };
  const room = { code: '', who: 'Dad', peer: null, conn: null, host: false, other: '', ready: false, remoteReady: false, practice: false, phase: 'lobby', remoteActive: true };
  let connectTimer, countdownTimer, lastPacket = 0, lastSent = 0, localActive = true;
  let stickVector = null;
  const keys = new Set();
  const state = {
    ball: { x: 360, y: 210, vx: 0, vy: 0 },
    dad: { x: 560, y: 210, vx: 0, vy: 0, face: -1 },
    jozef: { x: 160, y: 210, vx: 0, vy: 0, face: 1 },
    score: { dad: 0, jozef: 0 },
    matchLeft: 120,
    call: 'Kickoff'
  };
  const targets = { Dad: null, Jozef: null };
  let kickLock = 0;
  const trail = [];
  const sparks = [];
  let tick = 0;
  let lastCall = '';
  let shake = 0;

  function say(text) {
    const node = $('versus-status');
    const line = text;
    if (node) node.textContent = line;
    const hq = $('hq-versus');
    if (hq) hq.textContent = line;
  }
  function lights() {
    $('light-dad')?.classList.toggle('on', room.who === 'Dad' || room.other === 'Dad');
    $('light-jozef')?.classList.toggle('on', room.who === 'Jozef' || room.other === 'Jozef');
  }

  // Static stadium is rendered once; animation only redraws athletes and effects.
  const stadium = document.createElement('canvas'); stadium.width = W * dpr; stadium.height = H * dpr;
  const paint = stadium.getContext('2d'); paint.scale(dpr,dpr);
  function buildStadium() {
    const g=paint.createLinearGradient(0,0,0,H);g.addColorStop(0,'#11283d');g.addColorStop(1,'#040c17');paint.fillStyle=g;paint.fillRect(0,0,W,H);
    for(let y=4;y<H;y+=8)for(let x=4;x<W;x+=10){paint.fillStyle=['#234355','#3a5c69','#719190'][(x+y)%3];paint.fillRect(x,y,3,3);}
    paint.fillStyle='#071821';paint.fillRect(20,16,680,388);
    const grass=paint.createLinearGradient(0,24,0,396);grass.addColorStop(0,'#24745e');grass.addColorStop(1,'#103c38');paint.fillStyle=grass;paint.fillRect(28,22,664,376);
    for(let x=28;x<692;x+=55){paint.fillStyle='rgba(166,235,197,.055)';paint.fillRect(x,22,27,376);}
    // Deterministic grass flecks avoid expensive per-frame noise generation.
    for(let i=0;i<2600;i++){paint.fillStyle=i%2?'#c7ffe00a':'#00181019';paint.fillRect(29+(i*137%662),23+(i*67%374),1,2);}
    paint.strokeStyle='#d5f3df99';paint.lineWidth=1.5;paint.strokeRect(28,22,664,376);
    paint.beginPath();paint.moveTo(360,22);paint.lineTo(360,398);paint.stroke();
    paint.beginPath();paint.arc(360,210,48,0,Math.PI*2);paint.stroke();
    paint.strokeRect(28,110,92,200);paint.strokeRect(600,110,92,200);
    paint.strokeRect(28,156,36,108);paint.strokeRect(656,156,36,108);
    for(const x of [12,686]){paint.fillStyle='#c8faff20';paint.fillRect(x,150,22,120);paint.strokeStyle='#b9e5ee44';paint.lineWidth=1;for(let y=150;y<=270;y+=8){paint.beginPath();paint.moveTo(x,y);paint.lineTo(x+22,y);paint.stroke();}for(let k=0;k<=22;k+=6){paint.beginPath();paint.moveTo(x+k,150);paint.lineTo(x+k,270);paint.stroke();}paint.strokeStyle='#eefeff';paint.lineWidth=3;paint.strokeRect(x,150,22,120);}
    paint.shadowBlur=12;paint.shadowColor='#69d5ff';paint.fillStyle='#84e9ff';paint.fillRect(52,13,220,2);paint.fillRect(448,405,220,2);paint.shadowColor='#d0ff69';paint.fillStyle='#d0ff69';paint.fillRect(448,13,220,2);paint.fillRect(52,405,220,2);paint.shadowBlur=0;
    for(const x of [50,670]){const light=paint.createRadialGradient(x,12,0,x,12,240);light.addColorStop(0,'#dcffff22');light.addColorStop(1,'#ffffff00');paint.fillStyle=light;paint.fillRect(0,0,W,H);}
  }
  buildStadium();
  function pitch(){ctx.drawImage(stadium,0,0,W,H);}
  function player(p,color,name){
    const moving=Math.hypot(p.vx,p.vy)>.25;
    const stride=moving?Math.sin(tick*.23)*5:0;
    ctx.save();ctx.translate(p.x,p.y);if(portrait)ctx.rotate(-Math.PI/2);ctx.scale(1.3,1.3);
    ctx.fillStyle='#020b1290';ctx.beginPath();ctx.ellipse(4,17,15,6,0,0,Math.PI*2);ctx.fill();
    if(name===room.who){ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,16,18,8,0,0,Math.PI*2);ctx.stroke();}
    ctx.lineCap='round';ctx.lineWidth=6;ctx.strokeStyle='#142439';
    ctx.beginPath();ctx.moveTo(-5,7);ctx.lineTo(-6+stride,19);ctx.moveTo(5,7);ctx.lineTo(6-stride,19);ctx.stroke();
    ctx.strokeStyle='#e4fff4';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-6+stride,19);ctx.lineTo(-2+stride,20);ctx.moveTo(6-stride,19);ctx.lineTo(10-stride,20);ctx.stroke();
    ctx.strokeStyle='#bd8d69';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-8,-5);ctx.lineTo(-13,-1-stride);ctx.moveTo(8,-5);ctx.lineTo(13,-1+stride);ctx.stroke();
    const kit=ctx.createLinearGradient(-9,0,10,0);kit.addColorStop(0,color);kit.addColorStop(1,'#234254');ctx.fillStyle=kit;ctx.beginPath();ctx.roundRect(-10,-10,20,23,5);ctx.fill();
    ctx.fillStyle='#e6fff1';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText('11',0,5);
    ctx.fillStyle='#d6a980';ctx.beginPath();ctx.arc(0,-16,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29211f';ctx.beginPath();ctx.arc(0,-18,7,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='#071724d9';ctx.beginPath();ctx.roundRect(-25,-42,50,15,5);ctx.fill();ctx.fillStyle='#ecfffa';ctx.font='bold 10px system-ui';ctx.fillText(name,0,-31);
    ctx.restore();
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
    if (state.call && state.call !== lastCall && /scores|Full time|post/.test(state.call)) { burst(ball.x, ball.y, state.call.includes('Dad') ? '#d7ff4a' : '#7ee0ff', 24); shake = 10; }
    lastCall = state.call;
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 8) trail.shift();
    trail.forEach((bit, i) => {
      ctx.fillStyle = 'rgba(255,255,255,' + (i / trail.length * 0.35) + ')';
      ctx.beginPath(); ctx.arc(bit.x, bit.y, 3 + i * 0.3, 0, Math.PI * 2); ctx.fill();
    });
    sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.life -= 1; ctx.fillStyle = s.color; ctx.globalAlpha = Math.max(0, s.life / 18); ctx.fillRect(s.x, s.y, 4, 4); ctx.globalAlpha = 1; });
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    player(visualPose(state.jozef,'jozef'), '#60c5ff', 'Jozef');
    player(visualPose(state.dad,'dad'), '#d7ff4a', 'Dad');
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(ball.x + 2, ball.y + 5, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7f7f2';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#233549'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#263848';ctx.beginPath();ctx.arc(ball.x+Math.sin(tick*.12)*2,ball.y-1,2.5,0,Math.PI*2);ctx.fill();
    /* scoreboard is accessible HTML outside the canvas */
    /* ctx.fillStyle = '#08140f';
    ctx.fillRect(W / 2 - 78, 4, 156, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '800 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.score.jozef + '  ·  ' + state.score.dad + '   ' + Math.ceil(state.matchLeft || 0) + 's', W / 2, 22);
    */
    if (state.call) {
      const pop = /scores|Full time/.test(state.call) ? 1.15 : 1;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      if(portrait)ctx.rotate(-Math.PI/2);
      ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(8,20,15,.78)';
      ctx.fillRect(-96, -18, 192, 34);
      ctx.fillStyle = '#fff';
      ctx.fillText(state.call, 0, 4);
      ctx.restore();
    }
    ctx.restore();
  }

  function move(p, target) {
    if (!target) { p.vx *= 0.8; p.vy *= 0.8; }
    else {
      const dx = target.x - p.x, dy = target.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const want = dist < 8 ? 0 : Math.min(3.1, dist * 0.08);
      p.vx += (dx / dist * want - p.vx) * 0.25;
      p.vy += (dy / dist * want - p.vy) * 0.25;
      if (Math.abs(p.vx) > 0.3) p.face = p.vx > 0 ? 1 : -1;
    }
    p.x = Math.max(46, Math.min(W - 46, p.x + p.vx * (25/60)));
    p.y = Math.max(40, Math.min(H - 40, p.y + p.vy * (25/60)));
  }

  function touch(p, forced) {
    // Give a struck ball time to leave the player's dribble radius.
    if (!forced && kickLock > 0) return;
    const dx = state.ball.x - p.x, dy = state.ball.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > (forced ? 64 : 30)) return;
    if (forced) {
      if (kickLock > 0) return;
      const goalX = p === state.dad ? 20 : W-20;
      const goalY = Math.max(GOAL.y+12,Math.min(GOAL.y+GOAL.h-12,H/2+p.vy*12));
      const dx=goalX-state.ball.x,dy=goalY-state.ball.y,length=Math.hypot(dx,dy)||1;
      state.ball.vx = dx/length*8.4;
      state.ball.vy = dy/length*8.4;
      kickLock = 18;
      burst(state.ball.x, state.ball.y, '#fff', 10);
      return;
    }
    const ahead = 18;
    state.ball.x += ((p.x + (p.face || 1) * ahead) - state.ball.x) * 0.35;
    state.ball.y += (p.y - state.ball.y) * 0.35;
    state.ball.vx = p.vx;
    state.ball.vy = p.vy;
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

  function step() {
    if (!room.host || room.phase !== 'playing' || !localActive || !room.remoteActive) return;
    move(state.dad, targets.Dad);
    move(state.jozef, targets.Jozef);
    touch(state.dad, state.kick === "Dad"); touch(state.jozef, state.kick === "Jozef"); state.kick = "";
    if (kickLock) kickLock -= 1;
    state.ball.x += state.ball.vx * (25/60);
    state.ball.y += state.ball.vy * (25/60);
    state.ball.vx *= Math.pow(.985,25/60); state.ball.vy *= Math.pow(.985,25/60);
    separate(state.dad); separate(state.jozef);
    if (state.ball.y < 34) { state.ball.y = 34; state.ball.vy = Math.abs(state.ball.vy) + 0.4; }
    if (state.ball.y > H - 34) { state.ball.y = H - 34; state.ball.vy = -Math.abs(state.ball.vy) - 0.4; }
    state.matchLeft = Math.max(0, state.matchLeft - 1/60);
    if (state.matchLeft <= 0 && state.call !== 'Full time') { state.call = 'Full time'; room.phase='finished'; state.ball.vx = 0; state.ball.vy = 0; syncUI(); say(state.score.dad===state.score.jozef?'Full time — a draw. Rematch?':(state.score.dad>state.score.jozef?'Dad':'Jozef')+' wins! Ready for a rematch?'); }
    if (state.call === 'Full time') { broadcast(); return; }
    const post = state.ball.y < GOAL.y + 6 || state.ball.y > GOAL.y + GOAL.h - 6;
    if (state.ball.x < 30 && inGoal(state.ball.y) && !post) { state.score.dad += 1; state.call = 'Dad scores'; reset(1); }
    else if (state.ball.x > W - 30 && inGoal(state.ball.y) && !post) { state.score.jozef += 1; state.call = 'Jozef scores'; reset(-1); }
    else if ((state.ball.x < 34 || state.ball.x > W - 34) && post && inGoal(state.ball.y)) { state.ball.vx *= -1; state.call = 'Off the post'; }
    else if (state.ball.x < 34) { state.ball.x = 34; state.ball.vx = Math.abs(state.ball.vx) + 0.6; }
    else if (state.ball.x > W - 34) { state.ball.x = W - 34; state.ball.vx = -Math.abs(state.ball.vx) - 0.6; }
    if (state.ball.x < 70 && state.ball.y < 70 && Math.hypot(state.ball.vx, state.ball.vy) < 1) { state.ball.vx += 1.4; state.ball.vy += 1.4; }
    if (state.ball.x > W - 70 && state.ball.y < 70 && Math.hypot(state.ball.vx, state.ball.vy) < 1) { state.ball.vx -= 1.4; state.ball.vy += 1.4; }
    if (Math.hypot(state.ball.vx, state.ball.vy) < 0.4) state.call = state.call === 'Kickoff' ? state.call : '';
    broadcast();
  }

  function reset(dir) {
    state.ball = { x: 360, y: 210, vx: dir * 1.4, vy: 0 };
    state.dad.x = 560; state.dad.y = 210;
    state.jozef.x = 160; state.jozef.y = 210;
    targets.Dad = null; targets.Jozef = null;
    for(const p of [state.dad,state.jozef]){p.vx=0;p.vy=0;}
    state.dad.face=-1;state.jozef.face=1;
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
    $('versus-ready').disabled=!room.other||room.ready;
    $('versus-ready').textContent=room.ready?'Ready — waiting for opponent':room.other?'Ready to play':'Waiting for opponent';
    $('versus-room-code').textContent=room.code;
    $('versus').classList.toggle('is-playing',playing);
    document.body.classList.toggle('versus-focused',connected&&$('versus').classList.contains('active'));
    document.querySelectorAll('.versus-role').forEach(b=>{b.classList.toggle('is-on',b.dataset.who===room.who);b.setAttribute('aria-pressed',String(b.dataset.who===room.who));});
    $('versus-who').value=room.who;
  }
  function stopInput(){keys.clear();stickVector=null;targets[room.who]=null;send({type:'aim',x:null,y:null});const nub=$('versus-nub');nub.style.left='28px';nub.style.top='28px';}
  function cleanup(){clearTimeout(connectTimer);clearTimeout(countdownTimer);const oldConn=room.conn,oldPeer=room.peer;room.conn=null;room.peer=null;oldConn?.close();oldPeer?.destroy();room.other='';room.ready=false;room.remoteReady=false;room.host=false;room.practice=false;room.remoteActive=true;room.phase='lobby';stopInput();syncUI();}
  function fail(message){cleanup();say(message);}
  function freshMatch(){state.kick='';state.score={dad:0,jozef:0};state.matchLeft=120;state.call='Kickoff';kickLock=0;reset(0);}
  function startMatch(){
    if(!room.host||!room.ready||!room.remoteReady||room.phase==='countdown')return;
    freshMatch();room.phase='countdown';let count=3;state.call='3';syncUI();broadcast();
    const next=()=>{if(room.phase!=='countdown')return;if(!localActive||!room.remoteActive){countdownTimer=setTimeout(next,250);return;}count--;state.call=count?String(count):'KICKOFF';if(!count){room.phase='playing';syncUI();say(room.practice?'Practice — move and shoot.':room.who+' vs '+room.other+' — game on.');setTimeout(()=>{if(state.call==='KICKOFF')state.call='';},800);}else countdownTimer=setTimeout(next,1000);broadcast();};
    countdownTimer=setTimeout(next,1000);
  }
  function ready(){if(!room.other||room.ready)return;room.ready=true;syncUI();send({type:'ready'});startMatch();}
  function validState(v){return v&&['dad','jozef','ball'].every(k=>v[k]&&['x','y','vx','vy'].every(n=>Number.isFinite(v[k][n])&&Math.abs(v[k][n])<2000))&&v.score&&['dad','jozef'].every(k=>Number.isInteger(v.score[k])&&v.score[k]>=0&&v.score[k]<10000)&&Number.isFinite(v.matchLeft)&&v.matchLeft>=0&&v.matchLeft<=120&&typeof v.call==='string'&&v.call.length<80;}
  function onData(msg){
    if(!msg||typeof msg!=='object')return;lastPacket=performance.now();
    if(msg.type==='hello'&&!room.host&&['Dad','Jozef'].includes(msg.hostWho)){
      room.other=msg.hostWho;room.who=msg.hostWho==='Dad'?'Jozef':'Dad';room.phase='waiting';syncUI();send({type:'joined'});say('You are '+room.who+'. Both players tap Ready.');
    }else if(msg.type==='joined'&&room.host){room.other=room.who==='Dad'?'Jozef':'Dad';syncUI();say(room.other+' joined. Both players tap Ready.');}
    else if(msg.type==='ready'&&room.host&&room.phase==='waiting'){room.remoteReady=true;startMatch();}
    else if(msg.type==='aim'&&room.host&&room.phase==='playing'){
      if(msg.x===null&&msg.y===null)targets[room.other]=null;
      else if(Number.isFinite(msg.x)&&Number.isFinite(msg.y))targets[room.other]={x:Math.max(30,Math.min(690,msg.x)),y:Math.max(30,Math.min(390,msg.y))};
    }else if(msg.type==='kick'&&room.host&&room.phase==='playing')state.kick=room.other;
    else if(msg.type==='state'&&!room.host&&validState(msg.state)&&['waiting','countdown','playing','finished'].includes(msg.phase)){
      Object.assign(state,msg.state);const changed=room.phase!==msg.phase||room.remoteActive!==(msg.active!==false);room.phase=msg.phase;room.remoteActive=msg.active!==false;if(changed){syncUI();if(!room.remoteActive)say('Paused — opponent switched away.');}
      if(room.phase==='finished')say(state.score.dad===state.score.jozef?'Full time — a draw. Rematch?':(state.score.dad>state.score.jozef?'Dad':'Jozef')+' wins! Ready for a rematch?');
    }else if(msg.type==='active'){room.remoteActive=msg.active===true;if(!room.remoteActive)targets[room.other]=null;syncUI();say(room.remoteActive?'Opponent is back.':'Paused — opponent switched away.');}
    else if(msg.type==='rematch'&&room.host&&room.phase==='finished'){prepareRematch();}
    else if(msg.type==='lobby'&&!room.host){room.phase='waiting';room.ready=false;room.remoteReady=false;syncUI();say('Rematch — both players tap Ready.');}
    else if(msg.type==='ping')send({type:'pong'});
  }
  function prepareRematch(){if(room.practice){room.ready=room.remoteReady=true;startMatch();return;}room.phase='waiting';room.ready=false;room.remoteReady=false;syncUI();send({type:'lobby'});say('Rematch — both players tap Ready.');}
  function wire(conn){
    if(room.conn){conn.close();return;}room.conn=conn;conn.on('data',onData);
    conn.on('open',()=>{clearTimeout(connectTimer);lastPacket=performance.now();room.phase='waiting';if(room.host)send({type:'hello',hostWho:room.who});else if(room.other)send({type:'joined'});syncUI();});
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
  $('versus-practice').addEventListener('click',()=>{cleanup();room.host=true;room.practice=true;room.ready=room.remoteReady=true;room.phase='waiting';startMatch();});
  $('versus-share').addEventListener('click',async()=>{const url=new URL(location.href);url.hash='versus';url.searchParams.set('room',room.code);try{await navigator.clipboard.writeText(url.href);say('Invite copied. Send it to your opponent.');}catch{say('Your room code is '+room.code+'. Share it with your opponent.');}});
  $('versus-again').addEventListener('click',()=>{if(room.phase!=='finished')return;if(room.host)prepareRematch();else{send({type:'rematch'});say('Rematch requested.');}});
  function aim(x,y){if(room.phase!=='playing')return;targets[room.who]={x,y};if(!room.host)send({type:'aim',x,y});}
  function aimFrom(e){const r=canvas.getBoundingClientRect(),vw=portrait?H:W,vh=portrait?W:H,scale=Math.min(r.width/vw,r.height/vh),x=(e.clientX-r.left-(r.width-vw*scale)/2)/scale,y=(e.clientY-r.top-(r.height-vh*scale)/2)/scale;aim(portrait?y:x,portrait?H-x:y);}
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);aimFrom(e);});canvas.addEventListener('pointermove',e=>{if(e.buttons)aimFrom(e);});canvas.addEventListener('pointercancel',stopInput);
  const stick=$('versus-stick'),nub=$('versus-nub');
  function fromStick(e){const r=stick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/32,y=(e.clientY-r.top-r.height/2)/32;const length=Math.max(1,Math.hypot(x,y));x/=length;y/=length;stickVector={x,y};nub.style.left=28+x*24+'px';nub.style.top=28+y*24+'px';}
  stick.addEventListener('pointerdown',e=>{stick.setPointerCapture(e.pointerId);fromStick(e);});stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))fromStick(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,stopInput);
  function shoot(){if(room.phase!=='playing'||!localActive||!room.remoteActive)return;const me=room.who==='Dad'?state.dad:state.jozef;if(Math.hypot(me.x-state.ball.x,me.y-state.ball.y)>64){$('versus-tip').textContent='Move closer to the ball';return;}$('versus-tip').textContent='Aim with your run. Shoot for goal!';if(room.host)state.kick=room.who;else send({type:'kick'});}
  $('versus-kick').addEventListener('click',shoot);
  window.addEventListener('keydown',e=>{if(!$('versus').classList.contains('active')||room.phase!=='playing'||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(key===' '&&e.target.tagName==='BUTTON')return;if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key)){e.preventDefault();keys.add(key);if(key===' '&&!e.repeat)shoot();}});
  window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(!keys.size)stopInput();});
  function activity(){const active=!document.hidden&&$('versus').classList.contains('active');if(active!==localActive){localActive=active;stopInput();send({type:'active',active});syncUI();}document.body.classList.toggle('versus-focused',active&&room.phase!=='lobby');}
  document.addEventListener('visibilitychange',activity);window.addEventListener('blur',stopInput);
  new MutationObserver(activity).observe($('versus'),{attributes:true,attributeFilter:['class']});
  const invite=new URLSearchParams(location.search).get('room');if(invite&&/^[A-Z]{6}$/.test(invite))$('versus-code').value=invite;
  let previous=performance.now(),accumulator=0,heartbeat=0,uiTime=0;
  function frame(now){
    const dt=Math.min((now-previous)/1000,.1);previous=now;activity();
    if(localActive){
      const me=room.who==='Dad'?state.dad:state.jozef;
      const x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
      const vector=stickVector||(x||y?{x,y}:null);
      if(vector&&now-lastSent>40){aim(me.x+(portrait?vector.y:vector.x)*90,me.y+(portrait?-vector.x:vector.y)*90);lastSent=now;}
      accumulator+=dt;while(accumulator>=1/60){step();accumulator-=1/60;}draw();
      if(now-uiTime>100){$('versus-score-dad').textContent=state.score.dad;$('versus-score-jozef').textContent=state.score.jozef;const seconds=Math.ceil(state.matchLeft);$('versus-clock').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');uiTime=now;}
    }else accumulator=0;
    if(room.conn?.open&&now-heartbeat>2000){send({type:'ping'});heartbeat=now;if(now-lastPacket>12000)fail('Connection interrupted. Rejoin to start a fresh match.');}
    requestAnimationFrame(frame);
  }
  syncUI();draw();requestAnimationFrame(frame);
})();
