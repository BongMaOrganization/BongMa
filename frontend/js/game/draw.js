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
import { drawEchoBanner } from "./echoMode.js";
import {
  drawTowerWorld,
  drawTowerMinions,
  drawTowerHud,
} from "./towerMode.js";
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
import { drawStoryToast } from "../world/storyLore.js";
import { drawBossCutscene } from "./bossCutscene.js";
import {
  drawBossArenaVisual,
} from "../world/bossArenaVisual.js";
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
  // Tower mode có map riêng: bỏ theme lửa + dungeon, vẽ corridor trong drawTowerWorld
  const towerMode = state.gameMode === "tower" && state.tower;
  if (!towerMode) {
    drawThemedBackground(ctx);
    drawDungeon(ctx);
  }
  drawBossArenaVisual(ctx);
  drawPermanentScars(ctx);

  // --- Tower mode: nền corridor + lane + công trình (dưới thực thể) ---
  if (towerMode) drawTowerWorld(ctx);

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

  // --- Tower mode: lính đồng minh + thanh máu lính địch ---
  if (state.gameMode === "tower" && state.tower) drawTowerMinions(ctx);

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

  // --- Map cinematic overlays (sóng lửa / bão tuyết / xoáy gió / địa chấn) ---
  if (!state.isBossLevel && !state.bossArenaMode) drawMapCinematics(ctx, canvas);

  // --- HUD ---
  drawHUD(ctx, canvas);
  // Echo/Tower mode không có mục tiêu màn — HUD tự quản trong mode riêng
  if (
    !state.isBossLevel &&
    !state.bossArenaMode &&
    state.gameMode !== "echo" &&
    state.gameMode !== "tower"
  )
    drawStageConditionsHUD(ctx, canvas);
  if (state.gameMode === "echo") drawEchoBanner(ctx, canvas);
  if (state.gameMode === "tower" && state.tower) drawTowerHud(ctx, canvas);

  // --- Player burn vignette ---
  if (state.playerStatus.burnTimer > 0) {
    drawFireVignette(ctx, canvas);
  }

  // --- Phase transition overlay ---
  drawPhaseTransition(ctx, canvas);

  // --- Minimap ---
  drawMinimap(ctx, canvas);

  // --- Story lore toast ---
  drawStoryToast(ctx, canvas);

  // --- Boss intro cutscene ---
  drawBossCutscene(ctx, canvas);

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

// ============================================================================
// Overlay cinematic theo map — đọc state.cinematicEffects (trước đây set mà
// không ai vẽ). Screen-space, procedural (không tích particle vào state), tự fade.
// ============================================================================
function drawMapCinematics(ctx, canvas) {
  const ce = state.cinematicEffects;
  if (!ce) return;
  const W = canvas.width;
  const H = canvas.height;
  const f = state.frameCount || 0;

  // 🔥 LỬA — sóng lửa: ám đỏ pulse + tàn lửa bay lên
  if (ce.fieldBurn > 0.01) {
    const a = ce.fieldBurn;
    const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.15, W / 2, H * 0.55, H * 0.85);
    g.addColorStop(0, "rgba(255,90,0,0)");
    g.addColorStop(1, `rgba(255,40,0,${0.3 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 22; i++) {
      const seed = i * 127.1;
      const x = (seed * 53 + f * 1.3) % W;
      const y = H - ((f * (1.2 + (i % 4) * 0.5) + seed * 7) % (H + 60));
      ctx.fillStyle = `rgba(255,${140 + (i % 5) * 20},40,${0.5 * a})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ce.fieldBurn = Math.max(0, ce.fieldBurn - 0.01); // ~1.6s fade
  }

  // ❄️ BĂNG — bão tuyết: phủ trắng mờ + tuyết trôi xiên
  if (ce.fogAlpha > 0.01) {
    const a = ce.fogAlpha;
    ctx.fillStyle = `rgba(225,242,255,${0.4 * a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * a})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const seed = i * 311.7;
      const x = ((seed * 13 + f * 4) % (W + 40)) - 20;
      const y = ((seed * 29 + f * 7) % (H + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 10);
      ctx.stroke();
    }
    ctx.restore();
    ce.fogAlpha = Math.max(0, ce.fogAlpha - 0.004); // fade dần
  }

  // 🌪️ GIÓ — xoáy quanh tâm (world→screen qua camera)
  if (ce.vortexPower > 0.01) {
    const a = ce.vortexPower;
    const cx = (ce.vortexCenter?.x || 0) - (state.camera?.x || 0);
    const cy = (ce.vortexCenter?.y || 0) - (state.camera?.y || 0);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = `rgba(200,255,245,${0.5 * a})`;
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const rot = f * 0.08 + (k * Math.PI) / 2;
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 1.6; t += 0.2) {
        const r = 30 + t * 70;
        const x = Math.cos(t + rot) * r;
        const y = Math.sin(t + rot) * r;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    ce.vortexPower = Math.max(0, ce.vortexPower - 0.012); // ~1.4s
  }

  // 🪨 ĐẤT — địa chấn: ám bụi nâu + hạt đá rung (field distortion vốn bỏ không)
  if (ce.distortion > 0.01) {
    const a = ce.distortion;
    ctx.fillStyle = `rgba(120,85,45,${0.18 * a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const seed = i * 91.3;
      const x = (seed * 17 + f * 0.7) % W;
      const y = (seed * 37 + f * 2.2) % H;
      ctx.fillStyle = `rgba(150,110,70,${0.5 * a})`;
      ctx.fillRect(x, y, 2 + (i % 2), 2);
    }
    ctx.restore();
    ce.distortion = Math.max(0, ce.distortion - 0.02); // ~1s
  }
}

