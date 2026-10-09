/* Extra arcade games for Jozef's World. Local only. */
(function () {
  'use strict';

  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function award(action) {
    window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: action } }));
  }

  function gatePass() {
    const board = document.getElementById('gate-board');
    const status = document.getElementById('gate-status');
    const scoreEl = document.getElementById('gate-score');
    const roundEl = document.getElementById('gate-round');
    if (!board) return;
    const gates = [...board.querySelectorAll('[data-gate]')];
    let round = 0;
    let score = 0;
    let open = -1;
    let lock = false;
    const total = 8;

    function paint() {
      scoreEl.textContent = score;
      roundEl.textContent = Math.min(round, total) + '/' + total;
    }

    function finish() {
      status.textContent = score >= 5
        ? 'Clean passing! ' + score + ' gates found.'
        : 'Good try. You found ' + score + ' open gates.';
      if (score >= 5) award('goal');
      lock = true;
    }

    function serve() {
      if (round >= total) return finish();
      lock = true;
      open = Math.floor(Math.random() * gates.length);
      gates.forEach((g, i) => g.classList.toggle('open', i === open));
      status.textContent = 'The open gate is glowing. Tap it!';
      const wait = reduced() ? 1400 : 900;
      window.setTimeout(() => {
        gates.forEach(g => g.classList.remove('open'));
        lock = false;
        if (round < total) status.textContent = 'Too late — next gate.';
      }, wait);
    }

    gates.forEach(btn => {
      btn.addEventListener('click', () => {
        if (lock || round >= total) return;
        const hit = Number(btn.dataset.gate) === open;
        round += 1;
        if (hit) {
          score += 1;
          status.textContent = 'Through! Nice pass.';
        } else {
          status.textContent = 'Closed gate. Keep looking.';
        }
        lock = true;
        paint();
        window.setTimeout(serve, 450);
      });
    });

    document.getElementById('gate-start').addEventListener('click', () => {
      round = 0;
      score = 0;
      lock = false;
      paint();
      status.textContent = 'Watch for the open gate.';
      serve();
    });
    paint();
  }

  function headerHero() {
    const bar = document.getElementById('header-bar');
    const mark = document.getElementById('header-mark');
    const status = document.getElementById('header-status');
    const scoreEl = document.getElementById('header-score');
    if (!bar || !mark) return;
    let pos = 8;
    let dir = 1;
    let timer = 0;
    let jumps = 0;
    let score = 0;
    const total = 5;

    function place() {
      mark.style.left = pos + '%';
    }

    function stop() {
      window.clearInterval(timer);
      timer = 0;
    }

    function start() {
      stop();
      jumps = 0;
      score = 0;
      scoreEl.textContent = '0';
      status.textContent = 'Tap Jump when the ball is in the gold box.';
      pos = 8;
      dir = 1;
      const step = reduced() ? 4 : 2.4;
      timer = window.setInterval(() => {
        pos += dir * step;
        if (pos > 92 || pos < 4) dir *= -1;
        place();
      }, 30);
    }

    document.getElementById('header-jump').addEventListener('click', () => {
      if (!timer || jumps >= total) return;
      jumps += 1;
      const perfect = pos > 42 && pos < 58;
      const good = pos > 34 && pos < 66;
      if (perfect) score += 2;
      else if (good) score += 1;
      scoreEl.textContent = score;
      status.textContent = perfect ? 'Perfect header!' : good ? 'Good contact.' : 'Under it. Next ball.';
      if (jumps >= total) {
        stop();
        status.textContent = score >= 6 ? 'Hat-trick timing! Score ' + score + '.' : 'Headers done. Score ' + score + '.';
        if (score >= 6) award('goal');
      }
    });
    document.getElementById('header-start').addEventListener('click', start);
    place();
  }

  function spotBall() {
    const cups = [...document.querySelectorAll('[data-cup]')];
    const status = document.getElementById('spot-status');
    const scoreEl = document.getElementById('spot-score');
    if (!cups.length) return;
    let ball = 0;
    let score = 0;
    let round = 0;
    let locked = true;
    const total = 5;

    function show(reveal) {
      cups.forEach((cup, i) => {
        cup.textContent = reveal && i === ball ? '⚽' : (i + 1);
        cup.classList.toggle('has-ball', reveal && i === ball);
      });
    }

    function roundStart() {
      if (round >= total) {
        status.textContent = score >= 3 ? 'Sharp eyes! ' + score + ' found.' : 'You found ' + score + ' balls.';
        if (score >= 3) award('goal');
        locked = true;
        return;
      }
      ball = Math.floor(Math.random() * cups.length);
      locked = true;
      show(true);
      status.textContent = 'Remember the ball…';
      window.setTimeout(() => {
        show(false);
        locked = false;
        status.textContent = 'Which boot is hiding it?';
      }, reduced() ? 1200 : 800);
    }

    cups.forEach(cup => {
      cup.addEventListener('click', () => {
        if (locked || round >= total) return;
        locked = true;
        const hit = Number(cup.dataset.cup) === ball;
        if (hit) score += 1;
        scoreEl.textContent = score;
        show(true);
        status.textContent = hit ? 'Found it!' : 'Not that boot. It was number ' + (ball + 1) + '.';
        round += 1;
        window.setTimeout(roundStart, 700);
      });
    });

    document.getElementById('spot-start').addEventListener('click', () => {
      score = 0;
      round = 0;
      scoreEl.textContent = '0';
      roundStart();
    });
  }

  function boot() {
    gatePass();
    headerHero();
    spotBall();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
