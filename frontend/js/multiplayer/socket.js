/**
 * socket.js — Quản lý kết nối Socket.io client
 * Import socket.io từ CDN đã được inject vào HTML
 */

let socket = null;

/**
 * Kết nối đến server. serverIp là IP LAN của máy host.
 * VD: "192.168.1.5" hoặc "localhost"
 */
export function connectSocket(serverIp = "localhost") {
  if (socket && socket.connected) return socket;

  // socket.io được load qua CDN script tag trong index.html
  // eslint-disable-next-line no-undef
  socket = io(`http://${serverIp}:3000`, {
    transports: ["websocket"],
    reconnectionAttempts: 3,
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
