import { state } from "../state.js"; // Chỉnh lại đường dẫn nếu cần
import { dist } from "../utils.js";  // Chỉnh lại đường dẫn nếu cần

const ELEMENT_DEFS = {
  fire: { radius: 80, duration: 180, color: "#ff5500" },
  ice: { radius: 90, duration: 200, color: "#00ccff" },
  lightning: { radius: 85, duration: 140, color: "#ffff00" },
  wind: { radius: 100, duration: 160, color: "#ccffff" },
  earth: { radius: 110, duration: 240, color: "#996633" },

  // merged elements
  steam: { radius: 150, duration: 150, color: "#dfe9ff" },
  plasma: { radius: 155, duration: 135, color: "#ff77ff" },
  blaze: { radius: 160, duration: 145, color: "#ff8a1f" },
  magma: { radius: 175, duration: 220, color: "#ff4d00" },
  frostbite: { radius: 160, duration: 170, color: "#bfefff" },
  blizzard: { radius: 180, duration: 200, color: "#e8ffff" },
  glacier: { radius: 190, duration: 260, color: "#74e5ff" },
  storm: { radius: 175, duration: 160, color: "#f0f6ff" },
  magnet: { radius: 165, duration: 180, color: "#ffd966" },
  sandstorm: { radius: 185, duration: 210, color: "#e0c07a" },
};

const MERGE_RULES = {
  fire: { ice: "steam", lightning: "plasma", wind: "blaze", earth: "magma" },
  ice: { lightning: "frostbite", wind: "blizzard", earth: "glacier" },
  lightning: { wind: "storm", earth: "magnet" },
  wind: { earth: "sandstorm" },
};

function getMergedElement(a, b) {
  return MERGE_RULES[a]?.[b] || MERGE_RULES[b]?.[a] || null;
}

export function hexToRgba(hex, alpha) {
  const v = hex.replace("#", "");
  const n = parseInt(v, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const bl = n & 255;
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

export function pushParticles({
  x, y, color, count = 10, speed = 2, life = 30, size = 2, spread = Math.PI * 2, screenSpace = false,
}) {
  if (!state.particles) state.particles = [];

  for (let i = 0; i < count; i++) {
    const a = Math.random() * spread;
    const s = speed * (0.4 + Math.random() * 0.9);

    state.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life + Math.floor(Math.random() * 10),
      color,
      size: size + Math.random() * size,
      screenSpace,
    });
  }
}

function spawnMergeBurst(a, b, mergedElement) {
  const c = ELEMENT_DEFS[mergedElement]?.color || "#ffffff";
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;

  // Vòng nổ lớn
  pushParticles({ x, y, color: c, count: 36, speed: 4.5, life: 28, size: 3 });

  // Bụi phụ từ 2 zone cũ
  pushParticles({ x: a.x, y: a.y, color: a.color, count: 12, speed: 3, life: 22, size: 2 });
  pushParticles({ x: b.x, y: b.y, color: b.color, count: 12, speed: 3, life: 22, size: 2 });
}

function createZone(x, y, element, radius, duration, extra = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    x, y, radius, baseRadius: radius, element,
    color: ELEMENT_DEFS[element]?.color || "#ffffff",
    life: duration, maxLife: duration, tick: 0, mergeCooldown: 0,
    pulseSeed: Math.random() * Math.PI * 2,
    isMerged: !!extra.isMerged,
    mergedFrom: extra.mergedFrom || null,
  };
}

export function spawnElementalZone(enemy, forcedElement) {
  const element = forcedElement || enemy.element || "fire";
  const def = ELEMENT_DEFS[element] || ELEMENT_DEFS.fire;

  state.elementalZones ||= [];
  state.elementalZones.push(createZone(enemy.x, enemy.y, element, def.radius, def.duration));

  pushParticles({ x: enemy.x, y: enemy.y, color: def.color, count: 14, speed: 2.5, life: 24, size: 2 });
}

// Vũng nền nhỏ (vd vệt băng quái để lại). noMerge → không gộp thành glacier spam.
export function spawnGroundZone(x, y, element, radius, duration, noMerge = true) {
  state.elementalZones ||= [];
  const z = createZone(x, y, element, radius, duration);
  if (noMerge) z.mergeCooldown = duration + 999;
  state.elementalZones.push(z);
  return z;
}

function spawnMergedZone(a, b, mergedElement) {
  const def = ELEMENT_DEFS[mergedElement];
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;

  const baseRadius = Math.max(a.radius, b.radius);
  const radius = baseRadius * 2;
  const duration = def?.duration || Math.max(a.maxLife, b.maxLife);

  const zone = createZone(x, y, mergedElement, radius, duration, {
    isMerged: true,
    mergedFrom: [a.element, b.element],
  });

  zone.mergeCooldown = 24;
  zone.radius = radius;
  zone.baseRadius = radius;

  return zone;
}

function emitAmbientZoneParticles(z) {
  if (!state.particles) state.particles = [];
  const every = z.isMerged ? 2 : 4;
  if (z.tick % every !== 0) return;

  const count = z.isMerged ? 3 : 1;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = z.radius * (0.55 + Math.random() * 0.4);

    state.particles.push({
      x: z.x + Math.cos(a) * r,
      y: z.y + Math.sin(a) * r,
      vx: (Math.random() - 0.5) * (z.isMerged ? 1.8 : 1.2),
      vy: (Math.random() - 0.5) * (z.isMerged ? 1.8 : 1.2),
      life: z.isMerged ? 28 : 18,
      color: z.color,
      size: z.isMerged ? 3 : 2,
      screenSpace: false,
    });
  }
}

export function updateElementalZones(player) {
  if (!player.baseSpeed) player.baseSpeed = player.speed;
  player.speed = player.baseSpeed; // reset speed mỗi frame

  if (!state.elementalZones) state.elementalZones = [];

  for (const z of state.elementalZones) {
    z.life--;
    z.tick++;
    if (z.mergeCooldown > 0) z.mergeCooldown--;

    if (z.life <= 0) continue;

    const d = dist(player.x, player.y, z.x, z.y);
    if (d < z.radius) {
      applyZoneEffect(z, player);
      emitAmbientZoneParticles(z);
    }
  }

  resolveZoneInteractions();

  // Xóa zone hết máu
  state.elementalZones = state.elementalZones.filter((z) => z.life > 0);

  const minSpeed = player.baseSpeed * 0.4;
  if (player.speed < minSpeed) player.speed = minSpeed;
  if (!isFinite(player.speed)) player.speed = player.baseSpeed;
}

function applyZoneEffect(zone, player) {
  switch (zone.element) {
    case "fire": player.hp -= 0.02; break;
    case "ice": player.speed *= 0.5; break;
    case "lightning":
      if (zone.tick % 20 === 0) state.playerStatus.stunTimer = Math.max(state.playerStatus.stunTimer || 0, 5);
      break;
    case "wind": {
      const dx = player.x - zone.x; const dy = player.y - zone.y;
      const len = Math.hypot(dx, dy) || 1;
      player.x += (dx / len) * 2; player.y += (dy / len) * 2;
      break;
    }
    case "earth": player.speed *= 0.5; break;

    // Merged effects
    case "steam":
      player.speed *= 0.9;
      if (zone.tick % 30 === 0) player.hp -= 0.005;
      break;
    case "plasma":
      player.hp -= 0.03;
      if (zone.tick % 16 === 0) state.playerStatus.stunTimer = Math.max(state.playerStatus.stunTimer || 0, 4);
      break;
    case "blaze": player.hp -= 0.015; player.speed *= 0.92; break;
    case "magma": player.hp -= 0.025; player.speed *= 0.85; break;
    case "frostbite":
      player.speed *= 0.7;
      if (zone.tick % 18 === 0) player.hp -= 0.01;
      break;
    case "blizzard":
      player.speed *= 0.6;
      const dx = player.x - zone.x; const dy = player.y - zone.y;
      const len = Math.hypot(dx, dy) || 1;
      player.x += (dx / len) * 1.2; player.y += (dy / len) * 1.2;
      break;
    case "glacier":
      player.speed *= 0.45;
      if (zone.tick % 25 === 0) state.playerStatus.stunTimer = Math.max(state.playerStatus.stunTimer || 0, 6);
      break;
    case "storm":
      if (zone.tick % 18 === 0) state.playerStatus.stunTimer = Math.max(state.playerStatus.stunTimer || 0, 5);
      player.speed *= 0.85;
      break;
    case "magnet": {
      const mx = zone.x - player.x; const my = zone.y - player.y;
      const mlen = Math.hypot(mx, my) || 1;
      player.x += (mx / mlen) * 1.2; player.y += (my / mlen) * 1.2;
      break;
    }
    case "sandstorm":
      player.speed *= 0.75;
      if (zone.tick % 35 === 0) player.hp -= 0.008;
      break;
  }
}

function resolveZoneInteractions() {
  const zones = state.elementalZones;
  const toRemove = new Set();
  const toAdd = [];

  for (let i = 0; i < zones.length; i++) {
    if (toRemove.has(i)) continue;
    const a = zones[i];
    if (a.life <= 0 || a.mergeCooldown > 0) continue;

    for (let j = i + 1; j < zones.length; j++) {
      if (toRemove.has(j)) continue;
      const b = zones[j];
      if (b.life <= 0 || b.mergeCooldown > 0) continue;

      const d = dist(a.x, a.y, b.x, b.y);
      if (d >= a.radius + b.radius) continue;

      const mergedElement = getMergedElement(a.element, b.element);
      if (!mergedElement) continue;

      toRemove.add(i);
      toRemove.add(j);

      const mergedZone = spawnMergedZone(a, b, mergedElement);
      toAdd.push(mergedZone);
      spawnMergeBurst(a, b, mergedElement);
      break; // Ngăn 1 zone merge với nhiều zone cùng lúc
    }
  }

  state.elementalZones = zones.filter((_, idx) => !toRemove.has(idx) && zones[idx].life > 0);
  state.elementalZones.push(...toAdd);
}