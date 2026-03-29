export const state = {
  gameState: "MENU",
  frameCount: 0,
  scoreTime: 0,
  currentLevel: 1,
  maxFramesToSurvive: 0,
  isBossLevel: false,

  player: null,
  boss: null,
  bullets: [],
  ghosts: [],
  pastRuns: [],
  currentRunRecord: [],
  ownedCharacters: ["speedster"],
  selectedCharacter: "speedster",
  characterUpgrades: {
    spd: { count: 0, specialEffect: false },
    fire: { count: 0, specialEffect: false },
    multi: { count: 0, specialEffect: false },
    bounce: { count: 0, specialEffect: false },
    dash: { count: 0, specialEffect: false },
  },

  keys: {},
  prevKeys: {},
  mouse: { x: 0, y: 0, clicked: false },
  loopId: null,

  skillsCD: { q: 0, e: 0, r: 0 },
  activeBuffs: { q: 0, e: 0, r: 0 },

  // Added rerollCount to track reroll attempts
  rerollCount: 0,

  // Added upgrade tracking for evolution
  upgrades: {
    speed: 0,
    fireRate: 0,
    multiShot: 0,
    bounce: 0,
    dash: 0,
  },

  // Added evolution tracking for upgrades
  evolutions: {
    speed: false,
    fireRate: false,
    multiShot: false,
    bounce: false,
    dash: false,
  },

  // Added evolutionReady to track the next evolution
  evolutionReady: null,
};
