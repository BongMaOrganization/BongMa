import { state } from "../state.js";
import {
  initRunePuzzle,
  updateRunePuzzle,
  drawRunePuzzle,
  getRuneMinimapMarkers,
} from "./puzzle_rune.js";
import {
  initDominoPuzzle,
  updateDominoPuzzle,
  drawDominoPuzzle,
  getDominoMinimapMarkers,
} from "./puzzle_domino.js";

import {
  initTorchPuzzle,
  updateTorchPuzzle,
  drawTorchPuzzle,
  getTorchMinimapMarkers,
} from "./puzzle_torch.js";

import {
  initMelodyPuzzle,
  updateMelodyPuzzle,
  drawMelodyPuzzle,
  getMelodyMinimapMarkers,
} from "./puzzle_melody.js";

const PUZZLES = {
  rune: {
    init: initRunePuzzle,
    update: updateRunePuzzle,
    draw: drawRunePuzzle,
    getMinimapMarkers: getRuneMinimapMarkers,
  },
  domino: {
    init: initDominoPuzzle,
    update: updateDominoPuzzle,
    draw: drawDominoPuzzle,
    getMinimapMarkers: getDominoMinimapMarkers,
  },

  torch: {
    init: initTorchPuzzle,
    update: updateTorchPuzzle,
    draw: drawTorchPuzzle,
    getMinimapMarkers: getTorchMinimapMarkers,
  },

  melody: {
    init: initMelodyPuzzle,
    update: updateMelodyPuzzle,
    draw: drawMelodyPuzzle,
    getMinimapMarkers: getMelodyMinimapMarkers,
  },
};

export function initPuzzle() {
  const types = Object.keys(PUZZLES);
  const selected = types[Math.floor(Math.random() * types.length)];
  state.currentPuzzleType = selected;
  state.currentPuzzle = {};

  PUZZLES[selected].init(state.currentPuzzle);
}

export function updatePuzzle(ctx) {
  if (!state.currentPuzzleType) return;
  PUZZLES[state.currentPuzzleType].update(state.currentPuzzle, ctx);
}

export function drawPuzzle(ctx) {
  if (!state.currentPuzzleType) return;
  PUZZLES[state.currentPuzzleType].draw(state.currentPuzzle, ctx);
}

export function getPuzzleMinimapMarkers() {
  if (!state.currentPuzzle) return [];

  const type = state.currentPuzzleType;
  const puzzle = state.currentPuzzle;

  if (PUZZLES[type].getMinimapMarkers) {
    return PUZZLES[type].getMinimapMarkers(puzzle);
  }

  return [];
}
