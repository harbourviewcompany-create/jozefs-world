/* JOZEF FC // NIGHT STADIUM renderer v2.
   Display only: physics, collisions, scoring, XP and local save data remain in arena.js.
   No textures, fonts or requests are fetched. */
(() => {
'use strict';
const TAU=Math.PI*2;
const clip=(n,a,b)=>Math.max(a,Math.min(b,n));
const circle=(c,x,y,r,fill)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=fill;c.fill()};
const strokeCircle=(c,x,y,r,color,width=1)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.lineWidth=width;c.strokeStyle=color;c.stroke()};
const rounded=(c,x,y,w,h,r,fill)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill()};
function paintStadium(c,s){
 const level=clip(s.stadium||0,0,2);
 const palettes=[
  {grass:'#125342',alt:'#104a3c',light:'#275e4a',fog:'#77ddaa',glow:'#c8ff5a',stand:'#102d35'},
  {grass:'#125565',alt:'#104b5c',light:'#246c71',fog:'#74ecf0',glow:'#7ce9e5',stand:'#112b45'},
  {grass:'#35564d',alt:'#2c5046',light:'#657663',fog:'#f6c56b',glow:'#ffd98e',stand:'#302f3b'}
 ];
 const p=palettes[level];
 c.fillStyle='#071c25';c.fillRect(0,0,420,600);
 // Stadium stand: dark tiered terraces with illuminated spectator pixels.
 c.fillStyle=p.stand;c.fillRect(0,0,420,38);c.fillRect(0,566,420,34);
 for(let row=0;row<2;row++){
  for(let i=0;i<61;i++){
   const x=9+i*6.8,y=6+row*12;
   circle(c,x,y,1.15,(i+row)%9===0?p.glow:(i*7+row)%4===0?'#92b7bd':'#315967');
   circle(c,x,578+row*9,1.12,(i*3+row)%11===0?p.glow:'#41616b');
  }
 }
 // LED ribbon and shadow pitch boundary.
 rounded(c,10,22,400,553,9,'#071719');
 const grass=c.createLinearGradient(0,26,420,578);
 grass.addColorStop(0,p.light);grass.addColorStop(.3,p.grass);grass.addColorStop(1,p.alt);
 rounded(c,15,27,390,546,5,grass);
 c.save();c.beginPath();c.rect(15,27,390,546);c.clip();
 for(let y=30;y<580;y+=56){
  c.fillStyle=y%112===30?'#ffffff0c':'#061a1a12';c.fillRect(15,y,390,56);
 }
 // Fine mowing texture and subtle floodlight reflections. Sparse and deterministic.

 c.strokeStyle='#c6fff508';c.lineWidth=.7;
 for(let x=22;x<405;x+=13){c.beginPath();c.moveTo(x,29);c.lineTo(x-6,574);c.stroke()}
 // Floodlight beams: no image downloads; inexpensive linear gradients.
 const beam=c.createLinearGradient(0,35,420,565);
 beam.addColorStop(0,'#ddffe10d');beam.addColorStop(.38,'#ffffff01');beam.addColorStop(1,'#07111526');
 c.fillStyle=beam;c.fillRect(15,27,390,546);
 // Light pools on the turf make the pitch feel like a lit arena, not a flat graphic.
 const pool=c.createRadialGradient(210,125,10,210,125,290);
 pool.addColorStop(0,'#d7ffd910');
 pool.addColorStop(.63,'#f1ffde05');
 pool.addColorStop(1,'#00000000');
 c.fillStyle=pool;c.fillRect(15,27,390,546);
 c.restore();
 // Stadium pitch markings and technical zones.
 c.strokeStyle='#edfff2aa';c.lineWidth=1.5;
 c.strokeRect(23,33,374,530);
 c.beginPath();c.moveTo(23,298);c.lineTo(397,298);c.stroke();
 strokeCircle(c,210,298,56,'#f4fff1a8',1.7);
 circle(c,210,298,3,'#e9ffee');
 c.strokeRect(119,33,182,100);c.strokeRect(159,33,102,42);
 c.strokeRect(119,463,182,100);c.strokeRect(159,521,102,42);
 circle(c,210,114,3,'#d7ffe1');circle(c,210,482,3,'#d7ffe1');
 c.beginPath();c.arc(210,114,50,.25*Math.PI,.75*Math.PI);c.stroke();
 c.beginPath();c.arc(210,482,50,1.25*Math.PI,1.75*Math.PI);c.stroke();
 // Goal depth, posts and mesh.
 rounded(c,144,12,132,19,2,'#051b20');
 c.strokeStyle='#ddffdf91';c.lineWidth=.65;
 for(let x=150;x<=270;x+=12){c.beginPath();c.moveTo(x,14);c.lineTo(x,33);c.stroke()}
 for(let y=15;y<=33;y+=5){c.beginPath();c.moveTo(145,y);c.lineTo(275,y);c.stroke()}
 c.strokeStyle='#f1ffe6';c.lineWidth=3;
 c.beginPath();c.moveTo(146,34);c.lineTo(146,15);c.lineTo(274,15);c.lineTo(274,34);c.stroke();
 // LED boards and floodlights along the sideline
 c.fillStyle=p.glow;c.fillRect(15,27,390,2);
 c.fillStyle=p.fog+'8a';c.fillRect(15,571,390,2);
 // Glowing touchlines and a restrained spectator glow for depth.
 c.fillStyle='#c0fb8060';c.fillRect(12,28,2,542);c.fillRect(406,28,2,542);
 c.fillStyle='#0a2d2d';c.fillRect(16,578,388,21);
 c.textAlign='center';c.font='900 12px system-ui';c.fillStyle='#c6e9dc';
 c.fillText('JOZEF FC     //     '+(s.venue||'NIGHT STADIUM'),210,592);
 return p;
}
// Painting the static crowd, net, mowing lines and lighting every frame is
// wasteful on iPhones. Cache one retina stadium surface and only redraw actors.
let stadiumCache=null;
function stadium(c,s){
 const venue=String(s.venue||'NIGHT STADIUM'),level=clip(s.stadium||0,0,2);
 const scale=Math.min(2,Math.max(1,Number(window.devicePixelRatio)||1));
 const key=level+'|'+venue+'|'+scale;
 if(stadiumCache?.key===key){
  c.drawImage(stadiumCache.canvas,0,0,420,600);
  return stadiumCache.palette;
 }
 let sheet=null;
 try{
  if(typeof document!=='undefined'&&typeof document.createElement==='function'){
   sheet=document.createElement('canvas');
   sheet.width=Math.round(420*scale);
   sheet.height=Math.round(600*scale);
   const buffer=sheet.getContext('2d');
   if(buffer){
    buffer.scale(scale,scale);
    const palette=paintStadium(buffer,s);
    // drawImage is fast on repeat frames and keeps antialiasing at phone DPR.
    c.drawImage(sheet,0,0,420,600);
    stadiumCache={key,canvas:sheet,palette};
    return palette;
   }
  }
 }catch(_){stadiumCache=null;}
 // Browsers that reject an offscreen buffer still render normally.
 return paintStadium(c,s);
}

let headScale=1;
function athlete(c,x,y,jersey,num,kind,phase,active,moving){
 c.save();c.translate(x,y);
 // Enlarge the captain and ball-carriers so he is recognizable on a phone.
 const scale=kind==='captain'?1.15:active?1.1:kind==='opponent'?1.05:1.04;
 c.scale(scale,scale);
 // Realistic direction and run cycle without affecting hitboxes.
 const bob=moving?Math.sin(phase*13+(x+y)*.02)*1.2:0;
 const stride=moving?Math.sin(phase*13+(x+y)*.02)*3:0;
 c.shadowColor='#00181f';c.shadowBlur=11;
 c.fillStyle='#0010157a';c.beginPath();c.ellipse(0,13,18,6,0,0,TAU);c.fill();
 c.shadowBlur=0;
 if(active){
  circle(c,0,3,27,'#a8ff5b13');
  strokeCircle(c,0,3,23,'#d2ff73e3',2.3);
  strokeCircle(c,0,3,28,'#d2ff735a',1);
 }
 // Legs and boots: angled toward the goal.
 rounded(c,-10,3+stride,8,13,3,'#102a33');
 rounded(c,2,3-stride,8,13,3,'#102a33');
 rounded(c,-10,15+stride,8,4,2,'#f8ffea');
 rounded(c,2,15-stride,8,4,2,'#f8ffea');
 // Kit sleeves and arms under torso.
 rounded(c,-19,-9+bob,9,18,4,jersey);
 rounded(c,10,-9+bob,9,18,4,jersey);
 rounded(c,-16,-3+bob,5,8,3,kind==='opponent'?'#f7bc96':'#d6a882');
 rounded(c,11,-3+bob,5,8,3,kind==='opponent'?'#f7bc96':'#d6a882');
 const g=c.createLinearGradient(-10,-15,11,14);
 g.addColorStop(0,'#ffffff52');g.addColorStop(.4,jersey);g.addColorStop(1,'#001c2733');
 c.beginPath();c.roundRect(-13,-13+bob,26,27,7);
 c.fillStyle=g;c.fill();
 c.strokeStyle='#faffef66';c.lineWidth=1;c.stroke();
 // Shirt striping, collar and readable jersey number.
 c.fillStyle='#ffffff36';c.fillRect(-10,-10+bob,4,19);
 c.fillStyle='#ffffff1b';c.fillRect(6,-10+bob,2,19);
 rounded(c,-6,-13+bob,12,4,2,'#102b2f');
 c.fillStyle='#faffee';c.font='900 12px system-ui';
 c.textAlign='center';c.fillText(String(num),0,7+bob);
 // Head, defined hairline and face direction. Wacky Big Heads scales this one block.
 c.save();
 if(headScale!==1){c.translate(0,-9+bob);c.scale(headScale,headScale);c.translate(0,9-bob);}
 circle(c,0,-18+bob,9,kind==='opponent'?'#dfaa88':'#c99670');
 c.beginPath();c.arc(0,-20+bob,9,Math.PI*1.05,Math.PI*1.98);
 c.fillStyle=kind==='keeper'?'#26373a':'#1b282b';c.fill();
 circle(c,-3,-15+bob,1,'#24312b');
 circle(c,3,-15+bob,1,'#24312b');
 c.restore();
 // Captain insignia and keeper gloves.
 if(kind==='captain'){
  circle(c,15,-11+bob,3,'#cfff66');
  c.fillStyle='#071821';c.font='900 6px system-ui';c.fillText('C',15,-9+bob);
  // A small captain callout separates Jozef from the other numbered shirts.
  rounded(c,-21,-43,42,12,5,'#08272dea');
  c.fillStyle='#d9ff84';c.font='900 9px system-ui';
  c.fillText('JOZEF',0,-34);
 }
 if(kind==='keeper'){
  circle(c,-18,1+bob,4,'#eafffa');circle(c,18,1+bob,4,'#eafffa');
 }
 c.restore();
}
function ball(c,s,phase,motion){
 const b=s.ball||{x:210,y:300,vx:0,vy:0,owner:'free'};
 c.save();
 const ballScale=Number(s.wacky?.ballScale)||1;
 if(ballScale!==1){c.translate(b.x,b.y);c.scale(ballScale,ballScale);c.translate(-b.x,-b.y);}
 const velocity=Math.hypot(b.vx||0,b.vy||0);
 if(motion&&velocity>40&&(b.owner==='shot'||b.owner==='free')){
  const dx=(b.vx||0)/velocity,dy=(b.vy||0)/velocity;
  for(let i=5;i>=1;i--){
   const x=b.x-dx*i*6,y=b.y-dy*i*6;
   circle(c,x,y,Math.max(1,5-i*.55),'rgba(206,255,208,'+(0.05+(6-i)*.045)+')');
  }
 }
 circle(c,b.x+2,b.y+5,9,'#001e206a');
 c.shadowColor='#d4fff4';c.shadowBlur=16;
 circle(c,b.x,b.y,9.2,'#fff9e9');c.shadowBlur=0;
 circle(c,b.x-2,b.y-2,4,'#d0dfdf');
 c.beginPath();c.moveTo(b.x-1,b.y-4);c.lineTo(b.x+4,b.y-1);c.lineTo(b.x+2,b.y+3);
 c.closePath();c.fillStyle='#1c5457';c.fill();
 c.restore();
}
function coinsLayer(c,s,phase){
 for(const coin of (Array.isArray(s.coins)?s.coins:[])){
  const age=Number(coin.age)||0;
  const fade=age>6?Math.max(.2,1-(age-6)/2):1;
  const spin=Math.abs(Math.cos(phase*4+coin.x*.05));
  c.save();c.globalAlpha=fade;
  circle(c,coin.x,coin.y+8,9,'#00000033');
  c.shadowColor='#ffd86b';c.shadowBlur=14;
  c.beginPath();c.ellipse(coin.x,coin.y,5+7*spin,12,0,0,TAU);
  c.fillStyle='#ffd24d';c.fill();c.shadowBlur=0;
  c.lineWidth=2;c.strokeStyle='#fff3b0';c.stroke();
  if(spin>.5){c.fillStyle='#b8860b';c.font='900 11px system-ui';c.textAlign='center';c.fillText('★',coin.x,coin.y+4);}
  c.restore();
 }
}
function ghostRunner(c,g,phase){
 if(!g)return;
 c.save();
 c.globalAlpha=.4;
 athlete(c,g.x,g.y,'#9ad8ff','👻','team',phase,false,true);
 c.restore();
 c.save();
 rounded(c,g.x-30,g.y-45,60,12,5,'#10303bd0');
 c.fillStyle='#bfeaff';c.font='900 8px system-ui';c.textAlign='center';
 c.fillText(String(g.name||'GHOST').slice(0,12),g.x,g.y-36);
 c.restore();
}
function aimLine(c,s){
 const zones=s.shotZones||[];
 const target=zones[s.aim||0]?.x||171;
 const recommended=Number.isInteger(s.advice?.recommendedAim)?s.advice.recommendedAim:-1;
 if(recommended>=0&&recommended!==s.aim&&zones[recommended]){
  const open=zones[recommended].x;
  // Cyan marks a possible clear corner. Jozef still decides the shot.
  strokeCircle(c,open,20,19,'#82f6e8df',2.3);
  strokeCircle(c,open,20,10,'#82f6e890',1.5);
  c.save();c.textAlign='center';c.fillStyle='#c9fff6';
  c.font='900 9px system-ui';c.fillText('OPEN',open,52);
  c.restore();
 }
 strokeCircle(c,target,20,13,recommended>=0?'#ffc184cf':'#f0ffaeaa',2);
 strokeCircle(c,target,20,7,'#c8ff5aaf',1);
 c.strokeStyle='#e5ff8b96';c.lineWidth=1;
 c.beginPath();c.moveTo(target-19,20);c.lineTo(target+19,20);c.moveTo(target,2);c.lineTo(target,38);c.stroke();
 if(s.ball?.owner==='actor'){
  if(s.advice?.kind==='advance'&&s.actor){
   // Two soft upfield chevrons offer a direction at a glance. They are
   // informational only and never change aim or move Jozef automatically.
   c.save();c.strokeStyle='#9cffb69a';c.lineWidth=3;
   for(let i=0;i<2;i++){
    const y=Math.max(72,s.actor.y-52-i*19);
    c.beginPath();c.moveTo(s.actor.x-11,y+7);
    c.lineTo(s.actor.x,y-1);c.lineTo(s.actor.x+11,y+7);c.stroke();
   }
   c.restore();
  }
  c.save();c.setLineDash([4,7]);
  c.strokeStyle=s.advice?.threat?'#ffbd7cc8':'#d5ffb5a0';
  c.lineWidth=s.advice?.threat?2.2:1.5;
  c.beginPath();c.moveTo(s.actor.x,s.actor.y-17);c.lineTo(target,25);c.stroke();
  c.restore();
  // A cyan route appears only if defenders close every shooting lane.
  if(s.advice?.kind==='pass'&&s.mate){
   c.save();c.setLineDash([5,6]);c.strokeStyle='#81f9edbd';c.lineWidth=2;
   c.beginPath();c.moveTo(s.actor.x,s.actor.y);c.lineTo(s.mate.x,s.mate.y);c.stroke();
   strokeCircle(c,s.mate.x,s.mate.y,29,'#8dfde296',1.5);
   c.restore();
  }
 }
}
function fx(c,s,p,phase,motion){
 if(s.ball?.owner==='shot'&&motion){
  const b=s.ball;
  strokeCircle(c,b.x,b.y,12+2*Math.sin(phase*20),p.glow+'9e',1);
 }
 if(s.skillTime>0){
  const a=s.actor,ring=20+s.skillTime*18;
  strokeCircle(c,a.x,a.y,ring,'#d5ff8bb3',2.5);
  if(motion){
   c.strokeStyle='#c8ff5a87';c.lineWidth=3;
   for(let i=0;i<3;i++){c.beginPath();c.moveTo(a.x-15-i*7,a.y+10+i*5);c.lineTo(a.x-29-i*10,a.y+21+i*6);c.stroke()}
  }
 }
 if(s.flash){
  c.fillStyle=s.flash>0?'#c8ff5a2a':'#ff7b7224';c.fillRect(0,0,420,600);
  if(s.flash>0){
   rounded(c,41,239,338,110,12,'#041923de');
   c.textAlign='center';c.fillStyle='#d8ff89';c.font='900 64px Impact,system-ui';
   c.fillText('GOOOAL!',210,294);
   c.font='800 15px system-ui';c.fillStyle='#efffe5';
   c.fillText('JOZEF FC     '+s.us+'  :  '+s.them,210,321);
  }
 }
}
// Readable over the pitch on a 320px phone. Unlike separate page-level text,
// this HUD does not push the playable canvas or controls below the viewport.
function tacticalOverlay(c,s){
 if(s.mode!=='playing'||!s.advice)return;
 const a=s.advice;
 // One-twos already improve shot probability; display the chain explicitly.
 const chain=Math.max(0,Math.min(3,Number(s.passChain)||0));
 if(chain>0&&s.ball?.owner!=='rival'){
  c.save();
  rounded(c,252,52,143,29,8,'#123d3beb');
  c.strokeStyle='#75f4e7a8';c.lineWidth=1;c.strokeRect(253,53,141,27);
  c.textAlign='center';c.font='900 11px system-ui';c.fillStyle='#c0fff3';
  c.fillText('ONE-TWO  ×'+chain,323,70);
  c.restore();
 }
 const y=s.actor?.y<175?512:49;
 c.save();
 // Shift coaching below play whenever Jozef approaches the penalty area.
 rounded(c,23,y,168,47,9,'#061c259d');
 c.strokeStyle=a.kind==='pass'?'#79f0d7a8':a.kind==='defend'?'#ffbf82ae':'#b8f57da2';
 c.lineWidth=1.2;c.strokeRect(24,y+1,166,45);
 rounded(c,30,y+6,32,10,3,'#164e4b');
 c.fillStyle='#ccf8e9';c.font='900 7px system-ui';c.textAlign='center';
 c.fillText('PLAY IQ',46,y+14);
 c.textAlign='left';c.fillStyle=a.kind==='defend'?'#ffdfbd':'#e3ff9e';
 c.font='900 12px system-ui';c.fillText(a.label,31,y+28,154);
 c.font='700 9px system-ui';c.fillStyle='#b4dcd1';
 c.fillText(a.hint,31,y+39,154);
 c.restore();
}
// Stadium-side FLOW indicator stays on the pitch, not below the phone screen.
function flowIndicator(c,s){
 if(s.mode!=='playing')return;
 const value=clip(Number(s.flow)||0,0,100);
 const ready=value>=100;
 c.save();
 rounded(c,232,51,161,44,9,'#061c25bc');
 c.strokeStyle=ready?'#e5ff9bd0':'#89e6cd72';
 c.lineWidth=ready?1.8:1;
 c.strokeRect(233,52,159,42);
 c.textAlign='left';c.font='900 12px system-ui';
 c.fillStyle=ready?'#e7ff9b':'#cbefe5';c.fillText(ready?'FLOW READY':'FLOW',243,67);
 c.textAlign='right';c.fillStyle=ready?'#e6ff8d':'#8edfd1';
 c.font='900 12px system-ui';c.fillText(Math.round(value)+'%',379,67);
 rounded(c,242,76,136,6,3,'#183b3a');
 if(value>0)rounded(c,242,76,136*value/100,6,3,ready?'#dfff6c':'#71dfcf');
 c.restore();
}
function matchScreen(c,s){
 if(s.mode==='playing')return;
 c.save();
 // Floating game-state panel: field and players remain visible at kickoff.
 const x=37,y=231,w=346,h=122;
 rounded(c,x,y,w,h,14,'#061b24ea');
 c.strokeStyle='#b3ff8180';c.lineWidth=1.5;
 c.strokeRect(x+6,y+6,w-12,h-12);
 c.fillStyle='#cafa60';c.fillRect(x+16,y+17,28,3);
 c.fillStyle='#82ebdb';c.fillRect(x+47,y+17,12,3);
 c.textAlign='center';
 c.fillStyle='#e4ff9a';c.font='900 30px Impact,system-ui';
 const heading=s.mode==='ready'?'OWN THE PITCH':s.mode==='paused'?'MATCH PAUSED':'FULL TIME';
 c.fillText(heading,210,y+56);
 c.fillStyle='#e4f7ed';c.font='800 12px system-ui';
 const subtitle=s.mode==='ready'?'MOVE   •   PASS   •   SHOOT':
  s.mode==='paused'?'TAP RESUME TO KEEP PLAYING':s.us+'  :  '+s.them+'   •   PLAY AGAIN';
 c.fillText(subtitle,210,y+85);
 c.restore();
}
function render(c,s){
 headScale=clip(Number(s.wacky?.headScale)||1,1,2.2);
 const club=s.club&&/^#[\da-fA-F]{6}$/.test(s.club.primary)?s.club:null;
 const phase=Math.max(0,Number(s.phase)||0);
 const motion=s.reducedMotion!==true;
 const cam=s.camera||{x:210,y:300,zoom:1};
 const zoom=clip(Number(cam.zoom)||1,1,1.34);
 const boundX=210-210/zoom,boundY=300-300/zoom;
 const focusX=clip(Number(cam.x)||210,210-boundX,210+boundX);
 const focusY=clip(Number(cam.y)||300,300-boundY,300+boundY);
 c.save();
 c.fillStyle='#061e25';c.fillRect(0,0,420,600);
 c.translate(210,300);c.scale(zoom,zoom);c.translate(-focusX,-focusY);
 const p=stadium(c,s);
 aimLine(c,s);
 const defensive=(s.defenders||[]);
 for(let i=0;i<defensive.length;i++){
  const d=defensive[i];
  const carrying=s.ball?.owner==='rival'&&s.rivalCarrier===i;
  if(d.stun>0){
   // A feinted opponent visibly loses balance, without a flashing screen.
   const sway=Math.sin(phase*14+i)*3;
   strokeCircle(c,d.x,d.y,27,'#ffe282d0',2);
   c.fillStyle='#ffe5a0';c.font='900 15px system-ui';c.textAlign='center';
   c.fillText('✦',d.x-12+sway,d.y-38);
   c.fillText('✦',d.x+12-sway,d.y-42);
  }
  strokeCircle(c,d.x,d.y,carrying?29:22,carrying?'#ffd18dda':'#ff9d8764',carrying?3:1);
  if(carrying){
   circle(c,d.x,d.y+2,31,'#ffbe5d1c');
   rounded(c,d.x-31,d.y-47,62,12,6,'#38241fe6');
   c.textAlign='center';c.font='900 8px system-ui';c.fillStyle='#ffe7ae';
   c.fillText('RIVAL BALL',d.x,d.y-38);
  }
  athlete(c,d.x,d.y,'#f2786b',String(i+2),'opponent',phase,carrying,motion&&s.mode==='playing');
 }
 const keeper=s.keeper||{x:210,y:48};
 athlete(c,keeper.x,keeper.y,'#f0b75e','GK','keeper',phase,false,motion&&s.ball?.owner==='shot');
 const lineup=s.squad?.lineup||{};
 const jerseys={rookie:'11',goal:'9',explorer:'7',captain:'10',scholar:'8',super:'11',champion:'99'};
 const number=key=>jerseys[key]||null;
 const ax=s.actor||{x:210,y:495},mate=s.mate||{x:300,y:310};
 athlete(c,210+(ax.x-210)*.12,535,club?club.primary:'#5db6d2',number(lineup.back)||'5','team',phase,false,false);
 athlete(c,210,558,club&&/^#[\da-fA-F]{6}$/.test(club.secondary)?club.secondary:'#e2bd71',number(lineup.keeper)||'1','keeper',phase,false,false);
 if(s.counterTime>0&&s.ball?.owner!=='rival'){
  strokeCircle(c,mate.x,mate.y,30,'#a2fff2ae',2);
  rounded(c,mate.x-27,mate.y-46,54,12,5,'#0c4441ed');
  c.font='900 9px system-ui';c.fillStyle='#bdfff0';c.textAlign='center';
  c.fillText('RUN!',mate.x,mate.y-37);
 }
 athlete(c,mate.x,mate.y,club?club.primary:'#78e8dc',number(lineup.mid||lineup.striker)||'7','team',phase,s.ball?.owner==='mate',motion&&s.mode==='playing');
 const identity=s.identity||{};
 const color=/^#[\da-fA-F]{6}$/.test(identity.kit)?identity.kit:'#c8ff5a';
 const n=Number.isInteger(identity.number)&&identity.number>=1&&identity.number<=99?identity.number:11;
 athlete(c,ax.x,ax.y,color,n,'captain',phase,true,motion&&s.mode==='playing');
 coinsLayer(c,s,phase);
 ghostRunner(c,s.ghost,phase);
 ball(c,s,phase,motion);
 fx(c,s,p,phase,motion);
 c.restore();
 tacticalOverlay(c,s);
 flowIndicator(c,s);
 matchScreen(c,s);
}
window.JozefArenaGraphics=Object.freeze({render});
})();