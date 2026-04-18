import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const PHOENIX = {
  ember: "#ff4b18",
  flame: "#ff8a18",
  gold: "#ffd45a",
  sacred: "#fff1ad",
  white: "#fffdf0",
  rose: "#ff2f6d",
  ash: "#2a1110",
  smoke: "#4a2520",
};

function ensurePhoenixList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushPhoenixSpark(state, x, y, angle, speed, life, size, color = PHOENIX.flame) {
  ensurePhoenixList(state, "phoenixSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.2,
    life,
    maxLife: life,
    size,
    color,
  });
}

function pushPhoenixBurst(state, type, x, y, radius, life, angle = 0) {
  ensurePhoenixList(state, "phoenixBursts").push({
    type,
    x,
    y,
    radius,
    life,
    maxLife: life,
    angle,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushPhoenixTrail(state, x, y, angle, life = 58, radius = 42, dash = false) {
  ensurePhoenixList(state, "phoenixTrails").push({
    x,
    y,
    angle,
    life,
    maxLife: life,
    radius,
    dash,
    seed: Math.random() * Math.PI * 2,
  });
}

function burnAroundTrail(state, trail) {
  const { ghosts, boss } = state;
  const radius = trail.radius || 42;
  const damage = trail.dash ? 0.42 : 0.2;

  ghosts?.forEach((g) => {
    if (g.x > 0 && dist(trail.x, trail.y, g.x, g.y) < radius + (g.radius || 12)) {
      g.hp -= damage;
      g.isStunned = Math.max(g.isStunned || 0, trail.dash ? 22 : 10);
    }
  });

  if (boss && dist(trail.x, trail.y, boss.x, boss.y) < radius + (boss.radius || 40)) {
    boss.hp -= trail.dash ? 0.12 : 0.05;
  }
}

function scorchArea(state, x, y, radius, damage, stun = 80) {
  state.ghosts?.forEach((g) => {
    if (g.x > 0 && dist(x, y, g.x, g.y) < radius + (g.radius || 12)) {
      g.hp -= damage;
      g.isStunned = Math.max(g.isStunned || 0, stun);
    }
  });

  if (state.boss && dist(x, y, state.boss.x, state.boss.y) < radius + (state.boss.radius || 40)) {
    state.boss.hp -= damage * 1.4;
  }

  state.bullets = state.bullets.filter((b) => b.isPlayer || dist(x, y, b.x, b.y) > radius);
}

function updatePhoenixVfx(state) {
  const fc = state.frameCount || 0;

  if (state.phoenixTrails) {
    for (let i = state.phoenixTrails.length - 1; i >= 0; i--) {
      const t = state.phoenixTrails[i];
      t.life--;
      if (fc % 3 === 0) burnAroundTrail(state, t);
      if (t.life <= 0) state.phoenixTrails.splice(i, 1);
    }
  }

  if (state.phoenixBursts) {
    for (let i = state.phoenixBursts.length - 1; i >= 0; i--) {
      state.phoenixBursts[i].life--;
      if (state.phoenixBursts[i].life <= 0) state.phoenixBursts.splice(i, 1);
    }
  }

  if (state.phoenixSparks) {
    for (let i = state.phoenixSparks.length - 1; i >= 0; i--) {
      const p = state.phoenixSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.phoenixSparks.splice(i, 1);
    }
  }

  if (state.phoenixEfx) {
    state.phoenixEfx.life--;
    if (state.phoenixEfx.life <= 0) state.phoenixEfx = null;
  }

  if (state.phoenixReviveFx) {
    state.phoenixReviveFx--;
    if (state.phoenixReviveFx <= 0) state.phoenixReviveFx = 0;
  }
}

function drawFlameFeather(ctx, radius, colorA, colorB, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = "round";
  ctx.shadowBlur = 18;
  ctx.shadowColor = colorA;

  const grad = ctx.createLinearGradient(0, -radius * 1.2, 0, radius * 1.2);
  grad.addColorStop(0, PHOENIX.white);
  grad.addColorStop(0.3, colorB);
  grad.addColorStop(0.72, colorA);
  grad.addColorStop(1, "rgba(255, 75, 24, 0.2)");

  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.25);
  ctx.quadraticCurveTo(radius * 0.8, -radius * 0.45, radius * 0.34, radius * 1.2);
  ctx.quadraticCurveTo(radius * 0.1, radius * 0.7, 0, radius * 0.48);
  ctx.quadraticCurveTo(-radius * 0.1, radius * 0.7, -radius * 0.34, radius * 1.2);
  ctx.quadraticCurveTo(-radius * 0.8, -radius * 0.45, 0, -radius * 1.25);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = PHOENIX.sacred;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.95);
  ctx.quadraticCurveTo(radius * 0.08, -radius * 0.12, 0, radius * 0.75);
  ctx.stroke();

  ctx.restore();
}

function drawPhoenixSigil(ctx, radius, frameCount, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(frameCount * 0.018);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  ctx.strokeStyle = "rgba(255, 212, 90, 0.72)";
  ctx.shadowBlur = 20;
  ctx.shadowColor = PHOENIX.gold;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.035);
  for (let i = 0; i < 6; i++) {
    const a = i * (Math.PI * 2 / 6);
    ctx.save();
    ctx.rotate(a);
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 241, 173, 0.8)" : "rgba(255, 47, 109, 0.64)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(radius * 0.32, 0);
    ctx.quadraticCurveTo(radius * 0.66, -radius * 0.18, radius * 0.95, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(255, 253, 240, 0.56)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.54, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawPhoenixBody(ctx, radius, active, frameCount) {
  const pulse = (Math.sin(frameCount * 0.2) + 1) * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const body = ctx.createRadialGradient(0, -radius * 0.2, 1, 0, 0, radius * 1.4);
  body.addColorStop(0, PHOENIX.white);
  body.addColorStop(0.22, PHOENIX.gold);
  body.addColorStop(0.62, PHOENIX.flame);
  body.addColorStop(1, PHOENIX.ember);
  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 30 : 18;
  ctx.shadowColor = active ? PHOENIX.gold : PHOENIX.flame;

  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.16);
  ctx.quadraticCurveTo(radius * 0.58, -radius * 0.46, radius * 0.42, radius * 0.74);
  ctx.quadraticCurveTo(radius * 0.18, radius * 1.12, 0, radius * 1.26);
  ctx.quadraticCurveTo(-radius * 0.18, radius * 1.12, -radius * 0.42, radius * 0.74);
  ctx.quadraticCurveTo(-radius * 0.58, -radius * 0.46, 0, -radius * 1.16);
  ctx.fill();

  for (let i = -1; i <= 1; i += 2) {
    ctx.save();
    ctx.scale(i, 1);
    ctx.rotate(-0.18 + pulse * 0.08);
    ctx.beginPath();
    ctx.moveTo(radius * 0.2, -radius * 0.44);
    ctx.quadraticCurveTo(radius * 1.35, -radius * 0.88, radius * 1.9, radius * 0.28);
    ctx.quadraticCurveTo(radius * 1.18, radius * 0.08, radius * 0.56, radius * 0.86);
    ctx.quadraticCurveTo(radius * 0.48, radius * 0.12, radius * 0.2, -radius * 0.44);
    ctx.closePath();
    ctx.fillStyle = i < 0 ? "rgba(255, 75, 24, 0.9)" : "rgba(255, 138, 24, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 241, 173, 0.72)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 253, 240, 0.5)";
    ctx.lineWidth = 1;
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(radius * 0.45, -radius * (0.26 - j * 0.24));
      ctx.quadraticCurveTo(radius * (0.95 + j * 0.16), -radius * (0.42 - j * 0.12), radius * (1.42 + j * 0.08), radius * (0.04 + j * 0.13));
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = PHOENIX.white;
  ctx.shadowBlur = 18;
  ctx.shadowColor = PHOENIX.white;
  ctx.beginPath();
  ctx.arc(0, -radius * 0.74, radius * 0.17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = PHOENIX.rose;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.22);
  ctx.lineTo(radius * 0.16, -radius * 0.86);
  ctx.lineTo(0, -radius * 0.98);
  ctx.lineTo(-radius * 0.16, -radius * 0.86);
  ctx.closePath();
  ctx.fill();

  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(i * radius * 0.18, radius * 1.02);
    ctx.rotate(i * 0.25 + Math.sin(frameCount * 0.14 + i) * 0.1);
    drawFlameFeather(ctx, radius * 0.34, PHOENIX.ember, PHOENIX.gold, 0.9);
    ctx.restore();
  }

  ctx.restore();
}

function drawPhoenixTrail(ctx, trail, frameCount) {
  const alpha = Math.max(0, trail.life / trail.maxLife);
  const progress = 1 - alpha;
  const radius = trail.radius * (0.65 + progress * 0.62);
  const dash = !!trail.dash;

  ctx.save();
  ctx.translate(trail.x, trail.y);
  ctx.rotate(trail.angle + Math.sin(frameCount * 0.08 + trail.seed) * 0.18);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 253, 240, ${alpha * 0.26})`);
  glow.addColorStop(0.25, `rgba(255, 212, 90, ${alpha * 0.28})`);
  glow.addColorStop(0.58, `rgba(255, 75, 24, ${alpha * (dash ? 0.36 : 0.24)})`);
  glow.addColorStop(1, "rgba(42, 17, 16, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (dash ? 1.5 : 1.08), radius * (dash ? 0.72 : 0.58), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let i = -1; i <= 1; i++) {
    ctx.save();
    ctx.translate(i * radius * 0.24, 0);
    ctx.rotate(i * 0.36 + progress * 1.2);
    drawFlameFeather(ctx, radius * (dash ? 0.36 : 0.28), i === 0 ? PHOENIX.rose : PHOENIX.ember, PHOENIX.gold, alpha * 0.82);
    ctx.restore();
  }

  ctx.restore();
}

function drawPhoenixSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = 14;
  ctx.shadowColor = spark.color;
  drawFlameFeather(ctx, spark.size * 2.2, spark.color, PHOENIX.gold, alpha);
  ctx.restore();
}

function drawPhoenixBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.95);
  const isR = burst.type === "r" || burst.type === "revive";
  const isE = burst.type === "e";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 253, 240, ${alpha * 0.34})`);
  glow.addColorStop(0.3, `rgba(255, 212, 90, ${alpha * 0.3})`);
  glow.addColorStop(0.66, isE ? `rgba(255, 47, 109, ${alpha * 0.22})` : `rgba(255, 75, 24, ${alpha * 0.22})`);
  glow.addColorStop(1, "rgba(42, 17, 16, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  drawPhoenixSigil(ctx, Math.max(24, radius * 0.62), frameCount + burst.seed * 20, alpha * (isR ? 1 : 0.78));

  ctx.save();
  ctx.rotate(burst.angle + frameCount * 0.035);
  for (let i = 0; i < (isR ? 12 : 8); i++) {
    const a = i * (Math.PI * 2 / (isR ? 12 : 8));
    ctx.save();
    ctx.rotate(a);
    ctx.translate(radius * 0.46, 0);
    drawFlameFeather(ctx, radius * (isR ? 0.13 : 0.1), i % 2 === 0 ? PHOENIX.rose : PHOENIX.ember, PHOENIX.gold, alpha * 0.88);
    ctx.restore();
  }
  ctx.restore();

  ctx.restore();
}

function drawPhoenixTeleport(ctx, efx, frameCount) {
  const alpha = Math.max(0, efx.life / efx.maxLife);
  const progress = 1 - alpha;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (efx.fromX != null && efx.fromY != null) {
    const trail = ctx.createLinearGradient(efx.fromX, efx.fromY, efx.x, efx.y);
    trail.addColorStop(0, `rgba(255, 75, 24, ${alpha * 0.12})`);
    trail.addColorStop(0.5, `rgba(255, 212, 90, ${alpha * 0.38})`);
    trail.addColorStop(1, `rgba(255, 47, 109, ${alpha * 0.14})`);
    ctx.strokeStyle = trail;
    ctx.lineWidth = 34 * alpha;
    ctx.lineCap = "round";
    ctx.shadowBlur = 24;
    ctx.shadowColor = PHOENIX.gold;
    ctx.beginPath();
    ctx.moveTo(efx.fromX, efx.fromY);
    ctx.quadraticCurveTo(
      (efx.fromX + efx.x) * 0.5,
      (efx.fromY + efx.y) * 0.5 - 120,
      efx.x,
      efx.y,
    );
    ctx.stroke();
  }

  ctx.translate(efx.x, efx.y);
  const radius = efx.radius * (0.28 + progress * 0.9);
  const wave = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  wave.addColorStop(0, `rgba(255, 253, 240, ${alpha * 0.28})`);
  wave.addColorStop(0.44, `rgba(255, 138, 24, ${alpha * 0.24})`);
  wave.addColorStop(1, "rgba(255, 47, 109, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = wave;
  ctx.fill();
  drawPhoenixSigil(ctx, radius * 0.64, frameCount, alpha);

  ctx.restore();
}

export function drawPhoenixPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const radius = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const isDash = player.dashTimeLeft > 0;
  const active = isQ || isE || isR || isDash || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = radius * (isR ? 3.6 : isQ ? 2.9 : isDash ? 2.8 : 2.2);
  const aura = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 253, 240, 0.38)" : "rgba(255, 212, 90, 0.14)");
  aura.addColorStop(0.28, "rgba(255, 212, 90, 0.28)");
  aura.addColorStop(0.58, isR ? "rgba(255, 47, 109, 0.22)" : "rgba(255, 75, 24, 0.18)");
  aura.addColorStop(1, "rgba(42, 17, 16, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius + pulse * radius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  drawPhoenixSigil(
    ctx,
    radius * (isR ? 3.0 + pulse * 0.18 : isQ ? 2.42 + pulse * 0.12 : 1.9 + pulse * 0.08),
    fc,
    isR ? 0.92 : active ? 0.68 : 0.36,
  );

  if (isDash) {
    const dx = player.dashDx || Math.cos(fc * 0.02);
    const dy = player.dashDy || Math.sin(fc * 0.02);
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.rotate(angle + Math.PI);
    const dashTrail = ctx.createLinearGradient(0, 0, -radius * 8, 0);
    dashTrail.addColorStop(0, "rgba(255, 253, 240, 0.6)");
    dashTrail.addColorStop(0.32, "rgba(255, 212, 90, 0.34)");
    dashTrail.addColorStop(0.7, "rgba(255, 75, 24, 0.2)");
    dashTrail.addColorStop(1, "rgba(255, 75, 24, 0)");
    ctx.beginPath();
    ctx.moveTo(radius * 0.7, 0);
    ctx.lineTo(-radius * 8, radius * 1.5);
    ctx.lineTo(-radius * 6.8, 0);
    ctx.lineTo(-radius * 8, -radius * 1.5);
    ctx.closePath();
    ctx.fillStyle = dashTrail;
    ctx.fill();
    ctx.restore();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(-fc * 0.055);
    for (let i = 0; i < 10; i++) {
      const a = i * (Math.PI * 2 / 10);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(radius * (2.62 + pulse * 0.14), 0);
      drawFlameFeather(ctx, radius * 0.34, i % 2 === 0 ? PHOENIX.rose : PHOENIX.ember, PHOENIX.gold, 0.9);
      ctx.restore();
    }
    ctx.restore();
  }

  drawPhoenixBody(ctx, radius, active, fc);

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 241, 173, 0.68)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const phoenix = {
  id: "phoenix",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const mx = mouse?.x ?? player.x;
    const my = mouse?.y ?? player.y;
    const aim = Math.atan2(my - player.y, mx - player.x);

    if (key === "q") {
      state.activeBuffs.q = 5 * FPS;
      pushPhoenixBurst(state, "q", player.x, player.y, 190, 42, aim);
      for (let i = 0; i < 22; i++) {
        pushPhoenixSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 1.2 + Math.random() * 3.4, 28, 2.4, i % 3 === 0 ? PHOENIX.sacred : i % 2 === 0 ? PHOENIX.gold : PHOENIX.ember);
      }
    }

    if (key === "e") {
      const oldX = player.x;
      const oldY = player.y;
      const world = state.world || { width: 3000, height: 3000 };
      const tx = Math.max(player.radius, Math.min(world.width - player.radius, mx));
      const ty = Math.max(player.radius, Math.min(world.height - player.radius, my));

      scorchArea(state, oldX, oldY, 150, 4.5, 80);
      scorchArea(state, tx, ty, 210, 6, 110);

      state.phoenixEfx = {
        fromX: oldX,
        fromY: oldY,
        x: tx,
        y: ty,
        radius: 225,
        life: 34,
        maxLife: 34,
      };

      player.x = tx;
      player.y = ty;
      player.gracePeriod = Math.max(player.gracePeriod || 0, 28);
      state.activeBuffs.e = 34;
      state.screenShake = { timer: 16, intensity: 7 };

      pushPhoenixBurst(state, "e", oldX, oldY, 150, 32, aim);
      pushPhoenixBurst(state, "e", tx, ty, 230, 42, aim);
      const steps = Math.max(5, Math.min(18, Math.floor(dist(oldX, oldY, tx, ty) / 70)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pushPhoenixTrail(state, oldX + (tx - oldX) * t, oldY + (ty - oldY) * t, aim, 46, 58, true);
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 6 * FPS;
      state.phoenixReviveReady = true;
      state.screenShake = { timer: 28, intensity: 7 };
      scorchArea(state, player.x, player.y, 180, 4, 60);
      pushPhoenixBurst(state, "r", player.x, player.y, 310, 58, aim);
      for (let i = 0; i < 34; i++) {
        const a = i * Math.PI * 2 / 34;
        pushPhoenixSpark(state, player.x, player.y, a, 1.4 + Math.random() * 3.6, 36, 2.8, i % 3 === 0 ? PHOENIX.rose : i % 2 === 0 ? PHOENIX.gold : PHOENIX.white);
      }
    }

    return true;
  },

  update: (state) => {
    const { player, bullets, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    player.dashEffect = () => {
      const angle = Math.atan2(player.dashDy || 0, player.dashDx || 1);
      pushPhoenixTrail(state, player.x, player.y, angle, 48, 64, true);
      if (fc % 2 === 0) {
        for (let i = 0; i < 3; i++) {
          pushPhoenixSpark(state, player.x, player.y, angle + Math.PI + (Math.random() - 0.5) * 1.2, 1 + Math.random() * 2.5, 22, 2.2, i === 0 ? PHOENIX.white : PHOENIX.gold);
        }
      }
    };

    const last = state.phoenixLastPos;
    if (last) {
      const moved = dist(last.x, last.y, player.x, player.y);
      if (moved > 1.2 && (fc % ((buffs.q || player.dashTimeLeft > 0 || buffs.r > 0) ? 1 : 2) === 0)) {
        const angle = Math.atan2(player.y - last.y, player.x - last.x);
        const dash = player.dashTimeLeft > 0;
        pushPhoenixTrail(state, player.x, player.y, angle, dash ? 50 : 44, dash ? 66 : (buffs.q > 0 ? 52 : 38), dash);
      }
    }
    state.phoenixLastPos = { x: player.x, y: player.y };

    if (buffs.q > 0) {
      state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.4;
      if (fc % 3 === 0) {
        pushPhoenixSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 0.8 + Math.random() * 1.8, 22, 2, Math.random() > 0.45 ? PHOENIX.gold : PHOENIX.ember);
      }
    }

    if (buffs.r > 0) {
      state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.45;
      state.playerMultiShotModifier = Math.max(state.playerMultiShotModifier || 1, (player.multiShot || 1) + 2);
      if (fc % 4 === 0) pushPhoenixTrail(state, player.x, player.y, fc * 0.08, 52, 62, false);
    }

    bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "phoenix" || b.phoenixPrepared) return;

      b.phoenixPrepared = true;
      b.visualStyle = "phoenix_fire";

      if (buffs.q > 0) {
        b.phoenixSacred = true;
        b.radius = Math.max(b.radius || 4, 5);
        b.damage = (b.damage || 1) * 1.15;
      }

      if (buffs.e > 0) {
        b.phoenixAsh = true;
        b.pierce = true;
      }

      if (buffs.r > 0) {
        b.phoenixRebirth = true;
        b.damage = (b.damage || 1) * 1.3;
        b.radius = Math.max(b.radius || 4, 5);
      }
    });

    if (state.phoenixReviveFx > 0 && fc % 2 === 0) {
      pushPhoenixBurst(state, "revive", player.x, player.y, 245, 40, fc * 0.05);
      state.phoenixReviveFx = Math.max(state.phoenixReviveFx, 1);
    }

    updatePhoenixVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    state.phoenixTrails?.forEach((trail) => drawPhoenixTrail(ctx, trail, fc));

    if (state.phoenixEfx) drawPhoenixTeleport(ctx, state.phoenixEfx, fc);

    if ((buffs.r || 0) > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 75, 24, 0.045)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.18) * 18;
      const field = ctx.createRadialGradient(0, 0, 20, 0, 0, 410 + pulse);
      field.addColorStop(0, "rgba(255, 253, 240, 0.12)");
      field.addColorStop(0.3, "rgba(255, 212, 90, 0.16)");
      field.addColorStop(0.65, "rgba(255, 47, 109, 0.12)");
      field.addColorStop(1, "rgba(42, 17, 16, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 410 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      drawPhoenixSigil(ctx, 180 + pulse * 0.16, fc, 0.78);
      ctx.restore();
    }

    if (state.phoenixReviveFx > 0) {
      drawPhoenixBurst(ctx, {
        type: "revive",
        x: player.x,
        y: player.y,
        radius: 340,
        life: state.phoenixReviveFx,
        maxLife: 20,
        angle: fc * 0.05,
        seed: 0,
      }, fc);
    }

    state.phoenixBursts?.forEach((burst) => drawPhoenixBurst(ctx, burst, fc));
    state.phoenixSparks?.forEach((spark) => drawPhoenixSpark(ctx, spark));
  },
};
