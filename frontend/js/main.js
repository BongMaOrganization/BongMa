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
import { initGraphics, needsAutoDetect, sampleAutoDetect } from "./game/graphics.js";
import { setupSettingsUI } from "./settings.js";
import { openShop } from "./characters/shop.js";
import { setupMenuButtons } from "./characters/select.js";
import { evolve } from "./game/evolutions.js";
import { handleSkillsUpdate } from "./game/skills.js";
import { updateBossUI } from "./ui.js";
import { FPS } from "./config.js";

// === MULTIPLAYER imports ===
import { connectSocket, disconnectSocket, getSocket } from "./multiplayer/socket.js";
import { createRoom, joinRoom, mpState, resetMpState, openLobby, setLobbyUICallback } from "./multiplayer/room.js";
import { startMultiplayerBossArena, handleMultiplayerBossKill } from "./multiplayer/mpFlow.js";
import { stopAllSync, sendDamageToHost } from "./multiplayer/sync.js";
import { BOSS_TYPES } from "./entities/bosses/boss_manager.js";
import { CHARACTERS } from "./characters/data.js";


const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const FRAME_INTERVAL_MS = 1000 / FPS;
// Số bước update tối đa được "bù" trong 1 frame render. Chống spiral of death
// khi máy quá yếu / tab chạy nền: thà game chậm tạm thời còn hơn treo cứng.
const MAX_CATCHUP_STEPS = 5;

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

  if (!state.lastLoopTimestamp) state.lastLoopTimestamp = timestamp;
  let elapsed = timestamp - state.lastLoopTimestamp;
  state.lastLoopTimestamp = timestamp;
  // Clamp khoảng trống lớn (chuyển tab, lag spike) để không dồn hàng trăm bước.
  if (elapsed > 250) elapsed = 250;

  // === FIXED-TIMESTEP ACCUMULATOR ===
  // Mô phỏng (update) LUÔN chạy 60 bước/giây, tách rời tốc độ render. Khi vẽ
  // nặng làm FPS tụt, ta chạy bù nhiều update/frame để tốc độ game (và vị trí
  // gửi cho đồng đội) giữ nguyên — hết hiện tượng "nhân vật đi chậm".
  state._accumulator = (state._accumulator || 0) + elapsed;

  let steps = 0;
  let result = null;
  while (state._accumulator >= FRAME_INTERVAL_MS && steps < MAX_CATCHUP_STEPS) {
    // MP non-host: boss.hp do host làm chủ (sync ghi đè cục bộ). Đo lượng máu
    // boss giảm do skill/hazard/dash trong bước này rồi gửi host — nếu không
    // skill non-host không gây dame (đạn đã tự gửi qua combat.js, không đụng
    // boss.hp cục bộ nên không đếm trùng).
    const bossHpBefore =
      state.isMultiplayer && !state.isHost && state.boss ? state.boss.hp : null;
    handleSkillsUpdate(canvas, changeStateBound);
    result = update(ctx, canvas, changeStateBound);
    if (bossHpBefore != null && state.boss) {
      const localDmg = bossHpBefore - state.boss.hp;
      if (localDmg > 0) sendDamageToHost(state.mpRoomCode, localDmg);
    }
    state._accumulator -= FRAME_INTERVAL_MS;
    steps++;
    if (result === "BOSS_KILLED" || result === "STAGE_CLEAR") {
      state._accumulator = 0;
      break;
    }
  }
  // Quá tải không bù kịp → bỏ phần dư, tránh dồn hàng (spiral of death).
  if (steps >= MAX_CATCHUP_STEPS) state._accumulator = 0;

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
    // FPS cap render (tách khỏi sim). 0 = không giới hạn (theo nhịp màn hình).
    const cap = state.settings?.fpsCap || 0;
    if (cap > 0) {
      const minInterval = 1000 / cap - 1;
      if (timestamp - (state._lastDrawAt || 0) >= minInterval) {
        renderAndSample();
        state._lastDrawAt = timestamp;
      }
    } else {
      renderAndSample();
    }
    state.loopId = requestAnimationFrame(gameLoop);
  }
}

// Vẽ 1 frame; lần đầu (chưa có lựa chọn đồ họa) đo thời gian vẽ để auto-detect
// mức phù hợp với máy.
function renderAndSample() {
  if (!needsAutoDetect()) {
    draw(ctx, canvas);
  } else {
    const t0 = performance.now();
    draw(ctx, canvas);
    const drawMs = performance.now() - t0;
    const picked = sampleAutoDetect(1000 / Math.max(drawMs, 0.1));
    if (picked) {
      const sel = document.getElementById("setting-graphics");
      if (sel) sel.value = picked;
    }
  }
  trackFps(performance.now());
}

// === FPS COUNTER (đo nhịp render thực tế) ===
let _fpsLast = 0;
let _fpsEma = 60;
let _fpsDomAt = 0;
function trackFps(now) {
  if (_fpsLast) {
    const dt = now - _fpsLast;
    if (dt > 0) _fpsEma = _fpsEma * 0.9 + (1000 / dt) * 0.1;
  }
  _fpsLast = now;

  const el = document.getElementById("fps-counter");
  if (!el) return;
  if (state.settings?.showFps) {
    if (now - _fpsDomAt > 250) {
      _fpsDomAt = now;
      el.style.display = "block";
      el.textContent = Math.round(_fpsEma) + " FPS";
    }
  } else if (el.style.display !== "none") {
    el.style.display = "none";
  }
}

initGraphics(); // gắn hook shadowBlur + nạp preset đã lưu TRƯỚC khi vẽ frame đầu
setupSettingsUI();
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

// Cả đội ngã xuống → về lại phòng chờ MP để chơi lại (thay vì văng ra menu solo).
// mpFlow đã gọi changeState("GAME_OVER") để dừng loop sạch; ở đây chỉ đổi màn hình.
window.addEventListener("mp:allDead", () => {
  const socket = getSocket();
  if (!socket || !socket.connected) return; // mất kết nối → giữ màn GAME_OVER
  UI.bossUi.style.display = "none";
  document.getElementById("screen-main").classList.add("hidden");
  _lobbySocket = socket;
  openLobby(socket);
  if (mpState.isHost) buildBossSelectGrid();
  buildCharacterSelectGrid(socket);
  refreshLobbyUI();
  setupGameStartListener(socket);
});

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
