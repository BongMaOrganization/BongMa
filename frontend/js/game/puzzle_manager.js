import { state } from "../state.js";
import { pickPuzzleForMap, getPuzzleDef } from "./puzzles/puzzleRegistry.js";

export function initPuzzle() {
  const mapId = state.selectedMap || state.currentMapTheme || "fire";
  const def = pickPuzzleForMap(mapId);

  state.currentPuzzleType = def.id;
  state.currentPuzzle = {
    mapId,
    displayName: def.displayName,
    hint: def.hint,
    solved: false,
  };

  def.init(state.currentPuzzle);
}

export function updatePuzzle(ctx) {
  const def = getPuzzleDef(state.currentPuzzleType);
  if (!def || !state.currentPuzzle) return;
  def.update(state.currentPuzzle, ctx);
}

export function drawPuzzle(ctx) {
  const def = getPuzzleDef(state.currentPuzzleType);
  if (!def || !state.currentPuzzle) return;
  def.draw(state.currentPuzzle, ctx);
}

export function getPuzzleMinimapMarkers() {
  const def = getPuzzleDef(state.currentPuzzleType);
  if (!def || !state.currentPuzzle) return [];
  return def.getMinimapMarkers?.(state.currentPuzzle) || [];
}

export function getPuzzleHUDInfo() {
  const def = getPuzzleDef(state.currentPuzzleType);
  const puzzle = state.currentPuzzle;
  if (!def || !puzzle) {
    return { name: "🧩 Puzzle", progress: "—", hint: "", done: false };
  }

  return {
    name: def.displayName || puzzle.displayName || "🧩 Puzzle",
    progress: def.getProgress?.(puzzle) || (puzzle.solved ? "Hoàn thành" : "—"),
    hint: def.hint || puzzle.hint || "",
    done: puzzle.solved === true,
  };
}
