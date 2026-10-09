const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const css=fs.readFileSync(path.join(root,'campaign-2026.css'),'utf8');
const script=fs.readFileSync(path.join(root,'campaign-2026.js'),'utf8');
test('2026 collectible and campaign artwork is deployed and offline cache complete',()=>{
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const asset of ['campaign-2026.css','campaign-2026.js']){
  assert.equal((html.match(new RegExp('(?:src|href)="'+asset+'"','g'))||[]).length,1);
  assert.ok(sw.includes("'./"+asset+"'"),'offline cache must include '+asset);
 }
 for(const key of ['career-visual-status','tour-passport-status','tour-passport-progress','career-season-track','tour-passport-deck']){
  assert.ok(html.includes(key),'campaign page missing '+key);
 }
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.clubhouse-card-jersey/);
 assert.match(css,/\.tour-passport-stamp/);
 assert.match(css,/\.career-season-round/);
 assert.doesNotMatch(css,/@import|url\(\s*https?:/);
 assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sendBeacon/);
 assert.equal(html,fs.readFileSync(path.join(root,'index.html'),'utf8'));
});
test('season and passport visuals follow existing local game progress without new storage',()=>{
 const values={career:{played:0,points:0,cups:0},tour:{round:0,cups:0}};
 const nodes=new Map(),windowEvents={},docEvents={};
 function get(id){
  if(!nodes.has(id))nodes.set(id,{className:'',textContent:''});
  return nodes.get(id);
 }
 const window={
  JozefCareer:{getProgress:()=>values.career},
  JozefTour:{getProgress:()=>values.tour},
  addEventListener(type,fn){windowEvents[type]=fn}
 };
 const document={
  hidden:false,getElementById:get,
  addEventListener(type,fn){docEvents[type]=fn}
 };
 vm.runInNewContext(script,{document,window,Math,Number,String},{timeout:1000});
 assert.match(get('career-visual-round-0').className,/is-current/);
 assert.match(get('tour-passport-0').className,/is-current/);
 assert.equal(get('tour-passport-progress').textContent,'0 / 5 STAMPS');
 values.career={played:4,points:10,cups:0};
 values.tour={round:3,cups:0};
 windowEvents['jozef:progress']();
 assert.match(get('career-visual-round-3').className,/is-done/);
 assert.match(get('career-visual-round-4').className,/is-current/);
 assert.match(get('tour-passport-2').className,/is-stamped/);
 assert.match(get('tour-passport-3').className,/is-current/);
 assert.equal(get('career-visual-points').textContent,'10 LEAGUE POINTS');
 assert.equal(get('tour-passport-progress').textContent,'3 / 5 STAMPS');
 values.career={played:6,points:18,cups:1};
 values.tour={round:5,cups:2};
 windowEvents['jozef:profile-updated']();
 assert.equal(get('career-visual-status').textContent,'SEASON COMPLETE');
 assert.equal(get('tour-passport-status').textContent,'PASSPORT COMPLETE');
 assert.equal(get('career-visual-cups').textContent,'1 LEAGUE CUPS');
 assert.equal(get('tour-passport-cups').textContent,'2 WORLD CUPS');
 assert.ok(!get('career-visual-round-5').className.includes('is-current'));
});
test('earned collectible frames show jersey artwork, role, tier and locked status',()=>{
 const source=fs.readFileSync(path.join(root,'clubhouse.js'),'utf8');
 const nodes=new Map(),listeners={};
 class Node{
  constructor(){this.children=[];this.className='';this.textContent='';this.attrs={};}
  setAttribute(key,value){this.attrs[key]=String(value);}
  append(...items){this.children.push(...items);}
  appendChild(item){this.children.push(item);return item;}
  replaceChildren(...items){this.children=items;}
  addEventListener(){}
 }
 const document={
  getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)},
  createElement(){return new Node()},querySelector(){return null}
 };
 const window={
  JozefWorld:{getProgress:()=>({xp:450,goals:12,level:5,badges:['training-star']})},
  JozefCareer:{getProgress:()=>({played:2,cups:0})},
  JozefTour:{getProgress:()=>({wins:1,cups:0})},
  addEventListener(type,fn){listeners[type]=fn}
 };
 const storage={getItem(){return null},setItem(){},removeItem(){}};
 vm.runInNewContext(source,{document,window,localStorage:storage},{timeout:1200});
 const cards=document.getElementById('clubhouse-cards').children;
 assert.equal(cards.length,7);
 assert.equal(document.getElementById('clubhouse-card-count').textContent,'6 / 7');
 assert.equal(cards[0].attrs['data-tier'],'academy');
 assert.equal(cards[1].attrs['data-tier'],'rare');
 assert.equal(cards[4].attrs['data-tier'],'elite');
 assert.equal(cards[6].attrs['data-tier'],'legend');
 assert.match(cards[6].className,/locked/);
 const figure=cards[0].children[1];
 assert.equal(figure.className,'clubhouse-player-card-figure');
 assert.equal(figure.children[1].textContent,'11','first collectible renders the Jozef jersey');
 assert.equal(cards[6].children[1].children[1].textContent,'?','locked collectible should not reveal jersey');
 assert.ok(cards[0].children.some(child=>child.className==='clubhouse-card-rarity'));
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
});
