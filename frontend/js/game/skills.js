import { state } from "../state.js";
import { FPS } from "../config.js";
import { CHARACTERS } from "../characters/data.js";
import { triggerCharacterSkill } from "../characters/characterRegistry.js";

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

/**
 * Hàm kích hoạt kỹ năng - Đã dọn dẹp if/else
 */
function triggerSkill(key, canvas, changeStateFn) {
  let charId = state.player.characterId;
  let skillIndex = key === "q" ? 0 : key === "e" ? 1 : 2;
  let cd = getCooldown(charId, skillIndex).cd * FPS;

  // 1. Chạy logic riêng của từng nhân vật thông qua Registry
  const success = triggerCharacterSkill(charId, key, state, canvas, changeStateFn);

  // 2. Nếu kích hoạt thành công (hoặc mặc định), bắt đầu tính Cooldown
  if (success !== false) {
    state.skillsCD[key] = cd;
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