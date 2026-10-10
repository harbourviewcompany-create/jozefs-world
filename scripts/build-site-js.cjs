'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const groups=[{"output":"site-core.js","sources":["notes.js","app.js","extras.js"]},{"output":"site-features.js","sources":["stadium.js","playmode.js","broadcast.js","album.js","sports.js","watch.js","locker.js","sports-stage.js","multisport.js"]}];
for(const group of groups){
 const content='/* Generated browser scripts. Preserve order; do not edit directly. */\n'+
  group.sources.map(name=>'\n/* BEGIN '+name+' */\n'+
   fs.readFileSync(path.join(root,name),'utf8').trimEnd()+'\n;\n').join('');
 const destination=path.join(root,group.output);
 if(process.argv.includes('--check')){
  if(!fs.existsSync(destination)||fs.readFileSync(destination,'utf8')!==content){
   console.error(group.output+' differs from its source files; regenerate with node scripts/build-site-js.cjs');
   process.exitCode=1;
  }else console.log('Synchronized: '+group.output);
 }else {
  fs.writeFileSync(destination,content);
  console.log('Generated '+group.output+' ('+Buffer.byteLength(content)+' bytes)');
 }
}
