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
