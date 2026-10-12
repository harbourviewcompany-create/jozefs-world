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
    call: 'Kickoff'
  };
  const targets = { Dad: null, Jozef: null };
  let kickLock = 0;

  function say(text) {
    const node = $('versus-status');
    if (node) node.textContent = text;
    const hq = $('hq-versus');
    if (hq) hq.textContent = text;
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
    ctx.fillStyle = '#f4f7f2';
    ctx.fillRect(10, GOAL.y, 18, GOAL.h);
    ctx.fillRect(W - 28, GOAL.y, 18, GOAL.h);
  }

  function player(p, color, name) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(0, 16, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-8, -6, 16, 22);
    ctx.fillStyle = '#f2d2b6';
    ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(name, 0, -24);
    ctx.restore();
  }

  function draw() {
    if (!ctx) return;
    pitch();
    player(state.jozef, '#2f6fed', 'Jozef');
    player(state.dad, '#d7ff4a', 'Dad');
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.stroke();
    ctx.fillStyle = '#08140f';
    ctx.fillRect(W / 2 - 78, 4, 156, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '800 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.score.jozef + '  ·  ' + state.score.dad, W / 2, 22);
    if (state.call) {
      ctx.fillStyle = 'rgba(8,20,15,.72)';
      ctx.fillRect(W / 2 - 90, H / 2 - 18, 180, 32);
      ctx.fillStyle = '#fff';
      ctx.fillText(state.call, W / 2, H / 2 + 4);
    }
  }

  function move(p, target) {
    if (!target) return;
    const dx = target.x - p.x, dy = target.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = Math.min(3.4, dist * 0.12);
    p.vx = dx / dist * speed;
    p.vy = dy / dist * speed;
    if (Math.abs(p.vx) > 0.2) p.face = p.vx > 0 ? 1 : -1;
    p.x = Math.max(40, Math.min(W - 40, p.x + p.vx));
    p.y = Math.max(36, Math.min(H - 36, p.y + p.vy));
  }

  function touch(p) {
    const dx = state.ball.x - p.x, dy = state.ball.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 26 || kickLock > 0) return;
    const power = 4.2 + Math.hypot(p.vx, p.vy) * 0.8;
    state.ball.vx = (dx / (dist || 1)) * power + p.vx * 0.4;
    state.ball.vy = (dy / (dist || 1)) * power + p.vy * 0.4;
    kickLock = 8;
  }

  function inGoal(y) { return y > GOAL.y && y < GOAL.y + GOAL.h; }

  function step() {
    if (!room.host) return;
    move(state.dad, targets.Dad);
    move(state.jozef, targets.Jozef);
    touch(state.dad); touch(state.jozef);
    if (kickLock) kickLock -= 1;
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;
    state.ball.vx *= 0.985; state.ball.vy *= 0.985;
    if (state.ball.y < 30 || state.ball.y > H - 30) state.ball.vy *= -0.8;
    if (state.ball.x < 30 && inGoal(state.ball.y)) { state.score.dad += 1; state.call = 'Dad scores'; reset(1); }
    else if (state.ball.x > W - 30 && inGoal(state.ball.y)) { state.score.jozef += 1; state.call = 'Jozef scores'; reset(-1); }
    else if (state.ball.x < 30 || state.ball.x > W - 30) { state.ball.vx *= -0.7; state.call = ''; }
    if (Math.hypot(state.ball.vx, state.ball.vy) < 0.4) state.call = state.call === 'Kickoff' ? state.call : '';
    send({ type: 'state', state });
  }

  function reset(dir) {
    state.ball = { x: 360, y: 210, vx: dir * 1.4, vy: 0 };
    state.dad.x = 560; state.dad.y = 210;
    state.jozef.x = 160; state.jozef.y = 210;
    setTimeout(() => { state.call = ''; }, 1400);
  }

  function send(msg) { if (room.conn && room.conn.open) room.conn.send(msg); }
  function onData(msg) {
    if (!msg) return;
    if (msg.type === 'hello') {
      room.other = msg.who;
      if (msg.who === room.who) say('Both phones are ' + room.who + '. One of you pick the other name.');
      else say(room.who + ' is here · ' + msg.who + ' is here. Tap the pitch.');
    }
    if (msg.type === 'aim' && room.host) targets[msg.who] = { x: msg.x, y: msg.y };
    if (msg.type === 'state' && !room.host) Object.assign(state, msg.state);
  }
  function wire(conn) {
    room.conn = conn;
    conn.on('data', onData);
    conn.on('open', () => { conn.send({ type: 'hello', who: room.who }); say('Connected. Tap where you want to run.'); });
    conn.on('close', () => say((room.other || 'The other side') + ' left the room.'));
  }
  function openRoom() {
    if (!window.Peer) { say('The live room could not load. Check the connection and try again.'); return; }
    room.code = ($('versus-code')?.value || 'JOZEF').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'JOZEF';
    room.who = $('versus-who')?.value || 'Dad';
    say('Looking for the room...');
    const peer = new Peer('jw-' + room.code);
    room.peer = peer;
    peer.on('open', () => { room.host = true; say(room.who + ' is in ' + room.code + '. Waiting for ' + (room.who === 'Dad' ? 'Jozef' : 'Dad') + '.'); peer.on('connection', wire); });
    peer.on('error', err => { if (err.type === 'unavailable-id') join('jw-' + room.code); else say('Room problem: ' + err.type); });
  }
  function join(id) {
    const peer = new Peer();
    room.peer = peer; room.host = false;
    peer.on('open', () => { wire(peer.connect(id)); say('Joined ' + room.code + ' as ' + room.who + '.'); });
  }

  $('versus-open')?.addEventListener('click', openRoom);
  canvas.addEventListener('pointerdown', event => {
    const r = canvas.getBoundingClientRect();
    const aim = { x: (event.clientX - r.left) / r.width * W, y: (event.clientY - r.top) / r.height * H };
    targets[room.who] = aim;
    if (!room.host) send({ type: 'aim', who: room.who, x: aim.x, y: aim.y });
  });
  setInterval(() => { step(); draw(); }, 40);
  draw();
  say('Open the room. The other person uses the same code.');
})();
