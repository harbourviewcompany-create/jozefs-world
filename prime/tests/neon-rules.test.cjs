'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let rules;
test('Neon City game rules load as a standalone ES module',async()=>{
 rules=await import('../src/neon-rules.js');
 assert.equal(rules.COLS,16);assert.equal(rules.ROWS,10);
 assert.equal(rules.STARS.length,5);assert.equal(rules.BEACONS.length,2);
});
test('shared original saves are not replaced or duplicated',()=>{
 const prior={completed:[1],stars:['1-star-0','0-star-0'],switches:['0-switch-0'],
  secrets:['2-secret-0'],outfit:'neon',coop:true,zone:1};
 const s=rules.clean(prior);
 assert.deepEqual(s.completed,[1]);assert.deepEqual(s.secrets,['2-secret-0']);
 assert.equal(s.coop,true);assert.equal(s.zone,1);
 const update=rules.collect(s,[7,2]);
 assert.equal(update.event,'star');assert.ok(update.state.stars.includes('1-star-0'));
 assert.equal(update.state.stars.length,3);
 assert.equal(rules.collect(update.state,[7,2]).event,null);
 const store=new Map(),api={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 assert.equal(rules.save(api,update.state),true);
 assert.deepEqual(rules.load(api),update.state);
});
test('every reward and finale can be navigated without walls',()=>{
 for(const p of [...rules.STARS,...rules.SECRETS,...rules.BEACONS,[13,7],[14,8]]){
  const walk=rules.path([1,1],p);assert.ok(walk,'unreachable '+p);
  let prev=[1,1];
  for(const tile of walk){
   assert.equal(rules.traversable(...tile),true);
   assert.equal(Math.abs(tile[0]-prev[0])+Math.abs(tile[1]-prev[1]),1);
   prev=tile;
  }
 }
 assert.equal(rules.path([1,1],[4,2]),null);
 assert.equal(rules.path([1,1],[2,1],[2,1]),null);
});
test('champion cannot be awarded until two stars and both switches',()=>{
 const s=rules.clean({completed:[],stars:['0-star-0'],switches:['0-switch-0','0-switch-1']});
 assert.equal(rules.champion(s).completed.length,0);
 const complete=rules.clean({...s,stars:['0-star-0','0-star-1'],secrets:['0-secret-0'],coop:true});
 const cleared=rules.champion(complete);
 assert.ok(cleared.completed.includes(0));assert.equal(cleared.outfit,'neon');
 assert.equal(cleared.coop,true);assert.deepEqual(cleared.secrets,['0-secret-0']);
 assert.deepEqual(rules.champion(cleared).completed,[0]);
});
test('Vite compiles the game separately while keeping classic Adventure accessible',()=>{
 const p=read=>fs.readFileSync(path.join(root,read),'utf8');
 assert.match(p('vite.config.mjs'),/neon-source\.html/);
 assert.match(p('scripts/stage-static.cjs'),/neon\.html/);
 assert.match(p('neon-source.html'),/src\/neon\.js/);
 assert.match(p('../index.html'),/prime\/neon\.html/);
 assert.equal(p('../index.html'),p('../world.html'));
});
