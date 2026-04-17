import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

const SUMMONER_COLORS = {
  void: "#070809",
  black: "#101114",
  cloak: "#1c1e22",
  smoke: "#5f6670",
  ash: "#8b929c",
  silver: "#d8dde3",
  bone: "#f2eee7",
  white: "#ffffff",
};

function ensureSummonerList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushSummonerBurst(state, type, x, y, radius, life, angle = 0) {
  ensureSummonerList(state, "summonerBursts").push({
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

function pushSummonerWisp(state, x, y, angle, speed, life, size, color = SUMMONER_COLORS.silver) {
  ensureSummonerList(state, "summonerWisps").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.09,
    life,
    maxLife: life,
    size,
    color,
  });
}

function updateSummonerVfx(state) {
  if (state.summonerBursts) {
    for (let i = state.summonerBursts.length - 1; i >= 0; i--) {
      state.summonerBursts[i].life--;
      if (state.summonerBursts[i].life <= 0) state.summonerBursts.splice(i, 1);
    }
  }

  if (state.summonerWisps) {
    for (let i = state.summonerWisps.length - 1; i >= 0; i--) {
      const w = state.summonerWisps[i];
      w.x += w.vx;
      w.y += w.vy;
      w.vx *= 0.96;
      w.vy *= 0.96;
      w.angle += w.spin;
      w.life--;
      if (w.life <= 0) state.summonerWisps.splice(i, 1);
    }
  }
}

function drawSkull(ctx, radius, glow = false) {
  ctx.save();
  ctx.shadowBlur = glow ? 16 : 6;
  ctx.shadowColor = SUMMONER_COLORS.white;
  ctx.fillStyle = SUMMONER_COLORS.bone;
  ctx.strokeStyle = SUMMONER_COLORS.ash;
  ctx.lineWidth = Math.max(1, radius * 0.08);

  ctx.beginPath();
  ctx.arc(0, -radius * 0.12, radius * 0.58, Math.PI * 0.08, Math.PI * 1.92);
  ctx.quadraticCurveTo(radius * 0.45, radius * 0.56, radius * 0.16, radius * 0.78);
  ctx.lineTo(-radius * 0.16, radius * 0.78);
  ctx.quadraticCurveTo(-radius * 0.45, radius * 0.56, -radius * 0.58, -radius * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SUMMONER_COLORS.void;
  ctx.beginPath();
  ctx.ellipse(-radius * 0.22, -radius * 0.08, radius * 0.14, radius * 0.22, -0.2, 0, Math.PI * 2);
  ctx.ellipse(radius * 0.22, -radius * 0.08, radius * 0.14, radius * 0.22, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, radius * 0.04);
  ctx.lineTo(-radius * 0.08, radius * 0.24);
  ctx.lineTo(radius * 0.08, radius * 0.24);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = SUMMONER_COLORS.void;
  ctx.lineWidth = Math.max(1, radius * 0.05);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * radius * 0.1, radius * 0.48);
    ctx.lineTo(i * radius * 0.1, radius * 0.68);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRitualRing(ctx, radius, frameCount, alpha = 1, teeth = 10) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(frameCount * 0.025);
  ctx.strokeStyle = "rgba(216, 221, 227, 0.76)";
  ctx.lineWidth = 1.7;
  ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.05);
  ctx.strokeStyle = "rgba(139, 146, 156, 0.58)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(242, 238, 231, 0.78)";
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    ctx.save();
    ctx.translate(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBoneStaff(ctx, length, width, active = false) {
  ctx.lineCap = "round";
  ctx.strokeStyle = SUMMONER_COLORS.bone;
  ctx.lineWidth = width * 0.18;
  ctx.shadowBlur = active ? 18 : 8;
  ctx.shadowColor = active ? SUMMONER_COLORS.white : SUMMONER_COLORS.ash;
  ctx.beginPath();
  ctx.moveTo(-length * 0.42, 0);
  ctx.lineTo(length * 0.42, 0);
  ctx.stroke();

  ctx.save();
  ctx.translate(length * 0.46, 0);
  ctx.strokeStyle = active ? SUMMONER_COLORS.white : SUMMONER_COLORS.silver;
  ctx.lineWidth = width * 0.08;
  ctx.beginPath();
  ctx.arc(0, 0, width * 0.42, -Math.PI * 0.7, Math.PI * 0.7);
  ctx.stroke();
  drawSkull(ctx, width * 0.36, active);
  ctx.restore();
}

function drawSummonerBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.95);
  const isR = burst.type === "r";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.26})`);
  glow.addColorStop(0.44, isR ? `rgba(216, 221, 227, ${alpha * 0.22})` : `rgba(139, 146, 156, ${alpha * 0.2})`);
  glow.addColorStop(1, "rgba(7, 8, 9, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(burst.seed + frameCount * (isR ? 0.055 : 0.035));
  ctx.shadowBlur = isR ? 22 : 14;
  ctx.shadowColor = SUMMONER_COLORS.white;
  drawRitualRing(ctx, radius * 0.48, frameCount, alpha * 0.85, isR ? 14 : 10);
  ctx.restore();

  ctx.save();
  ctx.rotate(burst.angle || 0);
  ctx.globalAlpha = alpha;
  drawSkull(ctx, Math.max(12, radius * 0.11), true);
  ctx.restore();

  ctx.restore();
}

function drawSummonerWisp(ctx, wisp) {
  const alpha = Math.max(0, wisp.life / wisp.maxLife);

  ctx.save();
  ctx.translate(wisp.x, wisp.y);
  ctx.rotate(wisp.angle);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = wisp.color;
  ctx.shadowBlur = 14;
  ctx.shadowColor = SUMMONER_COLORS.white;

  ctx.beginPath();
  ctx.ellipse(0, 0, wisp.size * 2.1, wisp.size * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(216, 221, 227, 0.58)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-wisp.size * 0.5, 0);
  ctx.quadraticCurveTo(-wisp.size * 2.8, wisp.size * 1.4, -wisp.size * 4.2, 0);
  ctx.stroke();
  ctx.restore();
}

function findSummonerTarget(portal, ghosts, boss) {
  let nearest = null;
  let minDist = 400;

  ghosts.forEach((g) => {
    if (g.hp > 0) {
      const d = dist(portal.x, portal.y, g.x, g.y);
      if (d < minDist) {
        minDist = d;
        nearest = g;
      }
    }
  });

  if (boss && dist(portal.x, portal.y, boss.x, boss.y) < 400) nearest = boss;
  return nearest;
}

export function drawSummonerPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0 || (state.summonerPortals?.length || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.16) + 1) * 0.5;
  const aim = Math.atan2((state.mouse?.y ?? player.y) - player.y, (state.mouse?.x ?? player.x + 100) - player.x);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 3.05 : isE ? 2.45 : isQ ? 2.25 : 1.72);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 255, 255, 0.24)" : "rgba(216, 221, 227, 0.08)");
  aura.addColorStop(0.5, isR ? "rgba(216, 221, 227, 0.18)" : "rgba(95, 102, 112, 0.14)");
  aura.addColorStop(1, "rgba(7, 8, 9, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (active) {
    ctx.save();
    ctx.rotate(fc * (isR ? 0.045 : 0.024));
    ctx.shadowBlur = isR ? 22 : 13;
    ctx.shadowColor = SUMMONER_COLORS.white;
    drawRitualRing(ctx, R * (1.52 + pulse * 0.1), fc, isR ? 0.9 : 0.65, isR ? 12 : 8);
    ctx.restore();
  }

  for (let i = 0; i < 2; i++) {
    const a = fc * 0.045 + i * Math.PI;
    const ox = Math.cos(a) * R * 1.55;
    const oy = Math.sin(a) * R * 0.95;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.globalAlpha = isQ || isR ? 0.95 : 0.55;
    const soul = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.42);
    soul.addColorStop(0, "rgba(255, 255, 255, 0.88)");
    soul.addColorStop(0.48, "rgba(216, 221, 227, 0.46)");
    soul.addColorStop(1, "rgba(7, 8, 9, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = soul;
    ctx.shadowBlur = 12;
    ctx.shadowColor = SUMMONER_COLORS.white;
    ctx.fill();
    ctx.restore();
  }

  const robe = ctx.createRadialGradient(-R * 0.3, -R * 0.45, R * 0.08, 0, 0, R * 1.35);
  robe.addColorStop(0, SUMMONER_COLORS.silver);
  robe.addColorStop(0.24, SUMMONER_COLORS.smoke);
  robe.addColorStop(0.56, SUMMONER_COLORS.cloak);
  robe.addColorStop(1, SUMMONER_COLORS.void);
  ctx.shadowBlur = active ? 24 : 12;
  ctx.shadowColor = active ? SUMMONER_COLORS.white : SUMMONER_COLORS.ash;
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(0, -R * 1.1);
  ctx.quadraticCurveTo(R * 0.92, -R * 0.62, R * 0.68, R * 0.94);
  ctx.lineTo(R * 0.22, R * 1.14);
  ctx.lineTo(0, R * 0.86);
  ctx.lineTo(-R * 0.22, R * 1.14);
  ctx.lineTo(-R * 0.68, R * 0.94);
  ctx.quadraticCurveTo(-R * 0.92, -R * 0.62, 0, -R * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(242, 238, 231, 0.78)" : "rgba(139, 146, 156, 0.62)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = SUMMONER_COLORS.black;
  ctx.beginPath();
  ctx.arc(0, -R * 0.22, R * 0.54, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -R * 0.2);
  drawSkull(ctx, R * 0.48, active);
  ctx.restore();

  ctx.strokeStyle = "rgba(216, 221, 227, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-R * 0.44, R * 0.36);
  ctx.quadraticCurveTo(0, R * 0.58, R * 0.44, R * 0.36);
  ctx.stroke();

  ctx.save();
  ctx.rotate(aim);
  ctx.translate(R * 0.34, R * 0.24);
  drawBoneStaff(ctx, R * 2.5, R * 0.62, active);
  ctx.restore();

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.24, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(242, 238, 231, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const summoner = {
  id: "summoner",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const mx = mouse?.x ?? player.x;
    const my = mouse?.y ?? player.y;
    const aim = Math.atan2(my - player.y, mx - player.x);

    if (key === "q") {
      if (!state.summonerPortals) state.summonerPortals = [];
      state.summonerPortals.push({
        x: mx,
        y: my,
        life: 8 * FPS,
        maxLife: 8 * FPS,
        fireCD: 0,
        angle: Math.random() * Math.PI * 2,
      });
      state.activeBuffs.q = 15;
      pushSummonerBurst(state, "q", mx, my, 120, 34, aim);
      for (let i = 0; i < 10; i++) {
        pushSummonerWisp(state, mx, my, Math.random() * Math.PI * 2, 0.9 + Math.random() * 1.8, 26, 2.2, i % 2 === 0 ? SUMMONER_COLORS.white : SUMMONER_COLORS.ash);
      }
    }

    if (key === "e") {
      state.activeBuffs.e = 6 * FPS;
      pushSummonerBurst(state, "e", player.x, player.y, 135, 34, aim);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        pushSummonerWisp(state, player.x, player.y, a, 1.2 + Math.random() * 1.5, 24, 2, i % 3 === 0 ? SUMMONER_COLORS.white : SUMMONER_COLORS.smoke);
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 6 * FPS;
      state.screenShake = { timer: 16, intensity: 3 };
      pushSummonerBurst(state, "r", player.x, player.y, 180, 46, aim);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        pushSummonerWisp(state, player.x, player.y, a, 1 + Math.random() * 2.2, 34, 2.4, i % 2 === 0 ? SUMMONER_COLORS.silver : SUMMONER_COLORS.white);
      }
    }
    return true;
  },

  update: (state) => {
    const { player, ghosts, boss, frameCount } = state;
    const buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
    const fc = frameCount || 0;

    if (state.summonerPortals) {
      state.summonerPortals.forEach((p) => {
        if (!p.maxLife) p.maxLife = 8 * FPS;
        p.life--;
        p.fireCD--;
        p.angle += 0.035;

        if (p.fireCD <= 0) {
          const nearest = findSummonerTarget(p, ghosts, boss);
          if (nearest) {
            const prevLen = state.bullets.length;
            spawnBullet(p.x, p.y, nearest.x, nearest.y, true, 0, "player", 1.15);
            for (let i = prevLen; i < state.bullets.length; i++) {
              state.bullets[i].visualStyle = "summoner_soul";
              state.bullets[i].summonerPortal = true;
              state.bullets[i].radius = Math.max(state.bullets[i].radius || 4, 5);
            }
            p.fireCD = 20;
          }
        }

        if (fc % 8 === 0) {
          pushSummonerWisp(state, p.x, p.y, Math.random() * Math.PI * 2, 0.35, 18, 1.6, SUMMONER_COLORS.ash);
        }
      });
      state.summonerPortals = state.summonerPortals.filter((p) => p.life > 0);
    }

    if (buffs.e > 0) {
      state.playerMultiShotModifier = (state.playerMultiShotModifier || player.multiShot || 1) + 4;
    }

    if (buffs.r > 0 && fc % 3 === 0) {
      const angleOffset = fc * 0.15;
      const prevLen = state.bullets.length;
      for (let i = 0; i < 6; i++) {
        const angle = angleOffset + (i * Math.PI * 2) / 6;
        spawnBullet(
          player.x,
          player.y,
          player.x + Math.cos(angle) * 100,
          player.y + Math.sin(angle) * 100,
          true,
        );
      }
      for (let i = prevLen; i < state.bullets.length; i++) {
        state.bullets[i].visualStyle = "summoner_soul";
        state.bullets[i].summonerRitual = true;
        state.bullets[i].radius = Math.max(state.bullets[i].radius || 4, 5);
        state.bullets[i].life = Math.min(state.bullets[i].life || 240, 160);
      }
    }

    state.bullets.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "summoner" || b.summonerPrepared) return;

      b.summonerPrepared = true;
      b.visualStyle = "summoner_soul";

      if (buffs.e > 0) {
        b.summonerSacrifice = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.r > 0) {
        b.summonerRitual = true;
        b.pierce = true;
      }
    });

    updateSummonerVfx(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    state.summonerPortals?.forEach((p) => {
      const lifeRatio = p.maxLife ? Math.max(0, p.life / p.maxLife) : 1;
      const pulse = Math.sin(fc * 0.12 + p.x * 0.01) * 4;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = "lighter";

      const field = ctx.createRadialGradient(0, 0, 0, 0, 0, 48 + pulse);
      field.addColorStop(0, `rgba(255, 255, 255, ${0.18 * lifeRatio})`);
      field.addColorStop(0.45, `rgba(139, 146, 156, ${0.2 * lifeRatio})`);
      field.addColorStop(1, "rgba(7, 8, 9, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 48 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();

      ctx.rotate(p.angle || 0);
      ctx.shadowBlur = 18;
      ctx.shadowColor = SUMMONER_COLORS.white;
      drawRitualRing(ctx, 30 + pulse * 0.25, fc, 0.78 * lifeRatio, 8);
      ctx.restore();
    });

    if (buffs.e > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.rotate(-fc * 0.04);
      ctx.strokeStyle = "rgba(242, 238, 231, 0.68)";
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawRitualRing(ctx, player.radius + 22, fc, 0.46, 6);
      ctx.restore();
    }

    if (buffs.r > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const alpha = Math.min(0.65, buffs.r / (6 * FPS));
      const pulse = Math.sin(fc * 0.16) * 5;
      const field = ctx.createRadialGradient(0, 0, 10, 0, 0, 120 + pulse);
      field.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.12})`);
      field.addColorStop(0.55, `rgba(139, 146, 156, ${alpha * 0.14})`);
      field.addColorStop(1, "rgba(7, 8, 9, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 120 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      drawRitualRing(ctx, 84 + pulse * 0.3, fc, 0.75, 14);
      ctx.restore();
    }

    state.summonerBursts?.forEach((burst) => drawSummonerBurst(ctx, burst, fc));
    state.summonerWisps?.forEach((wisp) => drawSummonerWisp(ctx, wisp));
  },
};
