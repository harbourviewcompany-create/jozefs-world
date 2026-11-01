/* JozefWorld loader — expanded 280x110 world from gzip payload parts */
(async function () {
  'use strict';
  const health = document.getElementById('health');
  const say = (m) => { if (health) health.textContent = m; };
  async function run(code) { (0, eval)(code); }
  try {
    say('Loading bigger world…');
    const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]+$/, '');
    const n = 11;
    let b64 = '';
    for (let i = 0; i < n; i++) {
      const r = await fetch(base + 'block-world-up-' + i + '.txt?v=20261101-final', { cache: 'no-cache' });
      if (!r.ok) throw new Error('missing part ' + i);
      b64 += await r.text();
      say('Loading world… ' + (i + 1) + '/' + n);
    }
    say('Unpacking…');
    const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    if (typeof DecompressionStream === 'undefined') throw new Error('Need a modern browser');
    const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
    const code = await new Response(stream).text();
    say('Starting…');
    await run(code);
  } catch (err) {
    console.error(err);
    say('Loading fallback…');
    try {
      const cdn = 'https://cdn.jsdelivr.net/gh/harbourviewcompany-create/jozefs-world@e6bd3db/block-world.js';
      const res = await fetch(cdn, { cache: 'no-cache' });
      if (!res.ok) throw new Error('CDN failed');
      await run(await res.text());
    } catch (e2) {
      console.error(e2);
      say('World load failed. Hard-refresh.');
    }
  }
})();
