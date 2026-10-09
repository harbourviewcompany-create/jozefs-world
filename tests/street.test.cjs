const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const game=fs.readFileSync(path.join(root,'street.js'),'utf8');
function setup(){
 const nodes=new Map(), storage=new Map(), listeners={},callbacks=new Map(),rewards=[];
 let counter=0;
 const noop=()=>{};
 const context2d={setTransform:noop,fillRect:noop,beginPath:noop,roundRect:noop,fill:noop,stroke:noop,moveTo:noop,lineTo:noop,
   closePath:noop,ellipse:noop,fillText:noop,createLinearGradient(){return{addColorStop:noop}}};
 class Node{
  constructor(id){this.id=id;this.children=[];this.textContent='';this.dataset={};this.events={};this.className='';this.style={};
    this.classList={contains:()=>true};this.width=360;this.height=520}
  getContext(){return context2d}
  getBoundingClientRect(){return{left:0,width:360,top:0,height:520}}
  addEventListener(k,fn){this.events[k]=fn}
  setAttribute(){}
  click(){this.events.click?.()}
 }
 const document={activeElement:null,hidden:false,
  getElementById(id){if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id)},
  addEventListener(type,fn){listeners[type]=fn}};
 const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))};
 const window={devicePixelRatio:1,JozefWorld:{record:(action,data)=>rewards.push({action,...data})},addEventListener(k,fn){listeners[k]=fn}};
 const raf=fn=>{const id=++counter;callbacks.set(id,fn);return id;};
 const cancel=id=>callbacks.delete(id);
 vm.runInNewContext(game,{document,window,localStorage,requestAnimationFrame:raf,cancelAnimationFrame:cancel}, {timeout:2000});
 return{get id(){return nodes},progress:()=>window.JozefStreet.getProgress(),storage,rewards,
  node:id=>document.getElementById(id),listeners,
  step(now){const [id,cb]=callbacks.entries().next().value||[];if(!cb)return false;callbacks.delete(id);cb(now);return true;}
 };
}
test('STREET//11 initializes without network or external graphics',()=>{
 const s=setup();
 assert.equal(s.progress().state,'ready');
 assert.equal(s.node('street-time').textContent,'55');
 assert.equal(s.node('street-score').textContent,'0');
 assert.ok(s.node('street-canvas').events.pointerdown);
 assert.ok(s.node('street-start').events.click);
});
test('Night Run starts, pauses and resumes without losing the score',()=>{
 const s=setup();
 s.node('street-start').click();
 assert.equal(s.progress().state,'playing');
 s.step(16);s.step(52);
 s.node('street-start').click();
 assert.equal(s.progress().state,'paused');
 const score=s.progress().score;
 s.node('street-start').click();
 assert.equal(s.progress().state,'playing');
 assert.equal(s.progress().score,score);
 s.node('street-left').click();
 s.node('street-right').click();
});
test('STREET//11 ends at full time or after 3 collisions and reports a result',()=>{
 const s=setup();
 s.node('street-start').click();
 let ticks=0;
 while(s.progress().state==='playing'&&ticks<2200){
  s.step(16+ticks*35);
  ticks++;
 }
 assert.ok(ticks<2200,'run should end');
 assert.equal(s.progress().state,'over');
 assert.ok(s.progress().score>=0);
 assert.ok(s.progress().timeRemaining>=0);
 assert.ok(s.node('street-announcement').textContent.includes('Full-time'));
});
test('canonical homepage uses the latest stadium and loads exactly one STREET//11 script',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const world=fs.readFileSync(path.join(root,'world.html'),'utf8');
 assert.equal(html,world);
 for(const id of ['home','games','club','tour','career','street'])assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 for(const file of ['stadium.css','stadium.js','street.js','app.js','extras.js','career.js'])assert.ok(html.includes('"'+file+'"'),'missing '+file);
 assert.equal((html.match(/src="street\.js"/g)||[]).length,1);
 assert.ok(html.includes('class="hero studio-hero"'));
 assert.ok(html.includes('id="street-canvas"'));
 assert.ok(html.includes('data-section="street"'));
 assert.match(html, /data-section="fun"[^>]*>Locker Room<\/button>/, 'Locker Room remains a local section, not an external link');
 assert.ok(html.includes('<section id="fun" class="section">'), 'Locker Room section exists');
 assert.ok(html.includes('>THE LOCKER ROOM</h2>'), 'Locker Room destination has the expected heading');
});
