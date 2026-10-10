/* JOZEF'S SPORTS ARCADE — four original, self-contained browser games.
   No online accounts, official sports assets, betting, or unsafe wrestling moves. */
(() => {
  'use strict';
  const KEY='jozefs-world-multisport-v1';
  const GAMES={
    hockey:{label:'HOCKEY SHOOTOUT',short:'Hockey',kind:'aim',rounds:5,unit:'GOALS'},
    baseball:{label:'BASEBALL HOME RUN DERBY',short:'Baseball',kind:'timing',rounds:5,unit:'HITS'},
    basketball:{label:'BASKETBALL THREE-POINT CHALLENGE',short:'Basketball',kind:'timing',rounds:5,unit:'BUCKETS'},
    wrestling:{label:'WRESTLING SHOWDOWN',short:'Wrestling',kind:'show',rounds:5,unit:'CROWD POPS'}
  };
  const WRESTLING_TIERS=[
    {name:'OPENING ACT',rival:'NEON TITAN',required:1},
    {name:'RISING STAR',rival:'MIDNIGHT MAVERICK',required:3},
    {name:'MAIN EVENT',rival:'GOLDEN PANTHER',required:6},
    {name:'CHAMPION',rival:'THE NIGHT LEGEND',required:null}
  ];
  const CHALLENGES=[
    {cue:'THE CROWD WANTS A HUGE ENTRANCE!',answer:0,remark:'THE LIGHTS HIT. THE CROWD ROARS!'},
    {cue:'IT IS TIME FOR YOUR SIGNATURE POSE!',answer:1,remark:'THAT IS THE POSE EVERYONE CAME TO SEE!'},
    {cue:'YOUR TAG-TEAM PARTNER NEEDS A HIGH FIVE!',answer:2,remark:'TEAMWORK BRINGS THE HOUSE DOWN!'},
    {cue:"WWE FAN QUIZ: WHO IS KNOWN FOR 'YOU CAN'T SEE ME'?",choices:['JOHN CENA','REY MYSTERIO','ROMAN REIGNS'],answer:0,remark:'JOHN CENA! THE CROWD KNOWS THAT LINE!'},
    {cue:'WWE FAN QUIZ: WHO IS FAMOUS FOR THE 619?',choices:['CODY RHODES','REY MYSTERIO','JOHN CENA'],answer:1,remark:'REY MYSTERIO! YOU KNOW YOUR WRESTLING!'}
  ];
  const LEGEND_SHOW=[
    {cue:'WWE FAN QUIZ: WHO IS KNOWN AS THE AMERICAN NIGHTMARE?',choices:['JOHN CENA','ROMAN REIGNS','CODY RHODES'],answer:2,remark:'CODY RHODES! BIG MATCH ENERGY!'},
    {cue:'YOUR TEAM NEEDS A BIG MOMENT TO OPEN THE SHOW!',choices:['LOOK AWAY','ENTRANCE POSE','LEAVE THE STAGE'],answer:1,remark:'THE CROWD IS READY FOR THE MAIN EVENT!'},
    {cue:'WWE FAN QUIZ: WHO HAS USED THE TRIBAL CHIEF NICKNAME?',choices:['ROMAN REIGNS','REY MYSTERIO','JOHN CENA'],answer:0,remark:'ROMAN REIGNS! YOU KNOW YOUR WWE!'},
    {cue:'A FRIENDLY TAG TEAM NEEDS A WAY TO CELEBRATE!',choices:['IGNORE YOUR PARTNER','TURN AWAY','TEAM HIGH FIVE'],answer:2,remark:'TEAMWORK GETS THE BIGGEST CHEERS!'},
    {cue:'YOUR LAST APPEARANCE IS ABOUT TO BEGIN!',choices:['SIGNATURE POSE','HIDE BACKSTAGE','FORGET THE FANS'],answer:0,remark:'THE NIGHT BELONGS TO YOUR TEAM!'}
  ];
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const valid=(v)=>Number.isSafeInteger(v)&&v>=0&&v<=999999;
  function fresh(){return Object.fromEntries(Object.keys(GAMES).map(sport=>[sport,{played:0,best:0}]));}
  function load(){
    let input;
    try{input=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){}
    const out=fresh();
    out.wrestling.careerWins=0;
    for(const sport of Object.keys(GAMES)){
      const row=input?.[sport]||{};
      if(valid(row.played))out[sport].played=row.played;
      if(valid(row.best))out[sport].best=Math.min(GAMES[sport].rounds,row.best);
    }
    if(valid(input?.wrestling?.careerWins))
      out.wrestling.careerWins=Math.min(input.wrestling.careerWins,out.wrestling.played);
    return out;
  }
  let saved=load(),sport='hockey',difficulty='pro',round=0,points=0,phase='ready',turnStart=0,raf=0,indicator=50,lastMessage='',lastResult=null,roundHistory=[],stageView=null;
  const button=(label,choice,extra='')=>{
    const b=document.createElement('button');
    b.type='button';b.textContent=label;b.dataset.choice=choice;
    b.className='multi-action '+extra;
    b.addEventListener('click',()=>act(choice));
    return b;
  };
  const label=(id,text)=>{const e=$(id);if(e)e.textContent=String(text);};
  const setHidden=(id,val)=>{const e=$(id);if(e)e.hidden=val};
  const position=(ms,kind)=>{
    // Triangle wave, 0→100→0 in 1.9s. Always calculate from elapsed time,
    // not rendered frames, so slow phones receive identical timing rules.
    const cycle=((ms%1900)+1900)%1900;
    return cycle<950?cycle/9.5:(1900-cycle)/9.5;
  };
  const accuracy=(kind,pos,level='pro')=>{
    const ranges={
      rookie:{baseball:27,basketball:22},
      pro:{baseball:17,basketball:12},
      legend:{baseball:9,basketball:7}
    };
    return Math.abs(pos-55)<=(ranges[level]||ranges.pro)[kind==='baseball'?'baseball':'basketball'];
  };
  function persist(){
    try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(_){/* This run still works. */}
  }
  function paintRecord(){
    for(const k of Object.keys(GAMES)){
      label('multi-best-'+k,saved[k].best+'/5');
      label('multi-played-'+k,saved[k].played+' PLAYED');
      const tab=$('multi-tab-'+k);
      if(tab){tab.classList.toggle('selected',k===sport);tab.setAttribute('aria-pressed',String(k===sport))}
    }
  }
  // A championship is earned entirely from the four existing local best scores.
  // No extra profile, payments, countdowns, or new save key.
  function getCupProgress(){
    const qualified=Object.keys(GAMES).filter(id=>saved[id].best>=3);
    return {qualified:qualified.length,total:4,champion:qualified.length===4};
  }
  function getWrestlingCareer(){
    const wins=saved.wrestling.careerWins||0;
    const rank=wins>=6?3:wins>=3?2:wins>=1?1:0;
    const tier=WRESTLING_TIERS[rank];
    const previous=rank===0?0:WRESTLING_TIERS[rank-1].required;
    return {wins,rank,name:tier.name,rival:tier.rival,
      required:tier.required,remaining:tier.required===null?0:Math.max(0,tier.required-wins),
      progress:tier.required===null?100:Math.round((wins-previous)/(tier.required-previous)*100)};
  }
  function paintWrestlingCareer(){
    const career=getWrestlingCareer();
    const panel=$('multi-wrestling-career');
    if(panel)panel.hidden=sport!=='wrestling';
    label('multi-wrestling-rank',career.name);
    label('multi-wrestling-rival',career.rival);
    label('multi-wrestling-wins',career.wins+' SHOW WINS');
    label('multi-wrestling-story',career.rank===3?
      'You earned the main-event title. Keep performing and defend your spotlight.':
      'Win '+career.remaining+' more show'+(career.remaining===1?'':'s')+' with 3+ crowd pops to reach '+WRESTLING_TIERS[career.rank+1].name+'.');
    const meter=$('multi-wrestling-meter');
    if(meter)meter.style.width=career.progress+'%';
    const bar=$('multi-wrestling-progress');
    bar?.setAttribute('aria-valuenow',String(career.progress));
    panel?.classList.toggle('is-champion',career.rank===3);
  }
  function paintCup(){
    const cup=getCupProgress(),finale=$('multi-cup-finale');
    for(const id of Object.keys(GAMES)){
      const won=saved[id].best>=3;
      const stamp=$('multi-cup-'+id);
      stamp?.classList.toggle('qualified',won);
      label('multi-cup-'+id+'-state',won?'QUALIFIED ✓':saved[id].played?'BEST '+saved[id].best+'/5':'NOT YET');
    }
    const meter=$('multi-cup-meter');
    if(meter)meter.style.width=(cup.qualified*25)+'%';
    const track=$('multi-cup-progress');
    track?.setAttribute('aria-valuenow',String(cup.qualified));
    finale?.classList.toggle('champion',cup.champion);
    label('multi-cup-status',cup.champion?'4 OF 4 / CHAMPION':cup.qualified+' OF 4 QUALIFIED');
    label('multi-cup-title',cup.champion?'THE ALL-SPORT CUP IS YOURS.':'THE CUP AWAITS.');
    const next=$('multi-cup-next');
    if(next)next.textContent=cup.champion?'PLAY ANOTHER EVENT ↗':'PLAY FOR THE CUP ↗';
  }
  function paintRounds(){
    const host=$('multi-round-markers');
    if(!host)return;
    host.replaceChildren();
    for(let i=0;i<GAMES[sport].rounds;i++){
      const mark=document.createElement('span');
      const made=roundHistory[i];
      mark.className='multi-turn-mark '+(made===true?'is-made':made===false?'is-missed':i===round&&phase==='ready'?'is-now':'');
      mark.textContent=made===true?'✓':made===false?'×':String(i+1);
      mark.setAttribute('aria-label','Turn '+(i+1)+': '+(made===true?'scored':made===false?'missed':i===round&&phase==='ready'?'up next':'not played'));
      host.append(mark);
    }
  }
  function drawControls(){
    const controls=$('multi-controls');
    if(!controls)return;
    controls.replaceChildren();
    if(phase==='finished'){
      controls.append(button('PLAY AGAIN ↗','again','multi-primary'));
      return;
    }
    if(phase==='result'){
      controls.append(button(round>=5?'VIEW RESULT ↗':'NEXT TURN ↗','next','multi-primary'));
      return;
    }
    if(sport==='hockey'){
      controls.append(button('1 / LEFT','left'),button('2 / CENTRE','centre'),button('3 / RIGHT','right'));
    }else if(sport==='wrestling'){
      const challenge=(difficulty==='legend'?LEGEND_SHOW:CHALLENGES)[round];
      const names=challenge?.choices||['ENTRANCE','SIGNATURE POSE','TEAMWORK'];
      const labels=names.map((name,i)=>difficulty==='rookie'&&i===challenge.answer?name+' / COACH PICK':name);
      controls.append(button('1 / '+labels[0],'entrance'),button('2 / '+labels[1],'pose'),button('3 / '+labels[2],'teamwork'));
    }else{
      controls.append(button(sport==='baseball'?'SWING BAT ↗':'RELEASE SHOT ↗','shoot','multi-primary'));
    }
  }
  function scene(){
    const config=GAMES[sport];
    const box=$('multi-stage');
    if(box)box.dataset.sport=sport;
    label('multi-name',config.label);
    label('multi-round',phase==='finished'?'FULL TIME':Math.min(round+1,config.rounds)+' / '+config.rounds);
    label('multi-score',points+' / '+config.rounds+' '+config.unit);
    label('multi-stage-label',sport==='hockey'?'AIM FOR THE OPEN CORNER':sport==='baseball'?'TIME YOUR SWING':sport==='basketball'?'RELEASE NEAR THE SWEET SPOT':'THE SHOW MUST GO ON');
    const canvas=$('multi-action-canvas');
    if(canvas){
      canvas.setAttribute('role',sport==='wrestling'?'img':'button');
      canvas.setAttribute('aria-label',sport==='hockey'?
        'Tap left, centre or right of the rink to aim your shot. Keyboard 1, 2 or 3 also works.':
        sport==='baseball'?'Tap to swing when the pitch is right. Press Space to swing with keyboard.':
        sport==='basketball'?'Tap to shoot at the hoop. Press Space to shoot with keyboard.':
        'Wrestling stage. Choose a showmanship or trivia response using the buttons.');
      canvas.tabIndex=sport==='wrestling'?-1:0;
    }
    label('multi-scene-text',sport==='hockey'?'':sport==='baseball'?'BATTER UP':sport==='basketball'?'FROM DOWNTOWN':'LIGHTS • CAMERA • ACTION');
    setHidden('multi-timing',GAMES[sport].kind!=='timing');
    const active=phase!=='finished'&&phase!=='result';
    let prompt=lastMessage;
    if(!prompt){
      prompt=sport==='hockey'?'Choose LEFT, CENTRE or RIGHT to beat the keeper.':
      sport==='baseball'?'Press SWING when the marker crosses the centre zone.':
      sport==='basketball'?'Release when the marker is near the centre zone.':
      (difficulty==='legend'?LEGEND_SHOW:CHALLENGES)[round].cue;
    }
    label('multi-message',prompt);
    const descriptions={
      rookie:'ROOKIE / Wider timing windows and helpful hints. Start here.',
      pro:'PRO / Classic timing and competition. Change difficulty to restart this event.',
      legend:'LEGEND / Tougher goalies, precise timing, new wrestling questions.'
    };
    label('multi-difficulty-note',descriptions[difficulty]);
    for(const id of ['rookie','pro','legend']){
      const tab=$('multi-difficulty-'+id);
      if(tab){tab.setAttribute('aria-pressed',String(id===difficulty));tab.classList.toggle('selected',id===difficulty)}
    }
    const stage=$('multi-stage');
    stage?.classList.toggle('multi-finished',phase==='finished');
    stage?.classList.toggle('multi-result',phase==='result');
    label('multi-keyhelp',sport==='hockey'||sport==='wrestling'?'Use 1, 2, 3 or tap a choice.':'Use SPACE or tap the action button.');
    const instructions=$('multi-instructions');
    if(instructions)instructions.textContent=sport==='wrestling'?'Original ring-show challenges and WWE superstar trivia. Unofficial fan activity, no risky wrestling moves to copy.':
      'Five turns. Have fun and chase your own personal best. No penalties for missing.';
    paintRecord();
    paintCup();
    paintWrestlingCareer();
    paintRounds();
    drawControls();
    if(active&&config.kind==='timing')tick();
    else stopTick();
    stageView?.refresh();
  }
  function stopTick(){
    if(raf&&window.cancelAnimationFrame)window.cancelAnimationFrame(raf);
    raf=0;
  }
  function tick(){
    stopTick();
    if(!window.requestAnimationFrame)return;
    const run=()=>{
      if(phase!=='ready'||GAMES[sport].kind!=='timing')return;
      if(!$('sports-arcade')?.classList.contains('active')){raf=0;return}
      indicator=position(Date.now()-turnStart,sport);
      const n=$('multi-meter-marker');
      if(n)n.style.left=indicator+'%';
      raf=window.requestAnimationFrame(run);
    };
    raf=window.requestAnimationFrame(run);
  }
  function start(kind){
    if(!GAMES[kind])return;
    sport=kind;round=0;points=0;phase='ready';turnStart=Date.now();lastMessage='';roundHistory=[];
    stageView?.begin(sport,{round,rank:getWrestlingCareer().rank});
    scene();
  }
  function act(choice){
    if(choice==='again'){start(sport);return}
    if(choice==='next'&&phase==='result'){
      if(round>=GAMES[sport].rounds){finish();return}
      lastMessage='';phase='ready';turnStart=Date.now();
      stageView?.begin(sport,{round,rank:getWrestlingCareer().rank});
      scene();return;
    }
    if(phase!=='ready')return;
    let made=false,remark='',goalieIndex=1,shotIndex=1;
    if(sport==='hockey'){
      if(!['left','centre','right'].includes(choice))return;
      shotIndex=['left','centre','right'].indexOf(choice);
      goalieIndex=Math.floor(Math.random()*3);
      if(difficulty==='rookie'&&goalieIndex===shotIndex&&Math.random()<.65){
        goalieIndex=(goalieIndex+1)%3;
      }else if(difficulty==='legend'&&goalieIndex!==shotIndex&&Math.random()<.45){
        goalieIndex=shotIndex;
      }
      const goalie=['left','centre','right'][goalieIndex];
      made=goalie!==choice;
      remark=made?'GOAL! THE PUCK FINDS THE '+choice.toUpperCase()+' CORNER.':'BIG SAVE! THE KEEPER WAS READY IN '+goalie.toUpperCase()+'.';
    }else if(sport==='baseball'||sport==='basketball'){
      if(choice!=='shoot')return;
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      // Reduced motion uses untimed accessible attempts, no moving target.
      const pos=reduced?50:position(Date.now()-turnStart,sport);
      made=reduced?Math.random()<(difficulty==='rookie'?.9:difficulty==='legend'?.55:.75):accuracy(sport,pos,difficulty);
      remark=made?(sport==='baseball'?'CRACK! THAT IS A CLEAN BASE HIT!':'SWISH! NOTHING BUT NET!'):
        (sport==='baseball'?'FOUL BALL! NEXT PITCH!':'OFF THE RIM! KEEP SHOOTING!');
    }else if(sport==='wrestling'){
      if(!['entrance','pose','teamwork'].includes(choice))return;
      const challenge=(difficulty==='legend'?LEGEND_SHOW:CHALLENGES)[round];
      const needed=['entrance','pose','teamwork'][challenge.answer];
      made=choice===needed;
      remark=made?challenge.remark:'THE CROWD WANTS A DIFFERENT MOMENT. NEXT ROUND!';
    }
    if(made)points++;
    roundHistory.push(made);
    stageView?.shoot({made,goalie:goalieIndex,choice:shotIndex});
    round++;phase='result';lastMessage=remark;
    scene();
  }
  function finish(){
    if(phase==='finished')return;
    phase='finished';
    saved[sport].played=Math.min(999999,saved[sport].played+1);
    saved[sport].best=Math.max(points,saved[sport].best);
    if(sport==='wrestling'&&points>=3){
      saved.wrestling.careerWins=Math.min(999999,(saved.wrestling.careerWins||0)+1);
    }
    persist();
    const earned=window.JozefWorld?.record?.('multisport',{sport,score:points})||0;
    lastMessage=(points===5?'PERFECT FIVE! ':points>=3?'GREAT GAME! ':'NICE TRY! ')+
      points+' / 5 '+GAMES[sport].unit+'. '+(earned?'+'+earned+' XP EARNED.':'PLAY AGAIN ANYTIME.');
    scene();
    lastResult={sport,score:points};
    if(typeof Event==='function')window.dispatchEvent?.(new Event('jozef:multisport-completed'));
  }
  function canvasAction(event){
    if(phase!=='ready')return;
    if(sport==='hockey'){
      const rect=event.currentTarget?.getBoundingClientRect?.();
      if(!rect||!Number.isFinite(rect.width)||rect.width<=0)return;
      const ratio=(event.clientX-rect.left)/rect.width;
      act(ratio<1/3?'left':ratio<2/3?'centre':'right');
    }else if(sport==='baseball'||sport==='basketball'){
      act('shoot');
    }
  }
  function onKey(e){
    if(!$('sports-arcade')?.classList.contains('active'))return;
    if(e.target?.matches?.('input,textarea,select,[contenteditable]'))return;
    const key=e.key;
    if(e.target===$('multi-action-canvas')&&phase==='ready'&&
      (key==='Enter'||(key===' '&&sport==='hockey'))){
      e.preventDefault?.();act(sport==='hockey'?'centre':'shoot');return;
    }
    if(key==='1'||key==='2'||key==='3'){
      if(sport!=='hockey'&&sport!=='wrestling')return;
      e.preventDefault?.();
      const options=sport==='hockey'?['left','centre','right']:['entrance','pose','teamwork'];
      act(options[Number(key)-1]);
    }else if(key===' '&&(sport==='baseball'||sport==='basketball')){
      e.preventDefault?.();act('shoot');
    }else if(key==='Enter'&&phase==='result'&&e.target===document.body){
      act('next');
    }
  }
  function selectDifficulty(level){
    if(!['rookie','pro','legend'].includes(level)||difficulty===level)return;
    difficulty=level;
    start(sport);
  }
  function nextCupSport(){
    const target=Object.keys(GAMES).find(id=>saved[id].best<3) ||
      Object.keys(GAMES).reduce((lowest,id)=>saved[id].best<saved[lowest].best?id:lowest,'hockey');
    start(target);
    if(typeof window.showSection==='function')window.showSection('sports-arcade');
    window.requestAnimationFrame?.(()=>stageView?.refresh());
    if(GAMES[target].kind==='timing')tick();
  }
  function init(){
    stageView=window.JozefSportStage?.create?.()||null;
    $('multi-action-canvas')?.addEventListener('click',canvasAction);
    $('multi-cup-next')?.addEventListener('click',nextCupSport);
    for(const level of ['rookie','pro','legend'])
      $('multi-difficulty-'+level)?.addEventListener('click',()=>selectDifficulty(level));
    for(const k of Object.keys(GAMES))$('multi-tab-'+k)?.addEventListener('click',()=>start(k));
    document.querySelectorAll('[data-multi-start]')?.forEach(btn=>btn.addEventListener('click',()=>{
      const selected=btn.dataset.multiStart;
      if(!GAMES[selected])return;
      start(selected);
      if(typeof window.showSection==='function')window.showSection('sports-arcade');
      window.requestAnimationFrame?.(()=>stageView?.refresh());
      if(GAMES[selected].kind==='timing')tick();
    }));
    document.addEventListener('keydown',onKey);
    document.querySelector('[data-section="sports-arcade"]')?.addEventListener('click',()=>{
      window.requestAnimationFrame?.(()=>stageView?.refresh());
      if(GAMES[sport].kind==='timing'&&phase==='ready')tick();
    });
    window.addEventListener('pageshow',()=>{paintRecord();if(phase==='ready'&&GAMES[sport].kind==='timing')tick()});
    start('hockey');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
  window.JozefMultiSport=Object.freeze({getProgress:()=>JSON.parse(JSON.stringify(saved)),getCupProgress,getWrestlingCareer,
    getLastResult:()=>lastResult&&{...lastResult},evaluateTiming:accuracy,
    getDifficulty:()=>difficulty,playSport:kind=>{if(!GAMES[kind])return false;start(kind);window.requestAnimationFrame?.(()=>stageView?.refresh());return true}});
})();