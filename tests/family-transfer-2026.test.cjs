'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const transfer=require('../family-transfer-2026.js'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('safe shared XP merge cannot count achievements twice or erase this device identity',()=>{
 const dad={xp:530,earned:['win-1','medal'],rewardedTours:['season-1'],goals:9,club:'Dad FC',avatar:'D',daily:{goal:2},day:'2026-10-14'};
 const child={xp:620,earned:['win-1','cup'],rewardedTours:['season-1','season-2'],goals:7,club:'Jozef FC',avatar:'J',daily:{goal:1},day:'2026-10-14'};
 const result=transfer.mergeProfile(child,dad);
 assert.equal(result.xp,620);assert.equal(result.goals,9);assert.equal(result.club,'Jozef FC');assert.equal(result.avatar,'J');
 assert.deepEqual(result.earned,['win-1','cup','medal']);assert.equal(result.rewardedTours.length,2);assert.equal(result.daily.goal,2);
 assert.deepEqual(transfer.mergeProfile(result,dad),result,'repeat transfer does not double award');
});
test('profile-only merge never overwrites separately saved worlds',()=>{
 const kit=require('../family-backup.js'),s={getItem:k=>k==='jozefs-world-player-v1'?'{"xp":900,"club":"Jozef"}':null};
 const pack=kit.create({getItem:k=>k==='jozefs-world-player-v1'?'{"xp":700,"earned":["badge"]}':k==='jozefs-world-block-v1'?'{"version":1,"world":"dad"}':null});
 const safe=transfer.mergePack(pack,s,kit);
 assert.deepEqual(Object.keys(safe.data),['jozefs-world-player-v1']);
 assert.equal(JSON.parse(safe.data['jozefs-world-player-v1']).xp,900);
});
test('transfer protocol rejects altered or oversized metadata',()=>{
 const valid={t:'begin',length:24001,bytes:24001,parts:3,sha:'a'.repeat(64)};
 assert.equal(transfer.validateMeta(valid),true);
 for(const patch of [{length:8000001},{parts:2},{bytes:9000000},{sha:'z'.repeat(64)}]){
  assert.equal(transfer.validateMeta({...valid,...patch}),false);
 }
});
test('parent and recipient both have affirmative approval controls',()=>{
 const src=read('family-transfer-2026.js');
 assert.match(src,/APPROVE SENDING SAVES/);
 assert.match(src,/APPROVE IMPORT/);
 assert.match(src,/SHA-256/);
 assert.match(src,/kit\.restore/);
 assert.match(src,/transferId\(/);
 assert.match(src,/ft-confirm/);
 assert.match(src,/if\(sent<meta\.parts\)/);
 for(const p of ['index.html','world.html'])assert.ok(read(p).includes('family-transfer-2026.js'));
 assert.ok(read('site-experience.css').includes('/* BEGIN family-transfer-2026.css */'));
});
