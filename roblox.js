/* Roblox handoff. The game runs in Roblox, not inside this page. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-roblox-place';

  function placeFrom(value) {
    const text = String(value || '');
    const match = text.match(/games\/(\d+)/) || text.match(/placeId[=:](\d+)/) || text.match(/\b(\d{5,})\b/);
    return match ? match[1] : '';
  }

  function boot() {
    const input = document.getElementById('roblox-link');
    const play = document.getElementById('roblox-play');
    const status = document.getElementById('roblox-status');
    const thumb = document.getElementById('roblox-thumb');
    if (!input || !play) return;

    function paint(id) {
      const ready = /^\d{5,}$/.test(id);
      play.disabled = !ready;
      play.dataset.place = ready ? id : '';
      if (status) {
        status.textContent = ready
          ? 'Ready. Play opens this experience in Roblox.'
          : 'Paste the Roblox game link once. It stays on this browser.';
      }
      if (thumb) {
        thumb.hidden = true;
        thumb.removeAttribute('src');
        // Avoid third-party requests before a parent approves leaving the site.
      }
    }

    let saved = '';
    try { saved = localStorage.getItem(KEY) || ''; } catch (err) { saved = ''; }
    if (saved) input.value = saved;
    paint(placeFrom(saved));

    document.getElementById('roblox-save').addEventListener('click', () => {
      const id = placeFrom(input.value);
      if (!id) {
        if (status) status.textContent = 'That does not look like a Roblox game link yet.';
        return;
      }
      try { localStorage.setItem(KEY, id); } catch (err) { /* still play this visit */ }
      input.value = id;
      paint(id);
    });

    play.addEventListener('click', () => {
      const id = play.dataset.place;
      if (!id) return;
      if (!window.confirm('Parent or guardian: this will open a Roblox experience outside Jozef’s World. Roblox has its own account, chat and safety settings. Continue?')) {
        if (status) status.textContent = 'Staying in Jozef’s World.';
        return;
      }
      const web = 'https://www.roblox.com/games/' + id;
      window.open(web, '_blank', 'noopener');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
