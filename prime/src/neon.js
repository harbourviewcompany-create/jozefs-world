import Phaser from 'phaser';
import './neon.css';
import {KEY,COLS,ROWS,WALLS,STARS,SECRETS,BEACONS,load,save,code as itemCode,path,collect,ready,champion,objective,traversable} from './neon-rules.js';

// One scene, one local save, no network calls or third-party images.
// The existing Adventure Circuit is still available via the Classic Map link.
const TILE=96,W=COLS*TILE,H=ROWS*TILE;
const el=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const layers=[0x071723,0x123943,0x205852];
let game=null,scene=null,soundEnabled=false,audio=null;
function label(id,value){const n=el(id);if(n)n.textContent=String(value)}
function beep(win=true){
 if(!soundEnabled)return;
 try{
  audio??=new (window.AudioContext||window.webkitAudioContext)();
  const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
  o.type='sine';o.frequency.setValueAtTime(win?510:190,t);
  o.frequency.exponentialRampToValueAtTime(win?840:120,t+.14);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.015);
  g.gain.exponentialRampToValueAtTime(.0001,t+.19);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.21);
 }catch{/* Sound is optional. */}
}
const xy=([x,y])=>[x*TILE+TILE/2,y*TILE+TILE/2];
class NeonCity extends Phaser.Scene {
 constructor(){super('neon')}
 create(){
  scene=this;this.save=load(localStorage);
  this.grid=[1,1];this.route=[];this.moving=false;this.active=true;
  this.round=0;this.goals=0;this.shots=0;this.finale=false;this.padAt=0;this.padOld=false;
  this.staticScene();this.placeObjects();this.hero=this.makeAthlete('JOZEF',0xcdfa63,11);
  this.partner=this.makeAthlete('DAD',0x60ecf4,2);this.partner.setVisible(false);
  this.partner.setPosition(...xy([1,2]));this.hero.setPosition(...xy(this.grid));
  this.cameras.main.setBounds(0,0,W,H);this.cameras.main.setZoom(this.scale.width<900?1.25:1.08);
  this.cameras.main.startFollow(this.hero,true,.1,.1);
  this.cameras.main.setRoundPixels(true);
  this.routeInk=this.add.graphics().setDepth(11);
  this.input.on('pointerdown',p=>{
   if(this.finale||document.elementFromPoint(p.downX,p.downY)?.closest('button'))return;
   const x=Math.floor(p.worldX/TILE),y=Math.floor(p.worldY/TILE);
   if(traversable(x,y))this.navigate([x,y]);
  });
  this.key=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ONE,TWO,THREE,ESC')||{};
  this.game.events.on(Phaser.Core.Events.HIDDEN,this.onHidden,this);
  this.game.events.on(Phaser.Core.Events.BLUR,this.onHidden,this);
  this.events.once('shutdown',()=>{
   this.game.events.off(Phaser.Core.Events.HIDDEN,this.onHidden,this);
   this.game.events.off(Phaser.Core.Events.BLUR,this.onHidden,this);
   scene=null;
  });
  this.refresh();
  label('neon-status','A new night in Neon City. Follow the light to your first star.');
 }
 onHidden(){this.route=[];this.routeInk?.clear();}
 makeAthlete(name,color,number){
  const group=this.add.container(0,0).setDepth(30);
  const shadow=this.add.ellipse(0,29,57,16,0x021119,.6);
  const legL=this.add.rectangle(-12,13,15,35,0x112b3b).setStrokeStyle(2,0x81c0ce);
  const legR=this.add.rectangle(12,13,15,35,0x112b3b).setStrokeStyle(2,0x81c0ce);
  const bootL=this.add.ellipse(-13,32,23,11,0xe9fff4),bootR=this.add.ellipse(12,32,23,11,0xe9fff4);
  const jersey=this.add.rectangle(0,-11,57,61,color).setStrokeStyle(4,0xf5fff3,.6);
  const stripe=this.add.rectangle(0,-15,18,56,0x10353a,.85);
  const armL=this.add.ellipse(-30,-10,13,35,0xe7b98e),armR=this.add.ellipse(30,-10,13,35,0xe7b98e);
  const neck=this.add.rectangle(0,-45,15,12,0xc88e71);
  const head=this.add.ellipse(0,-66,35,40,0xe9b98e).setStrokeStyle(2,0xffddab);
  const hair=this.add.ellipse(0,-83,37,17,0x192936);
  const eyes=this.add.graphics();eyes.fillStyle(0x152638).fillCircle(-6,-65,2.7).fillCircle(8,-65,2.7);
  const shirtNum=this.add.text(0,-22,String(number),{fontFamily:'system-ui',fontSize:'22px',fontStyle:'900',color:'#0d2730'}).setOrigin(.5);
  const labelText=this.add.text(0,-105,name,{fontFamily:'system-ui',fontSize:'14px',fontStyle:'900',color:'#f1fff7',backgroundColor:'#071d2bc9',padding:{x:8,y:4}}).setOrigin(.5);
  group.add([shadow,legL,legR,bootL,bootR,armL,armR,neck,jersey,stripe,head,hair,eyes,shirtNum,labelText]);
  group.setData('legs',[legL,legR]);return group;
 }
 staticScene(){
  const g=this.add.graphics().setDepth(0);
  g.fillGradientStyle(0x071b2b,0x071b2b,0x0f3b39,0x123742,1).fillRect(0,0,W,H);
  // Layered elevated city blocks with illuminated bevels and soft walkable tiles.
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
   const px=x*TILE,py=y*TILE,wall=!traversable(x,y);
   if(wall){
    g.fillStyle(0x02101b).fillRoundedRect(px+4,py+17,TILE-8,TILE-9,9);
    g.fillStyle(0x1b4258).fillRoundedRect(px+4,py+3,TILE-8,TILE-17,9);
    g.fillStyle(0x254c61).fillRoundedRect(px+10,py+4,TILE-20,TILE-29,7);
    g.lineStyle(3,0x77d9d4,.48).strokeRoundedRect(px+8,py+6,TILE-16,TILE-26,6);
    g.fillStyle(0x83e6eb,.12).fillRect(px+16,py+10,TILE-32,3);
   }else{
    g.fillStyle((x+y)%2?0x10313e:0x113944).fillRect(px+1,py+1,TILE-2,TILE-2);
    g.lineStyle(1,0x77c4bd,.09).strokeRect(px+2,py+2,TILE-4,TILE-4);
    if((x*7+y*11)%5===0){g.fillStyle(0xc3fff3,.25).fillRect(px+19,py+14,4,4);}
   }
  }
  // Neon skyline, field-line details and distant grandstands.
  for(let i=0;i<32;i++){
   const x=(i*47)%W,h=38+((i*29)%84);
   g.fillStyle(0x081622,.8).fillRect(x,0,31,h);
   g.fillStyle(i%3?0x8ae9fc:0xd3ff7b,.25).fillRect(x+8,14,3,5);
  }
  g.lineStyle(5,0x90f9ce,.5).strokeRoundedRect(TILE,TILE,(COLS-2)*TILE,(ROWS-2)*TILE,12);
  for(let i=0;i<4;i++){
   const x=(i*4+2)*TILE;
   g.lineStyle(5,0xcdfd78,.16).lineBetween(x,TILE,x,TILE*9);
  }
  // Real bloom is a GPU effect; layered translucent halos mimic it at low cost.
  for(const [x,y] of [[2,1],[9,2],[13,5],[6,8]]){
   const pos=xy([x,y]);
   this.add.circle(pos[0],pos[1],120,0x5fffee,.04).setDepth(1);
   this.add.circle(pos[0],pos[1],52,0xd6ff81,.055).setDepth(1);
  }
  for(const [i,[x,y]] of [[0,[6,1]],[1,[12,2]],[2,[6,8]],[3,[13,6]]]){
   this.add.text(x*TILE,y*TILE,['J11','NIGHT LEAGUE','ONE WORLD','NEON CITY'][i],
    {fontFamily:'Impact,system-ui',fontSize:'24px',fontStyle:'900',color:'#a8dccc',stroke:'#061b26',strokeThickness:3})
    .setAngle(i%2===0?-90:0).setAlpha(.26).setDepth(2);
  }
 }
 placeObjects(){
  this.items=[];
  for(const [kind,locs,color] of [['star',STARS,0xffd77a],['secret',SECRETS,0xbc89f5],['switch',BEACONS,0x8af9e9]]){
   locs.forEach((pos,i)=>{
    const [x,y]=xy(pos),item=this.add.container(x,y).setDepth(15);
    const halo=this.add.circle(0,0,44,color,.12);
    const icon=this.add.circle(0,0,21,color,.9).setStrokeStyle(3,0xffffff,.7);
    const symbol=this.add.text(0,0,kind==='star'?'★':kind==='secret'?'✦':'!',{
      fontFamily:'system-ui',fontSize:'28px',fontStyle:'900',color:'#092333'}).setOrigin(.5);
    item.add([halo,icon,symbol]);
    this.items.push({kind,i,item});
    if(!reduce)this.tweens.add({targets:halo,scale:1.34,alpha:.35,duration:1100+i*130,yoyo:true,repeat:-1});
    if(!reduce)this.tweens.add({targets:item,y:y-7,duration:1500+i*170,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
   });
  }
  this.goal=this.add.container(...xy([13,7])).setDepth(13);
  this.goal.add([this.add.circle(0,0,54,0xc164e5,.16),
   this.add.circle(0,0,27,0xec87ff,.86).setStrokeStyle(4,0xffffff,.9),
   this.add.text(0,0,'★',{fontFamily:'system-ui',fontSize:'33px',color:'#142333'}).setOrigin(.5)]);
  this.exit=this.add.container(...xy([14,8])).setDepth(13);
  this.exit.add([this.add.circle(0,0,34,0x91ffc3,.3),this.add.text(0,0,'➜',{fontFamily:'system-ui',fontSize:'42px',color:'#c6ff79'}).setOrigin(.5)]);
 }
 feedback(kind,pos){
  const [x,y]=xy(pos);
  const color=kind==='star'?0xffd77a:kind==='switch'?0x8af9e9:0xe5a1ff;
  for(let i=0;i<(reduce?5:13);i++){
   const p=this.add.circle(x,y,4+(i%3)*2,color,.9).setDepth(40);
   this.tweens.add({targets:p,x:x+Math.cos(i*2.4)*(35+i*4),y:y+Math.sin(i*2.4)*(35+i*4),
     alpha:0,scale:0,duration:reduce?180:350+i*17,onComplete:()=>p.destroy()});
  }
  if(!reduce)this.cameras.main.shake(65,.0014);
  beep(true);
  try{navigator.vibrate?.(15)}catch{}
 }
 refresh(){
  this.items.forEach(({kind,i,item})=>{
   const key=kind==='switch'?'switches':kind==='star'?'stars':'secrets';
   const id=code(kind==='switch'?'switch':kind,i);
   item.setVisible(!this.save[key].includes(id));
  });
  this.goal.setVisible(!this.save.completed.includes(0));
  this.exit.setAlpha(this.save.completed.includes(0)?1:.26);
  const stars=this.save.stars.filter(x=>x.startsWith('0-star-')).length;
  const beacon=this.save.switches.filter(x=>x.startsWith('0-switch-')).length;
  label('neon-progress',stars+'/5 STARS  ·  '+beacon+'/2 BEACONS');
  const next=objective(this.save,this.grid);
  label('neon-mission',this.save.completed.includes(0)?'NEON CHAMPION · PORTAL UNLOCKED':
    stars<2?'COLLECT TWO ENERGY STARS':beacon<2?'ACTIVATE BOTH NEON BEACONS':'CHALLENGE THE ROOFTOP KEEPER');
  label('neon-hint',next?'NEXT: '+next.kind.toUpperCase():'EXPLORE THE WORLD');
  el('neon-finale')?.toggleAttribute('hidden',!this.finale);
 }
 navigate(target){
  if(this.finale)return;
  const route=path(this.grid,target);
  if(route===null){label('neon-status','BLOCKED. FIND AN OPEN ROUTE.');beep(false);return;}
  this.route=route.slice();this.drawRoute();this.advance();
 }
 step(dx,dy){
  if(this.finale)return;
  const end=this.route.length?this.route.at(-1):this.grid;
  const target=[end[0]+dx,end[1]+dy];
  this.navigate(target);
 }
 guide(){
  const next=objective(this.save,this.grid);
  if(!next){label('neon-status','ALL CLEAR. EXPLORE NEON CITY.');return}
  this.navigate(next.at);label('neon-status','FOLLOW THE NEON LINE → '+next.kind.toUpperCase());
 }
 drawRoute(){
  this.routeInk.clear();if(!this.route.length)return;
  this.routeInk.lineStyle(4,0xcaff73,.66);
  this.routeInk.beginPath();this.routeInk.moveTo(...xy(this.grid));
  this.route.forEach(p=>this.routeInk.lineTo(...xy(p)));this.routeInk.strokePath();
  for(let i=0;i<this.route.length;i++){
   const [x,y]=xy(this.route[i]);this.routeInk.fillStyle(0xcaff73,Math.max(.16,.66-i*.02)).fillCircle(x,y,8);
  }
 }
 advance(){
  if(this.moving||!this.route.length)return;
  const next=this.route.shift();if(!next)return;
  if(!traversable(...next)){this.route=[];this.drawRoute();return;}
  this.moving=true;this.drawRoute();
  const [x,y]=xy(next),fromX=this.hero.x,fromY=this.hero.y;
  this.hero.setRotation(Math.max(-.12,Math.min(.12,(x-fromX)/TILE*.07)));
  this.tweens.add({targets:this.hero,x,y,duration:reduce?85:160,ease:'Sine.easeInOut',onComplete:()=>{
   this.hero.setRotation(0);this.grid=next;this.moving=false;
   this.partner.setPosition(fromX,fromY);
   this.reached();this.drawRoute();this.advance();
  }});
 }
 reached(){
  const old=this.save;const result=collect(this.save,this.grid);
  if(result.event){
   this.save=result.state;save(localStorage,this.save);
   dispatchEvent(new Event('jozef:adventure-updated'));
   this.feedback(result.event,this.grid);
   label('neon-status',result.event==='star'?'STAR COLLECTED!':result.event==='switch'?'BEACON ACTIVATED!':'SECRET DISCOVERED!');
  }
  if(this.grid[0]===13&&this.grid[1]===7&&!this.save.completed.includes(0)){
   if(ready(this.save))this.openFinale();
   else label('neon-status','THE KEEPER WAITS. FIND TWO STARS AND BOTH BEACONS.');
  }
  if(this.grid[0]===14&&this.grid[1]===8&&this.save.completed.includes(0)){
   label('neon-status','NEON CITY CHAMPION! FROST CIRCUIT IS NOW UNLOCKED.');
   this.feedback('secret',this.grid);
  }
  if(this.save!==old)this.refresh();
 }
 openFinale(){
  this.finale=true;this.route=[];this.routeInk.clear();
  this.round=0;this.goals=0;this.shots=0;
  el('neon-finale')?.removeAttribute('hidden');
  this.finaleUI();
  label('neon-status','ROOFTOP KEEPER: PICK AN OPEN CORNER. SCORE TWO GOALS.');
  if(!reduce)this.cameras.main.zoomTo(1.48,230,'Sine.easeOut');
 }
 finaleUI(){
  const blocker=(this.round+1)%3;
  label('neon-finale-title',this.goals>=2?'ROOFTOP CHAMPION!':'THE ROOFTOP KEEPER');
  label('neon-finale-score',this.goals+' GOALS  /  '+this.shots+' SHOTS');
  label('neon-keeper','KEEPER GUARDS '+['LEFT','CENTRE','RIGHT'][blocker]);
 }
 shot(lane){
  if(!this.finale||lane<0||lane>2)return;
  const blocked=(this.round+1)%3;
  this.shots++;
  if(lane!==blocked){this.goals++;beep(true);label('neon-status','GOAL! THE KEEPER MISSED IT.');}
  else{beep(false);label('neon-status','SAVED! WATCH THE KEEPER AND TRY ANOTHER CORNER.');}
  this.round++;
  if(this.goals>=2){
   this.save=champion(this.save);save(localStorage,this.save);
   dispatchEvent(new Event('jozef:adventure-updated'));
   this.finale=false;el('neon-finale')?.setAttribute('hidden','');
   this.feedback('star',this.grid);this.refresh();
   label('neon-status','NEON CITY CLEARED! YOUR NEON KIT AND NEXT WORLD ARE UNLOCKED.');
   return;
  }
  if(this.round>=4){
   this.round=0;this.goals=0;this.shots=0;
   label('neon-status','ONE MORE TRY. PICK THE CORNER WITHOUT THE KEEPER.');
  }
  this.finaleUI();
 }
 update(time){
  if(!this.active)return;
  const k=this.key;
  if(time-(this.lastKey||0)>135&&!this.finale){
   const dx=Number(k.RIGHT?.isDown||k.D?.isDown)-Number(k.LEFT?.isDown||k.A?.isDown);
   const dy=Number(k.DOWN?.isDown||k.S?.isDown)-Number(k.UP?.isDown||k.W?.isDown);
   if(dx||dy){this.lastKey=time;this.step(dx?Math.sign(dx):0,dx?0:Math.sign(dy));}
  }
  if(this.finale){
   for(let i=0;i<3;i++)if(Phaser.Input.Keyboard.JustDown(k[['ONE','TWO','THREE'][i]]))this.shot(i);
  }else if(Phaser.Input.Keyboard.JustDown(k.SPACE))this.guide();
  if(!reduce&&this.hero)this.hero.setScale(1+Math.sin(time/420)*.007);
  if(time-(this.padAt||0)>180){
   this.padAt=time;
   try{
    const pad=Array.from(navigator.getGamepads?.()||[]).find(x=>x?.connected);
    if(pad){
     const x=pad.axes?.[0]||0,y=pad.axes?.[1]||0,pressed=pad.buttons?.[0]?.pressed;
     if(!this.finale&&(Math.abs(x)>.55||Math.abs(y)>.55))
      this.step(Math.abs(x)>Math.abs(y)?Math.sign(x):0,Math.abs(x)>Math.abs(y)?0:Math.sign(y));
     if(pressed&&!this.padOld){if(this.finale)this.shot(this.round%3);else this.guide();}
     this.padOld=pressed;
    }
   }catch{}
  }
 }
}
function boot(){
 const stage=el('neon-stage');if(!stage)return;
 const gameHeight=()=>Math.max(620,Math.min(1500,Math.round(960*stage.clientHeight/Math.max(1,stage.clientWidth))));
 try{
  game=new Phaser.Game({type:Phaser.AUTO,parent:'neon-stage',width:960,height:gameHeight(),
   backgroundColor:'#071723',render:{antialias:true,pixelArt:false},
   scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
   fps:{target:reduce?30:60},scene:[NeonCity]});
 }catch{label('neon-status','This device could not launch Neon City. Return to the classic map to keep playing.');}
 const bind=(id,callback)=>el(id)?.addEventListener('click',callback);
 bind('neon-guide',()=>scene?.guide());
 bind('neon-reset',()=>scene?.navigate([1,1]));
 bind('neon-sound',()=>{soundEnabled=!soundEnabled;label('neon-sound',soundEnabled?'SOUND ON':'SOUND OFF');if(soundEnabled)beep()});
 for(const [id,x,y] of [['neon-up',0,-1],['neon-down',0,1],['neon-left',-1,0],['neon-right',1,0]]){
  bind(id,()=>scene?.step(x,y));
 }
 for(let i=0;i<3;i++)bind('neon-shot-'+i,()=>scene?.shot(i));
 const resize=new ResizeObserver(()=>{if(!game)return;const height=gameHeight();if(Math.abs(game.scale.height-height)>12)game.scale.resize(960,height)});
 resize.observe(stage);window.addEventListener('pagehide',()=>{resize.disconnect();game?.destroy(true);game=null},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
