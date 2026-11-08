/* JozefWorld loader — expanded 280x110 world (mobile-safe) */
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
  const scriptBase = new URL('.', document.currentScript && document.currentScript.src || location.href).href;
  const PIN = 'a4df1a4651bcd954faa12436b018660f8ca6f8cf';
  const SOURCES = [
    'https://cdn.jsdelivr.net/gh/harbourviewcompany-create/jozefs-world@' + PIN + '/',
    'https://raw.githubusercontent.com/harbourviewcompany-create/jozefs-world/' + PIN + '/',
    scriptBase
  ];
  const diagnostics = document.getElementById('jw2d-startup-error') || document.createElement('div');
  diagnostics.id = 'jw2d-startup-error';
  diagnostics.setAttribute('role', 'alert');
  diagnostics.style.cssText = 'display:none;position:fixed;top:160px;left:12px;right:12px;z-index:200;padding:16px;background:#102b3d;color:#fff;border:2px solid #f7c86e;border-radius:14px;font:14px system-ui;white-space:pre-wrap';
  if (!diagnostics.isConnected) document.body.appendChild(diagnostics);
  const fail = (message) => { diagnostics.style.display = 'block'; diagnostics.textContent = message; };
  const booted = () => Boolean(window.BlockWorld2D || window.BlockWorld || window.__blockWorldReady);

  async function fetchPart(base, i) {
    const url = base + 'block-world-up-' + i + '.txt';
    const r = await fetch(url, { cache: 'no-cache', mode: 'cors' });
    if (!r.ok) throw new Error('part ' + i + ' HTTP ' + r.status);
    const part = (await r.text()).trim();
    if (part.length < 20 || !/^[A-Za-z0-9+/=\s]+$/.test(part)) throw new Error('part ' + i + ' corrupt');
    return part.replace(/\s+/g, '');
  }

  async function loadFrom(base, label) {
    const n = 11;
    if (!window.DecompressionStream) throw new Error('Need modern Safari/Chrome (gzip)');
    say(label);
    const parts = [];
    for (let i = 0; i < n; i++) {
      parts.push(await fetchPart(base, i));
      if (i % 3 === 2) say(label + ' ' + (i + 1) + '/' + n);
    }
    say('Unpacking…');
    const binary = Uint8Array.from(atob(parts.join('')), function (c) { return c.charCodeAt(0); });
    const stream = new Response(binary).body.pipeThrough(new DecompressionStream('gzip'));
    let code = await new Response(stream).text();
    code = sanitizeEngine(code);
    if (code.length < 1000 || code.indexOf('BlockWorld') < 0) throw new Error('payload invalid');
    return code;
  }

  const watchdog = setTimeout(function () {
    if (!booted()) {
      say('World load failed');
      fail('World is taking too long. Close the tab, reopen, and pull down to refresh.');
    }
  }, 25000);

  let lastErr = null;
  for (let s = 0; s < SOURCES.length; s++) {
    try {
      say('Loading world…');
      const code = await loadFrom(SOURCES[s], 'Loading ' + (s + 1) + '/' + SOURCES.length + '…');
      say('Starting…');
      run(code);
      clearTimeout(watchdog);
      if (booted() || true) {
        setTimeout(function () {
          if (booted()) say('Ready');
        }, 400);
      }
      return;
    } catch (err) {
      lastErr = err;
      console.error('World source failed', SOURCES[s], err);
    }
  }
  clearTimeout(watchdog);
  const detail = String(lastErr && lastErr.message || lastErr || 'unknown').slice(0, 140);
  say('World load failed');
  fail('Could not load the 2D world.\n' + detail + '\n\nTry: close tab → reopen → hard refresh.');
  window.__jw2dLoadFailure = String(lastErr);
})();
