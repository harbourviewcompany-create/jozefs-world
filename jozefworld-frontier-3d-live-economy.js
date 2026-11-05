/* Pure production rules. Job-aware input prevents phantom output. */
export const RESOURCE_BY_JOB=Object.freeze({Carpenter:'wood',Mason:'stone',Farmer:'food',Merchant:'coins'});
export function liveProduction(buildings,stock,workers=0){
 const count=type=>Object.values(buildings||{}).filter(v=>v===type).length;
 const delta={wood:0,stone:0,food:0,coins:0};
 const homes=count('home'),capacity=homes*4;
 if(!homes){delta.wood=1;delta.stone=1}
 else if(Array.isArray(workers)){
  const capacities={wood:count('mill')*3,stone:count('quarry')*3,food:count('farm')*3,coins:count('market')*3};
  const assigned={wood:0,stone:0,food:0,coins:0};
  for(const worker of workers){if(!worker||typeof worker!=='object'||!worker.activity?.startsWith('Working'))continue;
   const resource=RESOURCE_BY_JOB[worker.job];if(resource&&assigned[resource]<capacities[resource]&&Object.values(assigned).reduce((a,b)=>a+b,0)<capacity)assigned[resource]++}
  for(const [resource,n] of Object.entries(assigned))delta[resource]=n*(resource==='food'||resource==='coins'?3:2);
 }else{
  const jobs=[['mill','wood',2],['quarry','stone',2],['farm','food',3],['market','coins',3]];
  let remaining=Math.max(0,Math.min(capacity,Math.floor(Number(workers)||0)));
  for(const [building,resource,rate] of jobs){const staffed=Math.min(remaining,count(building)*3);delta[resource]=staffed*rate;remaining-=staffed}
 }
 const next={...stock};for(const k of Object.keys(delta))next[k]=Math.max(0,Math.min(999999,Math.floor((Number(stock?.[k])||0)+delta[k])));
 return{stock:next,delta,working:Array.isArray(workers)?workers.filter(w=>w?.activity?.startsWith('Working')).length:Math.max(0,Math.floor(Number(workers)||0))};
}
