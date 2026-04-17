/**
 * mpFlow.js — Game flow cho chế độ Multiplayer Co-op Boss Arena
 * Tương tự flow.js nhưng dành riêng cho MP
 */
import { state, resetGlitchState } from "../state.js";
import { GHOST_DATA_KEY, BOSS_ARENA_REWARDS, BOSS_FRAGMENTS, BOSS_FRAGMENT_DROP_RATE } from "../config.js";
import { mpState } from "./room.js";
import { getSocket } from "./socket.js";
import {
  setupGameListeners,
  startPlayerSync,
  startBossSync,
  stopAllSync,
  spawnLocalReviveZone,
  onLocalPlayerRevived,
  updateReviveZones,
} from "./sync.js";
import { createBoss } from "../entities/bosses/boss_manager.js";
import { applyCharacterToPlayer, ensureCharacterData } from "../characters/manager.js";
import { initSkills } from "../game/skills.js";
import { UI, updateHealthUI, updateXPUI } from "../ui.js";
import { playBGM, playSound } from "../game/audio.js";
import { saveGame } from "../utils.js";
import { persistState } from "../auth.js";
import { handleBossArenaReward } from "../game/flow.js";

// ==============================
// KHỞI TẠO GAME MULTIPLAYER
// ==============================

/**
 * Gọi khi nhận được "game_start" từ server
 * @param {string} bossType - boss key (vd: "fire", "ice")
 * @param {number} hpScale  - boss HP multiplier
 * @param {Array}  players  - danh sách players trong phòng
 * @param {Function} changeStateFn
 * @param {Function} gameLoopFn
 */
export function startMultiplayerBossArena(bossType, hpScale, players, changeStateFn, gameLoopFn) {
  const socket = getSocket();
  if (!socket) return;

  // Lưu vào state game
  state.isMultiplayer = true;
  state.isHost = mpState.isHost;
  state.mpRoomCode = mpState.roomCode;
  state.mpPlayerCount = players.length;
  state._mpBossKilledSent = false;

  // Khởi tạo nhân vật người chơi
  ensureCharacterData();
  const saved = JSON.parse(localStorage.getItem(GHOST_DATA_KEY) || "{}");
  state.player = applyCharacterToPlayer(state.selectedCharacter);
  if (saved.player) {
    state.player.coins = saved.player.coins || 0;
    state.player.shield = saved.player.shield || state.player.shield;
  }
  state.player.isDead = false;
  state.player.x = 400 + Math.random() * 200;
  state.player.y = 400 + Math.random() * 200;
  state.player.gracePeriod = 120;
  state.player.dashTimeLeft = 0;

  // Upgrades
  state.upgrades = {
    spd: 0, fire: 0, multi: state.player.multiShot || 1,
    bounce: state.player.bounces || 0, dash: 0, regen: 0, hp_up: 0, shield_up: 0,
  };
  state.evolutions = {
    spd: false, fire: false, multi: false, bounce: false,
    dash: false, regen: false, hp_up: false, shield_up: false,
  };
  state.evolutionReady = null;
  state.rerollCount = 0;

  if (state.player.experience == null) state.player.experience = 0;
  if (state.player.experienceToLevel == null) state.player.experienceToLevel = 100;

  // Reset state
  state.bullets = [];
  state.ghosts = [];
  state.crates = [];
  state.capturePoints = [];
  state.swarmZones = [];
  state.puzzleZone = null;
  state.stagePortal = null;
  state.reviveZones = [];
  state.maxFramesToSurvive = 999999;
  state.frameCount = 0;
  state.scoreTime = 0;
  state.bossArenaMode = true;
  state.bossArenaType = bossType;
  state.isBossLevel = true;
  resetGlitchState();

  // Khởi tạo remote players
  state.remotePlayers = players
    .filter((p) => p.id !== mpState.playerId)
    .map((p) => ({
      id: p.id,
      username: p.username,
      characterId: p.characterId,
      isHost: p.isHost,
      x: 600 + Math.random() * 200,
      y: 400 + Math.random() * 200,
      hp: 5,
      maxHp: 5,
      isDead: false,
      wasDeadLastFrame: false,
    }));

  initSkills();

  // Tạo Boss (chỉ Host chạy logic, nhưng mọi người đều tạo object để render)
  const boss = createBoss(bossType);
  if (boss) {
    boss.hp = Math.round(boss.hp * hpScale);
    boss.maxHp = boss.hp;
    state.boss = boss;
    state.currentBossType = bossType;
  }

  // UI
  UI.bossUi.style.display = "block";
  UI.bossName.innerText = state.boss?.name || bossType;
  UI.bossHp.style.width = "100%";
  if (UI.bossHpTrail) UI.bossHpTrail.style.width = "100%";
  if (UI.bossHpMarkers) UI.bossHpMarkers.innerHTML = "";
  UI.timer.innerText = "🌐 BOSS ARENA MP";

  updateHealthUI();
  updateXPUI();

  // Map theme
  import("../game/mapTheme.js").then((m) => m.initMapTheme());

  // Screen shake khi vào
  state.screenShake = { x: 0, y: 0, timer: 45, intensity: 18 };

  // Setup socket listeners
  setupGameListeners(socket);

  // Bắt đầu sync
  startPlayerSync(mpState.roomCode);
  if (mpState.isHost) {
    startBossSync(mpState.roomCode);
  }

  // Luxa nghe sự kiện hồi sinh bản thân
  socket.on("remote_player_revived", ({ deadPlayerId }) => {
    if (deadPlayerId === mpState.playerId) {
      onLocalPlayerRevived();
    }
  });

  playSound("start");
  playBGM("BOSS_" + 1);

  changeStateFn("PLAYING");
  if (gameLoopFn) gameLoopFn();
}

// ==============================
// CẬP NHẬT MỖI FRAME (gọi từ update.js)
// ==============================

export function updateMultiplayer(changeStateFn) {
  if (!state.isMultiplayer) return;

  // Cập nhật revive zones
  updateReviveZones(state.mpRoomCode);

  // Kiểm tra tất cả đã chết chưa
  checkAllPlayersDead(changeStateFn);
}

function checkAllPlayersDead(changeStateFn) {
  if (!state.player.isDead) return; // Bản thân chưa chết

  // Kiểm tra xem còn ai sống không
  const anyAlive = state.remotePlayers.some((p) => !p.isDead);
  if (!anyAlive && state.reviveZones.length === 0) {
    // Tất cả đã chết hoặc zone đã hết → Game Over
    stopAllSync();
    state.isMultiplayer = false;
    changeStateFn("GAME_OVER");
  }
}

// ==============================
// KHI LOCAL PLAYER CHẾT TRONG MP
// ==============================

/**
 * Gọi thay cho changeState("GAME_OVER") khi HP <= 0 trong MP
 */
export function onMultiplayerPlayerDead() {
  state.player.isDead = true;
  state.player.hp = 0;
  state.player.gracePeriod = 9999; // Không nhận thêm damage

  // Tạo revive zone tại vị trí mình chết
  spawnLocalReviveZone(state.player.x, state.player.y);

  // Thông báo floating text
  if (!state.floatingTexts) state.floatingTexts = [];
  state.floatingTexts.push({
    x: state.player.x,
    y: state.player.y - 60,
    text: "⚠ ĐÃ HY SINH — Chờ hồi sinh!",
    color: "#ff4444",
    life: 240,
    opacity: 1,
    size: 18,
  });

  updateHealthUI();
}

// ==============================
// KHI BOSS CHẾT (chỉ HOST trigger lần đầu)
// ==============================

export function handleMultiplayerBossKill(gameLoopFn) {
  stopAllSync();
  // Mỗi người nhận full reward (giống single player boss arena)
  handleBossArenaReward(gameLoopFn);
}

// ==============================
// UTILITY
// ==============================

export function isLocalPlayerDeadInMP() {
  return state.isMultiplayer && state.player?.isDead === true;
}
