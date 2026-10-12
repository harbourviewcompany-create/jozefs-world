'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const rules=require('../together.js'),root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('shared mystery has physically separate, reachable objectives for both heroes',()=>{
 assert.equal(rules.STAGES.length,5);
 const start=rules.HEROES.map(h=>({x:h.start[0],y:h.start[1]}));
 for(let stage=0;stage<3;stage++){
  const targets=rules.STAGES[stage].targets;
  assert.equal(targets.length,2);
  assert.notDeepEqual(targets[0],targets[1]);
  for(let who=0;who<2;who++){
   const route=rules.pathTo(start[who],targets[who],start[1-who]);
   assert.ok(route&&route.length>0,'stage '+stage+' hero '+who+' must have reachable destination');
   for(const p of route)assert.equal(rules.own(p[0],p[1]),true);
  }
 }
 assert.equal(rules.own(0,1),false);
 assert.equal(rules.own(4,3),false);
 assert.equal(rules.pathTo(start[0],[0,0],start[1]),null);
 assert.equal(rules.pathTo(start[0],[1,6],start[1]),null);
});
test('shared story restores safely from offline saves and keeps trophies on replay',()=>{
 assert.deepEqual(rules.sanitize(null),rules.fresh());
 const malformed=rules.sanitize({stage:800,won:false,clues:[true,false],positions:[{x:0,y:0},{x:4,y:3}]});
 assert.equal(malformed.stage,0);assert.deepEqual(malformed.clues,[true,false]);
 assert.deepEqual(malformed.positions,rules.fresh().positions);
 const checkpoint=rules.sanitize({stage:3,clues:[true,true],positions:[{x:5,y:2},{x:6,y:5}]});
 assert.equal(checkpoint.stage,2,'boss fight restarts safely without lost clues');
 const victory=rules.sanitize({stage:4,won:true,clues:[true,true]});
 assert.equal(victory.stage,4);assert.equal(victory.won,true);
 for(let round=0;round<9;round++)assert.ok(rules.shieldFor(round)>=0&&rules.shieldFor(round)<=2);
});
test('Together Mode ships visibly on both pages and is available offline and in Club backups',()=>{
 const html=read('index.html');
 assert.equal(html,read('world.html'));
 for(const id of ['jw-together-game','jw-together-canvas','jw-together-hero-0','jw-together-hero-1','jw-together-trophy','jw-together-shots','jw-together-replay'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-start-together/);
 assert.match(html,/src="together\.js"/);
 assert.match(read('sw.js'),/'\.\/together\.js'/);
 assert.match(read('clubhouse.js'),/'jozefs-world-together-v1'/);
 assert.match(read('site-experience.css'),/\.jw-together-game/);
});
