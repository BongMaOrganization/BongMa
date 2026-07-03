import { emberSequence, lavaValve } from "./firePuzzles.js";
import { frostPath, iceStatues } from "./icePuzzles.js";
import { seismicRitual, stonePillars } from "./earthPuzzles.js";
import { windTotems, cycloneOrbs } from "./windPuzzles.js";
import { lightningNodes, capacitorSurge } from "./thunderPuzzles.js";

/** Registry: 2 puzzle unique / map (10 total) */
export const MAP_PUZZLES = {
  fire: [emberSequence, lavaValve],
  ice: [frostPath, iceStatues],
  earth: [seismicRitual, stonePillars],
  wind: [windTotems, cycloneOrbs],
  thunder: [lightningNodes, capacitorSurge],
};

const ALL_PUZZLES = Object.values(MAP_PUZZLES).flat();

export const PUZZLE_BY_ID = Object.fromEntries(ALL_PUZZLES.map((p) => [p.id, p]));

export function getPuzzlesForMap(mapId) {
  return MAP_PUZZLES[mapId] || MAP_PUZZLES.fire;
}

export function pickPuzzleForMap(mapId) {
  if (mapId === "omni") {
    return ALL_PUZZLES[Math.floor(Math.random() * ALL_PUZZLES.length)];
  }
  const pool = getPuzzlesForMap(mapId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getPuzzleDef(typeId) {
  return PUZZLE_BY_ID[typeId] || null;
}
