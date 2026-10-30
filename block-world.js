/* JozefWorld loader — restores last known-good build, then tries local expanded parts */
(async function () {
  'use strict';
  const health = document.getElementById('health');
  const say = (m) => { if (health) health.textContent = m; };
  async function run(code) { (0, eval)(code); }
  try {
    // Prefer locally hosted expanded world chunks if present
    say('Loading world…');
    const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]+$/, '');
    try {
      const parts = [];
      for (let i = 0; i < 10; i++) {
        const r = await fetch(base + 'block-world-gz-' + i + '.txt?v=20261030-big3', { cache: 'no-cache' });
        if (!r.ok) throw new Error('no local expanded');
        parts.push(await r.text());
        say('Loading bigger world… ' + (i + 1) + '/10');
      }
      const binary = Uint8Array.from(atob(parts.join('')), c => c.charCodeAt(0));
      if (typeof DecompressionStream === 'undefined') throw new Error('Need modern browser');
      const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
      const code = await new Response(stream).text();
      say('Starting expanded world…');
      await run(code);
      return;
    } catch (localErr) {
      console.warn('Expanded local load skipped:', localErr);
    }
    // Fallback: last known-good build from jsDelivr CDN of the repo commit
    say('Loading game…');
    const cdn = 'https://cdn.jsdelivr.net/gh/harbourviewcompany-create/jozefs-world@e6bd3db/block-world.js';
    const res = await fetch(cdn, { cache: 'no-cache' });
    if (!res.ok) throw new Error('CDN restore failed');
    const code = await res.text();
    say('Starting…');
    await run(code);
  } catch (err) {
    console.error(err);
    say('Load failed. Hard-refresh or re-upload block-world.js');
  }
})();
