/* Pure continuous settlement tick; annual production remains separate. */
export function liveProduction(buildings,stock,workingCitizens=0){
 const count=type=>Object.values(buildings||{}).filter(v=>v===type).length;
 const homes=count('home'),workers=Math.max(0,Math.min(homes*4,Math.floor(workingCitizens)));
 const jobs=[['mill','wood',2],['quarry','stone',2],['farm','food',3],['market','coins',3]];
 const delta={wood:0,stone:0,food:0,coins:0};
 let remaining=workers;
 for(const [building,resource,rate] of jobs){const staffed=Math.min(remaining,count(building)*3);delta[resource]+=staffed*rate;remaining-=staffed}
 if(!homes){delta.wood=1;delta.stone=1}
 const next={...stock};for(const k of Object.keys(delta))next[k]=Math.max(0,Math.min(999999,Math.floor((Number(stock?.[k])||0)+delta[k])));
 return{stock:next,delta,working:workers};
}
