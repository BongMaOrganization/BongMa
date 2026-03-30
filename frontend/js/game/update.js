import { state } from "../state.js";
import { FPS } from "../config.js";
import { dist } from "../utils.js";
import { UI, updateHealthUI } from "../ui.js";
import { spawnBullet, spawnBossAttack, bossSummonGhosts } from "../entities.js";
import { updateBullets, playerTakeDamage } from "./combat.js";

export function update(ctx, canvas, changeStateFn) {
  let { player, boss, bullets, ghosts, keys, mouse, activeBuffs } = state;

  // Khởi tạo dự phòng nếu buff chưa load kịp
  let buffs = activeBuffs || { q: 0, e: 0, r: 0 };

  // --- ÁP DỤNG BUFF VÀO CHỈ SỐ KỸ NĂNG ---
  let isSpeedsterQ = player.characterId === "speedster" && buffs.q > 0;
  let currentSpeed = player.speed * (isSpeedsterQ ? 1.5 : 1);

  let isSpeedsterE = player.characterId === "speedster" && buffs.e > 0;
  let currentFireRate = isSpeedsterE ? 4 : player.fireRate;

  let isSharpshootE = player.characterId === "sharpshooter" && buffs.e > 0;
  let currentMultiShot = player.multiShot + (isSharpshootE ? 3 : 0);

  let isSharpshootQ = player.characterId === "sharpshooter" && buffs.q > 0;
  let currentBounces = (player.bounces || 0) + (isSharpshootQ ? 2 : 0);

  let isTimeFrozen = player.characterId === "mage" && buffs.r > 0;

  // --- Grace period & dash cooldown ---
  if (player.gracePeriod > 0) player.gracePeriod--;
  if (player.dashCooldownTimer > 0) player.dashCooldownTimer--;

  // --- Shield regen ---
  if (player.shield < player.maxShield) {
    if (player.shieldRegenTimer > 0) player.shieldRegenTimer--;
    else {
      player.shield = player.maxShield;
      updateHealthUI();
    }
  }

  // --- Dash UI ---
  if (player.dashCooldownTimer <= 0) {
    UI.dash.innerText = "Lướt: SẴN SÀNG";
    UI.dash.style.color = "#00ffcc";
  } else {
    UI.dash.innerText = `Lướt: ${(player.dashCooldownTimer / 60).toFixed(1)}s`;
    UI.dash.style.color = "#888";
  }

  // --- Movement input ---
  let dx = 0,
    dy = 0;
  if (keys["w"] || keys["arrowup"]) dy -= 1;
  if (keys["s"] || keys["arrowdown"]) dy += 1;
  if (keys["a"] || keys["arrowleft"]) dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;

  if (dx !== 0 && dy !== 0) {
    let len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // --- Dash activation ---
  if (
    keys["space"] &&
    player.dashCooldownTimer <= 0 &&
    player.dashTimeLeft <= 0 &&
    (dx !== 0 || dy !== 0)
  ) {
    player.dashTimeLeft = 12;
    player.dashCooldownTimer = player.dashMaxCooldown;
    player.dashDx = dx;
    player.dashDy = dy;
  }

  // --- Apply movement (Sử dụng currentSpeed đã tính buff) ---
  if (player.dashTimeLeft > 0) {
    player.x += player.dashDx * (currentSpeed * 3);
    player.y += player.dashDy * (currentSpeed * 3);
    if (player.dashEffect) player.dashEffect(); // Trigger sát thương dash
    player.dashTimeLeft--;
  } else {
    player.x += dx * currentSpeed;
    player.y += dy * currentSpeed;
  }

  // Clamp vào canvas
  player.x = Math.max(
    player.radius,
    Math.min(canvas.width - player.radius, player.x),
  );
  player.y = Math.max(
    player.radius,
    Math.min(canvas.height - player.radius, player.y),
  );

  // --- Shooting ---
  let shotThisFrame = false;
  let targetX = 0,
    targetY = 0;
  if (player.cooldown > 0) player.cooldown--;

  if (
    (mouse.clicked || mouse.isDown) &&
    player.cooldown <= 0 &&
    player.dashTimeLeft <= 0
  ) {
    // Tạm thời override stat để áp dụng buff bắn nhiều đạn / nảy tường cho function spawnBullet
    let originalMulti = state.player.multiShot;
    let originalBounce = state.player.bounces;
    state.player.multiShot = currentMultiShot;
    state.player.bounces = currentBounces;

    spawnBullet(player.x, player.y, mouse.x, mouse.y, true);

    state.player.multiShot = originalMulti;
    state.player.bounces = originalBounce;

    player.cooldown = currentFireRate;
    shotThisFrame = true;
    targetX = mouse.x;
    targetY = mouse.y;
  }
  mouse.clicked = false;

  // Ghi record
  if (!state.isBossLevel) {
    let frameData = [Math.round(player.x), Math.round(player.y)];
    if (shotThisFrame) frameData.push(Math.round(targetX), Math.round(targetY));
    state.currentRunRecord.push(frameData);
  }

  let isInvulnSkill =
    buffs.e > 0 &&
    (player.characterId === "tank" || player.characterId === "ghost");
  let isInvulnerable =
    player.gracePeriod > 0 || player.dashTimeLeft > 0 || isInvulnSkill;

  // --- Boss logic ---
  if (!isTimeFrozen) {
    if (boss) {
      spawnBossAttack();
      if (!boss.ghostsActive) {
        if (boss.summonCooldown > 0) boss.summonCooldown--;
        if (boss.summonCooldown <= 0) {
          bossSummonGhosts();
          boss.ghostsActive = true;
          ghosts = state.ghosts;
        }
      } else {
        if (ghosts.length === 0) {
          boss.ghostsActive = false;
          boss.summonCooldown = 10 * FPS;
        }
      }
      if (
        !isInvulnerable &&
        dist(boss.x, boss.y, player.x, player.y) < boss.radius + player.radius
      ) {
        playerTakeDamage(ctx, canvas, changeStateFn);
      }
    }
  }

  // --- Bullet update & collision ---
  updateBullets(ctx, canvas, changeStateFn, isTimeFrozen);

  if (state._bossKilled) {
    state._bossKilled = false;
    return "BOSS_KILLED";
  }

  // --- Ghost update ---
  let activeGhosts = 0;
  for (let g of state.ghosts) {
    if (!isTimeFrozen) {
      let exactIndex = g.timer * g.speedRate;
      let idx1 = Math.floor(exactIndex);

      if (idx1 < g.record.length) {
        activeGhosts++;
        if (g.isStunned > 0) {
          g.isStunned--;
        } else {
          let prevX = g.x,
            prevY = g.y;
          let action1 = g.record[idx1];

          if (idx1 + 1 < g.record.length) {
            let action2 = g.record[idx1 + 1];
            let t = exactIndex - idx1;
            g.x = action1[0] + (action2[0] - action1[0]) * t;
            g.y = action1[1] + (action2[1] - action1[1]) * t;
          } else {
            g.x = action1[0];
            g.y = action1[1];
          }

          g.historyPath.push({ x: g.x, y: g.y });
          if (g.historyPath.length > 8) g.historyPath.shift();

          if (g.lastIdx !== idx1 && action1.length === 4) {
            spawnBullet(g.x, g.y, action1[2], action1[3], false, 0, "ghost");
          }
          g.lastIdx = idx1;

          let ghostIsDashing = dist(g.x, g.y, prevX, prevY) > 8 * g.speedRate;
          if (
            !isInvulnerable &&
            !ghostIsDashing &&
            dist(g.x, g.y, player.x, player.y) < player.radius + g.radius - 2
          ) {
            playerTakeDamage(ctx, canvas, changeStateFn);
          }
        }
      } else {
        g.historyPath.shift();
        g.x = -100;
        g.y = -100;
      }
      g.timer++;
    } else {
      if (g.x > 0) activeGhosts++;
    }
  }

  if (state.isBossLevel) {
    UI.ghosts.innerText = boss?.ghostsActive
      ? `Quái đợt này: ${activeGhosts}`
      : `Boss triệu hồi (${Math.ceil(boss.summonCooldown / FPS)}s)...`;
  } else {
    UI.ghosts.innerText = `Quái: ${activeGhosts}`;
  }

  document.getElementById("coins-count").innerText =
    `Tiền: ${state.player?.coins || 0}`;

  if (!state.isBossLevel && state.frameCount >= state.maxFramesToSurvive) {
    return "STAGE_CLEAR";
  }

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

  return null;
}
