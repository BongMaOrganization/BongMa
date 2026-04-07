import { state } from "./state.js";
import { FPS } from "./config.js";

// File này giờ chỉ giữ lại logic cốt lõi của Player và Ghost Record
export function getInitialPlayerState() {
  return {
    x: state.world ? state.world.width / 2 : 1500,
    y: state.world ? state.world.height / 2 : 1500,
    radius: 12, speed: 4.5, color: "#00ffcc", hp: 10, maxHp: 10, coins: 0,
    dashTimeLeft: 0, dashCooldownTimer: 0, dashMaxCooldown: 90, dashDx: 0, dashDy: 0,
    isInvincible: false, experience: 0, experienceToLevel: 100,
    multiShot: 1, bounces: 0, fireRate: 8, cooldown: 0,
  };
}

export function generateDummy(targetFrames = 600) {
  targetFrames = Math.min(targetFrames, 5000);
  let dummy = [];
  let startX = state.player ? state.player.x + (Math.random() > 0.5 ? 300 : -300) : 1500;
  let startY = state.player ? state.player.y + (Math.random() > 0.5 ? 300 : -300) : 1500;

  for (let i = 0; i < targetFrames; i++) {
    dummy.push([Math.round(startX), Math.round(startY)]);
  }
  return dummy;
}

export function bossSummonGhosts() {
  state.ghosts = [];
  let ghostLimit = Math.min(state.currentLevel, 10);
  let runsToUse = [];

  if (state.pastRuns.length > 0) {
    let shuffled = [...state.pastRuns].sort(() => 0.5 - Math.random());
    runsToUse = shuffled.slice(0, Math.min(ghostLimit, shuffled.length));
  }

  runsToUse.push(generateDummy(5000));
  let currentSpeedRate = state.currentLevel <= 2 ? 0.5 : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);

  runsToUse.forEach((runData, idx) => {
    state.ghosts.push({
      record: runData, speedRate: currentSpeedRate, burnTimer: 0, lastHazardDamageTime: 0,
      lastIdx: -1, x: state.boss.x, y: state.boss.y, radius: 12, isStunned: 0,
      historyPath: [], isDummy: idx === runsToUse.length - 1,
    });
  });
}