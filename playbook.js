/* JOZEF FC // COACH'S PLAYBOOK.
 * A single, private progression map driven by actual saved game states.
 * Mission completion is derived from real stats, never awarded by opening pages.
 * No uploads, profiles, time pressure, telemetry or duplicate XP sources.
 */
(() => {
'use strict';
const KEY='jozefs-world-playbook-v1';
const $=id=>document.getElementById(id);
const cap=(n,max)=>Math.min(max,Math.max(0,Number.isFinite(Number(n))?Math.floor(Number(n)):0));
const missions=[
  {id:'kickoff',group:'football',title:'FIRST THREE KICKOFFS',detail:'Finish three Arena matches.',target:3,section:'arena',stat:s=>s.arena.games,tip:'Play a full Arena match. A finished match counts, win or lose.'},
  {id:'rivalry',group:'football',title:'BEAT THE RIVALS',detail:'Win two Arena matches.',target:2,section:'arena',stat:s=>s.arena.wins,tip:'Try a short pass before shooting. A clear angle creates better chances.'},
  {id:'goals',group:'football',title:'EIGHT UNDER THE LIGHTS',detail:'Score eight Arena goals.',target:8,section:'arena',stat:s=>s.arena.goals,tip:'Switch shot direction before you shoot; notice where the keeper stands.'},
  {id:'street',group:'football',title:'STREET STAR',detail:'Reach a best score of 40 in Street//11.',target:40,section:'street',stat:s=>s.street.best,tip:'Switch lanes early instead of waiting for an obstacle to reach you.'},
  {id:'career',group:'football',title:'CLIMB THE LEAGUE',detail:'Finish two Career Mode fixtures.',target:2,section:'career',stat:s=>s.career.played,tip:'Read each tactical situation. A pass or position can matter as much as a goal.'},
  {id:'tour',group:'football',title:'WORLD PASSPORT',detail:'Win twice in World Tour.',target:2,section:'tour',stat:s=>s.tour.wins,tip:'Watch the goalkeeper hints, and remember the countries you visit.'},
  {id:'lineup',group:'club',title:'BUILD YOUR FOUR',detail:'Fill three squad positions with unlocked cards.',target:3,section:'club',stat:s=>s.squad.players,tip:'Pick unlocked cards for different positions and try the attack or defence tactic.'},
  {id:'badges',group:'club',title:'HALL OF HONOURS',detail:'Collect six earned badges.',target:6,section:'club',stat:s=>s.profile.badges,tip:'Try more than one type of game. Different accomplishments earn different badges.'},
  {id:'history',group:'club',title:'WRITE THE LEGEND',detail:'Create five real Chronicle highlights.',target:5,section:'chronicle',stat:s=>s.history.entries,tip:'Finished matches and newly earned milestones become Chronicle stories.'},
  {id:'hockey',group:'sports',title:'LIGHT THE LAMP',detail:'Score 3 out of 5 in hockey.',target:3,section:'sports-arcade',sport:'hockey',stat:s=>s.sports.hockey,tip:'Use the whole goal. Choose a corner away from the moving keeper.'},
  {id:'baseball',group:'sports',title:'FIND THE SWEET SPOT',detail:'Score 3 out of 5 in baseball.',target:3,section:'sports-arcade',sport:'baseball',stat:s=>s.sports.baseball,tip:'Watch the ball approach, then swing as the timing marker enters the middle.'},
  {id:'basketball',group:'sports',title:'SHOOT FROM DOWNTOWN',detail:'Score 3 out of 5 in basketball.',target:3,section:'sports-arcade',sport:'basketball',stat:s=>s.sports.basketball,tip:'Release near the middle of the power bar. Try keeping the timing steady.'},
  {id:'wrestling',group:'sports',title:'RULE THE RING',detail:'Score 3 out of 5 in the wrestling show.',target:3,section:'sports-arcade',sport:'wrestling',stat:s=>s.sports.wrestling,tip:'Read the crowd prompt before choosing an entrance, pose or trivia answer.'},
  {id:'main-event',group:'sports',title:'THE MAIN EVENT',detail:'Earn three qualifying wrestling show wins.',target:3,section:'sports-arcade',sport:'wrestling',stat:s=>s.sports.showWins,tip:'A wrestling career win needs at least three correct show moments.'},
  {id:'cup',group:'sports',title:'ALL-SPORT CHAMPION',detail:'Qualify in all four arcade sports.',target:4,section:'sports-arcade',stat:s=>s.sports.qualified,tip:'Try the next sport in the Cup panel. Each needs a best score of at least three.'}
];
const groups={all:'ALL CHALLENGES',football:'FOOTBALL',sports:'ALL SPORTS',club:'MY CLUB'};
let focus='all';
try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored&&groups[stored.focus])focus=stored.focus;}catch(_){}
function snapshot(){
 const a=window.JozefArena?.getProgress?.()||{};
 const st=window.JozefStreet?.getProgress?.()||{};
 const c=window.JozefCareer?.getProgress?.()||{};
 const t=window.JozefTour?.getProgress?.()||{};
 const p=window.JozefWorld?.getProgress?.()||{};
 const sq=window.JozefSquad?.getSquad?.()||{};
 const multi=window.JozefMultiSport?.getProgress?.()||{};
 const cup=window.JozefMultiSport?.getCupProgress?.()||{};
 const chron=window.JozefChronicle?.getEntries?.()||[];
 return {
  arena:{games:cap(a.games,999999),wins:cap(a.wins,999999),goals:cap(a.goals,999999)},
  street:{best:cap(st.best,999999)},
  career:{played:cap((cap(c.season,9999)-1)*6+cap(c.played,6),999999)},
  tour:{wins:cap(t.wins,999999)},
  profile:{badges:Array.isArray(p.badges)?p.badges.length:0,level:cap(p.level,9999)||1},
  squad:{players:Object.values(sq.slots||{}).filter(Boolean).length},
  history:{entries:Array.isArray(chron)?chron.length:0},
  sports:{hockey:cap(multi.hockey?.best,5),baseball:cap(multi.baseball?.best,5),
    basketball:cap(multi.basketball?.best,5),wrestling:cap(multi.wrestling?.best,5),
    showWins:cap(multi.wrestling?.careerWins,999999),qualified:cap(cup.qualified,4)}
 };
}
function results(s=snapshot()){
 return missions.map(m=>({...m,current:Math.min(m.target,cap(m.stat(s),m.target)),
   complete:cap(m.stat(s),m.target)>=m.target}));
}
function selection(rows){
 const items=focus==='all'?rows:rows.filter(r=>r.group===focus);
 const pending=items.filter(r=>!r.complete).sort((a,b)=>{
   const pa=a.current/a.target,pb=b.current/b.target;
   return pb-pa || missions.indexOf(a)-missions.indexOf(b);
 });
 return pending[0]||items[0]||rows[0];
}
function rank(n){
 if(n>=15)return {title:'THE CLUB LEGEND',next:15};
 if(n>=11)return {title:'ALL-SPORT SUPERSTAR',next:15};
 if(n>=7)return {title:'THE MAIN EVENT',next:11};
 if(n>=3)return {title:'RISING STAR',next:7};
 return {title:'ACADEMY ROOKIE',next:3};
}
function go(m){
 if(!m||typeof window.showSection!=='function')return;
 window.showSection(m.section);
 if(m.sport)window.JozefMultiSport?.playSport?.(m.sport);
}
function missionCard(m){
 const card=document.createElement('article');card.className='playbook-mission'+(m.complete?' is-done':'');
 const meta=document.createElement('div');meta.className='playbook-mission-meta';
 const category=document.createElement('span');category.textContent=m.group.toUpperCase();
 const status=document.createElement('span');status.textContent=m.complete?'COMPLETE ✓':m.current+' / '+m.target;
 meta.append(category,status);
 const title=document.createElement('h4');title.textContent=m.title;
 const copy=document.createElement('p');copy.textContent=m.detail;
 const track=document.createElement('div');track.className='playbook-mission-track';
 track.setAttribute('role','progressbar');track.setAttribute('aria-label',m.title+' progress');
 track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(m.target));
 track.setAttribute('aria-valuenow',String(m.current));
 const fill=document.createElement('span');fill.style.width=(m.current/m.target*100)+'%';track.append(fill);
 const button=document.createElement('button');button.type='button';button.textContent=m.complete?'PLAY AGAIN ↗':'TAKE CHALLENGE ↗';
 button.addEventListener('click',()=>go(m));
 card.append(meta,title,copy,track,button);
 return card;
}
function render(){
 const rows=results(),completed=rows.filter(m=>m.complete).length,
   featured=selection(rows),r=rank(completed);
 const grid=$('playbook-missions');
 if(grid){grid.replaceChildren();rows.filter(x=>focus==='all'||x.group===focus).forEach(m=>grid.append(missionCard(m)));}
 const put=(id,str)=>{const n=$(id);if(n)n.textContent=String(str)};
 put('playbook-count',completed+' / '+missions.length+' COMPLETE');
 put('playbook-rank',r.title);
 put('playbook-next-rank',completed===missions.length?'ALL CHALLENGES COMPLETE':(r.next-completed)+' TO NEXT RANK');
 put('playbook-coach-title',featured.complete?'MAKE YOUR OWN HISTORY.':featured.title);
 put('playbook-coach-tip',featured.complete?'All these challenges are done. Replay your favourites or design a new squad.':featured.tip);
 put('playbook-coach-progress',featured.current+' / '+featured.target);
 const home=$('playbook-home-status');
 if(home)home.textContent=completed+' / '+missions.length+' PLAYBOOK MISSIONS COMPLETED · '+r.title;
 const meter=$('playbook-meter');if(meter)meter.style.width=completed/missions.length*100+'%';
 const progress=$('playbook-progress');progress?.setAttribute('aria-valuenow',String(completed));
 const btn=$('playbook-coach-go');
 if(btn){btn.textContent=featured.complete?'REPLAY A CHALLENGE ↗':'PLAY '+(featured.sport?featured.sport.toUpperCase():featured.group.toUpperCase())+' ↗';
  btn.onclick=()=>go(featured);}
 for(const key of Object.keys(groups)){
   const tab=$('playbook-filter-'+key);
   if(tab){tab.setAttribute('aria-pressed',String(focus===key));tab.classList.toggle('selected',focus===key)}
 }
}
function setFocus(value){
 if(!groups[value])return;
 focus=value;
 try{localStorage.setItem(KEY,JSON.stringify({focus}))}catch(_){}
 render();
}
function boot(){
 for(const key of Object.keys(groups))$('playbook-filter-'+key)?.addEventListener('click',()=>setFocus(key));
 for(const event of ['jozef:profile-updated','jozef:squad-updated','jozef:arena-completed',
  'jozef:street-completed','jozef:multisport-completed','jozef:chronicle-sync','jozef:progress','pageshow']){
  window.addEventListener?.(event,render);
 }
 window.addEventListener?.('storage',event=>{if(event.key===KEY){try{
   const val=JSON.parse(event.newValue||'null');if(groups[val?.focus])focus=val.focus;
  }catch(_){}render()}});
 document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)render()});
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
window.JozefPlaybook=Object.freeze({getProgress:()=>{const r=results();return{completed:r.filter(x=>x.complete).length,total:r.length,rank:rank(r.filter(x=>x.complete).length).title}},setFocus});
})();