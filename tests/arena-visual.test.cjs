const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'arena-renderer.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const css=fs.readFileSync(path.join(root,'arena-visual.css'),'utf8');
function context(){
 const events=[],window={};
 const draw=new Proxy({},{
  get(obj,key){
    if(key==='createLinearGradient'||key==='createRadialGradient')return()=>({addColorStop(offset,color){events.push(['stop',offset,color])}});
    if(key==='arc')return(...args)=>{events.push(['arc',...args])};
    if(key==='fillText')return(...args)=>{events.push(['text',...args])};
    if(key==='roundRect')return(...args)=>{events.push(['rounded',...args])};
    if(key==='ellipse')return(...args)=>{events.push(['ellipse',...args])};
    return obj[key]||(()=>{});
  },set(obj,key,v){obj[key]=v;return true}
 });
 vm.runInNewContext(src,{window,Math},{timeout:1200});
 return {window,draw,events};
}
function snapshot(){
 return {
  venue:'NEIGHBOURHOOD COURT',stadium:0,actor:{x:210,y:490},
  mate:{x:293,y:313},ball:{x:210,y:475,owner:'actor',vx:0,vy:0},
  defenders:[{x:144,y:260},{x:279,y:205},{x:204,y:143}],
  keeper:{x:210,y:48},squad:{lineup:{striker:'rookie',keeper:'captain',mid:'scholar'}},
  identity:{kit:'#c8ff5a',number:11},shotZones:[{x:171},{x:210},{x:249}],
  aim:0,phase:20,skillTime:0,flash:0,time:55,us:1,them:0,mode:'playing',reducedMotion:false
 };
}
test('new football presentation renderer draws player figures, net, turf and goal HUD',()=>{
 const {window,draw,events}=context();
 assert.equal(typeof window.JozefArenaGraphics.render,'function');
 window.JozefArenaGraphics.render(draw,snapshot());
 assert.ok(events.filter(x=>x[0]==='arc').length>=30,'player heads, rings and ball should be illustrated');
 assert.ok(events.filter(x=>x[0]==='rounded').length>=40,'pitch features and shirts should be drawn');
 assert.ok(events.some(x=>x[0]==='text'&&String(x[1]).includes('JOZEF FC')),'stadium text');
 assert.ok(events.some(x=>x[0]==='text'&&x[1]==='11'),'selected jersey number must be visible');
 assert.ok(events.some(x=>x[0]==='text'&&x[1]==='10'),'earned keeper jersey number must be visible');
});
test('stadium graphics render all venues, a shot and a reduced-motion match',()=>{
 const {window,draw,events}=context();
 for(const stadium of [0,1,2]){
  const s=snapshot();s.stadium=stadium;s.ball={x:190,y:220,owner:'shot',vx:42,vy:-500};
  s.flash=.3;s.skillTime=.5;s.phase=23;
  s.reducedMotion=stadium===2;
  assert.doesNotThrow(()=>window.JozefArenaGraphics.render(draw,s));
 }
 assert.ok(events.some(x=>x[0]==='text'&&x[1]==='GOOOAL!'));
});
test('new graphic resources load in production order without remote assets',()=>{
 assert.equal((html.match(/src="arena-renderer.js"/g)||[]).length,1);
 assert.equal((html.match(/href="arena-visual.css"/g)||[]).length,1);
 assert.ok(html.indexOf('src="arena-renderer.js"')<html.indexOf('src="arena.js"'));
 assert.match(src,/window\.JozefArenaGraphics=Object\.freeze/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const asset of ['arena-renderer.js','arena-visual.css'])assert.ok(sw.includes("'./"+asset+"'"));
});
test('formation board tracks selected positions with no new storage schema',()=>{
 const squad=fs.readFileSync(path.join(root,'squad.js'),'utf8');
 for(const slot of ['keeper','back','mid','striker']){
  assert.equal((html.match(new RegExp('id="squad-field-'+slot+'"','g'))||[]).length,1);
 }
 assert.match(squad,/const positionLabel=\$\('squad-field-'\+slot\)/);
 assert.match(squad,/positionLabel\.textContent=active\?active\.name\.toUpperCase\(\):'ACADEMY PLAYER'/);
 assert.match(css,/\.squad-pitch-field/);
 assert.match(css,/\.squad-field-player/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.doesNotMatch(squad,/\bfetch\s*\(/);
});
