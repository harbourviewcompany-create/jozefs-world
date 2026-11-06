'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {assess,apply}=require('../civilization/coop-revisions.js');
const world=(revision=1,seed=7)=>({version:1,seed,year:1,buildings:{'1,1':'home'},stock:{wood:1,stone:1,food:1,coins:1},simulationCheckpoint:{version:1,revision,year:1,citizens:[]}});
test('untrusted, stale and unrelated worlds are rejected',()=>{
  assert.equal(assess(world(1),world(2)).status,'unauthorized');
  assert.equal(assess(world(2),world(1),{authorized:true}).status,'stale');
  assert.equal(assess(world(1),world(2,8),{authorized:true}).status,'different-world');
});
test('missing authorization or confirmation never writes',async()=>{
  let writes=0;
  const commit=()=>{writes++;return {ok:true}};
  assert.equal((await apply(world(1),world(2),{commit})).status,'unconfigured');
  assert.equal((await apply(world(1),world(2),{authorize:async()=>false,confirm:async()=>true,commit})).status,'unauthorized');
  assert.equal((await apply(world(1),world(2),{authorize:async()=>true,confirm:async()=>false,commit})).status,'declined');
  assert.equal(writes,0);
});
test('confirmed authorized revision delegates to backup-first writer',async()=>{
  const calls=[];
  const result=await apply(world(1),world(2),{
    authorize:async()=>true,
    confirm:async()=>true,
    commit:async(next,opts)=>{calls.push(opts.reason);return {ok:true}}
  });
  assert.equal(result.status,'applied');
  assert.deepEqual(calls,['Before cooperative world update']);
});
test('backup failure preserves local world',async()=>{
  const original=world(1);
  const result=await apply(original,world(2),{
    authorize:async()=>true,confirm:async()=>true,
    commit:async()=>({ok:false,reason:'Recovery backup could not be saved'})
  });
  assert.equal(result.status,'save-failed');
  assert.equal(original.simulationCheckpoint.revision,1);
});
test('malformed world payload cannot reach persistence',async()=>{
  let writes=0;
  const incoming=world(2);incoming.buildings['99,99']='home';
  const result=await apply(world(1),incoming,{
    authorize:async()=>true,confirm:async()=>true,
    commit:async()=>{writes++;return {ok:true}}
  });
  assert.equal(result.status,'invalid');
  assert.equal(writes,0);
});
