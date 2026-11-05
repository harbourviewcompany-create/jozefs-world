'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { build, route } = require('../civilization/road-network.js');
test('routes along connected road tiles without diagonal shortcuts', () => {
  const roads = [{x:0,z:0},{x:1,z:0},{x:2,z:0},{x:2,z:1}];
  assert.deepEqual(route(roads,{x:0,z:0},{x:2,z:1}), roads);
});
test('returns null for disconnected destinations and invalid endpoints', () => {
  const roads = [{x:0,z:0},{x:5,z:5}];
  assert.equal(route(roads,roads[0],roads[1]),null);
  assert.equal(route(roads,{x:0.5,z:0},roads[1]),null);
});
test('handles duplicate tiles and start equals destination', () => {
  const p={x:2,z:-3};
  assert.equal(build([p,p]).size,1);
  assert.deepEqual(route([p,p],p,p),[p]);
});
test('rejects oversized networks without mutating input', () => {
  const roads=[{x:0,z:0},{x:1,z:0}];
  assert.throws(()=>route(roads,roads[0],roads[1],{maxNodes:1}),RangeError);
  assert.equal(roads.length,2);
});
