const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'sports-stage.js'),'utf8');
const page=fs.readFileSync(path.join(root,'world.html'),'utf8');
const css=fs.readFileSync(path.join(root,'sports-stage.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function setup({reduced=false,canvas=true}={}){
 const events=[],paint=[],listeners={};let now=0,pending=null,visible=true,hidden=false;
 const ctx=new Proxy({},{
  get(obj,key){if(key==='canvas')return {width:640,height:320};
   if(!(key in obj))obj[key]=(...args)=>{if(['fillText','fillRect','arc','moveTo','lineTo'].includes(String(key)))paint.push([String(key),...args]);};
   return obj[key]},
  set(obj,key,value){obj[key]=value;return true}
 });
 const stageClass=new Set();
 const elements={
  'multi-action-canvas':{getContext:()=>canvas?ctx:null},
  'multi-stage':{classList:{add:k=>stageClass.add(k)}},
  'sports-arcade':{classList:{contains:()=>visible}}
 };
 const document={
  get hidden(){return hidden},
  getElementById:id=>elements[id],
  addEventListener:(kind,fn)=>listeners['document:'+kind]=fn,
  querySelector:()=>({addEventListener:(kind,fn)=>listeners['nav:'+kind]=fn})
 };
 const window={
  addEventListener:(kind,fn)=>listeners[kind]=fn,
  requestAnimationFrame:fn=>{pending=fn;return 7},
  cancelAnimationFrame:()=>{pending=null},
  matchMedia:()=>({matches:reduced})
 };
 const Clock=class extends Date{static now(){return now;}};
 vm.runInNewContext(code,{window,document,Date:Clock,Math,Number},{timeout:1100});
 return {api:window.JozefSportStage,events,paint,stageClass,ctx,now:n=>now=n,frame:()=>{
  const call=pending;pending=null;if(call)call(now);
 },pause:()=>{hidden=true;listeners['document:visibilitychange']?.()},pending:()=>Boolean(pending)};
}
test('graphical action canvas is optional, bundled offline, and has reduced-motion support',()=>{
 assert.equal(page,fs.readFileSync(path.join(root,'index.html'),'utf8'));
 assert.equal((page.match(/id="multi-action-canvas"/g)||[]).length,1);
 assert.ok(page.indexOf('src="sports-stage.js"')<page.indexOf('src="multisport.js"'));
 assert.ok(page.includes('href="sports-stage.css"'));
 for(const asset of ['sports-stage.js','sports-stage.css'])assert.ok(sw.includes("'./"+asset+"'"));
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.multi-stage\.has-canvas/);
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|new Audio|innerHTML\s*=/);
 const none=setup({canvas:false});
 assert.equal(none.api.create(),null,'noncanvas phones keep original CSS art and game controls');
});
test('hockey goalie moves and puck visibly flies to the selected goal corner',()=>{
 const a=setup();
 const stage=a.api.create();assert.ok(stage);
 assert.ok(a.stageClass.has('has-canvas'));
 stage.begin('hockey',{round:0});
 const before=a.paint.length;a.now(500);a.frame();
 assert.ok(a.paint.length>before,'game animates without input');
 stage.shoot({made:true,goalie:0,choice:2});
 a.now(1400);a.frame();
 assert.ok(a.paint.some(x=>x[0]==='fillText'&&String(x[1]).includes('GOAL')));
 assert.ok(a.paint.some(x=>x[0]==='arc'),'puck/goaltender rendered');
 stage.suspend();assert.equal(a.pending(),false);
});
test('baseball has pitched ball and batter, basketball has a shot arc, wrestling has moving stage figures',()=>{
 const a=setup();const stage=a.api.create();
 let now=0;
 for(const kind of ['baseball','basketball','wrestling']){
  a.now(now);stage.begin(kind,{rank:kind==='wrestling'?2:0});
  const prior=a.paint.length;a.now(now+500);a.frame();
  assert.ok(a.paint.length>prior,kind+' draws continuous action');
  stage.shoot({made:true});
  a.now(now+1400);a.frame();
  now+=2000;
 }
 const texts=a.paint.filter(x=>x[0]==='fillText').map(x=>String(x[1]));
 assert.ok(texts.some(x=>x.includes('BASE HIT')));
 assert.ok(texts.some(x=>x.includes('SWISH')));
 assert.ok(texts.some(x=>x.includes('CROWD GOES WILD')));
});
test('reduced motion draws stable scenes and never starts an animation loop',()=>{
 const a=setup({reduced:true});const stage=a.api.create();
 for(const kind of ['hockey','baseball','basketball','wrestling']){
  stage.begin(kind,{});stage.shoot({made:false});
 }
 assert.equal(a.pending(),false);
 assert.ok(a.paint.length>25,'one static frame per stage remains visible');
});

test('goalkeeper position is the actual visible lane used by hockey aim selection',()=>{
 const a=setup();
 const stage=a.api.create();
 a.now(0);stage.begin('hockey',{round:0});
 assert.equal(stage.getGoalie(),1,'goaltender begins in the centre');
 a.now(500);assert.equal(stage.getGoalie(),2,'right-side goalie movement is observable');
 a.now(2100);assert.equal(stage.getGoalie(),0,'goalie tracks back left');
 stage.begin('baseball');
 assert.equal(stage.getGoalie(),null);
 const b=setup({reduced:true});
 const still=b.api.create();still.begin('hockey');
 b.now(2100);
 assert.equal(still.getGoalie(),1,'reduced motion keeps a known central goalie');
});
