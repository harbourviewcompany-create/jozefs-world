'use strict';
// Build the 2D game as a normal, parser-checked script for Safari.
// Source assets are read-only; never access or mutate player saves.
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const count=11;
const parts=[];
for(let i=0;i<count;i++){
  const file=path.join(root,'block-world-up-'+i+'.txt');
  const part=fs.readFileSync(file,'utf8').trim();
  if(!part||!/^[A-Za-z0-9+/=]+$/.test(part))throw new Error('Invalid compressed 2D world part '+i);
  parts.push(part);
}
const encoded=parts.join('');
if(encoded.length%4!==0)throw new Error('2D world base64 is truncated');
const compressed=Buffer.from(encoded,'base64');
if(compressed.length<100||compressed.length>2*1024*1024||
   compressed[0]!==0x1f||compressed[1]!==0x8b)
  throw new Error('Invalid 2D world gzip payload');
const code=zlib.gunzipSync(compressed,{maxOutputLength:4*1024*1024}).toString('utf8');
if(code.length<1000||!code.includes('BlockWorld'))
  throw new Error('2D world source missing expected game engine');
new vm.Script(code,{filename:'block-world-engine.js'});
const sha=crypto.createHash('sha256').update(code).digest('hex');
if(!process.argv.includes('--check')){
  fs.writeFileSync(path.join(root,'block-world-engine.js'),
    '/* Built from 11 checked world source parts; do not edit generated output. */\n'+code+'\n');
}
process.stdout.write('2D engine verified: '+Buffer.byteLength(code)+' bytes, sha256 '+sha+'\n');
