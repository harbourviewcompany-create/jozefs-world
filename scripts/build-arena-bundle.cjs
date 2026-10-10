'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const parts=["arena-systems.js","arena-experience.js","arena-renderer.js","arena.js"];
const banner="/* Jozef FC Arena runtime bundle. Generated from the four source modules; do not edit directly. */\n";
const bundle=banner+parts.map(name=>'/* BEGIN '+name+' */\n'+fs.readFileSync(path.join(root,name),'utf8').trimEnd()+'\n;\n').join('');
const outfile=path.join(root,'arena-bundle.js');
if(process.argv.includes('--check')){
 const existing=fs.existsSync(outfile)?fs.readFileSync(outfile,'utf8'):'';
 if(existing!==bundle){
  console.error('arena-bundle.js is outdated: run node scripts/build-arena-bundle.cjs');
  process.exitCode=1;
 }else console.log('Arena production bundle synchronized');
}else{
 fs.writeFileSync(outfile,bundle);
 console.log('Generated arena-bundle.js ('+Buffer.byteLength(bundle)+' bytes)');
}
