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

  keys: {},
  mouse: { x: 0, y: 0, clicked: false },
  loopId: null,
};
