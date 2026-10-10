/* Jozef FC — private, browser-only player progress. No accounts, analytics or public chat. */
(() => {
  'use strict';
  const KEY = 'jozefs-world-player-v1';
  const COLORS = ['#21b567', '#246bdf', '#ff8b24', '#aa59e4', '#ef4f7c'];
  const AVATARS = ['🦁', '🐯', '🦊', '🐻', '⚡', '⭐'];
  const AWARDS = [
    { id: 'first-goal', icon: '⚽', title: 'First Goal', description: 'Score your first goal', ready: s => s.goals >= 1 },
    { id: 'goal-hero', icon: '🏆', title: 'Goal Hero', description: 'Score 10 goals', ready: s => s.goals >= 10 },
    { id: 'safe-hands', icon: '🧤', title: 'Safe Hands', description: 'Make 5 saves', ready: s => s.saves >= 5 },
    { id: 'memory-master', icon: '🧠', title: 'Memory Master', description: 'Finish Memory Match', ready: s => s.memory >= 1 },
    { id: 'brain-power', icon: '📚', title: 'Brain Power', description: 'Complete a quiz', ready: s => s.quizzes >= 1 },
    { id: 'perfect-score', icon: '🌟', title: 'Perfect Score', description: 'Get every quiz answer right', ready: s => s.perfect >= 1 },
    { id: 'target-star', icon: '🎯', title: 'Sharp Shooter', description: 'Score 12 points in Target Practice', ready: s => s.targetBest >= 12 },
    { id: 'keepy-king', icon: '🚀', title: 'Keepy King', description: 'Make 10 keepy-uppies', ready: s => s.keepyBest >= 10 },
    { id: 'word-wizard', icon: '🔤', title: 'Word Wizard', description: 'Solve 5 soccer word scrambles', ready: s => s.scrambles >= 5 },
    { id: 'triple-threat', icon: '👑', title: 'Daily Hero', description: 'Complete all three daily missions', ready: s => Boolean(s.dailyHero) },
    { id: 'world-traveller', icon: '🌍', title: 'World Traveller', description: 'Win your first World Tour match', ready: s => s.tourWins >= 1 },
    { id: 'geography-star', icon: '🧭', title: 'Geography Star', description: 'Solve your first travel challenge', ready: s => s.geography >= 1 },
    { id: 'world-champion', icon: '🥇', title: 'World Champion', description: 'Win the five-country cup', ready: s => s.championships >= 1 },
    { id: 'league-debut', icon: '👟', title: 'League Debut', description: 'Finish your first Career match', ready: s => s.careerGames >= 1 },
    { id: 'league-winner', icon: '🏅', title: 'Match Winner', description: 'Win a Career match', ready: s => s.careerWins >= 1 },
    { id: 'training-star', icon: '🧮', title: 'Training Star', description: 'Solve a Career training challenge', ready: s => s.trainingSuccess >= 1 },
    { id: 'league-champion', icon: '🏆', title: 'League Champion', description: 'Win the six-match Career league', ready: s => s.leagueTitles >= 1 },
    { id: 'night-rookie', icon: '🌙', title: 'Night Rookie', description: 'Complete a STREET//11 run scoring at least 20', ready: s => s.streetRuns >= 1 },
    { id: 'night-legend', icon: '⚡', title: 'Night Legend', description: 'Reach 150 points in STREET//11', ready: s => s.streetBest >= 150 },
    { id: 'arena-debut', icon: '🎮', title: 'Arena Debut', description: 'Finish your first playable football match', ready: s => s.arenaGames >= 1 },
    { id: 'arena-victory', icon: '🥇', title: 'Arena Winner', description: 'Win a football Arena match', ready: s => s.arenaWins >= 1 },
    { id: 'arena-legend', icon: '🏟️', title: 'Arena Legend', description: 'Win five football Arena matches', ready: s => s.arenaWins >= 5 },
    { id: 'all-sport-debut', icon: '🏅', title: 'All-Sport Debut', description: 'Finish a hockey, baseball, basketball or wrestling challenge', ready: s => s.multisportGames >= 1 },
    { id: 'all-sport-champion', icon: '🏆', title: 'Four-Sport Star', description: 'Play every sport in the Sports Arcade', ready: s => s.multiSports.length >= 4 }
  ];
  const defaultState = () => ({
    xp: 0, goals: 0, saves: 0, memory: 0, quizzes: 0, perfect: 0, scrambles: 0,
    keepyBest: 0, targetBest: 0, club: 'Jozef FC', avatar: '🦁', kit: COLORS[0],
    number: 10, day: dayKey(), daily: {}, dailyHero: '', earned: [],
    sound: false, tourWins: 0, championships: 0, geography: 0,
    careerGames: 0, careerWins: 0, trainingSuccess: 0, leagueTitles: 0, streetRuns: 0, streetBest: 0, arenaGames: 0, arenaWins: 0, arenaGoals: 0,
    multisportGames: 0, multiSports: [],
    rewardedTours: [], rewardedGeography: [], rewardedTitles: [],
    rewardedCareer: [], rewardedTraining: [], rewardedLeague: []
  });
  function dayKey() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  function load() {
    let value = {};
    try { value = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
    const s = { ...defaultState(), ...value };
    s.xp = Math.max(0, Number(s.xp) || 0);
    for (const name of ['goals', 'saves', 'memory', 'quizzes', 'perfect', 'keepyBest', 'targetBest', 'tourWins', 'championships', 'geography', 'scrambles', 'careerGames', 'careerWins', 'trainingSuccess', 'leagueTitles', 'streetRuns', 'streetBest', 'arenaGames', 'arenaWins', 'arenaGoals', 'multisportGames']) {
      s[name] = Math.max(0, Number(s[name]) || 0);
    }
    if (!COLORS.includes(s.kit)) s.kit = COLORS[0];
    if (!AVATARS.includes(s.avatar)) s.avatar = AVATARS[0];
    s.number = Math.min(99, Math.max(1, Number(s.number) || 10));
    if (!Array.isArray(s.earned)) s.earned = [];
    s.multiSports = Array.isArray(s.multiSports)
      ? [...new Set(s.multiSports.filter(x=>['hockey','baseball','basketball','wrestling'].includes(x)))] : [];
    for (const key of ['rewardedTours', 'rewardedGeography', 'rewardedTitles', 'rewardedCareer', 'rewardedTraining', 'rewardedLeague']) {
      if (!Array.isArray(s[key])) s[key] = [];
    }
    try { s.keepyBest = Math.max(s.keepyBest, Number(localStorage.getItem('jozefKeepyBest')) || 0); } catch (_) {}
    try { s.streetBest = Math.max(s.streetBest, Number(localStorage.getItem('jozefs-world-street-best-v1')) || 0); } catch (_) {}
    if (s.day !== dayKey()) { s.day = dayKey(); s.daily = {}; }
    if (!s.daily || typeof s.daily !== 'object') s.daily = {};
    return s;
  }
  let state = load();
  let soundContext;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {
      const el = document.getElementById('jw-status');
      if (el) el.textContent = 'This browser is not saving progress. You can still play!';
    }
  }
  function missionDone(s) {
    return ['goal', 'quiz', 'memory'].every(key => (Number(s.daily[key]) || 0) > 0);
  }
  function ding() {
    if (!state.sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      soundContext ||= new Audio();
      const osc = soundContext.createOscillator();
      const gain = soundContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, soundContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(990, soundContext.currentTime + 0.12);
      gain.gain.setValueAtTime(0.065, soundContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, soundContext.currentTime + 0.18);
      osc.connect(gain).connect(soundContext.destination);
      osc.start(); osc.stop(soundContext.currentTime + 0.19);
    } catch (_) {}
  }
  let toastTimer;
  function announce(message) {
    const el = document.getElementById('jw-toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 2500);
  }
  function record(action, info = {}) {
    if (state.day !== dayKey()) { state.day = dayKey(); state.daily = {}; }
    const rewards = { goal: 5, save: 8, memory: 30, quiz: 20, keepy: 15, target: 15, tournament: 60, geography: 15, championship: 120, scramble: 10, career: 20, training: 10, leaguechamp: 120, street: 40, arena: 35, multisport: 20 };
    const caps = { goal: 10, save: 10, memory: 3, quiz: 3, keepy: 1, target: 3, tournament: 10, geography: 10, championship: 3, scramble: 5, career: 10, training: 6, leaguechamp: 2, street: 2, arena: 3, multisport: 4 };
    if (!(action in rewards)) return;
    const uniqueReward = { tournament: 'rewardedTours', geography: 'rewardedGeography', championship: 'rewardedTitles', career: 'rewardedCareer', training: 'rewardedTraining', leaguechamp: 'rewardedLeague' }[action];
    if (uniqueReward) {
      const id = String(info.winId || '');
      if (!/^season-[1-9][0-9]{0,4}-round-[0-5]$/.test(id)) return;
      const round = Number(id.split('-').pop());
      if (['tournament','geography','championship'].includes(action) && round > 4) return;
      if (action === 'leaguechamp' && (round !== 5 || info.result !== 'win')) return;
      if (action === 'training' && info.result !== 'correct') return;
      if (action === 'career' && !['win','draw','loss'].includes(info.result)) return;
      if (state[uniqueReward].includes(id)) return; // Reloads cannot duplicate rewards.
      state[uniqueReward].push(id);
    }
    if (action === 'multisport' && (
      !['hockey','baseball','basketball','wrestling'].includes(info.sport) ||
      !Number.isInteger(info.score) || info.score < 0 || info.score > 5)) return;
    if (action === 'target' && (Number(info.score) || 0) <= 0) return;
    if (action === 'street' && (!Number.isFinite(Number(info.score)) || Number(info.score) < 20 || Number(info.score) > 1000000)) return;
    if (action === 'arena' && (!['win','draw','loss'].includes(info.result) || !Number.isInteger(Number(info.goals)) || Number(info.goals) < 0 || Number(info.goals) > 5)) return;
    if (action === 'keepy' && (Number(info.count) || 0) < 10) return;
    if (action === 'goal') state.goals++;
    if (action === 'street') { state.streetRuns++; state.streetBest = Math.max(state.streetBest, Math.floor(Number(info.score))); }
    if (action === 'multisport') {
      state.multisportGames++;
      if (!state.multiSports.includes(info.sport)) state.multiSports.push(info.sport);
    }
    if (action === 'arena') { state.arenaGames++; if (info.result === 'win') state.arenaWins++; state.arenaGoals += Number(info.goals); state.goals += Number(info.goals); }
    if (action === 'career') { state.careerGames++; if (info.result === 'win') state.careerWins++; }
    if (action === 'training') state.trainingSuccess++;
    if (action === 'leaguechamp') state.leagueTitles++;
    if (action === 'scramble') state.scrambles++;
    if (action === 'tournament') state.tourWins++;
    if (action === 'geography') state.geography++;
    if (action === 'championship') state.championships++;
    if (action === 'save') state.saves++;
    if (action === 'memory') state.memory++;
    if (action === 'quiz') {
      state.quizzes++;
      if (Number(info.score) === Number(info.total) && Number(info.total) > 0) state.perfect++;
    }
    if (action === 'keepy') state.keepyBest = Math.max(state.keepyBest, Number(info.count) || 0);
    if (action === 'target') state.targetBest = Math.max(state.targetBest, Number(info.score) || 0);
    const count = Number(state.daily[action]) || 0;
    state.daily[action] = count + 1;
    const xp = count < caps[action] ? (action === 'career' ? (info.result === 'win' ? 30 : info.result === 'draw' ? 20 : 10) : action === 'arena' ? (info.result === 'win' ? 35 : info.result === 'draw' ? 20 : 10) : rewards[action]) : 0;
    if (xp) { state.xp += xp; ding(); }
    if (missionDone(state) && state.dailyHero !== state.day) {
      state.dailyHero = state.day;
      state.xp += 50;
      announce('🏆 Daily Hero! All missions completed. +50 XP!');
    } else if (xp) announce('+' + xp + ' XP • Great job, Jozef!');
    const unlocked = AWARDS.filter(a => a.ready(state) && !state.earned.includes(a.id));
    for (const award of unlocked) state.earned.push(award.id);
    if (unlocked.length) announce('New badge: ' + unlocked.map(a => a.title).join(', ') + '!');
    save(); render();
    if (typeof window.dispatchEvent === 'function' && typeof Event === 'function') {
      window.dispatchEvent(new Event('jozef:profile-updated'));
    }
    return xp; // Let games distinguish earned XP from a daily-cap replay.
  }
  function setAll(selector, value) {
    document.querySelectorAll(selector).forEach(el => { el.textContent = String(value); });
  }
  function render() {
    const level = Math.floor(state.xp / 100) + 1;
    const levelXP = state.xp % 100;
    setAll('[data-jw-xp]', state.xp);
    setAll('[data-jw-level]', level);
    setAll('[data-jw-goals]', state.goals);
    setAll('[data-jw-tourwins]', state.tourWins);
    setAll('[data-jw-streetbest]', state.streetBest);
    setAll('[data-jw-careergames]', state.careerGames);
    setAll('[data-jw-careerwins]', state.careerWins);
    setAll('[data-jw-leaguetitles]', state.leagueTitles);
    setAll('[data-jw-crowns]', state.championships);
    setAll('[data-jw-saves]', state.saves);
    setAll('[data-jw-badgecount]', state.earned.length + '/' + AWARDS.length);
    setAll('[data-jw-avatar]', state.avatar);
    setAll('[data-jw-number]', state.number);
    setAll('[data-jw-keepy]', state.keepyBest);
    setAll('[data-jw-clubname]', 'Jozef FC');
    document.querySelectorAll('[data-jw-progress]').forEach(el => {
      el.style.width = levelXP + '%';
      el.parentElement?.setAttribute('aria-valuenow', String(levelXP));
    });
    document.querySelectorAll('[data-jw-kit]').forEach(el => el.style.setProperty('--kit-color', state.kit));
    document.querySelectorAll('[data-choose-avatar]').forEach(el => {
      const selected = el.dataset.chooseAvatar === state.avatar;
      el.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-choose-kit]').forEach(el => {
      const selected = el.dataset.chooseKit === state.kit;
      el.setAttribute('aria-pressed', String(selected));
    });
    const numberInput = document.getElementById('jw-number');
    if (numberInput && document.activeElement !== numberInput) numberInput.value = String(state.number);
    const sound = document.getElementById('jw-sound');
    if (sound) {
      sound.textContent = state.sound ? '🔊 Sound on' : '🔇 Sound off';
      sound.setAttribute('aria-pressed', String(Boolean(state.sound)));
    }
    document.querySelectorAll('[data-jw-mission]').forEach(el => {
      const completed = (Number(state.daily[el.dataset.jwMission]) || 0) > 0;
      el.classList.toggle('complete', completed);
      const check = el.querySelector('.mission-check');
      if (check) check.textContent = completed ? '✓ Done' : '○ Ready';
    });
    const badges = document.getElementById('jw-badges');
    if (badges) {
      badges.innerHTML = '';
      for (const a of AWARDS) {
        const unlocked = state.earned.includes(a.id);
        const item = document.createElement('div');
        item.className = 'jw-badge ' + (unlocked ? 'unlocked' : 'locked');
        item.setAttribute('aria-label', a.title + (unlocked ? ' unlocked' : ' locked'));
        const icon = document.createElement('span'); icon.className = 'jw-badge-icon'; icon.textContent = unlocked ? a.icon : '🔒';
        const title = document.createElement('strong'); title.textContent = a.title;
        const desc = document.createElement('small'); desc.textContent = a.description;
        item.append(icon, title, desc);
        badges.appendChild(item);
      }
    }
  }
  // Install keyboard handlers once (not during every progress render).
  document.querySelectorAll('.quick-cards .card[role="button"]').forEach(el => {
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.click(); }
    });
  });
  document.querySelectorAll('[data-choose-avatar]').forEach(el => {
    el.addEventListener('click', () => {
      if (!AVATARS.includes(el.dataset.chooseAvatar)) return;
      state.avatar = el.dataset.chooseAvatar;
      save(); render(); ding();
    });
  });
  document.querySelectorAll('[data-choose-kit]').forEach(el => {
    el.addEventListener('click', () => {
      if (!COLORS.includes(el.dataset.chooseKit)) return;
      state.kit = el.dataset.chooseKit;
      save(); render();
    });
  });
  const jerseyInput = document.getElementById('jw-number');
  function storeJerseyNumber(event) {
    const raw = String(event.target.value || '').trim();
    if (!raw) return;
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value)) return;
    state.number = Math.max(1, Math.min(99, value));
    save();
    setAll('[data-jw-number]', state.number);
    // Save on every input event, not only when the input loses focus.
    // Mobile browsers and page reloads may not fire a "change" event first.
  }
  jerseyInput?.addEventListener('input', storeJerseyNumber);
  jerseyInput?.addEventListener('change', event => {
    storeJerseyNumber(event);
    render();
  });
  document.getElementById('jw-sound')?.addEventListener('click', () => {
    state.sound = !state.sound; save(); render(); ding();
  });
  document.querySelectorAll('[data-jw-go]').forEach(el => {
    el.addEventListener('click', () => {
      if (typeof window.showSection !== 'function') return;
      const game = el.dataset.jwGo;
      window.showSection('games');
      document.querySelector('.game-tab[data-game="' + game + '"]')?.click();
    });
  });
  document.querySelectorAll('[data-jw-aim]').forEach(el => {
    el.addEventListener('click', () => {
      const area = document.getElementById('goal-area');
      if (!area) return;
      const r = area.getBoundingClientRect();
      const x = Number(el.dataset.jwAim);
      area.dispatchEvent(new MouseEvent('click', {
        bubbles: true, clientX: r.left + (r.width * x / 100), clientY: r.top + (r.height * .28)
      }));
    });
  });
  window.addEventListener('jozef:progress', event => {
    const data = event.detail || {};
    record(data.action, data);
  });
  window.JozefWorld = Object.freeze({ record, getProgress: () => ({
    xp: state.xp, level: Math.floor(state.xp / 100) + 1,
    goals: state.goals, saves: state.saves, badges: [...state.earned],
    kit: state.kit, number: state.number, avatar: state.avatar, sound: Boolean(state.sound)
  })});
  render();
})();
