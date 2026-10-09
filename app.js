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

// ========== LIVE SCORES (SportScore API) ==========
// Escape any third-party text before rendering it as HTML.
function escapeScore(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
async function loadLiveScores() {
  const container = document.getElementById('live-scores');
  container.innerHTML = '<p class="loading-msg">Loading live scores...</p>';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let res;
    try { res = await fetch('https://sportscore.com/api/widget/matches/?sport=football&limit=12', { signal: controller.signal }); }
    finally { clearTimeout(timeout); }
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();

    const matches = Array.isArray(data.matches) ? data.matches.slice(0, 12) : [];
    if (matches.length === 0) {
      container.innerHTML = '<p class="loading-msg">No matches available right now. Check back later!</p>';
      return;
    }

    container.innerHTML = matches.map(m => {
      const status = (m.status || '').toLowerCase();
      const isLive = status === 'live' || status === 'inprogress' || status === 'in_play';
      const isFinished = status === 'finished' || status === 'ft' || status === 'closed';
      const statusText = m.status_text || m.status || '';
      const homeScore = m.home_score != null ? m.home_score : '-';
      const awayScore = m.away_score != null ? m.away_score : '-';

      return `
        <div class="match-card ${isLive ? 'live' : isFinished ? 'finished' : ''}">
          <div class="match-status ${isLive ? 'live-badge' : ''}">${isLive ? '🔴 LIVE' : escapeScore(statusText)}</div>
          <div class="match-teams">
            <span>${escapeScore(m.home || 'Home')}</span>
            <span class="match-score">${escapeScore(homeScore)} - ${escapeScore(awayScore)}</span>
            <span>${escapeScore(m.away || 'Away')}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <p class="error-msg">Could not load live scores right now.<br>
      Don't worry — the fun stories below are always here! ⚽</p>
    `;
  }
}

document.getElementById('refresh-scores').addEventListener('click', loadLiveScores);

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
