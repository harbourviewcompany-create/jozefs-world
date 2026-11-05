// Deterministic, dependency-free road routing for the civilization simulation.
// Pure functions: never read or modify saved worlds or browser storage.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JozefRoadNetwork = api;
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function () {
  'use strict';
  const key = (x, z) => x + ',' + z;
  function tile(value) {
    if (!value || !Number.isSafeInteger(value.x) || !Number.isSafeInteger(value.z)) return null;
    return { x: value.x, z: value.z };
  }
  function build(roads, options) {
    const limit = Math.min(100000, Math.max(1, options && options.maxNodes || 20000));
    if (!Array.isArray(roads) || roads.length > limit) throw new RangeError('Road network size limit exceeded');
    const nodes = new Map();
    for (const value of roads) {
      const point = tile(value);
      if (point) nodes.set(key(point.x, point.z), point);
    }
    return nodes;
  }
  function route(roads, start, end, options) {
    const nodes = build(roads, options);
    const from = tile(start), to = tile(end);
    if (!from || !to || !nodes.has(key(from.x, from.z)) || !nodes.has(key(to.x, to.z))) return null;
    const origin = key(from.x, from.z), target = key(to.x, to.z);
    const queue = [origin], previous = new Map([[origin, null]]);
    let cursor = 0;
    while (cursor < queue.length) {
      const current = queue[cursor++];
      if (current === target) {
        const path = [];
        for (let k = target; k !== null; k = previous.get(k)) path.push(nodes.get(k));
        return path.reverse();
      }
      const p = nodes.get(current);
      for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const next = key(p.x + dx, p.z + dz);
        if (nodes.has(next) && !previous.has(next)) {
          previous.set(next, current);
          queue.push(next);
        }
      }
    }
    return null;
  }
  return Object.freeze({ build, route });
});
