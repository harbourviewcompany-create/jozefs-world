/* JOZEF WORLD CORE | native WebGL spatial HQ.
 * Entirely same-origin, no telemetry, dependencies or third-party models.
 * The 12 convex physical plates are individually selectable 3D meshes. */
(function(root){
'use strict';
const PHI=(1+Math.sqrt(5))/2;
const V=[
 [-1,PHI,0],[1,PHI,0],[-1,-PHI,0],[1,-PHI,0],
 [0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],
 [PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1]
];
const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b,s=1)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];
const DESTINATIONS=Object.freeze([
 {id:'adventure',title:'Adventure',tag:'EXPLORE',symbol:'A',description:'Explore mysterious worlds, hidden routes and rival champions.',route:'adventure',color:'#c5fc79'},
 {id:'together',title:'Together',tag:'DUO QUEST',symbol:'2',description:'Jozef and Dad solve cooperative mysteries, build their legacy and win as a team.',route:'together',color:'#85e8e7'},
 {id:'neon',title:'Neon City',tag:'NIGHT RUN',symbol:'N',description:'Enter the living neon city and discover the next chapter.',href:'prime/neon.html',color:'#bd9cff'},
 {id:'prime',title:'Prime Arena',tag:'FIVE SPORTS',symbol:'11',description:'Football, hockey, basketball, baseball and wrestling showtime.',href:'prime/',color:'#ffc77f'},
 {id:'versus',title:'Versus',tag:'FACE OFF',symbol:'VS',description:'Play head-to-head or practice your game against a challenger.',route:'versus',color:'#ff9d8d'},
 {id:'street',title:'Street // 11',tag:'AFTER DARK',symbol:'S',description:'Take to the streets for skill, speed and a new personal best.',href:'prime/?mode=street',color:'#ffcf80'},
 {id:'sports',title:'Sports Arcade',tag:'ALL SPORTS',symbol:'4',description:'Play hockey, baseball, basketball and wrestling challenges.',route:'sports-arcade',color:'#8cecff'},
 {id:'career',title:'Career',tag:'SEASON MODE',symbol:'C',description:'Build Jozef FC across seasons, fixtures and trophy races.',route:'career',color:'#a9c7ff'},
 {id:'tour',title:'World Tour',tag:'GLOBAL CUP',symbol:'W',description:'Travel the world, face fresh clubs and chase the cup.',route:'tour',color:'#93e9ac'},
 {id:'club',title:'My Club',tag:'LEGACY',symbol:'HQ',description:'See Jozef and Dad’s kits, milestones, keepsakes and trophies.',route:'club',color:'#ffdf9b'},
 {id:'playbook',title:'Playbook',tag:'NEXT MISSION',symbol:'P',description:'Find what to do next across every world and sport.',route:'playbook',color:'#b3fc95'},
 {id:'training',title:'Training',tag:'LEVEL UP',symbol:'T',description:'Sharpen your skills and unlock the next challenge.',route:'training',color:'#9ce4ec'}
].map((entry,i)=>Object.freeze({...entry,normal:Object.freeze(norm(V[i]))})));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rotate=(v,yaw,pitch)=>{
 const x=v[0]*Math.cos(yaw)+v[2]*Math.sin(yaw),
       z=v[2]*Math.cos(yaw)-v[0]*Math.sin(yaw);
 return [x,v[1]*Math.cos(pitch)-z*Math.sin(pitch),v[1]*Math.sin(pitch)+z*Math.cos(pitch)];
};
const unrotate=(v,yaw,pitch)=>{
 const y=v[1]*Math.cos(pitch)+v[2]*Math.sin(pitch),
       z=v[2]*Math.cos(pitch)-v[1]*Math.sin(pitch);
 return [v[0]*Math.cos(yaw)-z*Math.sin(yaw),y,v[0]*Math.sin(yaw)+z*Math.cos(yaw)];
};
function hitTest(nx,ny,yaw,pitch){
 const rr=nx*nx+ny*ny;if(rr>1)return -1;
 const ray=unrotate([nx,ny,Math.sqrt(1-rr)],yaw,pitch);
 let best=-1,score=Math.cos(.48);
 for(let i=0;i<DESTINATIONS.length;i++){
  const s=dot(ray,DESTINATIONS[i].normal);
  if(s>score){score=s;best=i;}
 }
 return best;
}
function plateGeometry(normal){
 // A pentagonal cast-metal tile with three real radial bevel levels, all on
 // one globe surface. Underlying sphere is separate; the plate casts its own
 // surface highlight and dark under-rim.
 const pole=Math.abs(normal[1])>.93?[1,0,0]:[0,1,0];
 const u=norm(cross(pole,normal)),v=norm(cross(normal,u));
 const pt=(angle,r,height)=>{
  const tang=add(u.map(x=>x*Math.cos(angle)),v,Math.sin(angle));
  return norm(add(normal.map(x=>x*Math.cos(r)),tang,Math.sin(r))).map(x=>x*height);
 };
 const rings=[[.505,1.022],[.465,1.032],[.418,1.074],[.392,1.081]];
 const verts=[],normals=[],colors=[];
 const triangle=(a,b,c,tint)=>{
  const n=norm(cross(add(b,a,-1),add(c,a,-1)));
  for(const p of [a,b,c]){verts.push(...p);normals.push(...n);colors.push(tint);}
 };
 const radial=5,rot=Math.PI/2;
 for(let k=0;k<rings.length-1;k++){
  const [r1,h1]=rings[k],[r2,h2]=rings[k+1];
  for(let j=0;j<radial;j++){
   const a=rot+(j/radial)*Math.PI*2,b=rot+((j+1)/radial)*Math.PI*2;
   const p1=pt(a,r1,h1),p2=pt(b,r1,h1),q1=pt(a,r2,h2),q2=pt(b,r2,h2);
   triangle(p1,p2,q1,k===0?.52:k===1?.7:.92);
   triangle(p2,q2,q1,k===0?.52:k===1?.7:.92);
  }
 }
 for(let j=0;j<radial;j++){
  const a=rot+(j/radial)*Math.PI*2,b=rot+((j+1)/radial)*Math.PI*2;
  triangle(pt(a,.392,1.081),pt(b,.392,1.081),normal.map(x=>x*1.087),1);
 }
 return {positions:new Float32Array(verts),normals:new Float32Array(normals),tints:new Float32Array(colors)};
}
function sphereGeometry(){
 const vertices=[],normals=[],tints=[],r=1,lat=46,lon=72;
 for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){
  const sample=(row,col)=>{const t=row/lat*Math.PI,p=col/lon*Math.PI*2;
   return [Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)];};
  const a=sample(y,x),b=sample(y+1,x),c=sample(y,x+1),d=sample(y+1,x+1);
  for(const p of [a,b,c,c,b,d]){vertices.push(...p.map(v=>v*r));normals.push(...p);tints.push(1);}
 }
 return {positions:new Float32Array(vertices),normals:new Float32Array(normals),tints:new Float32Array(tints)};
}
function glRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,powerPreference:'high-performance'})
 ||canvas.getContext('experimental-webgl',{alpha:true,antialias:true,depth:true});
 if(!gl)return null;
 const vertex=`attribute vec3 p;attribute vec3 n;attribute float bevel;
 uniform vec2 rotation;uniform float scale;
 varying vec3 normal;varying vec3 point;varying float finish;
 void main(){
 float cy=cos(rotation.x),sy=sin(rotation.x),cx=cos(rotation.y),sx=sin(rotation.y);
 vec3 a=vec3(p.x*cy+p.z*sy,p.y,p.z*cy-p.x*sy);
 vec3 b=vec3(a.x,a.y*cx-a.z*sx,a.y*sx+a.z*cx);
 vec3 nn=vec3(n.x*cy+n.z*sy,n.y,n.z*cy-n.x*sy);
 normal=normalize(vec3(nn.x,nn.y*cx-nn.z*sx,nn.y*sx+nn.z*cx));
 point=b;finish=bevel;
 gl_Position=vec4(b.xy*scale,-b.z*.24,1.);
 }`;
 const fragment=`precision mediump float;
 uniform vec3 color;uniform float core;uniform float selected;uniform float time;
 varying vec3 normal;varying vec3 point;varying float finish;
 void main(){
 vec3 n=normalize(normal);
 float light=max(dot(n,normalize(vec3(-.54,.79,1.0))),0.);
 float fill=max(dot(n,normalize(vec3(.85,-.35,.32))),0.);
 float rim=pow(1.-max(n.z,0.),2.6);
 float speck=pow(max(dot(reflect(normalize(vec3(.54,-.79,-1.)),n),vec3(0.,0.,1.)),0.),48.);
 float brushed=sin(point.x*156.+sin(point.y*184.)*.7)*.016;
 vec3 base=mix(color*vec3(.24,.36,.44),color*1.17,light*.82+fill*.13);
 base+=vec3(.44,.67,.82)*rim*.22 + vec3(.86,.94,1.)*speck*.46;
 if(core>.5){
  float bands=pow(abs(sin(atan(point.x,point.z)*9.)),42.);
  base=mix(base,vec3(.015,.09,.14),bands*.48);
  base+=vec3(.016,.023,.028)*sin(point.y*140.)*sin(point.x*90.);
 }else{
  base=mix(base*.4,base,finish);
  base+=vec3(brushed)+color*selected*(.18+.13*sin(time*2.));
 }
 gl_FragColor=vec4(base,1.);
 }`;
 function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh)||'Shader compile failed');return sh;}
 const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(prog);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('Unable to link world-core shader');
 gl.useProgram(prog);
 const attr={p:gl.getAttribLocation(prog,'p'),n:gl.getAttribLocation(prog,'n'),bevel:gl.getAttribLocation(prog,'bevel')};
 const uniforms={rotation:gl.getUniformLocation(prog,'rotation'),scale:gl.getUniformLocation(prog,'scale'),color:gl.getUniformLocation(prog,'color'),core:gl.getUniformLocation(prog,'core'),selected:gl.getUniformLocation(prog,'selected'),time:gl.getUniformLocation(prog,'time')};
 const createMesh=geo=>{
  const make=data=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return buffer;};
  return {b:[make(geo.positions),make(geo.normals),make(geo.tints)],count:geo.tints.length};
 };
 const globe=createMesh(sphereGeometry());
 const panels=DESTINATIONS.map(item=>createMesh(plateGeometry(item.normal)));
 const colors=DESTINATIONS.map(item=>item.color.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255));
 const rgb=hex=>hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255);
 const drawMesh=(mesh,color,core,selected,rotation,scale,time)=>{
  gl.uniform3fv(uniforms.color,color);gl.uniform1f(uniforms.core,core);gl.uniform1f(uniforms.selected,selected);gl.uniform2fv(uniforms.rotation,rotation);gl.uniform1f(uniforms.scale,scale);gl.uniform1f(uniforms.time,time);
  [attr.p,attr.n,attr.bevel].forEach((location,i)=>{
   gl.bindBuffer(gl.ARRAY_BUFFER,mesh.b[i]);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,i===2?1:3,gl.FLOAT,false,0,0);
  });gl.drawArrays(gl.TRIANGLES,0,mesh.count);
 };
 const render=(yaw,pitch,scale,selected,time)=>{
  if(gl.isContextLost())return false;
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
  const rotation=[yaw,pitch];
  drawMesh(globe,rgb('#1b3b4a'),1,0,rotation,scale,time);
  for(let i=0;i<panels.length;i++)drawMesh(panels[i],colors[i],0,i===selected?1:0,rotation,scale,time);
  return true;
 };
 const dispose=()=>{[globe,...panels].forEach(mesh=>mesh.b.forEach(b=>gl.deleteBuffer(b)));gl.deleteProgram(prog);};
 return {render,dispose,gl};
}
if(typeof module!=='undefined'&&module.exports)module.exports={DESTINATIONS,hitTest,rotate,unrotate,sphereGeometry,plateGeometry};
if(typeof document==='undefined')return;
const host=document.getElementById('jw-worldcore');
if(!host)return;
const $=id=>document.getElementById(id);
const canvas=$('jw-worldcore-canvas'),overlay=$('jw-worldcore-labels'),list=$('jw-worldcore-index');
const reduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
let graphics=null,selected=0,yaw=0,pitch=0,velocity=[0,0],target=null,zoom=1,frame=0,last=0,drag=null,visible=false,disposed=false,forceFallback=false;
let touchCount=0,pinchStart=0,pinchZoom=1;
const labels=[];
function say(msg){const el=$('jw-worldcore-announcement');if(el)el.textContent=msg;}
function isActive(){return !!document.getElementById('home')?.classList.contains('active')&&!document.hidden;}
function setDetail(){
 const d=DESTINATIONS[selected];
 $('jw-worldcore-selected-type').textContent=d.tag;
 $('jw-worldcore-selected-title').textContent=d.title;
 $('jw-worldcore-selected-description').textContent=d.description;
 $('jw-worldcore-enter').textContent='ENTER '+d.title.toUpperCase()+' ↗';
 $('jw-worldcore-detail').style.setProperty('--plate-accent',d.color);
 for(const node of labels)node.classList.toggle('is-selected',Number(node.dataset.plate)===selected);
 for(const btn of list.querySelectorAll('button[data-world]'))btn.setAttribute('aria-current',String(Number(btn.dataset.world)===selected));
}
function focusPlate(i,announce=true){
 if(!Number.isInteger(i)||i<0||i>=DESTINATIONS.length)return;
 selected=i;velocity=[0,0];
 // Solve for the plate normal facing camera, then use the nearest revolutions.
 const raw=DESTINATIONS[i].normal;
 const wrap=(angle,current)=>angle+Math.PI*2*Math.round((current-angle)/(Math.PI*2));
 target={yaw:wrap(-Math.atan2(raw[0],raw[2]),yaw),
         pitch:wrap(Math.atan2(raw[1],Math.hypot(raw[0],raw[2])),pitch)};
 if(reduced){yaw=target.yaw;pitch=target.pitch;target=null;}
 setDetail();if(announce)say(DESTINATIONS[i].title+' selected. Choose Enter to open this world.');
 start();
}
function enter(i=selected){
 if(!Number.isInteger(i)||i<0||i>=DESTINATIONS.length)return false;
 const d=DESTINATIONS[i];
 if(d.id==='together'){root.JozefTogether?.start?.();return true;}
 if(d.href){root.location.assign(d.href);return true;}
 if(d.route){root.showSection?.(d.route);return true;}
 return false;
}
function graphicsFallback(message){
 forceFallback=true;host.classList.add('is-fallback');
 canvas.hidden=true;
 $('jw-worldcore-fallback').hidden=false;
 list.hidden=false;graphics?.dispose?.();graphics=null;
 say(message||'The world index is ready. Select a plate using the world buttons.');
}
function resize(){
 if(!graphics||forceFallback)return;
 const box=canvas.getBoundingClientRect(),size=clamp(Math.round(box.width*(root.devicePixelRatio||1)),300,1350);
 if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;}
}
function makeLabels(){
 for(let i=0;i<DESTINATIONS.length;i++){
  const d=DESTINATIONS[i];
  const label=document.createElement('div');label.className='jw-worldcore-plate-label';label.dataset.plate=String(i);
  const symbol=document.createElement('strong');symbol.textContent=d.symbol;
  const name=document.createElement('span');name.textContent=d.title;
  label.style.setProperty('--plate-accent',d.color);label.append(symbol,name);overlay.append(label);labels.push(label);
  const button=document.createElement('button');button.type='button';button.dataset.world=String(i);
  const mark=document.createElement('span');mark.className='jw-worldcore-index-symbol';mark.textContent=d.symbol;
  const info=document.createElement('span');const title=document.createElement('strong');title.textContent=d.title;
  const tag=document.createElement('small');tag.textContent=d.tag;info.append(title,tag);
  button.append(mark,info);
  button.addEventListener('click',()=>{focusPlate(i);if(forceFallback)enter(i);});
  list.append(button);
 }
}
function updateLabels(){
 const half=canvas.clientWidth/2;
 for(let i=0;i<DESTINATIONS.length;i++){
  const v=rotate(DESTINATIONS[i].normal,yaw,pitch),el=labels[i];
  const front=v[2]>.33;
  el.style.opacity=front?'1':'0';
  el.style.visibility=front?'visible':'hidden';
  el.style.transform='translate3d('+Math.round(half+v[0]*half*.83*zoom)+'px,'+Math.round(half-v[1]*half*.83*zoom)+'px,0) translate(-50%,-50%)';
  el.classList.toggle('is-selected',i===selected);
 }
}
function paint(t){
 frame=0;
 if(disposed||!graphics||!isActive())return;
 resize();
 const dt=last?clamp((t-last)/1000,0,.06):.016;last=t;
 const motion=(!reduced&&!drag)?dt:0;
 if(target){
  const easing=reduced?1:1-Math.exp(-dt*5.6);
  yaw+=(target.yaw-yaw)*easing;pitch+=(target.pitch-pitch)*easing;
  if(Math.abs(yaw-target.yaw)+Math.abs(pitch-target.pitch)<.003)target=null;
 }else if(motion){
  yaw+=velocity[0]*dt;pitch+=velocity[1]*dt;
  velocity[0]*=Math.exp(-dt*3.8);velocity[1]*=Math.exp(-dt*3.8);
  if(Math.abs(velocity[0])+Math.abs(velocity[1])<.018){velocity=[0,0];yaw+=dt*.048;}
 }
 try{graphics.render(yaw,pitch,.83*zoom,selected,t*.001);}
 catch(_){graphicsFallback('3D graphics paused. The complete world index remains available.');return;}
 updateLabels();
 if(!reduced||target)start();
}
function start(){if(frame||!graphics||!isActive()||disposed)return;frame=root.requestAnimationFrame(paint);}
function stop(){if(frame)root.cancelAnimationFrame(frame);frame=0;last=0;}
function coordinates(e){
 const rect=canvas.getBoundingClientRect();
 return [(e.clientX-rect.left-rect.width/2)/(rect.width*.5*.83*zoom),-(e.clientY-rect.top-rect.height/2)/(rect.height*.5*.83*zoom)];
}
function pick(e){
 const xy=coordinates(e);return hitTest(xy[0],xy[1],yaw,pitch);
}
function pointerDown(e){
 if(e.button!==0&&e.pointerType==='mouse')return;
 if(!graphics)return;
 e.preventDefault();
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,at:performance.now(),moved:0,lastX:e.clientX,lastY:e.clientY};
 target=null;velocity=[0,0];canvas.setPointerCapture?.(e.pointerId);
}
function pointerMove(e){
 if(!drag||drag.id!==e.pointerId)return;
 e.preventDefault();
 const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;
 drag.moved+=Math.abs(dx)+Math.abs(dy);
 if(drag.moved>7){
  const radius=Math.max(120,canvas.clientWidth);
  const deltaYaw=dx/radius*3.6,deltaPitch=dy/radius*3.6;
  yaw+=deltaYaw;pitch+=deltaPitch;
  velocity=[deltaYaw*40,deltaPitch*40];
 }
 drag.lastX=e.clientX;drag.lastY=e.clientY;
 start();
}
function pointerUp(e){
 if(!drag||drag.id!==e.pointerId)return;
 const was=drag;drag=null;
 try{canvas.releasePointerCapture?.(e.pointerId);}catch(_){}
 if(was.moved<13&&performance.now()-was.at<700){
  const plate=pick(e);
  if(plate>=0){if(selected===plate&&dot(rotate(DESTINATIONS[plate].normal,yaw,pitch),[0,0,1])>.92)enter(plate);else focusPlate(plate);}
  else say('Spin the globe to reveal another world plate, or open the world index.');
 }
 start();
}
function init(){
 makeLabels();setDetail();
 $('jw-worldcore-enter').addEventListener('click',()=>enter());
 $('jw-worldcore-list-toggle').addEventListener('click',()=>{
  const opened=list.hidden;list.hidden=!opened;
  $('jw-worldcore-list-toggle').setAttribute('aria-expanded',String(opened));
  if(opened){list.querySelector('button[data-world]')?.focus();say('World index opened. Choose a destination.');}
 });
 $('jw-worldcore-dashboard').addEventListener('click',()=>{
  const expanded=host.classList.toggle('show-dashboard');
  host.parentElement.classList.toggle('jw-hq-more-open',expanded);
  host.setAttribute('data-dashboard',String(expanded));
  $('jw-worldcore-dashboard').setAttribute('aria-expanded',String(expanded));
  $('jw-worldcore-dashboard').textContent=expanded?'HIDE DASHBOARD':'CLUB DASHBOARD ↗';
 });
 canvas.addEventListener('pointerdown',pointerDown);
 canvas.addEventListener('pointermove',pointerMove);
 canvas.addEventListener('pointerup',pointerUp);
 canvas.addEventListener('pointercancel',()=>{drag=null;velocity=[0,0];});
 canvas.addEventListener('lostpointercapture',()=>{drag=null;});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();graphicsFallback('Graphics device reset. Use the accessible world index below.');});
 canvas.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();zoom=clamp(zoom-e.deltaY*.0006,.8,1.19);start();},{passive:false});
 canvas.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();target=null;velocity=[0,0];
   if(e.key==='ArrowLeft')yaw-=.25;else if(e.key==='ArrowRight')yaw+=.25;
   else if(e.key==='ArrowUp')pitch-=.25;else pitch+=.25;
   start();
  }else if(e.key==='Enter'||e.key===' '){e.preventDefault();enter();}
 });
 root.addEventListener('hashchange',()=>{if(isActive())start();else stop();});
 document.addEventListener('visibilitychange',()=>{if(isActive())start();else stop();});
 root.addEventListener('resize',()=>{resize();start();},{passive:true});
 if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{
  visible=entries[0]?.isIntersecting||false;
  if(visible&&isActive())start();else if(!isActive())stop();
 },{threshold:.01}).observe(host);
 try{
  graphics=glRenderer(canvas);
  if(!graphics)graphicsFallback('WebGL is not supported. Every world is still available below.');
  else {resize();focusPlate(0,false);start();}
 }catch(_){graphicsFallback('3D graphics unavailable. All worlds remain reachable below.');}
}
root.JozefWorldCore=Object.freeze({DESTINATIONS,focusPlate,enter,hitTest,progress:()=>({selected:DESTINATIONS[selected].id,webgl:!!graphics,fallback:forceFallback})});
init();
})(typeof window!=='undefined'?window:globalThis);
