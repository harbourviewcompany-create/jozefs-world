const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const arenaJs=fs.readFileSync(path.join(__dirname,'../arena.js'),'utf8');
const squadJs=fs.readFileSync(path.join(__dirname,'../squad.js'),'utf8');
class MockNode {
 constructor(){this.children=[];this.events={};this.textContent='';this.value='';this.className='';this.style={};this.tagName='DIV';this.classList={contains:()=>true};}
 setAttribute(){}
 append(...items){this.children.push(...items)}
 appendChild(item){this.children.push(item);return item}
 replaceChildren(...items){this.children=items}
 addEventListener(name,fn){this.events[name]=fn}
 click(){this.events.click?.()}
}
function createDom(){
 const nodes=new Map(),handlers={},saved=new Map();
 const get=id=>{if(!nodes.has(id))nodes.set(id,new MockNode());return nodes.get(id)};
 const canvas=get('arena-canvas');
 canvas.getContext=()=>new Proxy({},{
  get:(_target,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}
 });
 const document={getElementById:get,createElement(tag){const el=new MockNode();el.tagName=tag.toUpperCase();return el;},querySelector(){return null;},addEventListener(name,fn){handlers[name]=fn},activeElement:null};
 const storage={getItem:key=>saved.get(key)??null,setItem(key,value){saved.set(key,String(value))},removeItem(key){saved.delete(key)}};
 const events={},record=[];
 const window={devicePixelRatio:1,addEventListener(name,fn){events[name]=fn},dispatchEvent(){},JozefWorld:{record(type,value){record.push({type,value})},getProgress:()=>({goals:10,badges:['league-debut','training-star']})},JozefCareer:{getProgress:()=>({played:1,cups:0})},JozefTour:{getProgress:()=>({wins:1,cups:0})}};
 const queue=[];
 const ctx={window,document,localStorage:storage,Event:class Event{},requestAnimationFrame(fn){queue.push(fn);return queue.length},cancelAnimationFrame(){},Math,Date};
 vm.createContext(ctx);
 return {ctx,get,saved,events,handlers,window,record,queue};
}
test('squad builder starts with Jozef and upgrades skills through unlocked player cards',()=>{
 const x=createDom();
 vm.runInContext(squadJs,x.ctx,{timeout:1500});
 assert.equal(x.window.JozefSquad.getSquad().slots.striker,'rookie');
 assert.equal(x.get('squad-grid').children.length,4);
 const playerSelect=x.get('squad-grid').children[2].children[2];
 assert.ok(playerSelect.children.some(p=>p.value==='scholar'),'training unlock must become usable');
 playerSelect.value='scholar';playerSelect.events.change();
 assert.equal(x.window.JozefSquad.getSquad().slots.mid,'scholar');
 assert.ok(x.window.JozefSquad.getSquad().bonuses.pass>.04);
 assert.ok(x.saved.get('jozefs-world-squad-v1'));
 const tactic=x.get('squad-tactic');tactic.value='attack';tactic.events.change({target:tactic});
 assert.equal(x.window.JozefSquad.getSquad().tactic,'attack');
 assert.ok(x.window.JozefSquad.getSquad().bonuses.shot>=.07);
});
test('Arena match can kick off, pause, resume and save result locally',()=>{
 const x=createDom();
 let squad=null;
 vm.runInContext(squadJs,x.ctx,{timeout:1500});
 squad=x.window.JozefSquad.getSquad();
 assert.ok(squad);
 vm.runInContext(arenaJs,x.ctx,{timeout:1500});
 assert.equal(x.window.JozefArena.getProgress().mode,'ready');
 x.get('arena-start').click();
 assert.equal(x.window.JozefArena.getProgress().mode,'playing');
 x.get('arena-start').click();
 assert.equal(x.window.JozefArena.getProgress().mode,'paused');
 x.get('arena-start').click();
 assert.equal(x.window.JozefArena.getProgress().mode,'playing');
 let t=100;
 for(let i=0;i<2300&&x.window.JozefArena.getProgress().mode==='playing';i++){
   const fn=x.queue.shift();assert.equal(typeof fn,'function');
   t+=37;
   fn(t);
 }
 assert.equal(x.window.JozefArena.getProgress().mode,'over');
 assert.equal(x.window.JozefArena.getProgress().games,1);
 assert.equal(x.record.length,1);
 assert.equal(x.record[0].type,'arena');
 assert.ok(['win','draw','loss'].includes(x.record[0].value.result));
 assert.ok(x.saved.has('jozefs-world-arena-v1'));
});
test('Arena and squad remain private and do not use external network calls',()=>{
 assert.doesNotMatch(arenaJs,/\bfetch\s*\(|XMLHttpRequest|WebSocket/);
 assert.doesNotMatch(squadJs,/\bfetch\s*\(|XMLHttpRequest|WebSocket/);
 assert.match(arenaJs,/pointerdown/);
 assert.match(arenaJs,/keydown/);
 assert.match(arenaJs,/function shoot\(/);
 assert.match(arenaJs,/function pass\(/);
});
