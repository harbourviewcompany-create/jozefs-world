/* Versus physics: weight, roll, and a dying bounce. Host only. */
(() => {
  'use strict';
  const BALL = { mass: 1.15, radius: 8, bounce: 0.42, drag: 0.985 };
  const PLAYER = { mass: 5.2, radius: 14, bounce: 0.08, drag: 0.88 };

  function collide(a, b, specA, specB) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const min = specA.radius + specB.radius;
    if (dist >= min) return;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = min - dist;
    const share = specA.mass + specB.mass;
    a.x -= nx * overlap * (specB.mass / share);
    a.y -= ny * overlap * (specB.mass / share);
    b.x += nx * overlap * (specA.mass / share);
    b.y += ny * overlap * (specA.mass / share);
    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rel > 0) return;
    const bounce = Math.min(specA.bounce, specB.bounce);
    const impulse = -(1 + bounce) * rel / (1 / specA.mass + 1 / specB.mass);
    a.vx -= impulse / specA.mass * nx;
    a.vy -= impulse / specA.mass * ny;
    b.vx += impulse / specB.mass * nx;
    b.vy += impulse / specB.mass * ny;
  }

  function walls(ball, W, H, inGoal) {
    const hit = (axis) => {
      if (axis === 'y') ball.vy = -ball.vy * BALL.bounce;
      else ball.vx = -ball.vx * BALL.bounce;
    };
    if (ball.y < 34) { ball.y = 34; hit('y'); }
    if (ball.y > H - 34) { ball.y = H - 34; hit('y'); }
    const mouth = typeof inGoal === 'function' && inGoal(ball.y);
    if (!mouth && ball.x < 34) { ball.x = 34; hit('x'); }
    if (!mouth && ball.x > W - 34) { ball.x = W - 34; hit('x'); }
  }

  function integrate(body, spec) {
    if(spec===BALL&&Number.isFinite(body.spin)&&Math.abs(body.spin)>.0001){
      // Gentle curved shots. Rotation preserves kinetic energy and stays deterministic
      // for the host simulation; clients only receive the authoritative ball state.
      const angle=Math.max(-.035,Math.min(.035,body.spin));
      const vx=body.vx,vy=body.vy,co=Math.cos(angle),si=Math.sin(angle);
      body.vx=vx*co-vy*si;
      body.vy=vx*si+vy*co;
      body.spin*=.984;
      if(Math.abs(body.spin)<.0004)body.spin=0;
    }
    body.x += body.vx;
    body.y += body.vy;
    const speed = Math.hypot(body.vx, body.vy);
    const roll = speed < 1.4 ? 0.9 : spec.drag;
    body.vx *= roll;
    body.vy *= roll;
    if (speed < 0.18) { body.vx = 0; body.vy = 0; }
  }

  window.JozefPhysics = { BALL, PLAYER, collide, walls, integrate };
})();
