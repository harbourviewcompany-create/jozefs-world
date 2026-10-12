#!/usr/bin/env node
/* Dependency-free smoke tests for the actual static Block World HTML. */
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','block-world.html'),'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(js,'Block World script must exist');
new vm.Script(js,{filename:'block-world.html'});
function boot(storage=new Map()){
  const nodes=new Map(),events=new Map(),clock={now:0,frame:null};
  const context=new Proxy({},{
    get(_o,k){return k==='createLinearGradient'?()=>({addColorStop(){}}):k==='measureText'?()=>({width:50}):()=>{};},
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
  const window={innerWidth:390,innerHeight:844,devicePixelRatio:2};
  const localStorage={
    getItem(k){return storage.get(k)??null;},
    setItem(k,v){storage.set(k,String(v));},
    removeItem(k){storage.delete(k);}
  };
  const addEventListener=(t,fn)=>(events.get(t)||events.set(t,[]).get(t)).push(fn);
  const testScript=js.replace(/requestAnimationFrame\(frame\);\s*\}\)\(\);/,
    'window.__inspect={players,world:()=>world,surface:()=>surface,quest:()=>({questStage,goals}),blueprint:buildBlueprint};requestAnimationFrame(frame);})();');
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
  vm.runInNewContext(testScript,sandbox,{filename:'block-world.html',timeout:10000});
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
assert.equal(game.world().length,72);
assert.equal(game.world()[0].length,180);
assert.equal(game.surface().length,180);
assert.ok(game.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.y>=0),'finite player coordinates');
assert.equal(first.document.getElementById('health').textContent.includes('Daddy'),true);
assert.match(first.document.getElementById('bw-mission').innerHTML,/MISSION 1\/5/);
first.click('btn-switch','pointerdown');
assert.match(first.document.getElementById('health').textContent,/Jozef/);
first.click('btn-switch','pointerup');
const p=game.players[1],cx=Math.floor(p.x/40)+3,base=Math.floor((p.y+p.h)/40);
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
console.log('Block World: rendering, character spawn, seeded world, co-op switch, blueprints and save/restore PASS');
