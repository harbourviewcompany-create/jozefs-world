/* Sticker album and a short scout report. Saved on this device only. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-album-v1';
  const STICKERS = [
    { id: 'debut', name: 'Arena debut', need: 'Finish a match' },
    { id: 'win', name: 'First win', need: 'Win in the Arena' },
    { id: 'brace', name: 'Brace', need: 'Score 2 in one match' },
    { id: 'hattrick', name: 'Hat-trick', need: 'Score 3 in one match' },
    { id: 'clean', name: 'Clean sheet', need: 'Win without conceding' },
    { id: 'street', name: 'Night run', need: 'Finish Street//11' },
    { id: 'street20', name: 'Neon 20', need: 'Score 20 on Street' },
    { id: 'street50', name: 'Street star', need: 'Score 50 on Street' }
  ];

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      return data && typeof data === 'object' ? data : {};
    } catch (err) { return {}; }
  }

  function save(album) {
    try { localStorage.setItem(KEY, JSON.stringify(album)); } catch (err) { /* keep the screen copy */ }
  }

  function give(id) {
    const album = load();
    if (album[id]) return false;
    album[id] = Date.now();
    save(album);
    const toast = document.getElementById('jw-toast');
    const sticker = STICKERS.find(item => item.id === id);
    if (toast && sticker) toast.textContent = 'New sticker: ' + sticker.name;
    render();
    return true;
  }

  function render() {
    const board = document.getElementById('album-board');
    if (!board) return;
    const album = load();
    board.replaceChildren();
    STICKERS.forEach(sticker => {
      const card = document.createElement('article');
      card.className = 'sticker' + (album[sticker.id] ? ' earned' : '');
      const name = document.createElement('strong');
      name.textContent = album[sticker.id] ? sticker.name : '???';
      const need = document.createElement('small');
      need.textContent = sticker.need;
      card.append(name, need);
      board.appendChild(card);
    });
    const count = document.getElementById('album-count');
    if (count) count.textContent = Object.keys(album).length + ' / ' + STICKERS.length;
  }

  function scout(us, them) {
    const words = us > them ? ['Fast', 'Brave', 'Clinical'] : us === them ? ['Solid', 'Patient', 'Even'] : ['Brave', 'Learning', 'Hungry'];
    const line = them === 0 && us > 0 ? 'They did not score.' : us === 0 ? 'Next one, shoot earlier.' : 'Keep that run.';
    const card = document.getElementById('scout-report');
    if (!card) return;
    card.hidden = false;
    const title = document.getElementById('scout-words');
    const tip = document.getElementById('scout-tip');
    if (title) title.textContent = words.join('. ') + '.';
    if (tip) tip.textContent = line;
  }

  function boot() {
    window.addEventListener('jozef:arena-completed', () => {
      const score = (document.getElementById('arena-score')?.textContent || '0 : 0').split(':').map(part => Number(part) || 0);
      const us = score[0] || 0;
      const them = score[1] || 0;
      give('debut');
      if (us > them) give('win');
      if (us >= 2) give('brace');
      if (us >= 3) give('hattrick');
      if (us > them && them === 0) give('clean');
      scout(us, them);
    });
    const street = document.getElementById('street-announcement');
    if (street && 'MutationObserver' in window) {
      new MutationObserver(() => {
        const text = street.textContent || '';
        if (!text.includes('Full-time')) return;
        const score = Number((text.match(/(\d+) points/) || [])[1] || 0);
        give('street');
        if (score >= 20) give('street20');
        if (score >= 50) give('street50');
      }).observe(street, { childList: true, characterData: true, subtree: true });
    }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
