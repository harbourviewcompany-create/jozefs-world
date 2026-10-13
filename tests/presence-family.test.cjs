'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const src=readFileSync(path.join(__dirname,'..','presence.js'),'utf8');
class Channel{
 constructor(peer){this.peer=peer;this.events={};this.open=false;this.pair=null;}
 on(event,fn){this.events[event]=fn;}
 emit(event,arg){this.events[event]?.(arg);}
 close(){if(this.closed)return;this.closed=true;this.open=false;this.emit('close');if(this.pair&&!this.pair.closed)this.pair.close();}
}
const peers=new Map();
class Peer{
 constructor(id){this.id=id;this.events={};peers.set(id,this);queueMicrotask(()=>this.emit('open'));}
 on(event,fn){this.events[event]=fn;}
 emit(event,arg){this.events[event]?.(arg);}
 connect(id){
  const target=peers.get(id);
  const caller=new Channel(id),receiver=new Channel(this.id);
  caller.pair=receiver;receiver.pair=caller;
  queueMicrotask(()=>{
   if(!target||target.destroyed){caller.emit('error',new Error('peer unavailable'));caller.close();return;}
   target.emit('connection',receiver);
   if(caller.closed||receiver.closed)return;
   caller.open=receiver.open=true;caller.emit('open');receiver.emit('open');
  });
  return caller;
 }
 destroy(){this.destroyed=true;peers.delete(this.id);}
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function device(){
 const nodes=new Map(),storage=new Map(),listeners={},classState=new Map();
 const create=id=>({
  id,hidden:id==='family-pair-panel',value:'',textContent:'',dataset:{},
  attrs:{},handlers:{},classList:{
   add(k){classState.set(id+':'+k,true);},remove(k){classState.set(id+':'+k,false);},
   toggle(k,v){classState.set(id+':'+k,!!v);}
  },
  setAttribute(k,v){this.attrs[k]=v},
  addEventListener(k,fn){this.handlers[k]=fn},
  click(){this.handlers.click?.();}
 });
 const get=id=>{if(!nodes.has(id))nodes.set(id,create(id));return nodes.get(id);};
 const store={getItem:k=>storage.get(k)??null,setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k)}};
 const buttons=['Dad','Jozef'].map(who=>{const b=create('role-'+who);b.dataset.liveWho=who;return b;});
 const document={getElementById:get,querySelectorAll(sel){return sel==='[data-live-who]'?buttons:[]}};
 const window={
   document,Peer,TextEncoder,
   crypto:{
     subtle:{digest:async(_alg,bytes)=>{
       const d=crypto.createHash('sha256').update(Buffer.from(bytes)).digest();
       return d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength);
     }},
     getRandomValues:buf=>{buf.forEach((_,i)=>buf[i]=i+11);return buf;}
   },
   addEventListener(name,fn){listeners[name]=fn;}
 };
 const context={window,document,localStorage:store,navigator:{vibrate(){}},TextEncoder,
   setInterval:()=>1,clearInterval:()=>{},SpeechSynthesisUtterance:class{}};
 vm.runInNewContext(src,context,{filename:'presence.js',timeout:3000});
 return {get,store,buttons,has:(id,k)=>classState.get(id+':'+k)===true,window,listeners};
}
test('HQ family presence: not globally discoverable or online before private opt-in',async()=>{
 peers.clear();
 assert.doesNotMatch(src,/['"]jw-live-['"]\s*\+/);
 const dad=device();await flush();
 assert.equal(peers.size,0,'no globally named online presence before pairing');
 assert.match(dad.get('live-status').textContent,/Pair your family phones/);
 dad.get('family-pair-open').click();
 assert.equal(dad.get('family-pair-panel').hidden,false);
 dad.get('family-pair-create').click();await flush();
 assert.equal(dad.store.getItem('jozefs-world-who'),'Dad');
 const code=dad.store.getItem('jozefs-world-family-pair-v1');
 assert.match(code,/^[a-f0-9]{32}$/);
 assert.equal(dad.get('family-pair-code').value,code.toUpperCase());
 assert.equal([...peers.keys()].length,1);
 assert.ok([...peers.keys()][0].endsWith('-dad'));
 assert.ok(![...peers.keys()][0].includes(code),'Peer IDs contain no raw invite codes');
 const stranger=device();await flush();
 stranger.get('family-pair-code').value='AAAA';stranger.get('family-pair-join').click();await flush();
 assert.equal(stranger.store.getItem('jozefs-world-family-pair-v1'),null,'bad codes never pair');
 assert.equal(peers.size,1);
 const jo=device();await flush();
 jo.get('family-pair-code').value=code.toUpperCase();jo.get('family-pair-join').click();await flush();
 assert.equal(jo.store.getItem('jozefs-world-who'),'Jozef');
 assert.equal(dad.has('dot-jozef','on'),true,'Dad sees Jozef online');
 assert.equal(jo.has('dot-dad','on'),true,'Jozef sees Dad online');
 assert.match(dad.get('live-status').textContent,/Jozef is here/);
 jo.get('family-pair-forget').click();await flush();
 assert.equal(jo.store.getItem('jozefs-world-family-pair-v1'),null);
 assert.equal(jo.has('dot-dad','on'),false);
 assert.equal(dad.has('dot-jozef','on'),false,'unpairing clears other phone presence');
 dad.listeners.pagehide?.();await flush();
 assert.equal(peers.size,0,'page exit frees private ID');
});
test('HQ entrypoint and CSS maintain private pairing controls',()=>{
 const html=readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.equal(html,readFileSync(path.join(__dirname,'..','world.html'),'utf8'));
 for(const id of ['family-pair-open','family-pair-panel','family-pair-code','family-pair-create','family-pair-copy','family-pair-join','family-pair-forget'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.equal((html.match(/id="family-pair-panel"/g)||[]).length,1);
 const css=readFileSync(path.join(__dirname,'..','site-experience.css'),'utf8');
 assert.match(css,/#family-pair-panel/);
 assert.match(css,/family-pair-actions/);
});
