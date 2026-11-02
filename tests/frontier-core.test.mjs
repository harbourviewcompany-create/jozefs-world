import test from 'node:test';
import assert from 'node:assert/strict';
import {findFrontierPath} from '../jozefworld-frontier-path.js';
import {createAdaptiveResolution} from '../jozefworld-frontier-3d-performance.js';

test('A* avoids water and finds the only crossing',()=>{
 const terrain=(x,y)=>x===2&&y!==3?'water':'grass';
 const path=findFrontierPath({x:0,y:0},{x:4,y:0},terrain,{},5,5);
 assert.ok(path.some(p=>p.x===2&&p.y===3));
 assert.ok(path.every(p=>terrain(p.x,p.y)!=='water'));
 assert.deepEqual(findFrontierPath({x:0,y:0},{x:4,y:0},(x)=>x===2?'water':'grass',{},5,5),[]);
});
test('A* prefers roads and avoids occupied building tiles',()=>{
 const roads=Object.fromEntries(Array.from({length:5},(_,x)=>[x+',1','road']));
 const path=findFrontierPath({x:0,y:0},{x:4,y:0},()=> 'grass',roads,5,5);
 assert.ok(path.some(p=>p.y===1));
 const detour=findFrontierPath({x:0,y:0},{x:2,y:0},()=> 'grass',{'1,0':'home'},4,4);
 assert.ok(detour.every(p=>p.x!==1||p.y!==0));
});
test('Adaptive resolution reduces work under sustained slow frames and recovers',()=>{
 const changes=[],renderer={setPixelRatio:v=>changes.push(v),setSize:()=>{}};
 const governor=createAdaptiveResolution(renderer,{clientWidth:390,clientHeight:760},2);
 for(let i=0;i<400;i++)governor.tick(.05);
 assert.equal(governor.ratio,1);
 for(let i=0;i<1300;i++)governor.tick(.016);
 assert.equal(governor.ratio,1.5);
 assert.deepEqual(changes,[1,1.5]);
});
test('Backup guard validates, deduplicates, bounds and restores local worlds',async()=>{
 const store=new Map();globalThis.window={};globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 await import('../jozefworld-frontier-backups.js');
 const api=window.JWFrontierBackups;
 const world=(year,buildings={})=>JSON.stringify({version:1,seed:72631,year,buildings,stock:{wood:10,stone:10,food:10,coins:10}});
 assert.equal(api.valid(world(1,{'99,0':'home'})),false);
 assert.equal(api.capture(world(1)),true);
 assert.equal(api.capture(world(1)),true);
 assert.equal(api.read().length,1);
 for(let y=2;y<=7;y++)api.capture(world(y));
 assert.equal(api.read().length,4);
 localStorage.setItem('jw-frontier-v1',world(8));
 assert.equal(api.restore(2),true);
 assert.equal(JSON.parse(localStorage.getItem('jw-frontier-v1')).year,5);
 assert.ok(api.read().some(x=>JSON.parse(x.raw).year===8));
 delete globalThis.window;delete globalThis.localStorage;
});
