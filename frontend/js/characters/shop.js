import { state } from "../state.js";
import { CHARACTERS, GHOST_DATA_KEY, SCROLLS, BOSS_FRAGMENTS } from "../config.js";
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
    <h3 style="color:#ffd700; margin-bottom:10px;">⭐ Mảnh Nguyên Liệu Boss</h3>
    <p style="font-size:12px; color:#aaa; margin-bottom:10px;">Thu thập 5 mảnh khác nhau từ boss (10% mỗi lần hạ boss) → đổi 1 nhân vật Legendary!</p>
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
  btn.innerText = hasAll ? "🌟 ĐỔI NHÂN VẬT LEGENDARY" : `Thiếu ${BOSS_FRAGMENTS.length - uniqueCount} mảnh`;
  btn.disabled = !hasAll;
  btn.style.marginTop = "10px";
  if (hasAll) {
    btn.style.background = "linear-gradient(135deg, #ffd700, #ff8c00)";
    btn.style.color = "#000";
  }
  btn.onclick = () => {
    if (!hasAll) return;
    exchangeFragmentsForLegendary();
  };

  section.appendChild(btn);
  container.appendChild(section);
}

function exchangeFragmentsForLegendary() {
  // Clear all fragments
  state.bossFragments = [];

  // Pick a random unowned legendary, or any legendary if all owned
  const legendaries = CHARACTERS.filter(c => c.rarity === "legendary");
  const unowned = legendaries.filter(c => !state.ownedCharacters.includes(c.id));
  const pool = unowned.length > 0 ? unowned : legendaries;
  const reward = pool[Math.floor(Math.random() * pool.length)];

  const alreadyOwned = state.ownedCharacters.includes(reward.id);
  if (!alreadyOwned) {
    state.ownedCharacters.push(reward.id);
  } else {
    state.resources.legendary = (state.resources.legendary || 0) + 1;
  }

  saveGame(state, GHOST_DATA_KEY);
  persistState();

  // Show result
  const overlay = document.getElementById("spinner-overlay");
  const title = document.getElementById("spinner-title");
  const result = document.getElementById("spinner-result");
  const strip = document.getElementById("spinner-strip");
  const closeBtn = document.getElementById("spinner-close");
  const viewport = document.getElementById("spinner-viewport");

  overlay.classList.remove("hidden");
  viewport.style.display = "none";
  strip.innerHTML = "";

  if (alreadyOwned) {
    title.innerText = "💰 Trùng lặp!";
    result.innerHTML = `
      <div style="font-size:20px;color:#c084fc">${reward.name}</div>
      <div style="font-size:16px;color:#ffd700;margin-top:8px;">+1 NL Legendary</div>
    `;
  } else {
    title.innerText = "🎉 NHÂN VẬT HUYỀN THOẠI!";
    result.innerHTML = `
      <div style="font-size:28px;color:#c084fc;font-weight:bold;">${reward.name}</div>
      <div style="font-size:14px;color:#c084fc;margin-top:5px;">⭐ LEGENDARY</div>
    `;
  }
  result.className = "spinner-result gacha-legendary";

  closeBtn.style.display = "block";
  closeBtn.onclick = () => {
    overlay.classList.add("hidden");
    viewport.style.display = "";
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
    default:
      return "#ffffff";
  }
}

function getRarityBg(rarity) {
  switch (rarity) {
    case "common":
      return "rgba(74,222,128,0.15)";
    case "rare":
      return "rgba(96,165,250,0.15)";
    case "legendary":
      return "rgba(192,132,252,0.15)";
    default:
      return "rgba(255,255,255,0.1)";
  }
}

function getRarityBorder(rarity) {
  switch (rarity) {
    case "common":
      return "#22c55e";
    case "rare":
      return "#3b82f6";
    case "legendary":
      return "#a855f7";
    default:
      return "#555";
  }
}

/**
 * Build a pool of characters for the spinner strip
 * We create a long strip with ~30 items, seeded so the winning item
 * lands near the end (at a fixed position).
 */
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
export function rollGacha() {}
export function tradeCharacters() {}