import { state } from "../state.js";
import { FPS } from "../config.js";
import { dist } from "../utils.js";
import { UI, updateHealthUI } from "../ui.js";
import { spawnBullet, updateBoss, bossSummonGhosts } from "../entities.js";
import { updateBullets, playerTakeDamage } from "./combat.js";

export function update(ctx, canvas, changeStateFn) {
  let { player, boss, bullets, ghosts, keys, mouse, activeBuffs, delayedTasks } = state;

  // Xử lý các tác vụ trì hoãn (thay thế setTimeout)
  if (delayedTasks && delayedTasks.length > 0) {
    for (let i = delayedTasks.length - 1; i >= 0; i--) {
      let task = delayedTasks[i];
      task.delay--;
      if (task.delay <= 0) {
        task.action();
        delayedTasks.splice(i, 1);
      }
    }
  }

  let buffs = activeBuffs || { q: 0, e: 0, r: 0 };

  // ===== TẤT CẢ BUFF FLAGS =====
  let isBerserkerQ = player.characterId === "berserker" && buffs.q > 0;
  let isBerserkerR = player.characterId === "berserker" && buffs.r > 0;
  let isAssassinE = player.characterId === "assassin" && buffs.e > 0;
  let isSummonerE = player.characterId === "summoner" && buffs.e > 0;
  let isSummonerR = player.characterId === "summoner" && buffs.r > 0;
  let isWardenE = player.characterId === "warden" && buffs.e > 0;
  let isWardenR = player.characterId === "warden" && buffs.r > 0;
  let isAlchemistR = player.characterId === "alchemist" && buffs.r > 0;
  let isEngineerE = player.characterId === "engineer" && buffs.e > 0;
  let isEngineerR = player.characterId === "engineer" && buffs.r > 0;
  let isHunterE = player.characterId === "hunter" && buffs.e > 0;
  let isFrostQ = player.characterId === "frost" && buffs.q > 0;
  let isFrostR = player.characterId === "frost" && buffs.r > 0;
  let isVoidR = player.characterId === "void" && buffs.r > 0;
  let isStormE = player.characterId === "storm" && buffs.e > 0;
  let isStormR = player.characterId === "storm" && buffs.r > 0;
  let isReaperE = player.characterId === "reaper" && buffs.e > 0;
  let isReaperR = player.characterId === "reaper" && buffs.r > 0;
  let isDruidE = player.characterId === "druid" && buffs.e > 0;
  let isSniperQ = player.characterId === "sniper" && buffs.q > 0;
  let isOracleR = player.characterId === "oracle" && buffs.r > 0;
  let isBrawlerE = player.characterId === "brawler" && buffs.e > 0;
  let isMedicE = player.characterId === "medic" && buffs.e > 0;
  let isScoutR = player.characterId === "scout" && buffs.r > 0;
  let isTimekeeperE = player.characterId === "timekeeper" && buffs.e > 0;
  let isTimekeeperR = player.characterId === "timekeeper" && buffs.r > 0;
  let isDestroyerR = player.characterId === "destroyer" && buffs.r > 0;
  let isKnightR = player.characterId === "knight" && buffs.r > 0;
  let isCreatorR = player.characterId === "creator" && buffs.r > 0;

  // --- ÁP DỤNG BUFF VÀO CHỈ SỐ KỸ NĂNG ---
  let isSpeedsterQ = player.characterId === "speedster" && buffs.q > 0;
  let currentSpeed = player.speed * (isSpeedsterQ ? 1.5 : 1);
  if (isBerserkerQ) currentSpeed *= 1.2;
  if (isSniperQ) currentSpeed *= 0.5;
  if (isEngineerE) currentSpeed *= 1.3;
  if (isDruidE) currentSpeed *= 1.3;
  if (isBrawlerE) currentSpeed *= 1.3;
  if (isMedicE) currentSpeed *= 1.2;
  if (isScoutR) currentSpeed *= 1.4;

  // Apply Elemental Debuffs
  let s = state.playerStatus;
  if (s.slowTimer > 0) {
    s.slowTimer--;
    currentSpeed *= 0.5;
  }
  if (s.stunTimer > 0) {
    s.stunTimer--;
    currentSpeed = 0;
  }
  if (s.burnTimer > 0) {
    s.burnTimer--;

    // Check xem có đang trong trạng thái bất tử không
    let isInvincible = player.dashTimeLeft > 0 || player.gracePeriod > 0 ||
      (buffs.e > 0 && ["tank", "knight", "reaper"].includes(player.characterId)) ||
      (buffs.q > 0 && ["warden", "ghost", "assassin", "spirit", "frost"].includes(player.characterId));

    if (state.frameCount % 30 === 0 && !isInvincible) {
      player.hp -= 0.2; // Chỉ trừ máu khi KHÔNG bất tử
      updateHealthUI();
    }
  }

  if (isFrostQ) currentSpeed = 0;
  if (isReaperE) currentSpeed *= 1.5;
  if (isDestroyerR) currentSpeed *= 1.3;

  let isSpeedsterE = player.characterId === "speedster" && buffs.e > 0;
  let currentFireRate = isSpeedsterE ? 4 : player.fireRate;
  if (isStormE) currentFireRate = Math.max(3, player.fireRate * 0.75);
  if (isBerserkerQ) currentFireRate = Math.max(2, player.fireRate * 0.65);
  if (isEngineerE) currentFireRate = Math.max(3, player.fireRate * 0.6);
  if (isScoutR) currentFireRate = Math.max(2, player.fireRate * 0.6);
  if (isKnightR) currentFireRate = Math.max(2, player.fireRate * 0.6);

  let isSharpshootE = player.characterId === "sharpshooter" && buffs.e > 0;
  let currentMultiShot = player.multiShot + (isSharpshootE ? 3 : 0);
  if (isSummonerE) currentMultiShot += 2;
  if (isBerserkerR) currentMultiShot *= 2;

  let isSharpshootQ = player.characterId === "sharpshooter" && buffs.q > 0;
  let currentBounces = (player.bounces || 0) + (isSharpshootQ ? 2 : 0);
  if (isWardenE) currentBounces += 2;

  let isTimeFrozen =
    (player.characterId === "mage" && buffs.r > 0) || isTimekeeperE;

  if (player.gracePeriod > 0) player.gracePeriod--;
  if (player.dashCooldownTimer > 0) player.dashCooldownTimer--;

  // Manage Screen Shake Timer
  if (state.screenShake && state.screenShake.timer > 0) {
    state.screenShake.timer--;
  }

  if (player.shield < player.maxShield) {
    if (player.shieldRegenTimer > 0) player.shieldRegenTimer--;
    else {
      player.shield = player.maxShield;
      updateHealthUI();
    }
  }

  if (player.dashCooldownTimer <= 0) {
    UI.dash.innerText = "Lướt: SẴN SÀNG";
    UI.dash.style.color = "#00ffcc";
  } else {
    UI.dash.innerText = `Lướt: ${(player.dashCooldownTimer / 60).toFixed(1)}s`;
    UI.dash.style.color = "#888";
  }

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

  if (player.dashTimeLeft > 0) {
    player.x += player.dashDx * (currentSpeed * 3);
    player.y += player.dashDy * (currentSpeed * 3);
    if (player.dashEffect) player.dashEffect();
    player.dashTimeLeft--;
    // Dash I-frames: Invincible during first 10 frames of dash
    player.isInvincible = player.dashTimeLeft > 2;
  } else {
    player.x += dx * currentSpeed;
    player.y += dy * currentSpeed;
    player.isInvincible = false;
  }

  // --- Safe Zones Update (Moving/Shrinking) ---
  for (let sz of state.safeZones) {
    if (sz.vx) sz.x += sz.vx;
    if (sz.vy) sz.y += sz.vy;
    // Bounce off walls
    if (sz.x < 50 || sz.x > 750) sz.vx *= -1;
    if (sz.y < 50 || sz.y > 550) sz.vy *= -1;

    if (sz.shrinking) {
      sz.radius = Math.max(20, sz.radius - 0.05);
      if (sz.radius < 50) sz.pulse = (Math.sin(state.frameCount * 0.2) + 1) * 0.5;
    }
  }

  // --- Elemental interactions & Hazards ---
  state.hazards.forEach(h => {
    // Terrain Collision (Earth Spikes/Barriers)
    if (h.type === "rock" && h.active) {
      const dxh = player.x - h.x;
      const dyh = player.y - h.y;
      const d = Math.sqrt(dxh * dxh + dyh * dyh);
      const minDist = player.radius + h.radius;
      if (d < minDist) {
        const angle = Math.atan2(dyh, dxh);
        player.x = h.x + Math.cos(angle) * minDist;
        player.y = h.y + Math.sin(angle) * minDist;
      }
    }
    // Fire melts Ice
    if (h.type === "fire" && dist(player.x, player.y, h.x, h.y) < h.radius + player.radius) {
      if (state.playerStatus && state.playerStatus.freezeTimer > 0) {
        state.playerStatus.freezeTimer = 0;
      }
    }
  });

  player.x = Math.max(
    player.radius,
    Math.min(canvas.width - player.radius, player.x),
  );
  player.y = Math.max(
    player.radius,
    Math.min(canvas.height - player.radius, player.y),
  );

  // --- Terrain Collision (Earth Spikes/Barriers) ---
  state.hazards.forEach(h => {
    if (h.type === "rock" && h.active) {
      const dxh = player.x - h.x;
      const dyh = player.y - h.y;
      const dist = Math.sqrt(dxh * dxh + dyh * dyh);
      const minDist = player.radius + h.radius;
      if (dist < minDist) {
        // Push player out of the rock (Physically blocked)
        const angle = Math.atan2(dyh, dxh);
        player.x = h.x + Math.cos(angle) * minDist;
        player.y = h.y + Math.sin(angle) * minDist;
      }
    }
    // Fire melts Ice:
    if (h.type === "fire" && h.active) {
      const dxh = player.x - h.x;
      const dyh = player.y - h.y;
      const dist = Math.sqrt(dxh * dxh + dyh * dyh);
      if (dist < h.radius + player.radius) {
        if (state.playerStatus.freezeTimer > 0) {
          state.playerStatus.freezeTimer = 0; // Thaw instantly in fire
        }
      }
    }
  });

  // --- Shooting ---
  let shotThisFrame = false;
  let targetX = 0,
    targetY = 0;
  if (player.cooldown > 0) player.cooldown--;

  if (isTimekeeperR) {
    if (player.cooldown > 1) player.cooldown = 1;
  }

  // ❗ Painter không được bắn
  if (player.characterId === "painter") {
    mouse.clicked = true;
  } else if (
    (mouse.clicked || mouse.isDown) &&
    player.cooldown <= 0 &&
    player.dashTimeLeft <= 0 &&
    !isFrostQ &&
    !isReaperE &&
    !isVoidR
  ) {
    let originalMulti = state.player.multiShot;
    let originalBounce = state.player.bounces;
    state.player.multiShot = currentMultiShot;
    state.player.bounces = currentBounces;
    let isDruidR = player.characterId === "druid" && buffs.r > 0;

    if (isAssassinE) {
      state.activeBuffs.e = 0;
      let nearestDist = Infinity;
      let targetObj = null;
      if (boss) {
        nearestDist = dist(player.x, player.y, boss.x, boss.y);
        targetObj = boss;
      }
      state.ghosts.forEach((g) => {
        if (g.x > 0 && g.isStunned <= 0) {
          let d = dist(player.x, player.y, g.x, g.y);
          if (d < nearestDist) {
            nearestDist = d;
            targetObj = g;
          }
        }
      });

      let tx = mouse.x,
        ty = mouse.y;
      if (targetObj) {
        tx = targetObj.x;
        ty = targetObj.y;
      }

      let oldLen = state.bullets.length;
      spawnBullet(player.x, player.y, tx, ty, true);
      for (let i = oldLen; i < state.bullets.length; i++) {
        let b = state.bullets[i];
        b.damage = 2;
        b.radius = 8;
      }
    } else {
      let oldLen = state.bullets.length;
      spawnBullet(player.x, player.y, mouse.x, mouse.y, true);
      if (isSniperQ) {
        for (let i = oldLen; i < state.bullets.length; i++) {
          state.bullets[i].damage = 3;
          state.bullets[i].radius = 6;
          state.bullets[i].style = 1;
        }
      }
    }

    if (isDruidR) {
      let oldLen = state.bullets.length;
      let newLen = state.bullets.length;
      for (let i = 0; i < newLen; i++) {
        let b = state.bullets[i];
        if (b.isSplit || !b.isPlayer) continue;

        for (let j = -1; j <= 1; j += 2) {
          let angle = Math.atan2(b.vy, b.vx) + j * 0.4;
          spawnBullet(
            b.x,
            b.y,
            b.x + Math.cos(angle) * 100,
            b.y + Math.sin(angle) * 100,
            true,
          );
          let newB = state.bullets[state.bullets.length - 1];
          newB.isSplit = true;
          newB.damage = 0.5;
        }
        b.isSplit = true;
      }
    }

    state.player.multiShot = originalMulti;
    state.player.bounces = originalBounce;
    player.cooldown = currentFireRate;
    shotThisFrame = true;
    targetX = mouse.x;
    targetY = mouse.y;
  }
  mouse.clicked = false;

  if (!state.isBossLevel) {
    let frameData = [Math.round(player.x), Math.round(player.y)];
    if (shotThisFrame) frameData.push(Math.round(targetX), Math.round(targetY));
    state.currentRunRecord.push(frameData);
  }

  let isInvulnSkill =
    buffs.e > 0 &&
    (player.characterId === "tank" ||
      player.characterId === "ghost" ||
      player.characterId === "reaper");
  let isInvulnerable =
    player.gracePeriod > 0 ||
    player.dashTimeLeft > 0 ||
    isInvulnSkill ||
    isFrostQ;

  // --- Boss Shield/Stance Logic ---
  if (state.boss && state.boss.shieldActive && state.boss.shield <= 0) {
    state.boss.shieldActive = false;
    state.boss.stunTimer = 180; // Boss bị choáng 3 giây

    // SỬA LỖI ĐÁNH VẦN Ở ĐÂY: Hủy gồng chiêu và xóa UI ngay lập tức
    state.bossSpecial.timer = 0;
    state.bossSpecial.name = "";

    state.screenShake.timer = 30;
    state.screenShake.intensity = 15;
    state.screenShake.type = 'thunder'; // Hiệu ứng vỡ giáp

    // Dọn dẹp các mìn/bẫy đang cast dở
    state.bossBeams = [];
    state.groundWarnings = [];
    state.safeZones = [];
  }

  if (state.boss && state.boss.stunTimer > 0) {
    state.boss.stunTimer--;
    if (state.boss.stunTimer % 20 < 10) {
      state.boss.color = "#ffffff"; // Flash white when stunned
    } else {
      state.boss.color = state.boss.originalColor || "#ff0055";
    }
  }

  // --- Boss Logic ---
  if (state.boss && state.boss.hp > 0) {
    updateBoss(state.boss);
  }
  if (!isTimeFrozen) {
    if (boss) {
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

      // Detect Phase Transition logic for visuals
      const ratio = boss.hp / boss.maxHp;
      let phase = 0;
      if (boss.phaseCount === 3) {
        phase = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;
      } else {
        phase = ratio > 0.5 ? 0 : 1;
      }

      if (state.lastBossPhase !== -1 && state.lastBossPhase !== phase) {
        state.phaseTransitionTimer = 120; // 2 seconds
        state.currentPhaseName = `GIAI ĐOẠN ${phase + 1}`;
      }
      state.lastBossPhase = phase;
    }
  }

  if (state.phaseTransitionTimer > 0) state.phaseTransitionTimer--;

  // ===== HAZARD MANAGEMENT =====
  for (let i = state.hazards.length - 1; i >= 0; i--) {
    const h = state.hazards[i];
    h.life--;

    // Warning transition for rocks
    if (h.type === "rock" && h.life < h.maxLife - 60) h.active = true;

    // Direct collision for damage
    const playerDist = dist(player.x, player.y, h.x, h.y);
    let isColliding = false;

    // SỬA ĐỔI: Va chạm rỗng cho Fire Ring (Sóng Lửa)
    if (h.type === "fire_ring") {
      // Chỉ dính đòn nếu người chơi chạm vào VÀNH của vòng tròn (độ dày vành cỡ 20px)
      if (Math.abs(playerDist - h.radius) < 20 + player.radius) {
        isColliding = true;
      }
    } else {
      // Va chạm đặc cho các bẫy khác
      isColliding = playerDist < player.radius + h.radius;
    }

    if (isColliding) {
      if (h.type === "fire" || h.type === "fire_ring") {
        state.playerStatus.burnTimer = 60; // Refresh burn
      } else if (h.type === "frost") {
        state.playerStatus.slowTimer = 30; // Ground slow
      } else if (h.type === "static") {
        state.playerStatus.stunTimer = 10;
      } else if (h.type === "vortex") {
        // Hút người chơi vào tâm rất mạnh
        const angle = Math.atan2(h.y - player.y, h.x - player.x);
        player.x += Math.cos(angle) * 4;
        player.y += Math.sin(angle) * 4;
      }
    }

    if (h.life <= 0) state.hazards.splice(i, 1);
  }

  // --- Ground Warnings & Safe Zones ---
  for (let i = state.groundWarnings.length - 1; i >= 0; i--) {
    state.groundWarnings[i].timer--;
    if (state.groundWarnings[i].timer <= 0) state.groundWarnings.splice(i, 1);
  }
  for (let i = state.safeZones.length - 1; i >= 0; i--) {
    state.safeZones[i].timer--;
    if (state.safeZones[i].timer <= 0) state.safeZones.splice(i, 1);
  }

  // --- Global Hazard Logic ---
  if (state.globalHazard.active) {
    state.globalHazard.timer--;

    // Check if player is in a safe zone
    let inSafeZone = false;
    for (let sz of state.safeZones) {
      if (dist(player.x, player.y, sz.x, sz.y) < sz.radius) {
        inSafeZone = true;
        break;
      }
    }

    if (!inSafeZone) {
      if (state.frameCount % 20 === 0) {
        playerTakeDamage(ctx, canvas, changeStateFn, state.globalHazard.damage || 0.5);
      }

      // NÂNG CẤP: Khi người chơi đứng ngoài vòng an toàn của Boss Băng
      if (state.globalHazard.type === "ice") {
        state.playerStatus.slowTimer = 5; // Làm chậm di chuyển liên tục
        player.cooldown += 0.5;           // Súng bị đóng băng, tốc độ bắn giảm cực mạnh
      } else if (state.globalHazard.type === "wind") {
        // Gió xoáy đùn người chơi văng lạng lách quanh màn hình
        const windAngle = state.frameCount * 0.05;
        player.x += Math.cos(windAngle) * 5;
        player.y += Math.sin(windAngle) * 5;

        // Kèm thêm lực hút giật ngược vào tâm Boss!
        const dx = boss.x - player.x;
        const dy = boss.y - player.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          player.x += (dx / len) * 3;
          player.y += (dy / len) * 3;
        }
      } else if (state.globalHazard.type === "electric") {
        // Sinh hạt điện li ti quanh người chơi
        if (state.frameCount % 5 === 0) {
          state.particles.push({
            x: player.x + (Math.random() - 0.5) * 100,
            y: player.y + (Math.random() - 0.5) * 100,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 20,
            color: "#00ffff",
            size: 1 + Math.random() * 2
          });
        }
      }
    }

    if (state.globalHazard.timer <= 0) state.globalHazard.active = false;
  }

  // Update Windforce
  if (state.windForce.timer > 0) state.windForce.timer--;

  // ===== SPECIAL EFFECTS =====
  //Painter
  // ===== 🎨 PAINTER DRAW (PAINT STYLE) =====
  if (player.characterId === "painter" && state.painterDrawing) {
    state.painterDrawTime--;

    // 👉 detect bắt đầu giữ chuột
    if (state.mouse.isDown && !state.prevMouseDown) {
      // tạo nét mới
      state.painterTrails.push({
        points: [],
        life: 5 * FPS,
      });
    }

    // 👉 đang giữ chuột → vẽ
    if (state.mouse.isDown) {
      let trail = state.painterTrails[state.painterTrails.length - 1];
      if (!trail) return;

      let last = trail.points[trail.points.length - 1];

      if (!last || dist(last.x, last.y, state.mouse.x, state.mouse.y) > 5) {
        trail.points.push({
          x: state.mouse.x,
          y: state.mouse.y,
        });
      }
    }

    // lưu trạng thái chuột frame trước
    state.prevMouseDown = state.mouse.isDown;

    // hết thời gian thì tắt
    if (state.painterDrawTime <= 0) {
      state.painterDrawing = false;
    }
  }
  if (state.painterBomb) {
    state.painterBomb.life--;

    if (state.painterBomb.life <= 0) {
      let x = state.painterBomb.x;
      let y = state.painterBomb.y;

      // 💥 NỔ NGAY (QUAN TRỌNG)
      state.ghosts.forEach((g) => {
        if (dist(x, y, g.x, g.y) < 120) {
          g.hp -= 2;

          // ❗ stun đúng cách
          g.isStunned = Math.max(g.isStunned, 40);
        }
      });

      if (boss && dist(x, y, boss.x, boss.y) < 120) {
        boss.hp -= 2;
      }

      // 🧹 clear bullet
      state.bullets = state.bullets.filter((b) => dist(b.x, b.y, x, y) > 120);

      // 🎨 tạo zone (damage theo thời gian)
      state.painterZones.push({
        x,
        y,
        radius: 60,
        life: 4 * FPS,
      });

      // 🎨 visual explosion (nếu có draw)
      if (!state.painterExplosions) state.painterExplosions = [];
      state.painterExplosions.push({
        x,
        y,
        life: 20,
      });

      state.painterBomb = null;
    }
  }
  let isPainterR = player.characterId === "painter" && buffs.r > 0;

  if (isPainterR && state.frameCount % 10 === 0) {
    if (!state.painterTrails) return;

    let newTrails = [];

    state.painterTrails.forEach((t) => {
      // ❗ init generation
      if (t.generation === undefined) t.generation = 0;

      // ❗ giới hạn depth (QUAN TRỌNG NHẤT)
      if (t.generation >= 3) return;

      // ❗ giới hạn số lần spawn mỗi trail
      if (!t.spawnCount) t.spawnCount = 0;
      if (t.spawnCount >= 3) return;

      if (!t.points || t.points.length === 0) return;

      t.spawnCount++;

      let last = t.points[t.points.length - 1];

      for (let i = 0; i < 3; i++) {
        let angle = Math.random() * Math.PI * 2;

        let newTrail = {
          points: [{ x: last.x, y: last.y }],
          life: 60,

          // ❗ tăng cấp
          generation: t.generation + 1,

          // ❗ reset count cho nhánh
          spawnCount: 0,
        };

        for (let j = 1; j <= 5; j++) {
          newTrail.points.push({
            x: last.x + Math.cos(angle) * j * 20,
            y: last.y + Math.sin(angle) * j * 20,
          });
        }

        newTrails.push(newTrail);
      }
    });

    if (state.painterTrails.length < 300) {
      state.painterTrails.push(...newTrails);
    }
  }
  state.painterTrails.forEach((t) => t.life--);
  state.painterTrails = state.painterTrails.filter((t) => t.life > 0);
  // SỬA: Đưa giới hạn vào lúc tạo, không được return ở đây làm hỏng vòng lặp game!
  // if (state.painterTrails.length > 200) return; 
  state.painterZones.forEach((z) => z.life--);
  state.painterZones = state.painterZones.filter((z) => z.life > 0);
  //Phoenix Q: Tạo vệt lửa sau lưng khi di chuyển
  if (player.characterId === "phoenix" && buffs.q > 0) {
    if (!state.phoenixTrails) state.phoenixTrails = [];

    state.phoenixTrails.push({
      x: player.x,
      y: player.y,
      life: 60,
    });
  }

  // update trail
  if (state.phoenixTrails) {
    state.phoenixTrails.forEach((t) => t.life--);
    state.phoenixTrails = state.phoenixTrails.filter((t) => t.life > 0);

    // damage
    state.phoenixTrails.forEach((t) => {
      state.ghosts.forEach((g) => {
        if (dist(t.x, t.y, g.x, g.y) < 20) {
          g.hp -= 0.2;
          g.isStunned = 10;
        }
      });

      if (boss && dist(t.x, t.y, boss.x, boss.y) < boss.radius) {
        boss.hp -= 0.05;
      }
    });
  }
  if (state.phoenixReviveFx > 0) state.phoenixReviveFx--;
  if (state.phoenixEfx) {
    state.phoenixEfx.life--;
    if (state.phoenixEfx.life <= 0) state.phoenixEfx = null;
  }
  // Necromancer
  //Minion system
  if (state.necroMinions) {
    state.necroMinions.forEach((m) => {
      m.life--;

      // ===== ORBIT =====
      if (m.type === "orbit") {
        m.angle += 0.05;

        m.x = player.x + Math.cos(m.angle) * m.radius;
        m.y = player.y + Math.sin(m.angle) * m.radius;
      }

      // ===== HELL SPAWN MINION =====
      if (m.type === "seeker") {
        let target = null;
        let nearest = Infinity;

        state.ghosts.forEach((g) => {
          if (g.x > 0) {
            let d = dist(m.x, m.y, g.x, g.y);
            if (d < nearest) {
              nearest = d;
              target = g;
            }
          }
        });

        if (state.boss) {
          let d = dist(m.x, m.y, state.boss.x, state.boss.y);
          if (d < nearest) target = state.boss;
        }

        if (target) {
          let dx = target.x - m.x;
          let dy = target.y - m.y;
          let len = Math.hypot(dx, dy) || 1;

          m.x += (dx / len) * 2;
          m.y += (dy / len) * 2;

          if (len < 12) {
            m.life = 0;
          }
        }
      }
    });

    state.necroMinions = state.necroMinions.filter((m) => m.life > 0);
  }
  if (state.necroZone) {
    let z = state.necroZone;
    z.life--;

    z.spawnTick++;

    // spawn minion mỗi 20 frame
    if (z.spawnTick % 20 === 0) {
      state.necroMinions.push({
        x: z.x + (Math.random() - 0.5) * 100,
        y: z.y + (Math.random() - 0.5) * 100,
        life: 120,
        type: "seeker",
      });
    }

    if (z.life <= 0) state.necroZone = null;
  }
  if (state.necroExplosions) {
    state.necroExplosions.forEach((e) => e.life--);
    state.necroExplosions = state.necroExplosions.filter((e) => e.life > 0);
  }
  // SỬA LỖI HÚT CỦA VOID: Khóa chuyển động của quái khi bị hút
  if (player.characterId === "void" && state.voidBlackholes) {
    for (let i = state.voidBlackholes.length - 1; i >= 0; i--) {
      let bh = state.voidBlackholes[i];
      bh.life--;
      state.ghosts.forEach((g) => {
        if (g.x > 0) {
          let d = dist(bh.x, bh.y, g.x, g.y);
          if (d < 350) {
            g.x += (bh.x - g.x) * 0.1;
            g.y += (bh.y - g.y) * 0.1;
            g.isStunned = Math.max(g.isStunned, 5); // Khóa chân để ghi đè tọa độ hút!
          }
        }
      });
      if (bh.life <= 0) state.voidBlackholes.splice(i, 1);
    }
  }

  if (isVoidR) {
    let angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    state.voidLaser = { x: player.x, y: player.y, angle: angle };
    let p1 = { x: player.x, y: player.y };
    let p2 = {
      x: player.x + Math.cos(angle) * 1500,
      y: player.y + Math.sin(angle) * 1500,
    };
    const distToLine = (p, v, w) => {
      let l2 = dist(v.x, v.y, w.x, w.y) ** 2;
      if (l2 === 0) return dist(p.x, p.y, v.x, v.y);
      let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      return dist(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
    };
    if (state.frameCount % 5 === 0) {
      state.ghosts.forEach((g) => {
        if (g.x > 0 && distToLine({ x: g.x, y: g.y }, p1, p2) < g.radius + 20) {
          g.hp -= 2;
          g.isStunned = 15;
        }
      });
      if (
        boss &&
        distToLine({ x: boss.x, y: boss.y }, p1, p2) < boss.radius + 20
      )
        boss.hp -= 3;
    }
  } else {
    state.voidLaser = null;
  }

  if (player.dashTimeLeft > 0 && isStormE) {
    if (state.frameCount % 3 === 0) {
      if (!state.stormTraps) state.stormTraps = [];
      state.stormTraps.push({ x: player.x, y: player.y, life: 60 });
    }
  }
  if (player.characterId === "storm" && state.stormTraps) {
    for (let i = state.stormTraps.length - 1; i >= 0; i--) {
      let t = state.stormTraps[i];
      t.life--;
      state.ghosts.forEach((g) => {
        if (g.x > 0 && dist(t.x, t.y, g.x, g.y) < 30) {
          g.hp -= 1;
          g.isStunned = 45;
        }
      });
      if (t.life <= 0) state.stormTraps.splice(i, 1);
    }
  }

  if (isStormR) {
    if (state.frameCount % 10 === 0) {
      if (!state.stormLightnings) state.stormLightnings = [];
      for (let i = 0; i < 3; i++) {
        let lx = player.x + (Math.random() - 0.5) * 800;
        let ly = player.y + (Math.random() - 0.5) * 800;
        state.stormLightnings.push({ x: lx, y: ly, life: 15 });
        state.ghosts.forEach((g) => {
          if (g.x > 0 && dist(lx, ly, g.x, g.y) < 100) {
            g.hp -= 5;
            g.isStunned = 60;
          }
        });
        if (boss && dist(lx, ly, boss.x, boss.y) < 100 + boss.radius)
          boss.hp -= 10;
      }
    }
  }

  if (player.characterId === "reaper") {
    if (buffs.r === 1) {
      state.ghosts.forEach((g) => {
        if (g.x > 0) g.hp = 0;
      });
      if (boss) boss.hp -= boss.maxHp * 0.15;
      if (!state.explosions) state.explosions = [];
      state.explosions.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 2000,
        life: 20,
        color: "rgba(0, 0, 0, 0.8)",
      });
    }
  }

  if (player.characterId === "druid" && buffs.q > 0 && state.druidOrbs) {
    state.druidOrbs.forEach((o) => {
      o.angle += 0.05;
      o.x = player.x + Math.cos(o.angle) * o.radius;
      o.y = player.y + Math.sin(o.angle) * o.radius;
      state.ghosts.forEach((g) => {
        if (g.x > 0 && dist(o.x, o.y, g.x, g.y) < g.radius + 6) {
          g.isStunned = 30;
          g.hp = (g.hp || 1) - 1;
        }
      });
      if (boss && dist(o.x, o.y, boss.x, boss.y) < boss.radius + 6)
        boss.hp -= 0.2;
    });
  }

  if (isSummonerR && (state.frameCount || 0) % 15 === 0) {
    for (let i = 0; i < 4; i++) {
      let angle = Math.random() * Math.PI * 2;
      spawnBullet(
        player.x,
        player.y,
        player.x + Math.cos(angle) * 100,
        player.y + Math.sin(angle) * 100,
        true,
      );
    }
  }

  if (isWardenR) {
    state.ghosts.forEach((g) => {
      let d = dist(player.x, player.y, g.x, g.y);
      if (d < 150) {
        let dx = g.x - player.x,
          dy = g.y - player.y,
          force = (150 - d) * 0.05;
        g.x += (dx * force) / d;
        g.y += (dy * force) / d;
      }
    });
  }

  if (isAlchemistR) {
    state.bullets.forEach((b) => {
      if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 250) {
        b.isPlayer = true;
        b.vx *= -1;
        b.vy *= -1;
      }
    });
  }

  if (state.phantoms) {
    for (let i = state.phantoms.length - 1; i >= 0; i--) {
      state.phantoms[i].life--;
      if (state.phantoms[i].life <= 0) state.phantoms.splice(i, 1);
    }
  }

  if (isOracleR && (state.frameCount || 0) % 2 === 0) {
    state.bullets.forEach((b) => {
      if (b.isPlayer) {
        let nearestDist = 400;
        let target = null;
        if (boss) {
          let d = dist(b.x, b.y, boss.x, boss.y);
          if (d < nearestDist && d > boss.radius) {
            nearestDist = d;
            target = boss;
          }
        }
        state.ghosts.forEach((g) => {
          if (g.x > 0) {
            let d = dist(b.x, b.y, g.x, g.y);
            if (d < nearestDist) {
              nearestDist = d;
              target = g;
            }
          }
        });
        if (target) {
          let currentAngle = Math.atan2(b.vy, b.vx);
          let targetAngle = Math.atan2(target.y - b.y, target.x - b.x);
          let diff = targetAngle - currentAngle;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          let maxTurn = 0.25;
          if (diff > maxTurn) diff = maxTurn;
          if (diff < -maxTurn) diff = -maxTurn;
          currentAngle += diff;
          let speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          b.vx = Math.cos(currentAngle) * speed;
          b.vy = Math.sin(currentAngle) * speed;
        }
      }
    });
  }

  if (isFrostR) {
    if (state.frameCount % 10 === 0) {
      state.ghosts.forEach((g) => {
        if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 200) {
          g.hp = (g.hp || 1) - 10;
        }
      });
      if (
        boss &&
        dist(player.x, player.y, boss.x, boss.y) < 200 + boss.radius
      ) {
        boss.hp -= 2;
      }
    }
  }

  if (isVoidR) {
    state.bullets.forEach((b) => {
      if (!b.isPlayer) b.life = 0;
    });
  }

  if (isReaperR) {
    state.ghosts.forEach((g) => {
      if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 180)
        g.isStunned = Math.max(g.isStunned, 60);
    });
  }

  if (isBerserkerR) {
    state.ghosts.forEach((g) => {
      if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 100)
        g.isStunned = Math.max(g.isStunned, 60);
    });
  }

  if (isHunterE) {
    state.ghosts.forEach((g) => {
      if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 300) {
        g.hp = 0;
      }
    });
    if (boss && dist(player.x, player.y, boss.x, boss.y) < 300 + boss.radius) {
      if (state.frameCount % 15 === 0) boss.hp -= 2;
    }
  }

  if (buffs.r > 0 && player.characterId === "storm") {
    if (state.frameCount % 10 === 0) {
      state.ghosts.forEach((g) => (g.isStunned = Math.max(g.isStunned, 60)));
    }
  }

  if (player.characterId === "summoner" && buffs.q > 0) {
    if (state.frameCount % 20 === 0) {
      spawnBullet(
        player.x,
        player.y,
        player.x + Math.random() * 100,
        player.y + Math.random() * 100,
        true,
      );
    }
  }

  if (player.characterId === "gunner" && state.gunnerMines) {
    for (let i = state.gunnerMines.length - 1; i >= 0; i--) {
      let m = state.gunnerMines[i];
      let triggered = false;

      state.ghosts.forEach((g) => {
        if (g.x > 0 && dist(m.x, m.y, g.x, g.y) < 40) triggered = true;
      });
      if (boss && dist(m.x, m.y, boss.x, boss.y) < boss.radius + 40)
        triggered = true;

      if (triggered) {
        state.ghosts.forEach((g) => {
          if (g.x > 0 && dist(m.x, m.y, g.x, g.y) < 100) {
            g.hp = (g.hp || 1) - 1;
            g.isStunned = 45;
          }
        });
        if (boss && dist(m.x, m.y, boss.x, boss.y) < 100) boss.hp -= 5;

        if (!state.explosions) state.explosions = [];
        state.explosions.push({
          x: m.x,
          y: m.y,
          radius: 100,
          life: 10,
          color: "rgba(255,100,0,0.8)",
        });
        state.gunnerMines.splice(i, 1);
      }
    }
  }

  if (player.characterId === "gunner" && state.gunnerAirstrikes) {
    for (let i = state.gunnerAirstrikes.length - 1; i >= 0; i--) {
      let strike = state.gunnerAirstrikes[i];
      strike.timer--;
      if (strike.timer <= 0) {
        state.ghosts.forEach((g) => {
          if (g.x > 0 && dist(strike.x, strike.y, g.x, g.y) < 200) {
            g.hp -= 5;
            g.isStunned = 120;
          }
        });
        if (boss && dist(strike.x, strike.y, boss.x, boss.y) < 200)
          boss.hp -= 30;

        state.bullets.forEach((b) => {
          if (!b.isPlayer && dist(strike.x, strike.y, b.x, b.y) < 200)
            b.life = 0;
        });

        if (!state.explosions) state.explosions = [];
        state.explosions.push({
          x: strike.x,
          y: strike.y,
          radius: 200,
          life: 15,
          color: "rgba(255,0,0,1)",
        });
        state.gunnerAirstrikes.splice(i, 1);
      }
    }
  }

  if (player.characterId === "hunter" && state.hunterTraps) {
    for (let i = state.hunterTraps.length - 1; i >= 0; i--) {
      let trap = state.hunterTraps[i];
      let triggered = false;
      state.ghosts.forEach((g) => {
        if (!triggered && g.x > 0 && dist(trap.x, trap.y, g.x, g.y) < 40) {
          g.isStunned = 180;
          g.hp -= 2;
          triggered = true;
        }
      });
      if (triggered) state.hunterTraps.splice(i, 1);
    }
  }

  if (player.characterId === "engineer" && state.engineerTurrets) {
    state.engineerTurrets.forEach((t) => {
      t.life--;
      if ((state.frameCount || 0) % 20 === 0) {
        let target = null;
        let nearest = 9999;
        if (boss) {
          let d = dist(t.x, t.y, boss.x, boss.y);
          if (d < nearest) {
            nearest = d;
            target = boss;
          }
        }
        state.ghosts.forEach((g) => {
          if (g.x > 0 && g.isStunned <= 0) {
            let d = dist(t.x, t.y, g.x, g.y);
            if (d < nearest) {
              nearest = d;
              target = g;
            }
          }
        });
        if (target) spawnBullet(t.x, t.y, target.x, target.y, true);
      }
    });
    state.engineerTurrets = state.engineerTurrets.filter((t) => t.life > 0);
  }

  // SỬA LỖI UI MÁU BOSS: Đồng bộ máu boss liên tục để chiêu R Storm, Reaper... hiển thị đúng
  if (boss && boss.hp !== boss.prevHp) {
    if (UI.bossHp)
      UI.bossHp.style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
    boss.prevHp = boss.hp;
  }

  updateBullets(ctx, canvas, changeStateFn, isTimeFrozen);
  // ===== 🎨 PAINTER ZONE DAMAGE =====
  if (player.characterId === "painter" && state.painterZones) {
    state.painterZones.forEach((z) => {
      state.ghosts.forEach((g) => {
        if (dist(z.x, z.y, g.x, g.y) < z.radius) {
          g.hp -= 0.1;

          // ❗ stun đúng cách
          g.isStunned = Math.max(g.isStunned, 60);
        }
      });

      if (boss && dist(z.x, z.y, boss.x, boss.y) < z.radius) {
        boss.hp -= 0.05;
      }
    });
  }
  // ===== 🎨 PAINTER DAMAGE =====
  if (player.characterId === "painter" && state.painterTrails) {
    state.painterTrails.forEach((t) => {
      t.points.forEach((p) => {
        state.ghosts.forEach((g) => {
          if (dist(p.x, p.y, g.x, g.y) < g.radius + 4) {
            g.hp -= 0.05;

            // ⚠️ tránh stun vô hạn
            g.isStunned = Math.max(g.isStunned, 60);
          }
        });

        if (boss && dist(p.x, p.y, boss.x, boss.y) < boss.radius + 4) {
          boss.hp -= 0.03;
        }
      });
    });
  }
  if (boss && boss.hp <= 0 && !state._bossKilled) {
    state.player.coins = (state.player.coins || 0) + 100;
    state._bossKilled = true;
  }

  if (state._bossKilled) {
    state._bossKilled = false;
    return "BOSS_KILLED";
  }

  let activeGhosts = 0;

  // DỌN DẸP QUÁI CHẾT SẠCH SẼ & THÊM HIỆU ỨNG NỔ TUNG
  for (let i = state.ghosts.length - 1; i >= 0; i--) {
    let g = state.ghosts[i];
    if (g.hp !== undefined && g.hp <= 0 && !g.isRespawning) {
      if (g.x > 0) {
        state.player.coins = (state.player.coins || 0) + 2;
        if (!state.explosions) state.explosions = [];
        state.explosions.push({
          x: g.x,
          y: g.y,
          radius: 15,
          life: 10,
          color: "rgba(255, 68, 68, 0.6)",
        }); // Nổ khi chết!
      }
      g.isRespawning = true;
      g.respawnTimer = 5 * FPS; // Tăng lên 5 giây cho rõ ràng
      g.x = -100;
      g.y = -100;
    }

    if (g.isRespawning) {
      g.respawnTimer--;
      g.timer++;

      // Cho ma xuất hiện lại ở vị trí bản ghi trước khi thực sự hồi sinh để "cảnh báo"
      if (g.respawnTimer < 1 * FPS) { // 1 giây cuối
        let exactIndex = g.timer * g.speedRate;
        let idx = Math.floor(exactIndex);
        if (idx < g.record.length) {
          g.x = g.record[idx][0];
          g.y = g.record[idx][1];
          g.flicker = true; // Flag để vẽ nhấp nháy
        }
      }

      if (g.respawnTimer <= 0) {
        g.isRespawning = false;
        g.hp = undefined;
        g.flicker = false;
      }
      continue;
    }

    let exactIndex = g.timer * g.speedRate;
    if (
      exactIndex >= g.record.length &&
      (!g.historyPath || g.historyPath.length === 0)
    ) {
      state.ghosts.splice(i, 1);
      continue;
    }
  }

  for (let g of state.ghosts) {
    if (g.isRespawning) continue;

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
          g.timer++;
        }
      } else {
        g.historyPath.shift();
        g.x = -100;
        g.y = -100;
        g.timer++;
      }
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

  // ===== NEW CHARACTER UPDATES =====

  // --- Destroyer: Rift lingering damage ---
  if (state.destroyerRifts) {
    state.destroyerRifts = state.destroyerRifts.filter(r => {
      r.life--;
      // Lingering damage to boss
      if (boss && r.life % 30 === 0) {
        const bx = boss.x, by = boss.y;
        const dx = bx - r.x, dy = by - r.y;
        const angle = r.angle;
        const len = dist(r.x, r.y, r.endX, r.endY);
        const proj = (dx * Math.cos(angle) + dy * Math.sin(angle));
        const perpDist = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
        if (proj > 0 && proj < len && perpDist < 50) {
          boss.hp -= 2;
        }
      }
      return r.life > 0;
    });
  }

  // --- Destroyer: Absorb buff timeout ---
  if (state.destroyerAbsorbBuff) {
    state.destroyerAbsorbBuff.life--;
    if (state.destroyerAbsorbBuff.life <= 0) {
      player.buffs.multiShot -= state.destroyerAbsorbBuff.shots;
      state.destroyerAbsorbBuff = null;
    }
  }

  // --- Destroyer: Ultimate (reflect bullets + area damage) ---
  if (state.destroyerUlt) {
    state.destroyerUlt.life--;
    const radius = state.destroyerUlt.radius;

    // Convert enemy bullets to player bullets
    state.bullets.forEach(b => {
      if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < radius) {
        b.isPlayer = true;
        b.vx *= -1;
        b.vy *= -1;
      }
    });

    // Area damage to boss
    if (boss && state.destroyerUlt.life % 15 === 0) {
      if (dist(player.x, player.y, boss.x, boss.y) < radius + boss.radius) {
        boss.hp -= 3;
      }
    }

    if (state.destroyerUlt.life <= 0) state.destroyerUlt = null;
  }

  // --- Creator: Turrets ---
  if (state.creatorTurrets) {
    state.creatorTurrets = state.creatorTurrets.filter(t => {
      t.life--;
      t.fireCD--;
      if (t.fireCD <= 0) {
        // Auto-aim at nearest target (boss or ghost)
        let targetX = boss ? boss.x : player.x + 100;
        let targetY = boss ? boss.y : player.y;

        // Find nearest ghost if no boss
        if (!boss && ghosts.length > 0) {
          let nearest = ghosts[0];
          let nd = Infinity;
          ghosts.forEach(g => {
            let d = dist(t.x, t.y, g.x, g.y);
            if (d < nd) { nd = d; nearest = g; }
          });
          targetX = nearest.x;
          targetY = nearest.y;
        }

        spawnBullet(t.x, t.y, targetX, targetY, true, 2, "player");
        t.fireCD = 30; // 0.5s
      }
      return t.life > 0;
    });
  }

  // --- Creator: Holy Zone ---
  if (state.creatorHolyZone) {
    state.creatorHolyZone.life--;
    const zone = state.creatorHolyZone;

    // Slow enemy bullets in zone
    state.bullets.forEach(b => {
      if (!b.isPlayer && dist(b.x, b.y, zone.x, zone.y) < zone.radius) {
        b.vx *= 0.3;
        b.vy *= 0.3;
      }
    });

    if (zone.life <= 0) state.creatorHolyZone = null;
  }

  // --- Creator: Orbs ---
  if (state.creatorOrbs) {
    state.creatorOrbs = state.creatorOrbs.filter(orb => {
      orb.life--;
      orb.angle += 0.03;
      orb.fireCD--;
      if (orb.fireCD <= 0) {
        // Target nearest (Boss or ghost)
        let target = boss;
        if (!target || target.hp <= 0) {
          let nd = Infinity;
          ghosts.forEach(g => {
            let d = dist(player.x, player.y, g.x, g.y);
            if (d < nd) { nd = d; target = g; }
          });
        }

        if (target) {
          const ox = player.x + Math.cos(orb.angle) * orb.orbitRadius;
          const oy = player.y + Math.sin(orb.angle) * orb.orbitRadius;
          spawnBullet(ox, oy, target.x, target.y, true, 3, "player");
          orb.fireCD = 40;
        }
      }
      return orb.life > 0;
    });
    if (state.creatorOrbs.length === 0) {
      state.creatorDeathSave = false;
    }
  }

  // --- Knight: Charge ---
  if (state.knightCharge) {
    state.knightCharge.life--;
    player.x += state.knightCharge.vx;
    player.y += state.knightCharge.vy;
    // Clamp
    player.x = Math.max(player.radius, Math.min(800 - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(600 - player.radius, player.y));

    // Damage boss on impact
    if (boss && dist(player.x, player.y, boss.x, boss.y) < boss.radius + player.radius + 20) {
      boss.hp -= 3;
    }

    if (state.knightCharge.life <= 0) state.knightCharge = null;
  }

  // --- Knight: Shield reflect ---
  if (state.knightShield) {
    state.knightShield.life--;
    // Block bullets and count them
    state.bullets = state.bullets.filter(b => {
      if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < 40) {
        state.knightShield.blockedCount++;
        return false;
      }
      return true;
    });

    if (state.knightShield.life <= 0) {
      // Counter-attack: 8 bullets in all directions
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        spawnBullet(player.x, player.y,
          player.x + Math.cos(angle) * 100,
          player.y + Math.sin(angle) * 100,
          true, 2, "player");
      }
      // --- Ground Warnings (Energy Beams & Bloom) ---
      state.knightShield = null;
    }
  }

  // --- Knight: Rage (CDR on hit) ---
  if (state.knightRage) {
    state.knightRage.life--;
    if (state.knightRage.life <= 0) state.knightRage = null;
  }

  // --- Ground Warning Interaction ---
  if (state.groundWarnings) {
    state.groundWarnings = state.groundWarnings.filter(w => {
      w.timer--;
      const distToCenter = dist(player.x, player.y, w.x, w.y);

      // Geyser sủi bọt gây bỏng nếu đứng trên nó
      if (w.type === "geyser" || w.type === "laser") {
        const inVerticalBeam = Math.abs(player.x - w.x) < w.radius && player.y <= w.y;
        if (distToCenter < w.radius || inVerticalBeam) {
          state.playerStatus.burnTimer = Math.max(state.playerStatus.burnTimer, 15);
          if (state.frameCount % 30 === 0) playerTakeDamage(ctx, canvas, changeStateFn, 0.5);
        }
      }
      // Bóng thiên thạch chỉ làm chậm (khóa mục tiêu), KHÔNG gây bỏng trước khi đá rơi
      else if (w.type === "meteor") {
        if (distToCenter < w.radius) {
          state.playerStatus.slowTimer = Math.max(state.playerStatus.slowTimer, 2);
        }
      }
      // Gai đất (spike)
      else if (w.type === "spike") {
        if (distToCenter < w.radius) state.playerStatus.slowTimer = Math.max(state.playerStatus.slowTimer, 2);
      }

      return w.timer > 0;
    });
  }

  if (!state.isBossLevel && state.frameCount >= state.maxFramesToSurvive) {
    return "STAGE_CLEAR";
  }

  // --- Hazard Processing ---
  if (state.hazards) {
    state.hazards = state.hazards.filter(h => {
      h.life--;

      // SỬA ĐỔI: Tốc độ bung (nở) nhanh hơn đối với Sóng Lửa (fire_ring)
      if (h.expanding && h.radius < h.targetRadius) {
        let expandSpeed = h.type === "fire_ring" ? 0.08 : 0.15;
        h.radius += (h.targetRadius - h.radius) * expandSpeed;
        if (Math.abs(h.targetRadius - h.radius) < 1) {
          h.radius = h.targetRadius;
          h.expanding = false;
        }
      }

      // Damage & De-buffs
      if (h.owner === "boss" && h.active) {
        const d = dist(player.x, player.y, h.x, h.y);
        let isColliding = false;

        if (h.type === "fire_ring") {
          // Va chạm viền (ring hit detection)
          if (Math.abs(d - h.radius) < 20 + player.radius) isColliding = true;
        } else {
          if (d < h.radius + player.radius) isColliding = true;
        }

        if (isColliding) {
          // Hazard Status Effects
          let isInvincible = player.dashTimeLeft > 0 || player.gracePeriod > 0 ||
            (buffs.e > 0 && ["tank", "knight", "reaper"].includes(player.characterId)) ||
            (buffs.q > 0 && ["warden", "ghost", "assassin", "spirit", "frost"].includes(player.characterId));

          // Kéo người chơi (Lốc xoáy) thì vẫn hoạt động, nhưng miễn nhiễm debuff và damage
          if (h.type === "vortex") {
            const angle = Math.atan2(h.y - player.y, h.x - player.x);
            player.x += Math.cos(angle) * 2;
            player.y += Math.sin(angle) * 2;
          }

          if (!isInvincible) {
            // Hazard Status Effects
            if (h.type === "fire" || h.type === "fire_ring") state.playerStatus.burnTimer = 30;
            if (h.type === "frost") state.playerStatus.slowTimer = 30;
            if (h.type === "static") state.playerStatus.stunTimer = 10;
          }

          // Tick-based Damage with 100ms (6 frames) initial grace period
          if (h.firstEnterTime === 0) {
            h.firstEnterTime = state.frameCount;
          }

          const stayDuration = state.frameCount - h.firstEnterTime;
          if (stayDuration >= 6) { // 100ms grace
            if (state.frameCount - (player.lastHazardDamageTime || 0) >= 30) { // 0.5s tick
              playerTakeDamage(ctx, canvas, changeStateFn, h.damage || 0.5);
              player.lastHazardDamageTime = state.frameCount;
            }
          }
        } else {
          h.firstEnterTime = 0; // Reset if they leave
        }
      }
      return h.life > 0;
    });
  }

  // --- Particle Updates ---
  if (state.particles) {
    state.particles = state.particles.filter(p => {
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      p.life--;
      return p.life > 0;
    });
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