/* Who is playing. Choice stays on this device. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-who';

  function apply(who) {
    document.body.classList.remove('who-jozef', 'who-dad');
    document.body.classList.add(who === 'dad' ? 'who-dad' : 'who-jozef');
    const label = document.getElementById('who-now');
    if (label) label.textContent = who === 'dad' ? 'Dad' : 'Jozef';
    const gate = document.getElementById('who-gate');
    if (gate) { gate.hidden = true; gate.classList.remove('is-open'); }
  }

  function choose(who) {
    try { localStorage.setItem(KEY, who); } catch (err) { /* still apply this visit */ }
    apply(who);
    if (who === 'dad' && typeof window.showSection === 'function') window.showSection('club');
    if (who === 'jozef' && typeof window.showSection === 'function') window.showSection('home');
  }

  function boot() {
    let saved = '';
    try { saved = localStorage.getItem(KEY) || ''; } catch (err) { saved = ''; }
    document.getElementById('who-jozef')?.addEventListener('click', () => choose('jozef'));
    document.getElementById('who-dad')?.addEventListener('click', () => choose('dad'));
    function openGate(event) {
      if (event) { event.preventDefault(); event.stopPropagation(); }
      const gate = document.getElementById('who-gate');
      if (!gate) return;
      gate.hidden = false;
      gate.classList.add('is-open');
      document.getElementById('who-jozef')?.focus();
    }
    document.getElementById('who-switch')?.addEventListener('click', openGate);
    document.getElementById('who-switch-phone')?.addEventListener('click', openGate);
    if (saved === 'dad' || saved === 'jozef') apply(saved);
    else {
      const gate = document.getElementById('who-gate');
      if (gate) gate.hidden = false;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.JozefWho = { choose };
})();
