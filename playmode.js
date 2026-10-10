/* Full-screen play on a phone. Leaves the clubhouse chrome behind. */
(function () {
  'use strict';
  const PLAY = ['arena', 'street', 'games'];

  function paint(id) {
    const open = PLAY.includes(id) && window.matchMedia('(max-width: 800px)').matches;
    document.body.classList.toggle('play-open', open);
  }

  function wrap() {
    const prev = window.showSection;
    if (typeof prev !== 'function' || prev.__playWrapped) return;
    const next = function (id) {
      const result = prev(id);
      paint(id);
      return result;
    };
    next.__playWrapped = true;
    window.showSection = next;
  }

  function boot() {
    // Other site-wide UI updates may add stylesheets after Arena CSS.
    // Reattach its link last to keep the game's viewport sizing deterministic.
    const arenaSheet = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find(link => /(?:^|\/)arena-compact\.css(?:\?|$)/.test(link.getAttribute('href') || ''));
    if (arenaSheet && arenaSheet.parentElement?.lastElementChild !== arenaSheet) {
      arenaSheet.parentElement.appendChild(arenaSheet);
    }
    wrap();
    document.querySelectorAll('.play-exit').forEach(button => {
      button.addEventListener('click', () => {
        if (typeof window.showSection === 'function') window.showSection('home');
      });
    });
    const id = (location.hash || '#home').slice(1);
    paint(id);
    setTimeout(wrap, 400);
    ['arena','street','games'].forEach(name => {
      const node = document.getElementById(name);
      if (!node || !('MutationObserver' in window)) return;
      new MutationObserver(() => paint(node.classList.contains('active') ? name : (location.hash || '#home').slice(1))).observe(node, { attributes: true, attributeFilter: ['class'] });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
