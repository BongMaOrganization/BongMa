import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

const HUNTER_COLORS = {
  dark: "#20160f",
  leather: "#6b4528",
  leatherLight: "#9a6b3b",
  dust: "#caa36a",
  bone: "#ead6ad",
  steel: "#b8aa90",
};

function ensureHunterList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushHunterDust(state, x, y, count = 8, spread = 1) {
  const dust = ensureHunterList(state, "hunterDust");
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.4 + Math.random() * 1.4) * spread;
    dust.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      life: 22 + Math.random() * 18,
      maxLife: 40,
      color: Math.random() > 0.42 ? HUNTER_COLORS.dust : HUNTER_COLORS.leatherLight,
    });
  }
}

function pushHunterBurst(state, type, x, y, radius, life) {
  ensureHunterList(state, "hunterBursts").push({
    type,
    x,
    y,
    radius,
    life,
    maxLife: life,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushHunterMark(state, x, y, radius, life) {
  ensureHunterList(state, "hunterMarks").push({
    x,
    y,
    radius,
    life,
    maxLife: life,
    angle: Math.random() * Math.PI * 2,
  });
}

function updateTimedEffects(state) {
  const dust = state.hunterDust;
  if (dust) {
    for (let i = dust.length - 1; i >= 0; i--) {
      const p = dust[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life--;
      if (p.life <= 0) dust.splice(i, 1);
    }
  }

  const bursts = state.hunterBursts;
  if (bursts) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      bursts[i].life--;
      if (bursts[i].life <= 0) bursts.splice(i, 1);
    }
  }

  const marks = state.hunterMarks;
  if (marks) {
    for (let i = marks.length - 1; i >= 0; i--) {
      marks[i].life--;
      if (marks[i].life <= 0) marks.splice(i, 1);
    }
  }
}

function drawTrapIcon(ctx, radius, frameCount, seed = 0, armed = true) {
  const pulse = (Math.sin(frameCount * 0.16 + seed) + 1) * 0.5;
  const jawRadius = radius * (armed ? 1 + pulse * 0.05 : 0.82);

  ctx.save();
  ctx.rotate(seed + frameCount * 0.01);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.arc(0, 0, jawRadius, Math.PI * 0.12, Math.PI * 0.88);
  ctx.arc(0, 0, jawRadius, Math.PI * 1.12, Math.PI * 1.88);
  ctx.strokeStyle = "rgba(184, 170, 144, 0.9)";
  ctx.lineWidth = 4;
  ctx.shadowBlur = 12;
  ctx.shadowColor = HUNTER_COLORS.dust;
  ctx.stroke();

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 6; i++) {
      const a = side > 0
        ? Math.PI * (0.18 + i * 0.11)
        : Math.PI * (1.18 + i * 0.11);
      const x = Math.cos(a) * jawRadius;
      const y = Math.sin(a) * jawRadius;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(Math.cos(a) * radius * 0.58, Math.sin(a) * radius * 0.58);
      ctx.strokeStyle = "rgba(234, 214, 173, 0.78)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(32, 22, 15, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(202, 163, 106, 0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawArrowHead(ctx, length, width) {
  ctx.beginPath();
  ctx.moveTo(length * 0.58, 0);
  ctx.lineTo(-length * 0.18, -width);
  ctx.lineTo(-length * 0.02, 0);
  ctx.lineTo(-length * 0.18, width);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHunterBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.24 + progress * 0.9);
  const ringColor = burst.type === "r"
    ? HUNTER_COLORS.bone
    : burst.type === "e"
      ? HUNTER_COLORS.dust
      : HUNTER_COLORS.steel;

  ctx.save();
  ctx.translate(burst.x, burst.y);

  const dustGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  dustGlow.addColorStop(0, `rgba(234, 214, 173, ${alpha * 0.18})`);
  dustGlow.addColorStop(0.48, `rgba(154, 107, 59, ${alpha * 0.22})`);
  dustGlow.addColorStop(1, "rgba(32, 22, 15, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = dustGlow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * 0.035);
  ctx.strokeStyle = `rgba(202, 163, 106, ${alpha * 0.78})`;
  ctx.lineWidth = burst.type === "e" ? 3 : 2.4;
  ctx.setLineDash(burst.type === "q" ? [8, 7] : [16, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const spokes = burst.type === "r" ? 10 : 8;
  ctx.lineCap = "round";
  for (let i = 0; i < spokes; i++) {
    const a = burst.seed + (i / spokes) * Math.PI * 2 + frameCount * 0.015;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.24, Math.sin(a) * radius * 0.24);
    ctx.lineTo(Math.cos(a) * radius * 0.88, Math.sin(a) * radius * 0.88);
    ctx.strokeStyle = `rgba(234, 214, 173, ${alpha * 0.42})`;
    ctx.lineWidth = burst.type === "r" ? 3 : 2;
    ctx.stroke();
  }

  if (burst.type === "q") {
    drawTrapIcon(ctx, Math.max(14, radius * 0.18), frameCount, burst.seed, false);
  }

  if (burst.type === "e") {
    ctx.save();
    ctx.rotate(-frameCount * 0.04);
    ctx.strokeStyle = `rgba(234, 214, 173, ${alpha * 0.72})`;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(radius * 0.34, 0);
      ctx.lineTo(radius * 0.56, 0);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (burst.type === "r") {
    ctx.save();
    ctx.rotate(burst.seed - frameCount * 0.05);
    ctx.fillStyle = `rgba(184, 170, 144, ${alpha * 0.9})`;
    ctx.strokeStyle = `rgba(32, 22, 15, ${alpha * 0.9})`;
    ctx.lineWidth = 2;
    drawArrowHead(ctx, Math.max(24, radius * 0.26), Math.max(8, radius * 0.08));
    ctx.restore();
  }

  ctx.shadowBlur = 18;
  ctx.shadowColor = ringColor;
  ctx.restore();
}

function drawHunterMark(ctx, mark, frameCount) {
  const alpha = Math.max(0, mark.life / mark.maxLife);
  const radius = mark.radius + (1 - alpha) * 12;

  ctx.save();
  ctx.translate(mark.x, mark.y);
  ctx.rotate(mark.angle + frameCount * 0.04);
  ctx.strokeStyle = `rgba(234, 214, 173, ${alpha * 0.78})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(radius * 0.72, 0);
    ctx.lineTo(radius * 1.14, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHunterDust(ctx, particle) {
  const alpha = Math.max(0, particle.life / particle.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha * 0.68;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size * (1.1 - alpha * 0.2), 0, Math.PI * 2);
  ctx.fillStyle = particle.color;
  ctx.fill();
  ctx.restore();
}

export function drawHunterPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const isDashing = player.dashTimeLeft > 0;
  const active = isQ || isE || isR || isDashing || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.16) + 1) * 0.5;

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);

  const auraRadius = R * (isE ? 2.7 : isR ? 2.45 : active ? 2.15 : 1.75);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(234, 214, 173, 0.34)" : "rgba(202, 163, 106, 0.18)");
  aura.addColorStop(0.52, isE ? "rgba(154, 107, 59, 0.24)" : "rgba(107, 69, 40, 0.2)");
  aura.addColorStop(1, "rgba(32, 22, 15, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (isE || isR) {
    ctx.save();
    ctx.rotate(fc * (isR ? 0.055 : 0.025));
    ctx.strokeStyle = isR ? "rgba(234, 214, 173, 0.78)" : "rgba(202, 163, 106, 0.58)";
    ctx.lineWidth = isR ? 2.8 : 2;
    ctx.setLineDash(isR ? [5, 5] : [12, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.62 + pulse * 0.12), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.shadowBlur = active ? 28 : 16;
  ctx.shadowColor = active ? HUNTER_COLORS.dust : HUNTER_COLORS.leatherLight;

  const cloak = ctx.createRadialGradient(-R * 0.36, -R * 0.45, R * 0.1, 0, 0, R * 1.45);
  cloak.addColorStop(0, HUNTER_COLORS.bone);
  cloak.addColorStop(0.25, HUNTER_COLORS.leatherLight);
  cloak.addColorStop(0.72, HUNTER_COLORS.leather);
  cloak.addColorStop(1, HUNTER_COLORS.dark);
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(0, -R * 1.02);
  ctx.bezierCurveTo(R * 0.9, -R * 0.72, R * 0.96, R * 0.56, R * 0.26, R * 1.02);
  ctx.lineTo(-R * 0.26, R * 1.02);
  ctx.bezierCurveTo(-R * 0.96, R * 0.56, -R * 0.9, -R * 0.72, 0, -R * 1.02);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(234, 214, 173, 0.9)" : "rgba(202, 163, 106, 0.74)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(32, 22, 15, 0.82)";
  ctx.beginPath();
  ctx.arc(0, -R * 0.12, R * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = HUNTER_COLORS.bone;
  ctx.beginPath();
  ctx.arc(-R * 0.18, -R * 0.18, R * 0.055, 0, Math.PI * 2);
  ctx.arc(R * 0.18, -R * 0.18, R * 0.055, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -R * 0.68);
  ctx.rotate(Math.sin(fc * 0.05) * 0.03);
  ctx.fillStyle = HUNTER_COLORS.dark;
  ctx.strokeStyle = HUNTER_COLORS.dust;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.95, R * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-R * 0.38, -R * 0.42, R * 0.76, R * 0.46, R * 0.13);
  ctx.fillStyle = HUNTER_COLORS.leather;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(-0.38 + Math.sin(fc * 0.07) * 0.04);
  ctx.translate(R * 0.14, R * 0.18);
  ctx.lineCap = "round";
  ctx.strokeStyle = HUNTER_COLORS.dark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-R * 0.86, 0);
  ctx.lineTo(R * 0.94, 0);
  ctx.stroke();

  ctx.strokeStyle = HUNTER_COLORS.leatherLight;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(R * 0.18, -R * 0.42);
  ctx.quadraticCurveTo(R * 0.62, 0, R * 0.18, R * 0.42);
  ctx.stroke();

  ctx.strokeStyle = HUNTER_COLORS.bone;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(R * 0.18, -R * 0.42);
  ctx.lineTo(R * 0.18, R * 0.42);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(0.52);
  ctx.strokeStyle = "rgba(234, 214, 173, 0.66)";
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-R * 0.56 + i * R * 0.12, R * 0.48);
    ctx.lineTo(-R * 0.34 + i * R * 0.12, R * 0.94);
    ctx.stroke();
  }
  ctx.restore();

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.32, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(234, 214, 173, 0.72)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const hunter = {
  id: "hunter",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const frameCount = state.frameCount || 0;

    if (key === "q") {
      const traps = ensureHunterList(state, "hunterTraps");
      traps.push({
        x: player.x,
        y: player.y,
        radius: 24,
        seed: Math.random() * Math.PI * 2,
        frame: frameCount,
      });
      state.activeBuffs.q = 30;
      pushHunterBurst(state, "q", player.x, player.y, 110, 38);
      pushHunterDust(state, player.x, player.y, 14, 1.35);
    }

    if (key === "e") {
      state.activeBuffs.e = 5 * FPS;
      pushHunterBurst(state, "e", player.x, player.y, 300, 52);
      pushHunterDust(state, player.x, player.y, 18, 1.65);
    }

    if (key === "r") {
      const prevLen = state.bullets.length;
      spawnBullet(player.x, player.y, mouse.x, mouse.y, true);
      if (state.bullets.length > prevLen) {
        const b = state.bullets[state.bullets.length - 1];
        b.radius = 34;
        b.damage = 3;
        b.pierce = true;
        b.vx *= 0.58;
        b.vy *= 0.58;
        b.life = 130;
        b.isHunterHarpoon = true;
        b.visualStyle = "hunter_bolt";
      }
      state.activeBuffs.r = 42;
      pushHunterBurst(state, "r", player.x, player.y, 145, 42);
      pushHunterDust(state, player.x, player.y, 18, 1.8);
    }

    return true;
  },

  update: (state, ctx, canvas, buffs) => {
    const { player, ghosts, boss, frameCount } = state;
    const fc = frameCount || 0;

    if (buffs.e > 0) {
      ghosts.forEach((g) => {
        if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 300) {
          if (g.isMiniBoss || g.isSubBoss) {
            if (fc % 10 === 0) g.hp -= g.maxHp * 0.05;
          } else {
            g.hp = 0;
          }
          if (fc % 8 === 0) pushHunterMark(state, g.x, g.y, g.radius || 18, 24);
        }
      });
      if (boss && dist(player.x, player.y, boss.x, boss.y) < 300 + boss.radius) {
        if (fc % 15 === 0) boss.hp -= 2;
        if (fc % 10 === 0) pushHunterMark(state, boss.x, boss.y, boss.radius || 50, 28);
      }
      if (fc % 5 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 60 + Math.random() * 240;
        pushHunterDust(
          state,
          player.x + Math.cos(a) * r,
          player.y + Math.sin(a) * r,
          1,
          0.55,
        );
      }
    }

    const traps = state.hunterTraps;
    if (traps) {
      for (let i = traps.length - 1; i >= 0; i--) {
        const trap = traps[i];
        let triggered = false;
        ghosts.forEach((g) => {
          if (!triggered && g.x > 0 && dist(trap.x, trap.y, g.x, g.y) < 42) {
            g.isStunned = Math.max(g.isStunned || 0, 180);
            g.hp -= 2;
            triggered = true;
            pushHunterMark(state, g.x, g.y, g.radius || 18, 34);
          }
        });
        if (triggered) {
          pushHunterBurst(state, "q", trap.x, trap.y, 135, 42);
          pushHunterDust(state, trap.x, trap.y, 18, 1.8);
          traps.splice(i, 1);
        }
      }
    }

    updateTimedEffects(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    if (buffs.e > 0) {
      const radius = 300;
      ctx.save();
      ctx.translate(player.x, player.y);

      const field = ctx.createRadialGradient(0, 0, 40, 0, 0, radius);
      field.addColorStop(0, "rgba(234, 214, 173, 0.08)");
      field.addColorStop(0.65, "rgba(154, 107, 59, 0.09)");
      field.addColorStop(1, "rgba(32, 22, 15, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();

      ctx.rotate(fc * 0.01);
      ctx.strokeStyle = "rgba(202, 163, 106, 0.66)";
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "rgba(234, 214, 173, 0.42)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 82, Math.sin(a) * 82);
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        ctx.stroke();
      }

      ctx.restore();
    }

    const traps = state.hunterTraps;
    if (traps) {
      traps.forEach((trap) => {
        ctx.save();
        ctx.translate(trap.x, trap.y);
        const pulse = (Math.sin(fc * 0.14 + trap.seed) + 1) * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, 35 + pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(107, 69, 40, 0.16)";
        ctx.fill();
        ctx.strokeStyle = "rgba(202, 163, 106, 0.58)";
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        drawTrapIcon(ctx, trap.radius, fc, trap.seed, true);
        ctx.restore();
      });
    }

    state.hunterBursts?.forEach((burst) => drawHunterBurst(ctx, burst, fc));
    state.hunterMarks?.forEach((mark) => drawHunterMark(ctx, mark, fc));
    state.hunterDust?.forEach((dust) => drawHunterDust(ctx, dust));
  },
};
