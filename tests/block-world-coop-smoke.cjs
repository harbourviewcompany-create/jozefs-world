#!/usr/bin/env node
/* Simulate two complete 2D games connected by a private PeerJS data channel.
   Verify host-authoritative movement, world edits, saves and per-device roles. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=fs.readFileSync(path.join(__dirname,'../block-world.js'),'utf8');
const coop=fs.readFileSync(path.join(__dirname,'../block-world-coop.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../block-world.html'),'utf8');
assert.match(html,/block-world-coop\.js/);
assert.ok(core.length>58000,'Complete 2D engine required; reject truncated builds');
assert.ok(coop.length>9000,'Full multiplayer engine required; reject a fake overlay');
for(const id of ['coop-host','coop-join','coop-disconnect','coop-share','coop-live'])assert.match(html,new RegExp('id="'+id+'"'));
assert.doesNotMatch(html,/setStatus\('Starting host…'\)/,'Legacy duplicate PeerJS handlers must not return');
new vm.Script(core);new vm.Script(coop);
const peers=new Map(),tasks=[];
class Channel {
 constructor(){this.handlers={};this.open=false;this.partner=null;}
 on(n,fn){this.handlers[n]=fn;}
 send(obj){if(!this.open)throw Error('connection closed');this.partner.handlers.data?.(structuredClone(obj));}
 close(){if(!this.open)return;this.open=false;this.partner.open=false;this.handlers.close?.();this.partner.handlers.close?.();}
}
class FakePeer {
 static links=[];
 constructor(id){this.id=id||'random-guest';this.handlers={};if(id)peers.set(id,this);tasks.push(()=>this.handlers.open?.());}
 on(n,fn){this.handlers[n]=fn;}
 connect(id){
  const other=peers.get(id);if(!other)throw Error('missing host');
  const guest=new Channel(),host=new Channel();guest.partner=host;host.partner=guest;FakePeer.links.push({guest,host});
  tasks.push(()=>other.handlers.connection?.(host));
  tasks.push(()=>{guest.open=host.open=true;guest.handlers.open?.();host.handlers.open?.();});
  return guest;
 }
 destroy(){if(this.id)peers.delete(this.id);}
}
function flush(){while(tasks.length)tasks.shift()();}
function boot(store=new Map(),tabStore=new Map()){
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
  sessionStorage:{getItem:k=>tabStore.get(k)||null,setItem:(k,v)=>tabStore.set(k,String(v)),removeItem:k=>tabStore.delete(k)},
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
 return{window,doc,store,tabStore,clock,click,advance,key,trace,location,
  game:()=>window.BlockWorld2D,session:()=>window.BlockWorldCoop};
}
// Without a network, two people on one keyboard can independently control both heroes.
const keyboard=boot();keyboard.advance(3);
// Test simultaneous input on an intentionally flat collision-free path.
// Randomly generated cliffs at the spawn otherwise make this a terrain test.
const level=keyboard.game().getWorld(),TILE=40;
for(let x=67;x<92;x++){
 level.surface[x]=50;
 for(let y=0;y<level.h;y++)level.world[y][x]=y<50?0:y===level.h-1?14:2;
}
for(let i=0;i<2;i++){
 const p=level.players[i];p.x=(i===0?70:76)*TILE;p.y=50*TILE-(i===0?39:35)-.1;
 p.vx=0;p.vy=0;p.ground=true;
}
assert.equal(keyboard.game().useWorld(level),true,'flat input test world loaded');
const keyboardBefore=keyboard.game().getState().players.map(p=>p.x);
keyboard.key('KeyD',true);keyboard.key('ArrowRight',true);
keyboard.advance(25);
keyboard.key('KeyD',false);keyboard.key('ArrowRight',false);
const keyboardAfter=keyboard.game().getState().players.map(p=>p.x);
assert.ok(keyboardAfter[0]>keyboardBefore[0]+20,'Daddy controls movement with D');
assert.ok(keyboardAfter[1]>keyboardBefore[1]+20,'Jo controls movement with Right simultaneously');

const host=boot(),guest=boot();
host.advance(3);guest.advance(3);
// Use the same clear, flat course for remote input assertions: the generated
// hills are gameplay obstacles and should not make networking QA random.
const sharedCourse=host.game().getWorld();
for(let x=65;x<110;x++){
 sharedCourse.surface[x]=50;
 for(let y=0;y<sharedCourse.h;y++)sharedCourse.world[y][x]=y<50?0:y===sharedCourse.h-1?14:2;
}
for(let i=0;i<2;i++){
 const p=sharedCourse.players[i];p.x=(i===0?70:76)*40;p.y=50*40-(i===0?39:35)-.1;
 p.vx=p.vy=0;p.ground=true;
}
assert.equal(host.game().useWorld(sharedCourse),true);
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
const dadStart=host.game().getState().players[0].x,joStart=host.game().getState().players[1].x;
host.key('KeyD',true);guest.key('ArrowRight',true);
for(let i=0;i<25;i++){guest.advance(1);host.advance(1);}
host.key('KeyD',false);guest.key('ArrowRight',false);
for(let i=0;i<8;i++){guest.advance(1);host.advance(1);}
assert.ok(host.game().getState().players[0].x>dadStart+12,'Daddy moves while Jo moves simultaneously');
assert.ok(host.game().getState().players[1].x>joStart+12,'Jo moves while Daddy moves simultaneously');

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
// Inventory remains available on both devices; opening Daddy's menu must
// not halt host physics, and Jo's recipe request runs only on Daddy's host.
assert.equal(guest.doc.getElementById('inventory').disabled,false,'Jo can open inventory');
guest.click('inventory');
assert.equal(guest.game().localCraft().open,true);
const wood0=host.game().getState().players[1].inventory[4];
const plank0=host.game().getState().players[1].inventory[7];
guest.window.craftItem();
for(let i=0;i<12;i++){guest.advance(1);host.advance(1);}
const crafted=host.game().getState().players[1].inventory;
assert.equal(crafted[4],wood0-1,'host consumed Jo wood for crafting');
assert.equal(crafted[7],plank0+4,'host awarded Jo planks');
assert.equal(guest.game().getState().players[1].inventory[7],plank0+4,'crafted items sync to guest');
guest.click('inventory'); // close Jo's inventory
host.click('inventory');
const movementBefore=host.game().getState().players[1].x;
guest.key('ArrowRight',true);
for(let i=0;i<15;i++){guest.advance(1);host.advance(1);}
guest.key('ArrowRight',false);
assert.ok(host.game().getState().players[1].x>movementBefore+10,'Daddy opening inventory cannot freeze Jo');
host.click('inventory');
assert.equal(host.game().regroup(0),true,'Daddy can find a safe regroup point beside Jo');
for(let i=0;i<12;i++){guest.advance(1);host.advance(1);}
const dirt0=host.game().getState().players[1].inventory[2];
guest.click('coop-give');
for(let i=0;i<12;i++){guest.advance(1);host.advance(1);}
assert.equal(host.game().getState().players[1].inventory[2],dirt0-1,'Jo can give one selected block to Daddy');
assert.equal(guest.game().getState().players[1].inventory[2],dirt0-1,'gift reflected in Jo inventory');
// Jo's airborne second jump is calculated by the authoritative host engine.
guest.key('ArrowUp',true);
for(let i=0;i<8;i++){guest.advance(1);host.advance(1);}
guest.key('ArrowUp',false);
for(let i=0;i<8;i++){guest.advance(1);host.advance(1);}
const beforeSecond=host.game().getState().players[1].vy;
guest.key('ArrowUp',true);
for(let i=0;i<8;i++){guest.advance(1);host.advance(1);}
guest.key('ArrowUp',false);
const afterSecond=host.game().getState().players[1].vy;
assert.ok(afterSecond<beforeSecond-25,'Jozef can double-jump in host physics: '+beforeSecond+' -> '+afterSecond);
// Reject invalid recipe requests without changing either player's materials.
assert.equal(host.game().craftFor(1,999),false,'invalid multiplayer recipe rejected');
// An unsolicited second peer cannot displace an active private session.
const intruder=new Channel();
const liveHostPeer=peers.get('jw2d-'+invite);
liveHostPeer.handlers.connection?.(intruder);
assert.equal(host.session().connected(),true,'active host session survives intruder connection');
assert.equal(intruder.open,false,'unsolicited connection cannot become active');
// A stale channel message after disconnect must not mutate the authoritative world.
const originalLink=FakePeer.links.at(-1);
const originalX=host.game().getState().players[0].x;
originalLink.host.handlers.data?.({t:'state',s:{players:[],realmIndex:0}});
assert.equal(host.game().getState().players[0].x,originalX,'guest cannot override authoritative host state');

// A network drop must keep Daddy hosting and Jo in guest mode until reconnected.
FakePeer.links.at(-1).guest.close();
assert.equal(host.session().role(),'host','host room survives disconnection');
assert.equal(guest.session().role(),'guest','guest waits for reconnection without solo-save reload');
guest.click('coop-join');flush();
assert.ok(host.session().connected()&&guest.session().connected(),'session can rejoin without sharing a new link');
assert.deepEqual(Array.from(guest.game().getWorld().world[tileY]),Array.from(host.game().getWorld().world[tileY]),'world edits resynchronized after reconnect');
assert.equal(guest.game().getState().realmIndex,host.game().getState().realmIndex,'realm resynchronized after reconnect');

guest.click('save');
assert.equal(guest.store.get('jozefs-world-block-v3'),ownSave,'Jozef joining must not overwrite their solo save');
host.click('save');
assert.equal(JSON.parse(host.store.get('jozefs-world-block-v3')).world[tileY][tileX],2,'shared construction saved on the host');
assert.ok(host.game().getWorld().players[0].x>0,'Daddy remains independently present');
// A tab refresh reconstructs the guest VM with its own storage, but no new invite.
FakePeer.links.at(-1).guest.close();
const book=JSON.parse(guest.tabStore.get('jozefs-block-2d-guest-tab-v1'));
assert.equal(book.active,true,'the approved guest is bookmarked only in this tab');
const samePeer=book.peerId;
const refreshed=boot(guest.store,guest.tabStore);
flush();
assert.ok(refreshed.session().connected()&&host.session().connected(),'hard-refreshed guest rejoins without fresh invitation');
assert.equal(JSON.parse(refreshed.tabStore.get('jozefs-block-2d-guest-tab-v1')).peerId,samePeer,'stable approved guest identity');
assert.equal(refreshed.game().getWorld().players.length,2,'host world synchronized after refresh');
refreshed.session().disconnect();
assert.ok(refreshed.trace.includes('reload'),'guest disconnect restores own solo world');
console.log('Block World 2D co-op: local keyboard, two-device movement, mining/building, crafting, gifting, reconnect and save isolation PASS');
