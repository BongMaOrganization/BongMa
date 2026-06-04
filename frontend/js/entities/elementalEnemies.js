import { state } from "../state.js";
import { dist } from "../utils.js";
import { spawnBullet } from "./helpers.js";
import { spawnElementalZone } from "../game/elementalZone.js";

export const ELEMENTS = ["fire", "ice", "lightning", "wind", "earth"];

export function spawnElementalEnemy(x, y, forcedElement = null) {
  const element =
    forcedElement || ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];

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
  });
}
export function updateElementalEnemies(player) {
  for (let i = state.elementalEnemies.length - 1; i >= 0; i--) {
    const e = state.elementalEnemies[i];

    const d = dist(e.x, e.y, player.x, player.y);

    // ===== STATE MACHINE =====
    if (d < e.attackRange) e.state = "attack";
    else if (d < e.aggroRange) e.state = "aggro";
    else e.state = "idle";

    // ===== BEHAVIOR =====
    if (e.state === "aggro") {
      let angle = Math.atan2(player.y - e.y, player.x - e.x);
      e.x += Math.cos(angle) * e.speed;
      e.y += Math.sin(angle) * e.speed;
    }

    if (e.state === "attack") {
      handleElementAttack(e, player);
    }

    // ===== DEATH =====
    if (!Number.isFinite(e.hp) || e.hp <= 0) {
      spawnElementalZone(e); // dùng system zone bạn đã làm
      state.elementalEnemies.splice(i, 1);
    }

    if (e.cooldown > 0) e.cooldown--;
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
    let angle = baseAngle + i * 0.2;

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
    let angle = baseAngle + i * 0.2;

    spawnBullet(
      e.x,
      e.y,
      e.x + Math.cos(angle) * 100,
      e.y + Math.sin(angle) * 100,
      false,
      1,
    );

    let b = state.bullets[state.bullets.length - 1];
    b.style = 2; // ❄️ ICE
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

  let b = state.bullets[state.bullets.length - 1];
  b.style = 3; // ⚡
  b.speed *= 2;
  b.pierce = 1;

  e.cooldown = 90;
}
function windAttack(e, player) {
  const baseAngle = Math.atan2(player.y - e.y, player.x - e.x);

  for (let i = -2; i <= 2; i++) {
    let angle = baseAngle + i * 0.25;

    spawnBullet(
      e.x,
      e.y,
      e.x + Math.cos(angle) * 150,
      e.y + Math.sin(angle) * 150,
      false,
      0.5,
    );

    let b = state.bullets[state.bullets.length - 1];
    b.style = 4; // 🌪️
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

  let b = state.bullets[state.bullets.length - 1];
  b.style = 5; // 🌍
  b.speed *= 0.6;
  b.radius = 8;

  e.cooldown = 120;
}
