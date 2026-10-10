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

  // iPhone browser chrome changes the actual visible viewport while scrolling
  // or when an in-app browser expands its controls. Use visualViewport height
  // only for the active game, without resizing other site sections.
  let viewportHeight=0;
  function syncArenaViewport(){
    const arena=document.getElementById('arena');
    if(!arena)return;
    const visual=window.visualViewport;
    const next=Math.round(visual?.height||window.innerHeight||0);
    if(next>0&&next!==viewportHeight){
      viewportHeight=next;
      arena.style.setProperty('--arena-visual-height',next+'px');
    }
  }
  window.addEventListener('resize',syncArenaViewport,{passive:true});
  window.addEventListener('orientationchange',syncArenaViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',syncArenaViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',syncArenaViewport,{passive:true});

  function boot() {
    // Other site-wide UI updates may add stylesheets after Arena CSS.
    // Reattach its link last to keep the game's viewport sizing deterministic.
    const arenaSheet = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find(link => /(?:^|\/)arena-compact\.css(?:\?|$)/.test(link.getAttribute('href') || ''));
    if (arenaSheet && arenaSheet.parentElement?.lastElementChild !== arenaSheet) {
      arenaSheet.parentElement.appendChild(arenaSheet);
    }
    wrap();
    syncArenaViewport();
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
