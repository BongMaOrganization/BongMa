export const VFX_BUDGET = {
  MAX_PARTICLES: 90,
  PARTICLES_PER_DRAW_PASS: 3,
  FAST_BULLET_THRESHOLD: 14,
  EXTREME_BULLET_THRESHOLD: 28,
  MAX_PLAYER_BULLETS: 78,
  MAX_ENEMY_BULLETS: 120,
  MAX_TOTAL_BULLETS: 150,
};

const VFX_ARRAY_LIMITS = {
  particles: VFX_BUDGET.MAX_PARTICLES,
  explosions: 22,
  floatingTexts: 32,

  alchemistBursts: 14,
  alchemistSparks: 18,
  assassinBursts: 14,
  berserkerBursts: 14,
  berserkerSparks: 18,
  brawlerBursts: 14,
  creatorBursts: 14,
  creatorRunes: 12,
  creatorSparks: 18,
  creatorTrails: 12,
  creatorTurrets: 16,
  creatorOrbs: 18,
  destroyerBursts: 14,
  destroyerRifts: 18,
  destroyerSparks: 18,
  destroyerTrails: 12,
  elementalistBursts: 14,
  elementalistRunes: 12,
  elementalistSparks: 18,
  elementalistTrails: 12,
  druidBursts: 14,
  engineerBursts: 14,
  engineerSparks: 18,
  frostBursts: 14,
  frostMarks: 18,
  frostShards: 18,
  ghostBursts: 14,
  ghostWisps: 18,
  gunnerAirstrikes: 16,
  gunnerBursts: 14,
  gunnerMines: 24,
  gunnerSparks: 18,
  hunterBursts: 14,
  hunterDust: 16,
  hunterMarks: 16,
  hunterTraps: 24,
  knightBursts: 14,
  knightSparks: 18,
  mageBursts: 14,
  mageSparks: 18,
  medicBursts: 14,
  necroBursts: 14,
  necroExplosions: 14,
  necroRunes: 12,
  necroTrails: 12,
  necroWisps: 18,
  oracleBursts: 14,
  painterBursts: 14,
  painterExplosions: 14,
  painterSparks: 18,
  painterSteps: 14,
  painterTrails: 28,
  painterZones: 12,
  phoenixBursts: 14,
  phoenixSparks: 18,
  phoenixTrails: 12,
  reaperBursts: 14,
  reaperPhantoms: 10,
  reaperSparks: 18,
  scoutAfterimages: 8,
  scoutBursts: 14,
  scoutEchoes: 12,
  scoutSparks: 18,
  scoutTrails: 12,
  sharpshooterBursts: 14,
  sharpshooterSparks: 18,
  sniperBursts: 14,
  sniperShotLines: 10,
  sniperSparks: 18,
  speedsterBursts: 14,
  spiritBursts: 14,
  spiritLightnings: 10,
  spiritPhantoms: 10,
  spiritSparks: 18,
  stormBursts: 14,
  stormSparks: 18,
  stormStrikes: 12,
  stormTrails: 12,
  summonerBursts: 14,
  summonerWisps: 18,
  tankBursts: 14,
  timekeeperBursts: 14,
  timekeeperEchoes: 10,
  timekeeperSparks: 18,
  icicles: 20,
  stormLightnings: 10,
  windTornadoes: 8,
  voidBlackholes: 8,
  voidBursts: 14,
  voidRipples: 14,
  voidSparks: 18,
  wardenBursts: 14,
  wardenSparks: 18,
};

function trimArray(arr, max) {
  if (Array.isArray(arr) && arr.length > max) {
    arr.splice(0, arr.length - max);
  }
}

export function enforceVfxBudget(state) {
  for (const [key, max] of Object.entries(VFX_ARRAY_LIMITS)) {
    trimArray(state[key], max);
  }
}

export function enforceBulletBudget(state) {
  const bullets = state.bullets;
  if (!Array.isArray(bullets)) return;

  let playerCount = 0;
  let enemyCount = 0;
  for (const bullet of bullets) {
    if (bullet.isPlayer) playerCount++;
    else enemyCount++;
  }

  let dropPlayer = Math.max(0, playerCount - VFX_BUDGET.MAX_PLAYER_BULLETS);
  let dropEnemy = Math.max(0, enemyCount - VFX_BUDGET.MAX_ENEMY_BULLETS);
  if (dropPlayer <= 0 && dropEnemy <= 0 && bullets.length <= VFX_BUDGET.MAX_TOTAL_BULLETS) return;

  let trimmed = bullets.filter((bullet) => {
    if (bullet.isPlayer && dropPlayer > 0) {
      dropPlayer--;
      return false;
    }
    if (!bullet.isPlayer && dropEnemy > 0) {
      dropEnemy--;
      return false;
    }
    return true;
  });

  let excess = Math.max(0, trimmed.length - VFX_BUDGET.MAX_TOTAL_BULLETS);
  if (excess > 0) {
    trimmed = trimmed.filter((bullet) => {
      if (excess > 0 && bullet.isPlayer) {
        excess--;
        return false;
      }
      return true;
    });
    if (excess > 0) trimmed.splice(0, excess);
  }

  state.bullets = trimmed;
}

export function shouldUseFastBulletDraw(state, bulletCount) {
  return (
    bulletCount > VFX_BUDGET.FAST_BULLET_THRESHOLD ||
    (state.particles?.length || 0) > VFX_BUDGET.MAX_PARTICLES * 0.75
  );
}

export function shouldUseExtremeBulletDraw(bulletCount) {
  return bulletCount > VFX_BUDGET.EXTREME_BULLET_THRESHOLD;
}

export function withParticleSpawnBudget(state, maxSpawned = VFX_BUDGET.PARTICLES_PER_DRAW_PASS) {
  if (!state.particles) state.particles = [];
  trimArray(state.particles, VFX_BUDGET.MAX_PARTICLES);

  const particles = state.particles;
  const bulletLoad = state.bullets?.length || 0;
  let effectiveMax = maxSpawned;
  if (bulletLoad > 60) effectiveMax = Math.min(effectiveMax, 1);
  else if (bulletLoad > 30) effectiveMax = Math.min(effectiveMax, 2);
  const originalPush = particles.push;
  let spawned = 0;

  particles.push = function limitedParticlePush(...items) {
    for (const item of items) {
      if (particles.length >= VFX_BUDGET.MAX_PARTICLES || spawned >= effectiveMax) {
        break;
      }
      originalPush.call(particles, item);
      spawned++;
    }
    return particles.length;
  };

  return () => {
    particles.push = originalPush;
    trimArray(particles, VFX_BUDGET.MAX_PARTICLES);
  };
}

function getManagedVfxCount(state) {
  let total = 0;
  for (const key of Object.keys(VFX_ARRAY_LIMITS)) {
    const arr = state[key];
    if (Array.isArray(arr)) total += arr.length;
  }
  return total;
}

export function shouldSkipCharacterVfxFrame(state) {
  const bullets = state.bullets?.length || 0;
  const particles = state.particles?.length || 0;
  const managed = getManagedVfxCount(state);
  const frame = state.frameCount || 0;

  if (bullets > 55 || particles > 70 || managed > 160) {
    return frame % 3 !== 0;
  }

  if (bullets > 28 || particles > 36 || managed > 90) {
    return frame % 2 !== 0;
  }

  return false;
}

export function isPerformanceMode(state) {
  const bullets = state.bullets?.length || 0;
  const particles = state.particles?.length || 0;
  const managed = getManagedVfxCount(state);
  return bullets > 28 || particles > 36 || managed > 90;
}

export function shouldUseMinimalEnemyDraw(state) {
  const bullets = state.bullets?.length || 0;
  const particles = state.particles?.length || 0;
  return bullets > 24 || particles > 28;
}

export function shouldSkipParticleDrawFrame(state) {
  const bullets = state.bullets?.length || 0;
  const particles = state.particles?.length || 0;
  const frame = state.frameCount || 0;

  if (bullets > 55 || particles > 70) return frame % 3 !== 0;
  if (bullets > 24 || particles > 28) return frame % 2 !== 0;
  return false;
}
