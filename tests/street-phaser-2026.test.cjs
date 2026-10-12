'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('Street Phaser has a full playable stage and touch steering',()=>{
 const source=fs.readFileSync(path.join(root,'street-phaser.js'),'utf8');
 assert.match(source,/this\.input\.on\('pointerdown'/);
 assert.match(source,/this\.input\.on\('pointermove'/);
 assert.match(source,/pointer\.worldX\/\(W\/3\)/);
 assert.match(source,/this\.player=this\.add\.container/);
 assert.match(source,/item\.kind==='defender'/);
 assert.match(source,/item\.kind==='shield'/);
 assert.match(source,/item\.kind==='gold'/);
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
});
