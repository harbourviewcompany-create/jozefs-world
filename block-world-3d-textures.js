/* Block World 3D illustrated material atlas.
 * Hand-authored, deterministic pixels. No external assets, CDN or tracking.
 * 8x4 cells at 32px each; WebGL1-compatible 256x128 POT texture.
 */
(function(){
 'use strict';
 const SIZE=32,COLS=8,ROWS=4;
 const colors=[
  '#6bb449','#916d49','#936a48','#929da5','#8d5939','#b88c52','#4a9d60','#e6d09b',
  '#e8f4f8','#71ddee','#c28e54','#a86748','#afd9d9','#facba3','#624332','#268dd2',
  '#3abc75','#4c658d','#51413c','#f8f9e9','#f6c75d','#8f582e','#448254','#50655a',
  '#3b935a','#e07a61','#9ab46a','#dfd8c4','#367fb5','#75c8ee','#a4df71','#506873'
 ];
 function paint(){
  const canvas=document.createElement('canvas');
  canvas.width=COLS*SIZE;canvas.height=ROWS*SIZE;
  const g=canvas.getContext('2d');
  if(!g||typeof g.fillRect!=='function')return null;
  g.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
  const rand=(tile,x,y,s=0)=>{let n=Math.imul(tile+19,1597334677)^Math.imul(x+31,3812015801)^Math.imul(y+11,958689727)^Math.imul(s+2,1136930381);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
  const accent=(tile,x,y)=>rand(tile,x,y)>.83?'#ffffff30':rand(tile,x,y+1)<.18?'#071a262b':'#ffffff00';
  for(let tile=0;tile<COLS*ROWS;tile++){
   const bx=(tile%COLS)*SIZE,by=Math.floor(tile/COLS)*SIZE;
   rect(bx,by,SIZE,SIZE,colors[tile]||'#87929a');
   for(let y=0;y<SIZE;y+=2)for(let x=0;x<SIZE;x+=2){
    if(rand(tile,x,y)>.43)rect(bx+x,by+y,2,2,accent(tile,x,y));
   }
   // Layered grass: small blade highlights and dark rooted tufts.
   if(tile===0||tile===26){
    for(let n=0;n<65;n++){
     const x=Math.floor(rand(tile,n,1)*30),y=Math.floor(rand(tile,n,2)*29);
     rect(bx+x,by+y,1+Math.floor(rand(tile,n,4)*2),1+Math.floor(rand(tile,n,3)*3),
       n%3===0?'#c3e77b':n%3===1?'#3b823c':'#87d263');
    }
   }
   if(tile===1){ // grass edge over earthy soil and scattered roots
    rect(bx,by+7,32,25,'#876044');
    for(let n=0;n<45;n++){const x=Math.floor(rand(tile,n,1)*31),y=9+Math.floor(rand(tile,n,2)*22);
     rect(bx+x,by+y,n%3?2:3,2,n%2?'#9e7650':'#65462f');}
    for(let n=0;n<16;n++){const x=n*2,y=6+Math.floor(rand(tile,n,4)*5);rect(bx+x,by+4,2,y-2,n%2?'#57933f':'#84bc55');}
   }
   if(tile===2||tile===3||tile===27){ // earthy grains and stone fractures
    for(let n=0;n<80;n++){const x=Math.floor(rand(tile,n,1)*31),y=Math.floor(rand(tile,n,2)*31);
     rect(bx+x,by+y,1+n%3,1+n%2,n%4===0?'#e2cab155':n%3===0?'#2835444a':'#ffffff1c');}
    if(tile===3||tile===27)for(let n=0;n<5;n++){
     const x=Math.floor(rand(tile,n,5)*26),y=Math.floor(rand(tile,n,6)*27);
     rect(bx+x,by+y,5,1,'#40536180');rect(bx+x+4,by+y,1,4,'#40536180');
    }
   }
   if(tile===4||tile===21){ // long, recessed wooden bark grooves
    for(let x=2;x<32;x+=5){rect(bx+x,by,2,32,x%3?'#4a291e90':'#e0a16b7a');
     for(let y=2;y<30;y+=9)rect(bx+x-1,by+y,3,3,'#5835257b');}
   }
   if(tile===5){ // concentric tree rings
    for(let d=28;d>=4;d-=5){
     g.strokeStyle=d%2?'#7d5236':'#ecd29b';g.lineWidth=2;g.strokeRect(bx+(32-d)/2,by+(32-d)/2,d,d);
    }
   }
   if(tile===6||tile===24||tile===22){ // leaf clusters and bright stems with open pixel gaps
    for(let n=0;n<58;n++){
     const x=Math.floor(rand(tile,n,1)*29),y=Math.floor(rand(tile,n,2)*30);
     const shade=['#24563f','#36834b','#73bc6b','#a6d67c','#2f745a'][n%5];
     rect(bx+x,by+y,2+n%3,2+n%2,shade);
    }
    if(tile!==22)for(let n=0;n<17;n++){const x=Math.floor(rand(tile,n,11)*29),y=Math.floor(rand(tile,n,12)*29);
     g.clearRect(bx+x,by+y,1+n%3,1+n%3);}
   }
   if(tile===7){for(let n=0;n<70;n++){const x=Math.floor(rand(tile,n,4)*32),y=Math.floor(rand(tile,n,7)*32);rect(bx+x,by+y,1,1,n%2?'#fff4cb':'#b69f74');}}
   if(tile===8){for(let n=0;n<30;n++){const x=Math.floor(rand(tile,n,4)*32),y=Math.floor(rand(tile,n,7)*32);rect(bx+x,by+y,2,1,n%2?'#ffffff':'#addce5');}}
   if(tile===9||tile===29){for(let n=0;n<18;n++){const x=Math.floor(rand(tile,n,1)*30),y=Math.floor(rand(tile,n,2)*27);
    rect(bx+x,by+y,2,5,n%3===0?'#efffff':n%3===1?'#156d9f':'#98ffff');}
    for(let k=0;k<4;k++){rect(bx+k*8,by+(k%2)*5,2,28,'#adfaff90');}}
   if(tile===10){for(let y=0;y<32;y+=8){rect(bx,by+y,32,2,'#70472d');
    rect(bx+((y/8)%2?7:20),by+y+2,2,6,'#7c543b');rect(bx+2,by+y+3,28,1,'#e6b57b55');}}
   if(tile===11){for(let y=0;y<32;y+=9){rect(bx,by+y,32,2,'#e8b78a');
    for(let x=(y/9%2?0:-9);x<32;x+=17)rect(bx+x,by+y,2,9,'#e6b99088');}}
   if(tile===12){rect(bx+4,by+4,23,3,'#f3ffff');rect(bx+3,by+5,4,23,'#f5ffff');rect(bx+17,by+9,9,3,'#f3ffff9c');}
   if([13,14,15,16,17,18,19,20,21,23,28,30,31].includes(tile)){
    // Pixel-woven cloth, hair strokes, skin shading, and matte leather.
    for(let y=1;y<32;y+=4)for(let x=1;x<32;x+=4)
     if(rand(tile,x,y)>.43)rect(bx+x,by+y,2,1,tile===13?'#fcebd677':'#ffffff35');
    if(tile===15||tile===16||tile===17||tile===28)for(let k=0;k<8;k++)
     rect(bx+2,by+2+k*4,28,1,'#ffffff18');
    if(tile===14||tile===20||tile===21)for(let x=3;x<32;x+=5)rect(bx+x,by,1,32,'#150d1250');
   }
   if(tile===25){ // mushroom crown
    for(let n=0;n<20;n++){const x=Math.floor(rand(tile,n,4)*30),y=Math.floor(rand(tile,n,5)*30);rect(bx+x,by+y,2,2,'#ffeabf');}}
  }
  return canvas;
 }
 function tileFor(id,face){
  if(id===1)return face===0?0:face===3?2:1;
  if(id===2)return 2;if(id===3)return 3;
  if(id===4)return face===0||face===3?5:4;
  if(id===5)return 6;if(id===6)return 7;if(id===7)return 8;
  if(id===8)return 9;if(id===9)return 10;if(id===10)return 11;if(id===11)return 12;
  const table={12:13,13:14,14:15,15:16,16:23,17:17,18:20,19:19,20:18,21:21,22:22,23:23,24:24,25:25,26:24};
  return table[id]===undefined?3:table[id];
 }
 function uv(tile,u,v){
  // 1-pixel inset limits leaking from adjacent cells on older mobile GPUs.
  return [((tile%COLS)*SIZE+1+u*(SIZE-2))/(SIZE*COLS),
   (Math.floor(tile/COLS)*SIZE+1+v*(SIZE-2))/(SIZE*ROWS)];
 }
 window.BlockWorld3DTextures=Object.freeze({version:'forest-atlas-1',createAtlas:paint,tileFor,uv,columns:COLS,rows:ROWS});
})();
