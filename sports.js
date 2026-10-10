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
      teams: ['Inter Miami', 'Arsenal', 'Liverpool', 'Man City', 'Chelsea', 'Barcelona', 'Real Madrid']
    },
    nba: {
      label: 'NBA',
      urls: ['https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'],
      teams: ['Raptors','Lakers','Celtics','Warriors','Heat','Bucks','Knicks','Nets','76ers','Cavaliers','Bulls','Pistons','Pacers','Hawks','Hornets','Magic','Wizards','Nuggets','Timberwolves','Thunder','Trail Blazers','Jazz','Suns','Kings','Clippers','Mavericks','Rockets','Spurs','Grizzlies','Pelicans']
    },
    nfl: {
      label: 'NFL',
      urls: ['https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'],
      teams: ['Bills', 'Chiefs', '49ers', 'Eagles', 'Cowboys']
    },
    nhl: {
      label: 'NHL / Hockey',
      urls: ['https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard'],
      teams: ['Ottawa Senators','Toronto Maple Leafs','Montreal Canadiens','Edmonton Oilers','Vancouver Canucks','Calgary Flames','Winnipeg Jets','Boston Bruins','Buffalo Sabres','Detroit Red Wings','Florida Panthers','Tampa Bay Lightning','New York Rangers','New York Islanders','New Jersey Devils','Philadelphia Flyers','Pittsburgh Penguins','Washington Capitals','Carolina Hurricanes','Columbus Blue Jackets','Chicago Blackhawks','St. Louis Blues','Nashville Predators','Dallas Stars','Colorado Avalanche','Minnesota Wild','Utah Mammoth','Vegas Golden Knights','Los Angeles Kings','Anaheim Ducks','San Jose Sharks','Seattle Kraken']
    },
    mlb: {
      label: 'MLB / Baseball',
      urls: ['https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard'],
      teams: ['Toronto Blue Jays','New York Yankees','Los Angeles Dodgers','New York Mets','Boston Red Sox','Baltimore Orioles','Tampa Bay Rays','Cleveland Guardians','Detroit Tigers','Chicago White Sox','Kansas City Royals','Minnesota Twins','Houston Astros','Los Angeles Angels','Athletics','Seattle Mariners','Texas Rangers','Atlanta Braves','Philadelphia Phillies','Miami Marlins','Washington Nationals','Chicago Cubs','Cincinnati Reds','Milwaukee Brewers','Pittsburgh Pirates','St. Louis Cardinals','Arizona Diamondbacks','Colorado Rockies','San Francisco Giants','San Diego Padres']
    }
  };


  const FACTS = {
    'Inter Miami': 'Miami. MLS. The club Messi joined.',
    'Arsenal': 'London. Premier League. A passing team in red and white.',
    'Liverpool': 'Liverpool. Premier League. The song is You\'ll Never Walk Alone.',
    'Man City': 'Manchester. Premier League. Sky blue.',
    'Chelsea': 'London. Premier League. The Blues.',
    'Barcelona': 'Barcelona. La Liga. Famous for its academy.',
    'Real Madrid': 'Madrid. La Liga. White shirts, big European nights.',
    'Raptors': 'Toronto. Canada\'s NBA team.',
    'Lakers': 'Los Angeles. Purple and gold.',
    'Celtics': 'Boston. Green, and one of the oldest NBA clubs.',
    'Warriors': 'San Francisco. Known for the three-point shot.',
    'Heat': 'Miami. Red and yellow.',
    'Bills': 'Buffalo. The closest NFL team to Ottawa.',
    'Chiefs': 'Kansas City. Red and yellow, Arrowhead Stadium.',
    '49ers': 'San Francisco. Red and gold.',
    'Eagles': 'Philadelphia. Midnight green.',
    'Cowboys': 'Dallas. The star on the helmet.',
    'Ottawa Senators': 'Ottawa. His city\'s NHL team.',
    'Toronto Maple Leafs': 'Toronto. Blue and white.',
    'Montreal Canadiens': 'Montreal. The Habs. Red, white, and blue.',
    'Edmonton Oilers': 'Edmonton. Orange and blue.',
    'Vancouver Canucks': 'Vancouver. Blue and green.',
    'Toronto Blue Jays': 'Toronto. Canada\'s MLB team.',
    'New York Yankees': 'New York. Navy pinstripes.',
    'Los Angeles Dodgers': 'Los Angeles. Blue script.',
    'New York Mets': 'New York. Orange and blue.',
    'Boston Red Sox': 'Boston. Red socks, Fenway Park.',
    'Bucks': 'Milwaukee. Green and cream.',
    'Knicks': 'New York. Orange and blue, Madison Square Garden.',
    'Nets': 'Brooklyn. Black and white.',
    '76ers': 'Philadelphia. Red, white, and blue.',
    'Cavaliers': 'Cleveland. Wine and gold.',
    'Bulls': 'Chicago. Red and black.',
    'Pistons': 'Detroit. Red, white, and blue.',
    'Pacers': 'Indiana. Navy and gold.',
    'Hawks': 'Atlanta. Red and yellow.',
    'Hornets': 'Charlotte. Teal and purple.',
    'Magic': 'Orlando. Blue and black.',
    'Wizards': 'Washington. Navy, red, and white.',
    'Nuggets': 'Denver. Navy and gold, altitude.',
    'Timberwolves': 'Minnesota. Blue and green.',
    'Thunder': 'Oklahoma City. Blue and orange.',
    'Trail Blazers': 'Portland. Red and black.',
    'Jazz': 'Utah. Purple and yellow.',
    'Suns': 'Phoenix. Orange and purple.',
    'Kings': 'Sacramento. Purple and silver.',
    'Clippers': 'Los Angeles. Red, blue, and white.',
    'Mavericks': 'Dallas. Blue and silver.',
    'Rockets': 'Houston. Red.',
    'Spurs': 'San Antonio. Silver and black.',
    'Grizzlies': 'Memphis. Navy and gold.',
    'Pelicans': 'New Orleans. Navy and gold.',
    'Calgary Flames': 'Calgary. Red and yellow.',
    'Winnipeg Jets': 'Winnipeg. Navy and light blue.',
    'Boston Bruins': 'Boston. Black and gold.',
    'Buffalo Sabres': 'Buffalo. Blue and gold.',
    'Detroit Red Wings': 'Detroit. The Winged Wheel.',
    'Florida Panthers': 'Sunrise, Florida. Red and gold.',
    'Tampa Bay Lightning': 'Tampa Bay. Blue and white.',
    'New York Rangers': 'New York. Blue, red, and white.',
    'New York Islanders': 'Long Island. Orange and blue.',
    'New Jersey Devils': 'New Jersey. Red and black.',
    'Philadelphia Flyers': 'Philadelphia. Orange and black.',
    'Pittsburgh Penguins': 'Pittsburgh. Black and gold.',
    'Washington Capitals': 'Washington. Red, white, and blue.',
    'Carolina Hurricanes': 'Raleigh. Red and black.',
    'Columbus Blue Jackets': 'Columbus. Navy and red.',
    'Chicago Blackhawks': 'Chicago. Red and black.',
    'St. Louis Blues': 'St. Louis. Blue and yellow.',
    'Nashville Predators': 'Nashville. Gold and navy.',
    'Dallas Stars': 'Dallas. Green and black.',
    'Colorado Avalanche': 'Denver. Burgundy and blue.',
    'Minnesota Wild': 'St. Paul. Green and red.',
    'Utah Mammoth': 'Utah. The newest NHL club.',
    'Vegas Golden Knights': 'Las Vegas. Gold and steel.',
    'Los Angeles Kings': 'Los Angeles. Black and silver.',
    'Anaheim Ducks': 'Anaheim. Orange and black.',
    'San Jose Sharks': 'San Jose. Teal and black.',
    'Seattle Kraken': 'Seattle. Deep blue and red.',
    'Baltimore Orioles': 'Baltimore. Orange and black.',
    'Tampa Bay Rays': 'St. Petersburg. Navy and light blue.',
    'Cleveland Guardians': 'Cleveland. Navy and red.',
    'Detroit Tigers': 'Detroit. Navy and orange.',
    'Chicago White Sox': 'Chicago. Black and silver.',
    'Kansas City Royals': 'Kansas City. Royal blue.',
    'Minnesota Twins': 'Minneapolis. Navy and red.',
    'Houston Astros': 'Houston. Orange and navy.',
    'Los Angeles Angels': 'Anaheim. Red.',
    'Athletics': 'West Sacramento. Green and gold.',
    'Seattle Mariners': 'Seattle. Navy and teal.',
    'Texas Rangers': 'Arlington. Blue and red.',
    'Atlanta Braves': 'Atlanta. Navy and red.',
    'Philadelphia Phillies': 'Philadelphia. Red.',
    'Miami Marlins': 'Miami. Black and teal.',
    'Washington Nationals': 'Washington. Red, white, and blue.',
    'Chicago Cubs': 'Chicago. Blue, Wrigley Field.',
    'Cincinnati Reds': 'Cincinnati. Red.',
    'Milwaukee Brewers': 'Milwaukee. Navy and gold.',
    'Pittsburgh Pirates': 'Pittsburgh. Black and gold.',
    'St. Louis Cardinals': 'St. Louis. Red.',
    'Arizona Diamondbacks': 'Phoenix. Sedona red and black.',
    'Colorado Rockies': 'Denver. Purple and black.',
    'San Francisco Giants': 'San Francisco. Orange and black.',
    'San Diego Padres': 'San Diego. Brown and gold.'

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
      if (!saved[id]) {
        select.value = league.teams[0];
        const data = load();
        data[id] = { team: league.teams[0] };
        save(data);
      }
      const fact = document.createElement('p');
      fact.className = 'team-fact';
      fact.textContent = FACTS[select.value] || league.label;
      select.addEventListener('change', () => { fact.textContent = FACTS[select.value] || league.label; });
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
          data.calls = Array.isArray(data.calls) ? data.calls : [];
          data.calls.unshift(select.value + ': ' + call);
          data.calls = data.calls.slice(0, 6);
          save(data);
          paint();
          if (window.localStorage) {
            try {
              const album = JSON.parse(localStorage.getItem('jozefs-world-album-v1') || '{}');
              if (!album.caller) {
                album.caller = Date.now();
                localStorage.setItem('jozefs-world-album-v1', JSON.stringify(album));
              }
            } catch (err) { /* sticker can wait */ }
          }
        });
        calls.appendChild(button);
      });
      select.addEventListener('change', () => {
        const data = load();
        data[id] = { team: select.value, call: data[id] && data[id].call };
        save(data);
        paint();
      });
      card.append(title, select, fact, game, calls);
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
        const home = Number(match.homeScore);
        const away = Number(match.awayScore);
        let verdict = '';
        if (picked && match.state === 'post' && Number.isFinite(home) && Number.isFinite(away)) {
          const actual = home === away ? 'Draw' : home > away ? 'Home' : 'Away';
          verdict = actual === picked ? ' Called it.' : ' The game went ' + actual + '.';
        }
        game.textContent = match.away + ' ' + match.awayScore + ' - ' + match.homeScore + ' ' + match.home + ' · ' + (match.detail || match.state);
        if (picked) game.textContent += ' · You called ' + picked + verdict;
      }).catch(() => {
        game.textContent = 'No ' + team + ' game on the board right now.';
      });
    });
  }

  function directory() {
    const box = document.getElementById('team-directory');
    if (!box) return;
    box.replaceChildren();
    Object.keys(LEAGUES).forEach(id => {
      LEAGUES[id].teams.forEach(team => {
        const card = document.createElement('article');
        const name = document.createElement('strong');
        name.textContent = team;
        const info = document.createElement('p');
        info.textContent = FACTS[team] || LEAGUES[id].label;
        card.append(name, info);
        box.appendChild(card);
      });
    });
  }
  function boot() {
    if (!document.getElementById('sports-board')) return;
    paint();
    directory();
    const log = document.getElementById('sports-log');
    if (log) {
      const calls = load().calls || [];
      log.textContent = calls.length ? 'Your calls: ' + calls.join(' · ') : 'Your calls stay on this device.';
    }
    document.getElementById('sports-refresh')?.addEventListener('click', paint);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
