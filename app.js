// ===== JOZEF'S WORLD - APP.JS =====

// ---------- Navigation ----------
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-section="${id}"]`);
  if (btn) btn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
    document.getElementById(tab.dataset.game + '-game').classList.add('active');
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

  // Keeper dives randomly
  const diveSide = Math.random() > 0.5 ? 30 : 70;
  keeper.style.left = diveSide + '%';

  ball.classList.add('shooting');
  ball.style.left = x + '%';
  ball.style.top = Math.max(15, Math.min(y, 55)) + '%';
  ball.style.bottom = 'auto';
  ball.style.transform = 'translateX(-50%) scale(0.7)';

  // Determine if goal or save
  setTimeout(() => {
    const ballX = x;
    const keeperX = diveSide;
    const distance = Math.abs(ballX - keeperX);

    // Goal if far from keeper and inside the net area roughly
    const isInNet = y < 50 && x > 18 && x < 82;
    const isSaved = distance < 18;

    if (isInNet && !isSaved) {
      penaltyScore++;
      document.getElementById('penalty-score').textContent = penaltyScore;
      // celebration flash
      goalArea.style.boxShadow = 'inset 0 0 40px rgba(46, 204, 113, 0.6)';
      setTimeout(() => goalArea.style.boxShadow = '', 600);
    } else {
      penaltyMisses++;
      document.getElementById('penalty-misses').textContent = penaltyMisses;
      goalArea.style.boxShadow = 'inset 0 0 40px rgba(231, 76, 60, 0.5)';
      setTimeout(() => goalArea.style.boxShadow = '', 600);
    }

    setTimeout(() => {
      resetBall();
      keeper.style.left = '50%';
    }, 800);
  }, 500);
});

document.getElementById('reset-penalty').addEventListener('click', () => {
  penaltyScore = 0;
  penaltyMisses = 0;
  document.getElementById('penalty-score').textContent = 0;
  document.getElementById('penalty-misses').textContent = 0;
  resetBall();
  keeper.style.left = '50%';
});

// ========== MEMORY MATCH ==========
const memoryEmojis = ['⚽', '🏆', '🧤', '👟', '🥅', '🏅'];
let memoryCards = [];
let flippedCards = [];
let matchedCount = 0;
let moveCount = 0;
let canFlip = true;

function initMemory() {
  matchedCount = 0;
  moveCount = 0;
  flippedCards = [];
  canFlip = true;
  document.getElementById('memory-matches').textContent = 0;
  document.getElementById('memory-moves').textContent = 0;

  const pairs = [...memoryEmojis, ...memoryEmojis];
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  const grid = document.getElementById('memory-grid');
  grid.innerHTML = '';
  pairs.forEach((emoji, index) => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.emoji = emoji;
    card.dataset.index = index;
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
        setTimeout(() => alert('🎉 Awesome! You matched them all, Jozef! Great job!'), 300);
      }
    } else {
      setTimeout(() => {
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
  {
    q: "How many players are on a soccer team on the field?",
    options: ["9", "10", "11", "12"],
    answer: 2
  },
  {
    q: "What is it called when a player scores three goals in one game?",
    options: ["Triple", "Hat-trick", "Super goal", "Mega score"],
    answer: 1
  },
  {
    q: "Which country has won the most FIFA World Cups?",
    options: ["Germany", "Argentina", "Brazil", "Italy"],
    answer: 2
  },
  {
    q: "What color card means a player is sent off the field?",
    options: ["Yellow", "Blue", "Red", "Green"],
    answer: 2
  },
  {
    q: "How long is a regular soccer game (without extra time)?",
    options: ["60 minutes", "75 minutes", "90 minutes", "120 minutes"],
    answer: 2
  },
  {
    q: "Which body part can the goalkeeper use that other players cannot?",
    options: ["Head", "Chest", "Hands", "Knees"],
    answer: 2
  },
  {
    q: "What is the name of the biggest soccer tournament in the world?",
    options: ["Champions League", "World Cup", "Olympics", "Premier League"],
    answer: 1
  },
  {
    q: "Where did modern soccer begin?",
    options: ["Brazil", "Spain", "England", "USA"],
    answer: 2
  }
];

let currentQuestion = 0;
let quizScore = 0;

function loadQuestion() {
  if (currentQuestion >= quizQuestions.length) {
    document.getElementById('quiz-question').textContent = `🎉 Finished! You scored ${quizScore} out of ${quizQuestions.length}!`;
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

// ========== NEWS ==========
const newsStories = [
  {
    emoji: "🏆",
    title: "Young Players Shine in Weekend Matches",
    body: "Across the country, kids just like you are scoring amazing goals and making incredible saves. Keep practicing — the next star could be you!",
    tag: "Youth Soccer"
  },
  {
    emoji: "🌍",
    title: "World Cup Dreams Start Young",
    body: "Many of the world's best players started kicking a ball when they were 8 years old — just like Jozef! Practice, have fun, and never give up.",
    tag: "Inspiration"
  },
  {
    emoji: "🧤",
    title: "Goalkeepers Are Superheroes",
    body: "Did you know goalkeepers need quick reflexes, bravery, and great communication? Being a keeper is one of the coolest jobs on the field!",
    tag: "Positions"
  },
  {
    emoji: "⚽",
    title: "The Beautiful Game Keeps Growing",
    body: "More kids than ever are playing soccer around the world. Girls and boys, big cities and small towns — soccer brings everyone together.",
    tag: "Global"
  },
  {
    emoji: "👟",
    title: "New Soccer Cleats Are Faster Than Ever",
    body: "Modern soccer shoes are super light and help players run faster and turn quicker. But the most important thing is still your skills and heart!",
    tag: "Gear"
  },
  {
    emoji: "🏅",
    title: "Teamwork Makes the Dream Work",
    body: "The best teams aren't just full of stars — they pass, help each other, and celebrate together. Be a great teammate and everyone wins!",
    tag: "Values"
  }
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
