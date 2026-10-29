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

test('guest reconnect attempts do not stop permanently', () => {
  assert.doesNotMatch(coop, /if\(retryCount>=10\)\{loader\(false\);status\('Ask Daddy/);
  assert.match(coop, /Still looking for Daddy\. Retrying automatically/);
});
test('join timeout retains guest mode for retry', () => {
  assert.match(coop, /Daddy is offline\. Waiting and trying again automatically/);
});
test('backup import accepts expanded world sizes', () => {
  const adventure = fs.readFileSync(path.join(__dirname, '..', 'block-world-adventure.js'), 'utf8');
  assert.match(adventure, /280x110/);
  assert.match(adventure, /world\.world\.length!==world\.h/);
});

test('guest reconnect uses a new peer identity and bounded delay', () => {
  assert.match(coop, /Generate a fresh guest PeerJS ID on every reconnect/);
  assert.match(coop, /Math\.min\(15000,800\+retryCount\*500\)/);
});
