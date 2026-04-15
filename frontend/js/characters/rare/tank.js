import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { updateHealthUI } from "../../ui.js";

function pushTankBurst(state, type, x, y, radius, life) {
  if (!state.tankBursts) state.tankBursts = [];
  state.tankBursts.push({
    x,
    y,
    type,
    radius,
    life,
    maxLife: life,
  });
}

function pushTankShard(state, x, y, radius, life, angle, color) {
  if (!state.tankShards) state.tankShards = [];
  state.tankShards.push({
    x,
    y,
    vx: Math.cos(angle) * (0.8 + Math.random() * 1.6),
    vy: Math.sin(angle) * (0.8 + Math.random() * 1.6),
    radius,
    life,
    maxLife: life,
    angle,
    spin: (Math.random() - 0.5) * 0.14,
    color,
  });
}

function drawHex(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawTankBurst(ctx, burst, frameCount) {
  const progress = 1 - burst.life / burst.maxLife;
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const radius = burst.radius * (0.22 + progress * 0.95);
  const cyan = "#00ffcc";
  const ice = "#bdf6ff";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.34})`);
  glow.addColorStop(
    0.42,
    burst.type === "r"
      ? `rgba(0, 255, 204, ${alpha * 0.28})`
      : `rgba(120, 220, 255, ${alpha * 0.22})`,
  );
  glow.addColorStop(1, "rgba(0, 30, 45, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
    const rr = radius * (0.55 + ring * 0.2);
    ctx.save();
    ctx.rotate(
      frameCount * (0.03 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1),
    );
    ctx.strokeStyle =
      ring === 0
        ? `rgba(235, 255, 255, ${alpha * 0.82})`
        : `rgba(0, 255, 204, ${alpha * 0.6})`;
    ctx.lineWidth = Math.max(1.4, 4.8 - ring);
    ctx.shadowBlur = 22;
    ctx.shadowColor = cyan;
    drawHex(ctx, rr);
    ctx.stroke();
    ctx.restore();
  }

  const spokes = burst.type === "r" ? 14 : burst.type === "e" ? 10 : 8;
  ctx.lineCap = "round";
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + frameCount * 0.04;
    const inner = radius * 0.2;
    const outer = radius * (0.78 + Math.sin(frameCount * 0.1 + i) * 0.1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.strokeStyle =
      i % 3 === 0
        ? `rgba(255, 255, 255, ${alpha * 0.72})`
        : `rgba(0, 255, 204, ${alpha * 0.56})`;
    ctx.lineWidth = burst.type === "r" ? 3 : 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = ice;
    ctx.stroke();
  }

  if (burst.type === "q") {
    ctx.save();
    ctx.rotate(frameCount * 0.12);
    ctx.strokeStyle = `rgba(0, 255, 204, ${alpha * 0.75})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = cyan;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.12, 0);
    ctx.lineTo(radius * 0.12, 0);
    ctx.moveTo(0, -radius * 0.12);
    ctx.lineTo(0, radius * 0.12);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export function drawTankPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const R = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0;
  const isR = (buffs.r || 0) > 0;
  const charged = isQ || isE || isR || isInvulnSkill;
  const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;

  if (player.gracePeriod > 0 && !charged && Math.floor(fc / 6) % 2 !== 0) {
    return;
  }

  const steel0 = "#0b2430";
  const steel1 = "#0f3a4a";
  const steel2 = "#1a5c73";
  const cyan = "#00ffcc";
  const ice = "#bdf6ff";

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraR = R * (isR ? 3.2 : isE ? 2.6 : isQ ? 2.4 : 1.9);
  const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
  aura.addColorStop(0, charged ? "rgba(255, 255, 255, 0.46)" : "rgba(0, 255, 204, 0.2)");
  aura.addColorStop(0.45, isR ? "rgba(0, 255, 204, 0.26)" : "rgba(120, 220, 255, 0.18)");
  aura.addColorStop(1, "rgba(0, 30, 45, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  for (let ring = 0; ring < (isR ? 3 : charged ? 2 : 1); ring++) {
    ctx.save();
    ctx.rotate(fc * (0.03 + ring * 0.014) * (ring % 2 === 0 ? 1 : -1));
    ctx.strokeStyle =
      ring === 0
        ? `rgba(0, 255, 204, ${charged ? 0.82 : 0.46})`
        : `rgba(189, 246, 255, ${isR ? 0.58 : 0.32})`;
    ctx.lineWidth = ring === 0 ? 2.6 : 1.6;
    ctx.shadowBlur = charged ? 18 : 10;
    ctx.shadowColor = ring === 0 ? cyan : ice;
    drawHex(ctx, R * (1.55 + ring * 0.42 + pulse * 0.08));
    ctx.stroke();
    ctx.restore();
  }

  const hull = ctx.createRadialGradient(-R * 0.38, -R * 0.42, R * 0.06, 0, 0, R * 1.35);
  hull.addColorStop(0, "#eaffff");
  hull.addColorStop(0.32, steel2);
  hull.addColorStop(0.7, steel1);
  hull.addColorStop(1, steel0);

  ctx.shadowBlur = charged ? 38 : 22;
  ctx.shadowColor = charged ? ice : cyan;
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.roundRect(-R * 0.92, -R * 0.78, R * 1.84, R * 1.56, R * 0.22);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = charged ? "#eaffff" : "rgba(0, 255, 204, 0.8)";
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-R * 1.02, -R * 0.38, R * 2.04, R * 0.76, R * 0.18);
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fill();

  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    ctx.roundRect(i * R * 0.96 - R * 0.16, -R * 0.62, R * 0.32, R * 1.24, R * 0.12);
    ctx.fillStyle = "rgba(5, 15, 18, 0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(189, 246, 255, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(0, -R * 0.06);
  ctx.rotate(Math.sin(fc * 0.06) * 0.06);
  ctx.beginPath();
  ctx.roundRect(-R * 0.52, -R * 0.46, R * 1.04, R * 0.92, R * 0.18);
  ctx.fillStyle = "rgba(6, 22, 26, 0.9)";
  ctx.shadowBlur = 18;
  ctx.shadowColor = cyan;
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 255, 204, 0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(R * 0.1, -R * 0.18, R * 0.72, R * 0.36, R * 0.12);
  ctx.fillStyle = "rgba(0, 255, 204, 0.22)";
  ctx.fill();

  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#f7ffff";
  ctx.shadowBlur = 12;
  ctx.shadowColor = ice;
  ctx.beginPath();
  ctx.arc(-R * 0.18, -R * 0.12, R * 0.075, 0, Math.PI * 2);
  ctx.arc(R * 0.18, -R * 0.12, R * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const shield = Math.max(0, Math.min(5, player.shield || 0));
  if (shield > 0) {
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < shield; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2 + fc * 0.01;
      const rr = R * (2.25 + pulse * 0.08);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, R * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? "rgba(189, 246, 255, 0.75)" : "rgba(0, 255, 204, 0.7)";
      ctx.shadowBlur = 14;
      ctx.shadowColor = i % 2 === 0 ? ice : cyan;
      ctx.fill();
    }
  }

  if (isE) {
    ctx.beginPath();
    ctx.arc(0, 0, R * (2.0 + pulse * 0.2), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ffffff";
    ctx.stroke();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(-fc * 0.05);
    ctx.strokeStyle = "rgba(0, 255, 204, 0.55)";
    ctx.lineWidth = 2.2;
    ctx.setLineDash([10, 8]);
    drawHex(ctx, R * 2.95);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#00aaff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const s = state.playerStatus || {};
  if (s.slowTimer > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, R + 12, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (s.stunTimer > 0) {
    ctx.fillStyle = "#ffff00";
    for (let i = 0; i < 3; i++) {
      const a = fc * 0.2 + i * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export const tank = {
  id: "tank",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player } = state;

    if (key === "q") {
      player.shield = Math.min((player.maxShield || 0) + 1, 5);
      updateHealthUI();
      state.activeBuffs.q = 18;
      pushTankBurst(state, "q", player.x, player.y, 120, 28);
      state.screenShake = { timer: 6, intensity: 1.4 };
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        pushTankShard(
          state,
          player.x,
          player.y,
          3 + Math.random() * 4,
          22,
          a,
          i % 3 === 0 ? "#bdf6ff" : "#00ffcc",
        );
      }
    }

    if (key === "e") {
      state.activeBuffs.e = 3 * FPS;
      pushTankBurst(state, "e", player.x, player.y, 105, 30);
      state.screenShake = { timer: 8, intensity: 2.2 };
    }

    if (key === "r") {
      state.bullets.forEach((b) => {
        if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 250) {
          b.life = 0;
        }
      });
      state.activeBuffs.r = 20;
      pushTankBurst(state, "r", player.x, player.y, 250, 34);
      state.screenShake = { timer: 10, intensity: 3.2 };
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        pushTankShard(
          state,
          player.x,
          player.y,
          4 + Math.random() * 5,
          26,
          a,
          i % 2 === 0 ? "#00ffcc" : "#bdf6ff",
        );
      }
    }
    return true;
  },

  update: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    if (!player) return;

    if (state.activeBuffs.e > 0 && frameCount % 3 === 0) {
      const a = Math.random() * Math.PI * 2;
      pushTankShard(
        state,
        player.x + (Math.random() - 0.5) * player.radius * 1.2,
        player.y + (Math.random() - 0.5) * player.radius * 1.2,
        3 + Math.random() * 3,
        18,
        a,
        "#ffffff",
      );
    }

    if (state.tankShards) {
      state.tankShards.forEach((s) => {
        s.life--;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.angle += s.spin;
      });
      state.tankShards = state.tankShards.filter((s) => s.life > 0);
    }

    if (state.tankBursts) {
      state.tankBursts.forEach((b) => b.life--);
      state.tankBursts = state.tankBursts.filter((b) => b.life > 0);
    }
  },

  draw: (state, ctx, canvas, buffs) => {
    const { player, frameCount } = state;
    if (!player) return;

    state.tankShards?.forEach((s) => {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = "rgba(235, 255, 255, 0.75)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 14;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.moveTo(s.radius, 0);
      ctx.lineTo(-s.radius * 0.35, s.radius * 0.75);
      ctx.lineTo(-s.radius * 0.7, -s.radius * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    state.tankBursts?.forEach((burst) => {
      drawTankBurst(ctx, burst, frameCount || 0);
    });

    if (buffs.r > 0) {
      const radius = (20 - buffs.r) * 15;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 204, ${buffs.r / 20})`;
      ctx.lineWidth = 10;
      ctx.shadowBlur = 26;
      ctx.shadowColor = "#00ffcc";
      ctx.stroke();
      ctx.restore();
    }

    if (buffs.e > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#ffffff";
      ctx.stroke();
      ctx.restore();
    }

    if (buffs.q > 0) {
      const alpha = Math.max(0, (buffs.q || 0) / 18);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 18 + (18 - buffs.q) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(189, 246, 255, ${alpha * 0.85})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#bdf6ff";
      ctx.stroke();
      ctx.restore();
    }
  },
};

