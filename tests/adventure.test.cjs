'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),rules=require('../adventure.js');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('four distinct unlockable worlds and saved kits stay private and bounded',()=>{
 assert.equal(rules.WORLDS.length,4);assert.equal(rules.OUTFITS.length,5);
 const invalid=rules.sanitize({completed:[0,2,200],stars:['0-star-1','bad'],outfit:'legend',coop:true,zone:99});
 assert.deepEqual(invalid.completed,[0,2]);
 assert.deepEqual(invalid.stars,['0-star-1']);
 assert.equal(invalid.outfit,'classic');
 assert.equal(invalid.zone,2);
});
test('touch route finding reaches all mission objects without moving through walls',()=>{
 const objectives=[...rules.STAR_POS,...rules.SWITCH_POS,[13,7],[14,8]];
 for(let world=0;world<rules.WORLDS.length;world++){
  for(const [x,y] of objectives){
   const route=rules.shortestPath(world,1,1,x,y);
   assert.ok(route?.length>0,'route required for world '+world+' at '+x+','+y);
   let px=1,py=1;
   for(const [nx,ny] of route){
    assert.equal(rules.canMove(world,nx,ny),true);
    assert.equal(Math.abs(px-nx)+Math.abs(py-ny),1);
    px=nx;py=ny;
   }
   assert.deepEqual([px,py],[x,y]);
  }
 }
 assert.equal(rules.shortestPath(0,1,1,0,0),null);
});
test('adventure is wired into public navigation, offline shell and Club backup',()=>{
 const html=read('index.html'),world=read('world.html'),nav=read('stadium.js'),sw=read('sw.js');
 assert.equal(world,html);
 for(const id of ['adventure','jw-adventure-canvas','jw-adventure-worlds','jw-adventure-battle','jw-adventure-outfits','jw-adventure-coop','jw-adventure-interact']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(html,/src="adventure\.js"/);
 assert.match(html,/class="jw-adventure-teaser"/);
 assert.match(html,/onclick="showSection\('adventure'\)"/);
 assert.match(nav,/'adventure'/);
 assert.match(sw,/'\.\/adventure\.js'/);
 assert.match(read('clubhouse.js'),/'jozefs-world-adventure-v1'/);
 assert.ok(read('site-experience.css').includes('/* BEGIN adventure.css */'));
});

test('cooperative pathfinder avoids the other player without blocking the mission',()=>{
 const route=rules.shortestPath(0,1,1,5,4,2,1);
 assert.ok(route&&route.length>0);
 assert.ok(route.every(([x,y])=>!(x===2&&y===1)));
 assert.equal(rules.shortestPath(0,1,1,2,1,2,1),null);
 const script=read('adventure.js');
 assert.match(script,/function guideToObjective\(/);
 assert.match(read('index.html'),/id="jw-adventure-guide"/);
});
