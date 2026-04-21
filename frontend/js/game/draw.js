import { state } from "../state.js";
import { drawActiveCharacter } from "../characters/characterRegistry.js";

// ===== DRAW MODULES =====
import { getShakeOffset } from "./draw/drawUtils.js";
import { drawThemedBackground, drawPermanentScars, drawBurnVignette } from "./draw/drawBackground.js";
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
import { drawRemotePlayers, drawReviveZones, drawMpPlayersHUD } from "./draw/drawRemotePlayers.js";
import { shouldSkipCharacterVfxFrame } from "./vfxBudget.js";

// Re-export hexToRgba for other modules that may import from draw.js
export { hexToRgba } from "./draw/drawUtils.js";

// ===== MAIN DRAW FUNCTION =====
export function draw(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Camera transform
  ctx.translate(-state.camera.x, -state.camera.y);

  // --- Background ---
  drawThemedBackground(ctx);
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
}

