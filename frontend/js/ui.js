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

    upgradeDiv.innerText = `${upgrade}: ${state.upgrades[upgrade]
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

    div.className = `card ${isEvolutionCard ? "gold evolution-card" : ""
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

  if (!boss || !boss.phaseColors) return;

  const ratio = boss.hp / boss.maxHp;

  let phase;
  if (boss.phaseCount === 5) {
    phase = ratio > 0.8 ? 0 : ratio > 0.6 ? 1 : ratio > 0.4 ? 2 : ratio > 0.2 ? 3 : 4;
  } else if (boss.phaseCount === 3) {
    phase = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;
  } else {
    phase = ratio > 0.5 ? 0 : 1;
  }

  // Check if the phase has changed
  if (boss.currentPhase !== phase) {
    boss.currentPhase = phase; // Update the current phase

    // Trigger phase transition animation
    const bossUI = document.getElementById("boss-ui");
    if (bossUI) {
      bossUI.classList.add("phase-transition");
      setTimeout(() => bossUI.classList.remove("phase-transition"), 300); // Remove class after animation
    }
  }

  const current = boss.phaseColors[phase];

  // Update CSS variables for boss UI
  root.style.setProperty("--boss-name-color", current.end);
  root.style.setProperty("--boss-name-shadow", current.start);
  root.style.setProperty("--boss-hp-start", current.start);
  root.style.setProperty("--boss-hp-end", current.end);
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

