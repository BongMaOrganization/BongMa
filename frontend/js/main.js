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

// === MULTIPLAYER imports ===
import { connectSocket, disconnectSocket } from "./multiplayer/socket.js";
import { createRoom, joinRoom, mpState, resetMpState } from "./multiplayer/room.js";
import { startMultiplayerBossArena, handleMultiplayerBossKill } from "./multiplayer/mpFlow.js";
import { stopAllSync } from "./multiplayer/sync.js";
import { BOSS_TYPES } from "./entities/bosses/boss_manager.js";


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

function gameLoop() {
  if (state.gameState !== "PLAYING") return;

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
    state.loopId = requestAnimationFrame(gameLoop);
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

const btnMultiplayer = document.getElementById("btn-multiplayer");
if (btnMultiplayer) {
  btnMultiplayer.onclick = async () => {
    document.getElementById("screen-main").classList.add("hidden");
    document.getElementById("screen-multiplayer").classList.remove("hidden");
    // Pre-fill username from JWT token
    try {
      const { TOKEN_KEY } = await import("./utils.js");
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const el = document.getElementById("mp-username");
        if (el && !el.value) el.value = payload.username || "";
      }
    } catch (_) {}
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
  const ip = document.getElementById("mp-server-ip").value.trim() || "localhost";
  const username = document.getElementById("mp-username").value.trim() || "Player";
  const errEl = document.getElementById("mp-connect-error");
  errEl.textContent = "Đang kết nối...";
  errEl.style.color = "#00ffcc";

  try {
    mpState.serverIp = ip;
    const socket = connectSocket(ip);

    await new Promise((res, rej) => {
      socket.once("connect", res);
      socket.once("connect_error", (e) => rej(new Error("Không kết nối được: " + e.message)));
      setTimeout(() => rej(new Error("Timeout kết nối")), 5000);
    });

    const roomCode = await createRoom(socket, username, state.selectedCharacter);
    errEl.textContent = "";

    // Verify DOM elements
    const lobbyScreen = document.getElementById("screen-lobby");
    const playerList = document.getElementById("lobby-player-list");
    const roomCodeEl = document.getElementById("lobby-room-code");

    if (lobbyScreen && playerList && roomCodeEl) {
      openLobby(socket); // Transition to the lobby screen
    } else {
      throw new Error("Lobby elements are missing in the DOM.");
    }
  } catch (e) {
    errEl.style.color = "#ff4477";
    errEl.textContent = e.message;
    console.error("Error creating room:", e);
  }
});

// --- Vào phòng ---
document.getElementById("btn-mp-join")?.addEventListener("click", async () => {
  const ip = document.getElementById("mp-server-ip").value.trim() || "localhost";
  const username = document.getElementById("mp-username").value.trim() || "Player";
  const code = document.getElementById("mp-room-code-input").value.trim().toUpperCase();
  const errEl = document.getElementById("mp-connect-error");

  if (!code || code.length !== 6) {
    errEl.style.color = "#ff4477";
    errEl.textContent = "Nhập đúng mã 6 ký tự!";
    return;
  }

  errEl.textContent = "Đang kết nối...";
  errEl.style.color = "#00ffcc";

  try {
    mpState.serverIp = ip;
    const socket = connectSocket(ip);

    await new Promise((res, rej) => {
      socket.once("connect", res);
      socket.once("connect_error", (e) => rej(new Error("Không kết nối được: " + e.message)));
      setTimeout(() => rej(new Error("Timeout kết nối")), 5000);
    });

    await joinRoom(socket, code, username, state.selectedCharacter);
    errEl.textContent = "";
    openLobby(socket, code);
  } catch (e) {
    errEl.style.color = "#ff4477";
    errEl.textContent = e.message;
  }
});

// ---- LOBBY ----

let _lobbySocket = null;
let _selectedBossKey = null;

function openLobby(socket, roomCode) {
  _lobbySocket = socket;

  // Hide multiplayer screen and show lobby screen
  document.getElementById("screen-multiplayer").classList.add("hidden");
  document.getElementById("screen-lobby").classList.remove("hidden");

  // Display room code
  const roomCodeEl = document.getElementById("lobby-room-code");
  if (roomCodeEl) roomCodeEl.textContent = roomCode;

  // Clear player list
  const playerListEl = document.getElementById("lobby-player-list");
  if (playerListEl) playerListEl.innerHTML = "";

  // Listen for player updates
  socket.on("playerListUpdate", (players) => {
    if (playerListEl) {
      playerListEl.innerHTML = "";
      players.forEach((player) => {
        const li = document.createElement("li");
        li.textContent = player;
        playerListEl.appendChild(li);
      });
    }
  });

  // Listen for game start
  socket.on("startGame", () => {
    document.getElementById("screen-lobby").classList.add("hidden");
    startMultiplayerBossArena(socket, gameLoop);
  });

  // Host starts the game
  const startBtn = document.getElementById("btn-lobby-start");
  if (startBtn) {
    startBtn.onclick = () => {
      socket.emit("startGame");
    };
  }

  // Leave lobby
  const leaveBtn = document.getElementById("btn-lobby-leave");
  if (leaveBtn) {
    leaveBtn.onclick = () => {
      socket.emit("leaveRoom");
      resetMpState();
      document.getElementById("screen-lobby").classList.add("hidden");
      document.getElementById("screen-main").classList.remove("hidden");
    };
  }
}

function refreshLobbyUI() {
  const list = document.getElementById("mp-players-list");
  const countEl = document.getElementById("mp-player-count");
  if (!list) return;

  list.innerHTML = "";
  countEl.textContent = mpState.players.length;

  mpState.players.forEach((p) => {
    const li = document.createElement("li");
    li.className = "mp-player-slot" + (p.isHost ? " is-host" : "");
    li.innerHTML = `
      <div class="mp-player-avatar">${p.isHost ? "👑" : "🎮"}</div>
      <div>
        <div class="mp-player-name">${p.username}
          ${p.id === mpState.playerId ? '<span class="mp-player-you-badge">(Bạn)</span>' : ""}
          ${p.isHost ? '<span class="mp-player-host-badge">HOST</span>' : ""}
        </div>
        <div style="font-size:11px;color:#446;">${p.characterId}</div>
      </div>
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

  // Enable start if host and ≥ 2 players (allow 1 for testing)
  const startBtn = document.getElementById("btn-mp-start");
  if (startBtn) {
    startBtn.disabled = !_selectedBossKey;
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
      const startBtn = document.getElementById("btn-mp-start");
      if (startBtn) startBtn.disabled = false;
    };
    grid.appendChild(card);
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

  // Host cũng nhận game_start từ server
  _lobbySocket.once("game_start", ({ bossType, hpScale, playerCount, players }) => {
    mpState.players = players;
    mpState.bossType = bossType;
    mpState.playerCount = playerCount;
    mpState.hpScale = hpScale;
    closeLobbyScreen();
    startMultiplayerBossArena(bossType, hpScale, players, changeStateBound, gameLoop);
  });
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
    _lobbySocket.off("player_joined");
    _lobbySocket.off("player_left");
    _lobbySocket.off("game_start");
  }
}
