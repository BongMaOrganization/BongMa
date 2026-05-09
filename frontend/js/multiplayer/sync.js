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
import { getSocket } from "./socket.js";
import { UI } from "../ui.js";

let playerSyncInterval = null;
let bossSyncInterval = null;
let bulletSyncInterval = null;

// ==============================
// SETUP LISTENERS
// ==============================

/**
 * Khởi tạo tất cả socket event listener cho in-game.
 * Luôn gọi .off() trước để tránh stack listeners khi game restart.
 */
export function setupGameListeners(socket) {
  // Xóa listeners cũ trước để tránh stack khi game restart
  socket.off("remote_player_update");
  socket.off("boss_state_update");
  socket.off("apply_damage");
  socket.off("revive_progress");
  socket.off("remote_player_revived");
  socket.off("all_boss_killed");
  socket.off("host_left");
  socket.off("player_left");
  socket.off("remote_bullets");

  // Nhận vị trí/state remote players
  socket.on("remote_player_update", ({ id, x, y, hp, maxHp, isDead }) => {
    updatePlayerInRoom(id, { x, y, hp, maxHp, isDead });

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
    socket.on("boss_state_update", (data) => {
      if (!state.boss) return;
      const { 
        x, y, hp, maxHp, phase, bossSpecial, deathTimer, 
        bullets, beams, hazards, warnings, safeZones,
        entityPhase, ultimatePhase, cinematic, glitch, globalHazard 
      } = data;

      state.boss.x = x;
      state.boss.y = y;
      state.boss.hp = hp;
      state.boss.maxHp = maxHp;
      if (deathTimer !== undefined) state.boss.deathTimer = deathTimer;
      if (bossSpecial !== undefined) {
        state.bossSpecial = bossSpecial;
        state.boss.special = bossSpecial; // Gán cả 2 nơi cho chắc
      }
      if (phase !== undefined) state.boss.currentPhaseIndex = phase;
      
      // Sync Phase States
      state.boss.entityPhase = !!entityPhase;
      state.boss.ultimatePhase = !!ultimatePhase;

      // Sync Visual Elements
      if (bullets) {
        const playerBullets = state.bullets.filter(b => b.isPlayer);
        state.bullets = [...playerBullets, ...bullets.map(b => ({ ...b, isPlayer: false }))];
      }
      if (beams) state.bossBeams = beams;
      if (hazards) state.hazards = hazards;
      if (warnings) state.groundWarnings = warnings;
      if (safeZones) state.safeZones = safeZones;

      // Sync Global Effects
      if (cinematic) state.cinematicEffects = { ...state.cinematicEffects, ...cinematic };
      if (glitch) state.glitch = { ...state.glitch, ...glitch };
      if (globalHazard) state.globalHazard = globalHazard;

      // Cập nhật UI boss HP
      const pct = Math.max(0, (hp / maxHp) * 100);
      if (UI.bossHp) UI.bossHp.style.width = pct + "%";
      if (UI.bossHpTrail) UI.bossHpTrail.style.width = pct + "%";
    });
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

  // Nhận trạng thái revive
  socket.on("revive_progress", ({ deadPlayerId, progress, reviverId }) => {
    const zone = state.reviveZones.find((z) => z.deadPlayerId === deadPlayerId);
    if (zone) {
      zone.progress = progress;
      zone.reviverId = reviverId;
    }
  });

  // Người chết được hồi sinh
  socket.on("remote_player_revived", ({ deadPlayerId }) => {
    // Xóa revive zone
    state.reviveZones = state.reviveZones.filter((z) => z.deadPlayerId !== deadPlayerId);

    // Nếu là bản thân → hồi sinh local player
    if (deadPlayerId === mpState.playerId) {
      import("./mpFlow.js").then(({ onLocalPlayerRevived }) => onLocalPlayerRevived());
      return;
    }

    // Hồi sinh remote player
    const rp = state.remotePlayers.find((p) => p.id === deadPlayerId);
    if (rp) {
      rp.isDead = false;
      rp.hp = Math.ceil(rp.maxHp / 2);
      rp.wasDeadLastFrame = false;
    }
    updatePlayerInRoom(deadPlayerId, { isDead: false });
  });

  // Boss bị hạ — non-host nhận lệnh từ host
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

  // Player rời phòng giữa trận
  socket.on("player_left", ({ playerId }) => {
    state.remotePlayers = state.remotePlayers.filter((p) => p.id !== playerId);
    state.reviveZones = state.reviveZones.filter((z) => z.deadPlayerId !== playerId);
    if (state.remoteBullets) {
      state.remoteBullets = state.remoteBullets.filter((b) => b.ownerId !== playerId);
    }
  });

  // Nhận snapshot bullets từ remote players
  socket.on("remote_bullets", ({ ownerId, bullets }) => {
    if (!state.remoteBullets) state.remoteBullets = [];
    state.remoteBullets = state.remoteBullets.filter((b) => b.ownerId !== ownerId);
    const now = performance.now();
    for (const b of bullets) {
      state.remoteBullets.push({ ...b, ownerId, _born: now, isPlayer: true });
    }
  });
}

// ==============================
// SYNC INTERVALS
// ==============================

/** Host gửi boss state xuống cho các client (30 lần/giây) */
export function startBossSync(roomCode) {
  if (!mpState.isHost) return;

  if (bossSyncInterval) clearInterval(bossSyncInterval);
  bossSyncInterval = setInterval(() => {
    if (!state.boss) return;

    // 1. Thu thập đạn boss (enemy bullets)
    const bossBullets = state.bullets
      .filter(b => !b.isPlayer)
      .slice(0, 80) // Giảm xuống 80 để dành chỗ cho data khác
      .map(b => ({
        x: b.x, y: b.y, vx: b.vx, vy: b.vy,
        radius: b.radius, style: b.style, visualStyle: b.visualStyle,
        life: b.life, damage: b.damage
      }));

    // 2. Thu thập warnings/hazards/safezones
    const warnings = (state.groundWarnings || []).slice(0, 40);
    const hazards = (state.hazards || []).slice(0, 30);
    const safeZones = (state.safeZones || []).slice(0, 10);

    emitBossState(roomCode, {
      x: state.boss.x,
      y: state.boss.y,
      hp: state.boss.hp,
      maxHp: state.boss.maxHp,
      phase: state.boss.currentPhaseIndex || 0,
      bossSpecial: state.bossSpecial || state.boss.special || null,
      deathTimer: state.boss.deathTimer || 0,
      
      bullets: bossBullets,
      beams: state.bossBeams || [],
      warnings,
      hazards,
      safeZones,
      
      entityPhase: !!state.boss.entityPhase,
      ultimatePhase: !!state.boss.ultimatePhase,
      cinematic: state.cinematicEffects,
      glitch: state.glitch,
      globalHazard: state.globalHazard
    });

    // Kiểm tra boss chết → broadcast
    if (state.boss.hp <= 0 && !state._mpBossKilledSent) {
      state._mpBossKilledSent = true;
      emitBossKilled(roomCode);
    }
  }, 1000 / 30);
}

/** Đồng bộ trạng thái Local Player (30 lần/giây) */
export function startPlayerSync(roomCode) {
  if (playerSyncInterval) clearInterval(playerSyncInterval);

  playerSyncInterval = setInterval(() => {
    if (!state.player) return;
    emitPlayerUpdate(roomCode, {
      x: state.player.x,
      y: state.player.y,
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      isDead: state.player.isDead || false,
    });
  }, 1000 / 30);
}

/** Gửi snapshot bullets của local player (60ms/lần) */
export function startBulletSync(roomCode) {
  if (bulletSyncInterval) clearInterval(bulletSyncInterval);
  bulletSyncInterval = setInterval(() => {
    const socket = getSocket();
    if (!socket || !state.bullets) return;
    const playerBullets = state.bullets
      .filter((b) => b.isPlayer)
      .slice(0, 30)
      .map((b) => ({
        x: b.x, y: b.y,
        vx: b.vx, vy: b.vy,
        radius: b.radius || 5,
        style: b.visualStyle || b.style || 0,
        visualStyle: b.visualStyle || null,
        life: b.life,
      }));
    socket.emit("player_bullets", { roomCode, bullets: playerBullets });
  }, 60);
}

export function stopAllSync() {
  if (playerSyncInterval) { clearInterval(playerSyncInterval); playerSyncInterval = null; }
  if (bossSyncInterval)   { clearInterval(bossSyncInterval);   bossSyncInterval   = null; }
  if (bulletSyncInterval) { clearInterval(bulletSyncInterval); bulletSyncInterval = null; }
  state.remoteBullets = [];
}

// ==============================
// PLAYER ACTIONS & REVIVE
// ==============================

/** Non-host gửi damage lên host */
export function sendDamageToHost(roomCode, damage) {
  emitPlayerDamage(roomCode, damage);
}

/** Cập nhật revive zones mỗi frame (gọi từ game loop) */
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

/** Tạo revive zone khi remote player chết */
function spawnReviveZone(deadPlayerId, x, y) {
  if (!state.reviveZones) state.reviveZones = [];
  if (state.reviveZones.some((z) => z.deadPlayerId === deadPlayerId)) return;

  state.reviveZones.push({
    deadPlayerId,
    x,
    y,
    radius: 80,
    progress: 0,
    reviverId: null,
  });
}

/** Tạo revive zone cho BẢN THÂN khi local player chết trong MP */
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
  UI.updateHealthUI?.();
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
