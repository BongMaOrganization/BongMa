import { state } from "../state.js";
import { FPS, GHOST_DATA_KEY, UPGRADES, BOSS_REWARDS } from "../config.js";
import { saveGame } from "../utils.js";
import { UI, updateHealthUI, updateXPUI, generateCards } from "../ui.js";
import { generateDummy } from "../entities.js";
import {
  applyCharacterToPlayer,
  ensureCharacterData,
} from "../characters/manager.js";
import { syncRemoteState, persistState } from "../auth.js";
import { initSkills } from "./skills.js";

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

    if (saved.player) {
      state.player = saved.player;
      state.player = applyCharacterToPlayer(state.selectedCharacter);
      state.player.coins = saved.player.coins || 0;
      state.player.shield = saved.player.shield || state.player.shield;
    } else {
      state.player = applyCharacterToPlayer(state.selectedCharacter);
    }
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
    let bossStep = Math.floor(state.currentLevel / 5) - 1;
    let bossModes = [];
    if (bossStep < 5) bossModes = [bossStep];
    else bossModes = [(bossStep - 5) % 5, (bossStep - 4) % 5];

    state.boss = {
      x: 400,
      y: 150,
      radius: 40,
      hp: 150 + state.currentLevel * 25,
      maxHp: 150 + state.currentLevel * 25,
      attackTimer: 0,
      attackModes: bossModes,
      summonCooldown: 5 * FPS,
      ghostsActive: false,
    };
    UI.bossUi.style.display = "block";
    UI.bossName.innerText = `BOSS MÀN ${state.currentLevel}`;
    UI.bossHp.style.width = "100%";
    state.ghosts = [];
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
    if (state.loopId) cancelAnimationFrame(state.loopId);
    if (gameLoopFn) gameLoopFn();
  } else if (newGameState === "MENU" || newGameState === "GAME_OVER") {
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
      UI.btnStart.onclick = () => startGame(gameLoopFn);
    }
  } else if (newGameState === "UPGRADE") {
    UI.upgrade.classList.remove("hidden");
    generateCards(
      UPGRADES,
      document.getElementById("upgrade-cards"),
      false,
      () => onCardSelected(gameLoopFn),
    );
  } else if (newGameState === "BOSS_REWARD") {
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
  await syncRemoteState();
  initGame(false);
  changeState("PLAYING", gameLoopFn);
}

export function nextStage(gameLoopFn) {
  saveGame(state, GHOST_DATA_KEY);
  persistState();
  if (state.isBossLevel) {
    changeState("BOSS_REWARD", gameLoopFn);
  } else {
    initGame(true);
    changeState("PLAYING", gameLoopFn);
  }
}
