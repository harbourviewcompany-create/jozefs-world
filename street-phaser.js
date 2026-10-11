/* STREET//11 Phaser build. Same rules as the canvas game. */
(() => {
  'use strict';
  if (!window.Phaser || window.__jozefStreetBooted) return;
  const canvas = document.getElementById('street-canvas');
  if (!canvas) return;
  window.__jozefStreetBooted = true;

  const W = 360, H = 520, LANES = [72, 180, 288], DURATION = 55;
  const bestKey = 'jozefs-world-street-best-v1';
  const $ = id => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let best = 0;
  try { best = Math.max(0, Math.min(999999, Number(localStorage.getItem(bestKey)) || 0)); } catch (err) { best = 0; }

  let state = 'ready', lane = 1, targetLane = 1, playerX = LANES[1];
  let items = [], spawnIn = 0, elapsed = 0, score = 0, hearts = 3, combo = 0, streak = 0, pace = 0, shield = 0, golden = 0, seed = 0;

  function rand() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
  function text(id, value) { const node = $(id); if (node) node.textContent = String(value); }
  function announce(message) { text('street-announcement', message); }
  function updateHUD() {
    text('street-score', score);
    text('street-best', best);
    text('street-hearts', '♥'.repeat(hearts) + '♡'.repeat(3 - hearts));
    text('street-time', Math.ceil(Math.max(0, DURATION - elapsed)));
    text('street-combo', '×' + (1 + Math.min(4, Math.floor(combo / 3))));
    text('street-stage', (pace < 1 ? 'UNDERGROUND' : pace < 2 ? 'CITY LIGHTS' : 'SUPERSONIC') + (shield ? ' / SHIELDED' : ''));
    text('street-shield', shield ? 'SHIELD READY' : 'NO SHIELD');
    const chip = $('street-shield');
    if (chip) chip.dataset.active = String(Boolean(shield));
  }
  function setPanel() {
    const button = $('street-start');
    if (button) button.textContent = state === 'ready' ? 'START NIGHT RUN →' : state === 'playing' ? 'PAUSE RUN' : state === 'paused' ? 'RESUME RUN →' : 'PLAY AGAIN →';
    canvas.setAttribute('aria-label', 'Night Run soccer game. ' + state + '. Score ' + score + '. ' + hearts + ' hearts. ' + (shield ? 'Shield ready. ' : '') + 'Use left and right buttons or arrow keys to change lanes.');
  }
  function spawn() {
    const inLane = Math.floor(rand() * 3);
    const roll = rand();
    const kind = roll < .38 ? 'star' : roll < .80 ? 'defender' : roll < .89 ? 'shield' : 'gold';
    items.push({ lane: inLane, y: -38, kind, hit: false });
    if (rand() < .16 && kind === 'defender') {
      items.push({ lane: (inLane + 1 + Math.floor(rand() * 2)) % 3, y: -38, kind: 'star', hit: false });
    }
  }
  function finish() {
    if (state !== 'playing') return;
    state = 'over';
    if (score > best) {
      best = score;
      try { localStorage.setItem(bestKey, String(best)); } catch (err) { /* this visit */ }
    }
    const eligible = score >= 20;
    const xp = eligible ? Number(window.JozefWorld?.record?.('street', { score })) || 0 : 0;
    const message = hearts === 0 ? 'Full-time! Great effort, captain.' : 'Full-time! ' + score + ' points. The stadium is cheering for you!';
    announce(message + (xp > 0 ? ' +' + xp + ' XP earned!' : eligible ? ' Your record still counts. Daily XP limit reached.' : ' Try collecting more stars to earn XP.'));
    if (typeof Event === 'function') window.dispatchEvent?.(new Event('jozef:street-completed'));
    updateHUD();
    setPanel();
  }
  function newRun() {
    seed = (Math.floor(Math.random() * 4294967296) || 123456789) >>> 0;
    state = 'playing';
    lane = targetLane = 1;
    playerX = LANES[1];
    items = [];
    spawnIn = .32;
    elapsed = 0;
    score = 0;
    hearts = 3;
    combo = 0;
    streak = 0;
    pace = 0;
    shield = 0;
    golden = 0;
    announce('Kick-off! Dodge red defenders, collect stars, grab golden bonuses and save a shield for trouble.');
    updateHUD();
    setPanel();
  }
  function pause() {
    if (state === 'playing') { state = 'paused'; announce('Paused. Your run is safe.'); }
    else if (state === 'paused') { state = 'playing'; announce('Back under the lights!'); }
    else return;
    setPanel();
  }
  function move(delta) { if (state === 'playing') targetLane = clamp(targetLane + delta, 0, 2); }
  function moveTo(next) { if (state === 'playing') targetLane = clamp(next, 0, 2); }
  function update(dt) {
    elapsed += dt;
    pace = elapsed >= 36 ? 2 : elapsed >= 19 ? 1 : 0;
    playerX += (LANES[targetLane] - playerX) * Math.min(1, dt * 13);
    if (Math.abs(playerX - LANES[targetLane]) < 1) { playerX = LANES[targetLane]; lane = targetLane; }
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = .78 - pace * .105 + rand() * .26; }
    const speed = 185 + pace * 48;
    for (const item of items) {
      item.y += speed * dt;
      if (!item.hit && Math.abs(item.y - 424) < 27 && Math.abs(LANES[item.lane] - playerX) < 37) {
        item.hit = true;
        if (item.kind === 'star' || item.kind === 'gold') {
          combo += item.kind === 'gold' ? 2 : 1;
          const mult = 1 + Math.min(4, Math.floor(combo / 3));
          score += (item.kind === 'gold' ? 20 : 10) * mult;
          if (item.kind === 'gold') { golden++; announce('GOLDEN STAR! BIG COMBO BONUS!'); }
          streak = .38;
        } else if (item.kind === 'shield') {
          if (shield) score += 15;
          else { shield = 1; announce('SHIELD READY! Your next collision is protected.'); }
          streak = .38;
        } else if (shield) {
          shield = 0; streak = .38; announce('SHIELD SAVE! YOU KEPT ALL YOUR LIVES.');
        } else {
          hearts = Math.max(0, hearts - 1); combo = 0; streak = -.38;
        }
      } else if (!item.hit && item.y > 450) {
        item.hit = true;
        if (item.kind === 'defender') score += 2;
        else if (item.kind === 'star' || item.kind === 'gold') combo = 0;
      }
    }
    items = items.filter(item => item.y < 560);
    if (hearts === 0 || elapsed >= DURATION) finish();
    updateHUD();
  }

  class Night extends Phaser.Scene {
    create() {
      this.cameras.main.setBackgroundColor('#071018');
      this.graphics = this.add.graphics();
      this.player = this.add.circle(playerX, 424, 18, 0xcafa60);
      this.player.setStrokeStyle(3, 0xffffff);
      this.label = this.add.text(W / 2, 220, '', { fontFamily: 'system-ui', fontSize: '28px', color: '#ffffff', fontStyle: '900' }).setOrigin(0.5);
    }
    update(_, delta) {
      const dt = Math.min(0.036, delta / 1000);
      if (state === 'playing' && dt > 0) update(dt);
      this.draw();
    }
    draw() {
      const g = this.graphics;
      g.clear();
      g.fillStyle(0x0b1c24, 1);
      g.fillRect(0, 0, W, H);
      g.lineStyle(2, 0x1f4d46, 0.8);
      LANES.forEach(x => g.lineBetween(x, 0, x, H));
      g.lineStyle(3, 0xcafa60, 0.35);
      g.strokeRect(18, 12, W - 36, H - 24);
      items.forEach(item => {
        if (item.hit) return;
        const x = LANES[item.lane];
        if (item.kind === 'star') g.fillStyle(0xcafa60, 1);
        else if (item.kind === 'gold') g.fillStyle(0xffd166, 1);
        else if (item.kind === 'shield') g.fillStyle(0x7ee0ff, 1);
        else g.fillStyle(0xff5b60, 1);
        g.fillCircle(x, item.y, item.kind === 'defender' ? 20 : 14);
      });
      this.player.setPosition(playerX, 424);
      this.player.setFillStyle(shield ? 0x7ee0ff : 0xcafa60);
      this.label.setText(state === 'ready' ? 'READY, CAPTAIN?' : state === 'paused' ? 'PAUSED' : state === 'over' ? 'FULL-TIME' : '');
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: canvas.parentElement,
    width: W,
    height: H,
    backgroundColor: '#071018',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: Night,
    banner: false
  });
  canvas.hidden = true;

  $('street-start')?.addEventListener('click', () => {
    if (state === 'ready' || state === 'over') newRun();
    else pause();
  });
  function steer(id, dir) {
    const btn = $(id);
    if (!btn) return;
    btn.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (state === 'ready' || state === 'over') newRun();
      move(dir);
    });
  }
  steer('street-left', -1);
  steer('street-right', 1);
  document.addEventListener('keydown', event => {
    const tag = document.activeElement?.tagName || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.getElementById('street')?.classList.contains('active') !== true) return;
    if (['ArrowLeft', 'a', 'A'].includes(event.key)) { event.preventDefault(); move(-1); }
    if (['ArrowRight', 'd', 'D'].includes(event.key)) { event.preventDefault(); move(1); }
    if (event.key === 'Escape' && state === 'playing') pause();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });
  window.addEventListener('pagehide', () => { if (state === 'playing') pause(); });
  window.JozefStreet = Object.freeze({
    getProgress: () => ({ best, state, score, shield: Boolean(shield), goldenCollected: golden, timeRemaining: Math.ceil(Math.max(0, DURATION - elapsed)) }),
    engine: 'phaser'
  });
  announce('Slide into the night. Switch lanes to grab neon stars and dodge defenders.');
  updateHUD();
  setPanel();
  game.scene.start('default');
})();
