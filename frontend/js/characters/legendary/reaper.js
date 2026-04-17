import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const REAPER_COLORS = {
  void: "#050006",
  black: "#10080f",
  cloak: "#1f0f1e",
  crimson: "#ff1746",
  blood: "#8f001c",
  soul: "#8cffd2",
  bone: "#eadfce",
  pale: "#fff4e6",
  violet: "#8e5cff",
};

function ensureReaperList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushReaperBurst(state, type, x, y, radius, life, angle = 0) {
  ensureReaperList(state, "reaperBursts").push({
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

function pushReaperSpark(state, x, y, angle, speed, life, size, color = REAPER_COLORS.crimson) {
  ensureReaperList(state, "reaperSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.18,
    life,
    maxLife: life,
    size,
    color,
  });
}

function pushReaperPhantom(state, player) {
  ensureReaperList(state, "reaperPhantoms").push({
    x: player.x,
    y: player.y,
    radius: player.radius,
    life: 24,
    maxLife: 24,
    seed: Math.random() * Math.PI * 2,
  });
}

function updateReaperVfx(state) {
  if (state.reaperBursts) {
    for (let i = state.reaperBursts.length - 1; i >= 0; i--) {
      state.reaperBursts[i].life--;
      if (state.reaperBursts[i].life <= 0) state.reaperBursts.splice(i, 1);
    }
  }

  if (state.reaperSparks) {
    for (let i = state.reaperSparks.length - 1; i >= 0; i--) {
      const p = state.reaperSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.reaperSparks.splice(i, 1);
    }
  }

  if (state.reaperPhantoms) {
    for (let i = state.reaperPhantoms.length - 1; i >= 0; i--) {
      state.reaperPhantoms[i].life--;
      if (state.reaperPhantoms[i].life <= 0) state.reaperPhantoms.splice(i, 1);
    }
  }

  if (state.reaperSlash) {
    state.reaperSlash.life--;
    if (state.reaperSlash.life <= 0) state.reaperSlash = null;
  }
}

function angleDiff(a, b) {
  let diff = Math.abs(a - b);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff;
}

function drawScythe(ctx, length, width, active = false) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = active ? REAPER_COLORS.pale : REAPER_COLORS.bone;
  ctx.lineWidth = width * 0.16;
  ctx.shadowBlur = active ? 20 : 9;
  ctx.shadowColor = active ? REAPER_COLORS.crimson : REAPER_COLORS.bone;
  ctx.beginPath();
  ctx.moveTo(-length * 0.42, width * 0.42);
  ctx.lineTo(length * 0.34, -width * 0.32);
  ctx.stroke();

  ctx.save();
  ctx.translate(length * 0.38, -width * 0.36);
  ctx.rotate(-0.18);
  ctx.strokeStyle = active ? REAPER_COLORS.crimson : REAPER_COLORS.pale;
  ctx.lineWidth = width * 0.14;
  ctx.shadowBlur = active ? 24 : 12;
  ctx.shadowColor = active ? REAPER_COLORS.crimson : REAPER_COLORS.soul;
  ctx.beginPath();
  ctx.arc(-width * 0.2, width * 0.15, width * 0.85, Math.PI * 1.05, Math.PI * 1.86);
  ctx.stroke();

  ctx.strokeStyle = active ? REAPER_COLORS.pale : REAPER_COLORS.soul;
  ctx.lineWidth = width * 0.05;
  ctx.beginPath();
  ctx.arc(-width * 0.2, width * 0.15, width * 0.67, Math.PI * 1.08, Math.PI * 1.82);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = active ? REAPER_COLORS.crimson : REAPER_COLORS.soul;
  ctx.beginPath();
  ctx.arc(length * 0.2, -width * 0.18, width * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDeathSigil(ctx, radius, frameCount, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(frameCount * 0.025);
  ctx.strokeStyle = "rgba(255, 23, 70, 0.68)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([16, 9]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.055);
  ctx.strokeStyle = "rgba(140, 255, 210, 0.46)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 6;
    const x = Math.cos(a) * radius * 0.68;
    const y = Math.sin(a) * radius * 0.68;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 244, 230, 0.62)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.48);
  ctx.lineTo(0, radius * 0.5);
  ctx.moveTo(-radius * 0.28, -radius * 0.1);
  ctx.lineTo(radius * 0.28, -radius * 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawReaperBody(ctx, radius, active = false, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;

  const cloak = ctx.createRadialGradient(-radius * 0.32, -radius * 0.45, radius * 0.08, 0, 0, radius * 1.36);
  cloak.addColorStop(0, active ? REAPER_COLORS.crimson : REAPER_COLORS.violet);
  cloak.addColorStop(0.2, REAPER_COLORS.cloak);
  cloak.addColorStop(0.6, REAPER_COLORS.black);
  cloak.addColorStop(1, REAPER_COLORS.void);
  ctx.fillStyle = cloak;
  ctx.shadowBlur = active ? 28 : 15;
  ctx.shadowColor = active ? REAPER_COLORS.crimson : REAPER_COLORS.violet;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.12);
  ctx.quadraticCurveTo(radius * 0.9, -radius * 0.62, radius * 0.66, radius * 0.82);
  ctx.lineTo(radius * 0.18, radius * 1.15);
  ctx.lineTo(0, radius * 0.82);
  ctx.lineTo(-radius * 0.18, radius * 1.15);
  ctx.lineTo(-radius * 0.66, radius * 0.82);
  ctx.quadraticCurveTo(-radius * 0.9, -radius * 0.62, 0, -radius * 1.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255, 23, 70, 0.82)" : "rgba(142, 92, 255, 0.58)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(5, 0, 6, 0.86)";
  ctx.beginPath();
  ctx.arc(0, -radius * 0.25, radius * 0.52, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = active ? REAPER_COLORS.crimson : REAPER_COLORS.soul;
  ctx.shadowBlur = 12;
  ctx.shadowColor = active ? REAPER_COLORS.crimson : REAPER_COLORS.soul;
  ctx.beginPath();
  ctx.arc(-radius * 0.16, -radius * 0.28, radius * 0.055, 0, Math.PI * 2);
  ctx.arc(radius * 0.16, -radius * 0.28, radius * 0.055, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(234, 223, 206, 0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.24, radius * 0.26);
  ctx.lineTo(0, radius * 0.5);
  ctx.lineTo(radius * 0.24, radius * 0.26);
  ctx.stroke();

  ctx.restore();
}

function drawReaperBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.95);
  const isR = burst.type === "r";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 244, 230, ${alpha * 0.14})`);
  glow.addColorStop(0.36, isR ? `rgba(255, 23, 70, ${alpha * 0.26})` : `rgba(140, 255, 210, ${alpha * 0.18})`);
  glow.addColorStop(1, "rgba(5, 0, 6, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * (isR ? 0.06 : 0.038));
  ctx.shadowBlur = isR ? 28 : 16;
  ctx.shadowColor = isR ? REAPER_COLORS.crimson : REAPER_COLORS.soul;
  drawDeathSigil(ctx, radius * 0.48, frameCount, alpha * 0.9);
  ctx.restore();

  ctx.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = burst.seed + i * Math.PI * 2 / 12 + frameCount * 0.025;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.18, Math.sin(a) * radius * 0.18);
    ctx.lineTo(Math.cos(a + 0.11) * radius * 0.78, Math.sin(a + 0.11) * radius * 0.78);
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(255, 244, 230, ${alpha * 0.64})`
      : `rgba(255, 23, 70, ${alpha * 0.54})`;
    ctx.lineWidth = isR ? 3 : 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawReaperSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = spark.color;
  ctx.shadowBlur = 14;
  ctx.shadowColor = spark.color;
  ctx.beginPath();
  ctx.moveTo(spark.size * 2.2, 0);
  ctx.lineTo(-spark.size * 1.1, -spark.size * 0.55);
  ctx.lineTo(-spark.size * 0.45, 0);
  ctx.lineTo(-spark.size * 1.1, spark.size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawReaperPhantom(ctx, phantom, frameCount) {
  const alpha = Math.max(0, phantom.life / phantom.maxLife);

  ctx.save();
  ctx.translate(phantom.x, phantom.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.rotate(Math.sin(frameCount * 0.06 + phantom.seed) * 0.1);
  drawReaperBody(ctx, phantom.radius, true, alpha * 0.42);
  ctx.restore();
}

export function drawReaperPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0 || !!state.reaperSlash;
  const isE = (buffs.e || 0) > 0 || isInvulnSkill;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
  const aim = Math.atan2((state.mouse?.y ?? player.y) - player.y, (state.mouse?.x ?? player.x + 100) - player.x);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 3.35 : isQ ? 2.75 : isE ? 2.55 : 1.78);
  const aura = ctx.createRadialGradient(0, 0, R * 0.12, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 244, 230, 0.16)" : "rgba(142, 92, 255, 0.07)");
  aura.addColorStop(0.48, isR ? "rgba(255, 23, 70, 0.2)" : "rgba(140, 255, 210, 0.13)");
  aura.addColorStop(1, "rgba(5, 0, 6, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(fc * (isR ? 0.055 : 0.033));
    ctx.shadowBlur = isR ? 28 : 16;
    ctx.shadowColor = isR ? REAPER_COLORS.crimson : REAPER_COLORS.soul;
    drawDeathSigil(ctx, R * (1.56 + pulse * 0.1), fc, isR ? 0.88 : 0.62);
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(-fc * 0.024);
  ctx.strokeStyle = isE ? "rgba(140, 255, 210, 0.56)" : "rgba(255, 23, 70, 0.34)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.9, R * 0.66, Math.PI * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  drawReaperBody(ctx, R, active, isE ? 0.72 : 1);

  ctx.save();
  ctx.rotate(aim);
  ctx.translate(R * 0.42, R * 0.12);
  drawScythe(ctx, R * 2.8, R * 0.64, active);
  ctx.restore();

  if (isE) {
    ctx.save();
    ctx.rotate(fc * 0.06);
    ctx.strokeStyle = "rgba(140, 255, 210, 0.64)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (2.04 + pulse * 0.12), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(140, 255, 210, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const reaper = {
  id: "reaper",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse, ghosts, boss } = state;
    const angle = Math.atan2((mouse?.y ?? player.y) - player.y, (mouse?.x ?? player.x + 100) - player.x);

    if (key === "q") {
      state.activeBuffs.q = 18;
      state.reaperSlash = {
        x: player.x,
        y: player.y,
        angle,
        life: 18,
        maxLife: 18,
      };

      ghosts.forEach((g) => {
        if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 190) {
          const a = Math.atan2(g.y - player.y, g.x - player.x);
          if (angleDiff(a, angle) < Math.PI / 2) {
            g.hp -= 15;
            g.isStunned = Math.max(g.isStunned || 0, 80);
            pushReaperSpark(state, g.x, g.y, angle, 1.6, 18, 2.4, REAPER_COLORS.crimson);
          }
        }
      });

      if (boss && dist(player.x, player.y, boss.x, boss.y) < 190 + boss.radius) {
        const a = Math.atan2(boss.y - player.y, boss.x - player.x);
        if (angleDiff(a, angle) < Math.PI / 2) boss.hp -= 25;
      }

      pushReaperBurst(state, "q", player.x, player.y, 165, 34, angle);
      for (let i = 0; i < 12; i++) {
        pushReaperSpark(state, player.x, player.y, angle + Math.PI + (Math.random() - 0.5) * 1.4, 1.2 + Math.random() * 2.4, 22, 2, i % 2 === 0 ? REAPER_COLORS.crimson : REAPER_COLORS.soul);
      }
    }

    if (key === "e") {
      state.activeBuffs.e = 3 * FPS;
      player.gracePeriod = Math.max(player.gracePeriod || 0, 3 * FPS);
      pushReaperBurst(state, "e", player.x, player.y, 145, 34, angle);
    }

    if (key === "r") {
      state.activeBuffs.r = 2 * FPS;
      state.screenShake = { timer: 30, intensity: 12 };
      if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
      state.skillRangeIndicators.push({
        x: player.x,
        y: player.y,
        radius: 1800,
        life: 45,
        maxLife: 45,
        color: "rgba(255, 23, 70, 1)",
      });

      ghosts.forEach((g) => {
        if (g.x > 0) {
          if (g.isMiniBoss || g.isSubBoss) {
            g.shield = 0;
            g.shieldActive = false;
            g.hp -= (g.maxHp || g.hp || 1) * 0.25;
            g.isStunned = Math.max(g.isStunned || 0, 120);
          } else {
            g.hp = 0;
          }
        }
      });
      if (boss) boss.hp -= boss.maxHp * 0.15;

      if (!state.explosions) state.explosions = [];
      state.explosions.push({
        x: player.x,
        y: player.y,
        radius: 2000,
        life: 30,
        color: "rgba(0, 0, 0, 0.8)",
      });

      pushReaperBurst(state, "r", player.x, player.y, 260, 54, angle);
      for (let i = 0; i < 24; i++) {
        const a = i * Math.PI * 2 / 24;
        pushReaperSpark(state, player.x, player.y, a, 1.5 + Math.random() * 3, 32, 2.4, i % 2 === 0 ? REAPER_COLORS.crimson : REAPER_COLORS.soul);
      }
    }

    return true;
  },

  update: (state) => {
    const { player, bullets, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (buffs.e > 0) {
      state.playerSpeedMultiplier *= 1.5;
      state.playerCanShootModifier = false;
      if (fc % 3 === 0) pushReaperPhantom(state, player);
      if (fc % 8 === 0) {
        pushReaperSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 0.65, 18, 1.7, REAPER_COLORS.soul);
      }
    }

    bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "reaper" || b.reaperPrepared) return;

      b.reaperPrepared = true;
      b.visualStyle = "reaper_soul";

      if (buffs.q > 0) {
        b.reaperCrescent = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.e > 0) {
        b.reaperGhost = true;
        b.pierce = true;
      }

      if (buffs.r > 0) {
        b.reaperJudgement = true;
        b.damage = (b.damage || 1) * 1.3;
      }
    });

    updateReaperVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    state.reaperPhantoms?.forEach((phantom) => drawReaperPhantom(ctx, phantom, fc));

    if (state.reaperSlash) {
      const s = state.reaperSlash;
      const alpha = s.maxLife ? Math.max(0, s.life / s.maxLife) : 1;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.shadowBlur = 24;
      ctx.shadowColor = REAPER_COLORS.crimson;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 180, s.angle - Math.PI / 2, s.angle + Math.PI / 2);
      ctx.strokeStyle = `rgba(255, 23, 70, ${alpha * 0.72})`;
      ctx.lineWidth = 46;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(s.x, s.y, 180, s.angle - Math.PI / 2, s.angle + Math.PI / 2);
      ctx.strokeStyle = `rgba(255, 244, 230, ${alpha * 0.72})`;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    }

    if (buffs.r > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const alpha = Math.max(0, buffs.r / (2 * FPS));
      const pulse = Math.sin(fc * 0.26) * 14;
      const field = ctx.createRadialGradient(0, 0, 20, 0, 0, 360 + pulse);
      field.addColorStop(0, `rgba(255, 244, 230, ${alpha * 0.08})`);
      field.addColorStop(0.44, `rgba(255, 23, 70, ${alpha * 0.18})`);
      field.addColorStop(1, "rgba(5, 0, 6, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 360 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      drawDeathSigil(ctx, 128 + pulse * 0.15, fc, 0.72);
      ctx.restore();
    }

    state.reaperBursts?.forEach((burst) => drawReaperBurst(ctx, burst, fc));
    state.reaperSparks?.forEach((spark) => drawReaperSpark(ctx, spark));
  },
};
