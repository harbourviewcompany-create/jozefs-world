'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('both entry points use exactly two ordered local CSS bundles',()=>{
 for(const htmlName of ['index.html','world.html']){
  const html=read(htmlName);
  const local=[...html.matchAll(/<link rel="stylesheet" href="([^"]+\.css)"\s*\/>/g)].map(m=>m[1]);
  assert.deepEqual(local,['site-foundation.css','site-experience.css'],htmlName);
  assert.equal((html.match(/src="arena-bundle\.js"/g)||[]).length,1,htmlName);
 }
});
test('bundles retain cascade and do not introduce remote CSS dependencies',()=>{
 const foundation=read('site-foundation.css'),experience=read('site-experience.css');
 const first=['styles.css','pitch.css','extras.css','tournament.css','career.css','clubhouse.css','scramble-positions.css','stadium.css','arcade.css','arena.css','playmode.css','notes.css','visual-2026.css','arena-visual.css','campaign-2026.css'];
 const second=['training.css','jersey-bingo.css','matchday.css','mobile-qa-2026.css','broadcast.css','album.css','sports.css','club-hq.css','chronicle.css','locker.css','multisport.css','sports-stage.css','playbook.css','street-powerups.css','hq.css','watch.css','ui-refresh.css','arena-compact.css','ui-refine-2026.css'];
 for(const [css,names] of [[foundation,first],[experience,second]]){
  let pos=0;
  for(const name of names){
   const offset=css.indexOf('/* BEGIN '+name+' */',pos);
   assert.ok(offset>=pos,'CSS source out of order: '+name);
   pos=offset+name.length;
  }
  assert.doesNotMatch(css,/@import\s+url\(https?:/i);
 }
});
test('offline shell caches only the new consolidated site styles',()=>{
 const sw=read('sw.js');
 for(const asset of ['site-foundation.css','site-experience.css','arena-bundle.js']){
  assert.ok(sw.includes("'./"+asset+"'"),asset+' missing offline');
 }
 assert.ok(!sw.includes("'./arena-compact.css'"),'old standalone styles should not be precached');
});

test('both entrypoints retain the mobile layout and graphics settings',()=>{
 for(const entry of ['index.html','world.html']){
  const html=read(entry);
  for(const id of ['arena-mobile-layout','arena-graphics-mode','arena-control-mode','arena-handedness']){
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,entry+' lost '+id);
  }
 }
});
