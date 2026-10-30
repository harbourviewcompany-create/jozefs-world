/* JozefWorld — load expanded 280x110 world from parts */
(async function () {
  'use strict';
  const health = document.getElementById('health');
  try {
    const base = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]+$/, '');
    const names = ['block-world-part-0.js', 'block-world-part-1.js', 'block-world-part-2.js'];
    let code = '';
    for (const name of names) {
      if (health) health.textContent = 'Loading world…';
      const res = await fetch(base + name + '?v=20261030-big1', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Missing ' + name);
      code += await res.text();
    }
    (0, eval)(code);
  } catch (err) {
    console.error(err);
    if (health) health.textContent = 'World failed to load. Hard-refresh or check connection.';
  }
})();
