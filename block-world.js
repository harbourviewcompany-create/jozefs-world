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
    // Expanded world chunks are not yet complete in this release.
    // Avoid requesting missing assets and launching a partially assembled game.
    console.info('JozefWorld: loading the pinned compatible world build.');
    // Fallback: last known-good build from jsDelivr CDN of the repo commit
    say('Loading compatible world…');
    const cdn = 'https://cdn.jsdelivr.net/gh/harbourviewcompany-create/jozefs-world@e6bd3db/block-world.js';
    const res = await fetch(cdn, { cache: 'no-cache' });
    if (!res.ok) throw new Error('CDN restore failed');
    const code = await res.text();
    say('Starting…');
    await run(code);
  } catch (err) {
    console.error(err);
    say('World could not load. Check connection and reload.');
  }
})();
