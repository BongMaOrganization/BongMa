import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";
import { updateHealthUI } from "../../ui.js";

const CREATOR = {
  white: "#fffdf0",
  pearl: "#fff7c7",
  gold: "#ffd84a",
  amber: "#ffb72e",
  cyan: "#7dfcff",
  mint: "#9dff6a",
  rose: "#ff6adf",
  sky: "#6fb8ff",
  deep: "#08151a",
};

function ensureCreatorList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushCreatorTrail(state, x, y, angle, life = 12, radius = 42, dash = false) {
  ensureCreatorList(state, "creatorTrails").push({
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

function pushCreatorSpark(state, x, y, angle, speed, life, size, color = CREATOR.gold) {
  ensureCreatorList(state, "creatorSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.14,
    life,
    maxLife: life,
    size,
    color,
  });
}

function pushCreatorBurst(state, type, x, y, radius, life, angle = 0) {
  ensureCreatorList(state, "creatorBursts").push({
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

function pushCreatorRune(state, type, x, y, radius, life, angle = 0) {
  ensureCreatorList(state, "creatorRunes").push({
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

function nearestTarget(x, y, state, radius) {
  if (state.boss && dist(x, y, state.boss.x, state.boss.y) < radius + (state.boss.radius || 40)) {
    return state.boss;
  }

  let best = null;
  let bestDist = radius;
  state.ghosts?.forEach((g) => {
    if (g.x <= 0 || g.hp <= 0) return;
    const d = dist(x, y, g.x, g.y);
    if (d < bestDist) {
      best = g;
      bestDist = d;
    }
  });

  return best;
}

function markCreatorBullet(b, source, state) {
  b.visualStyle = "creator_light";
  b.ownerCharacter = "creator";
  b.creatorSource = source;
  b.radius = Math.max(b.radius || 4, source === "orb" ? 5 : 4);

  if (source === "turret") {
    b.creatorTurret = true;
    b.damage = (b.damage || 1) * 1.1;
  }

  if (source === "orb") {
    b.creatorOrb = true;
    b.damage = (b.damage || 1) * 1.24;
    b.life = Math.max(b.life || 0, 115);
  }

  if ((state.activeBuffs?.r || 0) > 0) {
    b.creatorGenesis = true;
    b.damage = (b.damage || 1) * 1.12;
  }
}

function updateCreatorVfx(state) {
  if (state.creatorTrails) {
    for (let i = state.creatorTrails.length - 1; i >= 0; i--) {
      const t = state.creatorTrails[i];
      t.life--;
      if (t.life <= 0) state.creatorTrails.splice(i, 1);
    }
  }

  if (state.creatorSparks) {
    for (let i = state.creatorSparks.length - 1; i >= 0; i--) {
      const p = state.creatorSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.93;
      p.vy *= 0.93;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.creatorSparks.splice(i, 1);
    }
  }

  if (state.creatorBursts) {
    for (let i = state.creatorBursts.length - 1; i >= 0; i--) {
      const b = state.creatorBursts[i];
      b.life--;
      if (b.life <= 0) state.creatorBursts.splice(i, 1);
    }
  }

  if (state.creatorRunes) {
    for (let i = state.creatorRunes.length - 1; i >= 0; i--) {
      const r = state.creatorRunes[i];
      r.life--;
      if (r.life <= 0) state.creatorRunes.splice(i, 1);
    }
  }
}

function drawCreatorSigil(ctx, radius, frameCount, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  ctx.rotate(frameCount * 0.018);
  ctx.strokeStyle = "rgba(255, 216, 74, 0.76)";
  ctx.lineWidth = 2.3;
  ctx.shadowBlur = 22;
  ctx.shadowColor = CREATOR.gold;
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.043);
  ctx.strokeStyle = "rgba(125, 252, 255, 0.62)";
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const a = i * (Math.PI * 2 / 6);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(radius * 0.22, 0);
    ctx.lineTo(radius * 0.54, -radius * 0.14);
    ctx.lineTo(radius * 0.86, 0);
    ctx.lineTo(radius * 0.54, radius * 0.14);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(255, 253, 240, 0.56)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawCreatorWing(ctx, radius, colorA, colorB, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.shadowBlur = 18;
  ctx.shadowColor = colorA;

  const grad = ctx.createLinearGradient(0, -radius, 0, radius);
  grad.addColorStop(0, CREATOR.white);
  grad.addColorStop(0.36, colorB);
  grad.addColorStop(0.78, colorA);
  grad.addColorStop(1, "rgba(8, 21, 26, 0)");

  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(255, 253, 240, 0.72)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.15);
  ctx.quadraticCurveTo(radius * 0.86, -radius * 0.32, radius * 0.28, radius * 1.08);
  ctx.quadraticCurveTo(radius * 0.04, radius * 0.55, 0, radius * 0.2);
  ctx.quadraticCurveTo(-radius * 0.04, radius * 0.55, -radius * 0.28, radius * 1.08);
  ctx.quadraticCurveTo(-radius * 0.86, -radius * 0.32, 0, -radius * 1.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawCreatorBody(ctx, radius, active, frameCount) {
  const pulse = pulseAt(frameCount, 0, 0.18);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-0.52 + pulse * 0.1);
    ctx.translate(radius * 0.54, -radius * 0.02);
    drawCreatorWing(ctx, radius * 0.92, side < 0 ? CREATOR.gold : CREATOR.cyan, CREATOR.pearl, active ? 0.82 : 0.58);
    ctx.restore();
  }

  const body = ctx.createRadialGradient(0, -radius * 0.28, 1, 0, 0, radius * 1.38);
  body.addColorStop(0, CREATOR.white);
  body.addColorStop(0.24, CREATOR.pearl);
  body.addColorStop(0.52, CREATOR.gold);
  body.addColorStop(0.78, CREATOR.cyan);
  body.addColorStop(1, CREATOR.sky);

  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 34 : 20;
  ctx.shadowColor = active ? CREATOR.white : CREATOR.gold;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.24);
  ctx.lineTo(radius * 0.56, -radius * 0.12);
  ctx.quadraticCurveTo(radius * 0.34, radius * 0.86, 0, radius * 1.25);
  ctx.quadraticCurveTo(-radius * 0.34, radius * 0.86, -radius * 0.56, -radius * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 253, 240, 0.84)";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 216, 74, 0.82)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.82);
  ctx.lineTo(radius * 0.14, -radius * 0.28);
  ctx.lineTo(-radius * 0.1, radius * 0.24);
  ctx.lineTo(0, radius * 0.82);
  ctx.stroke();

  ctx.save();
  ctx.translate(0, -radius * 1.08);
  ctx.strokeStyle = "rgba(255, 253, 240, 0.82)";
  ctx.shadowBlur = 18;
  ctx.shadowColor = CREATOR.white;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * (0.44 + pulse * 0.04), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = CREATOR.white;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawCreatorTrail(ctx, trail, frameCount) {
  const alpha = Math.max(0, trail.life / trail.maxLife);
  const visualAlpha = alpha * alpha;
  const radius = trail.radius * (0.72 + (1 - alpha) * 0.48);

  ctx.save();
  ctx.translate(trail.x, trail.y);
  ctx.rotate(trail.angle);
  ctx.globalCompositeOperation = "lighter";

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.7);
  grad.addColorStop(0, `rgba(255, 253, 240, ${visualAlpha * 0.28})`);
  grad.addColorStop(0.3, `rgba(255, 216, 74, ${visualAlpha * 0.26})`);
  grad.addColorStop(0.58, `rgba(125, 252, 255, ${visualAlpha * (trail.dash ? 0.28 : 0.18)})`);
  grad.addColorStop(0.86, `rgba(157, 255, 106, ${visualAlpha * 0.16})`);
  grad.addColorStop(1, "rgba(8, 21, 26, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (trail.dash ? 1.85 : 1.18), radius * (trail.dash ? 0.55 : 0.43), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 253, 240, ${visualAlpha * 0.64})`;
  ctx.lineWidth = trail.dash ? 2.8 : 1.8;
  ctx.shadowBlur = 18;
  ctx.shadowColor = CREATOR.gold;
  ctx.beginPath();
  ctx.moveTo(radius * 0.62, 0);
  ctx.quadraticCurveTo(-radius * 0.25, -radius * 0.44, -radius * 1.28, -radius * 0.08);
  ctx.quadraticCurveTo(-radius * 0.3, 0, -radius * 1.28, radius * 0.08);
  ctx.quadraticCurveTo(-radius * 0.25, radius * 0.44, radius * 0.62, 0);
  ctx.stroke();

  ctx.rotate(frameCount * 0.018 + trail.seed);
  ctx.strokeStyle = `rgba(125, 252, 255, ${visualAlpha * 0.38})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.6, Math.PI * 0.1, Math.PI * 1.35);
  ctx.stroke();

  ctx.restore();
}

function drawCreatorSpark(ctx, spark) {
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
  ctx.moveTo(0, -len * 0.5);
  ctx.lineTo(0, len * 0.5);
  ctx.stroke();
  ctx.fillStyle = CREATOR.white;
  ctx.beginPath();
  ctx.arc(0, 0, spark.size * 0.58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCreatorBurst(ctx, burst, frameCount) {
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const progress = 1 - alpha;
  const radius = burst.radius * (0.2 + progress * 0.9);
  const isR = burst.type === "r";
  const isE = burst.type === "e";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.rotate(burst.angle + progress * Math.PI * (isR ? 1.1 : 2.0));
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  field.addColorStop(0, `rgba(255, 253, 240, ${alpha * 0.32})`);
  field.addColorStop(0.34, `rgba(255, 216, 74, ${alpha * 0.24})`);
  field.addColorStop(0.62, isE ? `rgba(157, 255, 106, ${alpha * 0.2})` : `rgba(125, 252, 255, ${alpha * 0.2})`);
  field.addColorStop(1, "rgba(8, 21, 26, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  drawCreatorSigil(ctx, Math.max(24, radius * 0.5), frameCount + burst.seed * 10, alpha * (isR ? 0.88 : 0.7));

  ctx.strokeStyle = isE ? "rgba(157, 255, 106, 0.75)" : "rgba(255, 216, 74, 0.78)";
  ctx.lineWidth = isR ? 3 : 2.2;
  ctx.shadowBlur = 24;
  ctx.shadowColor = isE ? CREATOR.mint : CREATOR.gold;
  for (let i = 0; i < (isR ? 12 : 8); i++) {
    const a = i * (Math.PI * 2 / (isR ? 12 : 8));
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.28, Math.sin(a) * radius * 0.28);
    ctx.lineTo(Math.cos(a) * radius * 0.9, Math.sin(a) * radius * 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCreatorRune(ctx, rune, frameCount) {
  const alpha = Math.max(0, rune.life / rune.maxLife);

  ctx.save();
  ctx.translate(rune.x, rune.y);
  ctx.rotate(rune.angle + frameCount * 0.024);
  ctx.globalCompositeOperation = "lighter";
  drawCreatorSigil(ctx, rune.radius * (1 + (1 - alpha) * 0.12), frameCount + rune.seed * 10, alpha * 0.75);
  ctx.restore();
}

function drawCreatorTurret(ctx, turret, player, frameCount) {
  const lifeRatio = turret.maxLife ? Math.max(0, turret.life / turret.maxLife) : 1;
  const pulse = pulseAt(frameCount, turret.seed || 0, 0.2);
  const deploy = Math.max(0, turret.deployPulse || 0) / 28;

  ctx.save();
  ctx.translate(turret.x, turret.y);
  ctx.globalCompositeOperation = "lighter";

  if (deploy > 0) {
    ctx.strokeStyle = `rgba(255, 253, 240, ${deploy * 0.75})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 26;
    ctx.shadowColor = CREATOR.white;
    ctx.beginPath();
    ctx.arc(0, 0, 56 * (1 - deploy * 0.32), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(255, 216, 74, ${0.16 + lifeRatio * 0.28})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(player.x - turret.x, player.y - turret.y);
  ctx.lineTo(0, 0);
  ctx.stroke();

  drawCreatorSigil(ctx, 24 + pulse * 2, frameCount + (turret.seed || 0) * 10, 0.56 + lifeRatio * 0.24);

  ctx.rotate((turret.angle || 0) + frameCount * 0.02);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
  grad.addColorStop(0, CREATOR.white);
  grad.addColorStop(0.36, CREATOR.gold);
  grad.addColorStop(0.72, CREATOR.cyan);
  grad.addColorStop(1, "rgba(8, 21, 26, 0)");
  ctx.fillStyle = grad;
  ctx.shadowBlur = 20;
  ctx.shadowColor = CREATOR.gold;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(18, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(-18, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 253, 240, 0.82)";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2);
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = i % 2 === 0 ? CREATOR.gold : CREATOR.cyan;
    ctx.fillRect(4, -2, 18, 4);
    ctx.restore();
  }

  ctx.restore();
}

function drawCreatorHolyZone(ctx, zone, frameCount) {
  const alpha = Math.max(0, zone.life / zone.maxLife);
  const pulse = pulseAt(frameCount, zone.seed || 0, 0.12);

  ctx.save();
  ctx.translate(zone.x, zone.y);
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, zone.radius * 1.1);
  field.addColorStop(0, `rgba(255, 253, 240, ${alpha * 0.12})`);
  field.addColorStop(0.35, `rgba(157, 255, 106, ${alpha * 0.12})`);
  field.addColorStop(0.7, `rgba(255, 216, 74, ${alpha * 0.16})`);
  field.addColorStop(1, "rgba(8, 21, 26, 0)");
  ctx.fillStyle = field;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius * (1.02 + pulse * 0.03), 0, Math.PI * 2);
  ctx.fill();

  drawCreatorSigil(ctx, zone.radius * (0.78 + pulse * 0.02), frameCount, alpha * 0.82);

  ctx.strokeStyle = `rgba(255, 253, 240, ${alpha * 0.6})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = i * (Math.PI * 2 / 8) + frameCount * 0.01;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * zone.radius * 0.22, Math.sin(a) * zone.radius * 0.22);
    ctx.lineTo(Math.cos(a) * zone.radius * 0.84, Math.sin(a) * zone.radius * 0.84);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCreatorOrb(ctx, orb, player, frameCount) {
  const lifeRatio = orb.maxLife ? Math.max(0, orb.life / orb.maxLife) : 1;
  const pulse = pulseAt(frameCount, orb.seed || 0, 0.22);
  const x = player.x + Math.cos(orb.angle) * orb.orbitRadius;
  const y = player.y + Math.sin(orb.angle) * orb.orbitRadius;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
  aura.addColorStop(0, `rgba(255, 253, 240, ${0.78 * lifeRatio})`);
  aura.addColorStop(0.34, `rgba(255, 216, 74, ${0.48 * lifeRatio})`);
  aura.addColorStop(0.68, `rgba(125, 252, 255, ${0.28 * lifeRatio})`);
  aura.addColorStop(1, "rgba(8, 21, 26, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 34 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(frameCount * 0.04 + (orb.seed || 0));
  drawCreatorWing(ctx, 11 + pulse * 1.2, CREATOR.gold, CREATOR.white, lifeRatio);
  drawCreatorWing(ctx, 8 + pulse, CREATOR.cyan, CREATOR.pearl, lifeRatio * 0.72);

  ctx.fillStyle = CREATOR.white;
  ctx.shadowBlur = 20;
  ctx.shadowColor = CREATOR.white;
  ctx.beginPath();
  ctx.arc(0, 0, 5 + pulse * 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawCreatorPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const radius = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0 || (state.creatorTurrets?.length || 0) > 0;
  const isE = (buffs.e || 0) > 0 || !!state.creatorHolyZone;
  const isR = (buffs.r || 0) > 0 || (state.creatorOrbs?.length || 0) > 0;
  const isDash = player.dashTimeLeft > 0;
  const active = isQ || isE || isR || isDash || isInvulnSkill;
  const pulse = pulseAt(fc, 0, 0.17);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = radius * (isR ? 4.4 : isE ? 3.45 : isQ ? 3.25 : isDash ? 3.05 : 2.35);
  const aura = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 253, 240, 0.42)" : "rgba(255, 216, 74, 0.14)");
  aura.addColorStop(0.25, "rgba(255, 216, 74, 0.24)");
  aura.addColorStop(0.5, "rgba(125, 252, 255, 0.18)");
  aura.addColorStop(0.74, "rgba(157, 255, 106, 0.14)");
  aura.addColorStop(1, "rgba(8, 21, 26, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius + pulse * radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  drawCreatorSigil(
    ctx,
    radius * (isR ? 3.6 + pulse * 0.2 : isE ? 2.72 : isQ ? 2.58 : 1.88),
    fc,
    isR ? 0.96 : active ? 0.72 : 0.4,
  );

  if (isDash) {
    const dx = player.dashDx || 1;
    const dy = player.dashDy || 0;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.rotate(angle + Math.PI);
    const streak = ctx.createLinearGradient(0, 0, -radius * 8.2, 0);
    streak.addColorStop(0, "rgba(255, 253, 240, 0.62)");
    streak.addColorStop(0.3, "rgba(255, 216, 74, 0.32)");
    streak.addColorStop(0.62, "rgba(125, 252, 255, 0.24)");
    streak.addColorStop(1, "rgba(8, 21, 26, 0)");
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.moveTo(radius * 0.66, 0);
    ctx.quadraticCurveTo(-radius * 4.8, radius * 1.8, -radius * 8.2, radius * 1.08);
    ctx.quadraticCurveTo(-radius * 6.4, 0, -radius * 8.2, -radius * 1.08);
    ctx.quadraticCurveTo(-radius * 4.8, -radius * 1.8, radius * 0.66, 0);
    ctx.fill();
    ctx.restore();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(-fc * 0.052);
    for (let i = 0; i < 12; i++) {
      const a = i * (Math.PI * 2 / 12);
      const orbit = radius * (3.18 + pulse * 0.16);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(orbit, 0);
      ctx.rotate(fc * 0.035 + i);
      drawCreatorWing(ctx, radius * 0.26, i % 2 === 0 ? CREATOR.gold : CREATOR.cyan, CREATOR.white, 0.82);
      ctx.restore();
    }
    ctx.restore();
  }

  drawCreatorBody(ctx, radius, active, fc);

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.34, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 253, 240, 0.72)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const creator = {
  id: "creator",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player } = state;

    if (key === "q") {
      if (!state.creatorTurrets) state.creatorTurrets = [];
      const offsets = [
        { dx: -86, dy: -86 },
        { dx: 86, dy: -86 },
        { dx: -86, dy: 86 },
        { dx: 86, dy: 86 },
      ];

      offsets.forEach((off, index) => {
        const x = player.x + off.dx;
        const y = player.y + off.dy;
        state.creatorTurrets.push({
          x,
          y,
          life: 8 * FPS,
          maxLife: 8 * FPS,
          fireCD: index * 7,
          angle: index * Math.PI / 2,
          deployPulse: 28,
          seed: Math.random() * Math.PI * 2,
        });
        pushCreatorRune(state, "turret", x, y, 44, 34, index * Math.PI / 2);
      });

      state.activeBuffs.q = 8 * FPS;
      pushCreatorBurst(state, "q", player.x, player.y, 210, 42);
      for (let i = 0; i < 20; i++) {
        const a = i * Math.PI * 2 / 20;
        pushCreatorSpark(state, player.x, player.y, a, 1.2 + Math.random() * 2.8, 28, 2.4, i % 2 === 0 ? CREATOR.gold : CREATOR.cyan);
      }
    }

    if (key === "e") {
      player.hp = Math.min(player.maxHp, player.hp + 2);
      updateHealthUI();
      state.creatorHolyZone = {
        x: player.x,
        y: player.y,
        life: 6 * FPS,
        maxLife: 6 * FPS,
        radius: 155,
        seed: Math.random() * Math.PI * 2,
      };
      state.activeBuffs.e = 6 * FPS;
      pushCreatorBurst(state, "e", player.x, player.y, 205, 44);
      pushCreatorRune(state, "e", player.x, player.y, 155, 54);
      state.screenShake = { timer: 8, intensity: 1.8 };
    }

    if (key === "r") {
      if (!state.creatorOrbs) state.creatorOrbs = [];
      for (let i = 0; i < 6; i++) {
        state.creatorOrbs.push({
          angle: (i / 6) * Math.PI * 2,
          orbitRadius: 86,
          life: 12 * FPS,
          maxLife: 12 * FPS,
          fireCD: i * 8,
          seed: Math.random() * Math.PI * 2,
        });
      }
      state.creatorDeathSave = true;
      state.activeBuffs.r = 12 * FPS;
      state.screenShake = { timer: 18, intensity: 4.2 };
      pushCreatorBurst(state, "r", player.x, player.y, 340, 58);
      for (let i = 0; i < 32; i++) {
        const a = i * Math.PI * 2 / 32;
        pushCreatorSpark(state, player.x, player.y, a, 1.2 + Math.random() * 3.4, 34, 2.6, i % 3 === 0 ? CREATOR.white : i % 2 === 0 ? CREATOR.gold : CREATOR.cyan);
      }
    }

    return true;
  },

  update: (state) => {
    const { player, bullets, frameCount } = state;
    const fc = frameCount || 0;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };

    player.dashEffect = () => {
      const angle = Math.atan2(player.dashDy || 0, player.dashDx || 1);
      pushCreatorTrail(state, player.x, player.y, angle, 11, 64, true);
      if (fc % 2 === 0) {
        pushCreatorSpark(state, player.x, player.y, angle + Math.PI + (Math.random() - 0.5) * 0.9, 1.1 + Math.random() * 2, 20, 2.2, CREATOR.gold);
      }
    };

    const last = state.creatorLastPos;
    if (last) {
      const moved = dist(last.x, last.y, player.x, player.y);
      if (moved > 1.1 && fc % ((player.dashTimeLeft > 0 || buffs.r > 0) ? 1 : 2) === 0) {
        const angle = Math.atan2(player.y - last.y, player.x - last.x);
        const dash = player.dashTimeLeft > 0;
        pushCreatorTrail(state, player.x, player.y, angle, dash ? 11 : 8, dash ? 66 : buffs.r > 0 ? 52 : 34, dash);
      }
    }
    state.creatorLastPos = { x: player.x, y: player.y };

    if (state.creatorTurrets) {
      state.creatorTurrets = state.creatorTurrets.filter((turret) => {
        turret.life--;
        turret.fireCD--;
        turret.angle += 0.035;
        if (turret.deployPulse > 0) turret.deployPulse--;

        if (turret.fireCD <= 0) {
          const target = nearestTarget(turret.x, turret.y, state, 520);
          if (target) {
            const oldLen = state.bullets.length;
            spawnBullet(turret.x, turret.y, target.x, target.y, true, 2, "player");
            for (let i = oldLen; i < state.bullets.length; i++) {
              markCreatorBullet(state.bullets[i], "turret", state);
            }
            turret.fireCD = 28;
            pushCreatorSpark(state, turret.x, turret.y, Math.atan2(target.y - turret.y, target.x - turret.x), 1.6, 16, 2, CREATOR.cyan);
          }
        }

        return turret.life > 0;
      });
    }

    if (state.creatorHolyZone) {
      const zone = state.creatorHolyZone;
      zone.life--;

      bullets?.forEach((b) => {
        if (dist(b.x, b.y, zone.x, zone.y) > zone.radius) return;
        if (!b.isPlayer) {
          b.vx *= 0.2;
          b.vy *= 0.2;
          return;
        }

        if (!b.creatorBlessed) {
          b.creatorBlessed = true;
          b.visualStyle = "creator_light";
          b.damage = (b.damage || 1) * 1.18;
          b.radius = Math.max(b.radius || 4, 5);
        }
      });

      if (fc % 16 === 0) {
        const a = Math.random() * Math.PI * 2;
        pushCreatorSpark(state, zone.x + Math.cos(a) * zone.radius * 0.65, zone.y + Math.sin(a) * zone.radius * 0.65, a + Math.PI, 0.8, 22, 2, CREATOR.mint);
      }

      if (zone.life <= 0) state.creatorHolyZone = null;
    }

    if (state.creatorOrbs) {
      state.creatorOrbs = state.creatorOrbs.filter((orb) => {
        orb.life--;
        orb.angle += 0.042;
        orb.orbitRadius = 86 + Math.sin(fc * 0.04 + (orb.seed || 0)) * 6;
        orb.fireCD--;

        const ox = player.x + Math.cos(orb.angle) * orb.orbitRadius;
        const oy = player.y + Math.sin(orb.angle) * orb.orbitRadius;

        if (orb.fireCD <= 0) {
          const target = nearestTarget(ox, oy, state, 440);
          if (target) {
            const oldLen = state.bullets.length;
            spawnBullet(ox, oy, target.x, target.y, true, 3, "player");
            for (let i = oldLen; i < state.bullets.length; i++) {
              markCreatorBullet(state.bullets[i], "orb", state);
            }
            orb.fireCD = 42;
            pushCreatorSpark(state, ox, oy, Math.atan2(target.y - oy, target.x - ox), 1.5, 16, 2, CREATOR.gold);
          }
        }

        return orb.life > 0;
      });

      if (state.creatorOrbs.length === 0) state.creatorDeathSave = false;
    }

    bullets?.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "creator" || b.creatorPrepared) return;
      b.creatorPrepared = true;
      b.visualStyle = "creator_light";

      if ((buffs.q || 0) > 0) {
        b.creatorTurret = b.creatorTurret || true;
        b.damage = (b.damage || 1) * 1.06;
      }

      if ((buffs.e || 0) > 0 || b.creatorBlessed) {
        b.creatorBlessed = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if ((buffs.r || 0) > 0) {
        b.creatorGenesis = true;
        b.damage = (b.damage || 1) * 1.12;
        b.radius = Math.max(b.radius || 4, 5);
      }
    });

    if ((buffs.r || 0) > 0 && fc % 5 === 0) {
      const a = Math.random() * Math.PI * 2;
      pushCreatorSpark(state, player.x, player.y, a, 0.8 + Math.random() * 1.8, 24, 2.1, Math.random() > 0.45 ? CREATOR.gold : CREATOR.cyan);
    }

    updateCreatorVfx(state);
  },

  draw: (state, ctx, canvas, buffs = { q: 0, e: 0, r: 0 }) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    state.creatorTrails?.forEach((trail) => drawCreatorTrail(ctx, trail, fc));
    state.creatorRunes?.forEach((rune) => drawCreatorRune(ctx, rune, fc));
    if (state.creatorHolyZone) drawCreatorHolyZone(ctx, state.creatorHolyZone, fc);
    state.creatorTurrets?.forEach((turret) => drawCreatorTurret(ctx, turret, player, fc));
    state.creatorOrbs?.forEach((orb) => drawCreatorOrb(ctx, orb, player, fc));

    if ((buffs.r || 0) > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 216, 74, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.14) * 18;
      const field = ctx.createRadialGradient(0, 0, 20, 0, 0, 390 + pulse);
      field.addColorStop(0, "rgba(255, 253, 240, 0.12)");
      field.addColorStop(0.28, "rgba(255, 216, 74, 0.16)");
      field.addColorStop(0.62, "rgba(125, 252, 255, 0.12)");
      field.addColorStop(1, "rgba(8, 21, 26, 0)");
      ctx.fillStyle = field;
      ctx.beginPath();
      ctx.arc(0, 0, 390 + pulse, 0, Math.PI * 2);
      ctx.fill();
      drawCreatorSigil(ctx, 170 + pulse * 0.12, fc, 0.72);
      ctx.restore();
    }

    state.creatorBursts?.forEach((burst) => drawCreatorBurst(ctx, burst, fc));
    state.creatorSparks?.forEach((spark) => drawCreatorSpark(ctx, spark));
  },
};
