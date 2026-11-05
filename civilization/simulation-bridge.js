// Opt-in adapter for rendering scheduled citizens and calculating production.
// The host game supplies renderer.updateCitizen and simulation time.
// This module never starts timers, writes storage, or changes family authentication.
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./citizen-schedule.js') : root && root.JozefCitizenSchedule
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JozefSimulationBridge = api;
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function (schedules) {
  'use strict';
  function frame(citizens, roads, minute, renderer, options) {
    if (!Array.isArray(citizens) || citizens.length > 10000) throw new RangeError('Invalid citizen count');
    if (!Number.isFinite(minute)) throw new TypeError('Invalid simulation time');
    const states = [];
    const production = Object.create(null);
    for (const citizen of citizens) {
      const state = schedules.at(citizen, roads, minute, options);
      if (!state) continue;
      states.push(state);
      if (renderer && typeof renderer.updateCitizen === 'function') {
        renderer.updateCitizen(state.citizenId, { ...state.position }, state.activity);
      }
      if (state.activity === 'working' && citizen && citizen.job && typeof citizen.job === 'object') {
        const { resource, unitsPerHour } = citizen.job;
        if (typeof resource === 'string' && /^[a-z][a-z0-9_-]{0,39}$/i.test(resource) &&
            Number.isFinite(unitsPerHour) && unitsPerHour >= 0 && unitsPerHour <= 10000) {
          production[resource] = (production[resource] || 0) + unitsPerHour;
        }
      }
    }
    return { states, productionPerHour: { ...production } };
  }
  return Object.freeze({ frame });
});
