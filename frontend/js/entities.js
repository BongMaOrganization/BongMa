import { state } from "./state.js";
import { FPS } from "./config.js";
import { dist } from "./utils.js";

// =======================
// UTILITIES & HELPER FUNCTIONS
// =======================
const TAU = Math.PI * 2;

export function activateShield(boss, amount) {
  boss.shield = amount;
  boss.maxShield = amount;
  boss.shieldActive = true;
  state.bossSpecial = {
    name: "GỒNG CHIÊU (SHIELD)",
    timer: 300,
    duration: 300,
    type: "SPECIAL",
    color: "#00ffff"
  };
}

export function spawnMeteor(tx, ty, destX, destY) {
  state.bullets.push({
    x: tx,
    y: ty,
    destX: destX,
    destY: destY,
    vx: (destX - tx) / 60,
    vy: (destY - ty) / 60,
    radius: 30,
    isMeteor: true,
    life: 60,
    isPlayer: false,
    style: 1
  });
}

function fireAngle(sx, sy, angle, style = 0, source = "boss", damage = 1) {
  spawnBullet(sx, sy, sx + Math.cos(angle), sy + Math.sin(angle), false, style, source, damage);
}

export function spawnHazard(type, x, y, radius = 40, duration = 300, damage = 0.5, owner = "boss", targetRadius = 0) {
  state.hazards.push({
    x, y, radius, type,
    life: duration,
    maxLife: duration,
    damage,
    owner,
    targetRadius: targetRadius || radius,
    expanding: targetRadius > radius,
    firstEnterTime: 0,
    active: type !== "rock"
  });
}

function spawnSafeZone(x, y, radius, duration, options = {}) {
  state.safeZones.push({
    x, y, radius,
    timer: duration,
    maxTimer: duration,
    vx: options.vx || 0,
    vy: options.vy || 0,
    shrinking: options.shrinking || false
  });
}

function spawnBeam(x1, y1, x2, y2, chargeTime, fireTime) {
  const beam = { x1, y1, x2, y2, state: "charge", timer: chargeTime + fireTime, chargeTime, fireTime };
  state.bossBeams.push(beam);

  state.delayedTasks.push({
    delay: chargeTime,
    action: () => { beam.state = "fire"; }
  });

  state.delayedTasks.push({
    delay: chargeTime + fireTime,
    action: () => {
      const idx = state.bossBeams.indexOf(beam);
      if (idx > -1) state.bossBeams.splice(idx, 1);
    }
  });
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
  return Math.atan2(state.player.y - boss.y, state.player.x - boss.x) + extraAngle;
}

function spawnWarning(x, y, radius, duration) {
  state.groundWarnings.push({ x, y, radius, timer: duration });
}

// =======================
// BOSS SKILL DEFINITIONS
// =======================

export const SPECIAL_SKILLS = {
  // --- FIRE ---
  "Meteor Strike": (boss) => {
    activateShield(boss, 150);
    const count = 7;
    for (let i = 0; i < count; i++) {
      state.delayedTasks.push({
        delay: i * 15,
        action: () => {
          const tx = state.player.x + (Math.random() - 0.5) * 150;
          const ty = state.player.y + (Math.random() - 0.5) * 150;
          spawnWarning(tx, ty, 70, 60);
          state.delayedTasks.push({
            delay: 60,
            action: () => spawnMeteor(tx, -100, tx, ty)
          });
        }
      });
    }
  },
  "Inferno Pulse": (boss) => {
    // SỬA ĐỔI: Biến thành các Sóng Lửa (Vòng rỗng) bung ra toàn bản đồ
    activateShield(boss, 100);
    for (let i = 0; i < 3; i++) {
      state.delayedTasks.push({
        delay: i * 45,
        action: () => {
          state.screenShake.timer = 15;
          state.screenShake.intensity = 8;
          state.screenShake.type = 'earth';
          // Tạo một Fire Ring lan từ bán kính 10 ra 1000 px trong 120 frames
          spawnHazard("fire_ring", boss.x, boss.y, 10, 120, 1.0, "boss", 1000);
        }
      });
    }
  },
  "SUPERNOVA": (boss) => {
    state.screenShake.timer = 200;
    state.screenShake.intensity = 10;
    state.screenShake.type = 'wind';
    boss.ultimatePhase = true;
    state.globalHazard = { type: "fire", active: true, timer: 600, damage: 1.0 };
    // Moving and Shrinking safe zones
    spawnSafeZone(100, 100, 150, 600, { vx: 2, vy: 1, shrinking: true });
    spawnSafeZone(700, 500, 150, 600, { vx: -2, vy: -1, shrinking: true });
  },

  // --- EARTH ---
  "Seismic Rift": (boss) => {
    activateShield(boss, 180);
    const targetAngle = aim(boss);
    for (let i = 0; i < 10; i++) {
      state.delayedTasks.push({
        delay: i * 8,
        action: () => {
          const px = boss.x + Math.cos(targetAngle) * (i * 60 + 50);
          const py = boss.y + Math.sin(targetAngle) * (i * 60 + 50);
          spawnHazard("rock", px, py, 45, 400);
          state.screenShake.timer = 5;
          state.screenShake.intensity = 8;
          state.screenShake.type = 'earth';
        }
      });
    }
  },
  "Rock Rain": (boss) => {
    activateShield(boss, 150);
    for (let i = 0; i < 20; i++) {
      const rx = Math.random() * 800, ry = Math.random() * 600;
      spawnWarning(rx, ry, 50, 40 + i * 3);
      state.delayedTasks.push({
        delay: 40 + i * 3,
        action: () => {
          spawnHazard("rock", rx, ry, 50, 300);
          state.screenShake.timer = 10;
          state.screenShake.intensity = 15;
          state.screenShake.type = 'thunder';
        }
      });
    }
  },
  "EARTHQUAKE": (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 600;
    state.screenShake.intensity = 5;
    state.screenShake.type = 'earth';
    state.globalHazard = { type: "earth", active: true, timer: 600, damage: 1.2 };
    spawnSafeZone(400, 300, 200, 600, { shrinking: true });
  },

  // --- ICE ---
  "Frost Nova": (boss) => {
    activateShield(boss, 100);
    ring(boss.x, boss.y, 36, 0, 2);
    spawnHazard("frost", boss.x, boss.y, 300, 240);
  },
  "Icicle Rain": (boss) => {
    activateShield(boss, 120);
    for (let i = 0; i < 40; i++) {
      state.delayedTasks.push({
        delay: i * 4,
        action: () => {
          const rx = Math.random() * 800;
          fireAngle(rx, -20, Math.PI / 2, 2);
        }
      });
    }
  },
  "GLACIAL AGE": (boss) => {
    boss.ultimatePhase = true;
    state.globalHazard = { type: "ice", active: true, timer: 600, damage: 0.8 };
    spawnSafeZone(boss.x, boss.y, 250, 600, { vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 });
  },

  // --- WIND ---
  "Cyclone Barrage": (boss) => {
    activateShield(boss, 80);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      spawnHazard("vortex", boss.x + Math.cos(a) * 200, boss.y + Math.sin(a) * 200, 80, 480);
    }
  },
  "Vacuum Wave": (boss) => {
    activateShield(boss, 100);
    const b = aim(boss);
    for (let i = 0; i < 7; i++) fireAngle(boss.x, boss.y, b + (i - 3) * 0.15, 1);
  },
  "HURRICANE": (boss) => {
    boss.ultimatePhase = true;
    state.windForce = { x: 0.2, y: 0, timer: 600 };
    state.screenShake.timer = 600;
    state.screenShake.intensity = 3;
    state.screenShake.type = 'wind';
    spawnSafeZone(400, 300, 150, 600, { vx: 3, vy: 0 });
  },

  // --- THUNDER ---
  "Tesla Field": (boss) => {
    activateShield(boss, 120);
    spawnBeam(boss.x, boss.y, state.player.x, state.player.y, 60, 40);
  },
  "Chain Lightning": (boss) => {
    activateShield(boss, 100);
    const b = aim(boss);
    for (let i = 0; i < 3; i++) spawnBeam(boss.x, boss.y, boss.x + Math.cos(b + (i - 1) * 0.4) * 1000, boss.y + Math.sin(b + (i - 1) * 0.4) * 1000, 45, 30);
  },
  "HEAVEN'S WRATH": (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 600;
    state.screenShake.intensity = 20;
    state.screenShake.type = 'thunder';
    state.globalHazard = { type: "electric", active: true, timer: 600, damage: 1.5 };
    spawnSafeZone(Math.random() * 800, Math.random() * 600, 100, 600, { vx: 2, vy: 2 });
  }
};

export const BOSS_TYPES = {
  "fire": {
    name: "Hỏa Vương",
    hp: 600, maxHp: 600, speed: 2, color: "#ff4400", originalColor: "#ff4400", elementColor: "#ffaa00", icon: "🔥",
    phases: [
      { attackModes: [0, 1, 2], special: "Inferno Pulse", speedMult: 1.0 },
      { attackModes: [3, 4], special: "Meteor Strike", speedMult: 1.3 },
      { ultimate: "SUPERNOVA", speedMult: 1.6 }
    ]
  },
  "earth": {
    name: "Địa Chấn Vương",
    hp: 800, maxHp: 800, speed: 1.2, color: "#8b4513", originalColor: "#8b4513", elementColor: "#d2b48c", icon: "⛰️",
    phases: [
      { attackModes: [15, 16], special: "Seismic Rift", speedMult: 1.0 },
      { attackModes: [17, 18], special: "Rock Rain", speedMult: 1.3 },
      { ultimate: "EARTHQUAKE", speedMult: 1.5 }
    ]
  },
  "ice": {
    name: "Băng Hậu",
    hp: 500, maxHp: 500, speed: 1.8, color: "#00ffff", originalColor: "#00ffff", elementColor: "#aaffff", icon: "❄️",
    phases: [
      { attackModes: [5, 6], special: "Frost Nova", speedMult: 1.0 },
      { attackModes: [7, 8], special: "Icicle Rain", speedMult: 1.4 },
      { ultimate: "GLACIAL AGE", speedMult: 1.6 }
    ]
  },
  "wind": {
    name: "Phong Thần",
    hp: 450, maxHp: 450, speed: 3.2, color: "#00ffcc", originalColor: "#00ffcc", elementColor: "#ccfff5", icon: "🌪️",
    phases: [
      { attackModes: [20, 21], special: "Cyclone Barrage", speedMult: 1.0 },
      { attackModes: [22, 23], special: "Vacuum Wave", speedMult: 1.5 },
      { ultimate: "HURRICANE", speedMult: 2.0 }
    ]
  },
  "thunder": {
    name: "Lôi Thần",
    hp: 550, maxHp: 550, speed: 2.8, color: "#ffff00", originalColor: "#ffff00", elementColor: "#ffffaa", icon: "⚡",
    phases: [
      { attackModes: [10, 11], special: "Tesla Field", speedMult: 1.0 },
      { attackModes: [12, 13], special: "Chain Lightning", speedMult: 1.5 },
      { ultimate: "HEAVEN'S WRATH", speedMult: 1.8 }
    ]
  }
};

// =======================
// CORE ENTITY LOGIC
// =======================

export function getInitialPlayerState() {
  return {
    x: 400, y: 300, radius: 12, speed: 4.5, color: "#00ffcc", hp: 10, maxHp: 10, coins: 0,
    dashTimeLeft: 0, dashCooldownTimer: 0, dashMaxCooldown: 90, dashDx: 0, dashDy: 0,
    isInvincible: false, experience: 0, experienceToLevel: 100, multiShot: 1, bounces: 0,
    fireRate: 8, cooldown: 0 // RESTORED
  };
}

export function spawnBullet(sx, sy, tx, ty, isPlayer, style = 0, source = "enemy", damage = 1) {
  const angle = Math.atan2(ty - sy, tx - sx);
  const speed = isPlayer ? 10 : 4.5;
  state.bullets.push({
    x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    isPlayer, radius: isPlayer ? 4 : 8, life: 240, style, damage
  });
}

export function createBoss(type) {
  const cfg = BOSS_TYPES[type];
  if (!cfg) return null;
  return {
    ...cfg,
    x: 400, y: 150, radius: 45, attackTimer: 0, moveTimer: 0, moveTargetX: 400, moveTargetY: 150,
    shield: 0, maxShield: 0, shieldActive: false, stunTimer: 0, ultimatePhase: false,
    bossType: type, phaseCount: 3
  };
}

export function updateBoss(boss) {
  if (boss.stunTimer > 0) return;

  boss.attackTimer++;
  boss.moveTimer++;

  // Movement
  if (boss.moveTimer % 120 === 0) {
    boss.moveTargetX = 100 + Math.random() * 600;
    boss.moveTargetY = 100 + Math.random() * 200;
  }
  const phaseIdx = getBossPhase(boss);
  const speed = boss.speed * (boss.phases[phaseIdx]?.speedMult || 1.0);
  boss.x += (boss.moveTargetX - boss.x) * 0.02 * speed;
  boss.y += (boss.moveTargetY - boss.y) * 0.02 * speed;

  // Skill Logic
  if (state.bossSpecial.timer > 0) {
    state.bossSpecial.timer--;
    if (state.bossSpecial.timer === 0) {
      if (SPECIAL_SKILLS[state.bossSpecial.name]) SPECIAL_SKILLS[state.bossSpecial.name](boss);
      state.bossSpecial.name = "";
    }
    return;
  }

  // Check for next skill
  if (state.frameCount % 240 === 0) {
    const phase = boss.phases[phaseIdx];
    let nextSkill = "";
    if (phase.ultimate && Math.random() < 0.4) nextSkill = phase.ultimate;
    else if (phase.special) nextSkill = phase.special;

    if (nextSkill) {
      const isUlt = nextSkill === phase.ultimate;
      state.bossSpecial = {
        name: nextSkill,
        timer: isUlt ? 180 : 90,
        duration: isUlt ? 180 : 90,
        type: isUlt ? "ULTIMATE" : "SPECIAL",
        color: boss.color
      };
    }
  }

  // Attacks
  if (boss.attackTimer % 60 === 0) {
    const modes = boss.phases[phaseIdx].attackModes || [0];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    if (ATTACK_MODES[mode]) ATTACK_MODES[mode](boss);
  }
}

function getBossPhase(boss) {
  const r = boss.hp / boss.maxHp;
  if (r > 0.6) return 0;
  if (r > 0.3) return 1;
  return 2;
}

export const ATTACK_MODES = {
  0: (b) => ring(b.x, b.y, 14, state.frameCount * 0.05, 1),
  1: (b) => {
    // FLAMETHROWER: Dense fan with high variability
    const a = aim(b);
    for (let i = 0; i < 20; i++) {
      const va = a + (Math.random() - 0.5) * 0.6; // Slightly narrower spread
      const vs = 4 + Math.random() * 10;
      state.bullets.push({
        x: b.x, y: b.y, vx: Math.cos(va) * vs, vy: Math.sin(va) * vs,
        isPlayer: false,
        radius: 4 + Math.random() * 10, // Varied sizes
        life: 40 + Math.random() * 30, // Shorter life for dense "stream"
        style: 1, damage: 1
      });
    }
  },
  2: (b) => { for (let i = 0; i < 8; i++) fireAngle(b.x, b.y, Math.random() * TAU, 1); },
  3: (b) => ring(b.x, b.y, 8, -state.frameCount * 0.1, 1),
  4: (b) => fan(b.x, b.y, aim(b), 3, 0.4, 1),
  5: (b) => ring(b.x, b.y, 10, state.frameCount * 0.02, 2),
  6: (b) => fan(b.x, b.y, aim(b), 7, 0.1, 2),
  7: (b) => ring(b.x, b.y, 15, -state.frameCount * 0.05, 2),
  8: (b) => fan(b.x, b.y, aim(b), 5, 0.3, 2),
  10: (b) => ring(b.x, b.y, 12, 0, 3),
  11: (b) => fan(b.x, b.y, aim(b), 3, 0.5, 3),
  12: (b) => { for (let i = 0; i < 10; i++) fireAngle(b.x, b.y, Math.random() * TAU, 3); },
  13: (b) => ring(b.x, b.y, 20, state.frameCount * 0.1, 3),
  15: (b) => ring(b.x, b.y, 8, 0, 0),
  16: (b) => fan(b.x, b.y, aim(b), 11, 0.1, 0),
  17: (b) => ring(b.x, b.y, 12, state.frameCount * 0.04, 0),
  18: (b) => fan(b.x, b.y, aim(b), 7, 0.2, 0),
  20: (b) => ring(b.x, b.y, 10, state.frameCount * 0.08, 4), // Style 4: Wind
  21: (b) => fan(b.x, b.y, aim(b), 15, 0.05, 4),
  22: (b) => ring(b.x, b.y, 18, -state.frameCount * 0.05, 4),
  23: (b) => fan(b.x, b.y, aim(b), 9, 0.15, 4),
};

// =======================
// DUMMY (FIX LAG)
// =======================
export function generateDummy(targetFrames = 600) {
  targetFrames = Math.min(targetFrames, 5000);
  let dummy = [];
  let speedMult = state.currentLevel <= 2 ? 0.5 : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);

  for (let i = 0; i < targetFrames; i++) {
    let x = 400 + Math.cos(i * 0.02 * speedMult) * 250;
    let y = 300 + Math.sin(i * 0.03 * speedMult) * 200;
    dummy.push([Math.round(x), Math.round(y)]);
  }
  return dummy;
}

// =======================
// GHOST SUMMONING
// =======================
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
      burnTimer: 0,
      lastHazardDamageTime: 0,
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