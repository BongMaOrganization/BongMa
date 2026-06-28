import { state } from "../../state.js";
import { dist } from "../../utils.js";

export function getPuzzleLayout() {
  const room = state.dungeon?.rooms?.find((r) => r.type === "puzzle") || null;
  const center = room
    ? { x: room.x + room.w / 2, y: room.y + room.h / 2 }
    : { x: state.world.width / 2, y: state.world.height / 2 };
  const radius = room ? Math.min(room.w, room.h) * 0.36 : 360;
  return { room, center, radius };
}

export function ringPoints(center, radius, count, startAngle = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = startAngle + (i / count) * Math.PI * 2;
    pts.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius });
  }
  return pts;
}

export function playerNear(x, y, range = 64) {
  const p = state.player;
  if (!p) return false;
  return dist(p.x, p.y, x, y) < range;
}

export function playerStill(threshold = 0.35) {
  const p = state.player;
  if (!p) return false;
  const keys = state.keys || {};
  const moving =
    keys["w"] || keys["a"] || keys["s"] || keys["d"] ||
    keys["arrowup"] || keys["arrowdown"] || keys["arrowleft"] || keys["arrowright"] ||
    (p.dashTimeLeft && p.dashTimeLeft > 0);
  return !moving;
}

export function onPuzzleComplete(puzzle, title, color = "#00ffcc") {
  if (puzzle.solved) return;
  puzzle.solved = true;
  const p = state.player;
  state.floatingTexts.push({
    x: p?.x || 0,
    y: (p?.y || 0) - 90,
    text: `✔ ${title}`,
    color,
    size: 26,
    life: 200,
    opacity: 1,
  });
  state.screenShake = { timer: 20, intensity: 8, x: 0, y: 0 };
}

export function drawMarker(ctx, x, y, color, radius = 18, pulse = true) {
  const t = state.frameCount;
  const r = pulse ? radius + Math.sin(t * 0.12) * 3 : radius;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawLabel(ctx, x, y, text, color = "#fff") {
  ctx.save();
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
