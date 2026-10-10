const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'ui-refresh.css'),'utf8');
const js=fs.readFileSync(path.join(root,'stadium.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

test('both entry points show one consistent compact header and a complete accessible Explore control',()=>{
 assert.equal(html,index);
 assert.equal((html.match(/id="jw-explore"/g)||[]).length,1);
 assert.match(html,/<button class="jw-explore"[^>]*aria-haspopup="dialog"[^>]*aria-controls="studio-command"/);
 assert.equal((html.match(/href="ui-refresh.css"/g)||[]).length,1);
 const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(styles.at(-1),'ui-refresh.css');
 assert.ok(styles.indexOf('arena-compact.css')<styles.indexOf('ui-refresh.css'));
 assert.ok(styles.indexOf('mobile-qa-2026.css')<styles.indexOf('ui-refresh.css'));
 assert.ok(sw.includes("'./ui-refresh.css'"));
 assert.match(css,/--jw-ui-lime:#c8ff5a/);
 assert.match(css, /\.jw-explore:focus-visible/);
});
test('the five primary phone destinations are usable while every old page remains reachable',()=>{
 const dock=html.match(/<nav class="phone-dock"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(dock);
 const ids=[...dock.matchAll(/data-dock-section="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(ids,['home','arena','sports-arcade','playbook','club']);
 assert.equal((dock.match(/<button\b/g)||[]).length,5);
 for(const route of ['home','arena','street','games','club','playbook','tour','career',
  'news','sports-arcade','sports','watch','learn','training','matchday','notes','album','chronicle','fun']){
  assert.ok(html.includes('data-section="'+route+'"'),'preserve nav '+route);
  assert.ok(js.includes("['"+route+"'")||js.includes("['"+route+"',"),'Explore menu must include '+route);
 }
 assert.match(js,/document\.querySelectorAll\('\[data-dock-section\]'\)/);
 assert.match(js,/classList\.toggle\('is-active',active\)/);
 assert.match(js,/el\('jw-explore'\)\?\.addEventListener\('click'/);
 assert.match(css, /\.navbar \.nav-links \.nav-btn\[data-section="sports-arcade"\]/);
 assert.match(css, /\.navbar \.nav-links \.nav-btn\[data-section="playbook"\]/);
});
test('phone home keeps a prominent match CTA and four clear sports, with no horizontal scrolling',()=>{
 for(const sport of ['hockey','baseball','basketball','wrestling'])
  assert.ok(html.includes('data-multi-start="'+sport+'"'));
 assert.match(css,/#home \.multi-home-card::before/);
 assert.match(css,/#home \.studio-hero \.hero-buttons \.studio-button-primary/);
 assert.match(css,/#home \.studio-hero \.studio-hero-art/);
 assert.match(css, /@media\(max-width:700px\)/);
 assert.match(css, /@media\(max-width:390px\)/);
 assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/@import|url\(\s*https?:/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
});
test('offline app shell contains every same-origin CSS and script from the page',()=>{
 const assetNames=[...html.matchAll(/(?:href|src)="([^"]+\.(?:js|css|svg|webmanifest))"/g)]
  .map(x=>x[1]).filter(x=>!x.startsWith('https:'));
 const body=sw.slice(sw.indexOf('const CORE=['),sw.indexOf('];',sw.indexOf('const CORE=[')));
 const cached=[...body.matchAll(/'\.\/([^']*)'/g)].map(x=>x[1]);
 assert.equal(cached.length,new Set(cached).size);
 assert.deepEqual(assetNames.filter(x=>!cached.includes(x)),[]);
 assert.match(sw,/const CACHE='jozef-fc-app-shell-v\d+'/);
});
