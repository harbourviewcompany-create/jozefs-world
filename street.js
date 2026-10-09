/* STREET//11 — Jozef FC Night Run. Canvas arcade, keyboard and touch. Private local best. */
(() => {
  'use strict';
  if (window.__jozefStreetBooted) return;
  window.__jozefStreetBooted = true;
  const W=360,H=520,LANES=[72,180,288],DURATION=55;
  const bestKey='jozefs-world-street-best-v1';
  const $=id=>document.getElementById(id);
  const canvas=$('street-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  if(!ctx){$('street-announcement').textContent='This browser does not support the field game.';return;}
  // Scaled independently of layout and high-DPI devices. All simulation values are CSS-pixel game coordinates.
  function resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(W*dpr);
    canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function safeBest(){
    try{return Math.max(0,Math.min(999999,Number(localStorage.getItem(bestKey))||0));}catch(_){return 0;}
  }
  let best=safeBest(),state='ready',lane=1,targetLane=1,playerX=LANES[1],items=[],spawnIn=0,elapsed=0,score=0,hearts=3,combo=0,streak=0,pace=0,frame=0,raf=0,lastTime=0;
  let seed=0;
  function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  function text(id,value){const node=$(id);if(node)node.textContent=String(value);}
  function announce(message){text('street-announcement',message);}
  function updateHUD(){
    text('street-score',score);
    text('street-best',best);
    text('street-hearts','♥'.repeat(hearts)+'♡'.repeat(3-hearts));
    text('street-time',Math.ceil(Math.max(0,DURATION-elapsed)));
    text('street-combo','×'+(1+Math.min(4,Math.floor(combo/3))));
    text('street-stage',pace<1?'UNDERGROUND':pace<2?'CITY LIGHTS':'SUPERSONIC');
  }
  function setPanel(){
    const button=$('street-start');
    if(button)button.textContent=state==='ready'?'START NIGHT RUN →':state==='playing'?'PAUSE RUN':state==='paused'?'RESUME RUN →':'PLAY AGAIN →';
    canvas.setAttribute('aria-label','Night Run soccer game. '+state+'. Score '+score+'. '+hearts+' hearts. Use left and right buttons or arrow keys to change lanes.');
  }
  function newRun(){
    // Secure randomness isn't needed: randomness only determines harmless arcade obstacles.
    seed=(Math.floor(Math.random()*4294967296)||123456789)>>>0;
    state='playing';lane=targetLane=1;playerX=LANES[1];items=[];spawnIn=.32;elapsed=0;score=0;hearts=3;combo=0;streak=0;pace=0;frame=0;lastTime=0;
    announce('Kick-off! Dodge the red defenders. Collect neon stars. You have 55 seconds.');
    updateHUD();setPanel();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }
  function pause(){
    if(state==='playing'){state='paused';cancelAnimationFrame(raf);lastTime=0;announce('Paused. Your run is safe.');}
    else if(state==='paused'){state='playing';lastTime=0;raf=requestAnimationFrame(loop);announce('Back under the lights!');}
    else return;
    setPanel();
  }
  function move(delta){
    if(state!=='playing')return;
    targetLane=clamp(targetLane+delta,0,2);
  }
  function moveTo(next){
    if(state!=='playing')return;
    targetLane=clamp(next,0,2);
  }
  function spawn(){
    const inLane=Math.floor(rand()*3);
    const kind=rand()<.47?'star':'defender';
    items.push({lane:inLane,y:-38,kind,hit:false});
    if(rand()<.16 && kind==='defender'){
      let alternate=(inLane+1+Math.floor(rand()*2))%3;
      items.push({lane:alternate,y:-38,kind:'star',hit:false});
    }
  }
  function finish(){
    if(state!=='playing')return;
    state='over';cancelAnimationFrame(raf);
    if(score>best){
      best=score;
      try{localStorage.setItem(bestKey,String(best));}catch(_){}
    }
    const earned=score>=20;
    if(earned)window.JozefWorld?.record('street',{score});
    const message=hearts===0?'Full-time! Great effort, captain.':
      'Full-time! '+score+' points. The stadium is cheering for you!';
    announce(message+(earned?' XP awarded for your run!':' Try collecting more stars to earn XP.'));
    updateHUD();setPanel();
  }
  function update(dt){
    elapsed+=dt;
    pace=elapsed>=36?2:elapsed>=19?1:0;
    playerX+=(LANES[targetLane]-playerX)*Math.min(1,dt*13);
    if(Math.abs(playerX-LANES[targetLane])<1){playerX=LANES[targetLane];lane=targetLane;}
    spawnIn-=dt;
    if(spawnIn<=0){
      spawn();
      spawnIn=.78-pace*.105+rand()*.26; // At least 0.57 seconds between waves.
    }
    const speed=185+pace*48;
    for(const item of items){
      item.y+=speed*dt;
      if(!item.hit&&Math.abs(item.y-424)<27&&Math.abs(LANES[item.lane]-playerX)<37){
        item.hit=true;
        if(item.kind==='star'){
          combo++;
          const mult=1+Math.min(4,Math.floor(combo/3));
          score+=10*mult;
          streak=.38;
        }else{
          hearts=Math.max(0,hearts-1);combo=0;streak=-.38;
        }
      }else if(!item.hit && item.y>450){
        item.hit=true;
        if(item.kind==='defender'){score+=2;} // Reward successful dodging.
        else combo=0;
      }
    }
    items=items.filter(x=>x.y<560);
    streak+=streak>0?-dt:streak<0?dt:0;
    if(elapsed>=DURATION||hearts===0)finish();
    updateHUD();
  }
  function fillRoundRect(x,y,w,h,r,color){
    ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
  }
  function draw(){
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#062c2a');bg.addColorStop(.55,'#0a5443');bg.addColorStop(1,'#061c28');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // Deep-perspective pitch markings and floodlit sidelines.
    ctx.fillStyle='#b8ff5a0b';ctx.fillRect(20,0,104,H);ctx.fillRect(236,0,104,H);
    ctx.strokeStyle='#a1f8c838';ctx.lineWidth=2;
    for(const x of [18,126,234,342]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    ctx.strokeStyle='#9effbf22';ctx.lineWidth=1.5;
    const offset=(elapsed*180)%82;
    for(let y=-82+offset;y<H;y+=82){ctx.beginPath();ctx.moveTo(18,y);ctx.lineTo(342,y);ctx.stroke();}
    for(let i=0;i<4;i++){
      ctx.fillStyle=['#67f5c4','#ffffffa8'][i%2];
      ctx.fillRect(i%2?344:13,45+i*137,3,28);
    }
    // Draw obstacles with shapes rather than remote image assets.
    for(const it of items){
      const x=LANES[it.lane],y=it.y;
      if(it.kind==='star'){
        ctx.shadowColor='#f9ff80';ctx.shadowBlur=20;
        ctx.fillStyle='#e9ff75';ctx.beginPath();
        for(let i=0;i<10;i++){
          const angle=i*Math.PI/5-Math.PI/2;
          const radius=i%2?10:20;
          const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius;
          if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle='#0a382b';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('+',x,y+4);
      }else{
        ctx.shadowColor='#fc5d5d75';ctx.shadowBlur=14;
        fillRoundRect(x-24,y-26,48,52,15,'#ff5b60');
        fillRoundRect(x-18,y-20,36,16,6,'#581c30');
        ctx.shadowBlur=0;
        ctx.font='bold 23px system-ui';ctx.fillStyle='white';ctx.textAlign='center';
        ctx.fillText('11',x,y+16);
      }
    }
    // Player with field shadow, responsive rotation and kinetic football effect.
    ctx.fillStyle='#020e15aa';ctx.beginPath();ctx.ellipse(playerX,461,34,10,0,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=24;ctx.shadowColor=streak>0?'#eaff6e':'#36fcca';
    fillRoundRect(playerX-23,395,46,58,16,'#d0ff60');
    ctx.shadowBlur=0;
    fillRoundRect(playerX-18,401,36,18,8,'#0a3a39');
    ctx.fillStyle='#072a28';ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.fillText('J',playerX,439);
    ctx.font='32px system-ui';ctx.fillText('⚽',playerX,474);
    if(streak>0){ctx.font='800 16px system-ui';ctx.fillStyle='#fff5b1';ctx.fillText('NICE!',playerX,377);}
    if(streak<0){ctx.font='800 16px system-ui';ctx.fillStyle='#ffb2b5';ctx.fillText('OOPS!',playerX,377);}
    // A tiny framed scoreboard inside the playfield works well on phones.
    fillRoundRect(14,13,150,30,9,'#061c28e6');
    ctx.textAlign='left';ctx.font='800 12px system-ui';ctx.fillStyle='#d4ffd9';
    ctx.fillText(state==='playing'?'● LIVE · STREET//11':state==='paused'?'Ⅱ PAUSED':'◆ NIGHT RUN',25,33);
    if(state!=='playing'){
      ctx.fillStyle='#041520bb';ctx.fillRect(0,140,W,240);
      ctx.textAlign='center';ctx.fillStyle='#eeffce';ctx.font='900 35px system-ui';
      ctx.fillText(state==='ready'?'READY, CAPTAIN?':state==='paused'?'PAUSED':'FULL-TIME',W/2,225);
      ctx.font='600 15px system-ui';ctx.fillStyle='#e2f5f1';
      ctx.fillText(state==='ready'?'Dodge red. Chase neon. Make history.':state==='paused'?'Take your time.':'Tap PLAY AGAIN to beat your record.',W/2,258);
    }
  }
  function loop(now){
    if(state!=='playing')return;
    const dt=lastTime?Math.min(.036,(now-lastTime)/1000):0;
    lastTime=now;
    if(dt>0)update(dt);
    draw();
    if(state==='playing')raf=requestAnimationFrame(loop);
  }
  $('street-start')?.addEventListener('click',()=>{
    if(state==='ready'||state==='over')newRun();else pause();
    if(state!=='playing')draw();
  });
  function steer(id, dir){
    const btn=$(id);
    if(!btn)return;
    btn.addEventListener('pointerdown',event=>{
      event.preventDefault();
      if(state==='ready'||state==='over')newRun();
      move(dir);
    });
  }
  steer('street-left',-1);
  steer('street-right',1);
  canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',event=>{
    event.preventDefault();
    if(state==='ready'||state==='over')newRun();
    const r=canvas.getBoundingClientRect();
    if(r.width<1)return;
    const x=clamp((event.clientX-r.left)/r.width*W,0,W-1);
    moveTo(Math.min(2,Math.floor(x/(W/3))));
  });
  document.addEventListener('keydown',event=>{
    const tag=document.activeElement?.tagName||'';
    if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.getElementById('street')?.classList.contains('active')!==true)return;
    if(['ArrowLeft','a','A'].includes(event.key)){event.preventDefault();move(-1);}
    if(['ArrowRight','d','D'].includes(event.key)){event.preventDefault();move(1);}
    if(event.key==='Escape'&&state==='playing')pause();
    if((event.key===' '||event.key==='Enter')&&document.activeElement===canvas){
      event.preventDefault();if(state==='ready'||state==='over')newRun();else pause();
    }
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'){pause();draw();}});
  window.addEventListener('pagehide',()=>{if(state==='playing')pause();});
  window.JozefStreet=Object.freeze({getProgress:()=>({best,state,score,timeRemaining:Math.ceil(Math.max(0,DURATION-elapsed))})});
  announce('Slide into the night. Switch lanes to grab neon stars and dodge defenders.');
  updateHUD();setPanel();draw();
})();
