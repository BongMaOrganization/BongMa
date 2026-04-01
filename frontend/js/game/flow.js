import { state } from "../state.js";
import { FPS, GHOST_DATA_KEY, UPGRADES, BOSS_REWARDS, BOSS_FRAGMENTS, BOSS_FRAGMENT_DROP_RATE } from "../config.js";
import { saveGame } from "../utils.js";
import { UI, updateHealthUI, updateXPUI, generateCards } from "../ui.js";
import { generateDummy } from "../entities.js";
import {
  applyCharacterToPlayer,
  ensureCharacterData,
} from "../characters/manager.js";
import { syncRemoteState, persistState } from "../auth.js";
import { initSkills } from "./skills.js";
import { playBGM, stopAllBGM, playSound } from "./audio.js";
import { BOSS_TYPES } from "../entities.js";
import { createBoss } from "../entities.js";

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
    state.resources = saved.resources || state.resources || { common: 0, rare: 0, legendary: 0 };
    state.bossFragments = saved.bossFragments || state.bossFragments || [];

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

  initSkills();

  if (state.player.experience == null) state.player.experience = 0;
  if (state.player.experienceToLevel == null)
    state.player.experienceToLevel = 100;

  state.isBossLevel = state.currentLevel % 5 === 0;

  if (!isNextLevel) {
    state.player.x = 400;
    state.player.y = 500;
  }

  state.player.gracePeriod = 120;
  state.player.dashTimeLeft = 0;

  state.bullets = [];
  state.currentRunRecord = [];
  state.frameCount = 0;
  state.scoreTime = 0;
  state.boss = null;
  UI.bossUi.style.display = "none";

  let targetSurviveSeconds = Math.min(60, 15 + (state.currentLevel - 1) * 5);
  state.maxFramesToSurvive = state.isBossLevel
    ? 999999
    : targetSurviveSeconds * FPS;

  state.ghosts = [];
  let ghostLimit = Math.min(state.currentLevel, 10);
  let runsToUse = state.pastRuns.slice(-ghostLimit);

  if (!state.isBossLevel) {
    runsToUse.push(generateDummy(state.maxFramesToSurvive));
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

  if (state.isBossLevel) {
    state.maxFramesToSurvive = 999999;

    // Debug: Force a specific boss for testing
    const debugBossType = "fireBoss"; // Change this to the boss you want to test

    // Select boss type based on level or debug option
    const bossTypes = Object.keys(BOSS_TYPES);
    const bossIndex = debugBossType
      ? bossTypes.indexOf(debugBossType)
      : (Math.floor(state.currentLevel / 5) - 1) % bossTypes.length;
    const selectedBossType = bossTypes[bossIndex];

    state.boss = createBoss(selectedBossType);

    UI.bossUi.style.display = "block";
    UI.bossName.innerText = state.boss.name;
    UI.bossHp.style.width = "100%";
    state.ghosts = [];
  }
  if (state.isBossLevel && state.boss) {
    if (!state.boss.ghostsActive) {
      if (state.boss.summonCooldown > 0) {
        state.boss.summonCooldown--;
      } else {
        bossSummonGhosts();
        state.boss.ghostsActive = true;
      }
    } else {
      if (state.ghosts.length === 0) {
        state.boss.ghostsActive = false;
        state.boss.summonCooldown = 10 * FPS; // Reset cooldown
      }
    }
  }
  updateHealthUI();
  updateXPUI();
  UI.timer.innerText = state.isBossLevel ? "BOSS" : "00:00";
  UI.level.innerText = `Màn: ${state.currentLevel}`;
  UI.ghosts.innerText = `Quái: ${state.ghosts.length}`;
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

export function nextStage(gameLoopFn) {
  saveGame(state, GHOST_DATA_KEY);
  persistState();
  if (state.isBossLevel) {
    // 10% chance to drop a boss fragment
    tryBossFragmentDrop();
    changeState("BOSS_REWARD", gameLoopFn);
  } else {
    initGame(true);
    changeState("PLAYING", gameLoopFn);
  }
}

function tryBossFragmentDrop() {
  if (Math.random() >= BOSS_FRAGMENT_DROP_RATE) return;

  // Find fragments the player doesn't own yet
  const owned = state.bossFragments || [];
  const missing = BOSS_FRAGMENTS.filter(f => !owned.includes(f.id));

  if (missing.length === 0) return; // Already has all 5

  // Pick a random missing fragment
  const drop = missing[Math.floor(Math.random() * missing.length)];
  state.bossFragments.push(drop.id);

  saveGame(state, GHOST_DATA_KEY);
  persistState();

  // Show drop notification
  showFragmentDrop(drop);
}

function showFragmentDrop(fragment) {
  const overlay = document.getElementById("fragment-drop-overlay");
  if (!overlay) return;

  const icon = document.getElementById("fragment-drop-icon");
  const name = document.getElementById("fragment-drop-name");
  const count = document.getElementById("fragment-drop-count");
  const closeBtn = document.getElementById("fragment-drop-close");

  icon.innerText = fragment.icon;
  name.innerText = fragment.name;
  count.innerText = `${state.bossFragments.length} / ${BOSS_FRAGMENTS.length} mảnh`;

  overlay.classList.remove("hidden");

  closeBtn.onclick = () => {
    overlay.classList.add("hidden");
  };
}
