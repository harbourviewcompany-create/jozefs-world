#!/usr/bin/env node
/* Simulate two complete 2D games connected by a private PeerJS data channel.
   Verify host-authoritative movement, world edits, saves and per-device roles. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=fs.readFileSync(path.join(__dirname,'../block-world.js'),'utf8');
const coop=fs.readFileSync(path.join(__dirname,'../block-world-coop.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../block-world.html'),'utf8');
assert.match(html,/block-world-coop\.js/);
new vm.Script(core);new vm.Script(coop);
const peers=new Map(),tasks=[];
class Channel {
 constructor(){this.handlers={};this.open=false;this.partner=null;}
 on(n,fn){this.handlers[n]=fn;}
 send(obj){if(!this.open)throw Error('connection closed');this.partner.handlers.data?.(structuredClone(obj));}
 close(){if(!this.open)return;this.open=false;this.partner.open=false;this.handlers.close?.();this.partner.handlers.close?.();}
}
class FakePeer {
 constructor(id){this.id=id||'random-guest';this.handlers={};if(id)peers.set(id,this);tasks.push(()=>this.handlers.open?.());}
 on(n,fn){this.handlers[n]=fn;}
 connect(id){
  const other=peers.get(id);if(!other)throw Error('missing host');
  const guest=new Channel(),host=new Channel();guest.partner=host;host.partner=guest;
  tasks.push(()=>other.handlers.connection?.(host));
  tasks.push(()=>{guest.open=host.open=true;guest.handlers.open?.();host.handlers.open?.();});
  return guest;
 }
 destroy(){if(this.id)peers.delete(this.id);}
}
function flush(){while(tasks.length)tasks.shift()();}
function boot(store=new Map()){
 const els=new Map(),events=new Map(),clock={now:0,cb:null},trace=[];
 const ctx=new Proxy({},{get(_,k){return k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}},set(){return true}});
 function element(initial=''){
  let id=initial;const cls=new Set();
  const el={style:{},events:{},children:[],attrs:{},className:'',hidden:false,disabled:false,value:'',
   innerHTML:'',textContent:'',classList:{add(x){cls.add(x)},remove(x){cls.delete(x)},contains(x){return cls.has(x)},toggle(x){if(cls.has(x)){cls.delete(x);return false;}cls.add(x);return true;}},
   setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},
   getContext(){return ctx;},appendChild(v){this.children.push(v);return v;},
   insertBefore(v){this.children.unshift(v);return v;},append(...v){this.children.push(...v);},
   replaceChildren(...v){this.children=v;},after(){},remove(){},click(){},
   addEventListener(k,fn){(this.events[k]??=[]).push(fn);},
   querySelectorAll(){return []},getBoundingClientRect(){return{left:0,top:0,width:390,height:844}},
   setPointerCapture(){},hasPointerCapture(){return false;}
  };
  Object.defineProperty(el,'id',{get:()=>id,set(v){id=v;els.set(v,el)}});
  if(initial)els.set(initial,el);return el;
 }
 const window={innerWidth:390,innerHeight:844,devicePixelRatio:2,Peer:FakePeer,crypto:{getRandomValues:a=>{for(let i=0;i<a.length;i++)a[i]=i+71;return a}},
   addEventListener(k,fn){(events.get(k)||events.set(k,[]).get(k)).push(fn);}};
 const location={hash:'',pathname:'/jozefs-world/block-world.html',search:'',href:'https://example.com/jozefs-world/block-world.html',reload(){trace.push('reload')}};
 const sandbox={
  window,document:{body:element('body'),head:element('head'),hidden:false,
    createElement(){return element()},getElementById(id){return els.get(id)??element(id)},
    addEventListener(k,fn){(events.get(k)||events.set(k,[]).get(k)).push(fn);}},
  performance:{now:()=>clock.now},
  requestAnimationFrame:fn=>clock.cb=fn,addEventListener:(k,fn)=>(events.get(k)||events.set(k,[]).get(k)).push(fn),
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
  navigator:{getGamepads:()=>[]},location,history:{replaceState(){}},confirm:()=>false,
  URL,Blob:class{},setTimeout:()=>1,clearTimeout(){},
  console:{warn:msg=>trace.push(String(msg)),error:msg=>trace.push(String(msg))}
 };
 vm.runInNewContext(core,sandbox,{timeout:10000});
 vm.runInNewContext(coop,sandbox,{timeout:10000});
 const doc=sandbox.document;
 function click(id,type='click'){
  const el=doc.getElementById(id);
  for(const fn of el.events[type]||[])fn({preventDefault(){},pointerId:1});
  if(type==='click')el.onclick?.();
 }
 function advance(n=1){
  for(let i=0;i<n;i++){clock.now+=17;assert.ok(clock.cb);clock.cb(clock.now);}
 }
 function key(code,pressed){
  for(const fn of events.get(pressed?'keydown':'keyup')||[])fn({code,repeat:false,preventDefault(){}});
 }
 return{window,doc,store,clock,click,advance,key,trace,location,
  game:()=>window.BlockWorld2D,session:()=>window.BlockWorldCoop};
}
const host=boot(),guest=boot();
host.advance(3);guest.advance(3);
host.click('save');guest.click('save');
const ownSave=guest.store.get('jozefs-world-block-v3');
host.session().host();flush();
const invite=host.session().code();
assert.match(invite,/^[a-f0-9]{32}$/);
guest.doc.getElementById('coop-code').value=invite;
guest.session().join();flush();
assert.equal(host.session().role(),'host');
assert.equal(guest.session().role(),'guest');
assert.ok(host.session().connected());
assert.ok(guest.session().connected());
assert.equal(host.game().getWorld().players.length,2);
assert.deepEqual(Array.from(guest.game().getWorld().world[33]),Array.from(host.game().getWorld().world[33]),'guest sees exact host terrain');
const start=host.game().getState().players[1].x;
guest.key('ArrowRight',true);
for(let i=0;i<30;i++){guest.advance(1);host.advance(1);}
guest.key('ArrowRight',false);
for(let i=0;i<8;i++){guest.advance(1);host.advance(1);}
const now=host.game().getState().players[1].x;
assert.ok(now>start+10,'Jozef really moved inside the host physics engine: '+start+' -> '+now);
assert.ok(Math.abs(guest.game().getState().players[1].x-now)<5,'host sent Jozef position to guest');
const p=host.game().getState().players[1];
const tileX=Math.floor(p.x/40)+2,tileY=Math.floor((p.y+37)/40);
const hostBefore=host.game().getWorld().world[tileY][tileX];
assert.notEqual(hostBefore,14);
guest.game().requestAction('mine',{x:tileX,y:tileY},2);
for(let i=0;i<12;i++){guest.advance(1);host.advance(1);}
assert.equal(host.game().getWorld().world[tileY][tileX],0,'Jozef can mine a real host tile');
assert.equal(guest.game().getWorld().world[tileY][tileX],0,'mined block updated on second device');
guest.game().requestAction('place',{x:tileX,y:tileY},2);
for(let i=0;i<12;i++){guest.advance(1);host.advance(1);}
assert.equal(host.game().getWorld().world[tileY][tileX],2,'Jozef can place a block on the host world');
assert.equal(guest.game().getWorld().world[tileY][tileX],2,'new block appears on the second device');
guest.click('save');
assert.equal(guest.store.get('jozefs-world-block-v3'),ownSave,'Jozef joining must not overwrite their solo save');
host.click('save');
assert.equal(JSON.parse(host.store.get('jozefs-world-block-v3')).world[tileY][tileX],2,'shared construction saved on the host');
assert.ok(host.game().getWorld().players[0].x>0,'Daddy remains independently present');
guest.session().disconnect();
assert.ok(guest.trace.includes('reload'),'guest reload restores own solo world on disconnect');
console.log('Block World 2D co-op: private invite, two-player physics, live positions, shared mining/building, host saves, guest save isolation PASS');
