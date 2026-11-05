/* Art bootstrap — enhanced scenic renderer + visual FX */
(async function () {
  'use strict';
  async function run(code) { (0, eval)(code); }
  try {
    const fx = document.createElement('script');
    fx.src = './block-world-visual-fx.js?v=20261105';
    fx.defer = true;
    document.head.appendChild(fx);
  } catch (_) {}
  try {
    const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]+$/, '');
    let b64 = '';
    for (let i = 0; i < 6; i++) {
      const r = await fetch(base + 'block-world-art-up-' + i + '.txt?v=20261105-enhanced', { cache: 'no-cache' });
      if (!r.ok) throw new Error('art part ' + i + ' missing');
      b64 += (await r.text()).trim();
    }
    if (b64.length > 1000 && window.DecompressionStream) {
      const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
      const code = await new Response(stream).text();
      if (code.includes('BlockWorldArt')) { await run(code); return; }
      throw new Error('art payload invalid');
    }
    throw new Error('decompress unavailable');
  } catch (e) {
    console.warn('Enhanced art load failed, using CDN fallback', e);
  }
  try {
    const cdn = 'https://cdn.jsdelivr.net/gh/harbourviewcompany-create/jozefs-world@fa08501656a1fc1819c0d58dde30ca45d6941270/block-world-art-forest.js';
    const res = await fetch(cdn, { cache: 'no-cache' });
    if (!res.ok) throw new Error('cdn art failed');
    await run(await res.text());
  } catch (e2) {
    console.error('Art restore failed', e2);
  }
})();
