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
    card.innerHTML = `<h3>${char.name}</h3><p>Giá: ${char.price}</p><p>${char.skills[0].desc}</p>`;
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
    card.style.width = "170px"; // Cho card rộng ra tí để chứa text kỹ năng

    // Hiển thị kỹ năng (Skills)
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

      // NÚT NÂNG CẤP MỞ RA MODAL CHI TIẾT
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

// HÀM RENDER CHI TIẾT NÂNG CẤP CHO TỪNG NHÂN VẬT (MỚI)
function renderUpgradeDetail(charId) {
  let char = CHARACTERS.find((c) => c.id === charId);
  let upg = state.characterUpgrades[charId] || { hp: 0, speed: 0, fireRate: 0 };

  document.getElementById("upg-detail-title").innerText =
    `NÂNG CẤP: ${char.name.toUpperCase()}`;
  document.getElementById("upg-detail-coins").innerText =
    `Tiền hiện có: ${state.player?.coins || 0}`;

  const MAX_LEVEL = 10;
  // Công thức giá tiền: 100 base + 50 mỗi level
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

    // Render Progress Bar
    let barHtml = "";
    for (let i = 0; i < MAX_LEVEL; i++) {
      barHtml += `<div class="stat-bar-segment ${i < stat.current ? "filled" : ""}"></div>`;
    }

    row.innerHTML = `
      <div class="stat-info">
        ${stat.name}
        <span>${stat.effect}</span>
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
        if (!state.characterUpgrades[charId])
          state.characterUpgrades[charId] = { hp: 0, speed: 0, fireRate: 0 };
        state.characterUpgrades[charId][stat.key] = stat.current + 1;
        persistState();
        renderUpgradeDetail(charId); // Render lại để cập nhật thanh tiến trình và tiền
      }
    };

    row.appendChild(btn);
    container.appendChild(row);
  });

  // Nút Quay lại
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

// Đồng bộ với API Backend
async function syncRemoteState() {
  let remote = await loadGameFromServer(); // Không cần username, API đọc từ Token
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

// -- MAIN LOOP --
function update() {
  let { player, boss, bullets, ghosts, keys, mouse } = state;

  if (player.gracePeriod > 0) player.gracePeriod--;
  if (player.dashCooldownTimer > 0) player.dashCooldownTimer--;

  if (player.shield < player.maxShield) {
    if (player.shieldRegenTimer > 0) player.shieldRegenTimer--;
    else {
      player.shield = player.maxShield;
      updateHealthUI();
    }
  }

  if (player.dashCooldownTimer <= 0) {
    UI.dash.innerText = "Lướt: SẴN SÀNG";
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
    player.x += player.dashDx * (player.speed * 3);
    player.y += player.dashDy * (player.speed * 3);
    player.dashTimeLeft--;
  } else {
    player.x += dx * player.speed;
    player.y += dy * player.speed;
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
    spawnBullet(player.x, player.y, mouse.x, mouse.y, true);
    player.cooldown = player.fireRate;
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

  let isInvulnerable = player.gracePeriod > 0 || player.dashTimeLeft > 0;

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

  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;

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
        addExperience(2);
        state.player.coins = (state.player.coins || 0) + 2;
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
  }

  if (state.isBossLevel) {
    if (boss.ghostsActive)
      UI.ghosts.innerText = `Bóng ma/Dummy đợt này: ${activeGhosts}`;
    else
      UI.ghosts.innerText = `Boss đang triệu hồi (${Math.ceil(boss.summonCooldown / FPS)}s)...`;
  } else {
    UI.ghosts.innerText = `Bóng ma/Dummy: ${activeGhosts}`;
  }

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
}

function draw() {
  let { player, boss, bullets, ghosts, mouse } = state;
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
    ctx.fillStyle = g.isStunned > 0 ? "#333" : "#ff4444";
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

  if (player.dashTimeLeft > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = "white";
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
