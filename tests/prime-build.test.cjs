'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('Prime production compilation starts from TypeScript, never yesterday\'s bundle',()=>{
 const html=fs.readFileSync(path.join(root,'prime/source.html'),'utf8');
 assert.match(html,/<script type="module" src="\.\/src\/main\.ts"><\/script>/);
 assert.doesNotMatch(html,/\.\/assets\/index-/);
 const config=fs.readFileSync(path.join(root,'prime/vite.config.mjs'),'utf8');
 assert.ok(config.includes("source:'source.html'"),'Prime source is compiled');
 assert.ok(config.includes("neon:'neon-source.html'"),'Neon City source is compiled');
 const neon=fs.readFileSync(path.join(root,'prime/neon-source.html'),'utf8');
 assert.ok(neon.includes('src/neon.js'),'Neon City uses its source entry');
});
