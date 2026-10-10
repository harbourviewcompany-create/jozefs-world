/* Jozef FC World Tour: five-country shootout adventure. 100% browser-only progress. */
(() => {
  'use strict';
  const STORE = 'jozefs-world-tour-v1';
  const DIRECTIONS = ['left', 'centre', 'right'];
  const DESTINATIONS = [
    { flag: '🇨🇦', country: 'Canada', club: 'Maple Strikers', city: 'Ottawa', capital: 'Ottawa', choices: ['Toronto', 'Ottawa', 'Vancouver'], rivalGoals: 1, fact: 'Canada has hosted major international soccer tournaments. Ottawa is its capital!' },
    { flag: '🇯🇵', country: 'Japan', club: 'Tokyo Lightning', city: 'Tokyo', capital: 'Tokyo', choices: ['Seoul', 'Kyoto', 'Tokyo'], rivalGoals: 2, fact: 'Japan is famous for fast passing, teamwork and incredibly supportive fans.' },
    { flag: '🇧🇷', country: 'Brazil', club: 'Samba Stars', city: 'Rio de Janeiro', capital: 'Brasília', choices: ['Brasília', 'Rio de Janeiro', 'São Paulo'], rivalGoals: 2, fact: 'Brazil has won the men’s World Cup five times. Football is a huge part of its culture!' },
    { flag: '🇫🇷', country: 'France', club: 'Paris Comets', city: 'Paris', capital: 'Paris', choices: ['Lyon', 'Paris', 'Marseille'], rivalGoals: 3, fact: 'The famous Eiffel Tower is in Paris, the capital of France.' },
    { flag: '🇦🇷', country: 'Argentina', club: 'Puma United', city: 'Buenos Aires', capital: 'Buenos Aires', choices: ['Córdoba', 'Rosario', 'Buenos Aires'], rivalGoals: 3, fact: 'Argentina is home to many great players, including Lionel Messi.' }
  ];
  const STADIUMS = [
    { name: 'Neighbourhood Pitch', wins: 0, symbol: '🏡', note: 'A little field for big dreams' },
    { name: 'City Stadium', wins: 2, symbol: '🏟️', note: 'More fans, bigger cheers!' },
    { name: 'National Arena', wins: 4, symbol: '🎆', note: 'The whole country is watching' },
    { name: 'World Stadium', wins: 8, symbol: '🌍', note: 'A world-famous home ground' }
  ];
  const byId = id => document.getElementById(id);
  const text = (id, value) => { const el = byId(id); if (el) el.textContent = String(value); };
  const setHidden = (id, hidden) => { const el = byId(id); if (el) el.hidden = hidden; };
  const int = (v, fallback = 0) => Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : fallback;
  const choice = () => DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
  function nextLean(previous) {
    const choices = DIRECTIONS.filter(direction => direction !== previous);
    return choices[Math.floor(Math.random() * choices.length)];
  }
  function defaults() {
    return { season: 1, round: 0, match: null, totalWins: 0, crowns: 0, stamps: [], correct: [] };
  }
  function load() {
    let parsed;
    try { parsed = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults();
    const state = { ...defaults(), ...parsed };
    state.season = Math.min(99999, Math.max(1, int(state.season, 1)));
    state.round = Math.min(DESTINATIONS.length, int(state.round));
    state.totalWins = Math.min(999999, int(state.totalWins));
    state.crowns = Math.min(999999, int(state.crowns));
    state.stamps = Array.isArray(state.stamps) ? state.stamps.filter(x => typeof x === 'string').slice(-1000) : [];
    state.correct = Array.isArray(state.correct) ? state.correct.filter(x => typeof x === 'string').slice(-1000) : [];
    if (state.match && typeof state.match === 'object' && !Array.isArray(state.match) && state.round < DESTINATIONS.length) {
      const m = state.match;
      const validShots = Array.isArray(m.shots) && m.shots.length <= 5 &&
        m.shots.every(shot => shot && DIRECTIONS.includes(shot.side) && typeof shot.goal === 'boolean');
      if (!validShots || !['playing', 'won', 'lost'].includes(m.status)) {
        state.match = null;
      } else {
        m.shots = m.shots.slice(0, 5);
        m.lean = DIRECTIONS.includes(m.lean) ? m.lean : choice();
        m.rivalGoals = DESTINATIONS[state.round].rivalGoals;
        // Recover outcome from the shots rather than trusting potentially stale status.
        if (m.shots.length === 5) {
          m.status = m.shots.filter(shot => shot.goal).length > m.rivalGoals ? 'won' : 'lost';
        } else {
          m.status = 'playing';
        }
      }
    } else state.match = null;
    return state;
  }
  const state = load();
  let busy = false;
  let feedback = 'Choose where to kick. Watch the goalkeeper!';
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch (_) { text('tour-save-note', 'Progress cannot be saved in this browser. You can still play.'); }
    if(typeof window.dispatchEvent==='function'&&typeof Event==='function')window.dispatchEvent(new Event('jozef:chronicle-sync'));
  }
  function matchId() { return 'season-' + state.season + '-round-' + state.round; }
  function reward(action, id) {
    if (window.JozefWorld && typeof window.JozefWorld.record === 'function') {
      window.JozefWorld.record(action, { winId: id });
    }
  }
  function awardCompletedMatch() {
    if (!state.match || state.match.status !== 'won') return;
    reward('tournament', matchId());
    if (state.round === DESTINATIONS.length - 1) reward('championship', matchId());
  }
  function stadiumTier() {
    let tier = 0;
    STADIUMS.forEach((stadium, index) => { if (state.totalWins >= stadium.wins) tier = index; });
    return tier;
  }
  function startMatch() {
    if (state.round >= DESTINATIONS.length || busy) return;
    if (state.match && state.match.status === 'playing') return;
    if (state.match && state.match.status === 'won') return;
    state.match = { shots: [], lean: choice(), rivalGoals: DESTINATIONS[state.round].rivalGoals, status: 'playing' };
    feedback = 'Kick-off! The goalkeeper leans ' + state.match.lean + '. Shoot somewhere else!';
    save(); render();
  }
  function shoot(side) {
    const m = state.match;
    if (!m || m.status !== 'playing' || busy || !DIRECTIONS.includes(side) || m.shots.length >= 5) return;
    busy = true;
    const goal = side !== m.lean;
    const lean = m.lean;
    m.shots.push({ side, lean, goal });
    // Save the result immediately to survive reloads or an interrupted animation.
    if (m.shots.length === 5) {
      m.status = m.shots.filter(shot => shot.goal).length > m.rivalGoals ? 'won' : 'lost';
      if (m.status === 'won') {
        state.totalWins += 1;
        const stamp = matchId();
        if (!state.stamps.includes(stamp)) state.stamps.push(stamp);
        if (state.round === DESTINATIONS.length - 1) state.crowns++;
      }
    } else {
      m.lean = nextLean(m.lean);
    }
    save();
    if (goal) {
      window.JozefWorld?.record('goal');
      feedback = 'GOOOAL! You spotted the open space! ⚽';
    } else {
      feedback = 'Nice try! The keeper saved that one. Try a different corner!';
    }
    if (m.status === 'won') {
      awardCompletedMatch();
      feedback = 'WIN! Jozef FC defeats ' + DESTINATIONS[state.round].club + '! A new stamp for your passport!';
    } else if (m.status === 'lost') {
      feedback = 'What a close match! You can try this team again, as often as you want.';
    }
    const ball = byId('tour-ball');
    if (ball) {
      ball.classList.remove('tour-kick');
      void ball.offsetWidth;
      ball.classList.add('tour-kick');
      ball.style.setProperty('--shot-x', side === 'left' ? '-115px' : side === 'right' ? '115px' : '0px');
    }
    render();
    window.setTimeout(() => {
      busy = false;
      if (ball) ball.classList.remove('tour-kick');
      render();
    }, 550);
  }
  function nextMatch() {
    if (busy) return;
    if (state.round === DESTINATIONS.length) {
      if (state.season >= 99999) {
        feedback = 'Fantastic! You have played so many tours. Keep enjoying your world championship!';
        render();
        return;
      }
      state.season++;
      state.round = 0;
      state.match = null;
      feedback = 'A brand-new World Tour awaits! Your stadium and badges are still yours.';
    } else if (state.match && state.match.status === 'won') {
      state.round++;
      state.match = null;
      feedback = 'New country unlocked. Ready to kick off?';
    } else if (state.match && state.match.status === 'lost') {
      state.match = null;
      feedback = 'New chance, fresh start. Read the keeper’s lean and aim away!';
    } else return;
    save(); render();
  }
  function answerCapital(value) {
    const m = state.match;
    if (!m || m.status !== 'won') return;
    const id = matchId();
    if (state.correct.includes(id)) return;
    const place = DESTINATIONS[state.round];
    if (value === place.capital) {
      state.correct.push(id);
      feedback = 'Correct! ' + place.capital + ' is the capital of ' + place.country + '. Bonus XP unlocked!';
      save(); reward('geography', id);
    } else {
      feedback = 'Good try! Look for the capital of ' + place.country + '. You can try again!';
    }
    render();
  }
  function renderStops() {
    const host = byId('tour-stops');
    if (!host) return;
    host.replaceChildren();
    DESTINATIONS.forEach((d, i) => {
      const completed = i < state.round || (i === state.round && state.match?.status === 'won');
      const active = i === state.round;
      const item = document.createElement('div');
      item.className = 'tour-stop' + (completed ? ' is-done' : active ? ' is-now' : '');
      const flag = document.createElement('span'); flag.className = 'tour-stop-flag'; flag.textContent = completed || active ? d.flag : '🔒';
      const details = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = completed || active ? d.country : 'Destination ' + (i + 1);
      const subtitle = document.createElement('small'); subtitle.textContent = completed ? '✓ Stamp earned' : active ? 'Next challenge' : 'Unlock by winning';
      details.append(title, subtitle);
      item.append(flag, details);
      host.appendChild(item);
    });
  }
  function renderStadiums() {
    const tier = stadiumTier();
    const current = STADIUMS[tier];
    text('tour-stadium-name', current.symbol + ' ' + current.name);
    text('tour-stadium-note', current.note);
    text('tour-totalwins', state.totalWins);
    text('tour-crowns', state.crowns);
    const host = byId('tour-stadium-list');
    const stage = byId('tour-stage');
    if (stage) stage.dataset.tier = String(tier);
    if (!host) return;
    host.replaceChildren();
    STADIUMS.forEach((stadium, i) => {
      const unlocked = state.totalWins >= stadium.wins;
      const tile = document.createElement('div');
      tile.className = 'tour-stadium-tile' + (unlocked ? ' is-unlocked' : '');
      const symbol = document.createElement('span'); symbol.textContent = unlocked ? stadium.symbol : '🔒';
      const label = document.createElement('strong'); label.textContent = stadium.name;
      const note = document.createElement('small');
      note.textContent = unlocked ? (i === tier ? 'Current stadium' : 'Unlocked') : 'Unlock at ' + stadium.wins + ' wins';
      tile.append(symbol, label, note); host.appendChild(tile);
    });
  }
  function renderShots() {
    const host = byId('tour-shots');
    if (!host) return;
    host.replaceChildren();
    for (let i = 0; i < 5; i++) {
      const shot = state.match?.shots[i];
      const dot = document.createElement('span');
      dot.className = 'tour-shot' + (shot ? shot.goal ? ' scored' : ' saved' : '');
      dot.textContent = shot ? shot.goal ? '⚽' : '✕' : '·';
      dot.setAttribute('aria-label', 'Shot ' + (i + 1) + ': ' + (shot ? shot.goal ? 'goal' : 'saved' : 'not taken'));
      host.appendChild(dot);
    }
  }
  function renderQuiz() {
    const place = DESTINATIONS[state.round];
    const completed = state.correct.includes(matchId());
    const quiz = byId('tour-quiz');
    if (!quiz || !place) return;
    quiz.hidden = !state.match || state.match.status !== 'won';
    if (quiz.hidden) return;
    text('tour-quiz-question', 'What is the capital of ' + place.country + '?');
    text('tour-quiz-fact', place.fact);
    text('tour-quiz-success', completed ? '✓ Geography star earned (+15 XP when eligible)!' : 'Pick the right answer for a bonus star.');
    const host = byId('tour-quiz-choices');
    host.replaceChildren();
    place.choices.forEach(capital => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tour-answer';
      button.textContent = capital;
      button.disabled = completed;
      if (completed && capital === place.capital) button.classList.add('correct');
      button.addEventListener('click', () => answerCapital(capital));
      host.appendChild(button);
    });
  }
  function render() {
    const final = state.round >= DESTINATIONS.length;
    setHidden('tour-match', final);
    setHidden('tour-finale', !final);
    text('tour-season', state.season);
    text('tour-round', Math.min(state.round + 1, DESTINATIONS.length));
    text('tour-current-wins', Math.min(state.round, DESTINATIONS.length) + '/5');
    renderStadiums(); renderStops();
    const mainAction = byId('tour-action');
    if (final) {
      text('tour-finale-title', 'World Tour Champion!');
      text('tour-finale-description', 'You travelled to five countries, beat five teams and lifted the cup. You earned it!');
      if (mainAction) { mainAction.textContent = 'Start another World Tour →'; mainAction.hidden = false; }
      setHidden('tour-quiz', true);
      return;
    }
    const d = DESTINATIONS[state.round];
    text('tour-country-flag', d.flag);
    text('tour-destination', d.country);
    text('tour-opponent', d.club);
    text('tour-city', d.city);
    text('tour-rival', d.rivalGoals);
    text('tour-goals', state.match ? state.match.shots.filter(s => s.goal).length : 0);
    text('tour-keeper', state.match?.lean ? state.match.lean.toUpperCase() : 'WAITING');
    const glove = byId('tour-keeper-glove');
    if (glove) {
      const lean = state.match?.lean;
      glove.style.transform = lean === 'left' ? 'translateX(-68px) rotate(-18deg)' :
        lean === 'right' ? 'translateX(68px) rotate(18deg)' : 'translateX(0)';
    }
    text('tour-shots-left', state.match ? 5 - state.match.shots.length : 5);
    text('tour-commentary', feedback);
    const controls = byId('tour-controls');
    if (controls) controls.hidden = !state.match || state.match.status !== 'playing';
    document.querySelectorAll('[data-tour-shoot]').forEach(button => {
      button.disabled = busy || !state.match || state.match.status !== 'playing';
    });
    if (mainAction) {
      mainAction.hidden = Boolean(state.match && state.match.status === 'playing');
      mainAction.textContent = !state.match ? 'Kick off the match →' :
        state.match.status === 'won' ?
        (state.round === DESTINATIONS.length - 1 ? 'Lift the World Cup! 🏆' : 'Travel to the next country →') :
        'Rematch — try again ↻';
    }
    renderShots(); renderQuiz();
  }
  byId('tour-action')?.addEventListener('click', () => {
    if (state.round === DESTINATIONS.length || state.match) nextMatch();
    else startMatch();
  });
  document.querySelectorAll('[data-tour-shoot]').forEach(button => {
    button.addEventListener('click', () => shoot(button.dataset.tourShoot));
  });
  window.JozefTour = Object.freeze({
    getProgress: () => ({ season: state.season, round: state.round, wins: state.totalWins, cups: state.crowns, stadium: STADIUMS[stadiumTier()].name })
  });
  // Recover earned XP exactly once after a reload of a completed match.
  awardCompletedMatch();
  render();
})();
