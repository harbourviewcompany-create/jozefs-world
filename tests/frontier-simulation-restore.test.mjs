import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../jozefworld-frontier-3d-checkpoint.js',import.meta.url),'utf8');
const transformed=source.replace(/^import \{commitFrontierWorld\} from .*;\s*/m,'const commitFrontierWorld=()=>({ok:true});');
const {restoreSimulationCitizens}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(transformed));
const actor=(job='Farmer')=>{
  const position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
  return {job,npc:{root:{position}},route:[{x:1,z:1}],destination:'1,1',retryAt:500};
};
const checkpoint=(x,z,job='Farmer')=>({version:1,citizens:[{id:'0',job,x,z}]});
test('restores valid saved position and resets path state',()=>{
  const c=actor(), result=restoreSimulationCitizens(checkpoint(12,13),[c],{terrain:()=> 'grass',height:()=>2});
  assert.equal(result.restored,1);
  assert.deepEqual([c.npc.root.position.x,c.npc.root.position.y,c.npc.root.position.z],[-12,2,-11]);
  assert.deepEqual(c.route,[]);
  assert.equal(c.destination,'');
});
test('rejects water, invalid and mismatched citizen checkpoints',()=>{
  for(const cp of [checkpoint(12,13,'Mason'),checkpoint(-1,4),checkpoint(NaN,4)]) {
    const c=actor();
    assert.equal(restoreSimulationCitizens(cp,[c],{terrain:()=> 'grass'}).restored,0);
    assert.equal(c.npc.root.position.x,0);
  }
  assert.equal(restoreSimulationCitizens(checkpoint(12,13),[actor()],{terrain:()=> 'water'}).restored,0);
});
test('rejects oversized checkpoint arrays without moving citizens',()=>{
  const c=actor();
  assert.equal(restoreSimulationCitizens({version:1,citizens:Array(129).fill({})},[c],{terrain:()=> 'grass'}).skipped,true);
  assert.equal(c.npc.root.position.x,0);
});
test('3D startup restores only matching-year checkpoint',async()=>{
  const game=await readFile(new URL('../jozefworld-frontier-3d.js',import.meta.url),'utf8');
  assert.match(game,/saved\.simulationCheckpoint\?\.year===\(saved\.year\|\|1\)/);
  assert.match(game,/restoreSimulationCitizens\(saved\.simulationCheckpoint,living\.characters/);
});
