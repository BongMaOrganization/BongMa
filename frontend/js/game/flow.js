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
    state.maps = saved.maps || state.maps;
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
      spd: 0,
      fire: 0,
      multi: state.player.multiShot || 1, // 1 tia đạn = 1/5, Phù thủy 3 tia = 3/5
      bounce: state.player.bounces || 0, // Pháo đài 1 nảy = 1/5
      dash: 0,
      regen: 0,
      hp_up: 0,
      shield_up: 0,
    };

    state.evolutions = {
      spd: false,
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

  if (!isNextLevel) {
    state.player.x = 400;
    state.player.y = 500;
  }

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

  // --- INITIALIZE SWARM ZONES ---
  const shouldRegenZones =
    state.swarmZones.length === 0 ||
    state.swarmZones.every((sz) => sz.isCompleted);

  if (shouldRegenZones) {
    state.swarmZones = [];
    if (!state.isBossLevel && !state.bossArenaMode) {
      // Mỗi đợt rải đúng 3 khu vực bầy đàn, đảm bảo không chồng lấn
      const numZones = 3;
      for (let i = 0; i < numZones; i++) {
        let x, y, overlap;
        let attempts = 0;
        const radius = 400;

        do {
          overlap = false;
          x = 400 + Math.random() * (state.world.width - 1000);
          y = 400 + Math.random() * (state.world.height - 1000);

          // Kiểm tra khoảng cách với các vùng đã có
          for (const existing of state.swarmZones) {
            if (dist(x, y, existing.x, existing.y) < radius * 2) {
              overlap = true;
              break;
            }
          }
          attempts++;
        } while (overlap && attempts < 50);

        state.swarmZones.push({
          id: `swarm_${state.currentLevel}_${i}_${Date.now()}`,
          x: x,
          y: y,
          radius: radius,
          requiredKills: 15 + state.currentLevel * 5,
          currentKills: 0,
          isCompleted: false,
          active: false,
          spawnedLocalGhosts: false,
        });
      }
    }
  }

  // --- INITIALIZE ITEM CRATES ---
  if (!state.isBossLevel && !state.bossArenaMode) {
    state.crates = [];
    for (let i = 0; i < 10; i++) {
      spawnCrate();
    }
    // Luôn sinh đúng 2 điểm chiếm đóng (specialZone) mỗi màn
    state.capturePoints = [];
    for (let i = 0; i < 2; i++) {
      spawnCapturePoint();
    }
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
  }
}

export function changeState(newGameState, gameLoopFn) {
  let oldState = state.gameState;
  state.gameState = newGameState;

  UI.main.classList.add("hidden");
  UI.upgrade.classList.add("hidden");
  UI.bossReward.classList.add("hidden");

  if (newGameState === "PLAYING") {
    if (state.isBossLevel) {
      playBGM(`BOSS_${state.currentLevel}`);
    } else {
      playBGM("PLAYING");
    }

    if (state.loopId) cancelAnimationFrame(state.loopId);
    if (gameLoopFn) gameLoopFn();
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
  initGame(false);
  changeState("PLAYING", gameLoopFn);
}

export function startBossFight() {
  let selectedBossType;

  // 🎯 Boss Arena
  if (state.bossArenaMode) {
    selectedBossType = state.bossArenaType;
  }

  // 🎮 Map thường
  else {
    selectedBossType = state.pendingBossType || "fire";
  }

  state.boss = createBoss(selectedBossType);
  state.currentBossType = selectedBossType;
  state.isBossLevel = true;
  state.stagePortal = null;
  state.ghosts = [];
  state.bullets = [];

  UI.bossUi.style.display = "block";
  UI.bossName.innerText = state.boss.name;
  UI.bossHp.style.width = "100%";
  if (UI.bossHpTrail) UI.bossHpTrail.style.width = "100%";
  if (UI.bossHpMarkers) UI.bossHpMarkers.innerHTML = "";

  state.screenShake = { x: 0, y: 0, timer: 45, intensity: 18 };

  if (!state.floatingTexts) state.floatingTexts = [];
  state.floatingTexts.push({
    x: state.player.x,
    y: state.player.y - 120,
    text: `⚠ ${state.boss.name} XUẤT HIỆN! ⚠`,
    color: "#ff3300",
    life: 200,
    opacity: 1,
  });

  playBGM(`BOSS_${state.currentLevel}`);
}

export function nextStage(gameLoopFn) {
  saveGame(state, GHOST_DATA_KEY);
  persistState();
  if (state.isBossLevel) {
    checkOmniBossUnlock();
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
export async function openBossArena(changeStateFn, gameLoopFn) {
  const overlay = document.getElementById("screen-boss-arena");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  document.getElementById("screen-main").classList.add("hidden");

  const container = document.getElementById("boss-arena-cards");
  container.innerHTML = "";

  const { BOSS_TYPES } = await import("../entities/bosses/boss_manager.js");
  const bossKeys = Object.keys(BOSS_TYPES);

  bossKeys.forEach((key) => {
    const cfg = BOSS_TYPES[key];
    const frag = BOSS_FRAGMENTS.find((f) => f.bossType === key);
    const reward = BOSS_ARENA_REWARDS[key] || { coins: 100, rareTicket: 0.1 };
    const owned = (state.bossFragments || []).includes(frag?.id);

    const card = document.createElement("div");
    card.className = "premium-card boss-arena-card";
    card.style.setProperty("--theme-color", cfg.color);
    card.innerHTML = `
      <div class="premium-card-icon" style="color:${cfg.color};text-shadow:0 0 15px ${cfg.color}">${cfg.icon || "👹"}</div>
      <div class="premium-card-title">${cfg.name}</div>
      <div class="premium-card-subtitle">${cfg.phaseCount || 2} Phase | HP: ${cfg.hp}</div>
      <div class="premium-card-drop">${frag ? `${frag.icon} ${frag.name} ${owned ? "✅" : "❌"}` : ""}</div>
      <div class="premium-card-reward">💰 ${reward.coins} | 🎟️ ${Math.round(reward.rareTicket * 100)}%</div>
    `;

    card.onclick = () => {
      overlay.classList.add("hidden");
      UI.main.classList.add("hidden"); // Ensure main menu is gone
      startBossArenaFight(key, changeStateFn, gameLoopFn);
    };

    container.appendChild(card);
  });
}

export function startBossArenaFight(bossType, changeStateFn, gameLoopFn) {
  state.bossArenaMode = true;
  state.bossArenaType = bossType;
  initGame(false);

  // Override to boss level — xoá sạch thực thể map thường do initGame sinh ra
  state.isBossLevel = true;
  state.swarmZones = [];
  state.crates = [];
  state.capturePoints = [];
  state.maxFramesToSurvive = 999999;
  state.currentBossType = bossType;
  state.boss = createBoss(bossType);
  state.ghosts = [];

  // ✅ THÊM DÒNG NÀY: Ép tải lại bối cảnh theo đúng con Boss vừa tạo
  import("../game/mapTheme.js").then((m) => m.initMapTheme());

  UI.bossUi.style.display = "block";
  UI.bossName.innerText = state.boss.name;
  UI.bossHp.style.width = "100%";
  if (UI.bossHpTrail) UI.bossHpTrail.style.width = "100%";
  if (UI.bossHpMarkers) UI.bossHpMarkers.innerHTML = "";
  UI.timer.innerText = "BOSS ARENA";

  changeState("PLAYING", gameLoopFn);
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

  document.getElementById("btn-arena-victory-back").onclick = () => {
    document.getElementById("screen-arena-victory").classList.add("hidden");
    state.bossArenaMode = false;
    state.bossArenaType = null;
    saveGame(state, GHOST_DATA_KEY);
    persistState();
    window.location.reload();
  };
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
