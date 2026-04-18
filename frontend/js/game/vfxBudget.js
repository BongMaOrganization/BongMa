export const VFX_BUDGET = {
  MAX_PARTICLES: 180,
  PARTICLES_PER_DRAW_PASS: 8,
  FAST_BULLET_THRESHOLD: 28,
  EXTREME_BULLET_THRESHOLD: 55,
  MAX_PLAYER_BULLETS: 90,
  MAX_ENEMY_BULLETS: 130,
  MAX_TOTAL_BULLETS: 170,
};

const VFX_ARRAY_LIMITS = {
  particles: VFX_BUDGET.MAX_PARTICLES,
  explosions: 32,
  floatingTexts: 45,

  alchemistBursts: 24,
  alchemistSparks: 45,
  assassinBursts: 24,
  berserkerBursts: 24,
  berserkerSparks: 45,
  brawlerBursts: 24,
  druidBursts: 24,
  engineerBursts: 24,
  engineerSparks: 40,
  frostBursts: 24,
  frostMarks: 28,
  frostShards: 45,
  ghostBursts: 24,
  ghostWisps: 40,
  gunnerAirstrikes: 16,
  gunnerBursts: 24,
  gunnerMines: 24,
  gunnerSparks: 40,
  hunterBursts: 24,
  hunterDust: 35,
  hunterMarks: 32,
  hunterTraps: 24,
  knightBursts: 24,
  knightSparks: 40,
  mageBursts: 24,
  mageSparks: 40,
  medicBursts: 24,
  oracleBursts: 24,
  painterTrails: 120,
  painterZones: 18,
  phoenixBursts: 26,
  phoenixSparks: 45,
  phoenixTrails: 35,
  reaperBursts: 24,
  reaperPhantoms: 18,
  reaperSparks: 45,
  scoutAfterimages: 18,
  scoutBursts: 26,
  scoutEchoes: 26,
  scoutSparks: 45,
  scoutTrails: 34,
  sharpshooterBursts: 24,
  sharpshooterSparks: 45,
  sniperBursts: 24,
  sniperShotLines: 20,
  sniperSparks: 40,
  speedsterBursts: 24,
  spiritBursts: 24,
  spiritLightnings: 16,
  spiritPhantoms: 18,
  spiritSparks: 45,
  stormBursts: 24,
  stormSparks: 45,
  stormStrikes: 12,
  stormTrails: 32,
  summonerBursts: 24,
  summonerWisps: 45,
  tankBursts: 24,
  timekeeperBursts: 24,
  timekeeperEchoes: 18,
  timekeeperSparks: 45,
  voidBlackholes: 8,
  voidBursts: 24,
  voidRipples: 24,
  voidSparks: 45,
  wardenBursts: 24,
  wardenSparks: 40,
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
  const originalPush = particles.push;
  let spawned = 0;

  particles.push = function limitedParticlePush(...items) {
    for (const item of items) {
      if (particles.length >= VFX_BUDGET.MAX_PARTICLES || spawned >= maxSpawned) {
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
