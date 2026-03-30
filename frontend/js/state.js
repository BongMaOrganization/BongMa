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
};
