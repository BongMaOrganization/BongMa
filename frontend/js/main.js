import { state } from "./state.js";
import {
  FPS,
  GHOST_DATA_KEY,
  UPGRADES,
  BOSS_REWARDS,
  CHARACTERS,
} from "./config.js";
import {
  dist,
  saveGame,
  saveGameToServer,
  loadGameFromServer,
  TOKEN_KEY,
  register,
  login,
} from "./utils.js";
import { UI, updateHealthUI, generateCards, updateXPUI } from "./ui.js";
import {
  getInitialPlayerState,
  generateDummy,
  spawnBullet,
  spawnBossAttack,
  bossSummonGhosts,
} from "./entities.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- HỆ THỐNG ĐĂNG NHẬP / AUTH ---
let isLoginMode = true;
const showLoginScreen = () => {
  document.getElementById("screen-login").classList.remove("hidden");
  document.getElementById("screen-main").classList.add("hidden");
};

const showMainScreen = () => {
  document.getElementById("screen-login").classList.add("hidden");
  document.getElementById("screen-main").classList.remove("hidden");
};

const btnToggleAuth = document.getElementById("btn-toggle-auth");
const btnDoAuth = document.getElementById("btn-do-auth");
const authTitle = document.getElementById("auth-title");
const authError = document.getElementById("auth-error");
const inUser = document.getElementById("auth-username");
const inPass = document.getElementById("auth-password");

btnToggleAuth.onclick = () => {
  isLoginMode = !isLoginMode;
  authError.innerText = "";
  if (isLoginMode) {
    authTitle.innerText = "ĐĂNG NHẬP";
    btnDoAuth.innerText = "ĐĂNG NHẬP";
    btnToggleAuth.innerText = "Đăng ký ngay";
    btnToggleAuth.previousSibling.textContent = "Chưa có tài khoản? ";
  } else {
    authTitle.innerText = "ĐĂNG KÝ MỚI";
    btnDoAuth.innerText = "TẠO TÀI KHOẢN";
    btnToggleAuth.innerText = "Đăng nhập";
    btnToggleAuth.previousSibling.textContent = "Đã có tài khoản? ";
  }
};

btnDoAuth.onclick = async () => {
  const u = inUser.value.trim();
  const p = inPass.value.trim();
  if (!u || !p) {
    authError.innerText = "Vui lòng nhập đủ thông tin!";
    return;
  }

  authError.innerText = "Đang kết nối...";
  authError.style.color = "#00ffcc";
  btnDoAuth.disabled = true;

  try {
    if (isLoginMode) {
      const data = await login(u, p);
      localStorage.setItem(TOKEN_KEY, data.token);
      startGameAfterAuth();
    } else {
      await register(u, p);
      authError.innerText = "Đăng ký thành công! Đang đăng nhập...";
      const data = await login(u, p);
      localStorage.setItem(TOKEN_KEY, data.token);
      startGameAfterAuth();
    }
  } catch (error) {
    authError.style.color = "#ff4444";
    authError.innerText = error.message;
  } finally {
    btnDoAuth.disabled = false;
  }
};

document.getElementById("btn-logout").onclick = () => {
  if (confirm("Bạn có chắc muốn đăng xuất?")) {
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
  }
};

async function startGameAfterAuth() {
  inUser.value = "";
  inPass.value = "";
  authError.innerText = "";
  showMainScreen();
  await syncRemoteState();
}

const token = localStorage.getItem(TOKEN_KEY);
if (!token) {
  showLoginScreen();
} else {
  showMainScreen();
  setTimeout(() => syncRemoteState(), 0);
}

// -- INPUT --
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") e.preventDefault();
  state.keys[e.key.toLowerCase()] = true;
  if (e.code === "Space") state.keys["space"] = true;
});
window.addEventListener("keyup", (e) => {
  state.keys[e.key.toLowerCase()] = false;
  if (e.code === "Space") state.keys["space"] = false;
});
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = e.clientX - rect.left;
  state.mouse.y = e.clientY - rect.top;
});
canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (state.gameState === "PLAYING") {
    state.mouse.isDown = true;
    state.mouse.clicked = true;
  }
});
canvas.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return;
  state.mouse.isDown = false;
});
window.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return;
  state.mouse.isDown = false;
});

UI.btnStart.onclick = startGame;
document.getElementById("btn-clear").addEventListener("click", () => {
  if (confirm("Xóa toàn bộ tiến trình trên máy này?")) {
    localStorage.removeItem(GHOST_DATA_KEY);
    location.reload();
  }
});

setupMenuButtons();

// --- TẠO GIAO DIỆN HUD CHO KỸ NĂNG BẰNG CODE (CỰC KỲ AN TOÀN) ---
function ensureSkillsUI() {
  if (document.getElementById("skills-ui")) return;

  const hud = document.querySelector(".hud-layer");
  if (!hud) return;

  // Tự động chèn CSS cho UI Kỹ năng
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

// Cứu cánh tự động sửa lỗi tính Cooldown bị NaN
function getCooldown(charId, skillIndex) {
  const defaultCDs = {
    speedster: [8, 15, 40],
    tank: [15, 20, 60],
    sharpshooter: [12, 18, 50],
    ghost: [10, 12, 60],
    mage: [8, 20, 60],
  };
  const defaultInit = {
    speedster: [0, 0, 30],
    tank: [0, 0, 30],
    sharpshooter: [0, 0, 30],
    ghost: [0, 0, 30],
    mage: [0, 0, 30],
  };
  let charConfig = getCharacterConfig(charId);
  let cd = charConfig.skills[skillIndex]?.cooldown;
  let initCd = charConfig.skills[skillIndex]?.initialCooldown;

  return {
    cd: cd !== undefined ? cd : defaultCDs[charId]?.[skillIndex] || 10,
    initCd:
      initCd !== undefined ? initCd : defaultInit[charId]?.[skillIndex] || 0,
  };
}

// -- GAME FLOW FUNCTIONS --
function initGame(isNextLevel = false) {
  let saved = JSON.parse(localStorage.getItem(GHOST_DATA_KEY) || "{}");
  ensureCharacterData();

  if (!isNextLevel) {
    state.currentLevel = saved.level || 1;
    state.pastRuns = saved.runs || [];
    state.ownedCharacters = saved.ownedCharacters || state.ownedCharacters;
    state.selectedCharacter =
      saved.selectedCharacter || state.selectedCharacter;
    state.characterUpgrades =
      saved.characterUpgrades || state.characterUpgrades;

    if (saved.player) {
      state.player = saved.player;
      state.player = applyCharacterToPlayer(state.selectedCharacter);
      state.player.coins = saved.player.coins || 0;
      state.player.shield = saved.player.shield || state.player.shield;
    } else {
      state.player = applyCharacterToPlayer(state.selectedCharacter);
    }
  } else {
    state.currentLevel++;
    if (!state.isBossLevel && state.currentRunRecord.length > 120) {
      state.pastRuns.push(state.currentRunRecord);
    }
  }

  // --- THIẾT LẬP KỸ NĂNG KHI VÀO MÀN MỚI ---
  ensureSkillsUI(); // Gọi vẽ UI Kỹ Năng

  let charId = state.player.characterId;
  state.skillsCD = {
    q: getCooldown(charId, 0).initCd * FPS,
    e: getCooldown(charId, 1).initCd * FPS,
    r: getCooldown(charId, 2).initCd * FPS,
  };
  state.activeBuffs = { q: 0, e: 0, r: 0 };
  state.prevKeys = {}; // Lưu lại phím để tránh spam

  if (state.player.experience === undefined || state.player.experience === null)
    state.player.experience = 0;
  if (
    state.player.experienceToLevel === undefined ||
    state.player.experienceToLevel === null
  )
    state.player.experienceToLevel = 100;

  state.isBossLevel = state.currentLevel % 5 === 0;

  state.player.x = 400;
  state.player.y = 500;
  state.player.gracePeriod = 120;
  state.player.dashTimeLeft = 0;

  state.bullets = [];
  state.currentRunRecord = [];
  state.frameCount = 0;
  state.scoreTime = 0;
  state.boss = null;
  UI.bossUi.style.display = "none";

  let targetSurviveSeconds = Math.min(60, 15 + (state.currentLevel - 1) * 5);
  state.maxFramesToSurvive = state.isBossLevel
    ? 999999
    : targetSurviveSeconds * FPS;

  state.ghosts = [];
  let ghostLimit = Math.min(state.currentLevel, 10);
  let runsToUse = state.pastRuns.slice(-ghostLimit);

  if (!state.isBossLevel) {
    runsToUse.push(generateDummy(state.maxFramesToSurvive));
  }

  let playbackRate =
    state.currentLevel <= 2
      ? 0.5
      : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);

  runsToUse.forEach((runData, idx) => {
    state.ghosts.push({
      record: runData,
      speedRate: playbackRate,
      timer: 0,
      lastIdx: -1,
      x: -100,
      y: -100,
      radius: 12,
      isStunned: 0,
      historyPath: [],
      isDummy: idx === runsToUse.length - 1 && !state.isBossLevel,
    });
  });

  if (state.isBossLevel) {
    state.maxFramesToSurvive = 999999;
    let bossStep = Math.floor(state.currentLevel / 5) - 1;
    let bossModes = [];
    if (bossStep < 5) bossModes = [bossStep];
    else bossModes = [(bossStep - 5) % 5, (bossStep - 4) % 5];

    state.boss = {
      x: 400,
      y: 150,
      radius: 40,
      hp: 150 + state.currentLevel * 25,
      maxHp: 150 + state.currentLevel * 25,
      attackTimer: 0,
      attackModes: bossModes,
      summonCooldown: 5 * FPS,
      ghostsActive: false,
    };
    UI.bossUi.style.display = "block";
    UI.bossName.innerText = `BOSS MÀN ${state.currentLevel}`;
    UI.bossHp.style.width = "100%";
    state.ghosts = [];
  }

  updateHealthUI();
  updateXPUI();
  UI.timer.innerText = state.isBossLevel ? "BOSS" : "00:00";
  UI.level.innerText = `Màn: ${state.currentLevel}`;
  UI.ghosts.innerText = `Bóng ma: ${state.ghosts.length}`;
}

function changeState(newState) {
  let oldState = state.gameState;
  state.gameState = newState;
  UI.main.classList.add("hidden");
  UI.upgrade.classList.add("hidden");
  UI.bossReward.classList.add("hidden");

  if (state.gameState === "PLAYING") {
    if (oldState !== "PLAYING") {
      if (state.loopId) cancelAnimationFrame(state.loopId);
      gameLoop();
    }
  } else if (state.gameState === "MENU" || state.gameState === "GAME_OVER") {
    UI.main.classList.remove("hidden");
    UI.title.className =
      state.gameState === "GAME_OVER"
        ? "title-main text-red"
        : "title-main text-cyan";
    UI.title.innerText =
      state.gameState === "GAME_OVER" ? "VÒNG LẶP DỪNG LẠI" : "BÓNG MA";
    UI.desc.innerText =
      state.gameState === "GAME_OVER"
        ? "Quá khứ đã bắt kịp bạn. Mất 1 Mạng."
        : "Sẵn sàng sinh tồn.";

    if (state.player && state.player.hp <= 0) {
      UI.desc.innerText = "BẠN ĐÃ CHẾT HOÀN TOÀN. BẮT ĐẦU LẠI TỪ MÀN 1.";
      state.currentLevel = 1;
      state.pastRuns = [];
      let savedCoins = state.player.coins;
      state.player = applyCharacterToPlayer(state.selectedCharacter);
      state.player.coins = savedCoins;
      localStorage.removeItem(GHOST_DATA_KEY);
      persistState();
      UI.btnStart.innerText = "LÀM LẠI TỪ ĐẦU";
      UI.btnStart.onclick = () => location.reload();
    } else {
      UI.btnStart.innerText = "HỒI SINH";
      UI.btnStart.onclick = startGame;
    }
  } else if (state.gameState === "UPGRADE") {
    UI.upgrade.classList.remove("hidden");
    generateCards(
      UPGRADES,
      document.getElementById("upgrade-cards"),
      false,
      onCardSelected,
    );
  } else if (state.gameState === "BOSS_REWARD") {
    UI.bossReward.classList.remove("hidden");
    generateCards(
      BOSS_REWARDS,
      document.getElementById("boss-cards"),
      true,
      onCardSelected,
    );
  }
}

async function onCardSelected() {
  saveGame(state, GHOST_DATA_KEY);
  persistState();
  if (state.upgradeFromXP) {
    state.upgradeFromXP = false;
    changeState("PLAYING");
    return;
  }
  initGame(true);
  changeState("PLAYING");
}

async function startGame() {
  await syncRemoteState();
  initGame(false);
  changeState("PLAYING");
}

function nextStage() {
  saveGame(state, GHOST_DATA_KEY);
  persistState();
  if (state.currentLevel % 5 === 0) changeState("BOSS_REWARD");
  else {
    initGame(true);
    changeState("PLAYING");
  }
}

function getCharacterConfig(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

function applyCharacterToPlayer(characterId) {
  let data = getCharacterConfig(characterId);
  let upp = state.characterUpgrades[characterId] || {
    hp: 0,
    speed: 0,
    fireRate: 0,
  };
  let base = getInitialPlayerState();

  base.hp = data.baseStats.hp + (upp.hp || 0);
  base.maxHp = base.hp;
  base.speed = data.baseStats.speed * (1 + (upp.speed || 0) * 0.05);
  base.fireRate = Math.max(5, data.baseStats.fireRate - (upp.fireRate || 0));
  base.multiShot = data.baseStats.multiShot;
  base.bounces = data.baseStats.bounces;
  base.coins = state.player?.coins || 0;
  base.shield = state.player?.shield || 0;
  base.maxShield = state.player?.maxShield || 0;
  base.shieldRegenTimer = state.player?.shieldRegenTimer || 0;
  base.characterId = data.id;

  return base;
}

function ensureCharacterData() {
  if (!state.ownedCharacters) state.ownedCharacters = ["speedster"];
  if (!state.selectedCharacter) state.selectedCharacter = "speedster";
  if (!state.characterUpgrades) state.characterUpgrades = {};
}

function openShop() {
  changeState("MENU");
  document.getElementById("screen-main").classList.add("hidden");
  document.getElementById("screen-shop").classList.remove("hidden");
  renderShop();
}

function renderShop() {
  document.getElementById("shop-coins").innerText =
    `Tiền: ${state.player?.coins || 0}`;
  let container = document.getElementById("shop-cards");
  container.innerHTML = "";
  CHARACTERS.forEach((char) => {
    let owned = state.ownedCharacters.includes(char.id);
    let card = document.createElement("div");
    card.className = "card";

    // Mở rộng thẻ và map đầy đủ 3 kỹ năng
    card.style.width = "190px";
    let skillsHtml = char.skills
      .map((s) => `• <b>${s.name}</b>: ${s.desc}`)
      .join("<br>");

    card.innerHTML = `
      <h3>${char.name}</h3>
      <p style="margin-bottom: 5px; color: #ffd700;">Giá: ${char.price}</p>
      <div class="char-skills" style="margin-bottom: 10px; height: 95px; overflow-y: auto;">${skillsHtml}</div>
    `;

    let btn = document.createElement("button");
    btn.innerText = owned ? "Đã mở khóa" : "Mua";
    btn.disabled = owned || (state.player?.coins || 0) < char.price;
    btn.onclick = () => {
      if (!owned && state.player.coins >= char.price) {
        state.player.coins -= char.price;
        state.ownedCharacters.push(char.id);
        persistState();
        renderShop();
      }
    };
    card.appendChild(btn);
    container.appendChild(card);
  });
}

function renderCharacterSelect() {
  document.getElementById("char-coins").innerText =
    `Tiền: ${state.player?.coins || 0}`;
  let container = document.getElementById("char-cards");
  container.innerHTML = "";
  CHARACTERS.forEach((char) => {
    let owned = state.ownedCharacters.includes(char.id);
    let selected = state.selectedCharacter === char.id;
    let card = document.createElement("div");
    card.className = "card";
    card.style.width = "170px";
    let skillsHtml = char.skills
      .map((s) => `• <b>${s.name}</b>: ${s.desc}`)
      .join("<br>");
    card.innerHTML = `
      <h3>${char.name} ${selected ? "(Đã chọn)" : ""}</h3>
      <p style="margin-bottom: 5px;">HP: ${char.baseStats.hp} | Tốc độ: ${char.baseStats.speed}</p>
      <div class="char-skills">${skillsHtml}</div>
    `;
    if (owned) {
      let selBtn = document.createElement("button");
      selBtn.innerText = selected ? "Đã chọn" : "Chọn";
      selBtn.disabled = selected;
      selBtn.onclick = () => {
        state.selectedCharacter = char.id;
        persistState();
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
      card.appendChild(lock);
    }
    container.appendChild(card);
  });
}

function renderUpgradeDetail(charId) {
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
    for (let i = 0; i < MAX_LEVEL; i++)
      barHtml += `<div class="stat-bar-segment ${i < stat.current ? "filled" : ""}"></div>`;
    row.innerHTML = `<div class="stat-info">${stat.name}<span>${stat.effect}</span></div><div class="stat-bar-container">${barHtml}</div>`;
    let btn = document.createElement("button");
    btn.className = "btn-stat-upg";
    btn.innerText = isMax ? "TỐI ĐA" : `+ CẤP (${cost})`;
    btn.disabled = !canAfford;
    btn.onclick = () => {
      if (state.player.coins >= cost && !isMax) {
        state.player.coins -= cost;
        if (!state.characterUpgrades[charId])
          state.characterUpgrades[charId] = { hp: 0, speed: 0, fireRate: 0 };
        state.characterUpgrades[charId][stat.key] = stat.current + 1;
        persistState();
        renderUpgradeDetail(charId);
      }
    };
    row.appendChild(btn);
    container.appendChild(row);
  });
  document.getElementById("btn-upg-detail-back").onclick = () => {
    document.getElementById("screen-upgrade-detail").classList.add("hidden");
    document.getElementById("screen-char-select").classList.remove("hidden");
    renderCharacterSelect();
  };
}

function openCharacterSelect() {
  changeState("MENU");
  document.getElementById("screen-main").classList.add("hidden");
  document.getElementById("screen-char-select").classList.remove("hidden");
  renderCharacterSelect();
}

function closeShopOrSelect() {
  document.getElementById("screen-shop").classList.add("hidden");
  document.getElementById("screen-char-select").classList.add("hidden");
  document.getElementById("screen-main").classList.remove("hidden");
}

function setupMenuButtons() {
  document.getElementById("btn-shop").onclick = openShop;
  document.getElementById("btn-select-character").onclick = openCharacterSelect;
  document.getElementById("btn-shop-back").onclick = closeShopOrSelect;
  document.getElementById("btn-char-back").onclick = closeShopOrSelect;
}

async function syncRemoteState() {
  let remote = await loadGameFromServer();
  if (!remote) return;
  let saved = {
    level: remote.gameState?.level || 1,
    runs: remote.gameState?.runs || [],
    player: remote.gameState?.player || null,
    ownedCharacters: remote.ownedCharacters ||
      remote.gameState?.ownedCharacters || ["speedster"],
    selectedCharacter:
      remote.selectedCharacter ||
      remote.gameState?.selectedCharacter ||
      "speedster",
    characterUpgrades:
      remote.characterUpgrades || remote.gameState?.characterUpgrades || {},
  };
  if (remote.coins !== undefined) {
    if (!saved.player) saved.player = {};
    saved.player.coins = remote.coins;
  }
  localStorage.setItem(GHOST_DATA_KEY, JSON.stringify(saved));
  state.ownedCharacters = saved.ownedCharacters;
  state.selectedCharacter = saved.selectedCharacter;
  state.characterUpgrades = saved.characterUpgrades;
  if (!state.player) state.player = {};
  state.player.coins = remote.coins || 0;

  if (!document.getElementById("screen-shop").classList.contains("hidden"))
    renderShop();
  if (
    !document.getElementById("screen-char-select").classList.contains("hidden")
  )
    renderCharacterSelect();
}

function persistState() {
  saveGameToServer(state, GHOST_DATA_KEY);
}

function addExperience(amount) {
  if (!state.player) return;
  state.player.experience += amount;
  if (state.player.experience >= state.player.experienceToLevel) {
    state.player.experience -= state.player.experienceToLevel;
    state.player.experienceToLevel = Math.max(
      50,
      Math.floor(state.player.experienceToLevel * 1.15),
    );
    state.upgradeFromXP = true;
    updateXPUI();
    changeState("UPGRADE");
    return;
  }
  updateXPUI();
}

function playerTakeDamage() {
  if (state.player.gracePeriod > 0 || state.player.dashTimeLeft > 0) return;
  // Bất tử từ Kỹ năng Tank E hoặc Ghost Q
  if (
    state.activeBuffs.e > 0 &&
    (state.player.characterId === "tank" ||
      state.player.characterId === "ghost")
  )
    return;

  if (state.player.shield > 0) {
    state.player.shield--;
    state.player.shieldRegenTimer = 5 * FPS;
  } else {
    state.player.hp--;
  }

  state.player.gracePeriod = 60;
  updateHealthUI();
  ctx.fillStyle = "rgba(255,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (state.player.hp <= 0) changeState("GAME_OVER");
}

// --- THỰC THI KỸ NĂNG ---
function triggerSkill(key) {
  let char = state.player.characterId;
  let skillIndex = key === "q" ? 0 : key === "e" ? 1 : 2;

  // Dùng hàm lấy Cooldown an toàn
  let cd = getCooldown(char, skillIndex).cd * FPS;

  // Set Cooldown
  state.skillsCD[key] = cd;

  // -- SPEEDSTER --
  if (char === "speedster") {
    if (key === "q") state.activeBuffs.q = 3 * FPS; // Tăng tốc 3s
    if (key === "e") state.activeBuffs.e = 4 * FPS; // Xả đạn 4s
    if (key === "r") {
      // Bắn 20 viên đạn tỏa ra 360 độ
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 10) {
        spawnBullet(
          state.player.x,
          state.player.y,
          state.player.x + Math.cos(i),
          state.player.y + Math.sin(i),
          true,
        );
      }
    }
  }
  // -- TANK --
  else if (char === "tank") {
    if (key === "q") {
      state.player.shield = Math.min((state.player.maxShield || 0) + 1, 5); // Tối đa 5 khiên
      updateHealthUI();
    }
    if (key === "e") state.activeBuffs.e = 3 * FPS; // Bất tử 3s
    if (key === "r") {
      // Quét đạn địch xung quanh bán kính 200px
      state.bullets.forEach((b) => {
        if (!b.isPlayer && dist(state.player.x, state.player.y, b.x, b.y) < 200)
          b.life = 0;
      });
      state.activeBuffs.r = 15; // 15 frames để vẽ visual
    }
  }
  // -- SHARPSHOOTER --
  else if (char === "sharpshooter") {
    if (key === "q") state.activeBuffs.q = 5 * FPS; // +2 nảy
    if (key === "e") state.activeBuffs.e = 4 * FPS; // +3 đạn
    if (key === "r") {
      // Gây sát thương màn hình
      state.ghosts.forEach((g) => {
        if (g.x > 0) g.isStunned = 300;
      });
      if (state.boss) state.boss.hp -= 30;
      state.activeBuffs.r = 10; // Chớp màn hình
    }
  }
  // -- GHOST --
  else if (char === "ghost") {
    if (key === "q") state.activeBuffs.e = 3 * FPS; // (Dùng chung biến bất tử e của Tank)
    if (key === "e") {
      // Blink tới chuột
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
  }
  // -- MAGE --
  else if (char === "mage") {
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
        addExperience(50);
      }
    }
    if (key === "r") state.activeBuffs.r = 4 * FPS; // Đóng băng 4s
  }
}

function updateSkillsUI() {
  ["q", "e", "r"].forEach((key) => {
    let char = state.player.characterId;
    let skillIndex = key === "q" ? 0 : key === "e" ? 1 : 2;
    let maxCd = getCooldown(char, skillIndex).cd * FPS;

    let slot = document.getElementById(`slot-${key}`);
    // Đề phòng trường hợp UI chưa kịp tải thì bỏ qua, không văng lỗi
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

// -- MAIN LOOP --
function update() {
  let { player, boss, bullets, ghosts, keys, mouse, skillsCD, activeBuffs } =
    state;

  // --- KIỂM TRA PHÍM KỸ NĂNG (Bấm 1 lần) ---
  ["q", "e", "r"].forEach((key) => {
    // Nếu phím đang bấm, frame trước chưa bấm, và cooldown đã hết
    if (keys[key] && !state.prevKeys[key] && skillsCD[key] <= 0) {
      triggerSkill(key);
    }
    // Giảm thời gian hồi chiêu
    if (skillsCD[key] > 0) skillsCD[key]--;
    // Giảm thời gian buff
    if (activeBuffs[key] > 0) activeBuffs[key]--;
  });
  updateSkillsUI();

  if (player.gracePeriod > 0) player.gracePeriod--;
  if (player.dashCooldownTimer > 0) player.dashCooldownTimer--;

  if (player.shield < player.maxShield) {
    if (player.shieldRegenTimer > 0) player.shieldRegenTimer--;
    else {
      player.shield = player.maxShield;
      updateHealthUI();
    }
  }

  // --- ÁP DỤNG BUFF VÀO CHỈ SỐ ---
  let isSpeedsterQ = player.characterId === "speedster" && activeBuffs.q > 0;
  let currentSpeed = player.speed * (isSpeedsterQ ? 1.5 : 1);

  let isSpeedsterE = player.characterId === "speedster" && activeBuffs.e > 0;
  let currentFireRate = isSpeedsterE ? 4 : player.fireRate; // Xả đạn siêu nhanh

  let isSharpshootE =
    player.characterId === "sharpshooter" && activeBuffs.e > 0;
  let currentMultiShot = player.multiShot + (isSharpshootE ? 3 : 0);

  let isSharpshootQ =
    player.characterId === "sharpshooter" && activeBuffs.q > 0;
  let currentBounces = (player.bounces || 0) + (isSharpshootQ ? 2 : 0);

  // Kiểm tra Mage R (Đóng băng)
  let isTimeFrozen = player.characterId === "mage" && activeBuffs.r > 0;

  if (player.dashCooldownTimer <= 0) {
    UI.dash.innerText = "Lướt [SPACE]: SẴN SÀNG";
    UI.dash.style.color = "#00ffcc";
  } else {
    UI.dash.innerText = `Lướt: ${(player.dashCooldownTimer / 60).toFixed(1)}s`;
    UI.dash.style.color = "#888";
  }

  let dx = 0,
    dy = 0;
  if (keys["w"] || keys["arrowup"]) dy -= 1;
  if (keys["s"] || keys["arrowdown"]) dy += 1;
  if (keys["a"] || keys["arrowleft"]) dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;

  if (dx !== 0 && dy !== 0) {
    let len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  if (
    keys["space"] &&
    player.dashCooldownTimer <= 0 &&
    player.dashTimeLeft <= 0 &&
    (dx !== 0 || dy !== 0)
  ) {
    player.dashTimeLeft = 12;
    player.dashCooldownTimer = player.dashMaxCooldown;
    player.dashDx = dx;
    player.dashDy = dy;
  }

  if (player.dashTimeLeft > 0) {
    player.x += player.dashDx * (currentSpeed * 3);
    player.y += player.dashDy * (currentSpeed * 3);

    // 🔥 DAMAGE GHOST
    if (player.dashEffect) {
      player.dashEffect();
    }

    // 🔥 DAMAGE BOSS
    if (state.boss) {
      const dx = state.boss.x - player.x;
      const dy = state.boss.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= player.stats.dashRadius) {
        state.boss.hp -= 10;

        // update UI luôn cho mượt
        UI.bossHp.style.width =
          Math.max(0, (state.boss.hp / state.boss.maxHp) * 100) + "%";
      }
    }

    player.dashTimeLeft--;

  } else {
    player.x += dx * currentSpeed;
    player.y += dy * currentSpeed;
  }

  player.x = Math.max(
    player.radius,
    Math.min(canvas.width - player.radius, player.x),
  );
  player.y = Math.max(
    player.radius,
    Math.min(canvas.height - player.radius, player.y),
  );

  let shotThisFrame = false;
  let targetX = 0,
    targetY = 0;
  if (player.cooldown > 0) player.cooldown--;

  if (
    (mouse.clicked || mouse.isDown) &&
    player.cooldown <= 0 &&
    player.dashTimeLeft <= 0
  ) {
    // Override hàm spawnBullet tạm thời bằng cách truyền tham số buff vào entities qua state
    let originalMulti = state.player.multiShot;
    let originalBounce = state.player.bounces;
    state.player.multiShot = currentMultiShot;
    state.player.bounces = currentBounces;

    spawnBullet(player.x, player.y, mouse.x, mouse.y, true);

    state.player.multiShot = originalMulti;
    state.player.bounces = originalBounce;

    player.cooldown = currentFireRate;
    shotThisFrame = true;
    targetX = mouse.x;
    targetY = mouse.y;
  }
  mouse.clicked = false;

  if (!state.isBossLevel) {
    let frameData = [Math.round(player.x), Math.round(player.y)];
    if (shotThisFrame) frameData.push(Math.round(targetX), Math.round(targetY));
    state.currentRunRecord.push(frameData);
  }

  let isInvulnerable =
    player.gracePeriod > 0 ||
    player.dashTimeLeft > 0 ||
    (activeBuffs.e > 0 &&
      (player.characterId === "tank" || player.characterId === "ghost"));

  // Nếu bị Mage đóng băng, Boss và Bóng ma không hoạt động
  if (!isTimeFrozen) {
    if (boss) {
      spawnBossAttack();
      if (!boss.ghostsActive) {
        if (boss.summonCooldown > 0) boss.summonCooldown--;
        if (boss.summonCooldown <= 0) {
          bossSummonGhosts();
          boss.ghostsActive = true;
          ghosts = state.ghosts;
        }
      } else {
        let activeG = ghosts.length;
        if (activeG === 0) {
          boss.ghostsActive = false;
          boss.summonCooldown = 10 * FPS;
        }
      }
      if (
        !isInvulnerable &&
        dist(boss.x, boss.y, player.x, player.y) < boss.radius + player.radius
      ) {
        playerTakeDamage();
      }
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    // Đạn địch bị đóng băng
    if (!b.isPlayer && isTimeFrozen) {
      // Đứng im
    } else {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
    }

    let hitWall = false;
    if (b.x < b.radius) {
      b.x = b.radius;
      b.vx *= -1;
      hitWall = true;
    } else if (b.x > canvas.width - b.radius) {
      b.x = canvas.width - b.radius;
      b.vx *= -1;
      hitWall = true;
    }

    if (b.y < b.radius) {
      b.y = b.radius;
      b.vy *= -1;
      hitWall = true;
    } else if (b.y > canvas.height - b.radius) {
      b.y = canvas.height - b.radius;
      b.vy *= -1;
      hitWall = true;
    }

    if (hitWall) {
      if (b.bounces > 0) {
        b.bounces--;
        if (b.bounces >= 0) b.life = Math.max(b.life, 30);
      } else b.life = 0;
    }

    if (b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    if (b.isPlayer) {
      if (boss && dist(b.x, b.y, boss.x, boss.y) < boss.radius + b.radius) {
        boss.hp -= 1;
        addExperience(1);
        UI.bossHp.style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + "%";
        bullets.splice(i, 1);
        if (boss.hp <= 0) {
          state.player.coins = (state.player.coins || 0) + 100;
          nextStage();
          return;
        }
        continue;
      }

      let hitGhost = false;
      for (let j = ghosts.length - 1; j >= 0; j--) {
        let g = ghosts[j];
        if (
          g.isStunned <= 0 &&
          g.x > 0 &&
          dist(b.x, b.y, g.x, g.y) < g.radius + b.radius
        ) {
          if (state.isBossLevel) {
            ghosts.splice(j, 1);
            state.player.coins = (state.player.coins || 0) + 10;
          } else {
            g.isStunned = 300;
            addExperience(6);
            state.player.coins = (state.player.coins || 0) + 5;
          }
          bullets.splice(i, 1);
          hitGhost = true;
          break;
        }
      }
      if (hitGhost) continue;
    } else {
      if (
        !isInvulnerable &&
        dist(b.x, b.y, player.x, player.y) < player.radius + b.radius - 2
      ) {
        playerTakeDamage();
        bullets.splice(i, 1);
        continue;
      }
    }
  }

  let activeGhosts = 0;
  for (let g of ghosts) {
    if (!isTimeFrozen) {
      let exactIndex = g.timer * g.speedRate;
      let idx1 = Math.floor(exactIndex);

      if (idx1 < g.record.length) {
        activeGhosts++;
        if (g.isStunned > 0) g.isStunned--;
        else {
          let prevX = g.x,
            prevY = g.y;
          let action1 = g.record[idx1];

          if (idx1 + 1 < g.record.length) {
            let action2 = g.record[idx1 + 1];
            let t = exactIndex - idx1;
            g.x = action1[0] + (action2[0] - action1[0]) * t;
            g.y = action1[1] + (action2[1] - action1[1]) * t;
          } else {
            g.x = action1[0];
            g.y = action1[1];
          }

          g.historyPath.push({ x: g.x, y: g.y });
          if (g.historyPath.length > 8) g.historyPath.shift();

          if (g.lastIdx !== idx1 && action1.length === 4) {
            spawnBullet(g.x, g.y, action1[2], action1[3], false, 0, "ghost");
          }
          g.lastIdx = idx1;

          let ghostIsDashing = dist(g.x, g.y, prevX, prevY) > 8 * g.speedRate;
          if (
            !isInvulnerable &&
            !ghostIsDashing &&
            dist(g.x, g.y, player.x, player.y) < player.radius + g.radius - 2
          ) {
            playerTakeDamage();
          }
        }
      } else {
        g.historyPath.shift();
        g.x = -100;
        g.y = -100;
      }
      g.timer++;
    } else {
      if (g.x > 0) activeGhosts++;
    }
  }

  // if (state.isBossLevel) {
  //   if (boss.ghostsActive)
  //     UI.ghosts.innerText = `Bóng ma/Dummy đợt này: ${activeGhosts}`;
  //   else
  //     UI.ghosts.innerText = `Boss đang triệu hồi (${Math.ceil(boss.summonCooldown / FPS)}s)...`;
  // } else {
  //   UI.ghosts.innerText = `Bóng ma/Dummy: ${activeGhosts}`;
  // }

  let coinCount = state.player?.coins || 0;
  document.getElementById("coins-count").innerText = `Tiền: ${coinCount}`;
  updateXPUI();

  if (!state.isBossLevel && state.frameCount >= state.maxFramesToSurvive) {
    nextStage();
    return;
  }

  state.frameCount++;
  if (!state.isBossLevel && state.frameCount % FPS === 0) {
    state.scoreTime++;
    let maxMins = Math.floor(state.maxFramesToSurvive / FPS / 60)
      .toString()
      .padStart(2, "0");
    let maxSecs = Math.floor((state.maxFramesToSurvive / FPS) % 60)
      .toString()
      .padStart(2, "0");
    let mins = Math.floor(state.scoreTime / 60)
      .toString()
      .padStart(2, "0");
    let secs = (state.scoreTime % 60).toString().padStart(2, "0");
    UI.timer.innerText = `${mins}:${secs} / ${maxMins}:${maxSecs}`;
  }

  // Lưu phím frame hiện tại thành prev cho frame sau (Chống việc đè liệt phím gọi chiêu liên tục)
  state.prevKeys = { ...keys };
}

function draw() {
  let { player, boss, bullets, ghosts, mouse, activeBuffs } = state;
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#1a1a24";
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Hiệu ứng Tank R (Càn Quét)
  if (player.characterId === "tank" && activeBuffs.r > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 200 + (15 - activeBuffs.r) * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 204, ${activeBuffs.r / 15})`;
    ctx.lineWidth = 10;
    ctx.stroke();
  }

  // Hiệu ứng Sharpshooter R (Sát thương toàn màn hình)
  if (player.characterId === "sharpshooter" && activeBuffs.r > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${activeBuffs.r / 20})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Hiệu ứng Mage R (Đóng băng)
  if (player.characterId === "mage" && activeBuffs.r > 0) {
    ctx.fillStyle = `rgba(0, 150, 255, 0.15)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (boss) {
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = boss.summonCooldown > 0 ? "#ff0055" : "#ff00ff";
    ctx.shadowBlur = 20;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(boss.x - 10, boss.y - 10, 20, 20);
  }

  for (let g of ghosts) {
    if (g.x < 0) continue;
    let isDashing =
      g.historyPath.length > 2 &&
      dist(
        g.historyPath[g.historyPath.length - 1].x,
        g.historyPath[g.historyPath.length - 1].y,
        g.historyPath[g.historyPath.length - 2].x,
        g.historyPath[g.historyPath.length - 2].y,
      ) >
        8 * g.speedRate;
    let baseColor = "rgba(255, 68, 68,";

    if (g.historyPath.length > 0 && g.isStunned <= 0) {
      ctx.beginPath();
      ctx.moveTo(g.historyPath[0].x, g.historyPath[0].y);
      for (let p of g.historyPath) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = isDashing
        ? "rgba(0, 255, 204, 0.5)"
        : baseColor + "0.3)";
      ctx.lineWidth = g.radius * 2;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);

    // Đổi màu quái nếu bị Mage đóng băng
    if (player.characterId === "mage" && activeBuffs.r > 0)
      ctx.fillStyle = "#00aaff";
    else ctx.fillStyle = g.isStunned > 0 ? "#333" : "#ff4444";

    ctx.fill();
    if (g.isStunned <= 0) {
      ctx.strokeStyle = isDashing ? "#00ffcc" : "#ff0000";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  for (let b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    if (b.isPlayer) ctx.fillStyle = "#00ffcc";
    else ctx.fillStyle = b.style === 1 ? "#ff00ff" : "#ff4444";
    ctx.fill();
  }

  let isInvulnSkill =
    activeBuffs.e > 0 &&
    (player.characterId === "tank" || player.characterId === "ghost");

  if (player.dashTimeLeft > 0 || isInvulnSkill) {
    ctx.beginPath();
    ctx.arc(
      player.x,
      player.y,
      player.radius + (isInvulnSkill ? 5 : 2),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle =
      player.characterId === "ghost" ? "rgba(100,100,255,0.5)" : "white";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "white";
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (player.gracePeriod > 0) {
    if (Math.floor(state.frameCount / 6) % 2 === 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (player.shield > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 255, 204, 0.5)";
  ctx.stroke();
}

function gameLoop() {
  if (state.gameState !== "PLAYING") return;
  update();
  if (state.gameState === "PLAYING") {
    draw();
    state.loopId = requestAnimationFrame(gameLoop);
  }
}



// Updated evolve function to handle ultimate form
export function evolve(type) {
  state.evolutions[type] = true;
  const evolution = EVOLUTIONS[type];
  state.player.mode = evolution.mode;
  evolution.effect(state.player);
  alert(`${type} has evolved into its ultimate form: ${evolution.mode}!`);
}

// Evolution mappings
const EVOLUTIONS = {
  speed: {
    mode: "FLASH_OVERDRIVE",
    effect: (player) => {
      player.speed *= 3;
      player.contactDamage = true;
    },
  },

  fire: {
    mode: "LEAD_HURRICANE",
    effect: (player) => {
      player.fireRate = Math.max(1, player.fireRate / 3);
      player.noReload = true;
    },
  },

  multi: {
    mode: "APOCALYPSE_SPREAD",
    effect: (player) => {
      player.multiShot += 5;
      player.spreadAngle = 45;
    },
  },

  bounce: {
    mode: "INFINITY_PINBALL",
    effect: (player) => {
      player.bounces = 10;
    },
  },

  dash: {
    mode: "EXECUTION_DRIVE",
    effect: (player) => {
      player.dashDamage = 50;
      player.dashRadius = 100;

      player.dashEffect = () => {
        state.ghosts.forEach((ghost, index) => {
          if (ghost.x < 0) return;

          const dx = ghost.x - player.x;
          const dy = ghost.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= player.dashRadius) {
            ghost.isStunned = 300;

            // boss level thì kill luôn
            if (state.isBossLevel) {
              state.ghosts.splice(index, 1);
            }
          }
        });

        if (state.boss) {
          const dx = state.boss.x - player.x;
          const dy = state.boss.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= player.dashRadius) {
            state.boss.hp -= player.dashDamage;

            UI.bossHp.style.width =
              Math.max(0, (state.boss.hp / state.boss.maxHp) * 100) + "%";
          }
        }
      };
    },
  },
};
