const start=document.getElementById('start'),output=document.getElementById('result'),state=document.getElementById('state');
let report={status:'Not tested'};
document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(JSON.stringify(report,null,2));
start.onclick=async()=>{
start.disabled=true;state.textContent='Measuring Safari frame pacing for 30 seconds';
const gaps=[];let last=0,running=true,frames=0;
function tick(t){if(!running)return;if(last)gaps.push(t-last);last=t;frames++;requestAnimationFrame(tick)}
requestAnimationFrame(tick);
await new Promise(resolve=>setTimeout(resolve,30000));running=false;
const sorted=gaps.slice().sort((a,b)=>a-b);
report={durationSeconds:30,frames,estimatedFps:Math.round(frames/30),p95FrameGapMs:Math.round(sorted[Math.floor(sorted.length*.95)]||0),framesOver50Ms:gaps.filter(n=>n>50).length,at:new Date().toISOString(),note:'Device-local Safari benchmark. Run separately on both phones; multiplayer connectivity still requires a separate real two-phone test.'};
output.textContent=JSON.stringify(report,null,2);state.textContent='Measurement complete';start.disabled=false;
};
