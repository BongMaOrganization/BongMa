import { state } from "../state.js";
import { dist } from "../utils.js";
import { spawnBullet } from "./helpers.js";
import { spawnElementalZone, spawnGroundZone, pushParticles } from "../game/elementalZone.js";
import { applyMapEnemyModifier } from "../game/mapMechanics.js";
import {
  getMapElement,
  getRandomPointInRoom,
  getCurrentRoom,
  getRoomById,
  getSafeSpawnPointInRoom,
  isValidSpawnInRoom,
  moveWithDungeonCollision,
  constrainToRoomBounds,
} from "../world/dungeonLayout.js";

export const ELEMENTS = ["fire", "ice", "lightning", "wind", "earth"];

function createEnemyData(x, y, element, roomId) {
  const e = {
    x,
    y,
    radius: 14,
    hp: 1,
    speed: 2,
    element,
    state: "idle",
    aggroRange: 480,
    attackRange: 240,
    cooldown: 0,
    roomId: roomId || getCurrentRoom(x, y)?.id || null,
    moveAngle: Math.random() * Math.PI * 2,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    wanderTimer: 0,
    wanderX: x,
    wanderY: y,
    losTimer: 0,
    traitTimer: Math.floor(Math.random() * 60), // lệch pha trait giữa các quái
    burrowed: false,
  };
  applyMapEnemyModifier(e);
  return e;
}

export function spawnElementalEnemy(x, y, forcedElement = null, roomId = null) {
  const element = forcedElement || getMapElement();
  const room = roomId ? getRoomById(roomId) : getCurrentRoom(x, y);
  if (room && !isValidSpawnInRoom(room, x, y, 14)) {
    const pt = getSafeSpawnPointInRoom(room, 120);
    if (!pt) return;
    x = pt.x;
    y = pt.y;
    roomId = room.id;
  }
  state.elementalEnemies.push(createEnemyData(x, y, element, roomId));
}

export function spawnElementalEnemyInRoom(room, forcedElement = null) {
  if (!room) return;
  const point = getSafeSpawnPointInRoom(room, 120);
  if (!point) return;
  spawnElementalEnemy(point.x, point.y, forcedElement, room.id);
}

function smoothTurn(e, targetAngle, rate = 0.18) {
  let diff = targetAngle - (e.moveAngle || 0);
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  e.moveAngle = (e.moveAngle || 0) + diff * rate;
}

function moveToward(e, tx, ty, speed) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;

  smoothTurn(e, Math.atan2(dy, dx));
  const spd = speed * Math.min(1, len / 80);
  moveWithDungeonCollision(
    e,
    Math.cos(e.moveAngle) * spd,
    Math.sin(e.moveAngle) * spd,
    e.radius || 14,
  );
}

function hasLineOfSight(e, player, homeRoom) {
  if (!homeRoom || !state.dungeon?.walls?.length) return true;
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = e.x + (player.x - e.x) * t;
    const py = e.y + (player.y - e.y) * t;
    if (getCurrentRoom(px, py)?.id !== homeRoom.id) return false;
  }
  return true;
}

function updateWander(e, homeRoom) {
  e.wanderTimer = (e.wanderTimer || 0) - 1;
  if (e.wanderTimer <= 0 || dist(e.x, e.y, e.wanderX, e.wanderY) < 24) {
    const pt = getRandomPointInRoom(homeRoom, 130);
    e.wanderX = pt.x;
    e.wanderY = pt.y;
    e.wanderTimer = 90 + Math.floor(Math.random() * 90);
  }
  moveToward(e, e.wanderX, e.wanderY, e.speed * 0.45);
  constrainToRoomBounds(e, homeRoom, e.radius);
}

export function updateElementalEnemies(player) {
  if (!player || !state.elementalEnemies?.length) return;

  const playerRoom = getCurrentRoom(player.x, player.y);
  const rooms = state.dungeon?.rooms;

  for (let i = state.elementalEnemies.length - 1; i >= 0; i--) {
    const e = state.elementalEnemies[i];
    const radius = e.radius || 14;
    const homeRoom = rooms?.find((r) => r.id === e.roomId) || getCurrentRoom(e.x, e.y);

    if (!homeRoom) {
      state.elementalEnemies.splice(i, 1);
      continue;
    }

    if (!getCurrentRoom(e.x, e.y)) {
      const pt = getSafeSpawnPointInRoom(homeRoom, 100);
      if (pt) {
        e.x = pt.x;
        e.y = pt.y;
      }
    }

    const d = dist(e.x, e.y, player.x, player.y);
    const sameRoom = playerRoom && e.roomId === playerRoom.id;
    const canSee =
      sameRoom && hasLineOfSight(e, player, homeRoom);

    if (canSee && d < e.attackRange) e.state = "attack";
    else if (canSee && d < e.aggroRange) e.state = "aggro";
    else if (sameRoom && d < e.aggroRange * 1.2) e.state = "aggro";
    else e.state = "idle";

    // Trait hành vi riêng theo hệ (blink/burrow/trail/lunge/dodge)
    updateElementTrait(e, player, d, homeRoom);

    if (e.burrowed) {
      // Dưới đất: chỉ di chuyển ngầm (trong trait), không đánh, không bị bắn
      if (e.cooldown > 0) e.cooldown--;
      if (!Number.isFinite(e.hp) || e.hp <= 0) {
        spawnElementalZone(e);
        state.elementalEnemies.splice(i, 1);
      }
      continue;
    }

    if (e.state === "idle" || !sameRoom) {
      updateWander(e, homeRoom);
    } else if (e.state === "aggro") {
      const lead = 0.12;
      const tx = player.x + (player.x - e.x) * lead;
      const ty = player.y + (player.y - e.y) * lead;
      moveToward(e, tx, ty, e.speed);
      constrainToRoomBounds(e, homeRoom, radius);
    } else if (e.state === "attack") {
      const preferDist = e.attackRange * 0.72;
      if (d > preferDist + 20) {
        moveToward(e, player.x, player.y, e.speed * 1.05);
      } else if (d < preferDist - 30) {
        const away = Math.atan2(e.y - player.y, e.x - player.x);
        moveToward(
          e,
          e.x + Math.cos(away) * 80,
          e.y + Math.sin(away) * 80,
          e.speed * 0.9,
        );
      } else {
        const strafe = Math.atan2(player.y - e.y, player.x - e.x) + (Math.PI / 2) * (e.strafeDir || 1);
        moveToward(
          e,
          e.x + Math.cos(strafe) * 60,
          e.y + Math.sin(strafe) * 60,
          e.speed * 0.75,
        );
        if (Math.random() < 0.015) e.strafeDir = -(e.strafeDir || 1);
      }
      constrainToRoomBounds(e, homeRoom, radius);
      handleElementAttack(e, player);
    }

    if (e.cooldown > 0) e.cooldown--;

    if (!Number.isFinite(e.hp) || e.hp <= 0) {
      spawnElementalZone(e);
      state.elementalEnemies.splice(i, 1);
    }
  }
}

// ============================================================================
// TRAIT HÀNH VI RIÊNG THEO HỆ — mỗi map quái "đánh khác", không chỉ đổi đạn
//   🔥 fire   : lao tới (lunge) — áp sát hung hăng
//   ❄️ ice    : để lại vệt băng làm chậm khi di chuyển
//   ⚡ lightning: chớp dịch (blink) — nhảy quanh khó đoán
//   🌪️ wind   : né ngang bất chợt (dodge)
//   🪨 earth  : trồi/lặn — lặn xuống (bất khả xâm) rồi trồi gần player
// ============================================================================
function updateElementTrait(e, player, d, homeRoom) {
  e.traitTimer = (e.traitTimer || 0) - 1;
  const active = e.state === "aggro" || e.state === "attack";

  switch (e.element) {
    case "ice":
      if (e.state !== "idle" && e.traitTimer <= 0) {
        spawnGroundZone(e.x, e.y, "ice", 36, 70);
        e.traitTimer = 26;
      }
      break;

    case "lightning":
      if (active && e.traitTimer <= 0) {
        const ang =
          Math.atan2(player.y - e.y, player.x - e.x) + (Math.random() - 0.5) * 1.7;
        const hop = 110 + Math.random() * 70;
        e.x += Math.cos(ang) * hop;
        e.y += Math.sin(ang) * hop;
        if (homeRoom) constrainToRoomBounds(e, homeRoom, e.radius || 14);
        pushParticles({ x: e.x, y: e.y, color: "#ffff66", count: 10, speed: 3, life: 14, size: 2 });
        e.traitTimer = 100 + Math.floor(Math.random() * 60);
      }
      break;

    case "earth":
      if (e.burrowed) {
        moveToward(e, player.x, player.y, (e.speed || 2) * 1.8);
        if (homeRoom) constrainToRoomBounds(e, homeRoom, e.radius || 14);
        if (e.traitTimer <= 0) {
          e.burrowed = false;
          pushParticles({ x: e.x, y: e.y, color: "#996633", count: 16, speed: 3.5, life: 20, size: 3 });
          e.traitTimer = 180 + Math.floor(Math.random() * 90);
        }
      } else if (e.state !== "idle" && e.traitTimer <= 0) {
        e.burrowed = true;
        pushParticles({ x: e.x, y: e.y, color: "#996633", count: 14, speed: 3, life: 18, size: 3 });
        e.traitTimer = 55; // thời gian lặn
      }
      break;

    case "fire":
      if (e.state === "attack" && e.traitTimer <= 0 && d > 60) {
        const ang = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(ang) * 26;
        e.y += Math.sin(ang) * 26;
        if (homeRoom) constrainToRoomBounds(e, homeRoom, e.radius || 14);
        pushParticles({ x: e.x, y: e.y, color: "#ff7722", count: 6, speed: 2, life: 12, size: 2 });
        e.traitTimer = 12;
      }
      break;

    case "wind":
      if (active && e.traitTimer <= 0 && Math.random() < 0.04) {
        const side =
          Math.atan2(player.y - e.y, player.x - e.x) + (Math.PI / 2) * (e.strafeDir || 1);
        e.x += Math.cos(side) * 70;
        e.y += Math.sin(side) * 70;
        if (homeRoom) constrainToRoomBounds(e, homeRoom, e.radius || 14);
        e.traitTimer = 40;
      }
      break;
  }
}

function handleElementAttack(e, player) {
  if (e.cooldown > 0) return;

  switch (e.element) {
    case "fire":
      fireAttack(e, player);
      break;
    case "ice":
      iceAttack(e, player);
      break;
    case "lightning":
      lightningAttack(e, player);
      break;
    case "wind":
      windAttack(e, player);
      break;
    case "earth":
      earthAttack(e, player);
      break;
  }
}

function fireAttack(e, player) {
  const baseAngle = Math.atan2(player.y - e.y, player.x - e.x);
  for (let i = -1; i <= 1; i++) {
    const angle = baseAngle + i * 0.2;
    spawnBullet(
      e.x,
      e.y,
      e.x + Math.cos(angle) * 100,
      e.y + Math.sin(angle) * 100,
      false,
      1,
      "fire",
    );
  }
  e.cooldown = 60;
}

function iceAttack(e, player) {
  const baseAngle = Math.atan2(player.y - e.y, player.x - e.x);
  for (let i = -1; i <= 1; i++) {
    const angle = baseAngle + i * 0.2;
    spawnBullet(
      e.x,
      e.y,
      e.x + Math.cos(angle) * 100,
      e.y + Math.sin(angle) * 100,
      false,
      1,
    );
    const b = state.bullets[state.bullets.length - 1];
    b.style = 2;
  }
  e.cooldown = 80;
}

function lightningAttack(e, player) {
  const angle = Math.atan2(player.y - e.y, player.x - e.x);
  spawnBullet(
    e.x,
    e.y,
    e.x + Math.cos(angle) * 200,
    e.y + Math.sin(angle) * 200,
    false,
    2,
  );
  const b = state.bullets[state.bullets.length - 1];
  b.style = 3;
  b.speed *= 2;
  b.pierce = 1;
  e.cooldown = 90;
}

function windAttack(e, player) {
  const baseAngle = Math.atan2(player.y - e.y, player.x - e.x);
  for (let i = -2; i <= 2; i++) {
    const angle = baseAngle + i * 0.25;
    spawnBullet(
      e.x,
      e.y,
      e.x + Math.cos(angle) * 150,
      e.y + Math.sin(angle) * 150,
      false,
      0.5,
    );
    const b = state.bullets[state.bullets.length - 1];
    b.style = 4;
    b.speed *= 1.5;
  }
  e.cooldown = 70;
}

function earthAttack(e, player) {
  const angle = Math.atan2(player.y - e.y, player.x - e.x);
  spawnBullet(
    e.x,
    e.y,
    e.x + Math.cos(angle) * 200,
    e.y + Math.sin(angle) * 200,
    false,
    3,
  );
  const b = state.bullets[state.bullets.length - 1];
  b.style = 5;
  b.speed *= 0.6;
  b.radius = 8;
  e.cooldown = 120;
}
