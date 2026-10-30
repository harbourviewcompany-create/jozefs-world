/* JozefWorld expanded world loader (gzip parts) */
(async function () {
  'use strict';
  const health = document.getElementById('health');
  const say = (m) => { if (health) health.textContent = m; };
  try {
    say('Loading bigger world…');
    const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]+$/, '');
    const [a, b] = await Promise.all([
      fetch(base + 'block-world-gz-0.txt?v=20261030-big2', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('part0'); return r.text(); }),
      fetch(base + 'block-world-gz-1.txt?v=20261030-big2', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('part1'); return r.text(); })
    ]);
    say('Unpacking world…');
    const binary = Uint8Array.from(atob(a + b), c => c.charCodeAt(0));
    let code;
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
      code = await new Response(stream).text();
    } else {
      throw new Error('Need a modern browser');
    }
    say('Starting…');
    (0, eval)(code);
  } catch (err) {
    console.error(err);
    say('World load failed. Hard-refresh or try again.');
  }
})();
