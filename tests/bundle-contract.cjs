/* Validate optimized, ordered CSS and JS bundles without requesting old assets. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const CSS=['site-foundation.css','site-experience.css'];
function read(root,name){return fs.readFileSync(path.join(root,name),'utf8')}
function styles(root,html,sw){
 const links=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(links,CSS,'exactly two ordered CSS requests');
 for(const name of CSS){
  assert.ok(sw.includes("'./"+name+"'"),'offline shell should precache '+name);
  assert.ok(fs.existsSync(path.join(root,name)),'bundle file exists: '+name);
 }
 return CSS.map(x=>read(root,x));
}
function css(root,html,sw,name){
 const data=styles(root,html,sw);
 const matches=data.map((x,i)=>x.includes('/* BEGIN '+name+' */')?i:-1).filter(x=>x>=0);
 assert.equal(matches.length,1,'source stylesheet must occur once in active CSS bundle: '+name);
 assert.ok(fs.existsSync(path.join(root,name)),'the editable source CSS must still exist');
 return CSS[matches[0]];
}
function order(root,html,sw,earlier,later){
 const all=styles(root,html,sw).join('\n');
 const a=all.indexOf('/* BEGIN '+earlier+' */');
 const b=all.indexOf('/* BEGIN '+later+' */');
 assert.ok(a>=0&&b>a,earlier+' must load before '+later);
}
function arena(root,html,sw){
 assert.equal((html.match(/src="arena-bundle\.js"/g)||[]).length,1,'Arena runtime must be loaded once');
 assert.ok(sw.includes("'./arena-bundle.js'"),'Arena bundle available offline');
 const bundle=read(root,'arena-bundle.js');
 for(const file of ['arena-systems.js','arena-experience.js','arena-renderer.js','arena.js'])
  assert.ok(bundle.includes('/* BEGIN '+file+' */'),'bundle includes '+file);
}
module.exports={css,order,arena,styles};
