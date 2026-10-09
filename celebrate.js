/* Lightweight confetti for big moments in Jozef's World */
(() => {
  'use strict';
  const COLORS = ['#2ecc71','#f1c40f','#3498db','#e74c3c','#9b59b6','#e67e22','#fff'];
  function burst(x, y, count = 28) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.createElement('div');
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(root);
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      const size = 6 + Math.random() * 8;
      const dx = (Math.random() - 0.5) * 360;
      const dy = -80 - Math.random() * 220;
      const rot = Math.random() * 720;
      p.style.cssText = [
        'position:absolute',
        'left:' + x + 'px',
        'top:' + y + 'px',
        'width:' + size + 'px',
        'height:' + size + 'px',
        'border-radius:' + (Math.random() > 0.5 ? '50%' : '2px'),
        'background:' + COLORS[i % COLORS.length],
        'opacity:1',
        'transform:translate(0,0) rotate(0deg)',
        'transition:transform 900ms cubic-bezier(.15,.7,.25,1), opacity 900ms ease'
      ].join(';');
      root.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)';
        p.style.opacity = '0';
      });
    }
    setTimeout(() => root.remove(), 1000);
  }
  function celebrate() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.35;
    burst(cx, cy, 34);
    setTimeout(() => burst(cx - 120, cy + 20, 18), 120);
    setTimeout(() => burst(cx + 120, cy + 20, 18), 180);
  }
  window.addEventListener('jozef:progress', (e) => {
    const a = (e.detail && e.detail.action) || '';
    if (['memory', 'quiz', 'tournament', 'championship', 'target', 'keepy'].includes(a)) {
      celebrate();
    }
  });
  window.JozefCelebrate = { burst, celebrate };
})();
