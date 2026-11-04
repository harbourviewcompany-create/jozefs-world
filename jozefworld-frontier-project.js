/* Local cooperative construction goal. Sync transport is not yet connected. */
export const FRONTIER_PROJECT={id:'community-hall',title:'Build the Community Hall',required:{wood:60,stone:35,coins:40}};
export function contributeToProject(project,stock,offer,player='Family'){
 const required=FRONTIER_PROJECT.required;
 const progress={wood:0,stone:0,coins:0};
 for(const key of Object.keys(required)){const value=project?.progress?.[key];progress[key]=typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(required[key],Math.floor(value))):0}
 const nextStock={...stock},accepted={wood:0,stone:0,coins:0};
 for(const key of Object.keys(required)){
  const amount=offer?.[key];
  if(typeof amount!=='number'||!Number.isFinite(amount)||amount<=0)continue;
  const available=typeof nextStock[key]==='number'&&Number.isFinite(nextStock[key])?Math.max(0,Math.floor(nextStock[key])):0;
  const take=Math.min(Math.floor(amount),available,required[key]-progress[key]);
  if(take>0){accepted[key]=take;nextStock[key]-=take;progress[key]+=take}
 }
 const changed=Object.values(accepted).some(v=>v>0);
 const contributors=Array.isArray(project?.contributors)?project.contributors.filter(v=>v&&typeof v.name==='string'&&Number.isSafeInteger(v.amount)&&v.amount>0).slice(-20):[];
 if(changed)contributors.push({name:String(player).slice(0,24),amount:Object.values(accepted).reduce((a,b)=>a+b,0)});
 return {project:{id:FRONTIER_PROJECT.id,progress,contributors:contributors.slice(-20),complete:Object.keys(required).every(k=>progress[k]>=required[k])},stock:nextStock,accepted,changed};
}
