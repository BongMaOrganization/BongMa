import { state } from "../state.js";
import { FPS, CHARACTERS } from "../config.js";
import { dist } from "../utils.js";
import { UI, updateHealthUI } from "../ui.js";
import { spawnBullet } from "../entities.js";
import { addExperience } from "./combat.js";

export function ensureSkillsUI() {
  if (document.getElementById("skills-ui")) return;
  const hud = document.querySelector(".hud-layer");
  if (!hud) return;

  if (!document.getElementById("skills-css")) {
    const style = document.createElement("style");
    style.id = "skills-css";
    style.innerHTML = `
      #skills-ui { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px; }
      .skill-slot { position: relative; width: 50px; height: 50px; background: #1a1a24; border: 2px solid #444; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }
      .skill-slot.ready { border-color: #00ffcc; box-shadow: 0 0 10px rgba(0, 255, 204, 0.4); }
      .skill-slot.active { border-color: #ff00ff; box-shadow: 0 0 15px rgba(255, 0, 255, 0.6); }
      .skill-key { font-size: 20px; font-weight: bold; color: #fff; z-index: 2; }
      .skill-cd-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 0%; background: rgba(0, 0, 0, 0.75); z-index: 1; transition: height 0.1s linear; }
      .skill-cd-text { position: absolute; font-size: 16px; font-weight: bold; color: #ff4444; z-index: 3; text-shadow: 1px 1px 2px #000; }
    `;
    document.head.appendChild(style);
  }

  const skillsUI = document.createElement("div");
  skillsUI.id = "skills-ui";
  skillsUI.innerHTML = `
    <div class="skill-slot" id="slot-q"><span class="skill-key">Q</span><div class="skill-cd-overlay" id="cd-q"></div><div class="skill-cd-text" id="cd-text-q"></div></div>
    <div class="skill-slot" id="slot-e"><span class="skill-key">E</span><div class="skill-cd-overlay" id="cd-e"></div><div class="skill-cd-text" id="cd-text-e"></div></div>
    <div class="skill-slot" id="slot-r"><span class="skill-key">R</span><div class="skill-cd-overlay" id="cd-r"></div><div class="skill-cd-text" id="cd-text-r"></div></div>
  `;
  hud.appendChild(skillsUI);
}

export function getCooldown(charId, skillIndex) {
  const defaultCDs = {
    speedster: [8, 15, 40],
    tank: [15, 20, 60],
    sharpshooter: [12, 18, 50],
    ghost: [10, 12, 60],
    mage: [8, 20, 60],
  };
  const defaultInit = {
    speedster: [0, 0, 30],
    tank: [0, 0, 30],
    sharpshooter: [0, 0, 30],
    ghost: [0, 0, 30],
    mage: [0, 0, 30],
  };
  let charConfig = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
  let cd = charConfig.skills[skillIndex]?.cooldown;
  let initCd = charConfig.skills[skillIndex]?.initialCooldown;

  return {
    cd: cd !== undefined ? cd : defaultCDs[charId]?.[skillIndex] || 10,
    initCd:
      initCd !== undefined ? initCd : defaultInit[charId]?.[skillIndex] || 0,
  };
}

export function initSkills() {
  ensureSkillsUI();
  let charId = state.player?.characterId || "speedster";
  state.skillsCD = {
    q: getCooldown(charId, 0).initCd * FPS,
    e: getCooldown(charId, 1).initCd * FPS,
    r: getCooldown(charId, 2).initCd * FPS,
  };
  state.activeBuffs = { q: 0, e: 0, r: 0 };
  state.prevKeys = {};
  updateSkillsUI();
}

export function updateSkillsUI() {
  ["q", "e", "r"].forEach((key) => {
    let char = state.player.characterId;
    let skillIndex = key === "q" ? 0 : key === "e" ? 1 : 2;
    let maxCd = getCooldown(char, skillIndex).cd * FPS;
    let slot = document.getElementById(`slot-${key}`);
    if (!slot) return;
    let overlay = document.getElementById(`cd-${key}`);
    let text = document.getElementById(`cd-text-${key}`);

    if (state.skillsCD[key] > 0) {
      slot.classList.remove("ready", "active");
      let percent = (state.skillsCD[key] / maxCd) * 100;
      overlay.style.height = `${Math.min(100, percent)}%`;
      text.innerText = Math.ceil(state.skillsCD[key] / FPS);
    } else {
      overlay.style.height = "0%";
      text.innerText = "";
      if (state.activeBuffs[key] > 0) {
        slot.classList.add("active");
        slot.classList.remove("ready");
      } else {
        slot.classList.add("ready");
        slot.classList.remove("active");
      }
    }
  });
}

function triggerSkill(key, canvas, changeStateFn) {
  let char = state.player.characterId;
  let skillIndex = key === "q" ? 0 : key === "e" ? 1 : 2;
  let cd = getCooldown(char, skillIndex).cd * FPS;
  state.skillsCD[key] = cd;

  if (char === "speedster") {
    if (key === "q") state.activeBuffs.q = 3 * FPS;
    if (key === "e") state.activeBuffs.e = 4 * FPS;
    if (key === "r") {
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 6) {
        spawnBullet(
          state.player.x,
          state.player.y,
          state.player.x + Math.cos(i),
          state.player.y + Math.sin(i),
          true,
        );
      }
    }
  } else if (char === "scout") {
    if (key === "q") {
      state.activeBuffs.q = 15; // Animation 15 frames
      state.ghosts.forEach(g => {
        if (dist(state.player.x, state.player.y, g.x, g.y) < 100) {
          g.hp -= 2;
          g.isStunned = 30;
        }
      });
      if (state.boss && dist(state.player.x, state.player.y, state.boss.x, state.boss.y) < 120) {
        state.boss.hp -= 5;
      }
    }
    if (key === "e") {
      let mx = state.mouse.x;
      let my = state.mouse.y;
      let dx = mx - state.player.x;
      let dy = my - state.player.y;
      let len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
      state.player.dashTimeLeft = Math.min(20, Math.floor(len / (state.player.speed * 3))); // Lướt đến đúng điểm chuột
      state.player.dashDx = dx;
      state.player.dashDy = dy;
      state.player.grappleTarget = { x: mx, y: my };
      state.activeBuffs.e = state.player.dashTimeLeft;
    }
    if (key === "r") {
      state.activeBuffs.r = 6 * FPS; // Kích hoạt Hưng Phấn 6 giây
    }
  } else if (char === "medic") {
    if (key === "q") {
      if (state.player.hp < state.player.maxHp) {
        state.player.hp++;
        updateHealthUI();
      }
      state.activeBuffs.q = 30; // Hiện UI +1 HP bay lên
    }
    if (key === "e") state.activeBuffs.e = 5 * FPS; // Tăng tốc nhẹ 5s
    if (key === "r") {
      state.player.hp = state.player.maxHp;
      state.player.gracePeriod = 120; // Tặng thêm 2s bất tử
      updateHealthUI();
      state.activeBuffs.r = 60; // Hiệu ứng thánh giá
    }
  } else if (char === "hunter") {
    if (key === "q") {
      state.ghosts.forEach((g) => {
        if (dist(state.player.x, state.player.y, g.x, g.y) < 100) {
          g.isStunned = 60;
        }
      });
    }
    if (key === "e") state.activeBuffs.e = 4 * FPS;
    if (key === "r") state.activeBuffs.r = 6 * FPS;
  } else if (char === "frost") {
    if (key === "q") {
      state.ghosts.forEach((g) => (g.isStunned = 90));
    }
    if (key === "e") state.player.shield = 2;
    if (key === "r") state.activeBuffs.r = 5 * FPS;
  } else if (char === "gunner") {
    if (key === "q") state.activeBuffs.q = 3 * FPS;
    if (key === "e") state.activeBuffs.e = 5 * FPS;
    if (key === "r") {
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 20) {
        spawnBullet(
          state.player.x,
          state.player.y,
          state.player.x + Math.cos(i),
          state.player.y + Math.sin(i),
          true,
        );
      }
    }
  } else if (char === "timekeeper") {
    if (key === "q") state.activeBuffs.q = 4 * FPS;
    if (key === "e") {
      state.player.x -= 50;
      state.player.y -= 50;
    }
    if (key === "r") {
      state.ghosts.forEach((g) => (g.isStunned = 180));
    }
  } else if (char === "void") {
    if (key === "q") {
      state.bullets.forEach((b) => {
        if (!b.isPlayer) {
          b.x += (state.player.x - b.x) * 0.2;
          b.y += (state.player.y - b.y) * 0.2;
        }
      });
    }
    if (key === "e") {
      state.ghosts.forEach((g) => {
        if (dist(state.player.x, state.player.y, g.x, g.y) < 120) {
          g.hp -= 2;
        }
      });
    }
    if (key === "r") {
      state.bullets.forEach((b) => {
        if (!b.isPlayer) b.life = 0;
      });
    }
  } else if (char === "storm") {
    if (key === "q") {
      state.ghosts.forEach((g) => (g.hp -= 1));
    }
    if (key === "e") state.activeBuffs.e = 4 * FPS;
    if (key === "r") {
      state.ghosts.forEach((g) => (g.hp -= 3));
    }
  } else if (char === "reaper") {
    if (key === "q") {
      state.ghosts.forEach((g) => {
        if (dist(state.player.x, state.player.y, g.x, g.y) < 100) {
          g.hp -= 1;
        }
      });
    }
    if (key === "e") {
      if (state.player.hp < state.player.maxHp) {
        state.player.hp++;
        updateHealthUI();
      }
    }
    if (key === "r") {
      state.ghosts.forEach((g) => (g.hp = 0));
    }
  }
  // ===== BERSERKER =====
  else if (char === "berserker") {
    if (key === "q") state.activeBuffs.q = 4 * FPS;

    if (key === "e") {
      // Bắn 12 đạn siêu gần
      let prevLen = state.bullets.length;
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 6) {
        spawnBullet(
          state.player.x,
          state.player.y,
          state.player.x + Math.cos(i),
          state.player.y + Math.sin(i),
          true,
        );
      }
      for (let i = prevLen; i < state.bullets.length; i++) {
        state.bullets[i].life = 15; // Rất ngắn
      }
    }

    if (key === "r") {
      if (state.player.hp > 1) {
        state.player.hp--;
        updateHealthUI();
      }
      state.activeBuffs.r = 5 * FPS;
    }
  }

  // ===== ASSASSIN =====
  else if (char === "assassin") {
    if (key === "q") {
      state.activeBuffs.q = 2 * FPS; // Xuyên đạn 2 giây
      // Kích hoạt lướt dài
      let dx = 0,
        dy = 0;
      if (state.keys["w"] || state.keys["arrowup"]) dy -= 1;
      if (state.keys["s"] || state.keys["arrowdown"]) dy += 1;
      if (state.keys["a"] || state.keys["arrowleft"]) dx -= 1;
      if (state.keys["d"] || state.keys["arrowright"]) dx += 1;

      if (dx === 0 && dy === 0) {
        let mx = state.mouse.x - state.player.x;
        let my = state.mouse.y - state.player.y;
        let len = Math.sqrt(mx * mx + my * my);
        if (len > 0) {
          dx = mx / len;
          dy = my / len;
        }
      } else {
        let len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      state.player.dashTimeLeft = 20; // Lướt xa hơn (20 frame thay vì 12)
      state.player.dashDx = dx;
      state.player.dashDy = dy;
      state.player.dashCooldownTimer = state.player.dashMaxCooldown;
    }

    if (key === "e") state.activeBuffs.e = 10 * FPS; // Đợi đòn đánh tiếp theo

    if (key === "r") {
      // Hình nón dày đặc
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          let angOffset = (Math.random() - 0.5) * 0.8;
          let dirX = state.mouse.x - state.player.x;
          let dirY = state.mouse.y - state.player.y;
          let angle = Math.atan2(dirY, dirX) + angOffset;

          spawnBullet(
            state.player.x,
            state.player.y,
            state.player.x + Math.cos(angle) * 100,
            state.player.y + Math.sin(angle) * 100,
            true,
            1.5,
          );
        }, i * 60);
      }
    }
  }

  // ===== SUMMONER =====
  else if (char === "summoner") {
    if (key === "q") state.activeBuffs.q = 6 * FPS;

    if (key === "e") {
      if (state.player.hp > 1) {
        state.player.hp--;
        state.activeBuffs.e = 8 * FPS;
        updateHealthUI();
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 5 * FPS;
    }
  }

  // ===== WARDEN =====
  else if (char === "warden") {
    if (key === "q") state.activeBuffs.q = 2.5 * FPS;

    if (key === "e") state.activeBuffs.e = 4 * FPS;

    if (key === "r") state.activeBuffs.r = 4 * FPS;
  }

  // ===== ALCHEMIST =====
  else if (char === "alchemist") {
    if (key === "q") {
      let prevLen = state.bullets.length;
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 5) {
        spawnBullet(
          state.player.x,
          state.player.y,
          state.player.x + Math.cos(i),
          state.player.y + Math.sin(i),
          true,
          1,
        );
      }
      for (let i = prevLen; i < state.bullets.length; i++) {
        let b = state.bullets[i];
        b.radius = 8;
        b.life = 40;
      }
    }

    if (key === "e") {
      if (state.player.hp < state.player.maxHp) {
        state.player.hp++;
        updateHealthUI();
      } else {
        addExperience(50, changeStateFn);
      }
    }

    if (key === "r") {
      state.activeBuffs.r = 3 * FPS;
    }
  }

  // ===== ORACLE =====
  else if (char === "oracle") {
    if (key === "q") state.activeBuffs.q = 3 * FPS; // SỬA: Set thành 3s theo config

    if (key === "e") {
      // Dịch chuyển đến chuột
      let mx = state.mouse.x;
      let my = state.mouse.y;

      // Clamp vào màn hình - SỬA LỖI: Không fix cứng 800/600 mà phải dùng canvas dynamic
      mx = Math.max(
        state.player.radius,
        Math.min(canvas.width - state.player.radius, mx),
      );
      my = Math.max(
        state.player.radius,
        Math.min(canvas.height - state.player.radius, my),
      );

      // Tạo phantom tĩnh (dư ảnh)
      if (!state.phantoms) state.phantoms = [];
      state.phantoms.push({
        x: state.player.x,
        y: state.player.y,
        life: 2 * FPS, // Tồn tại 2 giây
        color: state.player.color,
        radius: state.player.radius,
      });

      state.player.x = mx;
      state.player.y = my;
    }

    if (key === "r") state.activeBuffs.r = 4 * FPS; // Đạn bẻ lái 4s
  }

  // ===== SNIPER =====
  else if (char === "sniper") {
    if (key === "q") state.activeBuffs.q = 5 * FPS; // Tụ điểm

    if (key === "e") {
      let prevLen = state.bullets.length;
      spawnBullet(
        state.player.x,
        state.player.y,
        state.mouse.x,
        state.mouse.y,
        true,
        2,
      );
      if (state.bullets.length > prevLen) {
        let b = state.bullets[state.bullets.length - 1];
        b.pierce = true; // Xuyên thấu!
        b.damage = 5; // Cực mạnh
        b.radius = 8;
        b.style = 2; // Màu riêng
      }
    }

    if (key === "r") {
      // Tìm mục tiêu gần nhất tại thời điểm ấn
      let nearestDist = Infinity;
      let targetObj = null;
      let { player, boss, ghosts } = state;
      if (boss) {
        nearestDist = Math.sqrt(
          (player.x - boss.x) ** 2 + (player.y - boss.y) ** 2,
        );
        targetObj = boss;
      }
      ghosts.forEach((g) => {
        if (g.x > 0 && g.isStunned <= 0) {
          let d = Math.sqrt((player.x - g.x) ** 2 + (player.y - g.y) ** 2);
          if (d < nearestDist) {
            nearestDist = d;
            targetObj = g;
          }
        }
      });

      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          let tx = state.mouse.x,
            ty = state.mouse.y;
          // Cập nhật vị trí đích theo target live, nếu bị tiêu diệt thì bắn vị trí cũ
          if (
            targetObj &&
            (targetObj === boss ||
              (targetObj.x > 0 && targetObj.isStunned <= 0))
          ) {
            tx = targetObj.x;
            ty = targetObj.y;
          }
          let oldLen = state.bullets.length;
          spawnBullet(state.player.x, state.player.y, tx, ty, true, 2);
          if (state.bullets.length > oldLen) {
            let b = state.bullets[state.bullets.length - 1];
            b.damage = 2;
            b.radius = 6;
          }
        }, i * 150);
      }
    }
  }

  // ===== ENGINEER =====
  else if (char === "engineer") {
    // ===== Q: Turret =====
    if (key === "q") {
      if (!state.engineerTurrets) state.engineerTurrets = [];

      state.engineerTurrets.push({
        x: state.player.x,
        y: state.player.y,
        life: 6 * FPS, // 6s
      });
    }

    // ===== E: Buff =====
    if (key === "e") {
      state.activeBuffs.e = 4 * FPS;
    }

    // ===== R: Shield =====
    if (key === "r") {
      state.activeBuffs.r = 5 * FPS;
    }
  }

  // ===== SPIRIT =====
  else if (char === "spirit") {
    // ===== Q: Hóa Hồn =====
    if (key === "q") {
      state.activeBuffs.q = 3 * FPS;
    }

    // ===== E: Truy Hồn =====
    if (key === "e") {
      state.activeBuffs.e = 4 * FPS;
    }

    // ===== R: Thiên Phạt =====
    if (key === "r") {
      // Damage toàn map
      state.ghosts.forEach((g) => {
        if (g.x > 0) {
          g.hp = (g.hp || 1) - 3;
          g.isStunned = 60;
        }
      });

      if (state.boss) {
        state.boss.hp -= 20;
      }
      state.activeBuffs.r = 10; // 10 frame flash
    }
  }

  // ===== DRUID =====
  else if (char === "druid") {
    // ===== Q: Hạt Mầm =====
    if (key === "q") {
      state.activeBuffs.q = 5 * FPS;

      if (!state.druidOrbs) state.druidOrbs = [];

      state.druidOrbs = [];
      for (let i = 0; i < 3; i++) {
        state.druidOrbs.push({
          angle: (i * Math.PI * 2) / 3,
          radius: 40,
        });
      }
    }

    // ===== E: Tái Sinh =====
    if (key === "e") {
      if (state.player.hp < state.player.maxHp) {
        state.player.hp++;
        updateHealthUI();
      }
      state.activeBuffs.e = 4 * FPS;
    }

    // ===== R: Split shot =====
    if (key === "r") {
      state.activeBuffs.r = 4 * FPS;
    }
  }
}
export function handleSkillsUpdate(canvas, changeStateFn) {
  if (!state.skillsCD) initSkills();

  ["q", "e", "r"].forEach((key) => {
    if (state.keys[key] && !state.prevKeys[key] && state.skillsCD[key] <= 0) {
      triggerSkill(key, canvas, changeStateFn);
    }
    if (state.skillsCD[key] > 0) state.skillsCD[key]--;
    if (state.activeBuffs[key] > 0) state.activeBuffs[key]--;
  });

  updateSkillsUI();
  state.prevKeys = { ...state.keys };
}