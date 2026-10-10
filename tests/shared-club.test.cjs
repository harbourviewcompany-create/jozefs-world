const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(root,'notes.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

function browser(existing=[]){
 const nodes=new Map();
 const storage=new Map([
  ['jozefs-world-notes-v1',JSON.stringify(existing)],
  ['jozefs-world-notes-seen-v1',JSON.stringify({Dad:0,Jozef:0})]
 ]);
 class Node{
  constructor(){this.textContent='';this.value='';this.children=[];this.events={};this.attrs={};this.hidden=false;this.className='';this.type='';}
  replaceChildren(...items){this.children=items;}
  append(...items){this.children.push(...items);}
  appendChild(item){this.children.push(item);return item;}
  addEventListener(type,fn){this.events[type]=fn;}
  setAttribute(key,value){this.attrs[key]=value;}
  click(){this.events.click?.();}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 const noteNav=new Node();
 const document={
  readyState:'complete',
  getElementById:get,
  createElement:()=>new Node(),
  querySelector:query=>query==='[data-section="notes"]'?noteNav:null
 };
 const localStorage={
  getItem:key=>storage.get(key)||null,
  setItem(key,value){storage.set(key,String(value))}
 };
 const window={};
 vm.runInNewContext(src,{document,localStorage,window,setInterval:()=>null,Date,JSON,Number,String},{timeout:1400});
 return {get,noteNav,storage};
}

test('both people enter one shared site with no role gate, toggle or locked backup',()=>{
 assert.equal(html,index);
 assert.doesNotMatch(html,/id="who-gate"|id="who-switch"|id="who-input"|id="who-input-phone"|src="who\.js"|href="who\.css"/);
 assert.doesNotMatch(html,/data-parent|Dad mode|Dad gets the backup/);
 assert.equal((html.match(/id="clubhouse-export"/g)||[]).length,1);
 assert.equal((html.match(/id="clubhouse-import-button"/g)||[]).length,1);
 const dock=html.match(/<nav class="phone-dock"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(dock,'phone dock must exist');
 assert.equal((dock.match(/<button\b/g)||[]).length,5);
 assert.match(dock,/showSection\('notes'\)/);
 assert.match(html,/href="notes\.css"/);
 assert.match(sw,/'\.\/notes\.css'/);
 assert.doesNotMatch(sw,/who\.css|who\.js/);
 assert.ok(!fs.existsSync(path.join(root,'who.js')));
 assert.ok(!fs.existsSync(path.join(root,'who.css')));
 const css=fs.readFileSync(path.join(root,'notes.css'),'utf8');
 assert.doesNotMatch(css,/body\.who-(?:dad|jozef)/);
 assert.match(css,/\.notes-card/);
});

test('old notes remain readable and every stored note can be deleted from the shared board',()=>{
 const app=browser([
  {id:'old-dad',from:'Dad',text:'Nice match!',at:10},
  {id:'old-jozef',from:'Jozef',text:'Thanks!',at:9}
 ]);
 const rows=app.get('note-list').children;
 assert.equal(rows.length,2);
 assert.equal(rows[0].children[0].textContent,'Dad');
 assert.equal(rows[1].children[0].textContent,'Jozef');
 assert.equal(rows[0].children[2].textContent,'Delete note');
 assert.equal(rows[1].children[2].textContent,'Delete note');
 rows[0].children[2].click();
 const saved=JSON.parse(app.storage.get('jozefs-world-notes-v1'));
 assert.deepEqual(saved.map(x=>x.id),['old-jozef']);
});

test('new club notes have no persona author and use shared read status',()=>{
 const app=browser();
 const form=app.get('note-form');
 app.get('note-text').value='Training at five!';
 form.events.submit({preventDefault(){}});
 const notes=JSON.parse(app.storage.get('jozefs-world-notes-v1'));
 assert.equal(notes.length,1);
 assert.equal(notes[0].from,'Club');
 assert.equal(app.get('note-list').children[0].children[0].textContent,'Jozef FC');
 assert.equal(app.get('note-text').value,'');
 const seen=JSON.parse(app.storage.get('jozefs-world-notes-seen-v1'));
 assert.ok(seen.Shared>0);
 assert.equal(app.get('note-dot').hidden,true);
 assert.doesNotMatch(src,/function who\(|function other\(|who-dad|who-jozef|from: who\(\)/);
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|WebSocket/);
});
