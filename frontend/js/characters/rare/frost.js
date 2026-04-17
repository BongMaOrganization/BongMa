import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { updateHealthUI } from "../../ui.js";

const FROST_COLORS = {
  deep: "#071822",
  mid: "#0d3b4a",
  ice: "#8feaff",
  pale: "#dffbff",
  white: "#ffffff",
  rune: "#63d6ff",
};

function ensureFrostList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushFrostBurst(state, type, x, y, radius, life) {
  ensureFrostList(state, "frostBursts").push({
    type,
    x,
    y,
    radius,
    life,
    maxLife: life,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushFrostShard(state, x, y, angle, speed, radius, life, color = FROST_COLORS.ice) {
  ensureFrostList(state, "frostShards").push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    spin: (Math.random() - 0.5) * 0.16,
    radius,
    life,
    maxLife: life,
    color,
  });
}

function pushFrostMark(state, x, y, radius, life) {
  ensureFrostList(state, "frostMarks").push({
    x,
    y,
    radius,
    life,
    maxLife: life,
    angle: Math.random() * Math.PI * 2,
  });
}

function updateFrostEffects(state) {
  if (state.frostBursts) {
    for (let i = state.frostBursts.length - 1; i >= 0; i--) {
      state.frostBursts[i].life--;
      if (state.frostBursts[i].life <= 0) state.frostBursts.splice(i, 1);
    }
  }

  if (state.frostMarks) {
    for (let i = state.frostMarks.length - 1; i >= 0; i--) {
      state.frostMarks[i].life--;
      if (state.frostMarks[i].life <= 0) state.frostMarks.splice(i, 1);
    }
  }

  if (state.frostShards) {
    for (let i = state.frostShards.length - 1; i >= 0; i--) {
      const s = state.frostShards[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy *= 0.96;
      s.angle += s.spin;
      s.life--;
      if (s.life <= 0) state.frostShards.splice(i, 1);
    }
  }
}

function drawSnowflake(ctx, radius) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const ix = Math.cos(a) * radius * 0.18;
    const iy = Math.sin(a) * radius * 0.18;
    const ox = Math.cos(a) * radius;
    const oy = Math.sin(a) * radius;
    ctx.moveTo(ix, iy);
    ctx.lineTo(ox, oy);

    const branchA = a + Math.PI * 0.82;
    const bx = Math.cos(a) * radius * 0.62;
    const by = Math.sin(a) * radius * 0.62;
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(branchA) * radius * 0.22, by + Math.sin(branchA) * radius * 0.22);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + Math.cos(a - Math.PI * 0.82) * radius * 0.22, by + Math.sin(a - Math.PI * 0.82) * radius * 0.22);
  }
  ctx.stroke();
}

function drawIceShard(ctx, radius) {
  ctx.beginPath();
  ctx.moveTo(radius * 0.94, 0);
  ctx.lineTo(-radius * 0.12, -radius * 0.42);
  ctx.lineTo(-radius * 0.72, 0);
  ctx.lineTo(-radius * 0.12, radius * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawFrostBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.94);

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.28})`);
  glow.addColorStop(0.4, `rgba(143, 234, 255, ${alpha * 0.24})`);
  glow.addColorStop(0.76, `rgba(99, 214, 255, ${alpha * 0.1})`);
  glow.addColorStop(1, "rgba(7, 24, 34, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
    ctx.save();
    ctx.rotate(burst.seed + frameCount * (0.025 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
    ctx.strokeStyle = ring === 0
      ? `rgba(223, 251, 255, ${alpha * 0.8})`
      : `rgba(99, 214, 255, ${alpha * 0.56})`;
    ctx.lineWidth = Math.max(1.4, 4.6 - ring);
    ctx.shadowBlur = 20;
    ctx.shadowColor = ring === 0 ? FROST_COLORS.pale : FROST_COLORS.rune;
    drawSnowflake(ctx, radius * (0.42 + ring * 0.18));
    ctx.restore();
  }

  const shardCount = burst.type === "r" ? 16 : burst.type === "e" ? 12 : 10;
  for (let i = 0; i < shardCount; i++) {
    const a = burst.seed + (i / shardCount) * Math.PI * 2 + frameCount * 0.02;
    const inner = radius * 0.18;
    const outer = radius * (0.78 + Math.sin(frameCount * 0.1 + i) * 0.08);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.strokeStyle = i % 3 === 0
      ? `rgba(255, 255, 255, ${alpha * 0.7})`
      : `rgba(143, 234, 255, ${alpha * 0.5})`;
    ctx.lineWidth = burst.type === "r" ? 3 : 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = FROST_COLORS.ice;
    ctx.stroke();
  }

  if (burst.type === "q") {
    ctx.save();
    ctx.rotate(-frameCount * 0.05);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.82})`;
    ctx.fillStyle = `rgba(143, 234, 255, ${alpha * 0.24})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.22);
    ctx.lineTo(radius * 0.18, -radius * 0.04);
    ctx.lineTo(radius * 0.12, radius * 0.22);
    ctx.lineTo(-radius * 0.12, radius * 0.22);
    ctx.lineTo(-radius * 0.18, -radius * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawFrostShard(ctx, shard) {
  const alpha = Math.max(0, shard.life / shard.maxLife);
  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.angle);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = shard.color;
  ctx.strokeStyle = FROST_COLORS.white;
  ctx.lineWidth = 1.4;
  ctx.shadowBlur = 12;
  ctx.shadowColor = FROST_COLORS.ice;
  drawIceShard(ctx, shard.radius);
  ctx.restore();
}

function drawFrostMark(ctx, mark, frameCount) {
  const alpha = Math.max(0, mark.life / mark.maxLife);
  ctx.save();
  ctx.translate(mark.x, mark.y);
  ctx.rotate(mark.angle + frameCount * 0.035);
  ctx.strokeStyle = `rgba(223, 251, 255, ${alpha * 0.76})`;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 14;
  ctx.shadowColor = FROST_COLORS.ice;
  drawSnowflake(ctx, mark.radius + (1 - alpha) * 10);
  ctx.restore();
}

export function drawFrostPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.16) + 1) * 0.5;

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = R * (isR ? 3.2 : isQ ? 2.85 : isE ? 2.55 : 1.9);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(255, 255, 255, 0.45)" : "rgba(143, 234, 255, 0.22)");
  aura.addColorStop(0.48, isR ? "rgba(99, 214, 255, 0.24)" : "rgba(143, 234, 255, 0.16)");
  aura.addColorStop(1, "rgba(7, 24, 34, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  for (let i = 0; i < (isR ? 8 : active ? 6 : 4); i++) {
    const a = fc * 0.035 + i * (Math.PI * 2 / (isR ? 8 : active ? 6 : 4));
    const rr = R * (1.6 + (i % 2) * 0.3 + pulse * 0.08);
    ctx.save();
    ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
    ctx.rotate(a + fc * 0.05);
    ctx.strokeStyle = `rgba(223, 251, 255, ${active ? 0.72 : 0.42})`;
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 12;
    ctx.shadowColor = FROST_COLORS.ice;
    drawSnowflake(ctx, R * 0.24);
    ctx.restore();
  }

  const body = ctx.createRadialGradient(-R * 0.38, -R * 0.44, R * 0.08, 0, 0, R * 1.35);
  body.addColorStop(0, FROST_COLORS.white);
  body.addColorStop(0.26, FROST_COLORS.pale);
  body.addColorStop(0.55, FROST_COLORS.ice);
  body.addColorStop(1, FROST_COLORS.deep);
  ctx.shadowBlur = active ? 34 : 20;
  ctx.shadowColor = active ? FROST_COLORS.pale : FROST_COLORS.ice;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -R * 1.08);
  ctx.lineTo(R * 0.82, -R * 0.2);
  ctx.lineTo(R * 0.46, R * 0.95);
  ctx.lineTo(0, R * 0.72);
  ctx.lineTo(-R * 0.46, R * 0.95);
  ctx.lineTo(-R * 0.82, -R * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(7, 24, 34, 0.74)";
  ctx.beginPath();
  ctx.arc(0, -R * 0.12, R * 0.42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = FROST_COLORS.white;
  ctx.shadowBlur = 12;
  ctx.shadowColor = FROST_COLORS.pale;
  ctx.beginPath();
  ctx.arc(-R * 0.16, -R * 0.17, R * 0.055, 0, Math.PI * 2);
  ctx.arc(R * 0.16, -R * 0.17, R * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.translate(0, -R * 0.82);
  ctx.strokeStyle = FROST_COLORS.white;
  ctx.fillStyle = "rgba(143, 234, 255, 0.64)";
  ctx.lineWidth = 1.6;
  for (let i = -1; i <= 1; i++) {
    const h = i === 0 ? R * 0.58 : R * 0.36;
    ctx.beginPath();
    ctx.moveTo(i * R * 0.22, 0);
    ctx.lineTo(i * R * 0.32, -h);
    ctx.lineTo(i * R * 0.08, -R * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  if (isQ || isInvulnSkill) {
    ctx.save();
    ctx.globalAlpha = isQ ? 0.82 : 0.46;
    ctx.strokeStyle = FROST_COLORS.white;
    ctx.fillStyle = "rgba(143, 234, 255, 0.28)";
    ctx.lineWidth = 2.4;
    ctx.shadowBlur = 22;
    ctx.shadowColor = FROST_COLORS.pale;
    ctx.beginPath();
    ctx.moveTo(0, -R * 1.55);
    ctx.lineTo(R * 1.16, -R * 0.42);
    ctx.lineTo(R * 0.78, R * 1.22);
    ctx.lineTo(-R * 0.78, R * 1.22);
    ctx.lineTo(-R * 1.16, -R * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if (player.shield > 0 || isE) {
    ctx.save();
    ctx.rotate(fc * 0.035);
    ctx.strokeStyle = "rgba(223, 251, 255, 0.8)";
    ctx.lineWidth = 2.2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = FROST_COLORS.ice;
    drawSnowflake(ctx, R * (1.42 + pulse * 0.1));
    ctx.restore();
  }

  ctx.restore();
}

export const frost = {
  id: "frost",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player } = state;

    if (key === "q") {
      state.activeBuffs.q = 2 * FPS;
      pushFrostBurst(state, "q", player.x, player.y, 150, 42);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        pushFrostShard(state, player.x, player.y, a, 2.4 + Math.random() * 1.2, 8, 34);
      }
    }

    if (key === "e") {
      state.player.shield = 1;
      updateHealthUI();
      state.activeBuffs.e = 10 * FPS;
      pushFrostBurst(state, "e", player.x, player.y, 105, 34);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        pushFrostShard(state, player.x + Math.cos(a) * 22, player.y + Math.sin(a) * 22, a, 0.7, 6, 28);
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 5 * FPS;
      pushFrostBurst(state, "r", player.x, player.y, 230, 54);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        pushFrostShard(state, player.x, player.y, a, 1.7 + Math.random() * 1.6, 7, 52);
      }
    }

    return true;
  },

  update: (state, ctx, canvas, buffs) => {
    const { player, ghosts, boss, frameCount } = state;
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      state.playerSpeedMultiplier = 0;
      state.playerCanShootModifier = false;
      if (fc % 8 === 0) {
        ghosts.forEach((g) => {
          if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 135) {
            g.isStunned = Math.max(g.isStunned || 0, 45);
            g.hp = (g.hp || 1) - 0.35;
            pushFrostMark(state, g.x, g.y, g.radius || 16, 28);
          }
        });
        if (boss && dist(player.x, player.y, boss.x, boss.y) < 135 + boss.radius) {
          boss.hp -= 0.4;
          pushFrostMark(state, boss.x, boss.y, Math.min(boss.radius || 48, 58), 28);
        }
      }
    }

    if (buffs.e > 0 && fc % 14 === 0) {
      const a = Math.random() * Math.PI * 2;
      pushFrostShard(
        state,
        player.x + Math.cos(a) * 22,
        player.y + Math.sin(a) * 22,
        a + Math.PI / 2,
        0.45,
        5,
        22,
        FROST_COLORS.pale,
      );
    }

    if (buffs.r > 0) {
      state.frostR_Active = true;
      if (fc % 10 === 0) {
        ghosts.forEach((g) => {
          if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 200) {
            g.hp = (g.hp || 1) - 10;
            g.isStunned = Math.max(g.isStunned || 0, 14);
            pushFrostMark(state, g.x, g.y, g.radius || 18, 34);
          }
        });
        if (boss && dist(player.x, player.y, boss.x, boss.y) < 200 + boss.radius) {
          boss.hp -= 2;
          pushFrostMark(state, boss.x, boss.y, Math.min(boss.radius || 54, 70), 34);
        }
      }
      if (fc % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 50 + Math.random() * 155;
        pushFrostShard(
          state,
          player.x + Math.cos(a) * r,
          player.y + Math.sin(a) * r,
          a + Math.PI + (Math.random() - 0.5) * 0.8,
          0.8 + Math.random() * 1.2,
          4 + Math.random() * 4,
          30,
        );
      }
    }

    updateFrostEffects(state);
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    if (buffs.q > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const progress = buffs.q / (2 * FPS);
      const radius = player.radius + 44 + Math.sin(fc * 0.12) * 2;
      const tomb = ctx.createRadialGradient(0, 0, player.radius, 0, 0, radius);
      tomb.addColorStop(0, "rgba(255, 255, 255, 0.2)");
      tomb.addColorStop(0.5, "rgba(143, 234, 255, 0.28)");
      tomb.addColorStop(1, "rgba(7, 24, 34, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = tomb;
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.58 + progress * 0.28})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 22;
      ctx.shadowColor = FROST_COLORS.pale;
      drawSnowflake(ctx, radius * 0.58);
      ctx.restore();
    }

    if (buffs.e > 0 || player.shield > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(fc * 0.025);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(223, 251, 255, 0.78)";
      ctx.fillStyle = "rgba(143, 234, 255, 0.08)";
      ctx.lineWidth = 2.4;
      ctx.shadowBlur = 18;
      ctx.shadowColor = FROST_COLORS.ice;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        const r = player.radius + 27 + (i % 2) * 4;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (buffs.r > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const radius = 200;
      const field = ctx.createRadialGradient(0, 0, 24, 0, 0, radius);
      field.addColorStop(0, "rgba(255, 255, 255, 0.12)");
      field.addColorStop(0.55, "rgba(143, 234, 255, 0.12)");
      field.addColorStop(1, "rgba(7, 24, 34, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();

      for (let ring = 0; ring < 3; ring++) {
        ctx.save();
        ctx.rotate(fc * (0.018 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0 ? "rgba(223, 251, 255, 0.72)" : "rgba(99, 214, 255, 0.38)";
        ctx.lineWidth = 2.2 - ring * 0.3;
        ctx.setLineDash(ring === 0 ? [18, 12] : [7, 9]);
        ctx.beginPath();
        ctx.arc(0, 0, radius - ring * 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      for (let i = 0; i < 12; i++) {
        const a = fc * 0.035 + i * (Math.PI * 2 / 12);
        const r = 70 + (i % 4) * 34;
        ctx.save();
        ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
        ctx.rotate(-a + fc * 0.08);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
        ctx.lineWidth = 1.4;
        drawSnowflake(ctx, 9 + (i % 3) * 2);
        ctx.restore();
      }

      ctx.restore();
    }

    state.frostBursts?.forEach((burst) => drawFrostBurst(ctx, burst, fc));
    state.frostMarks?.forEach((mark) => drawFrostMark(ctx, mark, fc));
    state.frostShards?.forEach((shard) => drawFrostShard(ctx, shard));
  },
};
