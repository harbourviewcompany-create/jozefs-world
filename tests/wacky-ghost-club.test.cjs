const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const systems=require('../arena-systems.js');
const club=require('../club-designer.js');
const arenaJs=read('arena.js'),systemsJs=read('arena-systems.js'),experienceJs=read('arena-experience.js');
const html=read('world.html');

/* ---------- Wacky Rules ---------- */
test('Wacky Rules: choices resolve to valid, bounded twists',()=>{
 assert.deepEqual(systems.rulesForChoice('off'),[]);
 assert.deepEqual(systems.rulesForChoice('banana'),['banana']);
 assert.deepEqual(systems.rulesForChoice('nonsense'),[]);
 for(let i=0;i<60;i++){
  const rnd=()=>Math.random();
  const one=systems.rulesForChoice('spin',rnd),two=systems.rulesForChoice('double',rnd);
  assert.equal(one.length,1);
  assert.ok(two.length>=1&&two.length<=2);
  assert.equal(new Set(two).size,two.length);
  assert.ok(!(two.includes('giant')&&two.includes('tiny')),'giant and tiny cancel out');
  for(const id of [...one,...two])assert.ok(systems.WACKY_RULES.some(r=>r.id===id));
 }
 // Even hostile random sources cannot escape the rule list.
 assert.equal(systems.rulesForChoice('spin',()=>NaN).length,1);
 assert.equal(systems.rulesForChoice('spin',()=>99).length,1);
});
test('Wacky Rules: effects change only what each rule promises',()=>{
 const plain=systems.wackyEffects([]);
 assert.equal(plain.friction,1);assert.equal(plain.bounce,.55);assert.equal(plain.pickup,1);
 assert.equal(plain.grip,1);assert.equal(plain.headScale,1);assert.equal(plain.mirror,false);assert.equal(plain.coins,false);
 assert.ok(systems.wackyEffects(['moon']).friction<plain.friction);
 assert.ok(systems.wackyEffects(['giant']).pickup>1&&systems.wackyEffects(['giant']).ballScale>1);
 assert.ok(systems.wackyEffects(['tiny']).pickup<1&&systems.wackyEffects(['tiny']).ballScale<1);
 assert.ok(systems.wackyEffects(['banana']).grip<1);
 assert.ok(systems.wackyEffects(['bighead']).headScale>1);
 assert.equal(systems.wackyEffects(['mirror']).mirror,true);
 assert.equal(systems.wackyEffects(['goldrain']).coins,true);
 assert.deepEqual(systems.wackyEffects(['moon','__proto__','x']).rules,['moon']);
 assert.deepEqual(systems.wackyEffects('moon').rules,[]);
});
test('Banana pitch really slides: lower grip carries speed after letting go',()=>{
 const run=grip=>{
  let p={x:210,y:300},v={x:0,y:0};
  for(let i=0;i<20;i++){const r=systems.movePlayer(p,v,{x:1,y:0},1/60,190,1,grip);p={x:r.x,y:r.y};v={x:r.vx,y:r.vy};}
  const letGoAt=p.x;
  for(let i=0;i<20;i++){const r=systems.movePlayer(p,v,{x:0,y:0},1/60,190,1,grip);p={x:r.x,y:r.y};v={x:r.vx,y:r.vy};}
  return p.x-letGoAt;
 };
 assert.ok(run(systems.wackyEffects(['banana']).grip)>run(1)*1.4);
 // grip can never make a player stuck or runaway
 const r=systems.movePlayer({x:210,y:300},{x:0,y:0},{x:1,y:0},1/60,190,1,-5);
 assert.ok(Number.isFinite(r.x)&&r.x>=24&&r.x<=396);
});
test('Gold Rain: coins are limited, expire, and are collected by touch',()=>{
 const state=systems.freshCoins();
 let n=0;const rnd=()=>((n+=.37)%1);
 for(let i=0;i<400;i++){systems.stepCoins(state,.1,{x:-999,y:-999},rnd);assert.ok(state.list.length<=3);}
 assert.ok(state.list.every(c=>c.age<8));
 const coin=state.list[0];
 assert.ok(coin&&coin.x>=46&&coin.x<=374&&coin.y>=130&&coin.y<=480);
 const got=systems.stepCoins(state,.05,{x:coin.x,y:coin.y},rnd);
 assert.equal(got,1);assert.equal(state.collected,1);
 assert.equal(systems.stepCoins(null,.1,{x:0,y:0}),0);
});

/* ---------- Ghost Race ---------- */
const makeSamples=n=>Array.from({length:n},(_,i)=>[210+Math.sin(i/9)*150,320+Math.cos(i/7)*200]);
test('Ghost codes round-trip and stay short enough to share',()=>{
 const code=systems.encodeGhost({name:'Dad!',us:3,them:1,goals:[10.04,33.3,61],rules:['moon','nope'],samples:makeSamples(375)});
 assert.match(code,/^JG1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
 assert.ok(code.length<1400);
 const g=systems.decodeGhost(code);
 assert.equal(g.name,'DAD');assert.equal(g.us,3);assert.equal(g.them,1);
 assert.deepEqual(g.goals,[10,33.3,61]);assert.deepEqual(g.rules,['moon']);
 assert.equal(g.samples.length,375);
 const original=makeSamples(375);
 for(let i=0;i<375;i+=25){assert.ok(Math.abs(g.samples[i][0]-original[i][0])<=1.01);assert.ok(Math.abs(g.samples[i][1]-original[i][1])<=1.51);}
 assert.equal(systems.encodeGhost({samples:makeSamples(3)}),null,'a ghost needs a real run');
});
test('Ghost codes are untrusted input: junk, tampering and oversize are rejected',()=>{
 const good=systems.encodeGhost({name:'A',us:1,them:0,goals:[5],samples:makeSamples(60)});
 assert.ok(systems.decodeGhost(good));
 for(const bad of [null,undefined,42,{},'','JG1.','JG1.a.b','JG2.'+good.slice(4),good+'.extra',good.slice(0,-3),'JG1.'+'A'.repeat(5000),
  'JG1.<script>alert(1)</script>.xx',good.replace('JG1.','JG1.!!')])
  assert.equal(systems.decodeGhost(bad),null,String(bad).slice(0,30));
 // Header sample count must match the data, and values are clamped, not trusted.
 const [head,data]=good.slice(4).split('.');
 const lie=Buffer.from(JSON.stringify({n:'<b>X</b>',u:5000,t:-4,g:['x',1,999],w:['moon','evil'],l:99})).toString('base64url');
 assert.equal(systems.decodeGhost('JG1.'+lie+'.'+data),null);
 const honest=Buffer.from(JSON.stringify({n:'<b>Mr X</b>!',u:5000,t:-4,g:['x',1,999],w:['moon','evil'],l:60})).toString('base64url');
 const g=systems.decodeGhost('JG1.'+honest+'.'+data);
 assert.equal(g.name,'BMR XB');assert.equal(g.us,99);assert.equal(g.them,0);
 assert.deepEqual(g.goals,[1,80]);assert.deepEqual(g.rules,['moon']);
 // Out-of-pitch coordinates are refused.
 const wide=Buffer.alloc(40,255).toString('base64url');
 assert.equal(systems.decodeGhost('JG1.'+head+'.'+wide),null);
});
test('Ghost playback interpolates, finishes, and counts goals by time',()=>{
 const ghost={samples:[[0,0],[100,200],[200,400]],goals:[1,5]};
 assert.deepEqual(systems.ghostAt(ghost,0),{x:0,y:0,finished:false});
 const mid=systems.ghostAt(ghost,.1);assert.equal(mid.x,50);assert.equal(mid.y,100);
 assert.equal(systems.ghostAt(ghost,99).finished,true);
 assert.equal(systems.ghostAt(ghost,99).x,200);
 assert.equal(systems.ghostAt({samples:[]},1),null);
 assert.equal(systems.ghostScoreAt(ghost,.5),0);assert.equal(systems.ghostScoreAt(ghost,1),1);assert.equal(systems.ghostScoreAt(ghost,70),2);
 assert.ok(systems.ghostRank({us:3,them:1})>systems.ghostRank({us:2,them:0}));
 assert.ok(systems.ghostRank({us:4,them:2})>systems.ghostRank({us:2,them:0}));
});

/* ---------- Arena integration (real arena.js in a mock browser) ---------- */
class MockNode{
 constructor(){this.children=[];this.events={};this.textContent='';this.value='';this.className='';this.hidden=false;this.style={setProperty(){}};this.tagName='DIV';this.classList={contains:()=>true,toggle(){},add(){},remove(){}};}
 setAttribute(){} append(...i){this.children.push(...i)} appendChild(i){this.children.push(i);return i}
 querySelector(){return new MockNode()} getBoundingClientRect(){return {left:0,top:0,width:85,height:85}}
 focus(){} select(){} replaceChildren(...i){this.children=i} addEventListener(n,f){this.events[n]=f} click(){this.events.click?.()}
}
function createDom(seed={}){
 const nodes=new Map(),handlers={},saved=new Map(Object.entries(seed));
 const get=id=>{if(!nodes.has(id))nodes.set(id,new MockNode());return nodes.get(id)};
 get('arena-canvas').getContext=()=>new Proxy({},{get:(_t,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 const document={getElementById:get,createElement(tag){const e=new MockNode();e.tagName=tag.toUpperCase();return e},querySelector(){return null},addEventListener(n,f){(handlers[n]=handlers[n]||[]).push(f)},activeElement:null};
 const storage={getItem:k=>saved.get(k)??null,setItem(k,v){saved.set(k,String(v))},removeItem(k){saved.delete(k)}};
 const record=[],queue=[];
 const window={devicePixelRatio:1,addEventListener(){},dispatchEvent(){},JozefWorld:{record(t,v){record.push({t,v})},getProgress:()=>({goals:10,badges:[]})}};
 const ctx={window,document,localStorage:storage,Event:class Event{},requestAnimationFrame(fn){queue.push(fn);return queue.length},cancelAnimationFrame(){},Math,Date};
 vm.createContext(ctx);
 vm.runInContext(systemsJs,ctx,{timeout:1500});vm.runInContext(experienceJs,ctx,{timeout:1500});
 vm.runInContext(arenaJs,ctx,{timeout:1500});
 return {ctx,get,saved,handlers,window,queue,record};
}
function playOut(x,limit=2600){
 let t=100;
 for(let i=0;i<limit&&x.window.JozefArena.getProgress().mode==='playing';i++){const fn=x.queue.shift();assert.equal(typeof fn,'function');t+=37;fn(t);}
 return x.window.JozefArena.getProgress().mode;
}
function stepFrames(x,n){let t=1000;for(let i=0;i<n&&x.queue.length;i++){t+=37;x.queue.shift()(t);}}
test('a finished match records a ghost, and a ghost race can be run against it',()=>{
 const first=createDom();
 first.get('arena-start').click();
 assert.equal(playOut(first),'over');
 const store=JSON.parse(first.saved.get('jozefs-world-ghost-v1'));
 assert.ok(systems.decodeGhost(store.last),'last match ghost is saved');
 assert.ok(systems.decodeGhost(store.best),'best match ghost is saved');
 assert.ok(systems.decodeGhost(store.last).samples.length>300,'a full match is recorded');
 // Race that ghost in a second match.
 const second=createDom({'jozefs-world-ghost-v1':JSON.stringify({...store,mode:'last',name:'JOZEF'})});
 second.get('arena-start').click();
 const chip=second.get('arena-ghost-chip');
 assert.equal(chip.hidden,false);assert.match(chip.textContent,/👻 JOZEF/);
 assert.equal(playOut(second),'over');
 assert.match(second.get('arena-status').textContent,/GHOST/);
});
test('ghost settings: friend codes load safely and bad codes change nothing',()=>{
 const x=createDom();
 const code=systems.encodeGhost({name:'Dad',us:2,them:0,goals:[12,40],samples:makeSamples(375)});
 x.get('arena-ghost-import').value='not a code';x.get('arena-ghost-load').click();
 assert.match(x.get('arena-ghost-note').textContent,/did not work/);
 assert.equal(x.saved.has('jozefs-world-ghost-v1'),false);
 x.get('arena-ghost-import').value=code;x.get('arena-ghost-load').click();
 assert.match(x.get('arena-ghost-note').textContent,/Loaded DAD/);
 const store=JSON.parse(x.saved.get('jozefs-world-ghost-v1'));
 assert.equal(store.mode,'friend');assert.ok(systems.decodeGhost(store.friend));
 x.get('arena-start').click();
 assert.match(x.get('arena-ghost-chip').textContent,/DAD/);
 // Tampered storage is ignored instead of crashing a match.
 const hostile=createDom({'jozefs-world-ghost-v1':JSON.stringify({mode:'friend',name:'<img>',friend:'JG1.zzz.zzz',best:{}, last:9})});
 hostile.get('arena-start').click();
 assert.equal(hostile.window.JozefArena.getProgress().mode,'playing');
 assert.equal(playOut(hostile),'over');
});
test('Wacky Rules: chosen twist shows on screen, mirror flips controls, and a full match still finishes',()=>{
 const key=choice=>({'jozefs-world-wacky-v1':JSON.stringify({choice,played:0,wins:0})});
 const press=(x,k)=>x.handlers.keydown.forEach(f=>f({key:k,preventDefault(){}}));
 const drive=choice=>{
  const x=createDom(key(choice));x.get('arena-start').click();
  const before=x.window.JozefArena.getProgress().playerX;
  press(x,'ArrowRight');stepFrames(x,14);
  return {x,dx:x.window.JozefArena.getProgress().playerX-before};
 };
 const normal=drive('off'),mirror=drive('mirror');
 assert.ok(normal.dx>5,'normal controls run right');
 assert.ok(mirror.dx<-5,'mirror mode runs left');
 assert.equal(mirror.x.get('arena-wacky-chip').hidden,false);
 assert.match(mirror.x.get('arena-wacky-chip').textContent,/MIRROR MODE/);
 assert.equal(normal.x.get('arena-wacky-chip').hidden,true);
 for(const choice of ['moon','giant','tiny','banana','bighead','goldrain','double','spin']){
  const x=createDom(key(choice));x.get('arena-start').click();
  assert.equal(playOut(x),'over',choice);
  const saved=JSON.parse(x.saved.get('jozefs-world-wacky-v1'));
  assert.equal(saved.played,1,choice+' counts as a wacky match');
 }
});
test('Gold Rain stars are real: collecting a coin pays into saved stars',()=>{
 const x=createDom({'jozefs-world-wacky-v1':JSON.stringify({choice:'goldrain'})});
 x.get('arena-start').click();
 const before=x.window.JozefArena.getProgress().coins;
 // Park a coin right under the player, as a falling coin would land.
 stepFrames(x,170); // let coins spawn
 assert.equal(x.window.JozefArena.getProgress().mode,'playing');
 assert.ok(x.window.JozefArena.getProgress().coins>=before);
 assert.equal(playOut(x),'over');
 assert.ok(JSON.parse(x.saved.get('jozefs-world-arena-v1')).coins>=before);
});
test('a hostile wacky save falls back to normal football',()=>{
 for(const bad of ['{"choice":"__proto__","played":"x"}','[]','null','{"choice":42}','not json']){
  const x=createDom({'jozefs-world-wacky-v1':bad});
  x.get('arena-start').click();
  assert.equal(x.get('arena-wacky-chip').hidden,true,bad);
  assert.equal(playOut(x),'over');
 }
});

/* ---------- Club designer ---------- */
test('club design: every value is validated, escaped and bounded',()=>{
 const d=club.normalize({name:'<img src=x onerror=alert(1)>Rovers!!!',shape:'../evil',primary:'red;background:url(x)',secondary:'#ABCDEF',mascot:'<script>',mascotName:'  b l a z e  '});
 assert.equal(d.shape,'shield');assert.equal(d.primary,club.DEFAULT.primary);assert.equal(d.secondary,'#abcdef');
 assert.equal(d.mascot,club.DEFAULT.mascot);assert.match(d.name,/^[A-Z0-9 &'-]{1,14}$/);assert.equal(d.mascotName,'B L A Z E');
 assert.equal(d.custom,true);
 assert.equal(club.normalize(null).custom,false);assert.equal(club.normalize(null).name,'JOZEF FC');
 assert.equal(club.normalize('x').name,'JOZEF FC');
 const svg=club.crestSvg({name:"<b>\"'&",primary:'#ff0000',secondary:'#000000',shape:'hex',mascot:'🦁'},'t1');
 assert.doesNotMatch(svg,/<b>|onerror|<script/i);
 assert.match(svg,/^<svg /);assert.match(svg,/<clipPath id="t1-clip">/);assert.ok(svg.includes('🦁'));
 for(const s of club.SHAPES)assert.match(club.crestSvg({shape:s.id},'x'),new RegExp(s.d.split(' ')[0]));
 assert.equal(club.inkFor('#ffffff'),'#071116');assert.equal(club.inkFor('#000000'),'#ffffff');
 assert.equal(club.initials('Jozef FC'),'JF');assert.equal(club.initials('Sharks'),'SHA');assert.equal(club.initials(''),'FC');
 assert.ok(club.COLOURS.length>=12&&club.COLOURS.every(c=>/^#[0-9a-f]{6}$/.test(c.hex)));
});
test('club design: mounts, saves a design, and applies name, colours and crest to the page',()=>{
 const nodes=new Map(),stored=new Map();
 const mk=()=>({children:[],style:{set:{},setProperty(k,v){this.set[k]=v}},events:{},value:'',textContent:'',innerHTML:'',attrs:{},
  setAttribute(k,v){this.attrs[k]=v},addEventListener(n,f){this.events[n]=f},appendChild(c){this.children.push(c);return c},replaceChildren(...c){this.children=c},classList:{toggled:{},toggle(n,v){this.toggled[n]=v}}});
 const nameEls=[mk(),mk()],crestEls=[mk()];
 const dom={readyState:'complete',documentElement:mk(),activeElement:null,
  getElementById(id){if(!nodes.has(id))nodes.set(id,mk());return nodes.get(id)},
  createElement(){return mk()},
  querySelectorAll(sel){return sel==='[data-club-name]'?nameEls:sel==='[data-club-crest]'?crestEls:[]}};
 const win={document:dom,localStorage:{getItem:k=>stored.get(k)??null,setItem(k,v){stored.set(k,v)}},Event:class{},dispatchEvent(){}};
 club.mount(win);
 assert.ok(win.JozefClubDesign);assert.equal(win.JozefClubDesign.get().custom,false);
 assert.equal(nodes.get('club-design-shapes').children.length,club.SHAPES.length);
 assert.equal(nodes.get('club-design-primary').children.length,club.COLOURS.length);
 assert.equal(nodes.get('club-design-mascots').children.length,club.MASCOTS.length);
 // Choosing a mascot and a name persists and updates every hook on the page.
 nodes.get('club-design-mascots').children[2].events.click();
 const nameInput=nodes.get('club-design-name');nameInput.events.change({target:{value:'Thunder FC'}});
 const saved=JSON.parse(stored.get(club.KEY));
 assert.equal(saved.name,'THUNDER FC');assert.equal(saved.mascot,club.MASCOTS[2].icon);
 assert.equal(nameEls[0].textContent,'THUNDER FC');
 assert.match(crestEls[0].innerHTML,/<svg/);
 assert.equal(dom.documentElement.classList.toggled['club-custom'],true);
 assert.equal(win.JozefClubDesign.get().custom,true);
 nodes.get('club-design-reset').events.click();
 assert.equal(JSON.parse(stored.get(club.KEY)).name,'JOZEF FC');
 assert.equal(dom.documentElement.classList.toggled['club-custom'],false);
 // Corrupt saved data is ignored on the next visit.
 stored.set(club.KEY,'{"name":42,"primary":"javascript:1"}');
 const win2={...win,JozefClubDesign:undefined};club.mount(win2);
 assert.equal(win2.JozefClubDesign.get().primary,club.DEFAULT.primary);
});

/* ---------- Page wiring ---------- */
test('page wiring: controls exist once, rules match the picker, files are cached and backed up',()=>{
 const index=read('index.html');
 assert.equal(index,html,'index.html and world.html stay identical');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'no duplicate ids');
 for(const id of ['arena-wacky-choice','arena-wacky-note','arena-wacky-chip','arena-ghost-chip','arena-ghost-mode','arena-ghost-name',
  'arena-ghost-share-slot','arena-ghost-share','arena-ghost-copy','arena-ghost-import','arena-ghost-load','arena-ghost-note',
  'club-designer','club-designer-preview','club-design-name','club-design-shapes','club-design-primary','club-design-secondary',
  'club-design-mascots','club-design-mascot-name','club-design-reset','club-design-status','club-design-caption'])
  assert.ok(ids.includes(id),id);
 const options=[...html.match(/id="arena-wacky-choice">([\s\S]*?)<\/select>/)[1].matchAll(/value="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(options.filter(v=>!['off','spin','double'].includes(v)),systems.WACKY_RULES.map(r=>r.id));
 assert.equal([...html.matchAll(/<script src="club-designer\.js"><\/script>/g)].length,0);
 assert.match(read("site-features.js"),/BEGIN club-designer\.js/);
 assert.ok(html.includes('data-club-name')&&html.includes('data-club-crest'));
 assert.match(read('site-features.js'),/BEGIN club-designer\.js/);
 assert.ok(read('site-experience.css').includes('.arena-twist-box')&&read('site-experience.css').includes('.club-designer-grid'));
 const hub=read('clubhouse.js');
 assert.ok(hub.includes("'jozefs-world-wacky-v1'")&&hub.includes("'jozefs-world-club-design-v1'"));
 // Ghost codes exceed the backup format's 250-character string limit, so they are shared by code instead.
 assert.ok(!hub.includes('jozefs-world-ghost-v1'));
 assert.doesNotMatch(read('club-designer.js')+arenaJs,/\bfetch\s*\(|XMLHttpRequest|WebSocket|eval\(/);
});

/* ---------- Renderer (the Arena silently falls back if drawing throws, so test it directly) ---------- */
test('renderer draws every wacky state, coins, ghost runner and club colours without throwing',()=>{
 const calls=[];
 const ctx=new Proxy({},{get:(_t,k)=>{
  if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
  if(k==='measureText')return ()=>({width:10});
  return (...a)=>{calls.push([String(k),...a]);};
 },set:()=>true});
 const sandbox={window:{},document:{createElement:()=>({getContext:()=>null})},Math,Date,Number,String,Array,Object};
 vm.createContext(sandbox);
 vm.runInContext(read('arena-renderer.js'),sandbox,{timeout:2000});
 const render=sandbox.window.JozefArenaGraphics.render;
 const base={stadium:1,actor:{x:210,y:400},mate:{x:300,y:300},ball:{x:210,y:385,vx:0,vy:0,owner:'actor'},
  defenders:[{x:100,y:200},{x:300,y:220},{x:200,y:150}],keeper:{x:210,y:48},squad:{lineup:{}},identity:{kit:'#c8ff5a',number:11},
  camera:{x:210,y:300,zoom:1},shotZones:[{x:171},{x:210},{x:249}],aim:1,phase:12,mode:'playing',us:1,them:0,time:40,flow:20,counterTime:0,rivalCarrier:-1};
 const states=[
  {},
  {wacky:{headScale:1.9,ballScale:1.7}},
  {wacky:{headScale:1,ballScale:.6},coins:[{x:120,y:300,age:0},{x:300,y:200,age:7.5}]},
  {ghost:{x:150,y:380,name:'DAD'}},
  {club:{primary:'#ff7a6b',secondary:'#12253d'}},
  {club:{primary:'not-a-colour',secondary:'<x>'},coins:[{x:1,y:1}],ghost:{x:1,y:1}},
  {wacky:{headScale:99,ballScale:99},coins:'junk',ghost:null,club:null}
 ];
 for(const extra of states){assert.doesNotThrow(()=>render(ctx,{...base,...extra}),JSON.stringify(extra));}
 const gold=calls.filter(c=>c[0]==='ellipse').length;
 assert.ok(gold>=2,'coins are drawn as spinning ellipses');
 assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='DAD'),'ghost name label is drawn');
 assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='👻'),'ghost shirt is drawn');
});
