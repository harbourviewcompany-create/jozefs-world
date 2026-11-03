import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierYearProduction} from '../jozefworld-frontier-economy.js';
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
 assert.equal(api.valid(JSON.stringify({version:1,seed:1,year:1,buildings:{},stock:{wood:'10',stone:10,food:10,coins:10}})),false);
 assert.equal(api.valid(JSON.stringify({version:1,seed:1,year:1,buildings:{},stock:[10,10,10,10]})),false);
 assert.equal(api.restore(-1),false);
 assert.equal(api.capture(world(1)),true);
 assert.equal(api.capture(world(1)),true);
 assert.equal(api.read().length,1);
 for(let y=2;y<=7;y++)api.capture(world(y));
 assert.equal(api.read().length,4);
 localStorage.setItem('jw-frontier-v1',world(8));
 assert.equal(api.restore(2),true);
 assert.equal(JSON.parse(localStorage.getItem('jw-frontier-v1')).year,5);
 assert.ok(api.read().some(x=>JSON.parse(x.raw).year===8));
 const before=localStorage.getItem('jw-frontier-v1');
 localStorage.setItem('jw-frontier-v1','{corrupt');
 assert.equal(api.restore(0),false);
 assert.equal(localStorage.getItem('jw-frontier-v1'),'{corrupt');
 localStorage.setItem('jw-frontier-v1',before);
 delete globalThis.window;delete globalThis.localStorage;
});

test('Economy is deterministic, does not mutate input, and connects roads from homes',()=>{
 const buildings={'0,0':'home','1,0':'road','2,0':'road','3,0':'farm','6,6':'mill'};
 const stock={wood:10,stone:10,food:10,coins:10};
 const before=JSON.stringify({buildings,stock});
 const a=frontierYearProduction(buildings,stock,0);
 assert.deepEqual(a,frontierYearProduction(buildings,stock,0));
 assert.equal(JSON.stringify({buildings,stock}),before);
 assert.equal(a.residents,4);
 assert.equal(a.employed,4);
 assert.equal(a.connectedIndustries,1);
 assert.equal(a.stock.food,20);
 assert.equal(a.stock.wood,22);
 assert.equal(a.stock.coins,19);
});
test('Economy clamps shortages and avoids bonuses for disconnected roads',()=>{
 const b={'0,0':'home','5,5':'road','6,5':'farm'};
 const result=frontierYearProduction(b,{wood:0,stone:0,food:0,coins:0});
 assert.equal(result.connectedIndustries,0);
 assert.equal(result.stock.food,6);
 assert.equal(result.stock.coins,8);
 assert.equal(frontierYearProduction({'0,0':'home'},{wood:0,stone:0,food:0,coins:0}).stock.food,0);
});
