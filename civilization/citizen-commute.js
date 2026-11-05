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
    // Houses and workplaces normally occupy non-road tiles. Find road entrances
    // without requiring the building itself to be a road.
    const valid = p => p && Number.isSafeInteger(p.x) && Number.isSafeInteger(p.z);
    if (!valid(home) || !valid(work) || !Array.isArray(roadTiles)) return null;
    const entries = point => [point, {x:point.x+1,z:point.z}, {x:point.x-1,z:point.z},
      {x:point.x,z:point.z+1}, {x:point.x,z:point.z-1}];
    const network = roads.build(roadTiles, options);
    const candidates = point => entries(point).filter(p => network.has(p.x+','+p.z));
    let best = null;
    for (const entrance of candidates(home)) for (const exit of candidates(work)) {
      const roadPath = roads.route(roadTiles, entrance, exit, options);
      if (!roadPath) continue;
      const path = [home, ...roadPath, work].filter((p,i,a) => i===0 || p.x!==a[i-1].x || p.z!==a[i-1].z);
      if (!best || path.length < best.length) best = path;
    }
    return best ? { citizenId: citizen.id == null ? null : String(citizen.id), path: best, steps: best.length - 1 } : null;
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
