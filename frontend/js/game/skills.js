import { state } from "../state.js";
import { FPS } from "../config.js";
import { CHARACTERS } from "../characters/data.js";
import { triggerCharacterSkill } from "../characters/characterRegistry.js";

const RARITY_COLORS = {
  common: "#4ade80",
  rare: "#60a5fa",
  legendary: "#c084fc",
  mythical: "#ff0088",
};

// Tự suy ra icon từ tên/mô tả kỹ năng (không cần thêm field vào data.js).
// Quy tắc nào khớp trước thì dùng -> để cụ thể lên trên.
const SKILL_ICON_RULES = [
  [/bẫy/i, "🪤"],
  [/lưỡi hái|chém|trảm|kết liễu/i, "🗡️"],
  [/hố đen|hư không|nuốt|hút|hấp thụ/i, "🕳️"],
  [/phi tiêu|chốt hạ|một phát|bắn tỉa|tụ điểm|tầm nhìn tử/i, "🎯"],
  [/vẽ|màu|tranh|nét/i, "🎨"],
  [/triệu hồi|minion|linh hồn|tháp|turret|drone|hộ vệ|bầy|sáng tạo|thiên khải|địa ngục/i, "✨"],
  [/mìn|bom|nổ|pháo kích|không kích|chấn động|thiên thạch|đại phản|bình nổ|shockwave/i, "💥"],
  [/laser|tia|vết nứt|rạch|súng điện|hủy diệt/i, "🔆"],
  [/băng|đóng băng|tuyết|frost|giáp băng/i, "❄️"],
  [/lửa|cháy|hỏa|phượng|\btro\b|cầu lửa/i, "🔥"],
  [/sét|điện|lôi|bão điện|thiên phạt|trời phạt|thiên khải/i, "⚡"],
  [/khiên|giáp|chắn|bất tử|miễn|pháo đài|tường|thánh giới|thánh địa|tàng hình/i, "🛡️"],
  [/lướt|dịch chuyển|bước nhảy|xung phong|ảnh bộ|lao|đu|móc|truy hồn|hóa hồn/i, "💨"],
  [/hồi máu|hồi phục|hồi \d|tái sinh|ban phước|cứu sinh|chưng cất/i, "💚"],
  [/gió|lốc|bão|tâm bão/i, "🌀"],
  [/thời|ngưng đọng|vòng lặp|định mệnh|tiên tri|tầm nhìn/i, "⏳"],
  [/đánh dấu/i, "🎯"],
  [/đẩy|đấm|hút máu|tử chiến|máu điên|cuồng nộ/i, "👊"],
  [/gia tốc|quá tải|tăng lực|hưng phấn|gia cường|tăng tốc|chuyển hệ/i, "⚡"],
];

function getCharData(charId) {
  return CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
}

function matchIconRule(text) {
  for (const [re, icon] of SKILL_ICON_RULES) {
    if (re.test(text)) return icon;
  }
  return null;
}

function getSkillIcon(skill, key) {
  const name = skill?.name || "";
  // Bỏ phần "(Hồi: 8s ...)" trong desc để keyword không bị nhiễu.
  const desc = (skill?.desc || "").replace(/\([^)]*\)/g, "");
  return (
    matchIconRule(name) ||
    matchIconRule(`${name} ${desc}`) ||
    { q: "🔹", e: "🔸", r: "💠" }[key] ||
    "✦"
  );
}

let _skillTooltipEl = null;
function ensureSkillTooltip() {
  if (_skillTooltipEl && document.body.contains(_skillTooltipEl)) {
    return _skillTooltipEl;
  }
  _skillTooltipEl =
    document.getElementById("skill-tooltip") || document.createElement("div");
  _skillTooltipEl.id = "skill-tooltip";
  if (!document.body.contains(_skillTooltipEl)) {
    document.body.appendChild(_skillTooltipEl);
  }
  return _skillTooltipEl;
}

function showSkillTooltip(key, slot) {
  const char = getCharData(state.player?.characterId || "speedster");
  const idx = key === "q" ? 0 : key === "e" ? 1 : 2;
  const skill = char.skills?.[idx];
  if (!skill) return;

  const color = RARITY_COLORS[char.rarity] || "#00ffcc";
  const cdText = skill.cooldown
    ? `Hồi: ${skill.cooldown}s${
        skill.initialCooldown ? ` · Khóa ${skill.initialCooldown}s đầu` : ""
      }`
    : "Không hồi chiêu";

  const tip = ensureSkillTooltip();
  tip.style.borderColor = color;
  tip.innerHTML = `
    <div class="st-name" style="color:${color}"><span class="st-key">${key.toUpperCase()}</span>${skill.name}</div>
    <div class="st-desc">${skill.desc || ""}</div>
    <div class="st-cd">⏱ ${cdText}</div>
  `;
  tip.style.display = "block";

  const rect = slot.getBoundingClientRect();
  tip.style.left = `${rect.left + rect.width / 2}px`;
  tip.style.top = `${rect.top - tip.offsetHeight - 10}px`;
}

function hideSkillTooltip() {
  if (_skillTooltipEl) _skillTooltipEl.style.display = "none";
}

// Gán icon + viền hào quang theo độ hiếm cho từng ô chiêu (gọi mỗi khi đổi nhân vật).
export function refreshSkillIcons() {
  const char = getCharData(state.player?.characterId || "speedster");
  const color = RARITY_COLORS[char.rarity] || "#888";
  ["q", "e", "r"].forEach((key, idx) => {
    const iconEl = document.getElementById(`icon-${key}`);
    if (iconEl) {
      iconEl.textContent = getSkillIcon(char.skills?.[idx], key);
      iconEl.style.textShadow = `0 0 8px ${color}`;
    }
  });
}

export function ensureSkillsUI() {
  const hud = document.querySelector(".hud-layer");

  if (!document.getElementById("skills-css")) {
    const style = document.createElement("style");
    style.id = "skills-css";
    style.innerHTML = `
      #skills-ui { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px; pointer-events: auto; z-index: 50; }
      .skill-slot { position: relative; width: 56px; height: 56px; background: radial-gradient(circle at 50% 32%, #232334, #14141c); border: 2px solid #444; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.5); cursor: help; transition: transform .12s ease, box-shadow .12s ease; }
      .skill-slot:hover { transform: translateY(-3px) scale(1.06); }
      .skill-slot.ready { border-color: #00ffcc; box-shadow: 0 0 12px rgba(0, 255, 204, 0.5); }
      .skill-slot.active { border-color: #ff00ff; box-shadow: 0 0 16px rgba(255, 0, 255, 0.65); }
      .skill-icon { font-size: 26px; line-height: 1; z-index: 2; pointer-events: none; }
      .skill-key { position: absolute; bottom: 1px; right: 4px; font-size: 11px; font-weight: bold; color: #fff; z-index: 3; text-shadow: 1px 1px 2px #000; pointer-events: none; }
      .skill-cd-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 0%; background: rgba(0, 0, 0, 0.72); z-index: 1; transition: height 0.1s linear; pointer-events: none; }
      .skill-cd-text { position: absolute; font-size: 18px; font-weight: bold; color: #ff5555; z-index: 4; text-shadow: 1px 1px 2px #000; pointer-events: none; }
      #skill-tooltip { position: fixed; z-index: 9999; max-width: 240px; padding: 10px 12px; background: rgba(12,12,20,0.96); border: 2px solid #555; border-radius: 8px; color: #e8e8f0; font-family: Arial, sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,0.6); pointer-events: none; display: none; transform: translateX(-50%); }
      #skill-tooltip .st-name { font-size: 15px; font-weight: bold; margin-bottom: 5px; }
      #skill-tooltip .st-key { display: inline-block; min-width: 16px; padding: 0 5px; margin-right: 7px; background: #2a2a3a; border-radius: 4px; font-size: 12px; text-align: center; }
      #skill-tooltip .st-desc { font-size: 12px; line-height: 1.45; color: #c4c4d4; }
      #skill-tooltip .st-cd { margin-top: 7px; font-size: 11px; color: #ffcc66; }
    `;
    document.head.appendChild(style);
  }

  // Dùng lại #skills-ui có sẵn trong index.html, hoặc tạo mới nếu thiếu.
  let skillsUI = document.getElementById("skills-ui");
  if (!skillsUI && hud) {
    skillsUI = document.createElement("div");
    skillsUI.id = "skills-ui";
    skillsUI.innerHTML = `
      <div class="skill-slot" id="slot-q"><span class="skill-icon" id="icon-q">🔹</span><span class="skill-key">Q</span><div class="skill-cd-overlay" id="cd-q"></div><div class="skill-cd-text" id="cd-text-q"></div></div>
      <div class="skill-slot" id="slot-e"><span class="skill-icon" id="icon-e">🔸</span><span class="skill-key">E</span><div class="skill-cd-overlay" id="cd-e"></div><div class="skill-cd-text" id="cd-text-e"></div></div>
      <div class="skill-slot" id="slot-r"><span class="skill-icon" id="icon-r">💠</span><span class="skill-key">R</span><div class="skill-cd-overlay" id="cd-r"></div><div class="skill-cd-text" id="cd-text-r"></div></div>
    `;
    hud.appendChild(skillsUI);
  }
  if (!skillsUI) return;

  // Đảm bảo mỗi ô có icon span + gắn tooltip hover (idempotent, dù DOM tĩnh sẵn).
  const fallbackIcons = { q: "🔹", e: "🔸", r: "💠" };
  ["q", "e", "r"].forEach((key) => {
    const slot = document.getElementById(`slot-${key}`);
    if (!slot) return;
    if (!document.getElementById(`icon-${key}`)) {
      const icon = document.createElement("span");
      icon.className = "skill-icon";
      icon.id = `icon-${key}`;
      icon.textContent = fallbackIcons[key];
      slot.insertBefore(icon, slot.firstChild);
    }
    if (!slot.dataset.skillHoverBound) {
      slot.dataset.skillHoverBound = "1";
      slot.addEventListener("mouseenter", () => showSkillTooltip(key, slot));
      slot.addEventListener("mouseleave", hideSkillTooltip);
    }
  });
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

function setTextIfChanged(el, value) {
  if (!el) return;
  const text = String(value);
  if (el.textContent !== text) el.textContent = text;
}

function setStyleIfChanged(el, prop, value) {
  if (!el) return;
  if (el.style[prop] !== value) el.style[prop] = value;
}

function setSlotState(slot, stateName) {
  if (!slot || slot.dataset.state === stateName) return;
  slot.dataset.state = stateName;
  slot.classList.remove("ready", "active");
  if (stateName) slot.classList.add(stateName);
}

export function initSkills() {
  ensureSkillsUI();
  refreshSkillIcons();
  let charId = state.player?.characterId || "speedster";
  state.skillsCD = {
    q: getCooldown(charId, 0).initCd * FPS,
    e: getCooldown(charId, 1).initCd * FPS,
    r: getCooldown(charId, 2).initCd * FPS,
  };
  state.activeBuffs = { q: 0, e: 0, r: 0 };
  state.prevKeys = {};
  state.skillsUiDirty = true;
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
      setSlotState(slot, "");
      let percent = (state.skillsCD[key] / maxCd) * 100;
      setStyleIfChanged(overlay, "height", `${Math.min(100, percent)}%`);
      setTextIfChanged(text, Math.ceil(state.skillsCD[key] / FPS));
    } else {
      setStyleIfChanged(overlay, "height", "0%");
      setTextIfChanged(text, "");
      if (state.activeBuffs[key] > 0) {
        setSlotState(slot, "active");
      } else {
        setSlotState(slot, "ready");
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
    const cdrMultiplier = state.player.cdr || 1.0;
    state.skillsCD[key] = Math.floor(cd * cdrMultiplier);
    state.skillsUiDirty = true;
  }
}

export function handleSkillsUpdate(canvas, changeStateFn) {
  if (!state.skillsCD) initSkills();
  // Chết (đang chờ hồi sinh trong MP) thì không được dùng chiêu. update() đã
  // chặn bắn/di chuyển khi chết, nhưng skill trigger ở đây (trước update) nên
  // phải chặn riêng.
  const canCast = !state.player?.isDead;
  ["q", "e", "r"].forEach((key) => {
    if (canCast && state.keys[key] && !state.prevKeys[key] && state.skillsCD[key] <= 0) {
      triggerSkill(key, canvas, changeStateFn);
    }
    if (state.skillsCD[key] > 0) state.skillsCD[key]--;
    if (state.activeBuffs[key] > 0) state.activeBuffs[key]--;
  });
  if (state.skillsUiDirty || (state.frameCount || 0) % 6 === 0) {
    updateSkillsUI();
    state.skillsUiDirty = false;
  }
  state.prevKeys = { ...state.keys };
}
