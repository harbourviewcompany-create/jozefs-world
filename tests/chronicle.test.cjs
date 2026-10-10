const bundled=require('./bundle-contract.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const js=fs.readFileSync(path.join(root,'chronicle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'chronicle.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

function browser({stored=new Map(),stats}={}){
 const data=stats||{
  arena:{games:4,wins:2,goals:5,score:'0-0'},street:{best:80,score:0},
  career:{season:1,played:1,points:3,cups:0},
  tour:{season:1,round:1,wins:1,cups:0},
  player:{xp:200,level:3,badges:['first-goal']}
 };
 const nodes=new Map(), listeners={}, state={print:0};
 class Node{
  constructor(){this.textContent='';this.children=[];this.className='';this.events={};this.attrs={};this.type='';}
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(k,v){this.events[k]=v;}
  append(...items){this.children.push(...items);}
  appendChild(item){this.children.push(item);return item;}
  replaceChildren(...items){this.children=items;}
  click(){this.events.click?.()}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)};
 const document={
  readyState:'complete',hidden:false,getElementById:get,
  createElement:()=>new Node(),
  addEventListener:(name,fn)=>{listeners['document:'+name]=fn}
 };
 const window={
  JozefArena:{getProgress:()=>data.arena},
  JozefStreet:{getProgress:()=>data.street},
  JozefCareer:{getProgress:()=>data.career},
  JozefTour:{getProgress:()=>data.tour},
  JozefWorld:{getProgress:()=>data.player},
  addEventListener:(name,fn)=>listeners[name]=fn,
  print:()=>{state.print++}
 };
 const localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,String(v))};
 vm.runInNewContext(js,{document,window,localStorage,Date,Math,Number,String,JSON,Set},{timeout:1300});
 return {nodes,get,listeners,window,stored,data,state};
}
test('Chronicle is a real deep-linked section with responsive print poster, cached offline',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'index.html'),'utf8'));
 assert.equal((html.match(/id="chronicle"/g)||[]).length,1);
 assert.equal((html.match(/src="chronicle.js"/g)||[]).length,1);
 bundled.css(root,html,sw,'chronicle.css');
 for(const id of ['chronicle-list','chronicle-games','chronicle-wins','chronicle-tour',
  'chronicle-cover-headline','chronicle-cover-story','chronicle-cover-date',
  'chronicle-print','chronicle-home-summary']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 }
 assert.ok(html.includes('data-section="chronicle"'));
 assert.ok(fs.readFileSync(path.join(root,'stadium.js'),'utf8').includes("'chronicle'"));
 assert.ok(sw.includes("'./chronicle.js'"));
 assert.match(css,/@media print/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/print-color-adjust:exact/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|innerHTML\s*=/);
 assert.doesNotMatch(css,/@import|url\(\s*https?:/);
});
test('historic counters are shown without fabricating old match results',()=>{
 const b=browser();
 assert.equal(b.get('chronicle-games').textContent,'4');
 assert.equal(b.get('chronicle-wins').textContent,'2');
 assert.equal(b.get('chronicle-career').textContent,'1');
 assert.equal(b.get('chronicle-tour').textContent,'1');
 assert.equal(b.get('chronicle-cover-headline').textContent,'THE STORY STARTS HERE.');
 assert.equal(b.get('chronicle-list').children.length,1);
 assert.equal(b.window.JozefChronicle.getEntries().length,0);
 assert.ok(b.stored.has('jozefs-world-chronicle-v1'));
 b.listeners.pageshow();
 assert.equal(b.window.JozefChronicle.getEntries().length,0);
});
test('finished Arena match and Street run create truthful selectable highlights',()=>{
 const b=browser();
 b.data.arena.games=5;b.data.arena.wins=3;b.data.arena.score='2-1';
 b.listeners['jozef:arena-completed']();
 assert.equal(b.window.JozefChronicle.getEntries().length,1);
 assert.equal(b.get('chronicle-cover-headline').textContent,'VICTORY UNDER THE LIGHTS.');
 assert.match(b.get('chronicle-cover-story').textContent,/2 – 1/);
 b.data.street.score=70;b.listeners['jozef:street-completed']();
 assert.equal(b.window.JozefChronicle.getEntries().length,2);
 assert.match(b.get('chronicle-cover-story').textContent,/70 points/);
 assert.equal(b.get('chronicle-list').children.length,2);
 b.get('chronicle-list').children[1].click();
 assert.equal(b.get('chronicle-cover-headline').textContent,'VICTORY UNDER THE LIGHTS.');
 b.get('chronicle-print').click();
 assert.equal(b.state.print,1);
 const another=browser({stored:b.stored,stats:b.data});
 assert.equal(another.window.JozefChronicle.getEntries().length,2);
 assert.match(another.get('chronicle-home-summary').textContent,/LATEST/);
});
test('Career / Tour milestones and badges create stories only on observed progression',()=>{
 const b=browser();
 b.listeners['jozef:chronicle-sync']();
 assert.equal(b.window.JozefChronicle.getEntries().length,0);
 b.data.career.played=2;b.data.tour.round=2;
 b.data.player.badges.push('training-star');
 b.listeners['jozef:chronicle-sync']();
 const titles=JSON.stringify(b.window.JozefChronicle.getEntries().map(e=>e.title));
 assert.match(titles,/NEW CHAPTER IN THE LEAGUE/);
 assert.match(titles,/STAMPED/);
 assert.match(titles,/HONOURS/);
 const count=b.window.JozefChronicle.getEntries().length;
 b.listeners['jozef:profile-updated']();
 assert.equal(b.window.JozefChronicle.getEntries().length,count);
 b.data.career.cups=1;
 b.listeners['jozef:chronicle-sync']();
 assert.match(JSON.stringify(b.window.JozefChronicle.getEntries()),/SILVERWARE/);
});
test('Chronicle remains bounded, printable without an account, and included in backup',()=>{
 const b=browser();
 for(let i=0;i<51;i++){b.data.street.score=i;b.listeners['jozef:street-completed']();}
 assert.equal(b.window.JozefChronicle.getEntries().length,40);
 const exported=JSON.parse(b.stored.get('jozefs-world-chronicle-v1'));
 assert.equal(exported.events.length,40);
 const backup=fs.readFileSync(path.join(root,'clubhouse.js'),'utf8');
 assert.ok(backup.includes("'jozefs-world-chronicle-v1'"));
 assert.ok(backup.includes("const KEYS="));
 assert.equal(html.includes('id="who-gate"'),false);
});
