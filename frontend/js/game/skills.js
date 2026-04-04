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
  let charConfig = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
  let cd = charConfig.skills[skillIndex]?.cooldown;
  let initCd = charConfig.skills[skillIndex]?.initialCooldown;
  return {
    cd: cd !== undefined ? cd : 10,
    initCd: initCd !== undefined ? initCd : 0,
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
  } else if (char === "tank") {
    if (key === "q") {
      state.player.shield = Math.min((state.player.maxShield || 0) + 1, 5);
      updateHealthUI();
    }
    if (key === "e") state.activeBuffs.e = 3 * FPS;
    if (key === "r") {
      state.bullets.forEach((b) => {
        if (!b.isPlayer && dist(state.player.x, state.player.y, b.x, b.y) < 200)
          b.life = 0;
      });
      state.activeBuffs.r = 15;
    }
  } else if (char === "brawler") {
    if (key === "q") {
      state.activeBuffs.q = 15;
      state.ghosts.forEach((g) => {
        let d = dist(state.player.x, state.player.y, g.x, g.y);
        if (d < 120) {
          let force = (120 - d) / 10;
          let angle = Math.atan2(g.y - state.player.y, g.x - state.player.x);
          g.x += Math.cos(angle) * force * 15;
          g.y += Math.sin(angle) * force * 15;
          g.isStunned = 60;
          g.hp = (g.hp || 1) - 1;
        }
      });
      if (
        state.boss &&
        dist(state.player.x, state.player.y, state.boss.x, state.boss.y) < 150
      )
        state.boss.hp -= 2;
    }
    if (key === "e") state.activeBuffs.e = 5 * FPS;
    if (key === "r") {
      state.activeBuffs.r = 30;
      state.ghosts.forEach((g) => {
        if (dist(state.player.x, state.player.y, g.x, g.y) < 300) {
          g.hp -= 3;
          g.isStunned = 120;
        }
      });
      if (
        state.boss &&
        dist(state.player.x, state.player.y, state.boss.x, state.boss.y) < 300
      )
        state.boss.hp -= 10;
      state.bullets.forEach((b) => {
        if (!b.isPlayer && dist(state.player.x, state.player.y, b.x, b.y) < 300)
          b.life = 0;
      });
    }
  } else if (char === "medic") {
    if (key === "q") {
      if (state.player.hp < state.player.maxHp) {
        state.player.hp++;
        updateHealthUI();
      }
      state.activeBuffs.q = 30;
    }
    if (key === "e") state.activeBuffs.e = 5 * FPS;
    if (key === "r") {
      state.player.hp = Math.min(state.player.hp + 5, state.player.maxHp);
      state.player.gracePeriod = 120;
      updateHealthUI();
      state.activeBuffs.r = 60;
    }
  } else if (char === "warden") {
    if (key === "q") state.activeBuffs.q = 2.5 * FPS;
    if (key === "e") state.activeBuffs.e = 4 * FPS;
    if (key === "r") state.activeBuffs.r = 4 * FPS;
  } else if (char === "engineer") {
    if (key === "q") {
      if (!state.engineerTurrets) state.engineerTurrets = [];
      state.engineerTurrets.push({
        x: state.player.x,
        y: state.player.y,
        life: 6 * FPS,
      });
    }
    if (key === "e") state.activeBuffs.e = 4 * FPS;
    if (key === "r") state.activeBuffs.r = 5 * FPS;
  } else if (char === "druid") {
    if (key === "q") {
      state.activeBuffs.q = 5 * FPS;
      state.druidOrbs = [];
      for (let i = 0; i < 3; i++)
        state.druidOrbs.push({ angle: (i * Math.PI * 2) / 3, radius: 40 });
    }
    if (key === "e") {
      if (state.player.hp < state.player.maxHp) {
        state.player.hp++;
        updateHealthUI();
      }
      state.activeBuffs.e = 4 * FPS;
    }
    if (key === "r") state.activeBuffs.r = 4 * FPS;
  } else if (char === "hunter") {
    if (key === "q") {
      if (!state.hunterTraps) state.hunterTraps = [];
      state.hunterTraps.push({ x: state.player.x, y: state.player.y });
    }
    if (key === "e") {
      state.activeBuffs.e = 5 * FPS;
    }
    if (key === "r") {
      let prevLen = state.bullets.length;
      spawnBullet(
        state.player.x,
        state.player.y,
        state.mouse.x,
        state.mouse.y,
        true,
      );
      if (state.bullets.length > prevLen) {
        let b = state.bullets[state.bullets.length - 1];
        b.radius = 40;
        b.damage = 3;
        b.pierce = true;
        b.vx *= 0.5;
        b.vy *= 0.5;
        b.life = 120;
        b.isShuriken = true;
      }
    }
  } else if (char === "frost") {
    if (key === "q") state.activeBuffs.q = 2 * FPS;
    if (key === "e") {
      state.player.shield = 1;
      updateHealthUI();
      state.activeBuffs.e = 10 * FPS;
    }
    if (key === "r") state.activeBuffs.r = 5 * FPS;
  } else if (char === "gunner") {
    if (key === "q") {
      state.activeBuffs.q = 15;
      let angle = Math.atan2(
        state.mouse.y - state.player.y,
        state.mouse.x - state.player.x,
      );
      state.gunnerLaser = {
        x: state.player.x,
        y: state.player.y,
        angle: angle,
      };
      let p1 = { x: state.player.x, y: state.player.y };
      let p2 = {
        x: state.player.x + Math.cos(angle) * 1000,
        y: state.player.y + Math.sin(angle) * 1000,
      };
      const distToLine = (p, v, w) => {
        let l2 = dist(v.x, v.y, w.x, w.y) ** 2;
        if (l2 === 0) return dist(p.x, p.y, v.x, v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return dist(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
      };
      state.ghosts.forEach((g) => {
        if (g.x > 0 && distToLine({ x: g.x, y: g.y }, p1, p2) < g.radius + 15) {
          g.hp -= 3;
          g.isStunned = 60;
        }
      });
      if (
        state.boss &&
        distToLine({ x: state.boss.x, y: state.boss.y }, p1, p2) <
          state.boss.radius + 15
      )
        state.boss.hp -= 15;
    }
    if (key === "e") {
      if (!state.gunnerMines) state.gunnerMines = [];
      state.gunnerMines.push({ x: state.player.x, y: state.player.y });
    }
    if (key === "r") {
      if (!state.gunnerAirstrikes) state.gunnerAirstrikes = [];
      state.gunnerAirstrikes.push({
        x: state.mouse.x,
        y: state.mouse.y,
        timer: 1 * FPS,
      });
    }
  } else if (char === "sharpshooter") {
    if (key === "q") state.activeBuffs.q = 5 * FPS;
    if (key === "e") state.activeBuffs.e = 4 * FPS;
    if (key === "r") {
      state.ghosts.forEach((g) => {
        if (g.x > 0) g.isStunned = 300;
      });
      if (state.boss) state.boss.hp -= 30;
      state.activeBuffs.r = 10;
    }
  } else if (char === "ghost") {
    if (key === "q") state.activeBuffs.q = 3 * FPS;
    if (key === "e") {
      state.player.x = Math.max(
        state.player.radius,
        Math.min(canvas.width - state.player.radius, state.mouse.x),
      );
      state.player.y = Math.max(
        state.player.radius,
        Math.min(canvas.height - state.player.radius, state.mouse.y),
      );
    }
    if (key === "r") {
      let absorbed = 0;
      state.bullets.forEach((b) => {
        if (
          !b.isPlayer &&
          dist(state.player.x, state.player.y, b.x, b.y) < 150
        ) {
          b.life = 0;
          absorbed++;
        }
      });
      if (absorbed > 0 && state.player.hp < state.player.maxHp) {
        state.player.hp++;
        updateHealthUI();
      }
    }
  } else if (char === "oracle") {
    if (key === "q") state.activeBuffs.q = 3 * FPS;
    if (key === "e") {
      let mx = Math.max(
        state.player.radius,
        Math.min(canvas.width - state.player.radius, state.mouse.x),
      );
      let my = Math.max(
        state.player.radius,
        Math.min(canvas.height - state.player.radius, state.mouse.y),
      );
      if (!state.phantoms) state.phantoms = [];
      state.phantoms.push({
        x: state.player.x,
        y: state.player.y,
        life: 2 * FPS,
        color: state.player.color,
        radius: state.player.radius,
      });
      state.player.x = mx;
      state.player.y = my;
    }
    if (key === "r") state.activeBuffs.r = 4 * FPS;
  } else if (char === "mage") {
    if (key === "q") {
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 4) {
        spawnBullet(
          state.player.x,
          state.player.y,
          state.player.x + Math.cos(i),
          state.player.y + Math.sin(i),
          true,
          1,
        );
      }
    }
    if (key === "e") {
      if (state.player.hp > 1) {
        state.player.hp--;
        updateHealthUI();
        addExperience(50, changeStateFn);
      }
    }
    if (key === "r") state.activeBuffs.r = 4 * FPS;
  } else if (char === "timekeeper") {
    if (key === "q") {
      let mx = Math.max(
        state.player.radius,
        Math.min(canvas.width - state.player.radius, state.mouse.x),
      );
      let my = Math.max(
        state.player.radius,
        Math.min(canvas.height - state.player.radius, state.mouse.y),
      );
      if (!state.explosions) state.explosions = [];
      state.explosions.push({
        x: state.player.x,
        y: state.player.y,
        radius: 30,
        life: 10,
        color: "rgba(0, 255, 255, 0.5)",
      });
      state.player.x = mx;
      state.player.y = my;
      state.explosions.push({
        x: mx,
        y: my,
        radius: 30,
        life: 10,
        color: "rgba(0, 255, 255, 0.8)",
      });
    }
    if (key === "e") state.activeBuffs.e = 3 * FPS;
    if (key === "r") state.activeBuffs.r = 4 * FPS;
  } else if (char === "void") {
    if (key === "q") {
      if (!state.voidBlackholes) state.voidBlackholes = [];
      state.voidBlackholes.push({
        x: state.mouse.x,
        y: state.mouse.y,
        life: 3 * FPS,
      });
    }
    if (key === "e") {
      let count = 0;
      state.bullets.forEach((b) => {
        if (!b.isPlayer) {
          b.life = 0;
          count++;
        }
      });
      if (count > 0 && state.player.hp < state.player.maxHp) {
        state.player.hp++;
        updateHealthUI();
      }
      state.activeBuffs.e = 15;
    }
    if (key === "r") state.activeBuffs.r = 3 * FPS;
  } else if (char === "storm") {
    if (key === "q") {
      let targets = [...state.ghosts].filter(
        (g) => g.x > 0 && g.isStunned <= 0,
      );
      targets.sort(
        (a, b) =>
          dist(state.player.x, state.player.y, a.x, a.y) -
          dist(state.player.x, state.player.y, b.x, b.y),
      );
      if (state.boss) targets.unshift(state.boss);
      targets = targets.slice(0, 3);

      if (!state.stormLightnings) state.stormLightnings = [];
      targets.forEach((t) => {
        state.stormLightnings.push({ x: t.x, y: t.y, life: 15 });
        t.hp -= 5;
        if (t !== state.boss) t.isStunned = 120;
      });
    }
    if (key === "e") {
      let dx = 0,
        dy = 0;
      if (state.keys["w"] || state.keys["arrowup"]) dy -= 1;
      if (state.keys["s"] || state.keys["arrowdown"]) dy += 1;
      if (state.keys["a"] || state.keys["arrowleft"]) dx -= 1;
      if (state.keys["d"] || state.keys["arrowright"]) dx += 1;
      if (dx === 0 && dy === 0) {
        dx = 1;
        dy = 0;
      }
      let len = Math.sqrt(dx * dx + dy * dy);
      state.player.dashDx = dx / len;
      state.player.dashDy = dy / len;
      state.player.dashTimeLeft = 15;
      state.player.dashCooldownTimer = state.player.dashMaxCooldown;
      state.activeBuffs.e = 15;
    }
    if (key === "r") state.activeBuffs.r = 5 * FPS;
  } else if (char === "reaper") {
    if (key === "q") {
      state.activeBuffs.q = 15;
      let angle = Math.atan2(
        state.mouse.y - state.player.y,
        state.mouse.x - state.player.x,
      );
      state.reaperSlash = {
        x: state.player.x,
        y: state.player.y,
        angle: angle,
        life: 15,
      };
      state.ghosts.forEach((g) => {
        if (g.x > 0 && dist(state.player.x, state.player.y, g.x, g.y) < 150) {
          let a = Math.atan2(g.y - state.player.y, g.x - state.player.x);
          let diff = Math.abs(a - angle);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;
          if (diff < Math.PI / 2) {
            g.hp -= 8;
            g.isStunned = 60;
          }
        }
      });
      if (
        state.boss &&
        dist(state.player.x, state.player.y, state.boss.x, state.boss.y) <
          150 + state.boss.radius
      ) {
        let a = Math.atan2(
          state.boss.y - state.player.y,
          state.boss.x - state.player.x,
        );
        let diff = Math.abs(a - angle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < Math.PI / 2) state.boss.hp -= 20;
      }
    }
    if (key === "e") state.activeBuffs.e = 3 * FPS;
    if (key === "r") state.activeBuffs.r = 2 * FPS;
  } else if (char === "alchemist") {
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
        state.bullets[i].radius = 8;
        state.bullets[i].life = 40;
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
    if (key === "r") state.activeBuffs.r = 3 * FPS;
  } else if (char === "sniper") {
    if (key === "q") state.activeBuffs.q = 5 * FPS;
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
        b.pierce = true;
        b.damage = 5;
        b.radius = 8;
        b.style = 2;
      }
    }
    if (key === "r") {
      let nearestDist = Infinity;
      let targetObj = null;
      if (state.boss) {
        nearestDist = Math.sqrt(
          (state.player.x - state.boss.x) ** 2 +
            (state.player.y - state.boss.y) ** 2,
        );
        targetObj = state.boss;
      }
      state.ghosts.forEach((g) => {
        if (g.x > 0 && g.isStunned <= 0) {
          let d = Math.sqrt(
            (state.player.x - g.x) ** 2 + (state.player.y - g.y) ** 2,
          );
          if (d < nearestDist) {
            nearestDist = d;
            targetObj = g;
          }
        }
      });
      for (let i = 0; i < 5; i++) {
        state.delayedTasks.push({
          delay: Math.round(i * 0.15 * FPS),
          action: () => {
            let tx = state.mouse.x,
              ty = state.mouse.y;
            if (
              targetObj &&
              (targetObj === state.boss ||
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
          },
        });
      }
    }
  } else if (char === "spirit") {
    if (key === "q") state.activeBuffs.q = 3 * FPS;
    if (key === "e") state.activeBuffs.e = 4 * FPS;
    if (key === "r") {
      state.ghosts.forEach((g) => {
        if (g.x > 0) {
          g.hp = (g.hp || 1) - 3;
          g.isStunned = 60;
        }
      });
      if (state.boss) state.boss.hp -= 20;
      state.activeBuffs.r = 10;
    }
  } else if (char === "summoner") {
    if (key === "q") state.activeBuffs.q = 6 * FPS;
    if (key === "e") {
      if (state.player.hp > 1) {
        state.player.hp--;
        state.activeBuffs.e = 8 * FPS;
        updateHealthUI();
      }
    }
    if (key === "r") state.activeBuffs.r = 5 * FPS;
  } else if (char === "berserker") {
    if (key === "q") state.activeBuffs.q = 4 * FPS;
    if (key === "e") {
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
        state.bullets[i].life = 15;
      }
    }
    if (key === "r") {
      if (state.player.hp > 1) {
        state.player.hp--;
        updateHealthUI();
      }
      state.activeBuffs.r = 5 * FPS;
    }
  } else if (char === "assassin") {
    if (key === "q") {
      state.activeBuffs.q = 2 * FPS;
      let dx = 0,
        dy = 0;
      if (state.keys["w"] || state.keys["arrowup"]) dy -= 1;
      if (state.keys["s"] || state.keys["arrowdown"]) dy += 1;
      if (state.keys["a"] || state.keys["arrowleft"]) dx -= 1;
      if (state.keys["d"] || state.keys["arrowright"]) dx += 1;
      if (dx === 0 && dy === 0) {
        let mx = state.mouse.x - state.player.x,
          my = state.mouse.y - state.player.y;
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
      state.player.dashTimeLeft = 20;
      state.player.dashDx = dx;
      state.player.dashDy = dy;
      state.player.dashCooldownTimer = state.player.dashMaxCooldown;
    }
    if (key === "e") state.activeBuffs.e = 10 * FPS;
    if (key === "r") {
      for (let i = 0; i < 15; i++) {
        state.delayedTasks.push({
          delay: Math.round(i * 0.06 * FPS),
          action: () => {
            let angOffset = (Math.random() - 0.5) * 0.8;
            let dirX = state.mouse.x - state.player.x,
              dirY = state.mouse.y - state.player.y;
            let angle = Math.atan2(dirY, dirX) + angOffset;
            spawnBullet(
              state.player.x,
              state.player.y,
              state.player.x + Math.cos(angle) * 100,
              state.player.y + Math.sin(angle) * 100,
              true,
              1.5,
            );
          },
        });
      }
    }
  } else if (char === "scout") {
    // ===== Q: Trảm Xoáy =====
    if (key === "q") {
      state.activeBuffs.q = 15;
      state.isScoutQ = true; // Flag for drawing

      const dmg = 10; // Tăng sát thương để chém chết quái
      const radius = 150; // Tăng tầm chém

      state.ghosts.forEach((g) => {
        if (dist(state.player.x, state.player.y, g.x, g.y) < radius) {
          g.isStunned = Math.max(g.isStunned, 60);
        }
      });
      if (
        state.boss &&
        dist(state.player.x, state.player.y, state.boss.x, state.boss.y) <
          radius + state.boss.radius
      )
        state.boss.hp -= dmg;

      // Reset visual after 15 frames
      state.delayedTasks.push({
        delay: 15,
        action: () => {
          state.isScoutQ = false;
        },
      });
    }

    // ===== E: Bắn Móc =====
    if (key === "e") {
      let mx = state.mouse.x,
        my = state.mouse.y;
      let dx = mx - state.player.x,
        dy = my - state.player.y;
      let len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
      // Đu móc mượt hơn, tốc độ 3.5x normal
      state.player.dashTimeLeft = Math.min(
        25,
        Math.floor(len / (state.player.speed * 3.5)),
      );
      state.player.dashDx = dx;
      state.player.dashDy = dy;
      state.player.grappleTarget = { x: mx, y: my };
      state.activeBuffs.e = state.player.dashTimeLeft;
    }
    if (key === "r") state.activeBuffs.r = 6 * FPS;
  } else if (char === "phoenix") {
    // ===== Q: Dấu Cháy =====
    if (key === "q") {
      state.activeBuffs.q = 5 * FPS;

      if (!state.phoenixTrails) state.phoenixTrails = [];
    }

    // ===== E: Tro Tàn =====
    if (key === "e") {
      state.activeBuffs.e = 10; // 👉 thêm dòng này (10 frame effect)
      // 📍 lưu vị trí nổ
      let ex = state.player.x;
      let ey = state.player.y;

      // 💥 nổ
      state.ghosts.forEach((g) => {
        let d = dist(ex, ey, g.x, g.y);
        if (d < 120) {
          g.hp -= 2;
          g.isStunned = 60;
        }
      });

      // 🧹 clear bullet
      state.bullets = state.bullets.filter((b) => dist(b.x, b.y, ex, ey) > 120);

      // 🎨 lưu effect vị trí nổ
      state.phoenixEfx = {
        x: ex,
        y: ey,
        life: 10,
      };

      // ⚡ teleport sau cùng
      state.player.x = state.mouse.x;
      state.player.y = state.mouse.y;
    }

    // ===== R: Tái Sinh =====
    if (key === "r") {
      state.activeBuffs.r = 5 * FPS;
      state.phoenixReviveReady = true;
    }
  } else if (char === "necromancer") {
    if (!state.necroMinions) state.necroMinions = [];

    // ===== Q: spawn orbit =====
    if (key === "q") {
      for (let i = 0; i < 3; i++) {
        state.necroMinions.push({
          x: state.player.x,
          y: state.player.y,
          life: 6 * FPS,
          type: "seeker",
          angle: (i * Math.PI * 2) / 3,
          radius: 40,
        });
      }
    }

    // ===== E: explode =====
    if (key === "e") {
      if (!state.necroExplosions) state.necroExplosions = [];

      state.necroMinions.forEach((m) => {
        // 💥 damage
        state.ghosts.forEach((g) => {
          if (dist(m.x, m.y, g.x, g.y) < 100) {
            g.hp -= 3;
            g.isStunned = 40;
          }
        });

        if (state.boss && dist(m.x, m.y, state.boss.x, state.boss.y) < 100) {
          state.boss.hp -= 3;
        }

        // 👉 lưu visual
        state.necroExplosions.push({
          x: m.x,
          y: m.y,
          life: 15,
        });
      });

      // clear minion
      state.necroMinions = [];
    }

    // ===== R: hell zone =====
    if (key === "r") {
      state.necroZone = {
        x: state.player.x,
        y: state.player.y,
        life: 10 * FPS,
        spawnTick: 0,
      };
    }
  } else if (char === "painter") {
    if (!state.painterTrails) state.painterTrails = [];
    if (!state.painterZones) state.painterZones = [];

    // ===== Q: Nét Vẽ =====
    if (key === "q") {
      if (!state.painterTrails) state.painterTrails = [];

      state.painterDrawing = true;
      state.painterDrawTime = 3 * FPS;
    }
    // ===== E: paint bomb =====
    if (key === "e") {
      state.painterBomb = {
        x: state.mouse.x,
        y: state.mouse.y,
        life: 30, // delay ~0.5s
      };
    }

    // ===== R: living painting =====
    if (key === "r") {
      state.activeBuffs.r = 6 * FPS;
    }

    // ===== DESTROYER (Thần Hủy Diệt) =====
  } else if (char === "destroyer") {
    // ===== Q: Vết Nứt Không Gian =====
    if (key === "q") {
      const mx = state.mouse?.x || state.player.x;
      const my = state.mouse?.y || state.player.y;
      const angle = Math.atan2(my - state.player.y, mx - state.player.x);
      const len = Math.min(300, dist(state.player.x, state.player.y, mx, my));

      // Spawn laser trail
      if (!state.destroyerRifts) state.destroyerRifts = [];
      state.destroyerRifts.push({
        x: state.player.x,
        y: state.player.y,
        endX: state.player.x + Math.cos(angle) * len,
        endY: state.player.y + Math.sin(angle) * len,
        life: 5 * FPS,
        angle: angle,
      });

      // Instant damage on path
      if (state.boss) {
        const bx = state.boss.x,
          by = state.boss.y;
        const dx = bx - state.player.x,
          dy = by - state.player.y;
        const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
        const perpDist = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
        if (proj > 0 && proj < len && perpDist < 50) {
          state.boss.hp -= 8;
        }
      }

      state.skillsCD.q = getCooldown(char, 0).cd * FPS;
    }

    // ===== E: Hấp Thụ =====
    if (key === "e") {
      state.destroyerAbsorb = {
        x: state.player.x,
        y: state.player.y,
        life: 1 * FPS, // 1s invulnerable
        radius: 150,
        absorbed: 0,
      };
      state.player.gracePeriod = Math.max(state.player.gracePeriod, FPS);

      // Absorb enemy bullets
      let absorbed = 0;
      state.bullets = state.bullets.filter((b) => {
        if (
          !b.isPlayer &&
          dist(b.x, b.y, state.player.x, state.player.y) < 150
        ) {
          absorbed++;
          return false;
        }
        return true;
      });

      // Every 5 bullets = +1 multishot for 6s
      const bonusShots = Math.floor(absorbed / 5);
      if (bonusShots > 0) {
        state.player.buffs = state.player.buffs || { multiShot: 0, bounces: 0 };
        state.player.buffs.multiShot += bonusShots;
        state.destroyerAbsorbBuff = { shots: bonusShots, life: 6 * FPS };
      }

      state.skillsCD.e = getCooldown(char, 1).cd * FPS;
    }

    // ===== R: Hủy Diệt =====
    if (key === "r") {
      state.destroyerUlt = {
        life: 8 * FPS,
        radius: 120,
      };
      state.activeBuffs.r = 8 * FPS;
      state.skillsCD.r = getCooldown(char, 2).cd * FPS;
    }

    // ===== CREATOR (Thần Sáng Thế) =====
  } else if (char === "creator") {
    // ===== Q: Sáng Tạo - 4 tháp canh =====
    if (key === "q") {
      if (!state.creatorTurrets) state.creatorTurrets = [];
      const offsets = [
        { dx: -80, dy: -80 },
        { dx: 80, dy: -80 },
        { dx: -80, dy: 80 },
        { dx: 80, dy: 80 },
      ];
      offsets.forEach((off) => {
        state.creatorTurrets.push({
          x: state.player.x + off.dx,
          y: state.player.y + off.dy,
          life: 8 * FPS,
          fireCD: 0,
        });
      });
      state.skillsCD.q = getCooldown(char, 0).cd * FPS;
    }

    // ===== E: Ban Phước =====
    if (key === "e") {
      // Heal
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 2);
      updateHealthUI();

      // Holy zone
      state.creatorHolyZone = {
        x: state.player.x,
        y: state.player.y,
        life: 6 * FPS,
        radius: 130,
      };
      state.skillsCD.e = getCooldown(char, 1).cd * FPS;
    }

    // ===== R: Thiên Khải =====
    if (key === "r") {
      if (!state.creatorOrbs) state.creatorOrbs = [];
      for (let i = 0; i < 6; i++) {
        state.creatorOrbs.push({
          angle: (i / 6) * Math.PI * 2,
          orbitRadius: 80,
          life: 10 * FPS,
          fireCD: 0,
        });
      }
      state.creatorDeathSave = true;
      state.activeBuffs.r = 10 * FPS;
      state.skillsCD.r = getCooldown(char, 2).cd * FPS;
    }

    // ===== KNIGHT (Kỵ Sĩ) =====
  } else if (char === "knight") {
    // ===== Q: Xung Phong =====
    if (key === "q") {
      const mx = state.mouse?.x || state.player.x + 100;
      const my = state.mouse?.y || state.player.y;
      const angle = Math.atan2(my - state.player.y, mx - state.player.x);

      state.knightCharge = {
        vx: Math.cos(angle) * 12,
        vy: Math.sin(angle) * 12,
        life: 15, // ~0.25s
      };
      state.player.gracePeriod = Math.max(state.player.gracePeriod, 15);

      // Damage boss if close
      if (state.boss) {
        const d = dist(
          state.player.x,
          state.player.y,
          state.boss.x,
          state.boss.y,
        );
        if (d < 100) {
          state.boss.hp -= 5;
        }
      }

      state.skillsCD.q = getCooldown(char, 0).cd * FPS;
    }

    // ===== E: Khiên Phản =====
    if (key === "e") {
      state.knightShield = {
        life: 3 * FPS,
        blockedCount: 0,
      };
      state.player.gracePeriod = Math.max(state.player.gracePeriod, 3 * FPS);
      state.skillsCD.e = getCooldown(char, 1).cd * FPS;
    }

    // ===== R: Cuồng Nộ =====
    if (key === "r") {
      state.knightRage = {
        life: 6 * FPS,
      };
      state.activeBuffs.r = 6 * FPS;
      state.skillsCD.r = getCooldown(char, 2).cd * FPS;
    }
  } else if (char === "elementalist") {
    // ===== Q: ĐỔI HỆ =====
    if (key === "q") {
      const elements = ["fire", "ice", "lightning", "earth", "wind"];
      let idx = elements.indexOf(state.element);
      state.element = elements[(idx + 1) % elements.length];

      state.skillsCD.q = getCooldown(char, 0).cd * FPS;
    }

    // ===== E: SKILL THEO ELEMENT =====
    if (key === "e") {
      let el = state.element;

      // 🔥 FIRE
      if (el === "fire") {
        state.hazards.push({
          x: state.mouse.x,
          y: state.mouse.y,
          radius: 80,
          type: "fire",
          life: 120,
          damage: 0.5,
          owner: "player",
        });
      }

      // ❄️ ICE
      if (el === "ice") {
        state.hazards.push({
          x: state.mouse.x,
          y: state.mouse.y,
          radius: 100,
          type: "frost",
          life: 120,
          slow: 0.5,
          owner: "player",
        });
      }

      // ⚡ LIGHTNING
      if (el === "lightning") {
        state.hazards.push({
          x: state.mouse.x,
          y: state.mouse.y,
          radius: 120,
          type: "static",
          life: 15,
          owner: "player",
        });
        state.ghosts.forEach((g) => {
          if (dist(state.mouse.x, state.mouse.y, g.x, g.y) < 200) {
            g.hp -= 2;
            g.isStunned = 40;
          }
        });

        if (
          state.boss &&
          dist(state.mouse.x, state.mouse.y, state.boss.x, state.boss.y) < 200
        ) {
          state.boss.hp -= 3;
        }
      }

      // 🪨 EARTH
      if (el === "earth") {
        state.hazards.push({
          x: state.mouse.x,
          y: state.mouse.y,
          radius: 60,
          type: "rock",
          life: 180,
          owner: "player",
        });
      }

      // 🌪 WIND
      if (el === "wind") {
        if (!state.windTornadoes) state.windTornadoes = [];

        state.windTornadoes.push({
          x: state.mouse.x,
          y: state.mouse.y,
          radius: 140,
          life: 120,
        });
      }

      state.skillsCD.e = getCooldown(char, 1).cd * FPS;
    }

    // ===== R: ULTIMATE =====
    if (key === "r") {
      let el = state.element;

      state.activeBuffs.r = 5 * FPS;

      // 🔥 FIRE RAIN
      if (el === "fire") {
        state.elementR = { type: "fire", life: 5 * FPS };
      }

      // ❄️ FREEZE ALL
      if (el === "ice") {
        state.elementR = {
          type: "ice_rain",
          life: 5 * FPS,
        };
      }

      // ⚡ STORM
      if (el === "lightning") {
        state.elementR = { type: "lightning", life: 5 * FPS };
      }

      // 🪨 EARTH SHOCK
      if (el === "earth") {
        state.elementR = { type: "earth", life: 5 * FPS };
      }
      // 🌪 VORTEX
      if (el === "wind") {
        state.elementR = { type: "wind", life: 5 * FPS };
      }

      state.skillsCD.r = getCooldown(char, 2).cd * FPS;
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
