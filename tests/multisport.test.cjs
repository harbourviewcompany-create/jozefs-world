const bundled=require('./bundle-contract.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
const source=fs.readFileSync(path.join(root,'multisport.js'),'utf8');
const css=fs.readFileSync(path.join(root,'multisport.css'),'utf8');
function boot({store=new Map(),random=()=>0,reduce=false,goalieLane=null}={}){
 let now=0;
 const nodes=new Map(),listeners={},events=[],scores=[];
 class N{
   constructor(id){this.id=id;this.children=[];this.events={};this.textContent='';this.dataset={};this.style={};this.hidden=false;this.attrs={};this.classSet=new Set();this.classList={contains:k=>id==='sports-arcade'&&k==='active'?true:this.classSet.has(k),toggle:(k,on)=>on?this.classSet.add(k):this.classSet.delete(k)};}
   setAttribute(k,v){this.attrs[k]=String(v)}
   addEventListener(k,fn){this.events[k]=fn}
   replaceChildren(...args){this.children=args}
   append(...args){this.children.push(...args)}
   click(){this.events.click?.()}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new N(id));return nodes.get(id)};
 const document={
   readyState:'complete',body:{},getElementById:get,
   createElement:()=>new N('created'),
   querySelector:()=>new N('nav'),
   querySelectorAll:selector=>selector==='[data-multi-start]'?[]:[],
   addEventListener:(type,fn)=>{listeners[type]=fn}
 };
 const window={
   requestAnimationFrame:()=>7,cancelAnimationFrame:()=>{},
   matchMedia:()=>({matches:reduce}),
   JozefWorld:{record:(action,details)=>{scores.push({action,details});return 20}},
   ...(goalieLane===null?{}:{JozefSportStage:{create:()=>({
     begin(){},shoot(){},refresh(){},getGoalie:()=>goalieLane
   })}}),
   dispatchEvent:e=>{events.push(e.type)},
   addEventListener:(type,fn)=>{listeners[type]=fn},
   showSection:()=>{}
 };
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
 const clock=class extends Date{static now(){return now}};
 const Event=class{constructor(type){this.type=type}};
 const MathShim=Object.create(Math);MathShim.random=random;
 vm.runInNewContext(source,{document,window,localStorage,Date:clock,Event,Number,String,JSON,Math:MathShim,Set},{timeout:1500});
 const controls=()=>get('multi-controls').children;
 const choose=code=>{const btn=controls().find(x=>x.dataset.choice===code);assert.ok(btn,'missing action '+code);btn.click()};
 return {get,controls,choose,window,store,events,scores,setNow:n=>{now=n},listeners};
}
test('all four sports have complete game UI, accessible controls and offline resources',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'index.html'),'utf8'));
 for(const sport of ['hockey','baseball','basketball','wrestling']){
  for(const part of ['multi-tab-'+sport,'multi-best-'+sport,'multi-played-'+sport]){
   assert.equal((html.match(new RegExp('id="'+part+'"','g'))||[]).length,1,part);
  }
  assert.ok(html.includes('data-multi-start="'+sport+'"'),'homepage shortcut '+sport);
 }
 assert.equal((html.match(/id="sports-arcade"/g)||[]).length,1);
 assert.ok(html.includes('data-section="sports-arcade"'));
 assert.ok(html.includes('data-section="sports"'),'existing Sports Scores stays available');
 assert.ok(fs.readFileSync(path.join(root,'stadium.js'),'utf8').includes("'sports-arcade'"));
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(sw.includes("'./multisport.js'"));
 bundled.css(root,html,sw,'multisport.css');
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|speechSynthesis/);
 assert.doesNotMatch(css,/@import|url\(\s*https?:/);
 assert.match(html,/not affiliated with or endorsed by WWE/);
 assert.match(source,/JOHN CENA/);
 assert.match(source,/REY MYSTERIO/);
 const scores=fs.readFileSync(path.join(root,'sports.js'),'utf8');
 assert.match(scores,/label: 'NHL \/ Hockey'/);
 assert.match(scores,/label: 'MLB \/ Baseball'/);
 assert.match(scores,/Ottawa Senators/);
 assert.match(scores,/Toronto Blue Jays/);
 assert.match(scores, /\['nba','nhl','mlb'\]\.includes\(id\)\?\['Home','Away'\]/);
});
test('hockey shoots 5 real attempts, records best and avoids duplicate awards',()=>{
 const b=boot({random:()=>0});
 assert.equal(b.get('multi-name').textContent,'HOCKEY SHOOTOUT');
 for(let i=0;i<5;i++){
  b.choose('right');
  assert.equal(b.get('multi-score').textContent,(i+1)+' / 5 GOALS');
  b.choose('next');
 }
 const saved=JSON.parse(b.store.get('jozefs-world-multisport-v1'));
 assert.equal(saved.hockey.best,5);
 assert.equal(saved.hockey.played,1);
 assert.equal(b.scores.length,1);
 assert.equal(b.scores[0].action,'multisport');
 assert.equal(b.scores[0].details.sport,'hockey');
 assert.equal(b.scores[0].details.score,5);
 assert.deepEqual(b.events,['jozef:multisport-completed']);
 b.choose('again');assert.equal(b.get('multi-score').textContent,'0 / 5 GOALS');
 assert.equal(b.scores.length,1);
 const next=boot({store:b.store});
 assert.equal(next.get('multi-best-hockey').textContent,'5/5');
});
test('baseball and basketball swing/release through the real timing window',()=>{
 const b=boot();
 b.get('multi-tab-baseball').click();
 assert.equal(b.get('multi-name').textContent,'BASEBALL HOME RUN DERBY');
 assert.equal(b.get('multi-timing').hidden,false);
 let now=0;
 for(let i=0;i<5;i++){now+=523;b.setNow(now);b.choose('shoot');if(i!==4){b.choose('next');}}
 b.choose('next');
 assert.equal(b.get('multi-best-baseball').textContent,'5/5');
 b.get('multi-tab-basketball').click();
 assert.equal(b.get('multi-name').textContent,'BASKETBALL THREE-POINT CHALLENGE');
 for(let i=0;i<5;i++){now+=523;b.setNow(now);b.choose('shoot');if(i!==4)b.choose('next');}
 b.choose('next');
 assert.equal(b.get('multi-best-basketball').textContent,'5/5');
 assert.equal(b.scores.length,2);
});
test('wrestling is original showmanship, rewards matching crowd cues without risky moves',()=>{
 const b=boot();b.get('multi-tab-wrestling').click();
 assert.match(b.get('multi-message').textContent,/CROWD WANTS A HUGE ENTRANCE/);
 for(const x of ['entrance','pose','teamwork','entrance','pose']){b.choose(x);b.choose('next');}
 assert.equal(b.get('multi-best-wrestling').textContent,'5/5');
 assert.equal(b.scores[0].details.sport,'wrestling');
 assert.match(b.get('multi-message').textContent,/PERFECT FIVE/);
 assert.equal(b.window.JozefMultiSport.getLastResult().score,5);
});
test('reduced motion mode offers untimed playable batting and shooting',()=>{
 const b=boot({reduce:true,random:()=>0.5});b.get('multi-tab-basketball').click();
 b.setNow(9000);b.choose('shoot');
 assert.equal(b.get('multi-score').textContent,'1 / 5 BUCKETS');
});
test('saved records, profile XP, Chronicle and Club backups include multisport without online accounts',()=>{
 const profile=fs.readFileSync(path.join(root,'extras.js'),'utf8');
 const backup=fs.readFileSync(path.join(root,'clubhouse.js'),'utf8');
 const history=fs.readFileSync(path.join(root,'chronicle.js'),'utf8');
 assert.ok(profile.includes("multisport: 20"));
 assert.ok(profile.includes("multisport: 4"));
 assert.ok(profile.includes("'all-sport-debut'")&&profile.includes("'all-sport-champion'"));
 assert.ok(profile.includes("Number.isInteger(info.score)"));
 assert.ok(backup.includes("'jozefs-world-multisport-v1'"));
 assert.ok(history.includes("'jozef:multisport-completed'"));
 assert.doesNotMatch(source,/login|signup|accountId|userId|password/i);
});


test('All-Sport Cup requires 3 out of 5 in every sport, with no added save key',()=>{
 const b=boot({random:()=>0});
 assert.equal(b.window.JozefMultiSport.getCupProgress().qualified,0);
 assert.equal(b.get('multi-cup-status').textContent,'0 OF 4 QUALIFIED');
 assert.equal(b.get('multi-cup-progress').attrs['aria-valuenow'],'0');
 // Shoot 5 successful hockey goals and inspect the individual turn markers.
 for(let i=0;i<5;i++){b.choose('right');if(i<4)b.choose('next')}
 const marks=b.get('multi-round-markers').children;
 assert.equal(marks.length,5);
 assert.ok(marks.every(x=>x.textContent==='✓'));
 assert.equal(b.get('multi-round').textContent,'5 / 5','final attempt must not render 6/5');
 b.choose('next');
 assert.equal(b.window.JozefMultiSport.getCupProgress().qualified,1);
 assert.equal(b.get('multi-cup-progress').attrs['aria-valuenow'],'1');
 assert.equal(b.get('multi-cup-meter').style.width,'25%');
 assert.ok(b.get('multi-cup-hockey').classSet.has('qualified'));
 assert.equal(b.get('multi-cup-hockey-state').textContent,'QUALIFIED ✓');
 // CTA automatically leads to the first unqualified sport.
 b.get('multi-cup-next').click();
 assert.equal(b.get('multi-name').textContent,'BASEBALL HOME RUN DERBY');
 assert.equal(b.get('multi-round-markers').children.length,5);
 assert.ok(b.get('multi-round-markers').children.every(x=>x.textContent!=='✓'));
 // Cup doesn't create a new progress key; it derives from sport records.
 const recorded=JSON.parse(b.store.get('jozefs-world-multisport-v1'));
 assert.equal(Object.keys(recorded).length,4);
});
test('All-Sport Cup unlocks only after four qualified 3/5 bests',()=>{
 const pre=new Map([['jozefs-world-multisport-v1',JSON.stringify({
  hockey:{best:3,played:3},baseball:{best:4,played:2},
  basketball:{best:5,played:1},wrestling:{best:2,played:1}
 })]]);
 const b=boot({store:pre});
 assert.equal(b.window.JozefMultiSport.getCupProgress().champion,false);
 assert.equal(b.window.JozefMultiSport.getCupProgress().qualified,3);
 assert.equal(b.get('multi-cup-meter').style.width,'75%');
 b.get('multi-cup-next').click();
 assert.equal(b.get('multi-name').textContent,'WRESTLING SHOWDOWN');
 // The last five showmanship challenges are deterministic and safe.
 for(const choice of ['entrance','pose','teamwork','entrance','pose']){b.choose(choice);b.choose('next')}
 assert.equal(b.window.JozefMultiSport.getCupProgress().qualified,4);
 assert.equal(b.window.JozefMultiSport.getCupProgress().champion,true);
 assert.ok(b.get('multi-cup-finale').classSet.has('champion'));
 assert.equal(b.get('multi-cup-title').textContent,'THE ALL-SPORT CUP IS YOURS.');
 assert.equal(b.get('multi-cup-progress').attrs['aria-valuenow'],'4');
 assert.equal(b.scores.length,1,'one actual completion grants one capped XP attempt');
 const replay=boot({store:b.store});
 assert.equal(replay.window.JozefMultiSport.getCupProgress().champion,true,'Cup persists from saved best scores');
 const profile=fs.readFileSync(path.join(root,'extras.js'),'utf8');
 assert.ok(profile.includes("'four-sport-cup'"));
 assert.ok(profile.includes("state.allSportCup = true"));
});

test('wrestling career progresses from opening act to champion, without changing old save keys',()=>{
 const b=boot();
 const career=()=>b.window.JozefMultiSport.getWrestlingCareer();
 assert.equal(career().rank,0);
 assert.equal(career().rival,'NEON TITAN');
 assert.equal(b.get('multi-wrestling-career').hidden,true);
 b.get('multi-tab-wrestling').click();
 assert.equal(b.get('multi-wrestling-career').hidden,false);
 const show=()=>{
  for(const choice of ['entrance','pose','teamwork','entrance','pose']){b.choose(choice);b.choose('next')}
 };
 show();
 assert.equal(career().rank,1);
 assert.equal(career().wins,1);
 assert.equal(b.get('multi-wrestling-rank').textContent,'RISING STAR');
 b.choose('again');show();b.choose('again');show();
 assert.equal(career().rank,2);
 assert.equal(career().rival,'GOLDEN PANTHER');
 for(let i=0;i<3;i++){b.choose('again');show()}
 assert.equal(career().rank,3);
 assert.equal(career().name,'CHAMPION');
 assert.equal(career().remaining,0);
 assert.ok(b.get('multi-wrestling-career').classSet.has('is-champion'));
 assert.equal(b.get('multi-wrestling-meter').style.width,'100%');
 const saved=JSON.parse(b.store.get('jozefs-world-multisport-v1'));
 assert.equal(saved.wrestling.careerWins,6);
 const replay=boot({store:b.store});
 assert.equal(replay.window.JozefMultiSport.getWrestlingCareer().name,'CHAMPION');
 assert.equal(Object.keys(saved).length,4);
});
test('existing wrestling records migrate safely and only 3+ crowd pops advance a career',()=>{
 const store=new Map([['jozefs-world-multisport-v1',JSON.stringify({
  hockey:{best:1,played:2},baseball:{best:2,played:3},
  basketball:{best:0,played:0},wrestling:{best:4,played:8}
 })]]);
 const b=boot({store});
 assert.equal(b.window.JozefMultiSport.getWrestlingCareer().wins,0);
 b.get('multi-tab-wrestling').click();
 // Wrong choice on all five rounds (including WWE trivia).
 for(let i=0;i<5;i++){b.choose(i===0?'pose':'entrance');b.choose('next')}
 assert.equal(b.window.JozefMultiSport.getWrestlingCareer().wins,0);
 assert.equal(JSON.parse(b.store.get('jozefs-world-multisport-v1')).wrestling.best,4);
});

test('iPhone touch aims directly on hockey rink and taps baseball/basketball action canvas',()=>{
 const b=boot({random:()=>0});
 const canvas=b.get('multi-action-canvas');
 const tap=x=>canvas.events.click({currentTarget:{
  getBoundingClientRect:()=>({left:10,width:300})},clientX:x});
 assert.equal(canvas.attrs.role,'button');
 assert.match(canvas.attrs['aria-label'],/Tap left, centre or right/);
 tap(280); // right wing beats left-moving goalie
 assert.equal(b.get('multi-score').textContent,'1 / 5 GOALS');
 tap(280); // no double actions during result
 assert.equal(b.get('multi-score').textContent,'1 / 5 GOALS');
 b.get('multi-tab-baseball').click();
 assert.match(canvas.attrs['aria-label'],/Tap to swing/);
 b.setNow(523);tap(160);
 assert.equal(b.get('multi-score').textContent,'1 / 5 HITS');
 b.get('multi-tab-basketball').click();
 b.setNow(1046);tap(160);
 assert.equal(b.get('multi-score').textContent,'1 / 5 BUCKETS');
 b.get('multi-tab-wrestling').click();
 assert.equal(canvas.attrs.role,'img');
 const before=b.get('multi-score').textContent;tap(160);
 assert.equal(b.get('multi-score').textContent,before,'wrestling scene does not fake contact moves');
});

test('Rookie, Pro and Legend alter goalie intelligence and timing tolerance',()=>{
 const easy=boot({random:()=>0});
 assert.equal(easy.window.JozefMultiSport.getDifficulty(),'pro');
 assert.equal(easy.window.JozefMultiSport.evaluateTiming('baseball',80,'rookie'),true);
 assert.equal(easy.window.JozefMultiSport.evaluateTiming('baseball',80,'pro'),false);
 assert.equal(easy.window.JozefMultiSport.evaluateTiming('baseball',62,'legend'),true);
 assert.equal(easy.window.JozefMultiSport.evaluateTiming('basketball',71,'rookie'),true);
 assert.equal(easy.window.JozefMultiSport.evaluateTiming('basketball',71,'legend'),false);
 easy.get('multi-difficulty-rookie').click();
 assert.equal(easy.window.JozefMultiSport.getDifficulty(),'rookie');
 assert.equal(easy.get('multi-difficulty-rookie').attrs['aria-pressed'],'true');
 easy.choose('left'); // rookie goalie dives away from matching shot
 assert.equal(easy.get('multi-score').textContent,'1 / 5 GOALS');
 easy.get('multi-difficulty-legend').click(); // restarts match, without mutating saved best
 assert.equal(easy.window.JozefMultiSport.getDifficulty(),'legend');
 assert.equal(easy.get('multi-score').textContent,'0 / 5 GOALS');
 easy.choose('right'); // legend goalie learns the right corner
 assert.equal(easy.get('multi-score').textContent,'0 / 5 GOALS');
 assert.equal(easy.store.size,0,'changing level cannot invent a completed match');
});
test('Legend wrestling adds new legitimate questions, Rookie offers helpful hints',()=>{
 const b=boot();
 b.get('multi-tab-wrestling').click();
 b.get('multi-difficulty-rookie').click();
 assert.match(b.controls()[0].textContent,/COACH PICK/);
 b.get('multi-difficulty-legend').click();
 assert.match(b.get('multi-message').textContent,/AMERICAN NIGHTMARE/);
 assert.ok(b.controls().some(x=>/CODY RHODES/.test(x.textContent)));
 b.choose('teamwork');
 assert.equal(b.get('multi-score').textContent,'1 / 5 CROWD POPS');
 assert.ok(b.get('multi-round-markers').children[0].textContent==='✓');
});
test('Playbook can launch a specific sport without opening a separate profile',()=>{
 const b=boot();
 assert.equal(b.window.JozefMultiSport.playSport('basketball'),true);
 assert.equal(b.get('multi-name').textContent,'BASKETBALL THREE-POINT CHALLENGE');
 assert.equal(b.window.JozefMultiSport.playSport('unknown'),false);
 assert.equal(b.get('multi-name').textContent,'BASKETBALL THREE-POINT CHALLENGE');
 const html=fs.readFileSync(path.join(root,'world.html'),'utf8');
 for(const level of ['rookie','pro','legend'])
  assert.equal((html.match(new RegExp('id="multi-difficulty-'+level+'"','g'))||[]).length,1);
});

test('scoring zone visuals match Rookie, Pro and Legend timing, and the shown goalie can save',()=>{
 const b=boot({random:()=>0,goalieLane:2});
 b.get('multi-tab-baseball').click();
 assert.match(b.get('multi-meter').style.background,/38% 72%/);
 b.get('multi-difficulty-legend').click();
 assert.match(b.get('multi-meter').style.background,/46% 64%/);
 b.get('multi-difficulty-rookie').click();
 assert.match(b.get('multi-meter').style.background,/28% 82%/);
 b.get('multi-tab-basketball').click();
 assert.match(b.get('multi-meter').style.background,/33% 77%/);
 b.get('multi-difficulty-pro').click();
 b.get('multi-tab-hockey').click();
 b.choose('right');
 assert.equal(b.get('multi-score').textContent,'0 / 5 GOALS','goalie visible on right makes a right shot a save');
 b.choose('next');
 b.choose('left');
 assert.equal(b.get('multi-score').textContent,'1 / 5 GOALS','left shot beats right-side keeper');
});

test('poster launchers and Sports Arcade event passes reflect the real saved personal bests',()=>{
 const store=new Map([['jozefs-world-multisport-v1',JSON.stringify({
  hockey:{best:4,played:3},baseball:{best:2,played:1},
  basketball:{best:0,played:0},wrestling:{best:5,played:8,careerWins:4}
 })]]);
 const b=boot({store});
 assert.equal(b.get('multi-home-record-hockey').textContent,'CUP QUALIFIED · 4/5');
 assert.equal(b.get('multi-home-record-baseball').textContent,'PERSONAL BEST · 2/5');
 assert.equal(b.get('multi-home-record-basketball').textContent,'FIRST CHALLENGE AWAITS');
 assert.equal(b.get('multi-mode-best-wrestling').textContent,'BEST 5/5');
 assert.equal(b.get('multi-mode-best-basketball').textContent,'NEW SPORT');
 assert.ok(b.get('multi-home-record-hockey').classSet.has('is-qualified'));
 b.get('multi-tab-baseball').click();
 assert.equal(b.get('multi-mode-best-baseball').textContent,'BEST 2/5');
 assert.equal(b.get('multi-home-record-hockey').textContent,'CUP QUALIFIED · 4/5');
 assert.equal(b.scores.length,0,'browsing a sport cannot invent XP');
});

test('new Rival Circuit offers a distinct, progressively harder challenge in every sport',()=>{
 const b=boot({random:()=>0});
 const api=b.window.JozefMultiSport;
 const initial=api.getRivalProgress();
 assert.equal(initial.beaten,0);
 assert.equal(initial.total,12);
 assert.equal(initial.sports.hockey.opponent,'FROST WOLVES');
 assert.equal(initial.sports.baseball.opponent,'DIAMOND COMETS');
 assert.equal(initial.sports.basketball.opponent,'SKYLINE FIVE');
 assert.equal(initial.sports.wrestling.opponent,'SHADOW SHOWMEN');
 assert.equal(initial.sports.hockey.target,2);
 assert.equal(b.get('multi-rival-progress').attrs['aria-valuenow'],'0');
 // Playing through a five-turn match counts once, even for a perfect score.
 function hockeyWin(){
  for(let i=0;i<5;i++){b.choose('right');b.choose('next')}
 }
 hockeyWin();
 assert.equal(api.getRivalProgress().sports.hockey.tier,1);
 assert.equal(api.getRivalProgress().sports.hockey.target,3);
 assert.equal(b.get('multi-rival-hockey-status').textContent,'1 / 3 BEATEN');
 assert.equal(b.get('multi-rival-progress').attrs['aria-valuenow'],'1');
 assert.match(b.get('multi-message').textContent,/RIVAL BEATEN/);
 const last=api.getLastResult();
 assert.equal(last.rivalWin,true);
 assert.equal(last.rival,'FROST WOLVES');
 assert.equal(last.rivalTier,1);
 b.choose('again');
 hockeyWin();
 assert.equal(api.getRivalProgress().sports.hockey.tier,2);
 b.choose('again');
 hockeyWin();
 assert.equal(api.getRivalProgress().sports.hockey.tier,3);
 assert.equal(api.getRivalProgress().sports.hockey.complete,true);
 assert.equal(b.get('multi-rival-hockey-status').textContent,'RIVAL DEFEATED ✓');
 assert.equal(b.get('multi-rival-meter').style.width,'25%');
 b.choose('again');
 hockeyWin();
 assert.equal(api.getRivalProgress().sports.hockey.tier,3,'defeated rival never exceeds third stage');
 assert.equal(api.getLastResult().rivalWin,false);
 assert.equal(b.get('multi-rival-meter').style.width,'25%');
 const saved=JSON.parse(b.store.get('jozefs-world-multisport-v1'));
 assert.equal(saved.hockey.rivalTier,3);
 assert.equal(Object.keys(saved).length,4,'old four-sport save format remains compatible');
 const reload=boot({store:b.store});
 assert.equal(reload.window.JozefMultiSport.getRivalProgress().sports.hockey.tier,3);
});
test('past bests and Cup progress survive Rival Circuit upgrade without fabricated wins',()=>{
 const store=new Map([['jozefs-world-multisport-v1',JSON.stringify({
  hockey:{best:5,played:12},baseball:{best:3,played:2},
  basketball:{best:4,played:5},wrestling:{best:5,played:10,careerWins:6}
 })]]);
 const b=boot({store});
 const api=b.window.JozefMultiSport;
 assert.equal(api.getRivalProgress().beaten,0,'old high scores are not fictional rival match results');
 assert.equal(api.getCupProgress().champion,true,'old All-Sport Cup survives unchanged');
 assert.equal(api.getWrestlingCareer().name,'CHAMPION','wrestling title survives');
 assert.equal(b.get('multi-cup-title').textContent,'THE ALL-SPORT CUP IS YOURS.');
 assert.equal(b.scores.length,0,'opening the Rival Circuit cannot grant XP');
 b.get('multi-rival-next').click();
 assert.equal(b.get('multi-name').textContent,'HOCKEY SHOOTOUT');
 assert.equal(b.get('multi-score').textContent,'0 / 5 GOALS');
 assert.equal(api.getRivalProgress().beaten,0,'a shortcut cannot win a rivalry');
});
test('all twelve rival stages can be earned legitimately and never penalize failed matches',()=>{
 const store=new Map([['jozefs-world-multisport-v1',JSON.stringify({
  hockey:{best:3,played:5,rivalTier:3},
  baseball:{best:4,played:6,rivalTier:3},
  basketball:{best:5,played:7,rivalTier:3},
  wrestling:{best:2,played:3,rivalTier:2,careerWins:0}
 })]]);
 const b=boot({store});
 const api=b.window.JozefMultiSport;
 b.get('multi-tab-wrestling').click();
 // This run is unsuccessful for the last tier (4 points required).
 for(let i=0;i<5;i++){b.choose('pose');b.choose('next')}
 assert.equal(api.getRivalProgress().sports.wrestling.tier,2);
 assert.equal(api.getRivalProgress().champion,false);
 b.choose('again');
 for(const action of ['entrance','pose','teamwork','entrance','pose']){
   b.choose(action);b.choose('next');
 }
 assert.equal(api.getRivalProgress().beaten,12);
 assert.equal(api.getRivalProgress().champion,true);
 assert.equal(b.get('multi-rival-progress').attrs['aria-valuenow'],'12');
 assert.equal(b.get('multi-rival-meter').style.width,'100%');
 assert.ok(b.get('multi-rivals').classSet.has('rival-complete'));
});

test('Form Guide starts empty, follows each sport and uses only completed results',()=>{
 const b=boot({random:()=>0});
 assert.equal(b.window.JozefMultiSport.getFormProgress().recent.length,0);
 assert.equal(b.get('multi-form-average').textContent,'—');
 assert.equal(b.get('multi-form-trend').textContent,'FIRST GAME AWAITS');
 assert.equal(b.get('multi-form-scores').children.length,5);
 b.choose('right'); // one hockey goal, but no finished game yet
 assert.equal(b.window.JozefMultiSport.getFormProgress().recent.length,0);
 assert.equal(b.store.has('jozefs-world-multisport-v1'),false);
 for(let i=1;i<5;i++){b.choose('next');b.choose('right')}
 b.choose('next'); // now a full 5/5 event
 assert.equal(b.window.JozefMultiSport.getFormProgress().recent.join(','),'5');
 assert.equal(b.get('multi-form-average').textContent,'5.0 / 5');
 assert.equal(b.get('multi-form-trend').textContent,'FIRST RESULT');
 assert.equal(b.get('multi-form-scores').children.at(-1).textContent,'5/5');
 b.get('multi-tab-basketball').click();
 assert.equal(b.window.JozefMultiSport.getFormProgress().recent.length,0);
 assert.equal(b.get('multi-form-average').textContent,'—');
 b.get('multi-tab-hockey').click();
 assert.equal(b.window.JozefMultiSport.getFormProgress().recent[0],5);
});
test('Form Guide retains five recent completed scores, accurate average and replay without extra XP',()=>{
 const b=boot({random:()=>0});
 // Alternating results are deliberate, with three latest increasing.
 const scores=[0,1,2,3,4,5];
 for(const count of scores){
  for(let i=0;i<5;i++){
   b.choose(i<count?'right':'left'); // goalie always left
   b.choose('next');
  }
  if(count!==scores.at(-1))b.get('multi-form-replay').click();
 }
 const form=b.window.JozefMultiSport.getFormProgress();
 assert.equal(form.recent.join(','),'1,2,3,4,5');
 assert.equal(form.average,3);
 assert.equal(form.trend,'IMPROVING ↑');
 assert.equal(b.get('multi-form-average').textContent,'3.0 / 5');
 assert.equal(b.get('multi-form-trend').textContent,'IMPROVING ↑');
 assert.equal(b.get('multi-form-scores').children.length,5);
 assert.equal(b.get('multi-form-scores').children[0].textContent,'1/5');
 assert.equal(b.get('multi-form-scores').children[4].textContent,'5/5');
 const persisted=JSON.parse(b.store.get('jozefs-world-multisport-v1'));
 assert.equal(persisted.hockey.recent.join(','),'1,2,3,4,5');
 assert.equal(Object.keys(persisted).length,4,'shared club keeps existing four-sport save');
 assert.equal(b.scores.length,6,'each completed event makes exactly one existing XP attempt');
 const restored=boot({store:b.store});
 assert.equal(restored.window.JozefMultiSport.getFormProgress('hockey').recent.join(','),'1,2,3,4,5');
});
test('Form Guide accepts old and corrupted imported saves without fabricating records',()=>{
 const store=new Map([['jozefs-world-multisport-v1',JSON.stringify({
  hockey:{best:5,played:12},
  baseball:{best:4,played:11,recent:[-1,7,'5',2,3,4,5,0,1]},
  basketball:{best:2,played:3,recent:'not an array'},
  wrestling:{best:5,played:6,careerWins:6}
 })]]);
 const b=boot({store});
 const api=b.window.JozefMultiSport;
 assert.equal(api.getFormProgress('hockey').recent.length,0,'old best scores are not invented as historic matches');
 assert.equal(api.getFormProgress('baseball').recent.join(','),'2,3,4,5,0,1'.split(',').slice(-5).join(','));
 assert.equal(api.getFormProgress('basketball').recent.length,0);
 assert.equal(api.getFormProgress('unknown'),null);
 assert.equal(api.getCupProgress().champion,false);
 assert.equal(api.getWrestlingCareer().name,'CHAMPION');
 const styles=fs.readFileSync(path.join(root,'site-experience.css'),'utf8');
 assert.ok(styles.includes('/* BEGIN multisport.css */'));
 assert.ok(styles.includes('.multi-form-results'),'actual loaded CSS bundle styles the form');
 const page=fs.readFileSync(path.join(root,'world.html'),'utf8');
 for(const id of ['multi-form-scores','multi-form-average','multi-form-trend','multi-form-tip','multi-form-replay'])
  assert.equal((page.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
});
