import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../jozefworld-frontier-3d-checkpoint.js',import.meta.url),'utf8');
const factory=async commit=>{
  globalThis.__jwCheckpointTestCommit=commit;
  const transformed=source.replace(/^import \{commitFrontierWorld\} from .*;\s*/m,
    'const commitFrontierWorld=globalThis.__jwCheckpointTestCommit;');
  return import('data:text/javascript;charset=utf-8,'+encodeURIComponent(transformed)+'#'+Math.random());
};
test('checkpoint uses existing commit adapter and preserves world properties',async()=>{
  let captured;
  const {commitSimulationWorld}=await factory((next,opts)=>{captured={next,opts};return {ok:true}});
  const world={version:1,seed:72631,year:2,stock:{wood:5},buildings:{'1,1':'home'}};
  const result=commitSimulationWorld(world,[{id:'a',job:'Farmer',activity:'Working',npc:{root:{position:{x:-23,z:-23}}}}]);
  assert.equal(result.ok,true);
  assert.equal(captured.next.stock.wood,5);
  assert.equal(captured.next.simulationCheckpoint.citizens[0].x,1);
  assert.equal(world.simulationCheckpoint,undefined);
});
test('failed backup commit does not claim checkpoint success',async()=>{
  const {commitSimulationWorld}=await factory(()=>({ok:false,reason:'Recovery backup could not be saved'}));
  const result=commitSimulationWorld({seed:1,year:1},[]);
  assert.equal(result.ok,false);
  assert.equal(result.world,undefined);
});
test('checkpoint revision increases without deleting prior world fields',async()=>{
  const {commitSimulationWorld}=await factory(()=>({ok:true}));
  const first=commitSimulationWorld({seed:1,year:1,simulationCheckpoint:{revision:3},custom:'keep'},[]);
  assert.equal(first.world.simulationCheckpoint.revision,4);
  assert.equal(first.world.custom,'keep');
});
test('3D game loop uses checkpointed save for production and year advance',async()=>{
  const game=await readFile(new URL('../jozefworld-frontier-3d.js',import.meta.url),'utf8');
  assert.match(game,/commitSimulationWorld\(next,living\.characters,\{reason:'Before resource production'\}\)/);
  assert.match(game,/commitSimulationWorld\(next,living\.characters,\{reason:'Before year advance'\}\)/);
});
