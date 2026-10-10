'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const groups=[["site-foundation.css",["styles.css","pitch.css","extras.css","tournament.css","career.css","clubhouse.css","scramble-positions.css","stadium.css","arcade.css","arena.css","playmode.css","notes.css","visual-2026.css","arena-visual.css","campaign-2026.css"]],["site-experience.css",["training.css","jersey-bingo.css","matchday.css","mobile-qa-2026.css","broadcast.css","album.css","sports.css","club-hq.css","chronicle.css","locker.css","multisport.css","sports-stage.css","playbook.css","street-powerups.css","hq.css","watch.css","ui-refresh.css","arena-compact.css","ui-refine-2026.css"]]];
for(const [out,files] of groups){
 const css='/* Built site CSS */\n'+files.map(name=>'\n/* BEGIN '+name+' */\n'+fs.readFileSync(path.join(root,name),'utf8').trimEnd()+'\n').join('');
 const dest=path.join(root,out);
 if(process.argv.includes('--check')){
  if(!fs.existsSync(dest)||fs.readFileSync(dest,'utf8')!==css)throw Error(out+' is out of date');
 }else fs.writeFileSync(dest,css);
}
