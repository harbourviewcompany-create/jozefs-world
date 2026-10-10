/* Generated browser scripts. Preserve order; do not edit directly. */

/* BEGIN notes.js */
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

  // Notes belong to the one shared club. Preserve existing messages and the
  // existing localStorage format, but do not assign permissions to a persona.
  function unread() {
    const last = Number(seen().Shared || 0);
    return load().some(note => Number(note.at) > last);
  }

  function markSeen() {
    const box = seen();
    box.Shared = Date.now();
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
    const card = document.getElementById('today-card');
    const latest = load()[0];
    const fresh = Boolean(unread() && latest);
    if (note) note.textContent = fresh ? 'New club note: ' + latest.text : 'No new notes.';
    if (card) card.className = fresh ? 'today-card has-note' : 'today-card';
    paintDot();
  }

  function render() {
    const list = document.getElementById('note-list');
    if (!list) return;
    list.replaceChildren();
    const notes = load();
    if (!notes.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No notes yet. Leave a note for your club.';
      list.appendChild(empty);
      return;
    }
    notes.forEach(note => {
      const item = document.createElement('article');
      item.className = 'note club';
      const name = document.createElement('strong');
      // Old Dad/Jozef signatures are retained for existing local notes.
      name.textContent = note.from === 'Dad' || note.from === 'Jozef' ? note.from : 'Jozef FC';
      const text = document.createElement('p');
      text.textContent = note.text;
      item.append(name, text);
      if (note.id) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'note-delete';
        del.textContent = 'Delete note';
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
      const notes = [{ id: Date.now().toString(36), from: 'Club', text, at: Date.now() }, ...load()];
      save(notes);
      input.value = '';
      markSeen();
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
;

/* BEGIN app.js */
// ===== JOZEF'S WORLD - APP.JS =====

// ---------- Navigation ----------
function showSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  section.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-section="${id}"]`);
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 'news') loadLiveScores();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showSection(btn.dataset.section));
});

// ---------- Game Tabs ----------
document.querySelectorAll('.game-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById(tab.dataset.game + '-game');
    if (panel) panel.classList.add('active');
  });
});

// ---------- Learn Tabs ----------
document.querySelectorAll('.learn-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.learn-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.learn-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('learn-' + tab.dataset.learn).classList.add('active');
  });
});

// ========== PENALTY SHOOTOUT ==========
let penaltyScore = 0;
let penaltyMisses = 0;
let penaltyRoundToken = 0;
const ball = document.getElementById('penalty-ball');
const keeper = document.getElementById('keeper');
const goalArea = document.getElementById('goal-area');

function resetBall() {
  ball.style.left = '50%';
  ball.style.bottom = '30px';
  ball.style.top = 'auto';
  ball.style.transform = 'translateX(-50%) scale(1)';
  ball.classList.remove('shooting');
}

goalArea.addEventListener('click', (e) => {
  if (ball.classList.contains('shooting')) return;

  const rect = goalArea.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  const diveSide = [27, 50, 73][Math.floor(Math.random() * 3)];
  const roundToken = penaltyRoundToken;
  keeper.style.left = diveSide + '%';

  ball.classList.add('shooting');
  ball.style.left = x + '%';
  ball.style.top = Math.max(15, Math.min(y, 55)) + '%';
  ball.style.bottom = 'auto';
  ball.style.transform = 'translateX(-50%) scale(0.7)';

  setTimeout(() => {
    if (roundToken !== penaltyRoundToken) return;
    const distance = Math.abs(x - diveSide);
    const isInNet = y < 50 && x > 18 && x < 82;
    const isSaved = distance < 18;

    if (isInNet && !isSaved) {
      penaltyScore++;
      window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'goal' } }));
      document.getElementById('jw-penalty-feedback').textContent = 'GOOOAL! Amazing shot! ⚽';
      document.getElementById('penalty-score').textContent = penaltyScore;
      goalArea.style.boxShadow = 'inset 0 0 40px rgba(46, 204, 113, 0.6)';
      setTimeout(() => goalArea.style.boxShadow = '', 600);
    } else {
      penaltyMisses++;
      document.getElementById('jw-penalty-feedback').textContent = isSaved && isInNet ? 'Great save! Try another corner.' : 'Just missed! Have another go.';
      document.getElementById('penalty-misses').textContent = penaltyMisses;
      goalArea.style.boxShadow = 'inset 0 0 40px rgba(231, 76, 60, 0.5)';
      setTimeout(() => goalArea.style.boxShadow = '', 600);
    }

    setTimeout(() => {
      if (roundToken !== penaltyRoundToken) return;
      resetBall();
      keeper.style.left = '50%';
    }, 800);
  }, 500);
});

document.getElementById('reset-penalty').addEventListener('click', () => {
  penaltyRoundToken++;
  document.getElementById('jw-penalty-feedback').textContent = 'Fresh round! Choose your next shot.';
  penaltyScore = 0;
  penaltyMisses = 0;
  document.getElementById('penalty-score').textContent = 0;
  document.getElementById('penalty-misses').textContent = 0;
  resetBall();
  keeper.style.left = '50%';
});

// ========== MEMORY MATCH ==========
const memoryEmojis = ['⚽', '🏆', '🧤', '👟', '🥅', '🏅'];
let flippedCards = [];
let matchedCount = 0;
let moveCount = 0;
let canFlip = true;
let memoryRoundToken = 0;

function initMemory() {
  memoryRoundToken++;
  matchedCount = 0;
  moveCount = 0;
  flippedCards = [];
  canFlip = true;
  document.getElementById('memory-matches').textContent = 0;
  document.getElementById('memory-moves').textContent = 0;
  const feedback = document.getElementById('memory-feedback');
  if (feedback) feedback.textContent = '';

  const pairs = [...memoryEmojis, ...memoryEmojis];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  const grid = document.getElementById('memory-grid');
  grid.innerHTML = '';
  pairs.forEach((emoji, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'memory-card';
    card.setAttribute('aria-label', 'Reveal memory card ' + (index + 1));
    card.dataset.emoji = emoji;
    card.textContent = '?';
    card.addEventListener('click', () => flipCard(card));
    grid.appendChild(card);
  });
}

function flipCard(card) {
  if (!canFlip || card.classList.contains('flipped') || card.classList.contains('matched')) return;

  card.classList.add('flipped');
  card.textContent = card.dataset.emoji;
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    canFlip = false;
    moveCount++;
    document.getElementById('memory-moves').textContent = moveCount;

    const [c1, c2] = flippedCards;
    if (c1.dataset.emoji === c2.dataset.emoji) {
      c1.classList.add('matched');
      c2.classList.add('matched');
      matchedCount++;
      document.getElementById('memory-matches').textContent = matchedCount;
      flippedCards = [];
      canFlip = true;
      if (matchedCount === 6) {
        window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'memory' } }));
        const feedback = document.getElementById('memory-feedback');
        if (feedback) feedback.textContent = '🏆 All six pairs matched! Great memory, Jozef!';
      }
    } else {
      const roundToken = memoryRoundToken;
      setTimeout(() => {
        if (roundToken !== memoryRoundToken) return;
        c1.classList.remove('flipped');
        c2.classList.remove('flipped');
        c1.textContent = '?';
        c2.textContent = '?';
        flippedCards = [];
        canFlip = true;
      }, 900);
    }
  }
}

document.getElementById('reset-memory').addEventListener('click', initMemory);
initMemory();

// ========== SOCCER QUIZ ==========
const quizQuestions = [
  { q: "How many players are on a soccer team on the field?", options: ["9", "10", "11", "12"], answer: 2 },
  { q: "What is it called when a player scores three goals in one game?", options: ["Triple", "Hat-trick", "Super goal", "Mega score"], answer: 1 },
  { q: "Which country has won the most FIFA World Cups?", options: ["Germany", "Argentina", "Brazil", "Italy"], answer: 2 },
  { q: "What color card means a player is sent off the field?", options: ["Yellow", "Blue", "Red", "Green"], answer: 2 },
  { q: "How long is a regular soccer game (without extra time)?", options: ["60 minutes", "75 minutes", "90 minutes", "120 minutes"], answer: 2 },
  { q: "Which body part can the goalkeeper use that other players cannot?", options: ["Head", "Chest", "Hands", "Knees"], answer: 2 },
  { q: "What is the name of the biggest soccer tournament in the world?", options: ["Champions League", "World Cup", "Olympics", "Premier League"], answer: 1 },
  { q: "Where did modern soccer begin?", options: ["Brazil", "Spain", "England", "USA"], answer: 2 }
];

let currentQuestion = 0;
let quizScore = 0;

function loadQuestion() {
  if (currentQuestion >= quizQuestions.length) {
    document.getElementById('quiz-question').textContent = `🎉 Finished! You scored ${quizScore} out of ${quizQuestions.length}!`;
    window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'quiz', score: quizScore, total: quizQuestions.length } }));
    document.getElementById('quiz-options').innerHTML = '';
    document.getElementById('quiz-feedback').textContent = quizScore >= 6 ? "You're a soccer genius, Jozef!" : "Great effort! Keep learning!";
    document.getElementById('restart-quiz').style.display = 'inline-block';
    return;
  }

  const q = quizQuestions[currentQuestion];
  document.getElementById('quiz-num').textContent = currentQuestion + 1;
  document.getElementById('quiz-question').textContent = q.q;
  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('restart-quiz').style.display = 'none';

  const optionsDiv = document.getElementById('quiz-options');
  optionsDiv.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => checkAnswer(i, btn));
    optionsDiv.appendChild(btn);
  });
}

function checkAnswer(selected, btn) {
  const q = quizQuestions[currentQuestion];
  const allBtns = document.querySelectorAll('.quiz-option');
  allBtns.forEach(b => b.style.pointerEvents = 'none');

  if (selected === q.answer) {
    btn.classList.add('correct');
    quizScore++;
    document.getElementById('quiz-score').textContent = quizScore;
    document.getElementById('quiz-feedback').textContent = '✅ Correct! Awesome!';
    document.getElementById('quiz-feedback').style.color = '#27ae60';
  } else {
    btn.classList.add('wrong');
    allBtns[q.answer].classList.add('correct');
    document.getElementById('quiz-feedback').textContent = '❌ Not quite — but good try!';
    document.getElementById('quiz-feedback').style.color = '#e74c3c';
  }

  currentQuestion++;
  setTimeout(loadQuestion, 1400);
}

document.getElementById('restart-quiz').addEventListener('click', () => {
  currentQuestion = 0;
  quizScore = 0;
  document.getElementById('quiz-score').textContent = 0;
  loadQuestion();
});

loadQuestion();

// ========== KEEPY-UPPY ==========
let keepyCount = 0;
let keepyBest = parseInt(localStorage.getItem('jozefKeepyBest') || '0');
let keepyFalling = false;
let keepyInterval = null;
let keepyBounceToken = 0;
const keepyBall = document.getElementById('keepy-ball');
const keepyArea = document.getElementById('keepy-area');

document.getElementById('keepy-best').textContent = keepyBest;

function keepyBounce() {
  const bounceToken = ++keepyBounceToken;
  if (!keepyFalling) {
    // start falling
    keepyFalling = true;
    keepyBall.style.bottom = '80px';
  }
  keepyCount++;
  if (keepyCount === 10) window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'keepy', count: keepyCount } }));
  document.getElementById('keepy-count').textContent = keepyCount;
  if (keepyCount > keepyBest) {
    keepyBest = keepyCount;
    document.getElementById('keepy-best').textContent = keepyBest;
    localStorage.setItem('jozefKeepyBest', keepyBest);
  }

  // bounce up
  keepyBall.style.bottom = (120 + Math.random() * 80) + 'px';

  clearTimeout(keepyInterval);
  keepyInterval = setTimeout(() => {
    if (bounceToken !== keepyBounceToken) return;
    // falls down
    keepyBall.style.bottom = '20px';
    setTimeout(() => {
      if (bounceToken !== keepyBounceToken) return;
      if (keepyFalling) {
        // missed
        keepyFalling = false;
        keepyCount = 0;
        document.getElementById('keepy-count').textContent = 0;
        keepyBall.style.bottom = '80px';
      }
    }, 400);
  }, 700);
}

keepyArea.addEventListener('click', keepyBounce);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.getElementById('keepy-game').classList.contains('active')) {
    e.preventDefault();
    keepyBounce();
  }
});

document.getElementById('reset-keepy').addEventListener('click', () => {
  keepyBounceToken++;
  keepyCount = 0;
  keepyFalling = false;
  clearTimeout(keepyInterval);
  document.getElementById('keepy-count').textContent = 0;
  keepyBall.style.bottom = '80px';
});

// ========== GOALIE REACTION ==========
let goalieSaves = 0;
let goalieGoals = 0;
let goalieActive = false;
let goalieRoundToken = 0;
let currentSide = null;
const goalieBall = document.getElementById('goalie-ball');
const goalieKeeper = document.getElementById('goalie-keeper');
const goalieStatus = document.getElementById('goalie-status');

const sidePositions = {
  left: { left: '20%', top: '30%' },
  center: { left: '50%', top: '25%' },
  right: { left: '80%', top: '30%' }
};

document.querySelectorAll('.zone-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!goalieActive || !currentSide) return;
    const chosen = btn.dataset.side;

    // move keeper
    if (chosen === 'left') goalieKeeper.style.left = '25%';
    else if (chosen === 'right') goalieKeeper.style.left = '75%';
    else goalieKeeper.style.left = '50%';

    if (chosen === currentSide) {
      goalieSaves++;
      window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'save' } }));
      document.getElementById('goalie-saves').textContent = goalieSaves;
      goalieStatus.textContent = '✅ SAVE! Great reflexes!';
      goalieStatus.style.color = '#27ae60';
    } else {
      goalieGoals++;
      document.getElementById('goalie-goals').textContent = goalieGoals;
      goalieStatus.textContent = '⚽ Goal! Try again!';
      goalieStatus.style.color = '#e74c3c';
    }

    goalieActive = false;
    currentSide = null;
    setTimeout(() => {
      goalieBall.style.display = 'none';
      goalieKeeper.style.left = '50%';
      goalieStatus.textContent = 'Press Start for the next shot!';
      goalieStatus.style.color = '#777';
    }, 900);
  });
});

document.getElementById('start-goalie').addEventListener('click', () => {
  if (goalieActive) return;
  const shotToken = ++goalieRoundToken;
  goalieActive = true;
  goalieStatus.textContent = 'Watch the ball...';
  goalieStatus.style.color = '#3498db';

  const sides = ['left', 'center', 'right'];
  currentSide = sides[Math.floor(Math.random() * 3)];

  // start ball from bottom center
  goalieBall.style.display = 'block';
  goalieBall.style.left = '50%';
  goalieBall.style.top = '70%';
  goalieBall.style.transform = 'translateX(-50%)';

  // fly to target
  setTimeout(() => {
    if (!goalieActive || shotToken !== goalieRoundToken || !currentSide) return;
    const pos = sidePositions[currentSide];
    goalieBall.style.left = pos.left;
    goalieBall.style.top = pos.top;
  }, 50);

  // auto-miss if too slow; ignore timers from previous shots.
  setTimeout(() => {
    if (goalieActive && shotToken === goalieRoundToken) {
      goalieGoals++;
      document.getElementById('goalie-goals').textContent = goalieGoals;
      goalieStatus.textContent = '⚽ Too slow! Goal!';
      goalieStatus.style.color = '#e74c3c';
      goalieActive = false;
      currentSide = null;
      setTimeout(() => {
        goalieBall.style.display = 'none';
        goalieKeeper.style.left = '50%';
        goalieStatus.textContent = 'Press Start for the next shot!';
        goalieStatus.style.color = '#777';
      }, 800);
    }
  }, 1200);
});

// ========== TARGET PRACTICE ==========
let targetHits = 0;
let targetTimeLeft = 30;
let targetInterval = null;
let targetSpawnInterval = null;
let targetRunning = false;
const targetArea = document.getElementById('target-area');

function spawnTarget() {
  if (!targetRunning) return;
  const target = document.createElement('button');
  target.type = 'button';
  target.className = 'target';
  const size = 40 + Math.random() * 40; // 40-80px
  target.style.width = size + 'px';
  target.style.height = size + 'px';
  target.style.left = Math.random() * (targetArea.clientWidth - size) + 'px';
  target.style.top = Math.random() * (targetArea.clientHeight - size) + 'px';
  target.textContent = '⚽';

  const points = size < 55 ? 3 : size < 70 ? 2 : 1;
  target.title = '+' + points;
  target.setAttribute('aria-label', 'Hit soccer target for ' + points + ' points');

  target.addEventListener('click', (e) => {
    e.stopPropagation();
    targetHits += points;
    document.getElementById('target-hits').textContent = targetHits;
    target.remove();
  });

  targetArea.appendChild(target);

  // auto remove after 2s
  setTimeout(() => {
    if (target.parentNode) target.remove();
  }, 2000);
}

function startTargetGame() {
  if (targetRunning) return;
  targetRunning = true;
  targetHits = 0;
  targetTimeLeft = 30;
  document.getElementById('target-hits').textContent = 0;
  document.getElementById('target-time').textContent = 30;
  document.getElementById('target-start-msg').style.display = 'none';
  targetArea.querySelectorAll('.target').forEach(t => t.remove());

  targetInterval = setInterval(() => {
    targetTimeLeft--;
    document.getElementById('target-time').textContent = targetTimeLeft;
    if (targetTimeLeft <= 0) {
      clearInterval(targetInterval);
      clearInterval(targetSpawnInterval);
      targetRunning = false;
      window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'target', score: targetHits } }));
      document.getElementById('target-start-msg').style.display = 'block';
      document.getElementById('target-start-msg').textContent = `Time's up! You hit ${targetHits} points! 🎉`;
      targetArea.querySelectorAll('.target').forEach(t => t.remove());
    }
  }, 1000);

  targetSpawnInterval = setInterval(spawnTarget, 800);
  spawnTarget();
}

document.getElementById('start-target').addEventListener('click', startTargetGame);

// ========== LIVE SCORES (major sports) ==========
function escapeScore(value) {
  return String(value == null ? '' : value).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '&#39;');
}
const SCORE_BOARDS = [
  { sport: 'Soccer', label: 'Premier League', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard' },
  { sport: 'Soccer', label: 'MLS', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard' },
  { sport: 'Soccer', label: 'Champions League', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard' },
  { sport: 'NFL', label: 'NFL', url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard' },
  { sport: 'NBA', label: 'NBA', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard' },
  { sport: 'NHL', label: 'NHL', url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard' },
  { sport: 'MLB', label: 'MLB', url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard' }
];
let scoreGames = [];
let scoreFilter = 'all';

function readBoard(board, data) {
  return (data.events || []).slice(0, 8).map(event => {
    const game = (event.competitions || [])[0] || {};
    const teams = game.competitors || [];
    const home = teams.find(team => team.homeAway === 'home') || teams[0] || {};
    const away = teams.find(team => team.homeAway === 'away') || teams[1] || {};
    const state = (game.status && game.status.type && game.status.type.state) || event.status && event.status.type && event.status.type.state || 'pre';
    return {
      sport: board.sport,
      league: board.label,
      home: (home.team && (home.team.shortDisplayName || home.team.displayName)) || 'Home',
      away: (away.team && (away.team.shortDisplayName || away.team.displayName)) || 'Away',
      homeScore: home.score != null ? home.score : '-',
      awayScore: away.score != null ? away.score : '-',
      state,
      detail: (game.status && game.status.type && game.status.type.shortDetail) || ''
    };
  });
}

function paintScores() {
  const container = document.getElementById('live-scores');
  if (!container) return;
  const games = scoreGames.filter(game => scoreFilter === 'all' || game.sport === scoreFilter);
  if (!games.length) {
    container.innerHTML = '<p class="loading-msg">No matches for that sport right now.</p>';
    return;
  }
  container.innerHTML = games.map(game => {
    const live = game.state === 'in';
    return `<div class="match-card ${live ? 'live' : game.state === 'post' ? 'finished' : ''}">
      <div class="match-status ${live ? 'live-badge' : ''}">${live ? 'LIVE' : escapeScore(game.detail || game.league)} · ${escapeScore(game.league)}</div>
      <div class="match-teams">
        <span>${escapeScore(game.away)}</span>
        <span class="match-score">${escapeScore(game.awayScore)} - ${escapeScore(game.homeScore)}</span>
        <span>${escapeScore(game.home)}</span>
      </div>
    </div>`;
  }).join('');
}

async function loadLiveScores() {
  const container = document.getElementById('live-scores');
  if (!container) return;
  container.innerHTML = '<p class="loading-msg">Loading major sports scores...</p>';
  const boards = await Promise.all(SCORE_BOARDS.map(async board => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(board.url, { signal: controller.signal });
      if (!res.ok) return [];
      return readBoard(board, await res.json());
    } catch (err) {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }));
  scoreGames = boards.flat().sort((a, b) => Number(b.state === 'in') - Number(a.state === 'in'));
  if (!scoreGames.length) {
    container.innerHTML = '<p class="error-msg">Scores are not available right now. They can be delayed, and this board does not cover every sport.</p>';
    return;
  }
  paintScores();
}

document.getElementById('refresh-scores')?.addEventListener('click', loadLiveScores);
document.getElementById('sport-tabs')?.addEventListener('click', event => {
  const button = event.target.closest('[data-sport]');
  if (!button) return;
  scoreFilter = button.dataset.sport;
  document.querySelectorAll('#sport-tabs [data-sport]').forEach(tab => tab.classList.toggle('active', tab === button));
  paintScores();
});

// ========== KID-FRIENDLY NEWS ==========
const newsStories = [
  { emoji: "🏆", title: "Young Players Shine in Weekend Matches", body: "Across the country, kids just like you are scoring amazing goals and making incredible saves. Keep practicing — the next star could be you!", tag: "Youth Soccer" },
  { emoji: "🌍", title: "World Cup Dreams Start Young", body: "Many of the world's best players started kicking a ball when they were 8 years old — just like Jozef! Practice, have fun, and never give up.", tag: "Inspiration" },
  { emoji: "🧤", title: "Goalkeepers Are Superheroes", body: "Did you know goalkeepers need quick reflexes, bravery, and great communication? Being a keeper is one of the coolest jobs on the field!", tag: "Positions" },
  { emoji: "⚽", title: "The Beautiful Game Keeps Growing", body: "More kids than ever are playing soccer around the world. Girls and boys, big cities and small towns — soccer brings everyone together.", tag: "Global" },
  { emoji: "👟", title: "New Soccer Cleats Are Faster Than Ever", body: "Modern soccer shoes are super light and help players run faster and turn quicker. But the most important thing is still your skills and heart!", tag: "Gear" },
  { emoji: "🏅", title: "Teamwork Makes the Dream Work", body: "The best teams aren't just full of stars — they pass, help each other, and celebrate together. Be a great teammate and everyone wins!", tag: "Values" }
];

function renderNews() {
  const grid = document.getElementById('news-grid');
  grid.innerHTML = newsStories.map(story => `
    <div class="news-card">
      <div class="news-header">${story.emoji}</div>
      <div class="news-body">
        <h3>${story.title}</h3>
        <p>${story.body}</p>
        <span class="news-tag">${story.tag}</span>
      </div>
    </div>
  `).join('');
}
renderNews();

// ========== FUN ZONE ==========
const jokes = [
  "Why did the soccer player bring string to the game? So he could tie the score! 😄",
  "What do you call a pig that plays soccer? A ball hog! 🐷⚽",
  "Why was the soccer field so hot? Because all the fans left! 🔥",
  "How do soccer players stay cool? They stand near the fans! 🌬️",
  "Why did the ball go to school? To get a little 'kick' out of education! 📚",
  "What's a soccer player's favorite type of photo? A penalty shoot! 📸",
  "Why can't you give a soccer player a cat? Because they might keep catching it! 🐱",
  "What did the soccer ball say to the player? 'You kick me around so much!' ⚽"
];

const facts = [
  "The fastest goal in World Cup history was scored in just 11 seconds!",
  "A soccer ball is made of 32 panels — 12 pentagons and 20 hexagons.",
  "The first soccer balls were made from animal bladders!",
  "Brazil is the only country to have played in every single World Cup.",
  "The World Cup trophy is made of 18-carat gold and weighs about 6 kg.",
  "Some professional players can run more than 10 kilometers in one game!",
  "The word 'soccer' comes from 'association football'.",
  "Goalkeepers can wear different colored jerseys so everyone can tell them apart."
];

const encouragements = [
  "You're getting better every single day, Jozef! Keep it up! 💪",
  "Champions are made when no one is watching. You're a champion in training!",
  "Believe in yourself — great things start with believing! ⭐",
  "Every time you practice, you're one step closer to your dreams.",
  "Mistakes help you learn. Keep smiling and keep trying!",
  "You have the heart of a true soccer star! ❤️⚽",
  "The best players never stop learning. You're on the right path!",
  "Jozef, the field is waiting for your next amazing play!"
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

document.getElementById('new-joke').addEventListener('click', () => {
  document.getElementById('joke-text').textContent = randomItem(jokes);
});

document.getElementById('new-fact').addEventListener('click', () => {
  document.getElementById('fact-text').textContent = randomItem(facts);
});

document.getElementById('new-encourage').addEventListener('click', () => {
  document.getElementById('encourage-text').textContent = randomItem(encouragements);
});

// Initial fun content
document.getElementById('joke-text').textContent = randomItem(jokes);
document.getElementById('fact-text').textContent = randomItem(facts);
document.getElementById('encourage-text').textContent = randomItem(encouragements);
;

/* BEGIN extras.js */
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
    { id: 'all-sport-champion', icon: '🏆', title: 'Four-Sport Star', description: 'Play every sport in the Sports Arcade', ready: s => s.multiSports.length >= 4 },
    { id: 'four-sport-cup', icon: '🥇', title: 'All-Sport Cup Winner', description: 'Score 3 or more in hockey, baseball, basketball, and wrestling', ready: s => Boolean(s.allSportCup) },
    { id: 'rival-circuit-legend', icon: '🏅', title: 'Rival Circuit Legend', description: 'Complete three escalating rival challenges in each of the four sports', ready: s => Boolean(s.rivalCircuitChampion) }
  ];
  const defaultState = () => ({
    xp: 0, goals: 0, saves: 0, memory: 0, quizzes: 0, perfect: 0, scrambles: 0,
    keepyBest: 0, targetBest: 0, club: 'Jozef FC', avatar: '🦁', kit: COLORS[0],
    number: 10, day: dayKey(), daily: {}, dailyHero: '', earned: [],
    sound: false, tourWins: 0, championships: 0, geography: 0,
    careerGames: 0, careerWins: 0, trainingSuccess: 0, leagueTitles: 0, streetRuns: 0, streetBest: 0, arenaGames: 0, arenaWins: 0, arenaGoals: 0,
    multisportGames: 0, multiSports: [], allSportCup: false, rivalCircuitChampion: false,
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
    s.allSportCup = s.allSportCup === true;
    s.rivalCircuitChampion = s.rivalCircuitChampion === true;
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
      // A trophy can only be earned from four persisted best scores.
      const cup = window.JozefMultiSport?.getCupProgress?.();
      if (cup?.champion && cup.qualified === 4) state.allSportCup = true;
      const rivals = window.JozefMultiSport?.getRivalProgress?.();
      if (rivals?.champion && rivals.beaten === 12) state.rivalCircuitChampion = true;
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
;
