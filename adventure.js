/* Jozef's World / Adventure Circuit. Device-only, offline-first original game. */
(function (root) {
  'use strict';
  const KEY='jozefs-world-adventure-v1';
  const WIDTH=16, HEIGHT=10;
  const WORLDS=[
    {id:'neon',name:'Neon City',tag:'THE FIRST SPARK',sport:'Football',boss:'The Rooftop Keeper',color:'#60f8ea',shadow:'#133e69',unlock:'Neon kit',lore:'Collect energy, activate both beacons, then outsmart the keeper.'},
    {id:'ice',name:'Frost Circuit',tag:'THE ICE CHALLENGE',sport:'Hockey',boss:'The Frost Guardian',color:'#86cbff',shadow:'#143f66',unlock:'Frost kit',lore:'Find the hidden trail through the icy stadium.'},
    {id:'court',name:'Skyline Court',tag:'RISE ABOVE',sport:'Basketball',boss:'The Skyline Captain',color:'#ffc778',shadow:'#56335a',unlock:'Skyline kit',lore:'Restore the neon beacons before the final shot.'},
    {id:'dome',name:'Victory Dome',tag:'MAIN EVENT',sport:'Wrestling',boss:'The Spotlight Champion',color:'#e2a0ff',shadow:'#4e296c',unlock:'Legend kit',lore:'Step into the final spotlight and claim the Circuit Cup.'}
  ];
  const OUTFITS=[
    {id:'classic',name:'Jozef FC',level:0,color:'#c8ff5a',second:'#142e31'},
    {id:'neon',name:'Neon',level:1,color:'#53f0ef',second:'#234f7d'},
    {id:'frost',name:'Frost',level:2,color:'#c1e7ff',second:'#387dc6'},
    {id:'skyline',name:'Skyline',level:3,color:'#ffcc72',second:'#9e4775'},
    {id:'legend',name:'Legend',level:4,color:'#ffdc75',second:'#7939c0'}
  ];
  const STAR_POS=[[3,2],[7,2],[10,5],[12,7],[4,7]];
  const SECRET_POS=[[12,1],[2,7]];
  const SWITCH_POS=[[5,4],[11,6]];
  const BLOCKS=[
    [[4,1],[4,2],[4,3],[7,4],[8,4],[9,4],[6,6],[6,7],[8,7],[10,2]],
    [[3,4],[3,5],[6,2],[7,2],[8,2],[8,5],[8,6],[10,7],[11,3]],
    [[5,2],[5,3],[6,3],[9,1],[9,2],[9,3],[3,6],[4,6],[11,5]],
    [[4,3],[5,3],[6,3],[10,3],[10,4],[10,5],[6,7],[7,7],[8,7]]
  ];
  function pointId(zone,kind,index){return String(zone)+'-'+kind+'-'+String(index)}
  function clampInt(value,min,max){return Number.isInteger(value)?Math.max(min,Math.min(max,value)):min}
  function newState(){return {completed:[],stars:[],secrets:[],switches:[],outfit:'classic',coop:false,zone:0};}
  function sanitize(input){
    const s=newState();
    if(!input||typeof input!=='object'||Array.isArray(input))return s;
    const valid=(arr,kind,max)=>Array.isArray(arr)?[...new Set(arr.filter(x=>typeof x==='string'&&WORLDS.some((_,i)=>Array.from({length:max},(_,j)=>pointId(i,kind,j)).includes(x))))].slice(0,4*max):[];
    s.completed=[...new Set((Array.isArray(input.completed)?input.completed:[]).filter(x=>Number.isInteger(x)&&x>=0&&x<4))].sort();
    s.stars=valid(input.stars,'star',5);
    s.secrets=valid(input.secrets,'secret',2);
    s.switches=valid(input.switches,'switch',2);
    const level=s.completed.length;
    s.outfit=OUTFITS.some(x=>x.id===input.outfit&&x.level<=level)?input.outfit:'classic';
    s.coop=input.coop===true;
    s.zone=clampInt(input.zone,0,Math.min(3,level));
    return s;
  }
  function tileAt(zone,x,y){
    if(x<=0||y<=0||x>=WIDTH-1||y>=HEIGHT-1)return '#';
    if(BLOCKS[zone].some(p=>p[0]===x&&p[1]===y))return '#';
    return '.';
  }
  function canMove(zone,x,y){return tileAt(zone,x,y)!=='#'}
  function earnedCount(state,zone,kind){const name=kind==='stars'?'star':kind==='secrets'?'secret':'switch';return state[kind].filter(k=>k.startsWith(zone+'-'+name+'-')).length}
  function canChallenge(state,zone){return earnedCount(state,zone,'stars')>=2&&earnedCount(state,zone,'switches')===2}
  function bossGuard(zone,round,attempt){return (zone*2+round+attempt+1)%3}
  const api=Object.freeze({KEY,WORLDS,OUTFITS,STAR_POS,SECRET_POS,SWITCH_POS,newState,sanitize,tileAt,canMove,canChallenge,bossGuard,pointId,earnedCount});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document==='undefined')return;
  root.JozefAdventureRules=api;
  const $=id=>document.getElementById(id);
  const canvas=$('jw-adventure-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext&&canvas.getContext('2d');
  let state;
  try{state=sanitize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(_){state=newState()}
  let players=[{x:1,y:1},{x:1,y:2}],active=0,battle=null,frameId=0;
  let toast='Explore the arena. Collect two energy stars and activate both beacons.',soundOff=true;
  const hits=['LEFT','CENTRE','RIGHT'];
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){message('Progress cannot be saved on this device. You can still explore.')}
    root.dispatchEvent&&root.dispatchEvent(new Event('jozef:adventure-updated'));
  }
  function message(value){
    toast=value;
    const node=$('jw-adventure-status');
    if(node)node.textContent=value;
  }
  function resetPlayers(){players=[{x:1,y:1},{x:1,y:2}];active=0;battle=null;}
  function progress(){return {zones:state.completed.length,stars:state.stars.length,secrets:state.secrets.length,coop:state.coop,outfit:state.outfit};}
  function enterZone(index){
    if(!Number.isInteger(index)||index<0||index>=4||index>state.completed.length)return false;
    state.zone=index;resetPlayers();save();render();
    message(WORLDS[index].name+' — '+WORLDS[index].lore);return true;
  }
  function award(kind,i){
    const storage=kind==='star'?'stars':kind==='secret'?'secrets':'switches';
    const id=pointId(state.zone,kind,i);
    if(state[storage].includes(id))return false;
    state[storage].push(id);save();
    if(kind==='secret')message('SECRET DISCOVERED! Hidden emblem '+(earnedCount(state,state.zone,'secrets'))+'/2.');
    if(kind==='star')message('ENERGY STAR FOUND! '+earnedCount(state,state.zone,'stars')+'/5.');
    if(kind==='switch')message('BEACON ACTIVATED! '+earnedCount(state,state.zone,'switches')+'/2.');
    render();return true;
  }
  function at(p,x,y){return p.x===x&&p.y===y}
  function near(p,x,y){return Math.abs(p.x-x)+Math.abs(p.y-y)<=1}
  function pickup(p){
    STAR_POS.forEach((a,i)=>{if(at(p,a[0],a[1]))award('star',i)});
    SECRET_POS.forEach((a,i)=>{if(at(p,a[0],a[1]))award('secret',i)});
    SWITCH_POS.forEach((a,i)=>{if(at(p,a[0],a[1]))award('switch',i)});
    if(at(p,14,8))exitWorld();
    if(at(p,13,7))interact();
  }
  function move(which,dx,dy){
    if(battle)return false;
    if(which===1&&!state.coop)return false;
    if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
    const p=players[which],nx=p.x+dx,ny=p.y+dy;
    if(!canMove(state.zone,nx,ny))return false;
    if(state.coop&&at(players[which===0?1:0],nx,ny))return false;
    p.x=nx;p.y=ny;pickup(p);
    renderHud();return true;
  }
  function exitWorld(){
    if(!state.completed.includes(state.zone)){message('The exit unlocks after you beat the champion.');return false;}
    if(state.zone===3){message('CIRCUIT COMPLETE! All four champions defeated. Your trophy is in your collection.');render();return true;}
    enterZone(state.zone+1);return true;
  }
  function interact(){
    if(battle)return false;
    const p=players[active];
    for(let i=0;i<SWITCH_POS.length;i++){
      if(near(p,SWITCH_POS[i][0],SWITCH_POS[i][1])&&award('switch',i))return true;
    }
    if(near(p,13,7)){
      if(state.completed.includes(state.zone)){message('Champion already beaten. Find the golden portal!');return true;}
      if(!canChallenge(state,state.zone)){message('Collect at least two stars and activate both beacons to challenge the champion.');return true;}
      battle={goals:0,misses:0,round:0,attempt:0,shield:bossGuard(state.zone,0,0)};
      message('CHAMPION SHOWDOWN! Read the shield and pick a different lane.');
      render();return true;
    }
    if(near(p,14,8))return exitWorld();
    message('Find energy stars, glowing beacons or the champion at the far side of the world.');
    return false;
  }
  function shoot(lane){
    if(!battle||!Number.isInteger(lane)||lane<0||lane>2)return false;
    const blocked=lane===battle.shield;
    battle.round++;
    if(blocked)battle.misses++;else battle.goals++;
    if(battle.goals>=3){
      const name=WORLDS[state.zone].name;
      if(!state.completed.includes(state.zone)){state.completed.push(state.zone);state.completed.sort();save();}
      battle=null;message('CHAMPION DEFEATED! '+name+' trophy earned. Enter the portal to continue.');
      if(root.dispatchEvent)root.dispatchEvent(new CustomEvent('jozef:adventure-completed',{detail:{zone:state.zone}}));
    }else if(battle.misses>=3){
      battle=null;message('Great effort! The champion saved three shots. Go to the arena to try again.');
    }else{
      const last=blocked?'SAVED! The champion guarded '+hits[lane]+'. ':'GOAL! Great choice. ';
      battle.shield=bossGuard(state.zone,battle.round,0);
      message(last+'Score '+battle.goals+'/3 before three saves. Shield: '+hits[battle.shield]+'.');
    }
    render();return true;
  }
  function outfit(id){
    const o=OUTFITS.find(x=>x.id===id);
    if(!o||o.level>state.completed.length)return false;
    state.outfit=id;save();render();
    message(o.name+' kit equipped for both Jozef and Dad.');return true;
  }
  function toggleCoop(){
    state.coop=!state.coop;active=0;resetPlayers();save();render();
    message(state.coop?'CO-OP ON: Jozef moves with WASD. Dad uses arrow keys. On mobile, switch players.':'SOLO MODE: use arrows, WASD or the touch pad.');
  }
  function renderHud(){
    const zone=WORLDS[state.zone];
    const stats=$('jw-adventure-stats');
    if(stats)stats.textContent=state.stars.length+'/20 STARS  •  '+state.secrets.length+'/8 SECRETS  •  '+state.completed.length+'/4 CUPS';
    const local=$('jw-adventure-objective');
    if(local)local.textContent=state.completed.includes(state.zone)?'Cup earned. Find the gold portal to travel onward.':
      earnedCount(state,state.zone,'stars')+'/5 energy stars  •  '+earnedCount(state,state.zone,'switches')+'/2 beacons  •  Defeat '+zone.boss;
    const title=$('jw-adventure-zone-title');if(title)title.textContent=zone.name;
    const activeLabel=$('jw-adventure-active');if(activeLabel)activeLabel.textContent=state.coop?(active===0?'Controlling Jozef':'Controlling Dad'):'Solo adventure';
    const switcher=$('jw-adventure-switch');if(switcher){switcher.hidden=!state.coop;switcher.textContent='SWITCH TO '+(active===0?'DAD':'JOZEF');}
    const mode=$('jw-adventure-coop');if(mode){mode.setAttribute('aria-pressed',String(state.coop));mode.textContent=state.coop?'2 PLAYER: ON':'2 PLAYER: OFF';}
  }
  function button(text,css,handler){
    const b=document.createElement('button');b.type='button';b.className=css;b.textContent=text;b.addEventListener('click',handler);return b;
  }
  function render(){
    renderHud();
    const worlds=$('jw-adventure-worlds');
    if(worlds){
      worlds.replaceChildren();
      WORLDS.forEach((w,i)=>{
        const available=i<=state.completed.length,won=state.completed.includes(i);
        const b=button((won?'✓ ':'')+w.name,'jw-adventure-world'+(i===state.zone?' is-active':''),()=>enterZone(i));
        b.disabled=!available;b.setAttribute('aria-current',i===state.zone?'true':'false');
        const small=document.createElement('small');
        small.textContent=!available?'LOCKED':won?'CHAMPION BEATEN':w.sport.toUpperCase();
        b.appendChild(small);worlds.appendChild(b);
      });
    }
    const collection=$('jw-adventure-outfits');
    if(collection){
      collection.replaceChildren();
      OUTFITS.forEach(o=>{
        const available=o.level<=state.completed.length;
        const b=button(o.name+(available?'':' • LOCKED'),'jw-outfit'+(state.outfit===o.id?' is-equipped':''),()=>outfit(o.id));
        b.disabled=!available;b.setAttribute('aria-pressed',String(state.outfit===o.id));
        const chip=document.createElement('span');chip.className='jw-outfit-swatch';chip.style.background='linear-gradient(140deg,'+o.color+','+o.second+')';
        b.prepend(chip);collection.appendChild(b);
      });
    }
    const battlePanel=$('jw-adventure-battle');
    if(battlePanel){
      battlePanel.hidden=!battle;
      const stats=$('jw-adventure-battle-score');
      if(stats)stats.textContent=battle?'GOALS '+battle.goals+'/3  •  SAVES '+battle.misses+'/3':'';
      const shield=$('jw-adventure-shield');
      if(shield)shield.textContent=battle?'CHAMPION SHIELDS '+hits[battle.shield]+' — AIM ELSEWHERE':'';
      document.querySelectorAll('[data-adventure-lane]').forEach(b=>{
        const guarded=Boolean(battle&&Number(b.dataset.adventureLane)===battle.shield);
        b.classList.toggle('is-guarded',guarded);
        b.setAttribute('aria-label',hits[Number(b.dataset.adventureLane)]+(guarded?' — guarded':' — open'));
      });
    }
  }
  function initInput(){
    const keys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D',' ','Enter']);
    document.addEventListener('keydown',e=>{
      if(!$('adventure')?.classList.contains('active')||e.altKey||e.ctrlKey||e.metaKey||e.repeat||!keys.has(e.key))return;
      if(e.target.closest('button,input,select,textarea,dialog'))return;
      if([' ','Enter'].includes(e.key)){e.preventDefault();interact();return;}
      const k=e.key.toLowerCase();
      const id=state.coop&&e.key.startsWith('Arrow')?1:0;
      const directions={arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
      const vector=directions[k];if(vector){e.preventDefault();move(id,vector[0],vector[1]);}
    });
    document.querySelectorAll('[data-adventure-step]').forEach(b=>b.addEventListener('click',()=>{
      const parts=b.dataset.adventureStep.split(',').map(Number);move(active,parts[0],parts[1]);canvas.focus();
    }));
    document.querySelectorAll('[data-adventure-lane]').forEach(b=>b.addEventListener('click',()=>shoot(Number(b.dataset.adventureLane))));
    $('jw-adventure-interact')?.addEventListener('click',()=>{interact();canvas.focus();});
    $('jw-adventure-coop')?.addEventListener('click',toggleCoop);
    $('jw-adventure-switch')?.addEventListener('click',()=>{active=1-active;renderHud();canvas.focus();});
    $('jw-adventure-retry')?.addEventListener('click',()=>{battle=null;resetPlayers();message('World restarted. Your collected stars and progress are safe.');render();});
    $('jw-adventure-canvas')?.addEventListener('click',e=>{
      if(battle)return;
      const rect=canvas.getBoundingClientRect();
      const x=Math.floor((e.clientX-rect.left)/rect.width*WIDTH),y=Math.floor((e.clientY-rect.top)/rect.height*HEIGHT);
      const p=players[active],dx=x-p.x,dy=y-p.y;
      if(Math.abs(dx)+Math.abs(dy)===1)move(active,Math.sign(dx),Math.sign(dy));
      else if(Math.abs(dx)+Math.abs(dy)===0)interact();
      else message('Tap a square next to your player, or use the direction pad.');
    });
    window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{state=sanitize(JSON.parse(e.newValue||'null'));resetPlayers();render();}catch(_){}});
  }
  function rounded(x,y,w,h,r,fill){
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
    else {ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  }
  function draw(t){
    if(!ctx)return;
    const zone=WORLDS[state.zone],w=canvas.width/WIDTH,h=canvas.height/HEIGHT;
    const bg=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    bg.addColorStop(0,zone.shadow);bg.addColorStop(1,'#06131f');
    ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
      const px=x*w,py=y*h,wall=tileAt(state.zone,x,y)==='#';
      if(wall){
        rounded(px+2,py+1,w-4,h-4,8,'#08131f');
        rounded(px+5,py+4,w-10,h-10,7,'#183349');
        ctx.fillStyle=zone.color;ctx.globalAlpha=.1;ctx.fillRect(px+5,py+4,w-10,2);ctx.globalAlpha=1;
      }else{
        ctx.fillStyle=(x+y)%2?'#0a2434':'#102a3a';ctx.fillRect(px+1,py+1,w-2,h-2);
        ctx.fillStyle=zone.color;ctx.globalAlpha=.095;ctx.fillRect(px+1,py+1,w-2,1);ctx.globalAlpha=1;
      }
    }
    const ring=(x,y,r,color,alpha)=>{
      ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc((x+.5)*w,(y+.5)*h,r,0,Math.PI*2);ctx.stroke();ctx.restore();
    };
    const orb=(x,y,color,label,phase)=>{
      const cx=(x+.5)*w,cy=(y+.5)*h+Math.sin(t/450+phase)*3;
      const halo=ctx.createRadialGradient(cx,cy,2,cx,cy,28);
      halo.addColorStop(0,color);halo.addColorStop(1,'transparent');
      ctx.globalAlpha=.32;ctx.fillStyle=halo;ctx.fillRect(cx-30,cy-30,60,60);ctx.globalAlpha=1;
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(cx,cy,12,0,7);ctx.fill();
      ctx.fillStyle='#091522';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,cx,cy+1);
    };
    STAR_POS.forEach((p,i)=>{if(!state.stars.includes(pointId(state.zone,'star',i)))orb(p[0],p[1],'#ffe28a','★',i)});
    SECRET_POS.forEach((p,i)=>{if(!state.secrets.includes(pointId(state.zone,'secret',i))){
      ring(p[0],p[1],9,zone.color,.32+.12*Math.sin(t/900+i));ctx.fillStyle=zone.color;ctx.globalAlpha=.4;ctx.fillRect((p[0]+.5)*w-3,(p[1]+.5)*h-3,6,6);ctx.globalAlpha=1;
    }});
    SWITCH_POS.forEach((p,i)=>{
      const on=state.switches.includes(pointId(state.zone,'switch',i));
      ring(p[0],p[1],19,on?'#c8ff5a':'#f3a95f',.8);
      orb(p[0],p[1],on?'#c8ff5a':'#ffa64f',on?'✓':'!',i);
    });
    orb(13,7,state.completed.includes(state.zone)?'#c8ff5a':'#ef85ff','★',3);
    ring(14,8,23,state.completed.includes(state.zone)?'#ffda68':'#607087',.9);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=state.completed.includes(state.zone)?'#ffda68':'#7a92a4';ctx.font='bold 23px system-ui';ctx.fillText('➜',14.5*w,8.5*h);
    const outfit=OUTFITS.find(o=>o.id===state.outfit)||OUTFITS[0];
    players.forEach((p,i)=>{
      if(i===1&&!state.coop)return;
      const px=(p.x+.5)*w,py=(p.y+.5)*h,primary=i===0?outfit.color:outfit.second;
      ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(px,py+19,18,6,0,0,7);ctx.fill();
      if(state.coop&&i===active)ring(p.x,p.y,24,'#fff',.8);
      rounded(px-17,py-14,34,32,9,primary);
      rounded(px-13,py-14,26,7,5,'#e9bf9e');
      ctx.fillStyle='#e9bf9e';ctx.beginPath();ctx.arc(px,py-18,11,0,7);ctx.fill();
      ctx.fillStyle='#082134';ctx.font='900 16px system-ui';ctx.fillText(i===0?'11':'02',px,py+5);
      rounded(px-13,py+16,10,7,3,'#070e18');rounded(px+4,py+16,10,7,3,'#070e18');
      ctx.fillStyle='#fff';ctx.font='700 9px system-ui';ctx.fillText(i===0?'JOZEF':'DAD',px,py-33);
    });
    if(battle){
      rounded(0,0,canvas.width,canvas.height,0,'rgba(2,9,19,.67)');
      const cx=canvas.width/2,cy=canvas.height/2;
      ring(13,7,26,'#ffb3fa',1);
      ctx.fillStyle='#f7f4fd';ctx.textAlign='center';ctx.font='900 48px system-ui';ctx.fillText('CHAMPION SHOWDOWN',cx,cy-65);
      ctx.font='700 25px system-ui';ctx.fillText('THE SHIELD IS ON '+hits[battle.shield],cx,cy-10);
      ctx.font='700 20px system-ui';ctx.fillStyle='#aaf4dc';ctx.fillText('Choose an open lane below to shoot!',cx,cy+42);
    }
  }
  function animate(t){
    if($('adventure')?.classList.contains('active')&&!document.hidden)draw(t);
    frameId=root.requestAnimationFrame(animate);
  }
  function boot(){
    initInput();render();message(toast);
    if(ctx&&root.requestAnimationFrame)frameId=root.requestAnimationFrame(animate);
    else message('Graphics are unavailable in this browser. The adventure controls and collection still work.');
  }
  root.JozefAdventure=Object.freeze({getProgress:progress,enterZone,move,interact,shoot,equip:outfit,toggleCoop,render});
  boot();
})(typeof window!=='undefined'?window:globalThis);
