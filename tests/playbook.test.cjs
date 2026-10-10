const bundled=require('./bundle-contract.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'playbook.js'),'utf8');
const css=fs.readFileSync(path.join(root,'playbook.css'),'utf8');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
function boot({store=new Map(),stats={}}={}){
 const nodes=new Map(),listeners={},visited=[],played=[];
 const data={
  arena:{games:2,wins:1,goals:4},street:{best:31},
  career:{season:1,played:1},tour:{wins:1},
  squad:{slots:{striker:'rookie'}},profile:{badges:['first-goal','league-debut'],level:2},
  sports:{hockey:{best:2},baseball:{best:0},basketball:{best:3},wrestling:{best:2,careerWins:0}},
  cup:{qualified:1},history:[{type:'arena'},{type:'street'}]
 };
 Object.assign(data,stats);
 class Node{
  constructor(){this.children=[];this.textContent='';this.attrs={};this.className='';this.events={};this.style={};this.classSet=new Set();
   this.classList={toggle:(value,on)=>{if(on)this.classSet.add(value);else this.classSet.delete(value)}};}
  setAttribute(key,value){this.attrs[key]=String(value);}
  append(...xs){this.children.push(...xs)}
  replaceChildren(...xs){this.children=xs}
  addEventListener(name,fn){this.events[name]=fn}
  click(){this.events.click?.();this.onclick?.()}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)};
 const document={readyState:'complete',hidden:false,
  getElementById:get,createElement:()=>new Node(),addEventListener:(event,fn)=>listeners['doc:'+event]=fn};
 const window={addEventListener:(event,fn)=>listeners[event]=fn,
  showSection:id=>visited.push(id),
  JozefArena:{getProgress:()=>data.arena},JozefStreet:{getProgress:()=>data.street},
  JozefCareer:{getProgress:()=>data.career},JozefTour:{getProgress:()=>data.tour},
  JozefSquad:{getSquad:()=>data.squad},JozefWorld:{getProgress:()=>data.profile},
  JozefMultiSport:{getProgress:()=>data.sports,getCupProgress:()=>data.cup,playSport:sport=>played.push(sport)},
  JozefChronicle:{getEntries:()=>data.history}};
 const localStorage={getItem:key=>store.get(key)||null,setItem:(key,v)=>store.set(key,String(v))};
 vm.runInNewContext(source,{window,document,localStorage,Math,Number,String,JSON,Array,Set,Object},{timeout:1500});
 return{get,nodes,window,data,store,listeners,visited,played};
}
test('Coach Playbook has a deep-link route, home preview, accessible goals and offline assets',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'index.html'),'utf8'));
 for(const id of ['playbook','playbook-home-status','playbook-missions','playbook-coach-go','playbook-progress','playbook-meter','playbook-count',
  'playbook-filter-all','playbook-filter-football','playbook-filter-sports','playbook-filter-club']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 const js=fs.readFileSync(path.join(root,'stadium.js'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(js,/'playbook'/);
 assert.ok(sw.includes("'./playbook.js'"));
 bundled.css(root,html,sw,'playbook.css');
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(css, /focus-visible/);
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|innerHTML\s*=/);
 assert.doesNotMatch(css,/@import|url\(\s*https?:/);
 const backup=fs.readFileSync(path.join(root,'clubhouse.js'),'utf8');
 assert.ok(backup.includes("'jozefs-world-playbook-v1'"));
});
test('existing real activity totals, selected squad and Chronicle count automatically',()=>{
 const b=boot();
 assert.equal(b.get('playbook-count').textContent,'1 / 15 COMPLETE'); // basketball best=3
 assert.equal(b.get('playbook-rank').textContent,'ACADEMY ROOKIE');
 assert.equal(b.get('playbook-missions').children.length,15);
 const first=b.get('playbook-missions').children[0];
 assert.equal(first.children[1].textContent,'FIRST THREE KICKOFFS');
 assert.equal(first.children[3].attrs['aria-valuenow'],'2');
 assert.equal(first.children[3].attrs['aria-valuemax'],'3');
 assert.equal(b.window.JozefPlaybook.getProgress().completed,1);
 assert.equal(b.store.size,0,'real mission completion should never award an XP bonus or write a duplicated journal');
 b.data.arena.games=3;
 b.listeners['jozef:arena-completed']();
 assert.equal(b.get('playbook-count').textContent,'2 / 15 COMPLETE');
 assert.equal(b.get('playbook-home-status').textContent,'2 / 15 PLAYBOOK MISSIONS COMPLETED · ACADEMY ROOKIE');
 b.data.squad.slots.back='scholar';b.data.squad.slots.keeper='captain';
 b.listeners['jozef:squad-updated']();
 assert.equal(b.window.JozefPlaybook.getProgress().completed,3);
 assert.equal(b.get('playbook-rank').textContent,'RISING STAR');
});
test('focused sport missions navigate to the correct playable game, never a fake win',()=>{
 const b=boot();
 b.get('playbook-filter-sports').click();
 assert.equal(b.get('playbook-missions').children.length,6);
 assert.equal(b.get('playbook-filter-sports').attrs['aria-pressed'],'true');
 assert.equal(JSON.parse(b.store.get('jozefs-world-playbook-v1')).focus,'sports');
 // Hockey is closest unfinished qualification at 2/3.
 assert.equal(b.get('playbook-coach-title').textContent,'LIGHT THE LAMP');
 b.get('playbook-coach-go').click();
 assert.equal(b.visited.at(-1),'sports-arcade');
 assert.equal(b.played.at(-1),'hockey');
 const replay=boot({store:b.store});
 assert.equal(replay.get('playbook-filter-sports').attrs['aria-pressed'],'true');
 assert.equal(replay.get('playbook-missions').children.length,6);
 replay.get('playbook-filter-football').click();
 assert.equal(replay.get('playbook-missions').children.length,6);
 replay.get('playbook-filter-club').click();
 assert.equal(replay.get('playbook-missions').children.length,3);
});
test('fully earned game progress yields Club Legend, with no fabricated challenges or deadlines',()=>{
 const b=boot({stats:{
  arena:{games:30,wins:20,goals:40},street:{best:200},
  career:{season:2,played:3},tour:{wins:10},
  squad:{slots:{striker:'rookie',keeper:'captain',back:'scholar'}},
  profile:{badges:Array(9).fill('earned'),level:15},
  sports:{hockey:{best:5},baseball:{best:5},basketball:{best:5},wrestling:{best:5,careerWins:7}},
  cup:{qualified:4},history:Array(9).fill({type:'arena'})
 }});
 assert.equal(b.get('playbook-count').textContent,'15 / 15 COMPLETE');
 assert.equal(b.get('playbook-rank').textContent,'THE CLUB LEGEND');
 assert.equal(b.get('playbook-next-rank').textContent,'ALL CHALLENGES COMPLETE');
 assert.equal(b.get('playbook-progress').attrs['aria-valuenow'],'15');
 assert.equal(b.get('playbook-meter').style.width,'100%');
 assert.ok(b.get('playbook-missions').children.every(c=>c.className.includes('is-done')));
});

test('unfinished-only Playbook filter hides earned challenges without changing progress',()=>{
 const b=boot();
 assert.equal(b.get('playbook-missions').children.length,15);
 const first=b.get('playbook-missions').children.find(x=>x.attrs['data-mission']==='basketball');
 assert.ok(first?.className.includes('is-done'));
 b.get('playbook-toggle-open').click();
 assert.equal(b.get('playbook-toggle-open').attrs['aria-pressed'],'true');
 assert.equal(b.get('playbook-toggle-open').textContent,'SHOW ALL MISSIONS');
 assert.equal(b.get('playbook-missions').children.length,14);
 assert.ok(b.get('playbook-missions').children.every(x=>!x.className.includes('is-done')));
 assert.match(b.get('playbook-home-next').textContent,/NEXT UP/);
 assert.equal(b.window.JozefPlaybook.getProgress().completed,1);
 assert.equal(b.store.size,0,'display filter must not write a second source of progress');
 b.get('playbook-toggle-open').click();
 assert.equal(b.get('playbook-missions').children.length,15);
 assert.equal(b.get('playbook-toggle-open').attrs['aria-pressed'],'false');
});
test('completed category has a useful replay empty state when filtering unfinished missions',()=>{
 const b=boot({stats:{
  arena:{games:9,wins:8,goals:34},street:{best:100},career:{season:2,played:0},
  tour:{wins:4}
 }});
 b.get('playbook-filter-football').click();
 b.get('playbook-toggle-open').click();
 const cards=b.get('playbook-missions').children;
 assert.equal(cards.length,1);
 assert.equal(cards[0].className,'playbook-all-done');
 assert.match(cards[0].children[0].textContent,/EVERY CHALLENGE COMPLETE/);
 assert.equal(b.get('playbook-coach-go').textContent,'REPLAY A CHALLENGE ↗');
});
