import { state } from "../state.js";
import { FPS } from "../config.js";
import { dist } from "../utils.js";
import { UI, updateHealthUI, updateXPUI } from "../ui.js";
import { playSound } from "./audio.js";
import { spawnHazard } from "../entities.js";

export function playerTakeDamage(ctx, canvas, changeStateFn, amount = 1) {
  if (state.player.isInvincible) return; // FIX I-FRAMES
  let player = state.player;
  if (state.player.gracePeriod > 0 || state.player.dashTimeLeft > 0) return;

  let buffs = state.activeBuffs || { q: 0, e: 0, r: 0 };
  let isInvulnSkill =
    (buffs.e > 0 &&
      (state.player.characterId === "tank" ||
        state.player.characterId === "knight" || // ĐÃ THÊM KỴ SĨ
        state.player.characterId === "reaper")) ||
    (buffs.q > 0 &&
      (state.player.characterId === "warden" ||
        state.player.characterId === "ghost" ||  // ĐÃ CHUYỂN BÓNG MA VỀ Q
        state.player.characterId === "assassin" ||
        state.player.characterId === "spirit" ||
        state.player.characterId === "frost"));
  if (isInvulnSkill) {
    return;
  }

  if (state.player.shield > 0) {
    state.player.shield--;
    state.player.shieldRegenTimer = 5 * FPS;
    playSound("damage");

    if (state.player.characterId === "frost" && buffs.e > 0) {
      import("../entities.js").then((module) => {
        for (let i = 0; i < Math.PI * 2; i += Math.PI / 4) {
          module.spawnBullet(
            state.player.x,
            state.player.y,
            state.player.x + Math.cos(i),
            state.player.y + Math.sin(i),
            true,
          );
        }
      });
      state.activeBuffs.e = 0;
    }
  } else {
    state.player.hp -= amount;
    playSound("damage");

    // Rung màn hình khi bị sát thương lớn
    if (amount >= 2) {
      state.screenShake.timer = 15;
      state.screenShake.intensity = amount * 5;
    }
  }

  state.player.gracePeriod = 60;
  updateHealthUI();

  // SỬA LỖI CRASH: Không bao giờ được phép dùng ctx khi nó null hoặc undefined
  const safeCtx = (typeof ctx !== "undefined" && ctx !== null) ? ctx : null;
  const safeCanvas = (typeof canvas !== "undefined" && canvas !== null) ? canvas : null;

  if (safeCtx && safeCanvas) {
    safeCtx.fillStyle = "rgba(255,0,0,0.5)";
    safeCtx.fillRect(0, 0, safeCanvas.width, safeCanvas.height);
  }

  if (player.hp <= 0) {
    let isPhoenixR = player.characterId === "phoenix" && buffs.r > 0;

    if (isPhoenixR && state.phoenixReviveReady) {
      state.phoenixReviveReady = false;

      player.hp = Math.min(player.maxHp, player.hp + 2); // ❤️ hồi 2 HP
      player.gracePeriod = 60;
      updateHealthUI();
      // 💥 nổ
      state.ghosts.forEach((g) => {
        if (dist(player.x, player.y, g.x, g.y) < 150) {
          g.hp -= 3;
          g.isStunned = 60;
        }
      });

      // 🧹 clear bullet
      state.bullets = state.bullets.filter(
        (b) => dist(b.x, b.y, player.x, player.y) > 150,
      );

      // 🎨 trigger effect
      state.phoenixReviveFx = 20;
    } else {
      changeStateFn("GAME_OVER");
    }

    return;
  }
}

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
    playSound("button");
    changeStateFn("UPGRADE");
    return;
  }
  updateXPUI();
}

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
      (state.player.characterId === "tank" ||
        state.player.characterId === "knight" || // ĐÃ THÊM KỴ SĨ
        state.player.characterId === "reaper")) ||
    (buffs.q > 0 &&
      (state.player.characterId === "warden" ||
        state.player.characterId === "ghost" ||  // ĐÃ CHUYỂN BÓNG MA VỀ Q
        state.player.characterId === "assassin" ||
        state.player.characterId === "spirit" ||
        state.player.characterId === "frost"));
  let isInvulnerable =
    player.gracePeriod > 0 || player.dashTimeLeft > 0 || isInvulnSkill;
  let isSummonerQ = player.characterId === "summoner" && buffs.q > 0;
  let isPhoenixR = player.characterId === "phoenix" && buffs.r > 0;
  let isOracleQ = player.characterId === "oracle" && buffs.q > 0;
  let isFrostR = player.characterId === "frost" && buffs.r > 0;
  let isHunterE = player.characterId === "hunter" && buffs.e > 0;

  if (state.windForce.timer > 0) {
    const fx = state.windForce.x;
    const fy = state.windForce.y;
    for (let b of bullets) {
      if (b.isPlayer) {
        b.vx += fx;
        b.vy += fy;
      }
    }
  }

  // --- Boss Beam Collision ---
  state.bossBeams.forEach(beam => {
    if (beam.state === "fire") {
      // Find closest point on line segment (x1,y1) to (x2,y2) to player (px,py)
      const px = player.x;
      const py = player.y;
      const dx = beam.x2 - beam.x1;
      const dy = beam.y2 - beam.y1;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) return;

      let t = ((px - beam.x1) * dx + (py - beam.y1) * dy) / l2;
      t = Math.max(0, Math.min(1, t));

      const closestX = beam.x1 + t * dx;
      const closestY = beam.y1 + t * dy;
      const d = dist(px, py, closestX, closestY);

      if (d < player.radius + 15) { // 15 is beam width approx
        playerTakeDamage(ctx, canvas, changeStateFn, 1);
        state.playerStatus.stunTimer = 10;
      }
    }
  });

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    let isSpiritE = player.characterId === "spirit" && buffs.e > 0;

    if (isSpiritE && !b.isPlayer) {
      let d = dist(b.x, b.y, player.x, player.y);
      if (d < 200) {
        let angle = Math.atan2(b.y - player.y, b.x - player.x);
        let speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
      }
    }

    let isEngineerR = player.characterId === "engineer" && buffs.r > 0;
    if (isEngineerR) {
      if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < 120) {
        bullets.splice(i, 1);
        continue;
      }
    }

    if (!b.isPlayer && isTimeFrozen) {
      // Giữ nguyên vị trí
    } else {
      let speedMult = !b.isPlayer && isOracleQ ? 0.3 : 1;

      if (!b.isPlayer && isFrostR && dist(b.x, b.y, player.x, player.y) < 200) {
        speedMult = 0.2;
      }

      if (
        !b.isPlayer &&
        isHunterE &&
        dist(b.x, b.y, player.x, player.y) < 300
      ) {
        speedMult = 0.2;
      }

      // --- Advanced Bullet Physics (Meteor & Vortex) ---
      if (b.isMeteor) {
        b.vx = 0;
        b.vy = 18;

        // NẾU CHẠM MẶT ĐẤT
        if (b.y >= b.destY) {
          const distToPlayer = dist(b.x, b.y, player.x, player.y);
          if (distToPlayer < 600) {
            state.screenShake.timer = 15;
            state.screenShake.intensity = 25;
            state.screenShake.type = 'earth';
          }

          // TẠO HỐ DUNG NHAM KHỔNG LỒ (Bán kính 120, dame mạnh)
          spawnHazard("fire", b.destX, b.destY, 120, 180, 1.0, "boss", 120);

          // Xóa luôn viên đạn thiên thạch khỏi mảng
          bullets.splice(i, 1);
          continue;
        }
      }

      // Wind Vortex pulls Fire Bullets and Player Bullets
      if (b.isPlayer || b.style === 1) { // Player or Fire
        state.hazards.forEach(h => {
          if (h.type === "vortex") {
            const dxv = h.x - b.x, dyv = h.y - b.y;
            const dv = Math.sqrt(dxv * dxv + dyv * dyv);
            if (dv < h.radius * 2) {
              b.vx += (dxv / dv) * 0.4;
              b.vy += (dyv / dv) * 0.4;
            }
          }
        });
      }

      b.x += b.vx * speedMult;
      b.y += b.vy * speedMult;

      if (!b.isPlayer && speedMult < 1) {
        b.life -= speedMult;
      } else {
        b.life--;
      }
    }

    let hitWall = false;

    if (!b.isMeteor) {
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
      // SỬA LỖI ĐƠ GAME TẠI ĐÂY: Lưu danh sách quái đã trúng đạn xuyên
      if (!b.hitList) b.hitList = [];

      if (boss && dist(b.x, b.y, boss.x, boss.y) < boss.radius + b.radius) {
        if (!b.hitList.includes("boss")) {
          b.hitList.push("boss");
          let finalDmg = b.damage || 1;

          // --- Boss Shield/Stance Logic ---
          if (boss.shieldActive && boss.shield > 0) {
            boss.shield -= finalDmg * 2; // Shield takes double dmg to encourage aggression
            if (boss.shield <= 0) {
              boss.shieldActive = false; // SHIELD BROKEN
              boss.stunTimer = 180; // 3 seconds stun
            }
            // Don't damage HP while shield is up
            finalDmg = 0;
          } else {
            boss.hp -= finalDmg;
            boss.shieldActive = false; // Always ensure it's off if shield is 0
          }

          if (
            state.player.characterId === "hunter" &&
            state.activeBuffs.e > 0 &&
            state.hunterMarkTarget === boss &&
            finalDmg > 0
          ) {
            finalDmg *= 2;
            boss.hp -= finalDmg / 2; // Adjusted since we already subtracted finalDmg
          }

          const hpPercent = Math.max(0, (boss.hp / boss.maxHp) * 100);
          UI.bossHp.style.width = hpPercent + "%";

          // Phase 3 escalating color
          if (hpPercent < 33) {
            UI.bossHp.style.backgroundColor = "#ff00ff"; // Purple peril
            UI.bossHp.style.boxShadow = "0 0 20px #ff00ff";
          } else {
            UI.bossHp.style.backgroundColor = "#ff4444";
            UI.bossHp.style.boxShadow = "none";
          }

          if (state.player.characterId === "scout" && buffs.r > 0) {
            if (state.skillsCD.q > 0)
              state.skillsCD.q = Math.max(0, state.skillsCD.q - 0.5 * FPS);
            if (state.skillsCD.e > 0)
              state.skillsCD.e = Math.max(0, state.skillsCD.e - 0.5 * FPS);
          }

          if (!b.pierce) bullets.splice(i, 1);
          if (boss.hp <= 0) {
            state.player.coins = (state.player.coins || 0) + 100;
            state._bossKilled = true;
          }
        }
        if (!b.pierce) continue;
      }

      let hitGhost = false;
      for (let j = ghosts.length - 1; j >= 0; j--) {
        let g = ghosts[j];

        // Đã trúng thì bỏ qua, không tính sát thương lần 2 gây lag!
        if (b.hitList.includes(g)) continue;

        if (
          g.isStunned <= 0 &&
          g.x > 0 &&
          dist(b.x, b.y, g.x, g.y) < g.radius + b.radius
        ) {
          b.hitList.push(g);

          if (state.isBossLevel) {
            ghosts.splice(j, 1);
            state.player.coins = (state.player.coins || 0) + 10;
          } else {
            let finalDmg = b.damage || 1;
            if (
              state.player.characterId === "hunter" &&
              state.activeBuffs.e > 0 &&
              state.hunterMarkTarget === g
            ) {
              finalDmg *= 2;
            }
            g.isStunned = finalDmg >= 2 ? 600 : 300;
            g.hp = (g.hp || 1) - finalDmg;
            addExperience(6, changeStateFn);
            state.player.coins = (state.player.coins || 0) + 5;
          }
          hitGhost = true;

          if (state.player.characterId === "scout" && buffs.r > 0) {
            if (state.skillsCD.q > 0)
              state.skillsCD.q = Math.max(0, state.skillsCD.q - 0.5 * FPS);
            if (state.skillsCD.e > 0)
              state.skillsCD.e = Math.max(0, state.skillsCD.e - 0.5 * FPS);
          }

          if (!b.pierce) {
            if (b.bounces > 0) {
              b.bounces--;
              let angle = Math.atan2(b.vy, b.vx);
              angle += Math.PI + (Math.random() * 1 - 0.5);
              let speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
              b.vx = Math.cos(angle) * speed;
              b.vy = Math.sin(angle) * speed;
              hitGhost = false;
            }
          } else {
            hitGhost = false;
          }
          if (hitGhost) break;
        }
      }
      if (hitGhost) {
        bullets.splice(i, 1);
        continue;
      }
    } else {
      if (
        isSummonerQ &&
        dist(b.x, b.y, player.x, player.y) < player.radius + 40
      ) {
        bullets.splice(i, 1);
        continue;
      }
      // --- Collision with Player ---
      const d = dist(b.x, b.y, player.x, player.y);
      const hitRadius = (b.style === 5) ? 25 : b.radius + player.radius; // Larger hit for spears

      if (d < hitRadius) {
        // Apply Element-Specific Debuffs
        if (b.style === 2 || b.style === 5) state.playerStatus.slowTimer = 90; // Ice Slow
        if (b.style === 3) state.playerStatus.stunTimer = 15; // Thunder Stun

        playerTakeDamage(ctx, canvas, changeStateFn, b.damage || 1);

        // SỬA LỖI Ở ĐÂY: Nếu là Thiên Thạch (isMeteor), KHÔNG XÓA NÓ ĐI!
        // Để nó tiếp tục rơi đè qua người và nổ tung trên mặt đất
        if (!b.isMeteor) {
          bullets.splice(i, 1);
        }
        continue;
      }
    }
  }

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
