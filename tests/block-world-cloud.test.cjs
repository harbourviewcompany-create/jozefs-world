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
 assert.match(html,/block-world-cloud\.js\?v=20261029-chunked-v7/);
});

test('chosen player controls host and guest character regardless of join order',()=>{
 assert.match(coop,/const myIndex=\(\)=>localStorage\.getItem\(FAMILY_ROLE_KEY\)==='Jozef'\?1:0/);
 assert.match(coop,/const otherIndex=\(\)=>1-myIndex\(\)/);
 assert.match(coop,/g\.action\(otherIndex\(\),m\.kind/);
 assert.match(coop,/g\.role\(myIndex\(\)\)/);
});
test('large world relay is compressed, chunked, and reassembled completely',()=>{
 assert.match(cloud,/new CompressionStream\('gzip'\)/);
 assert.match(cloud,/new DecompressionStream\('gzip'\)/);
 assert.match(cloud,/event:'game-chunk'/);
 assert.match(cloud,/t\.parts\.filter\(part=>typeof part==='string'\)\.length===t\.total/);
});
test('building edits trigger cloud save and conflict checks remain active',()=>{
 assert.match(cloud,/previousBlockChanged/);
 assert.match(cloud,/setTimeout\(save,1800\)/);
 assert.match(cloud,/p_revision:revision/);
});
