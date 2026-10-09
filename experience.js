/* Floodlight Clubhouse experience. Kid-safe, local only, no new trackers. */
(function () {
  'use strict';

  var POWERS = [
    'First touch: trap the ball, then look up.',
    'Kind captain: cheer a teammate before you score.',
    'Weak foot: try one kick with the other foot.',
    'Scanner: name two open spaces before you pass.',
    'Calm keeper: breathe in, then dive.',
    'Wall pass: pass, move, ask for it back.'
  ];

  function dayStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function nextSaturday() {
    var now = new Date();
    var add = (6 - now.getDay() + 7) % 7;
    if (add === 0 && now.getHours() >= 10) add = 7;
    var kick = new Date(now);
    kick.setDate(now.getDate() + add);
    kick.setHours(10, 0, 0, 0);
    return kick;
  }

  function mountHero() {
    var hero = document.querySelector('.hero');
    if (!hero || hero.dataset.pitch) return;
    hero.dataset.pitch = '1';
    var lights = document.createElement('div');
    lights.innerHTML = '<div class="flood left" aria-hidden="true"></div><div class="flood right" aria-hidden="true"></div>';
    hero.prepend(lights);

    var content = hero.querySelector('.hero-content');
    if (content && !content.querySelector('.eyebrow-live')) {
      var eye = document.createElement('div');
      eye.className = 'eyebrow-live';
      eye.innerHTML = '<span class="pulse" aria-hidden="true"></span><span id="pitch-clock">Floodlights on</span>';
      content.prepend(eye);
      var h1 = content.querySelector('h1');
      if (h1) h1.innerHTML = 'Walk out,<br><span class="highlight">Captain Jozef</span>';
      var sub = content.querySelector('.hero-subtitle');
      if (sub) sub.textContent = 'Your floodlit clubhouse. Games, a world tour, a six-match league, and a training camp that stays on this device.';
    }
    var meta = document.createElement('div');
    meta.className = 'stadium-meta';
    meta.innerHTML = '<span id="pitch-kick">Next Saturday kickoff</span><span id="pitch-power">Today\'s skill loading</span>';
    hero.appendChild(meta);
  }

  function mountCoin() {
    if (document.getElementById('pitch-coin')) return;
    var anchor = document.querySelector('.jw-profile-banner');
    if (!anchor) return;
    var row = document.createElement('div');
    row.className = 'coin-row';
    row.innerHTML =
      '<article class="coin-card" id="pitch-coin"><p class="eyebrow-live"><span class="pulse" aria-hidden="true"></span> Captain\'s coin</p>' +
      '<h3 id="coin-title">Flip for today\'s superpower</h3><p id="coin-text">One skill for today. It stays on this browser.</p>' +
      '<button type="button" id="coin-flip">Flip the coin</button></article>' +
      '<article class="coin-card"><p class="eyebrow-live">Stadium note</p><h3>Play loud or quiet</h3>' +
      '<p>A tiny whistle only if you ask for it. No accounts, no chat, no ads.</p>' +
      '<button type="button" class="whistle" id="whistle-toggle">Whistle off</button></article>';
    anchor.after(row);
  }

  function tunnel() {
    if (sessionStorage.getItem('jw-tunnel') === dayStamp()) return;
    var box = document.createElement('div');
    box.className = 'tunnel';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'tunnel-title');
    box.innerHTML =
      '<div class="tunnel-card"><p class="eyebrow-live"><span class="pulse" aria-hidden="true"></span> Match night</p>' +
      '<h2 id="tunnel-title">The tunnel is open</h2>' +
      '<p>Tap the button and walk out under the lights. Your games, badges and club stay right where you left them.</p>' +
      '<button class="big-btn" type="button" id="tunnel-go">Walk out</button></div>';
    document.body.appendChild(box);
    var go = document.getElementById('tunnel-go');
    go.focus();
    go.addEventListener('click', function () {
      sessionStorage.setItem('jw-tunnel', dayStamp());
      box.hidden = true;
      if (window.JozefCelebrate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.JozefCelebrate.burst && window.JozefCelebrate.burst(window.innerWidth / 2, 180, 18);
      }
    });
  }

  function tick() {
    var clock = document.getElementById('pitch-clock');
    var kick = document.getElementById('pitch-kick');
    var now = new Date();
    if (clock) {
      clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · floodlights on';
    }
    if (kick) {
      var ms = nextSaturday() - now;
      var days = Math.floor(ms / 86400000);
      var hours = Math.floor((ms % 86400000) / 3600000);
      kick.textContent = days === 0 ? 'Kickoff in ' + hours + 'h' : 'Saturday kickoff in ' + days + 'd ' + hours + 'h';
    }
  }

  function coin() {
    var title = document.getElementById('coin-title');
    var text = document.getElementById('coin-text');
    var chip = document.getElementById('pitch-power');
    var saved = localStorage.getItem('jw-coin');
    var today = dayStamp();
    function show(power) {
      if (title) title.textContent = 'Today\'s superpower';
      if (text) text.textContent = power;
      if (chip) chip.textContent = power.split(':')[0];
    }
    if (saved && saved.slice(0, 10) === today) show(saved.slice(11));
    var btn = document.getElementById('coin-flip');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var power = POWERS[Math.floor(Math.random() * POWERS.length)];
      localStorage.setItem('jw-coin', today + ' ' + power);
      show(power);
    });
  }

  function whistle() {
    var btn = document.getElementById('whistle-toggle');
    if (!btn) return;
    function paint() {
      btn.textContent = localStorage.getItem('jw-whistle') === 'on' ? 'Whistle on' : 'Whistle off';
    }
    paint();
    btn.addEventListener('click', function () {
      var on = localStorage.getItem('jw-whistle') === 'on';
      localStorage.setItem('jw-whistle', on ? 'off' : 'on');
      paint();
      if (!on) beep();
    });
  }

  function beep() {
    if (localStorage.getItem('jw-whistle') !== 'on') return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (err) { /* audio optional */ }
  }

  function watchSections() {
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', beep);
    });
  }

  function boot() {
    mountHero();
    mountCoin();
    coin();
    whistle();
    tick();
    setInterval(tick, 30000);
    watchSections();
    tunnel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
