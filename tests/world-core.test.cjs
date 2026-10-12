'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {DESTINATIONS,hitTest,rotate,unrotate,sphereGeometry,plateGeometry}=require('../world-core.js');
const read=path=>fs.readFileSync(require('node:path').join(root,path),'utf8');
test('world core offers twelve distinct functional destination plates',()=>{
 assert.equal(DESTINATIONS.length,12);
 assert.equal(new Set(DESTINATIONS.map(x=>x.id)).size,12);
 assert.equal(DESTINATIONS.filter(x=>x.route||x.href).length,12);
 const html=read('world.html');
 for(const [name,id] of [['WebGL stage','jw-worldcore-canvas'],['destinations','jw-worldcore-index'],['enter control','jw-worldcore-enter'],['fallback','jw-worldcore-fallback'],['dashboard','jw-worldcore-dashboard']]){
  assert.ok(html.includes('id="'+id+'"'),name+' must be present');
 }
 assert.equal(html,read('index.html'));
});
test('raycasting selects the correct 3D plate after focusing it',()=>{
 for(let i=0;i<DESTINATIONS.length;i++){
  const n=DESTINATIONS[i].normal;
  const yaw=-Math.atan2(n[0],n[2]);
  const pitch=Math.atan2(n[1],Math.hypot(n[0],n[2]));
  const front=rotate(n,yaw,pitch);
  assert.ok(Math.abs(front[0])+Math.abs(front[1])<.00001,DESTINATIONS[i].id+' centered');
  assert.ok(front[2]>.9999,DESTINATIONS[i].id+' faces camera');
  assert.equal(hitTest(0,0,yaw,pitch),i,DESTINATIONS[i].id+' should be tappable');
  const original=unrotate(front,yaw,pitch);
  for(let j=0;j<3;j++)assert.ok(Math.abs(original[j]-n[j])<.0001);
 }
 assert.equal(hitTest(1.2,1.2,0,0),-1,'background is never a plate');
});
test('metallic globe and beveled plate are nonempty finite 3D meshes',()=>{
 const sphere=sphereGeometry();assert.ok(sphere.positions.length>10000);
 const normal=DESTINATIONS[0].normal;
 const geo=plateGeometry(normal);
 assert.equal(geo.positions.length,geo.normals.length);
 assert.equal(geo.positions.length,geo.tints.length*3);
 assert.ok(geo.tints.length>50);
 assert.ok([...geo.positions,...geo.normals].every(Number.isFinite));
 assert.ok(Math.max(...geo.tints)===1,'plate has distinct bevel material levels');
});
test('offline shell caches the HQ and safely preserves existing game code',()=>{
 const html=read('index.html'),sw=read('sw.js'),js=read('world-core.js'),css=read('world-core.css');
 assert.match(read('scripts/build-site-css.cjs'),/"world-core.css"/);
 assert.match(read('site-experience.css'),/\/\* BEGIN world-core.css \*\//);
 assert.match(html,/<script src="world-core.js"><\/script>/);
 assert.match(sw,/'.\/world-core.js'/);assert.match(sw,/'.\/world-core.css'/);
 assert.match(js,/getContext\('webgl'/);
 assert.match(js,/pointerdown/);assert.match(js,/pointermove/);assert.match(js,/pointerup/);
 assert.match(js,/webglcontextlost/);assert.match(js,/requestAnimationFrame/);
 assert.match(js,/JozefTogether/);assert.match(js,/showSection/);
 assert.match(css,/@media\(max-width:600px\)/);assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(css,/\.jw-worldcore-index/);
 assert.match(html,/id="jw-worldcore-prev"/);
 assert.match(html,/id="jw-worldcore-next"/);
 assert.match(js,/jw-worldcore-prev/);
 assert.match(js,/jw-worldcore-next/);
 assert.match(js,/float fresnel=/);
 assert.match(js,/float edge=exp/);
 assert.match(js,/uniform mediump float selected;/,'shared shader uniform precision must match on WebGL1');
 assert.match(js,/position=p\*\(1\.0\+selected\*\.018\)/);
 assert.match(js,/Math\.min\(root\.devicePixelRatio\|\|1,1\.9\)/);
 assert.doesNotMatch(js,/XMLHttpRequest|fetch\(|WebSocket|analytics|sendBeacon/);
});
