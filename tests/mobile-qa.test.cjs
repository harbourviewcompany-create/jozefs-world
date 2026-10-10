const bundled=require('./bundle-contract.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'mobile-qa-2026.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

test('iPhone repair overrides all existing themes last, with identical Pages HTML',()=>{
 assert.equal(html,index);
 bundled.css(root,html,sw,'mobile-qa-2026.css');
 bundled.order(root,html,sw,'arena-visual.css','mobile-qa-2026.css');
 bundled.order(root,html,sw,'campaign-2026.css','mobile-qa-2026.css');
 bundled.order(root,html,sw,'mobile-qa-2026.css','club-hq.css');
 bundled.order(root,html,sw,'club-hq.css','chronicle.css');
 assert.match(sw,/const CACHE='jozef-fc-app-shell-v\d+'/);
});
test('the Club is dark with readable customization, stats and unlocks',()=>{
 for(const selector of [
  '#club .jw-club-options > .jw-card',
  '#club .jw-progress-card','#club .jw-collectibles',
  '#club .jw-number-label',
  '#club .jw-progress-card > strong','#club .jw-badge',
  '#club .jw-club-heading .section-title','#club .jw-sound']){
  assert.ok(css.includes(selector),'missing readable Club component: '+selector);
 }
 assert.match(css,/#club \.jw-progress-card > strong\s*\{[\s\S]*?color:#c8ff5a/);
 assert.match(css,/#club \.jw-number-label\s*\{color:#effbe9/);
 assert.match(css,/#club \.jw-club-options > \.jw-card,[\s\S]*?background:linear-gradient\(150deg,#152f38,#0c1f29/);
});
test('formation player names cannot be compressed into one-letter columns',()=>{
 assert.match(css,/#club \.squad-field-player\s*\{[\s\S]*?display:grid/);
 assert.match(css,/grid-template-columns:34px minmax\(0,1fr\)/);
 assert.match(css,/#club \.squad-field-player strong\s*\{[\s\S]*?grid-column:2/);
 assert.match(css,/#club \.squad-field-player strong\s*\{[\s\S]*?word-break:normal;overflow-wrap:normal;hyphens:none/);
 assert.match(css,/#club \.squad-field-player small\s*\{[\s\S]*?grid-row:2/);
 assert.match(css,/#club \.squad-field-mid\s*\{left:31%/);
 assert.match(css,/#club \.squad-field-back\s*\{left:69%/);
});
test('home progress tile, compact mobile navigation and small viewport layout stay legible',()=>{
 assert.match(css,/#home \.studio-signal-row \.studio-signal-accent strong\s*\{color:#d7ff94/);
 assert.match(css,/@media\(max-width:700px\)\s*\{/);
 assert.match(css,/@media\(max-width:380px\)\s*\{/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.navbar \.nav-links\s*\{[\s\S]*?overflow-x:auto/);
 assert.match(css,/#home \.studio-hero-art\s*\{min-height:238px/);
 assert.match(css,/#club \.squad-pitch-field\s*\{min-height:390px/);
 assert.doesNotMatch(css,/@import|url\(\s*https?:|display:none!important/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['arena-canvas','squad-grid','squad-field-striker','squad-field-mid','squad-field-back','squad-field-keeper','jw-number','jw-sound','note-text','note-list']){
  assert.ok(ids.includes(id),'must preserve playable/profile element '+id);
 }
});
