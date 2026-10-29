'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const cloud=fs.readFileSync(path.join(root,'block-world-cloud.js'),'utf8');
const html=fs.readFileSync(path.join(root,'block-world.html'),'utf8');
test('cloud saves use approved membership and parent-owned writes',()=>{
 assert.match(cloud,/from\('family_members'\)/);
 assert.match(cloud,/if\(!familyId\|\|!parent\(\)\|\|!host\(\)\|\|!loaded\|\|!allowSave/);
 assert.match(cloud,/from\('family_block_worlds'\)/);
});
test('cloud restore cannot overwrite an existing save before approval',()=>{
 assert.match(cloud,/if\(!force&&!confirm\(/);
 assert.match(cloud,/allowSave=true/);
 assert.match(cloud,/\.eq\('revision',lastRevision\)/);
});
test('realtime snapshot fallback uses a private family channel',()=>{
 assert.match(cloud,/family-block-/);
 assert.match(cloud,/private:true/);
 assert.match(cloud,/event:'world-request'/);
 assert.match(cloud,/event:'world-snapshot'/);
});
test('block world loads cloud integration and exposes status',()=>{
 assert.match(html,/block-world-cloud\.js/);
 assert.match(html,/family-cloud-config\.js/);
 assert.match(html,/id="bw-cloud-status"/);
});
