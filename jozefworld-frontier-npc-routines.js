/* Deterministic staggered daily routines for Frontier residents. */
export function citizenRoutine(time,year,index,hasJob){
 const clock=Number.isFinite(time)?Math.max(0,time):0;
 const cycle=((clock/30000)+(index*0.137)+(year%7)*0.031)%1;
 if(!hasJob)return cycle<.65?'At home':'Exploring town';
 if(cycle<.12)return 'At home';
 if(cycle<.28)return 'Commuting to work';
 if(cycle<.68)return 'Working';
 if(cycle<.83)return 'Commuting home';
 return 'At home';
}
export function citizenDestination(routine){return routine==='Working'||routine==='Commuting to work'?'work':'home'}
