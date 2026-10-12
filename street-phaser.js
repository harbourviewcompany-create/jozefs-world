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

  // High-contrast, original, offline arcade art: cached stage + dynamic GPU primitives.
  class Night extends Phaser.Scene {
    create() {
      this.cameras.main.setBackgroundColor('#071018');
      const bg=this.add.graphics();
      bg.fillStyle(0x05121d).fillRect(0,0,W,H);
      // Stadium seating and branded sideline glow, painted only once.
      for(let row=0;row<16;row++){
        for(let col=0;col<12;col++){
          const x=(col<6?0:340)+(col%6)*4.4,y=12+row*32;
          bg.fillStyle((row+col)%7===0?0xcaff66:0x6cb0ca,(row+col)%4===0?.46:.2);
          bg.fillRoundedRect(x,y,3,9,1);
        }
      }
      bg.fillStyle(0x0c342f).fillRoundedRect(25,0,310,H,12);
      for(let y=0;y<H;y+=70){
        bg.fillStyle((y/70)%2===0?0x155542:0x0e4237,.65);
        bg.fillRect(27,y,306,70);
      }
      for(const x of [21,339]){
        bg.fillStyle(0x91fff3,.5).fillRect(x,0,3,H);
        bg.fillStyle(0x8effbd,.16).fillRect(x-5,0,13,H);
      }
      for(let y=14;y<H;y+=76){
        bg.fillStyle(0xe5fff4,.075).fillRect(27,y,306,2);
      }
      bg.lineStyle(2,0xa0f4d3,.4).strokeRoundedRect(25,3,310,510,9);
      bg.lineStyle(1,0xa5ffc1,.25);
      for(const x of [126,234])bg.lineBetween(x,5,x,515);
      for(let i=0;i<11;i++){
        const x=36+i*29;
        bg.fillStyle(0xf6fff0,.5).fillCircle(x,9,2.6);
        bg.fillStyle(0xb4fff0,.055).fillCircle(x,9,13);
      }
      this.graphics=this.add.graphics();
      this.player=this.add.container(playerX,424);
      const runner=this.add.graphics();
      runner.fillStyle(0x031119,.45).fillEllipse(3,32,54,14);
      // Detailed Jozef FC player silhouette: dynamic movement occurs on the container.
      runner.fillStyle(0x102b3b).fillRoundedRect(-17,19,15,20,5).fillRoundedRect(3,19,15,20,5);
      runner.fillStyle(0xe9f8ed).fillRoundedRect(-18,31,16,8,3).fillRoundedRect(3,31,16,8,3);
      runner.fillStyle(0x081b29).fillRoundedRect(-23,37,22,9,4).fillRoundedRect(2,37,22,9,4);
      runner.fillStyle(0xc9fb65).fillRoundedRect(-25,-20,50,44,10);
      runner.fillStyle(0x163d3f).fillRoundedRect(-25,11,50,13,4);
      runner.fillStyle(0xf3f7e7,.75).fillRect(-23,-17,6,28).fillRect(17,-17,6,28);
      runner.fillStyle(0xf0b98a).fillRoundedRect(-33,-13,10,29,5).fillRoundedRect(23,-13,10,29,5);
      runner.fillStyle(0xf0b98a).fillRoundedRect(-7,-32,14,14,3).fillCircle(0,-42,17);
      runner.fillStyle(0x191f2c).fillRoundedRect(-17,-55,34,11,5);
      runner.fillStyle(0x101b28).fillCircle(-5,-42,2).fillCircle(6,-42,2);
      this.player.add(runner);
      this.player.add(this.add.text(0,-1,'11',{fontFamily:'system-ui',fontSize:'19px',fontStyle:'900',color:'#0d302d'}).setOrigin(.5));
      this.label=this.add.text(W/2,220,'',{fontFamily:'system-ui',fontSize:'27px',color:'#edffdf',fontStyle:'900',stroke:'#051923',strokeThickness:7}).setOrigin(.5);
      this.input.on('pointerdown',pointer=>{
        if(state==='ready'||state==='over')newRun();
        if(state==='playing')moveTo(clamp(Math.floor(pointer.worldX/(W/3)),0,2));
      });
      this.input.on('pointermove',pointer=>{
        if(state==='playing'&&pointer.isDown)moveTo(clamp(Math.floor(pointer.worldX/(W/3)),0,2));
      });
      this.events.on('shutdown',()=>this.input.removeAllListeners('pointerdown'));
    }
    update(_time,delta) {
      const dt=Math.min(.036,delta/1000);
      if(state==='playing'&&dt>0)update(dt);
      this.draw();
    }
    draw() {
      const g=this.graphics;g.clear();
      // Lane speed marks scroll toward the player to communicate acceleration.
      g.lineStyle(2,0xc8ffa5,.2);
      const offset=(elapsed*(185+pace*48))%84;
      for(const x of [126,234]){
        for(let y=-84+offset;y<H;y+=84)g.lineBetween(x,y,x,y+37);
      }
      items.forEach(item=>{
        if(item.hit)return;
        const x=LANES[item.lane],y=item.y;
        g.fillStyle(0x041623,.38).fillEllipse(x+3,y+24,39,12);
        if(item.kind==='defender'){
          // Distinct opponent: red kit, boots, shoulder pads, head.
          g.fillStyle(0xff547b,.15).fillCircle(x,y,34);
          g.fillStyle(0x162237).fillRoundedRect(x-18,y+13,14,17,3).fillRoundedRect(x+5,y+13,14,17,3);
          g.fillStyle(0xff547b).fillRoundedRect(x-21,y-15,42,34,8);
          g.fillStyle(0xffadb9,.8).fillRect(x-18,y-12,5,21).fillRect(x+13,y-12,5,21);
          g.fillStyle(0xe4b99f).fillCircle(x,y-27,12);
          g.fillStyle(0x263043).fillRoundedRect(x-13,y-37,26,7,3);
          g.fillStyle(0xffffff,.7).fillCircle(x,y,4);
        }else if(item.kind==='shield'){
          g.fillStyle(0x71eeff,.17).fillCircle(x,y,31);
          g.fillStyle(0x80faff).fillTriangle(x,y+25,x-22,y-13,x+22,y-13);
          g.fillStyle(0x0b4d64).fillRoundedRect(x-10,y-10,20,20,5);
          g.lineStyle(3,0xffffff,.7).strokeCircle(x,y,8);
        }else{
          const color=item.kind==='gold'?0xffc96c:0xd7ff77;
          g.fillStyle(color,.13).fillCircle(x,y,32);
          g.fillStyle(color).fillCircle(x,y,13);
          g.fillTriangle(x,y-25,x-11,y+5,x+11,y+5);
          g.fillTriangle(x,y+25,x-11,y-5,x+11,y-5);
          g.fillTriangle(x-25,y,x+4,y-11,x+4,y+11);
          g.fillTriangle(x+25,y,x-4,y-11,x-4,y+11);
          g.fillStyle(0x123530).fillCircle(x,y,7);
        }
      });
      const bob=state==='playing'?Math.abs(Math.sin(elapsed*15))*2:0;
      this.player.setPosition(playerX,424-bob);
      if(state==='playing')this.player.rotation*=.76;
      this.player.setAlpha(state==='over'?.7:1);
      if(shield){
        g.lineStyle(3,0x71e7ff,.9).strokeEllipse(playerX,421,76,104);
        g.lineStyle(1,0xb7ffff,.35).strokeEllipse(playerX,421,86,114);
      }
      if(streak>0){
        g.fillStyle(0xd7ff77,.13).fillCircle(playerX,421,52);
      }
      this.label.setText(state==='ready'?'READY, CAPTAIN?':state==='paused'?'PAUSED':state==='over'?'FULL-TIME':'');
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
