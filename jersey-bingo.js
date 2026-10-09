/* Jersey Designer, Soccer Bingo, Daily Missions — injects into Fun zone */
(() => {
  'use strict';
  const JERSEY_KEY = 'jozefs-world-jersey-v1';
  const BINGO_KEY = 'jozefs-world-bingo-v1';
  const MISSION_KEY = 'jozefs-world-missions-v1';
  const COLORS = [
    { name: 'Green', hex: '#27ae60' },
    { name: 'Blue', hex: '#2980b9' },
    { name: 'Red', hex: '#c0392b' },
    { name: 'Purple', hex: '#8e44ad' },
    { name: 'Orange', hex: '#e67e22' },
    { name: 'Black', hex: '#2c3e50' },
    { name: 'Gold', hex: '#d4ac0d' },
    { name: 'Sky', hex: '#1abc9c' }
  ];
  const BINGO_ITEMS = [
    'Goal!', 'Save!', 'Corner', 'Header',
    'FREE', 'Pass',
    'Dribble', 'Tackle', 'Whistle'
  ];
  const MISSIONS = [
    { id: 'play-penalty', label: 'Score in Penalty Kick', section: 'games' },
    { id: 'play-memory', label: 'Finish a Memory Match', section: 'games' },
    { id: 'play-scramble', label: 'Solve a Word Scramble', section: 'games' },
    { id: 'read-learn', label: 'Visit Learn and read a tip', section: 'learn' },
    { id: 'train-log', label: 'Log practice in Training Camp', section: 'training' },
    { id: 'tour-kick', label: 'Take a World Tour kick', section: 'tour' }
  ];
  function dayKey() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  }
  function loadJSON(key, fallback) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || 'null');
      return raw && typeof raw === 'object' ? raw : fallback;
    } catch (_) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }
  function ensureStyles() {
    if (document.querySelector('link[data-jw-extra="jersey-bingo.css"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'jersey-bingo.css';
    l.dataset.jwExtra = 'jersey-bingo.css';
    document.head.appendChild(l);
  }
  function inject() {
    const fun = document.getElementById('fun');
    if (!fun || document.getElementById('jw-jersey-block')) return;
    const block = document.createElement('div');
    block.id = 'jw-jersey-block';
    block.innerHTML = [
      '<div class="card" style="margin-top:1.5rem">',
      '<h3>Design Your Jersey</h3>',
      '<p>Pick a color, name, and number — just like the pros!</p>',
      '<div class="jw-jersey-wrap">',
      '  <div class="jw-jersey-preview"><div class="jw-jersey" id="jw-jersey">',
      '    <span class="jw-jersey-name" id="jw-jersey-name">JOZEF</span>',
      '    <span class="jw-jersey-num" id="jw-jersey-num">10</span>',
      '  </div></div>',
      '  <div class="jw-jersey-controls">',
      '    <label for="jw-name">Name on shirt</label>',
      '    <input id="jw-name" type="text" maxlength="12" value="JOZEF" />',
      '    <label for="jw-num">Number</label>',
      '    <input id="jw-num" type="number" min="1" max="99" value="10" />',
      '    <label>Team color</label>',
      '    <div class="jw-color-row" id="jw-colors"></div>',
      '    <button type="button" class="action-btn" id="jw-jersey-save">Save Jersey</button>',
      '  </div></div></div>',
      '<div class="card" style="margin-top:1.2rem">',
      '<h3>Soccer Bingo</h3>',
      '<p>Tap squares when you spot them in a real or practice match!</p>',
      '<div class="jw-bingo" id="jw-bingo"></div>',
      '<p id="jw-bingo-msg" class="jw-shot-feedback" style="margin-top:.8rem"></p>',
      '<button type="button" class="action-btn secondary-btn" id="jw-bingo-reset">New Bingo Card</button>',
      '</div>',
      '<div class="card" style="margin-top:1.2rem">',
      '<h3>Daily Missions</h3>',
      '<p>Complete 3 today for bonus XP!</p>',
      '<div id="jw-missions"></div>',
      '<p id="jw-mission-msg" class="jw-shot-feedback"></p>',
      '</div>'
    ].join('');
    const title = fun.querySelector('.section-title, h2');
    if (title && title.nextSibling) fun.insertBefore(block, title.nextSibling.nextSibling || title.nextSibling);
    else fun.appendChild(block);
    setupJersey();
    setupBingo();
    setupMissions();
  }
  function setupJersey() {
    const saved = loadJSON(JERSEY_KEY, { name: 'JOZEF', num: 10, color: '#27ae60' });
    const nameIn = document.getElementById('jw-name');
    const numIn = document.getElementById('jw-num');
    const jersey = document.getElementById('jw-jersey');
    const nameEl = document.getElementById('jw-jersey-name');
    const numEl = document.getElementById('jw-jersey-num');
    const colors = document.getElementById('jw-colors');
    if (!jersey || !colors) return;
    function apply() {
      const name = (nameIn.value || 'JOZEF').trim().slice(0, 12).toUpperCase() || 'JOZEF';
      let num = Math.round(Number(numIn.value));
      if (!Number.isFinite(num) || num < 1) num = 1;
      if (num > 99) num = 99;
      nameEl.textContent = name;
      numEl.textContent = String(num);
      jersey.style.background = jersey.dataset.color || saved.color || '#27ae60';
    }
    colors.innerHTML = COLORS.map(c =>
      '<button type="button" class="jw-swatch' + (c.hex === (saved.color || '#27ae60') ? ' active' : '') +
      '" style="background:' + c.hex + '" data-color="' + c.hex + '" title="' + c.name + '" aria-label="' + c.name + '"></button>'
    ).join('');
    jersey.dataset.color = saved.color || '#27ae60';
    nameIn.value = saved.name || 'JOZEF';
    numIn.value = saved.num || 10;
    apply();
    colors.querySelectorAll('.jw-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        colors.querySelectorAll('.jw-swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        jersey.dataset.color = btn.dataset.color;
        apply();
      });
    });
    nameIn.addEventListener('input', apply);
    numIn.addEventListener('input', apply);
    document.getElementById('jw-jersey-save')?.addEventListener('click', () => {
      const data = {
        name: (nameIn.value || 'JOZEF').trim().slice(0, 12).toUpperCase() || 'JOZEF',
        num: Math.min(99, Math.max(1, Math.round(Number(numIn.value)) || 10)),
        color: jersey.dataset.color || '#27ae60'
      };
      saveJSON(JERSEY_KEY, data);
      if (window.JozefCelebrate) window.JozefCelebrate.burst(window.innerWidth/2, window.innerHeight*0.4, 18);
      const toast = document.getElementById('jw-toast');
      if (toast) {
        toast.textContent = 'Jersey saved — looking sharp!';
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2000);
      }
    });
  }
  function setupBingo() {
    const board = document.getElementById('jw-bingo');
    const msg = document.getElementById('jw-bingo-msg');
    if (!board) return;
    let state = loadJSON(BINGO_KEY, { day: '', marked: [] });
    if (state.day !== dayKey()) {
      state = { day: dayKey(), marked: [] };
      saveJSON(BINGO_KEY, state);
    }
    function render() {
      board.innerHTML = BINGO_ITEMS.map((label, i) => {
        const isFree = label === 'FREE';
        const marked = isFree || (state.marked && state.marked.includes(i));
        return '<div class="jw-bingo-cell' + (marked ? ' marked' : '') + (isFree ? ' free' : '') +
          '" data-i="' + i + '" role="button" tabindex="0">' + label + '</div>';
      }).join('');
      board.querySelectorAll('.jw-bingo-cell').forEach(cell => {
        cell.addEventListener('click', () => toggle(Number(cell.dataset.i)));
        cell.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(Number(cell.dataset.i)); }
        });
      });
      checkWin();
    }
    function toggle(i) {
      if (BINGO_ITEMS[i] === 'FREE') return;
      const set = new Set(state.marked || []);
      if (set.has(i)) set.delete(i); else set.add(i);
      state.marked = [...set];
      state.day = dayKey();
      saveJSON(BINGO_KEY, state);
      render();
    }
    function checkWin() {
      const marked = new Set(state.marked || []);
      BINGO_ITEMS.forEach((l, i) => { if (l === 'FREE') marked.add(i); });
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      const win = lines.some(line => line.every(i => marked.has(i)));
      if (msg) {
        if (win) {
          msg.textContent = 'BINGO! You completed a line — champion scout!';
          msg.style.color = '#27ae60';
          if (!state.wonToday) {
            state.wonToday = true;
            saveJSON(BINGO_KEY, state);
            if (window.JozefCelebrate) window.JozefCelebrate.celebrate();
            window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'quiz' } }));
          }
        } else {
          msg.textContent = 'Mark squares during play. Get a full line for Bingo!';
          msg.style.color = '';
        }
      }
    }
    document.getElementById('jw-bingo-reset')?.addEventListener('click', () => {
      state = { day: dayKey(), marked: [] };
      saveJSON(BINGO_KEY, state);
      render();
    });
    render();
  }
  function setupMissions() {
    const box = document.getElementById('jw-missions');
    const msg = document.getElementById('jw-mission-msg');
    if (!box) return;
    let state = loadJSON(MISSION_KEY, { day: '', done: [] });
    if (state.day !== dayKey()) {
      state = { day: dayKey(), done: [] };
      saveJSON(MISSION_KEY, state);
    }
    function render() {
      box.innerHTML = MISSIONS.map(m => {
        const done = state.done.includes(m.id);
        return '<div class="jw-mission' + (done ? ' done' : '') + '">' +
          '<span>' + (done ? 'Done: ' : '') + m.label + '</span>' +
          (done ? '<span>OK</span>' :
            '<button type="button" class="action-btn secondary-btn" data-mission="' + m.id +
            '" data-section="' + m.section + '">Go</button>') +
          '</div>';
      }).join('');
      box.querySelectorAll('[data-mission]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.mission;
          if (!state.done.includes(id)) {
            state.done.push(id);
            state.day = dayKey();
            saveJSON(MISSION_KEY, state);
          }
          const sec = btn.dataset.section;
          if (typeof window.showSection === 'function' && sec) window.showSection(sec);
          render();
          if (state.done.length >= 3 && !state.rewarded) {
            state.rewarded = true;
            saveJSON(MISSION_KEY, state);
            if (msg) {
              msg.textContent = '3 missions done! Bonus XP unlocked!';
              msg.style.color = '#27ae60';
            }
            if (window.JozefCelebrate) window.JozefCelebrate.celebrate();
            window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'memory' } }));
          } else if (msg) {
            msg.textContent = state.done.length + '/6 missions today';
          }
        });
      });
      if (msg && state.done.length) {
        msg.textContent = state.rewarded
          ? '3 missions done! Bonus XP unlocked!'
          : state.done.length + '/6 missions today';
      }
    }
    render();
  }
  function boot() {
    ensureStyles();
    inject();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
