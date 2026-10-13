'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'versus-modes-2026.js'),'utf8');
const window={};
vm.runInNewContext(code,{window,Math,Number,Object},{timeout:3000});
const rules=window.JozefVersusRules;
test('mode configurations are finite and explicit',()=>{
 assert.deepEqual(Object.keys(rules.MODES).sort(),['classic','cup','duo','first5','golden','penalties']);
 for(const config of Object.values(rules.MODES)){
  assert.ok(config.seconds>0&&config.seconds<=180&&Number.isFinite(config.limit));
 }
 assert.equal(rules.config('classic').limit,3);
 assert.equal(rules.config('first5').limit,5);
 assert.equal(rules.config('golden').limit,1);
});
test('host ignores invalid modes and prevents solo-only or co-op-only mismatch',()=>{
 assert.equal(rules.safeMode('unknown',false,false),'classic');
 assert.equal(rules.safeMode('__proto__',true,true),'classic');
 assert.equal(rules.safeMode('cup',true,false),'classic');
 assert.equal(rules.safeMode('cup',false,true),'cup');
 assert.equal(rules.safeMode('duo',false,false),'classic');
 assert.equal(rules.safeMode('duo',true,false),'duo');
});
test('penalty attempts alternate shooters; co-op rotates both players',()=>{
 assert.deepEqual(Array.from({length:6},(_,n)=>rules.penaltyShooter(n,false)),['Dad','Jozef','Dad','Jozef','Dad','Jozef']);
 assert.deepEqual(Array.from({length:8},(_,n)=>rules.penaltyShooter(n,true)),['Dad','Rovers','Jozef','Rovers','Dad','Rovers','Jozef','Rovers']);
});
test('predictive AI plans can react to threatening shots without leaving the field',()=>{
 const bot={x:500,y:210},ball={x:390,y:155,vx:6,vy:3};
 const a=rules.tacticalTarget(bot,ball,720,'rookie');
 const b=rules.tacticalTarget(bot,ball,720,'legend');
 assert.ok(b.speed>a.speed);
 assert.ok(a.x>=64&&a.x<=656&&a.y>=50&&a.y<=370);
 assert.ok(b.x>=64&&b.x<=656&&b.y>=50&&b.y<=370);
 assert.equal(rules.cupDifficulty(0),'rookie');
 assert.equal(rules.cupDifficulty(1),'pro');
 assert.equal(rules.cupDifficulty(2),'legend');
});
test('authoritative match code guards penalty shootouts, sends room mode, and records combo assists',()=>{
 const js=fs.readFileSync(path.join(root,'versus.js'),'utf8');
 assert.match(js,/room\.mode=rules\.safeMode\(msg\.mode,room\.together,false\)/);
 assert.match(js,/room\.mode==='penalties'\)\{stepPenalty\(\);return;\}/);
 assert.match(js,/state\.combo\.assists\+\+/);
 assert.match(js,/pen\.turn\+\+/);
 assert.match(js,/rules\.tacticalTarget/);
 assert.match(js,/room\.mode==='duo'/);
 assert.match(js,/jozefs-world-versus-cup-stage/);
});
