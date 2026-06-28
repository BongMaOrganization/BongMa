import { state } from "../state.js";
import { drawActiveCharacter } from "../characters/characterRegistry.js";

// ===== DRAW MODULES =====
import { getShakeOffset } from "./draw/drawUtils.js";
import { drawThemedBackground, drawPermanentScars, drawBurnVignette } from "./draw/drawBackground.js";
import { drawDungeon } from "../world/dungeonLayout.js";
import {
  drawHazards,
  drawElementalZones,
  drawGlobalHazard,
  drawSafeZones,
  drawEnvironmentalHazards,
} from "./draw/drawHazards.js";
import { drawBoss, drawBossBeams, drawBossEntityPhase, drawSuctionParticles } from "./draw/drawBoss.js";
import { drawEnemies } from "./draw/drawEnemies.js";
import { drawBullets } from "./draw/drawBullets.js";
import {
  drawPlayer,
  drawSkillIndicators,
  drawEngineerTurrets,
} from "./draw/drawPlayer.js";
import { drawCharacterVFX } from "./draw/drawCharacterVFX.js";
import { drawGroundEffects, drawFireVignette } from "./draw/drawGroundEffects.js";
import {
  drawExplosions,
  drawWorldParticles,
  drawScreenParticles,
} from "./draw/drawParticles.js";
import {
  drawHUD,
  drawStageConditionsHUD,
  drawGlitchEffects,
  drawPhaseTransition,
  drawNukeFlash,
} from "./draw/drawHUD.js";
import { drawMinimap } from "./draw/drawMinimap.js";
import { drawWorldObjects, drawFloatingTexts } from "./draw/drawWorldObjects.js";
import { drawRemotePlayers, drawRemoteBullets, drawReviveZones, drawMpPlayersHUD } from "./draw/drawRemotePlayers.js";
import { shouldSkipCharacterVfxFrame, getPerfLoadLevel } from "./vfxBudget.js";
import { beginFrameQuality, getRenderScale } from "./graphics.js";

// Re-export hexToRgba for other modules that may import from draw.js
export { hexToRgba } from "./draw/drawUtils.js";

// ===== OFFSCREEN RENDER TARGET (resolution scaling) =====
// Vẽ scene vào canvas phụ nhỏ hơn rồi phóng to lên canvas thật. Giảm số pixel
// GPU phải tô theo bình phương renderScale mà KHÔNG đổi FOV (toạ độ logic vẫn
// 1536x864 nhờ setTransform). renderScale === 1 -> bỏ qua, vẽ thẳng.
let _offCanvas = null;
let _offCtx = null;
function getOffscreen(w, h) {
  if (!_offCanvas) {
    _offCanvas = document.createElement("canvas");
    _offCtx = _offCanvas.getContext("2d");
  }
  if (_offCanvas.width !== w || _offCanvas.height !== h) {
    _offCanvas.width = w;
    _offCanvas.height = h;
  }
  return _offCtx;
}

// ===== MAIN DRAW FUNCTION =====
export function draw(ctx, canvas) {
  // Điều chỉnh chất lượng theo tải ngay đầu frame (auto hạ shadowBlur khi nặng).
  beginFrameQuality(getPerfLoadLevel(state));

  // Resolution scale: chuyển hướng toàn bộ lệnh vẽ vào offscreen nếu < 1.
  const rs = getRenderScale();
  const realCtx = ctx;
  let blit = false;
  if (rs < 0.999) {
    const ow = Math.max(1, Math.round(canvas.width * rs));
    const oh = Math.max(1, Math.round(canvas.height * rs));
    const octx = getOffscreen(ow, oh);
    octx.setTransform(rs, 0, 0, rs, 0, 0); // toạ độ logic giữ nguyên 1536x864
    ctx = octx;
    blit = true;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Camera transform
  ctx.translate(-state.camera.x, -state.camera.y);

  // --- Background ---
  drawThemedBackground(ctx);
  drawDungeon(ctx);
  drawPermanentScars(ctx);

  // --- World objects (crates, puzzles, portals, swarm zones, items, floating texts) ---
  drawWorldObjects(ctx);

  // --- Satellite & God Mode (above world, below shake) ---
  // These are now included in drawCharacterVFX

  // --- Apply screen shake ---
  const shake = getShakeOffset();
  ctx.save();
  if (!isNaN(shake.x) && !isNaN(shake.y)) {
    ctx.translate(shake.x, shake.y);
  }

  // --- Burn vignette (global fire hazard) ---
  if (
    state.globalHazard &&
    state.globalHazard.active &&
    state.globalHazard.type === "fire"
  ) {
    drawBurnVignette(ctx, canvas);
  }

  // --- Hazards (under entities) ---
  drawHazards(ctx);

  // --- Elemental zones ---
  drawElementalZones(ctx);

  // --- Global Hazard Overlay (particles + screen effects) ---
  drawGlobalHazard(ctx, canvas);

  // --- Safe Zones ---
  drawSafeZones(ctx);

  // --- Boss Beams ---
  drawBossBeams(ctx);

  // --- Boss entity phase (survive mode) ---
  if (state.boss && state.boss.entityPhase) {
    drawBossEntityPhase(ctx, canvas, state.boss);
  }

  // --- Glitch effects (matrix rain, decoys, overload) ---
  drawGlitchEffects(ctx, canvas);

  // --- Character-specific effects (skills, auras) ---
  drawActiveCharacter(state, ctx, canvas, state.activeBuffs || { q: 0, e: 0, r: 0 });

  // --- Skill range indicators ---
  drawSkillIndicators(ctx);

  // --- Explosions ---
  drawExplosions(ctx);

  // --- Boss body ---
  drawBoss(ctx);

  // --- Enemies (ghosts + elemental) ---
  drawEnemies(ctx);

  // --- Bullets ---
  drawBullets(ctx);

  // --- Remote player bullets (MP co-op) ---
  drawRemoteBullets(ctx);

  // --- Engineer turrets ---
  drawEngineerTurrets(ctx);

  // --- Player ---
  drawPlayer(ctx);

  // --- Remote players (MP co-op) ---
  drawRemotePlayers(ctx);

  // --- Revive zones (MP) ---
  drawReviveZones(ctx);

  // --- Character VFX (creator, knight, scout, satellite, god mode) ---
  if (!shouldSkipCharacterVfxFrame(state)) {
    drawCharacterVFX(ctx);
  }

  // --- Ground effects (warnings, storm, wind, icicles) ---
  drawGroundEffects(ctx, canvas);

  // --- Environmental hazards (secondary visual pass) ---
  drawEnvironmentalHazards(ctx);

  // --- World-space particles ---
  if (!state.particles) state.particles = [];
  drawWorldParticles(ctx);

  // --- Mouse cursor ---
  ctx.beginPath();
  ctx.arc(state.mouse.x, state.mouse.y, 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 255, 204, 0.5)";
  ctx.stroke();

  ctx.restore(); // end shake

  // --- Ultimate suction particles ---
  if (state.boss && state.boss.ultimatePhase) {
    drawSuctionParticles(ctx);
  }

  ctx.restore(); // end camera

  // --- Screen-space particles (after camera restore) ---
  drawScreenParticles(ctx);

  // --- HUD ---
  drawHUD(ctx, canvas);
  if (!state.isBossLevel && !state.bossArenaMode)
    drawStageConditionsHUD(ctx, canvas);

  // --- Player burn vignette ---
  if (state.playerStatus.burnTimer > 0) {
    drawFireVignette(ctx, canvas);
  }

  // --- Phase transition overlay ---
  drawPhaseTransition(ctx, canvas);

  // --- Minimap ---
  drawMinimap(ctx, canvas);

  // --- Nuke flash ---
  drawNukeFlash(ctx, canvas);

  // --- MP Players HUD (screen-space, top-left) ---
  if (state.isMultiplayer) drawMpPlayersHUD(ctx, canvas);

  // --- Phóng offscreen lên canvas thật (nếu đang scale resolution) ---
  if (blit) {
    realCtx.setTransform(1, 0, 0, 1, 0, 0);
    realCtx.clearRect(0, 0, canvas.width, canvas.height);
    realCtx.drawImage(_offCanvas, 0, 0, canvas.width, canvas.height);
  }
}

