/* Versus presentation controls: tutorial and match report. */
(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const tutorials=[
 ['MOVE','Drag the left joystick to run. Use SPRINT for a burst.'],
 ['DEFEND','Get near the ball. DEKE to evade; TACKLE appears when you can contest possession.'],
 ['TEAM UP','In co-op, PASS to your teammate for a combined attacking move.'],
 ['SHOOT','Tap AIM to choose a corner; hold SHOOT to charge, then release.'],
 ['MODES','Try Classic, Golden Goal, Penalties, World Cup and 2v2.']
];
let index=0;
function tutorialStep(){
 const step=tutorials[index];
 byId('versus-tutorial-count').textContent=String(index+1)+' / '+tutorials.length;
 byId('versus-tutorial-title').textContent=step[0];
 byId('versus-tutorial-body').textContent=step[1];
 byId('versus-tutorial-next').textContent=index===tutorials.length-1?'DONE':'NEXT';
}
byId('versus-tutorial-open')?.addEventListener('click',()=>{index=0;tutorialStep();byId('versus-tutorial-panel').hidden=false;byId('versus-tutorial-next').focus();});
byId('versus-tutorial-next')?.addEventListener('click',()=>{if(++index>=tutorials.length){byId('versus-tutorial-panel').hidden=true;byId('versus-tutorial-open').focus();}else tutorialStep();});
byId('versus-tutorial-close')?.addEventListener('click',()=>{byId('versus-tutorial-panel').hidden=true;byId('versus-tutorial-open').focus();});

function exportedProgress(){
 const keys=['played','wins','draws','streak','bestStreak'];
 let saved={};try{saved=JSON.parse(localStorage.getItem('jozefs-world-versus-v1')||'{}')||{};}catch{}
 const record={};
 for(const k of keys)record[k]=Number.isSafeInteger(saved[k])?Math.max(0,Math.min(99999,saved[k])):0;
 const cup=localStorage.getItem('jozefs-world-versus-cup')==='won';
 const stage=Math.max(0,Math.min(2,Number(localStorage.getItem('jozefs-world-versus-cup-stage'))||0));
 return JSON.stringify({version:1,record,cup,stage});
}
byId('versus-progress-export')?.addEventListener('click',()=>{
 try{
  const area=byId('versus-progress-code');area.value=exportedProgress();area.focus();area.select();
  byId('versus-progress-status').textContent='Copy this code to the other device. Only local Versus records are included.';
 }catch{byId('versus-progress-status').textContent='Progress is unavailable in private storage mode.';}
});
byId('versus-progress-import')?.addEventListener('click',()=>{
 try{
  const raw=byId('versus-progress-code').value;
  if(raw.length>1500||raw.length<15)throw Error('Invalid code length');
  const val=JSON.parse(raw);
  if(val?.version!==1||typeof val.cup!=='boolean'||![0,1,2].includes(val.stage))throw Error('Unsupported progress code');
  const record={};
  for(const k of ['played','wins','draws','streak','bestStreak']){
   if(!Number.isSafeInteger(val.record?.[k])||val.record[k]<0||val.record[k]>99999)throw Error('Invalid progress record');
   record[k]=val.record[k];
  }
  localStorage.setItem('jozefs-world-versus-v1',JSON.stringify(record));
  localStorage.setItem('jozefs-world-versus-cup',val.cup?'won':'');
  localStorage.setItem('jozefs-world-versus-cup-stage',String(val.stage));
  window.dispatchEvent(new Event('jozef:versus-progress-updated'));
  byId('versus-progress-status').textContent='Progress imported. Local records on this device were replaced.';
 }catch{byId('versus-progress-status').textContent='Invalid progress code; nothing was changed.';}
});
function finish(room,state,cupStage){
 const panel=byId('versus-finish');
 if(!panel)return;
 const show=room?.phase==='finished'&&state?.score;
 panel.hidden=!show;
 if(!show)return;
 const a=state.score.jozef,b=state.score.dad;
 byId('versus-finish-title').textContent=room.together?(a>b?'DAD + JO WIN':a<b?'ROVERS WIN':'DRAW'):(a>b?'JOZEF WINS':b>a?'DAD WINS':'DRAW');
 byId('versus-finish-score').textContent=a+' — '+b;
 byId('versus-finish-stats').textContent=(state.shots||0)+' SHOTS · '+(state.saves||0)+' SAVES · '+(state.combo?.passes||0)+' PASSES · '+(state.combo?.assists||0)+' ASSISTS';
 byId('versus-finish-next').textContent=room.mode==='cup'&&a>b&&cupStage<2?'NEXT ROUND':'REMATCH';
}
byId('versus-finish-next')?.addEventListener('click',()=>byId('versus-again')?.click());
byId('versus-finish-exit')?.addEventListener('click',()=>byId('versus-leave')?.click());
window.JozefVersusExperience=Object.freeze({finish});
})();