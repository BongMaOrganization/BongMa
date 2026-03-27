import { state } from "./state.js";
import { FPS } from "./config.js";

export function getInitialPlayerState() {
  return {
    x: 400,
    y: 300,
    radius: 12,
    speed: 4.5,
    color: "#00ffcc",
    hp: 3,
    maxHp: 3,
    shield: 0,
    coins: 0,
    gracePeriod: 120,
    fireRate: 20,
    cooldown: 0,
    multiShot: 1,
    bounces: 0,
    dashTimeLeft: 0,
    dashCooldownTimer: 0,
    dashMaxCooldown: 90,
    dashDx: 0,
    dashDy: 0,
    experience: 0,
    experienceToLevel: 100,
  };
}

export function generateDummy(targetFrames) {
  let dummy = [];
  let speedMult =
    state.currentLevel <= 2
      ? 0.5
      : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);
  for (let i = 0; i < targetFrames; i++) {
    let x = 400 + Math.cos(i * 0.02 * speedMult) * 250;
    let y = 300 + Math.sin(i * 0.03 * speedMult) * 200;
    if (i % 90 === 0) dummy.push([Math.round(x), Math.round(y), 400, 300]);
    else dummy.push([Math.round(x), Math.round(y)]);
  }
  return dummy;
}

export function spawnBullet(sx, sy, tx, ty, isPlayer, style = 0) {
  let angle = Math.atan2(ty - sy, tx - sx);
  let speed = isPlayer
    ? 10
    : state.isBossLevel
      ? 4.5
      : 3.5 + state.currentLevel * 0.2;

  let count = isPlayer ? state.player.multiShot : 1;
  let spread = 0.15;
  let startAngle = angle - (spread * (count - 1)) / 2;

  for (let i = 0; i < count; i++) {
    let a = startAngle + i * spread;
    state.bullets.push({
      x: sx,
      y: sy,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      isPlayer: isPlayer,
      radius: state.isBossLevel && !isPlayer ? 6 : 4,
      life: 180,
      bounces: isPlayer ? state.player.bounces : 0,
      style: style,
    });
  }
}

export function spawnBossAttack() {
  state.boss.attackTimer++;
  if (state.boss.attackTimer > 120) {
    state.boss.attackTimer = 0;
    state.boss.state = Math.floor(Math.random() * 3);
  }

  if (state.boss.attackTimer === 10) {
    if (state.boss.state === 0) {
      for (let i = 0; i < Math.PI * 2; i += 0.4)
        spawnBullet(
          state.boss.x,
          state.boss.y,
          state.boss.x + Math.cos(i),
          state.boss.y + Math.sin(i),
          false,
          1,
        );
    } else if (state.boss.state === 1) {
      spawnBullet(
        state.boss.x,
        state.boss.y,
        state.player.x,
        state.player.y,
        false,
        2,
      );
    }
  } else if (
    state.boss.state === 2 &&
    state.boss.attackTimer % 5 === 0 &&
    state.boss.attackTimer < 60
  ) {
    let angle = (state.boss.attackTimer * 0.2) % (Math.PI * 2);
    spawnBullet(
      state.boss.x,
      state.boss.y,
      state.boss.x + Math.cos(angle),
      state.boss.y + Math.sin(angle),
      false,
      1,
    );
  }
}

export function bossSummonGhosts() {
  state.ghosts = [];
  let ghostLimit = Math.min(state.currentLevel, 10);
  let runsToUse = [];

  if (state.pastRuns.length > 0) {
    let summonCount = Math.min(ghostLimit, state.pastRuns.length);
    let shuffled = [...state.pastRuns].sort(() => 0.5 - Math.random());
    runsToUse = shuffled.slice(0, summonCount);
  }

  runsToUse.push(generateDummy(999999));
  let currentSpeedRate =
    state.currentLevel <= 2
      ? 0.5
      : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);

  runsToUse.forEach((runData, idx) => {
    let isDummy = idx === runsToUse.length - 1;
    state.ghosts.push({
      record: runData,
      speedRate: currentSpeedRate,
      timer: 0,
      lastIdx: -1,
      x: state.boss.x,
      y: state.boss.y,
      radius: 12,
      isStunned: 0,
      historyPath: [],
      isDummy: isDummy,
    });
  });
}
