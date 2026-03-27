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
  characterUpgrades: {},

  keys: {},
  prevKeys: {},
  mouse: { x: 0, y: 0, clicked: false },
  loopId: null,

  skillsCD: { q: 0, e: 0, r: 0 },
  activeBuffs: { q: 0, e: 0, r: 0 },
};
