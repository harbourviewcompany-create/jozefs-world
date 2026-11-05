'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { at } = require('../civilization/citizen-schedule.js');
const roads = Object.freeze([{x:1,z:0},{x:2,z:0},{x:3,z:0}]);
const citizen = Object.freeze({id:'worker',home:Object.freeze({x:0,z:0}),work:Object.freeze({x:4,z:0})});
test('citizen stays home overnight and works during the day', () => {
  assert.equal(at(citizen, roads, 60).activity, 'home');
  assert.deepEqual(at(citizen, roads, 60).position, citizen.home);
  assert.equal(at(citizen, roads, 720).activity, 'working');
  assert.deepEqual(at(citizen, roads, 720).position, citizen.work);
});
test('citizen commutes out and returns on the road network', () => {
  assert.deepEqual(at(citizen, roads, 420).position, citizen.home);
  assert.deepEqual(at(citizen, roads, 450).position, {x:2,z:0});
  assert.equal(at(citizen, roads, 450).activity, 'commuting-to-work');
  assert.deepEqual(at(citizen, roads, 1050).position, {x:2,z:0});
  assert.equal(at(citizen, roads, 1050).activity, 'commuting-home');
  assert.deepEqual(at(citizen, roads, 1080).position, citizen.home);
});
test('unreachable commute never invents a route', () => {
  const state = at(citizen, [], 450);
  assert.equal(state.activity, 'route-unavailable');
  assert.equal(state.roadConnected, false);
  assert.deepEqual(state.position, citizen.home);
});
test('simulation time wraps safely and does not mutate inputs', () => {
  assert.deepEqual(at(citizen, roads, -1), at(citizen, roads, 1439));
  assert.equal(at(citizen, roads, NaN), null);
  assert.equal(roads.length, 3);
  assert.equal(citizen.id, 'worker');
});
