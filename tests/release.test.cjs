const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const rootPage=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('cinematic game is present exactly once and every navigation target is unique',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate IDs cause game event collisions');
 for(const id of ['street','street-start','street-canvas','street-score','street-time',
 'street-left','street-right','studio-career-points','studio-street-best']){
   assert.ok(ids.includes(id),'missing component: '+id);
 }
 assert.equal((html.match(/data-section="street"/g)||[]).length,1);
 assert.equal((html.match(/<script src="street\.js"><\/script>/g)||[]).length,1);
 assert.equal(rootPage,html,'published homepage and preserved source must match');
});
test('offline-first PWA caches all same-origin assets used by the page',()=>{
 const coreBlock=sw.match(/const CORE=\[([\s\S]*?)\];/)?.[1];
 assert.ok(coreBlock,'offline asset manifest must be defined');
 const core=[...coreBlock.matchAll(/'\.\/([^']+)'/g)].map(m=>m[1]);
 const assets=[...html.matchAll(/(?:href|src)="([^"]+\.(?:js|css|svg|webmanifest))"/g)]
 .map(m=>m[1]).filter(x=>!x.startsWith('https:'));
 for(const asset of assets){
   assert.ok(core.includes(asset),'missing offline asset '+asset);
   assert.ok(fs.existsSync(path.join(root,asset)),'asset referenced but missing '+asset);
 }
 for(const file of core){
   assert.ok(fs.existsSync(path.join(root,file)),'PWA pre-cache file missing '+file);
 }
 assert.match(sw,/const CACHE='jozef-fc-app-shell-v\d+'/);
 assert.match(sw,/fetch\(request\)/,'network first means fresh code while online');
});
test('street game uses local-only saved records and has genuine pause and keyboard play',()=>{
 const js=fs.readFileSync(path.join(root,'street.js'),'utf8');
 assert.match(js,/const bestKey='jozefs-world-street-best-v1'/);
 assert.match(js,/requestAnimationFrame/);
 assert.match(js,/cancelAnimationFrame/);
 assert.match(js,/street-left/);
 assert.match(js,/street-right/);
 assert.match(js,/keydown/);
 assert.match(js,/visibilitychange/);
 assert.match(js,/JozefWorld\?\.record(?:\?\.)?\('street'/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|WebSocket/);
});

test('every permanent navigation destination is accepted by the stadium router',()=>{
 const stadium=fs.readFileSync(path.join(root,'stadium.js'),'utf8');
 const list=stadium.match(/const ids=\[([^\]]+)\]/)?.[1]||'';
 const allowed=new Set([...list.matchAll(/'([^']+)'/g)].map(m=>m[1]));
 const menu=[...html.matchAll(/class="nav-btn[^"]*" data-section="([^"]+)"/g)].map(m=>m[1]);
 for(const id of menu)assert.ok(allowed.has(id),'stadium route blocks navigation to '+id);
 assert.ok(allowed.has('arena'));
 assert.ok(allowed.has('training'));
 assert.ok(allowed.has('roblox'));
});
test('external Roblox leaves the site only after guardian confirmation',()=>{
 const script=fs.readFileSync(path.join(root,'roblox.js'),'utf8');
 assert.match(script,/window\.confirm\(/);
 assert.match(script,/window\.open\(web, '_blank', 'noopener'\)/);
 assert.doesNotMatch(script,/fetch\('https:\/\/thumbnails\.roblox\.com/,'no passive child-data requests');
});
