import {liveProduction} from '../jozefworld-frontier-3d-live-economy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInWorld} from '../jozefworld-frontier-3d-build.js';
import {describeWorkplace} from '../jozefworld-frontier-workplaces.js';
import {citizenRoutine,citizenDestination} from '../jozefworld-frontier-npc-routines.js';
import {contributeToProject} from '../jozefworld-frontier-project.js';
import {applyFrontierTrade} from '../jozefworld-frontier-trade.js';
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
 const originalSet=localStorage.setItem;
 localStorage.setItem=(k,v)=>{if(k==='jw-frontier-backups-v1')throw Error('QuotaExceededError');return originalSet(k,v)};
 const intact=localStorage.getItem('jw-frontier-v1');
 assert.equal(api.restore(0),false,'Restore must abort if the current world cannot be backed up');
 assert.equal(localStorage.getItem('jw-frontier-v1'),intact);
 assert.equal(api.capture(world(20)),false,'Backup writes must report quota failure');
 localStorage.setItem=originalSet;
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

test('Economy only awards road bonuses to industries reachable from housing',()=>{
 const base={'0,0':'home','1,0':'road','2,0':'road','3,0':'mill','8,8':'quarry'};
 const first=frontierYearProduction(base,{wood:0,stone:0,food:0,coins:0});
 assert.equal(first.connectedIndustries,1);
 assert.equal(first.stock.wood,16);
 assert.equal(first.stock.stone,8);
 const isolated=frontierYearProduction({'0,0':'home','7,7':'road','8,7':'mill'},{wood:0,stone:0,food:0,coins:0});
 assert.equal(isolated.connectedIndustries,0);
 assert.equal(isolated.stock.wood,12);
});
test('Economy caps resources and does not create employment without homes',()=>{
 const noHomes=frontierYearProduction({'1,1':'market'},{wood:999999,stone:999999,food:999999,coins:999999});
 assert.equal(noHomes.residents,0);
 assert.equal(noHomes.employed,0);
 assert.deepEqual(noHomes.stock,{wood:999999,stone:999999,food:999999,coins:999999});
});

test('Cooperative trades reject malformed values and preserve inputs',()=>{
 const stock={wood:10,stone:20,food:30,coins:7};
 const result=applyFrontierTrade(stock,{wood:5,stone:'500',food:Infinity,coins:99});
 assert.deepEqual(result.stock,{wood:15,stone:20,food:30,coins:7});
 assert.deepEqual(stock,{wood:10,stone:20,food:30,coins:7});
 assert.equal(result.changed,true);
 assert.equal(applyFrontierTrade(stock,{wood:-1,food:0,stone:NaN}).changed,false);
 assert.equal(applyFrontierTrade({wood:999998,stone:0,food:0},{wood:30,stone:100,food:.5}).stock.wood,999999);
});

test('Community Hall contributions are bounded and conserve resources',()=>{
 const stock={wood:100,stone:40,coins:45,food:7};
 const a=contributeToProject(null,stock,{wood:999,stone:8,coins:10},'Dad');
 assert.deepEqual(a.accepted,{wood:60,stone:8,coins:10});
 assert.deepEqual(a.stock,{wood:40,stone:32,coins:35,food:7});
 assert.equal(a.project.complete,false);
 const b=contributeToProject(a.project,a.stock,{wood:99,stone:99,coins:99},'Jozef');
 assert.equal(b.project.complete,true);
 assert.deepEqual(b.project.progress,{wood:60,stone:35,coins:40});
 assert.deepEqual(b.stock,{wood:40,stone:5,coins:5,food:7});
 assert.equal(contributeToProject(b.project,b.stock,{wood:10},'Dad').changed,false);
 assert.deepEqual(stock,{wood:100,stone:40,coins:45,food:7});
});
test('Community Hall ignores invalid and fractional resource offers',()=>{
 const a=contributeToProject(null,{wood:10,stone:10,coins:10},{wood:'10',stone:Infinity,coins:.2});
 assert.equal(a.changed,false);
 assert.deepEqual(a.project.progress,{wood:0,stone:0,coins:0});
});

test('NPC schedules are deterministic, staggered and route to work or home',()=>{
 assert.equal(citizenRoutine(1000,1,0,true),citizenRoutine(1000,1,0,true));
 assert.notEqual(citizenRoutine(10000,1,0,true),citizenRoutine(10000,1,2,true));
 assert.equal(citizenDestination('Working'),'work');
 assert.equal(citizenDestination('Commuting to work'),'work');
 assert.equal(citizenDestination('Commuting home'),'home');
 assert.equal(citizenRoutine(0,1,0,false),'At home');
});

test('workplace descriptions distinguish production and homes without changing resources',()=>{assert.match(describeWorkplace('farm').detail,/Food production/);assert.match(describeWorkplace('quarry').detail,/Stone production/);assert.match(describeWorkplace('mill').detail,/Wood production/);assert.match(describeWorkplace('market').detail,/Coins/);assert.equal(describeWorkplace('unknown').label,'Building')});

test('3D construction pays costs, persists a house and creates four citizens',()=>{const original={stock:{wood:10,stone:4,coins:10,food:35},buildings:{},citizenRoster:[]};const result=buildInWorld(original,'home',4,5,()=> 'grass',100);assert.equal(result.ok,true);assert.equal(result.world.buildings['4,5'],'home');assert.equal(result.world.stock.wood,2);assert.equal(result.world.stock.stone,2);assert.equal(result.world.stock.coins,5);assert.equal(result.world.citizenRoster.length,4);assert.equal(result.world.constructionTimes['4,5'],100);assert.equal(original.buildings['4,5'],undefined)});
test('3D construction rejects water, occupied tiles and missing resources',()=>{const world={stock:{wood:0,stone:0,coins:0},buildings:{'2,2':'home'}};assert.equal(buildInWorld(world,'home',2,2,()=> 'grass').ok,false);assert.equal(buildInWorld(world,'home',3,3,()=> 'water').ok,false);assert.match(buildInWorld(world,'home',3,3,()=> 'grass').reason,/Need/)});

test('continuous economy produces baseline materials for first house',()=>{const r=liveProduction({}, {wood:4,stone:6,food:35,coins:13},0);assert.equal(r.stock.wood,5);assert.equal(r.stock.stone,7)});
test('continuous economy only staffs available jobs with residents',()=>{const buildings={'1,1':'home','2,2':'mill','3,3':'farm'};const r=liveProduction(buildings,{wood:0,stone:0,food:0,coins:0},2);assert.equal(r.stock.wood,4);assert.equal(r.stock.food,0);assert.equal(r.stock.coins,0)});
