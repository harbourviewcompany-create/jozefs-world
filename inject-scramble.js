/* Inject Word Scramble + Positions into Jozef's World without replacing index.html */
(function () {
  'use strict';

  function onceReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onceReady(function () {
    // Game tab
    var selector = document.querySelector('.game-selector');
    if (selector && !selector.querySelector('[data-game="scramble"]')) {
      var tab = document.createElement('button');
      tab.className = 'game-tab';
      tab.dataset.game = 'scramble';
      tab.textContent = 'Word Scramble';
      selector.appendChild(tab);
      tab.addEventListener('click', function () {
        document.querySelectorAll('.game-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.game-panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var panel = document.getElementById('scramble-game');
        if (panel) panel.classList.add('active');
      });
    }

    // Game panel
    if (!document.getElementById('scramble-game')) {
      var gamesSection = document.getElementById('games');
      if (gamesSection) {
        var panel = document.createElement('div');
        panel.id = 'scramble-game';
        panel.className = 'game-panel';
        panel.innerHTML = [
          '<h3>🔤 Soccer Word Scramble</h3>',
          '<p>Unscramble the soccer word! Type your answer and press Check.</p>',
          '<div class="score-board">',
          '<span>Solved: <strong id="scramble-solved">0</strong></span>',
          '<span>Streak: <strong id="scramble-streak">0</strong></span>',
          '</div>',
          '<div class="scramble-box">',
          '<div class="scramble-word" id="scramble-word">????</div>',
          '<p class="scramble-hint" id="scramble-hint">Hint will appear here</p>',
          '<input type="text" id="scramble-input" class="scramble-input" placeholder="Type the word..." autocomplete="off" maxlength="20" />',
          '<div class="scramble-actions">',
          '<button class="action-btn" id="scramble-check">Check</button>',
          '<button class="action-btn secondary-btn" id="scramble-skip">Skip</button>',
          '<button class="action-btn secondary-btn" id="scramble-new">New Word</button>',
          '</div>',
          '<p class="jw-shot-feedback" id="scramble-feedback" aria-live="polite"></p>',
          '</div>',
          '<p class="game-tip">Tip: Think about soccer words you already know!</p>'
        ].join('');
        gamesSection.appendChild(panel);
      }
    }

    // Learn tab
    var learnTabs = document.querySelector('.learn-tabs');
    if (learnTabs && !learnTabs.querySelector('[data-learn="positions"]')) {
      var ltab = document.createElement('button');
      ltab.className = 'learn-tab';
      ltab.dataset.learn = 'positions';
      ltab.textContent = 'Positions';
      learnTabs.appendChild(ltab);
      ltab.addEventListener('click', function () {
        document.querySelectorAll('.learn-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.learn-panel').forEach(function (p) { p.classList.remove('active'); });
        ltab.classList.add('active');
        var lp = document.getElementById('learn-positions');
        if (lp) lp.classList.add('active');
      });
    }

    // Positions panel
    if (!document.getElementById('learn-positions')) {
      var learnContent = document.querySelector('.learn-content');
      if (learnContent) {
        var pos = document.createElement('div');
        pos.id = 'learn-positions';
        pos.className = 'learn-panel';
        pos.innerHTML = [
          '<h3>📍 Positions on the Field</h3>',
          '<p>Every player has a special job. Click a position to learn what they do!</p>',
          '<div class="pitch-diagram"><div class="pitch-field">',
          '<button type="button" class="pitch-pos" data-pos="gk" style="left:50%;top:88%">GK</button>',
          '<button type="button" class="pitch-pos" data-pos="cb" style="left:35%;top:70%">CB</button>',
          '<button type="button" class="pitch-pos" data-pos="cb2" style="left:65%;top:70%">CB</button>',
          '<button type="button" class="pitch-pos" data-pos="lb" style="left:12%;top:62%">LB</button>',
          '<button type="button" class="pitch-pos" data-pos="rb" style="left:88%;top:62%">RB</button>',
          '<button type="button" class="pitch-pos" data-pos="cm" style="left:50%;top:45%">CM</button>',
          '<button type="button" class="pitch-pos" data-pos="lm" style="left:18%;top:40%">LM</button>',
          '<button type="button" class="pitch-pos" data-pos="rm" style="left:82%;top:40%">RM</button>',
          '<button type="button" class="pitch-pos" data-pos="st" style="left:50%;top:18%">ST</button>',
          '<button type="button" class="pitch-pos" data-pos="lw" style="left:22%;top:22%">LW</button>',
          '<button type="button" class="pitch-pos" data-pos="rw" style="left:78%;top:22%">RW</button>',
          '</div></div>',
          '<div class="position-info" id="position-info">',
          '<h4>👆 Tap any position on the pitch</h4>',
          '<p>Learn what each player does during a match.</p>',
          '</div>'
        ].join('');
        learnContent.appendChild(pos);
      }
    }

    // Update home card text if present
    document.querySelectorAll('.card p').forEach(function (p) {
      if (p.textContent.indexOf('6 fun soccer') !== -1) p.textContent = '7 fun soccer games to play!';
    });
    document.querySelectorAll('.section-desc').forEach(function (p) {
      if (p.textContent.indexOf('6 games') !== -1) p.textContent = 'Choose a game and have a blast! 7 games ready to play.';
    });

    // Load game logic after DOM nodes exist
    var s = document.createElement('script');
    s.src = 'scramble-positions.js';
    document.body.appendChild(s);
  });
})();
