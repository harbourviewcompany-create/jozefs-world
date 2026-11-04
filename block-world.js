/* JozefWorld loader — expanded 280x110 world from gzip payload parts */
(async function () {
  'use strict';
  const health = document.getElementById('health');
  const say = (m) => { if (health) health.textContent = m; };
  async function run(code) { (0, eval)(code); }

  async function loadExpanded(base, label) {
    const n = 11;
    if (!window.DecompressionStream) throw new Error('Browser lacks gzip decompression');
    let b64 = '';
    for (let i = 0; i < n; i++) {
      const r = await fetch(base + 'block-world-up-' + i + '.txt?v=20261101-final', { cache: 'no-cache' });
      if (!r.ok) throw new Error('missing part ' + i);
      const part = (await r.text()).trim();
      if (!/^[A-Za-z0-9+/=]+$/.test(part)) throw new Error('Corrupt world part ' + i);
      b64 += part;
      say(label + ' ' + (i + 1) + '/' + n);
    }
    say('Unpacking…');
    const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
    const code = await new Response(stream).text();
    if (code.length < 1000 || !code.includes('BlockWorld')) throw new Error('World payload validation failed');
    return code;
  }

  try {
    say('Loading bigger world…');
    const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]+$/, '');
    const code = await loadExpanded(base, 'Loading world…');
    say('Starting…');
    await run(code);
  } catch (err) {
    console.error(err);
    say('Retrying bigger world…');
    try {
      const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]+$/, '');
      const code = await loadExpanded(base, 'Retry…');
      say('Starting…');
      await run(code);
    } catch (e2) {
      console.error(e2);
      say('Loading backup…');
      try {
        const res = await fetch('./block-world-stable.js?v=20261103-expanded', { cache: 'no-cache' });
        if (!res.ok) throw new Error('stable missing');
        await run(await res.text());
      } catch (e3) {
        console.error(e3);
        say('World load failed. Check connection and reload.');
      }
    }
  }
})();
