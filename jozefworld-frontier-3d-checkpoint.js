import {commitFrontierWorld} from './jozefworld-frontier-3d-persistence.js?v=1';
// Embedded in the existing validated world save: no extra storage key or password.
export function commitSimulationWorld(world, characters, {reason='Before simulation update', commit=commitFrontierWorld}={}) {
  if (!world || !Number.isSafeInteger(world.seed) || !Array.isArray(characters)) return {ok:false,reason:'Invalid simulation state'};
  const citizens=characters.slice(0,128).map((c,i)=>{
    const p=c?.npc?.root?.position;
    return {id:String(c?.id??i),job:String(c?.job??'').slice(0,32),
      activity:String(c?.activity??'').slice(0,80),
      x:Number.isFinite(p?.x)?Math.round((p.x+24)*100)/100:null,
      z:Number.isFinite(p?.z)?Math.round((p.z+24)*100)/100:null};
  });
  const revision=Number.isSafeInteger(world.simulationCheckpoint?.revision) &&
    world.simulationCheckpoint.revision>=0 ? world.simulationCheckpoint.revision+1 : 1;
  if (!Number.isSafeInteger(revision)) return {ok:false,reason:'Simulation revision overflow'};
  const next={...world,simulationCheckpoint:{version:1,revision,year:world.year||1,citizens}};
  // Existing commit routine backs up the previous complete world before writing.
  const saved=commit(next,{reason});
  return saved.ok?{...saved,world:next}:saved;
}
