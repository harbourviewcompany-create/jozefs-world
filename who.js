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
    if (gate) gate.hidden = true;
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
    document.getElementById('who-switch')?.addEventListener('click', () => {
      const gate = document.getElementById('who-gate');
      if (gate) gate.hidden = false;
    });
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
