/* Tunnel walkout and short commentary. Sound stays off until he asks. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-commentary';
  let lastCall = 'Jozef FC is ready.';
  let crowd;

  function enabled() {
    try { return localStorage.getItem(KEY) === 'on'; } catch (err) { return false; }
  }

  function number() {
    try {
      const player = JSON.parse(localStorage.getItem('jozefs-world-player-v1') || '{}');
      const value = Number(player.number);
      return value >= 1 && value <= 99 ? String(value) : '11';
    } catch (err) { return '11'; }
  }

  function speak(line) {
    lastCall = line;
    const button = document.getElementById('commentary-play');
    if (button) button.hidden = false;
    if (!enabled() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(line);
    voice.rate = 0.95;
    voice.pitch = 0.9;
    window.speechSynthesis.speak(voice);
  }

  function roar() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = crowd || new AudioCtx();
    crowd = ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.4, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.3);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 1.4);
  }

  function openWalkout() {
    const gate = document.getElementById('walkout');
    if (!gate) return;
    const shirt = document.getElementById('walkout-number');
    if (shirt) shirt.textContent = number();
    gate.hidden = false;
    gate.classList.add('is-open');
  }

  function closeWalkout() {
    const gate = document.getElementById('walkout');
    if (!gate) return;
    gate.hidden = true;
    gate.classList.remove('is-open');
  }

  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    const toggle = document.getElementById('commentary-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', enabled() ? 'true' : 'false');
      toggle.textContent = enabled() ? 'Commentary on' : 'Commentary off';
      toggle.addEventListener('click', () => {
        const next = enabled() ? 'off' : 'on';
        try { localStorage.setItem(KEY, next); } catch (err) { /* this visit only */ }
        toggle.setAttribute('aria-pressed', next === 'on' ? 'true' : 'false');
        toggle.textContent = next === 'on' ? 'Commentary on' : 'Commentary off';
      });
    }
    document.getElementById('commentary-play')?.addEventListener('click', () => speak(lastCall));
    document.getElementById('walkout-run')?.addEventListener('click', () => {
      roar();
      closeWalkout();
      const start = document.getElementById('arena-start');
      if (start && /KICK OFF|PLAY AGAIN/i.test(start.textContent || '')) start.click();
    });
    document.getElementById('walkout-skip')?.addEventListener('click', closeWalkout);

    const prev = window.showSection;
    if (typeof prev === 'function' && !prev.__walkout) {
      const next = function (id) {
        const result = prev(id);
        if (id === 'arena') openWalkout();
        return result;
      };
      next.__walkout = true;
      window.showSection = next;
    }

    const arenaStatus = document.getElementById('arena-status');
    if (arenaStatus && 'MutationObserver' in window) {
      new MutationObserver(() => {
        const text = arenaStatus.textContent || '';
        if (text.includes('GOOOOOAL')) speak('Jozef takes it, and he scores!');
      }).observe(arenaStatus, { childList: true, characterData: true, subtree: true });
    }
    const streetStatus = document.getElementById('street-announcement');
    if (streetStatus && 'MutationObserver' in window) {
      new MutationObserver(() => {
        const text = streetStatus.textContent || '';
        if (text.includes('Full-time')) speak(text.replace(/\+\d+ XP earned!/g, '').trim());
      }).observe(streetStatus, { childList: true, characterData: true, subtree: true });
    }
    setTimeout(() => { if (!window.showSection || window.showSection.__walkout) return; boot(); }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
