/* JOZEF FC // DESIGN YOUR CLUB.
   Pick a crest shape, two colours, a mascot and a club name. The design is saved only in this
   browser, never uploaded, and every saved value is re-validated before it is drawn. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JozefClubDesignKit = api;
  if (root && root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => api.mount(root), { once: true });
    else api.mount(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const KEY = 'jozefs-world-club-design-v1';
  const SHAPES = Object.freeze([
    Object.freeze({ id: 'shield', label: 'Shield', d: 'M8 8 H92 V62 C92 92 66 108 50 114 C34 108 8 92 8 62 Z' }),
    Object.freeze({ id: 'round', label: 'Round', d: 'M4 58 a46 46 0 1 0 92 0 a46 46 0 1 0 -92 0 Z' }),
    Object.freeze({ id: 'gem', label: 'Gem', d: 'M50 4 L96 38 L96 80 L50 114 L4 80 L4 38 Z' }),
    Object.freeze({ id: 'hex', label: 'Hexagon', d: 'M28 8 H72 L96 58 L72 108 H28 L4 58 Z' })
  ]);
  const COLOURS = Object.freeze([
    ['lime', '#c8ff5a'], ['cyan', '#71e7e4'], ['gold', '#f6c56b'], ['orange', '#ff9f1c'],
    ['coral', '#ff7a6b'], ['red', '#e5383b'], ['pink', '#ff7ac8'], ['violet', '#a78bfa'],
    ['sky', '#5db6ff'], ['navy', '#12253d'], ['carbon', '#071116'], ['white', '#f4f7f5']
  ].map(([label, hex]) => Object.freeze({ label, hex })));
  const MASCOTS = Object.freeze([
    ['Ball', '⚽'], ['Lion', '🦁'], ['Dragon', '🐉'], ['Shark', '🦈'], ['Fox', '🦊'], ['Wolf', '🐺'],
    ['Eagle', '🦅'], ['Octopus', '🐙'], ['Dino', '🦖'], ['Rocket', '🚀'], ['Lightning', '⚡'], ['Tiger', '🐯'], ['Unicorn', '🦄']
  ].map(([label, icon]) => Object.freeze({ label, icon })));
  const DEFAULT = Object.freeze({ name: 'JOZEF FC', shape: 'shield', primary: '#c8ff5a', secondary: '#071116', mascot: '⚽', mascotName: '' });

  function sanitizeName(value, max = 14) {
    return String(value == null ? '' : value).replace(/[^A-Za-z0-9 &'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, max).toUpperCase();
  }
  const cleanColour = value => (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null);
  function normalize(raw) {
    const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const design = {
      name: sanitizeName(o.name) || DEFAULT.name,
      shape: SHAPES.some(s => s.id === o.shape) ? o.shape : DEFAULT.shape,
      primary: cleanColour(o.primary) || DEFAULT.primary,
      secondary: cleanColour(o.secondary) || DEFAULT.secondary,
      mascot: MASCOTS.some(m => m.icon === o.mascot) ? o.mascot : DEFAULT.mascot,
      mascotName: sanitizeName(o.mascotName)
    };
    design.custom = Object.keys(DEFAULT).some(k => design[k] !== DEFAULT[k]);
    return design;
  }
  const esc = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function inkFor(hex) {
    const n = parseInt((cleanColour(hex) || '#000000').slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.6 ? '#071116' : '#ffffff';
  }
  function initials(name) {
    const words = sanitizeName(name).split(' ').filter(Boolean);
    const letters = words.length > 1 ? words.map(w => w[0]).join('') : (words[0] || 'FC');
    return letters.slice(0, 3);
  }
  function crestSvg(design, idPrefix, shapeOverride) {
    const d = normalize(design);
    const shape = SHAPES.find(s => s.id === (shapeOverride || d.shape)) || SHAPES[0];
    const clip = String(idPrefix || 'club-crest').replace(/[^A-Za-z0-9_-]/g, '') + '-clip';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" role="img" aria-label="' + esc(d.name) + ' crest">' +
      '<defs><clipPath id="' + clip + '"><path d="' + shape.d + '"/></clipPath></defs>' +
      '<path d="' + shape.d + '" fill="' + d.primary + '"/>' +
      '<g clip-path="url(#' + clip + ')"><rect x="0" y="0" width="100" height="12" fill="' + d.secondary + '" opacity=".35"/>' +
      '<rect x="0" y="66" width="100" height="24" fill="' + d.secondary + '"/></g>' +
      '<path d="' + shape.d + '" fill="none" stroke="' + d.secondary + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<text x="50" y="58" text-anchor="middle" font-size="34">' + d.mascot + '</text>' +
      '<text x="50" y="84" text-anchor="middle" font-size="15" font-weight="900" font-family="system-ui,sans-serif" letter-spacing="1" fill="' + inkFor(d.secondary) + '">' + esc(initials(d.name)) + '</text></svg>';
  }

  function mount(win) {
    const doc = win.document;
    if (!doc || win.JozefClubDesign) return;
    let design = normalize(null);
    try { design = normalize(JSON.parse(win.localStorage.getItem(KEY) || 'null')); } catch (_) { design = normalize(null); }
    let crestCounter = 0;
    const $ = id => doc.getElementById(id);
    const status = message => { const el = $('club-design-status'); if (el) el.textContent = message; };

    function apply() {
      const root = doc.documentElement;
      root.style.setProperty('--club-primary', design.primary);
      root.style.setProperty('--club-secondary', design.secondary);
      root.classList.toggle('club-custom', design.custom);
      doc.querySelectorAll('[data-club-name]').forEach(el => { el.textContent = design.name; });
      doc.querySelectorAll('[data-club-crest]').forEach(el => {
        crestCounter += 1;
        el.innerHTML = crestSvg(design, 'club-crest-' + crestCounter);
      });
    }
    function persist() {
      try {
        const { name, shape, primary, secondary, mascot, mascotName } = design;
        win.localStorage.setItem(KEY, JSON.stringify({ name, shape, primary, secondary, mascot, mascotName }));
      } catch (_) { /* Design still works for this visit. */ }
    }
    function chipRow(containerId, items, isSelected, onPick, build) {
      const container = $(containerId);
      if (!container) return;
      container.replaceChildren();
      for (const item of items) {
        const button = doc.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(isSelected(item)));
        build(button, item);
        button.addEventListener('click', () => onPick(item));
        container.appendChild(button);
      }
    }
    function renderControls() {
      const preview = $('club-designer-preview');
      if (preview) {
        preview.innerHTML = crestSvg(design, 'club-preview');
        preview.setAttribute('aria-label', design.name + ' crest preview');
      }
      const caption = $('club-design-caption');
      if (caption) {
        const mascot = MASCOTS.find(m => m.icon === design.mascot);
        caption.textContent = design.mascotName ? 'Meet ' + design.mascotName + ' the ' + (mascot ? mascot.label : 'mascot') + '!' : 'Give your mascot a name!';
      }
      const name = $('club-design-name');
      if (name && doc.activeElement !== name) name.value = design.name;
      const mascotName = $('club-design-mascot-name');
      if (mascotName && doc.activeElement !== mascotName) mascotName.value = design.mascotName;
      chipRow('club-design-shapes', SHAPES, s => s.id === design.shape, s => update({ shape: s.id }), (button, s) => {
        button.className = 'club-chip club-chip-shape';
        button.setAttribute('aria-label', s.label + ' crest');
        button.innerHTML = crestSvg(design, 'club-shape-' + s.id, s.id);
      });
      const swatch = key => chipRow('club-design-' + key, COLOURS, c => c.hex === design[key], c => update({ [key]: c.hex }), (button, c) => {
        button.className = 'club-swatch';
        button.style.background = c.hex;
        button.setAttribute('aria-label', c.label);
        button.title = c.label;
      });
      swatch('primary');
      swatch('secondary');
      chipRow('club-design-mascots', MASCOTS, m => m.icon === design.mascot, m => update({ mascot: m.icon }), (button, m) => {
        button.className = 'club-chip club-chip-mascot';
        button.setAttribute('aria-label', m.label);
        button.textContent = m.icon;
      });
    }
    function update(change) {
      design = normalize({ ...design, ...change });
      persist(); apply(); renderControls();
      status('Saved on this device. Your arena team and Chronicle poster now use ' + design.name + '.');
      try { win.dispatchEvent(new win.Event('jozef:club-design')); } catch (_) { /* optional */ }
    }
    $('club-design-name')?.addEventListener('change', ev => update({ name: ev.target.value }));
    $('club-design-mascot-name')?.addEventListener('change', ev => update({ mascotName: ev.target.value }));
    $('club-design-reset')?.addEventListener('click', () => {
      design = normalize(null); persist(); apply(); renderControls();
      status('Back to the original Jozef FC crest.');
      try { win.dispatchEvent(new win.Event('jozef:club-design')); } catch (_) { /* optional */ }
    });
    win.JozefClubDesign = Object.freeze({ get: () => ({ ...design }), crestSvg: d => crestSvg(d || design, 'club-api') });
    apply(); renderControls();
  }

  return Object.freeze({ KEY, SHAPES, COLOURS, MASCOTS, DEFAULT, sanitizeName, cleanColour, normalize, inkFor, initials, crestSvg, mount });
});
