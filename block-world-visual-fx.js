/* JozefWorld visual FX — camera feel, screen shake, torch glow, particle polish */
(() => {
  'use strict';
  let shake = 0;
  let shakeX = 0, shakeY = 0;

  function pulseShake(amount = 4) {
    shake = Math.max(shake, amount);
  }

  function onFrame(now) {
    try {
      const canvas = document.getElementById('game');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      if (shake > 0.05) {
        shakeX = (Math.random() - 0.5) * shake;
        shakeY = (Math.random() - 0.5) * shake;
        shake *= 0.82;
        canvas.style.transform = `translate(${shakeX.toFixed(1)}px,${shakeY.toFixed(1)}px)`;
      } else if (shakeX || shakeY) {
        shakeX = shakeY = 0;
        canvas.style.transform = '';
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const warm = ctx.createLinearGradient(0, h * 0.72, 0, h);
      warm.addColorStop(0, '#00000000');
      warm.addColorStop(1, '#c4a06a14');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } catch (_) {}
  }

  document.addEventListener('pointerdown', (e) => {
    const id = e.target?.id || '';
    if (id === 'btn-mine' || id === 'btn-place' || id === 'btn-attack' || id === 'btn-jump') {
      pulseShake(id === 'btn-attack' ? 6 : 2.5);
    }
  }, { passive: true });

  window.BlockWorldVisuals = Object.freeze({ onFrame, pulseShake });
})();
