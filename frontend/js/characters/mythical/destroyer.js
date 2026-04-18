import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const DESTROYER = {
  core: "#fff4df",
  gold: "#ffd23c",
  ember: "#ff7a1f",
  red: "#ff2448",
  magenta: "#ff17c8",
  violet: "#7b24ff",
  void: "#08040d",
  smoke: "#24121d",
};

function ensureDestroyerList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushDestroyerTrail(state, x, y, angle, life = 12, radius = 44, dash = false) {
  ensureDestroyerList(state, "destroyerTrails").push({
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

function pushDestroyerSpark(state, x, y, angle, speed, life, size, color = DESTROYER.red) {
  ensureDestroyerList(state, "destroyerSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.16,
    life,
    maxLife: life,
    size,
    color,
  });
}

function pushDestroyerBurst(state, type, x, y, radius, life, angle = 0) {
  ensureDestroyerList(state, "destroyerBursts").push({
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

function pulseAt(frameCount, seed = 0, speed = 0.16) {
  return (Math.sin(frameCount * speed + seed) + 1) * 0.5;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
  const cx = ax + vx * t;
  const cy = ay + vy * t;
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

function damageRiftLine(state, rift) {
  const lineRadius = rift.hitRadius || 42;

  state.ghosts?.forEach((g) => {
    if (
      g.hp > 0 &&
      distanceToSegment(g.x, g.y, rift.x, rift.y, rift.endX, rift.endY) <
        lineRadius + (g.radius || 12)
    ) {
      g.hp -= 0.55;
      g.isStunned = Math.max(g.isStunned || 0, 18);
    }
  });

  state.elementalEnemies?.forEach((e) => {
    if (
      distanceToSegment(e.x, e.y, rift.x, rift.y, rift.endX, rift.endY) <
      lineRadius + (e.radius || 14)
    ) {
      e.hp -= 0.45;
    }
  });

  if (
    state.boss &&
    distanceToSegment(state.boss.x, state.boss.y, rift.x, rift.y, rift.endX, rift.endY) <
      lineRadius + (state.boss.radius || 40)
  ) {
    state.boss.hp -= 0.85;
  }
}

function updateDestroyerVfx(state) {
  if (state.destroyerTrails) {
    for (let i = state.destroyerTrails.length - 1; i >= 0; i--) {
      const t = state.destroyerTrails[i];
      t.life--;
      if (t.life <= 0) state.destroyerTrails.splice(i, 1);
    }
  }

  if (state.destroyerSparks) {
    for (let i = state.destroyerSparks.length - 1; i >= 0; i--) {
      const p = state.destroyerSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.destroyerSparks.splice(i, 1);
    }
  }

  if (state.destroyerBursts) {
    for (let i = state.destroyerBursts.length - 1; i >= 0; i--) {
      const b = state.destroyerBursts[i];
      b.life--;
      if (b.life <= 0) state.destroyerBursts.splice(i, 1);
    }
  }

  if (state.destroyerAbsorb) {
    state.destroyerAbsorb.life--;
    if (state.destroyerAbsorb.life <= 0) state.destroyerAbsorb = null;
  }
}

function drawDestroyerSigil(ctx, radius, frameCount, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  ctx.rotate(frameCount * 0.02);
  ctx.strokeStyle = "rgba(255, 36, 72, 0.74)";
  ctx.lineWidth = 2.4;
  ctx.shadowBlur = 22;
  ctx.shadowColor = DESTROYER.red;
  ctx.setLineDash([14, 7]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.052);
  ctx.strokeStyle = "rgba(255, 210, 60, 0.62)";
  ctx.lineWidth = 1.7;
  for (let i = 0; i < 8; i++) {
    const a = i * (Math.PI * 2 / 8);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(radius * 0.28, 0);
    ctx.lineTo(radius * 0.62, -radius * 0.14);
    ctx.lineTo(radius * 0.92, 0);
    ctx.lineTo(radius * 0.62, radius * 0.14);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(255, 23, 200, 0.42)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.54, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawShard(ctx, radius, colorA, colorB, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowBlur = 18;
  ctx.shadowColor = colorA;

  const grad = ctx.createLinearGradient(0, -radius, 0, radius);
  grad.addColorStop(0, DESTROYER.core);
  grad.addColorStop(0.32, colorB);
  grad.addColorStop(0.72, colorA);
  grad.addColorStop(1, "rgba(8, 4, 13, 0)");

  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(255, 244, 223, 0.74)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.18);
  ctx.lineTo(radius * 0.46, -radius * 0.12);
  ctx.lineTo(radius * 0.18, radius * 1.12);
  ctx.lineTo(-radius * 0.38, radius * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawDestroyerBody(ctx, radius, active, frameCount) {
  const pulse = pulseAt(frameCount, 0, 0.18);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const body = ctx.createRadialGradient(0, -radius * 0.2, 1, 0, 0, radius * 1.45);
  body.addColorStop(0, DESTROYER.core);
  body.addColorStop(0.24, DESTROYER.gold);
  body.addColorStop(0.55, DESTROYER.red);
  body.addColorStop(0.82, DESTROYER.violet);
  body.addColorStop(1, DESTROYER.void);

  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 34 : 20;
  ctx.shadowColor = active ? DESTROYER.red : DESTROYER.gold;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.22);
  ctx.lineTo(radius * 0.72, -radius * 0.28);
  ctx.lineTo(radius * 0.46, radius * 0.98);
  ctx.lineTo(0, radius * 1.28);
  ctx.lineTo(-radius * 0.46, radius * 0.98);
  ctx.lineTo(-radius * 0.72, -radius * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 244, 223, 0.76)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = DESTROYER.void;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.42, -radius * 0.22);
  ctx.lineTo(radius * 0.42, -radius * 0.22);
  ctx.lineTo(radius * 0.16, radius * 0.4);
  ctx.lineTo(-radius * 0.16, radius * 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 210, 60, 0.85)";
  ctx.lineWidth = 1.4;
  ctx.shadowBlur = 12;
  ctx.shadowColor = DESTROYER.gold;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.92);
  ctx.lineTo(-radius * 0.1, -radius * 0.28);
  ctx.lineTo(radius * 0.14, -radius * 0.46);
  ctx.lineTo(0, radius * 0.72);
  ctx.stroke();

  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-0.32 + pulse * 0.09);
    drawShard(ctx, radius * 0.72, side < 0 ? DESTROYER.red : DESTROYER.violet, DESTROYER.gold, 0.86);
    ctx.restore();
  }

  ctx.fillStyle = DESTROYER.core;
  ctx.shadowBlur = 22;
  ctx.shadowColor = DESTROYER.core;
  ctx.beginPath();
  ctx.arc(0, -radius * 0.54, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawDestroyerTrail(ctx, trail, frameCount) {
  const alpha = Math.max(0, trail.life / trail.maxLife);
  const visualAlpha = alpha * alpha;
  const radius = trail.radius * (0.72 + (1 - alpha) * 0.52);

  ctx.save();
  ctx.translate(trail.x, trail.y);
  ctx.rotate(trail.angle);
  ctx.globalCompositeOperation = "lighter";

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.7);
  grad.addColorStop(0, `rgba(255, 244, 223, ${visualAlpha * 0.24})`);
  grad.addColorStop(0.28, `rgba(255, 210, 60, ${visualAlpha * 0.26})`);
  grad.addColorStop(0.58, `rgba(255, 36, 72, ${visualAlpha * (trail.dash ? 0.32 : 0.2)})`);
  grad.addColorStop(0.86, `rgba(123, 36, 255, ${visualAlpha * 0.18})`);
  grad.addColorStop(1, "rgba(8, 4, 13, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (trail.dash ? 1.9 : 1.2), radius * (trail.dash ? 0.58 : 0.45), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 244, 223, ${visualAlpha * 0.6})`;
  ctx.lineWidth = trail.dash ? 2.8 : 1.8;
  ctx.shadowBlur = 18;
  ctx.shadowColor = DESTROYER.red;
  ctx.beginPath();
  ctx.moveTo(radius * 0.6, 0);
  ctx.lineTo(-radius * 0.25, -radius * 0.35);
  ctx.lineTo(-radius * 1.38, radius * 0.04);
  ctx.lineTo(-radius * 0.25, radius * 0.35);
  ctx.closePath();
  ctx.stroke();

  ctx.rotate(frameCount * 0.018 + trail.seed);
  ctx.strokeStyle = `rgba(255, 23, 200, ${visualAlpha * 0.38})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.62, Math.PI * 0.05, Math.PI * 1.24);
  ctx.stroke();

  ctx.restore();
}

function drawDestroyerSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);
  const len = spark.size * 5;

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = spark.color;
  ctx.lineWidth = Math.max(1.2, spark.size);
  ctx.shadowBlur = 16;
  ctx.shadowColor = spark.color;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, 0);
  ctx.lineTo(len * 0.5, 0);
  ctx.stroke();
  ctx.fillStyle = DESTROYER.core;
  ctx.beginPath();
  ctx.arc(0, 0, spark.size * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDestroyerBurst(ctx, burst, frameCount) {
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const progress = 1 - alpha;
  const radius = burst.radius * (0.2 + progress * 0.9);
  const isR = burst.type === "r";
  const isE = burst.type === "e";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.rotate(burst.angle + progress * Math.PI * (isR ? 1.2 : 2.1));
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  field.addColorStop(0, `rgba(255, 244, 223, ${alpha * 0.28})`);
  field.addColorStop(0.32, `rgba(255, 210, 60, ${alpha * 0.22})`);
  field.addColorStop(0.62, isE ? `rgba(123, 36, 255, ${alpha * 0.28})` : `rgba(255, 36, 72, ${alpha * 0.25})`);
  field.addColorStop(1, "rgba(8, 4, 13, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  drawDestroyerSigil(ctx, Math.max(24, radius * 0.5), frameCount + burst.seed * 10, alpha * (isR ? 0.88 : 0.7));

  ctx.strokeStyle = isE ? "rgba(123, 36, 255, 0.78)" : "rgba(255, 36, 72, 0.78)";
  ctx.lineWidth = isR ? 3 : 2.4;
  ctx.shadowBlur = 24;
  ctx.shadowColor = isE ? DESTROYER.violet : DESTROYER.red;
  for (let i = 0; i < (isR ? 12 : 8); i++) {
    const a = i * (Math.PI * 2 / (isR ? 12 : 8));
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.32, Math.sin(a) * radius * 0.32);
    ctx.lineTo(Math.cos(a) * radius * 0.92, Math.sin(a) * radius * 0.92);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDestroyerRift(ctx, rift, frameCount) {
  const alpha = Math.max(0, rift.life / rift.maxLife);
  const pulse = pulseAt(frameCount, rift.seed, 0.3);
  const dx = rift.endX - rift.x;
  const dy = rift.endY - rift.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const px = -ny;
  const py = nx;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const beam = ctx.createLinearGradient(rift.x, rift.y, rift.endX, rift.endY);
  beam.addColorStop(0, `rgba(255, 244, 223, ${alpha * 0.85})`);
  beam.addColorStop(0.26, `rgba(255, 210, 60, ${alpha * 0.6})`);
  beam.addColorStop(0.62, `rgba(255, 36, 72, ${alpha * 0.78})`);
  beam.addColorStop(1, `rgba(123, 36, 255, ${alpha * 0.58})`);

  ctx.shadowBlur = 28;
  ctx.shadowColor = DESTROYER.red;
  ctx.strokeStyle = beam;
  ctx.lineWidth = 11 + pulse * 4;
  ctx.beginPath();
  ctx.moveTo(rift.x, rift.y);
  ctx.lineTo(rift.endX, rift.endY);
  ctx.stroke();

  ctx.strokeStyle = "rgba(8, 4, 13, 0.84)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rift.x + px * 3, rift.y + py * 3);
  for (let i = 1; i <= 7; i++) {
    const t = i / 7;
    const wobble = Math.sin(rift.seed + i * 1.7 + frameCount * 0.08) * 16;
    ctx.lineTo(rift.x + dx * t + px * wobble, rift.y + dy * t + py * wobble);
  }
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 244, 223, ${alpha * 0.75})`;
  ctx.lineWidth = 1.6;
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    const cx = rift.x + dx * t;
    const cy = rift.y + dy * t;
    const branch = 22 + i * 5;
    const side = i % 2 === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + px * branch * side + nx * 18, cy + py * branch * side + ny * 18);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDestroyerAbsorb(ctx, state) {
  const { player, destroyerAbsorb, frameCount } = state;
  if (!destroyerAbsorb) return;

  const alpha = Math.max(0, destroyerAbsorb.life / destroyerAbsorb.maxLife);
  const radius = destroyerAbsorb.radius * (0.72 + (1 - alpha) * 0.28);
  const pulse = pulseAt(frameCount || 0, 0, 0.26);

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  field.addColorStop(0, `rgba(255, 244, 223, ${alpha * 0.2})`);
  field.addColorStop(0.36, `rgba(123, 36, 255, ${alpha * 0.18})`);
  field.addColorStop(0.72, `rgba(8, 4, 13, ${alpha * 0.34})`);
  field.addColorStop(1, "rgba(8, 4, 13, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, radius + pulse * 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 244, 223, ${alpha * 0.75})`;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 22;
  ctx.shadowColor = DESTROYER.violet;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  drawDestroyerSigil(ctx, radius * 0.54, frameCount || 0, alpha * 0.72);

  ctx.restore();
}

export function drawDestroyerPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const radius = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = !!state.destroyerAbsorb || (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0 || !!state.destroyerUlt;
  const isDash = player.dashTimeLeft > 0;
  const active = isQ || isE || isR || isDash || isInvulnSkill;
  const pulse = pulseAt(fc, 0, 0.18);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = radius * (isR ? 4.35 : isE ? 3.45 : isQ ? 3.3 : isDash ? 3.15 : 2.35);
  const aura = ctx.createRadialGradient(0, 0, radius * 0.28, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 244, 223, 0.42)" : "rgba(255, 210, 60, 0.12)");
  aura.addColorStop(0.24, "rgba(255, 210, 60, 0.22)");
  aura.addColorStop(0.52, "rgba(255, 36, 72, 0.22)");
  aura.addColorStop(0.76, "rgba(123, 36, 255, 0.16)");
  aura.addColorStop(1, "rgba(8, 4, 13, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius + pulse * radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  drawDestroyerSigil(
    ctx,
    radius * (isR ? 3.55 + pulse * 0.22 : isE ? 2.7 : isQ ? 2.58 : 1.9),
    fc,
    isR ? 0.96 : active ? 0.72 : 0.4,
  );

  if (isDash) {
    const dx = player.dashDx || 1;
    const dy = player.dashDy || 0;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.rotate(angle + Math.PI);
    const streak = ctx.createLinearGradient(0, 0, -radius * 8.5, 0);
    streak.addColorStop(0, "rgba(255, 244, 223, 0.6)");
    streak.addColorStop(0.28, "rgba(255, 210, 60, 0.34)");
    streak.addColorStop(0.58, "rgba(255, 36, 72, 0.28)");
    streak.addColorStop(1, "rgba(8, 4, 13, 0)");
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.moveTo(radius * 0.72, 0);
    ctx.lineTo(-radius * 8.5, radius * 1.36);
    ctx.lineTo(-radius * 6.7, 0);
    ctx.lineTo(-radius * 8.5, -radius * 1.36);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(-fc * 0.058);
    for (let i = 0; i < 12; i++) {
      const a = i * (Math.PI * 2 / 12);
      const orbit = radius * (3.18 + pulse * 0.16);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(orbit, 0);
      ctx.rotate(fc * 0.04 + i);
      drawShard(ctx, radius * 0.26, i % 2 === 0 ? DESTROYER.red : DESTROYER.violet, DESTROYER.gold, 0.86);
      ctx.restore();
    }
    ctx.restore();
  }

  drawDestroyerBody(ctx, radius, active, fc);

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.34, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 210, 60, 0.72)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const destroyer = {
  id: "destroyer",

  onTrigger: (key, state) => {
    const { player, mouse } = state;
    const mx = mouse?.x ?? player.x;
    const my = mouse?.y ?? player.y;
    const aim = Math.atan2(my - player.y, mx - player.x);

    if (key === "q") {
      const len = 520;
      if (!state.destroyerRifts) state.destroyerRifts = [];
      const rift = {
        x: player.x,
        y: player.y,
        angle: aim,
        endX: player.x + Math.cos(aim) * len,
        endY: player.y + Math.sin(aim) * len,
        life: 5 * FPS,
        maxLife: 5 * FPS,
        hitRadius: 42,
        seed: Math.random() * Math.PI * 2,
      };
      state.destroyerRifts.push(rift);
      state.activeBuffs.q = 34;
      pushDestroyerBurst(state, "q", player.x, player.y, 160, 34, aim);
      pushDestroyerBurst(state, "q", rift.endX, rift.endY, 120, 30, aim);
      for (let i = 0; i < 16; i++) {
        const a = aim + Math.PI + (Math.random() - 0.5) * 1.2;
        pushDestroyerSpark(state, player.x, player.y, a, 1.4 + Math.random() * 3.2, 24, 2.4, i % 3 === 0 ? DESTROYER.gold : DESTROYER.red);
      }
    }

    if (key === "e") {
      const radius = 190;
      let absorbed = 0;

      state.bullets = state.bullets.filter((b) => {
        if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < radius) {
          absorbed++;
          pushDestroyerSpark(
            state,
            b.x,
            b.y,
            Math.atan2(player.y - b.y, player.x - b.x),
            2.2 + Math.random() * 2.4,
            24,
            2.2,
            absorbed % 2 === 0 ? DESTROYER.violet : DESTROYER.gold,
          );
          return false;
        }
        return true;
      });

      const bonus = Math.floor(absorbed / 5);
      if (bonus > 0) {
        state.destroyerAbsorbBuff = { shots: bonus, life: 6 * FPS, maxLife: 6 * FPS };
      }

      state.destroyerAbsorb = {
        life: 1 * FPS,
        maxLife: 1 * FPS,
        radius,
        absorbed,
      };
      state.activeBuffs.e = 1 * FPS;
      player.gracePeriod = Math.max(player.gracePeriod || 0, FPS);
      pushDestroyerBurst(state, "e", player.x, player.y, radius + 20, 36, aim);
      state.screenShake = { timer: 10, intensity: absorbed > 0 ? 4 : 2.2 };
    }

    if (key === "r") {
      state.destroyerUlt = {
        life: 8 * FPS,
        maxLife: 8 * FPS,
        radius: 165,
        seed: Math.random() * Math.PI * 2,
      };
      state.activeBuffs.r = 8 * FPS;
      state.screenShake = { timer: 22, intensity: 6 };
      pushDestroyerBurst(state, "r", player.x, player.y, 330, 58, aim);
      for (let i = 0; i < 30; i++) {
        const a = i * Math.PI * 2 / 30;
        pushDestroyerSpark(
          state,
          player.x,
          player.y,
          a,
          1.2 + Math.random() * 3.8,
          34,
          2.6,
          i % 3 === 0 ? DESTROYER.violet : i % 2 === 0 ? DESTROYER.gold : DESTROYER.red,
        );
      }
    }

    return true;
  },

  update: (state) => {
    const { player, boss, bullets, ghosts, frameCount } = state;
    const fc = frameCount || 0;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };

    player.dashEffect = () => {
      const angle = Math.atan2(player.dashDy || 0, player.dashDx || 1);
      pushDestroyerTrail(state, player.x, player.y, angle, 11, 66, true);
      if (fc % 2 === 0) {
        for (let i = 0; i < 2; i++) {
          pushDestroyerSpark(
            state,
            player.x,
            player.y,
            angle + Math.PI + (Math.random() - 0.5) * 1.1,
            1 + Math.random() * 2.2,
            20,
            2.2,
            i === 0 ? DESTROYER.gold : DESTROYER.red,
          );
        }
      }
    };

    const last = state.destroyerLastPos;
    if (last) {
      const moved = dist(last.x, last.y, player.x, player.y);
      if (moved > 1.1 && fc % ((player.dashTimeLeft > 0 || buffs.r > 0) ? 1 : 2) === 0) {
        const angle = Math.atan2(player.y - last.y, player.x - last.x);
        const dash = player.dashTimeLeft > 0;
        pushDestroyerTrail(state, player.x, player.y, angle, dash ? 11 : 8, dash ? 66 : buffs.r > 0 ? 52 : 34, dash);
      }
    }
    state.destroyerLastPos = { x: player.x, y: player.y };

    if (state.destroyerRifts) {
      for (let i = state.destroyerRifts.length - 1; i >= 0; i--) {
        const r = state.destroyerRifts[i];
        r.life--;
        if (fc % 6 === 0) damageRiftLine(state, r);
        if (r.life <= 0) state.destroyerRifts.splice(i, 1);
      }
    }

    if (state.destroyerAbsorbBuff) {
      state.destroyerAbsorbBuff.life--;
      if (state.destroyerAbsorbBuff.life > 0) {
        state.playerMultiShotModifier =
          (state.playerMultiShotModifier || player.multiShot || 1) + state.destroyerAbsorbBuff.shots;
      } else {
        state.destroyerAbsorbBuff = null;
      }
    }

    if (state.destroyerUlt) {
      const ult = state.destroyerUlt;
      ult.life--;
      state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;

      bullets?.forEach((b) => {
        if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < ult.radius) {
          b.isPlayer = true;
          b.ownerCharacter = "destroyer";
          b.visualStyle = "destroyer_ruin";
          b.vx *= -1.35;
          b.vy *= -1.35;
          b.damage = (b.damage || 1) * 2;
          b.radius = Math.max(b.radius || 4, 5);
          b.destroyerConverted = true;
          pushDestroyerSpark(state, b.x, b.y, Math.atan2(b.vy, b.vx), 1.4, 16, 2, DESTROYER.gold);
        }
      });

      if (fc % 10 === 0) {
        ghosts?.forEach((g) => {
          if (g.hp > 0 && dist(player.x, player.y, g.x, g.y) < ult.radius + (g.radius || 12)) {
            g.hp -= 0.75;
            g.isStunned = Math.max(g.isStunned || 0, 24);
          }
        });
        if (boss && dist(player.x, player.y, boss.x, boss.y) < ult.radius + (boss.radius || 40)) {
          boss.hp -= 5;
        }
      }

      if (fc % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        pushDestroyerSpark(state, player.x, player.y, a, 0.8 + Math.random() * 2, 22, 2.1, Math.random() > 0.45 ? DESTROYER.red : DESTROYER.violet);
      }

      if (ult.life <= 0) state.destroyerUlt = null;
    }

    bullets?.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "destroyer" || b.destroyerPrepared) return;

      b.destroyerPrepared = true;
      b.visualStyle = "destroyer_ruin";

      if (buffs.q > 0) {
        b.destroyerRiftShot = true;
        b.damage = (b.damage || 1) * 1.12;
      }

      if (state.destroyerAbsorbBuff?.life > 0) {
        b.destroyerAbsorbed = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.r > 0 || state.destroyerUlt) {
        b.destroyerCataclysm = true;
        b.damage = (b.damage || 1) * 1.2;
        b.radius = Math.max(b.radius || 4, 5);
      }
    });

    updateDestroyerVfx(state);
  },

  draw: (state, ctx, canvas, buffs = { q: 0, e: 0, r: 0 }) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    state.destroyerTrails?.forEach((trail) => drawDestroyerTrail(ctx, trail, fc));
    state.destroyerRifts?.forEach((rift) => drawDestroyerRift(ctx, rift, fc));
    drawDestroyerAbsorb(ctx, state);

    if (state.destroyerUlt) {
      const ult = state.destroyerUlt;
      const alpha = Math.max(0, ult.life / ult.maxLife);
      const pulse = pulseAt(fc, ult.seed || 0, 0.18);

      ctx.save();
      ctx.fillStyle = "rgba(255, 36, 72, 0.045)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";

      const field = ctx.createRadialGradient(0, 0, 16, 0, 0, ult.radius * 1.7);
      field.addColorStop(0, `rgba(255, 244, 223, ${alpha * 0.12})`);
      field.addColorStop(0.32, `rgba(255, 210, 60, ${alpha * 0.12})`);
      field.addColorStop(0.62, `rgba(255, 36, 72, ${alpha * 0.2})`);
      field.addColorStop(1, "rgba(8, 4, 13, 0)");
      ctx.fillStyle = field;
      ctx.beginPath();
      ctx.arc(0, 0, ult.radius * (1.25 + pulse * 0.08), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 36, 72, ${alpha * 0.86})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 30;
      ctx.shadowColor = DESTROYER.red;
      ctx.beginPath();
      ctx.arc(0, 0, ult.radius, 0, Math.PI * 2);
      ctx.stroke();
      drawDestroyerSigil(ctx, ult.radius * 0.68, fc, alpha * 0.82);

      ctx.restore();
    }

    state.destroyerBursts?.forEach((burst) => drawDestroyerBurst(ctx, burst, fc));
    state.destroyerSparks?.forEach((spark) => drawDestroyerSpark(ctx, spark));
  },
};
