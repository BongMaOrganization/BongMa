import { state } from "./state.js";
import { FPS } from "./config.js";

// =======================
// UTILITIES & HELPER FUNCTIONS
// =======================
const TAU = Math.PI * 2;

function fireAngle(sx, sy, angle, style = 0, source = "boss", damage = 1) {
  spawnBullet(sx, sy, sx + Math.cos(angle), sy + Math.sin(angle), false, style, source, damage);
}

function ring(sx, sy, count, offset = 0, style = 0, source = "boss", damage = 1) {
  for (let i = 0; i < count; i++) {
    fireAngle(sx, sy, offset + (i * TAU) / count, style, source, damage);
  }
}

function fan(sx, sy, baseAngle, count, spread, style = 0, source = "boss", damage = 1) {
  const start = baseAngle - (spread * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    fireAngle(sx, sy, start + i * spread, style, source, damage);
  }
}

function aim(boss, extraAngle = 0) {
  return (
    Math.atan2(state.player.y - boss.y, state.player.x - boss.x) + extraAngle
  );
}

export const ATTACK_MODES = {
  0: (boss) => { // Radial Fire
    ring(boss.x, boss.y, 24, boss.attackTimer * 0.05, 1);
  },
  1: (boss) => { // Aimed Fire
    const base = aim(boss);
    fan(boss.x, boss.y, base, 9, 0.08, 1);
  },
  2: (boss) => { // Chaos Fire
    for (let i = 0; i < 15; i++) fireAngle(boss.x, boss.y, Math.random() * TAU, 1);
  },
  3: (boss) => { // Spiral
    const t = boss.attackTimer * 0.1;
    ring(boss.x, boss.y, 12, t, 1);
    ring(boss.x, boss.y, 12, -t, 1);
  },
  4: (boss) => { // Cross
    const base = aim(boss);
    for (let i = 0; i < 4; i++) fireAngle(boss.x, boss.y, base + i * Math.PI / 2, 1);
  },
  5: (boss) => { // Ice Ring
    ring(boss.x, boss.y, 30, boss.attackTimer * 0.04, 2);
  },
  6: (boss) => { // Ice Fan
    fan(boss.x, boss.y, aim(boss), 15, 0.05, 2);
  },
  7: (boss) => { // Slow Shot
    fireAngle(boss.x, boss.y, aim(boss), 2);
  },
  8: (boss) => { // Ice Spiral
    ring(boss.x, boss.y, 16, boss.attackTimer * 0.08, 2);
  },
  9: (boss) => { // Frost Burst
    for (let i = 0; i < 20; i++) fireAngle(boss.x, boss.y, Math.random() * TAU, 2);
  },
  10: (boss) => { // Thunder Bolt (Fake)
    fireAngle(boss.x, boss.y, aim(boss), 3);
  },
  11: (boss) => { // Spark Ring
    ring(boss.x, boss.y, 18, Math.random() * TAU, 3);
  },
  12: (boss) => { // Chain Lightning (Fake)
    fan(boss.x, boss.y, aim(boss), 7, 0.2, 3);
  },
  13: (boss) => { // Thunder Rain
    const rx = Math.random() * 800;
    spawnBullet(rx, -50, rx, 650, false, 3);
  },
  14: (boss) => { // Electric Spiral
    ring(boss.x, boss.y, 22, boss.attackTimer * 0.15, 3);
  },
  15: (boss) => { // Rock Shot
    fireAngle(boss.x, boss.y, aim(boss), 0);
  },
  16: (boss) => { // Earth Ring
    ring(boss.x, boss.y, 14, 0, 0);
  },
  17: (boss) => { // Boulder Fall
    for(let i=0; i<3; i++) spawnBullet(Math.random()*800, -50, Math.random()*800, 650, false, 0);
  },
  18: (boss) => { // Rock Spiral
    ring(boss.x, boss.y, 12, boss.attackTimer * 0.05, 0);
  },
  19: (boss) => { // Ground Wave
    fan(boss.x, boss.y, aim(boss), 21, 0.03, 0);
  },
  20: (boss) => { // Wind Gust
    fan(boss.x, boss.y, aim(boss), 11, 0.1, 1);
  },
  21: (boss) => { // Tornado (Small)
    ring(boss.x, boss.y, 8, boss.attackTimer * 0.2, 1);
  },
  22: (boss) => { // Slicing Wind
    for(let i=0; i<10; i++) fireAngle(boss.x, boss.y, Math.random() * TAU, 1);
  },
  23: (boss) => { // Wind Fan
    fan(boss.x, boss.y, aim(boss), 25, 0.04, 1);
  },
  24: (boss) => { // Cyclon
    ring(boss.x, boss.y, 36, boss.attackTimer * 0.05, 1);
  },
  25: (boss) => { // Global Rain
    for (let x = 0; x < 800; x += 100) spawnBullet(x + Math.random()*50, -50, x, 650, false, 1);
  },
  26: (boss) => { // Expanding Cross
    const b = aim(boss);
    for(let i=0; i<8; i++) fireAngle(boss.x, boss.y, b + i * Math.PI / 4, 1);
  },
  27: (boss) => { // Target Grid
    const px = state.player.x, py = state.player.y;
    spawnBullet(px - 100, -50, px, py, false, 2);
    spawnBullet(px + 100, -50, px, py, false, 2);
  },
  28: (boss) => { // Hellfire
    ring(boss.x, boss.y, 40, boss.attackTimer * 0.02, 1);
  },
  29: (boss) => { // Final Wave
    ring(boss.x, boss.y, 60, boss.attackTimer * 0.01, 3);
  }
};

const SPECIAL_SKILLS = {
  // --- FIRE ---
  "Inferno Ring": (boss) => {
    state.screenShake.timer = 20;
    state.screenShake.intensity = 8;
    for (let i = 0; i < 40; i++) {
        spawnBullet(boss.x, boss.y, boss.x + Math.cos(i * 0.16), boss.y + Math.sin(i * 0.16), false, 1, "boss", 2);
    }
  },
  "Meteor Rain": (boss) => {
    state.screenShake.timer = 40;
    state.screenShake.intensity = 10;
    for (let i = 0; i < 15; i++) {
      const rx = Math.random() * 800;
      spawnBullet(rx, -50, rx + (Math.random() - 0.5) * 100, 650, false, 1, "boss", 2);
    }
  },
  "SUPERNOVA": (boss) => {
    state.screenShake.timer = 60;
    state.screenShake.intensity = 20;
    for (let i = 0; i < 100; i++) {
      const a = (i / 100) * TAU;
      spawnBullet(boss.x, boss.y, boss.x + Math.cos(a), boss.y + Math.sin(a), false, 1, "boss", 3);
    }
  },

  // --- ICE ---
  "Frost Nova": (boss) => {
    ring(boss.x, boss.y, 40, 0, 2, "boss", 2);
  },
  "Ice Spike Fan": (boss) => {
    const b = aim(boss);
    fan(boss.x, boss.y, b, 25, 0.04, 2, "boss", 2);
  },
  "ABSOLUTE ZERO": (boss) => {
    state.screenShake.timer = 40;
    state.screenShake.intensity = 5;
    for (let i = 0; i < 120; i++) {
        const a = (i / 120) * TAU;
        spawnBullet(boss.x, boss.y, boss.x + Math.cos(a), boss.y + Math.sin(a), false, 2, "boss", 3);
    }
  },

  // --- THUNDER ---
  "Tesla Coil": (boss) => {
    for (let i = 0; i < 8; i++) {
      const tx = Math.random() * 800;
      const ty = Math.random() * 600;
      spawnBullet(tx, -100, tx, ty, false, 3, "boss", 2);
      state.screenShake.timer = 10;
    }
  },
  "Volt Beam": (boss) => {
    const b = aim(boss);
    for(let i=0; i<15; i++) {
        fireAngle(boss.x, boss.y, b + (i-7)*0.05, 3, "boss", 2);
    }
  },
  "GOD'S JUDGMENT": (boss) => {
    state.screenShake.timer = 60;
    state.screenShake.intensity = 15;
    for(let i=0; i<50; i++) {
        const rx = Math.random() * 800;
        const ry = Math.random() * 600;
        spawnBullet(rx, -200, rx, ry, false, 3, "boss", 3);
    }
  },

  // --- EARTH ---
  "Shockwave": (boss) => {
    state.screenShake.timer = 30;
    state.screenShake.intensity = 12;
    ring(boss.x, boss.y, 36, 0, 0, "boss", 2);
  },
  "Rock Fall": (boss) => {
    state.screenShake.timer = 40;
    state.screenShake.intensity = 15;
    for(let i=0; i<20; i++) {
        const rx = Math.random() * 800;
        spawnBullet(rx, -100, rx, 700, false, 0, "boss", 2);
    }
  },
  "THE GREAT QUAKE": (boss) => {
    state.screenShake.timer = 100;
    state.screenShake.intensity = 25;
    for(let i=0; i<80; i++) {
        const rx = Math.random() * 800;
        spawnBullet(rx, 650, rx, -100, false, 0, "boss", 3);
    }
  },

  // --- WIND ---
  "Gust Force": (boss) => {
    const b = aim(boss);
    fan(boss.x, boss.y, b, 30, 0.1, 1, "boss", 2);
  },
  "Razor Wind": (boss) => {
    for(let i=0; i<50; i++) {
        fireAngle(boss.x, boss.y, Math.random() * TAU, 1, "boss", 2);
    }
  },
  "CATACLYSMIC VORTEX": (boss) => {
    state.screenShake.timer = 50;
    state.screenShake.intensity = 10;
    for (let i = 0; i < 150; i++) {
        const a = (i / 150) * TAU;
        spawnBullet(boss.x, boss.y, boss.x + Math.cos(a), boss.y + Math.sin(a), false, 1, "boss", 3);
    }
  }
};

// =======================
// BOSSES
// =======================
export const BOSS_TYPES = {
  fireBoss: {
    name: "Fire Lord",
    hp: 400,
    speed: 2,
    color: "#ff4500",
    shape: "circle",
    icon: "🔥",
    phaseCount: 3,
    phases: [
      { attackModes: [0, 1, 2], special: "Inferno Ring", speedMult: 1.0 },
      { attackModes: [3, 4, 28], special: "Meteor Rain", speedMult: 1.3 },
      { attackModes: [28, 27, 26], ultimate: "SUPERNOVA", speedMult: 1.6, rageFireRate: 0.7 },
    ],
    phaseColors: [
      { start: "#ff4500", end: "#ff0000" },
      { start: "#ff9900", end: "#ff2200" },
      { start: "#ff0000", end: "#ffff00" },
    ],
  },
  iceBoss: {
    name: "Ice Queen",
    hp: 350,
    speed: 1.5,
    color: "#00ffff",
    shape: "hexagon",
    icon: "❄️",
    phaseCount: 2,
    phases: [
      { attackModes: [5, 6, 7], special: "Frost Nova", speedMult: 1.0 },
      { attackModes: [8, 9, 26], ultimate: "ABSOLUTE ZERO", speedMult: 1.4, rageFireRate: 0.75 },
    ],
    phaseColors: [
      { start: "#00ffff", end: "#0099ff" },
      { start: "#99ffff", end: "#33ccff" },
    ],
  },
  thunderBoss: {
    name: "Thunder King",
    hp: 450,
    speed: 2.5,
    color: "#ffff00",
    shape: "triangle",
    icon: "⚡",
    phaseCount: 3,
    phases: [
      { attackModes: [10, 11, 12], special: "Tesla Coil", speedMult: 1.0 },
      { attackModes: [13, 14, 29], special: "Volt Beam", speedMult: 1.4 },
      { attackModes: [25, 26, 28], ultimate: "GOD'S JUDGMENT", speedMult: 1.8, rageFireRate: 0.6 },
    ],
    phaseColors: [
      { start: "#ffff00", end: "#ffcc00" },
      { start: "#ffcc33", end: "#ffaa00" },
      { start: "#ffffff", end: "#ffff00" },
    ],
  },
  earthBoss: {
    name: "Earth Titan",
    hp: 550,
    speed: 1,
    color: "#8b4513",
    shape: "square",
    icon: "🪨",
    phaseCount: 2,
    phases: [
      { attackModes: [15, 16, 17], special: "Shockwave", speedMult: 1.0 },
      { attackModes: [18, 19, 27], ultimate: "THE GREAT QUAKE", speedMult: 1.5, rageFireRate: 0.7 },
    ],
    phaseColors: [
      { start: "#8b4513", end: "#5a3310" },
      { start: "#a0522d", end: "#6b4226" },
    ],
  },
  windBoss: {
    name: "Wind Spirit",
    hp: 380,
    speed: 3,
    color: "#00ffcc",
    shape: "star",
    icon: "🌪️",
    phaseCount: 3,
    phases: [
      { attackModes: [20, 21, 22], special: "Gust Force", speedMult: 1.0 },
      { attackModes: [23, 24, 29], special: "Razor Wind", speedMult: 1.5 },
      { attackModes: [25, 26, 28], ultimate: "CATACLYSMIC VORTEX", speedMult: 2.0, rageFireRate: 0.5 },
    ],
    phaseColors: [
      { start: "#00ffcc", end: "#00cc99" },
      { start: "#33ffcc", end: "#00ffaa" },
      { start: "#00ffff", end: "#ffffff" },
    ],
  },
};

// =======================
// PLAYER
// =======================
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
    maxShield: 0,
    shieldRegenTimer: 0,
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
    buffs: { multiShot: 0, bounces: 0 },
  };
}

// =======================
// DUMMY (FIX LAG)
// =======================
export function generateDummy(targetFrames = 600) {
  targetFrames = Math.min(targetFrames, 5000);
  let dummy = [];
  let speedMult =
    state.currentLevel <= 2
      ? 0.5
      : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);

  for (let i = 0; i < targetFrames; i++) {
    let x = 400 + Math.cos(i * 0.02 * speedMult) * 250;
    let y = 300 + Math.sin(i * 0.03 * speedMult) * 200;
    dummy.push({ x: Math.round(x), y: Math.round(y) });
  }
  return dummy;
}

// =======================
// BULLET
// =======================
export function spawnBullet(sx, sy, tx, ty, isPlayer, style = 0, source = "enemy", damage = 1) {
  let angle = Math.atan2(ty - sy, tx - sx);
  let speed = isPlayer
    ? 10
    : state.isBossLevel
      ? 4.5
      : 3.5 + state.currentLevel * 0.2;

  let isGhostShot = source === "ghost";

  let baseMulti = isPlayer || isGhostShot ? state.player.multiShot : 1;
  let baseBounce = isPlayer || isGhostShot ? Math.max(0, state.player.bounces || 0) : 0;

  if (isPlayer && state.player.buffs) {
    baseMulti += state.player.buffs.multiShot;
    baseBounce += state.player.buffs.bounces;
  }

  let spread = 0.1 + baseMulti * 0.02;
  let startAngle = angle - (spread * (baseMulti - 1)) / 2;

  for (let i = 0; i < baseMulti; i++) {
    let a = startAngle + i * spread;
    state.bullets.push({
      x: sx,
      y: sy,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      isPlayer,
      radius: state.isBossLevel && !isPlayer ? 8 : 4,
      life: 240,
      bounces: baseBounce,
      style,
      damage
    });
  }
}

// =======================
// BOSS ATTACK (SYSTEM OVERHAUL)
// =======================
export function spawnBossAttack() {
  const boss = state.boss;
  if (!boss) return;

  boss.attackTimer++;
  if (state.bossSpecialCD > 0) state.bossSpecialCD--;

  // --- Boss Movement ---
  boss.moveTimer++;
  if (boss.moveTimer % 120 === 0) {
    const padding = 80;
    boss.moveTargetX = padding + Math.random() * (800 - padding * 2);
    boss.moveTargetY = padding + Math.random() * (300 - padding);
  }
  const currentPhaseIdx = getBossPhase(boss);
  const phaseSpeedMult = boss.phases[currentPhaseIdx]?.speedMult || 1.0;
  boss.x += (boss.moveTargetX - boss.x) * (boss.speed * phaseSpeedMult * 0.02);
  boss.y += (boss.moveTargetY - boss.y) * (boss.speed * phaseSpeedMult * 0.02);

  // --- Skill System Logic ---
  if (state.bossSpecial.timer > 0) {
    state.bossSpecial.timer--;
    if (state.bossSpecial.timer === 0) {
      // Execute the prepared skill
      if (SPECIAL_SKILLS[state.bossSpecial.name]) {
        SPECIAL_SKILLS[state.bossSpecial.name](boss);
      }
    }
    return; // Don't perform other attacks while charging
  }

  // Check for Special/Ultimate Skills
  if (state.bossSpecialCD <= 0) {
    const phase = boss.phases[currentPhaseIdx];
    let skillName = "";
    let skillType = "SPECIAL";
    let duration = 90; // 1.5s

    // Pool skills from current and previous phases
    let availableSpecials = [];
    for(let i=0; i <= currentPhaseIdx; i++) {
        if (boss.phases[i].special) availableSpecials.push(boss.phases[i].special);
    }

    if (phase.ultimate && Math.random() < 0.3) {
      skillName = phase.ultimate;
      skillType = "ULTIMATE";
      duration = 180; // 3s
    } else if (availableSpecials.length > 0) {
      skillName = availableSpecials[Math.floor(Math.random() * availableSpecials.length)];
    }

    if (skillName) {
      state.bossSpecial = {
        name: skillName,
        type: skillType,
        timer: duration,
        duration: duration,
        color: boss.color
      };
      state.bossSpecialCD = (skillType === "ULTIMATE" ? 25 : 10) * FPS;
      return;
    }
  }

  // Regular Attack
  const phaseModes = boss.phases[currentPhaseIdx].attackModes;
  const rageRate = boss.phases[currentPhaseIdx].rageFireRate || 1.0;
  const attackInterval = Math.max(25, Math.floor(50 * rageRate));

  if (boss.attackTimer % attackInterval === 0) {
    const mode = phaseModes[Math.floor(Math.random() * phaseModes.length)];
    spawnMode(mode);
  }
}

function getBossPhase(boss) {
  const ratio = boss.hp / boss.maxHp;
  if (boss.phaseCount === 3) {
    if (ratio > 0.66) return 0;
    if (ratio > 0.33) return 1;
    return 2;
  }
  return ratio > 0.5 ? 0 : 1;
}

// =======================
// CREATE BOSS
// =======================
export function createBoss(type) {
  const cfg = BOSS_TYPES[type];

  return {
    x: 400,
    y: 150,
    radius: 40,
    hp: cfg.hp,
    maxHp: cfg.hp,
    speed: cfg.speed,
    attackTimer: 0,
    summonCooldown: 5 * FPS,
    ghostsActive: false,
    color: cfg.color,
    shape: cfg.shape,
    name: cfg.name,
    bossType: type,
    phaseColors: cfg.phaseColors,
    phaseCount: cfg.phaseCount || 2,
    moveTimer: 0,
    moveTargetX: 400,
    moveTargetY: 150,
    phases: cfg.phases.map(p => ({ ...p })),
  };
}

// =======================
// SPAWN MODE
// =======================
function spawnMode(mode) {
  if (ATTACK_MODES[mode]) {
    ATTACK_MODES[mode](state.boss);
  }
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
      record: runData,
      speedRate: currentSpeedRate,
      timer: 0,
      lastIdx: -1,
      x: state.boss.x,
      y: state.boss.y,
      radius: 12,
      isStunned: 0,
      historyPath: [],
      isDummy: idx === runsToUse.length - 1,
    });
  });
}

