import { state, resetGlitchState } from "../state.js";
import {
  FPS,
  GHOST_DATA_KEY,
  UPGRADES,
  BOSS_REWARDS,
  BOSS_FRAGMENTS,
  BOSS_FRAGMENT_DROP_RATE,
  BOSS_ARENA_REWARDS,
} from "../config.js";
import { initPuzzle } from "../game/puzzle_manager.js";
import { initMapTheme } from "../game/mapTheme.js";
import { applyMapEnemyModifier } from "../game/mapMechanics.js";
import { saveGame, dist } from "../utils.js";
import { UI, updateHealthUI, updateXPUI, generateCards } from "../ui.js";
import { generateDummy } from "../entities.js";
import {
  applyCharacterToPlayer,
  ensureCharacterData,
} from "../characters/manager.js";
import { persistState } from "../auth.js";
import { initSkills } from "./skills.js";
import { playBGM, stopAllBGM, playSound } from "./audio.js";
import { spawnCrate, spawnCapturePoint } from "../world/element.js";
import { createBoss, BOSS_TYPES } from "../entities/bosses/boss_manager.js";
import { beginBossCutscene, getCutsceneData } from "../game/bossCutscene.js";
import {
  clearBossArenaVisual,
  getBossSpawnPosition,
  setupBossArenaVisual,
} from "../world/bossArenaVisual.js";
import {
  generateDungeon,
  clearDungeon,
  getStartSpawnPosition,
  getSafeSpawnPointInRoom,
  getBossGateRoom,
  getRoomCenter,
  getRoomBossArenaRadius,
  placeStageObjectives,
  unlockNextMap,
  unlockOmniMap,
  mergeMapProgress,
} from "../world/dungeonLayout.js";
export function initGame(isNextLevel = false) {
  let saved = JSON.parse(localStorage.getItem(GHOST_DATA_KEY) || "{}");

  ensureCharacterData();

  if (!isNextLevel) {
    state.currentLevel = saved.level || 1;
    state.pastRuns = saved.runs || [];
    state.ownedCharacters = saved.ownedCharacters || state.ownedCharacters;
    state.selectedCharacter =
      saved.selectedCharacter || state.selectedCharacter;
    state.characterUpgrades =
      saved.characterUpgrades || state.characterUpgrades;
    state.resources = saved.resources ||
      state.resources || { common: 0, rare: 0, legendary: 0 };
    state.bossFragments = saved.bossFragments || state.bossFragments || [];
    state.maps = mergeMapProgress(saved.maps || state.maps);
    state.selectedMap = saved.selectedMap || state.selectedMap;

    if (saved.player) {
      state.player = saved.player;
      state.player = applyCharacterToPlayer(state.selectedCharacter);
      state.player.coins = saved.player.coins || 0;
      state.player.shield = saved.player.shield || state.player.shield;
    } else {
      state.player = applyCharacterToPlayer(state.selectedCharacter);
    }

    // ĐỒNG BỘ CHỈ SỐ GỐC CỦA NHÂN VẬT VÀO THANH NÂNG CẤP KHI BẮT ĐẦU MÀN 1
    // Đã sửa: Gán thẳng số tia đạn và số lần nảy gốc của nhân vật vào mức nâng cấp ban đầu
    state.upgrades = {
      cdr: 0,
      fire: 0,
      multi: state.player.multiShot || 1, // 1 tia đạn = 1/5, Phù thủy 3 tia = 3/5
      bounce: state.player.bounces || 0, // Pháo đài 1 nảy = 1/5
      dash: 0,
      regen: 0,
      hp_up: 0,
      shield_up: 0,
    };

    state.evolutions = {
      cdr: false,
      fire: false,
      multi: false,
      bounce: false,
      dash: false,
      regen: false,
      hp_up: false,
      shield_up: false,
    };
    state.evolutionReady = null;
    state.rerollCount = 0;
  } else {
    state.currentLevel++;
    if (!state.isBossLevel && state.currentRunRecord.length > 120) {
      state.pastRuns.push(state.currentRunRecord);
    }
  }
  state.pendingBossType = state.selectedMap;
  initSkills();
  resetGlitchState();
  if (state.player.experience == null) state.player.experience = 0;
  if (state.player.experienceToLevel == null)
    state.player.experienceToLevel = 100;

  state.isBossLevel = false; // Boss được kích hoạt khi player bước vào cổng sau khi hoàn thành 3 điều kiện

  state.elementalEnemies = [];
  state.elementalZones = [];

  state.player.gracePeriod = 120;
  state.player.dashTimeLeft = 0;

  state.bullets = [];

  // Xoá các kĩ năng, projectile cũ để ko bị lưu qua màn mới
  resetSkillsState();

  state.currentRunRecord = [];
  state.frameCount = 0;
  state.scoreTime = 0;
  state.boss = null;
  UI.bossUi.style.display = "none";

  state.maxFramesToSurvive = 999999;

  state.ghosts = [];
  let ghostLimit = Math.min(state.currentLevel, 10);
  let runsToUse = state.pastRuns.slice(-ghostLimit);

  if (!state.isBossLevel) {
    runsToUse.push(generateDummy(60 * FPS));
  }

  let playbackRate =
    state.currentLevel <= 2
      ? 0.5
      : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);

  runsToUse.forEach((runData, idx) => {
    state.ghosts.push({
      record: runData,
      speedRate: playbackRate,
      timer: 0,
      lastIdx: -1,
      x: -100,
      y: -100,
      radius: 12,
      isStunned: 0,
      historyPath: [],
      isDummy: idx === runsToUse.length - 1 && !state.isBossLevel,
    });
  });

  // Boss không còn được khởi tạo tự động - sẽ spawn khi player bước vào cổng portal

  // --- INITIALIZE SWARM ZONES & DUNGEON LAYOUT ---
  if (!state.isBossLevel && !state.bossArenaMode) {
    generateDungeon(state.currentLevel);
    placeStageObjectives();
    const spawn = getStartSpawnPosition();
    state.player.x = spawn.x;
    state.player.y = spawn.y;
    const startRoom = state.dungeon?.rooms?.find(
      (r) => r.id === state.dungeon.startRoomId,
    );
    if (startRoom) {
      state.ghosts.forEach((g, idx) => {
        const pt = getSafeSpawnPointInRoom(startRoom, 140);
        if (!pt) return;
        g.x = pt.x + (idx % 3) * 36 - 36;
        g.y = pt.y + Math.floor(idx / 3) * 36 - 18;
        g.roomId = startRoom.id;
      });
    }
  } else {
    clearDungeon();
  }

  // --- INITIALIZE ITEM CRATES ---
  if (!state.isBossLevel && !state.bossArenaMode) {
    if (!state.dungeon) {
      state.crates = [];
      for (let i = 0; i < 10; i++) {
        spawnCrate();
      }
      state.capturePoints = [];
      for (let i = 0; i < 2; i++) {
        spawnCapturePoint();
      }
    }
    // placeStageObjectives() đã xử lý crates/capture khi có dungeon
    // ===== NEW PUZZLE SYSTEM =====
    state.puzzleZone = null; // giữ lại nếu code khác còn dùng (tạm thời)
    state.stagePortal = null;

    initPuzzle();
  } else {
    // Màn boss: xoá sạch mọi thực thể thuộc map thường
    state.crates = [];
    state.capturePoints = [];
    state.swarmZones = [];
    state.puzzleZone = null;
    state.stagePortal = null;
  }

  updateHealthUI();
  updateXPUI();
  UI.timer.innerText = state.isBossLevel ? "BOSS" : "DẸP SẠCH SWARM ZONE";
  UI.level.innerText = `Màn: ${state.currentLevel}`;
  UI.ghosts.innerText = `Quái: ${state.ghosts.length}`;
  if (!state.isBossLevel) {
    initMapTheme();
    // initMapTheme đã set currentMapTheme → giờ mới khoá hệ + chỉnh chỉ số quái
    state.ghosts.forEach((g) => applyMapEnemyModifier(g));
  }
}

export function changeState(newGameState, gameLoopFn) {
  let oldState = state.gameState;
  state.gameState = newGameState;

  UI.main.classList.add("hidden");
  UI.upgrade.classList.add("hidden");
  UI.bossReward.classList.add("hidden");

  if (state.loopId) cancelAnimationFrame(state.loopId);
  if (state.loopTimeoutId) clearTimeout(state.loopTimeoutId);
  state.loopId = null;
  state.loopTimeoutId = null;

  if (newGameState === "PLAYING") {
    if (state.isBossLevel) {
      playBGM(`BOSS_${state.currentLevel}`);
    } else {
      playBGM("PLAYING");
    }

    state.lastLoopTimestamp = 0;
    if (gameLoopFn) state.loopId = requestAnimationFrame(gameLoopFn);
  } else if (newGameState === "MENU" || newGameState === "GAME_OVER") {
    if (newGameState === "MENU") playBGM("MENU");
    if (newGameState === "GAME_OVER") {
      stopAllBGM();
      playSound("gameOver");
    }

    UI.main.classList.remove("hidden");
    UI.title.className =
      newGameState === "GAME_OVER"
        ? "title-main text-red"
        : "title-main text-cyan";
    UI.title.innerText =
      newGameState === "GAME_OVER" ? "VÒNG LẶP DỪNG LẠI" : "BÓNG MA";
    UI.desc.innerText =
      newGameState === "GAME_OVER"
        ? "Quá khứ đã bắt kịp bạn. Mất 1 Mạng."
        : "Sẵn sàng sinh tồn.";

    if (state.player && state.player.hp <= 0) {
      UI.desc.innerText = "BẠN ĐÃ CHẾT HOÀN TOÀN. BẮT ĐẦU LẠI TỪ MÀN 1.";
      UI.btnStart.innerText = "LÀM LẠI TỪ ĐẦU";

      state.currentLevel = 1;
      state.pastRuns = [];

      let savedCoins = state.player.coins || 0;
      state.player = applyCharacterToPlayer(state.selectedCharacter);
      state.player.coins = savedCoins;

      saveGame(state, GHOST_DATA_KEY);
      persistState();

      UI.btnStart.onclick = () => {
        initGame(false);
        changeState("PLAYING", gameLoopFn);
      };
    } else {
      UI.btnStart.innerText = "VÀO TRẬN";
      UI.btnStart.onclick = () => {
        startGame(gameLoopFn);
      };
    }
  } else if (newGameState === "UPGRADE") {
    playBGM("UPGRADE");
    UI.upgrade.classList.remove("hidden");
    generateCards(
      UPGRADES,
      document.getElementById("upgrade-cards"),
      false,
      () => onCardSelected(gameLoopFn),
    );
  } else if (newGameState === "BOSS_REWARD") {
    playBGM("BOSS_REWARD");
    UI.bossReward.classList.remove("hidden");
    generateCards(
      BOSS_REWARDS,
      document.getElementById("boss-cards"),
      true,
      () => onCardSelected(gameLoopFn),
    );
  }
}

export async function onCardSelected(gameLoopFn) {
  saveGame(state, GHOST_DATA_KEY);
  persistState();
  if (state.upgradeFromXP) {
    if (state.player.experience >= state.player.experienceToLevel) {
      state.player.experience -= state.player.experienceToLevel;
      state.player.experienceToLevel = Math.max(
        50,
        Math.floor(state.player.experienceToLevel * 1.15),
      );
      updateXPUI();
      changeState("UPGRADE", gameLoopFn);
      return;
    }

    state.upgradeFromXP = false;
    changeState("PLAYING", gameLoopFn);
    return;
  }
  initGame(true);
  changeState("PLAYING", gameLoopFn);
}

export async function startGame(gameLoopFn) {
  saveGame(state, GHOST_DATA_KEY);
  persistState();
  initGame(false);
  changeState("PLAYING", gameLoopFn);
}

export function beginBossEncounter(bossType) {
  const type =
    bossType ||
    (state.bossArenaMode ? state.bossArenaType : null) ||
    state.pendingBossType ||
    state.selectedMap ||
    "fire";
  beginBossCutscene(type, () => activateBossFight(type));
}

export function activateBossFight(bossType) {
  let selectedBossType = bossType;

  if (!selectedBossType) {
    if (state.bossArenaMode) selectedBossType = state.bossArenaType;
    else selectedBossType = state.pendingBossType || "fire";
  }

  const bossRoom =
    state.dungeon && !state.bossArenaMode ? getBossGateRoom() : null;
  if (bossRoom) {
    const center = getRoomCenter(bossRoom);
    setupBossArenaVisual(selectedBossType, center.x, center.y, {
      roomId: bossRoom.id,
      maxRadius: getRoomBossArenaRadius(bossRoom, selectedBossType),
    });
    if (state.player) {
      state.player.x = center.x;
      state.player.y = center.y + 100;
    }
  }

  const spawn = getBossSpawnPosition();
  state.boss = createBoss(selectedBossType);
  if (state.boss) {
    state.boss.x = spawn.x;
    state.boss.y = spawn.y;
    state.boss.moveTargetX = state.player?.x ?? spawn.x;
    state.boss.moveTargetY = state.player?.y ?? spawn.y;
  }

  state.currentBossType = selectedBossType;
  state.isBossLevel = true;
  state.stagePortal = null;
  state.ghosts = [];
  state.bullets = [];
  state.elementalEnemies = [];
  state.elementalZones = [];

  UI.bossUi.style.display = "block";
  UI.bossName.innerText = state.boss.name;
  const bossIconEl = document.getElementById("boss-icon");
  if (bossIconEl) bossIconEl.textContent = state.boss.icon || "👹";
  UI.bossHp.style.width = "100%";
  if (UI.bossHpTrail) UI.bossHpTrail.style.width = "100%";
  if (UI.bossHpMarkers) UI.bossHpMarkers.innerHTML = "";

  state.screenShake = { x: 0, y: 0, timer: 45, intensity: 18 };

  if (!state.floatingTexts) state.floatingTexts = [];
  state.floatingTexts.push({
    x: state.player?.x || spawn.x,
    y: (state.player?.y || spawn.y) - 120,
    text: `⚔ ${state.boss.name} — CHIẾN!`,
    color: state.boss.color || "#ff3300",
    life: 200,
    opacity: 1,
  });

  playBGM(`BOSS_${state.currentLevel}`);
}

/** @deprecated — dùng beginBossEncounter() */
export function startBossFight() {
  beginBossEncounter();
}

export function nextStage(gameLoopFn) {
  saveGame(state, GHOST_DATA_KEY);
  persistState();
  if (state.isBossLevel) {
    checkOmniBossUnlock();
    if (!state.bossArenaMode) {
      const bossType = state.currentBossType || state.boss?.bossType || state.pendingBossType;
      const unlocked = unlockNextMap(bossType);
      if (unlocked) {
        state.floatingTexts.push({
          x: state.player?.x || state.world.width / 2,
          y: (state.player?.y || state.world.height / 2) - 100,
          text: `🗺️ MAP ${unlocked.toUpperCase()} ĐÃ MỞ KHÓA!`,
          color: "#ffd700",
          size: 28,
          life: 240,
          opacity: 1,
        });
      }
      if (bossType === "thunder" && unlockOmniMap()) {
        state.storyToast = {
          title: "🌌 Trung Tâm Trạm Không Gian",
          text:
            "Năm Bá Chủ đã gục ngã. Lõi Trạm rung chuyển — Chúa Tể Nguyên Tố, thực thể gốc trước khi bị chia thành năm miền, đang thức giấc. Map OMNI đã mở khóa.",
          timer: 420,
        };
        state.floatingTexts.push({
          x: state.player?.x || state.world.width / 2,
          y: (state.player?.y || state.world.height / 2) - 140,
          text: "🌌 MAP OMNI — TRUNG TÂM TRẠM ĐÃ MỞ!",
          color: "#ffd080",
          size: 26,
          life: 280,
          opacity: 1,
        });
      }
    }
    // 10% chance to drop a boss fragment
    tryBossFragmentDrop();
    changeState("BOSS_REWARD", gameLoopFn);
  } else {
    initGame(true);
    changeState("PLAYING", gameLoopFn);
  }
}

function tryBossFragmentDrop(isArenaMode = false) {
  let droppedFragment = null;
  if (Math.random() >= BOSS_FRAGMENT_DROP_RATE) return droppedFragment;

  // Determine which boss was killed to drop the correct fragment
  const bossType = state.currentBossType || state.boss?.bossType || state.bossArenaType;
  if (!bossType) return droppedFragment;

  if (bossType === "omni") {
    if (Math.random() < 0.2) {
      // 20% Tỉ lệ rớt cả 5 mảnh
      let gotNew = false;
      BOSS_FRAGMENTS.forEach((frag) => {
        if (!state.bossFragments.includes(frag.id)) {
          state.bossFragments.push(frag.id);
          gotNew = true;
        }
      });

      if (gotNew) {
        state.lastDroppedFragment = { icon: "🌟", name: "TRỌN BỘ 5 NGUYÊN TỐ" };
        droppedFragment = state.lastDroppedFragment;
        playSound("fragment");
        if (typeof UI !== "undefined" && UI.showFragmentToast) {
          UI.showFragmentToast(state.lastDroppedFragment);
        }
        saveGame(state, GHOST_DATA_KEY);
        persistState();
        if (!isArenaMode) showFragmentDrop(state.lastDroppedFragment);
      }
    }
    return droppedFragment; // Nếu xịt 20% thì về tay không
  }

  // Find the fragment that corresponds to this boss type
  const fragment = BOSS_FRAGMENTS.find((f) => f.bossType === bossType);
  if (!fragment) return droppedFragment;

  const owned = state.bossFragments || [];
  // Only drop if player doesn't already have this fragment
  if (owned.includes(fragment.id)) return droppedFragment;

  state.bossFragments.push(fragment.id);
  state.lastDroppedFragment = fragment;
  droppedFragment = fragment;
  playSound("fragment");

  // Also show a toast if possible
  if (typeof UI !== "undefined" && UI.showFragmentToast) {
    UI.showFragmentToast(fragment);
  }

  saveGame(state, GHOST_DATA_KEY);
  persistState();

  // Show drop notification
  if (!isArenaMode) showFragmentDrop(fragment);

  return droppedFragment;
}

function showFragmentDrop(fragment) {
  const overlay = document.getElementById("fragment-drop-overlay");
  if (!overlay) return;

  const icon = document.getElementById("fragment-drop-icon");
  const name = document.getElementById("fragment-drop-name");
  const count = document.getElementById("fragment-drop-count");
  const closeBtn = document.getElementById("fragment-drop-close");
  const descEl = overlay.querySelector('p[style*="color:#888"]');

  icon.innerText = fragment.icon;
  name.innerText = fragment.name;
  count.innerText = `${state.bossFragments.length} / ${BOSS_FRAGMENTS.length} mảnh`;
  if (descEl)
    descEl.innerText = "Thu thập 5 mảnh khác nhau để đổi 1 nhân vật MYTHICAL!";

  overlay.classList.remove("hidden");

  closeBtn.onclick = () => {
    overlay.classList.add("hidden");
  };
}

// ========== BOSS ARENA (Chọn boss để farm) ==========
export function openBossArena(changeStateFn, gameLoopFn) {
  const overlay = document.getElementById("screen-boss-arena");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  document.getElementById("screen-main").classList.add("hidden");

  const container = document.getElementById("boss-arena-cards");
  container.innerHTML = "";

  const ELEMENTAL_BOSSES = ["fire", "ice", "earth", "wind", "thunder", "omni"];
  const SPECIAL_BOSSES = ["void", "glitch"];

  function appendSection(title, keys) {
    const heading = document.createElement("div");
    heading.className = "boss-arena-section-title";
    heading.textContent = title;
    container.appendChild(heading);

    keys.forEach((key) => {
      if (!BOSS_TYPES[key]) return;
      const cfg = BOSS_TYPES[key];
      const cs = getCutsceneData(key);
      const frag = BOSS_FRAGMENTS.find((f) => f.bossType === key);
      const reward = BOSS_ARENA_REWARDS[key] || { coins: 100, rareTicket: 0.1 };
      const owned = (state.bossFragments || []).includes(frag?.id);

      const card = document.createElement("div");
      card.className = "premium-card boss-arena-card";
      card.style.setProperty("--theme-color", cfg.color);
      card.innerHTML = `
        <div class="premium-card-icon" style="color:${cfg.color};text-shadow:0 0 15px ${cfg.color}">${cfg.icon || "👹"}</div>
        <div class="premium-card-title">${cfg.name}</div>
        <div class="boss-arena-realm">${cs.arenaIntro}</div>
        <div class="premium-card-subtitle">${cfg.phaseCount || cfg.phases?.length || 3} Phase · HP ${cfg.hp}</div>
        <div class="boss-arena-flavor">${cs.lines[0] || ""}</div>
        <div class="premium-card-drop">${frag ? `${frag.icon} ${frag.name} ${owned ? "✅" : "❌"}` : ""}</div>
        <div class="premium-card-reward">💰 ${reward.coins} · 🎟️ ${Math.round(reward.rareTicket * 100)}%</div>
        <div class="boss-arena-fight-hint">▶ VÀO ĐẤU TRƯỜNG</div>
      `;

      card.onclick = () => {
        overlay.classList.add("hidden");
        UI.main.classList.add("hidden");
        startBossArenaFight(key, changeStateFn, gameLoopFn);
      };

      container.appendChild(card);
    });
  }

  appendSection("BÁ CHỦ NGUYÊN TỐ", ELEMENTAL_BOSSES);
  appendSection("THỰC THỂ ĐẶC BIỆT", SPECIAL_BOSSES);
}

export function startBossArenaFight(bossType, changeStateFn, gameLoopFn) {
  state.bossArenaMode = true;
  state.bossArenaType = bossType;
  initGame(false);

  state.isBossLevel = false;
  state.boss = null;
  state.swarmZones = [];
  state.crates = [];
  state.capturePoints = [];
  state.maxFramesToSurvive = 999999;
  state.currentBossType = bossType;

  import("../game/mapTheme.js").then((m) => m.initMapTheme());

  UI.bossUi.style.display = "none";
  UI.timer.innerText = "BOSS ARENA";

  changeState("PLAYING", gameLoopFn);
  beginBossCutscene(bossType, () => activateBossFight(bossType));
}

export function handleBossArenaReward(gameLoopFn) {
  const bossType = state.bossArenaType;
  const reward = BOSS_ARENA_REWARDS[bossType] || {
    coins: 100,
    rareTicket: 0.1,
  };

  // Give coins
  state.player.coins = (state.player.coins || 0) + reward.coins;

  let gotTicket = false;
  // Chance for rare ticket
  if (Math.random() < reward.rareTicket) {
    state.resources = state.resources || { common: 0, rare: 0, legendary: 0 };
    state.resources.common = (state.resources.common || 0) + 5;
    gotTicket = true;
  }

  checkOmniBossUnlock(); // <--- THÊM DÒNG NÀY VÀO ĐÂY
  const droppedFragment = tryBossFragmentDrop(true);

  // Cập nhật UI Thưởng
  document.getElementById("arena-coins-reward").innerText =
    `💰 +${reward.coins} Tiền`;
  document.getElementById("arena-rare-reward").innerText = gotTicket
    ? `🎫 +5 Nguyên liệu (Common)`
    : "";

  // Show Fragment Info...
  const fragInfo = document.getElementById("arena-fragment-reward") || {
    innerText: "",
  };
  if (droppedFragment) {
    fragInfo.innerText = `✨ NHẬN ĐƯỢC: ${droppedFragment.icon} ${droppedFragment.name}`;
    fragInfo.style.color = "#00ffff";
  } else {
    fragInfo.innerText = "";
  }

  document.getElementById("screen-arena-victory").classList.remove("hidden");
  state.gameState = "MENU";

  const victoryBackBtn = document.getElementById("btn-arena-victory-back");
  if (state.isMultiplayer) {
    // MP: quay về PHÒNG CHỜ (không reload kẻo văng khỏi phòng/mất kết nối).
    victoryBackBtn.textContent = "🏠 Về Phòng Chờ";
    victoryBackBtn.onclick = () => {
      document.getElementById("screen-arena-victory").classList.add("hidden");
      state.bossArenaMode = false;
      state.bossArenaType = null;
      saveGame(state, GHOST_DATA_KEY);
      persistState();
      window.dispatchEvent(new Event("mp:returnLobby"));
    };
  } else {
    victoryBackBtn.textContent = "Về Menu Chính";
    victoryBackBtn.onclick = () => {
      document.getElementById("screen-arena-victory").classList.add("hidden");
      state.bossArenaMode = false;
      state.bossArenaType = null;
      saveGame(state, GHOST_DATA_KEY);
      persistState();
      window.location.reload();
    };
  }
}

/**
 * Reset sạch sẽ toàn bộ trạng thái kĩ năng của tất cả nhân vật
 */
export function resetSkillsState() {
  state.activeBuffs = { q: 0, e: 0, r: 0 };
  state.delayedTasks = []; // Xoá bỏ sạch các setTimeout cũ đã chuyển đổi

  state.particles = [];

  state.phoenixTrails = [];
  state.phoenixEfx = null;
  state.phoenixReviveReady = false;
  state.necroMinions = [];
  state.necroZone = null;
  state.necroExplosions = [];
  state.voidBlackholes = [];
  state.voidLaser = null;
  state.stormTraps = [];
  state.stormLightnings = [];
  state.explosions = [];
  state.druidOrbs = [];
  state.phantoms = [];
  state.painterTrails = [];
  state.painterZones = [];
  state.painterBomb = null;
  state.painterExplosions = [];
  state.hunterTraps = [];
  state.engineerTurrets = [];
  state.gunnerMines = [];
  state.gunnerAirstrikes = [];
  state.gunnerLaser = null;
  state.reaperSlash = null;
  state.destroyerRifts = [];
  state.destroyerUlt = null;
  state.creatorTurrets = [];
  state.creatorHolyZone = null;
  state.creatorOrbs = [];
  state.knightCharge = null;
  state.playerStatus.stunTimer = 0;
  state.playerStatus.slowTimer = 0;
  state.playerStatus.burnTimer = 0;

  // Clear boss cinamatics & hazards
  state.hazards = [];
  state.bossBeams = [];
  state.groundWarnings = [];
  state.safeZones = [];
  state.globalHazard = { type: null, active: false, timer: 0, damage: 0 };

  state.screenShake = { timer: 0, intensity: 0, type: "earth" };

  state.bossSpecial = { name: "", timer: 0, duration: 0, type: "", color: "" };

  state.cinematicEffects = {
    fogAlpha: 0,
    distortion: 0,
    vortexPower: 0,
    vortexCenter: { x: 400, y: 300 },
    freezeTimer: 0,
    fieldBurn: 0,
  };
  state.bossCutscene = null;
  clearBossArenaVisual();
  state.windForce = { x: 0, y: 0, timer: 0 };
  resetGlitchState();
  // Cập nhật lại UI kĩ năng (CD và Border)
  import("./skills.js").then((m) => m.updateSkillsUI());
}

function checkOmniBossUnlock() {
  const bossType =
    state.currentBossType || state.boss?.bossType || state.bossArenaType;

  // Nếu Boss vừa hạ là Omni
  if (bossType === "omni") {
    if (!state.ownedCharacters) state.ownedCharacters = ["speedster"];

    // Nếu chưa sở hữu Elementalist thì mở khóa
    if (!state.ownedCharacters.includes("elementalist")) {
      state.ownedCharacters.push("elementalist");

      saveGame(state, GHOST_DATA_KEY);
      persistState();

      // Hiển thị thông báo (Sử dụng setTimeout để tránh bị đè UI)
      setTimeout(() => {
        alert(
          "👑 CHÚC MỪNG! Bạn đã hạ gục Chúa Tể Nguyên Tố và mở khóa nhân vật độc quyền: NGUYÊN TỐ SƯ! 👑",
        );
      }, 500);
    }
  }
}
