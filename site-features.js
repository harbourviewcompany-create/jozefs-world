/* Generated browser scripts. Preserve order; do not edit directly. */

/* BEGIN stadium.js */
/* JOZEF FC // AFTER DARK: immersive navigation and player HUD, no account or tracking. */
(() => {
'use strict';
const ids=['home','street','arena','games','career','tour','club','playbook','matchday','training','learn','news','notes','album','sports','watch','sports-arcade','chronicle','fun'];
const el=id=>document.getElementById(id);
const txt=(id,x)=>{const n=el(id);if(n)n.textContent=String(x)};
const get=key=>{try{return localStorage.getItem(key)}catch(_){return null}};
let skipHistory=false;
function valid(id){return ids.includes(id)&&Boolean(el(id))}
function updateHud(){
 const career=window.JozefCareer?.getProgress?.()||{};
 const tour=window.JozefTour?.getProgress?.()||{};
 const street=window.JozefStreet?.getProgress?.()||{};
 txt('studio-career-points',String(career.points||0).padStart(2,'0'));
 txt('studio-career-stage','SEASON '+String(career.season||1).padStart(2,'0'));
 txt('studio-tour-stops',String(tour.round||0).padStart(2,'0')+' / 05');
 txt('studio-tour-stage',tour.cups>0?'CHAMPION · '+tour.cups+' CUPS':'STAMP YOUR PASSPORT');
 txt('studio-street-best',String(street.best??get('jozefs-world-street-best-v1')??0).padStart(3,'0'));
}
function updateFixture(){
 let m;
 try{m=JSON.parse(get('jozefs-world-matchday-v1')||'null')}catch(_){}
 if(!m?.date||!m?.time){txt('studio-fixture-head','NEXT KICKOFF?');txt('studio-fixture-copy','Plan your next match, build a formation, and check your kit.');return;}
 const d=new Date(m.date+'T'+m.time);
 if(!Number.isFinite(d.getTime())||d.getTime()<Date.now()){txt('studio-fixture-head','READY FOR THE NEXT?');txt('studio-fixture-copy','Set the next kickoff in Matchday Central.');return;}
 txt('studio-fixture-head',d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}).toUpperCase());
 txt('studio-fixture-copy','Jozef FC vs '+String(m.opponent||'Rivals').slice(0,35)+' · '+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+'. Pack your gear!');
}
function navState(){
 const current=document.querySelector('.section.active')?.id||'home';
 document.querySelectorAll('.nav-btn').forEach(btn=>{
  if(btn.dataset.section===current)btn.setAttribute('aria-current','page');
  else btn.removeAttribute('aria-current');
 });
 document.title=current==='home'?'Jozef FC // After Dark':(current==='street'?'Street//11':current[0].toUpperCase()+current.slice(1))+' | Jozef FC';
 // Keep the phone dock in sync with regular navigation, deep links and Back.
 document.querySelectorAll('[data-dock-section]').forEach(button=>{
  const active=button.dataset.dockSection===current;
  button.classList.toggle('is-active',active);
  if(active)button.setAttribute('aria-current','page');
  else button.removeAttribute('aria-current');
 });
 const explore=el('jw-explore');
 if(explore){
  const visible=['home','arena','sports-arcade','playbook','club'].includes(current);
  explore.classList.toggle('is-active',!visible);
  explore.setAttribute('aria-label',visible?'Explore all games and sections':'Explore all games and sections, currently '+current);
 }
}
function navigation(){
 const prev=window.showSection;
 if(typeof prev!=='function')return;
 window.showSection=function(id){
  if(!valid(id))return;
  const act=()=>prev(id);
  if(document.startViewTransition&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   try{document.startViewTransition(act);}catch(_){act();}
  }else act();
  if(!skipHistory&&location.hash!=='#'+id){
   try{history.pushState(null,'','#'+id)}catch(_){}
  }
  navState();updateHud();
 };
 const goBack=()=>{
  const id=location.hash.slice(1);
  if(!valid(id))return;
  skipHistory=true;window.showSection(id);skipHistory=false;
 };
 window.addEventListener('popstate',goBack);
 window.addEventListener('hashchange',goBack);
 if(valid(location.hash.slice(1)))goBack();
 navState();
}
function commandDeck(){
 if(el('studio-launcher'))return;
 const button=document.createElement('button');button.id='studio-launcher';button.type='button';button.className='studio-launcher';
 button.setAttribute('aria-label','Open Jozef FC quick navigation');
 button.innerHTML='<strong>J<span>/11</span></strong><small>QUICK JUMP</small>';
 const dialog=document.createElement('dialog');dialog.id='studio-command';dialog.className='studio-command';
 dialog.setAttribute('aria-label','Jozef FC control room');
 const header=document.createElement('div');header.className='studio-command-header';
 header.innerHTML='<div><span class="studio-kicker">THE CONTROL ROOM</span><h2>WHERE TO, <em>CAPTAIN?</em></h2></div><button type="button" class="studio-command-close" aria-label="Close quick navigation">✕</button>';
 const links=document.createElement('div');links.className='studio-command-options';
 // One complete menu, keeping the primary navigation compact on small screens.
 const options=[
  ['home','00','CLUB HQ','BACK TO YOUR WORLD'],
  ['arena','01','FOOTBALL ARENA','LIVE FOOTBALL MATCH'],
  ['street','02','STREET//11','THE NIGHT RUN'],
  ['sports-arcade','03','SPORTS ARCADE','HOCKEY · BASEBALL · BASKETBALL · WRESTLING'],
  ['playbook','04','COACH PLAYBOOK','MISSIONS ACROSS EVERY SPORT'],
  ['club','05','MY CLUB','SQUAD · KITS · TROPHIES'],
  ['career','06','FOOTBALL CAREER','BUILD YOUR SEASONS'],
  ['tour','07','WORLD TOUR','CHASE THE CUP'],
  ['chronicle','08','CLUB CHRONICLE','MATCH HIGHLIGHTS · PRINT POSTER'],
  ['games','09','FOOTBALL SKILLS','MINIGAMES · TARGETS'],
  ['training','10','TRAINING','PRACTICE YOUR SKILLS'],
  ['matchday','11','MATCHDAY','YOUR REAL-LIFE FIXTURE'],
  ['sports','12','LIVE SPORTS','NHL · MLB · NBA'],
  ['watch','12A','WATCH','CLUB VIDEO AND HIGHLIGHTS'],
  ['news','13','FOOTBALL SCORES','SCOREBOARD'],
  ['learn','14','LEARN','FOOTBALL INTELLIGENCE'],
  ['album','15','STICKER ALBUM','COLLECT YOUR REWARDS'],
  ['fun','16','LOCKER ROOM','MATCHDAY EXTRAS'],
  ['notes','17','CLUB NOTES','SHARED PRIVATE BOARD']
 ];
 const open=()=>dialog.showModal?dialog.showModal():dialog.setAttribute('open','');
 const close=()=>{if(dialog.close)dialog.close();else dialog.removeAttribute('open');button.focus()};
 for(const [id,num,name,desc] of options){
  const item=document.createElement('button');item.type='button';item.className='studio-command-option';
  const index=document.createElement('span');index.className='studio-command-num';index.textContent=num;
  const label=document.createElement('span');label.className='studio-command-name';label.textContent=name;
  const detail=document.createElement('small');detail.textContent=desc;label.appendChild(detail);
  const arrow=document.createElement('span');arrow.className='studio-command-arrow';arrow.textContent='↗';
  item.append(index,label,arrow);item.addEventListener('click',()=>{close();window.showSection(id)});links.appendChild(item);
 }
 dialog.append(header,links);document.body.append(button,dialog);
 button.addEventListener('click',open);
 header.querySelector('button').addEventListener('click',close);
 dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
 document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();dialog.open?close():open()}
 });
}
function boot(){
 document.body.classList.add('studio-v2');
 navigation();commandDeck();
 el('jw-explore')?.addEventListener('click',()=>el('studio-launcher')?.click());
 updateHud();updateFixture();
 window.addEventListener('jozef:profile-updated',updateHud);
 window.addEventListener('jozef:progress',updateHud);
 document.addEventListener('click',e=>{
  if(e.target.closest('#md-save'))queueMicrotask(updateFixture);
  if(e.target.closest('.nav-btn'))queueMicrotask(navState);
  if(e.target.closest('#street-start'))window.setTimeout(updateHud,70);
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateHud();updateFixture()}});
 window.setInterval(()=>{updateHud();updateFixture()},60000);
 // Installable offline app. Cache only same-origin public HTML/CSS/JS, never player data.
 if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
 }
 // No forced tunnel, confusing onboarding prompts, or automatic sound.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
;

/* BEGIN playmode.js */
/* Full-screen play on a phone. Leaves the clubhouse chrome behind. */
(function () {
  'use strict';
  const PLAY = ['arena', 'street', 'games'];

  function paint(id) {
    const open = PLAY.includes(id) && window.matchMedia('(max-width: 800px)').matches;
    document.body.classList.toggle('play-open', open);
  }

  function wrap() {
    const prev = window.showSection;
    if (typeof prev !== 'function' || prev.__playWrapped) return;
    const next = function (id) {
      const result = prev(id);
      paint(id);
      return result;
    };
    next.__playWrapped = true;
    window.showSection = next;
  }

  // iPhone browser chrome changes the actual visible viewport while scrolling
  // or when an in-app browser expands its controls. Use visualViewport height
  // only for the active game, without resizing other site sections.
  let viewportHeight=0;
  function syncArenaViewport(){
    const arena=document.getElementById('arena');
    if(!arena)return;
    const visual=window.visualViewport;
    const next=Math.round(visual?.height||window.innerHeight||0);
    if(next>0&&next!==viewportHeight){
      viewportHeight=next;
      arena.style.setProperty('--arena-visual-height',next+'px');
    }
  }
  window.addEventListener('resize',syncArenaViewport,{passive:true});
  window.addEventListener('orientationchange',syncArenaViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',syncArenaViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',syncArenaViewport,{passive:true});

  function boot() {
    // Other site-wide UI updates may add stylesheets after Arena CSS.
    // Reattach its link last to keep the game's viewport sizing deterministic.
    const arenaSheet = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find(link => /(?:^|\/)(?:site-experience|arena-compact)\.css(?:\?|$)/.test(link.getAttribute('href') || ''));
    if (arenaSheet && arenaSheet.parentElement?.lastElementChild !== arenaSheet) {
      arenaSheet.parentElement.appendChild(arenaSheet);
    }
    wrap();
    syncArenaViewport();
    document.querySelectorAll('.play-exit').forEach(button => {
      button.addEventListener('click', () => {
        if (typeof window.showSection === 'function') window.showSection('home');
      });
    });
    const id = (location.hash || '#home').slice(1);
    paint(id);
    setTimeout(wrap, 400);
    ['arena','street','games'].forEach(name => {
      const node = document.getElementById(name);
      if (!node || !('MutationObserver' in window)) return;
      new MutationObserver(() => paint(node.classList.contains('active') ? name : (location.hash || '#home').slice(1))).observe(node, { attributes: true, attributeFilter: ['class'] });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
;

/* BEGIN broadcast.js */
/* Tunnel walkout and short commentary. Sound stays off until he asks. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-commentary';
  let lastCall = 'Jozef FC is ready.';
  let crowd;

  function enabled() {
    try { return localStorage.getItem(KEY) === 'on'; } catch (err) { return false; }
  }

  function number() {
    try {
      const player = JSON.parse(localStorage.getItem('jozefs-world-player-v1') || '{}');
      const value = Number(player.number);
      return value >= 1 && value <= 99 ? String(value) : '11';
    } catch (err) { return '11'; }
  }

  function speak(line) {
    lastCall = line;
    const button = document.getElementById('commentary-play');
    if (button) button.hidden = false;
    if (!enabled() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(line);
    voice.rate = 0.95;
    voice.pitch = 0.9;
    window.speechSynthesis.speak(voice);
  }

  function roar() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = crowd || new AudioCtx();
    crowd = ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.4, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.3);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 1.4);
  }

  function openWalkout() {
    const gate = document.getElementById('walkout');
    if (!gate) return;
    const shirt = document.getElementById('walkout-number');
    if (shirt) shirt.textContent = number();
    gate.hidden = false;
    gate.classList.add('is-open');
  }

  function closeWalkout() {
    const gate = document.getElementById('walkout');
    if (!gate) return;
    gate.hidden = true;
    gate.classList.remove('is-open');
  }

  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    const toggle = document.getElementById('commentary-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', enabled() ? 'true' : 'false');
      toggle.textContent = enabled() ? 'Commentary on' : 'Commentary off';
      toggle.addEventListener('click', () => {
        const next = enabled() ? 'off' : 'on';
        try { localStorage.setItem(KEY, next); } catch (err) { /* this visit only */ }
        toggle.setAttribute('aria-pressed', next === 'on' ? 'true' : 'false');
        toggle.textContent = next === 'on' ? 'Commentary on' : 'Commentary off';
      });
    }
    document.getElementById('commentary-play')?.addEventListener('click', () => speak(lastCall));
    document.getElementById('walkout-run')?.addEventListener('click', () => {
      roar();
      closeWalkout();
      const start = document.getElementById('arena-start');
      if (start && /KICK OFF|PLAY AGAIN/i.test(start.textContent || '')) start.click();
    });
    document.getElementById('walkout-skip')?.addEventListener('click', closeWalkout);

    const prev = window.showSection;
    if (typeof prev === 'function' && !prev.__walkout) {
      const next = function (id) {
        const result = prev(id);
        if (id === 'arena') openWalkout();
        return result;
      };
      next.__walkout = true;
      window.showSection = next;
    }

    const arenaStatus = document.getElementById('arena-status');
    if (arenaStatus && 'MutationObserver' in window) {
      new MutationObserver(() => {
        const text = arenaStatus.textContent || '';
        if (text.includes('GOOOOOAL')) speak('Jozef takes it, and he scores!');
      }).observe(arenaStatus, { childList: true, characterData: true, subtree: true });
    }
    const streetStatus = document.getElementById('street-announcement');
    if (streetStatus && 'MutationObserver' in window) {
      new MutationObserver(() => {
        const text = streetStatus.textContent || '';
        if (text.includes('Full-time')) speak(text.replace(/\+\d+ XP earned!/g, '').trim());
      }).observe(streetStatus, { childList: true, characterData: true, subtree: true });
    }
    setTimeout(() => { if (!window.showSection || window.showSection.__walkout) return; boot(); }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
;

/* BEGIN album.js */
/* Sticker album and a short scout report. Saved on this device only. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-album-v1';
  const STICKERS = [
    { id: 'debut', name: 'Arena debut', need: 'Finish a match' },
    { id: 'win', name: 'First win', need: 'Win in the Arena' },
    { id: 'brace', name: 'Brace', need: 'Score 2 in one match' },
    { id: 'hattrick', name: 'Hat-trick', need: 'Score 3 in one match' },
    { id: 'clean', name: 'Clean sheet', need: 'Win without conceding' },
    { id: 'street', name: 'Night run', need: 'Finish Street//11' },
    { id: 'street20', name: 'Neon 20', need: 'Score 20 on Street' },
    { id: 'street50', name: 'Street star', need: 'Score 50 on Street' },
    { id: 'street100', name: 'Century run', need: 'Score 100 on Street' },
    { id: 'five', name: 'Five matches', need: 'Finish 5 Arena matches' },
    { id: 'draw', name: 'Even game', need: 'Draw in the Arena' },
    { id: 'caller', name: 'Called it', need: 'Call a game in Sports Room' }
  ];

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      return data && typeof data === 'object' ? data : {};
    } catch (err) { return {}; }
  }

  function save(album) {
    try { localStorage.setItem(KEY, JSON.stringify(album)); } catch (err) { /* keep the screen copy */ }
  }

  function give(id) {
    const album = load();
    if (album[id]) return false;
    album[id] = Date.now();
    save(album);
    const toast = document.getElementById('jw-toast');
    const sticker = STICKERS.find(item => item.id === id);
    if (toast && sticker) toast.textContent = 'New sticker: ' + sticker.name;
    render();
    return true;
  }

  function render() {
    const board = document.getElementById('album-board');
    if (!board) return;
    const album = load();
    board.replaceChildren();
    STICKERS.forEach(sticker => {
      const card = document.createElement('article');
      card.className = 'sticker' + (album[sticker.id] ? ' earned' : '');
      const name = document.createElement('strong');
      name.textContent = album[sticker.id] ? sticker.name : '???';
      const need = document.createElement('small');
      need.textContent = sticker.need;
      card.append(name, need);
      board.appendChild(card);
    });
    const count = document.getElementById('album-count');
    if (count) count.textContent = Object.keys(album).length + ' / ' + STICKERS.length;
    const tale = document.getElementById('album-story');
    if (tale) {
      const earned = Object.keys(album).length;
      const page = earned === 0 ? 'Page 1 is empty. Finish a match or a Street run.' : earned < 4 ? 'Page 1: the first boots. ' + (4 - earned) + ' left on this page.' : earned < 8 ? 'Page 2: the street page. Keep running.' : 'Page 3: the season page. The hard stickers live here.';
      tale.textContent = page + ' ' + (earned === STICKERS.length ? 'The book is full.' : earned + ' of ' + STICKERS.length + ' found.');
    }
  }

  function scout(us, them) {
    const words = us > them ? ['Fast', 'Brave', 'Clinical'] : us === them ? ['Solid', 'Patient', 'Even'] : ['Brave', 'Learning', 'Hungry'];
    const story = us > them
      ? 'You found the goal and the rivals could not live with it.'
      : us === them
        ? 'Neither side blinked. One more shot wins it next time.'
        : 'They scored on the break. Next match, keep the ball in their half.';
    const next = us >= 3 ? 'Chase the hat-trick sticker again.' : them === 0 ? 'Protect the clean sheet.' : 'Score first.';
    const card = document.getElementById('scout-report');
    if (!card) return;
    card.hidden = false;
    const title = document.getElementById('scout-words');
    const tip = document.getElementById('scout-tip');
    const tale = document.getElementById('scout-story');
    const nxt = document.getElementById('scout-next');
    if (title) title.textContent = words.join('. ') + '.';
    if (tip) tip.textContent = them === 0 && us > 0 ? 'They did not score.' : us === 0 ? 'Next one, shoot earlier.' : 'Keep that run.';
    if (tale) tale.textContent = story;
    if (nxt) nxt.textContent = 'Next: ' + next;
    const rival = document.getElementById('arena-rival')?.textContent || 'The rivals';
    const line = us + '-' + them + ' against ' + rival + '. ' + story;
    try {
      const book = JSON.parse(localStorage.getItem('jozefs-world-diary-v1') || '[]');
      const pages = Array.isArray(book) ? book : [];
      pages.unshift(line);
      localStorage.setItem('jozefs-world-diary-v1', JSON.stringify(pages.slice(0, 5)));
    } catch (err) { /* diary can wait */ }
    paintDiary();
  }

  function paintDiary() {
    const diary = document.getElementById('season-diary');
    if (!diary) return;
    let pages = [];
    try { pages = JSON.parse(localStorage.getItem('jozefs-world-diary-v1') || '[]'); } catch (err) { pages = []; }
    diary.replaceChildren();
    if (!Array.isArray(pages) || !pages.length) {
      diary.textContent = 'No match written in the season book yet.';
      return;
    }
    pages.slice(0, 5).forEach(line => {
      const item = document.createElement('p');
      item.textContent = line;
      diary.appendChild(item);
    });
  }

  function boot() {
    paintDiary();
    window.addEventListener('jozef:arena-completed', () => {
      const score = (document.getElementById('arena-score')?.textContent || '0 : 0').split(':').map(part => Number(part) || 0);
      const us = score[0] || 0;
      const them = score[1] || 0;
      give('debut');
      if (us > them) give('win');
      if (us >= 2) give('brace');
      if (us >= 3) give('hattrick');
      if (us > them && them === 0) give('clean');
      if (us === them) give('draw');
      try {
        const life = JSON.parse(localStorage.getItem('jozefs-world-arena-v1') || '{}');
        if (Number(life.games) >= 5) give('five');
      } catch (err) { /* no extra sticker */ }
      scout(us, them);
    });
    const street = document.getElementById('street-announcement');
    if (street && 'MutationObserver' in window) {
      new MutationObserver(() => {
        const text = street.textContent || '';
        if (!text.includes('Full-time')) return;
        const score = Number((text.match(/(\d+) points/) || [])[1] || 0);
        give('street');
        if (score >= 20) give('street20');
        if (score >= 50) give('street50');
        if (score >= 100) give('street100');
        const story = document.getElementById('street-story');
        let best = 0;
        try { best = Number(localStorage.getItem('jozefs-world-street-best-v1') || 0); } catch (err) { best = 0; }
        const nights = ['Floodlight Friday', 'Saturday night', 'School-night run', 'Sunday lights'];
        const night = nights[new Date().getDay() % nights.length];
        let runs = 0;
        try {
          runs = Number(localStorage.getItem('jozefs-world-street-runs-v1') || 0) + 1;
          localStorage.setItem('jozefs-world-street-runs-v1', String(runs));
        } catch (err) { runs = 1; }
        if (story) story.textContent = night + '. Run ' + runs + '. ' + (score >= best && score > 0 ? 'New record. The street remembers this run.' : 'The record is ' + String(best).padStart(3, '0') + '. One more run.');
      }).observe(street, { childList: true, characterData: true, subtree: true });
    }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
;

/* BEGIN sports.js */
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
      const last = (saved.calls || []).find(line => line.startsWith(select.value));
      fact.textContent = (FACTS[select.value] || league.label) + (last ? ' Last call: ' + last + '.' : '');
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
;

/* BEGIN watch.js */
/* Parent-supplied video. Official hosts only. No scraped or pirate streams. */
(function () {
  'use strict';
  const KEY = 'jozefs-world-watch-v1';

  function load() {
    try { return localStorage.getItem(KEY) || ''; } catch (err) { return ''; }
  }

  function save(url) {
    try { localStorage.setItem(KEY, url); } catch (err) { /* this visit only */ }
  }

  function youtube(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0];
      if (parsed.hostname.endsWith('youtube.com')) {
        if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
        const parts = parsed.pathname.split('/');
        const live = parts.indexOf('live');
        const embed = parts.indexOf('embed');
        if (live >= 0) return parts[live + 1];
        if (embed >= 0) return parts[embed + 1];
      }
    } catch (err) { return ''; }
    return '';
  }

  function vimeo(url) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith('vimeo.com')) return '';
      return parsed.pathname.split('/').filter(Boolean)[0] || '';
    } catch (err) { return ''; }
  }

  function twitch(url) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith('twitch.tv')) return null;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'videos' && parts[1]) return { video: parts[1].replace(/^v/, '') };
      if (parts[0] && parts[0] !== 'directory') return { channel: parts[0] };
    } catch (err) { return null; }
    return null;
  }

  function parentHost() {
    return location.hostname || 'harbourviewcompany-create.github.io';
  }

  function paint(url) {
    const frame = document.getElementById('watch-frame');
    const status = document.getElementById('watch-status');
    if (!frame) return;
    const yt = youtube(url);
    const vm = vimeo(url);
    const tw = twitch(url);
    if (yt && /^[\w-]{6,}$/.test(yt)) {
      frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) + '?rel=0';
      frame.hidden = false;
      if (status) status.textContent = 'Playing the saved YouTube video. The owner must allow embedding.';
      return;
    }
    if (vm && /^\d+$/.test(vm)) {
      frame.src = 'https://player.vimeo.com/video/' + encodeURIComponent(vm);
      frame.hidden = false;
      if (status) status.textContent = 'Playing the saved Vimeo video.';
      return;
    }
    if (tw) {
      const parent = encodeURIComponent(parentHost());
      frame.src = tw.channel
        ? 'https://player.twitch.tv/?channel=' + encodeURIComponent(tw.channel) + '&parent=' + parent + '&muted=true'
        : 'https://player.twitch.tv/?video=' + encodeURIComponent(tw.video) + '&parent=' + parent + '&autoplay=false';
      frame.hidden = false;
      if (status) status.textContent = 'Playing the saved Twitch ' + (tw.channel ? 'channel' : 'video') + '. Chat stays on Twitch.';
      return;
    }
    frame.removeAttribute('src');
    frame.hidden = true;
    if (status) status.textContent = url ? 'Use a YouTube, Vimeo, or Twitch link. League games are not available through a public embed API.' : 'Paste a YouTube, Vimeo, or Twitch link. No pirate feeds.';
  }


  const FEEDS = [
    { label: 'Senators', url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news?limit=20', words: ['senator', 'ottawa'] },
    { label: 'Soccer', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/news?limit=15', words: ['inter miami', 'miami', 'messi'] },
    { label: 'Raptors', url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=15', words: ['raptor', 'toronto'] },
    { label: 'Bills', url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=15', words: ['bill', 'buffalo'] }
  ];

  function articleLink(article) {
    return article.links && article.links.web && article.links.web.href || '';
  }

  function latest() {
    const board = document.getElementById('watch-latest');
    if (!board) return;
    board.textContent = 'Loading the latest...';
    Promise.all(FEEDS.map(feed => fetch(feed.url).then(res => res.json()).then(data => {
      const articles = data.articles || [];
      const hits = articles.filter(article => {
        const text = (article.headline + ' ' + (article.description || '')).toLowerCase();
        return feed.words.some(word => text.includes(word));
      });
      return (hits.length ? hits : articles).slice(0, 3).map(article => ({
        label: feed.label,
        title: article.headline,
        detail: article.description || '',
        when: article.published || article.lastModified || '',
        link: articleLink(article)
      }));
    }).catch(() => []))).then(groups => {
      board.replaceChildren();
      const rows = groups.flat();
      if (!rows.length) {
        board.textContent = 'Latest news is not available right now.';
        return;
      }
      rows.forEach(row => {
        const item = document.createElement('article');
        const tag = document.createElement('strong');
        tag.textContent = row.label;
        const link = document.createElement('a');
        link.href = row.link || 'https://www.espn.com/';
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = row.title;
        const detail = document.createElement('p');
        const when = row.when ? new Date(row.when).toLocaleString() : '';
        detail.textContent = [when, row.detail].filter(Boolean).join(' · ');
        item.append(tag, link, detail);
        board.appendChild(item);
      });
    });
  }
  function tonight() {
    const line = document.getElementById('watch-tonight');
    if (!line) return;
    fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard').then(res => res.json()).then(data => {
      const event = (data.events || []).find(item => (item.name || '').toLowerCase().includes('ottawa'));
      if (!event) { line.textContent = 'No Senators game on the board right now.'; return; }
      const game = (event.competitions || [])[0] || {};
      const detail = game.status && game.status.type && game.status.type.shortDetail;
      line.textContent = 'Tonight: ' + event.name + (detail ? ' · ' + detail : '');
    }).catch(() => { line.textContent = 'Senators board is not available right now.'; });
  }
  function boot() {
    const input = document.getElementById('watch-link');
    if (!input) return;
    input.value = load();
    paint(input.value);
    document.getElementById('watch-save')?.addEventListener('click', () => {
      const url = input.value.trim();
      save(url);
      paint(url);
    });
    document.querySelectorAll('[data-highlight]').forEach(button => {
      button.addEventListener('click', () => {
        const url = button.getAttribute('data-highlight') || '';
        input.value = url;
        save(url);
        paint(url);
      });
    });
    latest();
    tonight();
    document.getElementById('watch-refresh')?.addEventListener('click', latest);
    if (!window.__jozefWatchTimer) {
      window.__jozefWatchTimer = window.setInterval(() => {
        if (document.hidden) return;
        const room = document.getElementById('watch');
        if (room && !room.classList.contains('active')) return;
        latest();
    tonight();
      }, 60000);
    }
    document.querySelectorAll('[data-watch-out]').forEach(link => {
      link.addEventListener('click', event => {
        const ok = window.confirm('This opens an official league site, outside Jozef FC. Continue?');
        if (!ok) event.preventDefault();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
;

/* BEGIN locker.js */
/* Real matchday locker. Ottawa weather, boots or indoor, weekly award. */
(function () {
  'use strict';
  const WEATHER = 'https://api.open-meteo.com/v1/forecast?latitude=45.4215&longitude=-75.6972&current=temperature_2m,precipitation,weather_code&timezone=America%2FToronto';

  function match() {
    try { return JSON.parse(localStorage.getItem('jozefs-world-matchday-v1') || '{}'); }
    catch (err) { return {}; }
  }

  function award() {
    try {
      const album = JSON.parse(localStorage.getItem('jozefs-world-album-v1') || '{}');
      const count = Object.keys(album).length;
      if (count >= 5) return 'Sticker captain';
      if (count >= 1) return 'Sticker hunter';
      return 'First boot';
    } catch (err) { return 'First boot'; }
  }

  function boots(temp, rain) {
    if (rain > 1 || temp < 2) return 'Indoor shoes. It is wet or cold.';
    if (temp < 8) return 'Boots, and a layer under the kit.';
    return 'Boots. The pitch is fine.';
  }

  function paint(card, text) {
    const line = document.getElementById('locker-line');
    const gear = document.getElementById('locker-gear');
    const prize = document.getElementById('locker-award');
    const next = match();
    if (line) {
      line.textContent = next.date
        ? 'Next real game: ' + (next.opponent || 'your match') + ' on ' + next.date + (next.time ? ' at ' + next.time : '')
        : 'No real match set. Dad can add one in Match Day.';
    }
    if (prize) prize.textContent = 'This week: ' + award();
    if (gear) gear.textContent = text;
    if (card) card.hidden = false;
  }

  function boot() {
    const card = document.getElementById('locker-card');
    if (!card) return;
    paint(card, 'Checking Ottawa weather...');
    fetch(WEATHER).then(res => res.json()).then(data => {
      const temp = data.current && data.current.temperature_2m;
      const rain = data.current && data.current.precipitation;
      paint(card, 'Ottawa is ' + Math.round(temp) + '°C. ' + boots(temp, rain));
    }).catch(() => paint(card, 'Weather is not available. Pack boots and a backup layer.'));
    document.getElementById('locker-chant')?.addEventListener('click', () => {
      const line = 'Jozef FC. Number ' + (document.getElementById('walkout-number')?.textContent || '11') + '. We play.';
      if (window.speechSynthesis && localStorage.getItem('jozefs-world-commentary') === 'on') {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(line));
      }
      const gear = document.getElementById('locker-gear');
      if (gear) gear.textContent = line;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
;

/* BEGIN sports-stage.js */
/* Jozef FC / Original Sports Arcade action scenes.
   Canvas is an OPTIONAL visual layer; all scoring is owned by multisport.js.
   No images, physics authority, storage, microphone or network calls. */
(() => {
  'use strict';
  const W=640,H=320,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const circle=(c,x,y,r,color)=>{
    c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
  };
  const line=(c,x1,y1,x2,y2,color,width=2)=>{
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);
    c.strokeStyle=color;c.lineWidth=width;c.stroke();
  };
  const rect=(c,x,y,w,h,color)=>{
    c.fillStyle=color;c.fillRect(x,y,w,h);
  };
  const text=(c,label,x,y,size=16,color='#f2fff2')=>{
    c.font='900 '+size+'px system-ui';c.textAlign='center';c.fillStyle=color;c.fillText(label,x,y);
  };
  const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const sports=['hockey','baseball','basketball','wrestling'];
  function create(){
    const canvas=document.getElementById('multi-action-canvas');
    const ctx=canvas?.getContext?.('2d');
    if(!ctx)return null;
    const stage=document.getElementById('multi-stage');
    stage?.classList?.add('has-canvas');
    let activeSport='hockey',round=0,rank=0,turnStart=Date.now(),action=null,raf=0,lastFrame=0,alive=true;
    const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    const visible=()=>!document.hidden&&Boolean(document.getElementById('sports-arcade')?.classList?.contains('active'));
    function stadium(c,s){
      const themes={
        hockey:['#caedfa','#b5ddec','#23608e'],
        baseball:['#176448','#195d45','#f2d8a8'],
        basketball:['#a75931','#b87346','#ffe1b3'],
        wrestling:['#17264f','#29204e','#bea1ff']
      };
      const [a,b,accent]=themes[s];
      rect(c,0,0,W,H,a);
      for(let i=0;i<8;i++)rect(c,0,i*42,W,42,i%2?b:a);
      if(s==='hockey'){
        ctx.strokeStyle='#be5c68';ctx.lineWidth=4;ctx.strokeRect(23,24,594,273);
        line(c,320,24,320,297,'#b75c68',3);
        for(const x of [142,490]){
          c.beginPath();c.arc(x,160,45,0,TAU);c.strokeStyle='#609bc1';c.lineWidth=3;c.stroke();
        }
        rect(c,224,29,192,8,'#ee6672');
        for(let i=0;i<13;i++)line(c,224+i*16,24,224+i*16,56,'#9ad9f3',1);
        text(c,'NIGHT RINK // JOZEF FC',320,311,11,'#11455e');
      }else if(s==='baseball'){
        c.save();c.translate(320,145);c.rotate(Math.PI/4);
        c.strokeStyle='#fff7d5';c.lineWidth=4;c.strokeRect(-120,-120,240,240);c.restore();
        rect(c,0,245,W,75,'#9a653d');
        circle(c,320,137,39,'#bb8d5a');circle(c,320,137,19,'#e9b47a');
        text(c,'JOZEF FC / HOME PLATE',320,309,12,'#fff0d8');
      }else if(s==='basketball'){
        ctx.strokeStyle='#ffe1b3';ctx.lineWidth=3;
        ctx.strokeRect(24,18,592,284);
        line(c,320,18,320,302,'#ffe1b3',2);
        c.beginPath();c.arc(320,159,51,0,TAU);c.stroke();
        c.beginPath();c.arc(480,159,90,.6*Math.PI,1.4*Math.PI);c.stroke();
        text(c,'JOZEF FC / 3-POINT NIGHT',320,311,12,'#fff0d4');
      }else{
        // A theatrical ring: not real physical-contact play.
        rect(c,0,0,W,73,'#091731');
        for(let i=0;i<13;i++){
          line(c,i*52,0,320+(i-6)*10,185,'#9473e027',10);
          circle(c,i*52,14,5,i%3===0?'#ecdeff':'#6e65b1');
        }
        rect(c,82,104,480,190,'#728cbb');
        rect(c,93,115,458,164,'#253763');
        for(let i=0;i<3;i++){
          line(c,79,112+i*64,561,112+i*64,'#cbb5ff',4);
        }
        for(const x of [80,560]){rect(c,x-5,98,10,201,'#d8c8ff');}
        text(c,'MAIN EVENT • NIGHT ARENA',320,44,15,'#f3eaff');
      }
      return accent;
    }
    function goalkeeper(c,x,y,color='#244b69'){
      circle(c,x+3,y+34,25,'#22343b40');
      line(c,x-14,y+8,x-20,y+37,'#1d3041',10);
      line(c,x+14,y+8,x+20,y+37,'#1d3041',10);
      rect(c,x-22,y-26,44,44,color);
      line(c,x-20,y-14,x-44,y+7,'#e7d1b6',10);
      line(c,x+20,y-14,x+44,y+7,'#e7d1b6',10);
      circle(c,x,y-39,13,'#deb99b');
      text(c,'G',x,y+3,20,'#edfff9');
    }
    function baseball(c,x,y,r=13){
      circle(c,x+3,y+5,r+1,'#01152253');
      circle(c,x,y,r,'#fff4dd');
      c.beginPath();c.arc(x-3,y,r*.69,-Math.PI*.5,Math.PI*.55);
      c.strokeStyle='#c84640';c.lineWidth=2;c.stroke();
      c.beginPath();c.arc(x+5,y,r*.72,.5*Math.PI,1.55*Math.PI);c.stroke();
    }
    function basketball(c,x,y,r=18){
      circle(c,x+3,y+6,r+2,'#1b180c52');
      circle(c,x,y,r,'#e88b3e');
      line(c,x-r,y,x+r,y,'#58351e',2);
      line(c,x,y-r,x,y+r,'#58351e',2);
      c.beginPath();c.arc(x,y,r*.84,-Math.PI/3,Math.PI/3);
      c.strokeStyle='#58351e';c.lineWidth=2;c.stroke();
    }
    function wrestler(c,x,y,colour,pose=0,flip=false){
      c.save();c.translate(x,y);if(flip)c.scale(-1,1);
      // Big-friendly superhero silhouettes and stage posing, no fighting moves.
      rect(c,-11,23,9,35,'#172138');rect(c,2,23,9,35,'#172138');
      rect(c,-21,-18,42,44,colour);
      line(c,-18,-10,-40,-28-pose*17,'#dbb89f',11);
      line(c,18,-10,40,-5-pose*24,'#dbb89f',11);
      circle(c,0,-34,15,'#edc8a6');
      rect(c,-13,-49,26,10,'#141a30');
      text(c,'J',0,8,22,'#fff4d8');
      c.restore();
    }
    function movingGoalieX(now=Date.now()){
      return reduced()?320:320+Math.sin((now-turnStart)/460)*78;
    }
    function draw(){
      const c=ctx,now=Date.now(),elapsed=now-turnStart;
      const motion=!reduced();
      const inFlight=action&&motion;
      const t=inFlight?clamp((now-action.at)/820,0,1):1;
      c.clearRect(0,0,W,H);
      const accent=stadium(c,activeSport);
      if(activeSport==='hockey'){
        // Start the dive exactly where the moving keeper stood when the
        // shot was taken; don't snap him back to centre at release.
        const goalieX=inFlight?lerp(action.fromX??320,[257,320,383][action.goalie??1],easeOut(t)) :
          motion?movingGoalieX(now):320;
        goalkeeper(c,goalieX,98);
        if(inFlight){
          const target=[257,320,383][action.choice]||320;
          circle(c,lerp(320,target,easeOut(t)),lerp(270,70,easeOut(t)),10,'#132e3a');
          if(t===1)text(c,action.made?'GOAL!':'SAVED!',320,214,36,action.made?'#267651':'#a03049');
        }else circle(c,320,257,12,'#172e3e');
        if(!inFlight)text(c,'THE GOALIE IS MOVING! PICK A CORNER',320,205,13,'#153f55');
      }else if(activeSport==='baseball'){
        // Ball approaches home plate over each 1.9-second cycle; swing outcome is authoritative in multisport.js.
        const cycle=clamp((elapsed%1900)/1900,0,1);
        const p=inFlight?easeOut(t):motion?clamp((cycle<.5?cycle:1-cycle)*2,0,1):.55;
        const ballX=lerp(320,360,p),ballY=lerp(115,240,p),radius=lerp(6,22,p);
        baseball(c,ballX,ballY,radius);
        line(c,440,155,390,245,'#e4bf7c',14);
        if(inFlight){
          line(c,440,155,390-t*90,245-t*70,'#ffcf8a',14);
          if(action.made){baseball(c,lerp(320,160,t),lerp(205,20,t)-Math.sin(t*Math.PI)*85,11);}
          if(t===1)text(c,action.made?'BASE HIT!':'NEXT PITCH!',320,60,34,'#fff5cc');
        }
      }else if(activeSport==='basketball'){
        rect(c,469,64,18,150,'#ebdcc3');
        rect(c,425,85,100,12,'#f9f9e3');
        c.beginPath();c.ellipse(475,135,40,13,0,0,TAU);
        c.strokeStyle='#ed622d';c.lineWidth=7;c.stroke();
        for(let k=-3;k<=3;k++)line(c,475+k*10,140,475+k*5,195,'#fff0dc88',2);
        if(inFlight){
          const endX=action.made?475:525;
          const x=lerp(146,endX,easeOut(t)),y=lerp(253,135,easeOut(t))-Math.sin(t*Math.PI)*140;
          basketball(c,x,y,18);
          if(t===1)text(c,action.made?'SWISH!':'KEEP SHOOTING!',315,67,32,'#fff2cf');
        }else{
          basketball(c,146,251,21);
          if(!motion)text(c,'RELEASE TO SHOOT',304,230,20,'#fff3dc');
        }
      }else{
        const wave=motion?Math.sin(now/410)*5:0;
        const celeb=inFlight&&action.made&&t>.2?1:0;
        wrestler(c,220,195,'#c8ff5a',celeb,false);
        wrestler(c,424+wave,195,rank>=2?'#f4ba5b':'#9e85ff',motion?Math.abs(wave)/5:0,true);
        if(inFlight&&t===1)text(c,action.made?'THE CROWD GOES WILD!':'NEXT SHOW MOMENT!',320,81,22,'#f2ddff');
        else text(c,rank>=2?'CHAMPIONSHIP NIGHT':'LIGHTS • CAMERA • ACTION',320,86,18,'#ead9ff');
      }
    }
    function frame(timestamp){
      raf=0;
      if(!alive||!visible())return;
      if(timestamp-lastFrame>=28||!lastFrame){draw();lastFrame=timestamp;}
      raf=window.requestAnimationFrame?.(frame)||0;
    }
    function refresh(){
      if(!alive)return;
      draw();
      if(!reduced()&&visible()&&!raf)raf=window.requestAnimationFrame?.(frame)||0;
    }
    // The visible goalie, not a hidden roll, determines the Pro shot lane.
    // Keep a fallback for reduced-motion and old browsers.
    function getGoalie(){
      if(activeSport!=='hockey')return null;
      if(reduced())return 1;
      const x=movingGoalieX();
      return x<291?0:x>349?2:1;
    }
    function begin(s,opts={}){
      if(!sports.includes(s))return;
      activeSport=s;round=opts.round||0;rank=opts.rank||0;action=null;turnStart=Date.now();
      refresh();
    }
    function shoot(opts={}){
      const now=Date.now();
      action={
        at:now,fromX:activeSport==='hockey'?movingGoalieX(now):320,
        made:Boolean(opts.made),goalie:clamp(Number(opts.goalie)||0,0,2),
        choice:clamp(Number(opts.choice)||0,0,2)
      };
      refresh();
    }
    function suspend(){if(raf){window.cancelAnimationFrame?.(raf);raf=0;}}
    window.addEventListener?.('pageshow',refresh);
    document.addEventListener?.('visibilitychange',()=>{if(document.hidden)suspend();else refresh()});
    document.querySelector?.('[data-section="sports-arcade"]')?.addEventListener?.('click',refresh);
    return Object.freeze({begin,shoot,refresh,suspend,getGoalie});
  }
  window.JozefSportStage=Object.freeze({create});
})();
;

/* BEGIN multisport.js */
/* JOZEF'S SPORTS ARCADE — four original, self-contained browser games.
   No online accounts, official sports assets, betting, or unsafe wrestling moves. */
(() => {
  'use strict';
  const KEY='jozefs-world-multisport-v1';
  const GAMES={
    hockey:{label:'HOCKEY SHOOTOUT',short:'Hockey',kind:'aim',rounds:5,unit:'GOALS'},
    baseball:{label:'BASEBALL HOME RUN DERBY',short:'Baseball',kind:'timing',rounds:5,unit:'HITS'},
    basketball:{label:'BASKETBALL THREE-POINT CHALLENGE',short:'Basketball',kind:'timing',rounds:5,unit:'BUCKETS'},
    wrestling:{label:'WRESTLING SHOWDOWN',short:'Wrestling',kind:'show',rounds:5,unit:'CROWD POPS'}
  };
  const RIVALS={
    hockey:{name:'FROST WOLVES',venue:'MIDNIGHT ICE'},
    baseball:{name:'DIAMOND COMETS',venue:'CITY BALLPARK'},
    basketball:{name:'SKYLINE FIVE',venue:'NEON COURT'},
    wrestling:{name:'SHADOW SHOWMEN',venue:'NIGHT ARENA'}
  };
  const RIVAL_TARGETS=[2,3,4];
  const WRESTLING_TIERS=[
    {name:'OPENING ACT',rival:'NEON TITAN',required:1},
    {name:'RISING STAR',rival:'MIDNIGHT MAVERICK',required:3},
    {name:'MAIN EVENT',rival:'GOLDEN PANTHER',required:6},
    {name:'CHAMPION',rival:'THE NIGHT LEGEND',required:null}
  ];
  const CHALLENGES=[
    {cue:'THE CROWD WANTS A HUGE ENTRANCE!',answer:0,remark:'THE LIGHTS HIT. THE CROWD ROARS!'},
    {cue:'IT IS TIME FOR YOUR SIGNATURE POSE!',answer:1,remark:'THAT IS THE POSE EVERYONE CAME TO SEE!'},
    {cue:'YOUR TAG-TEAM PARTNER NEEDS A HIGH FIVE!',answer:2,remark:'TEAMWORK BRINGS THE HOUSE DOWN!'},
    {cue:"WWE FAN QUIZ: WHO IS KNOWN FOR 'YOU CAN'T SEE ME'?",choices:['JOHN CENA','REY MYSTERIO','ROMAN REIGNS'],answer:0,remark:'JOHN CENA! THE CROWD KNOWS THAT LINE!'},
    {cue:'WWE FAN QUIZ: WHO IS FAMOUS FOR THE 619?',choices:['CODY RHODES','REY MYSTERIO','JOHN CENA'],answer:1,remark:'REY MYSTERIO! YOU KNOW YOUR WRESTLING!'}
  ];
  const LEGEND_SHOW=[
    {cue:'WWE FAN QUIZ: WHO IS KNOWN AS THE AMERICAN NIGHTMARE?',choices:['JOHN CENA','ROMAN REIGNS','CODY RHODES'],answer:2,remark:'CODY RHODES! BIG MATCH ENERGY!'},
    {cue:'YOUR TEAM NEEDS A BIG MOMENT TO OPEN THE SHOW!',choices:['LOOK AWAY','ENTRANCE POSE','LEAVE THE STAGE'],answer:1,remark:'THE CROWD IS READY FOR THE MAIN EVENT!'},
    {cue:'WWE FAN QUIZ: WHO HAS USED THE TRIBAL CHIEF NICKNAME?',choices:['ROMAN REIGNS','REY MYSTERIO','JOHN CENA'],answer:0,remark:'ROMAN REIGNS! YOU KNOW YOUR WWE!'},
    {cue:'A FRIENDLY TAG TEAM NEEDS A WAY TO CELEBRATE!',choices:['IGNORE YOUR PARTNER','TURN AWAY','TEAM HIGH FIVE'],answer:2,remark:'TEAMWORK GETS THE BIGGEST CHEERS!'},
    {cue:'YOUR LAST APPEARANCE IS ABOUT TO BEGIN!',choices:['SIGNATURE POSE','HIDE BACKSTAGE','FORGET THE FANS'],answer:0,remark:'THE NIGHT BELONGS TO YOUR TEAM!'}
  ];
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const valid=(v)=>Number.isSafeInteger(v)&&v>=0&&v<=999999;
  function fresh(){return Object.fromEntries(Object.keys(GAMES).map(sport=>[sport,{played:0,best:0,rivalTier:0,recent:[]}]));}
  function load(){
    let input;
    try{input=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){}
    const out=fresh();
    out.wrestling.careerWins=0;
    for(const sport of Object.keys(GAMES)){
      const row=input?.[sport]||{};
      if(valid(row.played))out[sport].played=row.played;
      if(valid(row.best))out[sport].best=Math.min(GAMES[sport].rounds,row.best);
      if(valid(row.rivalTier))out[sport].rivalTier=Math.min(RIVAL_TARGETS.length,row.rivalTier);
      // Older saves have no recent array; ignore malformed or oversized imports.
      if(Array.isArray(row.recent))
        out[sport].recent=row.recent.filter(x=>Number.isInteger(x)&&x>=0&&x<=5).slice(-5);
    }
    if(valid(input?.wrestling?.careerWins))
      out.wrestling.careerWins=Math.min(input.wrestling.careerWins,out.wrestling.played);
    return out;
  }
  let saved=load(),sport='hockey',difficulty='pro',round=0,points=0,phase='ready',turnStart=0,raf=0,indicator=50,lastMessage='',lastResult=null,roundHistory=[],stageView=null;
  const button=(label,choice,extra='')=>{
    const b=document.createElement('button');
    b.type='button';b.textContent=label;b.dataset.choice=choice;
    b.className='multi-action '+extra;
    b.addEventListener('click',()=>act(choice));
    return b;
  };
  const label=(id,text)=>{const e=$(id);if(e)e.textContent=String(text);};
  const setHidden=(id,val)=>{const e=$(id);if(e)e.hidden=val};
  const position=(ms,kind)=>{
    // Triangle wave, 0→100→0 in 1.9s. Always calculate from elapsed time,
    // not rendered frames, so slow phones receive identical timing rules.
    const cycle=((ms%1900)+1900)%1900;
    return cycle<950?cycle/9.5:(1900-cycle)/9.5;
  };
  const TIMING_WINDOWS={
    rookie:{baseball:27,basketball:22},
    pro:{baseball:17,basketball:12},
    legend:{baseball:9,basketball:7}
  };
  const accuracy=(kind,pos,level='pro')=>
    Math.abs(pos-55)<=(TIMING_WINDOWS[level]||TIMING_WINDOWS.pro)[kind==='baseball'?'baseball':'basketball'];
  function persist(){
    try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(_){/* This run still works. */}
  }
  function paintRecord(){
    for(const k of Object.keys(GAMES)){
      label('multi-best-'+k,saved[k].best+'/5');
      label('multi-played-'+k,saved[k].played+' PLAYED');
      const qualified=saved[k].best>=3;
      const record=saved[k].played
        ? qualified?'CUP QUALIFIED · '+saved[k].best+'/5':'PERSONAL BEST · '+saved[k].best+'/5'
        : 'FIRST CHALLENGE AWAITS';
      label('multi-home-record-'+k,record);
      label('multi-mode-best-'+k,saved[k].played?'BEST '+saved[k].best+'/5':'NEW SPORT');
      const homeRecord=$('multi-home-record-'+k);
      homeRecord?.classList?.toggle('is-qualified',qualified);
      const tab=$('multi-tab-'+k);
      if(tab){tab.classList.toggle('selected',k===sport);tab.setAttribute('aria-pressed',String(k===sport))}
    }
  }
  // A championship is earned entirely from the four existing local best scores.
  // No extra profile, payments, countdowns, or new save key.
  const COACH_TIPS={
    hockey:[
      'Watch the goalie before shooting. Aim into a corner the keeper is moving away from.',
      'Mix left, centre and right. Varying your choices makes the shootout more interesting.',
      'Try Legend difficulty: track the goalie movement and pick the open side.'
    ],
    baseball:[
      'Watch the approaching pitch and swing when the marker crosses the green zone.',
      'Aim for a consistent swing rhythm, not speed. Watch the middle of the power bar.',
      'Try a narrower Legend timing window to practise your precision.'
    ],
    basketball:[
      'Wait until the timing marker enters the green scoring zone before releasing.',
      'Keep your eyes on the release marker and practise the same shooting rhythm.',
      'Try Legend difficulty and see how often you can hit the tighter release window.'
    ],
    wrestling:[
      'Read each crowd or trivia prompt all the way through before choosing.',
      'Remember the signature entrances, teammate moments and superstar trivia.',
      'Try Legend showmanship with new questions and more demanding challenges.'
    ]
  };
  function getFormProgress(kind=sport){
    if(!GAMES[kind])return null;
    const recent=[...(saved[kind].recent||[])].slice(-5);
    const average=recent.length?recent.reduce((n,x)=>n+x,0)/recent.length:null;
    let trend='FIRST GAME AWAITS';
    if(recent.length===1)trend='FIRST RESULT';
    if(recent.length>1){
      const previous=recent[recent.length-2],latest=recent[recent.length-1];
      trend=latest>previous?'IMPROVING ↑':latest<previous?'KEEP PRACTISING':'HOLDING STEADY';
    }
    const tip=COACH_TIPS[kind][average===null||average<2.5?0:average<4?1:2];
    return {sport:kind,recent,average,trend,tip};
  }
  function paintForm(){
    const form=getFormProgress(),holder=$('multi-form-scores');
    if(holder){
      holder.replaceChildren();
      const five=Array(5-form.recent.length).fill(null).concat(form.recent);
      five.forEach((score,i)=>{
        const item=document.createElement('span');
        item.className='multi-form-score'+(score===null?' is-empty':score>=3?' is-good':'');
        item.setAttribute('role','listitem');
        item.setAttribute('aria-label',score===null?'No saved game':score+' of 5 points');
        item.textContent=score===null?'—':score+'/5';
        holder.append(item);
      });
    }
    label('multi-form-average',form.average===null?'—':form.average.toFixed(1)+' / 5');
    label('multi-form-trend',form.trend);
    label('multi-form-tip',form.tip);
  }
  function getCupProgress(){
    const qualified=Object.keys(GAMES).filter(id=>saved[id].best>=3);
    return {qualified:qualified.length,total:4,champion:qualified.length===4};
  }
  function getRivalProgress(){
    const sports=Object.fromEntries(Object.keys(GAMES).map(id=>{
      const tier=Math.min(3,saved[id].rivalTier||0);
      return [id,{opponent:RIVALS[id].name,venue:RIVALS[id].venue,tier,total:3,
        target:RIVAL_TARGETS[Math.min(tier,2)],complete:tier===3}];
    }));
    return {sports,beaten:Object.values(sports).reduce((n,x)=>n+x.tier,0),total:12,
      champion:Object.values(sports).every(x=>x.complete)};
  }
  function paintRivals(){
    const data=getRivalProgress();
    for(const id of Object.keys(GAMES)){
      const r=data.sports[id],node=$('multi-rival-'+id);
      node?.classList?.toggle('rival-champion',r.complete);
      node?.classList?.toggle('rival-selected',sport===id);
      label('multi-rival-'+id+'-name',r.opponent);
      label('multi-rival-'+id+'-status',r.complete?'RIVAL DEFEATED ✓':r.tier+' / 3 BEATEN');
    }
    const selected=data.sports[sport];
    label('multi-rival-fixture','JOZEF FC vs '+selected.opponent);
    label('multi-rival-target',selected.complete?'FINAL RIVAL DEFEATED':'NEXT RIVAL TARGET · '+selected.target+' / 5');
    label('multi-rival-overall',data.beaten+' / '+data.total+' RIVAL CHALLENGES WON');
    const bar=$('multi-rival-progress');
    bar?.setAttribute('aria-valuenow',String(data.beaten));
    const fill=$('multi-rival-meter');
    if(fill)fill.style.width=Math.round(data.beaten/data.total*100)+'%';
    $('multi-rivals')?.classList?.toggle('rival-complete',data.champion);
  }
  function getWrestlingCareer(){
    const wins=saved.wrestling.careerWins||0;
    const rank=wins>=6?3:wins>=3?2:wins>=1?1:0;
    const tier=WRESTLING_TIERS[rank];
    const previous=rank===0?0:WRESTLING_TIERS[rank-1].required;
    return {wins,rank,name:tier.name,rival:tier.rival,
      required:tier.required,remaining:tier.required===null?0:Math.max(0,tier.required-wins),
      progress:tier.required===null?100:Math.round((wins-previous)/(tier.required-previous)*100)};
  }
  function paintWrestlingCareer(){
    const career=getWrestlingCareer();
    const panel=$('multi-wrestling-career');
    if(panel)panel.hidden=sport!=='wrestling';
    label('multi-wrestling-rank',career.name);
    label('multi-wrestling-rival',career.rival);
    label('multi-wrestling-wins',career.wins+' SHOW WINS');
    label('multi-wrestling-story',career.rank===3?
      'You earned the main-event title. Keep performing and defend your spotlight.':
      'Win '+career.remaining+' more show'+(career.remaining===1?'':'s')+' with 3+ crowd pops to reach '+WRESTLING_TIERS[career.rank+1].name+'.');
    const meter=$('multi-wrestling-meter');
    if(meter)meter.style.width=career.progress+'%';
    const bar=$('multi-wrestling-progress');
    bar?.setAttribute('aria-valuenow',String(career.progress));
    panel?.classList.toggle('is-champion',career.rank===3);
  }
  function paintCup(){
    const cup=getCupProgress(),finale=$('multi-cup-finale');
    for(const id of Object.keys(GAMES)){
      const won=saved[id].best>=3;
      const stamp=$('multi-cup-'+id);
      stamp?.classList.toggle('qualified',won);
      label('multi-cup-'+id+'-state',won?'QUALIFIED ✓':saved[id].played?'BEST '+saved[id].best+'/5':'NOT YET');
    }
    const meter=$('multi-cup-meter');
    if(meter)meter.style.width=(cup.qualified*25)+'%';
    const track=$('multi-cup-progress');
    track?.setAttribute('aria-valuenow',String(cup.qualified));
    finale?.classList.toggle('champion',cup.champion);
    label('multi-cup-status',cup.champion?'4 OF 4 / CHAMPION':cup.qualified+' OF 4 QUALIFIED');
    label('multi-cup-title',cup.champion?'THE ALL-SPORT CUP IS YOURS.':'THE CUP AWAITS.');
    const next=$('multi-cup-next');
    if(next)next.textContent=cup.champion?'PLAY ANOTHER EVENT ↗':'PLAY FOR THE CUP ↗';
  }
  function paintRounds(){
    const host=$('multi-round-markers');
    if(!host)return;
    host.replaceChildren();
    for(let i=0;i<GAMES[sport].rounds;i++){
      const mark=document.createElement('span');
      const made=roundHistory[i];
      mark.className='multi-turn-mark '+(made===true?'is-made':made===false?'is-missed':i===round&&phase==='ready'?'is-now':'');
      mark.textContent=made===true?'✓':made===false?'×':String(i+1);
      mark.setAttribute('aria-label','Turn '+(i+1)+': '+(made===true?'scored':made===false?'missed':i===round&&phase==='ready'?'up next':'not played'));
      host.append(mark);
    }
  }
  function drawControls(){
    const controls=$('multi-controls');
    if(!controls)return;
    controls.replaceChildren();
    if(phase==='finished'){
      controls.append(button('PLAY AGAIN ↗','again','multi-primary'));
      return;
    }
    if(phase==='result'){
      controls.append(button(round>=5?'VIEW RESULT ↗':'NEXT TURN ↗','next','multi-primary'));
      return;
    }
    if(sport==='hockey'){
      controls.append(button('1 / LEFT','left'),button('2 / CENTRE','centre'),button('3 / RIGHT','right'));
    }else if(sport==='wrestling'){
      const challenge=(difficulty==='legend'?LEGEND_SHOW:CHALLENGES)[round];
      const names=challenge?.choices||['ENTRANCE','SIGNATURE POSE','TEAMWORK'];
      const labels=names.map((name,i)=>difficulty==='rookie'&&i===challenge.answer?name+' / COACH PICK':name);
      controls.append(button('1 / '+labels[0],'entrance'),button('2 / '+labels[1],'pose'),button('3 / '+labels[2],'teamwork'));
    }else{
      controls.append(button(sport==='baseball'?'SWING BAT ↗':'RELEASE SHOT ↗','shoot','multi-primary'));
    }
  }
  function scene(){
    const config=GAMES[sport];
    const box=$('multi-stage');
    if(box)box.dataset.sport=sport;
    label('multi-name',config.label);
    label('multi-round',phase==='finished'?'FULL TIME':Math.min(round+1,config.rounds)+' / '+config.rounds);
    label('multi-score',points+' / '+config.rounds+' '+config.unit);
    label('multi-stage-label',sport==='hockey'?'AIM FOR THE OPEN CORNER':sport==='baseball'?'TIME YOUR SWING':sport==='basketball'?'RELEASE NEAR THE SWEET SPOT':'THE SHOW MUST GO ON');
    const canvas=$('multi-action-canvas');
    if(canvas){
      canvas.setAttribute('role',sport==='wrestling'?'img':'button');
      canvas.setAttribute('aria-label',sport==='hockey'?
        'Tap left, centre or right of the rink to aim your shot. Keyboard 1, 2 or 3 also works.':
        sport==='baseball'?'Tap to swing when the pitch is right. Press Space to swing with keyboard.':
        sport==='basketball'?'Tap to shoot at the hoop. Press Space to shoot with keyboard.':
        'Wrestling stage. Choose a showmanship or trivia response using the buttons.');
      canvas.tabIndex=sport==='wrestling'?-1:0;
    }
    label('multi-scene-text',sport==='hockey'?'':sport==='baseball'?'BATTER UP':sport==='basketball'?'FROM DOWNTOWN':'LIGHTS • CAMERA • ACTION');
    setHidden('multi-timing',GAMES[sport].kind!=='timing');
    const meter=$('multi-meter');
    if(meter && (sport==='baseball'||sport==='basketball')){
      // The visible green zone exactly matches the selected difficulty's scoring tolerance.
      const width=TIMING_WINDOWS[difficulty][sport],left=55-width,right=55+width;
      meter.style.background='linear-gradient(90deg,#86514c 0 '+left+'%,#aedb6a '+left+'% '+right+'%,#86514c '+right+'% 100%)';
      meter.setAttribute('aria-label',difficulty+' difficulty: scoring sweet spot from '+left+' to '+right+' percent');
    }
    const active=phase!=='finished'&&phase!=='result';
    let prompt=lastMessage;
    if(!prompt){
      prompt=sport==='hockey'?'Choose LEFT, CENTRE or RIGHT to beat the keeper.':
      sport==='baseball'?'Press SWING when the marker crosses the centre zone.':
      sport==='basketball'?'Release when the marker is near the centre zone.':
      (difficulty==='legend'?LEGEND_SHOW:CHALLENGES)[round].cue;
    }
    label('multi-message',prompt);
    const descriptions={
      rookie:'ROOKIE / Wider timing windows and helpful hints. Start here.',
      pro:'PRO / Classic timing and competition. Change difficulty to restart this event.',
      legend:'LEGEND / Tougher goalies, precise timing, new wrestling questions.'
    };
    label('multi-difficulty-note',descriptions[difficulty]);
    for(const id of ['rookie','pro','legend']){
      const tab=$('multi-difficulty-'+id);
      if(tab){tab.setAttribute('aria-pressed',String(id===difficulty));tab.classList.toggle('selected',id===difficulty)}
    }
    const stage=$('multi-stage');
    stage?.classList.toggle('multi-finished',phase==='finished');
    stage?.classList.toggle('multi-result',phase==='result');
    label('multi-keyhelp',sport==='hockey'||sport==='wrestling'?'Use 1, 2, 3 or tap a choice.':'Use SPACE or tap the action button.');
    const instructions=$('multi-instructions');
    if(instructions)instructions.textContent=sport==='wrestling'?'Original ring-show challenges and WWE superstar trivia. Unofficial fan activity, no risky wrestling moves to copy.':
      'Five turns. Have fun and chase your own personal best. No penalties for missing.';
    paintRecord();
    paintForm();
    paintCup();
    paintRivals();
    paintWrestlingCareer();
    paintRounds();
    drawControls();
    if(active&&config.kind==='timing')tick();
    else stopTick();
    stageView?.refresh();
  }
  function stopTick(){
    if(raf&&window.cancelAnimationFrame)window.cancelAnimationFrame(raf);
    raf=0;
  }
  function tick(){
    stopTick();
    if(!window.requestAnimationFrame)return;
    const run=()=>{
      if(phase!=='ready'||GAMES[sport].kind!=='timing')return;
      if(!$('sports-arcade')?.classList.contains('active')){raf=0;return}
      indicator=position(Date.now()-turnStart,sport);
      const n=$('multi-meter-marker');
      if(n)n.style.left=indicator+'%';
      raf=window.requestAnimationFrame(run);
    };
    raf=window.requestAnimationFrame(run);
  }
  function start(kind){
    if(!GAMES[kind])return;
    sport=kind;round=0;points=0;phase='ready';turnStart=Date.now();lastMessage='';roundHistory=[];
    stageView?.begin(sport,{round,rank:getWrestlingCareer().rank});
    scene();
  }
  function act(choice){
    if(choice==='again'){start(sport);return}
    if(choice==='next'&&phase==='result'){
      if(round>=GAMES[sport].rounds){finish();return}
      lastMessage='';phase='ready';turnStart=Date.now();
      stageView?.begin(sport,{round,rank:getWrestlingCareer().rank});
      scene();return;
    }
    if(phase!=='ready')return;
    let made=false,remark='',goalieIndex=1,shotIndex=1;
    if(sport==='hockey'){
      if(!['left','centre','right'].includes(choice))return;
      shotIndex=['left','centre','right'].indexOf(choice);
      const observed=stageView?.getGoalie?.();
      goalieIndex=[0,1,2].includes(observed)?observed:Math.floor(Math.random()*3);
      if(difficulty==='rookie'&&goalieIndex===shotIndex&&Math.random()<.65){
        goalieIndex=(goalieIndex+1)%3;
      }else if(difficulty==='legend'&&goalieIndex!==shotIndex&&Math.random()<.45){
        goalieIndex=shotIndex;
      }
      const goalie=['left','centre','right'][goalieIndex];
      made=goalie!==choice;
      remark=made?'GOAL! THE PUCK FINDS THE '+choice.toUpperCase()+' CORNER.':'BIG SAVE! THE KEEPER WAS READY IN '+goalie.toUpperCase()+'.';
    }else if(sport==='baseball'||sport==='basketball'){
      if(choice!=='shoot')return;
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      // Reduced motion uses untimed accessible attempts, no moving target.
      const pos=reduced?50:position(Date.now()-turnStart,sport);
      made=reduced?Math.random()<(difficulty==='rookie'?.9:difficulty==='legend'?.55:.75):accuracy(sport,pos,difficulty);
      remark=made?(sport==='baseball'?'CRACK! THAT IS A CLEAN BASE HIT!':'SWISH! NOTHING BUT NET!'):
        (sport==='baseball'?'FOUL BALL! NEXT PITCH!':'OFF THE RIM! KEEP SHOOTING!');
    }else if(sport==='wrestling'){
      if(!['entrance','pose','teamwork'].includes(choice))return;
      const challenge=(difficulty==='legend'?LEGEND_SHOW:CHALLENGES)[round];
      const needed=['entrance','pose','teamwork'][challenge.answer];
      made=choice===needed;
      remark=made?challenge.remark:'THE CROWD WANTS A DIFFERENT MOMENT. NEXT ROUND!';
    }
    if(made)points++;
    roundHistory.push(made);
    stageView?.shoot({made,goalie:goalieIndex,choice:shotIndex});
    round++;phase='result';lastMessage=remark;
    scene();
  }
  function finish(){
    if(phase==='finished')return;
    phase='finished';
    saved[sport].played=Math.min(999999,saved[sport].played+1);
    saved[sport].best=Math.max(points,saved[sport].best);
    saved[sport].recent=(saved[sport].recent||[]).concat(points).slice(-5);
    const tier=saved[sport].rivalTier||0;
    const rivalWin=tier<RIVAL_TARGETS.length&&points>=RIVAL_TARGETS[tier];
    if(rivalWin)saved[sport].rivalTier=tier+1;
    if(sport==='wrestling'&&points>=3){
      saved.wrestling.careerWins=Math.min(999999,(saved.wrestling.careerWins||0)+1);
    }
    persist();
    const earned=window.JozefWorld?.record?.('multisport',{sport,score:points})||0;
    lastMessage=(points===5?'PERFECT FIVE! ':points>=3?'GREAT GAME! ':'NICE TRY! ')+
      points+' / 5 '+GAMES[sport].unit+'. '+
      (rivalWin?'RIVAL BEATEN: '+RIVALS[sport].name+'! ':'')+
      (earned?'+'+earned+' XP EARNED.':'PLAY AGAIN ANYTIME.');
    scene();
    lastResult={sport,score:points,rivalWin,rival:RIVALS[sport].name,rivalTier:saved[sport].rivalTier};
    if(typeof Event==='function')window.dispatchEvent?.(new Event('jozef:multisport-completed'));
  }
  function canvasAction(event){
    if(phase!=='ready')return;
    if(sport==='hockey'){
      const rect=event.currentTarget?.getBoundingClientRect?.();
      if(!rect||!Number.isFinite(rect.width)||rect.width<=0)return;
      const ratio=(event.clientX-rect.left)/rect.width;
      act(ratio<1/3?'left':ratio<2/3?'centre':'right');
    }else if(sport==='baseball'||sport==='basketball'){
      act('shoot');
    }
  }
  function onKey(e){
    if(!$('sports-arcade')?.classList.contains('active'))return;
    if(e.target?.matches?.('input,textarea,select,[contenteditable]'))return;
    const key=e.key;
    if(e.target===$('multi-action-canvas')&&phase==='ready'&&
      (key==='Enter'||(key===' '&&sport==='hockey'))){
      e.preventDefault?.();act(sport==='hockey'?'centre':'shoot');return;
    }
    if(key==='1'||key==='2'||key==='3'){
      if(sport!=='hockey'&&sport!=='wrestling')return;
      e.preventDefault?.();
      const options=sport==='hockey'?['left','centre','right']:['entrance','pose','teamwork'];
      act(options[Number(key)-1]);
    }else if(key===' '&&(sport==='baseball'||sport==='basketball')){
      e.preventDefault?.();act('shoot');
    }else if(key==='Enter'&&phase==='result'&&e.target===document.body){
      act('next');
    }
  }
  function nextRivalSport(){
    const chosen=Object.keys(GAMES).find(id=>(saved[id].rivalTier||0)<3) || sport;
    start(chosen);
    if(typeof window.showSection==='function')window.showSection('sports-arcade');
    window.requestAnimationFrame?.(()=>stageView?.refresh());
    if(GAMES[chosen].kind==='timing')tick();
  }
  function selectDifficulty(level){
    if(!['rookie','pro','legend'].includes(level)||difficulty===level)return;
    difficulty=level;
    start(sport);
  }
  function nextCupSport(){
    const target=Object.keys(GAMES).find(id=>saved[id].best<3) ||
      Object.keys(GAMES).reduce((lowest,id)=>saved[id].best<saved[lowest].best?id:lowest,'hockey');
    start(target);
    if(typeof window.showSection==='function')window.showSection('sports-arcade');
    window.requestAnimationFrame?.(()=>stageView?.refresh());
    if(GAMES[target].kind==='timing')tick();
  }
  function init(){
    stageView=window.JozefSportStage?.create?.()||null;
    $('multi-form-replay')?.addEventListener('click',()=>start(sport));
    $('multi-action-canvas')?.addEventListener('click',canvasAction);
    $('multi-cup-next')?.addEventListener('click',nextCupSport);
    $('multi-rival-next')?.addEventListener('click',nextRivalSport);
    for(const level of ['rookie','pro','legend'])
      $('multi-difficulty-'+level)?.addEventListener('click',()=>selectDifficulty(level));
    for(const k of Object.keys(GAMES))$('multi-tab-'+k)?.addEventListener('click',()=>start(k));
    document.querySelectorAll('[data-multi-start]')?.forEach(btn=>btn.addEventListener('click',()=>{
      const selected=btn.dataset.multiStart;
      if(!GAMES[selected])return;
      start(selected);
      if(typeof window.showSection==='function')window.showSection('sports-arcade');
      window.requestAnimationFrame?.(()=>stageView?.refresh());
      if(GAMES[selected].kind==='timing')tick();
    }));
    document.addEventListener('keydown',onKey);
    document.querySelector('[data-section="sports-arcade"]')?.addEventListener('click',()=>{
      window.requestAnimationFrame?.(()=>stageView?.refresh());
      if(GAMES[sport].kind==='timing'&&phase==='ready')tick();
    });
    window.addEventListener('pageshow',()=>{paintRecord();if(phase==='ready'&&GAMES[sport].kind==='timing')tick()});
    start('hockey');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
  window.JozefMultiSport=Object.freeze({getProgress:()=>JSON.parse(JSON.stringify(saved)),getFormProgress,getCupProgress,getWrestlingCareer,getRivalProgress,
    getLastResult:()=>lastResult&&{...lastResult},evaluateTiming:accuracy,
    getDifficulty:()=>difficulty,playSport:kind=>{if(!GAMES[kind])return false;start(kind);window.requestAnimationFrame?.(()=>stageView?.refresh());return true}});
})();
;
