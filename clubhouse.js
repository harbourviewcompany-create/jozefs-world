/* Jozef FC player cards and parent-guided, device-only progress backup. */
(() => {
  'use strict';
  const profile = () => window.JozefWorld?.getProgress?.() || {xp:0,goals:0,level:1,badges:[]};
  const career = () => window.JozefCareer?.getProgress?.() || {played:0,cups:0};
  const tour = () => window.JozefTour?.getProgress?.() || {wins:0,cups:0};
  const cardDefs = [
    {title:'Jozef the Rookie', icon:'⚽', role:'ROOKIE', star:'60', tip:'Your first player card', ready:()=>true},
    {title:'Goal Getter', icon:'🥅', role:'STRIKER', star:'73', tip:'Score 5 goals', ready:(p)=>p.goals>=5},
    {title:'World Explorer', icon:'🌍', role:'WINGER', star:'76', tip:'Win a World Tour match', ready:(p,c,t)=>t.wins>=1},
    {title:'Team Captain', icon:'🦁', role:'CAPTAIN', star:'78', tip:'Complete your first Career match', ready:(p,c)=>c.played>=1 || p.badges.includes('league-debut')},
    {title:'Soccer Scholar', icon:'🧠', role:'PLAYMAKER', star:'81', tip:'Complete a quiz or training drill', ready:p=>p.badges.some(x=>x==='brain-power'||x==='training-star')},
    {title:'Super Striker', icon:'⭐', role:'ATTACKER', star:'88', tip:'Score 10 goals', ready:p=>p.goals>=10},
    {title:'Jozef the Champion', icon:'🏆', role:'LEGEND', star:'99', tip:'Win a league or World Tour cup', ready:(p,c,t)=>c.cups>=1||t.cups>=1}
  ];
  const $=id=>document.getElementById(id);
  function renderCards(){
    const root=$('clubhouse-cards');
    if(!root)return;
    const p=profile(),c=career(),t=tour();
    root.replaceChildren();
    let count=0;
    for(const card of cardDefs){
      const isOpen=Boolean(card.ready(p,c,t));if(isOpen)count++;
      const cell=document.createElement('div');cell.className='clubhouse-player-card'+(isOpen?' unlocked':' locked');
      cell.setAttribute('aria-label',card.title+(isOpen?' unlocked': ' locked. '+card.tip));
      const header=document.createElement('div');header.className='clubhouse-player-card-top';
      const rating=document.createElement('strong');rating.textContent=isOpen?card.star:'--';
      const role=document.createElement('small');role.textContent=card.role;
      header.append(rating,role);
      const figure=document.createElement('span');figure.className='clubhouse-player-card-figure';figure.textContent=isOpen?card.icon:'🔒';
      const name=document.createElement('strong');name.className='clubhouse-player-card-name';name.textContent=card.title;
      const hint=document.createElement('small');hint.className='clubhouse-player-card-hint';hint.textContent=isOpen?'✓ Collected':card.tip;
      cell.append(header,figure,name,hint);
      root.appendChild(cell);
    }
    const total=$('clubhouse-card-count');if(total)total.textContent=count+' / '+cardDefs.length;
  }
  const KEYS=['jozefs-world-player-v1','jozefs-world-tour-v1','jozefs-world-career-v1','jozefKeepyBest','jozefs-world-street-best-v1','jozefs-world-notes-v1',
    'jozefs-world-matchday-v1','jozefs-world-formation-v1','jozefs-world-training-v1','jozefs-world-jersey-v1','jozefs-world-bingo-v1','jozefs-world-missions-v1','jozefs-world-squad-v1','jozefs-world-arena-v1'];
  const status=message=>{const el=$('clubhouse-backup-status');if(el)el.textContent=message};
  function read(key) {
    try {return localStorage.getItem(key)}catch(_){return null}
  }
  function exportBackup(){
    try {
      const data={};
      for(const key of KEYS){
        const value=read(key);
        if(value==null){data[key]=null;continue;}
        data[key]=['jozefKeepyBest','jozefs-world-street-best-v1'].includes(key)?String(value):JSON.parse(value);
      }
      const backup={format:'jozefs-world-local-backup',version:1,createdAt:new Date().toISOString(),data};
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download='jozefs-world-progress-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),2000);
      status('Backup downloaded. Keep the file private and store it somewhere safe.');
    }catch(_){status('Could not create a backup. Please make sure browser storage and downloads are available.')}
  }
  function safeJSON(value,depth=0) {
    if(depth>6)return false;
    if(value===null)return true;
    if(typeof value==='string')return value.length<=250;
    if(typeof value==='number')return Number.isFinite(value)&&Math.abs(value)<=1e9;
    if(typeof value==='boolean')return true;
    if(Array.isArray(value))return value.length<=1500&&value.every(x=>safeJSON(x,depth+1));
    if(typeof value!=='object')return false;
    const entries=Object.entries(value);
    return entries.length<=70&&entries.every(([k,v])=>
      k.length<=80&&!['__proto__','constructor','prototype'].includes(k)&&safeJSON(v,depth+1));
  }
  function checkBackup(payload){
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.format!=='jozefs-world-local-backup'||payload.version!==1)
      throw new Error('Not a recognized Jozef’s World backup.');
    if(!payload.data||typeof payload.data!=='object'||Array.isArray(payload.data))throw new Error('The backup has no saved progress.');
    const present=Object.keys(payload.data);
    if(present.length===0||present.some(k=>!KEYS.includes(k)))throw new Error('The backup contains unexpected data.');
    const output={};
    for(const key of KEYS){
      // Older backups did not contain all modes. Never erase newer progress when
      // restoring an older backup that omitted a key.
      if(!Object.prototype.hasOwnProperty.call(payload.data,key))continue;
      const value=payload.data[key];
      if(value===null){output[key]=null;continue;}
      if(['jozefKeepyBest','jozefs-world-street-best-v1'].includes(key)){
        if(!/^[0-9]{1,7}$/.test(String(value)))throw new Error('Invalid keepy-uppy score.');
        output[key]=String(value);continue;
      }
      if(!value||typeof value!=='object'||Array.isArray(value)||!safeJSON(value))
        throw new Error('One of the progress files is invalid.');
      if(key==='jozefs-world-player-v1'){
        if(value.xp!==undefined&&(!Number.isFinite(value.xp)||value.xp<0||value.xp>1e8))
          throw new Error('Invalid XP data.');
      }
      if(key==='jozefs-world-tour-v1'&&value.season!==undefined&&(!Number.isInteger(value.season)||value.season<1))
        throw new Error('Invalid World Tour data.');
      if(key==='jozefs-world-career-v1'&&value.season!==undefined&&(!Number.isInteger(value.season)||value.season<1))
        throw new Error('Invalid Career Mode data.');
      output[key]=JSON.stringify(value);
    }
    if(Object.values(output).every(value=>value===null))throw new Error('The backup does not contain any progress.');
    return output;
  }
  async function importBackup(event) {
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(file.size>250000){status('Backup is too large. Select a Jozef’s World backup smaller than 250 KB.');return;}
    try {
      const text=await file.text();
      const values=checkBackup(JSON.parse(text));
      const confirmMessage='Restore this backup? This will replace saved progress for the activities included in the file. Progress for activities not in this backup will stay unchanged. Continue?';
      if(!window.confirm(confirmMessage)){status('Restore cancelled. Your progress was not changed.');return;}
      const old={};
      for(const key of KEYS)old[key]=read(key);
      try {
        for(const key of KEYS){if(!Object.prototype.hasOwnProperty.call(values,key))continue;if(values[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,values[key]);}
      }catch(error){
        for(const key of KEYS){
          try{if(old[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,old[key])}catch(_){}
        }
        throw error;
      }
      status('Backup restored. Reloading your player progress.');
      window.location.reload();
    }catch(error){status(error?.message||'Could not restore this backup. No changes were made.')}
  }
  $('clubhouse-export')?.addEventListener('click',exportBackup);
  $('clubhouse-import-button')?.addEventListener('click',()=>$('clubhouse-import')?.click());
  $('clubhouse-import')?.addEventListener('change',importBackup);
  window.addEventListener('jozef:profile-updated',renderCards);
  document.querySelector('[data-section="club"]')?.addEventListener('click',renderCards);
  document.querySelector('.jw-profile-open[onclick*="club"]')?.addEventListener('click',renderCards);
  renderCards();
})();
