'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { plan, positionAt } = require('../civilization/citizen-commute.js');
const roads = [{x:0,z:0},{x:1,z:0},{x:1,z:1}];
test('citizen commutes on connected road tiles', () => {
  const commute = plan({id:'worker-1',home:roads[0],work:roads[2]}, roads);
  assert.equal(commute.steps, 2);
  assert.deepEqual(commute.path, roads);
  assert.deepEqual(positionAt(commute, 0.25), {x:0.5,z:0});
  assert.deepEqual(positionAt(commute, 0.75), {x:1,z:0.5});
});
test('missing buildings or disconnected roads do not create phantom travel', () => {
  assert.equal(plan({home:roads[0]}, roads), null);
  assert.equal(plan({home:roads[0],work:{x:9,z:9}}, roads), null);
});
test('progress clamps and does not mutate the citizen or route', () => {
  const citizen = Object.freeze({id:2,home:roads[0],work:roads[2]});
  const commute = plan(citizen, roads);
  assert.deepEqual(positionAt(commute, -1), roads[0]);
  assert.deepEqual(positionAt(commute, 5), roads[2]);
  assert.equal(positionAt(commute, NaN), null);
  assert.equal(citizen.id, 2);
});

test('houses and workplaces connect through adjacent road entrances', () => {
  const network=[{x:1,z:0},{x:2,z:0},{x:3,z:0}];
  const commute=plan({id:'builder',home:{x:0,z:0},work:{x:4,z:0}},network);
  assert.deepEqual(commute.path,[{x:0,z:0},...network,{x:4,z:0}]);
  assert.equal(commute.steps,4);
});
test('building beside an isolated road cannot reach a different component', () => {
  const network=[{x:1,z:0},{x:8,z:0}];
  assert.equal(plan({home:{x:0,z:0},work:{x:9,z:0}},network),null);
});
test('invalid building coordinates are rejected without changing road data', () => {
  const network=Object.freeze([{x:1,z:0}]);
  assert.equal(plan({home:{x:0.25,z:0},work:{x:1,z:0}},network),null);
});
