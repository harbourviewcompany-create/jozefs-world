const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const source=fs.readFileSync(path.join(root,'multisport.js'),'utf8');
const css=fs.readFileSync(path.join(root,'multisport.css'),'utf8');
function boot({store=new Map(),random=()=>0,reduce=false}={}){
 let now=0;
 const nodes=new Map(),listeners={},events=[],scores=[];
 class N{
   constructor(id){this.id=id;this.children=[];this.events={};this.textContent='';this.dataset={};this.style={};this.hidden=false;this.attrs={};this.classSet=new Set();this.classList={contains:k=>id==='sports-arcade'&&k==='active'?true:this.classSet.has(k),toggle:(k,on)=>on?this.classSet.add(k):this.classSet.delete(k)};}
   setAttribute(k,v){this.attrs[k]=String(v)}
   addEventListener(k,fn){this.events[k]=fn}
   replaceChildren(...args){this.children=args}
   append(...args){this.children.push(...args)}
   click(){this.events.click?.()}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new N(id));return nodes.get(id)};
 const document={
   readyState:'complete',body:{},getElementById:get,
   createElement:()=>new N('created'),
   querySelector:()=>new N('nav'),
   querySelectorAll:selector=>selector==='[data-multi-start]'?[]:[],
   addEventListener:(type,fn)=>{listeners[type]=fn}
 };
 const window={
   requestAnimationFrame:()=>7,cancelAnimationFrame:()=>{},
   matchMedia:()=>({matches:reduce}),
   JozefWorld:{record:(action,details)=>{scores.push({action,details});return 20}},
   dispatchEvent:e=>{events.push(e.type)},
   addEventListener:(type,fn)=>{listeners[type]=fn},
   showSection:()=>{}
 };
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
 const clock=class extends Date{static now(){return now}};
 const Event=class{constructor(type){this.type=type}};
 const MathShim=Object.create(Math);MathShim.random=random;
 vm.runInNewContext(source,{document,window,localStorage,Date:clock,Event,Number,String,JSON,Math:MathShim,Set},{timeout:1500});
 const controls=()=>get('multi-controls').children;
 const choose=code=>{const btn=controls().find(x=>x.dataset.choice===code);assert.ok(btn,'missing action '+code);btn.click()};
 return {get,controls,choose,window,store,events,scores,setNow:n=>{now=n},listeners};
}
test('all four sports have complete game UI, accessible controls and offline resources',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'index.html'),'utf8'));
 for(const sport of ['hockey','baseball','basketball','wrestling']){
  for(const part of ['multi-tab-'+sport,'multi-best-'+sport,'multi-played-'+sport]){
   assert.equal((html.match(new RegExp('id="'+part+'"','g'))||[]).length,1,part);
  }
  assert.ok(html.includes('data-multi-start="'+sport+'"'),'homepage shortcut '+sport);
 }
 assert.equal((html.match(/id="sports-arcade"/g)||[]).length,1);
 assert.ok(html.includes('data-section="sports-arcade"'));
 assert.ok(html.includes('data-section="sports"'),'existing Sports Scores stays available');
 assert.ok(fs.readFileSync(path.join(root,'stadium.js'),'utf8').includes("'sports-arcade'"));
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(sw.includes("'./multisport.js'")&&sw.includes("'./multisport.css'"));
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|speechSynthesis/);
 assert.doesNotMatch(css,/@import|url\(\s*https?:/);
 assert.match(html,/not affiliated with or endorsed by WWE/);
});
test('hockey shoots 5 real attempts, records best and avoids duplicate awards',()=>{
 const b=boot({random:()=>0});
 assert.equal(b.get('multi-name').textContent,'HOCKEY SHOOTOUT');
 for(let i=0;i<5;i++){
  b.choose('right');
  assert.equal(b.get('multi-score').textContent,(i+1)+' / 5 GOALS');
  b.choose('next');
 }
 const saved=JSON.parse(b.store.get('jozefs-world-multisport-v1'));
 assert.equal(saved.hockey.best,5);
 assert.equal(saved.hockey.played,1);
 assert.equal(b.scores.length,1);
 assert.equal(b.scores[0].action,'multisport');
 assert.equal(b.scores[0].details.sport,'hockey');
 assert.equal(b.scores[0].details.score,5);
 assert.deepEqual(b.events,['jozef:multisport-completed']);
 b.choose('again');assert.equal(b.get('multi-score').textContent,'0 / 5 GOALS');
 assert.equal(b.scores.length,1);
 const next=boot({store:b.store});
 assert.equal(next.get('multi-best-hockey').textContent,'5/5');
});
test('baseball and basketball swing/release through the real timing window',()=>{
 const b=boot();
 b.get('multi-tab-baseball').click();
 assert.equal(b.get('multi-name').textContent,'BASEBALL HOME RUN DERBY');
 assert.equal(b.get('multi-timing').hidden,false);
 for(let i=0;i<5;i++){b.setNow(i*2000+523);b.choose('shoot');if(i!==4){b.choose('next');}}
 b.choose('next');
 assert.equal(b.get('multi-best-baseball').textContent,'5/5');
 b.get('multi-tab-basketball').click();
 assert.equal(b.get('multi-name').textContent,'BASKETBALL THREE-POINT CHALLENGE');
 for(let i=0;i<5;i++){b.setNow(11000+i*2000+523);b.choose('shoot');if(i!==4)b.choose('next');}
 b.choose('next');
 assert.equal(b.get('multi-best-basketball').textContent,'5/5');
 assert.equal(b.scores.length,2);
});
test('wrestling is original showmanship, rewards matching crowd cues without risky moves',()=>{
 const b=boot();b.get('multi-tab-wrestling').click();
 assert.match(b.get('multi-message').textContent,/CROWD WANTS A HUGE ENTRANCE/);
 for(const x of ['entrance','pose','teamwork','entrance','pose']){b.choose(x);b.choose('next');}
 assert.equal(b.get('multi-best-wrestling').textContent,'5/5');
 assert.equal(b.scores[0].details.sport,'wrestling');
 assert.match(b.get('multi-message').textContent,/PERFECT FIVE/);
 assert.equal(b.window.JozefMultiSport.getLastResult().score,5);
});
test('reduced motion mode offers untimed playable batting and shooting',()=>{
 const b=boot({reduce:true,random:()=>0.5});b.get('multi-tab-basketball').click();
 b.setNow(9000);b.choose('shoot');
 assert.equal(b.get('multi-score').textContent,'1 / 5 BUCKETS');
});
test('saved records, profile XP, Chronicle and Club backups include multisport without online accounts',()=>{
 const profile=fs.readFileSync(path.join(root,'extras.js'),'utf8');
 const backup=fs.readFileSync(path.join(root,'clubhouse.js'),'utf8');
 const history=fs.readFileSync(path.join(root,'chronicle.js'),'utf8');
 assert.ok(profile.includes("multisport: 20"));
 assert.ok(profile.includes("multisport: 4"));
 assert.ok(profile.includes("'all-sport-debut'")&&profile.includes("'all-sport-champion'"));
 assert.ok(profile.includes("Number.isInteger(info.score)"));
 assert.ok(backup.includes("'jozefs-world-multisport-v1'"));
 assert.ok(history.includes("'jozef:multisport-completed'"));
 assert.doesNotMatch(source,/login|signup|accountId|userId|password/i);
});
