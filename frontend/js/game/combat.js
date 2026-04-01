import { state } from "../state.js";
import { FPS } from "../config.js";
import { dist } from "../utils.js";
import { UI, updateHealthUI, updateXPUI } from "../ui.js";
import { playSound } from "./audio.js";

export function playerTakeDamage(ctx, canvas, changeStateFn) {
  if (state.player.gracePeriod > 0 || state.player.dashTimeLeft > 0) return;

  // Bất tử từ Kỹ năng
  let buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
  let isInvulnSkill =
    (buffs.e > 0 &&
      (state.player.characterId === "tank" ||
        state.player.characterId === "ghost")) ||
    (buffs.q > 0 &&
      (state.player.characterId === "warden" ||
        state.player.characterId === "assassin" ||
        state.player.characterId === "spirit"));

  if (isInvulnSkill) {
    return;
  }

  if (state.player.shield > 0) {
    state.player.shield--;
    state.player.shieldRegenTimer = 5 * FPS;
    playSound("damage"); // Tiếng vỡ khiên
  } else {
    state.player.hp--;
    playSound("damage"); // Tiếng mất máu
  }

  state.player.gracePeriod = 60;
  updateHealthUI();

  // Flash màn hình đỏ
  ctx.fillStyle = "rgba(255,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.player.hp <= 0) changeStateFn("GAME_OVER");
}

/**
 * Cộng XP cho player, kiểm tra level-up.
 */
export function addExperience(amount, changeStateFn) {
  if (!state.player) return;
  state.player.experience += amount;

  if (state.player.experience >= state.player.experienceToLevel) {
    state.player.experience -= state.player.experienceToLevel;
    state.player.experienceToLevel = Math.max(
      50,
      Math.floor(state.player.experienceToLevel * 1.15),
    );
    state.upgradeFromXP = true;
    updateXPUI();
    playSound("button"); // Tiếng ting ting khi lên cấp
    changeStateFn("UPGRADE");
    return;
  }
  updateXPUI();
}

/**
 * Cập nhật tất cả bullets: di chuyển, bounce, va chạm boss/ghost/player.
 */
export function updateBullets(
  ctx,
  canvas,
  changeStateFn,
  isTimeFrozen = false,
) {
  let { player, boss, bullets, ghosts } = state;
  let buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
  let isInvulnSkill =
    (buffs.e > 0 &&
      (player.characterId === "tank" || player.characterId === "ghost")) ||
    (buffs.q > 0 &&
      (player.characterId === "warden" || player.characterId === "assassin"));
  let isInvulnerable =
    player.gracePeriod > 0 || player.dashTimeLeft > 0 || isInvulnSkill;
  let isSummonerQ = player.characterId === "summoner" && buffs.q > 0;

  // Lấy ra flag làm chậm của Oracle Q
  let isOracleQ = player.characterId === "oracle" && buffs.q > 0;

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    //Spirit E đẩy đạn địch ra xa player
    let isSpiritE = player.characterId === "spirit" && buffs.e > 0;

    if (isSpiritE && !b.isPlayer) {
      let d = dist(b.x, b.y, player.x, player.y);
      if (d < 200) {
        // đẩy hướng ra xa player
        let angle = Math.atan2(b.y - player.y, b.x - player.x);
        let speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
      }
    }
    // ===== ENGINEER SHIELD =====
    let isEngineerR = player.characterId === "engineer" && buffs.r > 0;
    if (isEngineerR) {
      if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < 120) {
        bullets.splice(i, 1);
        continue;
      }
    }

    // Đạn địch bị đóng băng
    if (!b.isPlayer && isTimeFrozen) {
      // Giữ nguyên vị trí
    } else {
      let speedMult = (!b.isPlayer && isOracleQ) ? 0.3 : 1;
      b.x += b.vx * speedMult;
      b.y += b.vy * speedMult;

      // SỬA LỖI ORACLE Q: Nếu đạn bị làm bay chậm đi, tuổi thọ của đạn cũng phải 
      // giảm từ từ lại tương ứng, nếu không đạn sẽ biến mất khi chưa tới đích.
      if (!b.isPlayer && isOracleQ) {
        b.life -= 0.3;
      } else {
        b.life--;
      }
    }

    // Bounce tường
    let hitWall = false;
    if (b.x < b.radius) {
      b.x = b.radius;
      b.vx *= -1;
      hitWall = true;
    } else if (b.x > canvas.width - b.radius) {
      b.x = canvas.width - b.radius;
      b.vx *= -1;
      hitWall = true;
    }
    if (b.y < b.radius) {
      b.y = b.radius;
      b.vy *= -1;
      hitWall = true;
    } else if (b.y > canvas.height - b.radius) {
      b.y = canvas.height - b.radius;
      b.vy *= -1;
      hitWall = true;
    }

    if (hitWall) {
      if (b.bounces > 0) {
        b.bounces--;
        if (b.bounces >= 0) b.life = Math.max(b.life, 30);
      } else b.life = 0;
    }

    if (b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    if (b.isPlayer) {
      if (boss && dist(b.x, b.y, boss.x, boss.y) < boss.radius + b.radius) {
        boss.hp -= b.damage || 1;
        UI.bossHp.style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";

        // Scout Mythical: Hưng phấn giảm hồi chiêu khi bắn trúng Boss
        if (state.player.characterId === "scout" && buffs.r > 0) {
          if (state.skillsCD.q > 0) state.skillsCD.q = Math.max(0, state.skillsCD.q - 0.5 * FPS);
          if (state.skillsCD.e > 0) state.skillsCD.e = Math.max(0, state.skillsCD.e - 0.5 * FPS);
        }

        // Sniper piercing shot stops at Boss for balance
        bullets.splice(i, 1);
        if (boss.hp <= 0) {
          state.player.coins = (state.player.coins || 0) + 100;
          state._bossKilled = true;
        }
        continue;
      }

      // Va chạm ghost
      let hitGhost = false;
      for (let j = ghosts.length - 1; j >= 0; j--) {
        let g = ghosts[j];
        if (
          g.isStunned <= 0 &&
          g.x > 0 &&
          dist(b.x, b.y, g.x, g.y) < g.radius + b.radius
        ) {
          if (state.isBossLevel) {
            ghosts.splice(j, 1);
            state.player.coins = (state.player.coins || 0) + 10;
          } else {
            g.isStunned = b.damage === 2 ? 600 : 300;
            g.hp = (g.hp || 1) - (b.damage || 1);
            addExperience(6, changeStateFn);
            state.player.coins = (state.player.coins || 0) + 5;
          }
          hitGhost = true;

          // Scout Mythical: Hưng phấn giảm hồi chiêu khi bắn trúng Quái
          if (state.player.characterId === "scout" && buffs.r > 0) {
            if (state.skillsCD.q > 0) state.skillsCD.q = Math.max(0, state.skillsCD.q - 0.5 * FPS);
            if (state.skillsCD.e > 0) state.skillsCD.e = Math.max(0, state.skillsCD.e - 0.5 * FPS);
          }

          // Piercing bullets do not get destroyed by ghosts
          if (!b.pierce) {
            if (b.bounces > 0) {
              b.bounces--;
              let angle = Math.atan2(b.vy, b.vx);
              angle += Math.PI + (Math.random() * 1 - 0.5); // bounce randomly off ghost
              let speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
              b.vx = Math.cos(angle) * speed;
              b.vy = Math.sin(angle) * speed;
              hitGhost = false; // Don't splice yet since it bounced
            }
          } else {
            hitGhost = false; // Pierce active, don't splice
          }
          break;
        }
      }
      if (hitGhost) {
        bullets.splice(i, 1);
        continue;
      }
    } else {
      // Đạn địch
      if (
        isSummonerQ &&
        dist(b.x, b.y, player.x, player.y) < player.radius + 40
      ) {
        // Đạn địch bị phá hủy bởi khiên quay của Summoner
        bullets.splice(i, 1);
        continue;
      }

      // Đạn địch trúng player
      if (
        !isInvulnerable &&
        dist(b.x, b.y, player.x, player.y) < player.radius + b.radius - 2
      ) {
        playerTakeDamage(ctx, canvas, changeStateFn);
        bullets.splice(i, 1);
        continue;
      }
    }
  }

  // Summoner Q damages enemies
  if (isSummonerQ && Math.random() < 0.15) {
    if (boss && dist(player.x, player.y, boss.x, boss.y) < boss.radius + 45) {
      boss.hp -= 1;
      UI.bossHp.style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
      if (boss.hp <= 0) {
        state.player.coins = (state.player.coins || 0) + 100;
        state._bossKilled = true;
      }
    }
    for (let j = ghosts.length - 1; j >= 0; j--) {
      let g = ghosts[j];
      if (
        g.isStunned <= 0 &&
        g.x > 0 &&
        dist(player.x, player.y, g.x, g.y) < player.radius + 45
      ) {
        if (state.isBossLevel) {
          ghosts.splice(j, 1);
          state.player.coins = (state.player.coins || 0) + 10;
        } else {
          g.isStunned = 300;
          addExperience(6, changeStateFn);
          state.player.coins = (state.player.coins || 0) + 5;
        }
      }
    }
  }
}