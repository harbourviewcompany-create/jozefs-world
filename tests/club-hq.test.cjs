const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(root,'club-hq.js'),'utf8');
const css=fs.readFileSync(path.join(root,'club-hq.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function boot(store=new Map(),now=new Date(2026,9,9,12)){
 const listeners={};
 const elements=new Map();
 class Element{
  constructor(){this.textContent='';this.style={};this.attrs={};this.classes=new Set();this.classList={toggle:(name,enable)=>{enable?this.classes.add(name):this.classes.delete(name)}};}
  setAttribute(key,value){this.attrs[key]=value;}
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
 let current=now;
 const browserDate=class extends Date{
  constructor(...args){super(...(args.length?args:[current.getTime()]));}
  static now(){return current.getTime();}
 };
 const window={addEventListener:(type,fn)=>listeners[type]=fn};
 const document={hidden:false,getElementById:get,addEventListener:(type,fn)=>listeners['document:'+type]=fn};
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
 vm.runInNewContext(src,{window,document,localStorage,Date:browserDate,Number,String,JSON,setInterval:()=>null},{timeout:1000});
 return {get,window,listeners,store,setDate:d=>{current=d}};
}
test('the shared activity board loads once in both HTML entries, cached offline',()=>{
 assert.equal(html,index);
 assert.equal((html.match(/src="club-hq.js"/g)||[]).length,1);
 assert.equal((html.match(/href="club-hq.css"/g)||[]).length,1);
 assert.ok(html.indexOf('href="club-hq.css"')>html.indexOf('href="mobile-qa-2026.css"'));
 for(const id of ['today-counter','today-progress','today-meter','today-task-arena','today-task-street',
    'today-arena-status','today-street-status','today-play-arena','today-play-street','today-note','today-street']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 }
 assert.ok(sw.includes("'./club-hq.js'")&&sw.includes("'./club-hq.css'"));
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|location\.href/);
});
test('completions come from game-end events, update progress, and persist locally across reloads',()=>{
 const b=boot();
 assert.equal(b.get('today-counter').textContent,'0 / 2 PLAYED');
 assert.equal(b.get('today-meter').style.width,'0%');
 assert.equal(b.get('today-progress').attrs['aria-valuenow'],'0');
 b.listeners['jozef:arena-completed']();
 assert.equal(b.get('today-counter').textContent,'1 / 2 PLAYED');
 assert.equal(b.get('today-meter').style.width,'50%');
 assert.equal(b.get('today-arena-status').textContent,'MATCH PLAYED TODAY');
 assert.ok(b.get('today-task-arena').classes.has('is-complete'));
 assert.equal(b.get('today-play-arena').textContent,'PLAY AGAIN ↗');
 b.listeners['jozef:street-completed']();
 assert.equal(b.get('today-counter').textContent,'BOTH PLAYED TODAY');
 assert.equal(b.get('today-meter').style.width,'100%');
 assert.equal(b.get('today-progress').attrs['aria-valuenow'],'2');
 assert.deepEqual(JSON.parse(b.store.get('jozefs-world-club-today-v1')),{date:'2026-10-09',arena:true,street:true});
 const next=boot(b.store);
 assert.equal(next.get('today-counter').textContent,'BOTH PLAYED TODAY');
 next.listeners['jozef:arena-completed']();
 assert.equal(next.get('today-progress').attrs['aria-valuenow'],'2');
});
test('a new local calendar date resets display without deleting past stored progress',()=>{
 const b=boot();
 b.listeners['jozef:arena-completed']();
 b.setDate(new Date(2026,9,10,0,1));
 b.listeners.pageshow();
 assert.equal(b.get('today-counter').textContent,'0 / 2 PLAYED');
 assert.equal(b.get('today-arena-status').textContent,'Not played today');
 b.listeners['jozef:street-completed']();
 const data=JSON.parse(b.store.get('jozefs-world-club-today-v1'));
 assert.deepEqual(data,{date:'2026-10-10',arena:false,street:true});
});
test('only completed games publish HQ activity; opening or pausing cannot count',()=>{
 const arena=fs.readFileSync(path.join(root,'arena.js'),'utf8');
 const street=fs.readFileSync(path.join(root,'street.js'),'utf8');
 assert.match(arena,/function end\(\)\{[\s\S]*?jozef:arena-completed/);
 assert.match(street,/function finish\(\)\{[\s\S]*?jozef:street-completed/);
 assert.equal((arena.match(/new Event\('jozef:arena-completed'\)/g)||[]).length,1);
 assert.equal((street.match(/new Event\('jozef:street-completed'\)/g)||[]).length,1);
 assert.doesNotMatch(src,/JozefWho|who-dad|who-jozef/);
});
