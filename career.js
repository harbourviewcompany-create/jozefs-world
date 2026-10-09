/* Jozef FC Career: child-friendly training, tactical decisions and a six-match league. */
(() => {
  'use strict';
  const KEY='jozefs-world-career-v1';
  const OPPONENTS=[
    ['🇨🇦','Capital City Cubs','Maple Park',1],
    ['🇯🇵','Tokyo Tornadoes','Comet Stadium',2],
    ['🇧🇷','Samba Juniors','Sunshine Arena',2],
    ['🇪🇸','Madrid Meteors','Starfield',3],
    ['🇫🇷','Paris Rockets','Blue Sky Stadium',3],
    ['🇦🇷','Buenos Aires Lions','Champions Park',3]
  ];
  const TRAINING=[
    ['You make 3 passes, then 4 more. How many passes?',['6','7','8'],1,'3 + 4 = 7!'],
    ['You score 2 goals in each of 3 games. How many goals?',['5','6','8'],1,'2 × 3 = 6!'],
    ['There are 11 players per team. How many on both teams?',['20','22','24'],1,'11 + 11 = 22!'],
    ['A match has two 15-minute halves. How long?',['25 minutes','30 minutes','45 minutes'],1,'15 + 15 = 30!'],
    ['You need 10 cones and already have 6. How many more?',['3','4','6'],1,'10 − 6 = 4!'],
    ['Four players take two shots each. How many shots?',['6','8','10'],1,'4 × 2 = 8!']
  ];
  const SCENARIOS=[
    [
      ['attack','Your teammate is free near goal. What helps your team?',['Pass to the open teammate','Shoot from midfield','Run into a defender'],0,'An accurate pass creates a better chance!'],
      ['defence','An opponent runs toward the net. How should you defend?',['Chase the ball from behind','Stay between attacker and goal','Turn around'],1,'Protect the path to the goal.'],
      ['attack','A pass reaches you near the penalty spot. What now?',['Pick up the ball','Aim at the open part of the net','Stop moving'],1,'Look up and find the opening!']
    ],
    [
      ['attack','A defender blocks you. Your winger is free.',['Pass toward the wing','Run into the defender','Kick out of play'],0,'Using the whole field gives you space.'],
      ['defence','The opponent has two teammates close by.',['Ignore the other players','Watch the ball and your mark','Sit down'],1,'Stay aware of the ball and opponents.'],
      ['attack','You have room to run toward goal.',['Make a controlled first touch','Use your hands','Close your eyes'],0,'Good first touches create chances.']
    ],
    [
      ['attack','Your striker runs into space.',['Wait until it is too late','Play a well-timed pass','Kick backwards every time'],1,'A through pass opens up the defence!'],
      ['defence','A rival takes a shot.',['Get goal-side and block safely','Push the attacker','Run off the pitch'],0,'Stay balanced and defend safely.'],
      ['attack','You receive the ball on the wing.',['Cross to an open teammate','Hide the ball','Stop moving'],0,'A pass across goal creates a shot.']
    ],
    [
      ['attack','Your team has many players moving.',['Keep your head down','Pass and move into space','Stand still'],1,'Passing and moving is powerful teamwork!'],
      ['defence','A rival is dribbling toward you.',['Stay balanced and guide them wide','Dive in with two feet','Ignore the ball'],0,'Balanced footwork is the safer choice.'],
      ['attack','Your team wins the ball in midfield.',['Spread out and support the attack','Crowd around the ball','Forget positions'],0,'Good spacing makes chances.']
    ],
    [
      ['attack','The keeper leans left. Where should you aim?',['Right side','Left side','At the keeper'],0,'Shoot away from the keeper!'],
      ['defence','Your keeper catches the ball.',['Move into space for a pass','Stay behind goal','Take the ball from them'],0,'Give your keeper a safe passing option.'],
      ['attack','Your teammate is closer to an open goal.',['Pass to your teammate','Try an impossible shot','Kick into touch'],0,'Excellent teammates share chances.']
    ],
    [
      ['attack','The final begins! What is the smart first choice?',['Stay calm and pass into space','Rush without looking','Always shoot from halfway'],0,'Cool heads and smart passing work.'],
      ['defence','Your team faces late pressure.',['Push opponents','Communicate and stay in formation','All become strikers'],1,'Team communication makes strong defence.'],
      ['attack','Your teammate crosses the ball to you.',['Use the opening to shoot','Turn away','Leave the ball'],0,'Meet the cross and aim at goal!']
    ]
  ];
  const byId=id=>document.getElementById(id);
  const txt=(id,v)=>{const node=byId(id);if(node)node.textContent=String(v)};
  const blank=()=>({season:1,results:[],match:null,cups:0});
  function load(){
    let v;try{v=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){}
    if(!v||typeof v!=='object'||Array.isArray(v))return blank();
    const s={...blank(),...v};
    s.season=Number.isInteger(s.season)&&s.season>=1&&s.season<=99999?s.season:1;
    s.cups=Number.isInteger(s.cups)&&s.cups>=0&&s.cups<=99999?s.cups:0;
    if(!Array.isArray(s.results))s.results=[];
    s.results=s.results.slice(0,6).filter(r=>r&&['win','draw','loss'].includes(r.outcome)
      &&Number.isInteger(r.us)&&Number.isInteger(r.them)&&r.us>=0&&r.them>=0&&r.us<=3&&r.them<=3);
    const m=s.match;
    if(s.results.length===6||!m||!['train','play','feedback'].includes(m.stage)||
       !Array.isArray(m.answers)||m.answers.length>3||m.answers.some(x=>!Number.isInteger(x)||x<0||x>2)||
       ![null,true,false].includes(m.trained))s.match=null;
    else {
      if(m.stage==='train')m.answers=[];
      if(m.stage==='play'&&m.answers.length>=3)m.stage='feedback';
    }
    return s;
  }
  const state=load();
  const round=()=>state.results.length;
  const points=()=>state.results.reduce((total,r)=>total+(r.outcome==='win'?3:r.outcome==='draw'?1:0),0);
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){txt('career-save','This browser cannot save your progress. You can still play.')}}
  function reward(action,index,result){window.JozefWorld?.record(action,{winId:'season-'+state.season+'-round-'+index,result})}
  function begin(){
    if(round()===6||state.match)return;
    state.match={stage:'train',trained:null,answers:[]};
    save();render();
  }
  function train(choice){
    const m=state.match;
    if(!m||m.stage!=='train'||choice<0||choice>2)return;
    m.trained=choice===TRAINING[round()][2];
    m.stage='play';save();
    if(m.trained)reward('training',round(),'correct');
    render();
    txt('career-status',m.trained?'Well done! You earned a training shield.':'Good try! You can still score with clever choices.');
  }
  function choose(choice){
    const m=state.match;
    if(!m||m.stage!=='play'||m.answers.length>=3||choice<0||choice>2)return;
    m.answers.push(choice);
    m.stage='feedback';save();render();
  }
  function advance(){
    const m=state.match;
    if(!m||m.stage!=='feedback')return;
    if(m.answers.length<3){m.stage='play';save();render();return}
    let us=0,blocked=0;
    m.answers.forEach((picked,i)=>{
      const q=SCENARIOS[round()][i];
      if(picked===q[3]){if(q[0]==='attack')us++;else blocked++}
    });
    const them=Math.max(0,OPPONENTS[round()][3]-blocked-(m.trained?1:0));
    const outcome=us>them?'win':us===them?'draw':'loss';
    const index=round();
    state.results.push({us,them,outcome});
    state.match=null;
    if(round()===6&&points()>=12)state.cups++;
    save(); // Canonical state before XP; XP awards are deduplicated by match ID.
    reward('career',index,outcome);
    if(round()===6&&points()>=12)reward('leaguechamp',5,'win');
    render();
  }
  function restartSeason(){
    if(round()!==6||state.season>=99999)return;
    state.season++;state.results=[];state.match=null;save();render();
  }
  function button(label,fn,className='career-choice'){
    const e=document.createElement('button');e.type='button';e.textContent=label;e.className=className;e.addEventListener('click',fn);return e;
  }
  function answers(question,fn){
    const host=byId('career-choices');if(!host)return;
    host.replaceChildren();
    question[1].forEach((v,i)=>host.appendChild(button(v,()=>fn(i))));
  }
  function fixtureList(){
    const host=byId('career-fixtures');if(!host)return;
    host.replaceChildren();
    OPPONENTS.forEach((team,i)=>{
      const result=state.results[i];
      const item=document.createElement('div');
      item.className='career-fixture'+(result?' complete':i===round()?' current':'');
      const flag=document.createElement('span');flag.className='career-flag';flag.textContent=team[0];
      const details=document.createElement('div');
      const title=document.createElement('strong');title.textContent=team[1];
      const note=document.createElement('small');note.textContent=result?(result.us+'–'+result.them+' · '+result.outcome.toUpperCase()):i===round()?'Up next':'Locked until match '+(i+1);
      details.append(title,note);
      const marker=document.createElement('span');marker.className='career-marker';
      marker.textContent=result?result.outcome==='win'?'W':result.outcome==='draw'?'D':'L':i===round()?'●':'🔒';
      item.append(flag,details,marker);host.appendChild(item);
    });
  }
  function renderField(){
    const r=round(), m=state.match;
    const last=state.results.at(-1);
    let scored=0,blocks=0;
    if(m&&r<6){
      m.answers.forEach((pick,i)=>{
        const q=SCENARIOS[r][i];
        if(pick===q[3]){if(q[0]==='attack')scored++;else blocks++;}
      });
    }
    const score = m
      ? scored+' – '+Math.max(0,OPPONENTS[r][3]-blocks-(m.trained?1:0))
      : last ? last.us+' – '+last.them : '0 – 0';
    txt('career-field-score',score);
    let scene = 'kickoff';
    if(m?.stage==='train')scene='training';
    if(m?.stage==='play')scene=SCENARIOS[r][m.answers.length]?.[0]||'attack';
    if(m?.stage==='feedback')scene=SCENARIOS[r][m.answers.length-1]?.[0]||'attack';
    if(r===6)scene='final';
    const pitch=byId('career-field');
    if(pitch?.setAttribute)pitch.setAttribute('data-scene',scene);
    const ball=byId('career-field-ball');
    if(ball){
      const lastPick=m?.answers.length?m.answers[m.answers.length-1]:null;
      const lastQuestion=m?.answers.length?SCENARIOS[r][m.answers.length-1]:null;
      const success=m?.stage==='feedback'&&lastQuestion&&lastPick===lastQuestion[3];
      ball.className='career-field-ball'+(success?' career-field-success':'');
    }
    txt('career-field-status',m?.stage==='train'?'Warm-up: train with soccer maths':
      m?.stage==='play'?'Choose the smartest play to move the ball':
      m?.stage==='feedback'?'Coach is reviewing the last play':
      r===6?'Season finished — see your league results':'Ready for the next match');
  }
  function render(){
    const r=round(),m=state.match,done=r===6;
    txt('career-season',state.season);txt('career-points',points());
    txt('career-record',state.results.filter(x=>x.outcome==='win').length+'W · '+state.results.filter(x=>x.outcome==='draw').length+'D · '+state.results.filter(x=>x.outcome==='loss').length+'L');
    txt('career-match-num',Math.min(r+1,6));txt('career-cups',state.cups);
    txt('career-opponent',done?'Season complete':OPPONENTS[r][1]);
    txt('career-opponent-flag',done?'🏆':OPPONENTS[r][0]);
    txt('career-venue',done?'Trophy Ceremony':OPPONENTS[r][2]);
    txt('career-training',m?m.trained===true?'✓ Shield earned':m.trained===false?'No shield this match':'Training available':'Train before kickoff');
    fixtureList();
    renderField();
    const panel=byId('career-question-panel'),controls=byId('career-controls'),choices=byId('career-choices');
    if(panel)panel.hidden=!m;
    if(controls)controls.replaceChildren();
    if(choices)choices.replaceChildren();
    txt('career-status','');
    if(done){
      txt('career-question-label','SEASON COMPLETE');
      txt('career-result-title',points()>=12?'🏆 League Champions!':'⭐ Great season!');
      txt('career-result-message',points()>=12?'You earned '+points()+' points and lifted the league trophy!':'You earned '+points()+' points. Aim for 12 next season to win the trophy!');
      const result=byId('career-result');if(result)result.hidden=false;
      if(controls)controls.appendChild(button('Play another season →',restartSeason,'career-primary'));
      return;
    }
    const result=byId('career-result');if(result)result.hidden=true;
    if(!m){
      if(controls)controls.appendChild(button('Kick off match '+(r+1)+' →',begin,'career-primary'));return;
    }
    if(m.stage==='train'){
      const q=TRAINING[r];txt('career-question-label','TRAINING DRILL · SOCCER MATHS');txt('career-question',q[0]);
      answers([null,q[1]],train);return;
    }
    if(m.stage==='play'){
      const q=SCENARIOS[r][m.answers.length];
      txt('career-question-label','PLAY '+(m.answers.length+1)+' / 3 · '+q[0].toUpperCase());
      txt('career-question',q[1]);
      answers([null,q[2]],choose);return;
    }
    const i=m.answers.length-1,q=SCENARIOS[r][i],correct=q[3]===m.answers[i];
    txt('career-question-label','COACH FEEDBACK');
    txt('career-question',(correct?'Great decision! ':'Learning moment! ')+q[4]);
    if(controls)controls.appendChild(button(m.answers.length===3?'Final whistle →':'Next play →',advance,'career-primary'));
  }
  // Reconcile saved matches in case a refresh occurred between saving a score and granting XP.
  state.results.forEach((result,i)=>reward('career',i,result.outcome));
  if(round()===6&&points()>=12)reward('leaguechamp',5,'win');
  render();
  window.JozefCareer=Object.freeze({getProgress:()=>({season:state.season,played:round(),points:points(),cups:state.cups})});
})();
