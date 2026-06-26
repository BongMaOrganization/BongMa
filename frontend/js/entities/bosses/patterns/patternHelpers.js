import { state } from "../../../state.js";
import { spawnBullet } from "../../helpers.js";
import { getBossTarget } from "../boss_manager.js";

export const TAU = Math.PI * 2;

export function activateShield(boss, amount) {}

// Bắn theo góc
export function fireAngle(sx, sy, angle, style = 0, source = "boss", damage = 1) {
  spawnBullet(
    sx, sy,
    sx + Math.cos(angle),
    sy + Math.sin(angle),
    false, style, source, damage,
  );
}

// Bắn vòng tròn
export function ring(sx, sy, count, offset = 0, style = 0, source = "boss", damage = 1) {
  for (let i = 0; i < count; i++) {
    fireAngle(sx, sy, offset + (i * TAU) / count, style, source, damage);
  }
}

// Bắn hình quạt
export function fan(sx, sy, baseAngle, count, spread, style = 0, source = "boss", damage = 1) {
  const start = baseAngle - (spread * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    fireAngle(sx, sy, start + i * spread, style, source, damage);
  }
}

// Tính góc hướng về player sống gần nhất (local hoặc remote)
export function aim(boss, extraAngle = 0) {
  const target = getBossTarget(boss);
  return Math.atan2(target.y - boss.y, target.x - boss.x) + extraAngle;
}
