import { state } from "../../state.js";
import { VFX_BUDGET } from "../vfxBudget.js";
import { shouldSkipParticleDrawFrame } from "../vfxBudget.js";

function isParticleVisible(p, padding = 120) {
  if (p.screenSpace) return true;
  const cam = state.camera;
  if (!cam) return true;
  const width = cam.width || 0;
  const height = cam.height || 0;
  const size = p.size || 2;
  return (
    p.x + size >= cam.x - padding &&
    p.x - size <= cam.x + width + padding &&
    p.y + size >= cam.y - padding &&
    p.y - size <= cam.y + height + padding
  );
}

// ===== EXPLOSIONS =====
export function drawExplosions(ctx) {
  if (!state.explosions) return;
  for (let i = state.explosions.length - 1; i >= 0; i--) {
    let exp = state.explosions[i];
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.fillStyle = exp.color;
    ctx.globalAlpha = exp.life / 15;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    exp.life--;
    if (exp.life <= 0) state.explosions.splice(i, 1);
  }
}

// ===== WORLD-SPACE PARTICLES (drawn inside camera transform) =====
export function drawWorldParticles(ctx) {
  if (!state.particles) return;
  if (state.particles.length > VFX_BUDGET.MAX_PARTICLES) {
    state.particles.splice(0, state.particles.length - VFX_BUDGET.MAX_PARTICLES);
  }

  const skipDraw = shouldSkipParticleDrawFrame(state);

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    if (p.screenSpace) continue;
    p.x += p.vx || 0;
    p.y += p.vy || 0;
    p.life--;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    if (skipDraw || !isParticleVisible(p)) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
    ctx.fillStyle = p.color || "white";
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ===== SCREEN-SPACE PARTICLES (drawn after camera restore) =====
export function drawScreenParticles(ctx) {
  if (!state.particles) return;
  if (state.particles.length > VFX_BUDGET.MAX_PARTICLES) {
    state.particles.splice(0, state.particles.length - VFX_BUDGET.MAX_PARTICLES);
  }

  const skipDraw = shouldSkipParticleDrawFrame(state);

  state.particles = state.particles.filter((p) => {
    if (!p.screenSpace) return p.life > 0;
    p.x += p.vx || 0;
    p.y += p.vy || 0;
    p.life--;
    if (p.life <= 0) return false;
    if (skipDraw) return true;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
    ctx.fillStyle = p.color || "white";
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fill();
    return true;
  });
  ctx.globalAlpha = 1;
}
