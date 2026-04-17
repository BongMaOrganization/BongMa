import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const GUNNER_COLORS = {
  steelDark: "#111820",
  steel: "#26313d",
  steelLight: "#586474",
  amber: "#ffbf4d",
  warning: "#ff4d2e",
  plasma: "#f5f7ff",
};

function ensureGunnerList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushGunnerBurst(state, type, x, y, radius, life, angle = 0) {
  ensureGunnerList(state, "gunnerBursts").push({
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

function pushGunnerSpark(state, x, y, angle, speed, life, size, color = GUNNER_COLORS.amber) {
  ensureGunnerList(state, "gunnerSparks").push({
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

function updateGunnerVfx(state) {
  if (state.gunnerBursts) {
    for (let i = state.gunnerBursts.length - 1; i >= 0; i--) {
      state.gunnerBursts[i].life--;
      if (state.gunnerBursts[i].life <= 0) state.gunnerBursts.splice(i, 1);
    }
  }

  if (state.gunnerSparks) {
    for (let i = state.gunnerSparks.length - 1; i >= 0; i--) {
      const p = state.gunnerSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.gunnerSparks.splice(i, 1);
    }
  }
}

function drawCrosshair(ctx, radius, frameCount, alpha = 1, color = GUNNER_COLORS.amber) {
  ctx.save();
  ctx.rotate(frameCount * 0.025);
  ctx.strokeStyle = color.startsWith("rgba") ? color : color;
  ctx.globalAlpha *= alpha;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.62, Math.sin(a) * radius * 0.62);
    ctx.lineTo(Math.cos(a) * radius * 1.15, Math.sin(a) * radius * 1.15);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRailCore(ctx, length, width) {
  ctx.fillStyle = GUNNER_COLORS.steelDark;
  ctx.strokeStyle = GUNNER_COLORS.steelLight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-length * 0.45, -width * 0.5, length, width, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = GUNNER_COLORS.amber;
  ctx.beginPath();
  ctx.roundRect(length * 0.1, -width * 0.22, length * 0.32, width * 0.44, 3);
  ctx.fill();

  ctx.strokeStyle = "rgba(245, 247, 255, 0.72)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-length * 0.38, -width * 0.18);
  ctx.lineTo(length * 0.38, -width * 0.18);
  ctx.moveTo(-length * 0.38, width * 0.18);
  ctx.lineTo(length * 0.38, width * 0.18);
  ctx.stroke();
}

function drawMine(ctx, mine, frameCount) {
  const pulse = (Math.sin(frameCount * 0.18 + mine.seed) + 1) * 0.5;

  ctx.save();
  ctx.translate(mine.x, mine.y);
  ctx.globalCompositeOperation = "lighter";

  ctx.beginPath();
  ctx.arc(0, 0, 38 + pulse * 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 191, 77, 0.07)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 191, 77, 0.35)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 7]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(frameCount * 0.035 + mine.seed);
  ctx.fillStyle = GUNNER_COLORS.steelDark;
  ctx.strokeStyle = "rgba(255, 191, 77, 0.86)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 17 : 11;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = pulse > 0.5 ? GUNNER_COLORS.warning : GUNNER_COLORS.amber;
  ctx.shadowBlur = 14;
  ctx.shadowColor = ctx.fillStyle;
  ctx.beginPath();
  ctx.arc(0, 0, 5 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGunnerBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.2 + progress * 0.96);

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(245, 247, 255, ${alpha * 0.32})`);
  glow.addColorStop(
    0.42,
    burst.type === "r"
      ? `rgba(255, 77, 46, ${alpha * 0.26})`
      : `rgba(255, 191, 77, ${alpha * 0.22})`,
  );
  glow.addColorStop(1, "rgba(17, 24, 32, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
    ctx.save();
    ctx.rotate(burst.seed + frameCount * (0.045 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
    ctx.strokeStyle = ring === 0
      ? `rgba(245, 247, 255, ${alpha * 0.76})`
      : burst.type === "r"
        ? `rgba(255, 77, 46, ${alpha * 0.56})`
        : `rgba(255, 191, 77, ${alpha * 0.56})`;
    ctx.lineWidth = Math.max(1.4, 4.6 - ring);
    ctx.shadowBlur = 22;
    ctx.shadowColor = burst.type === "r" ? GUNNER_COLORS.warning : GUNNER_COLORS.amber;
    ctx.setLineDash(ring === 0 ? [14, 8] : [5, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.54 + ring * 0.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  const spokes = burst.type === "r" ? 16 : burst.type === "q" ? 12 : 10;
  ctx.lineCap = "round";
  for (let i = 0; i < spokes; i++) {
    const a = burst.seed + (i / spokes) * Math.PI * 2 + frameCount * 0.05;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.2, Math.sin(a) * radius * 0.2);
    ctx.lineTo(Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.86);
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(245, 247, 255, ${alpha * 0.68})`
      : burst.type === "r"
        ? `rgba(255, 77, 46, ${alpha * 0.52})`
        : `rgba(255, 191, 77, ${alpha * 0.48})`;
    ctx.lineWidth = burst.type === "r" ? 3 : 2;
    ctx.stroke();
  }

  if (burst.type === "q") {
    ctx.save();
    ctx.rotate(burst.angle);
    drawRailCore(ctx, Math.max(32, radius * 0.32), Math.max(9, radius * 0.09));
    ctx.restore();
  }

  if (burst.type === "r") {
    ctx.save();
    ctx.rotate(-frameCount * 0.08);
    drawCrosshair(ctx, Math.max(18, radius * 0.2), frameCount, alpha, `rgba(255, 77, 46, ${alpha})`);
    ctx.restore();
  }

  ctx.restore();
}

function drawGunnerSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);

  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = spark.color;
  ctx.shadowBlur = 12;
  ctx.shadowColor = spark.color;
  ctx.beginPath();
  ctx.roundRect(-spark.size * 1.7, -spark.size * 0.35, spark.size * 3.4, spark.size * 0.7, 2);
  ctx.fill();
  ctx.restore();
}

export function drawGunnerPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
  const angle = Math.atan2(state.mouse.y - player.y, state.mouse.x - player.x);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * (active ? 2.55 : 1.85));
  aura.addColorStop(0, active ? "rgba(245, 247, 255, 0.34)" : "rgba(255, 191, 77, 0.16)");
  aura.addColorStop(0.5, isR ? "rgba(255, 77, 46, 0.2)" : "rgba(255, 191, 77, 0.16)");
  aura.addColorStop(1, "rgba(17, 24, 32, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, R * (active ? 2.55 : 1.85), 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.strokeStyle = isR ? "rgba(255, 77, 46, 0.72)" : "rgba(255, 191, 77, 0.66)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = isR ? GUNNER_COLORS.warning : GUNNER_COLORS.amber;
    drawCrosshair(ctx, R * (1.58 + pulse * 0.12), fc, 0.9, ctx.strokeStyle);
    ctx.restore();
  }

  const armor = ctx.createRadialGradient(-R * 0.35, -R * 0.42, R * 0.06, 0, 0, R * 1.35);
  armor.addColorStop(0, "#dce4ec");
  armor.addColorStop(0.25, GUNNER_COLORS.steelLight);
  armor.addColorStop(0.62, GUNNER_COLORS.steel);
  armor.addColorStop(1, GUNNER_COLORS.steelDark);

  ctx.shadowBlur = active ? 26 : 16;
  ctx.shadowColor = active ? GUNNER_COLORS.amber : GUNNER_COLORS.steelLight;
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.roundRect(-R * 0.78, -R * 0.86, R * 1.56, R * 1.72, R * 0.24);
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255, 191, 77, 0.86)" : "rgba(160, 170, 185, 0.74)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(17, 24, 32, 0.86)";
  ctx.beginPath();
  ctx.roundRect(-R * 0.48, -R * 0.42, R * 0.96, R * 0.54, R * 0.12);
  ctx.fill();

  ctx.fillStyle = GUNNER_COLORS.amber;
  ctx.shadowBlur = 10;
  ctx.shadowColor = GUNNER_COLORS.amber;
  ctx.beginPath();
  ctx.roundRect(-R * 0.36, -R * 0.22, R * 0.72, R * 0.08, 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.rotate(angle);
  ctx.translate(R * 0.36, R * 0.24);
  drawRailCore(ctx, R * 2.15, R * 0.54);
  if (isQ) {
    ctx.fillStyle = "rgba(245, 247, 255, 0.9)";
    ctx.shadowBlur = 20;
    ctx.shadowColor = GUNNER_COLORS.amber;
    ctx.beginPath();
    ctx.arc(R * 1.04, 0, R * (0.16 + pulse * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.rotate(-0.55);
  ctx.fillStyle = "rgba(17, 24, 32, 0.82)";
  ctx.strokeStyle = "rgba(255, 191, 77, 0.5)";
  ctx.lineWidth = 1.4;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.roundRect(-R * 0.72 + i * R * 0.2, R * 0.56, R * 0.12, R * 0.52, 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.28, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 191, 77, 0.72)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function distToSegment(p, v, w) {
  const l2 = dist(v.x, v.y, w.x, w.y) ** 2;
  if (l2 === 0) return dist(p.x, p.y, v.x, v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
}

export const gunner = {
  id: "gunner",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse, ghosts, boss } = state;

    if (key === "q") {
      state.activeBuffs.q = 15;
      const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      state.gunnerLaser = {
        x: player.x,
        y: player.y,
        angle,
        life: 15,
        maxLife: 15,
      };
      pushGunnerBurst(state, "q", player.x, player.y, 125, 34, angle);

      for (let i = 0; i < 18; i++) {
        pushGunnerSpark(
          state,
          player.x + Math.cos(angle) * 18,
          player.y + Math.sin(angle) * 18,
          angle + (Math.random() - 0.5) * 0.55,
          2.2 + Math.random() * 3.4,
          18 + Math.random() * 12,
          2 + Math.random() * 2.5,
          Math.random() > 0.35 ? GUNNER_COLORS.amber : GUNNER_COLORS.plasma,
        );
      }

      const p1 = { x: player.x, y: player.y };
      const p2 = {
        x: player.x + Math.cos(angle) * 1000,
        y: player.y + Math.sin(angle) * 1000,
      };

      ghosts.forEach((g) => {
        if (g.x > 0 && distToSegment({ x: g.x, y: g.y }, p1, p2) < g.radius + 15) {
          g.hp -= 3;
          g.isStunned = 60;
          pushGunnerBurst(state, "hit", g.x, g.y, 62, 22, angle);
        }
      });
      if (boss && distToSegment({ x: boss.x, y: boss.y }, p1, p2) < boss.radius + 15) {
        boss.hp -= 15;
        pushGunnerBurst(state, "hit", boss.x, boss.y, Math.min(95, boss.radius + 28), 26, angle);
      }
    }

    if (key === "e") {
      const mines = ensureGunnerList(state, "gunnerMines");
      mines.push({
        x: player.x,
        y: player.y,
        seed: Math.random() * Math.PI * 2,
        armedAt: state.frameCount || 0,
      });
      state.activeBuffs.e = 28;
      pushGunnerBurst(state, "e", player.x, player.y, 95, 30);
    }

    if (key === "r") {
      const strikes = ensureGunnerList(state, "gunnerAirstrikes");
      strikes.push({
        x: mouse.x,
        y: mouse.y,
        timer: 1 * FPS,
        maxTimer: 1 * FPS,
        seed: Math.random() * Math.PI * 2,
      });
      state.activeBuffs.r = 1 * FPS;
      pushGunnerBurst(state, "r", mouse.x, mouse.y, 210, 40);
    }

    return true;
  },

  update: (state, ctx, canvas, buffs) => {
    const { ghosts, boss, bullets, frameCount } = state;
    const fc = frameCount || 0;

    if (state.gunnerLaser) {
      state.gunnerLaser.life = Math.max(0, (state.gunnerLaser.life || 0) - 1);
      if (state.gunnerLaser.life <= 0 && buffs.q <= 0) state.gunnerLaser = null;
    }

    if (state.gunnerMines) {
      for (let i = state.gunnerMines.length - 1; i >= 0; i--) {
        const m = state.gunnerMines[i];
        const triggered =
          ghosts.some((g) => g.x > 0 && dist(m.x, m.y, g.x, g.y) < 40) ||
          (boss && dist(m.x, m.y, boss.x, boss.y) < boss.radius + 40);

        if (triggered) {
          ghosts.forEach((g) => {
            if (g.x > 0 && dist(m.x, m.y, g.x, g.y) < 100) {
              g.hp = (g.hp || 1) - 1;
              g.isStunned = 45;
              pushGunnerBurst(state, "hit", g.x, g.y, 48, 18);
            }
          });
          if (boss && dist(m.x, m.y, boss.x, boss.y) < 100) boss.hp -= 5;
          if (!state.explosions) state.explosions = [];
          state.explosions.push({ x: m.x, y: m.y, radius: 100, life: 10, color: "rgba(255,191,77,0.8)" });
          pushGunnerBurst(state, "e", m.x, m.y, 150, 34);
          for (let s = 0; s < 18; s++) {
            const a = (s / 18) * Math.PI * 2;
            pushGunnerSpark(state, m.x, m.y, a, 1.8 + Math.random() * 3.2, 22, 2.5, GUNNER_COLORS.amber);
          }
          state.gunnerMines.splice(i, 1);
        } else if (fc % 25 === 0) {
          pushGunnerSpark(state, m.x, m.y, Math.random() * Math.PI * 2, 0.28, 18, 1.5, GUNNER_COLORS.amber);
        }
      }
    }

    if (state.gunnerAirstrikes) {
      for (let i = state.gunnerAirstrikes.length - 1; i >= 0; i--) {
        const s = state.gunnerAirstrikes[i];
        s.timer--;
        if (s.timer <= 0) {
          ghosts.forEach((g) => {
            if (g.x > 0 && dist(s.x, s.y, g.x, g.y) < 200) {
              g.hp -= 5;
              g.isStunned = 120;
              pushGunnerBurst(state, "hit", g.x, g.y, 64, 18);
            }
          });
          if (boss && dist(s.x, s.y, boss.x, boss.y) < 200) boss.hp -= 30;
          bullets.forEach((b) => {
            if (!b.isPlayer && dist(s.x, s.y, b.x, b.y) < 200) b.life = 0;
          });
          if (!state.explosions) state.explosions = [];
          state.explosions.push({ x: s.x, y: s.y, radius: 200, life: 15, color: "rgba(255,77,46,1)" });
          pushGunnerBurst(state, "r", s.x, s.y, 260, 48);
          for (let n = 0; n < 28; n++) {
            const a = (n / 28) * Math.PI * 2;
            pushGunnerSpark(state, s.x, s.y, a, 2.4 + Math.random() * 4.2, 26, 3, n % 3 === 0 ? GUNNER_COLORS.warning : GUNNER_COLORS.amber);
          }
          state.gunnerAirstrikes.splice(i, 1);
        }
      }
    }

    updateGunnerVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const fc = state.frameCount || 0;

    if (buffs.q > 0 && state.gunnerLaser) {
      const beam = state.gunnerLaser;
      const alpha = Math.max(0, buffs.q / 15);
      const endX = beam.x + Math.cos(beam.angle) * 2000;
      const endY = beam.y + Math.sin(beam.angle) * 2000;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(255, 191, 77, ${alpha * 0.36})`;
      ctx.lineWidth = 24;
      ctx.shadowBlur = 24;
      ctx.shadowColor = GUNNER_COLORS.amber;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(255, 77, 46, ${alpha * 0.48})`;
      ctx.lineWidth = 10 + Math.sin(fc * 0.6) * 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(245, 247, 255, ${alpha * 0.95})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const d = 100 + i * 220 + Math.sin(fc * 0.24 + i) * 18;
        const x = beam.x + Math.cos(beam.angle) * d;
        const y = beam.y + Math.sin(beam.angle) * d;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(beam.angle + Math.PI / 2 + fc * 0.04);
        drawCrosshair(ctx, 15 + i * 1.5, fc, alpha * 0.7, `rgba(255, 191, 77, ${alpha})`);
        ctx.restore();
      }
      ctx.restore();
    }

    if (state.gunnerMines) {
      state.gunnerMines.forEach((m) => drawMine(ctx, m, fc));
    }

    if (state.gunnerAirstrikes) {
      state.gunnerAirstrikes.forEach((s) => {
        const maxTimer = s.maxTimer || 1 * FPS;
        const progress = 1 - s.timer / maxTimer;
        const radius = 200;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.globalCompositeOperation = "lighter";

        const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        field.addColorStop(0, "rgba(255, 77, 46, 0.08)");
        field.addColorStop(0.65, "rgba(255, 191, 77, 0.08)");
        field.addColorStop(1, "rgba(17, 24, 32, 0)");
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = field;
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 77, 46, 0.72)";
        ctx.lineWidth = 3;
        ctx.setLineDash([18, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.save();
        ctx.rotate(s.seed + fc * 0.04);
        ctx.strokeStyle = "rgba(245, 247, 255, 0.64)";
        ctx.lineWidth = 2;
        drawCrosshair(ctx, radius * (0.2 + progress * 0.8), fc, 1, "rgba(245, 247, 255, 0.64)");
        ctx.restore();

        ctx.beginPath();
        ctx.arc(0, 0, radius * progress, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 77, 46, 0.12)";
        ctx.fill();

        for (let i = 0; i < 4; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * radius * 0.3, Math.sin(a) * radius * 0.3);
          ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
          ctx.strokeStyle = "rgba(255, 191, 77, 0.42)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.restore();
      });
    }

    state.gunnerBursts?.forEach((burst) => drawGunnerBurst(ctx, burst, fc));
    state.gunnerSparks?.forEach((spark) => drawGunnerSpark(ctx, spark));
  },
};
