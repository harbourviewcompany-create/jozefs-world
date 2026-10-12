'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const prior=fs.existsSync(path.join(root,'index.html'))?fs.readFileSync(path.join(root,'index.html'),'utf8'):'';
fs.renameSync(path.join(dist,'source.html'),path.join(dist,'index.html'));
// Both Pages publishing paths use the same compiled files. Source remains separate.
fs.copyFileSync(path.join(dist,'index.html'),path.join(root,'index.html'));
fs.mkdirSync(path.join(root,'assets'),{recursive:true});
for(const name of fs.readdirSync(path.join(dist,'assets'))){
 fs.copyFileSync(path.join(dist,'assets',name),path.join(root,'assets',name));
}
// Keep one prior generation for clients already using its cached HTML.
const html=prior+fs.readFileSync(path.join(dist,'index.html'),'utf8');
const keep=new Set([...html.matchAll(/\.\/assets\/([^"']+)/g)].map(x=>x[1]));
for(const name of fs.readdirSync(path.join(root,'assets'))){
 if(/^source-[\w-]+\.(js|css)$/.test(name)&&!keep.has(name))fs.unlinkSync(path.join(root,'assets',name));
}
