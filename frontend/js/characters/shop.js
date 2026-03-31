import { state } from "../state.js";
import { CHARACTERS, GHOST_DATA_KEY } from "../config.js";
import { saveGame } from "../utils.js";
import { persistState } from "../auth.js";
import { updateGachaUI, updateTradingUI } from "../ui.js";
import { gachaConfig } from "../config.js";

export function openShop(changeStateFn) {
  changeStateFn("MENU");
  document.getElementById("screen-main").classList.add("hidden");
  document.getElementById("screen-shop").classList.remove("hidden");
  renderShop();
}

export function renderShop() {
  const res = state.resources || { common: 0, rare: 0, legendary: 0 };

  document.getElementById("shop-coins").innerText =
    `Tiền: ${state.player?.coins || 0}
   | Common: ${res.common}
   | Rare: ${res.rare}
   | Legendary: ${res.legendary}`;
  let container = document.getElementById("shop-cards");
  container.innerHTML = "";

  CHARACTERS.forEach((char) => {
    let owned = state.ownedCharacters.includes(char.id);
    let card = document.createElement("div");
    card.className = "card";
    card.style.width = "190px";

    let skillsHtml = char.skills
      .map((s) => {
        let keyPrefix = s.key ? `[${s.key.toUpperCase()}] ` : "";
        return `• <b style="color: #00ffcc">${s.name}</b>: ${keyPrefix}${s.desc}`;
      })
      .join("<br><br>");

    card.innerHTML = `
      <h3>${char.name}</h3>
      <p style="margin-bottom: 5px; color: #ffd700;">Giá: ${char.price}</p>
      <p style="margin-bottom: 5px; color: #ffaa00; font-weight: bold;">HP: ${char.baseStats.hp} | Tốc độ: ${char.baseStats.speed} | Tia đạn: ${char.baseStats.multiShot} | Đạn nẩy: ${char.baseStats.bounces}</p>
      <p style="margin-bottom: 5px; color: ${getRarityColor(char.rarity)}; font-weight: bold;">Độ hiếm: ${char.rarity}</p>
      <div class="char-skills" style="font-size: 0.9em; margin-bottom: 10px; height: 110px; overflow-y: auto; text-align: left; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 5px;">
        ${skillsHtml}
      </div>
    `;

    let btn = document.createElement("button");
    btn.innerText = owned ? "Đã mở khóa" : "Mua";
    btn.disabled = owned || (state.player?.coins || 0) < char.price;
    btn.onclick = () => {
      if (!owned && state.player.coins >= char.price) {
        state.player.coins -= char.price;
        state.ownedCharacters.push(char.id);
        saveGame(state, GHOST_DATA_KEY);
        persistState();
        renderShop();
      }
    };

    card.appendChild(btn);
    container.appendChild(card);
  });
  updateGachaUI();
  updateTradingUI();
}

function getRarityColor(rarity) {
  switch (rarity) {
    case "common":
      return "#ffffff"; // White
    case "rare":
      return "#0070ff"; // Blue
    case "legendary":
      return "#a335ee"; // Purple
    default:
      return "#ffffff"; // Default to white
  }
}

export function tradeCharacters(rarity) {
  const required = 5;
  const nextRarity = rarity === "common" ? "rare" : "legendary";

  if (state.resources[rarity] < required) {
    alert(`Cần ${required} ${rarity}`);
    return;
  }

  state.resources[rarity] -= required;

  // 👇 GACHA 100% RARITY
  handleRollResult(nextRarity, true);
}

export function rollGacha(forcedRarity = null) {
  if (!forcedRarity && state.player.coins < gachaConfig.cost) {
    alert("Không đủ tiền!");
    return;
  }

  if (!forcedRarity) {
    state.player.coins -= gachaConfig.cost;
  }

  const overlay = document.getElementById("gacha-overlay");
  const title = document.getElementById("gacha-title");
  const result = document.getElementById("gacha-result");
  const closeBtn = document.getElementById("gacha-close");

  overlay.classList.remove("hidden");
  result.innerText = "";
  closeBtn.style.display = "none";

  // ===== SPIN =====
  let spinCount = 0;
  const spinInterval = setInterval(() => {
    result.innerText = ["???", "Rolling..."][Math.floor(Math.random() * 2)];
    spinCount++;

    if (spinCount > 10) {
      clearInterval(spinInterval);
      reveal();
    }
  }, 100);

  function reveal() {
    // 🔥 FIX: đảm bảo rarity luôn có giá trị
    let rarity = forcedRarity || null;

    if (!rarity) {
      const rand = Math.random();
      const { common, rare } = gachaConfig.probabilities;

      if (rand < common) rarity = "common";
      else if (rand < common + rare) rarity = "rare";
      else rarity = "legendary";
    }

    // 🔥 HARD GUARD
    if (!rarity) {
      console.error("❌ rarity undefined");
      rarity = "common";
    }

    // 🔥 FIX: đảm bảo pool không rỗng
    let pool = CHARACTERS.filter((c) => c.rarity === rarity);

    if (pool.length === 0) {
      console.error("❌ EMPTY POOL:", rarity);
      rarity = "common";
      pool = CHARACTERS.filter((c) => c.rarity === "common");
    }

    const reward = pool[Math.floor(Math.random() * pool.length)];

    const alreadyOwned = state.ownedCharacters.includes(reward.id);

    setTimeout(() => {
      result.className = "";
      result.classList.add(`gacha-${rarity}`);

      if (alreadyOwned) {
        state.resources[rarity]++;
        result.innerText = `💰 +1 ${rarity}`;
        title.innerText = "Duplicate!";
      } else {
        state.ownedCharacters.push(reward.id);
        result.innerText = reward.name;
        title.innerText = "🎉 NEW!";
      }

      closeBtn.style.display = "block";
    }, 400);

    closeBtn.onclick = () => {
      overlay.classList.add("hidden");
      renderShop();
    };
  }
}

function renderTradingMenu() {
  const info = document.getElementById("trading-info");
  const options = document.getElementById("trading-options");

  options.innerHTML = "";

  // count characters by rarity
  const countByRarity = {
    common: 0,
    rare: 0,
    legendary: 0,
  };

  state.ownedCharacters.forEach((id) => {
    const char = CHARACTERS.find((c) => c.id === id);
    if (char) countByRarity[char.rarity]++;
  });

  info.innerHTML = `
    <p>Common: ${countByRarity.common}</p>
    <p>Rare: ${countByRarity.rare}</p>
    <p>Legendary: ${countByRarity.legendary}</p>
  `;

  ["common", "rare"].forEach((rarity) => {
    const btn = document.createElement("button");

    btn.innerText = `Trade 5 ${rarity} → ${
      rarity === "common" ? "rare" : "legendary"
    }`;

    btn.disabled = countByRarity[rarity] < 5;

    btn.onclick = () => {
      tradeCharacters(rarity);
      renderTradingMenu(); // refresh UI
    };

    options.appendChild(btn);
  });
}

export function openTradingMenu() {
  document.getElementById("screen-shop").classList.add("hidden");
  document.getElementById("screen-trading").classList.remove("hidden");

  renderTradingMenu();

  document.getElementById("btn-trading-back").onclick = () => {
    document.getElementById("screen-trading").classList.add("hidden");
    document.getElementById("screen-shop").classList.remove("hidden");
    renderShop();
  };
}

function rollCharacterByRarity(rarity) {
  const pool = CHARACTERS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function handleRollResult(rarity, isTrade = false) {
  const reward = rollCharacterByRarity(rarity);
  const alreadyOwned = state.ownedCharacters.includes(reward.id);

  if (alreadyOwned) {
    state.resources[rarity]++;
    alert(
      isTrade
        ? `🔁 Trade duplicate → +1 ${rarity}`
        : `💰 Duplicate → +1 ${rarity}`
    );
  } else {
    state.ownedCharacters.push(reward.id);
    alert(
      isTrade
        ? `🎉 Trade nhận: ${reward.name}`
        : `🎉 New: ${reward.name}`
    );
  }
}