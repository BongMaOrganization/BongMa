import { state } from "../state.js";
import { FPS } from "../config.js";
import { dist } from "../utils.js";
import { updateActiveCharacter } from "../characters/characterRegistry.js";
import { updateBullets, playerTakeDamage, addExperience } from "./combat.js";
import { spawnBullet } from "../entities/helpers.js";
import { updateBoss } from "../entities/bosses/boss_manager.js";

export function update(ctx, canvas, changeStateFn) {
  const { player, boss, keys, mouse, activeBuffs } = state;
  const buffs = activeBuffs || { q: 0, e: 0, r: 0 };

  // --- 1. Quản lý Camera & Boundaries ---
  state.camera.width = canvas.width;
  state.camera.height = canvas.height;
  if (player && player.hp > 0) {
    state.camera.x = player.x - canvas.width / 2;
    state.camera.y = player.y - canvas.height / 2;
    state.camera.x = Math.max(0, Math.min(state.camera.x, state.world.width - canvas.width));
    state.camera.y = Math.max(0, Math.min(state.camera.y, state.world.height - canvas.height));
    state.mouse.x = (state.mouse.screenX || 0) + state.camera.x;
    state.mouse.y = (state.mouse.screenY || 0) + state.camera.y;
  }

  // --- 2. Reset Modifiers Mỗi Frame (Cực kỳ quan trọng) ---
  // Các file nhân vật sẽ thay đổi các biến này trong hàm update của chúng
  state.playerSpeedMultiplier = 1;
  state.playerFireRateMultiplier = 1;
  state.playerMultiShotModifier = player.multiShot || 1;
  state.playerBouncesModifier = player.bounces || 0;
  state.playerCanShootModifier = true;
  state.timeFrozenModifier = false;

  // Reset các flag kỹ năng đặc biệt
  state.assassinE_Active = false;
  state.sniperQ_Active = false;
  state.scoutQ_Active = false;
  state.frostR_Active = false;

  // --- 3. GỌI LOGIC NHÂN VẬT (Từ Registry) ---
  // Hàm này sẽ chạy logic trong các file nhỏ (VD: frost.js, assassin.js)
  // Các file đó sẽ set các giá trị Multiplier ở trên.
  updateActiveCharacter(state, ctx, canvas, buffs, changeStateFn);

  // --- 4. Tính toán chỉ số cuối cùng sau khi nhân vật đã can thiệp ---
  let currentSpeed = player.speed * state.playerSpeedMultiplier;
  let currentFireRate = Math.max(2, (player.fireRate || 10) * state.playerFireRateMultiplier);
  let currentMultiShot = state.playerMultiShotModifier;
  let currentBounces = state.playerBouncesModifier;

  // Xử lý di chuyển
  let dx = 0, dy = 0;
  if (keys["w"] || keys["arrowup"]) dy -= 1;
  if (keys["s"] || keys["arrowdown"]) dy += 1;
  if (keys["a"] || keys["arrowleft"]) dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;

  if (dx !== 0 && dy !== 0) {
    let len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
  }

  // Xử lý Dash & Di chuyển
  if (keys["space"] && player.dashCooldownTimer <= 0 && player.dashTimeLeft <= 0 && (dx !== 0 || dy !== 0)) {
    player.dashTimeLeft = 12;
    player.dashCooldownTimer = player.dashMaxCooldown || 60;
    player.dashDx = dx; player.dashDy = dy;
  }

  if (player.dashTimeLeft > 0) {
    player.x += player.dashDx * (currentSpeed * 3);
    player.y += player.dashDy * (currentSpeed * 3);
    player.dashTimeLeft--;
    player.isInvincible = true;
  } else {
    player.x += dx * currentSpeed;
    player.y += dy * currentSpeed;
    player.isInvincible = false;
  }

  // Giới hạn trong map
  player.x = Math.max(player.radius, Math.min(state.world.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(state.world.height - player.radius, player.y));

  // --- 5. Hệ thống Bắn súng (Dùng chung cho các nhân vật) ---
  if (player.cooldown > 0) player.cooldown--;

  if ((mouse.clicked || mouse.isDown) && player.cooldown <= 0 && state.playerCanShootModifier && player.dashTimeLeft <= 0) {
    const count = currentMultiShot;
    const spread = 0.15;
    const baseAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    const startAngle = baseAngle - (spread * (count - 1)) / 2;

    const oldBulletCount = state.bullets.length;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * spread;
      spawnBullet(player.x, player.y, player.x + Math.cos(angle) * 100, player.y + Math.sin(angle) * 100, true);
    }

    // Áp dụng các hiệu ứng đặc biệt lên đạn vừa bắn (từ Sniper, Assassin...)
    for (let i = oldBulletCount; i < state.bullets.length; i++) {
      let b = state.bullets[i];
      b.bounces = currentBounces;
      if (state.sniperQ_Active) { b.damage *= 3; b.style = 1; b.radius = 8; }
      if (state.assassinE_Active) { b.damage *= 2; b.radius = 8; }
    }

    player.cooldown = currentFireRate;
  }
  mouse.clicked = false;

  // --- 6. Cập nhật Entities ---
  updateBullets(ctx, canvas, changeStateFn, state.timeFrozenModifier);
  if (boss) {
    updateBoss(boss);
    if (state._bossKilled) {
      state._bossKilled = false;
      return "BOSS_KILLED";
    }
  }

  state.ghosts.forEach((g) => {
    if (!state.timeFrozenModifier && g.hp > 0 && g.isStunned <= 0) {
      let angle = Math.atan2(player.y - g.y, player.x - g.x);
      g.x += Math.cos(angle) * (g.speed || 1.5);
      g.y += Math.sin(angle) * (g.speed || 1.5);

      if (dist(player.x, player.y, g.x, g.y) < player.radius + g.radius) {
        playerTakeDamage(ctx, canvas, changeStateFn);
      }
    }
    if (g.isStunned > 0) g.isStunned--;
  });

  // --- 7. Điều kiện thắng ---
  if (!state.isBossLevel) {
    let allZonesCleared = state.swarmZones.every(zone => zone.isCompleted);
    if (allZonesCleared && state.swarmZones.length > 0) return "STAGE_CLEAR";
  }

  // --- 8. Timers (gracePeriod, debuffs) ---
  if (player.gracePeriod > 0) player.gracePeriod--;
  if (state.playerStatus) {
    if (state.playerStatus.slowTimer > 0) state.playerStatus.slowTimer--;
    if (state.playerStatus.stunTimer > 0) state.playerStatus.stunTimer--;
    if (state.playerStatus.burnTimer > 0) {
      state.playerStatus.burnTimer--;
      if (state.frameCount % 60 === 0)
        playerTakeDamage(ctx, canvas, changeStateFn, 0.5);
    }
  }

  // --- 9. Delayed Tasks ---
  for (let i = state.delayedTasks.length - 1; i >= 0; i--) {
    state.delayedTasks[i].delay--;
    if (state.delayedTasks[i].delay <= 0) {
      try { state.delayedTasks[i].action(); } catch(e) { console.warn("delayedTask error:", e); }
      state.delayedTasks.splice(i, 1);
    }
  }

  // --- 10. Hazard Update (life, movement, damage player) ---
  if (state.hazards) {
    for (let i = state.hazards.length - 1; i >= 0; i--) {
      const h = state.hazards[i];
      h.life--;
      if (h.life <= 0) { state.hazards.splice(i, 1); continue; }

      if (h.vx) h.x += h.vx;
      if (h.vy) h.y += h.vy;

      // Vortex hút player
      if (h.type === "vortex") {
        const dvx = h.x - player.x, dvy = h.y - player.y;
        const dv = Math.sqrt(dvx * dvx + dvy * dvy);
        if (dv > 0 && dv < h.radius * 1.5) {
          player.x += (dvx / dv) * 1.8;
          player.y += (dvy / dv) * 1.8;
        }
      }

      // Damage player nếu trong vùng nguy hiểm (chủ boss)
      if (h.owner === "boss" && h.active !== false && h.type !== "rock") {
        if (dist(player.x, player.y, h.x, h.y) < player.radius + h.radius) {
          playerTakeDamage(ctx, canvas, changeStateFn, h.damage || 0.5);
        }
      }
      // Rock: cản chuyển động player
      if (h.type === "rock" && h.active !== false) {
        const dr = dist(player.x, player.y, h.x, h.y);
        if (dr < player.radius + h.radius) {
          const ang = Math.atan2(player.y - h.y, player.x - h.x);
          player.x = h.x + Math.cos(ang) * (player.radius + h.radius + 1);
          player.y = h.y + Math.sin(ang) * (player.radius + h.radius + 1);
        }
      }
    }
  }

  // --- 11. Global Hazard Timer ---
  if (state.globalHazard && state.globalHazard.active) {
    state.globalHazard.timer--;
    if (state.globalHazard.timer <= 0) {
      state.globalHazard.active = false;
      state.globalHazard.type = null;
      if (state.boss) state.boss.ultimatePhase = false;
    } else if (state.frameCount % 90 === 0) {
      playerTakeDamage(ctx, canvas, changeStateFn, state.globalHazard.damage || 0.5);
    }
  }

  // --- 12. Safe Zones Update (di chuyển, hết thời gian) ---
  if (state.safeZones) {
    for (let i = state.safeZones.length - 1; i >= 0; i--) {
      const sz = state.safeZones[i];
      sz.life--;
      if (sz.life <= 0) { state.safeZones.splice(i, 1); continue; }
      sz.x += sz.vx || 0;
      sz.y += sz.vy || 0;
    }
  }

  // --- 13. Ground Warnings Timer ---
  if (state.groundWarnings) {
    for (let i = state.groundWarnings.length - 1; i >= 0; i--) {
      state.groundWarnings[i].timer--;
      if (state.groundWarnings[i].timer <= 0) state.groundWarnings.splice(i, 1);
    }
  }

  state.frameCount++;
  return null;
}