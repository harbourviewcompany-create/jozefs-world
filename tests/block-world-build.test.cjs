'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');

test('2D world source compiles into a valid browser script',()=>{
  const result=spawnSync(process.execPath,[path.join(root,'scripts/build-2d-engine.cjs')],{
    cwd:root,encoding:'utf8',timeout:20000
  });
  assert.equal(result.status,0,(result.stderr||'')+'\n'+(result.stdout||''));
  assert.match(result.stdout,/2D engine verified: [0-9]+ bytes, sha256 [a-f0-9]{64}/);
  const built=fs.readFileSync(path.join(root,'block-world-engine.js'),'utf8');
  assert.ok(built.length>1000,'compiled engine is not empty');
  assert.match(built,/BlockWorld/);
});

test('2D page uses the compiled engine, not the gzip/eval loader',()=>{
  const html=fs.readFileSync(path.join(root,'block-world.html'),'utf8');
  assert.match(html,/<script src="\.\/block-world-engine\.js\?v=[^"]+" defer/);
  assert.doesNotMatch(html,/<script src="\.\/block-world\.js\?/);
  assert.match(html,/window\.Jozef2DStartup\.fail/);
  assert.match(html,/block-world-network\.js[^"]*" defer/);
});
