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
  const CHALLENGES=[
    {cue:'THE CROWD WANTS A HUGE ENTRANCE!',answer:0,remark:'THE LIGHTS HIT. THE CROWD ROARS!'},
    {cue:'IT IS TIME FOR YOUR SIGNATURE POSE!',answer:1,remark:'THAT IS THE POSE EVERYONE CAME TO SEE!'},
    {cue:'YOUR TAG-TEAM PARTNER NEEDS A HIGH FIVE!',answer:2,remark:'TEAMWORK BRINGS THE HOUSE DOWN!'},
    {cue:'THE ARENA LIGHTS ARE ON YOU!',answer:0,remark:'THE ENTRANCE IS LEGENDARY!'},
    {cue:'YOUR FINAL CELEBRATION BEGINS!',answer:1,remark:'THE WHOLE STADIUM CHEERS!'}
  ];
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const valid=(v)=>Number.isSafeInteger(v)&&v>=0&&v<=999999;
  function fresh(){return Object.fromEntries(Object.keys(GAMES).map(sport=>[sport,{played:0,best:0}]));}
  function load(){
    let input;
    try{input=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){}
    const out=fresh();
    for(const sport of Object.keys(GAMES)){
      const row=input?.[sport]||{};
      if(valid(row.played))out[sport].played=row.played;
      if(valid(row.best))out[sport].best=Math.min(GAMES[sport].rounds,row.best);
    }
    return out;
  }
  let saved=load(),sport='hockey',round=0,points=0,phase='ready',turnStart=0,raf=0,indicator=50,lastMessage='',lastResult=null;
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
  const accuracy=(kind,pos)=>kind==='baseball'?Math.abs(pos-55)<=17:Math.abs(pos-55)<=12;
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
      controls.append(button('1 / ENTRANCE','entrance'),button('2 / SIGNATURE POSE','pose'),button('3 / TEAMWORK','teamwork'));
    }else{
      controls.append(button(sport==='baseball'?'SWING BAT ↗':'RELEASE SHOT ↗','shoot','multi-primary'));
    }
  }
  function scene(){
    const config=GAMES[sport];
    const box=$('multi-stage');
    if(box)box.dataset.sport=sport;
    label('multi-name',config.label);
    label('multi-round',phase==='finished'?'FULL TIME':(round+1)+' / '+config.rounds);
    label('multi-score',points+' / '+config.rounds+' '+config.unit);
    label('multi-stage-label',sport==='hockey'?'AIM FOR THE OPEN CORNER':sport==='baseball'?'TIME YOUR SWING':sport==='basketball'?'RELEASE NEAR THE SWEET SPOT':'THE SHOW MUST GO ON');
    label('multi-scene-text',sport==='hockey'?'':sport==='baseball'?'BATTER UP':sport==='basketball'?'FROM DOWNTOWN':'LIGHTS • CAMERA • ACTION');
    setHidden('multi-timing',GAMES[sport].kind!=='timing');
    const active=phase!=='finished'&&phase!=='result';
    let prompt=lastMessage;
    if(!prompt){
      prompt=sport==='hockey'?'Choose LEFT, CENTRE or RIGHT to beat the keeper.':
      sport==='baseball'?'Press SWING when the marker crosses the centre zone.':
      sport==='basketball'?'Release when the marker is near the centre zone.':
      CHALLENGES[round].cue;
    }
    label('multi-message',prompt);
    const stage=$('multi-stage');
    stage?.classList.toggle('multi-finished',phase==='finished');
    stage?.classList.toggle('multi-result',phase==='result');
    label('multi-keyhelp',sport==='hockey'||sport==='wrestling'?'Use 1, 2, 3 or tap a choice.':'Use SPACE or tap the action button.');
    const instructions=$('multi-instructions');
    if(instructions)instructions.textContent=sport==='wrestling'?'An original, pretend sports-entertainment show inspired by televised wrestling. No real fighting or risky moves.':
      'Five turns. Have fun and chase your own personal best. No penalties for missing.';
    paintRecord();
    drawControls();
    if(active&&config.kind==='timing')tick();
    else stopTick();
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
    sport=kind;round=0;points=0;phase='ready';turnStart=Date.now();lastMessage='';
    scene();
  }
  function act(choice){
    if(choice==='again'){start(sport);return}
    if(choice==='next'&&phase==='result'){
      if(round>=GAMES[sport].rounds){finish();return}
      lastMessage='';phase='ready';turnStart=Date.now();
      scene();return;
    }
    if(phase!=='ready')return;
    let made=false,remark='';
    if(sport==='hockey'){
      if(!['left','centre','right'].includes(choice))return;
      const goalie=['left','centre','right'][Math.floor(Math.random()*3)];
      made=goalie!==choice;
      remark=made?'GOAL! THE PUCK FINDS THE '+choice.toUpperCase()+' CORNER.':'BIG SAVE! THE KEEPER WAS READY IN '+goalie.toUpperCase()+'.';
    }else if(sport==='baseball'||sport==='basketball'){
      if(choice!=='shoot')return;
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      // Reduced motion uses untimed accessible attempts, no moving target.
      const pos=reduced?50:position(Date.now()-turnStart,sport);
      made=reduced?Math.random()<.75:accuracy(sport,pos);
      remark=made?(sport==='baseball'?'CRACK! THAT IS A CLEAN BASE HIT!':'SWISH! NOTHING BUT NET!'):
        (sport==='baseball'?'FOUL BALL! NEXT PITCH!':'OFF THE RIM! KEEP SHOOTING!');
    }else if(sport==='wrestling'){
      if(!['entrance','pose','teamwork'].includes(choice))return;
      const needed=['entrance','pose','teamwork'][CHALLENGES[round].answer];
      made=choice===needed;
      remark=made?CHALLENGES[round].remark:'THE CROWD WANTS A DIFFERENT MOMENT. NEXT ROUND!';
    }
    if(made)points++;
    round++;phase='result';lastMessage=remark;
    scene();
  }
  function finish(){
    if(phase==='finished')return;
    phase='finished';
    saved[sport].played=Math.min(999999,saved[sport].played+1);
    saved[sport].best=Math.max(points,saved[sport].best);
    persist();
    const earned=window.JozefWorld?.record?.('multisport',{sport,score:points})||0;
    lastMessage=(points===5?'PERFECT FIVE! ':points>=3?'GREAT GAME! ':'NICE TRY! ')+
      points+' / 5 '+GAMES[sport].unit+'. '+(earned?'+'+earned+' XP EARNED.':'PLAY AGAIN ANYTIME.');
    scene();
    lastResult={sport,score:points};
    if(typeof Event==='function')window.dispatchEvent?.(new Event('jozef:multisport-completed'));
  }
  function onKey(e){
    if(!$('sports-arcade')?.classList.contains('active'))return;
    if(e.target?.matches?.('input,textarea,select,[contenteditable]'))return;
    const key=e.key;
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
  function init(){
    for(const k of Object.keys(GAMES))$('multi-tab-'+k)?.addEventListener('click',()=>start(k));
    document.querySelectorAll('[data-multi-start]')?.forEach(btn=>btn.addEventListener('click',()=>{
      const selected=btn.dataset.multiStart;
      if(!GAMES[selected])return;
      start(selected);
      if(typeof window.showSection==='function')window.showSection('sports-arcade');
      if(GAMES[selected].kind==='timing')tick();
    }));
    document.addEventListener('keydown',onKey);
    document.querySelector('[data-section="sports-arcade"]')?.addEventListener('click',()=>{
      if(GAMES[sport].kind==='timing'&&phase==='ready')tick();
    });
    window.addEventListener('pageshow',()=>{paintRecord();if(phase==='ready'&&GAMES[sport].kind==='timing')tick()});
    start('hockey');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
  window.JozefMultiSport=Object.freeze({getProgress:()=>JSON.parse(JSON.stringify(saved)),getLastResult:()=>lastResult&&{...lastResult},evaluateTiming:accuracy});
})();