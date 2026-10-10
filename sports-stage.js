/* Jozef FC / Original Sports Arcade action scenes.
   Canvas is an OPTIONAL visual layer; all scoring is owned by multisport.js.
   No images, physics authority, storage, microphone or network calls. */
(() => {
  'use strict';
  const W=640,H=320,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const circle=(c,x,y,r,color)=>{
    c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
  };
  const line=(c,x1,y1,x2,y2,color,width=2)=>{
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);
    c.strokeStyle=color;c.lineWidth=width;c.stroke();
  };
  const rect=(c,x,y,w,h,color)=>{
    c.fillStyle=color;c.fillRect(x,y,w,h);
  };
  const text=(c,label,x,y,size=16,color='#f2fff2')=>{
    c.font='900 '+size+'px system-ui';c.textAlign='center';c.fillStyle=color;c.fillText(label,x,y);
  };
  const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const sports=['hockey','baseball','basketball','wrestling'];
  function create(){
    const canvas=document.getElementById('multi-action-canvas');
    const ctx=canvas?.getContext?.('2d');
    if(!ctx)return null;
    const stage=document.getElementById('multi-stage');
    stage?.classList?.add('has-canvas');
    let activeSport='hockey',round=0,rank=0,turnStart=Date.now(),action=null,raf=0,lastFrame=0,alive=true;
    const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    const visible=()=>!document.hidden&&Boolean(document.getElementById('sports-arcade')?.classList?.contains('active'));
    function stadium(c,s){
      const themes={
        hockey:['#caedfa','#b5ddec','#23608e'],
        baseball:['#176448','#195d45','#f2d8a8'],
        basketball:['#a75931','#b87346','#ffe1b3'],
        wrestling:['#17264f','#29204e','#bea1ff']
      };
      const [a,b,accent]=themes[s];
      rect(c,0,0,W,H,a);
      for(let i=0;i<8;i++)rect(c,0,i*42,W,42,i%2?b:a);
      if(s==='hockey'){
        ctx.strokeStyle='#be5c68';ctx.lineWidth=4;ctx.strokeRect(23,24,594,273);
        line(c,320,24,320,297,'#b75c68',3);
        for(const x of [142,490]){
          c.beginPath();c.arc(x,160,45,0,TAU);c.strokeStyle='#609bc1';c.lineWidth=3;c.stroke();
        }
        rect(c,224,29,192,8,'#ee6672');
        for(let i=0;i<13;i++)line(c,224+i*16,24,224+i*16,56,'#9ad9f3',1);
        text(c,'NIGHT RINK // JOZEF FC',320,311,11,'#11455e');
      }else if(s==='baseball'){
        c.save();c.translate(320,145);c.rotate(Math.PI/4);
        c.strokeStyle='#fff7d5';c.lineWidth=4;c.strokeRect(-120,-120,240,240);c.restore();
        rect(c,0,245,W,75,'#9a653d');
        circle(c,320,137,39,'#bb8d5a');circle(c,320,137,19,'#e9b47a');
        text(c,'JOZEF FC / HOME PLATE',320,309,12,'#fff0d8');
      }else if(s==='basketball'){
        ctx.strokeStyle='#ffe1b3';ctx.lineWidth=3;
        ctx.strokeRect(24,18,592,284);
        line(c,320,18,320,302,'#ffe1b3',2);
        c.beginPath();c.arc(320,159,51,0,TAU);c.stroke();
        c.beginPath();c.arc(480,159,90,.6*Math.PI,1.4*Math.PI);c.stroke();
        text(c,'JOZEF FC / 3-POINT NIGHT',320,311,12,'#fff0d4');
      }else{
        // A theatrical ring: not real physical-contact play.
        rect(c,0,0,W,73,'#091731');
        for(let i=0;i<13;i++){
          line(c,i*52,0,320+(i-6)*10,185,'#9473e027',10);
          circle(c,i*52,14,5,i%3===0?'#ecdeff':'#6e65b1');
        }
        rect(c,82,104,480,190,'#728cbb');
        rect(c,93,115,458,164,'#253763');
        for(let i=0;i<3;i++){
          line(c,79,112+i*64,561,112+i*64,'#cbb5ff',4);
        }
        for(const x of [80,560]){rect(c,x-5,98,10,201,'#d8c8ff');}
        text(c,'MAIN EVENT • NIGHT ARENA',320,44,15,'#f3eaff');
      }
      return accent;
    }
    function goalkeeper(c,x,y,color='#244b69'){
      circle(c,x+3,y+34,25,'#22343b40');
      line(c,x-14,y+8,x-20,y+37,'#1d3041',10);
      line(c,x+14,y+8,x+20,y+37,'#1d3041',10);
      rect(c,x-22,y-26,44,44,color);
      line(c,x-20,y-14,x-44,y+7,'#e7d1b6',10);
      line(c,x+20,y-14,x+44,y+7,'#e7d1b6',10);
      circle(c,x,y-39,13,'#deb99b');
      text(c,'G',x,y+3,20,'#edfff9');
    }
    function baseball(c,x,y,r=13){
      circle(c,x+3,y+5,r+1,'#01152253');
      circle(c,x,y,r,'#fff4dd');
      c.beginPath();c.arc(x-3,y,r*.69,-Math.PI*.5,Math.PI*.55);
      c.strokeStyle='#c84640';c.lineWidth=2;c.stroke();
      c.beginPath();c.arc(x+5,y,r*.72,.5*Math.PI,1.55*Math.PI);c.stroke();
    }
    function basketball(c,x,y,r=18){
      circle(c,x+3,y+6,r+2,'#1b180c52');
      circle(c,x,y,r,'#e88b3e');
      line(c,x-r,y,x+r,y,'#58351e',2);
      line(c,x,y-r,x,y+r,'#58351e',2);
      c.beginPath();c.arc(x,y,r*.84,-Math.PI/3,Math.PI/3);
      c.strokeStyle='#58351e';c.lineWidth=2;c.stroke();
    }
    function wrestler(c,x,y,colour,pose=0,flip=false){
      c.save();c.translate(x,y);if(flip)c.scale(-1,1);
      // Big-friendly superhero silhouettes and stage posing, no fighting moves.
      rect(c,-11,23,9,35,'#172138');rect(c,2,23,9,35,'#172138');
      rect(c,-21,-18,42,44,colour);
      line(c,-18,-10,-40,-28-pose*17,'#dbb89f',11);
      line(c,18,-10,40,-5-pose*24,'#dbb89f',11);
      circle(c,0,-34,15,'#edc8a6');
      rect(c,-13,-49,26,10,'#141a30');
      text(c,'J',0,8,22,'#fff4d8');
      c.restore();
    }
    function draw(){
      const c=ctx,now=Date.now(),elapsed=now-turnStart;
      const motion=!reduced();
      const inFlight=action&&motion;
      const t=inFlight?clamp((now-action.at)/820,0,1):1;
      c.clearRect(0,0,W,H);
      const accent=stadium(c,activeSport);
      if(activeSport==='hockey'){
        const goalieX=inFlight?lerp(320,[257,320,383][action.goalie??1],easeOut(t)) :
          motion?320+Math.sin(elapsed/460)*78:320;
        goalkeeper(c,goalieX,98);
        if(inFlight){
          const target=[257,320,383][action.choice]||320;
          circle(c,lerp(320,target,easeOut(t)),lerp(270,70,easeOut(t)),10,'#132e3a');
          if(t===1)text(c,action.made?'GOAL!':'SAVED!',320,214,36,action.made?'#267651':'#a03049');
        }else circle(c,320,257,12,'#172e3e');
        if(!inFlight)text(c,'THE GOALIE IS MOVING! PICK A CORNER',320,205,13,'#153f55');
      }else if(activeSport==='baseball'){
        // Ball approaches home plate over each 1.9-second cycle; swing outcome is authoritative in multisport.js.
        const cycle=clamp((elapsed%1900)/1900,0,1);
        const p=inFlight?easeOut(t):motion?clamp((cycle<.5?cycle:1-cycle)*2,0,1):.55;
        const ballX=lerp(320,360,p),ballY=lerp(115,240,p),radius=lerp(6,22,p);
        baseball(c,ballX,ballY,radius);
        line(c,440,155,390,245,'#e4bf7c',14);
        if(inFlight){
          line(c,440,155,390-t*90,245-t*70,'#ffcf8a',14);
          if(action.made){baseball(c,lerp(320,160,t),lerp(205,20,t)-Math.sin(t*Math.PI)*85,11);}
          if(t===1)text(c,action.made?'BASE HIT!':'NEXT PITCH!',320,60,34,'#fff5cc');
        }
      }else if(activeSport==='basketball'){
        rect(c,469,64,18,150,'#ebdcc3');
        rect(c,425,85,100,12,'#f9f9e3');
        c.beginPath();c.ellipse(475,135,40,13,0,0,TAU);
        c.strokeStyle='#ed622d';c.lineWidth=7;c.stroke();
        for(let k=-3;k<=3;k++)line(c,475+k*10,140,475+k*5,195,'#fff0dc88',2);
        if(inFlight){
          const endX=action.made?475:525;
          const x=lerp(146,endX,easeOut(t)),y=lerp(253,135,easeOut(t))-Math.sin(t*Math.PI)*140;
          basketball(c,x,y,18);
          if(t===1)text(c,action.made?'SWISH!':'KEEP SHOOTING!',315,67,32,'#fff2cf');
        }else{
          basketball(c,146,251,21);
          if(!motion)text(c,'RELEASE TO SHOOT',304,230,20,'#fff3dc');
        }
      }else{
        const wave=motion?Math.sin(now/410)*5:0;
        const celeb=inFlight&&action.made&&t>.2?1:0;
        wrestler(c,220,195,'#c8ff5a',celeb,false);
        wrestler(c,424+wave,195,rank>=2?'#f4ba5b':'#9e85ff',motion?Math.abs(wave)/5:0,true);
        if(inFlight&&t===1)text(c,action.made?'THE CROWD GOES WILD!':'NEXT SHOW MOMENT!',320,81,22,'#f2ddff');
        else text(c,rank>=2?'CHAMPIONSHIP NIGHT':'LIGHTS • CAMERA • ACTION',320,86,18,'#ead9ff');
      }
    }
    function frame(timestamp){
      raf=0;
      if(!alive||!visible())return;
      if(timestamp-lastFrame>=28||!lastFrame){draw();lastFrame=timestamp;}
      raf=window.requestAnimationFrame?.(frame)||0;
    }
    function refresh(){
      if(!alive)return;
      draw();
      if(!reduced()&&visible()&&!raf)raf=window.requestAnimationFrame?.(frame)||0;
    }
    // The visible goalie, not a hidden roll, determines the Pro shot lane.
    // Keep a fallback for reduced-motion and old browsers.
    function getGoalie(){
      if(activeSport!=='hockey')return null;
      if(reduced())return 1;
      const x=320+Math.sin((Date.now()-turnStart)/460)*78;
      return x<291?0:x>349?2:1;
    }
    function begin(s,opts={}){
      if(!sports.includes(s))return;
      activeSport=s;round=opts.round||0;rank=opts.rank||0;action=null;turnStart=Date.now();
      refresh();
    }
    function shoot(opts={}){
      action={
        at:Date.now(),made:Boolean(opts.made),goalie:clamp(Number(opts.goalie)||0,0,2),
        choice:clamp(Number(opts.choice)||0,0,2)
      };
      refresh();
    }
    function suspend(){if(raf){window.cancelAnimationFrame?.(raf);raf=0;}}
    window.addEventListener?.('pageshow',refresh);
    document.addEventListener?.('visibilitychange',()=>{if(document.hidden)suspend();else refresh()});
    document.querySelector?.('[data-section="sports-arcade"]')?.addEventListener?.('click',refresh);
    return Object.freeze({begin,shoot,refresh,suspend,getGoalie});
  }
  window.JozefSportStage=Object.freeze({create});
})();