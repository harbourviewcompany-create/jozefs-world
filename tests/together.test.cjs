'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const rules=require('../together.js');
const root=path.resolve(__dirname,'..');
test('two heroes can reach all story stages without crossing walls',()=>{
 for(let stage=0;stage<3;stage++){
  for(let hero=0;hero<2;hero++){
   const from={x:rules.HEROES[hero].start[0],y:rules.HEROES[hero].start[1]};
   const other=rules.HEROES[1-hero].start;
   const path=rules.pathTo(from,rules.STAGES[stage].targets[hero],{x:other[0],y:other[1]});
   assert.ok(path?.length>0,'stage '+stage+' hero '+hero+' has a safe route');
   let current=from;
   for(const [x,y] of path){
     assert.equal(rules.own(x,y),true);
     assert.equal(Math.abs(x-current.x)+Math.abs(y-current.y),1);
     current={x,y};
   }
   assert.deepEqual([current.x,current.y],rules.STAGES[stage].targets[hero]);
  }
 }
});
test('all six optional sparks are reachable without stepping into walls',()=>{
 const pieces=rules.FRAGMENTS.flat();assert.equal(pieces.length,6);
 for(const piece of pieces){
  assert.equal(rules.own(piece.x,piece.y),true,piece.id+' should be on a walkable tile');
  assert.ok(rules.pathTo({x:1,y:1},[piece.x,piece.y],{x:1,y:6}),piece.id+' has a route');
 }
});
test('saved co-op chapter resumes only from validated checkpoints',()=>{
 const fresh=rules.fresh();assert.equal(fresh.stage,0);
 assert.equal(rules.sanitize({stage:3,clues:[true,true]}).stage,2);
 assert.equal(rules.sanitize({stage:4,won:false,clues:[true,true]}).stage,2);
 assert.equal(rules.sanitize({stage:4,won:true,clues:[true,true]}).stage,4);
 assert.equal(rules.sanitize({difficulty:'challenge'}).difficulty,'challenge');
 assert.equal(rules.sanitize({difficulty:'malformed'}).difficulty,'story');
 assert.equal(rules.sanitize({fragments:['0-0','1-0','0-0','bad']}).fragments.length,2);
 assert.equal(rules.sanitize({stage:2,clues:[false,false]}).stage,0);
 const bad=rules.sanitize({positions:[{x:4,y:2},{x:4,y:2}],stage:0});
 assert.deepEqual(bad.positions,fresh.positions);
});
test('team relay requires both heroes to activate consoles independently',()=>{
 const pos=[{x:3,y:5},{x:1,y:6}];
 assert.equal(rules.canPulse(1,0,pos),true);
 assert.equal(rules.canPulse(1,1,pos),false);
 assert.equal(rules.consolesReady(pos,[true,false]),false);
 pos[1]={x:9,y:2};
 assert.equal(rules.canPulse(1,1,pos),true);
 assert.equal(rules.consolesReady(pos,[true,true]),true);
 assert.equal(rules.consolesReady(pos,[true,false]),false);
 pos[0]={x:3,y:4};
 assert.equal(rules.consolesReady(pos,[true,true]),false);
 assert.equal(rules.canPulse(1,0,pos),false);
 const saved=rules.sanitize({stage:1,clues:[true,true],positions:[{x:3,y:4},{x:9,y:2}],signals:[true,true]});
 assert.deepEqual(saved.signals,[false,true]);
});
test('controllers and finalist shield use deterministic valid inputs',()=>{
 const pad={connected:true,axes:[.8,.1],buttons:Array.from({length:16},(_,i)=>({pressed:i===0}))};
 assert.deepEqual(rules.readPad(pad),{dx:1,dy:0,act:true,switchHero:false});
 pad.axes=[0,0];pad.buttons[0].pressed=false;pad.buttons[12].pressed=true;
 assert.equal(rules.readPad(pad).dy,-1);
 assert.equal(rules.readPad(null).act,false);
 assert.deepEqual([0,1,2].map(rules.shieldFor),[1,0,2]);
});
test('shared game has a visible launch, Club backup and offline source',()=>{
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const html=read('index.html');
 assert.equal(html,read('world.html'));
 assert.match(read('index.html'),/id="jw-together-game"/);
 assert.match(read('index.html'),/src="together\.js"/);
 assert.match(read('sw.js'),/'\.\/together\.js'/);
 assert.match(read('sw.js'),/'\.\/together-renderer\.js'/);
 assert.match(html,/src="together-renderer\.js"/);
 assert.match(read('clubhouse.js'),/'jozefs-world-together-v1'/);
 assert.match(html,/id="jw-together-club-cup"/);
 assert.match(html,/OUR SHARED LEGENDS/);
 assert.match(read('ui-refine-2026.css'),/#jw-together-club-perfect\[hidden\]/);
});
