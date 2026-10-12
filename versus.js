/* Versus: a private two-player pitch. Host runs the ball. Live only while both are in the room. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('versus-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 720, H = 420;
  canvas.width = W; canvas.height = H;
  const GOAL = { x: 36, y: 150, w: 18, h: 120 };
  const room = { code: 'JOZEF', who: 'Dad', peer: null, conn: null, host: false, other: '' };
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
    const score = state.score.jozef + '-' + state.score.dad;
    const line = text + '  ' + score;
    if (node) node.textContent = line;
    const hq = $('hq-versus');
    if (hq) hq.textContent = line;
  }
  function lights() {
    $('light-dad')?.classList.toggle('on', room.who === 'Dad' || room.other === 'Dad');
    $('light-jozef')?.classList.toggle('on', room.who === 'Jozef' || room.other === 'Jozef');
  }

  function pitch() {
    const stripe = 28;
    for (let x = 0; x < W; x += stripe) {
      ctx.fillStyle = x / stripe % 2 ? '#1f8a4c' : '#187a42';
      ctx.fillRect(x, 0, stripe, H);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 22, W - 56, H - 44);
    ctx.beginPath(); ctx.moveTo(W / 2, 22); ctx.lineTo(W / 2, H - 22); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(28, 110, 92, 200);
    ctx.strokeRect(W - 120, 110, 92, 200);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(12, GOAL.y, 22, GOAL.h);
    ctx.fillRect(W - 34, GOAL.y, 22, GOAL.h);
    ctx.strokeStyle = '#f4f7f2'; ctx.lineWidth = 4;
    ctx.strokeRect(12, GOAL.y, 22, GOAL.h);
    ctx.strokeRect(W - 34, GOAL.y, 22, GOAL.h);
  }

  function player(p, color, name) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.face || 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(0, 18, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(-7, 18); ctx.moveTo(5, 8); ctx.lineTo(7, 18); ctx.stroke();
    const bob = Math.abs(p.vx) + Math.abs(p.vy) > 0.4 ? Math.sin(tick / 3) * 2 : 0;
    ctx.translate(0, bob);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(-9, -4, 18, 16, 4); ctx.fill();
    ctx.fillStyle = '#f3d3b8';
    ctx.beginPath(); ctx.arc(0, -10, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(name, p.x, p.y - 24);
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) sparks.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.8) * 6, life: 18, color });
  }
  function draw() {
    if (!ctx) return;
    tick += 1;
    ctx.save();
    if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake -= 1; }
    pitch();
    if (state.call && state.call !== lastCall && /scores|Full time|post/.test(state.call)) { burst(state.ball.x, state.ball.y, state.call.includes('Dad') ? '#d7ff4a' : '#7ee0ff', 24); shake = 10; }
    lastCall = state.call;
    trail.push({ x: state.ball.x, y: state.ball.y });
    if (trail.length > 8) trail.shift();
    trail.forEach((bit, i) => {
      ctx.fillStyle = 'rgba(255,255,255,' + (i / trail.length * 0.35) + ')';
      ctx.beginPath(); ctx.arc(bit.x, bit.y, 3 + i * 0.3, 0, Math.PI * 2); ctx.fill();
    });
    sparks.forEach(s => { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.life -= 1; ctx.fillStyle = s.color; ctx.globalAlpha = Math.max(0, s.life / 18); ctx.fillRect(s.x, s.y, 4, 4); ctx.globalAlpha = 1; });
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
    player(state.jozef, '#2f6fed', 'Jozef');
    player(state.dad, '#d7ff4a', 'Dad');
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(state.ball.x + 2, state.ball.y + 5, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7f7f2';
    ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.stroke();
    ctx.fillStyle = '#08140f';
    ctx.fillRect(W / 2 - 78, 4, 156, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '800 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.score.jozef + '  ·  ' + state.score.dad + '   ' + Math.ceil(state.matchLeft || 0) + 's', W / 2, 22);
    if (state.call) {
      const pop = /scores|Full time/.test(state.call) ? 1.15 : 1;
      ctx.save();
      ctx.translate(W / 2, H / 2);
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
    p.x = Math.max(46, Math.min(W - 46, p.x + p.vx));
    p.y = Math.max(40, Math.min(H - 40, p.y + p.vy));
  }

  function touch(p, forced) {
    const dx = state.ball.x - p.x, dy = state.ball.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > (forced ? 64 : 30)) return;
    if (forced) {
      if (kickLock > 0) return;
      const face = p.face || 1;
      state.ball.vx = face * 7.4 + p.vx;
      state.ball.vy = p.vy * 0.6;
      kickLock = 12;
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
    if (!room.host) return;
    move(state.dad, targets.Dad);
    move(state.jozef, targets.Jozef);
    touch(state.dad, state.kick === "Dad"); touch(state.jozef, state.kick === "Jozef"); state.kick = "";
    if (kickLock) kickLock -= 1;
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;
    state.ball.vx *= 0.985; state.ball.vy *= 0.985;
    separate(state.dad); separate(state.jozef);
    if (state.ball.y < 34) { state.ball.y = 34; state.ball.vy = Math.abs(state.ball.vy) + 0.4; }
    if (state.ball.y > H - 34) { state.ball.y = H - 34; state.ball.vy = -Math.abs(state.ball.vy) - 0.4; }
    state.matchLeft = Math.max(0, (state.matchLeft || 120) - 0.04);
    if (state.matchLeft <= 0 && state.call !== 'Full time') { state.call = 'Full time'; state.ball.vx = 0; state.ball.vy = 0; }
    if (state.call === 'Full time') { send({ type: 'state', state }); return; }
    const post = state.ball.y < GOAL.y + 6 || state.ball.y > GOAL.y + GOAL.h - 6;
    if (state.ball.x < 30 && inGoal(state.ball.y) && !post) { state.score.dad += 1; state.call = 'Dad scores'; reset(1); }
    else if (state.ball.x > W - 30 && inGoal(state.ball.y) && !post) { state.score.jozef += 1; state.call = 'Jozef scores'; reset(-1); }
    else if ((state.ball.x < 34 || state.ball.x > W - 34) && post && inGoal(state.ball.y)) { state.ball.vx *= -1; state.call = 'Off the post'; }
    else if (state.ball.x < 34) { state.ball.x = 34; state.ball.vx = Math.abs(state.ball.vx) + 0.6; }
    else if (state.ball.x > W - 34) { state.ball.x = W - 34; state.ball.vx = -Math.abs(state.ball.vx) - 0.6; }
    if (state.ball.x < 70 && state.ball.y < 70 && Math.hypot(state.ball.vx, state.ball.vy) < 1) { state.ball.vx += 1.4; state.ball.vy += 1.4; }
    if (state.ball.x > W - 70 && state.ball.y < 70 && Math.hypot(state.ball.vx, state.ball.vy) < 1) { state.ball.vx -= 1.4; state.ball.vy += 1.4; }
    if (Math.hypot(state.ball.vx, state.ball.vy) < 0.4) state.call = state.call === 'Kickoff' ? state.call : '';
    send({ type: 'state', state });
  }

  function reset(dir) {
    state.ball = { x: 360, y: 210, vx: dir * 1.4, vy: 0 };
    state.dad.x = 560; state.dad.y = 210;
    state.jozef.x = 160; state.jozef.y = 210;
    targets.Dad = null; targets.Jozef = null;
    setTimeout(() => { if (state.call !== 'Full time') state.call = ''; }, 1400);
  }
  function again() {
    state.score = { dad: 0, jozef: 0 };
    state.matchLeft = 120;
    state.call = 'Kickoff';
    reset(1);
    say('New match. Drag to run, then Kick.');
  }

  function send(msg) { if (room.conn && room.conn.open) room.conn.send(msg); }
  function onData(msg) {
    if (!msg) return;
    if (msg.type === 'hello') {
      room.other = msg.who;
      lights();
      if (msg.who === room.who) say('Both phones are ' + room.who + '. One of you pick the other name.');
      else say(room.who + ' and ' + msg.who + ' are in. Tap the pitch.');
    }
    if (msg.type === 'aim' && room.host) targets[msg.who] = { x: msg.x, y: msg.y };
    if (msg.type === 'kick' && room.host) state.kick = msg.who;
    if (msg.type === 'state' && !room.host) Object.assign(state, msg.state);
  }
  function wire(conn) {
    room.conn = conn;
    conn.on('data', onData);
    conn.on('open', () => { conn.send({ type: 'hello', who: room.who }); say('Connected. Tap where you want to run.'); });
    conn.on('close', () => { room.other = ''; lights(); say('The other side left. Open the room again.'); });
  }
  function openRoom() {
    if (!window.Peer) { say('The live room could not load. Check the connection and try again.'); return; }
    room.code = ($('versus-code')?.value || 'JOZEF').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'JOZEF';
    room.who = $('versus-who')?.value || 'Dad';
    say('Looking for the room...');
    const peer = new Peer('jw-' + room.code);
    room.peer = peer;
    peer.on('open', () => { room.host = true; lights(); say(room.who + ' is in. Waiting for ' + (room.who === 'Dad' ? 'Jozef' : 'Dad') + '.'); peer.on('connection', wire); });
    peer.on('error', err => { if (err.type === 'unavailable-id') join('jw-' + room.code); else say('Room problem: ' + err.type); });
  }
  function join(id) {
    const peer = new Peer();
    room.peer = peer; room.host = false;
    peer.on('open', () => { wire(peer.connect(id)); say('Joined ' + room.code + ' as ' + room.who + '.'); });
  }

  document.querySelectorAll('.versus-role').forEach(button => button.addEventListener('click', () => {
    room.who = button.dataset.who;
    const hidden = $('versus-who');
    if (hidden) hidden.value = room.who;
    document.querySelectorAll('.versus-role').forEach(el => el.classList.toggle('is-on', el === button));
    lights();
  }));
  $('versus-open')?.addEventListener('click', openRoom);
  function aimFrom(event) {
    const r = canvas.getBoundingClientRect();
    const aim = { x: (event.clientX - r.left) / r.width * W, y: (event.clientY - r.top) / r.height * H };
    targets[room.who] = aim;
    if (!room.host) send({ type: 'aim', who: room.who, x: aim.x, y: aim.y });
  }
  canvas.addEventListener('pointerdown', aimFrom);
  canvas.addEventListener('pointermove', event => { if (event.buttons || event.pressure) aimFrom(event); });
  $('versus-again')?.addEventListener('click', again);
  const stick = $('versus-stick');
  const nub = $('versus-nub');
  function steer(nx, ny) {
    const me = room.who === 'Dad' ? state.dad : state.jozef;
    const aim = { x: me.x + nx * 90, y: me.y + ny * 90 };
    targets[room.who] = aim;
    if (!room.host) send({ type: 'aim', who: room.who, x: aim.x, y: aim.y });
    if (nub) { nub.style.left = (28 + nx * 24) + 'px'; nub.style.top = (28 + ny * 24) + 'px'; }
  }
  function fromStick(event) {
    const r = stick.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (event.clientX - (r.left + r.width / 2)) / 36));
    const ny = Math.max(-1, Math.min(1, (event.clientY - (r.top + r.height / 2)) / 36));
    steer(nx, ny);
  }
  stick?.addEventListener('pointerdown', event => { stick.setPointerCapture(event.pointerId); fromStick(event); });
  stick?.addEventListener('pointermove', event => { if (event.buttons || event.pressure) fromStick(event); });
  stick?.addEventListener('pointerup', () => { targets[room.who] = null; if (nub) { nub.style.left = '28px'; nub.style.top = '28px'; } });
  $('versus-kick')?.addEventListener('click', () => {
    if (room.host) state.kick = room.who;
    else send({ type: 'kick', who: room.who });
  });
  setInterval(() => { step(); draw(); }, 40);
  draw();
  say('Open the room. The other person uses the same code.');
})();
