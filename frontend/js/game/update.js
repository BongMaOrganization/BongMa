import { state } from "../state.js";
import {
  FPS,
  PLAYER_DASH_SPEED_MULTIPLIER,
  PLAYER_MAX_PROJECTILES_PER_SECOND,
  PLAYER_MOVE_SPEED_MULTIPLIER,
} from "../config.js";
import { dist } from "../utils.js";
import { UI, updateHealthUI } from "../ui.js";
import { updateActiveCharacter } from "../characters/characterRegistry.js";
import { updatePuzzle } from "../game/puzzle_manager.js";
import { updateElementalZones } from "../game/elementalZone.js";
import {
  updateElementalEnemies,
  spawnElementalEnemy,
  ELEMENTS,
} from "../entities/elementalEnemies.js";
import {
  updateBullets,
  playerTakeDamage,
  applyCaptureReward,
  addExperience,
} from "./combat.js";
import { updateBoss } from "../entities/bosses/boss_manager.js";
import { startBossFight } from "./flow.js";
import { spawnBullet } from "../entities/helpers.js";
import { spawnCrate, spawnCrystal } from "../world/element.js";
import { ATTACK_MODES, SPECIAL_SKILLS } from "../entities/bosses/patterns.js";
import { updateMultiplayer } from "../multiplayer/mpFlow.js";
import { enforceBulletBudget, enforceVfxBudget } from "./vfxBudget.js";

function applyPlayerShotCompression(
  startIndex,
  bounceCount,
  damageMultiplier = 1,
  radiusMultiplier = 1,
) {
  for (let i = startIndex; i < state.bullets.length; i++) {
    const bullet = state.bullets[i];
    if (!bullet?.isPlayer) continue;

    bullet.bounces = bounceCount;

    if (damageMultiplier > 1) {
      bullet.damage = (bullet.damage || 1) * damageMultiplier;
      bullet.radius = Math.min(
        10,
        Math.max(4, (bullet.radius || 4) * radiusMultiplier),
      );
      bullet.fireRateCompressed = true;
    }
  }
}

export function update(ctx, canvas, changeStateFn) {
  const { player, boss, keys, mouse, activeBuffs } = state;
  const buffs = activeBuffs || { q: 0, e: 0, r: 0 };

  // === MULTIPLAYER: update revive zones, check all dead ===
  updateMultiplayer(changeStateFn);

  // === MULTIPLAYER: Skip normal update if local player is dead (wait for revive) ===
  if (state.isMultiplayer && state.player?.isDead) {
    // Still update boss (host) so others see the fight
    if (state.isHost && boss && !boss.entityPhase) updateBoss(boss);
    return null;
  }

  updateElementalZones(state.player);
  updateElementalEnemies(state.player);
  // --- 1. Quản lý Camera & Boundaries ---
  state.camera.width = canvas.width;
  state.camera.height = canvas.height;
  if (player && player.hp > 0) {
    state.camera.x = player.x - canvas.width / 2;
    state.camera.y = player.y - canvas.height / 2;
    state.camera.x = Math.max(
      0,
      Math.min(state.camera.x, state.world.width - canvas.width),
    );
    state.camera.y = Math.max(
      0,
      Math.min(state.camera.y, state.world.height - canvas.height),
    );
    state.mouse.x = (state.mouse.screenX || 0) + state.camera.x;
    state.mouse.y = (state.mouse.screenY || 0) + state.camera.y;
  }

  if (state.ghosts) {
    state.ghosts.forEach((g) => {
      g.x = Math.max(0, Math.min(g.x, state.world.width));
      g.y = Math.max(0, Math.min(g.y, state.world.height));
    });
  }

  // --- 2. Reset Modifiers Mỗi Frame (Core của Refactor Nhân Vật) ---
  state.playerSpeedMultiplier = 1;
  state.playerSpeedMultiplier = 1;
  if (state.playerStatus.stunTimer > 0) {
    state.playerStatus.stunTimer--;
  }
  if (state.playerStatus.slowTimer > 0) {
    state.playerStatus.slowTimer--;
  }
  state.playerFireRateMultiplier = 1;
  state.playerMultiShotModifier = player.multiShot || 1;
  state.playerBouncesModifier = player.bounces || 0;
  state.playerCanShootModifier = player.characterId !== "painter"; // Painter click liên tục, xử lý trong file riêng
  state.timeFrozenModifier = false;
  // Reset Flag Kỹ năng đặc biệt (Dành cho súng/đạn)
  state.assassinE_Active = false;
  state.sniperQ_Active = false;
  state.scoutQ_Active = false;
  state.frostR_Active = false;

  // --- 3. GỌI LOGIC NHÂN VẬT ---
  updateActiveCharacter(state, ctx, canvas, buffs, changeStateFn);
  enforceBulletBudget(state);
  enforceVfxBudget(state);

  // --- 4. Tính toán chỉ số cuối cùng & Di chuyển ---
  let currentSpeed =
    player.speed * state.playerSpeedMultiplier * PLAYER_MOVE_SPEED_MULTIPLIER;

  // Phạt tốc độ nếu đang sạc trụ Capture Point
  const activeCP = state.capturePoints?.find(
    (cp) =>
      cp.state === "charging" &&
      dist(player.x, player.y, cp.x, cp.y) < cp.radius,
  );
  if (activeCP) currentSpeed *= 0.5;
  if (state.godMode && state.godMode.active) currentSpeed *= 2.0;

  // Status Effects (Làm chậm, choáng)
  if (state.playerStatus.slowTimer > 0) currentSpeed *= 0.5;
  if (state.playerStatus.stunTimer > 0) currentSpeed = 0;

  let currentFireRate = Math.max(
    2,
    (player.fireRate || 10) * state.playerFireRateMultiplier,
  );
  let fireRateBuff = state.activePlayerBuffs?.find(
    (b) => b.type === "FIRE_RATE",
  );
  if (fireRateBuff) currentFireRate = Math.max(2, currentFireRate * 0.5);

  let currentMultiShot = Math.max(
    1,
    Math.round(state.playerMultiShotModifier || 1),
  );
  let currentBounces = state.playerBouncesModifier;
  let shotDamageMultiplier = 1;
  let shotRadiusMultiplier = 1;

  const projectedProjectilesPerSecond =
    (currentMultiShot * FPS) / Math.max(1, currentFireRate);
  if (projectedProjectilesPerSecond > PLAYER_MAX_PROJECTILES_PER_SECOND) {
    const optimizedFireRate = Math.ceil(
      (currentMultiShot * FPS) / PLAYER_MAX_PROJECTILES_PER_SECOND,
    );
    shotDamageMultiplier = optimizedFireRate / Math.max(1, currentFireRate);
    shotRadiusMultiplier =
      1 + Math.min(0.35, (shotDamageMultiplier - 1) * 0.1);
    currentFireRate = optimizedFireRate;
  }

  // Timers: Grace, Shield, Dash
  if (player.gracePeriod > 0) player.gracePeriod--;
  if (player.dashCooldownTimer > 0) player.dashCooldownTimer--;
  if (player.shield < player.maxShield) {
    if (player.shieldRegenTimer > 0) player.shieldRegenTimer--;
    else {
      player.shield = player.maxShield;
      updateHealthUI();
    }
  }

  // Cập nhật UI Dash
  if (player.dashCooldownTimer <= 0) {
    UI.dash.innerText = "Lướt: SẴN SÀNG";
    UI.dash.style.color = "#00ffcc";
  } else {
    UI.dash.innerText = `Lướt: ${(player.dashCooldownTimer / 60).toFixed(1)}s`;
    UI.dash.style.color = "#888";
  }

  // Input di chuyển
  let dx = 0,
    dy = 0;
  if (keys["w"] || keys["arrowup"]) dy -= 1;
  if (keys["s"] || keys["arrowdown"]) dy += 1;
  if (keys["a"] || keys["arrowleft"]) dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;

  if (state.glitch?.invertControls) {
    dx *= -1;
    dy *= -1;
  }

  if (dx !== 0 && dy !== 0) {
    let len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // Dash Logic
  if (
    keys["space"] &&
    player.dashCooldownTimer <= 0 &&
    player.dashTimeLeft <= 0 &&
    (dx !== 0 || dy !== 0)
  ) {
    player.dashTimeLeft = 12;
    player.dashCooldownTimer = player.dashMaxCooldown || 60;
    player.dashDx = dx;
    player.dashDy = dy;
  }

  if (player.dashTimeLeft > 0) {
    player.x += player.dashDx * (currentSpeed * PLAYER_DASH_SPEED_MULTIPLIER);
    player.y += player.dashDy * (currentSpeed * PLAYER_DASH_SPEED_MULTIPLIER);
    if (player.dashEffect) player.dashEffect();
    player.dashTimeLeft--;
    player.isInvincible = player.dashTimeLeft > 2;
  } else {
    player.x += dx * currentSpeed;
    player.y += dy * currentSpeed;
    player.isInvincible = false;
  }

  // Va chạm với Hòm tiếp tế (Obstacles)
  state.crates?.forEach((c) => {
    const dxh = player.x - c.x;
    const dyh = player.y - c.y;
    const d = Math.sqrt(dxh * dxh + dyh * dyh);
    const minDist = player.radius + c.radius - 5;
    if (d < minDist) {
      const angle = Math.atan2(dyh, dxh);
      player.x = c.x + Math.cos(angle) * minDist;
      player.y = c.y + Math.sin(angle) * minDist;
    }
  });

  player.x = Math.max(
    player.radius,
    Math.min(state.world.width - player.radius, player.x),
  );
  player.y = Math.max(
    player.radius,
    Math.min(state.world.height - player.radius, player.y),
  );

  // --- 5. Bắn Súng (Dùng chung) ---
  let shotThisFrame = false;
  let targetX = 0,
    targetY = 0;
  if (player.cooldown > 0) player.cooldown--;

  if (
    (mouse.clicked || mouse.isDown) &&
    player.cooldown <= 0 &&
    state.playerCanShootModifier &&
    player.dashTimeLeft <= 0
  ) {
    let count = currentMultiShot;
    let spread = 0.15;

    if (state.assassinE_Active) {
      // Logic đặc biệt cho Assassin nếu cần auto target (giữ lại logic target từ bản gốc)
      let nearestDist = Infinity;
      let targetObj = boss || null;
      if (boss) nearestDist = dist(player.x, player.y, boss.x, boss.y);
      state.ghosts.forEach((g) => {
        if (g.x > 0 && g.isStunned <= 0) {
          let d = dist(player.x, player.y, g.x, g.y);
          if (d < nearestDist) {
            nearestDist = d;
            targetObj = g;
          }
        }
      });
      let tx = targetObj ? targetObj.x : mouse.x;
      let ty = targetObj ? targetObj.y : mouse.y;

      let baseAngle = Math.atan2(ty - player.y, tx - player.x);
      let startAngle = baseAngle - (spread * (count - 1)) / 2;
      let oldLen = state.bullets.length;

      for (let i = 0; i < count; i++) {
        let a = startAngle + i * spread;
        spawnBullet(
          player.x,
          player.y,
          player.x + Math.cos(a) * 10,
          player.y + Math.sin(a) * 10,
          true,
        );
      }
      for (let i = oldLen; i < state.bullets.length; i++) {
        state.bullets[i].damage = 2;
        state.bullets[i].radius = 8;
      }
      applyPlayerShotCompression(
        oldLen,
        currentBounces,
        shotDamageMultiplier,
        shotRadiusMultiplier,
      );
    } else {
      // Bắn thường
      let baseAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      let startAngle = baseAngle - (spread * (count - 1)) / 2;
      let oldLen = state.bullets.length;

      for (let i = 0; i < count; i++) {
        let a = startAngle + i * spread;
        spawnBullet(
          player.x,
          player.y,
          player.x + Math.cos(a) * 10,
          player.y + Math.sin(a) * 10,
          true,
        );
      }
      if (state.sniperQ_Active) {
        for (let i = oldLen; i < state.bullets.length; i++) {
          state.bullets[i].damage = 3;
          state.bullets[i].radius = 6;
          state.bullets[i].style = 1;
        }
      }
      applyPlayerShotCompression(
        oldLen,
        currentBounces,
        shotDamageMultiplier,
        shotRadiusMultiplier,
      );
    }

    player.cooldown = currentFireRate;
    shotThisFrame = true;
    targetX = mouse.x;
    targetY = mouse.y;
    enforceBulletBudget(state);
  }
  mouse.clicked = false;

  // Lưu Record Run (Dành cho Dummy)
  if (!state.isBossLevel) {
    let frameData = [Math.round(player.x), Math.round(player.y)];
    if (shotThisFrame) frameData.push(Math.round(targetX), Math.round(targetY));
    state.currentRunRecord.push(frameData);
  }

  // --- 6. XỬ LÝ QUÁI THÚ VÀ BOSS CHẾT ---
  // Only HOST runs boss AI logic in multiplayer
  // Non-host receives boss state via socket sync
  if (boss && !boss.entityPhase) {
    if (!state.isMultiplayer || state.isHost) {
      updateBoss(boss);
    }
  }

  // XỬ LÝ BOSS CHẾT (Dành cho MỌI LOẠI BOSS)
  if (boss && boss.hp <= 0) {
    // Lần đầu boss chết: bắt đầu animation 120 frame (2 giây)
    if (!boss.deathTimer) {
      boss.deathTimer = 120;
      boss.deathX = boss.x;
      boss.deathY = boss.y;
      // Dọn sân chiến (giữ boss lại để draw animation)
      state.bullets = [];
      state.bossBeams = [];
      state.groundWarnings = [];
      state.safeZones = [];
      state.hazards = [];
      state.glitch.matrixMode = false;
      state.glitch.invertControls = false;
      state.cinematicEffects.fogAlpha = 0;
    }

    boss.deathTimer--;

    if (boss.deathTimer <= 0) {
      // Animation xong — dọn sạch hoàn toàn
      // In MP, non-host still gets coin but host already handled boss kill
      if (!state.isMultiplayer || state.isHost) {
        state.player.coins = (state.player.coins || 0) + 100;
      }
      state.boss = null;
      state.isBossLevel = false;
      return "BOSS_KILLED";
    }
    // Đang phát animation — không update gì thêm
    return null;
  }
  // Update Bullets
  updateBullets(ctx, canvas, changeStateFn, state.timeFrozenModifier);
  enforceBulletBudget(state);
  enforceVfxBudget(state);

  // --- 7. SWARM ZONES & QUẢN LÝ QUÁI (AI) ---
  let activeZone = null;
  state.swarmZones?.forEach((sz) => {
    if (sz.isCompleted) return;
    if (dist(player.x, player.y, sz.x, sz.y) < sz.radius) {
      activeZone = sz;
      sz.active = true;
    } else {
      sz.active = false;
    }
  });

  // Spawn quái Swarm Zone
  if (state.frameCount % 120 === 0) {
    if (!state.ghosts) state.ghosts = [];
    state.swarmZones?.forEach((sz) => {
      // THAY ĐỔI: Chỉ spawn khi zone chưa hoàn thành VÀ người chơi đang đứng bên trong (sz.active === true)
      if (sz.isCompleted || !sz.active) return;

      const currentZoneGhosts = state.ghosts.filter(
        (g) => g.parentZoneId === sz.id,
      ).length;
      const remainingToSpawn =
        sz.requiredKills - sz.currentKills - currentZoneGhosts;
      if (remainingToSpawn > 0 && currentZoneGhosts < 10) {
        const spawnBatch = Math.min(5, remainingToSpawn);
        for (let j = 0; j < spawnBatch; j++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * (sz.radius - 50);
          state.ghosts.push({
            record: [],
            speedRate: 1,
            timer: 0,
            x: sz.x + Math.cos(angle) * r,
            y: sz.y + Math.sin(angle) * r,
            radius: 15,
            hp: 1 + Math.floor(state.currentLevel / 3),
            isDummy: true,
            parentZoneId: sz.id,
            historyPath: [],
            isStunned: 0,
            lastShot: state.frameCount + Math.random() * 60,
          });
        }
      }
    });
  }

  let activeGhosts = 0;
  let isInvulnerable =
    player.gracePeriod > 0 ||
    player.dashTimeLeft > 0 ||
    state.timeFrozenModifier;

  for (let i = state.ghosts.length - 1; i >= 0; i--) {
    let g = state.ghosts[i];
    if (!g) continue;

    // Dọn quái của Zone đã xong
    if (g.parentZoneId) {
      const zone = state.swarmZones.find((z) => z.id === g.parentZoneId);
      if (zone && zone.isCompleted) {
        state.ghosts.splice(i, 1);
        continue;
      }
    }

    // Barrier nhốt quái
    if (activeZone && !g.parentZoneId) {
      if (dist(g.x, g.y, activeZone.x, activeZone.y) < activeZone.radius) {
        const angle = Math.atan2(g.y - activeZone.y, g.x - activeZone.x);
        g.x = activeZone.x + Math.cos(angle) * activeZone.radius;
        g.y = activeZone.y + Math.sin(angle) * activeZone.radius;
      }
    }

    // Kiểm tra quái chết
    let isHit =
      (g.hp !== undefined && g.hp <= 0) ||
      (!g.isSubBoss && !g.isMiniBoss && g.isStunned > 0);
    if (isHit && !g.isRespawning) {
      if (g.parentZoneId) {
        const zone = state.swarmZones.find((sz) => sz.id === g.parentZoneId);
        if (zone && !zone.isCompleted) {
          zone.currentKills++;
          if (zone.currentKills >= zone.requiredKills) {
            zone.isCompleted = true;

            // 1. Gọi hàm addExperience thay vì cộng tay, để nó tự động xử lý Level Up và làm đầy thanh UI
            addExperience(20 * state.currentLevel, changeStateFn);

            // 2. Cộng tiền an toàn (Bắt fallback số 0 để tránh lỗi NaN)
            state.player.coins =
              (state.player.coins || 0) + 50 * state.currentLevel;

            state.floatingTexts.push({
              x: zone.x,
              y: zone.y,
              text: `+${20 * state.currentLevel} XP`,
              color: "#00ffcc",
              life: 100,
            });
            state.floatingTexts.push({
              x: zone.x,
              y: zone.y + 40,
              text: `+${50 * state.currentLevel} Gold`,
              color: "#ffcc00",
              life: 100,
            });
          }
        }
      } else {
        addExperience(g.isHorde ? 2 : 4, changeStateFn);
        if (g.x > 0)
          state.player.coins = (state.player.coins || 0) + (g.isHorde ? 1 : 3);
      }

      if (!state.explosions) state.explosions = [];
      state.explosions.push({
        x: g.x,
        y: g.y,
        radius: g.isHorde ? 1 : 2,
        life: 15,
        color: g.isHorde
          ? "rgba(200, 200, 255, 0.6)"
          : "rgba(255, 200, 0, 0.8)",
      });

      if (
        g.parentZoneId ||
        g.isHorde ||
        g.isMiniBoss ||
        g.isSubBoss ||
        g.puzzleGuardTag
      ) {
        // MiniBoss, SubBoss, Horde, và Guard của puzzle → xóa vĩnh viễn (không hồi sinh)
        state.ghosts.splice(i, 1);
        continue;
      } else {
        g.isRespawning = true;
        g.respawnTimer = 3 * FPS;
        g.isStunned = 0;
        g.x = -100;
        g.y = -100;
        g.historyPath = [];
        continue;
      }
    }

    // Quái đang hồi sinh
    if (g.isRespawning) {
      g.respawnTimer--;
      g.timer++;
      if (g.respawnTimer === Math.floor(0.5 * FPS)) {
        let spawnAngle = Math.random() * Math.PI * 2;
        g.x = player.x + Math.cos(spawnAngle) * 400;
        g.y = player.y + Math.sin(spawnAngle) * 400;
        g.historyPath = [{ x: g.x, y: g.y }];
      }
      if (g.respawnTimer < 0.5 * FPS) g.flicker = true;
      if (g.respawnTimer <= 0) {
        g.isRespawning = false;
        g.hp = undefined;
        g.flicker = false;
      }
      continue;
    }

    // --- AI DI CHUYỂN ---
    if (!state.timeFrozenModifier) {
      // 1. Swarm Zone AI
      if (g.parentZoneId) {
        const angle = Math.atan2(player.y - g.y, player.x - g.x);
        const speed = 0.8 + state.currentLevel * 0.05;
        g.x += Math.cos(angle) * speed;
        g.y += Math.sin(angle) * speed;

        const zone = state.swarmZones.find((sz) => sz.id === g.parentZoneId);
        if (zone && dist(g.x, g.y, zone.x, zone.y) > zone.radius) {
          const angleBack = Math.atan2(zone.y - g.y, zone.x - g.x);
          g.x += Math.cos(angleBack) * (speed + 2);
          g.y += Math.sin(angleBack) * (speed + 2);
        }
        if (state.frameCount - (g.lastShot || 0) > 90 + Math.random() * 60) {
          spawnBullet(
            g.x,
            g.y,
            g.x + Math.cos(angle) * 100,
            g.y + Math.sin(angle) * 100,
            false,
            4,
          );
          g.lastShot = state.frameCount;
        }
        activeGhosts++;
      }
      // 2. Horde/Capture Point AI
      else if (
        g.isHorde ||
        (state.capturePoints?.find((p) => p.state === "charging") &&
          !g.isSubBoss &&
          !g.isMiniBoss &&
          dist(
            g.x,
            g.y,
            state.capturePoints.find((p) => p.state === "charging").x,
            state.capturePoints.find((p) => p.state === "charging").y,
          ) < 2000)
      ) {
        let tx = g.targetX !== undefined ? g.targetX : player.x;
        let ty = g.targetY !== undefined ? g.targetY : player.y;
        if (g.isStunned > 0) g.isStunned--;
        else {
          let angleToTarget = Math.atan2(ty - g.y, tx - g.x);
          g.x += Math.cos(angleToTarget) * (g.speed * 1.8 || 2.2);
          g.y += Math.sin(angleToTarget) * (g.speed * 1.8 || 2.2);
        }
        activeGhosts++;
        g.timer = (g.timer || 0) + 1;
        if (!g.historyPath) g.historyPath = [];
        g.historyPath.push({ x: g.x, y: g.y });
        if (g.historyPath.length > 8) g.historyPath.shift();

        if (
          !isInvulnerable &&
          dist(g.x, g.y, player.x, player.y) < player.radius + g.radius - 2
        )
          playerTakeDamage(ctx, canvas, changeStateFn);
      }
      // 3. MiniBoss & Guard AI
      else if (g.isMiniBoss || g.behavior === "guard" || g.isSubBoss) {
        activeGhosts++;
        if (g.isStunned > 0) g.isStunned--;
        else if (g.isMiniBoss && g.originalX !== undefined) {
          const dToPlayer = dist(g.x, g.y, player.x, player.y);
          const dPlayerFromHome = dist(
            player.x,
            player.y,
            g.originalX,
            g.originalY,
          );
          if (dToPlayer < 600 && dPlayerFromHome < 900) {
            let angle = Math.atan2(player.y - g.y, player.x - g.x);
            let moveSpeed = (g.speedRate || 1.0) * (g.speed || 1.1);
            g.x += Math.cos(angle) * moveSpeed;
            g.y += Math.sin(angle) * moveSpeed;
            if (state.frameCount % 60 === 0)
              spawnBullet(g.x, g.y, player.x, player.y, false, 2, "ghost", 1.5);
          } else {
            // Rút về nhà — KHÔNG hồi máu trong khi di chuyển
            const dHome = dist(g.x, g.y, g.originalX, g.originalY);
            if (dHome > 15) {
              let angleHome = Math.atan2(g.originalY - g.y, g.originalX - g.x);
              g.x += Math.cos(angleHome) * 4.5;
              g.y += Math.sin(angleHome) * 4.5;
            } else {
              // Đã về đến nhà → mới hồi máu/khiên
              if (g.hp < g.maxHp || (g.shield || 0) < (g.maxShield || 0)) {
                g.hp = g.maxHp;
                g.shield = g.maxShield;
                g.shieldActive = true;
                g.isStunned = 0;
              }
            }
          }
        } else if (g.isSubBoss || g.isMiniBoss) {
          let angle = Math.atan2(player.y - g.y, player.x - g.x);
          let moveSpeed = (g.speedRate || 1.0) * (g.speed || 1.1);
          g.x += Math.cos(angle) * moveSpeed;
          g.y += Math.sin(angle) * moveSpeed;
          if (state.frameCount % 60 === 0)
            spawnBullet(
              g.x,
              g.y,
              player.x,
              player.y,
              false,
              g.color === "#ff4400" ? 1 : 2,
              "ghost",
              1.5,
            );
        } else if (g.behavior === "guard") {
          g.x = g.originalX || g.x;
          g.y = g.originalY || g.y;
        }

        if (!g.historyPath) g.historyPath = [];
        g.historyPath.push({ x: g.x, y: g.y });
        if (g.historyPath.length > 8) g.historyPath.shift();
        if (
          !isInvulnerable &&
          dist(g.x, g.y, player.x, player.y) < player.radius + g.radius - 2
        )
          playerTakeDamage(ctx, canvas, changeStateFn);
      }
      // 4. Record Dummy AI
      else if (g.record) {
        let exactIndex = (g.timer || 0) * (g.speedRate || 1.0);
        let idx = isNaN(exactIndex) ? 0 : Math.floor(exactIndex);
        if (idx < g.record.length) {
          activeGhosts++;
          if (g.isStunned > 0) g.isStunned--;
          else {
            let action1 = g.record[idx];
            if (idx + 1 < g.record.length) {
              let action2 = g.record[idx + 1];
              let angleToPlayer = Math.atan2(player.y - g.y, player.x - g.x);
              let chaseSpeed =
                g.isDummy || g.record.length === 5000 ? 4.5 : 1.5;
              g.x +=
                (action2[0] -
                  action1[0] +
                  Math.cos(angleToPlayer) * chaseSpeed) *
                (g.speedRate || 1.0);
              g.y +=
                (action2[1] -
                  action1[1] +
                  Math.sin(angleToPlayer) * chaseSpeed) *
                (g.speedRate || 1.0);
            } else {
              let angleToPlayer = Math.atan2(player.y - g.y, player.x - g.x);
              let chaseSpeed =
                g.isDummy || g.record.length === 5000 ? 4.5 : 2.5;
              g.x +=
                Math.cos(angleToPlayer) * chaseSpeed * (g.speedRate || 1.0);
              g.y +=
                Math.sin(angleToPlayer) * chaseSpeed * (g.speedRate || 1.0);
            }

            if (!g.historyPath) g.historyPath = [];
            g.historyPath.push({ x: g.x, y: g.y });
            if (g.historyPath.length > 8) g.historyPath.shift();

            if (g.lastIdx !== idx && action1.length === 4)
              spawnBullet(g.x, g.y, player.x, player.y, false, 0, "ghost");
            g.lastIdx = idx;

            if (
              !isInvulnerable &&
              dist(g.x, g.y, player.x, player.y) < player.radius + g.radius - 2
            )
              playerTakeDamage(ctx, canvas, changeStateFn);
            g.timer = (g.timer || 0) + 1;
          }
        } else {
          if (g.historyPath && g.historyPath.length > 0) g.historyPath.shift();
          else state.ghosts.splice(i, 1);
        }
      } else {
        if (
          !g.isHorde &&
          !g.isMiniBoss &&
          (!g.historyPath || g.historyPath.length === 0)
        )
          state.ghosts.splice(i, 1);
      }
    } else {
      if (g.x > 0) activeGhosts++;
    }
  }
// THÊM ĐIỀU KIỆN: Chỉ spawn khi KHÔNG ở level Boss và KHÔNG ở Boss Arena
  if (!state.isBossLevel && !state.bossArenaMode && state.frameCount % 180 === 0) {
    const existingElements = new Set(
      state.elementalEnemies.map((e) => e.element),
    );

    const missing = ELEMENTS.filter((el) => !existingElements.has(el));

    // nếu thiếu element thì spawn
    if (missing.length > 0) {
      const element = missing[Math.floor(Math.random() * missing.length)];

      spawnElementalEnemy(
        state.player.x + (Math.random() - 0.5) * 800,
        state.player.y + (Math.random() - 0.5) * 800,
        element, // 👈 truyền element vào
      );
    }
  }
  // --- 8. MÔI TRƯỜNG & TƯƠNG TÁC (Hazards, Safe Zones, Warnings) ---
  // Hazards
  if (state.hazards) {
    state.hazards = state.hazards.filter((h) => {
      h.life--;
      // Hazard nở to (Vòng lửa)
      if (h.expanding && h.radius < h.targetRadius) {
        h.radius +=
          (h.targetRadius - h.radius) * (h.type === "fire_ring" ? 0.08 : 0.15);
        if (Math.abs(h.targetRadius - h.radius) < 1) {
          h.radius = h.targetRadius;
          h.expanding = false;
        }
      }

      // Boss gây sát thương & debuff người chơi
      if (h.owner === "boss" && h.active) {
        const d = dist(player.x, player.y, h.x, h.y);
        let isColliding =
          h.type === "fire_ring"
            ? Math.abs(d - h.radius) < 20 + player.radius
            : d < h.radius + player.radius;

        if (isColliding) {
          if (h.type === "vortex") {
            const angle = Math.atan2(h.y - player.y, h.x - player.x);
            player.x += Math.cos(angle) * 2;
            player.y += Math.sin(angle) * 2;
          }
          if (!isInvulnerable) {
            if (h.type === "fire" || h.type === "fire_ring")
              state.playerStatus.burnTimer = 30;
            if (h.type === "frost") state.playerStatus.slowTimer = 30;
            if (h.type === "static") state.playerStatus.stunTimer = 10;
          }
          if (h.firstEnterTime === 0) h.firstEnterTime = state.frameCount;
          if (state.frameCount - h.firstEnterTime >= 6) {
            if (state.frameCount - (player.lastHazardDamageTime || 0) >= 30) {
              playerTakeDamage(ctx, canvas, changeStateFn, h.damage || 0.5);
              player.lastHazardDamageTime = state.frameCount;
            }
          }
        } else {
          h.firstEnterTime = 0;
        }
      }

      // Player gây sát thương quái
      if (h.owner === "player") {
        state.ghosts.forEach((g) => {
          if (dist(h.x, h.y, g.x, g.y) < h.radius) {
            if (h.type === "fire") {
              g.hp -= 0.05;
              g.isStunned = Math.max(g.isStunned, 60);
            }
            if (h.type === "frost") {
              g.isStunned = Math.max(g.isStunned, 60);
            }
            if (h.type === "rock") {
              g.hp -= 0.03;
              g.isStunned = 20;
            }
            if (h.type === "static") {
              g.hp -= 0.1;
              g.isStunned = 20;
            }
          }
        });
        if (
          state.boss &&
          dist(h.x, h.y, state.boss.x, state.boss.y) < h.radius
        ) {
          if (h.type === "fire") state.boss.hp -= 0.03;
          if (h.type === "rock") state.boss.hp -= 0.02;
          if (h.type === "static") state.boss.hp -= 0.05;
        }
      }
      return h.life > 0;
    });
  }

  // Global Hazards (Bão tuyết, bão sấm) — chỉ active khi boss đã kích hoạt ultimate
  if (state.globalHazard && state.globalHazard.active) {
    state.globalHazard.timer--;
    // Grace period 90 frame sau khi ultimate kích hoạt để player kịp vào SafeZone
    const gracePeriod = state.globalHazard.graceTimer > 0;
    if (state.globalHazard.graceTimer > 0) state.globalHazard.graceTimer--;

    let inSafeZone = false;
    for (let sz of state.safeZones || []) {
      if (dist(player.x, player.y, sz.x, sz.y) < sz.radius) {
        inSafeZone = true;
        break;
      }
    }
    if (!inSafeZone && !gracePeriod) {
      if (state.frameCount % 20 === 0)
        playerTakeDamage(
          ctx,
          canvas,
          changeStateFn,
          state.globalHazard.damage || 0.5,
        );
      if (state.globalHazard.type === "ice") {
        state.playerStatus.slowTimer = 5;
        player.cooldown += 0.5;
      } else if (state.globalHazard.type === "wind") {
        const windAngle = state.frameCount * 0.05;
        player.x += Math.cos(windAngle) * 5;
        player.y += Math.sin(windAngle) * 5;
      } else if (
        state.globalHazard.type === "electric" &&
        state.frameCount % 5 === 0
      ) {
        if (!state.particles) state.particles = [];
        state.particles.push({
          x: player.x + (Math.random() - 0.5) * 100,
          y: player.y + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 20,
          color: "#00ffff",
          size: 1 + Math.random() * 2,
        });
      }
    }
    if (state.globalHazard.timer <= 0) state.globalHazard.active = false;
  }

  // Ground Warnings
  if (state.groundWarnings) {
    state.groundWarnings = state.groundWarnings.filter((w) => {
      w.timer--;
      return w.timer > 0;
    });
  }

  // Safe Zones
  for (let sz of state.safeZones || []) {
    if (sz.vx) sz.x += sz.vx;
    if (sz.vy) sz.y += sz.vy;
    if (sz.x < 50 || sz.x > 750) sz.vx *= -1;
    if (sz.y < 50 || sz.y > 550) sz.vy *= -1;
    if (sz.shrinking) {
      sz.radius = Math.max(20, sz.radius - 0.05);
      if (sz.radius < 50)
        sz.pulse = (Math.sin(state.frameCount * 0.2) + 1) * 0.5;
    }
  }

  // --- 9. CÁC HÀM UPDATE RỜI RẠC & UI ---
  updateCapturePoints(ctx, canvas, changeStateFn);
  updateItems(changeStateFn);
  updateStagePortal();
  updateCrates();
  updatePlayerBuffs();
  updateSatelliteDrone();
  updateGodMode();
  updateFloatingTexts();

  // Tick Status: Screen Shake, Burn (Thực thi damage ở đây), delayed tasks
  if (state.screenShake?.timer > 0) state.screenShake.timer--;
  if (state.playerStatus?.burnTimer > 0) {
    if (state.frameCount % 30 === 0 && !isInvulnerable) {
      player.hp -= 0.2;
      updateHealthUI();
    }
  }
  if (state.delayedTasks) {
    for (let i = state.delayedTasks.length - 1; i >= 0; i--) {
      state.delayedTasks[i].delay--;
      if (state.delayedTasks[i].delay <= 0) {
        try {
          state.delayedTasks[i].action();
        } catch (e) {
          console.warn("delayedTask error:", e);
        }
        state.delayedTasks.splice(i, 1);
      }
    }
  }
  if (state.particles) {
    state.particles = state.particles.filter((p) => {
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      p.life--;
      return p.life > 0;
    });
  }

  // Cập nhật UI Text
  UI.ghosts.innerText = state.isBossLevel
    ? boss?.ghostsActive
      ? `Quái đợt này: ${activeGhosts}`
      : `Boss triệu hồi (${Math.ceil(boss?.summonCooldown / FPS || 0)}s)...`
    : `Quái: ${activeGhosts}`;
  document.getElementById("coins-count").innerText =
    `Tiền: ${state.player?.coins || 0}`;

  // Kiểm tra qua màn: player bước vào cổng dịch chuyển
  if (!state.isBossLevel && state.stagePortal?.active) {
    if (
      dist(player.x, player.y, state.stagePortal.x, state.stagePortal.y) <
      state.stagePortal.radius
    ) {
      startBossFight();
    }
  }

  // Timer
  state.frameCount++;
  if (!state.isBossLevel && state.frameCount % FPS === 0) {
    state.scoreTime++;
    let maxMins = Math.floor(state.maxFramesToSurvive / FPS / 60)
      .toString()
      .padStart(2, "0");
    let maxSecs = Math.floor((state.maxFramesToSurvive / FPS) % 60)
      .toString()
      .padStart(2, "0");
    let mins = Math.floor(state.scoreTime / 60)
      .toString()
      .padStart(2, "0");
    let secs = (state.scoreTime % 60).toString().padStart(2, "0");
    UI.timer.innerText = `${mins}:${secs} / ${maxMins}:${maxSecs}`;
  }
  // Puzzle chỉ update khi KHÔNG ở boss arena
  if (!state.isBossLevel && !state.bossArenaMode) {
    updatePuzzle(ctx);
  }

  return null;
}

// ==========================================
// CÁC HÀM TIỆN ÍCH CỦA GAME (Không phụ thuộc Nhân vật)
// ==========================================

function updateFloatingTexts() {
  if (!state.floatingTexts) state.floatingTexts = [];
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    let t = state.floatingTexts[i];
    t.y -= 1;
    t.life--;
    if (t.life < 20) t.opacity -= 0.05;
    if (t.life <= 0) state.floatingTexts.splice(i, 1);
  }
}

function updatePlayerBuffs() {
  const activeBuffs = state.activePlayerBuffs || [];
  for (let i = activeBuffs.length - 1; i >= 0; i--) {
    let buff = activeBuffs[i];
    buff.timer--;
    if (
      buff.type === "HP_REGEN" &&
      buff.timer % (5 * FPS) === 0 &&
      buff.timer > 0
    ) {
      if (state.player.hp < state.player.maxHp) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
        updateHealthUI();
      }
    }
    if (buff.timer <= 0) activeBuffs.splice(i, 1);
  }
}

function updateCrates() {
  if (state.isBossLevel || !state.crates) return;
  if (state.crates.length <= 3 && state.frameCount % 120 === 0) spawnCrate();
}

function updateCapturePoints(ctx, canvas, changeStateFn) {
  if (!state.capturePoints) return;
  state.capturePoints.forEach((cp) => {
    if (cp.state === "completed") return;

    if (cp.state === "guarding") {
      // Tìm boss theo id (đáng tin cậy hơn), fallback theo vị trí nhưng bán kính lớn hơn
      const bossAlive = state.ghosts.find(
        (g) => g.id === cp.miniBossId && g.hp > 0,
      );
      if (!bossAlive) {
        cp.state = "charging";
        state.floatingTexts.push({
          x: cp.x,
          y: cp.y - 120,
          text: "BOSS ĐÃ CHẾT! HÃY CHIẾM ĐÓNG!",
          color: "#FFD700",
          life: 120,
          opacity: 1,
        });
      }
      return;
    }

    if (cp.state === "charging") {
      const d = dist(state.player.x, state.player.y, cp.x, cp.y);
      const isInside = d < cp.radius;

      if (isInside) {
        cp.progress = Math.min(cp.totalProgress, cp.progress + 0.15);
        state.playerStatus.slowTimer = Math.max(
          state.playerStatus.slowTimer || 0,
          5,
        );
        const ratio = Math.max(0, Math.min(1, cp.progress / cp.totalProgress));
        cp.radius = Math.max(
          cp.minRadius,
          cp.maxRadius - (cp.maxRadius - cp.minRadius) * ratio,
        );

        if (state.frameCount - (cp.lastGhostAttractTime || 0) > 120) {
          state.ghosts.forEach((g) => {
            if (g.x > 0 && dist(g.x, g.y, cp.x, cp.y) < 1500) {
              g.targetX = state.player.x;
              g.targetY = state.player.y;
            }
          });
          cp.lastGhostAttractTime = state.frameCount;
        }
      } else {
        cp.progress = Math.max(0, cp.progress - 0.45);
        cp.radius = Math.min(cp.maxRadius, cp.radius + 1);
      }

      if (state.frameCount - cp.lastPulseTime > 180) {
        cp.lastPulseTime = state.frameCount;
        state.ghosts.forEach((g) => {
          if (
            dist(g.x, g.y, cp.x, cp.y) < cp.radius * 2 &&
            !g.isMiniBoss &&
            !g.isSubBoss
          ) {
            const dx = g.x - cp.x;
            const dy = g.y - cp.y;
            const len = Math.hypot(dx, dy) || 1;
            g.x += (dx / len) * 150;
            g.y += (dy / len) * 150;
            g.isStunned = Math.max(g.isStunned, 30);
          }
        });
      }

      cp.laserAngle = (cp.laserAngle || 0) + 0.02;
      const playerAngle = Math.atan2(
        state.player.y - cp.y,
        state.player.x - cp.x,
      );
      let angleDiff = Math.abs(playerAngle - cp.laserAngle);
      while (angleDiff > Math.PI * 2) angleDiff -= Math.PI * 2;
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      if (angleDiff < 0.1 && d < cp.radius && !state.godMode?.active) {
        playerTakeDamage(ctx, canvas, changeStateFn, 0.5);
      }

      if (cp.progress >= cp.totalProgress) {
        cp.state = "completed";
        cp.progress = cp.totalProgress;
        state.screenShake = { timer: 50, intensity: 20 };
        state.nukeFlash = 20;
        if (!state.permanentScars) state.permanentScars = [];
        state.permanentScars.push({
          x: cp.x,
          y: cp.y,
          radius: cp.maxRadius * 0.85,
        });
        spawnCrystal(cp.x, cp.y, cp.rewardType);
        state.floatingTexts.push({
          x: cp.x,
          y: cp.y - 150,
          text: "CHIẾM ĐÓNG THÀNH CÔNG!",
          color: "#00FFDD",
          size: 36,
          life: 200,
          opacity: 1,
        });
        // Dọn sạch miniBoss liên quan (phòng trường hợp còn sót)
        const bossIdx = state.ghosts.findIndex((g) => g.id === cp.miniBossId);
        if (bossIdx !== -1) state.ghosts.splice(bossIdx, 1);
      }

      if (isInside && state.frameCount % 120 === 0) {
        for (let i = 0; i < 2 + Math.floor(state.currentLevel / 3); i++) {
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnDist = cp.radius + 200;
          state.ghosts.push({
            id: `horde_${Date.now()}_${i}`,
            x: cp.x + Math.cos(spawnAngle) * spawnDist,
            y: cp.y + Math.sin(spawnAngle) * spawnDist,
            radius: 12,
            hp: 20 + state.currentLevel * 5,
            maxHp: 20 + state.currentLevel * 5,
            speed: 1.5 + Math.random() * 0.5,
            isHorde: true,
            isStunned: 0,
            historyPath: [],
          });
        }
      }
    }
  });
}

function updateItems(changeStateFn) {
  if (!state.items) return;
  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i];
    item.life--;
    if (
      dist(state.player.x, state.player.y, item.x, item.y) <
      state.player.radius + item.radius
    ) {
      applyCaptureReward(item.rewardType);
      state.items.splice(i, 1);
      continue;
    }
    if (item.life <= 0) state.items.splice(i, 1);
  }
}

function updateSatelliteDrone() {
  const d = state.satelliteDrone;
  if (!d) return;
  d.timer--;
  if (d.timer <= 0) {
    state.satelliteDrone = null;
    return;
  }
  d.angle += d.orbitSpeed;
  d.x = state.player.x + Math.cos(d.angle) * d.orbitRadius;
  d.y = state.player.y + Math.sin(d.angle) * d.orbitRadius;
  if (state.frameCount % 20 === 0) {
    let nearest = null;
    let minDist = 400;
    state.ghosts.forEach((g) => {
      if (g.x > 0 && g.hp > 0 && dist(d.x, d.y, g.x, g.y) < minDist) {
        minDist = dist(d.x, d.y, g.x, g.y);
        nearest = g;
      }
    });
    if (nearest) spawnBullet(d.x, d.y, nearest.x, nearest.y, true);
  }
}

function updateGodMode() {
  const gm = state.godMode;
  if (!gm || !gm.active) return;
  gm.timer--;
  state.ghosts.forEach((g) => {
    if (
      g.x > 0 &&
      dist(state.player.x, state.player.y, g.x, g.y) <
        state.player.radius + g.radius
    ) {
      if (g.isMiniBoss || g.isSubBoss) {
        if (g.shieldActive) {
          g.shield = 0;
          g.shieldActive = false;
          g.isStunned = 60;
        }
        if (state.frameCount % 30 === 0) g.hp -= g.maxHp * 0.15;
      } else g.hp = 0;
    }
  });
  if (gm.timer <= 0) {
    gm.active = false;
    state.player.speed = gm.prevSpeed;
    state.player.radius = gm.prevRadius;
    state.godMode = null;
  }
}

// ===== CỔNG DỊCH CHUYỂN =====
function updateStagePortal() {
  if (state.isBossLevel) return;

  // Kích hoạt cổng khi đủ 3 điều kiện
  if (!state.stagePortal?.active) {
    const puzzleSolved = state.currentPuzzle?.solved === true;
    const swarmsDone =
      state.swarmZones?.length > 0 &&
      state.swarmZones.every((z) => z.isCompleted);
    const specialsDone =
      (state.capturePoints?.filter((cp) => cp.state === "completed").length ||
        0) >= 2;

    if (puzzleSolved && swarmsDone && specialsDone) {
      state.stagePortal = {
        x: state.world.width / 2 + (Math.random() - 0.5) * 400,
        y: state.world.height / 2 + (Math.random() - 0.5) * 400,
        radius: 65,
        active: true,
        pulse: 0,
      };
      state.floatingTexts.push({
        x: state.world.width / 2,
        y: state.world.height / 2 - 200,
        text: "⚡ CỔNG BOSS ĐÃ MỞ! ⚡",
        color: "#cc00ff",
        size: 40,
        life: 300,
        opacity: 1,
      });
      state.screenShake = { timer: 60, intensity: 15 };
    }
    return;
  }

  state.stagePortal.pulse = (state.stagePortal.pulse || 0) + 1;
}
