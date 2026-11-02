/* Conservative adaptive resolution for iPhone Safari and lower-power GPUs. */
export function createAdaptiveResolution(renderer,canvas,deviceRatio=1){
const ceiling=Math.max(1,Math.min(1.5,Number(deviceRatio)||1));let ratio=ceiling,seconds=0,frames=0,fps=0,cooldown=0;
function resize(){renderer.setPixelRatio(ratio);renderer.setSize(Math.max(1,canvas.clientWidth),Math.max(1,canvas.clientHeight),false)}
return{tick(dt){if(!Number.isFinite(dt)||dt<=0||dt>.2)return fps;seconds+=dt;frames++;cooldown+=dt;if(seconds>=8){fps=Math.round(frames/seconds);if(cooldown>=12&&fps<28&&ratio>1){ratio=1;resize();cooldown=0}else if(cooldown>=20&&fps>53&&ratio<ceiling){ratio=ceiling;resize();cooldown=0}seconds=0;frames=0}return fps},get fps(){return fps},get ratio(){return ratio},resize};
}
