import { state } from "./state.js";
import { playSound } from "./game/audio.js";
import { UI, renderMapSelect } from "./ui.js";
import { setupInput } from "./input.js";
import {
  initAuth,
  syncRemoteState,
  isAuthenticated,
  showLoginScreen,
} from "./auth.js";
import {
  changeState,
  startGame,
  nextStage,
  openBossArena,
  handleBossArenaReward,
} from "./game/flow.js";
import { update } from "./game/update.js";
import { draw } from "./game/draw.js";
import { openShop } from "./characters/shop.js";
import { setupMenuButtons } from "./characters/select.js";
import { evolve } from "./game/evolutions.js";
import { handleSkillsUpdate } from "./game/skills.js";
import { updateBossUI } from "./ui.js";
import { FPS } from "./config.js";

// === MULTIPLAYER imports ===
import { connectSocket, disconnectSocket } from "./multiplayer/socket.js";
import { createRoom, joinRoom, mpState, resetMpState, openLobby, setLobbyUICallback } from "./multiplayer/room.js";
import { startMultiplayerBossArena, handleMultiplayerBossKill } from "./multiplayer/mpFlow.js";
import { stopAllSync } from "./multiplayer/sync.js";
import { BOSS_TYPES } from "./entities/bosses/boss_manager.js";
import { CHARACTERS } from "./characters/data.js";


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const FRAME_INTERVAL_MS = 1000 / FPS;

function scheduleNextFrame(frameStartedAt) {
  if (state.gameState !== "PLAYING") return;

  const frameCost = performance.now() - frameStartedAt;
  const delay = Math.max(0, FRAME_INTERVAL_MS - frameCost);

  state.loopTimeoutId = window.setTimeout(() => {
    if (state.gameState === "PLAYING") {
      state.loopId = requestAnimationFrame(gameLoop);
    }
  }, delay);
}

document.addEventListener("click", (event) => {
  if (event.target.closest("button")) {
    playSound("button");
  }
});

function changeStateBound(newState) {
  changeState(newState, gameLoop);
}

function nextStageBound() {
  nextStage(gameLoop);
}

function gameLoop(timestamp = performance.now()) {
  if (state.gameState !== "PLAYING") return;

  if (!state.lastLoopTimestamp) {
    state.lastLoopTimestamp = timestamp - FRAME_INTERVAL_MS;
  }

  const elapsed = timestamp - state.lastLoopTimestamp;
  if (elapsed < FRAME_INTERVAL_MS) {
    scheduleNextFrame(timestamp);
    return;
  }

  state.lastLoopTimestamp = timestamp;

  handleSkillsUpdate(canvas, changeStateBound);

  const result = update(ctx, canvas, changeStateBound);
  updateBossUI();

  if (result === "BOSS_KILLED" || result === "STAGE_CLEAR") {
    // === MULTIPLAYER boss kill ===
    if (result === "BOSS_KILLED" && state.isMultiplayer) {
      handleMultiplayerBossKill(gameLoop);
      return;
    }
    if (result === "BOSS_KILLED" && state.bossArenaMode) {
      handleBossArenaReward(gameLoop);
      return;
    }
    nextStageBound();
    return;
  }

  if (state.gameState === "PLAYING") {
    draw(ctx, canvas);
    scheduleNextFrame(timestamp);
  }
}

setupInput(canvas);
setupMenuButtons(openShop, changeStateBound);
// Kiểm tra đăng nhập TRƯỚC KHI hiện menu
initAuth(async () => {
  await syncRemoteState();
  changeStateBound("MENU");
});

// UI.btnStart.onclick = () => startGame(gameLoop);
const btnStart = document.getElementById("btn-start");

btnStart.onclick = () => {
  console.log("CLICK START");

  document.getElementById("screen-main").classList.add("hidden");
  document.getElementById("screen-map-select").classList.remove("hidden");

  renderMapSelect(() => {
    console.log("MAP SELECTED");

    document.getElementById("screen-map-select").classList.add("hidden");
    startGame(gameLoop);
  });
};
const btnMapSelect = document.getElementById("btn-map-select");

if (btnMapSelect) {
  btnMapSelect.onclick = () => {
    document.getElementById("screen-main").classList.add("hidden");
    document.getElementById("screen-map-select").classList.remove("hidden");

    renderMapSelect(() => {
      startGame(gameLoop);
    });
  };
}
// Boss Arena button setup
const arenaBtn = document.getElementById("btn-boss-arena");
if (arenaBtn) {
  arenaBtn.onclick = () => {
    if (isAuthenticated()) {
      openBossArena(changeStateBound, gameLoop);
    } else {
      showLoginScreen();
    }
  };
}
// Arena back button
const arenaBack = document.getElementById("btn-arena-back");
if (arenaBack) {
  arenaBack.onclick = () => {
    document.getElementById("screen-boss-arena").classList.add("hidden");
    document.getElementById("screen-main").classList.remove("hidden");
  };
}
const mapBack = document.getElementById("btn-map-back");
if (mapBack) {
  mapBack.onclick = () => {
    document.getElementById("screen-map-select").classList.add("hidden");
    document.getElementById("screen-main").classList.remove("hidden");
  };
}

// Chờ 1 chút để Auth init xử lý. Nếu có token sẽ tự hiện menu, nếu không sẽ hiện Login.
if (isAuthenticated()) {
  changeStateBound("MENU");
} else {
  showLoginScreen();
}

export { evolve };

// ============================================================
// === MULTIPLAYER UI HANDLER
// ============================================================

// Helper: update connection status indicator
function setMpConnectionStatus(status) {
  const el = document.getElementById("mp-connection-status");
  const textEl = document.getElementById("mp-status-text");
  if (!el || !textEl) return;
  el.className = "mp-connection-status mp-status-" + status;
  const labels = {
    disconnected: "Chưa kết nối",
    connecting: "Đang kết nối...",
    connected: "🟢 Server Online",
  };
  textEl.textContent = labels[status] || status;
}

const btnMultiplayer = document.getElementById("btn-multiplayer");
if (btnMultiplayer) {
  btnMultiplayer.onclick = async () => {
    document.getElementById("screen-main").classList.add("hidden");
    document.getElementById("screen-multiplayer").classList.remove("hidden");

    // Pre-fill username from JWT
    try {
      const { TOKEN_KEY } = await import("./utils.js");
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const el = document.getElementById("mp-username");
        if (el && !el.value) el.value = payload.username || "";
      }
    } catch (_) {}

    // Pre-connect socket and show live status
    setMpConnectionStatus("connecting");
    const socket = connectSocket();

    if (socket.connected) {
      setMpConnectionStatus("connected");
    } else {
      socket.once("connect", () => setMpConnectionStatus("connected"));
      socket.once("connect_error", () => setMpConnectionStatus("disconnected"));
    }
    socket.on("disconnect", () => setMpConnectionStatus("disconnected"));
    socket.on("reconnect_attempt", () => setMpConnectionStatus("connecting"));
    socket.on("reconnect", () => setMpConnectionStatus("connected"));
  };
}

// Back button
document.getElementById("btn-mp-back")?.addEventListener("click", () => {
  disconnectSocket();
  document.getElementById("screen-multiplayer").classList.add("hidden");
  document.getElementById("screen-main").classList.remove("hidden");
});

// --- Tạo phòng ---
document.getElementById("btn-mp-create")?.addEventListener("click", async () => {
  const username = document.getElementById("mp-username").value.trim() || "Player";
  const errEl = document.getElementById("mp-connect-error");
  errEl.textContent = "Đang kết nối đến server...";
  errEl.style.color = "#00ffcc";

  try {
    const socket = connectSocket();

    await new Promise((res, rej) => {
      if (socket.connected) return res();
      socket.once("connect", res);
      socket.once("connect_error", (e) => rej(new Error("Không kết nối được server: " + e.message)));
      setTimeout(() => rej(new Error("Timeout — server có thể đang khởi động lại")), 10000);
    });

    await createRoom(socket, username, state.selectedCharacter);
    errEl.textContent = "";
    _lobbySocket = socket;
    openLobby(socket);
    buildBossSelectGrid();
    buildCharacterSelectGrid(socket);
    refreshLobbyUI();
    setupGameStartListener(socket);
  } catch (e) {
    errEl.style.color = "#ff4477";
    errEl.textContent = e.message;
    console.error("Error creating room:", e);
  }
});

// --- Vào phòng ---
document.getElementById("btn-mp-join")?.addEventListener("click", async () => {
  const username = document.getElementById("mp-username").value.trim() || "Player";
  const code = document.getElementById("mp-room-code-input").value.trim().toUpperCase();
  const errEl = document.getElementById("mp-connect-error");

  if (!code || code.length !== 6) {
    errEl.style.color = "#ff4477";
    errEl.textContent = "Nhập đúng mã 6 ký tự!";
    return;
  }

  errEl.textContent = "Đang kết nối đến server...";
  errEl.style.color = "#00ffcc";

  try {
    const socket = connectSocket();

    await new Promise((res, rej) => {
      if (socket.connected) return res();
      socket.once("connect", res);
      socket.once("connect_error", (e) => rej(new Error("Không kết nối được server: " + e.message)));
      setTimeout(() => rej(new Error("Timeout — server có thể đang khởi động lại")), 10000);
    });

    await joinRoom(socket, code, username, state.selectedCharacter);
    errEl.textContent = "";
    _lobbySocket = socket;
    openLobby(socket);
    buildCharacterSelectGrid(socket);
    refreshLobbyUI();
    setupGameStartListener(socket);
  } catch (e) {
    errEl.style.color = "#ff4477";
    errEl.textContent = e.message;
  }
});

// ---- LOBBY ----

let _lobbySocket = null;
let _selectedBossKey = null;

// Đăng ký refreshLobbyUI để room.js gọi khi có player_list_update
setLobbyUICallback(() => refreshLobbyUI());

function refreshLobbyUI() {
  const list = document.getElementById("mp-players-list");
  const countEl = document.getElementById("mp-player-count");
  if (!list) return;

  list.innerHTML = "";
  countEl.textContent = mpState.players.length;

  mpState.players.forEach((p) => {
    const readyIcon = p.isHost ? "✅" : (p.isReady ? "✅" : "⏳");
    const li = document.createElement("li");
    li.className = "mp-player-slot" + (p.isHost ? " is-host" : "");
    li.innerHTML = `
      <div class="mp-player-avatar">${p.isHost ? "👑" : "🎮"}</div>
      <div style="flex:1">
        <div class="mp-player-name">${p.username}
          ${p.id === mpState.playerId ? '<span class="mp-player-you-badge">(Bạn)</span>' : ""}
          ${p.isHost ? '<span class="mp-player-host-badge">HOST</span>' : ""}
        </div>
        <div style="font-size:11px;color:#aaa;">${p.characterId}</div>
      </div>
      <div style="font-size:18px;">${readyIcon}</div>
    `;
    list.appendChild(li);
  });

  // Thêm slot trống
  for (let i = mpState.players.length; i < 4; i++) {
    const li = document.createElement("li");
    li.className = "mp-player-slot empty-slot";
    li.innerHTML = `<div class="mp-player-avatar" style="opacity:0.3">＋</div><div style="color:#334">Đang chờ...</div>`;
    list.appendChild(li);
  }

  const startBtn = document.getElementById("btn-mp-start");
  if (startBtn) {
    const nonHosts = mpState.players.filter((p) => !p.isHost);
    const allReady = nonHosts.length === 0 || nonHosts.every((p) => p.isReady);
    startBtn.disabled = !_selectedBossKey || !allReady;
    startBtn.textContent = mpState.players.length >= 2
      ? `🏆 BẮT ĐẦU (${mpState.players.length} người)`
      : "🏆 BẮT ĐẦU (1 người - Test)";
  }
}

function buildBossSelectGrid() {
  const grid = document.getElementById("mp-boss-select-grid");
  if (!grid) return;
  grid.innerHTML = "";

  Object.entries(BOSS_TYPES).forEach(([key, cfg]) => {
    const card = document.createElement("div");
    card.className = "mp-boss-card";
    card.style.setProperty("--boss-color", cfg.color);
    card.innerHTML = `
      <div class="mp-boss-card-icon">${cfg.icon || "👹"}</div>
      <div class="mp-boss-card-name">${cfg.name}</div>
      <div class="mp-boss-card-hp" style="color:${cfg.color}">HP: ${cfg.hp}</div>
    `;
    card.onclick = () => {
      _selectedBossKey = key;
      grid.querySelectorAll(".mp-boss-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      refreshLobbyUI();
    };
    grid.appendChild(card);
  });
}

const RARITY_COLORS = { common: "#4ade80", rare: "#60a5fa", legendary: "#c084fc", mythical: "#ff0088" };

function buildCharacterSelectGrid(socket) {
  const grid = document.getElementById("mp-char-select-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const owned = state.ownedCharacters || ["speedster"];

  CHARACTERS.forEach((char) => {
    if (!owned.includes(char.id)) return;
    const card = document.createElement("div");
    card.className = "mp-char-card" + (state.selectedCharacter === char.id ? " selected" : "");
    card.style.setProperty("--char-color", RARITY_COLORS[char.rarity] || "#aaa");
    card.innerHTML = `
      <div class="mp-char-card-name" style="color:${RARITY_COLORS[char.rarity]}">${char.name}</div>
      <div class="mp-char-card-rarity" style="font-size:10px;color:#888">${char.rarity}</div>
    `;
    card.onclick = () => {
      state.selectedCharacter = char.id;
      grid.querySelectorAll(".mp-char-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      if (socket) {
        socket.emit("player_change_character", {
          roomCode: mpState.roomCode,
          characterId: char.id,
        });
      }
    };
    grid.appendChild(card);
  });
}

function setupGameStartListener(socket) {
  socket.off("game_start");
  socket.on("game_start", ({ bossType, hpScale, playerCount, players }) => {
    mpState.players = players;
    mpState.bossType = bossType;
    mpState.playerCount = playerCount;
    mpState.hpScale = hpScale;
    closeLobbyScreen();
    startMultiplayerBossArena(bossType, hpScale, players, changeStateBound, gameLoop);
  });
}

// Host: bắt đầu game
document.getElementById("btn-mp-start")?.addEventListener("click", () => {
  if (!_selectedBossKey) return;
  if (!_lobbySocket) return;
  _lobbySocket.emit("start_game", {
    roomCode: mpState.roomCode,
    bossType: _selectedBossKey,
  });
});

// Non-host: nút Sẵn Sàng
document.getElementById("btn-mp-ready")?.addEventListener("click", () => {
  if (!_lobbySocket) return;
  _lobbySocket.emit("player_ready", { roomCode: mpState.roomCode });
  const btn = document.getElementById("btn-mp-ready");
  if (btn) btn.classList.toggle("ready-active");
});

// Rời phòng
document.getElementById("btn-mp-leave")?.addEventListener("click", () => {
  disconnectSocket();
  resetMpState();
  closeLobbyScreen();
  document.getElementById("screen-main").classList.remove("hidden");
});

function closeLobbyScreen() {
  document.getElementById("screen-mp-lobby").classList.add("hidden");
  if (_lobbySocket) {
    _lobbySocket.off("player_list_update");
    _lobbySocket.off("game_start");
  }
}
