/**
 * sync.js — Đồng bộ game state giữa các clients qua Socket.io
 * * Host:   chạy boss logic thật, broadcast boss state
 * Non-host: nhận boss state từ host, gửi damage lên host
 */
import { state } from "../state.js";
import { mpState, updatePlayerInRoom } from "./room.js";
import {
  emitPlayerUpdate,
  emitBossState,
  emitPlayerDamage,
  emitBossKilled,
  emitReviveUpdate,
  emitPlayerRevived,
} from "./socket.js";

let playerSyncInterval = null;
let bossSyncInterval = null;

// ==============================
// SETUP LISTENERS
// ==============================

/**
 * Khởi tạo tất cả socket event listener cho in-game
 * Gọi 1 lần khi game_start
 */
export function setupGameListeners(socket) {
  // Nhận vị trí/state remote players
  socket.on("remote_player_update", ({ id, x, y, hp, maxHp, isDead }) => {
    updatePlayerInRoom(id, { x, y, hp, maxHp, isDead });

    // Cập nhật vào state.remotePlayers để draw
    const idx = state.remotePlayers.findIndex((p) => p.id === id);
    if (idx !== -1) {
      state.remotePlayers[idx].x = x;
      state.remotePlayers[idx].y = y;
      state.remotePlayers[idx].hp = hp;
      state.remotePlayers[idx].maxHp = maxHp;
      state.remotePlayers[idx].isDead = isDead;

      // Tạo revive zone nếu player vừa chết
      if (isDead && !state.remotePlayers[idx].wasDeadLastFrame) {
        spawnReviveZone(id, x, y);
      }
      state.remotePlayers[idx].wasDeadLastFrame = isDead;
    }
  });

  // Non-host nhận boss state từ host
  if (!mpState.isHost) {
    socket.on(
      "boss_state_update",
      ({ x, y, hp, maxHp, phase, bossSpecial, deathTimer }) => {
        if (!state.boss) return;
        state.boss.x = x;
        state.boss.y = y;
        state.boss.hp = hp;
        state.boss.maxHp = maxHp;
        if (deathTimer !== undefined) state.boss.deathTimer = deathTimer;
        if (bossSpecial !== undefined) state.bossSpecial = bossSpecial;

        // Cập nhật UI boss HP
        import("../ui.js").then(({ UI }) => {
          const pct = Math.max(0, (hp / maxHp) * 100);
          if (UI.bossHp) UI.bossHp.style.width = pct + "%";
          if (UI.bossHpTrail) UI.bossHpTrail.style.width = pct + "%";
        });
      },
    );
  }

  // Host nhận damage từ non-host và apply vào boss
  if (mpState.isHost) {
    socket.on("apply_damage", ({ fromId, damage }) => {
      if (!state.boss || state.boss.hp <= 0) return;
      if (state.boss.shieldActive && state.boss.shield > 0) {
        state.boss.shield -= damage * 2;
        if (state.boss.shield <= 0) {
          state.boss.shieldActive = false;
          state.boss.stunTimer = 180;
        }
      } else {
        state.boss.hp -= damage;
      }
    });
  }

  // Nhận trạng thái revive từ người đang revive
  socket.on("revive_progress", ({ deadPlayerId, progress, reviverId }) => {
    const zone = state.reviveZones.find((z) => z.deadPlayerId === deadPlayerId);
    if (zone) {
      zone.progress = progress;
      zone.reviverId = reviverId;
    }
  });

  // Người chết được hồi sinh
  socket.on("remote_player_revived", ({ deadPlayerId }) => {
    // Xoá revive zone
    state.reviveZones = state.reviveZones.filter(
      (z) => z.deadPlayerId !== deadPlayerId,
    );

    // Hồi sinh remote player
    const rp = state.remotePlayers.find((p) => p.id === deadPlayerId);
    if (rp) {
      rp.isDead = false;
      rp.hp = Math.ceil(rp.maxHp / 2);
      rp.wasDeadLastFrame = false;
    }
    updatePlayerInRoom(deadPlayerId, { isDead: false });
  });

  // Nhận lệnh boss bị hạ từ host (non-host)
  socket.on("all_boss_killed", () => {
    if (state.boss) {
      state.boss.hp = 0;
      if (!state.boss.deathTimer) state.boss.deathTimer = 120;
    }
  });

  // Host thoát giữa chừng
  socket.on("host_left", () => {
    alert("Host đã thoát phòng. Trận đấu kết thúc.");
    stopAllSync();
    window.location.reload();
  });

  // Có player mới rời phòng giữa trận
  socket.on("player_left", ({ playerId, players }) => {
    state.remotePlayers = state.remotePlayers.filter((p) => p.id !== playerId);
    state.reviveZones = state.reviveZones.filter(
      (z) => z.deadPlayerId !== playerId,
    );
  });

  // ==============================
  // GAME START, END, AND ERRORS
  // ==============================

  // Listen for game start
  socket.on("startGame", () => {
    if (mpState.isHost) {
      startBossSync(socket);
    }
  });

  // Listen for game end
  socket.on("endGame", () => {
    stopAllSync();
    // Additional cleanup if needed
  });

  // Handle socket errors gracefully
  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
    alert("Kết nối thất bại. Vui lòng kiểm tra mạng và thử lại.");
  });

  socket.on("disconnect", (reason) => {
    console.warn("Socket disconnected:", reason);
    alert("Mất kết nối với máy chủ. Vui lòng thử lại.");
    stopAllSync();

    // Safety check in case DOM elements don't exist yet
    const screenLobby = document.getElementById("screen-lobby");
    const screenMain = document.getElementById("screen-main");
    if (screenLobby) screenLobby.classList.add("hidden");
    if (screenMain) screenMain.classList.remove("hidden");
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
    alert("Đã xảy ra lỗi. Vui lòng thử lại.");
  });
}

// ==============================
// SYNC INTERVALS
// ==============================

/** Host gửi boss state xuống cho các client (30 lần/giây) */
export function startBossSync(roomCodeOrSocket) {
  if (!mpState.isHost) return;

  if (bossSyncInterval) clearInterval(bossSyncInterval);
  bossSyncInterval = setInterval(() => {
    if (!state.boss) return;
    emitBossState(roomCodeOrSocket, {
      x: state.boss.x,
      y: state.boss.y,
      hp: state.boss.hp,
      maxHp: state.boss.maxHp,
      phase: state.boss.currentPhaseIndex || 0,
      bossSpecial: state.bossSpecial || null,
      deathTimer: state.boss.deathTimer || 0,
    });

    // Kiểm tra boss chết → broadcast
    if (state.boss.hp <= 0 && !state._mpBossKilledSent) {
      state._mpBossKilledSent = true;
      emitBossKilled(roomCodeOrSocket);
    }
  }, 1000 / 30);
}

/** * Đồng bộ trạng thái của Local Player (vị trí, máu, trạng thái) lên server
 * (Gửi 30 lần/giây)
 */
export function startPlayerSync(roomCodeOrSocket) {
  if (playerSyncInterval) clearInterval(playerSyncInterval);

  playerSyncInterval = setInterval(() => {
    // Nếu chưa có player thì bỏ qua
    if (!state.player) return;

    emitPlayerUpdate(roomCodeOrSocket, {
      x: state.player.x,
      y: state.player.y,
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      isDead: state.player.isDead || false,
    });
  }, 1000 / 30);
}
/** Stop all synchronization intervals. */
export function stopAllSync() {
  if (playerSyncInterval) {
    clearInterval(playerSyncInterval);
    playerSyncInterval = null;
  }
  if (bossSyncInterval) {
    clearInterval(bossSyncInterval);
    bossSyncInterval = null;
  }
}

// ==============================
// PLAYER ACTIONS & REVIVE
// ==============================

/** Non-host gửi damage lên host */
export function sendDamageToHost(roomCode, damage) {
  emitPlayerDamage(roomCode, damage);
}

/**
 * Cập nhật revive zones mỗi frame (gọi từ game loop)
 */
export function updateReviveZones(roomCode) {
  if (!state.reviveZones) return;
  const player = state.player;
  if (!player || player.isDead) return;

  for (const zone of state.reviveZones) {
    const dx = player.x - zone.x;
    const dy = player.y - zone.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < zone.radius) {
      zone.progress = Math.min(100, zone.progress + 100 / 180); // 3 giây @ 60fps
      zone.reviverId = mpState.playerId;
      emitReviveUpdate(roomCode, zone.deadPlayerId, zone.progress);

      if (zone.progress >= 100) {
        emitPlayerRevived(roomCode, zone.deadPlayerId);
        state.reviveZones = state.reviveZones.filter((z) => z !== zone);
      }
    } else {
      // Ra ngoài → reset progress từ từ
      if (zone.reviverId === mpState.playerId) {
        zone.progress = Math.max(0, zone.progress - 1);
        zone.reviverId = null;
      }
    }
  }
}

/**
 * Tạo revive zone khi remote player chết
 */
function spawnReviveZone(deadPlayerId, x, y) {
  if (!state.reviveZones) state.reviveZones = [];
  // Không tạo 2 zone cho cùng 1 player
  if (state.reviveZones.some((z) => z.deadPlayerId === deadPlayerId)) return;

  state.reviveZones.push({
    deadPlayerId,
    x,
    y,
    radius: 80,
    progress: 0, // 0..100
    reviverId: null,
  });
}

/**
 * Tạo revive zone cho BẢN THÂN khi local player chết trong MP
 */
export function spawnLocalReviveZone(x, y) {
  if (!state.reviveZones) state.reviveZones = [];
  const myId = mpState.playerId;
  if (state.reviveZones.some((z) => z.deadPlayerId === myId)) return;

  state.reviveZones.push({
    deadPlayerId: myId,
    x,
    y,
    radius: 80,
    progress: 0,
    reviverId: null,
    isLocalPlayer: true,
  });
}

/** Khi bản thân được revive (nhận từ server) */
export function onLocalPlayerRevived() {
  const myId = mpState.playerId;
  state.reviveZones = state.reviveZones.filter((z) => z.deadPlayerId !== myId);
  state.player.isDead = false;
  state.player.hp = Math.ceil(state.player.maxHp / 2);
  state.player.gracePeriod = 120;

  import("../ui.js").then(({ updateHealthUI }) => updateHealthUI());
}

// ==============================
// GAME START AND END HELPERS
// ==============================

/** Notify all players to start the game. */
export function notifyGameStart(socket) {
  socket.emit("startGame");
}

/** Notify all players that the game has ended. */
export function notifyGameEnd(socket) {
  socket.emit("endGame");
}
