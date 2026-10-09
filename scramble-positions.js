// ========== WORD SCRAMBLE ==========
const scrambleWords = [
  { word: 'GOAL', hint: 'When the ball goes in the net' },
  { word: 'KICK', hint: 'What you do with your foot' },
  { word: 'PASS', hint: 'Send the ball to a teammate' },
  { word: 'BALL', hint: 'The round thing everyone chases' },
  { word: 'TEAM', hint: 'Your group of players' },
  { word: 'SAVE', hint: 'What a goalkeeper does' },
  { word: 'FOUL', hint: 'Breaking the rules' },
  { word: 'NET', hint: 'Where goals go in' },
  { word: 'REF', hint: 'Person with the whistle' },
  { word: 'BOOT', hint: 'Soccer shoe (another name)' },
  { word: 'PITCH', hint: 'Another word for the field' },
  { word: 'CORNER', hint: 'Kick from the corner flag' },
  { word: 'STRIKER', hint: 'Player who scores lots of goals' },
  { word: 'DEFENDER', hint: 'Player who stops attacks' },
  { word: 'DRIBBLE', hint: 'Running with the ball at your feet' },
  { word: 'HEADER', hint: 'Hitting the ball with your head' },
  { word: 'TROPHY', hint: 'What winners lift up high' },
  { word: 'STADIUM', hint: 'Big place where matches are played' }
];

let scrambleSolved = 0;
let scrambleStreak = 0;
let currentScramble = null;
let scrambleUsed = [];

function shuffleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const joined = arr.join('');
  if (joined === word && word.length > 1) return shuffleWord(word);
  return joined;
}

function nextScramble() {
  if (scrambleUsed.length >= scrambleWords.length) scrambleUsed = [];
  let pick;
  do {
    pick = scrambleWords[Math.floor(Math.random() * scrambleWords.length)];
  } while (scrambleUsed.includes(pick.word) && scrambleUsed.length < scrambleWords.length);
  scrambleUsed.push(pick.word);
  currentScramble = pick;
  const wordEl = document.getElementById('scramble-word');
  const hintEl = document.getElementById('scramble-hint');
  const inputEl = document.getElementById('scramble-input');
  const feedbackEl = document.getElementById('scramble-feedback');
  if (!wordEl) return;
  wordEl.textContent = shuffleWord(pick.word);
  hintEl.textContent = 'Hint: ' + pick.hint;
  inputEl.value = '';
  feedbackEl.textContent = '';
  inputEl.focus();
}

function checkScramble() {
  if (!currentScramble) return;
  const answer = document.getElementById('scramble-input').value.trim().toUpperCase();
  const feedback = document.getElementById('scramble-feedback');
  if (!answer) {
    feedback.textContent = 'Type a word first!';
    feedback.style.color = '#e67e22';
    return;
  }
  if (answer === currentScramble.word) {
    scrambleSolved++;
    scrambleStreak++;
    document.getElementById('scramble-solved').textContent = scrambleSolved;
    document.getElementById('scramble-streak').textContent = scrambleStreak;
    feedback.textContent = 'Correct! ' + currentScramble.word + ' — awesome!';
    feedback.style.color = '#27ae60';
    window.dispatchEvent(new CustomEvent('jozef:progress', { detail: { action: 'scramble' } }));
    setTimeout(nextScramble, 1100);
  } else {
    scrambleStreak = 0;
    document.getElementById('scramble-streak').textContent = 0;
    feedback.textContent = 'Not quite — try again!';
    feedback.style.color = '#e74c3c';
  }
}

const scrambleCheck = document.getElementById('scramble-check');
const scrambleInput = document.getElementById('scramble-input');
if (scrambleCheck) scrambleCheck.addEventListener('click', checkScramble);
if (scrambleInput) {
  scrambleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkScramble();
  });
}
document.getElementById('scramble-skip')?.addEventListener('click', () => {
  scrambleStreak = 0;
  document.getElementById('scramble-streak').textContent = 0;
  nextScramble();
});
document.getElementById('scramble-new')?.addEventListener('click', nextScramble);
if (document.getElementById('scramble-word')) nextScramble();

// ========== POSITIONS ON THE FIELD ==========
const positionFacts = {
  gk: { title: 'Goalkeeper (GK)', text: 'The last line of defense! Only the keeper can use their hands (inside the box). Brave, quick, and great at catching.' },
  cb: { title: 'Center Back (CB)', text: 'Strong defenders in the middle. They stop strikers and clear the ball away from danger.' },
  cb2: { title: 'Center Back (CB)', text: 'Strong defenders in the middle. They stop strikers and clear the ball away from danger.' },
  lb: { title: 'Left Back (LB)', text: 'Defends the left side and sometimes runs forward to help attack. Needs speed and stamina!' },
  rb: { title: 'Right Back (RB)', text: 'Defends the right side and can overlap to cross the ball. Fast and hard-working.' },
  cm: { title: 'Central Midfielder (CM)', text: 'The engine of the team! Passes, tackles, and connects defense with attack.' },
  lm: { title: 'Left Midfielder (LM)', text: 'Plays on the left wing/mid. Delivers crosses and helps both attack and defense.' },
  rm: { title: 'Right Midfielder (RM)', text: 'Plays on the right side. Great at running with the ball and supporting the striker.' },
  st: { title: 'Striker (ST)', text: 'The main goal scorer! Stays high up the pitch and looks for chances to shoot.' },
  lw: { title: 'Left Winger (LW)', text: 'Fast attacker on the left. Dribbles past defenders and cuts inside to shoot or cross.' },
  rw: { title: 'Right Winger (RW)', text: 'Fast attacker on the right. Loves to beat full-backs and create goals.' }
};

document.querySelectorAll('.pitch-pos').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pitch-pos').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const info = positionFacts[btn.dataset.pos];
    if (!info) return;
    document.getElementById('position-info').innerHTML = '<h4>' + info.title + '</h4><p>' + info.text + '</p>';
  });
});
