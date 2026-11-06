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

/**
 * Restore only bounded positions for the same saved simulation year.
 * Never mutate the checkpoint, citizen roster, or saved world.
 * Terrain validation prevents spawning in water or outside the playable map.
 */
export function restoreSimulationCitizens(checkpoint, characters, {terrain, height, width=48, depth=48}={}) {
  if (!checkpoint || checkpoint.version!==1 || !Array.isArray(checkpoint.citizens) ||
      checkpoint.citizens.length>128 || !Array.isArray(characters) ||
      !Number.isInteger(width) || !Number.isInteger(depth) || width<1 || depth<1 ||
      typeof terrain!=='function') return {restored:0,skipped:true};
  let restored=0;
  const records=checkpoint.citizens;
  for (let i=0;i<Math.min(characters.length,records.length);i++) {
    const entry=records[i], character=characters[i], pos=character?.npc?.root?.position;
    if (!entry || typeof entry!=='object' || !pos) continue;
    // Index is stable within the same world roster; refuse mismatched job assignments.
    if (entry.id!==String(character.id??i) || entry.job!==String(character.job??'').slice(0,32)) continue;
    const x=entry.x,z=entry.z;
    if (!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>=width||z>=depth) continue;
    const tx=Math.round(x),tz=Math.round(z);
    if (tx>=width||tz>=depth||terrain(tx,tz)==='water') continue;
    const y=typeof height==='function'?height(x,z):0.24;
    if (!Number.isFinite(y)) continue;
    pos.set(x-24,y,z-24);
    character.route=[];
    character.destination='';
    character.retryAt=0;
    restored++;
  }
  return {restored,skipped:false};
}
