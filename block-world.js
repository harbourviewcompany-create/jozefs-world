/* JozefWorld loader — expanded 280x110 world */
(async function () {
  'use strict';
  const health = document.getElementById('health');
  const say = (m) => { if (health) health.textContent = m; };
  function sanitizeEngine(code) {
    if (code.includes('function resizefunction resize')) {
      code = code.split('function resizefunction resize').join('function resize');
    }
    return code;
  }
  function run(code) {
    code = sanitizeEngine(code);
    (0, eval)(code + '\n//# sourceURL=jozefworld-2d-engine.js');
  }
  const scriptBase = new URL('.', document.currentScript?.src || location.href).href;
  // Last known-good full world payload (before part-0 corruption on main)
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/harbourviewcompany-create/jozefs-world@a4df1a4651bcd954faa12436b018660f8ca6f8cf/';
  const diagnostics = document.getElementById('jw2d-startup-error') || document.createElement('div');
  diagnostics.id = 'jw2d-startup-error'; diagnostics.setAttribute('role','alert');
  diagnostics.style.cssText='display:none;position:fixed;top:180px;left:12px;right:12px;z-index:200;padding:16px;background:#102b3d;color:#fff;border:2px solid #f7c86e;border-radius:14px;font:14px system-ui;white-space:pre-wrap';
  if(!diagnostics.isConnected) document.body.appendChild(diagnostics);
  const fail = (message) => { diagnostics.style.display='block';diagnostics.textContent=message; };
  const booted = () => Boolean(window.BlockWorld || window.BlockWorld2D || window.blockWorld || window.__blockWorldReady);

  async function loadExpanded(base, label) {
    const n = 11;
    if (!window.DecompressionStream) throw new Error('Browser lacks gzip decompression');
    const parts = await Promise.all(Array.from({length:n}, async (_,i) => {
      const r = await fetch(base + 'block-world-up-' + i + '.txt', {cache:'no-cache'});
      if(!r.ok) throw new Error('World asset '+i+' unavailable (HTTP '+r.status+')');
      const part = (await r.text()).trim();
      if(!/^[A-Za-z0-9+/=]+$/.test(part)) throw new Error('Corrupt world part '+i);
      return part;
    }));
    say(label + ' ' + n + '/' + n);
    say('Unpacking…');
    const binary = Uint8Array.from(atob(parts.join('')), c => c.charCodeAt(0));
    const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
    let code = await new Response(stream).text();
    code = sanitizeEngine(code);
    if (code.length < 1000 || !code.includes('BlockWorld')) throw new Error('World payload validation failed');
    // sanity: must parse as JS after sanitize
    try { new Function(code); } catch (e) { throw new Error('Engine syntax still invalid: ' + (e && e.message)); }
    return code;
  }

  const watchdog=setTimeout(()=>{if(!booted()){say('World startup taking too long');fail('The 2D world has not started after 20 seconds. Check the connection, then reload.');}},20000);
  try {
    say('Loading bigger world…');
    const code = await loadExpanded(CDN_BASE, 'Loading world…');
    say('Starting…');
    run(code);
    clearTimeout(watchdog);
  } catch (err) {
    console.error(err);
    say('Retrying…');
    try {
      const code = await loadExpanded(CDN_BASE, 'Retry…');
      say('Starting…');
      run(code);
      clearTimeout(watchdog);
    } catch (e2) {
      console.error(e2);
      say('Trying local files…');
      try {
        const code = await loadExpanded(scriptBase, 'Local…');
        say('Starting…');
        run(code);
        clearTimeout(watchdog);
      } catch (e3) {
        console.error(e3);
        clearTimeout(watchdog);
        const detail = String(e3?.message || e2?.message || err?.message || 'unknown').slice(0,120);
        say('2D load failed');
        fail('2D world could not start. ' + detail + '\nPlease reload to retry.');
        window.__jw2dLoadFailure = {primary:String(err),retry:String(e2),fallback:String(e3)};
      }
    }
  }
})();
