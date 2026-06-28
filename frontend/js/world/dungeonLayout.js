import { state } from "../state.js";
import { UPGRADES } from "../config.js";
import { spawnMiniBoss } from "./element.js";
import { buildStorySigns, drawStorySigns } from "./storyLore.js";

export const MAP_TO_ELEMENT = {
  fire: "fire",
  ice: "ice",
  earth: "earth",
  wind: "wind",
  thunder: "lightning",
  omni: "omni",
};

export const MAP_UNLOCK_ORDER = ["fire", "ice", "earth", "wind", "thunder"];

const DEFAULT_MAPS = [
  { id: "fire", unlocked: true },
  { id: "ice", unlocked: false },
  { id: "earth", unlocked: false },
  { id: "wind", unlocked: false },
  { id: "thunder", unlocked: false },
  { id: "omni", unlocked: false },
];

export function mergeMapProgress(savedMaps) {
  if (!Array.isArray(savedMaps)) return DEFAULT_MAPS.map((m) => ({ ...m }));
  return DEFAULT_MAPS.map((def) => {
    const found = savedMaps.find((m) => m.id === def.id);
    return found ? { ...def, unlocked: !!found.unlocked } : { ...def };
  });
}

const ROOM_SIZE = 1000;
const GRID_COLS = 3;
const GRID_ROWS = 3;
const WALL_THICK = 52;
const DOOR_WIDTH = 200;

export const ROOM_LABELS = {
  start: "Điểm xuất phát",
  combat: "Phòng chiến đấu",
  swarm: "Khu bầy đàn",
  puzzle: "Phòng giải đố",
  capture: "Cứ điểm chiếm đóng",
  boss_gate: "Cổng Boss",
  heal: "Phòng hồi phục",
  upgrade: "Phòng nâng cấp",
  treasure: "Kho báu",
};

function roomKey(row, col) {
  return `${row},${col}`;
}

function manhattan(a, b) {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function getNeighbors(room, rooms) {
  const out = [];
  const deltas = [
    [-1, 0, "n"],
    [1, 0, "s"],
    [0, -1, "w"],
    [0, 1, "e"],
  ];
  for (const [dr, dc, dir] of deltas) {
    if (!room.doors[dir]) continue;
    const other = rooms.find((r) => r.row === room.row + dr && r.col === room.col + dc);
    if (other) out.push(other);
  }
  return out;
}

function computeBfsDistances(startRoom, rooms) {
  const dist = new Map();
  const queue = [startRoom];
  dist.set(startRoom.id, 0);
  while (queue.length) {
    const cur = queue.shift();
    const d = dist.get(cur.id);
    for (const nb of getNeighbors(cur, rooms)) {
      if (dist.has(nb.id)) continue;
      dist.set(nb.id, d + 1);
      queue.push(nb);
    }
  }
  for (const room of rooms) {
    room.bfsDist = dist.get(room.id) ?? 99;
  }
  return dist;
}

export function getMapElement() {
  const mapId = state.selectedMap || state.currentMapTheme || "fire";
  if (mapId === "omni") {
    const pool = ["fire", "ice", "lightning", "wind", "earth"];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return MAP_TO_ELEMENT[mapId] || "fire";
}

export function getRoomCenter(room) {
  return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
}

export function getRandomPointInRoom(room, margin = 100) {
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
  computeBfsDistances(startRoom, rooms);
  startRoom.type = "start";
  startRoom.cleared = true;

  const sorted = [...rooms].sort((a, b) => b.bfsDist - a.bfsDist);
  const bossRoom = sorted[0];
  bossRoom.type = "boss_gate";

  const pathRooms = rooms
    .filter((r) => r !== startRoom && r !== bossRoom)
    .sort((a, b) => a.bfsDist - b.bfsDist);

  const cap1 = pathRooms.find((r) => r.bfsDist === 1) || pathRooms[0];
  if (cap1) {
    cap1.type = "capture";
    cap1.captureOrder = 1;
  }

  const cap2 = pathRooms.find((r) => r.bfsDist === 2 && r !== cap1) || pathRooms.find((r) => r !== cap1);
  if (cap2 && cap2 !== cap1) {
    cap2.type = "capture";
    cap2.captureOrder = 2;
  }

  const puzzleRoom = pathRooms.find((r) => r !== cap1 && r !== cap2 && r.bfsDist >= 2);
  if (puzzleRoom) puzzleRoom.type = "puzzle";

  let remaining = rooms.filter((r) => r.type === "combat");
  remaining.slice(0, 2).forEach((r) => { r.type = "swarm"; });
  remaining = rooms.filter((r) => r.type === "combat");
  if (remaining[0]) remaining[0].type = "heal";
  remaining = rooms.filter((r) => r.type === "combat");
  if (remaining[0]) remaining[0].type = "upgrade";
  remaining = rooms.filter((r) => r.type === "combat");
  if (remaining[0]) remaining[0].type = "treasure";
}

export function generateDungeon(level = 1) {
  state.world.width = 3000;
  state.world.height = 3000;

  const activeGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(false));
  const doors = {};
  const startRow = 1;
  const startCol = 0;
  const targetRooms = 7 + Math.min(2, Math.floor(level / 3));

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
        doors: doors[roomKey(row, col)] || { n: false, s: false, e: false, w: false },
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
  state.healStations = [];
  state.dungeonUpgradePedestals = [];
  state.storySigns = [];
  state.storyToast = null;
}

export function getStartSpawnPosition() {
  const room = state.dungeon?.rooms?.find((r) => r.id === state.dungeon.startRoomId);
  if (!room) return { x: 500, y: 1500 };
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

const LOCKED_ROOM_TYPES = new Set(["combat", "swarm", "treasure", "puzzle", "capture"]);

export function roomRequiresClear(room) {
  return LOCKED_ROOM_TYPES.has(room?.type);
}

export function refreshRoomClearState(room) {
  if (!room || room.cleared) return;

  switch (room.type) {
    case "combat":
    case "treasure":
      if (room.enemySpawned && countElementalsInRoom(room) === 0) room.cleared = true;
      break;
    case "swarm": {
      const zone = state.swarmZones?.find((z) => z.roomId === room.id);
      if (room.enemySpawned && countElementalsInRoom(room) === 0 && zone?.isCompleted) {
        room.cleared = true;
      }
      break;
    }
    case "puzzle":
      if (state.currentPuzzle?.solved === true) room.cleared = true;
      break;
    case "capture": {
      const cp = state.capturePoints?.find((c) => c.roomId === room.id);
      if (cp?.state === "completed") room.cleared = true;
      break;
    }
    default:
      break;
  }

  if (room.cleared && !room._clearAnnounced) {
    room._clearAnnounced = true;
    const c = getRoomCenter(room);
    state.floatingTexts.push({
      x: c.x,
      y: c.y - 60,
      text: "✔ Phòng đã an toàn — cửa mở!",
      color: "#00ffcc",
      size: 20,
      life: 150,
      opacity: 1,
    });
  }
}

export function isRoomExitAllowed(room) {
  if (!room || !roomRequiresClear(room)) return true;
  if (room.type === "capture") {
    const cp = state.capturePoints?.find((c) => c.roomId === room.id);
    if (cp?.state === "locked") return true;
  }
  refreshRoomClearState(room);
  return !!room.cleared;
}

function getDoorGateRects(room) {
  if (!roomRequiresClear(room) || isRoomExitAllowed(room)) return [];

  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  const hw = DOOR_WIDTH / 2;
  const t = WALL_THICK;
  const gates = [];

  if (room.doors.n) gates.push({ x: cx - hw, y: room.y, w: DOOR_WIDTH, h: t + 12 });
  if (room.doors.s) gates.push({ x: cx - hw, y: room.y + room.h - t - 12, w: DOOR_WIDTH, h: t + 12 });
  if (room.doors.w) gates.push({ x: room.x, y: cy - hw, w: t + 12, h: DOOR_WIDTH });
  if (room.doors.e) gates.push({ x: room.x + room.w - t - 12, y: cy - hw, w: t + 12, h: DOOR_WIDTH });

  return gates;
}

function pushOutOfRect(entity, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(entity.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(entity.y, rect.y + rect.h));
  const dx = entity.x - closestX;
  const dy = entity.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq < radius * radius) {
    if (distSq === 0) {
      entity.y += radius;
      return;
    }
    const d = Math.sqrt(distSq);
    entity.x += (dx / d) * (radius - d + 1);
    entity.y += (dy / d) * (radius - d + 1);
  }
}

let _doorBlockCooldown = 0;

export function resolveDoorGates(entity, radius) {
  if (!state.dungeon?.rooms || state.isBossLevel || state.bossArenaMode) return;

  let blocked = false;

  for (const room of state.dungeon.rooms) {
    if (!roomRequiresClear(room) || isRoomExitAllowed(room)) continue;
    for (const gate of getDoorGateRects(room)) {
      const prevX = entity.x;
      const prevY = entity.y;
      pushOutOfRect(entity, radius, gate);
      if (Math.hypot(entity.x - prevX, entity.y - prevY) > 0.5) blocked = true;
    }
  }

  if (blocked && entity === state.player) {
    if (_doorBlockCooldown <= 0) {
      _doorBlockCooldown = 90;
      state.floatingTexts.push({
        x: entity.x,
        y: entity.y - 70,
        text: "🔒 Dọn sạch phòng trước khi rời đi!",
        color: "#ff6644",
        size: 18,
        life: 100,
        opacity: 1,
      });
    }
  }
  if (_doorBlockCooldown > 0) _doorBlockCooldown--;
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
      entity.x += (dx / d) * (radius - d);
      entity.y += (dy / d) * (radius - d);
    }
  }
}

function createCapturePoint(room, order) {
  const center = getRoomCenter(room);
  const id = `cp_${order}_${room.id}`;
  const cp = {
    id,
    order,
    x: center.x,
    y: center.y,
    radius: 160,
    maxRadius: 160,
    minRadius: 55,
    progress: 0,
    totalProgress: 260,
    type: order === 1 ? "fortress" : "shrine",
    state: order === 1 ? "guarding" : "locked",
    miniBossId: `${id}_boss`,
    lastPulseTime: 0,
    laserAngle: 0,
    lastGhostAttractTime: 0,
    rewardType: ["NUKE", "GOD_MODE", "SATELLITE", "RARE_TICKET", "EPIC_TICKET"][
      Math.floor(Math.random() * 5)
    ],
    roomId: room.id,
  };

  const bossPt = getRandomPointInRoom(room, 120);
  if (order === 1) {
    spawnMiniBoss(bossPt.x, bossPt.y, cp.miniBossId);
  }
  return cp;
}

function setupHealRoom(room) {
  const center = getRoomCenter(room);
  if (!state.healStations) state.healStations = [];
  const offsets = [
    { ox: -140, oy: 0 },
    { ox: 140, oy: 0 },
    { ox: 0, oy: 120 },
  ];
  offsets.forEach((off, i) => {
    state.healStations.push({
      id: `heal_${room.id}_${i}`,
      x: center.x + off.ox,
      y: center.y + off.oy,
      radius: 36,
      healAmount: 2,
      used: false,
      roomId: room.id,
    });
  });
}

function setupUpgradeRoom(room) {
  const center = getRoomCenter(room);
  const picks = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
  if (!state.dungeonUpgradePedestals) state.dungeonUpgradePedestals = [];

  const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
  picks.forEach((up, i) => {
    state.dungeonUpgradePedestals.push({
      id: `upg_${room.id}_${up.id}`,
      x: center.x + Math.cos(angles[i]) * 200,
      y: center.y + Math.sin(angles[i]) * 200,
      radius: 40,
      upgrade: up,
      charge: 0,
      taken: false,
      roomId: room.id,
    });
  });
}

export function placeStageObjectives() {
  if (!state.dungeon) return;

  state.healStations = [];
  state.dungeonUpgradePedestals = [];

  const swarmRooms = state.dungeon.rooms.filter((r) => r.type === "swarm");
  state.swarmZones = swarmRooms.map((room, i) => {
    const center = getRoomCenter(room);
    return {
      id: `swarm_${state.currentLevel}_${i}_${Date.now()}`,
      x: center.x,
      y: center.y,
      radius: 220,
      requiredKills: 10 + state.currentLevel * 3,
      currentKills: 0,
      isCompleted: false,
      active: false,
      spawnedLocalGhosts: false,
      roomId: room.id,
    };
  });

  const captureRooms = state.dungeon.rooms
    .filter((r) => r.type === "capture")
    .sort((a, b) => (a.captureOrder || 0) - (b.captureOrder || 0));

  state.capturePoints = captureRooms.map((room) =>
    createCapturePoint(room, room.captureOrder || 1),
  );

  state.crates = [];
  const treasureRooms = state.dungeon.rooms.filter((r) => r.type === "treasure");
  treasureRooms.forEach((room) => {
    for (let i = 0; i < 4; i++) spawnCrateInRoom(room);
  });

  state.dungeon.rooms.filter((r) => r.type === "heal").forEach(setupHealRoom);
  state.dungeon.rooms.filter((r) => r.type === "upgrade").forEach(setupUpgradeRoom);

  const mapId = state.selectedMap || state.currentMapTheme || "fire";
  state.storySigns = buildStorySigns(state.dungeon.rooms, mapId);
  state.storyLog = [];
  state.storyToast = null;
}

function spawnCrateInRoom(room, typeOverride = null) {
  if (state.crates.length >= 16) return;
  const point = getRandomPointInRoom(room, 90);
  const rewards = ["GOLD", "XP", "FIRE_RATE", "HP_REGEN"];
  const type = typeOverride || rewards[Math.floor(Math.random() * rewards.length)];
  const hp = type === "HEAL" ? 1 : 1 + Math.floor(Math.random() * 4);

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

function spawnElementalEnemyAt(x, y, element) {
  state.elementalEnemies.push({
    x,
    y,
    radius: 14,
    hp: 1,
    speed: 2,
    element,
    state: "idle",
    aggroRange: 420,
    attackRange: 220,
    cooldown: 0,
    roomId: getCurrentRoom(x, y)?.id || null,
  });
}

export function spawnRoomEnemies(room) {
  const count = Math.min(5, 2 + Math.floor(state.currentLevel / 2));
  for (let i = 0; i < count; i++) {
    const element = getMapElement();
    const point = getRandomPointInRoom(room, 100);
    spawnElementalEnemyAt(point.x, point.y, element);
  }
}

export function updateHealStations() {
  if (!state.healStations || state.isBossLevel) return;
  const player = state.player;
  if (!player) return;

  for (const hs of state.healStations) {
    if (hs.used) continue;
    const dx = player.x - hs.x;
    const dy = player.y - hs.y;
    if (Math.hypot(dx, dy) < hs.radius + player.radius) {
      hs.charge = (hs.charge || 0) + 1;
      if (hs.charge >= 60) {
        player.hp = Math.min(player.maxHp, player.hp + hs.healAmount);
        hs.used = true;
        state.floatingTexts.push({
          x: hs.x,
          y: hs.y - 50,
          text: `+${hs.healAmount} HP`,
          color: "#66ffaa",
          size: 20,
          life: 90,
          opacity: 1,
        });
      }
    } else {
      hs.charge = Math.max(0, (hs.charge || 0) - 1);
    }
  }
}

export function updateUpgradePedestals() {
  if (!state.dungeonUpgradePedestals || state.isBossLevel) return;
  const player = state.player;
  if (!player) return;

  const room = getCurrentRoom(player.x, player.y);
  if (!room || room.type !== "upgrade") return;

  for (const ped of state.dungeonUpgradePedestals) {
    if (ped.taken || ped.roomId !== room.id) continue;
    const dx = player.x - ped.x;
    const dy = player.y - ped.y;
    if (Math.hypot(dx, dy) < ped.radius + player.radius) {
      ped.charge = (ped.charge || 0) + 1;
      if (ped.charge >= 75) {
        ped.upgrade.action(player);
        ped.taken = true;
        room.cleared = true;
        state.floatingTexts.push({
          x: ped.x,
          y: ped.y - 60,
          text: `⬆ ${ped.upgrade.name}`,
          color: "#ffd700",
          size: 22,
          life: 140,
          opacity: 1,
        });
        import("../ui.js").then((m) => m.updateHealthUI?.());
      }
    } else {
      ped.charge = Math.max(0, (ped.charge || 0) - 2);
    }
  }
}

export function updateDungeonRoomState(player) {
  if (!state.dungeon || state.isBossLevel || state.bossArenaMode) return;

  const room = getCurrentRoom(player.x, player.y);
  if (!room) return;

  if (!room.visited) {
    room.visited = true;
    state.floatingTexts.push({
      x: player.x,
      y: player.y - 80,
      text: ROOM_LABELS[room.type] || "Phòng mới",
      color: "#00ffcc",
      size: 22,
      life: 120,
      opacity: 1,
    });
    if (room.type === "capture" && room.captureOrder === 2) {
      const cp1 = state.capturePoints?.find((cp) => cp.order === 1);
      if (cp1?.state !== "completed") {
        state.floatingTexts.push({
          x: player.x,
          y: player.y - 110,
          text: "⚠ Chiếm Cứ điểm 1 trước!",
          color: "#ffaa44",
          size: 18,
          life: 150,
          opacity: 1,
        });
      }
    }
  }

  const spawnTypes = new Set(["combat", "swarm", "treasure"]);
  if (spawnTypes.has(room.type) && !room.enemySpawned) {
    room.enemySpawned = true;
    spawnRoomEnemies(room);
  }

  if (room.type === "heal" && room.enemySpawned === false) {
    room.enemySpawned = true;
  }
  if (room.type === "upgrade" && room.enemySpawned === false) {
    room.enemySpawned = true;
  }

  if (["combat", "swarm", "treasure"].includes(room.type) && room.enemySpawned) {
    refreshRoomClearState(room);
  }
  if (room.type === "puzzle" || room.type === "capture") {
    refreshRoomClearState(room);
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

/** Mở map Trung Tâm Trạm sau khi hạ Lôi Thần (boss cuối chuỗi nguyên tố) */
export function unlockOmniMap() {
  const map = state.maps.find((m) => m.id === "omni");
  if (!map || map.unlocked) return false;
  map.unlocked = true;
  return true;
}

const ROOM_FLOOR_TINT = {
  start: "rgba(100, 255, 200, 0.05)",
  heal: "rgba(80, 255, 120, 0.08)",
  upgrade: "rgba(255, 220, 80, 0.08)",
  treasure: "rgba(255, 180, 60, 0.07)",
  puzzle: "rgba(180, 120, 255, 0.07)",
  capture: "rgba(255, 100, 80, 0.07)",
  swarm: "rgba(255, 80, 40, 0.07)",
  boss_gate: "rgba(180, 0, 255, 0.08)",
  combat: null,
};

const ROOM_FLOOR_THEME = {
  fire: "rgba(255, 90, 30, 0.05)",
  ice: "rgba(80, 180, 255, 0.05)",
  earth: "rgba(180, 130, 70, 0.06)",
  wind: "rgba(80, 255, 200, 0.04)",
  thunder: "rgba(255, 220, 80, 0.05)",
  omni: "rgba(200, 120, 255, 0.06)",
};

const WALL_COLORS = {
  fire: { fill: "#3a1810", stroke: "#ff6622", glow: "rgba(255,100,30,0.35)" },
  ice: { fill: "#102638", stroke: "#66ccff", glow: "rgba(100,200,255,0.3)" },
  earth: { fill: "#2a2018", stroke: "#b88844", glow: "rgba(180,130,70,0.28)" },
  wind: { fill: "#102824", stroke: "#55ffcc", glow: "rgba(80,255,200,0.28)" },
  thunder: { fill: "#282010", stroke: "#ffee55", glow: "rgba(255,220,80,0.32)" },
  omni: { fill: "#1a1028", stroke: "#ffd080", glow: "rgba(255,180,100,0.38)" },
};

const ROOM_ICONS = {
  heal: "💚",
  upgrade: "⬆",
  treasure: "📦",
  puzzle: "🧩",
  capture: "🚩",
  swarm: "💀",
  boss_gate: "👹",
};

export function drawDungeon(ctx) {
  const dungeon = state.dungeon;
  if (!dungeon || state.isBossLevel || state.bossArenaMode) return;

  const theme = state.currentMapTheme || "fire";
  const wallStyle = WALL_COLORS[theme] || WALL_COLORS.fire;
  const themeTint = ROOM_FLOOR_THEME[theme] || ROOM_FLOOR_THEME.fire;
  const cx = state.camera.x;
  const cy = state.camera.y;
  const cw = state.camera.width;
  const ch = state.camera.height;

  ctx.save();

  for (const room of dungeon.rooms) {
    if (room.x + room.w < cx - 40 || room.x > cx + cw + 40 || room.y + room.h < cy - 40 || room.y > cy + ch + 40) {
      continue;
    }

    const typeTint = ROOM_FLOOR_TINT[room.type] || themeTint;
    ctx.fillStyle = typeTint;
    ctx.fillRect(room.x + WALL_THICK, room.y + WALL_THICK, room.w - WALL_THICK * 2, room.h - WALL_THICK * 2);

    if (room.visited) {
      ctx.strokeStyle = room.cleared ? "rgba(0,255,180,0.15)" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = 2;
      ctx.strokeRect(room.x + WALL_THICK + 6, room.y + WALL_THICK + 6, room.w - WALL_THICK * 2 - 12, room.h - WALL_THICK * 2 - 12);
    }

    const icon = ROOM_ICONS[room.type];
    if (icon && room.visited) {
      const c = getRoomCenter(room);
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.35;
      ctx.fillText(icon, c.x, c.y - room.h * 0.35);
      ctx.globalAlpha = 1;
    }
  }

  for (const wall of dungeon.walls) {
    if (wall.x + wall.w < cx - 20 || wall.x > cx + cw + 20 || wall.y + wall.h < cy - 20 || wall.y > cy + ch + 20) continue;
    ctx.fillStyle = wallStyle.fill;
    ctx.strokeStyle = wallStyle.stroke;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = wallStyle.glow;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.w - 1, wall.h - 1);
    ctx.shadowBlur = 0;
  }

  drawHealStations(ctx);
  drawUpgradePedestals(ctx);
  drawLockedDoors(ctx);
  drawStorySigns(ctx);
  ctx.restore();
}

function drawLockedDoors(ctx) {
  if (!state.dungeon?.rooms) return;
  const t = state.frameCount;

  for (const room of state.dungeon.rooms) {
    if (!roomRequiresClear(room) || isRoomExitAllowed(room)) continue;
    for (const gate of getDoorGateRects(room)) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 60, 40, ${0.35 + Math.sin(t * 0.15) * 0.15})`;
      ctx.strokeStyle = "#ff6644";
      ctx.lineWidth = 2;
      ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
      ctx.strokeRect(gate.x + 0.5, gate.y + 0.5, gate.w - 1, gate.h - 1);
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffaa88";
      ctx.fillText("🔒", gate.x + gate.w / 2, gate.y + gate.h / 2 + 5);
      ctx.restore();
    }
  }
}

function drawHealStations(ctx) {
  if (!state.healStations) return;
  for (const hs of state.healStations) {
    if (hs.used) continue;
    const pct = Math.min(1, (hs.charge || 0) / 60);
    ctx.save();
    ctx.fillStyle = `rgba(80,255,140,${0.2 + pct * 0.3})`;
    ctx.beginPath();
    ctx.arc(hs.x, hs.y, hs.radius + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#66ff99";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ccffdd";
    ctx.fillText("💚", hs.x, hs.y + 8);
    ctx.font = "11px Arial";
    ctx.fillText("Hồi máu", hs.x, hs.y + hs.radius + 16);
    ctx.restore();
  }
}

function drawUpgradePedestals(ctx) {
  if (!state.dungeonUpgradePedestals) return;
  for (const ped of state.dungeonUpgradePedestals) {
    if (ped.taken) continue;
    const pct = Math.min(1, (ped.charge || 0) / 75);
    ctx.save();
    ctx.fillStyle = `rgba(255,210,80,${0.15 + pct * 0.35})`;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, ped.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffdd66";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(ped.upgrade.name, ped.x, ped.y - 6);
    ctx.fillText("Giữ để chọn", ped.x, ped.y + 10);
    ctx.restore();
  }
}

export function drawDungeonMinimap(ctx, mmX, mmY, mmSize) {
  const dungeon = state.dungeon;
  if (!dungeon) return;

  const scaleX = mmSize / state.world.width;
  const scaleY = mmSize / state.world.height;

  ctx.save();
  for (const room of dungeon.rooms) {
    const rx = mmX + room.x * scaleX;
    const ry = mmY + room.y * scaleY;
    const rw = room.w * scaleX;
    const rh = room.h * scaleY;

    const typeColors = {
      heal: "rgba(80,255,120,0.25)",
      upgrade: "rgba(255,220,80,0.25)",
      puzzle: "rgba(180,120,255,0.2)",
      capture: "rgba(255,100,80,0.2)",
      boss_gate: "rgba(180,0,255,0.25)",
      swarm: "rgba(255,80,40,0.2)",
    };
    if (typeColors[room.type]) {
      ctx.fillStyle = typeColors[room.type];
      ctx.fillRect(rx, ry, rw, rh);
    }

    ctx.strokeStyle = room.cleared ? "rgba(0,255,180,0.4)" : room.visited ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, ry, rw, rh);
  }
  ctx.restore();
}
