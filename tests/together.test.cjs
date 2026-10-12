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
test('saved co-op chapter resumes only from validated checkpoints',()=>{
 const fresh=rules.fresh();assert.equal(fresh.stage,0);
 assert.equal(rules.sanitize({stage:3,clues:[true,true]}).stage,2);
 assert.equal(rules.sanitize({stage:4,won:false,clues:[true,true]}).stage,2);
 assert.equal(rules.sanitize({stage:4,won:true,clues:[true,true]}).stage,4);
 assert.equal(rules.sanitize({stage:2,clues:[false,false]}).stage,0);
 const bad=rules.sanitize({positions:[{x:4,y:2},{x:4,y:2}],stage:0});
 assert.deepEqual(bad.positions,fresh.positions);
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
 assert.match(read('clubhouse.js'),/'jozefs-world-together-v1'/);
 assert.match(html,/id="jw-together-club-cup"/);
 assert.match(html,/OUR SHARED LEGENDS/);
});
