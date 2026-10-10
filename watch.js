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
        item.append(tag, link);
        board.appendChild(item);
      });
    });
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
    document.getElementById('watch-refresh')?.addEventListener('click', latest);
    if (!window.__jozefWatchTimer) {
      window.__jozefWatchTimer = window.setInterval(() => {
        if (document.hidden) return;
        const room = document.getElementById('watch');
        if (room && !room.classList.contains('active')) return;
        latest();
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
