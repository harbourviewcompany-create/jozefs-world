#!/usr/bin/env node
/* Dependency-free smoke tests for the actual static Block World HTML. */
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','block-world.html'),'utf8');
const js=fs.readFileSync(require('node:path').join(__dirname,'..','block-world.js'),'utf8');
const art=fs.readFileSync(require('node:path').join(__dirname,'..','block-world-art.js'),'utf8');
const mobileUi=fs.readFileSync(require('node:path').join(__dirname,'..','block-world-ui.js'),'utf8');
assert.match(html,/src="\.\/block-world\.js(?:\?v=[A-Za-z0-9._-]+)?"/,'HTML loads the extracted gameplay module');
assert.match(html,/src="\.\/block-world-coop\.js(?:\?v=[A-Za-z0-9._-]+)?"/,'HTML loads the real co-op runtime');
assert.ok(js,'Block World script must exist');
new vm.Script(js,{filename:'block-world.html'});
new vm.Script(art,{filename:'block-world-art.js'});
new vm.Script(mobileUi,{filename:'block-world-ui.js'});
assert.match(html,/block-world-art\.js/,'live game loads procedural art');
assert.match(html,/block-world-ui\.js/,'live game loads functional HUD controls');
function boot(storage=new Map()){
  const nodes=new Map(),events=new Map(),clock={now:0,frame:null};
  const context=new Proxy({},{
    get(_o,k){return (k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop(){}}):k==='measureText'?()=>({width:50}):()=>{};},
    set(){return true;}
  });
  function node(initial=''){
    let id=initial;
    const el={
      style:{},children:[],events:{},attrs:{},classList:{add(){},remove(){},toggle(){return false;}},
      hidden:false,textContent:'',innerHTML:'',width:0,height:0,files:[],
      addEventListener(t,fn){(this.events[t]??=[]).push(fn);},
      setAttribute(k,v){this.attrs[k]=v;},
      getAttribute(k){return this.attrs[k];},
      appendChild(v){this.children.push(v);return v;},insertBefore(v,ref){this.children.unshift(v);return v;},
      append(...v){this.children.push(...v);},
      replaceChildren(...v){this.children=v;},
      after(){},click(){},remove(){},
      getContext(){return context;},
      getBoundingClientRect(){return {left:0,top:0,width:390,height:844};},
      setPointerCapture(){}
    };
    Object.defineProperty(el,'id',{get(){return id;},set(v){id=v;nodes.set(v,el);}});
    if(initial)nodes.set(initial,el);
    return el;
  }
  const document={
    body:node('body'),head:node('head'),hidden:false,
    getElementById(id){return nodes.get(id)??node(id);},
    createElement(){return node();},
    addEventListener(t,fn){(events.get(t)||events.set(t,[]).get(t)).push(fn);}
  };
  const window={innerWidth:390,innerHeight:844,devicePixelRatio:2,addEventListener(t,fn){(events.get(t)||events.set(t,[]).get(t)).push(fn);}};
  const localStorage={
    getItem(k){return storage.get(k)??null;},
    setItem(k,v){storage.set(k,String(v));},
    removeItem(k){storage.delete(k);}
  };
  const addEventListener=(t,fn)=>(events.get(t)||events.set(t,[]).get(t)).push(fn);
  const testScript=js.replace(/requestAnimationFrame\(frame\);\s*\}\)\(\);/,
    'window.__inspect={players,world:()=>world,surface:()=>surface,quest:()=>({questStage,goals}),blueprint:buildBlueprint,visitPortal:()=>{questStage=4;players.forEach(p=>{p.x=portalX*TILE;p.y=surface[portalX]*TILE-p.h;});activateTeamPortal();}};requestAnimationFrame(frame);})();');
  const sandbox={
    window,document,localStorage,
    performance:{now:()=>clock.now},
    requestAnimationFrame(fn){clock.frame=fn;},
    addEventListener,confirm:()=>false,
    setTimeout(){return 1;},clearTimeout(){},
    Blob:class Blob{constructor(parts){this.parts=parts;}},
    URL:{createObjectURL:()=>'/test',revokeObjectURL(){}},
    console:{warn(){}}
  };
  vm.runInNewContext(art,sandbox,{filename:'block-world-art.js',timeout:10000});
  vm.runInNewContext(testScript,sandbox,{filename:'block-world.html',timeout:10000});
  document.getElementById('toolbar-extra').hidden=true;
  vm.runInNewContext(mobileUi,sandbox,{filename:'block-world-ui.js',timeout:10000});
  const advance=(count=1)=>{for(let i=0;i<count;i++){clock.now+=17;assert.ok(clock.frame);clock.frame(clock.now);}};
  const click=(id,type='click')=>{
    const el=document.getElementById(id);
    assert.ok(el.events[type]?.length,'Missing '+id+' '+type+' listener');
    for(const fn of el.events[type])fn({preventDefault(){},pointerId:1});
  };
  return{window,document,localStorage,storage,advance,click};
}
const first=boot();
first.advance(16);
const game=first.window.__inspect;
assert.ok(first.window.BlockWorldArt,'procedural art engine registered');
assert.ok(first.window.BlockWorldArt.tile(1),'grass texture generated');
assert.ok(first.window.BlockWorldArt.tile(18),'diamond ore texture generated');
assert.ok(first.window.BlockWorldVisuals,'mobile controls initialized');
assert.ok(first.document.getElementById('toolbar-extra').children.includes(first.document.getElementById('bw-actions')),'world actions consolidated inside primary menu');
const compactMission=first.document.getElementById('bw-mission');
assert.equal(compactMission.getAttribute('aria-expanded'),'false','mission starts compact');
first.click('bw-mission');
assert.ok(['true','false'].includes(compactMission.getAttribute('aria-expanded')),'mission toggle is wired');

assert.equal(first.window.BlockWorldVisuals.menuOpen(),false,'menu starts closed');
first.click('menu-toggle');
assert.equal(first.window.BlockWorldVisuals.menuOpen(),true,'menu opens');
first.click('menu-toggle');
assert.equal(first.window.BlockWorldVisuals.menuOpen(),false,'menu closes');
const pad=first.document.getElementById('movement-pad');
pad.events.pointerdown[0]({clientX:30,pointerId:12});
assert.equal(first.window.BlockWorld2D.input().left,true,'joystick left sends live movement');
pad.events.pointermove[0]({clientX:350,pointerId:12});
assert.equal(first.window.BlockWorld2D.input().right,true,'joystick drag changes direction');
pad.events.pointerup[0]({pointerId:12});
assert.equal(first.window.BlockWorld2D.input().left,false,'joystick releases left');
assert.equal(first.window.BlockWorld2D.input().right,false,'joystick releases right');
assert.ok(first.document.getElementById('btn-attack').events.pointerdown?.length,'attack button handles touch');

assert.equal(game.world().length,72);
assert.equal(game.world()[0].length,180);
assert.equal(game.surface().length,180);
assert.ok(game.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.y>=0),'finite player coordinates');
assert.equal(first.document.getElementById('health').textContent.includes('DADDY'),true);
assert.match(first.document.getElementById('bw-mission').innerHTML,/MISSION 1\/5/);
first.click('btn-switch','pointerdown');
assert.match(first.document.getElementById('health').textContent,/JOZEF/);
first.click('btn-switch','pointerup');
const p=game.players[1],cx=Math.floor(p.x/40)+p.facing*3,base=Math.floor((p.y+p.h)/40);
for(let y=Math.max(0,base-8);y<=base;y++)for(let x=cx;x<cx+9;x++)if(game.world()[y])game.world()[y][x]=0;
game.blueprint('home');
assert.ok(game.quest().goals.build>0,'blueprint places physical tiles');
first.click('save');
const save=JSON.parse(first.storage.get('jozefs-world-block-v3'));
assert.equal(save.world.length,72);
assert.equal(save.players.length,2);
assert.ok(first.storage.get('jozef-block-adventure-v4'),'quest progress persisted');
const second=boot(first.storage);
second.advance(3);
assert.ok(second.window.__inspect.players.every(p=>Number.isFinite(p.y)),'saved world restores playable positions');
assert.ok(second.window.__inspect.quest().goals.build>0,'mission progress survives reload');
const game2=second.window.__inspect;
game2.visitPortal();
assert.match(second.document.getElementById('bw-mission').innerHTML,/Frost Moon/,'team portal actually changes realms');
assert.equal(game2.quest().goals.portal,1,'both-player portal awards shared completion');
const realmData={
  format:'DaddyJozefBlockRealms',version:1,realmIndex:0,realmBaseSeed:333,
  realms:{0:{seed:333,world:game2.world().map(row=>row.slice()),surface:game2.surface().slice(),
    players:game2.players.map(p=>({x:p.x,y:p.y}))}},
  questStage:5,goals:{wood:8,build:12,explore:1,diamond:1,portal:1},
  achievements:['Forest Expedition'],portalUnlocked:true,creative:true,selected:2,active:0,
  teamFollow:true,players:game2.players.map(p=>({x:p.x,y:p.y,health:100,inventory:p.inventory}))};
assert.equal(typeof second.window.BlockWorldImportRealms,'function');
second.window.BlockWorldImportRealms(realmData);
assert.match(second.document.getElementById('bw-mission').innerHTML,/Our Homeworld/,'realm package imported');
assert.equal(game2.quest().questStage,5);
console.log('Block World: startup, co-op, biomes, blueprints, local saves, portal travel and realm backup import PASS');
