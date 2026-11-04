/* Pure validation for cooperative resource transfers. */
export function applyFrontierTrade(stock,detail){
 const next={...stock};let changed=false;
 for(const key of ['wood','stone','food']){
  const value=detail?.[key];
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0)continue;
  const amount=Math.min(30,Math.floor(value));
  if(amount<1)continue;
  const current=Number.isFinite(next[key])?Math.max(0,Math.floor(next[key])):0;
  const updated=Math.min(999999,current+amount);
  if(updated!==next[key]){next[key]=updated;changed=true}
 }
 return {stock:next,changed};
}
