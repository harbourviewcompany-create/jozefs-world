(()=>{
const root=document.getElementById('jw-planet');if(!root)return;const lowMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
root.style.animation='none';root.style.touchAction='none';
const canvas=document.createElement('canvas');canvas.width=320;canvas.height=320;canvas.style.cssText='width:100%;height:100%;touch-action:none';root.replaceChildren(canvas);
canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label','JozefWorld globe: use left and right arrow keys to rotate, then tap a visible portal');const ctx=canvas.getContext('2d');let yaw=0,pitch=0,drag=false,lastX=0,lastY=0,moved=false;
const places=[['FOREST','block-world.html',0.3,0.3],['STADIUM','jozefworld-sports.html',2.4,-0.2],['HQ','index.html',4.4,0.7]];
const projected=(lon,lat)=>{const a=lon+yaw,x=Math.sin(a)*Math.cos(lat),z=Math.cos(a)*Math.cos(lat),y=Math.sin(lat);return{x:160+x*136,y:160-(y*Math.cos(pitch)-z*Math.sin(pitch))*136,z:y*Math.sin(pitch)+z*Math.cos(pitch)}};
function frame(){
ctx.clearRect(0,0,320,320);const sea=ctx.createRadialGradient(115,105,10,180,180,180);sea.addColorStop(0,'#70e9d7');sea.addColorStop(.45,'#167fba');sea.addColorStop(1,'#061a39');ctx.fillStyle=sea;ctx.beginPath();ctx.arc(160,160,140,0,7);ctx.fill();
ctx.save();ctx.beginPath();ctx.arc(160,160,139,0,7);ctx.clip();
for(let i=0;i<250;i++){const lat=Math.asin(Math.sin(i*19.7)*.85),lon=i*2.4,q=projected(lon,lat);if(q.z<=0)continue;ctx.fillStyle=i%4?'#4dcb9b':'#d1e7ac';ctx.globalAlpha=.2+q.z*.5;ctx.beginPath();ctx.arc(q.x,q.y,2+q.z*2,0,7);ctx.fill()}ctx.restore();ctx.globalAlpha=1;
for(const p of places){const q=projected(p[2],p[3]);if(q.z<0)continue;ctx.fillStyle='#ffde8a';ctx.shadowColor='#ffdf87';ctx.shadowBlur=16;ctx.beginPath();ctx.arc(q.x,q.y,15,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#14364c';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(p[0][0],q.x,q.y+4)}
if(!document.hidden)if(!lowMotion&&!document.hidden)requestAnimationFrame(frame)}
canvas.addEventListener('pointerdown',e=>{drag=true;moved=false;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;yaw+=dx*.012;pitch=Math.max(-1,Math.min(1,pitch+dy*.008));lastX=e.clientX;lastY=e.clientY;if(lowMotion)frame()});
canvas.addEventListener('pointerup',e=>{drag=false;if(moved)return;const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*320/b.width,y=(e.clientY-b.top)*320/b.height;for(const p of places){const q=projected(p[2],p[3]);if(q.z>0&&Math.hypot(q.x-x,q.y-y)<24){const url=new URL(p[1],location.href),world=new URLSearchParams(location.search).get('world')||localStorage.getItem('jw-world-code');if(/^[a-f0-9]{32}$/.test(world||''))url.searchParams.set('world',world);location.assign(url.href);break}}});
canvas.addEventListener('pointercancel',()=>{drag=false});canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){yaw+=(e.key==='ArrowLeft'?.18:-.18);e.preventDefault()}if(e.key==='ArrowUp'||e.key==='ArrowDown'){pitch=Math.max(-1,Math.min(1,pitch+(e.key==='ArrowUp'?.12:-.12)));e.preventDefault()}});document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(frame)});
frame();
})();