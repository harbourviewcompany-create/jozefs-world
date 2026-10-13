/* Jozef's World Versus — self-contained 2026 canvas art. No remote textures. */
(() => {
 'use strict';
 const TAU=Math.PI*2;
 const line=(c,x,y,X,Y,w,color)=>{c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.lineWidth=w;c.strokeStyle=color;c.stroke();};
 const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
 const round=(c,x,y,w,h,r,color)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();};
 const glow=(c,x,y,r,color)=>{let g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);};
 const hash=n=>{let x=Math.sin(n*127.1+78.233)*43758.5453;return x-Math.floor(x);};
 function stadium(c,W,H){
  // Side stands and a dark structural rim are visible on portrait phone edges.
  c.fillStyle='#071628';c.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=6){for(let x=0;x<W;x+=8){
   if(y>43&&y<H-43)continue;
   let h=hash(x*.13+y*.21);
   c.fillStyle=['#273d6d','#51385f','#28635b','#a34866','#d7af5c'][Math.floor(h*5)];
   c.globalAlpha=.35+h*.55;c.fillRect(x+1,y+1,5,4);
  }}c.globalAlpha=1;
  round(c,9,12,W-18,H-24,18,'#0b2340');
  c.fillStyle='#102b49';c.fillRect(14,18,W-28,H-36);
  for(let x=31;x<W-31;x+=46){
   c.save();c.shadowBlur=10;c.shadowColor='#2fa9f2';round(c,x,26,27,3,2,'#35bdff');round(c,x,H-29,27,3,2,'#35bdff');c.restore();
  }
  // Lush stadium grass, deterministic mowing stripes, and fine blades.
  let turf=c.createLinearGradient(0,36,0,H-36);
  turf.addColorStop(0,'#1e8141');turf.addColorStop(.48,'#2b9d48');turf.addColorStop(1,'#116531');
  round(c,30,37,W-60,H-74,6,turf);
  for(let x=30;x<W-30;x+=56){
    c.fillStyle=(Math.floor((x-30)/56)%2)?'rgba(12,73,30,.18)':'rgba(152,255,118,.095)';
    c.fillRect(x,37,56,H-74);
  }
  for(let j=0;j<6100;j++){
   const x=32+hash(j*2.7)*(W-64),y=39+hash(j*3.93)*(H-78);
   const h=hash(j*8.1);c.fillStyle=h>.53?'rgba(205,255,167,.14)':'rgba(3,65,25,.18)';
   c.fillRect(x,y,.75+(h*.8),1+hash(j*4.9)*2.3);
  }
  // Light from top touchlines and vignette for broadcast depth.
  let wash=c.createLinearGradient(0,25,0,H-25);
  wash.addColorStop(0,'rgba(0,0,0,.3)');wash.addColorStop(.48,'rgba(255,249,192,.035)');wash.addColorStop(1,'rgba(0,0,0,.32)');
  c.fillStyle=wash;c.fillRect(30,37,W-60,H-74);
  for(const x of [62,W-62]){
   let g=c.createRadialGradient(x,H*.5,5,x,H*.5,250);
   g.addColorStop(0,'rgba(201,240,193,.09)');g.addColorStop(1,'transparent');
   c.fillStyle=g;c.fillRect(30,37,W-60,H-74);
  }
  c.save();c.strokeStyle='rgba(234,255,239,.93)';c.lineWidth=2.3;c.lineJoin='round';
  c.strokeRect(30,38,W-60,H-76);
  line(c,W/2,38,W/2,H-38,2.2,'rgba(241,255,245,.89)');
  c.beginPath();c.arc(W/2,H/2,54,0,TAU);c.stroke();
  ellipse(c,W/2,H/2,3.3,3.3,'#f7fff0');
  c.strokeRect(30,104,97,H-208);c.strokeRect(W-127,104,97,H-208);
  c.strokeRect(30,152,42,H-304);c.strokeRect(W-72,152,42,H-304);
  ellipse(c,126,H/2,3,3,'#f7fff0');ellipse(c,W-126,H/2,3,3,'#f7fff0');
  c.restore();
  // Two layered goals. On portrait devices, the left goal becomes the top goal.
  for(const side of ['left','right']){
   const x=side==='left'?13:W-31;
   c.save();c.shadowColor='#b3faff';c.shadowBlur=8;
   round(c,x,145,18,130,2,'rgba(208,250,255,.2)');
   c.strokeStyle='rgba(245,255,255,.6)';c.lineWidth=.6;
   for(let yy=147;yy<275;yy+=8)line(c,x,yy,x+18,yy,.55,'rgba(227,248,255,.55)');
   for(let xx=x;xx<=x+18;xx+=5)line(c,xx,145,xx,275,.55,'rgba(227,248,255,.55)');
   c.strokeStyle='#fff';c.lineWidth=3;c.strokeRect(x,145,18,130);c.restore();
  }
  // LED sponsor panels and blurred lighting poles.
  for(const y of [12,H-19]){
   for(let x=34;x<W-34;x+=112)round(c,x,y,80,8,2,(x/112)%2<1?'#133d84':'#14526d');
  }
  for(const corner of [[30,30],[30,H-30],[W-30,30],[W-30,H-30]]) glow(c,corner[0],corner[1],86,'rgba(193,232,255,.22)');
 }
 function player(c,p,color,name,isLocal,portrait,tick){
  const adult=name==='Dad'||name==='Keeper'||name==='Rovers'&&color==='#d7ff4a';
  const pace=Math.hypot(p.vx||0,p.vy||0),moving=pace>.3;
  const stride=moving?Math.sin(tick*.19+pace*.1)*5.2:0;
  c.save();c.translate(p.x,p.y);if(portrait)c.rotate(-Math.PI/2);
  if(p.face<0)c.scale(-1,1);
  const shadow=c.createRadialGradient(0,23,2,0,23,28);shadow.addColorStop(0,'rgba(2,9,17,.5)');shadow.addColorStop(1,'transparent');
  ellipse(c,0,23,28,12,shadow);
  if(isLocal){
   c.save();c.shadowColor='#32d9ff';c.shadowBlur=15;
   c.strokeStyle='#52dbff';c.lineWidth=2.4;c.beginPath();c.ellipse(0,21,24,8,0,0,TAU);c.stroke();c.restore();
  }
  // Glossy cleats, calf socks, and shorts.
  c.lineCap='round';c.lineJoin='round';
  for(const dir of [-1,1]){
   c.strokeStyle='#152339';c.lineWidth=7;
   c.beginPath();c.moveTo(dir*5,8);c.lineTo(dir*(5+stride*.15),17);c.lineTo(dir*(7+stride*.5),25);c.stroke();
   c.strokeStyle='#f7fbff';c.lineWidth=5.8;
   c.beginPath();c.moveTo(dir*(5+stride*.15),16);c.lineTo(dir*(6+stride*.5),22);c.stroke();
   round(c,dir*(7+stride*.5)-5,24,10,5,3,adult?'#2e333d':'#187bde');
  }
  const kit=c.createLinearGradient(-13,-9,13,15);
  kit.addColorStop(0,adult?'#20272e':'#ecfaff');kit.addColorStop(.55,color);kit.addColorStop(1,adult?'#0a121d':'#187de0');
  round(c,-10,-8,20,24,5,kit);
  c.fillStyle=adult?'#d6fa52':'#20b6ef';c.fillRect(-10,-2,3,12);c.fillRect(7,-2,3,12);
  round(c,-9,11,18,5,2,adult?'#101825':'#132b4b');
  c.textAlign='center';c.textBaseline='middle';c.fillStyle=adult?'#d8ff8f':'#12325d';c.font='900 10px system-ui';
  c.fillText(adult?'01':'10',0,3);
  // Limbs with directional animation.
  c.strokeStyle=adult?'#d8a782':'#edb98d';c.lineWidth=5;
  for(const d of [-1,1]){c.beginPath();c.moveTo(d*9,-5);c.lineTo(d*16,-1+d*stride*.5);c.stroke();
   ellipse(c,d*16,-1+d*stride*.5,3,3,adult?'#cf976d':'#e7af84');}
  // Large expressive head with sculpted hair, rim highlights, eyes and smile.
  ellipse(c,0,-17,11,12,'rgba(0,0,0,.24)');
  const face=c.createRadialGradient(-3,-24,1,0,-17,15);
  face.addColorStop(0,adult?'#ffe0bd':'#fff1d1');face.addColorStop(1,adult?'#bb794f':'#d69e75');
  ellipse(c,0,-19,11,12,face);
  const hair=c.createLinearGradient(-8,-34,10,-21);
  hair.addColorStop(0,adult?'#171c27':'#3c2217');hair.addColorStop(.55,adult?'#3b3440':'#7d421d');hair.addColorStop(1,'#1c1721');
  c.fillStyle=hair;c.beginPath();c.moveTo(-10,-20);c.quadraticCurveTo(-15,-34,-6,-32);
  c.lineTo(-3,-37);c.lineTo(0,-33);c.lineTo(7,-35);c.lineTo(11,-27);c.lineTo(9,-20);
  c.quadraticCurveTo(5,-28,-1,-26);c.quadraticCurveTo(-5,-27,-10,-20);c.fill();
  if(adult){ellipse(c,0,-11.4,7.4,4,'#554038');ellipse(c,0,-12,4.6,1.5,'#b77b58');}
  for(const d of [-1,1]){ellipse(c,d*4,-19.3,2.1,2.4,'#fff');ellipse(c,d*4.1,-19.2,1,1.4,'#18293e');ellipse(c,d*4-.3,-19.7,.35,.45,'#fff');}
  c.strokeStyle=adult?'#82553e':'#b7735d';c.lineWidth=1.2;c.beginPath();c.arc(0,-14,3.4,.13,Math.PI-.13);c.stroke();
  // Floating readable label, stable regardless of orientation.
  round(c,-29,-50,58,14,5,'rgba(4,18,37,.91)');
  c.strokeStyle=adult?'#c2fa56':'#61d5ff';c.lineWidth=.6;c.strokeRect(-26,-49,52,12);
  c.font='800 9px system-ui';c.fillStyle='#fff';c.fillText(name,-0,-42);
  if(isLocal){c.fillStyle='#44cbff';c.beginPath();c.moveTo(-6,-54);c.lineTo(6,-54);c.lineTo(0,-49);c.closePath();c.fill();}
  c.restore();
 }
 function ball(c,p,pace){
  c.save();c.translate(p.x,p.y);c.shadowBlur=pace>3?16:8;c.shadowColor='#57ddff';
  const g=c.createRadialGradient(-3,-4,.5,0,0,9);g.addColorStop(0,'#fff');g.addColorStop(.65,'#f1f8ff');g.addColorStop(1,'#758fa5');
  ellipse(c,0,0,9,9,g);c.shadowBlur=0;
  c.fillStyle='#193149';c.beginPath();for(let i=0;i<5;i++){let a=i*TAU/5-.3;c.lineTo(Math.cos(a)*4.4,Math.sin(a)*4.4);}c.closePath();c.fill();
  for(let j=0;j<5;j++){let a=j*TAU/5;c.strokeStyle='#314459';c.lineWidth=1.2;line(c,Math.cos(a)*4.5,Math.sin(a)*4.5,Math.cos(a)*7.8,Math.sin(a)*7.8,1.1,'#314459');}
  c.restore();
 }
 function star(c,s,tick,reduced){
  c.save();c.translate(s.x,s.y);const pulse=reduced?1:1+Math.sin(tick*.06)*.07;
  glow(c,0,0,29,'rgba(255,225,43,.45)');c.scale(pulse,pulse);
  c.save();c.strokeStyle='#ffe571';c.lineWidth=1.4;c.setLineDash([3,3]);c.beginPath();c.ellipse(0,0,18,12,0,0,TAU);c.stroke();c.restore();
  c.shadowColor='#ffec57';c.shadowBlur=17;
  const gold=c.createLinearGradient(-9,-13,9,14);gold.addColorStop(0,'#fff8af');gold.addColorStop(.45,'#ffd42f');gold.addColorStop(1,'#ed890d');
  c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?6:14;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fillStyle=gold;c.fill();c.strokeStyle='#fff5ba';c.lineWidth=1.2;c.stroke();c.restore();
 }
 window.JozefVersusVisual=Object.freeze({stadium,player,ball,star});
})();