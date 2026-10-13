/* Portable family progress + two-dimensional and three-dimensional worlds.
   Local, parent-confirmed file transfer; NOT background/cloud synchronisation.
   Codes for private presence/rooms are deliberately excluded. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JozefFamilyBackup=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const FORMAT='jozefs-world-family-backup',VERSION=2,MAX_BYTES=8000000;
 const KEYS=Object.freeze([
  'jozefs-world-player-v1','jozefs-world-tour-v1','jozefs-world-career-v1',
  'jozefKeepyBest','jozefs-world-street-best-v1','jozefs-world-notes-v1',
  'jozefs-world-album-v1','jozefs-world-sports-v1','jozefs-world-chronicle-v1',
  'jozefs-world-multisport-v1','jozefs-world-playbook-v1','jozefs-world-versus-v1',
  'jozefs-world-adventure-v1','jozefs-world-together-v1','jozefs-world-block-v1',
  'jozefs-world-matchday-v1','jozefs-world-formation-v1','jozefs-world-training-v1',
  'jozefs-world-jersey-v1','jozefs-world-bingo-v1','jozefs-world-missions-v1',
  'jozefs-world-squad-v1','jozefs-world-arena-v1','jozefs-world-prime-football-v1',
  'jozefs-world-wacky-v1','jozefs-world-club-design-v1','jozefs-world-ghost-v1',
  'jozefs-world-block-v3','jozef-block-adventure-v4','jozef-block-realms-v1',
  'jozefs-block-3d-v1','jozefs-block-3d-dimensions-v1',
  'jozefs-world-season','jozefs-world-season-match-ids','jozefs-world-versus-result'
 ]);
 const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
   (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
 const validData=(x,depth=0)=>{
   if(depth>15)return false;
   if(x===null||typeof x==='boolean')return true;
   if(typeof x==='string')return x.length<=10000;
   if(typeof x==='number')return Number.isFinite(x)&&Math.abs(x)<=1e12;
   if(Array.isArray(x))return x.length<=20000&&x.every(y=>validData(y,depth+1));
   if(!plain(x))return false;
   const entries=Object.entries(x);
   return entries.length<=300&&entries.every(([key,val])=>
    key.length<=180&&!['__proto__','prototype','constructor'].includes(key)&&validData(val,depth+1));
 };
 const validGrid=(value,version)=>{
   if(!plain(value)||value.version!==version||!Array.isArray(value.world)||value.world.length!==72)return false;
   return value.world.every(row=>Array.isArray(row)&&row.length===180&&
     row.every(n=>Number.isInteger(n)&&n>=0&&n<=31));
 };
 const validEdits=edits=>Array.isArray(edits)&&edits.length<=14000&&edits.every(row=>
    Array.isArray(row)&&row.length===2&&typeof row[0]==='string'&&
    /^-?\d{1,7},-?\d{1,7},-?\d{1,7}$/.test(row[0])&&
    Number.isInteger(row[1])&&row[1]>=0&&row[1]<=64);
 const valid3D=value=>plain(value)&&value.version===1&&Number.isFinite(value.seed)&&
   validEdits(value.edits)&&plain(value.hero)&&
   [value.hero.x,value.hero.y,value.hero.z].every(Number.isFinite);
 const validRealms=value=>plain(value)&&value.version===1&&Number.isFinite(value.baseSeed)&&
   plain(value.dimensions)&&Object.entries(value.dimensions).length<=3&&
   Object.entries(value.dimensions).every(([k,v])=>
      ['0','1','2'].includes(k)&&plain(v)&&Number.isFinite(v.seed)&&validEdits(v.edits));
 const rawScore=new Set(['jozefKeepyBest','jozefs-world-street-best-v1','jozefs-world-versus-result']);
 function validateRecord(key,raw){
   if(typeof raw!=='string'||raw.length>6000000)throw Error('Invalid save format for '+key);
   if(rawScore.has(key)){
     if(key==='jozefs-world-versus-result'){
       if(raw.length>250)throw Error('Invalid Versus result');
     }else if(!/^\d{1,7}$/.test(raw))throw Error('Invalid score in '+key);
     return;
   }
   let value;try{value=JSON.parse(raw);}catch(_){throw Error('Damaged saved activity: '+key);}
   if(!validData(value))throw Error('Untrusted or oversize data for '+key);
   if(key==='jozefs-world-block-v3'&&!validGrid(value,3))throw Error('Invalid 2D world');
   if(key==='jozefs-block-3d-v1'&&!valid3D(value))throw Error('Invalid 3D world');
   if(key==='jozefs-block-3d-dimensions-v1'&&!validRealms(value))throw Error('Invalid 3D realms');
   if(key==='jozefs-world-player-v1'&&value?.xp!==undefined&&
     (!Number.isFinite(value.xp)||value.xp<0||value.xp>1e8))throw Error('Invalid player XP');
   if(key==='jozefs-world-prime-football-v1'&&
     (!Number.isInteger(value)||value<0||value>5))throw Error('Invalid Prime score');
 }
 function create(storage,snapshot){
   const data=Object.create(null);
   for(const key of KEYS){
     const raw=storage.getItem(key);
     if(raw===null)continue;
     validateRecord(key,raw);data[key]=raw;
   }
   const backup={format:FORMAT,version:VERSION,createdAt:new Date().toISOString(),data};
   if(snapshot!==undefined&&snapshot!==null){
     if(!validGrid(snapshot,4)||!validData(snapshot))throw Error('Invalid 2D recovery snapshot');
     backup.indexedDb2D=snapshot;
   }
   const packed=JSON.stringify(backup);
   if(packed.length>MAX_BYTES)throw Error('Family worlds are too large for one backup (8 MB limit). Export large realms from Block World 3D.');
   return backup;
 }
 function validate(input){
   const backup=typeof input==='string'?JSON.parse(input):input;
   if(!plain(backup)||backup.format!==FORMAT||backup.version!==VERSION||!plain(backup.data))
      throw Error('Unrecognized family backup');
   const entries=Object.entries(backup.data);
   if(!entries.length&&backup.indexedDb2D===undefined)throw Error('The backup has no saved progress');
   if(entries.length>KEYS.length)throw Error('Unexpected backup keys');
   for(const [key,value] of entries){
     if(!KEYS.includes(key))throw Error('Unexpected backup key');
     validateRecord(key,value);
   }
   if(backup.indexedDb2D!==undefined&&
      (!validGrid(backup.indexedDb2D,4)||!validData(backup.indexedDb2D)))throw Error('Invalid 2D recovery snapshot');
   if(JSON.stringify(backup).length>MAX_BYTES)throw Error('Backup exceeds the maximum size');
   return backup;
 }
 function readIndexedDb(){
   return new Promise(resolve=>{
     if(typeof indexedDB==='undefined')return resolve(undefined);
     let req,db;try{req=indexedDB.open('jozef-dad-block-world',1);}catch(_){return resolve(undefined);}
     req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('worlds'))req.result.createObjectStore('worlds');};
     req.onerror=()=>resolve(undefined);
     req.onblocked=()=>resolve(undefined);
     req.onsuccess=()=>{
       db=req.result;try{
         const tx=db.transaction('worlds','readonly'),get=tx.objectStore('worlds').get('autosave');
         get.onsuccess=()=>{db.close();resolve(get.result??null);};
         get.onerror=()=>{db.close();resolve(undefined);};
       }catch(_){db.close();resolve(undefined);}
     };
   });
 }
 function writeIndexedDb(snapshot){
   return new Promise((resolve,reject)=>{
     if(typeof indexedDB==='undefined')return reject(Error('This browser cannot restore the 2D recovery save'));
     let req;try{req=indexedDB.open('jozef-dad-block-world',1);}catch(e){return reject(e);}
     req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('worlds'))req.result.createObjectStore('worlds');};
     req.onerror=()=>reject(Error('2D recovery storage unavailable'));
     req.onblocked=()=>reject(Error('Close Block World before restoring its recovery save'));
     req.onsuccess=()=>{
       const db=req.result;try{
         const tx=db.transaction('worlds','readwrite');
         if(snapshot===null)tx.objectStore('worlds').delete('autosave');
         else tx.objectStore('worlds').put(snapshot,'autosave');
         tx.oncomplete=()=>{db.close();resolve();};
         tx.onerror=()=>{db.close();reject(Error('Cannot write the 2D recovery save'));};
         tx.onabort=()=>{db.close();reject(Error('2D recovery storage rolled back'));};
       }catch(e){db.close();reject(e);}
     };
   });
 }
 // Fail-closed import: verify every key first, then update world recovery and
 // local saves. If any write fails, attempt to restore the originals.
 async function restore(input,storage,db={read:readIndexedDb,write:writeIndexedDb}){
   const backup=validate(input),updates=Object.entries(backup.data),old=new Map();
   for(const [key] of updates)old.set(key,storage.getItem(key));
   const useDB=Object.hasOwn(backup,'indexedDb2D');
   const oldDB=useDB?await db.read():null;
   if(useDB&&oldDB===undefined)throw Error('Cannot verify the existing 2D recovery save. Restore cancelled.');
   let dbChanged=false;
   try{
     if(useDB){await db.write(backup.indexedDb2D);dbChanged=true;}
     for(const [key,raw] of updates)storage.setItem(key,raw);
   }catch(e){
     for(const [key,prior] of old){try{if(prior===null)storage.removeItem(key);else storage.setItem(key,prior);}catch(_){}}
     if(dbChanged)try{await db.write(oldDB);}catch(_){throw Error('Backup restore failed; recovery storage could not be rolled back. Keep your backup file.');}
     throw e;
   }
   return {activities:updates.length,worlds:updates.filter(([key])=>/block|realms/.test(key)).length+(useDB?1:0)};
 }
 return Object.freeze({FORMAT,VERSION,KEYS,MAX_BYTES,create,validate,restore,readIndexedDb,writeIndexedDb});
});