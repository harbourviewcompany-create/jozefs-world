/* Art bootstrap — scenic renderer + visual FX */
(async function () {
  'use strict';
  async function run(code) { (0, eval)(code); }
  // Load visual FX early (HUD glow, shake, warm light)
  try {
    const fx = document.createElement('script');
    fx.src = './block-world-visual-fx.js?v=20261104';
    fx.defer = true;
    document.head.appendChild(fx);
  } catch (_) {}
  try {
    const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]+$/, '');
    let b64 = '';
    let ok = true;
    for (let i = 0; i < 5; i++) {
      const r = await fetch(base + 'block-world-art-up-' + i + '.txt?v=20261104-visual', { cache: 'no-cache' });
      if (!r.ok) { ok = false; break; }
      b64 += (await r.text()).trim();
    }
    if (ok && b64.length > 1000 && window.DecompressionStream) {
      const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
      const code = await new Response(stream).text();
      if (code.includes('BlockWorldArt')) { await run(code); return; }
    }
  } catch (e) { console.warn('Enhanced art load failed', e); }
  try {
    const cdn = 'https://cdn.jsdelivr.net/gh/harbourviewcompany-create/jozefs-world@fa08501656a1fc1819c0d58dde30ca45d6941270/block-world-art-forest.js';
    const res = await fetch(cdn, { cache: 'no-cache' });
    if (!res.ok) throw new Error('cdn art failed');
    await run(await res.text());
  } catch (e2) {
    console.error('Art restore failed', e2);
  }
})();
