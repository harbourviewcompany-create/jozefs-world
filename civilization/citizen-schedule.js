// Deterministic citizen day-cycle projection; no timers, storage, or world mutation.
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./citizen-commute.js') : root && root.JozefCitizenCommute);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JozefCitizenSchedule = api;
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function (commutes) {
  'use strict';
  const DAY = 24 * 60;
  function at(citizen, roadTiles, minute, options) {
    if (!Number.isFinite(minute) || !citizen || typeof citizen !== 'object') return null;
    const home = citizen.home, work = citizen.work;
    if (!home || !work) return null;
    const t = ((minute % DAY) + DAY) % DAY;
    // 07:00-08:00 commute; 08:00-17:00 work; 17:00-18:00 return.
    const outbound = t >= 420 && t < 480;
    const inbound = t >= 1020 && t < 1080;
    const working = t >= 480 && t < 1020;
    const trip = outbound || inbound ? commutes.plan(citizen, roadTiles, options) : null;
    const progress = outbound ? (t - 420) / 60 : inbound ? 1 - (t - 1020) / 60 : null;
    const position = trip ? commutes.positionAt(trip, progress) : working ? work : home;
    return {
      citizenId: citizen.id == null ? null : String(citizen.id),
      activity: trip ? (outbound ? 'commuting-to-work' : 'commuting-home') :
        working ? 'working' : outbound || inbound ? 'route-unavailable' : 'home',
      position: { x: position.x, z: position.z },
      roadConnected: !!trip
    };
  }
  return Object.freeze({ at });
});
