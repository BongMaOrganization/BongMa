import { state } from "../state.js";
import { GHOST_DATA_KEY, SCROLLS, BOSS_FRAGMENTS } from "../config.js";
import { CHARACTERS } from "./data.js";
import { saveGame } from "../utils.js";
import { persistState } from "../auth.js";

// ========================================
// SHOP RENDERING
// ========================================
export function openShop(changeStateFn) {
  changeStateFn("MENU");
  document.getElementById("screen-main").classList.add("hidden");
  document.getElementById("screen-shop").classList.remove("hidden");
  renderShop();
}

export function renderShop() {
  const res = state.resources || { common: 0, rare: 0, legendary: 0 };

  document.getElementById("shop-coins").innerHTML = `
    <span style="color:#ffd700">💰 ${state.player?.coins || 0} Bạc</span>
    <span style="margin-left:15px;color:#4ade80">🟢 ${res.common} NL Common</span>
    <span style="margin-left:15px;color:#60a5fa">🔵 ${res.rare} NL Rare</span>
  `;

  let container = document.getElementById("shop-cards");
  container.innerHTML = "";

  SCROLLS.forEach((scroll) => {
    let card = document.createElement("div");
    card.className = `card scroll-card scroll-${scroll.rarity}`;
    card.style.width = "200px";

    const rarityEmoji =
      scroll.rarity === "common"
        ? "🟢"
        : scroll.rarity === "rare"
          ? "🔵"
          : "🟣";

    // Check if this is a trade scroll
    const isTrade = scroll.tradeFrom !== undefined;
    let canAfford = false;
    let costLabel = "";

    if (isTrade) {
      const matCount = res[scroll.tradeFrom] || 0;
      canAfford = matCount >= scroll.tradeCost;
      costLabel = `${scroll.tradeCost} NL ${scroll.tradeFrom}`;
    } else {
      canAfford = (state.player?.coins || 0) >= scroll.price;
      costLabel = `${scroll.price} Bạc`;
    }

    // Build probability text
    let probText = "";
    if (scroll.probabilities) {
      const entries = Object.entries(scroll.probabilities);
      probText = entries
        .map(([r, p]) => {
          const color =
            r === "common"
              ? "#4ade80"
              : r === "rare"
                ? "#60a5fa"
                : "#c084fc";
          return `<span style="color:${color}">${r}: ${Math.round(p * 100)}%</span>`;
        })
        .join(" | ");
    }

    card.innerHTML = `
      <div class="scroll-icon">${rarityEmoji}</div>
      <h3>${scroll.name}</h3>
      <p style="margin-bottom:5px;color:#ffd700;">Giá: ${costLabel}</p>
      <div style="font-size:12px;margin-bottom:8px;">${probText}</div>
      <p style="font-size:12px;color:#aaa;margin-bottom:10px;">${scroll.desc}</p>
    `;

    let btn = document.createElement("button");
    btn.innerText = isTrade ? "Đổi" : "Mua";
    btn.disabled = !canAfford;
    btn.onclick = () => {
      if (isTrade) {
        if ((res[scroll.tradeFrom] || 0) >= scroll.tradeCost) {
          state.resources[scroll.tradeFrom] -= scroll.tradeCost;
          saveGame(state, GHOST_DATA_KEY);
          persistState();
          renderShop();
          startSpinner(scroll.rarity, scroll.probabilities);
        }
      } else {
        if (state.player.coins >= scroll.price) {
          state.player.coins -= scroll.price;
          saveGame(state, GHOST_DATA_KEY);
          persistState();
          renderShop();
          startSpinner(scroll.rarity, scroll.probabilities);
        }
      }
    };

    card.appendChild(btn);
    container.appendChild(card);
  });

  // Render boss fragment exchange section
  renderFragmentSection(container);
}

// ========================================
// BOSS FRAGMENT EXCHANGE
// ========================================

function renderFragmentSection(container) {
  const fragments = state.bossFragments || [];
  const hasAll = BOSS_FRAGMENTS.every(f => fragments.includes(f.id));

  const section = document.createElement("div");
  section.className = "fragment-section";
  section.innerHTML = `
    <h3 style="color:#ff0088; margin-bottom:10px;">⭐ Mảnh Nguyên Liệu Boss → MYTHICAL</h3>
    <p style="font-size:12px; color:#aaa; margin-bottom:10px;">Thu thập 5 mảnh khác nhau từ 5 boss (10% mỗi lần hạ boss) → đổi 1 nhân vật <span style="color:#ff0088;font-weight:bold;">MYTHICAL</span>!</p>
    <div class="fragment-grid">
      ${BOSS_FRAGMENTS.map(f => {
    const owned = fragments.includes(f.id);
    return `
          <div class="fragment-item ${owned ? 'fragment-owned' : 'fragment-locked'}">
            <span class="fragment-icon">${f.icon}</span>
            <span class="fragment-name">${f.name}</span>
            ${owned ? '<span class="fragment-check">✅</span>' : '<span class="fragment-check">❌</span>'}
          </div>
        `;
  }).join('')}
    </div>
  `;

  const uniqueCount = new Set(fragments).size;
  const btn = document.createElement("button");
  btn.innerText = hasAll ? "🌟 ĐỔI NHÂN VẬT MYTHICAL" : `Thiếu ${BOSS_FRAGMENTS.length - uniqueCount} mảnh`;
  btn.disabled = !hasAll;
  btn.style.marginTop = "10px";
  if (hasAll) {
    btn.style.background = "linear-gradient(135deg, #ff0055, #ff8800, #ffdd00, #00ff88, #0088ff, #aa00ff)";
    btn.style.backgroundSize = "300% 300%";
    btn.style.animation = "mythicalShimmer 2s linear infinite";
    btn.style.color = "#fff";
    btn.style.fontWeight = "bold";
  }
  btn.onclick = () => {
    if (!hasAll) return;
    exchangeFragmentsForMythical();
  };

  section.appendChild(btn);
  container.appendChild(section);
}

function exchangeFragmentsForMythical() {
  // Clear all fragments
  if (state.bossFragments) {
    state.bossFragments.splice(0, state.bossFragments.length);
  } else {
    state.bossFragments = [];
  }

  const mythicals = CHARACTERS.filter(c => c.rarity === "mythical" && c.id !== "elementalist");
  const unowned = mythicals.filter(c => !state.ownedCharacters.includes(c.id));

  const overlay = document.getElementById("spinner-overlay");
  const title = document.getElementById("spinner-title");
  const result = document.getElementById("spinner-result");
  const viewport = document.getElementById("spinner-viewport");
  const closeBtn = document.getElementById("spinner-close");
  const strip = document.getElementById("spinner-strip");

  overlay.classList.remove("hidden");
  viewport.style.display = "none";
  strip.innerHTML = "";
  closeBtn.style.display = "none";
  result.className = "spinner-result selection-grid";

  if (unowned.length > 0) {
    // TÍNH NĂNG MỚI: CHỌN NGẪU NHIÊN 1 TƯỚNG MYTHICAL CHƯA CÓ
    const winnerChar = unowned[Math.floor(Math.random() * unowned.length)];

    state.ownedCharacters.push(winnerChar.id);
    saveGame(state, GHOST_DATA_KEY);
    persistState();

    title.innerText = "🎉 CƠ DUYÊN ĐÃ ĐỊNH!";
    result.innerHTML = `
      <div style="font-size:40px; margin-bottom:15px;">🌟</div>
      <div style="font-size:32px; font-weight:bold;" class="rarity-mythical">${winnerChar.name}</div>
      <div style="font-size:18px; margin-top:15px; color:#00ffcc;">Đã nhận được nhân vật Thần Thoại ngẫu nhiên!</div>
    `;
    closeBtn.style.display = "block";

  } else {
    // All owned - Give compensation
    const reward = mythicals[Math.floor(Math.random() * mythicals.length)];
    state.player.coins = (state.player.coins || 0) + 5000;
    state.resources.legendary = (state.resources.legendary || 0) + 1;
    saveGame(state, GHOST_DATA_KEY);
    persistState();

    title.innerText = "💰 PHẦN THƯỞNG TRÙNG LẶP!";
    result.innerHTML = `
      <div style="font-size:18px;color:#ff0088;margin-bottom:10px;">${reward.name} (Đã có)</div>
      <div style="font-size:24px;color:#ffd700;font-weight:bold;">+5000 Bạc</div>
      <div style="font-size:20px;color:#c084fc;margin-top:5px;">+1 Vé Legendary</div>
      <p style="font-size:12px;color:#aaa;margin-top:10px;">Bạn đã sở hữu toàn bộ Thần Thoại trong Gacha!</p>
    `;
    closeBtn.style.display = "block";
  }

  overlay.onclick = (e) => {
    if ((e.target === overlay || e.target === result) && closeBtn.style.display === "block") {
      closeBtn.click();
    }
  };

  closeBtn.onclick = () => {
    overlay.classList.add("hidden");
    viewport.style.display = ""; // Restore for random gacha
    renderShop();
  };
}

// ========================================
// SPINNER / ROULETTE SYSTEM
// ========================================

function getRarityColor(rarity) {
  switch (rarity) {
    case "common":
      return "#4ade80";
    case "rare":
      return "#60a5fa";
    case "legendary":
      return "#c084fc";
    case "mythical":
      return "#ff0088";
    default:
      return "#ffffff";
  }
}

function buildSpinnerPool(winnerChar, scrollRarity, probabilities) {
  const pool = [];
  const totalSlots = 32;
  const winIndex = 26; // The winner will be at this index

  // Build a weighted distribution for the strip
  const rarities = Object.entries(probabilities);

  for (let i = 0; i < totalSlots; i++) {
    if (i === winIndex) {
      pool.push(winnerChar);
      continue;
    }

    // Pick a random rarity based on probabilities
    const rand = Math.random();
    let cumulative = 0;
    let chosenRarity = "common";
    for (const [r, p] of rarities) {
      cumulative += p;
      if (rand < cumulative) {
        chosenRarity = r;
        break;
      }
    }

    const candidates = CHARACTERS.filter((c) => c.rarity === chosenRarity);
    if (candidates.length > 0) {
      pool.push(candidates[Math.floor(Math.random() * candidates.length)]);
    } else {
      // Fallback
      const fallback = CHARACTERS.filter((c) => c.rarity === "common");
      pool.push(fallback[Math.floor(Math.random() * fallback.length)]);
    }
  }

  return { pool, winIndex };
}

function startSpinner(scrollRarity, probabilities) {
  // 1. Determine winner based on probabilities
  const rand = Math.random();
  let cumulative = 0;
  let winRarity = "common";
  const entries = Object.entries(probabilities);
  for (const [r, p] of entries) {
    cumulative += p;
    if (rand < cumulative) {
      winRarity = r;
      break;
    }
  }

  const winPool = CHARACTERS.filter((c) => c.rarity === winRarity);
  const winnerChar = winPool[Math.floor(Math.random() * winPool.length)];

  // 2. Build spinner strip
  const { pool, winIndex } = buildSpinnerPool(
    winnerChar,
    scrollRarity,
    probabilities,
  );

  // 3. Show overlay
  const overlay = document.getElementById("spinner-overlay");
  overlay.classList.remove("hidden");

  const strip = document.getElementById("spinner-strip");
  const closeBtn = document.getElementById("spinner-close");
  const resultDiv = document.getElementById("spinner-result");
  const titleDiv = document.getElementById("spinner-title");

  closeBtn.style.display = "none";
  resultDiv.innerHTML = "";
  resultDiv.className = "spinner-result";
  titleDiv.innerText = "🎰 Đang quay...";

  // Render strip items
  strip.innerHTML = "";
  const itemWidth = 120;

  pool.forEach((char, i) => {
    const item = document.createElement("div");
    item.className = `spinner-item spinner-item-${char.rarity}`;
    item.innerHTML = `
      <div class="spinner-item-name">${char.name}</div>
      <div class="spinner-item-rarity" style="color:${getRarityColor(char.rarity)}">${char.rarity}</div>
    `;
    strip.appendChild(item);
  });

  // 4. Animate the strip
  const container = document.getElementById("spinner-viewport");
  const containerWidth = container.offsetWidth;
  // We want the winIndex item to land at the center of the viewport
  const centerOffset = containerWidth / 2 - itemWidth / 2;
  // Add a small random offset so it doesn't look perfectly centered
  const randomOffset = (Math.random() - 0.5) * 40;
  const targetX = -(winIndex * itemWidth) + centerOffset + randomOffset;

  strip.style.transition = "none";
  strip.style.transform = `translateX(0px)`;

  // Force reflow
  strip.offsetHeight;

  // Start spinning with easing
  strip.style.transition = "transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)";
  strip.style.transform = `translateX(${targetX}px)`;

  // 5. After animation completes, show result
  setTimeout(() => {
    const alreadyOwned = state.ownedCharacters.includes(winnerChar.id);

    // Flash the winning item
    const items = strip.querySelectorAll(".spinner-item");
    if (items[winIndex]) {
      items[winIndex].classList.add("spinner-winner");
    }

    if (alreadyOwned) {
      // Duplicate → give material
      const matRarity = winnerChar.rarity;
      state.resources[matRarity] = (state.resources[matRarity] || 0) + 1;

      titleDiv.innerText = "💰 Trùng lặp!";
      resultDiv.innerHTML = `
        <div style="font-size:20px;color:${getRarityColor(matRarity)}">
          ${winnerChar.name}
        </div>
        <div style="font-size:16px;color:#ffd700;margin-top:8px;">
          +1 Nguyên liệu ${matRarity}
        </div>
      `;
      resultDiv.className = `spinner-result gacha-${matRarity}`;
    } else {
      // New character!
      state.ownedCharacters.push(winnerChar.id);

      titleDiv.innerText = "🎉 NHÂN VẬT MỚI!";
      resultDiv.innerHTML = `
        <div style="font-size:24px;color:${getRarityColor(winnerChar.rarity)}; font-weight:bold;">
          ${winnerChar.name}
        </div>
        <div style="font-size:14px;color:${getRarityColor(winnerChar.rarity)};margin-top:5px;">
          ⭐ ${winnerChar.rarity.toUpperCase()}
        </div>
      `;
      resultDiv.className = `spinner-result gacha-${winnerChar.rarity}`;
    }

    saveGame(state, GHOST_DATA_KEY);
    persistState();

    overlay.onclick = (e) => {
      if ((e.target === overlay || e.target === resultDiv) && closeBtn.style.display === "block") {
        closeBtn.click();
      }
    };

    closeBtn.style.display = "block";
    closeBtn.onclick = () => {
      overlay.classList.add("hidden");
      renderShop();
    };
  }, 4300);
}

// ========================================
// TRADING MENU (kept for direct access)
// ========================================

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

function renderTradingMenu() {
  const info = document.getElementById("trading-info");
  const options = document.getElementById("trading-options");

  options.innerHTML = "";

  const res = state.resources || { common: 0, rare: 0, legendary: 0 };

  info.innerHTML = `
    <p style="color:#4ade80">🟢 NL Common: ${res.common}</p>
    <p style="color:#60a5fa">🔵 NL Rare: ${res.rare}</p>
  `;
}

// Exports for backward compatibility
export function rollGacha() { }
export function tradeCharacters() { }