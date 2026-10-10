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
    { id: 'street50', name: 'Street star', need: 'Score 50 on Street' },
    { id: 'street100', name: 'Century run', need: 'Score 100 on Street' },
    { id: 'five', name: 'Five matches', need: 'Finish 5 Arena matches' },
    { id: 'draw', name: 'Even game', need: 'Draw in the Arena' },
    { id: 'caller', name: 'Called it', need: 'Call a game in Sports Room' }
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
    const tale = document.getElementById('album-story');
    if (tale) {
      const earned = Object.keys(album).length;
      tale.textContent = earned === 0 ? 'Empty slots stay hidden until you earn them.' : earned === STICKERS.length ? 'The book is full. You collected every sticker.' : earned + ' stickers in the book. ' + (STICKERS.length - earned) + ' still to find.';
    }
  }

  function scout(us, them) {
    const words = us > them ? ['Fast', 'Brave', 'Clinical'] : us === them ? ['Solid', 'Patient', 'Even'] : ['Brave', 'Learning', 'Hungry'];
    const story = us > them
      ? 'You found the goal and the rivals could not live with it.'
      : us === them
        ? 'Neither side blinked. One more shot wins it next time.'
        : 'They scored on the break. Next match, keep the ball in their half.';
    const next = us >= 3 ? 'Chase the hat-trick sticker again.' : them === 0 ? 'Protect the clean sheet.' : 'Score first.';
    const card = document.getElementById('scout-report');
    if (!card) return;
    card.hidden = false;
    const title = document.getElementById('scout-words');
    const tip = document.getElementById('scout-tip');
    const tale = document.getElementById('scout-story');
    const nxt = document.getElementById('scout-next');
    if (title) title.textContent = words.join('. ') + '.';
    if (tip) tip.textContent = them === 0 && us > 0 ? 'They did not score.' : us === 0 ? 'Next one, shoot earlier.' : 'Keep that run.';
    if (tale) tale.textContent = story;
    if (nxt) nxt.textContent = 'Next: ' + next;
    const rival = document.getElementById('arena-rival')?.textContent || 'The rivals';
    const diary = document.getElementById('season-diary');
    const line = us + '-' + them + ' against ' + rival + '. ' + story;
    if (diary) diary.textContent = line;
    try {
      const book = JSON.parse(localStorage.getItem('jozefs-world-diary-v1') || '[]');
      const pages = Array.isArray(book) ? book : [];
      pages.unshift(line);
      localStorage.setItem('jozefs-world-diary-v1', JSON.stringify(pages.slice(0, 5)));
    } catch (err) { /* diary can wait */ }
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
      if (us === them) give('draw');
      try {
        const life = JSON.parse(localStorage.getItem('jozefs-world-arena-v1') || '{}');
        if (Number(life.games) >= 5) give('five');
      } catch (err) { /* no extra sticker */ }
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
        if (score >= 100) give('street100');
        const story = document.getElementById('street-story');
        let best = 0;
        try { best = Number(localStorage.getItem('jozefs-world-street-best-v1') || 0); } catch (err) { best = 0; }
        const nights = ['Floodlight Friday', 'Saturday night', 'School-night run', 'Sunday lights'];
        const night = nights[new Date().getDay() % nights.length];
        if (story) story.textContent = night + '. ' + (score >= best && score > 0 ? 'New record. The street remembers this run.' : 'The record is ' + String(best).padStart(3, '0') + '. One more run.');
      }).observe(street, { childList: true, characterData: true, subtree: true });
    }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
