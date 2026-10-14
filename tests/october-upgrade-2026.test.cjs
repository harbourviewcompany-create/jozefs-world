'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('canonical pages ship quick dock, broadcast and offline assets',()=>{
 const index=read('index.html');assert.equal(index,read('world.html'));
 for(const asset of ['family-navigation-2026.js','family-navigation-2026.css','versus-broadcast-2026.js','versus-broadcast-2026.css']){
  if(asset.endsWith('.css'))assert.ok(read('site-experience.css').includes('/* BEGIN '+asset+' */'),'bundled CSS '+asset);
  else assert.ok(index.includes(asset),'homepage loads '+asset);
  assert.ok(read('sw.js').includes("'./"+asset+"'"),'offline precaches '+asset);
 }
});
test('shared quick play reuses existing XP and does not overwrite progression',()=>{
 const js=read('family-navigation-2026.js');
 assert.match(js,/jozefs-world-player-v1/);
 assert.match(js,/window\.showSection/);
 assert.match(js,/jozef:progress/);
 assert.doesNotMatch(js,/localStorage\.setItem/,'no competing progress store');
});
test('3D network uses heartbeat and foreground recovery without breaking old save keys',()=>{
 const js=read('block-world-3d.js');
 assert.match(js,/m\.t==='ping'/);assert.match(js,/m\.t==='pong'/);
 assert.match(js,/now-lastRx>25000/);
 assert.match(js,/document\.hidden/);
 assert.match(js,/phoneGPU/);
 assert.match(js,/averageFps/);
 assert.match(js,/const CH=12,MAX_Y=27,R=2,KEY='jozefs-block-3d-v1'/);
});
test('HQ globe renders only while visible and restores its selected plate',()=>{
 const js=read('world-core.js');
 assert.match(js,/return visible&&/);
 assert.match(js,/jozefs-world-hq-plate/);
 assert.match(js,/lastDraw<32/);
});
test('Versus retains room identity and tolerates mobile reconnect',()=>{
 const js=read('versus.js');
 assert.match(js,/if\(reconnectAttempts>=5\)/);
 assert.match(js,/same approved player/);
 assert.match(js,/60[0]{3}\);/);
 assert.match(js,/window\.addEventListener\('pageshow'/);
});
test('visual screenshot jobs include reload comparison on both mobile engines',()=>{
 const js=read('tests/visual-regression-2026.cjs');
 assert.match(js,/comparePixels/);
 assert.match(js,/page\.reload/);
 assert.match(js,/chromium/);assert.match(js,/webkit/);
 const workflow=read('.github/workflows/visual-regression-2026.yml');
 assert.match(workflow,/upload-artifact/);
});
