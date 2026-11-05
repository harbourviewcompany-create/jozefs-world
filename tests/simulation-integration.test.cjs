'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { frame } = require('../civilization/simulation-bridge.js');
const cp = require('../civilization/simulation-checkpoint.js');
const citizen = { id:'a', home:{x:0,z:0}, work:{x:2,z:0}, job:{resource:'wood',unitsPerHour:3} };
const roads = [{x:1,z:0}];
test('renderer receives scheduled citizen positions', () => {
  const calls=[];
  const result=frame([citizen],roads,450,{updateCitizen:(...args)=>calls.push(args)});
  assert.equal(calls.length,1);
  assert.equal(calls[0][2],'commuting-to-work');
  assert.equal(result.productionPerHour.wood,undefined);
});
test('workers contribute to production only during working hours', () => {
  assert.equal(frame([citizen],roads,720).productionPerHour.wood,3);
  assert.equal(frame([citizen],roads,60).productionPerHour.wood,undefined);
});
test('checkpoint snapshots detach input and reject stale cooperative updates', () => {
  const original=[{id:'a'}];
  const first=cp.snapshot('family-world',1,720,original,{wood:2});
  original[0].id='changed';
  assert.equal(first.citizens[0].id,'a');
  const next=cp.snapshot('family-world',2,721,[],{wood:3});
  assert.equal(cp.reconcile(first,next).status,'requires-backup-and-authorization');
  assert.equal(cp.reconcile(next,first).status,'stale');
  assert.equal(cp.reconcile(first,cp.snapshot('other-world',3,722,[],{})).status,'different-world');
});
test('backup failure prevents checkpoint write',async()=>{
  const checkpoint=cp.snapshot('family-world',1,10,[],{});
  let writes=0;
  await assert.rejects(cp.persist(checkpoint,{backup:async()=>false,write:async()=>{writes++}}));
  assert.equal(writes,0);
});
test('confirmed backup precedes checkpoint write',async()=>{
  const calls=[];
  const checkpoint=cp.snapshot('family-world',1,10,[],{});
  await cp.persist(checkpoint,{backup:async()=>{calls.push('backup');return true},write:async()=>{calls.push('write')}});
  assert.deepEqual(calls,['backup','write']);
});
