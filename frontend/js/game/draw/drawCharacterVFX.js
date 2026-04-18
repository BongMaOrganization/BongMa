import { state } from "../../state.js";

// ===== CREATOR TURRETS =====
function drawCreatorTurrets(ctx) {
  if (!state.creatorTurrets) return;
  const player = state.player;
  state.creatorTurrets.forEach((t) => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 220, 100, 0.8)";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffdd00";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = "rgba(255, 220, 100, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

// ===== CREATOR HOLY ZONE =====
function drawCreatorHolyZone(ctx) {
  if (!state.creatorHolyZone) return;
  const z = state.creatorHolyZone;
  const alpha = Math.min(1, z.life / 60);
  ctx.beginPath();
  ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.1})`;
  ctx.strokeStyle = `rgba(255, 220, 100, ${alpha * 0.5})`;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}

// ===== CREATOR ORBS =====
function drawCreatorOrbs(ctx) {
  if (!state.creatorOrbs) return;
  const player = state.player;
  state.creatorOrbs.forEach((orb) => {
    const ox = player.x + Math.cos(orb.angle) * orb.orbitRadius;
    const oy = player.y + Math.sin(orb.angle) * orb.orbitRadius;
    ctx.beginPath();
    ctx.arc(ox, oy, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffaa";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffdd00";
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

// ===== KNIGHT CHARGE TRAIL =====
function drawKnightCharge(ctx) {
  return;
}

// ===== KNIGHT SHIELD =====
function drawKnightShield(ctx) {
  return;
}

// ===== KNIGHT RAGE AURA =====
function drawKnightRage(ctx) {
  return;
}

// ===== SCOUT SLASH =====
function drawScoutSlash(ctx) {
  if (!state.scoutSlash || state.scoutSlash.life <= 0) return;
  const s = state.scoutSlash;
  const player = state.player;
  const progress = 1 - s.life / s.maxLife;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.rotate(progress * Math.PI * 3);

  const easeProgress = 1 - Math.pow(1 - progress, 3);
  const currentRadius = s.radius * easeProgress;

  const numTrails = 12;
  for (let i = 0; i < numTrails; i++) {
    const trailRatio = i / numTrails;
    const opacity = (1 - trailRatio) * Math.max(0, 1 - progress);
    const thickness = (1 - trailRatio) * 15 * Math.max(0, 1 - progress);

    ctx.beginPath();
    const safeRadius = Math.max(0.1, currentRadius - i * 0.5);
    ctx.arc(
      0,
      0,
      safeRadius,
      0 - trailRatio * 1.5,
      Math.PI * 1.3 - trailRatio * 1.5,
    );

    ctx.strokeStyle = `rgba(0, 255, 255, ${opacity})`;
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, currentRadius, Math.PI * 1.0, Math.PI * 1.3);
  ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.stroke();

  if (progress < 0.4) {
    for (let j = 0; j < 5; j++) {
      const angle = ((Math.PI * 2) / 5) * j + progress;
      const lineStart = currentRadius * 0.6;
      const lineEnd = currentRadius * (1.2 + Math.random() * 0.5);

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * lineStart, Math.sin(angle) * lineStart);
      ctx.lineTo(Math.cos(angle) * lineEnd, Math.sin(angle) * lineEnd);
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.6 - progress * 1.5})`;
      ctx.lineWidth = 2 + Math.random() * 2;
      ctx.stroke();
    }
  }

  ctx.restore();
  s.life--;
}

// ===== SATELLITE DRONE =====
export function drawSatellite(ctx) {
  const d = state.satelliteDrone;
  if (!d) return;

  ctx.save();
  ctx.fillStyle = "#0af";
  ctx.beginPath();
  ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(d.x - 15, d.y);
  ctx.lineTo(d.x + 15, d.y);
  ctx.stroke();
  ctx.restore();
}

// ===== GOD MODE AURA =====
export function drawGodMode(ctx) {
  const gm = state.godMode;
  if (!gm || !gm.active) return;

  const p = state.player;
  ctx.save();
  const pulse = Math.sin(state.frameCount * 0.2) * 10;
  const grad = ctx.createRadialGradient(
    p.x,
    p.y,
    p.radius,
    p.x,
    p.y,
    p.radius + 40 + pulse,
  );
  grad.addColorStop(0, "rgba(255, 215, 0, 0.6)");
  grad.addColorStop(0.5, "rgba(255, 100, 0, 0.2)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = grad;
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius + 40 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ===== MAIN ENTRY =====
export function drawCharacterVFX(ctx) {
  drawKnightCharge(ctx);
  drawKnightShield(ctx);
  drawKnightRage(ctx);
  drawScoutSlash(ctx);
  drawSatellite(ctx);
  drawGodMode(ctx);
}
