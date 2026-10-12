/* Live dots. Both phones must have the site open. No account. */
(() => {
  'use strict';
  const KEY = 'jozefs-world-who';
  const me = () => {
    try { return localStorage.getItem(KEY) || 'Dad'; } catch { return 'Dad'; }
  };
  const other = () => (me() === 'Dad' ? 'Jozef' : 'Dad');
  const dot = who => document.getElementById('dot-' + who.toLowerCase());
  let wasOnline = false;
  const VOICE = 'jozefs-world-voice-alerts';
  function alertsOn() {
    try { return localStorage.getItem(VOICE) !== 'off'; } catch { return true; }
  }
  function voice(who, line) {
    if (!alertsOn() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const say = new SpeechSynthesisUtterance(line);
    say.rate = 0.95;
    say.pitch = who === 'Dad' ? 0.75 : 1.25;
    window.speechSynthesis.speak(say);
  }
  function paint(online) {
    const mine = dot(me());
    const theirs = dot(other());
    if (mine) mine.classList.add('on');
    if (theirs) theirs.classList.toggle('on', online);
    const line = document.getElementById('live-status');
    if (line) line.textContent = online ? other() + ' is here.' : 'Waiting for ' + other() + '.';
    if (online && !wasOnline) voice(other(), other() + ' is here.');
    if (!online && wasOnline) voice(other(), other() + ' left.');
    wasOnline = online;
  }
  document.getElementById('voice-alerts')?.addEventListener('click', () => {
    try { localStorage.setItem(VOICE, alertsOn() ? 'off' : 'on'); } catch { /* this phone */ }
    const button = document.getElementById('voice-alerts');
    if (button) button.textContent = alertsOn() ? 'Voice alerts on' : 'Voice alerts off';
    voice(me(), alertsOn() ? 'Voice alerts on.' : 'Voice alerts off.');
  });
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
  const button = document.getElementById('voice-alerts');
  if (button) button.textContent = alertsOn() ? 'Voice alerts on' : 'Voice alerts off';
  paint(false);
  watch();
})();
