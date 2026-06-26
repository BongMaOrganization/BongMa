import { API_BASE_URL } from "../config.js";

let socket = null;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function connectSocket(serverIp = "localhost") {
  if (socket && socket.connected) return socket;

  const isLocal =
    typeof window !== "undefined" && LOCAL_HOSTS.has(window.location.hostname);
  const url = isLocal ? `http://${serverIp}:3005` : API_BASE_URL;

  socket = io(url, {
    transports: ["websocket", "polling"],
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
