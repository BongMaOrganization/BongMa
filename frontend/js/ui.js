import { state } from "./state.js";
import { evolve } from "./main.js";
import { renderShop } from "./characters/shop.js";
export const UI = {
  main: document.getElementById("screen-main"),
  upgrade: document.getElementById("screen-upgrade"),
  bossReward: document.getElementById("screen-boss-reward"),
  title: document.getElementById("main-title"),
  desc: document.getElementById("main-desc"),
  btnStart: document.getElementById("btn-start"),
  timer: document.getElementById("timer"),
  level: document.getElementById("level-display"),
  ghosts: document.getElementById("ghost-count"),
  dash: document.getElementById("dash-cooldown"),
  healthBar: document.getElementById("health-bar"),
  shieldIcon: document.getElementById("shield-icon"),
  bossUi: document.getElementById("boss-ui"),
  bossHp: document.getElementById("boss-hp-fill"),
  bossHpTrail: document.getElementById("boss-hp-trail"),
  bossHpMarkers: document.getElementById("boss-hp-markers"),
  bossName: document.getElementById("boss-name"),
  xpBar: document.getElementById("xp-bar-fill"),
  xpText: document.getElementById("xp-text"),
  fragmentToast: document.getElementById("fragment-toast"),
  fragmentToastIcon: document.getElementById("fragment-toast-icon"),
  fragmentToastText: document.getElementById("fragment-toast-text"),
};

// ======================
// UPGRADE TRACKER UI
// ======================
export function updateUpgradeUI() {
  const upgradeContainer = document.getElementById("upgrade-tracker");
  if (!upgradeContainer) return;

  upgradeContainer.innerHTML = "";

  Object.keys(state.upgrades).forEach((upgrade) => {
    const upgradeDiv = document.createElement("div");
    upgradeDiv.className = "upgrade-item";

    const isEvolved = state.evolutions[upgrade];

    upgradeDiv.innerText = `${upgrade}: ${
      state.upgrades[upgrade]
    } / 5 ${isEvolved ? "(Evolved)" : ""}`;

    upgradeContainer.appendChild(upgradeDiv);
  });
}

// ======================
// XP UI
// ======================
export function updateXPUI() {
  if (!state.player) return;

  let ratio = Math.min(
    1,
    state.player.experience / state.player.experienceToLevel,
  );

  UI.xpBar.style.width = `${ratio * 100}%`;
  UI.xpText.innerText = `XP: ${state.player.experience}/${state.player.experienceToLevel}`;
}

// ======================
// HEALTH UI
// ======================
export function updateHealthUI() {
  UI.healthBar.innerHTML = "";

  for (let i = 0; i < state.player.maxHp; i++) {
    let div = document.createElement("div");
    div.className = `heart ${i >= state.player.hp ? "empty" : ""}`;
    UI.healthBar.appendChild(div);
  }

  if (state.player.shield > 0) {
    UI.shieldIcon.style.display = "flex";
    UI.shieldIcon.innerText = state.player.shield;
    UI.healthBar.appendChild(UI.shieldIcon);
  } else {
    UI.shieldIcon.style.display = "none";
  }
}

// ======================
// REROLL UI (FIXED)
// ======================
export function updateRerollUI() {
  let div = document.getElementById("reroll-count");

  if (!div) {
    div = document.createElement("div");
    div.id = "reroll-count";
    div.className = "reroll-count";
    document.getElementById("screen-upgrade").appendChild(div);
  }

  div.innerText = `Lượt đổi thẻ: ${3 - state.rerollCount}`;
}

// ======================
// CARD GENERATION
// ======================
export function generateCards(pool, container, isGold, onSelectCallback) {
  container.innerHTML = "";

  // 🔥 LỌC ẨN: Không cho ra thẻ đã Evolution VÀ Không cho ra thẻ đã MAX (đạt cấp 5)
  let poolToUse = pool.filter((u) => {
    let count = state.upgrades[u.id] || 0;
    return !state.evolutions[u.id] && count < 5;
  });

  // 🔥 thêm evolution card nếu có
  if (state.evolutionReady) {
    poolToUse.unshift({
      id: state.evolutionReady,
      name: "✨ EVOLVE: " + state.evolutionReady.toUpperCase(),
      desc: "Mở khóa sức mạnh tối thượng",
      isEvolution: true,
    });
  }

  let shuffled = [...poolToUse].sort(() => 0.5 - Math.random());
  let selected = shuffled.slice(0, 3);

  selected.forEach((upg) => {
    let div = document.createElement("div");

    const isEvolutionCard = upg.isEvolution;
    const isEvolved = state.evolutions[upg.id];

    div.className = `card ${
      isEvolutionCard ? "gold evolution-card" : ""
    } ${isEvolved ? "evolved-card" : ""}`;

    div.innerHTML = `<h3>${upg.name}</h3><p>${upg.desc}</p>`;

    // ===== HIỂN THỊ COUNT =====
    if (!isEvolutionCard) {
      const count = state.upgrades[upg.id] || 0;

      const text = document.createElement("div");
      text.className = "upgrade-count-text";
      text.innerText = `${count}/5`;

      div.appendChild(text);

      const bar = document.createElement("div");
      bar.className = "upgrade-progress-bar";

      const fill = document.createElement("div");
      fill.className = "upgrade-progress-fill";
      fill.style.width = `${(count / 5) * 100}%`;

      bar.appendChild(fill);
      div.appendChild(bar);
    }

    // ===== DISABLE nếu đã evolve =====
    if (isEvolved) {
      div.innerHTML += `<p class="evolved-text">ULTIMATE</p>`;
      div.style.pointerEvents = "none";
      div.style.opacity = "0.5";
    }

    // ===== CLICK =====
    div.onclick = () => {
      if (isEvolved) return;

      console.log("PICK:", upg.id);

      // 🔥 EVOLUTION
      if (isEvolutionCard) {
        evolve(upg.id);
        state.evolutionReady = null;
        state.evolutions[upg.id] = true;

        updateUpgradeUI();
        onSelectCallback(); // ✅ chỉ gọi 1 lần
        return;
      }

      // 🔥 NORMAL
      state.upgrades[upg.id] = (state.upgrades[upg.id] || 0) + 1;

      if (upg.action) {
        upg.action(state.player);
        // KHẮC PHỤC LỖI UPDATE MÁU: Phải gọi lệnh vẽ lại trái tim sau khi lấy thẻ!
        updateHealthUI();
      }

      if (state.upgrades[upg.id] === 5) {
        state.evolutionReady = upg.id;
      }

      updateUpgradeUI();
      updateRerollUI();

      onSelectCallback();
    };

    container.appendChild(div);
  });

  // ===== REROLL =====
  const rerollButton = document.createElement("button");
  rerollButton.innerText = "Reroll";

  rerollButton.onclick = () => {
    if (state.rerollCount < 3) {
      state.rerollCount++;
      updateRerollUI();
      generateCards(pool, container, isGold, onSelectCallback);
    } else {
      alert("Không còn lượt đổi!");
    }
  };

  container.appendChild(rerollButton);

  updateUpgradeUI();
  updateRerollUI();
}

export function updateBossUI() {
  const boss = state.boss;
  const root = document.documentElement;

  if (!boss) return;

  if (!boss.phaseColors) {
    const c = boss.color || "#ff0055";
    boss.phaseColors = [
      { start: c, end: c },
      { start: "#ff4444", end: "#ff00ff" },
      { start: "#ff00ff", end: "#00ffff" },
      { start: "#aa00ff", end: "#ff0000" },
      { start: "#ffff00", end: "#ffffff" },
    ];
  }

  const ratio = boss.hp / boss.maxHp;

  // Handle markers if not present
  if (UI.bossHpMarkers.childElementCount === 0) {
    const segments = boss.phaseCount || (boss.bossType === "omni" ? 5 : 3);
    for (let i = 1; i < segments; i++) {
        let marker = document.createElement("div");
        marker.className = "boss-hp-marker";
        marker.style.width = (100 / segments) + "%";
        UI.bossHpMarkers.appendChild(marker);
    }
  }

  // Update theme
  const bossThemeClass = `boss-theme-${boss.bossType || boss.id || "default"}`;
  if (!UI.bossUi.classList.contains(bossThemeClass)) {
    UI.bossUi.className = ""; // clear all
    UI.bossUi.classList.add(bossThemeClass);
  }

  let phase;
  if (boss.phaseCount === 5) {
    phase =
      ratio > 0.8 ? 0 : ratio > 0.6 ? 1 : ratio > 0.4 ? 2 : ratio > 0.2 ? 3 : 4;
  } else if (boss.phaseCount === 3) {
    phase = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;
  } else {
    phase = ratio > 0.5 ? 0 : 1;
  }

  // Check if the phase has changed
  if (boss.currentPhase !== phase) {
    boss.currentPhase = phase;
    const bossUI = document.getElementById("boss-ui");
    if (bossUI) {
      bossUI.classList.add("phase-transition");
      setTimeout(() => bossUI.classList.remove("phase-transition"), 300);
    }
  }

  const current = boss.phaseColors[phase];

  // Update CSS variables for boss UI
  root.style.setProperty("--boss-name-color", current.end);
  root.style.setProperty("--boss-name-shadow", current.start);
  root.style.setProperty("--boss-hp-start", current.start);
  root.style.setProperty("--boss-hp-end", current.end);

  // Glitch boss special effect
  if (bossThemeClass === "boss-theme-glitch" && ratio < 0.3) {
      const glitchedNames = ["!@#*&^", "E R R O R", "0x000F", boss.name];
      document.getElementById("boss-name").innerText = glitchedNames[Math.floor(Math.random() * glitchedNames.length)];
  } else {
      document.getElementById("boss-name").innerText = boss.name;
  }
}

export function updateCharacterUI(character) {
  const characterName = document.getElementById("character-name");
  const characterRarity = document.getElementById("character-rarity");

  if (characterName) {
    characterName.innerText = character.name;
  }

  if (characterRarity) {
    characterRarity.innerText = `Rarity: ${character.rarity}`;
    characterRarity.className = `rarity-${character.rarity.toLowerCase()}`; // Add CSS class for styling
  }
}

export function updateGachaUI() {
  // Handled by new shop system
}

export function updateTradingUI() {
  // Handled by new shop system
}

function renderMapSelectLegacy(onSelect) {
  const container = document.getElementById("map-list");
  container.innerHTML = "";

  state.maps.forEach((map) => {
    const btn = document.createElement("div");
    btn.className = "premium-card map-select-card";

    if (map.id === "omni") {
      btn.style.setProperty("--theme-color", "#ffd700");
    } else if (map.id === "void") {
      btn.style.setProperty("--theme-color", "#aa00ff");
    } else {
      btn.style.setProperty("--theme-color", "#00ffff");
    }

    btn.innerHTML = `
      <div class="premium-card-icon">🌍</div>
      <div class="premium-card-title">${map.id}</div>
      <div class="premium-card-subtitle">${map.unlocked ? 'Tín hiệu khả dụng' : 'Chưa thu thập đủ dữ liệu 🔒'}</div>
    `;

    if (!map.unlocked) {
      btn.classList.add("locked");
    } else {
      btn.onclick = () => {
        state.selectedMap = map.id;
        document.getElementById("screen-map-select").classList.add("hidden");
        onSelect(); 
      };
    }

    container.appendChild(btn);
  });
}

const MAP_CARD_META = {
  fire: {
    title: "FIRE",
    icon: "&#128293;",
    flavor: "Dung nham va tro lua",
    status: "Tin hieu kha dung",
    color: "#ff7a1a",
    colorSoft: "rgba(255, 122, 26, 0.22)",
    core: "rgba(255, 146, 66, 0.32)",
    highlight: "#ffd27a",
    glow: "rgba(255, 114, 26, 0.58)",
  },
  ice: {
    title: "ICE",
    icon: "&#10052;",
    flavor: "Han bang va suong gia",
    status: "Tin hieu kha dung",
    color: "#7edcff",
    colorSoft: "rgba(126, 220, 255, 0.2)",
    core: "rgba(167, 237, 255, 0.28)",
    highlight: "#effcff",
    glow: "rgba(92, 212, 255, 0.5)",
  },
  earth: {
    title: "EARTH",
    icon: "&#129704;",
    flavor: "Dia tang nut vo va bui da",
    status: "Tin hieu kha dung",
    color: "#c49b58",
    colorSoft: "rgba(196, 155, 88, 0.2)",
    core: "rgba(115, 81, 44, 0.32)",
    highlight: "#efd7a3",
    glow: "rgba(196, 136, 72, 0.44)",
  },
  wind: {
    title: "WIND",
    icon: "&#127786;",
    flavor: "Loc xuyen va bao gio",
    status: "Tin hieu kha dung",
    color: "#86ffd8",
    colorSoft: "rgba(134, 255, 216, 0.18)",
    core: "rgba(101, 212, 182, 0.28)",
    highlight: "#ebfffa",
    glow: "rgba(82, 255, 197, 0.46)",
  },
  thunder: {
    title: "THUNDER",
    icon: "&#9889;",
    flavor: "Dien quang va xung set",
    status: "Tin hieu kha dung",
    color: "#ffe35a",
    colorSoft: "rgba(255, 227, 90, 0.18)",
    core: "rgba(125, 142, 255, 0.28)",
    highlight: "#fff7b8",
    glow: "rgba(255, 226, 74, 0.52)",
  },
  void: {
    title: "VOID",
    icon: "&#127756;",
    flavor: "Khong gian meo va hon loan",
    status: "Tin hieu kha dung",
    color: "#b870ff",
    colorSoft: "rgba(184, 112, 255, 0.2)",
    core: "rgba(101, 56, 156, 0.3)",
    highlight: "#f4ddff",
    glow: "rgba(184, 112, 255, 0.48)",
  },
  omni: {
    title: "OMNI",
    icon: "&#10024;",
    flavor: "Hoi tu moi nguyen to",
    status: "Tin hieu kha dung",
    color: "#ffd96b",
    colorSoft: "rgba(255, 217, 107, 0.18)",
    core: "rgba(129, 111, 42, 0.32)",
    highlight: "#fff6cf",
    glow: "rgba(255, 217, 107, 0.48)",
  },
  default: {
    title: "MAP",
    icon: "&#127758;",
    flavor: "Tin hieu chua xac dinh",
    status: "Tin hieu kha dung",
    color: "#00ffff",
    colorSoft: "rgba(0, 255, 255, 0.18)",
    core: "rgba(0, 180, 200, 0.26)",
    highlight: "#eaffff",
    glow: "rgba(0, 255, 255, 0.42)",
  },
};

export function renderMapSelect(onSelect) {
  const container = document.getElementById("map-list");
  container.innerHTML = "";

  state.maps.forEach((map) => {
    const meta = MAP_CARD_META[map.id] || MAP_CARD_META.default;
    const btn = document.createElement("div");
    btn.className = "premium-card map-select-card";

    btn.style.setProperty("--theme-color", meta.color);
    btn.style.setProperty("--map-color-soft", meta.colorSoft);
    btn.style.setProperty("--map-core", meta.core);
    btn.style.setProperty("--map-highlight", meta.highlight);
    btn.style.setProperty("--map-glow", meta.glow);

    if (state.selectedMap === map.id && map.unlocked) {
      btn.classList.add("selected");
    }

    btn.innerHTML = `
      <div class="map-card-emblem">
        <div class="map-card-core">
          <div class="map-card-glyph">${meta.icon}</div>
        </div>
      </div>
      <div class="premium-card-title">${meta.title}</div>
      <div class="map-card-flavor">${meta.flavor}</div>
      <div class="premium-card-subtitle">${map.unlocked ? meta.status : "Chua thu thap du du lieu &#128274;"}</div>
    `;

    if (!map.unlocked) {
      btn.classList.add("locked");
    } else {
      btn.onclick = () => {
        state.selectedMap = map.id;
        document.getElementById("screen-map-select").classList.add("hidden");
        onSelect();
      };
    }

    container.appendChild(btn);
  });
}
