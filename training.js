/* Training Camp — practice log, daily tip, warm-ups, skill checklist */
(() => {
  'use strict';
  const KEY = 'jozefs-world-training-v1';
  const TIPS = [
    'Practice with both feet — your weak foot becomes stronger every day!',
    'Keep your head up when dribbling so you can see teammates.',
    'Short passes are often smarter than long hopeful kicks.',
    'Celebrate teammates\' goals — great teams cheer for each other.',
    'Warm up before you play so your muscles are ready.',
    'Watch the ball onto your foot when you receive a pass.',
    'If you miss a shot, smile and try again. Champions miss too!',
    'Drink water and rest between hard drills.',
    'Listen to your coach — small tips make big improvements.',
    'Have fun! Love of the game is the best skill of all.'
  ];
  const SKILLS = [
    { id: 'juggle5', label: 'Juggle the ball 5 times' },
    { id: 'weakfoot', label: 'Take 10 kicks with your weaker foot' },
    { id: 'passwall', label: 'Pass against a wall 20 times' },
    { id: 'sprint', label: 'Do 5 short sprints (like a winger!)' },
    { id: 'stretch', label: 'Complete the warm-up stretches' },
    { id: 'cheer', label: 'Say something kind to a teammate' }
  ];
  const STRETCHES = [
    { title: 'Toe touches', text: 'Stand tall, reach for your toes slowly. Hold for 10 seconds. Do not bounce.' },
    { title: 'Arm circles', text: 'Stretch your arms out and make 10 big circles forward, then 10 backward.' },
    { title: 'Knee hugs', text: 'Lift one knee and hug it gently. Switch legs. 5 times each side.' },
    { title: 'Side bends', text: 'Hands on hips, lean slowly left, then right. Keep your feet planted.' }
  ];
  function dayKey() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  }
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      return {
        minutes: Math.max(0, Number(raw.minutes) || 0),
        sessions: Array.isArray(raw.sessions) ? raw.sessions.slice(0, 20) : [],
        skills: raw.skills && typeof raw.skills === 'object' ? raw.skills : {},
        tipDay: raw.tipDay || '',
        tipIndex: Number(raw.tipIndex) || 0
      };
    } catch (_) {
      return { minutes: 0, sessions: [], skills: {}, tipDay: '', tipIndex: 0 };
    }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }
  let state = load();
  function todayTip() {
    if (state.tipDay !== dayKey()) {
      state.tipDay = dayKey();
      state.tipIndex = Math.floor(Math.random() * TIPS.length);
      save(state);
    }
    return TIPS[state.tipIndex % TIPS.length];
  }
  function ensureSection() {
    if (document.getElementById('training')) return;
    const links = document.querySelector('.nav-links');
    if (links && !links.querySelector('[data-section="training"]')) {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.section = 'training';
      btn.textContent = 'Training';
      btn.addEventListener('click', () => {
        if (typeof window.showSection === 'function') window.showSection('training');
        else {
          document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
          document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
          document.getElementById('training').classList.add('active');
          btn.classList.add('active');
        }
      });
      const funBtn = links.querySelector('[data-section="fun"]');
      if (funBtn) links.insertBefore(btn, funBtn);
      else links.appendChild(btn);
    }
    const section = document.createElement('section');
    section.id = 'training';
    section.className = 'section';
    section.innerHTML = [
      '<h2 class="section-title">🏋️ Training Camp</h2>',
      '<p class="section-desc">Practice like a pro — track sessions, stretch, and build skills!</p>',
      '<div class="train-grid">',
      '<div class="train-card"><h3>💡 Tip of the Day</h3><p class="train-tip" id="train-tip"></p>',
      '<button type="button" class="action-btn" id="train-new-tip">Another Tip</button></div>',
      '<div class="train-card"><h3>⏱️ Practice Log</h3>',
      '<div class="train-stats"><span class="train-stat">Total: <span id="train-total-min">0</span> min</span>',
      '<span class="train-stat">Sessions: <span id="train-sessions">0</span></span></div>',
      '<p>How many minutes did you practice?</p>',
      '<input id="train-minutes" class="train-min-input" type="number" min="1" max="180" value="15" />',
      '<button type="button" class="action-btn" id="train-log-btn">Log Practice</button>',
      '<ul class="train-log-list" id="train-log-list"></ul></div>',
      '<div class="train-card"><h3>✅ Skill Checklist</h3><p>Tick skills when you finish them today!</p>',
      '<div class="train-skills" id="train-skills"></div><p id="train-skill-msg" class="jw-shot-feedback"></p></div>',
      '<div class="train-card"><h3>🧘 Warm-up Stretches</h3><div class="train-stretches" id="train-stretches"></div></div>',
      '</div>',
      '<div class="message-box"><p>🏆 Great players train a little every day. You\'re building something special, Jozef!</p></div>'
    ].join('');
    const fun = document.getElementById('fun');
    if (fun && fun.parentNode) fun.parentNode.insertBefore(section, fun);
    else document.body.appendChild(section);
    const orig = window.showSection;
    if (typeof orig === 'function') {
      window.showSection = function (id) {
        orig(id);
        if (id === 'training') render();
      };
    }
  }
  function render() {
    const tipEl = document.getElementById('train-tip');
    if (tipEl) tipEl.textContent = todayTip();
    const total = document.getElementById('train-total-min');
    if (total) total.textContent = state.minutes;
    const sess = document.getElementById('train-sessions');
    if (sess) sess.textContent = state.sessions.length;
    const list = document.getElementById('train-log-list');
    if (list) {
      list.innerHTML = state.sessions.slice(0, 8).map(s =>
        '<li><span>' + s.date + '</span><strong>' + s.min + ' min</strong></li>'
      ).join('') || '<li><span>No sessions yet — log your first practice!</span></li>';
    }
    const skillsBox = document.getElementById('train-skills');
    if (skillsBox) {
      const today = dayKey();
      skillsBox.innerHTML = SKILLS.map(sk => {
        const done = state.skills[today] && state.skills[today][sk.id];
        return '<label class="train-skill' + (done ? ' done' : '') + '">' +
          '<input type="checkbox" data-skill="' + sk.id + '"' + (done ? ' checked' : '') + ' />' +
          '<span>' + sk.label + '</span></label>';
      }).join('');
      skillsBox.querySelectorAll('input[data-skill]').forEach(input => {
        input.addEventListener('change', () => {
          const today = dayKey();
          if (!state.skills[today]) state.skills[today] = {};
          state.skills[today][input.dataset.skill] = input.checked;
          save(state);
          render();
          const doneCount = Object.values(state.skills[today] || {}).filter(Boolean).length;
          const msg = document.getElementById('train-skill-msg');
          if (msg) {
            if (doneCount >= SKILLS.length) {
              msg.textContent = 'All skills done today — superstar training!';
              msg.style.color = '#27ae60';
              if (window.JozefCelebrate) window.JozefCelebrate.celebrate();
              window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'memory' } }));
            } else if (input.checked) {
              msg.textContent = 'Nice work! ' + doneCount + '/' + SKILLS.length + ' skills today';
              msg.style.color = '#1a7a45';
            } else msg.textContent = '';
          }
        });
      });
    }
    const stretches = document.getElementById('train-stretches');
    if (stretches && !stretches.dataset.ready) {
      stretches.dataset.ready = '1';
      stretches.innerHTML = STRETCHES.map(s =>
        '<div class="train-stretch"><strong>' + s.title + '</strong><span>' + s.text + '</span></div>'
      ).join('');
    }
  }
  function boot() {
    ensureSection();
    render();
    document.getElementById('train-new-tip')?.addEventListener('click', () => {
      state.tipIndex = (state.tipIndex + 1) % TIPS.length;
      state.tipDay = dayKey();
      save(state);
      render();
    });
    document.getElementById('train-log-btn')?.addEventListener('click', () => {
      const input = document.getElementById('train-minutes');
      let min = Math.round(Number(input && input.value));
      if (!Number.isFinite(min) || min < 1) min = 1;
      if (min > 180) min = 180;
      state.minutes += min;
      state.sessions.unshift({ date: dayKey(), min });
      state.sessions = state.sessions.slice(0, 20);
      save(state);
      render();
      if (window.JozefCelebrate) window.JozefCelebrate.burst(window.innerWidth/2, window.innerHeight*0.4, 16);
      const toast = document.getElementById('jw-toast');
      if (toast) {
        toast.textContent = '+' + min + ' minutes logged — great training!';
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 2200);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
