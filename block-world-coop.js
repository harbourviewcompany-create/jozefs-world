/* Optimized 2D co-op overlay. Does not modify the main game. */
(function(){
 "use strict";
 const canvas = document.getElementById("game");
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 let remote = null, lastSend = 0, myX = 100, myY = 200;
 document.addEventListener("keydown", e => {
  if (e.code === "KeyA" || e.code === "ArrowLeft") myX = Math.max(20, myX - 8);
  if (e.code === "KeyD" || e.code === "ArrowRight") myX = Math.min(innerWidth - 20, myX + 8);
  if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") myY = Math.max(40, myY - 6);
 });
 setInterval(() => {
  if (window.BlockWorld2D && window.BlockWorld2D.send && performance.now() - lastSend > 150) {
   lastSend = performance.now();
   window.BlockWorld2D.send({t:"pos", x:myX, y:myY, name:"Friend"});
  }
 }, 160);
 function drawRemote() {
  if (!remote) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const x = remote.x || 120, y = remote.y || 180;
  ctx.fillStyle = "#3d9a55";
  ctx.fillRect(x - 10, y - 28, 20, 26);
  ctx.fillStyle = "#e8b78d";
  ctx.fillRect(x - 8, y - 40, 16, 14);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(remote.name || "Jozef", x, y - 46);
  ctx.restore();
 }
 const orig = requestAnimationFrame;
 window.requestAnimationFrame = function(cb) {
  return orig.call(window, function(t) {
   const r = cb(t);
   drawRemote();
   return r;
  });
 };
 window.BlockWorld2D = window.BlockWorld2D || {};
 window.BlockWorld2D.onRemote = function(data) {
  if (data && data.t === "pos") remote = data;
 };
})();
