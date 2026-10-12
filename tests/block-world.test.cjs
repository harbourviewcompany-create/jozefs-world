'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'block-world.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
function boot(shared){
 const storage=shared||new Map(),nodes=new Map();
 function element(id){
  if(!nodes.has(id))nodes.set(id,{textContent:'',clientWidth:390,clientHeight:490,addEventListener(){},
    getContext(){return {}},setPointerCapture(){}});
  return nodes.get(id);
 }
 const document={getElementById:element,querySelectorAll(){return []},addEventListener(){},hidden:false};
 const window={addEventListener(){}};
 const localStorage={getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,String(v))}};
 const context={document,window,localStorage,matchMedia(){return {matches:true}},requestAnimationFrame(){return 1},
  cancelAnimationFrame(){},confirm(){return false},devicePixelRatio:1,setTimeout(){return 1},clearTimeout(){}};
 vm.runInNewContext(source,context,{timeout:1000});
 const api=window.JozefBlock;
 assert.ok(api,'playable game needs a real gameplay API');
 return {api,storage,nodes};
}
function travel(api,to){
 const route=api.path(to);
 assert.ok(route,'every chosen mission must be reachable: '+to);
 for(const [x,y] of route){
  const before=api.progress(),pos=before.pos[before.active];
  assert.equal(api.move(x-pos[0],y-pos[1]),true,'only legal adjacent moves count');
 }
}
test('Block World is a complete offline game with safe mobile controls, not a placeholder',()=>{
 assert.ok(html.length>12000);
 assert.match(html,/id="world"/);assert.match(html,/id="guide"/);assert.match(html,/id="swap"/);
 assert.match(html,/touch-action:none/);assert.match(html,/min-height:44px/);
 assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/'\.\/block-world\.html'/);
 assert.match(fs.readFileSync(path.join(root,'clubhouse.js'),'utf8'),/'jozefs-world-block-v1'/);
 new vm.Script(source);
});
test('Jozef and Dad build a bridge, gather all three stars and win together',()=>{
 const {api,storage}=boot();
 assert.equal(api.progress().wood.length,0);
 travel(api,[2,2]);travel(api,[3,7]);
 assert.equal(api.progress().wood.length,2);
 travel(api,[4,5]);api.build();assert.equal(api.progress().bridge,true);
 travel(api,[3,3]);travel(api,[7,2]);travel(api,[8,7]);travel(api,[8,5]);
 assert.equal(api.progress().stars.length,3);
 api.swap();travel(api,[7,5]);api.build();
 assert.equal(api.progress().won,true);
 assert.equal(JSON.parse(storage.get('jozefs-world-player-v1')).xp,60);
 assert.equal(boot(storage).api.progress().won,true,'earned progress survives reload');
});
test('Block World rejects corrupt saves, impassable water and early cup claims',()=>{
 const bad=new Map([['jozefs-world-block-v1',JSON.stringify({pos:[[30,50],[30,50]],won:true,bridge:true,stars:[0,8],wood:[-1]})]]);
 const {api}=boot(bad);
 assert.equal(api.progress().won,false);
 assert.equal(api.move(1,0),true);
 assert.equal(api.path([7,5]),null,'river cannot be crossed without a bridge');
 api.build();assert.equal(api.progress().bridge,false);
});
