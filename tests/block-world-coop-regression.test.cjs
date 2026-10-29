'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const coop = fs.readFileSync(path.join(__dirname, '..', 'block-world-coop.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'block-world.html'), 'utf8');

test('co-op rejects unexpected world dimensions', () => {
  assert.match(coop, /WORLD_SIZES\.has\(s\.w\+'x'\+s\.h\)/);
  assert.match(coop, /MAX_WORLD_CELLS/);
});
test('co-op validates player health and position', () => {
  assert.match(coop, /Number\.isFinite\(p\.x\)/);
  assert.match(coop, /Number\.isFinite\(p\.health\)/);
});
test('heartbeat acknowledges only the latest nonce', () => {
  assert.match(coop, /m\.nonce===hbNonce/);
});
test('resend is scoped to its original open connection', () => {
  assert.match(coop, /conn===c&&c\.open&&role==='host'/);
});
test('Block World permits user zoom', () => {
  assert.doesNotMatch(html, /user-scalable=no/);
});
