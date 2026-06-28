import { state } from "../state.js";

export const MAP_TO_ELEMENT = {
  fire: "fire",
  ice: "ice",
  earth: "earth",
  wind: "wind",
  thunder: "lightning",
};

export const MAP_UNLOCK_ORDER = ["fire", "ice", "earth", "wind", "thunder"];

const DEFAULT_MAPS = [
  { id: "fire", unlocked: true },
  { id: "ice", unlocked: false },
  { id: "earth", unlocked: false },
  { id: "wind", unlocked: false },
  { id: "thunder", unlocked: false },
];

export function mergeMapProgress(savedMaps) {
  if (!Array.isArray(savedMaps)) return DEFAULT_MAPS.map((m) => ({ ...m }));
  return DEFAULT_MAPS.map((def) => {
    const found = savedMaps.find((m) => m.id === def.id);
    return found ? { ...def, unlocked: !!found.unlocked } : { ...def };
  });
}

const ROOM_SIZE = 1000;
const GRID_COLS = 5;
const GRID_ROWS = 5;
const WALL_THICK = 56;
const DOOR_WIDTH = 220;

function roomKey(row, col) {
  return `${row},${col}`;
}

function manhattan(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function getMapElement() {
  const mapId = state.selectedMap || state.currentMapTheme || "fire";
  return MAP_TO_ELEMENT[mapId] || "fire";
}

export function getRoomCenter(room) {
  return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
}

export function getRandomPointInRoom(room, margin = 120) {
  return {
    x: room.x + margin + Math.random() * (room.w - margin * 2),
    y: room.y + margin + Math.random() * (room.h - margin * 2),
  };
}

function addWallRect(walls, x, y, w, h) {
  if (w > 4 && h > 4) walls.push({ x, y, w, h });
}

function addHorizontalWall(walls, x, y, totalW, hasDoor) {
  if (!hasDoor) {
    addWallRect(walls, x, y, totalW, WALL_THICK);
    return;
  }
  const doorStart = x + totalW / 2 - DOOR_WIDTH / 2;
  addWallRect(walls, x, y, doorStart - x, WALL_THICK);
  addWallRect(walls, doorStart + DOOR_WIDTH, y, x + totalW - (doorStart + DOOR_WIDTH), WALL_THICK);
}

function addVerticalWall(walls, x, y, totalH, hasDoor) {
  if (!hasDoor) {
    addWallRect(walls, x, y, WALL_THICK, totalH);
    return;
  }
  const doorStart = y + totalH / 2 - DOOR_WIDTH / 2;
  addWallRect(walls, x, y, WALL_THICK, doorStart - y);
  addWallRect(walls, x, doorStart + DOOR_WIDTH, WALL_THICK, y + totalH - (doorStart + DOOR_WIDTH));
}

function buildWalls(rooms, activeGrid) {
  const walls = [];
  const roomAt = (row, col) => rooms.find((r) => r.row === row && r.col === col);

  for (const room of rooms) {
    const northActive = room.row > 0 && activeGrid[room.row - 1][room.col];
    const southActive = room.row < GRID_ROWS - 1 && activeGrid[room.row + 1][room.col];
    const westActive = room.col > 0 && activeGrid[room.row][room.col - 1];
    const eastActive = room.col < GRID_COLS - 1 && activeGrid[room.row][room.col + 1];

    addHorizontalWall(walls, room.x, room.y, room.w, northActive && room.doors.n);
    addHorizontalWall(walls, room.x, room.y + room.h - WALL_THICK, room.w, southActive && room.doors.s);
    addVerticalWall(walls, room.x, room.y, room.h, westActive && room.doors.w);
    addVerticalWall(walls, room.x + room.w - WALL_THICK, room.y, room.h, eastActive && room.doors.e);
  }

  return walls;
}

function assignRoomTypes(rooms, startRoom) {
  startRoom.type = "start";
  startRoom.cleared = true;

  let farthest = startRoom;
  let maxDist = 0;
  for (const room of rooms) {
    const d = manhattan(room, startRoom);
    if (d > maxDist) {
      maxDist = d;
      farthest = room;
    }
  }
  farthest.type = "boss_gate";

  const pool = rooms.filter((r) => r.type === "combat");
  const byDistance = [...pool].sort((a, b) => manhattan(b, startRoom) - manhattan(a, startRoom));

  if (byDistance[0]) byDistance[0].type = "puzzle";

  const swarmRooms = byDistance.filter((r) => r.type === "combat").slice(0, 3);
  swarmRooms.forEach((r) => {
    r.type = "swarm";
  });

  const captureRooms = byDistance.filter((r) => r.type === "combat").slice(0, 2);
  captureRooms.forEach((r) => {
    r.type = "capture";
  });

  const treasureRooms = byDistance.filter((r) => r.type === "combat").slice(0, 2);
  treasureRooms.forEach((r) => {
    r.type = "treasure";
  });
}

export function generateDungeon(level = 1) {
  const activeGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(false));
  const doors = {};
  const startRow = 2;
  const startCol = 0;
  const targetRooms = Math.min(14, 9 + Math.floor(level / 2));

  activeGrid[startRow][startCol] = true;
  const stack = [[startRow, startCol]];
  let carved = 1;

  while (stack.length && carved < targetRooms) {
    const [row, col] = stack[stack.length - 1];
    const options = [
      [-1, 0, "n", "s"],
      [1, 0, "s", "n"],
      [0, -1, "w", "e"],
      [0, 1, "e", "w"],
    ].filter(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      return nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS && !activeGrid[nr][nc];
    });

    if (!options.length) {
      stack.pop();
      continue;
    }

    const pick = options[Math.floor(Math.random() * options.length)];
    const [dr, dc, dir, opp] = pick;
    const nr = row + dr;
    const nc = col + dc;

    activeGrid[nr][nc] = true;
    carved++;

    const fromKey = roomKey(row, col);
    const toKey = roomKey(nr, nc);
    if (!doors[fromKey]) doors[fromKey] = { n: false, s: false, e: false, w: false };
    if (!doors[toKey]) doors[toKey] = { n: false, s: false, e: false, w: false };
    doors[fromKey][dir] = true;
    doors[toKey][opp] = true;

    stack.push([nr, nc]);
  }

  const rooms = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!activeGrid[row][col]) continue;
      const key = roomKey(row, col);
      rooms.push({
        id: `r_${col}_${row}`,
        col,
        row,
        x: col * ROOM_SIZE,
        y: row * ROOM_SIZE,
        w: ROOM_SIZE,
        h: ROOM_SIZE,
        type: "combat",
        cleared: false,
        visited: false,
        enemySpawned: false,
        doors: doors[key] || { n: false, s: false, e: false, w: false },
      });
    }
  }

  const startRoom = rooms.find((r) => r.row === startRow && r.col === startCol) || rooms[0];
  assignRoomTypes(rooms, startRoom);

  state.dungeon = {
    roomSize: ROOM_SIZE,
    cols: GRID_COLS,
    rows: GRID_ROWS,
    wallThick: WALL_THICK,
    rooms,
    walls: buildWalls(rooms, activeGrid),
    startRoomId: startRoom.id,
    activeGrid,
  };

  return state.dungeon;
}

export function clearDungeon() {
  state.dungeon = null;
}

export function getStartSpawnPosition() {
  const room = state.dungeon?.rooms?.find((r) => r.id === state.dungeon.startRoomId);
  if (!room) return { x: 500, y: 500 };
  return getRoomCenter(room);
}

export function getBossGateRoom() {
  return state.dungeon?.rooms?.find((r) => r.type === "boss_gate") || null;
}

export function getDungeonRoomByType(type) {
  return state.dungeon?.rooms?.find((r) => r.type === type) || null;
}

export function getCurrentRoom(x, y) {
  if (!state.dungeon) return null;
  const pad = WALL_THICK + 8;
  for (const room of state.dungeon.rooms) {
    if (
      x >= room.x + pad &&
      x <= room.x + room.w - pad &&
      y >= room.y + pad &&
      y <= room.y + room.h - pad
    ) {
      return room;
    }
  }
  return null;
}

export function countElementalsInRoom(room) {
  if (!room || !state.elementalEnemies) return 0;
  const pad = 40;
  return state.elementalEnemies.filter(
    (e) =>
      e.x >= room.x + pad &&
      e.x <= room.x + room.w - pad &&
      e.y >= room.y + pad &&
      e.y <= room.y + room.h - pad,
  ).length;
}

export function resolveDungeonCollision(entity, radius) {
  if (!state.dungeon?.walls?.length || state.isBossLevel || state.bossArenaMode) return;

  for (const wall of state.dungeon.walls) {
    const closestX = Math.max(wall.x, Math.min(entity.x, wall.x + wall.w));
    const closestY = Math.max(wall.y, Math.min(entity.y, wall.y + wall.h));
    const dx = entity.x - closestX;
    const dy = entity.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius) {
      if (distSq === 0) {
        entity.x += radius;
        continue;
      }
      const d = Math.sqrt(distSq);
      const push = radius - d;
      entity.x += (dx / d) * push;
      entity.y += (dy / d) * push;
    }
  }
}

export function placeStageObjectives() {
  if (!state.dungeon) return;

  const swarmRooms = state.dungeon.rooms.filter((r) => r.type === "swarm");
  state.swarmZones = swarmRooms.map((room, i) => {
    const center = getRoomCenter(room);
    return {
      id: `swarm_${state.currentLevel}_${i}_${Date.now()}`,
      x: center.x,
      y: center.y,
      radius: 280,
      requiredKills: 12 + state.currentLevel * 4,
      currentKills: 0,
      isCompleted: false,
      active: false,
      spawnedLocalGhosts: false,
      roomId: room.id,
    };
  });

  const captureRooms = state.dungeon.rooms.filter((r) => r.type === "capture");
  state.capturePoints = captureRooms.map((room) => {
    const center = getRoomCenter(room);
    return {
      x: center.x,
      y: center.y,
      radius: 520,
      progress: 0,
      state: "idle",
      roomId: room.id,
    };
  });

  state.crates = [];
  const treasureRooms = state.dungeon.rooms.filter((r) => r.type === "treasure");
  const crateRooms = treasureRooms.length ? treasureRooms : state.dungeon.rooms.filter((r) => r.type === "combat").slice(0, 2);
  crateRooms.forEach((room) => {
    for (let i = 0; i < 3; i++) {
      spawnCrateInRoom(room);
    }
  });
}

function spawnCrateInRoom(room) {
  const maxCrates = 12;
  if (state.crates.length >= maxCrates) return;

  const point = getRandomPointInRoom(room, 90);
  const rewards = ["GOLD", "XP", "FIRE_RATE", "HP_REGEN"];
  const type = rewards[Math.floor(Math.random() * rewards.length)];
  const hp = 1 + Math.floor(Math.random() * 5);

  state.crates.push({
    id: `crate_${Date.now()}_${Math.random()}`,
    x: point.x,
    y: point.y,
    radius: 25,
    hp,
    maxHp: hp,
    type,
    roomId: room.id,
  });
}

export function spawnRoomEnemies(room) {
  const element = getMapElement();
  const count = Math.min(6, 2 + Math.floor(state.currentLevel / 2));

  for (let i = 0; i < count; i++) {
    const point = getRandomPointInRoom(room, 100);
    spawnElementalEnemyAt(point.x, point.y, element);
  }
}

function spawnElementalEnemyAt(x, y, element) {
  state.elementalEnemies.push({
    x,
    y,
    radius: 14,
    hp: 1,
    speed: 2,
    element,
    state: "idle",
    aggroRange: 500,
    attackRange: 250,
    cooldown: 0,
    roomId: getCurrentRoom(x, y)?.id || null,
  });
}

export function updateDungeonRoomState(player) {
  if (!state.dungeon || state.isBossLevel || state.bossArenaMode) return;

  const room = getCurrentRoom(player.x, player.y);
  if (!room) return;

  if (!room.visited) {
    room.visited = true;
    const labels = {
      start: "Điểm xuất phát",
      combat: "Phòng chiến đấu",
      swarm: "Khu bầy đàn",
      puzzle: "Phòng giải đố",
      capture: "Điểm chiếm đóng",
      treasure: "Kho báu",
      boss_gate: "Cổng Boss",
    };
    state.floatingTexts.push({
      x: player.x,
      y: player.y - 80,
      text: labels[room.type] || "Phòng mới",
      color: "#00ffcc",
      size: 22,
      life: 120,
      opacity: 1,
    });
  }

  const spawnTypes = new Set(["combat", "swarm", "treasure"]);
  if (spawnTypes.has(room.type) && !room.enemySpawned) {
    room.enemySpawned = true;
    spawnRoomEnemies(room);
  }

  if (room.type !== "start" && room.enemySpawned) {
    const alive = countElementalsInRoom(room);
    if (alive === 0 && !room.cleared) {
      room.cleared = true;
    }
  }
}

export function unlockNextMap(bossType) {
  const normalized = bossType === "lightning" ? "thunder" : bossType;
  const idx = MAP_UNLOCK_ORDER.indexOf(normalized);
  if (idx < 0 || idx >= MAP_UNLOCK_ORDER.length - 1) return false;

  const nextId = MAP_UNLOCK_ORDER[idx + 1];
  const map = state.maps.find((m) => m.id === nextId);
  if (!map || map.unlocked) return false;

  map.unlocked = true;
  return nextId;
}

const ROOM_FLOOR_TINT = {
  fire: "rgba(255, 90, 30, 0.06)",
  ice: "rgba(80, 180, 255, 0.06)",
  earth: "rgba(180, 130, 70, 0.07)",
  wind: "rgba(80, 255, 200, 0.05)",
  thunder: "rgba(255, 220, 80, 0.06)",
};

const WALL_COLORS = {
  fire: { fill: "#3a1810", stroke: "#ff6622", glow: "rgba(255,100,30,0.35)" },
  ice: { fill: "#102638", stroke: "#66ccff", glow: "rgba(100,200,255,0.3)" },
  earth: { fill: "#2a2018", stroke: "#b88844", glow: "rgba(180,130,70,0.28)" },
  wind: { fill: "#102824", stroke: "#55ffcc", glow: "rgba(80,255,200,0.28)" },
  thunder: { fill: "#282010", stroke: "#ffee55", glow: "rgba(255,220,80,0.32)" },
};

export function drawDungeon(ctx) {
  const dungeon = state.dungeon;
  if (!dungeon || state.isBossLevel || state.bossArenaMode) return;

  const theme = state.currentMapTheme || "fire";
  const wallStyle = WALL_COLORS[theme] || WALL_COLORS.fire;
  const floorTint = ROOM_FLOOR_TINT[theme] || ROOM_FLOOR_TINT.fire;
  const cx = state.camera.x;
  const cy = state.camera.y;
  const cw = state.camera.width;
  const ch = state.camera.height;

  ctx.save();

  for (const room of dungeon.rooms) {
    if (
      room.x + room.w < cx - 40 ||
      room.x > cx + cw + 40 ||
      room.y + room.h < cy - 40 ||
      room.y > cy + ch + 40
    ) {
      continue;
    }

    ctx.fillStyle = floorTint;
    ctx.fillRect(room.x + WALL_THICK, room.y + WALL_THICK, room.w - WALL_THICK * 2, room.h - WALL_THICK * 2);

    if (room.visited) {
      ctx.strokeStyle = room.cleared ? "rgba(0,255,180,0.12)" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = 2;
      ctx.strokeRect(room.x + WALL_THICK + 6, room.y + WALL_THICK + 6, room.w - WALL_THICK * 2 - 12, room.h - WALL_THICK * 2 - 12);
    }

    if (room.type === "boss_gate") {
      const center = getRoomCenter(room);
      ctx.fillStyle = "rgba(180, 0, 255, 0.08)";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 120, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const wall of dungeon.walls) {
    if (
      wall.x + wall.w < cx - 20 ||
      wall.x > cx + cw + 20 ||
      wall.y + wall.h < cy - 20 ||
      wall.y > cy + ch + 20
    ) {
      continue;
    }

    ctx.fillStyle = wallStyle.fill;
    ctx.strokeStyle = wallStyle.stroke;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = wallStyle.glow;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.w - 1, wall.h - 1);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

export function drawDungeonMinimap(ctx, mmX, mmY, mmSize) {
  const dungeon = state.dungeon;
  if (!dungeon) return;

  const scaleX = mmSize / state.world.width;
  const scaleY = mmSize / state.world.height;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;

  for (const room of dungeon.rooms) {
    const rx = mmX + room.x * scaleX;
    const ry = mmY + room.y * scaleY;
    const rw = room.w * scaleX;
    const rh = room.h * scaleY;
    ctx.strokeRect(rx, ry, rw, rh);

    if (room.cleared) {
      ctx.fillStyle = "rgba(0,255,180,0.12)";
      ctx.fillRect(rx, ry, rw, rh);
    } else if (room.visited) {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(rx, ry, rw, rh);
    }
  }

  ctx.restore();
}
