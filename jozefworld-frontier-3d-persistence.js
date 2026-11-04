/* Shared local-world persistence. Never discard an existing save to make room. */
export function commitFrontierWorld(next,{storage=localStorage,backups=globalThis.window?.JWFrontierBackups,reason='3D world update'}={}){
 if(!next||typeof next!=='object'||Array.isArray(next))return{ok:false,reason:'Invalid world'};
 const raw=JSON.stringify(next);
 if(backups?.valid&&!backups.valid(raw))return{ok:false,reason:'World validation failed'};
 try{
  const previous=storage.getItem('jw-frontier-v1');
  if(previous&&previous!==raw){
   // Preserve a valid previous world in the bounded recovery history before modifying it.
   if(backups?.valid?.(previous)){
    if(!backups.capture(previous,reason))return{ok:false,reason:'Recovery backup could not be saved'};
   }else{
    // Legacy/unrecognized saves are never silently overwritten.
    if(!previous.trim())return{ok:false,reason:'Existing save is empty'};
    storage.setItem('jw-frontier-3d-last-backup',previous);
   }
  }
  storage.setItem('jw-frontier-v1',raw);
  return{ok:true};
 }catch{return{ok:false,reason:'Device storage unavailable or full'}}
}
