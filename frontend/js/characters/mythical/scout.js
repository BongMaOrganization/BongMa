import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

const SCOUT = {
  cyan: "#43f5ff",
  blue: "#1d8fff",
  violet: "#b526ff",
  magenta: "#ff22d8",
  white: "#f4ffff",
  dark: "#05121d",
};

function ensureScoutList(state, key) {
  if (!state[key]) state[key] = [];
  return state[key];
}

function pushScoutTrail(state, x, y, angle, life = 11, radius = 46, dash = false) {
  ensureScoutList(state, "scoutTrails").push({
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

function pushScoutEcho(state, x, y, radius, life, dx = 0, dy = 0) {
  ensureScoutList(state, "scoutEchoes").push({
    x,
    y,
    radius,
    life,
    maxLife: life,
    dx,
    dy,
    seed: Math.random() * Math.PI * 2,
  });
}

function pushScoutSpark(state, x, y, angle, speed, life, size, color = SCOUT.cyan) {
  ensureScoutList(state, "scoutSparks").push({
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

function pushScoutBurst(state, type, x, y, radius, life, angle = 0) {
  ensureScoutList(state, "scoutBursts").push({
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

function pulseAt(frameCount, seed = 0, speed = 0.18) {
  return (Math.sin(frameCount * speed + seed) + 1) * 0.5;
}

function strikeNearby(state, radius, damage, stun) {
  const { player, ghosts, elementalEnemies, boss } = state;

  ghosts?.forEach((g) => {
    if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < radius + (g.radius || 12)) {
      g.hp -= damage;
      g.shield = Math.max(0, (g.shield || 0) - damage * 1.5);
      g.isStunned = Math.max(g.isStunned || 0, stun);
      pushScoutEcho(state, g.x, g.y, Math.min(40, (g.radius || 14) * 2.2), 14);
    }
  });

  elementalEnemies?.forEach((e) => {
    if (dist(player.x, player.y, e.x, e.y) < radius + (e.radius || 14)) {
      e.hp -= Math.max(1, damage * 0.45);
      pushScoutEcho(state, e.x, e.y, Math.min(42, (e.radius || 14) * 2.2), 14);
    }
  });

  if (boss && dist(player.x, player.y, boss.x, boss.y) < radius + (boss.radius || 40)) {
    boss.hp -= damage * 0.32;
    pushScoutEcho(state, boss.x, boss.y, Math.min(70, (boss.radius || 42) * 1.2), 16);
  }
}

function updateScoutVfx(state) {
  const fc = state.frameCount || 0;

  if (state.scoutTrails) {
    for (let i = state.scoutTrails.length - 1; i >= 0; i--) {
      const t = state.scoutTrails[i];
      t.life--;
      if (t.life <= 0) state.scoutTrails.splice(i, 1);
    }
  }

  if (state.scoutEchoes) {
    for (let i = state.scoutEchoes.length - 1; i >= 0; i--) {
      const e = state.scoutEchoes[i];
      e.x -= e.dx * 0.55;
      e.y -= e.dy * 0.55;
      e.life--;
      if (e.life <= 0) state.scoutEchoes.splice(i, 1);
    }
  }

  if (state.scoutSparks) {
    for (let i = state.scoutSparks.length - 1; i >= 0; i--) {
      const p = state.scoutSparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.angle += p.spin;
      p.life--;
      if (p.life <= 0) state.scoutSparks.splice(i, 1);
    }
  }

  if (state.scoutBursts) {
    for (let i = state.scoutBursts.length - 1; i >= 0; i--) {
      const b = state.scoutBursts[i];
      b.life--;
      if (b.life <= 0) state.scoutBursts.splice(i, 1);
    }
  }

  if (state.scoutGrappleFx) {
    state.scoutGrappleFx.life--;
    if (state.scoutGrappleFx.life <= 0) state.scoutGrappleFx = null;
  }

  if (fc % 120 === 0 && state.player?.characterId === "scout") {
    state.scoutLastPos = { x: state.player.x, y: state.player.y };
  }
}

function drawScoutSigil(ctx, radius, frameCount, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  ctx.rotate(frameCount * 0.025);
  ctx.strokeStyle = "rgba(67, 245, 255, 0.72)";
  ctx.lineWidth = 2.1;
  ctx.shadowBlur = 18;
  ctx.shadowColor = SCOUT.cyan;
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.rotate(-frameCount * 0.055);
  ctx.strokeStyle = "rgba(181, 38, 255, 0.64)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2);
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(radius * 0.26, -radius * 0.1);
    ctx.lineTo(radius * 0.62, 0);
    ctx.lineTo(radius * 0.26, radius * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = "rgba(244, 255, 255, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.56, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawScoutBody(ctx, radius, active, frameCount) {
  const pulse = pulseAt(frameCount, 0, 0.2);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const body = ctx.createRadialGradient(0, -radius * 0.3, 1, 0, 0, radius * 1.25);
  body.addColorStop(0, SCOUT.white);
  body.addColorStop(0.2, SCOUT.cyan);
  body.addColorStop(0.58, SCOUT.blue);
  body.addColorStop(1, SCOUT.violet);

  ctx.fillStyle = body;
  ctx.shadowBlur = active ? 30 : 18;
  ctx.shadowColor = active ? SCOUT.magenta : SCOUT.cyan;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 1.18);
  ctx.lineTo(radius * 0.68, -radius * 0.28);
  ctx.quadraticCurveTo(radius * 0.42, radius * 0.72, 0, radius * 1.1);
  ctx.quadraticCurveTo(-radius * 0.42, radius * 0.72, -radius * 0.68, -radius * 0.28);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(244, 255, 255, 0.82)";
  ctx.lineWidth = 1.7;
  ctx.stroke();

  ctx.fillStyle = "rgba(5, 18, 29, 0.78)";
  ctx.beginPath();
  ctx.moveTo(-radius * 0.48, -radius * 0.1);
  ctx.lineTo(radius * 0.48, -radius * 0.1);
  ctx.lineTo(radius * 0.24, radius * 0.34);
  ctx.lineTo(-radius * 0.24, radius * 0.34);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(67, 245, 255, 0.86)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.34, -radius * 0.02);
  ctx.lineTo(-radius * 0.06, radius * 0.16);
  ctx.moveTo(radius * 0.34, -radius * 0.02);
  ctx.lineTo(radius * 0.06, radius * 0.16);
  ctx.stroke();

  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.rotate(-0.34 + pulse * 0.1);
    ctx.fillStyle = side < 0 ? "rgba(29, 143, 255, 0.66)" : "rgba(181, 38, 255, 0.58)";
    ctx.beginPath();
    ctx.moveTo(radius * 0.18, -radius * 0.36);
    ctx.lineTo(radius * 1.18, -radius * 0.7);
    ctx.lineTo(radius * 0.74, -radius * 0.1);
    ctx.lineTo(radius * 1.22, radius * 0.44);
    ctx.lineTo(radius * 0.16, radius * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 255, 255, 0.42)";
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = SCOUT.white;
  ctx.shadowBlur = 18;
  ctx.shadowColor = SCOUT.white;
  ctx.beginPath();
  ctx.arc(0, -radius * 0.58, radius * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScoutTrail(ctx, trail, frameCount) {
  const alpha = Math.max(0, trail.life / trail.maxLife);
  const visualAlpha = alpha * alpha;
  const progress = 1 - alpha;
  const radius = trail.radius * (0.7 + progress * 0.46);

  ctx.save();
  ctx.translate(trail.x, trail.y);
  ctx.rotate(trail.angle);
  ctx.globalCompositeOperation = "lighter";

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.8);
  grad.addColorStop(0, `rgba(244, 255, 255, ${visualAlpha * 0.22})`);
  grad.addColorStop(0.24, `rgba(67, 245, 255, ${visualAlpha * 0.28})`);
  grad.addColorStop(0.58, `rgba(181, 38, 255, ${visualAlpha * (trail.dash ? 0.3 : 0.18)})`);
  grad.addColorStop(1, "rgba(5, 18, 29, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (trail.dash ? 1.9 : 1.28), radius * (trail.dash ? 0.56 : 0.46), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(244, 255, 255, ${visualAlpha * 0.55})`;
  ctx.lineWidth = trail.dash ? 2.8 : 1.8;
  ctx.shadowBlur = 14;
  ctx.shadowColor = SCOUT.cyan;
  ctx.beginPath();
  ctx.moveTo(radius * 0.72, 0);
  ctx.lineTo(-radius * (trail.dash ? 1.62 : 1.08), radius * 0.26);
  ctx.lineTo(-radius * (trail.dash ? 1.2 : 0.78), 0);
  ctx.lineTo(-radius * (trail.dash ? 1.62 : 1.08), -radius * 0.26);
  ctx.closePath();
  ctx.stroke();

  ctx.rotate(-frameCount * 0.018 + trail.seed);
  ctx.strokeStyle = `rgba(255, 34, 216, ${visualAlpha * 0.42})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 1.35);
  ctx.stroke();

  ctx.restore();
}

function drawScoutEcho(ctx, echo) {
  const alpha = Math.max(0, echo.life / echo.maxLife);
  const radius = echo.radius * (1 + (1 - alpha) * 0.45);

  ctx.save();
  ctx.translate(echo.x, echo.y);
  ctx.rotate(echo.seed);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = "rgba(67, 245, 255, 0.82)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 16;
  ctx.shadowColor = SCOUT.cyan;
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius * 0.72, -radius * 0.12);
  ctx.lineTo(radius * 0.28, radius * 0.78);
  ctx.lineTo(-radius * 0.28, radius * 0.78);
  ctx.lineTo(-radius * 0.72, -radius * 0.12);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawScoutSpark(ctx, spark) {
  const alpha = Math.max(0, spark.life / spark.maxLife);
  const len = spark.size * 4.2;

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
  ctx.moveTo(-len * 0.45, 0);
  ctx.lineTo(len * 0.45, 0);
  ctx.stroke();
  ctx.fillStyle = SCOUT.white;
  ctx.beginPath();
  ctx.arc(0, 0, spark.size * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScoutBurst(ctx, burst, frameCount) {
  const alpha = Math.max(0, burst.life / burst.maxLife);
  const progress = 1 - alpha;
  const radius = burst.radius * (0.18 + progress * 0.92);
  const isR = burst.type === "r";
  const isE = burst.type === "e";

  ctx.save();
  ctx.translate(burst.x, burst.y);
  ctx.rotate(burst.angle + progress * Math.PI * (isR ? 1.5 : 2.7));
  ctx.globalCompositeOperation = "lighter";

  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  field.addColorStop(0, `rgba(244, 255, 255, ${alpha * 0.22})`);
  field.addColorStop(0.35, `rgba(67, 245, 255, ${alpha * 0.2})`);
  field.addColorStop(0.66, isE ? `rgba(29, 143, 255, ${alpha * 0.16})` : `rgba(181, 38, 255, ${alpha * 0.18})`);
  field.addColorStop(1, "rgba(5, 18, 29, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = field;
  ctx.fill();

  ctx.strokeStyle = isR ? "rgba(255, 34, 216, 0.76)" : "rgba(67, 245, 255, 0.82)";
  ctx.lineWidth = isR ? 3.2 : 2.4;
  ctx.shadowBlur = isR ? 28 : 18;
  ctx.shadowColor = isR ? SCOUT.magenta : SCOUT.cyan;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.86, -Math.PI * 0.15, Math.PI * 1.25);
  ctx.stroke();

  ctx.strokeStyle = "rgba(244, 255, 255, 0.72)";
  ctx.lineWidth = 1.7;
  for (let i = 0; i < (isR ? 12 : 8); i++) {
    const a = i * (Math.PI * 2 / (isR ? 12 : 8));
    const inner = radius * (isR ? 0.32 : 0.46);
    const outer = radius * (isR ? 0.96 : 0.88);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }

  drawScoutSigil(ctx, Math.max(22, radius * 0.45), frameCount + burst.seed * 10, alpha * (isR ? 0.9 : 0.65));
  ctx.restore();
}

function drawScoutGrapple(ctx, state) {
  const { player, frameCount } = state;
  const fx = state.scoutGrappleFx;
  const target = player.grappleTarget || fx;
  if (!target) return;

  const active = player.dashTimeLeft > 0;
  const alpha = fx ? Math.max(0, fx.life / fx.maxLife) : active ? 1 : 0;
  if (alpha <= 0) return;

  const tx = target.x;
  const ty = target.y;
  const angle = Math.atan2(ty - player.y, tx - player.x);
  const pulse = pulseAt(frameCount || 0, 0, 0.38);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  const beam = ctx.createLinearGradient(player.x, player.y, tx, ty);
  beam.addColorStop(0, `rgba(244, 255, 255, ${alpha * 0.88})`);
  beam.addColorStop(0.5, `rgba(67, 245, 255, ${alpha * 0.72})`);
  beam.addColorStop(1, `rgba(181, 38, 255, ${alpha * 0.72})`);
  ctx.strokeStyle = beam;
  ctx.lineWidth = 3.2 + pulse * 1.4;
  ctx.shadowBlur = 22;
  ctx.shadowColor = SCOUT.cyan;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  ctx.translate(tx, ty);
  ctx.rotate(angle);
  ctx.fillStyle = SCOUT.white;
  ctx.strokeStyle = SCOUT.magenta;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -8);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawScoutPlayer(ctx, state, buffs, isInvulnSkill = false) {
  const { player, frameCount } = state;
  if (!player) return;

  const radius = player.radius;
  const fc = frameCount || 0;
  const isQ = (buffs.q || 0) > 0;
  const isE = (buffs.e || 0) > 0 || player.dashTimeLeft > 0;
  const isR = (buffs.r || 0) > 0;
  const active = isQ || isE || isR || isInvulnSkill;
  const pulse = pulseAt(fc, 0, 0.18);

  if (player.gracePeriod > 0 && !active && Math.floor(fc / 6) % 2 !== 0) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  const auraRadius = radius * (isR ? 4.2 : isQ ? 3.2 : isE ? 3.5 : 2.35);
  const aura = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, auraRadius);
  aura.addColorStop(0, active ? "rgba(244, 255, 255, 0.42)" : "rgba(67, 245, 255, 0.16)");
  aura.addColorStop(0.26, "rgba(67, 245, 255, 0.28)");
  aura.addColorStop(0.55, "rgba(29, 143, 255, 0.18)");
  aura.addColorStop(0.78, isR ? "rgba(255, 34, 216, 0.2)" : "rgba(181, 38, 255, 0.13)");
  aura.addColorStop(1, "rgba(5, 18, 29, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, auraRadius + pulse * radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  drawScoutSigil(
    ctx,
    radius * (isR ? 3.45 + pulse * 0.2 : isE ? 2.6 + pulse * 0.18 : isQ ? 2.48 : 1.82),
    fc,
    isR ? 0.96 : active ? 0.72 : 0.42,
  );

  if (isE) {
    const dx = player.dashDx || 1;
    const dy = player.dashDy || 0;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.rotate(angle + Math.PI);
    const streak = ctx.createLinearGradient(0, 0, -radius * 8.5, 0);
    streak.addColorStop(0, "rgba(244, 255, 255, 0.62)");
    streak.addColorStop(0.28, "rgba(67, 245, 255, 0.36)");
    streak.addColorStop(0.68, "rgba(181, 38, 255, 0.22)");
    streak.addColorStop(1, "rgba(181, 38, 255, 0)");
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.moveTo(radius * 0.7, 0);
    ctx.lineTo(-radius * 8.5, radius * 1.3);
    ctx.lineTo(-radius * 6.7, 0);
    ctx.lineTo(-radius * 8.5, -radius * 1.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (isR) {
    ctx.save();
    ctx.rotate(-fc * 0.064);
    for (let i = 0; i < 12; i++) {
      const a = i * (Math.PI * 2 / 12);
      const orbit = radius * (3.1 + pulse * 0.18);
      ctx.save();
      ctx.rotate(a);
      ctx.translate(orbit, 0);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = i % 2 === 0 ? "rgba(67, 245, 255, 0.84)" : "rgba(255, 34, 216, 0.72)";
      ctx.shadowBlur = 16;
      ctx.shadowColor = i % 2 === 0 ? SCOUT.cyan : SCOUT.magenta;
      ctx.fillRect(-2, -7, 4, 14);
      ctx.restore();
    }
    ctx.restore();
  }

  drawScoutBody(ctx, radius, active, fc);

  if (player.shield > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.32, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(244, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

export const scout = {
  id: "scout",

  onTrigger: (key, state, canvas, changeStateFn) => {
    const { player, mouse } = state;
    const mx = mouse?.x ?? player.x;
    const my = mouse?.y ?? player.y;
    const aim = Math.atan2(my - player.y, mx - player.x);

    if (key === "q") {
      const radius = 180;
      state.activeBuffs.q = 18;
      pushScoutBurst(state, "q", player.x, player.y, radius, 30, aim);
      pushScoutEcho(state, player.x, player.y, player.radius * 2.4, 16);
      strikeNearby(state, radius, 100, 30);
      for (let i = 0; i < 18; i++) {
        const a = i * Math.PI * 2 / 18;
        pushScoutSpark(state, player.x, player.y, a, 2.4 + Math.random() * 2.4, 20, 2.1, i % 3 === 0 ? SCOUT.white : SCOUT.cyan);
      }
    }

    if (key === "e") {
      const dx = mx - player.x;
      const dy = my - player.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const dashTime = Math.max(8, Math.min(40, Math.floor(len / 15)));
        player.dashTimeLeft = dashTime;
        player.dashDx = dx / len;
        player.dashDy = dy / len;
        player.grappleTarget = { x: mx, y: my };
        state.activeBuffs.e = dashTime + 10;
        state.scoutGrappleFx = {
          x: mx,
          y: my,
          life: dashTime + 14,
          maxLife: dashTime + 14,
        };
        pushScoutBurst(state, "e", player.x, player.y, 120, 24, aim);
        pushScoutTrail(state, player.x, player.y, aim, 12, 58, true);
        state.screenShake = { timer: 8, intensity: 2.4 };
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 10 * FPS;
      state.screenShake = { timer: 18, intensity: 5.5 };
      pushScoutBurst(state, "r", player.x, player.y, 315, 52, aim);
      pushScoutEcho(state, player.x, player.y, player.radius * 3.8, 20);
      for (let i = 0; i < 30; i++) {
        const a = i * Math.PI * 2 / 30;
        pushScoutSpark(
          state,
          player.x,
          player.y,
          a,
          1.6 + Math.random() * 3.3,
          28,
          2.4,
          i % 4 === 0 ? SCOUT.magenta : i % 2 === 0 ? SCOUT.white : SCOUT.cyan,
        );
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
      pushScoutTrail(state, player.x, player.y, angle, 10, 62, true);
      if (fc % 2 === 0) {
        pushScoutEcho(
          state,
          player.x,
          player.y,
          player.radius * 1.25,
          10,
          player.dashDx || 0,
          player.dashDy || 0,
        );
      }
    };

    const last = state.scoutLastPos;
    if (last) {
      const moved = dist(last.x, last.y, player.x, player.y);
      if (moved > 1.1 && fc % ((player.dashTimeLeft > 0 || buffs.r > 0) ? 1 : 2) === 0) {
        const angle = Math.atan2(player.y - last.y, player.x - last.x);
        const dash = player.dashTimeLeft > 0;
        pushScoutTrail(state, player.x, player.y, angle, dash ? 10 : 8, dash ? 66 : buffs.r > 0 ? 50 : 36, dash);
      }
    }
    state.scoutLastPos = { x: player.x, y: player.y };

    if (buffs.q > 0) {
      state.scoutQ_Active = true;
      state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.18;
    }

    if (buffs.e > 0) {
      state.playerCanShootModifier = true;
      if (fc % 2 === 0) {
        const a = Math.atan2(player.dashDy || 0, player.dashDx || 1) + Math.PI + (Math.random() - 0.5) * 0.9;
        pushScoutSpark(state, player.x, player.y, a, 1.4 + Math.random() * 1.8, 16, 1.8, SCOUT.cyan);
      }
    }

    if (buffs.r > 0) {
      state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 2.2;
      state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.25;

      if (fc % 3 === 0) {
        pushScoutEcho(
          state,
          player.x,
          player.y,
          player.radius * (1.25 + Math.random() * 0.25),
          12,
          player.dashDx || 0,
          player.dashDy || 0,
        );
      }

      if (fc % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        pushScoutSpark(state, player.x, player.y, a, 0.9 + Math.random() * 2.0, 20, 2, Math.random() > 0.4 ? SCOUT.magenta : SCOUT.cyan);
      }
    }

    bullets?.forEach((b) => {
      if (!b.isPlayer || b.ownerCharacter !== "scout" || b.scoutPrepared) return;

      b.scoutPrepared = true;
      b.visualStyle = "scout_arc";

      if (buffs.q > 0) {
        b.scoutScan = true;
        b.damage = (b.damage || 1) * 1.12;
      }

      if (buffs.e > 0 || player.dashTimeLeft > 0) {
        b.scoutHookCharge = true;
        b.radius = Math.max(b.radius || 4, 5);
      }

      if (buffs.r > 0) {
        b.scoutOverdrive = true;
        b.damage = (b.damage || 1) * 1.18;
        b.radius = Math.max(b.radius || 4, 5);
      }
    });

    if (player.dashTimeLeft <= 0 && state.scoutGrappleFx == null) {
      player.grappleTarget = null;
    }

    updateScoutVfx(state);
  },

  draw: (state, ctx, canvas, buffs = { q: 0, e: 0, r: 0 }) => {
    const { player, frameCount } = state;
    const fc = frameCount || 0;

    state.scoutTrails?.forEach((trail) => drawScoutTrail(ctx, trail, fc));
    state.scoutEchoes?.forEach((echo) => drawScoutEcho(ctx, echo));

    if ((buffs.r || 0) > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(67, 245, 255, 0.038)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = "lighter";
      const pulse = Math.sin(fc * 0.16) * 18;
      const field = ctx.createRadialGradient(0, 0, 20, 0, 0, 390 + pulse);
      field.addColorStop(0, "rgba(244, 255, 255, 0.12)");
      field.addColorStop(0.28, "rgba(67, 245, 255, 0.16)");
      field.addColorStop(0.64, "rgba(181, 38, 255, 0.13)");
      field.addColorStop(1, "rgba(5, 18, 29, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, 390 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = field;
      ctx.fill();
      drawScoutSigil(ctx, 170 + pulse * 0.12, fc, 0.78);
      ctx.restore();
    }

    state.scoutBursts?.forEach((burst) => drawScoutBurst(ctx, burst, fc));
    drawScoutGrapple(ctx, state);
    state.scoutSparks?.forEach((spark) => drawScoutSpark(ctx, spark));
  },
};
