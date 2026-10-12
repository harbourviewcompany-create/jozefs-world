/* Versus: a private two-player room. Live only while both have this page open. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('versus-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 640, H = 360;
  const room = { code: 'JOZEF', who: 'Dad', peer: null, conn: null, host: false, other: '' };
  const state = {
    ball: { x: 320, y: 180, vx: 0, vy: 0 },
    dad: { x: 520, y: 180 },
    jozef: { x: 120, y: 180 },
    score: { dad: 0, jozef: 0 }
  };
  let target = null;

  function say(text) {
    const node = $('versus-status');
    if (node) node.textContent = text;
    const hq = $('hq-versus');
    if (hq) hq.textContent = text;
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d3b2e';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.beginPath(); ctx.moveTo(W / 2, 20); ctx.lineTo(W / 2, H - 20); ctx.stroke();
    ctx.fillStyle = '#7ee0ff';
    ctx.beginPath(); ctx.arc(state.jozef.x, state.jozef.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cafa60';
    ctx.beginPath(); ctx.arc(state.dad.x, state.dad.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.font = '700 16px system-ui';
    ctx.fillText('Jozef ' + state.score.jozef + '  ·  Dad ' + state.score.dad, 24, 18);
  }

  function kick(player) {
    const dx = state.ball.x - player.x, dy = state.ball.y - player.y;
    if (dx * dx + dy * dy < 34 * 34) {
      state.ball.vx = dx * 0.18 || 2;
      state.ball.vy = dy * 0.18;
    }
  }

  function step() {
    if (!room.host) return;
    const me = room.who === 'Dad' ? state.dad : state.jozef;
    if (target) {
      me.x += (target.x - me.x) * 0.18;
      me.y += (target.y - me.y) * 0.18;
    }
    kick(state.dad); kick(state.jozef);
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;
    state.ball.vx *= 0.99; state.ball.vy *= 0.99;
    if (state.ball.y < 28 || state.ball.y > H - 28) state.ball.vy *= -1;
    if (state.ball.x < 24) { state.score.dad += 1; reset(1); }
    if (state.ball.x > W - 24) { state.score.jozef += 1; reset(-1); }
    send({ type: 'state', state });
  }

  function reset(dir) {
    state.ball = { x: 320, y: 180, vx: dir * 2, vy: 0 };
  }

  function send(msg) {
    if (room.conn && room.conn.open) room.conn.send(msg);
  }

  function onData(msg) {
    if (!msg) return;
    if (msg.type === 'hello') {
      room.other = msg.who;
      say(room.who + ' is here · ' + msg.who + ' is here');
    }
    if (msg.type === 'move' && room.host) {
      const player = msg.who === 'Dad' ? state.dad : state.jozef;
      player.x = msg.x; player.y = msg.y;
    }
    if (msg.type === 'state' && !room.host) {
      Object.assign(state, msg.state);
    }
  }

  function wire(conn) {
    room.conn = conn;
    conn.on('data', onData);
    conn.on('open', () => {
      conn.send({ type: 'hello', who: room.who });
      say('Connected. Move on the pitch.');
    });
    conn.on('close', () => say(room.other ? room.other + ' left the room.' : 'The other side left.'));
  }

  function openRoom() {
    if (!window.Peer) { say('The live room could not load. Check the connection and try again.'); return; }
    room.code = ($('versus-code')?.value || 'JOZEF').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'JOZEF';
    room.who = $('versus-who')?.value || 'Dad';
    const id = 'jw-' + room.code;
    say('Looking for the room...');
    const peer = new Peer(id);
    room.peer = peer;
    peer.on('open', () => {
      room.host = true;
      say(room.who + ' is in ' + room.code + '. Waiting for the other one.');
      peer.on('connection', wire);
    });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') join(id);
      else say('Room problem: ' + err.type);
    });
  }

  function join(id) {
    const peer = new Peer();
    room.peer = peer;
    room.host = false;
    peer.on('open', () => {
      const conn = peer.connect(id);
      wire(conn);
      say('Joined ' + room.code + ' as ' + room.who + '.');
    });
  }

  $('versus-open')?.addEventListener('click', openRoom);
  canvas.addEventListener('pointerdown', event => {
    const r = canvas.getBoundingClientRect();
    target = { x: (event.clientX - r.left) / r.width * W, y: (event.clientY - r.top) / r.height * H };
    if (!room.host && room.conn) {
      const me = room.who === 'Dad' ? state.dad : state.jozef;
      me.x = target.x; me.y = target.y;
      send({ type: 'move', who: room.who, x: target.x, y: target.y });
    }
  });
  setInterval(() => { step(); draw(); }, 50);
  draw();
  say('Open the room. The other person uses the same code.');
})();
