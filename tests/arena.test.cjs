const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const arenaJs=fs.readFileSync(path.join(__dirname,'../arena.js'),'utf8');
const squadJs=fs.readFileSync(path.join(__dirname,'../squad.js'),'utf8');
class MockNode {
constructor(){this.children=[];this.events={};this.textContent='';this.value='';this.className='';this.style={};this.tagName='DIV';this.classList={contains:()=>true,toggle(){},add(){},remove(){}};}
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


test('chosen corner shot scores a real goal past a guessing goalkeeper',()=>{
 const x=createDom();
 const mockMath=Object.create(Math);mockMath.random=()=>.9;
 x.ctx.Math=mockMath;
 vm.runInContext(arenaJs,x.ctx,{timeout:1500});
 x.get('arena-start').click();
 // Aiming is a genuine input: moving the reticle alters the target.
 x.get('arena-aim-2').click();
 assert.equal(x.window.JozefArena.getProgress().aim,'RIGHT POST');
 x.get('arena-aim-0').click();
 assert.equal(x.window.JozefArena.getProgress().aim,'LEFT POST');
 x.get('arena-shoot').click();
 assert.equal(x.window.JozefArena.getProgress().shots,1);
 assert.equal(x.window.JozefArena.getProgress().ballOwner,'shot');
 let t=100;
 for(let i=0;i<42&&x.window.JozefArena.getProgress().matchGoals===0;i++){
  const fn=x.queue.shift();
  assert.equal(typeof fn,'function');
  t+=37;fn(t);
 }
 assert.equal(x.window.JozefArena.getProgress().matchGoals,1,'controlled far-post shot should beat the wrong-footed keeper');
 assert.equal(x.window.JozefArena.getProgress().mode,'playing');
 assert.match(x.get('arena-status').textContent,/GOOOOOAL!/);
});

test('the teammate receives a pass and can return a one-two on request',()=>{
 const x=createDom();
 vm.runInContext(arenaJs,x.ctx,{timeout:1500});
 x.get('arena-start').click();
 x.get('arena-pass').click();
 assert.equal(x.window.JozefArena.getProgress().ballOwner,'pass');
 let t=100;
 for(let i=0;i<42&&x.window.JozefArena.getProgress().ballOwner==='pass';i++){
  const fn=x.queue.shift();assert.equal(typeof fn,'function');t+=37;fn(t);
 }
 assert.equal(x.window.JozefArena.getProgress().ballOwner,'mate','first pass should reach the teammate, not roll away');
 for(let i=0;i<8;i++){const fn=x.queue.shift();t+=37;fn(t);}
 x.get('arena-pass').click();
 assert.equal(x.window.JozefArena.getProgress().ballOwner,'pass','second pass should start the return ball');
 for(let i=0;i<45&&x.window.JozefArena.getProgress().ballOwner==='pass';i++){
  const fn=x.queue.shift();t+=37;fn(t);
 }
 assert.equal(x.window.JozefArena.getProgress().ballOwner,'actor','one-two should reach Jozef again');
});

test('skill move is limited by a real cooldown and does not activate when paused',()=>{
 const x=createDom();
 vm.runInContext(arenaJs,x.ctx,{timeout:1500});
 x.get('arena-start').click();
 x.get('arena-skill').click();
 assert.equal(x.window.JozefArena.getProgress().skillReady,false);
 assert.equal(x.get('arena-skill').disabled,true);
 x.get('arena-start').click();
 assert.equal(x.window.JozefArena.getProgress().mode,'paused');
 x.get('arena-skill').click();
 assert.equal(x.window.JozefArena.getProgress().skillReady,false);
 x.get('arena-start').click();
 let t=100;
 for(let i=0;i<162&&x.window.JozefArena.getProgress().mode==='playing';i++){
  const fn=x.queue.shift();assert.equal(typeof fn,'function');t+=37;fn(t);
 }
 assert.equal(x.window.JozefArena.getProgress().skillReady,true,'5.5-second skill cooldown should expire');
});

test('Arena and squad are integrated into the published document only once',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../world.html'),'utf8');
 for(const id of ['arena-aim-0','arena-aim-1','arena-aim-2','arena-skill','arena-aim-label','squad-grid']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must have one control');
 }
 assert.equal((html.match(/src="arena.js"/g)||[]).length,1);
 assert.equal((html.match(/src="squad.js"/g)||[]).length,1);
});


test('keeper and defender card choices reduce counterattacking risk',()=>{
 const x=createDom();
 vm.runInContext(squadJs,x.ctx,{timeout:1500});
 const initial=x.window.JozefSquad.getSquad().bonuses;
 const keeper=x.get('squad-grid').children[0].children[2];
 keeper.value='captain';keeper.events.change();
 const defender=x.get('squad-grid').children[1].children[2];
 defender.value='goal';defender.events.change();
 const upgraded=x.window.JozefSquad.getSquad().bonuses;
 assert.ok(upgraded.keeper>initial.keeper,'keeper card must change save strength');
 assert.ok(upgraded.defence>initial.defence,'defender card must change defence strength');
 assert.equal(x.window.JozefSquad.getSquad().slots.keeper,'captain');
 assert.equal(x.window.JozefSquad.getSquad().slots.back,'goal');
});
test('sound effects only play after explicit club opt-in',()=>{
 let created=0,notes=0;
 class FakeAudioContext{
  constructor(){created++;this.currentTime=0;this.destination={};}
  createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){notes++},stop(){},type:'sine'};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
 }
 const off=createDom();off.window.AudioContext=FakeAudioContext;
 off.window.JozefWorld.getProgress=()=>({sound:false});
 vm.runInContext(arenaJs,off.ctx,{timeout:1500});
 off.get('arena-start').click();off.get('arena-pass').click();
 assert.equal(created,0,'the game must not play sound without consent');
 const on=createDom();on.window.AudioContext=FakeAudioContext;
 on.window.JozefWorld.getProgress=()=>({sound:true,number:11,kit:'#cafa60'});
 vm.runInContext(arenaJs,on.ctx,{timeout:1500});
 on.get('arena-start').click();on.get('arena-pass').click();
 assert.equal(created,1,'a single audio context should be used for a session');
 assert.ok(notes>=3,'kickoff and passing effects should be generated locally');
});
