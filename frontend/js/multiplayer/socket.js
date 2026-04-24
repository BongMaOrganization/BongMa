/**
 * socket.js — Quản lý kết nối Socket.io client
 * WAN mode: kết nối tới api.bongma.storyoftri.xyz
 */

const SERVER_URL = "https://bongma.storyoftri.xyz";

let socket = null;

/**
 * Kết nối đến server WAN. Không cần truyền IP nữa.
 */
export function connectSocket() {
  if (socket && socket.connected) return socket;

  // eslint-disable-next-line no-undef
  socket = io(SERVER_URL, {
    transports: ["websocket", "polling"], // polling fallback cho WAN
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log(`[MP] Kết nối socket thành công: ${socket.id}`);
  });

  socket.on("connect_error", (err) => {
    console.warn("[MP] Lỗi kết nối socket:", err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ==============================
// EMIT HELPERS
// ==============================

export function emitPlayerUpdate(roomCode, playerData) {
  if (!socket) return;
  socket.emit("player_update", { roomCode, ...playerData });
}

export function emitBossState(roomCode, bossData) {
  if (!socket) return;
  socket.emit("boss_state", { roomCode, ...bossData });
}

export function emitPlayerDamage(roomCode, damage) {
  if (!socket) return;
  socket.emit("player_damage", { roomCode, damage });
}

export function emitBossKilled(roomCode) {
  if (!socket) return;
  socket.emit("boss_killed", { roomCode });
}

export function emitReviveUpdate(roomCode, deadPlayerId, progress) {
  if (!socket) return;
  socket.emit("revive_update", { roomCode, deadPlayerId, progress });
}

export function emitPlayerRevived(roomCode, deadPlayerId) {
  if (!socket) return;
  socket.emit("player_revived", { roomCode, deadPlayerId });
}
