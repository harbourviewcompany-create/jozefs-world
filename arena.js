/* JOZEF FC / ARENA: standalone top-down football game. No external APIs. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('arena-canvas');
if(!canvas)return;
const ctx=canvas.getContext('2d');
if(!ctx){$('arena-status').textContent='A newer browser with Canvas support is needed.';return;}
const W=420,H=600,GOAL={left:148,right:272,top:16},MATCH_LENGTH=75;
const KEY='jozefs-world-arena-v1';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const msg=s=>{const t=$('arena-status');if(t)t.textContent=s;};
const put=(id,s)=>{const e=$(id);if(e)e.textContent=String(s);};
const fresh=()=>({games:0,wins:0,draws:0,goals:0,best:0,stadium:0});
function load(){
 try{
  const d=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!d||typeof d!=='object'||Array.isArray(d))return fresh();
  const s=fresh();
  for(const k of Object.keys(s))s[k]=clamp(Number.isFinite(Number(d[k]))?Math.floor(Number(d[k])):0,0,99999);
  return s;
 }catch(_){return fresh();}
}
const lifetime=load();
const venues=[
  {name:'NEIGHBOURHOOD COURT',accent:'#cafa60',need:0,rival:'THE ROOFTOP ROVERS',story:'The neighbourhood knows your name. Earn two wins to unlock the lights of Neon City.'},
  {name:'NEON CITY',accent:'#73f7da',need:2,rival:'MIDNIGHT CITY FC',story:'The city has heard about Jozef. Earn five total victories to enter the Legend Arena.'},
  {name:'LEGEND ARENA',accent:'#ffd180',need:5,rival:'THE NEON ROYALS',story:'The final gates are open. You face the city champions. Keep winning to write your own legend.'}
];
let mode='ready',time=MATCH_LENGTH,us=0,them=0,streak=0,flash=0,last=0,raf=0;
let actor={x:210,y:494},mate={x:298,y:320},ball={x:210,y:482,owner:'actor',vx:0,vy:0};
let defenders=[],keeper={x:210,y:48},keys=new Set(),stick={x:0,y:0},target=null,shotCooldown=0,tackleCooldown=0,passCooldown=0;
const SHOT_ZONES=[{name:'LEFT POST',x:171},{name:'CENTRE',x:210},{name:'RIGHT POST',x:249}];
let aim=0,skillCooldown=0,skillTime=0,keeperDestination=210,keeperReact=0,passRecipient=null,mateTime=0,shots=0,keeperSaves=0,lastHudTick=-1;
function getSquad(){
 const api=window.JozefSquad?.getSquad?.();
 const val=api?.bonuses||{};
 return {
  speed:clamp(Number(val.speed)||0,0,.3),
  pass:clamp(Number(val.pass)||0,0,.3),
  shot:clamp(Number(val.shot)||0,0,.3),
  defence:clamp(Number(val.defence)||0,0,.35),
  keeper:clamp(Number(val.keeper)||0,0,.35),
  lineup:{...(api?.slots||{})},
  tactic:['balanced','attack','defence'].includes(api?.tactic)?api.tactic:'balanced'
 };
}
let squad=getSquad();
function resize(){
 const dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=W*dpr;canvas.height=H*dpr;
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
resize();
function resetPositions(){
 actor={x:210,y:493};mate={x:301,y:310};
 ball={x:actor.x,y:actor.y-14,owner:'actor',vx:0,vy:0};
 defenders=[{x:144,y:260,speed:89},{x:279,y:205,speed:90},{x:204,y:143,speed:82}];
 keeper={x:210,y:48};
 shotCooldown=0;tackleCooldown=1.2;passCooldown=0;passRecipient=null;mateTime=0;
 keeperDestination=210;keeperReact=0;keys.clear();stick={x:0,y:0};target=null;
}
function hud(){
 put('arena-score',us+' : '+them);put('arena-clock',String(Math.ceil(Math.max(0,time))).padStart(2,'0')+'s');
 const venue=venues[Math.min(venues.length-1,lifetime.stadium)];
 put('arena-venue',venue.name);put('arena-rival',venue.rival);put('arena-story',venue.story);
 put('arena-wins',lifetime.wins);put('arena-goals',lifetime.goals);
 put('arena-matches',lifetime.games);put('arena-tactic',squad.tactic.toUpperCase());
 put('arena-shots',shots);put('arena-keeper-saves',keeperSaves);
 put('arena-aim-label',SHOT_ZONES[aim].name);
 put('arena-skill-status',skillCooldown>0?'READY IN '+Math.ceil(skillCooldown)+'s':'SKILL READY');
 const skillButton=$('arena-skill');if(skillButton)skillButton.disabled=mode!=='playing'||skillCooldown>0;
 for(let i=0;i<3;i++){const b=$('arena-aim-'+i);if(b){b.setAttribute('aria-pressed',String(aim===i));b.classList.toggle('selected',aim===i);}}

 const b=$('arena-start');if(b)b.textContent=mode==='ready'?'KICK OFF →':mode==='playing'?'PAUSE':mode==='paused'?'RESUME →':'PLAY AGAIN →';
 canvas.setAttribute('aria-label','Football pitch, '+mode+'. Jozef FC '+us+' to '+them+'. '+Math.ceil(Math.max(0,time))+' seconds. Move with arrow keys or touch controls. Pass with J, shoot with K.');
}
function start(){
 mode='playing';time=MATCH_LENGTH;us=0;them=0;streak=0;flash=0;last=0;
 shots=0;keeperSaves=0;skillCooldown=0;skillTime=0;lastHudTick=-1;
 squad=getSquad();resetPositions();hud();
 msg('KICK OFF! Move, pass to your teammate, and shoot into the top goal.');
 cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function pause(){
 if(mode==='playing'){mode='paused';cancelAnimationFrame(raf);keys.clear();stick={x:0,y:0};last=0;msg('Half-time breather. Your score is safe.');}
 else if(mode==='paused'){mode='playing';last=0;msg('Back on the ball!');raf=requestAnimationFrame(loop);}
 hud();
}
function end(){
 if(mode!=='playing')return;
 mode='over';cancelAnimationFrame(raf);keys.clear();stick={x:0,y:0};
 lifetime.games=Math.min(99999,lifetime.games+1);
 lifetime.goals=Math.min(99999,lifetime.goals+us);
 lifetime.best=Math.max(lifetime.best,us);
 const won=us>them;
 if(won)lifetime.wins=Math.min(99999,lifetime.wins+1);
 else if(us===them)lifetime.draws=Math.min(99999,lifetime.draws+1);
 lifetime.stadium=lifetime.wins>=5?2:lifetime.wins>=2?1:0;
 const unlocked=won&&(lifetime.wins===2||lifetime.wins===5);

 try{localStorage.setItem(KEY,JSON.stringify(lifetime));}catch(_){}
 window.JozefWorld?.record?.('arena',{result:won?'win':us===them?'draw':'loss',goals:us});
 const result=won?'VICTORY!':us===them?'A HARD-FOUGHT DRAW.':'FULL TIME. REMATCH?';
 msg(result+' '+us+'–'+them+'. '+(unlocked?'NEW STADIUM UNLOCKED!':won?'Your club has earned a win!':'Every match builds your skills.'));
 window.dispatchEvent?.(new Event('jozef:progress'));
 hud();draw();
}
function move(deltaX,deltaY,dt){
 const len=Math.hypot(deltaX,deltaY);
 if(len<.1)return;
 const speed=190*(1+squad.speed)*(skillTime>0?1.85:1);
 actor.x=clamp(actor.x+deltaX/Math.max(len,1)*speed*dt,24,396);
 actor.y=clamp(actor.y+deltaY/Math.max(len,1)*speed*dt,102,565);
}
function receive(){
 if(ball.owner!=='free')return;
 if(dist(ball,actor)<25){ball.owner='actor';msg('POSSESSION! Pass or shoot.');}
 else if(dist(ball,mate)<24){ball.owner='mate';msg('Great pass. Your teammate is on the ball!');}
}
function setAim(i){
 if(!Number.isInteger(i)||i<0||i>=SHOT_ZONES.length)return;
 aim=i;hud();
 if(mode==='playing')msg('AIM SET: '+SHOT_ZONES[aim].name+'. Create space, then shoot!');
}
function skillMove(){
 if(mode!=='playing'||skillCooldown>0)return;
 skillCooldown=5.5;skillTime=.66;
 msg('SKILL MOVE! Burst past the press!');
 hud();
}
function pass(){
 if(mode!=='playing'||passCooldown>0)return;
 if(ball.owner!=='actor'&&ball.owner!=='mate'){msg('Recover the ball first!');return;}
 const sender=ball.owner==='actor'?actor:mate;
 const receiver=ball.owner==='actor'?mate:actor;
 const gap=dist(sender,receiver);
 if(gap>345){msg('Your teammate is too far away. Move closer!');return;}
 passRecipient=ball.owner==='actor'?'mate':'actor';
 ball={x:sender.x,y:sender.y-8,vx:0,vy:0,owner:'pass'};
 passCooldown=.48;
 msg(passRecipient==='mate'?'PERFECT WEIGHT! The ball is heading to your teammate.':'ONE-TWO! Jozef is getting the return pass.');
}
function shoot(){
 if(mode!=='playing'||shotCooldown>0)return;
 if(ball.owner!=='actor'&&ball.owner!=='mate'){msg('Get possession first!');return;}
 const p=ball.owner==='mate'?mate:actor;
 // Intentional corner aiming beats random, unstoppable goalkeeper animations.
 // Short-range attempts have tighter accuracy. Squad strength helps long shots.
 const spread=Math.max(0,Math.min(16,(p.y-135)/28))*(1-squad.shot);
 const goalX=SHOT_ZONES[aim].x+(Math.random()-.5)*2*spread;
 const dy=GOAL.top-p.y,dx=goalX-p.x,div=Math.max(1,Math.hypot(dx,dy));
 const power=490+110*squad.shot;
 ball={x:p.x,y:p.y-7,vx:dx/div*power,vy:dy/div*power,owner:'shot'};
 // Keeper has to guess and commit. A save is earned, not guaranteed.
 const rightGuess=Math.random()<(.26+.04*Math.min(5,lifetime.wins));
 keeperDestination=rightGuess?SHOT_ZONES[aim].x:SHOT_ZONES[(aim+1+Math.floor(Math.random()*2))%3].x;
 keeperReact=.16;shotCooldown=.65;mateTime=0;shots++;streak=.45;
 msg('SHOOTING AT THE '+SHOT_ZONES[aim].name+'! '+(p.y>360?'LONG-RANGE STRIKE!':'ONE ON ONE!'));
 hud();
}
function loseBall(){
 if(tackleCooldown>0)return;
 tackleCooldown=1.3;
 // A tackle is not automatically a goal: only some recoveries lead to a scoring counter.
 const teamCover=Math.min(.58,squad.defence*.75+squad.keeper*.9);
 const conceded=Math.random()<Math.max(.08,(actor.y>360?.46:.25)*(1-teamCover));
 if(conceded)them++;
 flash=conceded?-.65:-.18;
 msg(conceded?'RIVALS SCORE ON THE BREAK! RESET AND GO AGAIN.':'YOUR TEAMMATES STOP THE COUNTER! RECOVER YOUR SHAPE!');
 if(them>=4){resetPositions();end();return;}
 resetPositions();
}
function goal(){
 us+=1;flash=.75;msg('GOOOOOAL! JOZEF FC SCORES! '+us+'–'+them);
 if(us>=5){resetPositions();end();return;}
 resetPositions();
}
function update(dt){
 time-=dt;flash=flash>0?Math.max(0,flash-dt):Math.min(0,flash+dt);
 skillCooldown=Math.max(0,skillCooldown-dt);skillTime=Math.max(0,skillTime-dt);
 keeperReact=Math.max(0,keeperReact-dt);
 shotCooldown=Math.max(0,shotCooldown-dt);passCooldown=Math.max(0,passCooldown-dt);
 tackleCooldown=Math.max(0,tackleCooldown-dt);
 let dx=stick.x+(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0);
 let dy=stick.y+(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);
 if(target){
  const td=dist(actor,target);
  if(td>10){dx=target.x-actor.x;dy=target.y-actor.y;}else target=null;
 }
 move(dx,dy,dt);
 if(ball.owner==='actor'){ball.x=actor.x;ball.y=actor.y-15;}
 if(ball.owner==='mate'){ball.x=mate.x;ball.y=mate.y-12;mateTime+=dt;}
 const wanted={x:clamp(actor.x+(squad.tactic==='attack'?24:-35),40,380),y:clamp(actor.y-(squad.tactic==='defence'?105:175),115,495)};
 const dir=dist(wanted,mate);
 if(dir>5){mate.x+=(wanted.x-mate.x)/dir*Math.min(dir,(squad.tactic==='attack'?125:96)*dt);mate.y+=(wanted.y-mate.y)/dir*Math.min(dir,112*dt);}
 // Hold possession long enough for the player to request a return pass.
 // Teammates make a shot of their own after a brief window.
 if(ball.owner==='mate'){
  mate.y=Math.max(138,mate.y-115*dt);
  if(mateTime>1.7&&mate.y<330&&shotCooldown<=0)shoot();
 }
 const leader=ball.owner==='mate'?mate:actor;
 for(const d of defenders){
  const distance=dist(d,leader);
  if(distance>3){
   const movement=Math.min(distance,d.speed*(1+Math.max(0,lifetime.wins)*.035)*dt);
   d.x=clamp(d.x+(leader.x-d.x)/distance*movement,22,398);
   d.y=clamp(d.y+(leader.y-d.y)/distance*movement,80,535);
  }
  if((ball.owner==='actor'||ball.owner==='mate')&&dist(d,leader)<23&&tackleCooldown<=0&&skillTime<=0){
    loseBall();break;
  }
 }
 // The goalkeeper commits toward the chosen post after a realistic reaction delay.
 const keeperAim=ball.owner==='shot'?keeperDestination:210;
 const keeperSpeed=ball.owner==='shot'&&keeperReact<=0?138:ball.owner==='shot'?0:72;
 keeper.x+=clamp(keeperAim-keeper.x,-keeperSpeed*dt,keeperSpeed*dt);
 if(ball.owner==='pass'){
  const receiving=passRecipient==='mate'?mate:actor;
  const remaining=dist(ball,receiving),step=470*(1+squad.pass)*dt;
  if(remaining<=step+17){
   ball.owner=passRecipient;passRecipient=null;mateTime=0;
   ball.x=receiving.x;ball.y=receiving.y-13;
   msg(ball.owner==='mate'?'PASS COMPLETE! Press PASS again for the one-two.':'ONE-TWO COMPLETE! SHOOT!');
  }else{
   ball.x+=(receiving.x-ball.x)/remaining*step;
   ball.y+=(receiving.y-ball.y)/remaining*step;
  }
 }
 if(ball.owner==='shot'||ball.owner==='free'){
  ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
  if(ball.owner==='free'){ball.vx*=Math.max(0,1-1.0*dt);ball.vy*=Math.max(0,1-1.0*dt);receive();}
  if(ball.owner==='shot'&&ball.y<64&&Math.abs(ball.x-keeper.x)<18){
    ball.owner='free';ball.vy=220;ball.vx=ball.x<keeper.x?-85:85;
    keeperSaves++;msg('WHAT A SAVE! FOLLOW UP ON THE REBOUND!');flash=-.22;
  }else if(ball.owner==='shot'&&ball.y<=22){
    if(ball.x>GOAL.left&&ball.x<GOAL.right){goal();return;}
    ball.owner='free';ball.vx=0;ball.vy=150;msg('Just wide! Chase the loose ball.');
  }
  if(ball.x<14||ball.x>406){ball.x=clamp(ball.x,14,406);ball.vx*=-.55;}
  if(ball.y>578){ball.y=578;ball.vy=-90;}
 }
 if(time<=0){time=0;end();return;}
 if(Math.ceil(time*5)!==lastHudTick){lastHudTick=Math.ceil(time*5);hud();}
}
function round(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function player(x,y,color,number){
 ctx.shadowColor=color;ctx.shadowBlur=18;
 round(x-14,y-15,28,31,10,color);ctx.shadowBlur=0;
 ctx.fillStyle='#06171d';ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillText(String(number),x,y+5);
}
function draw(){
 const venue=venues[Math.min(lifetime.stadium,2)];
 const grad=ctx.createLinearGradient(0,0,0,H);
 if(lifetime.stadium>=2){grad.addColorStop(0,'#59442b');grad.addColorStop(.55,'#6a5540');grad.addColorStop(1,'#2b2b33');}
 else if(lifetime.stadium===1){grad.addColorStop(0,'#07435a');grad.addColorStop(.55,'#145b65');grad.addColorStop(1,'#092c45');}
 else{grad.addColorStop(0,'#0a463a');grad.addColorStop(.55,'#105443');grad.addColorStop(1,'#06302b');}
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 for(let y=0;y<H;y+=80){ctx.fillStyle=y%160===0?'#eaffbd09':'#00000006';ctx.fillRect(0,y,W,80);}
 ctx.strokeStyle='#e6ffe763';ctx.lineWidth=2.3;
 ctx.strokeRect(18,20,384,562);
 ctx.beginPath();ctx.moveTo(18,300);ctx.lineTo(402,300);ctx.stroke();
 ctx.beginPath();ctx.arc(210,300,59,0,Math.PI*2);ctx.stroke();
 ctx.strokeRect(110,20,200,115);ctx.strokeRect(151,20,118,43);
 ctx.strokeRect(110,465,200,117);ctx.strokeRect(151,538,118,43);
 round(148,3,124,18,4,'#d3fe77');
 ctx.strokeStyle='#d3fe77';ctx.strokeRect(156,0,108,11);
 ctx.textAlign='center';ctx.fillStyle='#d6f6e9';ctx.font='800 13px system-ui';ctx.fillText('JOZEF FC // '+venue.name,210,593);
 // Defenders, keeper, partner and captain.
 for(const d of defenders)player(d.x,d.y,'#fb8170','X');
 player(keeper.x,48,'#ffca67','GK');
 // The squad Jozef builds is represented on the pitch, not just in menus.
 const shirts={rookie:'11',goal:'9',explorer:'7',captain:'10',scholar:'8',super:'11',champion:'99'};
 const teammateNo=shirts[squad.lineup.mid||squad.lineup.striker]||'7';
 const defenderNo=shirts[squad.lineup.back]||'5';
 const goalkeeperNo=shirts[squad.lineup.keeper]||'1';
 player(210+(actor.x-210)*.12,535,'#7bb9e7',defenderNo);
 player(210,560,'#eec875',goalkeeperNo);
 player(mate.x,mate.y,'#70dceb',teammateNo);
 const identity=window.JozefWorld?.getProgress?.()||{};
 const jersey=/^#[0-9a-fA-F]{6}$/.test(identity.kit)?identity.kit:'#d4fb73';
 const number=Number.isInteger(identity.number)&&identity.number>=1&&identity.number<=99?identity.number:11;
 // Translucent target, speed trail and directional shot preview.
 const targetX=SHOT_ZONES[aim].x;
 ctx.strokeStyle='#edffad88';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(targetX,17,14,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#d9ff8c';ctx.font='800 11px system-ui';ctx.fillText('↓',targetX,34);
 if(ball.owner==='actor'){
   ctx.strokeStyle='#d0ff9580';ctx.setLineDash([5,5]);
   ctx.beginPath();ctx.moveTo(actor.x,actor.y-17);ctx.lineTo(targetX,25);ctx.stroke();ctx.setLineDash([]);
 }
 if(skillTime>0){
   ctx.strokeStyle='#caff91';ctx.lineWidth=3;ctx.beginPath();
   ctx.arc(actor.x,actor.y,25+Math.round(skillTime*8),0,Math.PI*2);ctx.stroke();
 }
 player(actor.x,actor.y,jersey,number);
 ctx.shadowColor=ball.owner==='shot'?'#ffe970':'#c9faff';ctx.shadowBlur=16;
 ctx.beginPath();ctx.arc(ball.x,ball.y,8,0,Math.PI*2);
 ctx.fillStyle='#fffbe5';ctx.fill();ctx.shadowBlur=0;
 ctx.font='11px system-ui';ctx.fillStyle='#173934';ctx.fillText('✦',ball.x,ball.y+4);
 if(flash){
  ctx.fillStyle=flash>0?'#d0ff4450':'#fa353535';ctx.fillRect(0,0,W,H);
  if(flash>0){
   ctx.fillStyle='#e5ffb8';ctx.textAlign='center';
   ctx.font='900 66px Impact,system-ui';ctx.fillText('GOOOAL!',210,290);
   ctx.font='800 17px system-ui';ctx.fillText('JOZEF FC // '+us+'–'+them,210,321);
  }
 }
 if(mode!=='playing'){
  ctx.fillStyle='#061a23cc';ctx.fillRect(15,210,390,166);
  ctx.textAlign='center';ctx.fillStyle='#dcfe92';ctx.font='900 39px Impact,system-ui';
  ctx.fillText(mode==='ready'?'YOUR PITCH. YOUR RULES.':mode==='paused'?'PAUSED':'FULL TIME',210,273);
  ctx.fillStyle='#e6fbf2';ctx.font='700 16px system-ui';
  ctx.fillText(mode==='ready'?'MOVE • PASS • SHOOT':mode==='paused'?'RESUME WHEN READY':us+' : '+them+'  /  PLAY AGAIN',210,312);
 }
}
function loop(t){
 if(mode!=='playing')return;
 if($('arena')?.classList?.contains('active')===false){pause();draw();return;}
 const dt=last?clamp((t-last)/1000,0,.037):0;last=t;
 if(dt)update(dt);
 draw();
 if(mode==='playing')raf=requestAnimationFrame(loop);
}
function bindMove(id,x,y){
 const b=$(id);if(!b)return;
 function down(ev){if(mode!=='playing')return;ev.preventDefault();stick={x,y};if(b.setPointerCapture&&ev.pointerId!=null)b.setPointerCapture(ev.pointerId);}
 function up(){stick={x:0,y:0};}
 b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);
 b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);
 b.addEventListener('click',()=>{if(mode!=='playing')return;move(x,y,.13);});
}
bindMove('arena-up',0,-1);bindMove('arena-down',0,1);bindMove('arena-left',-1,0);bindMove('arena-right',1,0);
for(let i=0;i<3;i++)$('arena-aim-'+i)?.addEventListener('click',()=>setAim(i));
$('arena-skill')?.addEventListener('click',skillMove);
$('arena-pass')?.addEventListener('click',pass);
$('arena-shoot')?.addEventListener('click',shoot);
$('arena-start')?.addEventListener('click',()=>{if(mode==='ready'||mode==='over')start();else pause();if(mode!=='playing')draw();});
canvas.addEventListener('pointerdown',ev=>{
 if(mode!=='playing')return;
 const r=canvas.getBoundingClientRect();if(r.width<1)return;
 target={x:clamp((ev.clientX-r.left)/r.width*W,24,396),y:clamp((ev.clientY-r.top)/r.height*H,102,565)};
});
document.addEventListener('keydown',ev=>{
 if(!$('arena')?.classList.contains('active'))return;
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName||''))return;
 const k=ev.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){ev.preventDefault();keys.add(k.startsWith('arrow')?'Arrow'+k.slice(5)[0].toUpperCase()+k.slice(6):k);target=null;}
 if(['1','2','3'].includes(k)){ev.preventDefault();if(!ev.repeat)setAim(Number(k)-1);}
 if(k==='l'){ev.preventDefault();if(!ev.repeat)skillMove();}
 if(k==='j'){ev.preventDefault();if(!ev.repeat)pass();}
 if(k==='k'){ev.preventDefault();if(!ev.repeat)shoot();}
 if(k==='escape'&&mode==='playing')pause();
});
document.addEventListener('keyup',ev=>{
 const k=ev.key.toLowerCase();
 keys.delete(k.startsWith('arrow')?'Arrow'+k.slice(5)[0].toUpperCase()+k.slice(6):k);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing'){pause();draw();}});
window.addEventListener('pagehide',()=>{if(mode==='playing')pause();});
window.addEventListener('jozef:squad-updated',()=>{squad=getSquad();hud();});
window.JozefArena=Object.freeze({getProgress:()=>({...lifetime,score:us+'-'+them,mode,
  matchGoals:us,opponentGoals:them,shots,saves:keeperSaves,aim:SHOT_ZONES[aim].name,
  playerX:actor.x,playerY:actor.y,ballOwner:ball.owner,skillReady:skillCooldown<=0})});
hud();draw();
})();
