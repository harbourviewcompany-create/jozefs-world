/* Who is playing. Choice stays on this device. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-who';

  function inputs() {
    return [...document.querySelectorAll('.who-toggle input')];
  }

  function apply(who) {
    const dad = who === 'dad';
    document.body.classList.remove('who-jozef', 'who-dad');
    document.body.classList.add(dad ? 'who-dad' : 'who-jozef');
    inputs().forEach(input => { input.checked = dad; });
    const gate = document.getElementById('who-gate');
    if (gate) {
      gate.hidden = true;
      gate.classList.remove('is-open');
    }
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
    inputs().forEach(input => {
      input.addEventListener('change', () => choose(input.checked ? 'dad' : 'jozef'));
    });
    if (saved === 'dad' || saved === 'jozef') apply(saved);
    else {
      const gate = document.getElementById('who-gate');
      if (gate) {
        gate.hidden = false;
        gate.classList.add('is-open');
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.JozefWho = { choose };
})();
