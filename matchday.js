/* Match Day planner + Formation Builder */
(() => {
  'use strict';
  const MD_KEY = 'jozefs-world-matchday-v1';
  const FORM_KEY = 'jozefs-world-formation-v1';
  const CHECKLIST = [
    { id: 'boots', label: 'Soccer boots / cleats packed' },
    { id: 'water', label: 'Water bottle filled' },
    { id: 'stretch', label: 'Did warm-up stretches' },
    { id: 'jersey', label: 'Jersey and shorts ready' },
    { id: 'positive', label: 'Positive attitude — ready to have fun!' }
  ];
  const FORMATIONS = {
    '4-3-3': [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'lb', label: 'LB', x: 18, y: 72 },
      { id: 'cb1', label: 'CB', x: 38, y: 74 },
      { id: 'cb2', label: 'CB', x: 62, y: 74 },
      { id: 'rb', label: 'RB', x: 82, y: 72 },
      { id: 'cm1', label: 'CM', x: 30, y: 50 },
      { id: 'cm2', label: 'CM', x: 50, y: 52 },
      { id: 'cm3', label: 'CM', x: 70, y: 50 },
      { id: 'lw', label: 'LW', x: 20, y: 22 },
      { id: 'st', label: 'ST', x: 50, y: 16 },
      { id: 'rw', label: 'RW', x: 80, y: 22 }
    ],
    '4-4-2': [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'lb', label: 'LB', x: 18, y: 72 },
      { id: 'cb1', label: 'CB', x: 38, y: 74 },
      { id: 'cb2', label: 'CB', x: 62, y: 74 },
      { id: 'rb', label: 'RB', x: 82, y: 72 },
      { id: 'lm', label: 'LM', x: 18, y: 48 },
      { id: 'cm1', label: 'CM', x: 40, y: 50 },
      { id: 'cm2', label: 'CM', x: 60, y: 50 },
      { id: 'rm', label: 'RM', x: 82, y: 48 },
      { id: 'st1', label: 'ST', x: 38, y: 18 },
      { id: 'st2', label: 'ST', x: 62, y: 18 }
    ],
    '3-5-2': [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'cb1', label: 'CB', x: 28, y: 74 },
      { id: 'cb2', label: 'CB', x: 50, y: 76 },
      { id: 'cb3', label: 'CB', x: 72, y: 74 },
      { id: 'lwb', label: 'LWB', x: 14, y: 48 },
      { id: 'cm1', label: 'CM', x: 35, y: 50 },
      { id: 'cm2', label: 'CM', x: 50, y: 54 },
      { id: 'cm3', label: 'CM', x: 65, y: 50 },
      { id: 'rwb', label: 'RWB', x: 86, y: 48 },
      { id: 'st1', label: 'ST', x: 38, y: 18 },
      { id: 'st2', label: 'ST', x: 62, y: 18 }
    ]
  };
  const ROLE_TIPS = {
    GK: 'Protect the goal. Use your hands in the box!',
    CB: 'Stay strong in the middle. Clear danger.',
    LB: 'Defend the left and help attack when safe.',
    RB: 'Defend the right and deliver crosses.',
    CM: 'Link defence and attack. Keep the ball moving.',
    LM: 'Use the left side. Cross and track back.',
    RM: 'Use the right side. Cross and track back.',
    LW: 'Beat defenders on the left. Cut in or cross.',
    RW: 'Beat defenders on the right. Cut in or cross.',
    ST: 'Score goals! Stay ready for chances.',
    LWB: 'Wing-back: defend and attack on the left.',
    RWB: 'Wing-back: defend and attack on the right.'
  };
  function dayKey() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  }
  function load(key, fb) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      return v && typeof v === 'object' ? v : fb;
    } catch (_) { return fb; }
  }
  function save(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {}
  }
  function ensureNav() {
    if (document.getElementById('matchday')) return;
    const links = document.querySelector('.nav-links');
    if (links && !links.querySelector('[data-section="matchday"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.section = 'matchday';
      btn.textContent = 'Match Day';
      btn.addEventListener('click', () => {
        if (typeof window.showSection === 'function') window.showSection('matchday');
        else {
          document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
          document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
          document.getElementById('matchday').classList.add('active');
          btn.classList.add('active');
        }
      });
      const funBtn = links.querySelector('[data-section="fun"]');
      if (funBtn) links.insertBefore(btn, funBtn);
      else links.appendChild(btn);
    }
    const section = document.createElement('section');
    section.id = 'matchday';
    section.className = 'section';
    section.innerHTML = [
      '<h2 class="section-title">Match Day Central</h2>',
      '<p class="section-desc">Get ready for your real games and build your dream formation!</p>',
      '<div class="md-grid">',
      '<div class="md-card">',
      '<h3>Next Match Countdown</h3>',
      '<div class="md-countdown" id="md-countdown">Set your next match</div>',
      '<div class="md-field-row">',
      '<label for="md-opponent">Opponent</label>',
      '<input id="md-opponent" type="text" maxlength="30" placeholder="e.g. Tigers FC" />',
      '<label for="md-date">Date</label>',
      '<input id="md-date" type="date" />',
      '<label for="md-time">Kickoff time</label>',
      '<input id="md-time" type="time" />',
      '</div>',
      '<button type="button" class="action-btn" id="md-save">Save Match Day</button>',
      '<p id="md-match-label" style="margin-top:.8rem;font-weight:700"></p>',
      '</div>',
      '<div class="md-card">',
      '<h3>Pre-Match Checklist</h3>',
      '<p>Tick these before you leave for the game!</p>',
      '<ul class="md-checklist" id="md-checklist"></ul>',
      '<p id="md-check-msg" class="jw-shot-feedback"></p>',
      '</div>',
      '<div class="md-card" style="grid-column:1/-1">',
      '<h3>Formation Builder</h3>',
      '<p>Choose a formation and tap players to learn their jobs.</p>',
      '<div class="form-presets" id="form-presets"></div>',
      '<div class="form-pitch" id="form-pitch" role="img" aria-label="Soccer formation pitch"></div>',
      '<p class="form-info" id="form-info">Tap a position to learn about it.</p>',
      '</div>',
      '</div>',
      '<div class="message-box"><p>Remember: try your best, help your teammates, and have fun. That is what makes a champion!</p></div>'
    ].join('');
    const fun = document.getElementById('fun');
    if (fun && fun.parentNode) fun.parentNode.insertBefore(section, fun);
    else document.body.appendChild(section);
    const orig = window.showSection;
    if (typeof orig === 'function') {
      window.showSection = function (id) {
        orig(id);
        if (id === 'matchday') tickCountdown();
      };
    }
  }
  let countdownTimer = null;
  function tickCountdown() {
    const el = document.getElementById('md-countdown');
    const label = document.getElementById('md-match-label');
    const state = load(MD_KEY, {});
    if (!el) return;
    if (!state.date || !state.time) {
      el.textContent = 'Set your next match';
      el.classList.remove('live');
      if (label) label.textContent = '';
      return;
    }
    const target = new Date(state.date + 'T' + state.time);
    if (isNaN(target.getTime())) {
      el.textContent = 'Check the date and time';
      return;
    }
    if (label) {
      label.textContent = 'vs ' + (state.opponent || 'Opponent') + ' · ' +
        target.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
    function update() {
      const now = Date.now();
      const diff = target.getTime() - now;
      if (diff <= 0) {
        el.textContent = 'IT\'S MATCH DAY!';
        el.classList.add('live');
        return;
      }
      el.classList.remove('live');
      const s = Math.floor(diff / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (d > 0) el.textContent = d + 'd ' + h + 'h ' + m + 'm';
      else if (h > 0) el.textContent = h + 'h ' + m + 'm ' + sec + 's';
      else el.textContent = m + 'm ' + sec + 's';
    }
    update();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(update, 1000);
  }
  function setupMatchDay() {
    const state = load(MD_KEY, {});
    const opp = document.getElementById('md-opponent');
    const date = document.getElementById('md-date');
    const time = document.getElementById('md-time');
    if (opp) opp.value = state.opponent || '';
    if (date) date.value = state.date || '';
    if (time) time.value = state.time || '';
    document.getElementById('md-save')?.addEventListener('click', () => {
      const next = {
        opponent: (opp && opp.value || '').trim().slice(0, 30),
        date: date && date.value || '',
        time: time && time.value || '',
        checklist: state.checklist || {}
      };
      save(MD_KEY, next);
      tickCountdown();
      if (window.JozefCelebrate) window.JozefCelebrate.burst(window.innerWidth/2, window.innerHeight*0.35, 14);
      const toast = document.getElementById('jw-toast');
      if (toast) {
        toast.textContent = 'Match Day saved!';
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2000);
      }
    });
    const list = document.getElementById('md-checklist');
    if (list) {
      const today = dayKey();
      if (!state.checklist || state.checklistDay !== today) {
        state.checklist = {};
        state.checklistDay = today;
      }
      list.innerHTML = CHECKLIST.map(c => {
        const done = state.checklist && state.checklist[c.id];
        return '<li class="' + (done ? 'done' : '') + '"><input type="checkbox" data-check="' + c.id + '"' +
          (done ? ' checked' : '') + ' /><span>' + c.label + '</span></li>';
      }).join('');
      list.querySelectorAll('input[data-check]').forEach(input => {
        input.addEventListener('change', () => {
          const s = load(MD_KEY, {});
          if (!s.checklist || s.checklistDay !== dayKey()) {
            s.checklist = {};
            s.checklistDay = dayKey();
          }
          s.checklist[input.dataset.check] = input.checked;
          save(MD_KEY, s);
          setupMatchDay();
          const doneCount = Object.values(s.checklist || {}).filter(Boolean).length;
          const msg = document.getElementById('md-check-msg');
          if (msg) {
            if (doneCount >= CHECKLIST.length) {
              msg.textContent = 'Fully ready — go shine on the pitch!';
              msg.style.color = '#27ae60';
              if (window.JozefCelebrate) window.JozefCelebrate.celebrate();
              window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'quiz' } }));
            } else {
              msg.textContent = doneCount + '/' + CHECKLIST.length + ' ready';
              msg.style.color = '#1a7a45';
            }
          }
        });
      });
    }
    tickCountdown();
  }
  function setupFormation() {
    const presets = document.getElementById('form-presets');
    const pitch = document.getElementById('form-pitch');
    const info = document.getElementById('form-info');
    if (!presets || !pitch) return;
    let formState = load(FORM_KEY, { name: '4-3-3' });
    if (!FORMATIONS[formState.name]) formState.name = '4-3-3';
    function render() {
      presets.innerHTML = Object.keys(FORMATIONS).map(name =>
        '<button type="button" class="' + (name === formState.name ? 'active' : '') +
        '" data-form="' + name + '">' + name + '</button>'
      ).join('');
      presets.querySelectorAll('[data-form]').forEach(btn => {
        btn.addEventListener('click', () => {
          formState.name = btn.dataset.form;
          save(FORM_KEY, formState);
          render();
        });
      });
      const spots = FORMATIONS[formState.name];
      pitch.innerHTML = spots.map(s =>
        '<button type="button" class="form-spot" style="left:' + s.x + '%;top:' + s.y +
        '%" data-role="' + s.label + '" aria-label="' + s.label + '">' + s.label + '</button>'
      ).join('');
      pitch.querySelectorAll('.form-spot').forEach(btn => {
        btn.addEventListener('click', () => {
          pitch.querySelectorAll('.form-spot').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const role = btn.dataset.role;
          if (info) info.textContent = role + ': ' + (ROLE_TIPS[role] || 'Play your position and help the team!');
        });
      });
      if (info) info.textContent = formState.name + ' formation — tap a player to learn their job.';
    }
    render();
  }
  function boot() {
    if (!document.querySelector('link[data-jw-extra="matchday.css"]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'matchday.css';
      l.dataset.jwExtra = 'matchday.css';
      document.head.appendChild(l);
    }
    ensureNav();
    setupMatchDay();
    setupFormation();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
