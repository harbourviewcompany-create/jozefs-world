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
        if (ready) {
          fetch('https://thumbnails.roblox.com/v1/places/gameicons?placeIds=' + id + '&size=150x150&format=Png&isCircular=false')
            .then(r => r.json())
            .then(data => {
              const url = data && data.data && data.data[0] && data.data[0].imageUrl;
              if (!url) return;
              thumb.src = url;
              thumb.hidden = false;
            })
            .catch(() => {});
        }
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
      const web = 'https://www.roblox.com/games/' + id;
      window.open(web, '_blank', 'noopener');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
