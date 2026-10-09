/* Jozef FC squad builder — unlocked achievements become playable club tactics. */
(() => {
'use strict';
const KEY='jozefs-world-squad-v1';
const $=id=>document.getElementById(id);
const SLOTS=[['keeper','KEEPER','Goal protection'],['back','DEFENDER','Recover the ball'],['mid','PLAYMAKER','Quick passing'],['striker','STRIKER','Finish in style']];
const CARDS=[
 {id:'rookie',name:'Jozef / Rookie',rating:60,style:'captain',icon:'11',unlock:()=>true},
 {id:'goal',name:'Goal Getter',rating:73,style:'shot',icon:'09',unlock:p=>p.goals>=5},
 {id:'explorer',name:'World Explorer',rating:76,style:'speed',icon:'07',unlock:(p,c,t)=>t.wins>=1},
 {id:'captain',name:'Team Captain',rating:78,style:'captain',icon:'10',unlock:(p,c)=>c.played>=1||p.badges.includes('league-debut')},
 {id:'scholar',name:'Soccer Scholar',rating:81,style:'pass',icon:'08',unlock:p=>p.badges.includes('brain-power')||p.badges.includes('training-star')},
 {id:'super',name:'Super Striker',rating:88,style:'shot',icon:'11',unlock:p=>p.goals>=10},
 {id:'champion',name:'Jozef / Champion',rating:99,style:'captain',icon:'99',unlock:(p,c,t)=>c.cups>=1||t.cups>=1}
];
function load(){
 try{
  const raw=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {tactic:'balanced',slots:{striker:'rookie'}};
  const slots={};
  const used=new Set();
  for(const [id] of SLOTS){
    const value=raw.slots?.[id];
    if(typeof value==='string'&&CARDS.some(card=>card.id===value)&&!used.has(value)){
      slots[id]=value;used.add(value);
    }
  }
  if(!Object.values(slots).includes('rookie')&&Object.keys(slots).length===0)slots.striker='rookie';
  return {tactic:['balanced','attack','defence'].includes(raw.tactic)?raw.tactic:'balanced',slots};
 }catch(_){return {tactic:'balanced',slots:{striker:'rookie'}};}
}
let state=load();
function progress(){
 return {
  p:window.JozefWorld?.getProgress?.()||{goals:0,badges:[]},
  c:window.JozefCareer?.getProgress?.()||{played:0,cups:0},
  t:window.JozefTour?.getProgress?.()||{wins:0,cups:0}
 };
}
function available(){
 const {p,c,t}=progress();
 return CARDS.filter(card=>card.unlock(p,c,t));
}
function safe(){
 const availableSet=new Set(available().map(x=>x.id));
 const used=new Set();
 for(const [slot] of SLOTS){
  const card=state.slots[slot];
  if(!card||!availableSet.has(card)||used.has(card))delete state.slots[slot];
  else used.add(card);
 }
 if(!Object.keys(state.slots).length)state.slots.striker='rookie';
}
function calculate(){
 safe();
 const chosen=SLOTS.map(([slot])=>CARDS.find(card=>card.id===state.slots[slot])).filter(Boolean);
 let speed=0,pass=0,shot=0;
 for(const card of chosen){
   const power=Math.max(0,(card.rating-57)/100)*.32;
   if(card.style==='speed')speed+=power*1.5;
   if(card.style==='pass')pass+=power*1.5;
   if(card.style==='shot')shot+=power*1.4;
   if(card.style==='captain'){speed+=power*.3;pass+=power*.3;shot+=power*.3;}
 }
 if(state.tactic==='attack')shot+=.07;
 if(state.tactic==='defence')speed+=.06;
 if(state.tactic==='balanced')pass+=.04;
 return {speed:Math.min(.25,speed),pass:Math.min(.25,pass),shot:Math.min(.25,shot)};
}
function save(){
 safe();
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}
 window.dispatchEvent?.(new Event('jozef:squad-updated'));
 render();
}
function make(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value)e.textContent=value;return e;}
function render(){
 const el=$('squad-grid');if(!el)return;
 safe();const cards=available();const used=new Set(Object.values(state.slots));
 el.replaceChildren();
 SLOTS.forEach(([slot,label,tip],idx)=>{
  const item=make('div','squad-position');
  const top=make('div','squad-position-head');
  top.append(make('span','squad-position-label',String(idx+1).padStart(2,'0')+' / '+label),make('small','',tip));
  const active=CARDS.find(x=>x.id===state.slots[slot]);
  const preview=make('div','squad-position-card');
  preview.append(make('span','squad-position-number',active?.icon||'--'),make('strong','',active?.name||'ACADEMY PLAYER'));
  preview.append(make('small','',active?'OVR '+active.rating+' / '+active.style.toUpperCase():'OVR 58 / STARTER'));
  const select=make('select','squad-select');
  select.setAttribute('aria-label','Choose '+label.toLowerCase());
  const empty=make('option','', 'Academy Player');empty.value='';select.appendChild(empty);
  for(const card of cards){
    if(used.has(card.id)&&state.slots[slot]!==card.id)continue;
    const opt=make('option','',card.name+' · '+card.rating);opt.value=card.id;select.appendChild(opt);
  }
  select.value=state.slots[slot]||'';
  select.addEventListener('change',()=>{
    const next=select.value;
    const inUse=Object.entries(state.slots).some(([k,v])=>k!==slot&&v===next);
    if(!next)delete state.slots[slot];
    else if(cards.some(card=>card.id===next)&&!inUse)state.slots[slot]=next;
    save();
  });
  item.append(top,preview,select);el.appendChild(item);
 });
 const v=calculate();const scale=n=>Math.round(n*100);
 const info=$('squad-bonuses');if(info)info.textContent='SPEED +'+scale(v.speed)+'%  •  PASS +'+scale(v.pass)+'%  •  SHOOT +'+scale(v.shot)+'%';
 const count=$('squad-available');if(count)count.textContent=cards.length+' / '+CARDS.length+' players unlocked';
 const select=$('squad-tactic');if(select)select.value=state.tactic;
 const badge=$('squad-formation');if(badge)badge.textContent=state.tactic==='attack'?'PRESS HIGH':state.tactic==='defence'?'STAY COMPACT':'PLAY TOGETHER';
}
$('squad-tactic')?.addEventListener('change',ev=>{
 const tactic=ev.target.value;if(!['balanced','attack','defence'].includes(tactic))return;
 state.tactic=tactic;save();
});
document.querySelector('.nav-btn[data-section="club"]')?.addEventListener('click',render);
window.addEventListener('jozef:profile-updated',render);
window.addEventListener('jozef:progress',render);
window.JozefSquad=Object.freeze({getSquad:()=>({slots:{...state.slots},tactic:state.tactic,bonuses:calculate()})});
render();
})();
