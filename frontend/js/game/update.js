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
  // ===== NEW CHARACTER BUFF FLAGS =====
  // ===== NEW CHARACTER BUFF FLAGS =====
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
  // ===== ORIGINAL CHARACTER BUFF FLAGS =====
  let isHunterE = player.characterId === "hunter" && buffs.e > 0;
  let isFrostR = player.characterId === "frost" && buffs.r > 0;
  let isVoidR = player.characterId === "void" && buffs.r > 0;
  let isStormE = player.characterId === "storm" && buffs.e > 0;
  let isReaperR = player.characterId === "reaper" && buffs.r > 0;
  let isDruidE = player.characterId === "druid" && buffs.e > 0;
  let isSniperQ = player.characterId === "sniper" && buffs.q > 0;
  let isOracleR = player.characterId === "oracle" && buffs.r > 0;

  // --- ÁP DỤNG BUFF VÀO CHỈ SỐ KỸ NĂNG ---
  let isSpeedsterQ = player.characterId === "speedster" && buffs.q > 0;
  let currentSpeed = player.speed * (isSpeedsterQ ? 1.5 : 1);
  if (isBerserkerQ) currentSpeed *= 1.2;
  if (isSniperQ) currentSpeed *= 0.5; // Tụ điểm làm chậm gắp đôi
  if (isEngineerE) currentSpeed *= 1.3;
  if (isDruidE) currentSpeed *= 1.3;
  let isSpeedsterE = player.characterId === "speedster" && buffs.e > 0;
  let currentFireRate = isSpeedsterE ? 4 : player.fireRate;
  if (isStormE) currentFireRate = Math.max(3, player.fireRate * 0.75);
  if (isBerserkerQ) currentFireRate = Math.max(2, player.fireRate * 0.65);
  if (isEngineerE) currentFireRate = Math.max(3, player.fireRate * 0.6);
  let isSharpshootE = player.characterId === "sharpshooter" && buffs.e > 0;
  let currentMultiShot = player.multiShot + (isSharpshootE ? 3 : 0);
  if (isSummonerE) currentMultiShot += 2;
  if (isBerserkerR) currentMultiShot *= 2;

  let isSharpshootQ = player.characterId === "sharpshooter" && buffs.q > 0;
  let currentBounces = (player.bounces || 0) + (isSharpshootQ ? 2 : 0);
  if (isWardenE) currentBounces += 2;

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
    let isDruidR = player.characterId === "druid" && buffs.r > 0;
    if (isAssassinE) {
      state.activeBuffs.e = 0; // consume buff
      // Auto-aim to closest enemy
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
        b.damage = 2; // Double damage
        b.radius = 8; // Bigger bullet
      }
      // ===== 🌳 DRUID R =====
      if (isDruidR) {
        let newLen = state.bullets.length; // fix infinite loop

        for (let i = oldLen; i < newLen; i++) {
          let b = state.bullets[i];

          // ❌ đã split rồi thì bỏ qua
          if (b.isSplit) continue;

          for (let j = -1; j <= 1; j += 2) {
            let angle = Math.atan2(b.vy, b.vx) + j * 0.4;

            spawnBullet(
              b.x,
              b.y,
              b.x + Math.cos(angle) * 100,
              b.y + Math.sin(angle) * 100,
              true,
            );

            // 👉 đánh dấu bullet con
            let newB = state.bullets[state.bullets.length - 1];
            newB.isSplit = true;
            newB.damage = 0.5; // optional balance
          }

          // 👉 đánh dấu bullet gốc đã split
          b.isSplit = true;
        }
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
      // ===== 🌳 DRUID R =====
      if (isDruidR) {
        let newLen = state.bullets.length; // fix infinite loop

        for (let i = oldLen; i < newLen; i++) {
          let b = state.bullets[i];

          // ❌ đã split rồi thì bỏ qua
          if (b.isSplit) continue;

          for (let j = -1; j <= 1; j += 2) {
            let angle = Math.atan2(b.vy, b.vx) + j * 0.4;

            spawnBullet(
              b.x,
              b.y,
              b.x + Math.cos(angle) * 100,
              b.y + Math.sin(angle) * 100,
              true,
            );

            // 👉 đánh dấu bullet con
            let newB = state.bullets[state.bullets.length - 1];
            newB.isSplit = true;
            newB.damage = 0.5; // optional balance
          }

          // 👉 đánh dấu bullet gốc đã split
          b.isSplit = true;
        }
      }
    }

    state.player.multiShot = originalMulti;

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
  // ===== SPECIAL EFFECTS =====

  // ===== DRUID Q: orbit =====
  if (player.characterId === "druid" && buffs.q > 0 && state.druidOrbs) {
    state.druidOrbs.forEach((o) => {
      o.angle += 0.05;

      o.x = player.x + Math.cos(o.angle) * o.radius;
      o.y = player.y + Math.sin(o.angle) * o.radius;

      // damage ghost
      state.ghosts.forEach((g) => {
        if (g.x > 0 && dist(o.x, o.y, g.x, g.y) < g.radius + 6) {
          g.isStunned = 30;
          g.hp = (g.hp || 1) - 1;
        }
      });

      // damage boss
      if (boss && dist(o.x, o.y, boss.x, boss.y) < boss.radius + 6) {
        boss.hp -= 0.2;
      }
    });
  }

  // Summoner R: Auto fire directions
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

  // Warden R: Holy Sanctuary pushback
  if (isWardenR) {
    state.ghosts.forEach((g) => {
      let d = dist(player.x, player.y, g.x, g.y);
      if (d < 150) {
        let dx = g.x - player.x;
        let dy = g.y - player.y;
        let force = (150 - d) * 0.05;
        g.x += (dx * force) / d;
        g.y += (dy * force) / d;
      }
    });
  }

  // Alchemist R: Convert enemy bullets to player bullets
  if (isAlchemistR) {
    state.bullets.forEach((b) => {
      if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 250) {
        b.isPlayer = true;
        b.vx *= -1;
        b.vy *= -1;
      }
    });
  }

  // Oracle R: Homing bullets function
  if (isOracleR && state.frame % 3 === 0) {
    state.bullets.forEach((b) => {
      if (b.isPlayer) {
        let nearestDist = 300; // Search radius for homing
        let target = null;
        if (boss) {
          let d = dist(b.x, b.y, boss.x, boss.y);
          if (d < nearestDist && d > boss.radius) {
            nearestDist = d;
            target = boss;
          }
        }
        state.ghosts.forEach((g) => {
          if (g.isStunned <= 0 && g.x > 0) {
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
          // Homing strength: 0.1 radians per 3 frames
          let diff = targetAngle - currentAngle;
          // Normalize diff to -PI, PI
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          let maxTurn = 0.15;
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

  // Frost: freeze aura
  if (player.characterId === "frost" && buffs.r > 0) {
    state.ghosts.forEach((g) => {
      if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 220) {
        g.isStunned = Math.max(g.isStunned, 30);
      }
    });
  }

  // Void: delete all enemy bullets
  if (isVoidR) {
    state.bullets.forEach((b) => {
      if (!b.isPlayer) b.life = 0;
    });
  }

  // Reaper: damage aura
  if (isReaperR) {
    state.ghosts.forEach((g) => {
      if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 180) {
        g.isStunned = Math.max(g.isStunned, 60);
      }
    });
  }

  // Berserker rage bonus damage
  if (isBerserkerR) {
    state.ghosts.forEach((g) => {
      if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 100) {
        g.isStunned = Math.max(g.isStunned, 60);
      }
    });
  }
  //Hunter
  if (isHunterE) {
    state.ghosts.forEach((g) => {
      if (g.x > 0) g.isStunned = Math.max(g.isStunned, 60);
    });
  }
  //Storm
  if (buffs.r > 0 && player.characterId === "storm") {
    if (state.frameCount % 10 === 0) {
      state.ghosts.forEach((g) => (g.isStunned = Math.max(g.isStunned, 60)));
    }
  }
  //Summoner
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

  // ===== ENGINEER Q: Turret =====
  if (player.characterId === "engineer" && state.engineerTurrets) {
    state.engineerTurrets.forEach((t) => {
      t.life--;

      // Auto fire
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

        if (target) {
          spawnBullet(t.x, t.y, target.x, target.y, true);
        }
      }
    });

    // remove turret hết hạn
    state.engineerTurrets = state.engineerTurrets.filter((t) => t.life > 0);
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
