import { state } from "../../state.js";
import { isPerformanceMode } from "../vfxBudget.js";

// ===== LAVA FLOOR (fire theme) =====
export function drawLavaFloor(ctx) {
  const t = state.frameCount * 0.02;

  ctx.save();

  // 1. NỀN GỐC (BASE GRADIENT)
  const baseGrad = ctx.createRadialGradient(
    state.world.width / 2,
    state.world.height / 2,
    0,
    state.world.width / 2,
    state.world.height / 2,
    state.world.width * 0.8,
  );
  baseGrad.addColorStop(0, "#1a0800");
  baseGrad.addColorStop(1, "#050100");

  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, state.world.width, state.world.height);

  ctx.globalCompositeOperation = "lighter";

  // 2. MẠCH DUNG NHAM
  const numVeins = 4;
  for (let i = 0; i < numVeins; i++) {
    ctx.beginPath();
    const startY = (state.world.height / numVeins) * i + 100;
    ctx.moveTo(0, startY);

    for (let x = 0; x <= state.world.width; x += 100) {
      const wave1 = Math.sin(x * 0.005 + t + i) * 60;
      const wave2 = Math.cos(x * 0.01 - t * 0.5) * 40;
      ctx.lineTo(x, startY + wave1 + wave2);
    }

    ctx.strokeStyle =
      i % 2 === 0 ? "rgba(255, 60, 0, 0.04)" : "rgba(200, 20, 0, 0.03)";
    ctx.lineWidth = 120 + Math.sin(t * 2 + i) * 20;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 120, 0, 0.05)";
    ctx.lineWidth = 40;
    ctx.stroke();
  }

  // 3. HẠT TÀN LỬA (EMBER PARTICLES)
  if (!state.lavaParticles) state.lavaParticles = [];

  if (Math.random() < 0.3) {
    state.lavaParticles.push({
      x: Math.random() * state.world.width,
      y: state.world.height + 20,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(Math.random() * 2 + 0.5),
      size: Math.random() * 3 + 1,
      life: 1.0,
      decay: Math.random() * 0.01 + 0.005,
      seed: Math.random() * Math.PI * 2,
    });
  }

  for (let i = state.lavaParticles.length - 1; i >= 0; i--) {
    let p = state.lavaParticles[i];
    p.x += Math.sin(t * 5 + p.seed) * 0.5 + p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    if (p.life <= 0) {
      state.lavaParticles.splice(i, 1);
      continue;
    }

    const greenScale = Math.floor(150 * p.life);
    ctx.fillStyle = `rgba(255, ${greenScale}, 0, ${p.life})`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";

  // 4. LƯỚI KHÔNG GIAN
  const gridSize = 100;
  ctx.strokeStyle = "rgba(255, 80, 0, 0.04)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let x = 0; x <= state.world.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.world.height);
  }
  for (let y = 0; y <= state.world.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(state.world.width, y);
  }
  ctx.stroke();

  ctx.restore();
}

// ===== BURN VIGNETTE (screen-space) =====
export function drawBurnVignette(ctx, canvas) {
  const pulse = (Math.sin(state.frameCount * 0.1) + 1) * 0.5;
  const grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.3,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.8,
  );
  grad.addColorStop(0, "rgba(0, 0, 0, 0)");
  grad.addColorStop(1, `rgba(100, 10, 0, ${0.1 + pulse * 0.1})`);

  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ===== PERMANENT SCARS (vết cháy vĩnh viễn) =====
export function drawPermanentScars(ctx) {
  if (!state.permanentScars) return;
  state.permanentScars.forEach((s) => {
    ctx.save();
    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
    grad.addColorStop(0, "rgba(20, 10, 0, 0.8)");
    grad.addColorStop(0.7, "rgba(40, 20, 0, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// ===== MAP GRID =====
export function drawMapGrid(ctx) {
  const gridSize = 100;

  ctx.save();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;

  ctx.beginPath();

  for (let x = 0; x <= state.world.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.world.height);
  }

  for (let y = 0; y <= state.world.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(state.world.width, y);
  }

  ctx.stroke();

  const pulse = (Math.sin(state.frameCount * 0.05) + 1) * 0.5;

  ctx.strokeStyle = `rgba(255, 80, 80, ${0.2 + pulse * 0.2})`;
  ctx.lineWidth = 3;

  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(255,80,80,0.5)";

  ctx.strokeRect(0, 0, state.world.width, state.world.height);

  ctx.restore();
}

let fireAshPatternCanvas = null;
let fireCrackPatternCanvas = null;
let iceSnowPatternCanvas = null;
let iceFracturePatternCanvas = null;
let earthDustPatternCanvas = null;
let earthStrataPatternCanvas = null;
let windMistPatternCanvas = null;
let windFlowPatternCanvas = null;
let thunderSparkPatternCanvas = null;
let thunderCircuitPatternCanvas = null;

function ensureFireAshPatternCanvas() {
  if (fireAshPatternCanvas) return fireAshPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const c = canvas.getContext("2d");

  c.fillStyle = "#120603";
  c.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 32; i++) {
    const x = ((i * 37) % 192) + ((i % 3) * 11);
    const y = ((i * 61) % 192) + ((i % 4) * 7);
    const r = 1 + (i % 4);
    c.fillStyle = i % 2 === 0 ? "rgba(255, 112, 48, 0.08)" : "rgba(255, 188, 116, 0.05)";
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  c.strokeStyle = "rgba(255, 110, 40, 0.08)";
  c.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const y = 24 + i * 28;
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(42, y + 8, 96, y - 10, 192, y + 4);
    c.stroke();
  }

  fireAshPatternCanvas = canvas;
  return fireAshPatternCanvas;
}

function ensureFireCrackPatternCanvas() {
  if (fireCrackPatternCanvas) return fireCrackPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = "rgba(255, 106, 28, 0.16)";
  c.lineWidth = 3;
  c.shadowBlur = 10;
  c.shadowColor = "rgba(255, 128, 46, 0.22)";

  const crackLines = [
    [18, 70, 84, 46, 126, 88, 218, 64],
    [22, 164, 76, 126, 132, 170, 236, 146],
    [46, 228, 94, 196, 168, 234, 226, 212],
  ];

  crackLines.forEach((line) => {
    c.beginPath();
    c.moveTo(line[0], line[1]);
    c.bezierCurveTo(line[2], line[3], line[4], line[5], line[6], line[7]);
    c.stroke();
  });

  fireCrackPatternCanvas = canvas;
  return fireCrackPatternCanvas;
}

function ensureIceSnowPatternCanvas() {
  if (iceSnowPatternCanvas) return iceSnowPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const c = canvas.getContext("2d");

  c.fillStyle = "#071b34";
  c.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 44; i++) {
    const x = ((i * 41) % 192) + ((i % 5) * 5);
    const y = ((i * 67) % 192) + ((i % 4) * 9);
    const r = 0.8 + (i % 3) * 0.75;
    c.fillStyle =
      i % 2 === 0 ? "rgba(188, 234, 255, 0.11)" : "rgba(110, 194, 255, 0.08)";
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  c.strokeStyle = "rgba(104, 196, 255, 0.09)";
  c.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const y = 18 + i * 24;
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(48, y - 8, 124, y + 10, 192, y - 4);
    c.stroke();
  }

  iceSnowPatternCanvas = canvas;
  return iceSnowPatternCanvas;
}

function ensureIceFracturePatternCanvas() {
  if (iceFracturePatternCanvas) return iceFracturePatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = "rgba(86, 196, 255, 0.18)";
  c.lineWidth = 2.2;
  c.shadowBlur = 8;
  c.shadowColor = "rgba(96, 206, 255, 0.2)";

  const lines = [
    [34, 58, 74, 76, 116, 42, 178, 70],
    [28, 154, 92, 130, 144, 170, 222, 146],
    [62, 220, 124, 194, 196, 226, 232, 206],
  ];

  lines.forEach((line) => {
    c.beginPath();
    c.moveTo(line[0], line[1]);
    c.bezierCurveTo(line[2], line[3], line[4], line[5], line[6], line[7]);
    c.stroke();
  });

  iceFracturePatternCanvas = canvas;
  return iceFracturePatternCanvas;
}

function ensureEarthDustPatternCanvas() {
  if (earthDustPatternCanvas) return earthDustPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const c = canvas.getContext("2d");

  c.fillStyle = "#120d08";
  c.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 40; i++) {
    const x = ((i * 43) % 192) + ((i % 4) * 7);
    const y = ((i * 71) % 192) + ((i % 3) * 11);
    const r = 1 + (i % 4) * 0.9;
    c.fillStyle =
      i % 2 === 0 ? "rgba(168, 124, 76, 0.08)" : "rgba(110, 80, 48, 0.06)";
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  earthDustPatternCanvas = canvas;
  return earthDustPatternCanvas;
}

function ensureEarthStrataPatternCanvas() {
  if (earthStrataPatternCanvas) return earthStrataPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = "rgba(182, 138, 82, 0.1)";
  c.lineWidth = 2;

  for (let i = 0; i < 8; i++) {
    const y = 18 + i * 30;
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(62, y - 8, 142, y + 12, 256, y - 3);
    c.stroke();
  }

  c.strokeStyle = "rgba(78, 58, 32, 0.12)";
  c.lineWidth = 3;
  const faults = [
    [24, 66, 92, 44, 148, 84, 222, 58],
    [30, 172, 100, 142, 160, 188, 234, 164],
  ];
  faults.forEach((line) => {
    c.beginPath();
    c.moveTo(line[0], line[1]);
    c.bezierCurveTo(line[2], line[3], line[4], line[5], line[6], line[7]);
    c.stroke();
  });

  earthStrataPatternCanvas = canvas;
  return earthStrataPatternCanvas;
}

function ensureWindMistPatternCanvas() {
  if (windMistPatternCanvas) return windMistPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const c = canvas.getContext("2d");

  c.fillStyle = "#071816";
  c.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 34; i++) {
    const x = ((i * 47) % 192) + ((i % 4) * 8);
    const y = ((i * 59) % 192) + ((i % 3) * 10);
    const r = 1 + (i % 3) * 0.9;
    c.fillStyle =
      i % 2 === 0 ? "rgba(178, 250, 236, 0.08)" : "rgba(116, 234, 212, 0.06)";
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  windMistPatternCanvas = canvas;
  return windMistPatternCanvas;
}

function ensureWindFlowPatternCanvas() {
  if (windFlowPatternCanvas) return windFlowPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = "rgba(106, 238, 214, 0.1)";
  c.lineWidth = 2;

  for (let i = 0; i < 7; i++) {
    const y = 26 + i * 30;
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(52, y - 12, 136, y + 10, 256, y - 2);
    c.stroke();
  }

  c.strokeStyle = "rgba(190, 255, 245, 0.08)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(62, 70, 20, Math.PI * 0.15, Math.PI * 1.75);
  c.stroke();
  c.beginPath();
  c.arc(184, 154, 24, Math.PI * 0.1, Math.PI * 1.7);
  c.stroke();

  windFlowPatternCanvas = canvas;
  return windFlowPatternCanvas;
}

function ensureThunderSparkPatternCanvas() {
  if (thunderSparkPatternCanvas) return thunderSparkPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const c = canvas.getContext("2d");

  c.fillStyle = "#171005";
  c.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 30; i++) {
    const x = ((i * 53) % 192) + ((i % 4) * 5);
    const y = ((i * 61) % 192) + ((i % 3) * 9);
    const r = 1 + (i % 3) * 0.8;
    c.fillStyle =
      i % 2 === 0 ? "rgba(255, 232, 108, 0.1)" : "rgba(255, 196, 88, 0.07)";
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  thunderSparkPatternCanvas = canvas;
  return thunderSparkPatternCanvas;
}

function ensureThunderCircuitPatternCanvas() {
  if (thunderCircuitPatternCanvas) return thunderCircuitPatternCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = "rgba(255, 224, 92, 0.13)";
  c.lineWidth = 2;

  const lines = [
    [18, 58, 48, 58, 48, 94, 92, 94, 92, 48, 148, 48, 148, 92, 218, 92],
    [30, 164, 70, 164, 70, 128, 124, 128, 124, 182, 182, 182, 182, 144, 232, 144],
  ];

  lines.forEach((line) => {
    c.beginPath();
    c.moveTo(line[0], line[1]);
    for (let i = 2; i < line.length; i += 2) {
      c.lineTo(line[i], line[i + 1]);
    }
    c.stroke();
  });

  c.fillStyle = "rgba(255, 226, 126, 0.14)";
  [[48, 94], [148, 48], [124, 182], [182, 144]].forEach(([x, y]) => {
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.fill();
  });

  thunderCircuitPatternCanvas = canvas;
  return thunderCircuitPatternCanvas;
}

function intersectsView(minX, minY, maxX, maxY, cx, cy, cw, ch, pad = 0) {
  return !(
    maxX < cx - pad ||
    minX > cx + cw + pad ||
    maxY < cy - pad ||
    minY > cy + ch + pad
  );
}

function drawFireFissure(ctx, fissure, pulse) {
  ctx.beginPath();
  ctx.moveTo(fissure.points[0].x, fissure.points[0].y);
  for (let i = 1; i < fissure.points.length; i++) {
    const prev = fissure.points[i - 1];
    const cur = fissure.points[i];
    const mx = (prev.x + cur.x) * 0.5;
    const my = (prev.y + cur.y) * 0.5;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  const last = fissure.points[fissure.points.length - 1];
  ctx.lineTo(last.x, last.y);

  ctx.strokeStyle = `rgba(255, 104, 28, ${0.12 + pulse * 0.06})`;
  ctx.lineWidth = fissure.glowWidth;
  ctx.shadowBlur = 24;
  ctx.shadowColor = "rgba(255, 118, 32, 0.24)";
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 214, 124, ${0.2 + pulse * 0.12})`;
  ctx.lineWidth = fissure.coreWidth;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "rgba(255, 210, 120, 0.2)";
  ctx.stroke();
}

function drawFirePool(ctx, pool, frame) {
  const pulse = 0.82 + Math.sin(frame * 0.025 + pool.pulse) * 0.08;

  ctx.save();
  ctx.translate(pool.x, pool.y);
  ctx.rotate(pool.angle);

  const glow = ctx.createRadialGradient(0, 0, 12, 0, 0, pool.rx * 1.45);
  glow.addColorStop(0, `rgba(255, 196, 110, ${0.16 * pool.glow})`);
  glow.addColorStop(0.45, `rgba(255, 110, 28, ${0.18 * pool.glow})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, pool.rx * 1.45, pool.ry * 1.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const lava = ctx.createRadialGradient(-pool.rx * 0.15, -pool.ry * 0.22, 0, 0, 0, pool.rx);
  lava.addColorStop(0, `rgba(255, 248, 214, ${0.9 * pulse})`);
  lava.addColorStop(0.18, `rgba(255, 192, 84, ${0.82 * pulse})`);
  lava.addColorStop(0.58, `rgba(255, 98, 22, ${0.7 * pulse})`);
  lava.addColorStop(1, "rgba(104, 22, 0, 0.12)");
  ctx.fillStyle = lava;
  ctx.beginPath();
  ctx.ellipse(0, 0, pool.rx, pool.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(44, 18, 10, 0.94)";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 150, 58, 0.34)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "rgba(18, 16, 18, 0.88)";
  pool.islands.forEach((island) => {
    ctx.save();
    ctx.translate(island.ox, island.oy);
    ctx.rotate(island.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, island.rx, island.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();
}

function drawFireOutcrop(ctx, rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.angle);

  ctx.beginPath();
  ctx.moveTo(rock.points[0].x, rock.points[0].y);
  for (let i = 1; i < rock.points.length; i++) {
    ctx.lineTo(rock.points[i].x, rock.points[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(${rock.shade}, ${rock.shade}, ${rock.shade + 6}, 0.98)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${rock.highlight}, ${rock.highlight}, ${rock.highlight + 8}, 0.48)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawFireVent(ctx, vent, frame, perfMode) {
  const pulse = 0.75 + Math.sin(frame * 0.04 + vent.phase) * 0.18;

  const glow = ctx.createRadialGradient(vent.x, vent.y, 0, vent.x, vent.y, vent.radius * 1.8);
  glow.addColorStop(0, `rgba(255, 198, 122, ${0.18 * pulse})`);
  glow.addColorStop(0.38, `rgba(255, 96, 22, ${0.14 * pulse})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(vent.x, vent.y, vent.radius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  if (perfMode) return;

  ctx.strokeStyle = `rgba(255, 170, 84, ${0.08 + vent.strength * 0.08})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(vent.x, vent.y + vent.radius * 0.2);
  ctx.bezierCurveTo(
    vent.x - vent.radius * 0.35,
    vent.y - vent.radius * 1.1,
    vent.x + vent.radius * 0.3,
    vent.y - vent.radius * 1.65,
    vent.x - vent.radius * 0.1,
    vent.y - vent.radius * 2.2,
  );
  ctx.stroke();
}

function drawFireEmbers(ctx, cx, cy, cw, ch, frame, perfMode) {
  const emberCount = perfMode ? 8 : 16;
  for (let i = 0; i < emberCount; i++) {
    const drift = (frame * (0.32 + (i % 3) * 0.09)) % (ch + 180);
    const x = cx + ((i * 151.7 + frame * 0.18) % (cw + 160)) - 80;
    const y = cy + ch + 90 - drift;
    const size = 1.2 + (i % 4) * 0.55;
    const alpha = 0.16 + ((Math.sin(frame * 0.04 + i * 1.7) + 1) * 0.5) * 0.14;

    ctx.fillStyle = `rgba(255, 176, 84, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFireThemeDetails(ctx, cx, cy, cw, ch, frame) {
  const perfMode = isPerformanceMode(state);
  const data = state.mapThemeData;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const ashPattern = ctx.createPattern(ensureFireAshPatternCanvas(), "repeat");
  if (ashPattern) {
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = ashPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  const crackPattern = ctx.createPattern(ensureFireCrackPatternCanvas(), "repeat");
  if (crackPattern) {
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = crackPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  ctx.restore();

  if (!data || data.theme !== "fire") return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const fissure of data.fissures || []) {
    if (!intersectsView(fissure.minX, fissure.minY, fissure.maxX, fissure.maxY, cx, cy, cw, ch, 160)) {
      continue;
    }
    drawFireFissure(
      ctx,
      fissure,
      (Math.sin(frame * 0.03 + fissure.phase) + 1) * 0.5,
    );
  }

  for (const pool of data.lavaPools || []) {
    if (!intersectsView(pool.x - pool.rx, pool.y - pool.ry, pool.x + pool.rx, pool.y + pool.ry, cx, cy, cw, ch, 180)) {
      continue;
    }
    drawFirePool(ctx, pool, frame);
  }

  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (const rock of data.basaltOutcrops || []) {
    if (!intersectsView(rock.x - 100, rock.y - 80, rock.x + 100, rock.y + 80, cx, cy, cw, ch, 80)) {
      continue;
    }
    drawFireOutcrop(ctx, rock);
  }

  for (const vent of data.emberVents || []) {
    if (!intersectsView(vent.x - vent.radius, vent.y - vent.radius * 3, vent.x + vent.radius, vent.y + vent.radius, cx, cy, cw, ch, 60)) {
      continue;
    }
    drawFireVent(ctx, vent, frame, perfMode);
  }

  drawFireEmbers(ctx, cx, cy, cw, ch, frame, perfMode);
  ctx.restore();
}

function drawIceVein(ctx, vein, pulse) {
  ctx.beginPath();
  ctx.moveTo(vein.points[0].x, vein.points[0].y);
  for (let i = 1; i < vein.points.length; i++) {
    const prev = vein.points[i - 1];
    const cur = vein.points[i];
    const mx = (prev.x + cur.x) * 0.5;
    const my = (prev.y + cur.y) * 0.5;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  const last = vein.points[vein.points.length - 1];
  ctx.lineTo(last.x, last.y);

  ctx.strokeStyle = `rgba(76, 184, 255, ${0.16 + pulse * 0.08})`;
  ctx.lineWidth = vein.glowWidth;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "rgba(92, 198, 255, 0.28)";
  ctx.stroke();

  ctx.strokeStyle = `rgba(214, 246, 255, ${0.22 + pulse * 0.12})`;
  ctx.lineWidth = vein.coreWidth;
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(215, 248, 255, 0.18)";
  ctx.stroke();
}

function drawIceSheet(ctx, sheet, frame) {
  const pulse = 0.84 + Math.sin(frame * 0.02 + sheet.pulse) * 0.06;

  ctx.save();
  ctx.translate(sheet.x, sheet.y);
  ctx.rotate(sheet.angle);

  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, sheet.rx * 1.45);
  glow.addColorStop(0, `rgba(216, 246, 255, ${0.14 * pulse})`);
  glow.addColorStop(0.42, `rgba(78, 186, 255, ${0.18 * sheet.glow})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, sheet.rx * 1.4, sheet.ry * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();

  const ice = ctx.createRadialGradient(-sheet.rx * 0.2, -sheet.ry * 0.18, 0, 0, 0, sheet.rx);
  ice.addColorStop(0, `rgba(232, 248, 255, ${0.82 * pulse})`);
  ice.addColorStop(0.24, `rgba(158, 220, 255, ${0.8 * pulse})`);
  ice.addColorStop(0.62, `rgba(54, 148, 232, ${0.56 * pulse})`);
  ice.addColorStop(1, "rgba(14, 42, 98, 0.22)");
  ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.ellipse(0, 0, sheet.rx, sheet.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(18, 52, 102, 0.8)";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(150, 224, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(228, 249, 255, 0.2)";
  ctx.lineWidth = 1.4;
  sheet.cracks.forEach((crack) => {
    const sx = crack.offset * sheet.rx;
    const sy = crack.offset * sheet.ry * 0.65;
    const ex = Math.cos(crack.angle) * sheet.rx * crack.length;
    const ey = Math.sin(crack.angle) * sheet.ry * crack.length;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    const branchAngle = crack.angle + (crack.offset > 0 ? 0.44 : -0.44);
    ctx.beginPath();
    ctx.moveTo(ex * 0.56, ey * 0.56);
    ctx.lineTo(
      ex * 0.56 + Math.cos(branchAngle) * sheet.rx * 0.16,
      ey * 0.56 + Math.sin(branchAngle) * sheet.ry * 0.16,
    );
    ctx.stroke();
  });

  ctx.restore();
}

function drawIceCrystalCluster(ctx, cluster, frame, perfMode) {
  const pulse = 0.8 + Math.sin(frame * 0.025 + cluster.phase) * 0.08;

  const glow = ctx.createRadialGradient(cluster.x, cluster.y - 18, 0, cluster.x, cluster.y - 18, 88);
  glow.addColorStop(0, `rgba(216, 246, 255, ${0.14 * pulse})`);
  glow.addColorStop(0.45, `rgba(86, 192, 255, ${0.18 * cluster.glow})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cluster.x, cluster.y - 8, 88, 0, Math.PI * 2);
  ctx.fill();

  const shards = cluster.shards.slice().sort((a, b) => a.length - b.length);
  shards.forEach((shard) => {
    ctx.save();
    ctx.translate(cluster.x + shard.ox, cluster.y + shard.oy);
    ctx.rotate(shard.tilt);

    const fill = ctx.createLinearGradient(0, 0, 0, -shard.length);
    fill.addColorStop(0, "rgba(54, 142, 224, 0.92)");
    fill.addColorStop(0.35, "rgba(170, 228, 255, 0.96)");
    fill.addColorStop(1, "rgba(244, 252, 255, 0.98)");

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-shard.width * 0.52, -shard.length * 0.34);
    ctx.lineTo(-shard.width * 0.18, -shard.length * 0.84);
    ctx.lineTo(0, -shard.length);
    ctx.lineTo(shard.width * 0.22, -shard.length * 0.8);
    ctx.lineTo(shard.width * 0.5, -shard.length * 0.28);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = "rgba(225, 251, 255, 0.72)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (!perfMode) {
      ctx.strokeStyle = "rgba(250, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -shard.length * 0.94);
      ctx.lineTo(0, -shard.length * 0.08);
      ctx.stroke();
    }

    ctx.restore();
  });
}

function drawIceMistField(ctx, mist, frame, perfMode) {
  const pulse = 0.72 + Math.sin(frame * 0.018 + mist.phase) * 0.14;
  const radius = mist.radius * (perfMode ? 0.92 : 1);
  const glow = ctx.createRadialGradient(mist.x, mist.y, 0, mist.x, mist.y, radius);
  glow.addColorStop(0, `rgba(206, 242, 255, ${mist.strength * 0.24 * pulse})`);
  glow.addColorStop(0.5, `rgba(96, 194, 255, ${mist.strength * 0.18 * pulse})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(mist.x, mist.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawIceSnowFlurry(ctx, cx, cy, cw, ch, frame, perfMode) {
  const flakeCount = perfMode ? 18 : 32;
  for (let i = 0; i < flakeCount; i++) {
    const speed = 0.2 + (i % 5) * 0.07;
    const drift = (frame * speed + i * 19) % (ch + 140);
    const wave = Math.sin(frame * 0.012 + i * 0.8) * (18 + (i % 4) * 7);
    const x = cx + ((i * 137.3 + frame * 0.1) % (cw + 120)) - 60 + wave;
    const y = cy - 70 + drift;
    const size = perfMode ? 0.9 + (i % 3) * 0.45 : 1.1 + (i % 4) * 0.55;
    const alpha = 0.16 + ((Math.sin(frame * 0.03 + i * 1.6) + 1) * 0.5) * 0.16;

    ctx.fillStyle = `rgba(214, 242, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIceThemeDetails(ctx, cx, cy, cw, ch, frame) {
  const perfMode = isPerformanceMode(state);
  const data = state.mapThemeData;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const snowPattern = ctx.createPattern(ensureIceSnowPatternCanvas(), "repeat");
  if (snowPattern) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = snowPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  const fracturePattern = ctx.createPattern(ensureIceFracturePatternCanvas(), "repeat");
  if (fracturePattern) {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = fracturePattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  ctx.restore();

  if (!data || data.theme !== "ice") return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const vein of data.frostVeins || []) {
    if (!intersectsView(vein.minX, vein.minY, vein.maxX, vein.maxY, cx, cy, cw, ch, 120)) {
      continue;
    }
    drawIceVein(
      ctx,
      vein,
      (Math.sin(frame * 0.025 + vein.phase) + 1) * 0.5,
    );
  }

  for (const sheet of data.iceSheets || []) {
    if (!intersectsView(sheet.x - sheet.rx, sheet.y - sheet.ry, sheet.x + sheet.rx, sheet.y + sheet.ry, cx, cy, cw, ch, 160)) {
      continue;
    }
    drawIceSheet(ctx, sheet, frame);
  }

  for (const cluster of data.crystalClusters || []) {
    if (!intersectsView(cluster.minX, cluster.minY, cluster.maxX, cluster.maxY, cx, cy, cw, ch, 80)) {
      continue;
    }
    drawIceCrystalCluster(ctx, cluster, frame, perfMode);
  }

  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (const mist of data.mistFields || []) {
    if (!intersectsView(mist.x - mist.radius, mist.y - mist.radius, mist.x + mist.radius, mist.y + mist.radius, cx, cy, cw, ch, 80)) {
      continue;
    }
    drawIceMistField(ctx, mist, frame, perfMode);
  }

  drawIceSnowFlurry(ctx, cx, cy, cw, ch, frame, perfMode);
  ctx.restore();
}

function drawEarthFault(ctx, fault, pulse) {
  ctx.beginPath();
  ctx.moveTo(fault.points[0].x, fault.points[0].y);
  for (let i = 1; i < fault.points.length; i++) {
    const prev = fault.points[i - 1];
    const cur = fault.points[i];
    const mx = (prev.x + cur.x) * 0.5;
    const my = (prev.y + cur.y) * 0.5;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  const last = fault.points[fault.points.length - 1];
  ctx.lineTo(last.x, last.y);

  ctx.strokeStyle = `rgba(48, 28, 12, ${0.34 + pulse * 0.08})`;
  ctx.lineWidth = fault.outerWidth;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.stroke();

  ctx.strokeStyle = `rgba(174, 122, 66, ${0.12 + pulse * 0.06})`;
  ctx.lineWidth = fault.innerWidth;
  ctx.shadowBlur = 6;
  ctx.shadowColor = "rgba(182, 128, 70, 0.12)";
  ctx.stroke();
}

function drawEarthPlate(ctx, plate, frame) {
  const pulse = 0.8 + Math.sin(frame * 0.018 + plate.pulse) * 0.05;

  ctx.save();
  ctx.translate(plate.x, plate.y);
  ctx.rotate(plate.angle);

  const shade = ctx.createRadialGradient(-plate.rx * 0.22, -plate.ry * 0.18, 0, 0, 0, plate.rx * 1.08);
  shade.addColorStop(0, `rgba(124, 88, 52, ${0.44 * pulse})`);
  shade.addColorStop(0.4, `rgba(78, 54, 30, ${0.6 * pulse})`);
  shade.addColorStop(1, "rgba(20, 14, 10, 0.18)");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(0, 0, plate.rx, plate.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(40, 28, 18, 0.86)";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = "rgba(192, 148, 88, 0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  plate.ridges.forEach((ridge) => {
    const y = ridge.offset * plate.ry;
    ctx.strokeStyle = "rgba(196, 154, 96, 0.12)";
    ctx.lineWidth = Math.max(2, plate.ry * ridge.width * 0.18);
    ctx.beginPath();
    ctx.moveTo(-plate.rx * 0.8, y);
    ctx.bezierCurveTo(
      -plate.rx * 0.28,
      y + Math.sin(ridge.wobble) * plate.ry * 0.18,
      plate.rx * 0.32,
      y - Math.cos(ridge.wobble) * plate.ry * 0.16,
      plate.rx * 0.82,
      y + Math.sin(ridge.wobble * 0.5) * plate.ry * 0.14,
    );
    ctx.stroke();
  });

  ctx.restore();
}

function drawEarthCluster(ctx, cluster, frame, perfMode) {
  const pulse = 0.72 + Math.sin(frame * 0.016 + cluster.phase) * 0.06;

  const baseGlow = ctx.createRadialGradient(cluster.x, cluster.y - 6, 0, cluster.x, cluster.y - 6, 90);
  baseGlow.addColorStop(0, `rgba(188, 144, 86, ${0.08 * pulse})`);
  baseGlow.addColorStop(0.5, `rgba(98, 72, 42, ${0.08 * cluster.glow})`);
  baseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = baseGlow;
  ctx.beginPath();
  ctx.arc(cluster.x, cluster.y, 90, 0, Math.PI * 2);
  ctx.fill();

  const monoliths = cluster.monoliths.slice().sort((a, b) => a.height - b.height);
  monoliths.forEach((monolith) => {
    ctx.save();
    ctx.translate(cluster.x + monolith.ox, cluster.y + monolith.oy);
    ctx.rotate(monolith.lean);

    const fill = ctx.createLinearGradient(0, 0, 0, -monolith.height);
    fill.addColorStop(0, `rgba(${monolith.hue + 6}, ${monolith.hue - 4}, ${monolith.hue - 18}, 0.96)`);
    fill.addColorStop(0.36, `rgba(${monolith.hue + 32}, ${monolith.hue + 14}, ${monolith.hue - 2}, 0.98)`);
    fill.addColorStop(1, `rgba(${monolith.hue + 54}, ${monolith.hue + 28}, ${monolith.hue + 8}, 1)`);

    ctx.beginPath();
    ctx.moveTo(-monolith.width * 0.62, 0);
    ctx.lineTo(-monolith.width * 0.38, -monolith.height * 0.78);
    ctx.lineTo(0, -monolith.height);
    ctx.lineTo(monolith.width * 0.3, -monolith.height * 0.7);
    ctx.lineTo(monolith.width * 0.58, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = "rgba(228, 194, 138, 0.34)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (!perfMode) {
      ctx.strokeStyle = "rgba(255, 232, 196, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-monolith.width * 0.04, -monolith.height * 0.9);
      ctx.lineTo(monolith.width * 0.12, -monolith.height * 0.1);
      ctx.stroke();
    }

    ctx.restore();
  });
}

function drawEarthDustBasin(ctx, basin, frame, perfMode) {
  const pulse = 0.7 + Math.sin(frame * 0.014 + basin.phase) * 0.12;
  const radius = basin.radius * (perfMode ? 0.9 : 1);
  const dust = ctx.createRadialGradient(basin.x, basin.y, 0, basin.x, basin.y, radius);
  dust.addColorStop(0, `rgba(180, 142, 92, ${basin.strength * 0.22 * pulse})`);
  dust.addColorStop(0.52, `rgba(110, 84, 52, ${basin.strength * 0.14 * pulse})`);
  dust.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = dust;
  ctx.beginPath();
  ctx.arc(basin.x, basin.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEarthDustDrift(ctx, cx, cy, cw, ch, frame, perfMode) {
  const moteCount = perfMode ? 12 : 22;
  for (let i = 0; i < moteCount; i++) {
    const speed = 0.16 + (i % 4) * 0.05;
    const drift = (frame * speed + i * 23) % (cw + 180);
    const sway = Math.sin(frame * 0.01 + i * 0.9) * (12 + (i % 3) * 5);
    const x = cx - 90 + drift;
    const y = cy + ((i * 119.7) % (ch + 90)) - 45 + sway;
    const size = perfMode ? 1.1 + (i % 3) * 0.45 : 1.4 + (i % 4) * 0.55;
    const alpha = 0.08 + ((Math.sin(frame * 0.024 + i * 1.4) + 1) * 0.5) * 0.08;

    ctx.fillStyle = `rgba(184, 146, 92, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEarthThemeDetails(ctx, cx, cy, cw, ch, frame) {
  const perfMode = isPerformanceMode(state);
  const data = state.mapThemeData;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const dustPattern = ctx.createPattern(ensureEarthDustPatternCanvas(), "repeat");
  if (dustPattern) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = dustPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  const strataPattern = ctx.createPattern(ensureEarthStrataPatternCanvas(), "repeat");
  if (strataPattern) {
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = strataPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  ctx.restore();

  if (!data || data.theme !== "earth") return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (const fault of data.faultLines || []) {
    if (!intersectsView(fault.minX, fault.minY, fault.maxX, fault.maxY, cx, cy, cw, ch, 120)) {
      continue;
    }
    drawEarthFault(
      ctx,
      fault,
      (Math.sin(frame * 0.018 + fault.phase) + 1) * 0.5,
    );
  }

  for (const plate of data.earthPlates || []) {
    if (!intersectsView(plate.x - plate.rx, plate.y - plate.ry, plate.x + plate.rx, plate.y + plate.ry, cx, cy, cw, ch, 140)) {
      continue;
    }
    drawEarthPlate(ctx, plate, frame);
  }

  for (const cluster of data.stoneClusters || []) {
    if (!intersectsView(cluster.minX, cluster.minY, cluster.maxX, cluster.maxY, cx, cy, cw, ch, 80)) {
      continue;
    }
    drawEarthCluster(ctx, cluster, frame, perfMode);
  }

  for (const basin of data.dustBasins || []) {
    if (!intersectsView(basin.x - basin.radius, basin.y - basin.radius, basin.x + basin.radius, basin.y + basin.radius, cx, cy, cw, ch, 60)) {
      continue;
    }
    drawEarthDustBasin(ctx, basin, frame, perfMode);
  }

  drawEarthDustDrift(ctx, cx, cy, cw, ch, frame, perfMode);
  ctx.restore();
}

function drawWindLane(ctx, lane, frame) {
  const pulse = (Math.sin(frame * lane.speed + lane.phase) + 1) * 0.5;

  ctx.beginPath();
  ctx.moveTo(lane.points[0].x, lane.points[0].y);
  for (let i = 1; i < lane.points.length; i++) {
    const prev = lane.points[i - 1];
    const cur = lane.points[i];
    const mx = (prev.x + cur.x) * 0.5;
    const my = (prev.y + cur.y) * 0.5;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  const last = lane.points[lane.points.length - 1];
  ctx.lineTo(last.x, last.y);

  ctx.strokeStyle = `rgba(64, 214, 194, ${0.1 + pulse * 0.06})`;
  ctx.lineWidth = lane.outerWidth;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(72, 228, 202, 0.18)";
  ctx.stroke();

  ctx.strokeStyle = `rgba(210, 255, 246, ${0.16 + pulse * 0.08})`;
  ctx.lineWidth = lane.innerWidth;
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(202, 255, 244, 0.16)";
  ctx.stroke();
}

function drawWindPressureCell(ctx, cell, frame, perfMode) {
  const pulse = 0.78 + Math.sin(frame * 0.02 + cell.phase) * 0.08;

  ctx.save();
  ctx.translate(cell.x, cell.y);
  ctx.rotate(cell.angle);

  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, cell.rx * 1.4);
  glow.addColorStop(0, `rgba(216, 255, 246, ${0.1 * pulse})`);
  glow.addColorStop(0.45, `rgba(82, 224, 198, ${0.14 * cell.glow})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, cell.rx * 1.35, cell.ry * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(146, 250, 228, ${0.16 + pulse * 0.08})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, cell.rx, cell.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (!perfMode) {
    ctx.strokeStyle = "rgba(220, 255, 246, 0.14)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-cell.rx * 0.12, -cell.ry * 0.08, Math.min(cell.rx, cell.ry) * 0.45, Math.PI * 0.15, Math.PI * 1.7);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWindWispCluster(ctx, cluster, frame, perfMode) {
  const pulse = 0.78 + Math.sin(frame * 0.024 + cluster.phase) * 0.08;

  const glow = ctx.createRadialGradient(cluster.x, cluster.y, 0, cluster.x, cluster.y, 94);
  glow.addColorStop(0, `rgba(214, 255, 248, ${0.08 * pulse})`);
  glow.addColorStop(0.5, `rgba(92, 226, 208, ${0.1 * cluster.glow})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cluster.x, cluster.y, 94, 0, Math.PI * 2);
  ctx.fill();

  cluster.wisps.forEach((wisp, index) => {
    ctx.save();
    ctx.translate(cluster.x + wisp.ox, cluster.y + wisp.oy);
    ctx.rotate(wisp.tilt);
    ctx.strokeStyle =
      index % 2 === 0
        ? "rgba(206, 255, 246, 0.22)"
        : "rgba(120, 246, 224, 0.18)";
    ctx.lineWidth = perfMode ? 2 : 2.8;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      wisp.radius * 1.15,
      wisp.radius * wisp.stretch,
      0,
      Math.PI * 0.18,
      Math.PI * 1.74,
    );
    ctx.stroke();

    if (!perfMode) {
      ctx.strokeStyle = "rgba(226, 255, 250, 0.16)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(
        wisp.radius * 0.08,
        -wisp.radius * 0.06,
        wisp.radius * 0.44,
        wisp.arcOffset,
        wisp.arcOffset + Math.PI * 1.1,
      );
      ctx.stroke();
    }

    ctx.restore();
  });
}

function drawWindVortexField(ctx, vortex, frame, perfMode) {
  const pulse = 0.72 + Math.sin(frame * 0.018 + vortex.phase) * 0.12;
  const radius = vortex.radius * (perfMode ? 0.92 : 1);

  const grad = ctx.createRadialGradient(vortex.x, vortex.y, 0, vortex.x, vortex.y, radius);
  grad.addColorStop(0, `rgba(202, 255, 244, ${vortex.strength * 0.14 * pulse})`);
  grad.addColorStop(0.52, `rgba(90, 222, 196, ${vortex.strength * 0.12 * pulse})`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(vortex.x, vortex.y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (perfMode) return;

  ctx.strokeStyle = "rgba(208, 255, 246, 0.12)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(
    vortex.x,
    vortex.y,
    radius * 0.52,
    frame * 0.01 * vortex.spin,
    frame * 0.01 * vortex.spin + Math.PI * 1.35,
  );
  ctx.stroke();
}

function drawWindSpecks(ctx, cx, cy, cw, ch, frame, perfMode) {
  const speckCount = perfMode ? 14 : 26;
  for (let i = 0; i < speckCount; i++) {
    const speed = 0.24 + (i % 4) * 0.06;
    const drift = (frame * speed + i * 27) % (cw + 180);
    const sway = Math.sin(frame * 0.014 + i * 0.85) * (10 + (i % 3) * 6);
    const x = cx - 90 + drift;
    const y = cy + ((i * 101.7) % (ch + 90)) - 45 + sway;
    const len = perfMode ? 6 + (i % 3) * 2 : 8 + (i % 4) * 2.5;
    const alpha = 0.08 + ((Math.sin(frame * 0.022 + i * 1.5) + 1) * 0.5) * 0.08;

    ctx.strokeStyle = `rgba(194, 255, 244, ${alpha})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y - len * 0.08);
    ctx.stroke();
  }
}

function drawWindThemeDetails(ctx, cx, cy, cw, ch, frame) {
  const perfMode = isPerformanceMode(state);
  const data = state.mapThemeData;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const mistPattern = ctx.createPattern(ensureWindMistPatternCanvas(), "repeat");
  if (mistPattern) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = mistPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  const flowPattern = ctx.createPattern(ensureWindFlowPatternCanvas(), "repeat");
  if (flowPattern) {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = flowPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  ctx.restore();

  if (!data || data.theme !== "wind") return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const lane of data.streamLanes || []) {
    if (!intersectsView(lane.minX, lane.minY, lane.maxX, lane.maxY, cx, cy, cw, ch, 120)) {
      continue;
    }
    drawWindLane(ctx, lane, frame);
  }

  for (const cell of data.pressureCells || []) {
    if (!intersectsView(cell.x - cell.rx, cell.y - cell.ry, cell.x + cell.rx, cell.y + cell.ry, cx, cy, cw, ch, 140)) {
      continue;
    }
    drawWindPressureCell(ctx, cell, frame, perfMode);
  }

  for (const cluster of data.wispClusters || []) {
    if (!intersectsView(cluster.minX, cluster.minY, cluster.maxX, cluster.maxY, cx, cy, cw, ch, 80)) {
      continue;
    }
    drawWindWispCluster(ctx, cluster, frame, perfMode);
  }

  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (const vortex of data.vortexFields || []) {
    if (!intersectsView(vortex.x - vortex.radius, vortex.y - vortex.radius, vortex.x + vortex.radius, vortex.y + vortex.radius, cx, cy, cw, ch, 60)) {
      continue;
    }
    drawWindVortexField(ctx, vortex, frame, perfMode);
  }

  drawWindSpecks(ctx, cx, cy, cw, ch, frame, perfMode);
  ctx.restore();
}

function drawThunderChannel(ctx, channel, frame) {
  const pulse = (Math.sin(frame * channel.flicker + channel.phase) + 1) * 0.5;

  const drawBoltPath = (points, jitterScale = 1) => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const jitterX =
        Math.sin(frame * (channel.flicker + 0.01) + channel.phase + i * 1.9) *
        5 *
        jitterScale;
      const jitterY =
        Math.cos(frame * (channel.flicker + 0.008) + channel.phase + i * 1.4) *
        2.5 *
        jitterScale;
      ctx.lineTo(point.x + jitterX, point.y + jitterY);
    }
  };

  drawBoltPath(channel.points, 1);
  ctx.strokeStyle = `rgba(255, 196, 84, ${0.12 + pulse * 0.08})`;
  ctx.lineWidth = channel.outerWidth;
  ctx.shadowBlur = 22;
  ctx.shadowColor = "rgba(255, 192, 82, 0.24)";
  ctx.stroke();

  drawBoltPath(channel.points, 0.75);
  ctx.strokeStyle = `rgba(255, 236, 132, ${0.2 + pulse * 0.14})`;
  ctx.lineWidth = channel.innerWidth;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "rgba(255, 228, 112, 0.26)";
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 244, 186, ${0.16 + pulse * 0.08})`;
  for (let i = 1; i < channel.points.length - 1; i++) {
    const point = channel.points[i];
    const radius = 2.4 + ((i + frame) % 3) * 0.35;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const branch of channel.branches || []) {
    drawBoltPath(branch.points, 0.72);
    ctx.strokeStyle = `rgba(255, 204, 102, ${0.08 + pulse * 0.06})`;
    ctx.lineWidth = Math.max(3, channel.innerWidth * 0.72);
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(255, 196, 90, 0.18)";
    ctx.stroke();

    drawBoltPath(branch.points, 0.55);
    ctx.strokeStyle = `rgba(255, 236, 134, ${0.12 + pulse * 0.1})`;
    ctx.lineWidth = Math.max(1.6, channel.innerWidth * 0.34);
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(255, 228, 112, 0.16)";
    ctx.stroke();
  }
}

function drawThunderNode(ctx, node, frame, perfMode) {
  const pulse = 0.78 + Math.sin(frame * 0.024 + node.phase) * 0.1;

  ctx.save();
  ctx.translate(node.x, node.y);
  ctx.rotate(node.angle);

  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, node.rx * 1.35);
  glow.addColorStop(0, `rgba(255, 248, 194, ${0.14 * pulse})`);
  glow.addColorStop(0.42, `rgba(255, 220, 96, ${0.18 * node.glow})`);
  glow.addColorStop(0.72, `rgba(255, 174, 58, ${0.12 * node.glow})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, node.rx * 1.25, node.ry * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 230, 118, ${0.18 + pulse * 0.08})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, node.rx, node.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 247, 214, ${0.18 + pulse * 0.08})`;
  ctx.beginPath();
  ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 234, 122, ${0.14 + pulse * 0.1})`;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const angle = frame * 0.018 + node.phase + i * ((Math.PI * 2) / 3);
    const sx = Math.cos(angle) * node.radius * 0.62;
    const sy = Math.sin(angle) * node.radius * 0.62;
    const mx = Math.cos(angle + 0.28) * node.radius * 0.98;
    const my = Math.sin(angle + 0.28) * node.radius * 0.98;
    const ex = Math.cos(angle + 0.12) * node.radius * 1.28;
    const ey = Math.sin(angle + 0.12) * node.radius * 1.28;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(mx, my);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  if (!perfMode) {
    ctx.strokeStyle = "rgba(255, 232, 146, 0.18)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, node.radius * 0.7, frame * 0.012, frame * 0.012 + Math.PI * 1.45);
    ctx.stroke();
  }

  ctx.restore();
}

function drawThunderSpikeCluster(ctx, cluster, frame, perfMode) {
  const pulse = 0.76 + Math.sin(frame * 0.02 + cluster.phase) * 0.08;

  const glow = ctx.createRadialGradient(cluster.x, cluster.y - 8, 0, cluster.x, cluster.y - 8, 96);
  glow.addColorStop(0, `rgba(255, 242, 164, ${0.1 * pulse})`);
  glow.addColorStop(0.52, `rgba(255, 196, 82, ${0.12 * cluster.glow})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cluster.x, cluster.y, 96, 0, Math.PI * 2);
  ctx.fill();

  cluster.spikes.forEach((spike, index) => {
    ctx.save();
    ctx.translate(cluster.x + spike.ox, cluster.y + spike.oy);
    ctx.rotate(spike.lean);

    const fill = ctx.createLinearGradient(0, 0, 0, -spike.height);
    fill.addColorStop(0, "rgba(122, 76, 22, 0.96)");
    fill.addColorStop(0.34, "rgba(212, 150, 44, 0.98)");
    fill.addColorStop(0.7, "rgba(255, 226, 108, 0.94)");
    fill.addColorStop(1, "rgba(255, 248, 204, 1)");

    ctx.beginPath();
    ctx.moveTo(-spike.width * 0.6, 0);
    ctx.lineTo(-spike.width * 0.28, -spike.height * 0.78);
    ctx.lineTo(0, -spike.height);
    ctx.lineTo(spike.width * 0.34, -spike.height * 0.72);
    ctx.lineTo(spike.width * 0.56, 0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle =
      index % 2 === 0 ? "rgba(255, 244, 186, 0.34)" : "rgba(255, 214, 122, 0.28)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (!perfMode) {
      ctx.strokeStyle = "rgba(255, 235, 126, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -spike.height * 0.92);
      ctx.lineTo(spike.width * 0.08, -spike.height * 0.16);
      ctx.stroke();
    }

    ctx.restore();
  });
}

function drawThunderChargeField(ctx, field, frame, perfMode) {
  const pulse = 0.72 + Math.sin(frame * 0.02 + field.phase) * 0.12;
  const radius = field.radius * (perfMode ? 0.92 : 1);

  const grad = ctx.createRadialGradient(field.x, field.y, 0, field.x, field.y, radius);
  grad.addColorStop(0, `rgba(255, 238, 142, ${field.strength * 0.16 * pulse})`);
  grad.addColorStop(0.48, `rgba(255, 188, 76, ${field.strength * 0.14 * pulse})`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(field.x, field.y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (perfMode) return;

  ctx.strokeStyle = "rgba(255, 232, 126, 0.14)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(
    field.x,
    field.y,
    radius * 0.5,
    frame * 0.012 * field.polarity,
    frame * 0.012 * field.polarity + Math.PI * 1.22,
  );
  ctx.stroke();
}

function drawThunderArcFlickers(ctx, cx, cy, cw, ch, frame, perfMode) {
  const arcCount = perfMode ? 10 : 18;
  for (let i = 0; i < arcCount; i++) {
    const speed = 0.2 + (i % 4) * 0.05;
    const drift = (frame * speed + i * 31) % (cw + 180);
    const bob = Math.sin(frame * 0.018 + i * 0.92) * (12 + (i % 3) * 7);
    const x = cx - 90 + drift;
    const y = cy + ((i * 109.7) % (ch + 90)) - 45 + bob;
    const len = perfMode ? 9 + (i % 3) * 2 : 12 + (i % 4) * 3;
    const alpha = 0.08 + ((Math.sin(frame * 0.03 + i * 1.6) + 1) * 0.5) * 0.1;

    ctx.strokeStyle = `rgba(255, 232, 126, ${alpha})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * 0.3, y - len * 0.45);
    ctx.lineTo(x + len * 0.62, y - len * 0.16);
    ctx.lineTo(x + len, y - len * 0.56);
    ctx.stroke();

    if (!perfMode && i % 2 === 0) {
      ctx.strokeStyle = `rgba(255, 212, 126, ${alpha * 0.8})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + len * 0.3, y - len * 0.45);
      ctx.lineTo(x + len * 0.42, y - len * 0.8);
      ctx.lineTo(x + len * 0.58, y - len * 0.5);
      ctx.stroke();
    }
  }
}

function drawThunderThemeDetails(ctx, cx, cy, cw, ch, frame) {
  const perfMode = isPerformanceMode(state);
  const data = state.mapThemeData;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const sparkPattern = ctx.createPattern(ensureThunderSparkPatternCanvas(), "repeat");
  if (sparkPattern) {
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = sparkPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  const circuitPattern = ctx.createPattern(ensureThunderCircuitPatternCanvas(), "repeat");
  if (circuitPattern) {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = circuitPattern;
    ctx.fillRect(cx, cy, cw, ch);
  }

  ctx.restore();

  if (!data || data.theme !== "thunder") return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const channel of data.surgeChannels || []) {
    if (!intersectsView(channel.minX, channel.minY, channel.maxX, channel.maxY, cx, cy, cw, ch, 120)) {
      continue;
    }
    drawThunderChannel(ctx, channel, frame);
  }

  for (const node of data.capacitorNodes || []) {
    if (!intersectsView(node.x - node.rx, node.y - node.ry, node.x + node.rx, node.y + node.ry, cx, cy, cw, ch, 140)) {
      continue;
    }
    drawThunderNode(ctx, node, frame, perfMode);
  }

  for (const cluster of data.conductorSpikes || []) {
    if (!intersectsView(cluster.minX, cluster.minY, cluster.maxX, cluster.maxY, cx, cy, cw, ch, 80)) {
      continue;
    }
    drawThunderSpikeCluster(ctx, cluster, frame, perfMode);
  }

  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (const field of data.chargeFields || []) {
    if (!intersectsView(field.x - field.radius, field.y - field.radius, field.x + field.radius, field.y + field.radius, cx, cy, cw, ch, 60)) {
      continue;
    }
    drawThunderChargeField(ctx, field, frame, perfMode);
  }

  drawThunderArcFlickers(ctx, cx, cy, cw, ch, frame, perfMode);
  ctx.restore();
}

// ===== THEMED BACKGROUND (main entry) =====
export function drawThemedBackground(ctx) {
  const theme = state.currentMapTheme || "fire";
  const w = state.world.width;
  const h = state.world.height;
  const cx = state.camera.x;
  const cy = state.camera.y;
  const cw = state.camera.width;
  const ch = state.camera.height;
  const t = state.frameCount;

  ctx.save();

  // 1. TÔ NỀN GỐC (Chỉ fill vùng Camera)
  let colors = {
    fire: ["#180804", "#040101"],
    earth: ["#24160b", "#080503"],
    ice: ["#0a2a52", "#020a18"],
    wind: ["#072520", "#010807"],
    thunder: ["#211604", "#060300"],
    void: ["#030005", "#000000"],
    glitch: ["#050505", "#000000"],
    omni: [`hsla(${(t * 0.5) % 360}, 50%, 8%, 1)`, "#000000"],
  };

  let cSet = colors[theme] || colors.fire;
  let bgGrad = ctx.createRadialGradient(
    cx + cw / 2,
    cy + ch / 2,
    0,
    cx + cw / 2,
    cy + ch / 2,
    cw,
  );
  bgGrad.addColorStop(0, cSet[0]);
  bgGrad.addColorStop(1, cSet[1]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(cx, cy, cw, ch);

  // 2. LƯỚI KHÔNG GIAN ĐỔI MÀU THEO THEME
  const gridSize = 100;
  const startX = Math.floor(cx / gridSize) * gridSize;
  const startY = Math.floor(cy / gridSize) * gridSize;

  let gridAlpha = 0.05;
  let gridColor = "255, 255, 255";

  if (theme === "fire") gridColor = "255, 60, 0";
  if (theme === "earth") gridColor = "188, 136, 72";
  if (theme === "ice") gridColor = "72, 184, 255";
  if (theme === "wind") gridColor = "84, 244, 214";
  if (theme === "thunder") gridColor = "255, 222, 96";
  if (theme === "void") {
    gridColor = "100, 0, 255";
    gridAlpha = 0.03;
  }
  if (theme === "glitch") {
    gridColor = t % 10 < 2 ? "255, 0, 255" : "0, 255, 0";
    gridAlpha = 0.1;
    if (t % 20 < 2)
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  }
  if (theme === "omni") {
    gridColor = `${Math.floor((Math.sin(t * 0.05) + 1) * 127)}, ${Math.floor((Math.cos(t * 0.05) + 1) * 127)}, 255`;
    gridAlpha = 0.08;
  }

  ctx.strokeStyle = `rgba(${gridColor}, ${gridAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let x = startX; x <= cx + cw; x += gridSize) {
    ctx.moveTo(x, Math.max(0, cy));
    ctx.lineTo(x, Math.min(h, cy + ch));
  }
  for (let y = startY; y <= cy + ch; y += gridSize) {
    ctx.moveTo(Math.max(0, cx), y);
    ctx.lineTo(Math.min(w, cx + cw), y);
  }
  ctx.stroke();

  // 3. HIỆU ỨNG TRANG TRÍ THEO BẢN ĐỒ
  ctx.globalCompositeOperation = "lighter";

  if (theme === "fire") {
    drawFireThemeDetails(ctx, cx, cy, cw, ch, t);
  } else if (theme === "earth") {
    drawEarthThemeDetails(ctx, cx, cy, cw, ch, t);
  } else if (theme === "wind") {
    drawWindThemeDetails(ctx, cx, cy, cw, ch, t);
  } else if (theme === "thunder") {
    drawThunderThemeDetails(ctx, cx, cy, cw, ch, t);
  } else if (theme === "glitch") {
    ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
    ctx.font = "bold 20px monospace";
    for (let i = 0; i < 15; i++) {
      let bx = cx + ((Math.sin(i * 77) * cw) / 2 + cw / 2);
      let by = cy + ((t * 8 + i * 200) % (ch + 100)) - 50;
      ctx.fillText(Math.random() > 0.5 ? "1" : "0", bx, by);
    }
  } else if (theme === "void") {
    ctx.fillStyle = "rgba(100, 0, 255, 0.1)";
    for (let i = 0; i < 10; i++) {
      let nx = cx + ((Math.sin(i * 99) * cw) / 2 + cw / 2);
      let ny = cy + ((Math.cos(i * 88) * ch) / 2 + ch / 2);
      ctx.beginPath();
      ctx.arc(nx, ny, Math.sin(t * 0.05 + i) * 30 + 50, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === "ice") {
    drawIceThemeDetails(ctx, cx, cy, cw, ch, t);
  }

  ctx.restore();
}
