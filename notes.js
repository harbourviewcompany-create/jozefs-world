/* Family notes. Stored on this device only. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-notes-v1';
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

  function who() {
    return document.body.classList.contains('who-dad') ? 'Dad' : 'Jozef';
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
      list.appendChild(item);
    });
  }

  function boot() {
    const form = document.getElementById('note-form');
    const input = document.getElementById('note-text');
    if (!form || !input) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = input.value.trim().slice(0, 120);
      if (!text) return;
      const notes = [{ from: who(), text, at: Date.now() }, ...load()];
      save(notes);
      input.value = '';
      render();
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
