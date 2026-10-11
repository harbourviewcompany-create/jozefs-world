import Phaser from 'phaser';
import './style.css';
import {SPORTS,ROUNDS,resolveAttempt,readRecords,saveGame,recordHighlight,clamp} from './rules';
import type {Sport,Aim} from './rules';
import {StreetScene,setStreetSound} from './street';

const W=960,H=540;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T|null;
const label=(id:string,t:string)=>{const n=$(id);if(n)n.textContent=t};
const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
const THEME:Record<Sport,{name:string,color:number,coach:string}>={
 football:{name:'FOOTBALL SHOWDOWN',color:0xcdfa6f,coach:'Read the goalkeeper. Pick an open corner and write your next highlight.'},
 hockey:{name:'HOCKEY SHOOTOUT',color:0x7aeeff,coach:'Watch the moving keeper. Fire your puck toward an open corner.'},
 basketball:{name:'HOOPS / DOWNTOWN',color:0xffab68,coach:'Time your release as the moving power marker reaches the middle.'},
 baseball:{name:'BASEBALL / BIG LEAGUE',color:0xffd099,coach:'A big hit takes timing. Swing when the marker reaches the sweet spot.'},
 wrestling:{name:'WRESTLING / SHOWTIME',color:0xc6a9ff,coach:'Original, non-contact showmanship and WWE fan trivia. Make the crowd cheer.'}
};
const SHOW=[
 {cue:'THE CROWD NEEDS A SUPERSTAR ENTRANCE!',choices:['ENTRANCE','WALK AWAY','HIDE'],answer:0 as Aim},
 {cue:'THE SPOTLIGHT IS ON YOUR TEAM!',choices:['LOOK AWAY','SIGNATURE POSE','HIDE'],answer:1 as Aim},
 {cue:'YOUR TAG TEAM PARTNER IS CELEBRATING!',choices:['IGNORE','WALK OFF','HIGH FIVE'],answer:2 as Aim},
 {cue:"WWE TRIVIA: WHO SAYS 'YOU CAN'T SEE ME'?",choices:['JOHN CENA','CODY RHODES','REY MYSTERIO'],answer:0 as Aim},
 {cue:'THE FINAL MOMENT NEEDS THE PERFECT POSE!',choices:['WALK OFF','TEAM POSE','TURN AWAY'],answer:1 as Aim}
];
let street:StreetScene|null=null;
let mode:Sport='football',aim:Aim=1,gameScene:PrimeScene|null=null,sound=false,ctx:AudioContext|null=null;
const selects=[...document.querySelectorAll<HTMLButtonElement>('[data-aim]')];
const modes=[...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
const FOOTBALL='jozefs-world-prime-football-v1';
function footballBest():number{
 try{const x=JSON.parse(localStorage.getItem(FOOTBALL)||'0');return Number.isSafeInteger(x)?clamp(x,0,5):0}catch{return 0}
}
function setAim(next:number){
 aim=clamp(next,0,2) as Aim;
 selects.forEach((el,i)=>{el.classList.toggle('selected',i===aim);el.setAttribute('aria-pressed',String(i===aim))});
}
function reflectMode(){
 const t=THEME[mode];
 label('event-name',t.name);label('coach',t.coach);label('objective','SCORE THREE OF FIVE');
 modes.forEach(el=>{const on=el.dataset.mode===mode;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on))});
 selects.forEach((el,i)=>el.textContent=mode==='wrestling'?(i+1)+' / '+SHOW[gameScene?.round||0].choices[i]:
    (i+1)+' / '+['LEFT','CENTRE','RIGHT'][i]);
 setAim(1);
 label('live-caption',mode==='wrestling'?SHOW[0].cue:'THE MOMENT IS YOURS.');
}
function paintRecords(){
 const saved=readRecords(localStorage);const records=$('records-body');
 if(!records)return;
 const list:[string,number][]=[
  ['FOOTBALL',footballBest()],['HOCKEY',saved.hockey.best],
  ['BASKETBALL',saved.basketball.best],['BASEBALL',saved.baseball.best],['WRESTLING',saved.wrestling.best]];
 records.replaceChildren();
 for(const [name,best] of list){
  const row=document.createElement('div');row.className='record-row';
  const n=document.createElement('span'),v=document.createElement('strong');
  n.textContent=name;v.textContent=best+' / 5';row.append(n,v);records.append(row);
 }
}
function ui(round:number,points:number,history:boolean[],busy=false){
 label('round',String(Math.min(round+1,ROUNDS)).padStart(2,'0'));
 const score=$('score');if(score)score.textContent=String(points).padStart(2,'0')+' POINTS';
 label('turns',Array.from({length:ROUNDS},(_,i)=>i<history.length?(history[i]?'◆':'×'):i===round?'●':'○').join('  '));
 const b=$<HTMLButtonElement>('shoot');
 if(b){b.disabled=busy;b.textContent=round>=ROUNDS?'PLAY AGAIN ↗':busy?'IN FLIGHT…':
    mode==='wrestling'?'PERFORM THE MOMENT ↗':mode==='basketball'?'RELEASE THE SHOT ↗':
    mode==='baseball'?'SWING FOR THE FENCES ↗':'TAKE THE SHOT ↗'}
 if(mode==='wrestling'&&round<ROUNDS){
  selects.forEach((el,i)=>el.textContent=(i+1)+' / '+SHOW[round].choices[i]);
  if(!busy)label('live-caption',SHOW[round].cue);
 }
}
function soundEffect(win:boolean){
 if(!sound)return;
 try{
  ctx??=new AudioContext();
  const t=ctx.currentTime;
  for(let i=0;i<(win?3:1);i++){
   const o=ctx.createOscillator(),g=ctx.createGain();
   o.type='sine';o.frequency.value=win?420+i*120:240;
   g.gain.setValueAtTime(.0001,t+i*.08);
   g.gain.exponentialRampToValueAtTime(.04,t+i*.08+.02);
   g.gain.exponentialRampToValueAtTime(.0001,t+i*.08+.18);
   o.connect(g).connect(ctx.destination);o.start(t+i*.08);o.stop(t+i*.08+.2);
  }
 }catch{}
}

class PrimeScene extends Phaser.Scene{
 public round=0;
 private points=0;
 private history:boolean[]=[];
 private busy=false;
 private elapsed=0;
 private field!:Phaser.GameObjects.Graphics;
 private moving!:Phaser.GameObjects.Graphics;
 private spot!:Phaser.GameObjects.Graphics;
 private orb!:Phaser.GameObjects.Arc;
 private marker!:Phaser.GameObjects.Arc;
 private headline!:Phaser.GameObjects.Text;
 constructor(){super('prime')}
 create(){
  gameScene=this;
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
   if(this.busy)return;
   if(mode==='football'||mode==='hockey')setAim(pointer.worldX<W/3?0:pointer.worldX<W*2/3?1:2);
   this.shoot();
  });
  this.events.on('shutdown',()=>{gameScene=null});
  this.begin('football');
 }
 private stadium(){
  const c=THEME[mode].color,g=this.add.graphics();
  this.field=g;
  g.fillStyle(0x071824).fillRect(0,0,W,H);
  for(let i=0;i<34;i++){
   g.fillStyle(i%3===0?0xe5fff4:0x70c5b3,.09);
   g.fillRect(i*29,0,20,96);
  }
  for(let i=0;i<8;i++){
   g.fillStyle(c,.03).fillTriangle(i*145,0,i*145+65,0,i*103+195,400);
  }
  const ground=mode==='hockey'?0xbcdce9:mode==='basketball'?0x985e40:mode==='baseball'?0x1d7751:
    mode==='wrestling'?0x28345d:0x1b684d;
  g.fillStyle(ground,1).fillRoundedRect(26,99,908,414,19);
  for(let i=0;i<7;i++){
   g.fillStyle(mode==='hockey'?0xffffff:0xc2fff2,i%2===0?.065:.03);
   g.fillRect(36,109+i*57,890,56);
  }
  g.lineStyle(3,mode==='hockey'?0xb64a61:0xdffff0,.7).strokeRoundedRect(39,111,880,389,11);
  if(mode==='football'||mode==='hockey'){
   g.strokeCircle(480,320,70);
   g.strokeRect(295,120,370,110);
   g.lineStyle(7,c,1).strokeRoundedRect(280,114,400,18,5);
   for(let i=0;i<13;i++)g.lineBetween(287+i*32,122,297+i*31,191);
  }else if(mode==='basketball'){
   g.lineStyle(3,0xffe1bb,.7).strokeCircle(480,310,87);
   g.fillStyle(0xffffff,1).fillRect(422,125,116,15);
   g.lineStyle(9,0xf5733b,1).strokeEllipse(480,164,120,37);
   for(let i=0;i<8;i++)g.lineBetween(420+i*18,175,444+i*11,231);
  }else if(mode==='baseball'){
   g.lineStyle(4,0xffefbf,.7).strokeRect(321,158,316,316);
   g.fillStyle(0xc9905e,1).fillEllipse(480,354,172,102);
  }else{
   g.lineStyle(5,0xd9bbff,.85).strokeRect(135,160,690,274);
   for(let i=0;i<3;i++)g.lineBetween(135,187+i*66,825,187+i*66);
  }
  g.lineStyle(2,c,.2).strokeCircle(480,307,160);
  g.lineStyle(2,c,.13).strokeCircle(480,307,236);
  const light=this.add.graphics();
  for(let i=0;i<10;i++){light.fillStyle(0xf5ffec,.35).fillCircle(52+i*95,71,8);
   light.fillStyle(c,.045).fillCircle(52+i*95,71,33);}
  this.add.text(55,130,mode.toUpperCase()+' // PRIME TIME',{fontFamily:'Arial',fontSize:'13px',
   fontStyle:'bold',color:mode==='hockey'?'#234a58':'#eaffed'});
 }
 private player(x:number,y:number,tint:number,no:string){
  const g=this.add.graphics();
  g.fillStyle(0x091d26,.32).fillEllipse(x,y+49,66,15);
  g.fillStyle(0x091f2a).fillRoundedRect(x-15,y+19,13,38,5).fillRoundedRect(x+3,y+19,13,38,5);
  g.fillStyle(tint).fillRoundedRect(x-29,y-24,58,60,12);
  g.fillStyle(0xffd9ae).fillCircle(x,y-43,18);
  g.fillStyle(0x0d2433).fillRoundedRect(x-17,y-61,34,10,5);
  g.fillStyle(0xffd9ae).fillRoundedRect(x-43,y-10,13,39,6).fillRoundedRect(x+30,y-10,13,39,6);
  this.add.text(x,y+5,no,{fontFamily:'Arial',fontSize:'23px',fontStyle:'bold',color:'#132820'}).setOrigin(.5);
 }
 private paintGoalie(x:number){
  this.moving.clear();
  this.moving.fillStyle(0x031721,.32).fillEllipse(x,210,80,17);
  this.moving.fillStyle(mode==='hockey'?0x4774a9:0xe6ab70).fillRoundedRect(x-26,163,52,50,10);
  this.moving.fillStyle(0xf0d5b7).fillCircle(x,148,17);
  this.moving.fillRoundedRect(x-48,174,18,12,5).fillRoundedRect(x+30,174,18,12,5);
  this.moving.fillStyle(0x0b2432).fillRoundedRect(x-20,209,16,30,5).fillRoundedRect(x+4,209,16,30,5);
 }
 public begin(next:Sport){
  this.tweens.killAll();
  [...this.children.list].forEach(x=>x.destroy());
  mode=next;this.round=0;this.points=0;this.history=[];this.busy=false;this.elapsed=0;
  this.stadium();this.player(mode==='wrestling'?330:310,350,0xc8ff70,'11');
  if(mode==='wrestling')this.player(624,352,0xbda1ff,'07');
  this.moving=this.add.graphics();this.spot=this.add.graphics();
  if(mode==='football'||mode==='hockey')this.paintGoalie(480);
  this.orb=this.add.circle(408,420,mode==='hockey'?13:20,
    mode==='hockey'?0x192b37:mode==='basketball'?0xef9347:0xffffff,mode==='wrestling'?0:1);
  this.marker=this.add.circle(480,463,11,0xfaffdf).setVisible(mode==='basketball'||mode==='baseball');
  if(mode==='basketball'||mode==='baseball'){
   const bar=this.add.graphics();
   bar.fillStyle(0x071e2c,.92).fillRoundedRect(203,456,554,24,12);
   bar.fillStyle(0xcdfa6f,.85).fillRoundedRect(414,458,132,20,8);
   this.add.text(480,495,'FIND THE SWEET SPOT',{fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',
     color:'#edffcb'}).setOrigin(.5);
  }
  this.headline=this.add.text(480,250,'THE MOMENT IS YOURS.',{
   fontFamily:'Arial',fontSize:'29px',fontStyle:'bold',color:'#ffffff',
   stroke:'#09202c',strokeThickness:7,align:'center'}).setOrigin(.5);
  this.cameras.main.setBackgroundColor('#071924');
  reflectMode();ui(this.round,this.points,this.history);
  if(!reduce)this.cameras.main.flash(140,170,235,210);
 }
 private explosion(x:number,y:number,positive:boolean){
  if(reduce)return;
  for(let i=0;i<15;i++){
   const theta=i/15*Math.PI*2,length=Phaser.Math.Between(40,120);
   const p=this.add.circle(x,y,Phaser.Math.Between(3,8),positive?THEME[mode].color:0xffffff,
    positive?.85:.4).setDepth(10);
   this.tweens.add({targets:p,x:x+Math.cos(theta)*length,y:y+Math.sin(theta)*length,
    alpha:0,scale:0,duration:370+Phaser.Math.Between(0,300),ease:'Cubic.easeOut',
    onComplete:()=>p.destroy()});
  }
 }
 public shoot(){
  if(this.busy)return;
  if(this.round>=ROUNDS){this.begin(mode);return;}
  const selected=mode;
  const goalieX=480+Math.sin(this.elapsed/610)*138;
  const keeper=(goalieX<432?0:goalieX>528?2:1) as Aim;
  const timing=.5+Math.sin(this.elapsed/430)*.44;
  const resolution=resolveAttempt(mode,aim,keeper,timing,SHOW[this.round].answer);
  this.busy=true;if(resolution.made)this.points++;
  this.history.push(resolution.made);
  ui(this.round,this.points,this.history,true);
  this.headline.setText('PRIME TIME MOMENT!');
  const x=(mode==='football'||mode==='hockey')?[345,480,615][aim]:
   mode==='basketball'?480:mode==='baseball'?715:480;
  const y=mode==='basketball'?167:mode==='baseball'?115:mode==='wrestling'?245:163;
  const complete=()=>{
   this.round++;this.busy=false;
   this.headline.setText(resolution.explanation);
   label('live-caption',resolution.explanation);
   soundEffect(resolution.made);
   this.explosion(x,y,resolution.made);
   if(resolution.made&&!reduce)this.cameras.main.shake(90,.002);
   this.orb.setPosition(408,420).setScale(1);
   ui(this.round,this.points,this.history);
   if(this.round===ROUNDS)this.finish();
  };
  if(mode==='wrestling')this.time.delayedCall(reduce?50:430,complete);
  else this.tweens.add({targets:this.orb,x,y,scale:.55,duration:reduce?90:570,
    ease:'Sine.easeOut',onComplete:complete});
 }
 private finish(){
  if(mode==='football'){
   try{localStorage.setItem(FOOTBALL,JSON.stringify(Math.max(footballBest(),this.points)))}catch{}
  }else saveGame(localStorage,mode,this.points);
  recordHighlight(localStorage,mode,this.points);
  paintRecords();
  label('coach',this.points>=3?'You made the stadium remember that moment. Choose another sport or chase a perfect five.':
   'Even legends miss sometimes. Every attempt improves your eye and timing.');
  label('objective',this.points>=3?'CHALLENGE CLEARED ✓':'YOUR NEXT CHANCE AWAITS');
  label('live-caption',this.points===5?'PERFECT FIVE / ALL-STAR PERFORMANCE':
   this.points>=3?'THAT IS PRIME TIME. WELL PLAYED.':'GREAT EFFORT. TRY AGAIN.');
  this.headline.setText(this.points===5?'PERFECT NIGHT / 5 OF 5':
   this.points>=3?'THE CROWD REMEMBERS.':'THE NEXT SHOT IS YOURS.');
  ui(this.round,this.points,this.history);
 }
 update(_time:number,delta:number){
  if(this.busy||reduce)return;
  this.elapsed+=Math.min(delta,48);
  if(mode==='hockey'||mode==='football'){
   this.paintGoalie(480+Math.sin(this.elapsed/610)*138);
   this.spot.clear().lineStyle(3,THEME[mode].color,.45+Math.sin(this.elapsed/210)*.16)
     .strokeCircle([345,480,615][aim],165,25);
  }else if(mode==='basketball'||mode==='baseball'){
   this.marker.x=480+Math.sin(this.elapsed/430)*242;
  }
 }
}
function boot(){
 let level=1;try{level=Math.max(1,Math.floor(Number(JSON.parse(localStorage.getItem('jozefs-world-player-v1')||'null')?.xp||0)/100)+1)}catch{}
 label('profile-level','LEVEL '+String(level).padStart(2,'0'));
 paintRecords();
 selects.forEach(b=>b.addEventListener('click',()=>setAim(Number(b.dataset.aim))));
 modes.forEach(b=>b.addEventListener('click',()=>{
  const next=b.dataset.mode||'';
  modes.forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b))});
  const streetOn=next==='street';
  document.getElementById('street-panel')?.toggleAttribute('hidden',!streetOn);
  document.getElementById('prime-controls')?.toggleAttribute('hidden',streetOn);
  if(streetOn){
   label('event-name','STREET // 11');label('coach','Three lanes. Fifty-five seconds. Dodge red, chase neon.');
   game.scene.start('street');street=game.scene.getScene('street') as StreetScene;
  }else if(SPORTS.includes(next as Sport)){
   game.scene.start('prime');gameScene?.begin(next as Sport);
  }
 }));
 $<HTMLButtonElement>('shoot')?.addEventListener('click',()=>gameScene?.shoot());
 $<HTMLButtonElement>('sound')?.addEventListener('click',()=>{
  sound=!sound;const b=$('sound');
  if(b){b.setAttribute('aria-pressed',String(sound));b.textContent=sound?'SOUND ON ♪':'SOUND OFF ♪'}
  if(sound)soundEffect(true);setStreetSound(sound);
 });
 window.addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement|null)?.tagName||''))return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setAim(aim+(e.key==='ArrowLeft'?-1:1))}
  else if(['1','2','3'].includes(e.key)){e.preventDefault();setAim(Number(e.key)-1)}
  else if(e.key===' '){e.preventDefault();gameScene?.shoot()}
 });
 let game:Phaser.Game;
 try{
  game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#071924',
   scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
   render:{antialias:true,pixelArt:false},scene:[PrimeScene,StreetScene]});
 }catch{
  label('game',"Prime Arena couldn't start on this device. The original Sports Arcade remains available.");
 }
}
boot();
 document.getElementById('street-left')?.addEventListener('pointerdown',()=>street?.move(-1));
 document.getElementById('street-right')?.addEventListener('pointerdown',()=>street?.move(1));
 document.getElementById('street-go')?.addEventListener('click',()=>{
  if(!street)return;
  if(street.progress().state==='playing'||street.progress().state==='paused')street.pause();
  else street.start();
 });

// Prime Arena is part of the existing one-device PWA. Precache only public
// same-origin game files after the first visit, never personal progress or APIs.
// This also works when the user opens /prime/ directly without visiting HQ first.
async function prepareOffline(){
 if(!('serviceWorker' in navigator)||!('caches' in window))return;
 try{
  await navigator.serviceWorker.register('../sw.js',{scope:'../'});
  const cache=await caches.open('jozef-prime-public-v1');
  const urls=[location.href,...[...document.querySelectorAll<HTMLScriptElement|HTMLLinkElement>('script[src],link[rel="stylesheet"][href]')].map(el=>el instanceof HTMLScriptElement?el.src:el.href)]
   .filter(url=>new URL(url).origin===location.origin);
  await Promise.all(urls.map(async url=>{
   if(!(await cache.match(url)))await cache.add(url);
  }));
 }catch{/* Offline is optional and should never block gameplay. */}
}
window.addEventListener('load',()=>{void prepareOffline()});
