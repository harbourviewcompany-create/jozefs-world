/* JOZEF FC // THE CLUB CHRONICLE.
   A one-device, one-club football history and print-ready matchday cover.
   Historical counters are baseline only: never fabricate match dates or results.
   Only actual game completions and observed progression create highlights. */
(() => {
  'use strict';
  const KEY='jozefs-world-chronicle-v1';
  const MAX=40;
  const $=id=>document.getElementById(id);
  const count=x=>Math.min(999999,Math.max(0,Number.isFinite(Number(x))?Math.floor(Number(x)):0));
  const season=x=>Math.max(1,Math.min(99999,count(x)||1));
  const date=x=>{
    const d=new Date(x);
    return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'CLUB EDITION';
  };
  const number=x=>String(count(x)).padStart(2,'0');
  const TYPES=new Set(['arena','street','career','tour','honours','cup']);
  function current(){
    const a=window.JozefArena?.getProgress?.()||{};
    const s=window.JozefStreet?.getProgress?.()||{};
    const c=window.JozefCareer?.getProgress?.()||{};
    const t=window.JozefTour?.getProgress?.()||{};
    const p=window.JozefWorld?.getProgress?.()||{};
    const badges=Array.isArray(p.badges)?p.badges.filter(x=>typeof x==='string'&&x.length<75).slice(0,70):[];
    return {
      games:count(a.games),wins:count(a.wins),goals:count(a.goals),
      career:(season(c.season)-1)*6+count(c.played),careerCups:count(c.cups),
      tour:(season(t.season)-1)*5+count(t.round),tourWins:count(t.wins),tourCups:count(t.cups),
      streetBest:count(s.best),badges,level:Math.max(1,count(p.level)),xp:count(p.xp)
    };
  }
  function clean(data){
    if(!data||typeof data!=='object'||Array.isArray(data))return null;
    return {
      events:Array.isArray(data.events)?data.events.filter(e=>
        e&&typeof e==='object'&&TYPES.has(e.type)&&
        typeof e.title==='string'&&e.title.length<=90&&
        typeof e.story==='string'&&e.story.length<=240&&
        Number.isSafeInteger(e.at)&&e.at>=0
      ).slice(0,MAX).map(e=>({type:e.type,title:e.title,story:e.story,at:e.at})):[],
      seen:data.seen&&typeof data.seen==='object'&&!Array.isArray(data.seen)?data.seen:null
    };
  }
  const prior=(()=>{try{return clean(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(_){return null}})();
  let state=prior||{events:[],seen:null};
  let featured=0;
  const stored=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){/* play and print still work */}};
  function add(type,title,story){
    if(!TYPES.has(type))return;
    state.events.unshift({type,title,story,at:Date.now()});
    state.events=state.events.slice(0,MAX);featured=0;
  }
  function save(){stored();render();}
  const label=(id,value)=>{const n=$(id);if(n)n.textContent=String(value);};
  function archiveLine(item,index){
    const button=document.createElement('button');
    button.type='button';button.className='chronicle-entry'+(index===featured?' is-featured':'');
    button.setAttribute('aria-pressed',String(index===featured));
    const top=document.createElement('span');top.className='chronicle-entry-top';
    top.textContent=item.type.toUpperCase()+' / '+date(item.at);
    const title=document.createElement('strong');title.textContent=item.title;
    const story=document.createElement('small');story.textContent=item.story;
    button.append(top,title,story);
    button.addEventListener('click',()=>{featured=index;render();});
    return button;
  }
  function render(){
    const snap=current();
    label('chronicle-games',snap.games);
    label('chronicle-wins',snap.wins);
    label('chronicle-career',snap.career);
    label('chronicle-tour',snap.tourWins);
    label('chronicle-cover-wins',number(snap.wins)+' WINS');
    label('chronicle-cover-level',number(snap.level));
    const list=$('chronicle-list');
    if(list){
      list.replaceChildren();
      if(!state.events.length){
        const empty=document.createElement('div');empty.className='chronicle-empty';
        const heading=document.createElement('strong');heading.textContent='THE FIRST CHAPTER IS YOURS.';
        const text=document.createElement('p');
        text.textContent='Finish an Arena match or Street run to record your first story. Earlier game progress remains in your club record above.';
        empty.append(heading,text);list.appendChild(empty);
      }else state.events.forEach((event,index)=>list.appendChild(archiveLine(event,index)));
    }
    const chosen=state.events[featured]||state.events[0]||null;
    label('chronicle-cover-category',chosen?'JOZEF FC / '+chosen.type.toUpperCase()+' EDITION':'THE CLUB CHRONICLE / ISSUE 01');
    label('chronicle-cover-headline',chosen?chosen.title:'THE STORY STARTS HERE.');
    label('chronicle-cover-story',chosen?chosen.story:'Every football story begins with a first touch. Play a match to create your first highlight.');
    label('chronicle-cover-date',chosen?date(chosen.at).toUpperCase():'CLUB EDITION');
    const summary=state.events[0];
    const home=$('chronicle-home-summary');
    if(home)home.textContent=summary?'LATEST: '+summary.title+' — '+summary.story:
      snap.games||snap.career||snap.tourWins?'Your story already has '+snap.games+' Arena matches. The next finished game creates a new cover.':
      'The story of Jozef FC is waiting for its first matchday highlight.';
  }
  function sync(){
    const snap=current(),prev=state.seen;
    if(!prev){state.seen=snap;save();return;}
    // Career / Tour rounds are detected from *completed progression* rather
    // than guessing from on-screen fixtures, training or partial match status.
    if(snap.career>count(prev.career)){
      const delta=snap.career-count(prev.career);
      add('career','A NEW CHAPTER IN THE LEAGUE.',delta===1?
        'Jozef FC has completed another Career match. One more page in the club record.':
        'Jozef FC has completed '+delta+' more Career matches since the previous chapter.');
    }
    if(snap.tour>count(prev.tour)){
      const delta=snap.tour-count(prev.tour);
      add('tour','STAMPED. ANOTHER DESTINATION.',delta===1?
        'One more World Tour destination completed. Jozef FC keeps moving forward.':
        delta+' more World Tour destinations completed. The passport is filling up.');
    }
    if(snap.careerCups>count(prev.careerCups)||snap.tourCups>count(prev.tourCups)){
      add('cup','SILVERWARE FOR JOZEF FC.','The club has added a cup to its trophy cabinet. That moment belongs in the Chronicle.');
    }
    const oldBadges=Array.isArray(prev.badges)?prev.badges:[];
    const added=snap.badges.filter(b=>!oldBadges.includes(b));
    if(added.length) add('honours','THE CLUB EARNS NEW HONOURS.',added.length+' new badge'+(added.length===1?'':'s')+' earned. Every bit of progress counts.');
    state.seen=snap;save();
  }
  function finished(kind){
    const snap=current();
    if(!state.seen){state.seen=snap;}
    if(kind==='arena'){
      const detail=window.JozefArena?.getProgress?.()||{};
      // getProgress.score is the official result; never synthesize a score.
      const score=typeof detail.score==='string'&&/^\d{1,3}-\d{1,3}$/.test(detail.score)?detail.score:null;
      const result=score?score.split('-').map(Number):null;
      const outcome=result?(result[0]>result[1]?'VICTORY':result[0]===result[1]?'DRAW':'FULL-TIME'):'FULL-TIME';
      add('arena',outcome+' UNDER THE LIGHTS.',score?'Final score: Jozef FC '+score.replace('-', ' – ')+'. Another match for the history books.':'The Arena match has finished. Another appearance for Jozef FC.');
    }
    if(kind==='street'){
      const detail=window.JozefStreet?.getProgress?.()||{};
      const score=count(detail.score);
      add('street','THE STREETS BELONG TO JOZEF FC.','A STREET//11 run finished with '+score+' points. Keep chasing your best.');
    }
    sync();
  }
  function boot(){
    $('chronicle-print')?.addEventListener('click',()=>{window.print?.()});
    window.addEventListener?.('jozef:arena-completed',()=>finished('arena'));
    window.addEventListener?.('jozef:street-completed',()=>finished('street'));
    window.addEventListener?.('jozef:profile-updated',sync);
    window.addEventListener?.('jozef:chronicle-sync',sync);
    window.addEventListener?.('pageshow',sync);
    document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)sync()});
    if(!state.seen){state.seen=current();stored();}
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
  window.JozefChronicle=Object.freeze({getEntries:()=>state.events.map(e=>({...e}))});
})();