/* iPhone Safari endurance recorder: runs entirely on the device; nothing is uploaded. */
(function(root,factory){
 'use strict';
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document)api.mount(root);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const percentile=(values,p)=>{
  if(!values.length)return null;
  const s=[...values].sort((a,b)=>a-b),index=Math.min(s.length-1,Math.max(0,Math.floor((s.length-1)*p)));
  return Math.round(s[index]*10)/10;
 };
 function summarize(samples){
  const fps=samples.map(x=>x.fps).filter(Number.isFinite),memory=samples.map(x=>x.heapMB).filter(Number.isFinite);
  return {samples:samples.length,medianFps:percentile(fps,.5),p10Fps:percentile(fps,.1),
   worstFps:percentile(fps,0),p90RenderScale:percentile(samples.map(x=>x.renderScale).filter(Number.isFinite),.9),
   startHeapMB:memory[0]??null,endHeapMB:memory.at(-1)??null,
   heapGrowthMB:memory.length>1?Math.round((memory.at(-1)-memory[0])*10)/10:null,
   averageJankPerMinute:samples.length?Math.round(samples.reduce((a,x)=>a+x.longFrames,0)/samples.length*60*10)/10:null};
 }
 function mount(w){
  const menu=w.document.getElementById('drawer'),view=w.document.getElementById('view');
  if(!menu||!view||w.document.getElementById('iphone-perf-start'))return;
  const panel=w.document.createElement('div');panel.className='jw-perf-panel';
  const start=w.document.createElement('button');start.type='button';start.id='iphone-perf-start';start.textContent='START 20-MIN IPHONE TEST';
  const finish=w.document.createElement('button');finish.type='button';finish.id='iphone-perf-finish';finish.textContent='STOP & EXPORT REPORT';finish.hidden=true;
  const status=w.document.createElement('p');status.className='jw-perf-status';status.setAttribute('role','status');
  status.textContent='Measure 20 minutes of 3D play on a real phone. Report stays on this device.';
  panel.append(start,finish,status);menu.append(panel);
  const chip=w.document.createElement('output');chip.className='jw-perf-chip';chip.hidden=true;chip.setAttribute('aria-live','off');chip.textContent='MEASURING';w.document.body.append(chip);
  const DURATION=20*60*1000;
  let recording=false,samples=[],started=0,activeMs=0,hiddenAt=0,lastAt=0,nextSample=0,frames=0,longFrames=0,contextLosses=0,pagesHidden=0;
  function statusSnapshot(){return w.BlockWorld3D?.status?.()||{};}
  function exportReport(){
   const result={format:'jozef-world-iphone-performance',version:1,createdAt:new Date().toISOString(),
    device:{userAgent:w.navigator.userAgent,viewport:{width:w.innerWidth,height:w.innerHeight},pixelRatio:w.devicePixelRatio||1},
    durationActiveSeconds:Math.round(activeMs/1000),requiredSeconds:1200,
    completed20Minutes:activeMs>=DURATION,
    contextLosses,pagesHidden,summary:summarize(samples),samples,
    limits:'Reported frame pacing and JS heap (when available) are approximations. Heat, battery and touch latency require actual physical observation. No certification inferred.'};
   const blob=new w.Blob([JSON.stringify(result,null,2)],{type:'application/json'});
   const u=w.URL.createObjectURL(blob),a=w.document.createElement('a');a.href=u;a.download='jozef-world-iphone-performance.json';
   w.document.body.append(a);a.click();a.remove();w.setTimeout(()=>w.URL.revokeObjectURL(u),1500);
   return result;
  }
  function stop(){
   if(!recording)return;
   recording=false;chip.hidden=true;start.hidden=false;finish.hidden=true;
   const report=exportReport();status.textContent='Recorded '+Math.round(activeMs/60000)+' active minutes; '+(report.summary.medianFps??0)+' median FPS. Report exported locally.';
  }
  function tick(now){
   if(recording&&!w.document.hidden){
    if(lastAt){
     const elapsed=Math.min(100,now-lastAt);activeMs+=elapsed;frames++;
     if(elapsed>50)longFrames++;
    }
    lastAt=now;
    if(now>=nextSample){
     const dt=Math.max(.001,(now-(nextSample-1000))/1000),state=statusSnapshot();
     const heap=w.performance?.memory?.usedJSHeapSize;
     samples.push({t:Math.round(activeMs/1000),fps:Math.round(frames/dt),longFrames,
      renderScale:Number.isFinite(state.renderScale)?state.renderScale:null,
      chunks:state.loadedChunks??null,drawnChunks:state.drawnChunks??null,
      heapMB:Number.isFinite(heap)?Math.round(heap/1048576*10)/10:null,
      graphics:state.shaderMode||null,connection:state.connected===true});
     frames=0;longFrames=0;nextSample=now+1000;
     chip.textContent='IPHONE TEST '+Math.floor(activeMs/60000)+'m / 20m · '+(samples.at(-1)?.fps||0)+' FPS';
    }
    if(activeMs>=DURATION)stop();
   }
   w.requestAnimationFrame(tick);
  }
  w.document.addEventListener('visibilitychange',()=>{
   if(!recording)return;
   if(w.document.hidden){pagesHidden++;hiddenAt=w.performance.now();lastAt=0;frames=longFrames=0;}
   else{hiddenAt=0;lastAt=0;nextSample=w.performance.now()+1000;}
  });
  view.addEventListener('webglcontextlost',()=>{if(recording)contextLosses++;});
  start.addEventListener('click',()=>{
   if(recording)return;
   recording=true;samples=[];started=w.performance.now();activeMs=0;hiddenAt=0;lastAt=0;
   frames=longFrames=contextLosses=pagesHidden=0;nextSample=started+1000;
   start.hidden=true;finish.hidden=false;chip.hidden=false;status.textContent='20-minute on-device test recording. Explore the forest, pond and portal.';
   // Close options so movement and rendering continue during the test.
   w.document.getElementById('close')?.click();
  });
  finish.addEventListener('click',stop);
  w.requestAnimationFrame(tick);
  w.JozefIphonePerformance=Object.freeze({status:()=>({recording,activeSeconds:Math.round(activeMs/1000),
   sampleCount:samples.length,summary:summarize(samples)}),stop});
 }
 return Object.freeze({summarize,percentile,mount});
});
