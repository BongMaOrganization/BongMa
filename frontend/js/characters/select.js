import { state } from "../state.js";
import { GHOST_DATA_KEY } from "../config.js";
import { CHARACTERS } from "./data.js";
import { saveGame, saveGameToServer } from "../utils.js";

export function openCharacterSelect(changeStateFn) {
  changeStateFn("MENU");
  document.getElementById("screen-main").classList.add("hidden");

  let detailScreen = document.getElementById("screen-upgrade-detail");
  if (detailScreen) detailScreen.classList.add("hidden");

  document.getElementById("screen-char-select").classList.remove("hidden");
  renderCharacterSelect();
}

export function renderCharacterSelect() {
  document.getElementById("char-coins").innerText =
    `Tiền: ${state.player?.coins || 0}`;
  let container = document.getElementById("char-cards");
  container.innerHTML = "";

  const rarityOrder = { common: 1, rare: 2, legendary: 3, mythical: 4 };
  const rarityColors = { common: "#4ade80", rare: "#60a5fa", legendary: "#c084fc", mythical: "#ff0088" };
  const sortedCharacters = [...CHARACTERS].sort((a, b) => {
    return (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99);
  });

  sortedCharacters.forEach((char) => {
    let owned = state.ownedCharacters.includes(char.id);
    let selected = state.selectedCharacter === char.id;
    let card = document.createElement("div");
    card.className = "card";
    card.style.width = "190px";

    let skillsHtml = char.skills
      .map((s) => {
        let keyPrefix = s.key ? `[${s.key.toUpperCase()}] ` : "";
        return `• <b style="color: #00ffcc">${s.name}</b>: ${keyPrefix}${s.desc}`;
      })
      .join("<br><br>");

    // TÍNH TOÁN CHỈ SỐ THỰC TẾ (Bao gồm các nâng cấp)
    let upg = state.characterUpgrades[char.id] || {
      hp: 0,
      speed: 0,
      fireRate: 0,
    };
    let actualHp = char.baseStats.hp + (upg.hp || 0);
    let actualSpeed = (
      char.baseStats.speed *
      (1 + (upg.speed || 0) * 0.05)
    ).toFixed(1);

    let rColor = rarityColors[char.rarity] || "#fff";
    let rLabel = (char.rarity || "common").toUpperCase();

    card.innerHTML = `
      <h3 style="color: ${rColor}">${char.name} <span style="font-size: 11px;">(${rLabel})</span> ${selected ? "<br><span style='color:#ffd700;font-size:12px;'>(Đã chọn)</span>" : ""}</h3>
      <p style="margin-bottom: 5px; color: #ffaa00; font-weight: bold; font-size: 13px;">HP: ${actualHp} | Tốc độ: ${actualSpeed} | Tia: ${char.baseStats.multiShot} | Nẩy: ${char.baseStats.bounces || 0}</p>
      <div class="char-skills" style="font-size: 0.9em; margin-bottom: 10px; height: 110px; overflow-y: auto; text-align: left; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 5px;">
        ${skillsHtml}
      </div>
    `;

    if (owned) {
      let selBtn = document.createElement("button");
      selBtn.innerText = selected ? "Đã chọn" : "Chọn";
      selBtn.disabled = selected;
      selBtn.onclick = () => {
        state.selectedCharacter = char.id;
        // LƯU LẠI LÊN SERVER NGAY KHI CHỌN
        saveGame(state, GHOST_DATA_KEY);
        saveGameToServer(state, GHOST_DATA_KEY);
        renderCharacterSelect();
      };
      card.appendChild(selBtn);

      let upgBtn = document.createElement("button");
      upgBtn.innerText = "Nâng cấp";
      upgBtn.style.background = "#00aaff";
      upgBtn.onclick = () => {
        document.getElementById("screen-char-select").classList.add("hidden");
        document
          .getElementById("screen-upgrade-detail")
          .classList.remove("hidden");
        renderUpgradeDetail(char.id);
      };
      card.appendChild(upgBtn);
    } else {
      let lock = document.createElement("div");
      lock.innerText = "Chưa mở khóa";
      lock.style.marginTop = "10px";
      lock.style.color = "#ff4444";
      lock.style.fontWeight = "bold";
      card.appendChild(lock);
    }

    container.appendChild(card);
  });
}

export function renderUpgradeDetail(charId) {
  let char = CHARACTERS.find((c) => c.id === charId);
  let upg = state.characterUpgrades[charId] || { hp: 0, speed: 0, fireRate: 0 };

  document.getElementById("upg-detail-title").innerText =
    `NÂNG CẤP: ${char.name.toUpperCase()}`;
  document.getElementById("upg-detail-coins").innerText =
    `Tiền hiện có: ${state.player?.coins || 0}`;

  const MAX_LEVEL = 10;
  const getCost = (lvl) => 100 + lvl * 50;

  const statsConfigs = [
    {
      key: "hp",
      name: "Máu Tối Đa",
      current: upg.hp || 0,
      effect: "+1 HP / Cấp",
    },
    {
      key: "speed",
      name: "Tốc độ chạy",
      current: upg.speed || 0,
      effect: "+5% Tốc độ / Cấp",
    },
    {
      key: "fireRate",
      name: "Tốc độ bắn",
      current: upg.fireRate || 0,
      effect: "Giảm Delay / Cấp",
    },
  ];

  let container = document.getElementById("upg-detail-stats");
  container.innerHTML = "";

  statsConfigs.forEach((stat) => {
    let row = document.createElement("div");
    row.className = "stat-row";

    let isMax = stat.current >= MAX_LEVEL;
    let cost = getCost(stat.current);
    let canAfford = state.player.coins >= cost && !isMax;

    let barHtml = "";
    for (let i = 0; i < MAX_LEVEL; i++) {
      barHtml += `<div class="stat-bar-segment ${i < stat.current ? "filled" : ""}"></div>`;
    }

    row.innerHTML = `
      <div class="stat-info">
        ${stat.name} (Cấp ${stat.current}/${MAX_LEVEL})<br>
        <span style="font-size:0.8em; color:#00ffcc;">${stat.effect}</span>
      </div>
      <div class="stat-bar-container">${barHtml}</div>
    `;

    let btn = document.createElement("button");
    btn.className = "btn-stat-upg";
    btn.innerText = isMax ? "TỐI ĐA" : `+ CẤP (${cost})`;
    btn.disabled = !canAfford;
    btn.onclick = () => {
      if (state.player.coins >= cost && !isMax) {
        state.player.coins -= cost;
        if (!state.characterUpgrades[charId]) {
          state.characterUpgrades[charId] = { hp: 0, speed: 0, fireRate: 0 };
        }
        state.characterUpgrades[charId][stat.key] = stat.current + 1;
        saveGame(state, GHOST_DATA_KEY);
        saveGameToServer(state, GHOST_DATA_KEY);
        renderUpgradeDetail(charId);
      }
    };

    row.appendChild(btn);
    container.appendChild(row);
  });

  let backBtn = document.getElementById("btn-upg-detail-back");
  if (backBtn) {
    backBtn.onclick = () => {
      document.getElementById("screen-upgrade-detail").classList.add("hidden");
      document.getElementById("screen-char-select").classList.remove("hidden");
      renderCharacterSelect();
    };
  }
}

export function closeShopOrSelect() {
  document.getElementById("screen-shop").classList.add("hidden");
  document.getElementById("screen-char-select").classList.add("hidden");
  let detailScreen = document.getElementById("screen-upgrade-detail");
  if (detailScreen) detailScreen.classList.add("hidden");
  document.getElementById("screen-main").classList.remove("hidden");
}

export function setupMenuButtons(openShopFn, changeStateFn) {
  document.getElementById("btn-shop").onclick = () => openShopFn(changeStateFn);
  document.getElementById("btn-select-character").onclick = () =>
    openCharacterSelect(changeStateFn);
  document.getElementById("btn-shop-back").onclick = closeShopOrSelect;
  document.getElementById("btn-char-back").onclick = closeShopOrSelect;

  window.addEventListener("click", (e) => {
    const screenShop = document.getElementById("screen-shop");
    const screenChar = document.getElementById("screen-char-select");

    if (screenShop && !screenShop.classList.contains("hidden")) {
      if (e.target.closest("#btn-shop")) return;

      if (e.target === screenShop || e.target.id === "shop-cards") {
        if (e.target.id === "shop-cards" && e.offsetX > e.target.clientWidth) {
          return;
        }
        closeShopOrSelect();
      }
    }

    if (screenChar && !screenChar.classList.contains("hidden")) {
      if (e.target.closest("#btn-select-character")) return;

      if (e.target === screenChar || e.target.id === "char-cards") {
        if (e.target.id === "char-cards" && e.offsetX > e.target.clientWidth) {
          return;
        }
        closeShopOrSelect();
      }
    }
  });
}
