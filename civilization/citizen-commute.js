// Pure citizen commute planner. Does not access or modify stored world data.
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./road-network.js') : root && root.JozefRoadNetwork);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JozefCitizenCommute = api;
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function (roads) {
  'use strict';
  function plan(citizen, roadTiles, options) {
    if (!roads || typeof roads.route !== 'function') throw new Error('Road network unavailable');
    if (!citizen || typeof citizen !== 'object') return null;
    const home = citizen.home, work = citizen.work;
    if (!home || !work) return null;
    const path = roads.route(roadTiles, home, work, options);
    return path ? { citizenId: citizen.id == null ? null : String(citizen.id), path, steps: path.length - 1 } : null;
  }
  function positionAt(commute, progress) {
    if (!commute || !Array.isArray(commute.path) || !commute.path.length || !Number.isFinite(progress)) return null;
    const path = commute.path;
    const t = Math.max(0, Math.min(1, progress)) * (path.length - 1);
    const index = Math.floor(t);
    const a = path[index], b = path[Math.min(index + 1, path.length - 1)];
    const f = t - index;
    return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
  }
  return Object.freeze({ plan, positionAt });
});
