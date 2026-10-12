const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ts=require('@typescript/typescript6');
const filename=path.join(__dirname,'../src/rules.ts');
const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const sandboxModule={exports:{}};
vm.runInNewContext(code,{exports:sandboxModule.exports,module:sandboxModule,Math,Number,Date,JSON},{timeout:1000});
const rules=sandboxModule.exports;
test('game clock advances independently of decorative motion and feedback matches timing',()=>{
 assert.equal(typeof rules.attemptPhase,'function');
 const first=rules.attemptPhase(0),next=rules.attemptPhase(430);
 assert.notEqual(first.timing,next.timing);
 assert.equal(first.keeper,1);
 assert.equal(rules.resolveAttempt('basketball',1,first.keeper,first.timing).made,true);
 assert.equal(rules.resolveAttempt('basketball',1,next.keeper,next.timing).made,false);
});
function store(){
 const data=new Map();
 return{
  data,
  getItem:k=>data.get(k)||null,
  setItem:(k,v)=>data.set(k,String(v))
 };
}
test('completed Prime events add shared XP without overwriting existing club identity or Arena career',()=>{
 const s=store();s.setItem('jozefs-world-player-v1',JSON.stringify({xp:140,kit:'#246bdf',earned:['first-goal'],arenaWins:3}));
 assert.equal(rules.awardClubProgress(s,'basketball',4),20);
 const profile=JSON.parse(s.getItem('jozefs-world-player-v1'));
 assert.equal(profile.xp,160);assert.equal(profile.kit,'#246bdf');assert.equal(profile.arenaWins,3);
 assert.equal(profile.multisportGames,1);assert.equal(profile.multiSports[0],'basketball');
 assert.equal(rules.awardClubProgress(s,'street',10),0);
 assert.equal(JSON.parse(s.getItem('jozefs-world-player-v1')).xp,160);
 assert.equal(rules.awardClubProgress(s,'football',NaN),0);
 for(let i=0;i<3;i++)assert.equal(rules.awardClubProgress(s,'hockey',4),20);
 assert.equal(rules.awardClubProgress(s,'baseball',5),0,'Club daily cap also applies to Prime');
});
test('sports scoring is transparent and based on actual timing and keeper lane',()=>{
 assert.equal(rules.resolveAttempt('hockey',0,0,.5).made,false);
 assert.equal(rules.resolveAttempt('hockey',2,0,.5).made,true);
 assert.equal(rules.resolveAttempt('football',1,1,.5).made,false);
 assert.equal(rules.resolveAttempt('football',1,2,.5).made,true);
 assert.equal(rules.resolveAttempt('basketball',0,0,.5).made,true);
 assert.equal(rules.resolveAttempt('basketball',0,0,.95).made,false);
 assert.equal(rules.resolveAttempt('baseball',0,0,.66).made,true);
 assert.equal(rules.resolveAttempt('baseball',0,0,.8).made,false);
 assert.equal(rules.resolveAttempt('wrestling',2,0,.5,2).made,true);
 assert.equal(rules.resolveAttempt('wrestling',1,0,.5,2).made,false);
});
test('existing multi-sport records survive the Prime Arena migration',()=>{
 const s=store();s.setItem(rules.SAVE_KEY,JSON.stringify({
  hockey:{best:4,played:11},basketball:{best:2,played:7},
  baseball:{best:3,played:5},wrestling:{best:5,played:9,careerWins:6}
 }));
 let rec=rules.readRecords(s);
 assert.equal(rec.hockey.best,4);
 assert.equal(rec.wrestling.careerWins,6);
 rec=rules.saveGame(s,'hockey',2);
 assert.equal(rec.hockey.played,12);
 assert.equal(rec.hockey.best,4,'a weak run never reduces best');
 rec=rules.saveGame(s,'wrestling',4);
 assert.equal(rec.wrestling.careerWins,7);
 assert.equal(rec.wrestling.best,5);
 const before=s.getItem(rules.SAVE_KEY);
 rules.saveGame(s,'football',5);
 assert.equal(s.getItem(rules.SAVE_KEY),before,'Prime football is independent of original Arena career');
});
test('corrupted or missing storage and invalid scores cannot break kids gameplay',()=>{
 const s=store();
 s.setItem(rules.SAVE_KEY,'{{invalid');
 assert.equal(rules.readRecords(s).hockey.best,0);
 rules.saveGame(s,'baseball',10000);
 assert.equal(rules.readRecords(s).baseball.best,5);
 rules.saveGame(s,'basketball',-100);
 assert.equal(rules.readRecords(s).basketball.best,0);
 s.setItem(rules.SAVE_KEY,JSON.stringify({hockey:{played:Infinity,best:-1}}));
 assert.equal(rules.readRecords(s).hockey.best,0);
 const noStorage={getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('denied')}};
 assert.equal(rules.readRecords(noStorage).hockey.best,0);
 assert.doesNotThrow(()=>rules.saveGame(noStorage,'hockey',3));
});
test('Chronicle only adds a truthful completed challenge while retaining prior events',()=>{
 const s=store();
 s.setItem(rules.CHRONICLE_KEY,JSON.stringify({events:[{type:'career',title:'Old league',story:'Historic',at:4}],seen:{Shared:2}}));
 rules.recordHighlight(s,'basketball',4);
 const history=JSON.parse(s.getItem(rules.CHRONICLE_KEY));
 assert.equal(history.events.length,2);
 assert.equal(history.events[0].type,'multisport');
 assert.match(history.events[0].story,/4 out of 5/);
 assert.equal(history.events[1].title,'Old league');
 assert.equal(history.seen.Shared,2);
});

test('Prime game has no third-party font, analytics, or personal-progress cache',()=>{
 const root=path.join(__dirname,'..');
 const source=fs.readFileSync(path.join(root,'src/main.ts'),'utf8');
 const css=fs.readFileSync(path.join(root,'src/style.css'),'utf8');
 assert.match(source,/serviceWorker\.register\('\.\.\/sw\.js'/);
 assert.match(source,/cache\.add\(url\)/);
 assert.match(source,/origin===location\.origin/);
 assert.doesNotMatch(css,/@import|fonts\.googleapis\.com|url\(https?:/);
 assert.doesNotMatch(source,/sendBeacon|XMLHttpRequest|analytics|localStorage\.clear/);
});
