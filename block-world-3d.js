/* Daddy + Jozef Block World 3D. Native WebGL; offline-first; procedural chunk streaming. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),canvas=$('view'),gl=canvas.getContext('webgl',{antialias:false,alpha:false})||canvas.getContext('experimental-webgl');
if(!gl){$('fallback').hidden=false;$('mission').textContent='WebGL is unavailable on this device.';return;}
const CH=12,MAX_Y=27,R=2,KEY='jozefs-block-3d-v1';
const types=['Air','Grass','Dirt','Stone','Wood','Leaves','Sand','Snow','Crystal','Planks','Brick','Glass'];
const col=[[0,0,0],[.34,.72,.36],[.53,.38,.26],[.53,.60,.68],[.53,.32,.16],[.20,.51,.32],[.87,.74,.47],[.86,.92,.96],[.38,.80,.95],[.73,.51,.30],[.60,.36,.29],[.70,.85,.93], /* render-only hero palette */[.96,.71,.51],[.23,.14,.11],[.09,.56,.89],[.17,.74,.47],[.09,.17,.22],[.19,.32,.52],[.26,.19,.16],[.84,.95,.96],[.97,.72,.30],[.32,.19,.11],[.11,.39,.22]];
const faces=[[[0,1,0],[[0,1,0],[0,1,1],[1,1,1],[1,1,0]]],[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],[[1,0,0],[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]],[[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]]];
const missions=[['Gather wood','Mine eight wood blocks','wood',8,25],['Build our base','Place twelve blocks together','placed',12,30],['Explore a biome','Discover the far desert or snow ridge','explore',1,35],['Mine a crystal','Find a rare glowing crystal','crystal',1,40],['Defeat the Crystal Golem','Find the guardian at 32, 32','boss',1,60],['Activate the portal','Bring both heroes to 40, 40','portal',1,80]];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
let seed=Math.floor(Math.random()*1e9),realm=0,baseSeed=seed,dimensions={},edits=new Map(),chunks=new Map(),queue=[],lastCX=Infinity,lastCZ=Infinity;
const DIMKEY='jozefs-block-3d-dimensions-v1';
let selected=4,creative=true,third=true,sound=false,stage=0,stats={wood:0,placed:0,explore:0,crystal:0,boss:0,portal:0},rewards=[],discovered={},defeated=false,portalOpened=false;
const hero={x:2.5,y:12,z:2.5,vy:0,yaw:0,pitch:-.24,role:0,hp:100,ground:false,double:false,inventory:{}};
const companion={x:4.5,y:12,z:4.5,role:1,hp:100};
let boss={x:32.5,y:12,z:32.5,hp:120,alive:true},mobs=[],clock=0,last=0,frames=0,dirty=false,saveClock=0,skyPhase=0;
let quality='AUTO',adaptiveCap=1.5,renderCap=1.5,averageFrame=.0167,lastChunksDrawn=0,webglLost=false,chaseCam=null;
let effects=[],audioCtx=null;
function tone(kind){
 if(!sound)return;
 try{
  const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
  audioCtx??=new Context();
  if(audioCtx.state==='suspended')audioCtx.resume?.().catch?.(()=>{});
  const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  const first=kind==='reward'?520:kind==='place'?430:kind==='attack'?170:240;
  osc.type=kind==='reward'?'sine':'triangle';
  osc.frequency.setValueAtTime(first,now);
  osc.frequency.exponentialRampToValueAtTime(kind==='reward'?880:first*.64,now+.17);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.028,now+.014);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.19);
  osc.connect(gain).connect(audioCtx.destination);osc.start(now);osc.stop(now+.21);
 }catch{/* Sound never blocks gameplay on devices without Web Audio. */}
}
function effectBurst(x,y,z,id=8){
 const count=quality==='ECO'?4:11;
 for(let i=0;i<count&&effects.length<80;i++){
  const a=i*2.39996;
  effects.push({x:x+.5,y:y+.5,z:z+.5,
   vx:Math.cos(a)*(1.3+i*.04),vy:1.2+(i%5)*.34,vz:Math.sin(a)*(1.3+i*.04),
   life:.35+(i%3)*.12,id:id===4?4:id===3?7:8});
 }
}
let menuPaused=false;
let guestActive=false;
let keys={},joy={x:0,y:0},gamepadHeld={mine:false,place:false,attack:false},jumpWasDown=false,look=null,peer=null,conn=null,host=false,invite='',lastNet=0,remote=false,noticeTo=0,renderOk=false;
const rnd=(x,z,s)=>{let n=Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(s|0,2246822519);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
function noise(x,z,s){let X=Math.floor(x/s),Z=Math.floor(z/s),u=x/s-X,v=z/s-Z;
 u=u*u*(3-2*u);v=v*v*(3-2*v);
 const mix=(a,b,t)=>a+(b-a)*t;
 return mix(mix(rnd(X,Z,seed),rnd(X+1,Z,seed),u),mix(rnd(X,Z+1,seed),rnd(X+1,Z+1,seed),u),v);
}
const surfaceCache=new Map(),biomeCache=new Map(),treeCache=new Map();
function memo(cache,key,fn){if(cache.has(key))return cache.get(key);if(cache.size>50000)cache.clear();const v=fn();cache.set(key,v);return v;}
function height(x,z){x=Math.floor(x);z=Math.floor(z);return memo(surfaceCache,seed+':'+x+':'+z,()=>clamp(Math.floor(4+noise(x,z,26)*8+noise(x,z,9)*4),3,19));}
function biome(x,z){x=Math.floor(x);z=Math.floor(z);return memo(biomeCache,seed+':'+x+':'+z,()=>{const n=noise(x+132,z-45,75);return n>.68?'Snow Ridge':n<.34?'Desert':n>.51?'Evergreen Forest':'Meadows';});}
function tree(x,z){return memo(treeCache,seed+':'+x+':'+z,()=>{if(x>=-4&&x<=8&&z>=-7&&z<=10)return false;return rnd(x,z,seed+42)>.982&&biome(x,z)!=='Desert';});}
const tag=(x,y,z)=>x+','+y+','+z;
function natural(x,y,z){
 if(y<0)return 3;if(y>=MAX_Y)return 0;
 const h=height(x,z),b=biome(x,z);
 if(y<=h){
  if(y>1&&y<h-3&&Math.sin(x*.42+y*.67+seed*.00003)+Math.cos(z*.35-y*.63)>1.78)return 0;
  if(y===h)return b==='Desert'?6:b==='Snow Ridge'?7:1;
  if(y>h-3)return b==='Desert'?6:2;
  return rnd(x+y,z,seed+98)>.993?8:3;
 }
 if(y>h+7)return 0;
 for(let ox=-2;ox<=2;ox++)for(let oz=-2;oz<=2;oz++){
  const X=x+ox,Z=z+oz;if(!tree(X,Z))continue;
  const th=height(X,Z);
  if(!ox&&!oz&&y>th&&y<=th+4)return 4;
  if(y>=th+3&&y<=th+6&&Math.abs(ox)+Math.abs(oz)+Math.abs(y-th-5)<=4)return 5;
 }
 return 0;
}
function block(x,y,z){x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);const k=tag(x,y,z);return edits.has(k)?edits.get(k):natural(x,y,z);}
function modify(x,y,z,id,broadcast=true){
 if(![x,y,z,id].every(Number.isInteger)||y<1||y>=MAX_Y||id<0||id>=types.length)return false;
 edits.set(tag(x,y,z),id);
 const cx=Math.floor(x/CH),cz=Math.floor(z/CH);
 for(const [a,b] of [[cx,cz],[cx+1,cz],[cx-1,cz],[cx,cz+1],[cx,cz-1]]){const c=chunks.get(a+':'+b);if(c)c.dirty=true;}
 dirty=true;if(broadcast&&host)send({t:'edit',x,y,z,id});return true;
}
function cube(v,x,y,z,id,size=1,mask=null){
 const grain=.96+rnd(Math.floor(x*3),Math.floor(z*3),Math.floor(y*5)+id)*.09;
 for(let j=0;j<6;j++){
  if(mask&&!mask[j])continue;
  const f=faces[j][1],shade=[1,.79,.83,.48,.67,.68][j]*grain;
  let c=col[id]||col[3];
  // Grassy/snowy surfaces have soil and rock sidewalls, not solid colour cubes.
  if(id===1&&j!==0)c=j===3?[.38,.29,.20]:[.48,.34,.22];
  if(id===7&&j!==0)c=[.55,.63,.69];
  if(id===4&&j===0)c=[.72,.54,.32];
  for(const i of [0,1,2,0,2,3]){
   const q=f[i];
   v.push(x+q[0]*size,y+q[1]*size,z+q[2]*size,
    Math.min(1,c[0]*shade),Math.min(1,c[1]*shade),Math.min(1,c[2]*shade),id,...faces[j][0]);
  }
 }
}
function chunkMesh(cx,cz){
 const v=[];
 for(let x=cx*CH;x<(cx+1)*CH;x++)for(let z=cz*CH;z<(cz+1)*CH;z++){
  const h=height(x,z);
  for(let y=0;y<Math.min(MAX_Y,h+8);y++){
   const id=block(x,y,z);if(!id)continue;
   const exposed=faces.map(f=>!block(x+f[0][0],y+f[0][1],z+f[0][2]));
   if(exposed.some(Boolean))cube(v,x,y,z,id,1,exposed);
  }
  // Deterministic flowers and ice crystals are baked into the chunk buffer.
  const top=height(x,z),zone=biome(x,z),chance=rnd(x,z,seed+915);
  if(zone==='Meadows'&&chance>.972&&block(x,top+1,z)===0){
   cube(v,x+.43,top+1,z+.43,5,.13);
   cube(v,x+.39,top+1.12,z+.39,chance>.987?8:7,.23);
  }
  if(zone==='Snow Ridge'&&chance>.991&&block(x,top+1,z)===0)cube(v,x+.27,top+1,z+.27,8,.19);
  if(block(x,top+1,z)===0&&chance>.86&&chance<.973){
   if(zone==='Evergreen Forest'){
    cube(v,x+.42,top+1,z+.43,5,.16);
    cube(v,x+.35,top+1.14,z+.35,chance>.942?10:1,.28);
   }else if(zone==='Meadows'){
    cube(v,x+.46,top+1,z+.42,5,.10);
    cube(v,x+.37,top+1.12,z+.37,chance>.93?8:7,.23);
   }else if(zone==='Desert'&&chance>.951){
    cube(v,x+.28,top+1,z+.32,6,.42);cube(v,x+.33,top+1.42,z+.37,6,.32);
   }else if(zone==='Snow Ridge')cube(v,x+.37,top+1,z+.37,8,.22);
  }
 }
 const k=cx+':'+cz,old=chunks.get(k);if(old)gl.deleteBuffer(old.buffer);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);
 chunks.set(k,{buffer,count:v.length/10,dirty:false,cx,cz});
}
function stream(){
 const cx=Math.floor(hero.x/CH),cz=Math.floor(hero.z/CH);
 if(cx!==lastCX||cz!==lastCZ){lastCX=cx;lastCZ=cz;queue=[];
  for(let r=0;r<=R;r++)for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++)if(Math.max(Math.abs(x),Math.abs(z))===r)queue.push([cx+x,cz+z]);
  for(const [k,c]of chunks){const [a,b]=k.split(':').map(Number);if(Math.abs(a-cx)>R+1||Math.abs(b-cz)>R+1){gl.deleteBuffer(c.buffer);chunks.delete(k);}}
 }
 let built=0;for(const [x,z]of queue){const c=chunks.get(x+':'+z);if(!c||c.dirty){chunkMesh(x,z);if(++built===2)break;}}
}
function shader(type,src){const o=gl.createShader(type);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(o));return o;}
// Low-cost WebGL 1 atmospheric rendering: animated sky, sunset and night haze.
// World normals stay in the geometry so lighting is consistent as the sun moves.
const vertex='attribute vec3 p;attribute vec3 c;attribute float matId;attribute vec3 normal;uniform mat4 proj;uniform mat4 view;uniform vec3 eye;varying vec3 color;varying vec3 worldPos;varying vec3 surfaceNormal;varying float material;varying float fog;void main(){gl_Position=proj*view*vec4(p,1.);color=c;worldPos=p;surfaceNormal=normal;material=matId;fog=clamp((distance(p,eye)-22.)/84.,0.,1.);}';
const frag='precision mediump float;varying vec3 color;varying vec3 worldPos;varying vec3 surfaceNormal;varying float material;varying float fog;uniform vec3 sky;uniform float daylight;uniform float tick;float hash(vec3 p){return fract(sin(dot(p,vec3(17.13,41.17,79.19)))*43758.5453);}void main(){vec3 p=worldPos;float m=material;vec3 base=color;vec3 grid=floor(p*17.0+vec3(.05));float grain=hash(grid);float coarse=hash(floor(p*3.0+vec3(.07)));float detail=.92+(grain-.5)*.19+(coarse-.5)*.14;vec3 norm=normalize(surfaceNormal);float sunny=max(0.,dot(norm,normalize(vec3(.46,.80,.30))));float diffuse=.54+sunny*.39;float skylight=.80+.2*max(norm.y,0.);if(m<.5)detail=1.0;else if(m<1.5){detail*=.93+.13*grain;float blades=step(.90,hash(floor(p*31.0)));base+=vec3(.10,.12,.015)*blades*max(norm.y,0.);}else if(m<3.5||abs(m-10.)<.5){float vein=sin(p.y*14.0+p.x*7.0+p.z*5.0);detail*=.93+.10*smoothstep(.64,.98,vein);}else if(abs(m-4.)<.5||abs(m-9.)<.5){detail*=.9+.12*sin(p.y*27.+coarse*6.);}else if(abs(m-5.)<.5){detail*=.82+.23*coarse;}else if(abs(m-8.)<.5||abs(m-19.)<.5){float pulse=.60+.40*sin(tick*2.0+p.x*2.0+p.z*3.0);base+=vec3(.04,.17,.23)*pulse;detail*=.98+.10*grain;diffuse+=.10*pulse;}else if(m>11.5){detail=.96+.06*grain;diffuse=max(diffuse,.72);}float day=.57+.43*daylight;vec3 lit=base*detail*(diffuse*day+(.10+.12*max(norm.y,0.))*skylight);lit+=vec3(.035,.040,.062)*(1.-daylight);vec3 graded=pow(max(lit,vec3(.003)),vec3(.89));float haze=smoothstep(.15,1.,fog);gl_FragColor=vec4(mix(graded,sky,haze*.86),1.);}';
const skyVertex='attribute vec2 xy;varying vec2 uv;void main(){uv=xy*.5+.5;gl_Position=vec4(xy,1.,1.);}';
const skyFragment='precision mediump float;varying vec2 uv;uniform float t;uniform float daylight;void main(){float y=clamp(uv.y,0.,1.);vec3 zenith=mix(vec3(.016,.034,.112),vec3(.14,.44,.68),daylight);vec3 horizon=mix(vec3(.22,.12,.30),vec3(.65,.82,.86),daylight);vec3 sky=mix(horizon,zenith,smoothstep(.03,.9,y));float r=distance(uv,vec2(.73,.76));float halo=1.-smoothstep(.03,.30,r);float disc=1.-smoothstep(.023,.037,r);sky+=mix(vec3(.24,.16,.34),vec3(.96,.65,.30),daylight)*halo*.38;sky+=mix(vec3(.62,.77,.96),vec3(1.,.96,.72),daylight)*disc*.8;float wave=sin(uv.x*19.+t*.009+sin(uv.y*13.))*sin(uv.x*8.-uv.y*7.+t*.005);float clouds=smoothstep(.40,.83,wave)*smoothstep(.32,.66,y)*daylight;sky+=vec3(.27,.38,.38)*clouds*.25;float stars=step(.996,fract(sin(dot(floor(uv*vec2(330.,160.)),vec2(12.9898,78.233)))*43758.5453));sky+=vec3(.35,.46,.65)*stars*(1.-daylight)*smoothstep(.38,.70,y);gl_FragColor=vec4(sky,1.);}';
let pg;
try{pg=gl.createProgram();gl.attachShader(pg,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(pg,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(pg);if(!gl.getProgramParameter(pg,gl.LINK_STATUS))throw Error('Shader linking failed');}
catch(e){$('fallback').hidden=false;console.error(e);return;}
gl.useProgram(pg);gl.enable(gl.DEPTH_TEST);
const ap=gl.getAttribLocation(pg,'p'),ac=gl.getAttribLocation(pg,'c'),am=gl.getAttribLocation(pg,'matId'),an=gl.getAttribLocation(pg,'normal'),up=gl.getUniformLocation(pg,'proj'),uv=gl.getUniformLocation(pg,'view'),ue=gl.getUniformLocation(pg,'eye'),us=gl.getUniformLocation(pg,'sky'),ud=gl.getUniformLocation(pg,'daylight'),ut=gl.getUniformLocation(pg,'tick'),dynamic=gl.createBuffer();
let skyPg=null,skyBuf=null,skyAttr=-1,skyTime=null,skyDay=null;
try{
 skyPg=gl.createProgram();gl.attachShader(skyPg,shader(gl.VERTEX_SHADER,skyVertex));
 gl.attachShader(skyPg,shader(gl.FRAGMENT_SHADER,skyFragment));gl.linkProgram(skyPg);
 if(!gl.getProgramParameter(skyPg,gl.LINK_STATUS))throw Error('Sky shader linking failed');
 skyBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 skyAttr=gl.getAttribLocation(skyPg,'xy');skyTime=gl.getUniformLocation(skyPg,'t');skyDay=gl.getUniformLocation(skyPg,'daylight');
}catch(e){console.warn('Sky shader unavailable; falling back to clear color',e);skyPg=null;}
gl.useProgram(pg);
function projection(fov,ratio,near,far){const f=1/Math.tan(fov/2),n=1/(near-far);return new Float32Array([f/ratio,0,0,0,0,f,0,0,0,0,(far+near)*n,-1,0,0,2*far*near*n,0]);}
function camera(eye,target){
 const norm=v=>{const l=Math.hypot(...v)||1;return v.map(q=>q/l);},sub=(a,b)=>a.map((n,i)=>n-b[i]);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
 const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function renderBuffer(buf,n){if(!n)return;gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(ap);gl.enableVertexAttribArray(ac);if(am>=0)gl.enableVertexAttribArray(am);if(an>=0)gl.enableVertexAttribArray(an);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,40,0);gl.vertexAttribPointer(ac,3,gl.FLOAT,false,40,12);if(am>=0)gl.vertexAttribPointer(am,1,gl.FLOAT,false,40,24);if(an>=0)gl.vertexAttribPointer(an,3,gl.FLOAT,false,40,28);gl.drawArrays(gl.TRIANGLES,0,n);}
// Aim highlight shares the terrain shader but uses GPU line geometry.
// No raycast on the main world buffer and no re-mesh when the cursor moves.
const aimBuffer=gl.createBuffer();
function drawAimOutline(){
 const ray=target();
 if(frames%12===0){
  const ret=$('target');if(ret){ret.textContent=ray?.hit?'□':'+';ret.classList[ray?.hit?'add':'remove']('aimed');}
 }
 if(!ray?.hit)return;
 const {x,y,z}=ray.hit,a=-.026,b=1.026;
 const p=[[a,a,a],[b,a,a],[b,b,a],[a,b,a],[a,a,b],[b,a,b],[b,b,b],[a,b,b]];
 const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
 const v=[];for(const [i,j] of edges){
  for(const k of [i,j])v.push(x+p[k][0],y+p[k][1],z+p[k][2],.85,1.,.44,0,0,1,0);
 }
 gl.bindBuffer(gl.ARRAY_BUFFER,aimBuffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.DYNAMIC_DRAW);
 gl.enableVertexAttribArray(ap);gl.enableVertexAttribArray(ac);
 gl.vertexAttribPointer(ap,3,gl.FLOAT,false,40,0);
 gl.vertexAttribPointer(ac,3,gl.FLOAT,false,40,12);
 if(am>=0){gl.enableVertexAttribArray(am);gl.vertexAttribPointer(am,1,gl.FLOAT,false,40,24);}
 if(an>=0){gl.enableVertexAttribArray(an);gl.vertexAttribPointer(an,3,gl.FLOAT,false,40,28);}
 gl.drawArrays(gl.LINES,0,v.length/10);
}
function render(){
 const dpr=Math.min(devicePixelRatio||1,renderCap),w=Math.max(1,Math.floor(innerWidth*dpr)),h=Math.max(1,Math.floor(innerHeight*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);
 const forward=[Math.sin(hero.yaw)*Math.cos(hero.pitch),Math.sin(hero.pitch),-Math.cos(hero.yaw)*Math.cos(hero.pitch)];
 const eye=[hero.x,hero.y+1.55,hero.z];
 const desired=third?[eye[0]-forward[0]*5,eye[1]+2.05,eye[2]-forward[2]*5]:eye;
 let cam=eye;
 if(third){
  const diff=desired.map((n,i)=>n-eye[i]);let t=1;
  for(let f=.08;f<=1.001;f+=.08){
   const p=eye.map((n,i)=>n+diff[i]*f);
   if(block(p[0],p[1],p[2])){t=Math.max(.08,f-.10);break;}
  }
  cam=eye.map((n,i)=>n+diff[i]*t);
 }
 if(third){
  if(!chaseCam||Math.hypot(...cam.map((n,i)=>n-chaseCam[i]))>12)chaseCam=cam.slice();
  else for(let i=0;i<3;i++)chaseCam[i]+=(cam[i]-chaseCam[i])*.22;
  cam=block(chaseCam[0],chaseCam[1],chaseCam[2])?cam:chaseCam.slice();
 }else chaseCam=null;
 const at=eye.map((n,i)=>n+forward[i]*5);
 const day=.50+.50*Math.sin(clock*.018),sky=[.16+.37*day,.18+.47*day,.32+.45*day];
 gl.clearColor(...sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 if(skyPg){
  gl.disable(gl.DEPTH_TEST);gl.useProgram(skyPg);
  gl.bindBuffer(gl.ARRAY_BUFFER,skyBuf);gl.enableVertexAttribArray(skyAttr);
  gl.vertexAttribPointer(skyAttr,2,gl.FLOAT,false,0,0);
  gl.uniform1f(skyTime,clock);gl.uniform1f(skyDay,day);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.disableVertexAttribArray(skyAttr);gl.enable(gl.DEPTH_TEST);gl.useProgram(pg);
 }
 gl.uniformMatrix4fv(up,false,projection(third?1.03:1.15,w/h,.06,120));gl.uniformMatrix4fv(uv,false,camera(cam,at));
 gl.uniform3fv(ue,new Float32Array(cam));gl.uniform3fv(us,new Float32Array(sky));gl.uniform1f(ud,day);gl.uniform1f(ut,clock);
 lastChunksDrawn=0;
 for(const chunk of chunks.values()){
  const x=(chunk.cx+.5)*CH-hero.x,z=(chunk.cz+.5)*CH-hero.z;
  if(Math.hypot(x,z)>CH*1.8&&x*forward[0]+z*forward[2]<-CH*1.4)continue;
  renderBuffer(chunk.buffer,chunk.count);lastChunksDrawn++;
 }
 const v=[];
 // Layered voxel character rigs with skins, sleeves, hair, shoes and
 // subtle leg animation. Shared GPU batch; no external models or CDN.
 const figure=(p,role)=>{
  const stride=Math.sin(clock*8+(role?1.5:0))*.075;
  cube(v,p.x-.25,p.y+.68,p.z-.25,role?8:1,.51); // jersey
  cube(v,p.x-.25,p.y+1.18,p.z-.25,6,.50);       // face
  cube(v,p.x-.29,p.y+1.57,p.z-.27,role?3:4,.57);// hair
  cube(v,p.x-.35,p.y+.82,p.z-.22,6,.13);       // hands
  cube(v,p.x+.22,p.y+.82,p.z-.22,6,.13);
  cube(v,p.x-.19,p.y+.19,p.z-.15+stride,3,.20); // stride
  cube(v,p.x+.06,p.y+.19,p.z-.15-stride,3,.20);
  cube(v,p.x-.21,p.y+.04,p.z-.20+stride,7,.23); // shoes
  cube(v,p.x+.06,p.y+.04,p.z-.20-stride,7,.23);
  cube(v,p.x-.12,p.y+1.35,p.z-.30,11,.10);    // eyes
  cube(v,p.x+.10,p.y+1.35,p.z-.30,11,.10);
 };
 figure(companion,companion.role);if(third)figure(hero,hero.role);
 // Living voxel creatures with distinguishable silhouettes and animated movement.
 for(const m of mobs)if(m.hp>0&&Math.hypot(m.x-hero.x,m.z-hero.z)<52){
  const bob=Math.sin(clock*2.4+m.x)*.075;
  if(m.kind){
   // Crystal slime: translucent-looking layered body, luminous crest and eyes.
   cube(v,m.x-.32,m.y+bob,m.z-.32,8,.64);
   cube(v,m.x-.25,m.y+.44+bob,m.z-.24,11,.51);
   cube(v,m.x-.13,m.y+.79+bob,m.z-.12,8,.25);
   cube(v,m.x-.18,m.y+.54+bob,m.z-.34,3,.12);
   cube(v,m.x+.09,m.y+.54+bob,m.z-.34,3,.12);
  }else{
   // Forest guardian: rounded voxel ears, head, four little feet and expressive eyes.
   cube(v,m.x-.32,m.y+.22+bob,m.z-.32,5,.64);
   cube(v,m.x-.26,m.y+.71+bob,m.z-.28,1,.52);
   cube(v,m.x-.28,m.y+1.04+bob,m.z-.27,5,.21);
   cube(v,m.x+.11,m.y+1.04+bob,m.z-.27,5,.21);
   for(const dx of [-.25,.15])for(const dz of [-.25,.15])cube(v,m.x+dx,m.y+bob,m.z+dz,4,.17);
   cube(v,m.x-.15,m.y+.85+bob,m.z-.29,3,.10);
   cube(v,m.x+.10,m.y+.85+bob,m.z-.29,3,.10);
  }
 }
 // Crystal Golem is a multi-part animated boss with a bright core and crown.
 if(boss.alive&&Math.hypot(boss.x-hero.x,boss.z-hero.z)<72){
  const breath=Math.sin(clock*1.8)*.09,swing=Math.sin(clock*1.35)*.22;
  // Heavy grounded legs / mossy stone armor.
  cube(v,boss.x-.73,boss.y,boss.z-.49,3,.56);
  cube(v,boss.x+.20,boss.y,boss.z-.49,3,.56);
  cube(v,boss.x-.79,boss.y+.53,boss.z-.60,10,1.58);
  cube(v,boss.x-.63,boss.y+1.19,boss.z-.73,3,1.25);
  cube(v,boss.x-.51,boss.y+1.28+breath,boss.z-.77,8,1.04);
  // Pulsing crystal heart, runic shoulder crystals, face and floating crown shards.
  cube(v,boss.x-.28,boss.y+1.51+breath,boss.z-.84,8,.57);
  cube(v,boss.x-.09,boss.y+1.71+breath,boss.z-.88,11,.20);
  for(const side of [-1,1]){
   const dx=side<0?-.98:.57;
   cube(v,boss.x+dx,boss.y+1.42+swing*side,boss.z-.58,3,.48);
   cube(v,boss.x+dx,boss.y+.76+swing*side,boss.z-.55,10,.49);
   cube(v,boss.x+dx+.08,boss.y+1.75+breath,boss.z-.54,8,.33);
  }
  cube(v,boss.x-.34,boss.y+2.35+breath,boss.z-.33,3,.78);
  cube(v,boss.x-.29,boss.y+2.56+breath,boss.z-.43,8,.20);
  cube(v,boss.x+.13,boss.y+2.56+breath,boss.z-.43,8,.20);
  for(const dx of [-.27,.21])cube(v,boss.x+dx,boss.y+3.08+breath,boss.z-.23,8,.17);
 }
 // Real 3D Team Portal arch. Bright material is handled by the crystal GPU shader.
 if(Math.hypot(hero.x-40,hero.z-40)<84){
  const h=height(40,40)+1;
  const pulse=Math.sin(clock*2)*.11;
  for(const side of [-1,1]){
   for(let y=0;y<4;y++)cube(v,40+side*1.4-.36,h+y*.82,40-.42,8,.8);
   cube(v,40+side*1.4-.19,h+3.55+pulse,40-.31,11,.43);
  }
  for(let x=-1;x<=1;x++)cube(v,40+x*.82-.38,h+3.1,40-.42,8,.82);
  cube(v,39.79,h+1.1+pulse,40-.15,11,.43);
  cube(v,39.81,h+2.05-pulse,40-.13,8,.34);
  for(let i=0;i<5;i++){
   const angle=clock*.8+i*Math.PI*2/5;
   cube(v,40+Math.cos(angle)*.82-.08,h+1.75+Math.sin(clock*1.3+i)*.6,40+Math.sin(angle)*.38-.08,8,.15);
  }
 }
 for(const particle of effects)if(Math.hypot(particle.x-hero.x,particle.z-hero.z)<40)
   cube(v,particle.x,particle.y,particle.z,particle.id,.10);
 gl.bindBuffer(gl.ARRAY_BUFFER,dynamic);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.DYNAMIC_DRAW);
 renderBuffer(dynamic,v.length/10);drawAimOutline();renderOk=true;
}
function ground(x,z){return height(Math.floor(x),Math.floor(z))+1.02;}
function resetPose(){hero.x=2.5;hero.z=2.5;hero.y=ground(hero.x,hero.z);hero.vy=0;hero.hp=100;companion.x=4.5;companion.z=4.5;companion.y=ground(4.5,4.5);}
function visible(x,y,z){const r=.28;for(const X of [x-r,x+r])for(const Z of [z-r,z+r])for(const Y of [y+.1,y+.9,y+1.69])if(block(X,Y,Z))return true;return false;}
function target(){
 const d=[Math.sin(hero.yaw)*Math.cos(hero.pitch),Math.sin(hero.pitch),-Math.cos(hero.yaw)*Math.cos(hero.pitch)];
 const s=[hero.x,hero.y+1.55,hero.z];let previous=null,was='';
 for(let t=.3;t<6;t+=.13){const x=Math.floor(s[0]+d[0]*t),y=Math.floor(s[1]+d[1]*t),z=Math.floor(s[2]+d[2]*t),k=tag(x,y,z);
  if(k===was)continue;was=k;if(block(x,y,z))return {hit:{x,y,z},place:previous};previous={x,y,z};}
 return null;
}
function announce(msg,ms=2100){$('toast').textContent=msg;$('toast').classList.add('on');noticeTo=performance.now()+ms;}
function award(id,xp){
 if(rewards.includes(id))return;rewards.push(id);
 try{
  const k='jozefs-world-player-v1',s=JSON.parse(localStorage.getItem(k)||'{}');
  s.blockWorldRewards=Array.isArray(s.blockWorldRewards)?s.blockWorldRewards:[];
  if(!s.blockWorldRewards.includes(id)){s.blockWorldRewards.push(id);s.xp=clamp((Number(s.xp)||0)+xp,0,1e8);localStorage.setItem(k,JSON.stringify(s));}
 }catch(e){console.warn('XP save unavailable',e);}
}
function gain(kind,n=1){
 stats[kind]=(stats[kind]||0)+n;
 while(stage<missions.length&&stats[missions[stage][2]]>=missions[stage][3]){
  const m=missions[stage];award('block3d-'+stage,m[4]);announce('MISSION COMPLETE · '+m[0]+' +'+m[4]+' XP',3500);tone('reward');stage++;
 }
 dirty=true;hud();if(host&&conn?.open)send({t:'progress',stage,stats,rewards,defeated,portalOpened});
}
// Minimap is rendered at low frequency, independent from WebGL rendering.
function drawRadar(){
 const map=$('minimap'),ctx=map?.getContext?.('2d');if(!ctx)return;
 if(map.width!==132||map.height!==132){map.width=132;map.height=132;}
 const n=11,tile=6,x0=Math.floor(hero.x),z0=Math.floor(hero.z);
 ctx.fillStyle='#061e2c';ctx.fillRect(0,0,132,132);
 for(let dz=-n;dz<n;dz++)for(let dx=-n;dx<n;dx++){
  const x=x0+dx,z=z0+dz,b=biome(x,z);
  ctx.fillStyle=b==='Desert'?'#dfc18d':b==='Snow Ridge'?'#d8e9f2':b==='Evergreen Forest'?'#326e62':'#5ca77e';
  ctx.fillRect((dx+n)*tile,(dz+n)*tile,tile,tile);
  if(tree(x,z)){ctx.fillStyle='#163c33';ctx.fillRect((dx+n)*tile+2,(dz+n)*tile+2,3,3);}
 }
 const pin=(x,z,color,size)=>{
  const px=(x-x0+n)*tile,pz=(z-z0+n)*tile;if(px<0||pz<0||px>=132||pz>=132)return;
  ctx.fillStyle='#03131b';ctx.fillRect(px-1,pz-1,size+2,size+2);
  ctx.fillStyle=color;ctx.fillRect(px,pz,size,size);
 };
 pin(32,32,boss.alive?'#ff9cc3':'#d6ff89',5);
 pin(40,40,'#d8a9ff',5);
 pin(companion.x,companion.z,'#9cfcff',5);
 pin(hero.x,hero.z,'#e9ff91',7);
 ctx.fillStyle='#ffffff';ctx.font='bold 9px sans-serif';ctx.fillText('N',62,9);
}
function hud(){
 const s=JSON.parse(localStorage.getItem('jozefs-world-player-v1')||'{}');
 $('hero').textContent=hero.role===0?'DADDY':'JOZEF';$('hearts').textContent='♥ '+Math.round(hero.hp);
 $('level').textContent='LVL '+(Math.floor((Number(s.xp)||0)/100)+1);
 $('quality').textContent='GRAPHICS '+quality;
 $('qualityState').textContent=quality==='AUTO'?'AUTO · '+Math.round(renderCap*100)+'%':quality;
 $('compass').textContent='X '+Math.floor(hero.x)+' · Z '+Math.floor(hero.z)+' · '+(stage<4?'GOLEM 32,32':stage===5?'PORTAL 40,40':'EXPLORE YOUR WORLD');
 const done=stage>=missions.length,m=missions[Math.min(stage,missions.length-1)],ratio=done?1:clamp((stats[m[2]]||0)/m[3],0,1);
 $('mission').innerHTML='<strong>'+(done?'EXPEDITION COMPLETE':'MISSION '+(stage+1)+'/6 · '+m[0])+'</strong><small>'+m[1]+'</small><div class="progress"><i style="width:'+(ratio*100)+'%"></i></div><small>'+biome(hero.x,hero.z)+' · Realm '+(realm+1)+'</small>';
}
function hotbar(){const bar=$('hotbar');bar.replaceChildren();for(let id=1;id<types.length;id++){
 const b=document.createElement('button');b.type='button';b.className=selected===id?'active':'';
 const color=document.createElement('i');color.style.background='rgb('+col[id].map(x=>Math.round(x*255)).join(',')+')';b.appendChild(color);
 const label=document.createElement('span');label.textContent=types[id]+(!creative?' '+(hero.inventory[id]||0):'');b.appendChild(label);
 b.addEventListener('click',()=>{selected=id;hotbar();});bar.appendChild(b);
}}
function change(kind){
 const a=target();if(!a){announce('Aim at a block within reach');return;}
 if(kind==='mine'){
  const p=a.hit,id=block(p.x,p.y,p.z);if(p.y<1)return;
  if(conn?.open&&!host){send({t:'request',op:'mine',...p});return;}
  if(modify(p.x,p.y,p.z,0)){hero.inventory[id]=(hero.inventory[id]||0)+1;if(id===4)gain('wood');if(id===8)gain('crystal');effectBurst(p.x,p.y,p.z,id);tone('mine');announce('MINED '+types[id],800);hotbar();}
 }else{
  const p=a.place;if(!p){announce('Aim at open space');return;}
  if(!creative&&!(hero.inventory[selected]>0)){announce('Mine '+types[selected]+' first');return;}
  if(conn?.open&&!host){send({t:'request',op:'place',...p,id:selected});return;}
  if(modify(p.x,p.y,p.z,selected)){if(!creative)hero.inventory[selected]--;gain('placed');effectBurst(p.x,p.y,p.z,selected);tone('place');hotbar();}
 }
}
function attack(){
 let victim=null,dist=4.3;for(const m of mobs){const d=Math.hypot(m.x-hero.x,m.z-hero.z);if(m.hp>0&&d<dist){victim=m;dist=d;}}
 const bd=Math.hypot(boss.x-hero.x,boss.z-hero.z);
 if(boss.alive&&bd<4.3&&bd<=dist+.3)victim=boss;
 if(!victim){announce('Get closer to an enemy');return;}
 if(conn?.open&&!host){send({t:'request',op:'attack',x:victim.x,z:victim.z});return;}
 victim.hp-=hero.role?24:18;effectBurst(victim.x,victim.y+.8,victim.z,8);tone('attack');
 if(victim===boss){send({t:'boss',hp:Math.max(0,boss.hp)});if(boss.hp<=0){boss.alive=false;defeated=true;gain('boss');announce('THE CRYSTAL GOLEM IS DEFEATED!',3400);}}
 else if(victim.hp<=0)announce('Creature defeated!');
 dirty=true;
}
function spawn(){
 mobs=[];for(let i=0;i<16;i++){const x=Math.floor(rnd(i,seed,5)*90)-45,z=Math.floor(rnd(i,seed,8)*90)-45;
 if(Math.hypot(x,z)>9)mobs.push({x,y:ground(x,z),z,hp:30,kind:i%2});}
 const bossHp=Number.isFinite(dimensions[realm]?.bossHp)?dimensions[realm].bossHp:(realm===0&&defeated?0:120);
 boss={x:32.5,z:32.5,y:ground(32.5,32.5),hp:bossHp,alive:bossHp>0};
}
function step(dt){
 const blocked=menuPaused;
 if(blocked&&!conn?.open){stream();return;}
 clock+=dt;saveClock+=dt;
 for(const p of effects){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=5*dt;}
 effects=effects.filter(p=>p.life>0);
 const gp=Array.from(navigator.getGamepads?.()||[]).find(Boolean);
 if(gp){joy.x=Math.abs(gp.axes?.[0]||0)>.2?gp.axes[0]:0;joy.y=Math.abs(gp.axes?.[1]||0)>.2?gp.axes[1]:0;
  hero.yaw+=(Math.abs(gp.axes?.[2]||0)>.15?gp.axes[2]:0)*dt*2.4;
  hero.pitch=clamp(hero.pitch-(Math.abs(gp.axes?.[3]||0)>.15?gp.axes[3]:0)*dt*1.8,-1.38,1.38);
  keys._padJump=!!gp.buttons?.[0]?.pressed;
  if(gp.buttons?.[2]?.pressed&&!gamepadHeld.mine)change('mine');gamepadHeld.mine=!!gp.buttons?.[2]?.pressed;
  if(gp.buttons?.[3]?.pressed&&!gamepadHeld.place)change('place');gamepadHeld.place=!!gp.buttons?.[3]?.pressed;
  if(gp.buttons?.[1]?.pressed&&!gamepadHeld.attack)attack();gamepadHeld.attack=!!gp.buttons?.[1]?.pressed;
 }const f=blocked?0:(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y;
 const a=blocked?0:(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joy.x;
 let dx=Math.sin(hero.yaw)*f+Math.cos(hero.yaw)*a,dz=-Math.cos(hero.yaw)*f+Math.sin(hero.yaw)*a;
 const len=Math.hypot(dx,dz);if(len>1){dx/=len;dz/=len;}const speed=hero.role?5.6:4.8;
 if(!visible(hero.x+dx*speed*dt,hero.y,hero.z))hero.x+=dx*speed*dt;
 if(!visible(hero.x,hero.y,hero.z+dz*speed*dt))hero.z+=dz*speed*dt;
 const jump=!blocked&&!!(keys.Space||keys._padJump);
 if(jump&&hero.ground){hero.vy=8.3;hero.ground=false;hero.double=false;}
 else if(jump&&!jumpWasDown&&hero.role===1&&!hero.ground&&!hero.double){hero.vy=7.2;hero.double=true;announce('Jozef double jump!',750);}
 jumpWasDown=jump;
 let dy=hero.vy*dt;hero.vy=Math.max(-18,hero.vy-22*dt);
 const increments=Math.max(1,Math.ceil(Math.abs(dy)/.15));for(let i=0;i<increments;i++){
  if(!visible(hero.x,hero.y+dy/increments,hero.z))hero.y+=dy/increments;
  else{if(dy<0)hero.ground=true;hero.vy=0;break;}
 }
 if(!visible(hero.x,hero.y-.055,hero.z))hero.ground=false;
 if(hero.y< -4||hero.hp<=0){resetPose();announce('Returned safely to camp');}
 if(!conn?.open){companion.x+=(hero.x+2-companion.x)*Math.min(1,dt*1.4);companion.z+=(hero.z+1-companion.z)*Math.min(1,dt*1.4);companion.y=ground(companion.x,companion.z);}
 for(const m of mobs){if(m.hp<=0)continue;const d=Math.hypot(m.x-hero.x,m.z-hero.z);if(d<11&&d>1){
  m.x+=(hero.x-m.x)/d*.7*dt;m.z+=(hero.z-m.z)/d*.7*dt;m.y=ground(m.x,m.z);}
  if(d<1.3&&!creative&&clock-(m.last||0)>1.3){hero.hp=Math.max(0,hero.hp-7);m.last=clock;}
 }
 const d=Math.hypot(boss.x-hero.x,boss.z-hero.z);
 if(boss.alive&&d<13){if(d>2){boss.x+=(hero.x-boss.x)/d*.45*dt;boss.z+=(hero.z-boss.z)/d*.45*dt;boss.y=ground(boss.x,boss.z);}
 else if(clock-(boss.last||0)>1.4&&!creative){hero.hp=Math.max(0,hero.hp-16);boss.last=clock;announce('The Crystal Golem attacks!');}}
 const zone=biome(hero.x,hero.z);if(!discovered[zone]&&Math.hypot(hero.x-2,hero.z-2)>24){discovered[zone]=true;gain('explore');}
 if(conn?.open){lastNet+=dt;if(lastNet>.13){lastNet=0;send({t:'move',x:hero.x,y:hero.y,z:hero.z,hp:hero.hp});}}
 if(saveClock>15){saveClock=0;if(dirty)save();}
 stream();if(frames%15===0)hud();
}
function portal(){
 if(!defeated&&!portalOpened){announce('Defeat the Crystal Golem first');return;}
 if(Math.hypot(hero.x-40,hero.z-40)>5||Math.hypot(companion.x-40,companion.z-40)>5){announce('Both heroes must reach the portal at 40, 40');return;}
 if(!portalOpened){portalOpened=true;gain('portal');}
 captureDimension();realm=(realm+1)%3;
 const next=dimensions[realm];
 if(next){seed=next.seed;edits=new Map(next.edits||[]);}else{seed=baseSeed+realm*1973+1;edits=new Map();}
 chunks.forEach(c=>gl.deleteBuffer(c.buffer));chunks.clear();lastCX=Infinity;
 resetPose();spawn();dirty=true;save();announce('PORTAL OPEN · REALM '+(realm+1),3300);
}
function captureDimension(){dimensions[realm]={seed,edits:[...edits].slice(-14000),bossHp:boss.hp};}
function save(){if(!dirty||guestActive)return;try{
 captureDimension();
 localStorage.setItem(DIMKEY,JSON.stringify({version:1,baseSeed,dimensions}));
 localStorage.setItem(KEY,JSON.stringify({version:1,seed,realm,edits:[...edits].slice(-14000),hero:{x:hero.x,y:hero.y,z:hero.z,role:hero.role,yaw:hero.yaw,pitch:hero.pitch,inventory:hero.inventory},viewThird:third,stage,stats,rewards,discovered,defeated,portalOpened,creative}));
 dirty=false;}catch(e){announce('Save storage full · export a backup');}}
function load(){try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(!data||data.version!==1)return false;
 seed=data.seed;realm=data.realm||0;
 baseSeed=seed-realm*1973-(realm?1:0);
 try{const archive=JSON.parse(localStorage.getItem(DIMKEY)||'null');if(archive?.version===1&&archive.dimensions&&typeof archive.dimensions==='object'){baseSeed=Number(archive.baseSeed)||baseSeed;dimensions=archive.dimensions;}}catch(_){}
 if(!Number.isFinite(seed)||!Array.isArray(data.edits)||data.edits.length>14000)return false;
 edits=new Map(data.edits.filter(row=>Array.isArray(row)&&/^[-0-9]+,[-0-9]+,[-0-9]+$/.test(row[0])&&Number.isInteger(row[1])&&row[1]>=0&&row[1]<types.length));
 if(data.hero){Object.assign(hero,{x:data.hero.x,y:data.hero.y,z:data.hero.z,role:data.hero.role===1?1:0,inventory:data.hero.inventory||{}});}
 if(!Number.isFinite(hero.x+hero.y+hero.z))return false;
  hero.yaw=Number.isFinite(data.hero?.yaw)?data.hero.yaw:hero.yaw;
  hero.pitch=Number.isFinite(data.hero?.pitch)?clamp(data.hero.pitch,-1.38,1.38):hero.pitch;
  if(typeof data.viewThird==='boolean')third=data.viewThird;
 stage=clamp(data.stage||0,0,6);stats=Object.assign(stats,data.stats||{});rewards=Array.isArray(data.rewards)?data.rewards:[];
 discovered=data.discovered||{};defeated=!!data.defeated;portalOpened=!!data.portalOpened;creative=data.creative!==false;return true;
 }catch(e){console.warn('Save could not load',e);return false;}}
/* Backup packs preserve all visited realms and use strict import validation. */
function validEditRows(list){
 return Array.isArray(list)&&list.length<=14000&&list.every(a=>Array.isArray(a)&&a.length===2&&
  typeof a[0]==='string'&&/^[-0-9]+,[-0-9]+,[-0-9]+$/.test(a[0])&&
  Number.isInteger(a[1])&&a[1]>=0&&a[1]<types.length);
}
function validatePack(pack){
 if(!pack||pack.format!=='DaddyJozefBlock3D'||pack.version!==2||
 !pack.active||pack.active.version!==1||!Number.isFinite(pack.active.seed)||
 !validEditRows(pack.active.edits)||!pack.dimensionSave||pack.dimensionSave.version!==1||
 !Number.isFinite(pack.dimensionSave.baseSeed)||!pack.dimensionSave.dimensions||typeof pack.dimensionSave.dimensions!=='object')return false;
 return Object.entries(pack.dimensionSave.dimensions).every(([k,v])=>
  ['0','1','2'].includes(k)&&v&&Number.isFinite(v.seed)&&validEditRows(v.edits)&&Number.isFinite(v.bossHp));
}
function exportFile(){
 dirty=true;save();
 const pack={format:'DaddyJozefBlock3D',version:2,active:JSON.parse(localStorage.getItem(KEY)||'{}'),
  dimensionSave:JSON.parse(localStorage.getItem(DIMKEY)||'null')};
 if(!validatePack(pack)){announce('Backup could not be prepared');return;}
 const b=new Blob([JSON.stringify(pack)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');
 a.href=url;a.download='daddy-jozef-block-3d-all-realms.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1200);announce('All realms included in backup');
}
async function importFile(file){
 try{
  if(!file||file.size>5000000)throw Error('Select a backup under 5 MB');
  const raw=await file.text(),data=JSON.parse(raw);
  let active,archive;
  if(data.format==='DaddyJozefBlock3D'){
   if(!validatePack(data))throw Error('Invalid multi-realm backup');active=JSON.stringify(data.active);archive=JSON.stringify(data.dimensionSave);
  }else if(data.version===1&&Number.isFinite(data.seed)&&validEditRows(data.edits)){
   active=raw;archive=JSON.stringify({version:1,baseSeed:data.seed,dimensions:{[String(data.realm||0)]:{seed:data.seed,edits:data.edits,bossHp:data.defeated?0:120}}});
  }else throw Error('Unrecognized save format');
  if(!confirm('Restore this backup? Existing 3D worlds will be replaced.'))return;
  const before=localStorage.getItem(KEY);if(before)localStorage.setItem(KEY+'-backup',before);
  localStorage.setItem(DIMKEY,archive);localStorage.setItem(KEY,active);location.reload();
 }catch(e){announce('Import failed: '+e.message,3600);}
}
function send(v){try{if(conn?.open)conn.send(v);}catch(_){}}
function status(s){$('pairStatus').textContent=s;}
function detach(){const wasGuest=guestActive;guestActive=false;try{conn?.close();peer?.destroy();}catch(_){}peer=conn=null;host=false;invite='';$('share').disabled=true;status('Offline · local play');if(wasGuest){dirty=false;location.reload();}}
function receive(m){
 if(!m||typeof m!=='object')return;
 if(JSON.stringify(m).length>550000)return;
 if(m.t==='hello'&&!host){
  if(!Number.isInteger(m.seed)||!Array.isArray(m.edits)||m.edits.length>14000)return;
  seed=m.seed;edits=new Map(m.edits.filter(a=>Array.isArray(a)&&typeof a[0]==='string'&&Number.isInteger(a[1])));
  hero.role=1;companion.role=0;stage=clamp(Number(m.stage)||0,0,6);stats=Object.assign(stats,m.stats||{});defeated=!!m.defeated;portalOpened=!!m.portalOpened;companion.x=m.x;companion.y=m.y;companion.z=m.z;
  hero.x=companion.x+2;hero.z=companion.z+2;hero.y=ground(hero.x,hero.z);
  spawn();chunks.forEach(c=>gl.deleteBuffer(c.buffer));chunks.clear();lastCX=Infinity;hotbar();hud();announce('Connected · Jozef is ready');
 }else if(m.t==='move'){
  if(!Number.isFinite(m.x+m.y+m.z)||Math.abs(m.x)>1e6||Math.abs(m.z)>1e6)return;
  companion.x=m.x;companion.y=m.y;companion.z=m.z;companion.hp=m.hp;
 }else if(m.t==='edit'&&!host){modify(m.x,m.y,m.z,m.id,false);}
 else if(m.t==='boss'&&!host){boss.hp=clamp(Number(m.hp)||0,0,120);boss.alive=boss.hp>0;if(!boss.alive)defeated=true;}
 else if(m.t==='progress'&&!host){const previous=stage;stage=clamp(Number(m.stage)||0,0,6);stats=Object.assign(stats,m.stats||{});defeated=!!m.defeated;portalOpened=!!m.portalOpened;
  for(let i=previous;i<stage;i++)award('block3d-'+i,missions[i][4]);hud();dirty=true;}
 else if(m.t==='request'&&host){
  if(!Number.isFinite(m.x+m.z))return;
  if(m.op==='attack'){if(Math.hypot(companion.x-m.x,companion.z-m.z)>5)return;if(boss.alive&&Math.hypot(boss.x-m.x,boss.z-m.z)<2.5){boss.hp=Math.max(0,boss.hp-18);if(boss.hp===0){boss.alive=false;defeated=true;gain('boss');}send({t:'boss',hp:boss.hp});}return;}
  if(![m.x,m.y,m.z].every(Number.isInteger)||Math.hypot(companion.x-m.x,companion.z-m.z)>6.5)return;
  if(m.op==='mine'){const id=block(m.x,m.y,m.z);if(id&&modify(m.x,m.y,m.z,0)){if(id===4)gain('wood');if(id===8)gain('crystal');}}
  if(m.op==='place'&&Number.isInteger(m.id)&&m.id>0&&m.id<types.length&&!block(m.x,m.y,m.z)){modify(m.x,m.y,m.z,m.id);gain('placed');}
 }
}
function attach(c){
 if(conn?.open){c.close();return;}conn=c;
 c.on('open',()=>{if(!host)guestActive=true;status('Connected · private encrypted session');if(host)send({t:'hello',seed,edits:[...edits].slice(-14000),x:hero.x,y:hero.y,z:hero.z,stage,stats,defeated,portalOpened});
  else{hero.role=1;companion.role=0;}announce('Two-device co-op connected');});
 c.on('data',receive);c.on('close',()=>{conn=null;status('Disconnected · local play');if(guestActive){guestActive=false;dirty=false;location.reload();}});
 c.on('error',()=>status('Connection error · try a fresh invite'));
}
function createRoom(){
 if(!window.Peer){status('PeerJS signalling unavailable. Offline mode works.');return;}
 if(!crypto?.getRandomValues){status('Secure invite generation unavailable');return;}
 detach();host=true;hero.role=0;companion.role=1;
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);invite=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
 peer=new window.Peer('jw-block-'+invite);
 peer.on('open',()=>{status('Private invitation ready');$('invite').value=invite;$('share').disabled=false;});
 peer.on('connection',attach);peer.on('error',()=>status('Signalling server unreachable'));
}
function joinRoom(code){
 dirty=true;save();
 const token=String(code||'').trim().toLowerCase();if(!/^[0-9a-f]{32}$/.test(token)){status('Paste a valid 32-character invite');return;}
 if(!window.Peer){status('PeerJS signalling unavailable');return;}
 detach();peer=new window.Peer();peer.on('open',()=>{status('Connecting privately…');attach(peer.connect('jw-block-'+token,{reliable:true}));});
 peer.on('error',()=>status('Cannot connect · host must be online'));
}
function initUi(){
 const mission=$('mission');
 if(mission){
  const toggle=()=>{const expanded=mission.getAttribute('aria-expanded')!=='true';mission.classList[expanded?'add':'remove']('expanded');mission.setAttribute('aria-expanded',String(expanded));mission.setAttribute('aria-label',expanded?'Collapse mission details':'Expand mission details');};
  mission.addEventListener('click',toggle);
  mission.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();toggle();}});
 }
 const radar=$('radar'),radarToggle=$('radar-toggle');
 if(radar&&radarToggle){
  let expanded=(innerWidth||900)>700;
  const setRadar=(show)=>{
   expanded=show;radar.classList[expanded?'remove':'add']('collapsed');
   radarToggle.setAttribute('aria-expanded',String(expanded));
   radarToggle.setAttribute('aria-label',expanded?'Collapse terrain radar':'Expand terrain radar');
   radarToggle.textContent=expanded?'−':'MAP';
  };
  radarToggle.addEventListener('click',()=>setRadar(!expanded));
  setRadar(expanded);
 }
 function show(id){menuPaused=!!id;$('drawer').hidden=id!=='drawer';$('pairPanel').hidden=id!=='pairPanel';$('options').setAttribute('aria-expanded',String(id==='drawer'));}
 $('options').onclick=()=>show($('drawer').hidden?'drawer':null);$('close').onclick=()=>show(null);$('pair').onclick=()=>show('pairPanel');$('pairClose').onclick=()=>show(null);
 $('swap').onclick=()=>{if(conn?.open){announce('Heroes stay assigned during co-op');return;}hero.role=1-hero.role;companion.role=1-hero.role;hud();};
 $('perspective').textContent=third?'1ST PERSON':'3RD PERSON';
 $('perspective').onclick=()=>{third=!third;$('perspective').textContent=third?'1ST PERSON':'3RD PERSON';dirty=true;};
 $('creative').onclick=()=>{creative=!creative;$('creative').textContent='CREATIVE '+(creative?'ON':'OFF');dirty=true;hotbar();};
 $('save').onclick=()=>{dirty=true;save();announce('World saved');};
 $('sound').onclick=()=>{sound=!sound;$('sound').textContent='SOUND '+(sound?'ON':'OFF');};
 $('quality').onclick=()=>{
  const modes=['AUTO','ECO','QUALITY'];quality=modes[(modes.indexOf(quality)+1)%modes.length];
  try{localStorage.setItem('jozefs-block-3d-quality-v1',quality)}catch{}
  hud();announce('GRAPHICS '+quality);
 };
 try{const stored=localStorage.getItem('jozefs-block-3d-quality-v1');if(['AUTO','ECO','QUALITY'].includes(stored))quality=stored;}catch{}
 $('export').onclick=exportFile;$('import').onclick=()=>$('fileInput').click();$('fileInput').onchange=e=>importFile(e.target.files?.[0]);
 $('host').onclick=createRoom;$('join').onclick=()=>joinRoom($('invite').value);$('disconnect').onclick=detach;
 $('share').onclick=async()=>{const u=location.origin+location.pathname+'#room='+invite;
  try{if(navigator.share)await navigator.share({title:'Daddy + Jozef private game invite',url:u});else{await navigator.clipboard.writeText(u);status('Private link copied');}}catch(e){status('Copy the code and share privately');}};
 const inviteMatch=location.hash.match(/room=([a-f0-9]{32})/i);
 if(inviteMatch){$('invite').value=inviteMatch[1];show('pairPanel');history.replaceState(null,'',location.pathname);}
 $('mine').onclick=()=>change('mine');$('place').onclick=()=>change('place');$('attack').onclick=attack;
 $('jump').addEventListener('pointerdown',e=>{e.preventDefault();keys.Space=true;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$('jump').addEventListener(type,()=>keys.Space=false);
 const stick=$('stick'),knob=$('knob');
 const updateStick=e=>{const r=stick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,m=Math.max(1,Math.hypot(x,y)/(r.width*.33));
 joy.x=clamp(x/m/(r.width*.33),-1,1);joy.y=clamp(y/m/(r.width*.33),-1,1);knob.style.transform='translate('+(joy.x*30)+'px,'+(joy.y*30)+'px)';};
 stick.addEventListener('pointerdown',e=>{stick.setPointerCapture(e.pointerId);updateStick(e);});
 stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))updateStick(e);});
 const resetStick=()=>{joy.x=joy.y=0;knob.style.transform='';};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,resetStick);
 canvas.addEventListener('pointerdown',e=>look={id:e.pointerId,x:e.clientX,y:e.clientY});
 canvas.addEventListener('pointermove',e=>{if(!look||look.id!==e.pointerId)return;hero.yaw+=(e.clientX-look.x)*.005;hero.pitch=clamp(hero.pitch-(e.clientY-look.y)*.005,-1.38,1.38);look.x=e.clientX;look.y=e.clientY;});
 canvas.addEventListener('pointerup',()=>look=null);canvas.addEventListener('pointercancel',()=>look=null);
 document.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;
  if(e.repeat)return;if(e.code==='KeyE')change('mine');if(e.code==='KeyR')change('place');if(e.code==='KeyF')attack();if(e.code==='KeyP')portal();if(e.code==='Escape')show(null);
 });document.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{keys={};resetStick();save();});
 window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();webglLost=true;dirty=true;save();const panel=$('fallback');
  $('fallback-reason').textContent='3D graphics paused. Your saved world is safe. Tap Retry 3D to restart rendering.';
  if(panel)panel.hidden=false;
 });
 canvas.addEventListener('webglcontextrestored',()=>{webglLost=false;location.reload();});

 const portalButton=document.createElement('button');portalButton.textContent='TEAM PORTAL';portalButton.onclick=portal;$('drawer').querySelector('.buttons').appendChild(portalButton);
 hotbar();hud();
}
function loop(now){
 if(webglLost){requestAnimationFrame(loop);return;}
 const rawDt=last?clamp((now-last)/1000,0,.14):.0167,dt=clamp(rawDt,0,.045);last=now;frames++;
 averageFrame=averageFrame*.97+rawDt*.03;
 if(quality==='AUTO'&&frames%120===0){
  if(averageFrame>.027)adaptiveCap=Math.max(.85,adaptiveCap-.2);
  else if(averageFrame<.018)adaptiveCap=Math.min(1.5,adaptiveCap+.1);
 }
 renderCap=quality==='QUALITY'?Math.min(2,devicePixelRatio||1):quality==='ECO'?1:adaptiveCap;
 if(frames%15===0&&!$('radar')?.classList?.contains?.('collapsed'))drawRadar();
 try{step(dt);render();if(renderOk)window.__bw3dReady?.();if(noticeTo&&now>noticeTo){$('toast').classList.remove('on');noticeTo=0;}}
 catch(e){console.error('3D frame failure',e);window.__bw3dFail?.('3D rendering stopped unexpectedly. Retry or play Classic 2D.');announce('3D rendering problem · reload or use Classic');}
 requestAnimationFrame(loop);
}
try{if(!load())resetPose();spawn();initUi();stream();requestAnimationFrame(loop);announce('3D WORLD READY · Explore and build!',3400);}
catch(e){console.error('3D startup failure',e);window.__bw3dFail?.('Could not initialize the 3D engine. Retry or play Classic 2D.');$('fallback').hidden=false;}
window.BlockWorld3D=Object.freeze({status:()=>({renderOk,seed,loadedChunks:chunks.size,realm,stage,quality,renderScale:renderCap,connected:!!conn?.open,hero:{x:hero.x,y:hero.y,z:hero.z,hp:hero.hp,role:hero.role},camera:third?'THIRD_PERSON':'FIRST_PERSON',drawnChunks:lastChunksDrawn,bossHp:boss.hp}),height,block});
})();