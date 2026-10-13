'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const kit=require('../family-backup.js');
function storage(init={}){
 const m=new Map(Object.entries(init));
 return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),state:m};
}
const grid=(version=3)=>({version,world:Array.from({length:72},()=>Array(180).fill(2)),players:[{x:10,y:10},{x:20,y:20}]});
const world3D=()=>({version:1,seed:994,edits:[['2,11,3',4]],hero:{x:3,y:12,z:7},realm:0});
const realms=()=>({version:1,baseSeed:994,dimensions:{0:{seed:994,edits:[['2,11,3',4]],bossHp:110}}});
test('family backup transfers all games, 2D/3D realms and IndexedDB recovery, not private pairing codes',async()=>{
 const s=storage({
  'jozefs-world-player-v1':JSON.stringify({xp:1520,goals:11}),
  'jozefs-world-block-v3':JSON.stringify(grid()),
  'jozefs-block-3d-v1':JSON.stringify(world3D()),
  'jozefs-block-3d-dimensions-v1':JSON.stringify(realms()),
  'jozefs-world-family-pair-v1':'SECRET_128_BIT_FAMILY_CODE',
  'jozefs-world-ghost-v1':JSON.stringify({best:'JG1.'+'x'.repeat(1100)})
 });
 const previous=grid(4);previous.seed=998;
 const backup=kit.create(s,previous);
 assert.equal(backup.format,kit.FORMAT);
 assert.equal(backup.version,2);
 assert.deepEqual(backup.indexedDb2D,previous);
 assert.equal(backup.data['jozefs-world-family-pair-v1'],undefined);
 assert.ok(JSON.stringify(backup).length<kit.MAX_BYTES);
 const other=storage({'jozefs-world-player-v1':'{"xp":10}','jozefs-world-family-pair-v1':'my-own-family-pair'});
 let mirror=null;
 const result=await kit.restore(JSON.stringify(backup),other,{read:async()=>null,write:async x=>{mirror=x;}});
 assert.equal(result.activities,5);
 assert.equal(result.worlds,4);
 assert.equal(JSON.parse(other.getItem('jozefs-world-player-v1')).xp,1520);
 assert.equal(other.getItem('jozefs-world-family-pair-v1'),'my-own-family-pair');
 assert.equal(JSON.parse(other.getItem('jozefs-block-3d-dimensions-v1')).dimensions[0].bossHp,110);
 assert.equal(mirror.seed,998);
});
test('rejects mutated worlds and unlisted private state before touching storage',async()=>{
 const s=storage({'jozefs-world-player-v1':'{"xp":4}'});
 const base=kit.create(s);
 for(const invalid of [
   {...base,data:{...base.data,'jozefs-world-family-pair-v1':'SECRET'}},
   {...base,data:{...base.data,'jozefs-world-block-v3':JSON.stringify({version:3,world:[[9]]})}},
   {...base,data:{...base.data,'jozefs-block-3d-v1':JSON.stringify({...world3D(),edits:[['__proto__',1]]})}},
   {...base,data:{...base.data,'jozefs-world-player-v1':'{"xp":-99}'}},
   {...base,indexedDb2D:{version:4,world:[]}},
   {...base,version:5}
 ]){
   await assert.rejects(kit.restore(invalid,s),Error);
   assert.equal(s.getItem('jozefs-world-player-v1'),'{"xp":4}');
 }
});
test('storage write failure rolls back every changed world and the recovery snapshot',async()=>{
 const backup=kit.create(storage({
  'jozefs-world-player-v1':'{"xp":100}',
  'jozefs-block-3d-v1':JSON.stringify(world3D())
 }),grid(4));
 const m=new Map([['jozefs-world-player-v1','{"xp":15}'],['jozefs-block-3d-v1','{"version":1}']]);
 let attempts=0,mirror=grid(4);mirror.seed=17;
 const s={
   getItem:k=>m.get(k)??null,
   setItem(k,v){if(k==='jozefs-block-3d-v1'&&attempts++===0)throw Error('Quota exceeded');m.set(k,v);},
   removeItem:k=>m.delete(k)
 };
 const db={read:async()=>mirror,write:async x=>{mirror=x;}};
 await assert.rejects(kit.restore(backup,s,db),/Quota exceeded/);
 assert.equal(JSON.parse(m.get('jozefs-world-player-v1')).xp,15);
 assert.equal(JSON.parse(m.get('jozefs-block-3d-v1')).version,1);
 assert.equal(mirror.seed,17);
});
test('older game records on a new device survive partial family backup restores',async()=>{
 const pack=kit.create(storage({'jozefs-world-player-v1':'{"xp":99}'}));
 const second=storage({'jozefs-world-tour-v1':'{"season":8}'});
 await kit.restore(pack,second);
 assert.equal(second.getItem('jozefs-world-tour-v1'),'{"season":8}');
 assert.equal(JSON.parse(second.getItem('jozefs-world-player-v1')).xp,99);
});
test('legacy backup format remains delegated to existing Clubhouse importer',()=>{
 assert.throws(()=>kit.validate({format:'jozefs-world-local-backup',version:1,data:{}}),/Unrecognized/);
});