/* Sports room. Call the game. No odds, no betting, no account. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-sports-v1';
  const LEAGUES = {
    soccer: {
      label: 'Soccer',
      urls: [
        'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
        'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
        'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard'
      ],
      teams: ['Arsenal', 'Liverpool', 'Man City', 'Chelsea', 'Barcelona', 'Real Madrid', 'Inter Miami']
    },
    nba: {
      label: 'NBA',
      urls: ['https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'],
      teams: ['Raptors', 'Lakers', 'Celtics', 'Warriors', 'Heat']
    },
    nfl: {
      label: 'NFL',
      urls: ['https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'],
      teams: ['Bills', 'Chiefs', '49ers', 'Eagles', 'Cowboys']
    },
    nhl: {
      label: 'NHL / Hockey',
      urls: ['https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard'],
      teams: ['Ottawa Senators', 'Toronto Maple Leafs', 'Montreal Canadiens', 'Edmonton Oilers', 'Vancouver Canucks']
    },
    mlb: {
      label: 'MLB / Baseball',
      urls: ['https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard'],
      teams: ['Toronto Blue Jays', 'New York Yankees', 'Los Angeles Dodgers', 'New York Mets', 'Boston Red Sox']
    }
  };

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      return data && typeof data === 'object' ? data : {};
    } catch (err) { return {}; }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (err) { /* this visit only */ }
  }

  function readGame(data, team) {
    const events = data.events || [];
    const found = events.find(event => (event.name || '').toLowerCase().includes(team.toLowerCase()));
    if (!found) return null;
    const game = (found.competitions || [])[0] || {};
    const teams = game.competitors || [];
    const home = teams.find(item => item.homeAway === 'home') || teams[0] || {};
    const away = teams.find(item => item.homeAway === 'away') || teams[1] || {};
    return {
      id: found.id,
      home: (home.team && home.team.shortDisplayName) || 'Home',
      away: (away.team && away.team.shortDisplayName) || 'Away',
      homeScore: home.score != null ? home.score : '-',
      awayScore: away.score != null ? away.score : '-',
      state: (game.status && game.status.type && game.status.type.state) || 'pre',
      detail: (game.status && game.status.type && game.status.type.shortDetail) || ''
    };
  }

  function paint() {
    const root = document.getElementById('sports-board');
    if (!root) return;
    const saved = load();
    root.replaceChildren();
    Object.keys(LEAGUES).forEach(id => {
      const league = LEAGUES[id];
      const card = document.createElement('article');
      card.className = 'sports-card';
      const title = document.createElement('h3');
      title.textContent = league.label;
      const select = document.createElement('select');
      select.setAttribute('aria-label', league.label + ' team');
      league.teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        if (saved[id] && saved[id].team === team) option.selected = true;
        select.appendChild(option);
      });
      if (!saved[id]) select.value = league.teams[0];
      const game = document.createElement('p');
      game.className = 'sports-game';
      game.textContent = 'Loading the next game...';
      const calls = document.createElement('div');
      calls.className = 'sports-calls';
      (['nba','nhl','mlb'].includes(id)?['Home','Away']:['Home','Draw','Away']).forEach(call => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = call;
        button.addEventListener('click', () => {
          const data = load();
          data[id] = data[id] || { team: select.value };
          data[id].call = call;
          save(data);
          paint();
        });
        calls.appendChild(button);
      });
      select.addEventListener('change', () => {
        const data = load();
        data[id] = { team: select.value, call: data[id] && data[id].call };
        save(data);
        paint();
      });
      card.append(title, select, game, calls);
      root.appendChild(card);
      const team = select.value;
      Promise.any(league.urls.map(url => fetch(url).then(res => res.json()).then(data => {
        const match = readGame(data, team);
        if (!match) throw new Error('none');
        return match;
      }))).then(match => {
        const picked = load()[id] && load()[id].call;
        if (!match) {
          game.textContent = 'No ' + team + ' game on the board right now.';
          return;
        }
        game.textContent = match.away + ' ' + match.awayScore + ' - ' + match.homeScore + ' ' + match.home + ' · ' + (match.detail || match.state);
        if (picked) game.textContent += ' · You called ' + picked;
      }).catch(() => {
        game.textContent = 'No ' + team + ' game on the board right now.';
      });
    });
  }

  function boot() {
    if (!document.getElementById('sports-board')) return;
    paint();
    document.getElementById('sports-refresh')?.addEventListener('click', paint);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
