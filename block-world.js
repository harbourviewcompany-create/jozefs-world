/* JozefWorld loader — expanded 280x110 world from gzip payload parts */
(async function () {
  'use strict';
  const health = document.getElementById('health');
  const say = (m) => { if (health) health.textContent = m; };
  async function run(code) { (0, eval)(code); }
  const scriptBase = new URL('.', document.currentScript?.src || location.href).href;
  const diagnostics = document.getElementById('jw2d-startup-error') || document.createElement('div');
  diagnostics.id = 'jw2d-startup-error'; diagnostics.setAttribute('role','alert');
  diagnostics.style.cssText='display:none;position:fixed;top:180px;left:12px;right:12px;z-index:200;padding:16px;background:#102b3d;color:#fff;border:2px solid #f7c86e;border-radius:14px;font:14px system-ui;white-space:pre-wrap';
  if(!diagnostics.isConnected) document.body.appendChild(diagnostics);
  const fail = (message) => { diagnostics.style.display='block';diagnostics.textContent=message; };
  const sourceBase = scriptBase;
  const booted = () => Boolean(window.BlockWorld || window.blockWorld || window.__blockWorldReady);

  async function loadExpanded(base, label) {
    const n = 11;
    if (!window.DecompressionStream) throw new Error('Browser lacks gzip decompression');
    const parts = await Promise.all(Array.from({length:n}, async (_,i) => {
      const r = await fetch(base + 'block-world-up-' + i + '.txt?v=20261101-final', {cache:'no-cache'});
      if(!r.ok) throw new Error('World asset '+i+' unavailable (HTTP '+r.status+')');
      const part = (await r.text()).trim();
      if(!/^[A-Za-z0-9+/=]+$/.test(part)) throw new Error('Corrupt world part '+i);
      return part;
    }));
    const b64 = parts.join('');
    say(label + ' ' + n + '/' + n);
    say('Unpacking…');
    const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
    const code = await new Response(stream).text();
    if (code.length < 1000 || !code.includes('BlockWorld')) throw new Error('World payload validation failed');
    return code;
  }

  try {
    say('Loading bigger world…');
    const base = scriptBase;
    const code = await loadExpanded(base, 'Loading world…');
    say('Starting…');
    await run(code);
    if(!booted()) throw new Error('World script ran without initializing');
  } catch (err) {
    console.error(err);
    say('Retrying bigger world…');
    try {
      const base = scriptBase;
      const code = await loadExpanded(base, 'Retry…');
      say('Starting…');
      await run(code);
      if(!booted()) throw new Error('World script ran without initializing');
    } catch (e2) {
      console.error(e2);
      say('Loading backup…');
      try {
        const res = await fetch(scriptBase + 'block-world-stable.js?v=20261106-fallback', { cache: 'no-cache' });
        if (!res.ok) throw new Error('stable missing');
        await run(await res.text());
        if(!booted()) throw new Error('Backup world did not initialize');
      } catch (e3) {
        console.error(e3);
        const detail = String(e3?.message || e2?.message || err?.message || 'unknown error').slice(0,110);
        say('2D load failed');
        fail('2D world could not start. ' + detail + '\nPlease reload to retry.');
        window.__jw2dLoadFailure = {primary:String(err),retry:String(e2),fallback:String(e3)};
      }
    }
  }
})();
