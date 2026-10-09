const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../clubhouse.js'),'utf8');

function load(options={}){
  const nodes=new Map(), storage=new Map(), events={};
  let confirmed=options.confirmed??true,reloads=0;
  class Node{
    constructor(){this.children=[];this.events={};this.textContent='';this.className='';this.files=[];this.value='';}
    setAttribute(){}
    append(...items){this.children.push(...items)}
    appendChild(item){this.children.push(item);return item}
    replaceChildren(...items){this.children=items}
    addEventListener(type,callback){this.events[type]=callback}
    click(){this.events.click?.()}
  }
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)},
    querySelector(){return null},
    createElement(){return new Node()}
  };
  const window={
    JozefWorld:{getProgress:()=>options.profile||{xp:0,goals:0,level:1,badges:[]}},
    JozefCareer:{getProgress:()=>options.career||{played:0,cups:0}},
    JozefTour:{getProgress:()=>options.tour||{wins:0,cups:0}},
    addEventListener(type,callback){events[type]=callback},
    confirm(){return confirmed},
    location:{reload(){reloads++}}
  };
  const localStorage={
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem(key,value){storage.set(key,String(value))},
    removeItem(key){storage.delete(key)}
  };
  vm.runInNewContext(src,{document,window,localStorage}, {timeout:1500});
  return {
    node:id=>document.getElementById(id),storage,events,
    async import(data){
      const input=document.getElementById('clubhouse-import');
      const txt=typeof data==='string'?data:JSON.stringify(data);
      input.files=[{size:txt.length,text:async()=>txt}];
      await input.events.change({target:input});
    },
    get reloads(){return reloads}
  };
}
const valid={format:'jozefs-world-local-backup',version:1,data:{
  'jozefs-world-player-v1':{xp:140,goals:7},
  'jozefs-world-tour-v1':{season:1,round:2,match:null},
  'jozefs-world-career-v1':{season:2,results:[],match:null,cups:1},
  'jozefKeepyBest':'10'
}};
test('collection cards unlock through existing progress',()=>{
  const app=load({profile:{xp:450,goals:12,level:5,badges:['training-star']},career:{played:2,cups:0},tour:{wins:1,cups:0}});
  assert.equal(app.node('clubhouse-cards').children.length,7);
  assert.equal(app.node('clubhouse-card-count').textContent,'6 / 7');
});
test('parent-confirmed backup restores XP, tour, career and high score',async()=>{
  const app=load();
  await app.import(valid);
  assert.equal(app.reloads,1);
  assert.equal(JSON.parse(app.storage.get('jozefs-world-player-v1')).xp,140);
  assert.equal(JSON.parse(app.storage.get('jozefs-world-career-v1')).cups,1);
  assert.equal(app.storage.get('jozefKeepyBest'),'10');
});
test('cancelled restore leaves existing progress unchanged',async()=>{
  const app=load({confirmed:false});
  app.storage.set('jozefs-world-player-v1','{"xp":999}');
  await app.import(valid);
  assert.equal(app.storage.get('jozefs-world-player-v1'),'{"xp":999}');
  assert.equal(app.reloads,0);
});
test('rejects malformed, untrusted and oversized backup data',async()=>{
  const app=load();
  const malicious=JSON.parse(JSON.stringify(valid));
  malicious.data['jozefs-world-player-v1'].xp=Infinity;
  await app.import(JSON.stringify(malicious));
  assert.equal(app.reloads,0);
  assert.equal(app.storage.size,0);
  await app.import('{"version":1,"format":"anything"}');
  assert.equal(app.storage.size,0);
  const input=app.node('clubhouse-import');
  input.files=[{size:251000,text:async()=>JSON.stringify(valid)}];
  await input.events.change({target:input});
  assert.equal(app.storage.size,0);
});
