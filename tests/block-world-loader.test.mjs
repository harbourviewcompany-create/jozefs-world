import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
const root=new URL('../',import.meta.url);
test('2D loader and fallback parse as valid JavaScript',async()=>{
  for(const file of ['block-world.js','block-world-stable.js']){
    const source=await readFile(new URL(file,root),'utf8');
    assert.doesNotThrow(()=>new Script(source,{filename:file}));
  }
});
test('2D page references the current loader and its eleven world chunks',async()=>{
  const html=await readFile(new URL('block-world.html',root),'utf8');
  const loader=await readFile(new URL('block-world.js',root),'utf8');
  assert.match(html,/block-world\.js\?v=20261106-loader-diagnostics-v3/);
  assert.match(loader,/const n = 11/);
  assert.match(loader,/block-world-up-/);
  assert.match(loader,/__jw2dLoadFailure/);
});
test('2D loader does not embed literal escaped newline syntax',async()=>{
  const source=await readFile(new URL('block-world.js',root),'utf8');
  assert.equal(source.includes('};\\n  const'),false);
  assert.equal(source.includes("retry.');\\n"),false);
});
