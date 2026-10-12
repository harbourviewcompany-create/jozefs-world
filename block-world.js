/* Daddy & Jozef Block World gameplay — 2026 */

(function(){
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
if(!ctx){$('health').textContent='This browser needs Canvas 2D';return;}
const TILE=40,W=180,H=72,KEY='jozefs-world-block-v3';
const names=['Air','Grass','Dirt','Stone','Wood','Leaves','Sand','Planks','Cobblestone','Gravel','Coal Ore','Iron Ore','Glass','Water','Bedrock','Clay','Snow','Gold Ore','Diamond Ore','Stick','Furnace','Copper Ore','Emerald Ore','Lapis Ore','Redstone Ore','Coal','Iron Ingot','Gold Ingot','Copper Ingot','Emerald','Lapis','Redstone'];
const colors=['#000','#6ab553','#936039','#7c8994','#805231','#43834c','#e3c77d','#ba854f','#7a828b','#a7a4a0','#697780','#677b90','#a7eaf4','#369bc1','#31343c','#a88a77','#eef5fd','#a68956','#518baf','#ad8653','#646979','#9d7050','#6ca77b','#627caa','#885b65'];
const solid=id=>id!==0&&id!==5&&id!==13;
const blockable=[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17,18,20,21,22,23,24];
const hotItems=[2,3,4,7,8,6,12,20];
let cssW=0,cssH=0,dpr=1,world=[],surface=[],creative=true,active=0,selected=2;
let focus=null,camX=0,camY=0,clock=0,ticks=0,dirty=false,saveTimer=0;
let noticeEnd=0,recipeIndex=0,craftingOpen=false,actionCooldown=0,lastTime=performance.now(),acc=0;
const touch={left:false,right:false,jump:false};
const down=new Set();
const textures={};
const players=[
 {name:'Daddy',x:0,y:0,vx:0,vy:0,w:22,h:39,ground:false,facing:1,health:100,inventory:{},walk:0},
 {name:'Jozef',x:0,y:0,vx:0,vy:0,w:21,h:35,ground:false,facing:1,health:100,inventory:{},walk:0}
];
