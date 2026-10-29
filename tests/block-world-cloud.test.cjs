const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const cloud=fs.readFileSync(path.join(root,'block-world-cloud.js'),'utf8');
const coop=fs.readFileSync(path.join(root,'block-world-coop.js'),'utf8');
const html=fs.readFileSync(path.join(root,'block-world.html'),'utf8');
test('open shared world requires no account or email login',()=>{
 assert.match(cloud,/block_world_open/);
 assert.doesNotMatch(cloud,/signInWithOtp|family_members|auth\.getUser/);
 assert.match(html,/data-player="Daddy"/);
 assert.match(html,/data-player="Jozef"/);
});
test('first player claims session and second auto-joins',()=>{
 assert.match(cloud,/block_world_open_claim/);
 assert.match(cloud,/automaticHost\?\.\(\)/);
 assert.match(cloud,/automaticJoin\?\.\(\)/);
 assert.match(coop,/function automaticHost\(\)/);
 assert.match(coop,/function automaticJoin\(\)/);
});
test('world saves with revision and broadcasts live actions',()=>{
 assert.match(cloud,/block_world_open_save/);
 assert.match(cloud,/p_revision:revision/);
 assert.match(cloud,/event:'game-action'/);
 assert.match(cloud,/relayMessage\?\.\(payload\.message\)/);
 assert.match(html,/block-world-cloud\.js\?v=20261029-open-world-v6/);
});
