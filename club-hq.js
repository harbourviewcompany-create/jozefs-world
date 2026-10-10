/* Jozef FC / One shared Club HQ. Only stores two booleans for today's play.
   No profile split, streak, account, networking, tracking, or extra XP. */
(() => {
  'use strict';
  const KEY='jozefs-world-club-today-v1';
  const $=id=>document.getElementById(id);
  const day=()=>{
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  };
  let fallback={date:day(),arena:false,street:false};
  function load(){
    const current=day();
    try {
      const value=JSON.parse(localStorage.getItem(KEY)||'null');
      if(value && value.date===current && typeof value.arena==='boolean' && typeof value.street==='boolean'){
        fallback={date:current,arena:value.arena,street:value.street};
        return {...fallback};
      }
    }catch(_){/* A disabled private-storage setting must never interrupt games. */}
    if(fallback.date!==current)fallback={date:current,arena:false,street:false};
    return {...fallback};
  }
  function persist(state){
    fallback={...state};
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){/* Still usable without storage. */}
  }
  function mark(type){
    if(type!=='arena' && type!=='street')return;
    const state=load();
    if(!state[type]){
      state[type]=true;
      persist(state);
    }
    render();
  }
  function render(){
    const state=load(),count=Number(state.arena)+Number(state.street);
    const counter=$('today-counter');
    if(counter)counter.textContent=count===2?'BOTH PLAYED TODAY':count+' / 2 PLAYED';
    const meter=$('today-meter');
    if(meter)meter.style.width=(count*50)+'%';
    const progress=$('today-progress')||meter?.parentElement;
    if(progress)progress.setAttribute('aria-valuenow',String(count));
    for(const [kind,name] of [['arena','MATCH'],['street','RUN']]){
      const completed=state[kind];
      const task=$('today-task-'+kind);
      if(task)task.classList.toggle('is-complete',completed);
      const status=$('today-'+kind+'-status');
      if(status)status.textContent=completed?name+' PLAYED TODAY':'Not played today';
      const button=$('today-play-'+kind);
      if(button)button.textContent=completed?'PLAY AGAIN ↗':kind==='arena'?'PLAY MATCH ↗':'RUN STREET ↗';
    }
  }
  window.addEventListener?.('jozef:arena-completed',()=>mark('arena'));
  window.addEventListener?.('jozef:street-completed',()=>mark('street'));
  window.addEventListener?.('storage',event=>{if(event.key===KEY)render();});
  window.addEventListener?.('pageshow',render);
  document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)render();});
  // Pick up a new local date if the page remains open past midnight.
  if(typeof setInterval==='function')setInterval(render,60000);
  window.JozefClubHQ=Object.freeze({getToday:load});
  render();
})();