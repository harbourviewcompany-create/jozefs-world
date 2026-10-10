const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const index=read('index.html'),world=read('world.html'),css=read('ui-refine-2026.css');
const sw=read('sw.js'),navigation=read('stadium.js');

test('new visual system is loaded once and LAST with identical canonical HTML',()=>{
 assert.equal(index,world);
 const links=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"\s*\/>/g)].map(x=>x[1]);
 assert.equal(links.at(-1),'ui-refine-2026.css');
 assert.equal(links.filter(x=>x==='ui-refine-2026.css').length,1);
 assert.ok(links.indexOf('arena-compact.css')<links.indexOf('ui-refine-2026.css'));
 assert.ok(links.indexOf('ui-refresh.css')<links.indexOf('ui-refine-2026.css'));
 assert.ok(sw.includes("'./ui-refine-2026.css'"));
 assert.match(sw,/jozef-fc-app-shell-v\d+/);
 const ids=[...index.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'no duplicate interactive controls');
});
test('existing advanced Arena settings, match report and all routes are retained',()=>{
 for(const id of ['arena-settings-toggle','arena-settings','arena-rematch',
 'arena-match-report','arena-control-mode','arena-handedness','arena-replay-banner',
 'jw-explore','multi-action-canvas','playbook','chronicle','sports-arcade']){
  assert.ok(index.includes('id="'+id+'"'),'preserve '+id);
 }
 const dock=[...index.matchAll(/data-dock-section="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(dock,['home','arena','sports-arcade','playbook','club']);
 assert.ok(navigation.includes("['watch'")||navigation.includes("'watch'"));
 assert.match(navigation,/studio-command-options/);
 assert.match(navigation,/el\('jw-explore'\)\?\.addEventListener\('click'/);
 assert.match(navigation,/navState\(\)/);
 assert.match(css,/\.navbar \.nav-links>\.nav-btn\[data-section="sports-arcade"\]/);
 assert.match(css,/\.navbar \.nav-links>\.nav-btn\[data-section="street"\]/);
});
test('single-row mobile header, clear active phone dock, Explore and full keyboard focus',()=>{
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto auto/);
 assert.match(css,/\.navbar \.nav-links\{display:none!important\}/);
 assert.match(css,/\.navbar \.jw-explore\{/);
 assert.match(css,/\.phone-dock button\.is-active/);
 assert.match(css,/\.phone-dock \.jw-dock-symbol/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media print/);
});
test('home puts playable hero and live progress before highlights, sports and long-form content',()=>{
 assert.ok(index.includes('class="ui-feature-duo"'));
 const features=index.slice(index.indexOf('class="ui-feature-duo"'),index.indexOf('class="ui-feature-duo"')+1700);
 assert.match(features,/class="playbook-home"/);
 assert.match(features,/class="chronicle-home"/);
 assert.match(index,/onclick="showSection\('sports-arcade'\)">PLAY ALL SPORTS/);
 assert.match(css,/#home>\.studio-hero\{order:0\}/);
 assert.match(css,/#home>\.today-card\{order:1\}/);
 assert.match(css,/#home>\.ui-feature-duo\{order:2\}/);
 assert.match(css,/#home>\.multi-home-section\{order:3\}/);
 assert.match(css,/\.ui-feature-duo\s*\{\s*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/#home>\.studio-hero\s*\{\s*display:grid;grid-template-columns:minmax\(0,1fr\) 104px/);
 assert.match(css,/#home>\.studio-hero \.hero-buttons\{\s*display:flex/);
 assert.match(css,/#home>\.studio-hero \.studio-hero-art\{\s*display:block/);
});
test('graphics remain static CSS, respecting safety and privacy',()=>{
 assert.doesNotMatch(css,/@import|url\(\s*https?:|expression\(|javascript:/i);
 assert.ok(!index.includes('src="who.js"'));
 assert.ok(index.includes("onclick=\"showSection('notes')\""),'club notes remain reachable');
 const cssAssets=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 const core=new Set([...sw.matchAll(/'\.\/([^']+)'/g)].map(x=>x[1]));
 for(const name of cssAssets)assert.ok(core.has(name),'offline cache missing '+name);
});
