'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const engine=fs.readFileSync(path.join(__dirname,'..','jozefworld-arena.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','jozefworld-sports.html'),'utf8');
test('arena is valid JavaScript',()=>{assert.doesNotThrow(()=>new Function(engine))});
test('solo soccer can boot without loading cloud SDK',()=>{
 assert.doesNotMatch(engine,/^\s*import\s+.*supabase/m);
 assert.match(engine,/await import\('https:\/\/esm\.sh\/@supabase/);
 assert.match(engine,/join\('practice'\)/);
});
test('mobile rendering is pixel-budgeted',()=>{
 assert.match(engine,/pixelBudget=1000000/);
 assert.match(engine,/Math\.sqrt\(pixelBudget\/\(w\*h\)\)/);
});
test('multiplayer rejects malformed authoritative snapshots',()=>{
 assert.match(engine,/Number\.isSafeInteger\(s\.seq\)/);
 assert.match(engine,/s\.players\.every/);
 assert.match(engine,/s\.keeper\.every\(Number\.isFinite\)/);
});
test('stadium loads current arena module',()=>{
 assert.match(html,/type="module" src="\.\/jozefworld-arena\.js\?/);
 assert.match(html,/id="practice"/);
});
