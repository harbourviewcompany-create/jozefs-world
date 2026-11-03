/* Deterministic annual settlement production; no storage or DOM access. */
export function frontierYearProduction(buildings,stock,research=0){
 const counts={home:0,farm:0,mill:0,quarry:0,market:0,stadium:0};
 for(const type of Object.values(buildings))if(Object.hasOwn(counts,type))counts[type]++;
 const residents=counts.home*4,positions=Object.entries(buildings);
 const roads=new Set(),queue=[];
 for(const [pos,type] of positions){if(type!=='home')continue;const [x,y]=pos.split(',').map(Number);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+dx)+','+(y+dy);if(buildings[k]==='road'&&!roads.has(k)){roads.add(k);queue.push(k)}}}
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i].split(',').map(Number);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(x+dx)+','+(y+dy);if(buildings[k]==='road'&&!roads.has(k)){roads.add(k);queue.push(k)}}}
 const access=pos=>{const [x,y]=pos.split(',').map(Number);return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>roads.has((x+dx)+','+(y+dy)))};
 const active={farm:0,mill:0,quarry:0,market:0};
 for(const [pos,type] of positions)if(Object.hasOwn(active,type)&&access(pos))active[type]++;
 const employed=Math.min(residents,3*(counts.farm+counts.mill+counts.quarry+counts.market+counts.stadium));
 const delta={wood:4+counts.mill*(8+research)+active.mill*4,stone:2+counts.quarry*(6+research)+active.quarry*3,food:counts.farm*(9+research)+active.farm*4-counts.home*3,coins:5+counts.market*12+counts.stadium*5+active.market*5+employed};
 const next={};for(const k of ['wood','stone','food','coins'])next[k]=Math.max(0,Math.min(999999,Math.floor((Number(stock[k])||0)+delta[k])));
 return {stock:next,delta,employed,residents,connectedIndustries:Object.values(active).reduce((a,b)=>a+b,0)};
}
