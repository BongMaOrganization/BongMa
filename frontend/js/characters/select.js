import { state } from "../state.js";
import { GHOST_DATA_KEY } from "../config.js";
import { CHARACTERS } from "./data.js";
import { saveGame, saveGameToServer } from "../utils.js";

// ==========================================
// 🎨 INJECT CSS CHO GIAO DIỆN ĐỈNH CAO
// ==========================================
const style = document.createElement("style");
style.innerHTML = `
  /* Filter Container */
  .char-filter-container { display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; flex-wrap: wrap; }
  .filter-btn { padding: 6px 16px; border-radius: 20px; background: rgba(0,0,0,0.5); border: 1px solid #555; color: #ccc; cursor: pointer; font-weight: bold; transition: all 0.3s; font-size: 13px; text-transform: uppercase; }
  .filter-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .filter-btn.active[data-rarity="all"] { background: #fff; color: #000; border-color: #fff; box-shadow: 0 0 10px #fff; }
  .filter-btn.active[data-rarity="common"] { background: #4ade80; color: #000; border-color: #4ade80; box-shadow: 0 0 10px #4ade80; }
  .filter-btn.active[data-rarity="rare"] { background: #60a5fa; color: #000; border-color: #60a5fa; box-shadow: 0 0 10px #60a5fa; }
  .filter-btn.active[data-rarity="legendary"] { background: #c084fc; color: #000; border-color: #c084fc; box-shadow: 0 0 15px #c084fc; }
  .filter-btn.active[data-rarity="mythical"] { background: linear-gradient(90deg, #ff0088, #00ffff); color: #fff; border: none; box-shadow: 0 0 15px #ff0088; }

  /* Premium Card Styles */
  .char-card-premium { position: relative; overflow: hidden; transition: transform 0.3s, box-shadow 0.3s; border-radius: 12px; background: rgba(20,20,20,0.85); padding: 15px; display: flex; flex-direction: column; align-items: center; border: 2px solid #444; }
  .char-card-premium:hover { transform: translateY(-5px); z-index: 10; }
  
  .card-common { border-color: #4ade80; }
  .card-rare { border-color: #60a5fa; box-shadow: 0 0 10px rgba(96, 165, 250, 0.2); }
  .card-legendary { border-color: #c084fc; box-shadow: 0 0 20px rgba(192, 132, 252, 0.5); }
  .card-mythical { border-color: transparent; background: linear-gradient(rgba(20,20,20,0.95), rgba(20,20,20,0.95)) padding-box, linear-gradient(45deg, #ff0088, #00ffff, #ff00ff) border-box; border: 2px solid transparent; box-shadow: 0 0 25px rgba(255, 0, 136, 0.6); animation: mythical-pulse 2s infinite alternate; }

  @keyframes mythical-pulse {
    0% { box-shadow: 0 0 15px rgba(255, 0, 136, 0.5); }
    100% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.8); }
  }

  /* Rainbow Text */
  .text-rainbow {
    background: linear-gradient(270deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3);
    background-size: 400% 400%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: rainbow-text 4s ease infinite;
    font-weight: 900;
    text-shadow: 0 0 10px rgba(255,255,255,0.2);
  }
  @keyframes rainbow-text {
    0% { background-position: 0% 50% }
    50% { background-position: 100% 50% }
    100% { background-position: 0% 50% }
  }

  /* Shimmer Effect */
  .shimmer { position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%); transform: skewX(-20deg); pointer-events: none; }
  .card-legendary .shimmer { animation: shimmer-anim 4s infinite; }
  .card-mythical .shimmer { animation: shimmer-anim 2.5s infinite; background: linear-gradient(to right, rgba(0,255,255,0) 0%, rgba(0,255,255,0.5) 50%, rgba(0,255,255,0) 100%); }
  
  @keyframes shimmer-anim {
    0% { left: -100%; }
    15% { left: 200%; }
    100% { left: 200%; }
  }

  /* Scrollbar cho kĩ năng */
  .char-skills::-webkit-scrollbar { width: 4px; }
  .char-skills::-webkit-scrollbar-thumb { background: #666; border-radius: 4px; }
`;
document.head.appendChild(style);

// Biến lưu trữ trạng thái bộ lọc hiện tại
let currentRarityFilter = "all";

// ==========================================
// CÁC HÀM XỬ LÝ CHÍNH
// ==========================================

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

  // Tạo thanh Filter nếu chưa có
  let selectScreen = document.getElementById("screen-char-select");
  let filterContainer = document.getElementById("char-filter-container");

  if (!filterContainer) {
    filterContainer = document.createElement("div");
    filterContainer.id = "char-filter-container";
    filterContainer.className = "char-filter-container";

    // Chèn filter vào trước danh sách thẻ an toàn tuyệt đối
    container.parentNode.insertBefore(filterContainer, container);

    const filters = [
      { id: "all", label: "Tất Cả" },
      { id: "common", label: "Common" },
      { id: "rare", label: "Rare" },
      { id: "legendary", label: "Legendary" },
      { id: "mythical", label: "Mythical" },
    ];

    filters.forEach((f) => {
      let btn = document.createElement("button");
      btn.className = `filter-btn ${currentRarityFilter === f.id ? "active" : ""}`;
      btn.setAttribute("data-rarity", f.id);
      btn.innerText = f.label;
      btn.onclick = () => {
        currentRarityFilter = f.id;
        // Cập nhật class active
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderCharacterSelect(); // Render lại danh sách
      };
      filterContainer.appendChild(btn);
    });
  }

  container.innerHTML = "";

  const rarityOrder = { common: 1, rare: 2, legendary: 3, mythical: 4 };
  const rarityColors = {
    common: "#4ade80",
    rare: "#60a5fa",
    legendary: "#c084fc",
    mythical: "#ff0088",
  };

  const sortedCharacters = [...CHARACTERS].sort((a, b) => {
    return (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99);
  });

  // Lọc nhân vật theo filter
  const filteredCharacters = sortedCharacters.filter((char) => {
    if (currentRarityFilter === "all") return true;
    return char.rarity === currentRarityFilter;
  });

  filteredCharacters.forEach((char) => {
    let owned = state.ownedCharacters.includes(char.id);
    let selected = state.selectedCharacter === char.id;
    let card = document.createElement("div");

    // Gán class độ hiếm để có viền lấp lánh
    let rarityClass = char.rarity ? `card-${char.rarity}` : "card-common";
    card.className = `card char-card-premium ${rarityClass}`;
    card.style.width = "200px";

    let skillsHtml = char.skills
      .map((s) => {
        let keyPrefix = s.key ? `[${s.key.toUpperCase()}] ` : "";
        return `<div style="margin-bottom: 8px;">• <b style="color: #00ffcc">${s.name}</b>:<br><span style="color:#ddd">${keyPrefix}${s.desc}</span></div>`;
      })
      .join("");

    let upg = state.characterUpgrades[char.id] || {
      hp: 0,
      cdr: 0,
      fireRate: 0,
    };
    let actualHp = char.baseStats.hp + (upg.hp || 0);
    // Tính CDR: Cấp 0 = 100%, Cấp 10 = 50%
    let cdrPercent = ((1 - (upg.cdr || 0) * 0.05) * 100).toFixed(0);

    let rColor = rarityColors[char.rarity] || "#fff";
    let rLabel = (char.rarity || "common").toUpperCase();

    // Hiệu ứng chữ cầu vồng cho Mythical
    let titleClass = char.rarity === "mythical" ? "text-rainbow" : "";
    let titleStyle = char.rarity === "mythical" ? "" : `color: ${rColor};`;

    card.innerHTML = `
      <div class="shimmer"></div>
      <h3 class="${titleClass}" style="${titleStyle} text-align: center; margin-top: 0;">
        ${char.name} <br>
        <span style="font-size: 11px; letter-spacing: 1px;">(${rLabel})</span>
      </h3>
      ${selected ? "<div style='color:#ffd700; font-size:12px; font-weight:bold; margin-bottom:5px; text-shadow: 0 0 5px #ffd700;'>🌟 ĐANG CHỌN 🌟</div>" : ""}
      
      <div style="width: 100%; background: rgba(0,0,0,0.5); padding: 8px; border-radius: 6px; margin-bottom: 10px; font-size: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
        <span style="color:#ffaa00; font-weight:bold;">HP:</span> ${actualHp} | 
        <span style="color:#00ffcc; font-weight:bold;">CD:</span> ${cdrPercent}%<br>
        <span style="color:#ff5555; font-weight:bold;">TIA:</span> ${char.baseStats.multiShot} | 
        <span style="color:#bb88ff; font-weight:bold;">NẢY:</span> ${char.baseStats.bounces || 0}
      </div>

      <div class="char-skills" style="width: 100%; font-size: 11px; margin-bottom: 10px; height: 110px; overflow-y: auto; text-align: left; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 5px;">
        ${skillsHtml}
      </div>
    `;

    let btnContainer = document.createElement("div");
    btnContainer.style.display = "flex";
    btnContainer.style.gap = "5px";
    btnContainer.style.width = "100%";

    if (owned) {
      let selBtn = document.createElement("button");
      selBtn.innerText = selected ? "Đã chọn" : "Chọn";
      selBtn.disabled = selected;
      selBtn.style.flex = "1";
      selBtn.style.padding = "8px 0";
      if (selected) selBtn.style.background = "#555";
      selBtn.onclick = () => {
        state.selectedCharacter = char.id;
        saveGame(state, GHOST_DATA_KEY);
        saveGameToServer(state, GHOST_DATA_KEY);
        renderCharacterSelect();
      };
      btnContainer.appendChild(selBtn);

      let upgBtn = document.createElement("button");
      upgBtn.innerText = "Nâng cấp";
      upgBtn.style.flex = "1";
      upgBtn.style.padding = "8px 0";
      upgBtn.style.background = "#00aaff";
      upgBtn.onclick = () => {
        document.getElementById("screen-char-select").classList.add("hidden");
        document
          .getElementById("screen-upgrade-detail")
          .classList.remove("hidden");
        renderUpgradeDetail(char.id);
      };
      btnContainer.appendChild(upgBtn);
    } else {
      let lock = document.createElement("div");
      lock.innerText = "🔒 Chưa mở khóa";
      lock.style.width = "100%";
      lock.style.textAlign = "center";
      lock.style.padding = "8px 0";
      lock.style.background = "rgba(255, 68, 68, 0.2)";
      lock.style.color = "#ff4444";
      lock.style.borderRadius = "5px";
      lock.style.fontWeight = "bold";
      btnContainer.appendChild(lock);
    }

    card.appendChild(btnContainer);
    container.appendChild(card);
  });
}

export function renderUpgradeDetail(charId) {
  let char = CHARACTERS.find((c) => c.id === charId);
  let upg = state.characterUpgrades[charId] || { hp: 0, cdr: 0, fireRate: 0 };

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
      key: "cdr",
      name: "Hồi chiêu kỹ năng",
      current: upg.cdr || 0,
      effect: "-5% Hồi chiêu / Cấp",
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
          state.characterUpgrades[charId] = { hp: 0, cdr: 0, fireRate: 0 };
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
        if (e.target.id === "shop-cards" && e.offsetX > e.target.clientWidth)
          return;
        closeShopOrSelect();
      }
    }

    if (screenChar && !screenChar.classList.contains("hidden")) {
      if (e.target.closest("#btn-select-character")) return;
      if (e.target === screenChar || e.target.id === "char-cards") {
        if (e.target.id === "char-cards" && e.offsetX > e.target.clientWidth)
          return;
        closeShopOrSelect();
      }
    }
  });
}
