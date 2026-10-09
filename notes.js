/* Family notes and the HQ today card. Stored on this device only. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-notes-v1';
  const SEEN = 'jozefs-world-notes-seen-v1';
  const BEST = 'jozefs-world-street-best-v1';
  const MAX = 30;

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(data) ? data.filter(note => note && typeof note.text === 'string').slice(0, MAX) : [];
    } catch (err) { return []; }
  }

  function save(notes) {
    try { localStorage.setItem(KEY, JSON.stringify(notes.slice(0, MAX))); } catch (err) { /* keep the screen copy */ }
  }

  function seen() {
    try {
      const data = JSON.parse(localStorage.getItem(SEEN) || '{}');
      return data && typeof data === 'object' ? data : {};
    } catch (err) { return {}; }
  }

  function who() {
    return document.body.classList.contains('who-dad') ? 'Dad' : 'Jozef';
  }

  function other(name) {
    return name === 'Dad' ? 'Jozef' : 'Dad';
  }

  function unread() {
    const me = who();
    const last = Number(seen()[me] || 0);
    return load().some(note => note.from === other(me) && Number(note.at) > last);
  }

  function markSeen() {
    const box = seen();
    box[who()] = Date.now();
    try { localStorage.setItem(SEEN, JSON.stringify(box)); } catch (err) { /* dot may stay */ }
  }

  function paintDot() {
    const dot = document.getElementById('note-dot');
    if (!dot) return;
    const fresh = unread();
    dot.hidden = !fresh;
    const btn = document.querySelector('[data-section="notes"]');
    if (btn) btn.setAttribute('aria-label', fresh ? 'Notes, new message' : 'Notes');
  }

  function paintToday() {
    const note = document.getElementById('today-note');
    const street = document.getElementById('today-street');
    const club = document.getElementById('club-street-best');
    let best = '000';
    try { best = String(localStorage.getItem(BEST) || '000').padStart(3, '0'); } catch (err) { best = '000'; }
    if (street) street.textContent = 'Street best: ' + best;
    if (club) club.textContent = best;
    if (note) {
      const latest = load().find(item => item.from === other(who()));
      note.textContent = unread() && latest
        ? other(who()) + ' left a note: ' + latest.text
        : 'No new notes.';
    }
    paintDot();
  }

  function render() {
    const list = document.getElementById('note-list');
    if (!list) return;
    list.replaceChildren();
    const notes = load();
    if (!notes.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No notes yet. Leave one for the other player.';
      list.appendChild(empty);
      return;
    }
    notes.forEach(note => {
      const item = document.createElement('article');
      item.className = 'note ' + (note.from === 'Dad' ? 'dad' : 'jozef');
      const name = document.createElement('strong');
      name.textContent = note.from === 'Dad' ? 'Dad' : 'Jozef';
      const text = document.createElement('p');
      text.textContent = note.text;
      item.append(name, text);
      if (note.from === who() && note.id) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'note-delete';
        del.textContent = 'Delete my note';
        del.addEventListener('click', () => {
          save(load().filter(item => item.id !== note.id));
          render();
          paintToday();
        });
        item.appendChild(del);
      }
      list.appendChild(item);
    });
  }

  function boot() {
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-text');
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const text = input.value.trim().slice(0, 120);
      if (!text) return;
      const notes = [{ id: Date.now().toString(36), from: who(), text, at: Date.now() }, ...load()];
      save(notes);
      input.value = '';
      render();
      paintToday();
    });
    document.querySelector('[data-section="notes"]')?.addEventListener('click', () => {
      markSeen();
      paintToday();
    });
    const notes = document.getElementById('notes');
    if (notes && 'MutationObserver' in window) {
      new MutationObserver(() => {
        if (notes.classList.contains('active')) {
          markSeen();
          paintToday();
          render();
        }
      }).observe(notes, { attributes: true, attributeFilter: ['class'] });
    }
    render();
    paintToday();
    setInterval(paintToday, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
