'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const groups=[
 {name:'site-core.js',files:['notes.js','app.js','extras.js']},
 {name:'site-features.js',files:['stadium.js','playmode.js','broadcast.js','album.js','sports.js','watch.js','locker.js','sports-stage.js','multisport.js','club-designer.js']}
];
test('site JavaScript bundles exactly match original sources and order',()=>{
 for(const g of groups){
  const expected='/* Generated browser scripts. Preserve order; do not edit directly. */\n'+
   g.files.map(p=>'\n/* BEGIN '+p+' */\n'+read(p).trimEnd()+'\n;\n').join('');
  assert.equal(read(g.name),expected,g.name+' drifted from its source modules');
 }
});
test('both entrypoints load one copy of each bundle while preserving deferred scripts',()=>{
 for(const htmlFile of ['index.html','world.html']){
  const html=read(htmlFile);
  const tags=[...html.matchAll(/<script\s+src="([^"]+)"([^>]*)><\/script>/g)]
   .map(m=>({src:m[1],defer:/\bdefer\b/.test(m[2])}));
  const names=tags.map(t=>t.src);
  for(const g of groups){
   assert.equal(names.filter(n=>n===g.name).length,1,htmlFile+' must include '+g.name);
   for(const original of g.files){
    assert.equal(names.includes(original),false,htmlFile+' still loads '+original);
   }
  }
  assert.equal(tags.find(t=>t.src==='site-core.js').defer,false);
  assert.equal(tags.find(t=>t.src==='site-features.js').defer,false);
  assert.ok(names.indexOf('site-core.js')<names.indexOf('arena-bundle.js'));
  assert.ok(names.indexOf('arena-bundle.js')<names.indexOf('site-features.js'));
  for(const name of ['tournament.js','career.js','scramble-positions.js','street.js','club-hq.js']){
   assert.ok(names.includes(name),name+' must remain available');
  }
  for(const name of ['tournament.js','career.js','scramble-positions.js']){
   assert.equal(tags.find(t=>t.src===name).defer,true);
  }
 }
});
test('PWA caches both ordered bundles instead of their original startup files',()=>{
 const sw=read('sw.js');
 for(const file of ['site-core.js','site-features.js','arena-bundle.js']){
  assert.ok(sw.includes("'./"+file+"'"),file+' must work offline');
 }
 for(const group of groups)for(const original of group.files){
  assert.ok(!sw.includes("'./"+original+"'"),original+' must not be precached');
 }
});
