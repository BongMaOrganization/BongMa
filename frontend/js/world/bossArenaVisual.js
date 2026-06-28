import { state } from "../state.js";
import { isBossCutsceneActive } from "../game/bossCutscene.js";
import {
  getRoomById,
  constrainToRoomBounds,
  isDungeonCampaignBoss,
} from "./dungeonLayout.js";

const ARENA_THEMES = {
  fire: {
    ring: "#ff4400",
    ringGlow: "rgba(255,80,0,0.45)",
    pillar: "#ff6622",
    floor: "rgba(255,60,0,0.09)",
    rune: "#ffaa44",
    particle: "#ff8844",
  },
  ice: {
    ring: "#66ccff",
    ringGlow: "rgba(100,200,255,0.4)",
    pillar: "#aaddff",
    floor: "rgba(80,180,255,0.08)",
    rune: "#ccffff",
    particle: "#88ddff",
  },
  earth: {
    ring: "#b88844",
    ringGlow: "rgba(180,130,70,0.38)",
    pillar: "#8b6914",
    floor: "rgba(180,130,70,0.1)",
    rune: "#d4aa66",
    particle: "#c49b58",
  },
  wind: {
    ring: "#55ffcc",
    ringGlow: "rgba(80,255,200,0.35)",
    pillar: "#00ffaa",
    floor: "rgba(80,255,200,0.06)",
    rune: "#aaffee",
    particle: "#86ffd8",
  },
  thunder: {
    ring: "#ffee55",
    ringGlow: "rgba(255,220,80,0.42)",
    pillar: "#ffff88",
    floor: "rgba(255,220,80,0.07)",
    rune: "#fff7b8",
    particle: "#ffe35a",
  },
  omni: {
    ring: "#ffd080",
    ringGlow: "rgba(255,200,120,0.5)",
    pillar: "#ffffff",
    floor: "rgba(200,120,255,0.08)",
    rune: "#ff88ff",
    particle: "#ffd96b",
    prismatic: true,
  },
  void: {
    ring: "#8800ff",
    ringGlow: "rgba(136,0,255,0.45)",
    pillar: "#5500aa",
    floor: "rgba(80,0,160,0.1)",
    rune: "#cc88ff",
    particle: "#b870ff",
  },
  glitch: {
    ring: "#00ff88",
    ringGlow: "rgba(0,255,136,0.35)",
    pillar: "#00ffff",
    floor: "rgba(0,255,100,0.06)",
    rune: "#ff00ff",
    particle: "#00ffcc",
    glitch: true,
  },
};

const OMNI_COLORS = ["#ff4400", "#66ccff", "#b88844", "#55ffcc", "#ffee55"];

export function setupBossArenaVisual(bossType, cx, cy, opts = {}) {
  const theme = ARENA_THEMES[bossType] || ARENA_THEMES.fire;
  const pillarCount = bossType === "omni" ? 10 : bossType === "void" ? 8 : 6;
  const defaultRadius =
    bossType === "omni" ? 700 : bossType === "earth" ? 660 : 620;
  const baseRadius = opts.maxRadius ?? defaultRadius;

  state.bossArenaVisual = {
    bossType,
    cx,
    cy,
    radius: baseRadius,
    roomId: opts.roomId || null,
    reveal: 0,
    theme,
    pillars: Array.from({ length: pillarCount }, (_, i) => ({
      angle: (i / pillarCount) * Math.PI * 2 - Math.PI / 2,
      height: 48 + (i % 3) * 16,
    })),
    sparks: [],
    rotation: 0,
  };
}

export function clearBossArenaVisual() {
  state.bossArenaVisual = null;
}

export function updateBossArenaVisual() {
  const ar = state.bossArenaVisual;
  if (!ar) return;

  if (isBossCutsceneActive()) {
    ar.reveal = Math.min(1, ar.reveal + 0.022);
  } else if (state.isBossLevel) {
    if (ar.reveal < 1) ar.reveal = Math.min(1, ar.reveal + 0.035);
    else if (ar.reveal >= 1 && !ar._burstDone) {
      ar._burstDone = true;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ar.sparks.push({
          x: ar.cx + Math.cos(a) * ar.radius * 0.5,
          y: ar.cy + Math.sin(a) * ar.radius * 0.5,
          life: 50,
          maxLife: 50,
          size: 4 + Math.random() * 4,
          color: ar.theme.prismatic
            ? OMNI_COLORS[i % OMNI_COLORS.length]
            : ar.theme.particle,
          vx: Math.cos(a) * 3,
          vy: Math.sin(a) * 3,
        });
      }
    }
  }

  ar.rotation += ar.theme.prismatic ? 0.004 : 0.0015;

  if (state.frameCount % 8 === 0 && ar.reveal > 0.3) {
    const angle = Math.random() * Math.PI * 2;
    const dist = ar.radius * (0.3 + Math.random() * 0.65);
    ar.sparks.push({
      x: ar.cx + Math.cos(angle) * dist,
      y: ar.cy + Math.sin(angle) * dist,
      life: 40 + Math.random() * 30,
      maxLife: 70,
      size: 2 + Math.random() * 3,
      color: ar.theme.prismatic
        ? OMNI_COLORS[Math.floor(Math.random() * OMNI_COLORS.length)]
        : ar.theme.particle,
    });
  }

  for (let i = ar.sparks.length - 1; i >= 0; i--) {
    const s = ar.sparks[i];
    if (s.vx) {
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.92;
      s.vy *= 0.92;
    }
    s.life--;
    if (s.life <= 0) ar.sparks.splice(i, 1);
  }
  if (ar.sparks.length > 60) ar.sparks.splice(0, ar.sparks.length - 60);
}

export function constrainToBossArena(entity, entityRadius = 20) {
  const ar = state.bossArenaVisual;
  if (!ar || ar.reveal < 0.85 || !entity) return;

  const maxR = ar.radius - entityRadius - 10;
  const dx = entity.x - ar.cx;
  const dy = entity.y - ar.cy;
  const d = Math.hypot(dx, dy);
  if (d > maxR && d > 0) {
    entity.x = ar.cx + (dx / d) * maxR;
    entity.y = ar.cy + (dy / d) * maxR;
  }

  if (ar.roomId && isDungeonCampaignBoss()) {
    const room = getRoomById(ar.roomId);
    if (room) constrainToRoomBounds(entity, room, entityRadius);
  }
}

export function getBossSpawnPosition() {
  const ar = state.bossArenaVisual;
  const p = state.player;
  if (!ar) {
    return {
      x: (p?.x || 1500) + 400,
      y: (p?.y || 1350) - 300,
    };
  }
  const angle = Math.atan2((p?.y || ar.cy) - ar.cy, (p?.x || ar.cx) - ar.cx) + Math.PI;
  const dist = ar.radius * 0.42;
  return {
    x: ar.cx + Math.cos(angle) * dist,
    y: ar.cy + Math.sin(angle) * dist,
  };
}

export function drawBossArenaVisual(ctx) {
  const ar = state.bossArenaVisual;
  if (!ar || ar.reveal <= 0) return;

  const { cx, cy, radius, reveal, theme, pillars, sparks, rotation, bossType } = ar;
  const t = state.frameCount;
  const r = radius * reveal;

  ctx.save();

  ctx.globalAlpha = reveal * 0.85;
  const floorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  floorGrad.addColorStop(0, theme.floor);
  floorGrad.addColorStop(0.7, "rgba(0,0,0,0.02)");
  floorGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = reveal * (0.35 + Math.sin(t * 0.08) * 0.12);
  ctx.strokeStyle = theme.ringGlow;
  ctx.lineWidth = 28;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = reveal;
  ctx.strokeStyle = theme.ring;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 12]);
  ctx.lineDashOffset = -t * 0.8;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, rotation, rotation + Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const pillar of pillars) {
    const px = cx + Math.cos(pillar.angle + rotation * 0.5) * (r - 8);
    const py = cy + Math.sin(pillar.angle + rotation * 0.5) * (r - 8);
    const innerX = cx + Math.cos(pillar.angle + rotation * 0.5) * (r - 40);
    const innerY = cy + Math.sin(pillar.angle + rotation * 0.5) * (r - 40);

    let col = theme.pillar;
    if (theme.prismatic) col = OMNI_COLORS[pillars.indexOf(pillar) % OMNI_COLORS.length];
    if (theme.glitch && t % 20 < 3) col = theme.rune;

    ctx.globalAlpha = reveal * 0.9;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.fillStyle = col;
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("◆", px, py + 5);
  }

  const runeCount = bossType === "omni" ? 5 : 4;
  for (let i = 0; i < runeCount; i++) {
    const a = rotation * 2 + (i / runeCount) * Math.PI * 2;
    const rx = cx + Math.cos(a) * (r * 0.55);
    const ry = cy + Math.sin(a) * (r * 0.55);
    ctx.globalAlpha = reveal * 0.35;
    ctx.strokeStyle = theme.prismatic ? OMNI_COLORS[i % 5] : theme.rune;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, ry, 14 + Math.sin(t * 0.1 + i) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  sparks.forEach((s) => {
    ctx.globalAlpha = (s.life / s.maxLife) * reveal * 0.8;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}
