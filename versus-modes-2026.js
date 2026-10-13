/* Versus 2026 rule book and deterministic tactical helpers.
   This module has no DOM/network dependencies; only the host applies decisions. */
(()=>{
 'use strict';
 const MODES=Object.freeze({
   classic:{name:'Classic Match',seconds:120,limit:3,coop:true,practice:true},
   first5:{name:'First to Five',seconds:180,limit:5,coop:true,practice:true},
   golden:{name:'Golden Goal',seconds:90,limit:1,coop:true,practice:true},
   penalties:{name:'Penalty Shootout',seconds:10,limit:99,coop:true,practice:true},
   cup:{name:'World Cup',seconds:90,limit:3,coop:false,practice:true},
   duo:{name:'2v2 Team Challenge',seconds:120,limit:3,coop:true,practice:false}
 });
 const safeMode=(value,coop=false,practice=false)=>{
   const name=typeof value==='string'&&Object.hasOwn(MODES,value)?value:'classic';
   if(name==='cup'&&!practice||name==='duo'&&!coop)return 'classic';
   return name;
 };
 const config=mode=>MODES[Object.hasOwn(MODES,mode)?mode:'classic'];
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const CUP=['Rookie Cup','Pro Cup','Legends Final'];
 const cupDifficulty=stage=>['rookie','pro','legend'][clamp(Math.trunc(Number(stage)||0),0,2)];
 const penaltyShooter=(turn,coop=false)=>{
   if(coop)return turn%2===0?(Math.floor(turn/2)%2?'Jozef':'Dad'):'Rovers';
   return turn%2===0?'Dad':'Jozef';
 };
 // Returns the role to which an AI should defend the ball and the expected
 // intercept point. No random input means two identical states yield one plan.
 function tacticalTarget(bot,ball,goalX,difficulty='pro',partner=null){
   const pace=difficulty==='legend'?6:difficulty==='rookie'?2.5:4;
   const danger=Math.abs(ball.x-goalX)<275;
   const lead=clamp(Math.hypot(ball.vx||0,ball.vy||0)*2,0,26);
   const approach=goalX<360?1:-1;
   const predictedX=clamp(ball.x+(ball.vx||0)*lead,60,660);
   const predictedY=clamp(ball.y+(ball.vy||0)*lead,56,364);
   const blockX=clamp(predictedX+approach*(danger?28:52),64,656);
   const coverY=partner&&Math.hypot(partner.x-ball.x,partner.y-ball.y)<115
     ?clamp(210+(predictedY-210)*.72,65,355):predictedY;
   const chase=danger||Math.hypot(bot.x-ball.x,bot.y-ball.y)<220;
   return {x:chase?blockX:clamp(goalX+(-approach)*135,65,655),
     y:chase?coverY:clamp(210+(predictedY-210)*.28,70,350),
     speed:pace,challenge:Math.hypot(bot.x-ball.x,bot.y-ball.y)<38};
 }
 const passAssist=(from,to,ball,frame)=>{
   if(!from||!to||!ball)return false;
   return Math.hypot(to.x-ball.x,to.y-ball.y)<50
     &&Math.abs(frame-(ball.lastPassFrame??-999))<190
     &&ball.lastPassTo===from;
 };
 window.JozefVersusRules=Object.freeze({
   MODES,safeMode,config,CUP,cupDifficulty,penaltyShooter,tacticalTarget,passAssist
 });
})();