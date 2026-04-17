/**
 * room.js — Quản lý phòng multiplayer (client-side state)
 */

export const mpState = {
  roomCode: null,
  isHost: false,
  playerId: null,     // socket.id của mình
  hostId: null,
  players: [],        // [{ id, username, characterId, isHost, x, y, hp, maxHp, isDead }]
  gameStarted: false,
  bossType: null,
  playerCount: 1,
  hpScale: 1,
  serverIp: "localhost",
};

/**
 * Tạo phòng mới
 * @param {object} socket - socket instance
 * @param {string} username
 * @param {string} characterId
 * @returns {Promise<string>} roomCode
 */
export function createRoom(socket, username, characterId) {
  return new Promise((resolve, reject) => {
    socket.emit("create_room", { username, characterId });

    socket.once("room_created", (data) => {
      mpState.roomCode = data.roomCode;
      mpState.isHost = true;
      mpState.playerId = data.playerId;
      mpState.hostId = data.playerId;
      mpState.players = data.players;
      openLobby(socket); // Thêm dòng này để host tự chuyển sang lobby sau khi tạo phòng thành công
      resolve(data.roomCode);
    });

    setTimeout(() => reject(new Error("Timeout tạo phòng")), 5000);
  });
}

/**
 * Vào phòng của người khác
 * @param {object} socket
 * @param {string} roomCode - 6-char code
 * @param {string} username
 * @param {string} characterId
 */
export function joinRoom(socket, roomCode, username, characterId) {
  return new Promise((resolve, reject) => {
    socket.emit("join_room", { roomCode: roomCode.toUpperCase(), username, characterId });

    socket.once("room_joined", (data) => {
      mpState.roomCode = data.roomCode;
      mpState.isHost = false;
      mpState.playerId = data.playerId;
      mpState.hostId = data.hostId;
      mpState.players = data.players;
      openLobby(socket); // Transition to the lobby screen
      resolve(data);
    });

    socket.once("join_error", (data) => {
      reject(new Error(data.message));
    });

    setTimeout(() => reject(new Error("Timeout vào phòng")), 5000);
  });
}

/**
 * Lấy thông tin bản thân trong phòng
 */
export function getLocalPlayerInfo() {
  return mpState.players.find((p) => p.id === mpState.playerId) || null;
}

/**
 * Lấy danh sách remote players (không tính bản thân)
 */
export function getRemotePlayers() {
  return mpState.players.filter((p) => p.id !== mpState.playerId);
}

/**
 * Cập nhật thông tin 1 player trong danh sách
 */
export function updatePlayerInRoom(id, data) {
  const idx = mpState.players.findIndex((p) => p.id === id);
  if (idx !== -1) {
    mpState.players[idx] = { ...mpState.players[idx], ...data };
  }
}

/**
 * Reset toàn bộ mpState về mặc định
 */
export function resetMpState() {
  mpState.roomCode = null;
  mpState.isHost = false;
  mpState.playerId = null;
  mpState.hostId = null;
  mpState.players = [];
  mpState.gameStarted = false;
  mpState.bossType = null;
  mpState.playerCount = 1;
  mpState.hpScale = 1;
}

/**
 * Transition to the lobby screen and update player list dynamically.
 * SỬ DỤNG GIAO DIỆN MỚI (#screen-mp-lobby)
 * @param {object} socket - socket instance
 */
export function openLobby(socket) {
  // 1. Ẩn các màn hình khác và hiện #screen-mp-lobby
  document.getElementById("screen-multiplayer")?.classList.add("hidden");
  document.getElementById("screen-lobby")?.classList.add("hidden"); // Đảm bảo ẩn cái cũ đi
  document.getElementById("screen-mp-lobby")?.classList.remove("hidden");

  // 2. Hiển thị mã phòng
  const roomCodeDisplay = document.getElementById("mp-room-code-display");
  if (roomCodeDisplay) {
    roomCodeDisplay.textContent = mpState.roomCode;
  }

  // 3. Cập nhật danh sách người chơi
  updateLobbyUI();

  // 4. Setup listeners cho lobby
  setupLobbyListeners(socket);

  // 5. Lắng nghe sự kiện bắt đầu game
  socket.on("startGame", () => {
    document.getElementById("screen-mp-lobby")?.classList.add("hidden");
    // Thêm logic hiển thị màn hình game thực tế của bạn tại đây
    // Ví dụ: document.getElementById("game-container").classList.remove("hidden");
    // Khởi tạo vòng lặp game, v.v.
  });
}

/**
 * Cập nhật giao diện danh sách người chơi trong phòng chờ
 */
export function updateLobbyUI() {
  const playerListEl = document.getElementById("mp-players-list");
  const playerCountEl = document.getElementById("mp-player-count");

  if (playerCountEl) {
    playerCountEl.textContent = mpState.players.length;
  }

  if (playerListEl) {
    playerListEl.innerHTML = "";
    mpState.players.forEach((player) => {
      const li = document.createElement("li");
      
      // Tạo cấu trúc hiển thị thông tin người chơi (bạn có thể tuỳ chỉnh CSS)
      let playerText = `${player.username || "Unknown"}`;
      if (player.id === mpState.hostId) {
        playerText += " 👑"; // Biểu tượng Host
      }
      if (player.id === mpState.playerId) {
        playerText += " (Bạn)";
      }
      
      li.textContent = playerText;
      playerListEl.appendChild(li);
    });
  }

  // Quản lý hiển thị nút cho Host/Non-Host
  const hostControls = document.getElementById("mp-host-controls");
  const waitingMsg = document.getElementById("mp-waiting-msg");
  
  if (mpState.isHost) {
    if (hostControls) hostControls.style.display = "block";
    if (waitingMsg) waitingMsg.style.display = "none";
  } else {
    if (hostControls) hostControls.style.display = "none";
    if (waitingMsg) waitingMsg.style.display = "block";
  }
}

/**
 * Setup lobby listeners
 * @param {object} socket - socket instance
 */
export function setupLobbyListeners(socket) {
  // Khi có người ra/vào phòng, server gửi danh sách mới
  socket.on("player_list_update", (players) => {
    mpState.players = players;
    updateLobbyUI();
  });
}