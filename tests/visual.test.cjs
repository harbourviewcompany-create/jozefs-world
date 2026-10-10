const bundled=require('./bundle-contract.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'visual-2026.css'),'utf8');
const script=fs.readFileSync(path.join(root,'visual-2026.js'),'utf8');
test('2026 visual foundation is loaded once and both pages stay canonical',()=>{
 assert.equal(html,index);
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 bundled.css(root,html,sw,'visual-2026.css');
 bundled.order(root,html,sw,'notes.css','visual-2026.css');
 assert.equal((html.match(/src="visual-2026.js"/g)||[]).length,1);
 for(const id of ['visual-rival-heading','visual-rival-name','visual-rival-play','visual-rival-story','visual-rival-meter','visual-rival-chapter']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must be unique');
 }
});
test('night design has explicit tokens, responsive layouts and reduced motion',()=>{
 for(const token of ['--j26-carbon','--j26-lime','--j26-cyan','--j26-gold','--j26-ui-ease','--j26-stroke']){
  assert.ok(css.includes(token),'missing design token '+token);
 }
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.ok(css.includes('.studio-mode')&&css.includes('.arena-scoreboard')&&css.includes('.clubhouse-player-card'));
 assert.doesNotMatch(css,/@import|url\(\s*https?:/,'do not bring a third-party visual dependency');
});
test('rival spotlight displays the actual saved arena wins, no online access',()=>{
 const nodes=new Map(),listeners={},called=[];
 const node=id=>{
   if(!nodes.has(id))nodes.set(id,{
     textContent:'',style:{},attributes:{},listeners:{},
     addEventListener(event,callback){this.listeners[event]=callback},
     setAttribute(k,v){this.attributes[k]=v},parentElement:{setAttribute(){}}
   });
   return nodes.get(id);
 };
 const document={getElementById:node,addEventListener(type,callback){listeners[type]=callback},hidden:false};
 let wins=0;
 const window={
   JozefArena:{getProgress(){return {wins}}},
   showSection(id){called.push(id)},
   addEventListener(type,callback){listeners[type]=callback}
 };
 vm.runInNewContext(script,{window,document,Math,Number,String},{timeout:1000});
 assert.equal(node('visual-rival-name').textContent,'THE ROOFTOP ROVERS');
 assert.equal(node('visual-rival-meter').style.width,'0%');
 wins=3;listeners['jozef:profile-updated']();
 assert.equal(node('visual-rival-name').textContent,'MIDNIGHT CITY FC');
 assert.equal(node('visual-rival-meter').style.width,'33%');
 wins=5;listeners['jozef:progress']();
 assert.equal(node('visual-rival-name').textContent,'THE NEON ROYALS');
 assert.equal(node('visual-rival-meter').style.width,'100%');
 node('visual-rival-play').listeners.click();
 assert.deepEqual(called,['arena']);
 assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
});
