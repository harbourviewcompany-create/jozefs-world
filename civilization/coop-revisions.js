// Safe cooperative world-update intake. Transport and family membership are host-provided.
// Never accepts a remote update automatically or modifies browser storage.
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JozefCoopRevisions=api;
})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
  'use strict';
  const MAX_BYTES=500000;
  function validWorld(world){
    if(!world||typeof world!=='object'||Array.isArray(world)||world.version!==1||
      !Number.isSafeInteger(world.seed)||!Number.isSafeInteger(world.year)||world.year<1||
      !world.buildings||typeof world.buildings!=='object'||Array.isArray(world.buildings)||
      !world.stock||typeof world.stock!=='object'||Array.isArray(world.stock))return false;
    if(Object.keys(world.buildings).length>2304)return false;
    for(const [tile,type] of Object.entries(world.buildings)){
      const parts=tile.split(',');
      if(parts.length!==2||parts.some(v=>!/^(0|[1-9][0-9]?)$/.test(v)||Number(v)>=48)||
        !['home','farm','mill','quarry','road','market','stadium'].includes(type))return false;
    }
    if(!['wood','stone','food','coins'].every(k=>Number.isFinite(world.stock[k])&&world.stock[k]>=0))return false;
    const cp=world.simulationCheckpoint;
    return !cp||(cp.version===1&&Number.isSafeInteger(cp.revision)&&cp.revision>=0&&
      cp.year===world.year&&Array.isArray(cp.citizens)&&cp.citizens.length<=128);
  }
  function assess(local,incoming,{authorized=false,expectedSeed}={}){
    if(!authorized)return {status:'unauthorized'};
    if(!validWorld(local)||!validWorld(incoming))return {status:'invalid'};
    if(expectedSeed!==undefined&&(local.seed!==expectedSeed||incoming.seed!==expectedSeed))
      return {status:'different-world'};
    if(local.seed!==incoming.seed)return {status:'different-world'};
    const oldRevision=local.simulationCheckpoint?.revision??0;
    const newRevision=incoming.simulationCheckpoint?.revision??0;
    if(newRevision<=oldRevision)return {status:'stale'};
    if(incoming.year<local.year)return {status:'stale'};
    if(incoming.year>local.year+1)return {status:'conflict'};
    return {status:'requires-confirmation-and-backup',revision:newRevision};
  }
  async function apply(local,incoming,{authorize,confirm,commit}={}){
    // Membership verification must come from the existing trusted family session,
    // never from a client-supplied boolean or untrusted message.
    if(typeof authorize!=='function'||typeof confirm!=='function'||typeof commit!=='function')
      return {status:'unconfigured'};
    let authorized=false;
    try{authorized=(await authorize())===true}catch{return {status:'unauthorized'}}
    const decision=assess(local,incoming,{authorized});
    if(decision.status!=='requires-confirmation-and-backup')return decision;
    let approved=false;
    try{approved=(await confirm({revision:decision.revision}))===true}catch{return {status:'declined'}}
    if(!approved)return {status:'declined'};
    let copy;
    try{
      const raw=JSON.stringify(incoming);
      if(raw.length>MAX_BYTES)return {status:'oversized'};
      copy=JSON.parse(raw);
    }catch{return {status:'invalid'}}
    if(!validWorld(copy))return {status:'invalid'};
    // commit must be the existing backup-first commitFrontierWorld adapter.
    try{
      const result=await commit(copy,{reason:'Before cooperative world update'});
      return result?.ok===true?{status:'applied',world:copy}:{status:'save-failed',reason:result?.reason||'Backup or write failed'};
    }catch{return {status:'save-failed'}}
  }
  return Object.freeze({assess,apply});
});
