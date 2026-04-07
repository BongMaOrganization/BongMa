export const state = {
  gameState: "MENU",
  frameCount: 0,
  scoreTime: 0,
  currentLevel: 1,
  maxFramesToSurvive: 0,
  isBossLevel: false,

  world: { width: 5000, height: 5000 },
  camera: { x: 0, y: 0, width: 1536, height: 864 },

  player: null,
  boss: null,
  bullets: [],
  particles: [],
  ghosts: [],
  // ===== Painter =====
  painterTrails: [],
  painterZones: [],
  painterDrawing: false,
  painterDrawTime: 0,
  //Glitch
  glitch: {
    invertControls: false,
    fakeUI: false,
    matrixMode: false,
    stepMode: false,
    stepCooldown: 0,

    // thêm
    decoys: [],
    stepShoot: null,
  },
  pastRuns: [],
  currentRunRecord: [],
  ownedCharacters: ["speedster"],
  selectedCharacter: "speedster",
  resources: {
    common: 0,
    rare: 0,
    legendary: 0,
    rareTickets: 0,
    epicTickets: 0,
  },
  bossFragments: [],
  characterUpgrades: {
    spd: { count: 0, specialEffect: false },
    fire: { count: 0, specialEffect: false },
    multi: { count: 0, specialEffect: false },
    bounce: { count: 0, specialEffect: false },
    dash: { count: 0, specialEffect: false },
  },

  keys: {},
  prevKeys: {},
  mouse: { x: 0, y: 0, screenX: 0, screenY: 0, clicked: false },
  loopId: null,

  // Hàng đợi các tác vụ trì hoãn (thay thế cho setTimeout)
  delayedTasks: [],

  skillsCD: { q: 0, e: 0, r: 0 },
  activeBuffs: { q: 0, e: 0, r: 0 },

  phoenixTrails: [],
  phoenixEfx: null,
  phoenixReviveReady: false,
  necroMinions: [],
  necroZone: null,
  necroExplosions: [],
  voidBlackholes: [],
  voidLaser: null,
  stormTraps: [],
  stormLightnings: [],
  explosions: [],
  druidOrbs: [],
  phantoms: [],
  painterTrails: [],
  painterZones: [],
  painterBomb: null,
  painterExplosions: [],
  hunterTraps: [],
  engineerTurrets: [],
  gunnerMines: [],
  gunnerAirstrikes: [],
  gunnerLaser: null,
  reaperSlash: null,
  destroyerRifts: [],
  destroyerUlt: null,
  creatorTurrets: [],
  creatorHolyZone: null,
  creatorOrbs: [],
  creatorDeathSave: false,
  knightCharge: null,
  knightShield: null,
  knightRage: null,
  isScoutQ: false,

  floatingTexts: [], // Mảng chứa các đoạn chữ bay (XP, Gold, v.v.)

  // ===== Elemental Combat System =====
  hazards: [], // { x, y, radius, type, life, damage, color }
  playerStatus: {
    slow: 1.0, // Multiplier (1.0 = normal)
    slowTimer: 0,
    stunTimer: 0,
    burnTimer: 0,
    lastHazardDamageTime: 0,
  },
  windForce: { x: 0, y: 0, timer: 0 },

  currentPhaseName: "",
  lastBossPhase: -1,

  // ===== Boss Special System =====
  screenShake: { x: 0, y: 0, timer: 0, intensity: 0 },
  // ===== Cinematic Boss Overhaul & Safe Zones =====
  bossBeams: [], // { x1, y1, x2, y2, state: 'charge'|'fire', timer }
  groundWarnings: [], // { x, y, radius, timer, maxTimer, type: 'lightning'|'rock' }
  safeZones: [],
  globalHazard: {
    type: null, // 'fire', 'electric', 'ice'
    active: false,
    timer: 0,
    damage: 0,
  },
  cinematicEffects: {
    fogAlpha: 0, // Ice blizzard overlay
    distortion: 0, // Earth tremor ripple
    vortexPower: 0, // Wind pull intensity
    vortexCenter: { x: 400, y: 300 },
    freezeTimer: 0, // Player freeze duration
    fieldBurn: 0, // Fire global burn timer
  },

  phaseTransitionTimer: 0,

  bossSpecial: {
    name: "",
    type: "NORMAL",
    timer: 0,
    duration: 0,
    color: "#fff",
  },
  bossSpecialCD: 0,

  rerollCount: 0,

  upgrades: {
    spd: 0,
    fire: 0,
    multi: 0,
    bounce: 0,
    dash: 0,
    regen: 0,
    hp_up: 0,
    shield_up: 0,
  },

  evolutions: {
    spd: false,
    fire: false,
    multi: false,
    bounce: false,
    dash: false,
    regen: false,
    hp_up: false,
    shield_up: false,
  },

  evolutionReady: null,
  // ===== Element System =====
  element: "fire",

  elementColors: {
    fire: "#ff5500",
    ice: "#00ccff",
    lightning: "#ffff00",
    earth: "#996633",
    wind: "#00ffcc",
  },
  swarmZones: [],
  crates: [], // Thùng vật phẩm
  activePlayerBuffs: [], // Buff tạm thời (tốc độ bắn, v.v.)
  capturePoints: [], // Điểm chiếm đóng
  permanentScars: [], // Vết sẹo vĩnh viễn trên map
  satelliteDrone: null, // Drone vệ tinh hỗ trợ (bay theo người chơi)
  godMode: { active: false, timer: 0 }, // Buff Hóa Thần
  items: [], // Các vật phẩm nhặt được (Crystal thưởng)
};


export function resetGlitchState() {
  state.glitch = {
    invertControls: false,
    fakeUI: false,
    matrixMode: false,
    stepMode: false,
    stepCooldown: 0,
    decoys: [],
    stepShoot: null,
  };
}