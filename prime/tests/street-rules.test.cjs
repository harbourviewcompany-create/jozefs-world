const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('@typescript/typescript6');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/street-rules.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(code, { exports: mod.exports, module: mod, Math }, { timeout: 1000 });
const { paceOf, collect } = mod.exports;

test('pace rises through the run', () => {
  assert.equal(paceOf(0), 0);
  assert.equal(paceOf(19), 1);
  assert.equal(paceOf(36), 2);
});

test('stars and shields score without losing a life', () => {
  const star = collect('star', 0, 0);
  assert.equal(star.score, 10);
  assert.equal(star.hearts, 0);
  const save = collect('defender', 3, 1);
  assert.equal(save.hearts, 0);
  assert.equal(save.shield, 0);
  const hit = collect('defender', 3, 0);
  assert.equal(hit.hearts, -1);
});
