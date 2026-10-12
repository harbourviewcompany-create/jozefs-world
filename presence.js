/* Live dots. Both phones must have the site open. No account. */
(() => {
  'use strict';
  const KEY = 'jozefs-world-who';
  const me = () => {
    try { return localStorage.getItem(KEY) || 'Dad'; } catch { return 'Dad'; }
  };
  const other = () => (me() === 'Dad' ? 'Jozef' : 'Dad');
  const dot = who => document.getElementById('dot-' + who.toLowerCase());
  function paint(online) {
    const mine = dot(me());
    const theirs = dot(other());
    if (mine) mine.classList.add('on');
    if (theirs) theirs.classList.toggle('on', online);
    const line = document.getElementById('hq-versus');
    if (line) line.textContent = online ? other() + ' is here.' : 'Waiting for ' + other() + '.';
  }
  function watch() {
    if (!window.Peer) return;
    const id = 'jw-live-' + me().toLowerCase();
    const peer = new Peer(id);
    peer.on('open', () => {
      paint(false);
      const link = () => {
        const conn = peer.connect('jw-live-' + other().toLowerCase());
        conn.on('open', () => paint(true));
        conn.on('close', () => paint(false));
      };
      link();
      setInterval(link, 8000);
      peer.on('connection', conn => {
        conn.on('open', () => paint(true));
        conn.on('close', () => paint(false));
      });
    });
    peer.on('error', () => paint(false));
  }
  document.querySelectorAll('[data-live-who]').forEach(button => {
    button.addEventListener('click', () => {
      try { localStorage.setItem(KEY, button.dataset.liveWho); } catch { /* this phone */ }
      location.reload();
    });
  });
  paint(false);
  watch();
})();
