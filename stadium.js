/* Stadium page helpers. Safe if the cinematic markup is absent. */
(function () {
  'use strict';
  function text(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  function boot() {
    try {
      const career = JSON.parse(localStorage.getItem('jozefs-world-career-v1') || 'null');
      if (career && Number.isFinite(career.points)) text('studio-career-points', String(career.points).padStart(2, '0'));
    } catch (err) { /* ignore private storage */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
