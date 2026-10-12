/* Versus physics: mass, bounce, and circle collisions. Host only. */
(() => {
  'use strict';
  const BALL = { mass: 1, radius: 8, bounce: 0.55, drag: 0.972 };
  const PLAYER = { mass: 4.4, radius: 14, bounce: 0.12, drag: 0.9 };

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
    if (ball.y < 34) { ball.y = 34; ball.vy = Math.abs(ball.vy) * BALL.bounce + 0.2; }
    if (ball.y > H - 34) { ball.y = H - 34; ball.vy = -Math.abs(ball.vy) * BALL.bounce - 0.2; }
    const mouth = typeof inGoal === 'function' && inGoal(ball.y);
    if (!mouth && ball.x < 34) { ball.x = 34; ball.vx = Math.abs(ball.vx) * BALL.bounce + 0.3; }
    if (!mouth && ball.x > W - 34) { ball.x = W - 34; ball.vx = -Math.abs(ball.vx) * BALL.bounce - 0.3; }
  }

  function integrate(body, spec) {
    body.x += body.vx;
    body.y += body.vy;
    body.vx *= spec.drag;
    body.vy *= spec.drag;
  }

  window.JozefPhysics = { BALL, PLAYER, collide, walls, integrate };
})();
