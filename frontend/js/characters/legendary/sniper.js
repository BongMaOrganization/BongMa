import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

const SNIPER_COLORS = {
  black: "#080b0f",
  carbon: "#161b22",
  steel: "#3e4a55",
  silver: "#cbd7e3",
  lens: "#62f3ff",
  green: "#8affc1",
  red: "#ff3855",
  amber: "#ffc45a",
  white: "#ffffff",
};

function ensureSniperList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushSniperBurst(state, type, x, y, radius, life, angle = 0) {
  ensureSniperList(state, "sniperBursts").push({
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

function pushSniperSpark(state, x, y, angle, speed, life, size, color = SNIPER_COLORS.lens) {
  ensureSniperList(state, "sniperSparks").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.08,
    life,
    maxLife: life,
    size,
    color,
  });
}

function pushSniperShotLine(state, x, y, angle, length, life, color = SNIPER_COLORS.lens) {
  ensureSniperList(state, "sniperShotLines").push({
    x,
    y,
    angle,
    length,
    life,
    maxLife: life,
    color,
  });
}

function updateSniperVfx(state) {
  if (state.sniperBursts) {
    for (let i = state.sniperBursts.length - 1; i >= 0; i--) {
      state.sniperBursts[i].life--;
      if (state.sniperBursts[i].life <= 0) state.sniperBursts.splice(i, 1);
    }
  }

  if (state.sniperSparks) {
    for (let i = state.sniperSparks.length - 1; i >= 0; i--) {
      const p = state.sniperSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.sniperSparks.splice(i, 1);
    }
  }

  if (state.sniperShotLines) {
    for (let i = state.sniperShotLines.length - 1; i >= 0; i--) {
      state.sniperShotLines[i].life--;
      if (state.sniperShotLines[i].life <= 0) state.sniperShotLines.splice(i, 1);
    }
  }
}

function findNearestSniperTarget(state, x, y) {
  let target = null;
  let best = Infinity;

  state.ghosts?.forEach((g) => {
    if (g.hp > 0 && g.x > 0) {
      const d = dist(x, y, g.x, g.y);
      if (d < best) {
        best = d;
        target = g;
      }
    }
  });

  if (state.boss && (state.boss.hp ?? 1) > 0) {
    const d = dist(x, y, state.boss.x, state.boss.y);
    if (d < best) target = state.boss;
  }

  return target;
}

function drawScopeReticle(ctx, radius, frameCount, color = SNIPER_COLORS.lens, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.7;
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(frameCount * 0.015);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.48, Math.sin(a) * radius * 0.48);
    ctx.lineTo(Math.cos(a) * radius * 1.18, Math.sin(a) * radius * 1.18);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSniperRifle(ctx, length, width, active = false) {
  ctx.fillStyle = SNIPER_COLORS.black;
  ctx.strokeStyle = active ? SNIPER_COLORS.lens : SNIPER_COLORS.silver;
  ctx.lineWidth = 1.7;
  ctx.shadowBlur = active ? 15 : 6;
  ctx.shadowColor = active ? SNIPER_COLORS.lens : SNIPER_COLORS.steel;

  ctx.beginPath();
  ctx.roundRect(-length * 0.44, -width * 0.22, length * 0.9, width * 0.44, 3);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = SNIPER_COLORS.silver;
  ctx.lineWidth = width * 0.14;
  ctx.beginPath();
  ctx.moveTo(length * 0.22, 0);
  ctx.lineTo(length * 0.7, 0);
  ctx.stroke();

  ctx.fillStyle = SNIPER_COLORS.carbon;
  ctx.strokeStyle = active ? SNIPER_COLORS.green : SNIPER_COLORS.lens;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-length * 0.08, -width * 0.72, length * 0.34, width * 0.28, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = active ? SNIPER_COLORS.green : SNIPER_COLORS.lens;
  ctx.beginPath();
  ctx.arc(length * 0.27, -width * 0.58, width * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = SNIPER_COLORS.steel;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-length * 0.2, width * 0.2);
  ctx.lineTo(-length * 0.36, width * 0.78);
  ctx.moveTo(-length * 0.02, width * 0.2);
  ctx.lineTo(length * 0.04, width * 0.78);
  ctx.stroke();

  ctx.fillStyle = active ? SNIPER_COLORS.red : SNIPER_COLORS.amber;
  ctx.beginPath();
  ctx.arc(length * 0.73, 0, width * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawSniperBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.2 + progress * 0.95);
  const isR = burst.type === "r";
  const isE = burst.type === "e";
  const color = isR ? SNIPER_COLORS.red : isE ? SNIPER_COLORS.amber : SNIPER_COLORS.lens;

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.22})`);
  glow.addColorStop(0.42, isR ? `rgba(255, 56, 85, ${alpha * 0.2})` : `rgba(98, 243, 255, ${alpha * 0.18})`);
  glow.addColorStop(1, "rgba(8, 11, 15, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * (isR ? 0.055 : 0.03));
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  drawScopeReticle(ctx, radius * 0.48, frameCount, color, alpha * 0.85);
  ctx.restore();

  ctx.save();
  ctx.rotate(burst.angle || 0);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.72})`;
  ctx.lineWidth = isE ? 4 : 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-radius * 0.68, 0);
  ctx.lineTo(radius * 0.78, 0);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawSniperSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = spark.color;
  ctx.shadowBlur = 12;
  ctx.shadowColor = spark.color;
  ctx.beginPath();
  ctx.roundRect(-spark.size * 2, -spark.size * 0.28, spark.size * 4, spark.size * 0.56, 2);
  ctx.fill();
  ctx.restore();
}

function drawSniperShotLine(ctx, line) {
  const alpha = Math.max(0, line.life / line.maxLife);

  ctx.save();
  ctx.translate(line.x, line.y);
  ctx.rotate(line.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = line.color === SNIPER_COLORS.red
    ? `rgba(255, 56, 85, ${alpha * 0.62})`
    : `rgba(98, 243, 255, ${alpha * 0.5})`;
  ctx.lineWidth = line.color === SNIPER_COLORS.red ? 5 : 3;
  ctx.shadowBlur = 18;
  ctx.shadowColor = line.color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(line.length, 0);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.82})`;
  ctx.lineWidth = line.color === SNIPER_COLORS.red ? 1.7 : 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(line.length, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawSniperPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0 || !!state.sniperLock;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
  const aim = Math.atan2((state.mouse?.y ?? player.y) - player.y, (state.mouse?.x ?? player.x + 100) - player.x);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 2.7 : isQ ? 2.35 : isE ? 2.15 : 1.55);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 255, 255, 0.2)" : "rgba(98, 243, 255, 0.07)");
  aura.addColorStop(0.54, isR ? "rgba(255, 56, 85, 0.13)" : "rgba(98, 243, 255, 0.11)");
  aura.addColorStop(1, "rgba(8, 11, 15, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(fc * (isR ? 0.035 : 0.018));
    ctx.shadowBlur = isR ? 18 : 12;
    ctx.shadowColor = isR ? SNIPER_COLORS.red : SNIPER_COLORS.lens;
    drawScopeReticle(ctx, R * (1.48 + pulse * 0.08), fc, isR ? SNIPER_COLORS.red : SNIPER_COLORS.lens, 0.72);
    ctx.restore();
  }

  const suit = ctx.createRadialGradient(-R * 0.35, -R * 0.42, R * 0.08, 0, 0, R * 1.35);
  suit.addColorStop(0, SNIPER_COLORS.silver);
  suit.addColorStop(0.22, SNIPER_COLORS.steel);
  suit.addColorStop(0.58, SNIPER_COLORS.carbon);
  suit.addColorStop(1, SNIPER_COLORS.black);
  ctx.shadowBlur = active ? 24 : 12;
  ctx.shadowColor = active ? SNIPER_COLORS.lens : SNIPER_COLORS.steel;
  ctx.fillStyle = suit;
  ctx.beginPath();
  ctx.roundRect(-R * 0.76, -R * 0.86, R * 1.52, R * 1.72, R * 0.16);
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(98, 243, 255, 0.72)" : "rgba(203, 215, 227, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = SNIPER_COLORS.black;
  ctx.beginPath();
  ctx.roundRect(-R * 0.52, -R * 0.52, R * 1.04, R * 0.7, R * 0.13);
  ctx.fill();

  ctx.fillStyle = isR ? SNIPER_COLORS.red : SNIPER_COLORS.lens;
  ctx.shadowBlur = 12;
  ctx.shadowColor = isR ? SNIPER_COLORS.red : SNIPER_COLORS.lens;
  ctx.beginPath();
  ctx.roundRect(-R * 0.1, -R * 0.35, R * 0.38, R * 0.12, 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(203, 215, 227, 0.62)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, R * 0.2);
  ctx.lineTo(R * 0.5, R * 0.2);
  ctx.moveTo(-R * 0.34, R * 0.48);
  ctx.lineTo(R * 0.34, R * 0.48);
  ctx.stroke();

  ctx.save();
  ctx.rotate(aim);
  ctx.translate(R * 0.44, R * 0.2);
  drawSniperRifle(ctx, R * 3.2, R * 0.55, active);
  if (isQ || isR) {
    ctx.strokeStyle = isR ? "rgba(255, 56, 85, 0.64)" : "rgba(138, 255, 193, 0.52)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(R * 1.8, 0);
    ctx.lineTo(R * 5.4, 0);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(98, 243, 255, 0.52)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const sniper = {
  id: "sniper",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const angle = Math.atan2((mouse?.y ?? player.y) - player.y, (mouse?.x ?? player.x + 100) - player.x);

    if (key === "q") {
      state.activeBuffs.q = 5 * FPS;
      pushSniperBurst(state, "q", player.x, player.y, 125, 34, angle);
    }

    if (key === "e") {
      const prevLen = state.bullets.length;
      spawnBullet(player.x, player.y, mouse.x, mouse.y, true, 0, "player", 8);
      for (let i = prevLen; i < state.bullets.length; i++) {
        const b = state.bullets[i];
        b.damage = 8;
        b.radius = 7;
        b.pierce = true;
        b.life = 260;
        b.vx *= 1.65;
        b.vy *= 1.65;
        b.visualStyle = "sniper_round";
        b.sniperHeavy = true;
      }
      state.activeBuffs.e = 24;
      state.screenShake = { timer: 8, intensity: 5 };
      pushSniperBurst(state, "e", player.x, player.y, 150, 32, angle);
      pushSniperShotLine(state, player.x, player.y, angle, 1500, 14, SNIPER_COLORS.amber);
    }

    if (key === "r") {
      const target = findNearestSniperTarget(state, player.x, player.y);
      state.sniperLock = {
        target,
        shotsLeft: 5,
        fireCD: 0,
        life: 90,
        maxLife: 90,
      };
      state.activeBuffs.r = 90;
      state.screenShake = { timer: 10, intensity: 4 };
      pushSniperBurst(state, "r", player.x, player.y, 170, 42, angle);
    }

    return true;
  },

  update: (state) => {
    const { player, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      state.playerSpeedMultiplier *= 0.5;
      state.sniperQ_Active = true;
      if (fc % 16 === 0) {
        pushSniperSpark(state, player.x, player.y, Math.random() * Math.PI * 2, 0.45, 18, 1.6, SNIPER_COLORS.green);
      }
    }

    if (state.sniperLock) {
      const lock = state.sniperLock;
      lock.life--;
      lock.fireCD--;

      if (!lock.target || (lock.target.hp ?? 1) <= 0 || lock.target.x <= 0) {
        lock.target = findNearestSniperTarget(state, player.x, player.y);
      }

      if (lock.target && lock.shotsLeft > 0 && lock.fireCD <= 0) {
        const tx = lock.target.x;
        const ty = lock.target.y;
        const angle = Math.atan2(ty - player.y, tx - player.x);
        const prevLen = state.bullets.length;

        spawnBullet(player.x, player.y, tx, ty, true, 0, "player", 6);
        for (let i = prevLen; i < state.bullets.length; i++) {
          const b = state.bullets[i];
          b.damage = 6;
          b.radius = 6;
          b.pierce = true;
          b.life = 220;
          b.vx *= 1.55;
          b.vy *= 1.55;
          b.visualStyle = "sniper_round";
          b.sniperExecute = true;
        }

        pushSniperShotLine(state, player.x, player.y, angle, 1600, 12, SNIPER_COLORS.red);
        pushSniperBurst(state, "r", player.x, player.y, 95, 18, angle);
        state.screenShake = { timer: 5, intensity: 3 };
        lock.shotsLeft--;
        lock.fireCD = 12;
      }

      if (lock.life <= 0 || lock.shotsLeft <= 0 || buffs.r <= 0) {
        state.sniperLock = null;
      }
    }

    state.bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "sniper" || b.sniperPrepared) return;

      b.sniperPrepared = true;
      b.visualStyle = "sniper_round";

      if (buffs.q > 0) {
        b.sniperFocus = true;
        b.damage = Math.max(b.damage || 1, 3);
        b.radius = Math.max(b.radius || 4, 6);
      }
    });

    updateSniperVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, mouse, frameCount } = state;
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(angle);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(138, 255, 193, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.moveTo(player.radius + 16, 0);
      ctx.lineTo(1800, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.save();
      ctx.translate(mouse.x, mouse.y);
      ctx.globalCompositeOperation = "lighter";
      drawScopeReticle(ctx, 24 + Math.sin(fc * 0.16) * 2, fc, SNIPER_COLORS.green, 0.62);
      ctx.restore();
    }

    if (state.sniperLock?.target) {
      const target = state.sniperLock.target;
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.globalCompositeOperation = "lighter";
      const alpha = Math.max(0.25, state.sniperLock.life / state.sniperLock.maxLife);
      drawScopeReticle(ctx, (target.radius || 18) + 22 + Math.sin(fc * 0.18) * 3, fc, SNIPER_COLORS.red, alpha);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = `rgba(255, 56, 85, ${0.16 + alpha * 0.18})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([10, 12]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    state.sniperShotLines?.forEach((line) => drawSniperShotLine(ctx, line));
    state.sniperBursts?.forEach((burst) => drawSniperBurst(ctx, burst, fc));
    state.sniperSparks?.forEach((spark) => drawSniperSpark(ctx, spark));
  },
};
