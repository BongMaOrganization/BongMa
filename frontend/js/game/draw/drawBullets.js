import { state } from "../../state.js";
import {
  shouldUseExtremeBulletDraw,
  shouldUseFastBulletDraw,
  withParticleSpawnBudget,
} from "../vfxBudget.js";

const FAST_BULLET_COLORS = {
  speedster_lightning: ["#fff36a", "#ffd400"],
  ghost_wisp: ["#f7fbff", "#9f7cff"],
  warden_sigil: ["#ffd700", "#00ffcc"],
  engineer_plasma: ["#00ffcc", "#00d9ff"],
  druid_seed: ["#beff78", "#00ff88"],
  brawler_impact: ["#ffc800", "#ff6432"],
  medic_serum: ["#00ffaa", "#dfffee"],
  tank_fortress: ["#bdf6ff", "#00ffcc"],
  mage_fire: ["#ffc800", "#ff5a1f"],
  assassin_blade: ["#ff3355", "#00ffcc"],
  hunter_bolt: ["#ffd46a", "#8b5a2b"],
  frost_crystal: ["#ffffff", "#63dfff"],
  gunner_round: ["#fff1a3", "#ff9f1a"],
  knight_blade: ["#f7f1d0", "#5fb3ff"],
  oracle_eye: ["#e9d7ff", "#50f5ff"],
  alchemist_flask: ["#d7fff4", "#00ff9d"],
  sharpshooter_mark: ["#f7f1ff", "#ffd36a"],
  berserker_rage: ["#ffd2c0", "#ff2448"],
  summoner_soul: ["#ffffff", "#b9b9c8"],
  sniper_round: ["#eafff4", "#7dffac"],
  spirit_orb: ["#f8ffff", "#7dfff7"],
  timekeeper_space: ["#f4ffff", "#71d8ff"],
  void_shard: ["#f3dcff", "#7a18ff"],
  storm_bolt: ["#f4ffff", "#27d7ff"],
  reaper_soul: ["#efe6cd", "#ff2448"],
  phoenix_fire: ["#fffdf0", "#ff4b18"],
  scout_arc: ["#f4ffff", "#43f5ff"],
};

function isBulletVisible(b, padding = 160) {
  const cam = state.camera;
  if (!cam) return true;
  const width = cam.width || 0;
  const height = cam.height || 0;
  return (
    b.x >= cam.x - padding &&
    b.x <= cam.x + width + padding &&
    b.y >= cam.y - padding &&
    b.y <= cam.y + height + padding
  );
}

function drawFastBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const colors = FAST_BULLET_COLORS[b.visualStyle] || (b.isPlayer ? ["#eaffff", "#00ffcc"] : ["#ffd0d0", "#ff4d4d"]);
  const r = Math.max(3, Math.min(8, b.radius || 4));
  const trail = Math.max(12, r * 4);

  ctx.save();
  ctx.globalCompositeOperation = b.isPlayer ? "lighter" : "source-over";
  ctx.lineCap = "round";
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = Math.max(2, r * 0.8);
  ctx.globalAlpha = 0.68;
  ctx.beginPath();
  ctx.moveTo(b.x - nx * trail, b.y - ny * trail);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawJaggedLine(ctx, points, jitter = 0) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(
      points[i].x + (Math.random() - 0.5) * jitter,
      points[i].y + (Math.random() - 0.5) * jitter,
    );
  }
  ctx.stroke();
}

function drawSpeedsterBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const len = Math.max(18, b.radius * 5);
  const pulse = (Math.sin(state.frameCount * 0.45) + 1) * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * b.radius * 2,
      y: b.y - ny * b.radius * 2,
      vx: -nx * 0.8 + (Math.random() - 0.5) * 0.8,
      vy: -ny * 0.8 + (Math.random() - 0.5) * 0.8,
      life: 18,
      color: Math.random() > 0.35 ? "#ffd400" : "#ffffff",
      size: 1.5 + Math.random() * 2.5,
    });
  }

  const points = [
    { x: b.x + nx * len * 0.45, y: b.y + ny * len * 0.45 },
    {
      x: b.x + nx * len * 0.12 + px * b.radius * 0.7,
      y: b.y + ny * len * 0.12 + py * b.radius * 0.7,
    },
    {
      x: b.x - nx * len * 0.15 - px * b.radius * 0.8,
      y: b.y - ny * len * 0.15 - py * b.radius * 0.8,
    },
    { x: b.x - nx * len * 0.55, y: b.y - ny * len * 0.55 },
  ];

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 22 + pulse * 12;
  ctx.shadowColor = "#ffd400";
  ctx.strokeStyle = "rgba(255, 174, 0, 0.45)";
  ctx.lineWidth = b.radius * 2.6;
  drawJaggedLine(ctx, points, 5);

  ctx.strokeStyle = "rgba(255, 235, 80, 0.9)";
  ctx.lineWidth = b.radius * 1.3;
  drawJaggedLine(ctx, points, 4);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.5, b.radius * 0.45);
  drawJaggedLine(ctx, points, 2);

  for (let i = 0; i < 2; i++) {
    const a = state.frameCount * 0.2 + i * Math.PI;
    const sideLen = b.radius * (1.8 + pulse);
    ctx.strokeStyle = `rgba(255, 255, 160, ${0.45 + pulse * 0.35})`;
    ctx.lineWidth = 1.5;
    drawJaggedLine(
      ctx,
      [
        { x: b.x, y: b.y },
        {
          x: b.x + Math.cos(a) * sideLen,
          y: b.y + Math.sin(a) * sideLen,
        },
      ],
      4,
    );
  }

  const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.4);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.35, "#fff36a");
  grad.addColorStop(1, "rgba(255, 160, 0, 0)");
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius * (1.25 + pulse * 0.25), 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

function drawGhostBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const len = Math.max(16, b.radius * 5.5);
  const pulse = (Math.sin(state.frameCount * 0.24 + b.x * 0.01) + 1) * 0.5;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));

  if (state.frameCount % 3 === 0) {
    state.particles.push({
      x: b.x - nx * b.radius * 2 + px * (Math.random() - 0.5) * b.radius,
      y: b.y - ny * b.radius * 2 + py * (Math.random() - 0.5) * b.radius,
      vx: -nx * 0.45 + (Math.random() - 0.5) * 0.45,
      vy: -ny * 0.45 - Math.random() * 0.35,
      life: 24,
      color: Math.random() > 0.35 ? "#d8d8ff" : "#9f7cff",
      size: 2 + Math.random() * 3,
    });
  }

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, len * 0.9);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.8)");
  aura.addColorStop(0.38, "rgba(185, 165, 255, 0.36)");
  aura.addColorStop(1, "rgba(50, 20, 110, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.65, b.radius * (2.2 + pulse * 0.5), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.shadowBlur = 24 + pulse * 12;
  ctx.shadowColor = "#b8a8ff";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(len * 0.48, 0);
  ctx.bezierCurveTo(
    len * 0.08,
    -b.radius * (2.2 + pulse),
    -len * 0.36,
    -b.radius * (1.2 + pulse * 0.5),
    -len * 0.62,
    0,
  );
  ctx.bezierCurveTo(
    -len * 0.36,
    b.radius * (1.2 + pulse * 0.5),
    len * 0.08,
    b.radius * (2.2 + pulse),
    len * 0.48,
    0,
  );
  ctx.closePath();
  ctx.fillStyle = "rgba(170, 145, 255, 0.58)";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(len * 0.12, 0, b.radius * (1.1 + pulse * 0.25), b.radius * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#f7fbff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffffff";
  ctx.fill();

  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const y = (i - 1) * b.radius * 0.85;
    const wave = Math.sin(state.frameCount * 0.18 + i) * b.radius * 0.8;
    ctx.beginPath();
    ctx.moveTo(-len * 0.1, y);
    ctx.quadraticCurveTo(-len * 0.45, y + wave, -len * 0.86, y * 0.3);
    ctx.strokeStyle = i === 1
      ? "rgba(245, 250, 255, 0.62)"
      : "rgba(155, 125, 255, 0.44)";
    ctx.lineWidth = i === 1 ? 2 : 1.4;
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#9f7cff";
    ctx.stroke();
  }

  ctx.restore();
}

function drawWardenBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const pulse = (Math.sin(state.frameCount * 0.26 + b.y * 0.01) + 1) * 0.5;
  const angle = Math.atan2(b.vy, b.vx);
  const R = Math.max(8, b.radius * 2.2);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 3 === 0) {
    state.particles.push({
      x: b.x - nx * b.radius * 2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * b.radius * 2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.55 + (Math.random() - 0.5) * 0.35,
      vy: -ny * 0.55 + (Math.random() - 0.5) * 0.35,
      life: 22,
      color: Math.random() > 0.3 ? "#ffd700" : "#00ffcc",
      size: 1.8 + Math.random() * 2.4,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 3.2,
    b.y - ny * R * 3.2,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(0, 255, 204, 0)");
  tail.addColorStop(0.45, "rgba(255, 215, 0, 0.25)");
  tail.addColorStop(1, "rgba(255, 245, 170, 0.76)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.2, b.y + ny * R * 1.2);
  ctx.lineTo(b.x - nx * R * 3.0 + px * R * 0.72, b.y - ny * R * 3.0 + py * R * 0.72);
  ctx.lineTo(b.x - nx * R * 2.4 - px * R * 0.72, b.y - ny * R * 2.4 - py * R * 0.72);
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffd700";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle + state.frameCount * 0.08);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.9);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  glow.addColorStop(0.36, "rgba(255, 215, 0, 0.48)");
  glow.addColorStop(1, "rgba(120, 75, 0, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, R * (1.15 + pulse * 0.18), 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  for (let ring = 0; ring < 2; ring++) {
    const sides = ring === 0 ? 6 : 8;
    const rr = R * (1 + ring * 0.42 + pulse * 0.08);
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = -Math.PI / 2 + (i / sides) * Math.PI * 2;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = ring === 0 ? "rgba(255, 245, 170, 0.95)" : "rgba(0, 255, 204, 0.48)";
    ctx.lineWidth = ring === 0 ? 2.4 : 1.4;
    ctx.shadowBlur = ring === 0 ? 18 : 12;
    ctx.shadowColor = ring === 0 ? "#ffd700" : "#00ffcc";
    ctx.stroke();
  }

  ctx.rotate(-state.frameCount * 0.16);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#fff3a6";
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.72);
  ctx.lineTo(R * 0.42, 0);
  ctx.lineTo(0, R * 0.72);
  ctx.lineTo(-R * 0.42, 0);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, R * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#fff8d0";
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#ffd700";
  ctx.fill();

  ctx.restore();
}

function drawEngineerBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.32 + b.x * 0.01) + 1) * 0.5;
  const R = Math.max(7, b.radius * 2.1);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.4 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.4 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.65 + (Math.random() - 0.5) * 0.3,
      vy: -ny * 0.65 + (Math.random() - 0.5) * 0.3,
      life: 18,
      color: Math.random() > 0.35 ? "#00ffcc" : "#9dff6a",
      size: 1.5 + Math.random() * 2.2,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 3.4,
    b.y - ny * R * 3.4,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(0, 255, 204, 0)");
  tail.addColorStop(0.45, "rgba(0, 217, 255, 0.28)");
  tail.addColorStop(1, "rgba(157, 255, 106, 0.72)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.25, b.y + ny * R * 1.25);
  ctx.lineTo(b.x - nx * R * 3.0 + px * R * 0.56, b.y - ny * R * 3.0 + py * R * 0.56);
  ctx.lineTo(b.x - nx * R * 2.6 - px * R * 0.56, b.y - ny * R * 2.6 - py * R * 0.56);
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#00ffcc";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.88)");
  aura.addColorStop(0.34, "rgba(0, 255, 204, 0.5)");
  aura.addColorStop(1, "rgba(0, 45, 65, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.45 + pulse * 0.18), R * (0.92 + pulse * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#00ffcc";
  ctx.fill();

  ctx.save();
  ctx.rotate(state.frameCount * 0.12);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55);
    ctx.lineTo(Math.cos(a) * R * 1.35, Math.sin(a) * R * 1.35);
    ctx.strokeStyle = i % 2 === 0 ? "rgba(234, 255, 255, 0.9)" : "rgba(157, 255, 106, 0.72)";
    ctx.lineWidth = 1.6;
    ctx.shadowBlur = 12;
    ctx.shadowColor = i % 2 === 0 ? "#eaffff" : "#9dff6a";
    ctx.stroke();
  }
  ctx.restore();

  ctx.rotate(state.frameCount * 0.08);
  ctx.strokeStyle = "rgba(0, 217, 255, 0.82)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * R * (1 + pulse * 0.08);
    const y = Math.sin(a) * R * (1 + pulse * 0.08);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#00d9ff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, R * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = "#eaffff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function drawDruidBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.24 + b.x * 0.01) + 1) * 0.5;
  const R = Math.max(7, b.radius * 2.1);
  const split = b.isSplit;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.45 + (Math.random() - 0.5) * 0.35,
      vy: -ny * 0.45 - Math.random() * 0.2,
      life: 20,
      color: Math.random() > 0.35 ? "#00ff88" : "#beff78",
      size: 1.8 + Math.random() * 2.6,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 3.2,
    b.y - ny * R * 3.2,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(0, 255, 136, 0)");
  tail.addColorStop(0.42, split ? "rgba(190, 255, 120, 0.34)" : "rgba(0, 255, 136, 0.28)");
  tail.addColorStop(1, "rgba(239, 255, 216, 0.76)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.1, b.y + ny * R * 1.1);
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.7 + px * R * (0.7 + pulse * 0.2),
    b.y - ny * R * 1.7 + py * R * (0.7 + pulse * 0.2),
    b.x - nx * R * 3.0,
    b.y - ny * R * 3.0,
  );
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.7 - px * R * (0.7 + pulse * 0.2),
    b.y - ny * R * 1.7 - py * R * (0.7 + pulse * 0.2),
    b.x + nx * R * 1.1,
    b.y + ny * R * 1.1,
  );
  ctx.fillStyle = tail;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#00ff88";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle + Math.sin(state.frameCount * 0.08) * 0.12);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2);
  glow.addColorStop(0, "rgba(245, 255, 220, 0.92)");
  glow.addColorStop(0.38, split ? "rgba(190, 255, 120, 0.55)" : "rgba(0, 255, 136, 0.52)");
  glow.addColorStop(1, "rgba(10, 70, 20, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.25 + pulse * 0.18), R * (0.82 + pulse * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.shadowBlur = 24;
  ctx.shadowColor = split ? "#beff78" : "#00ff88";
  ctx.fill();

  ctx.fillStyle = split ? "#beff78" : "#00ff88";
  ctx.strokeStyle = "rgba(245, 255, 220, 0.85)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(R * 1.25, 0);
  ctx.bezierCurveTo(R * 0.25, -R * 0.92, -R * 0.95, -R * 0.62, -R * 1.35, 0);
  ctx.bezierCurveTo(-R * 0.95, R * 0.62, R * 0.25, R * 0.92, R * 1.25, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(245, 255, 220, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-R * 0.95, 0);
  ctx.lineTo(R * 0.92, 0);
  ctx.stroke();

  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    ctx.moveTo(-R * 0.28, 0);
    ctx.quadraticCurveTo(R * 0.1, i * R * 0.22, R * 0.55, i * R * 0.32);
    ctx.strokeStyle = "rgba(239, 255, 216, 0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(R * 0.22, 0, R * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#efffd8";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#efffd8";
  ctx.fill();

  ctx.restore();
}

function drawBrawlerBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.34 + b.x * 0.01) + 1) * 0.5;
  const R = Math.max(8, b.radius * 2.25);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.7 + (Math.random() - 0.5) * 0.55,
      vy: -ny * 0.7 + (Math.random() - 0.5) * 0.55,
      life: 18,
      color: Math.random() > 0.35 ? "#ff6432" : "#ffc800",
      size: 2 + Math.random() * 2.8,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 3.6,
    b.y - ny * R * 3.6,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(255, 60, 20, 0)");
  tail.addColorStop(0.45, "rgba(255, 100, 50, 0.3)");
  tail.addColorStop(1, "rgba(255, 200, 0, 0.74)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.2, b.y + ny * R * 1.2);
  ctx.lineTo(b.x - nx * R * 3.2 + px * R * 0.75, b.y - ny * R * 3.2 + py * R * 0.75);
  ctx.lineTo(b.x - nx * R * 2.55 - px * R * 0.75, b.y - ny * R * 2.55 - py * R * 0.75);
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ff6432";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  aura.addColorStop(0.34, "rgba(255, 200, 0, 0.5)");
  aura.addColorStop(0.68, "rgba(255, 100, 50, 0.36)");
  aura.addColorStop(1, "rgba(90, 20, 0, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.45 + pulse * 0.2), R * (0.95 + pulse * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.shadowBlur = 26;
  ctx.shadowColor = "#ff6432";
  ctx.fill();

  ctx.save();
  ctx.rotate(Math.sin(state.frameCount * 0.12) * 0.18);
  ctx.fillStyle = "#ff6432";
  ctx.strokeStyle = "#ffe4c0";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-R * 0.5, -R * 0.45, R * 1.0, R * 0.78, R * 0.16);
  ctx.fill();
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.roundRect(-R * 0.56 + i * R * 0.28, -R * 0.82, R * 0.22, R * 0.48, R * 0.08);
    ctx.fillStyle = i % 2 === 0 ? "#ffc800" : "#ff8a1c";
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(-R * 0.62, -R * 0.02, R * 0.22, R * 0.32, -0.35, 0, Math.PI * 2);
  ctx.fillStyle = "#ff3b1f";
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 240, 200, 0.82)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + state.frameCount * 0.08;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
    ctx.lineTo(Math.cos(a) * R * (1.35 + pulse * 0.15), Math.sin(a) * R * (1.35 + pulse * 0.15));
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#ffc800";
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(R * 0.18, -R * 0.06, R * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = "#fff2c8";
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function drawMedicBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.26 + b.y * 0.01) + 1) * 0.5;
  const R = Math.max(7, b.radius * 2.1);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.55 + (Math.random() - 0.5) * 0.35,
      vy: -ny * 0.55 + (Math.random() - 0.5) * 0.35,
      life: 18,
      color: Math.random() > 0.25 ? "#00ffcc" : "#00ffaa",
      size: 1.8 + Math.random() * 2.4,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 3.4,
    b.y - ny * R * 3.4,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(0, 255, 204, 0)");
  tail.addColorStop(0.45, "rgba(0, 255, 170, 0.28)");
  tail.addColorStop(1, "rgba(255, 255, 255, 0.72)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.1, b.y + ny * R * 1.1);
  ctx.lineTo(b.x - nx * R * 3.0 + px * R * 0.6, b.y - ny * R * 3.0 + py * R * 0.6);
  ctx.lineTo(b.x - nx * R * 2.55 - px * R * 0.6, b.y - ny * R * 2.55 - py * R * 0.6);
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#00ffcc";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.92)");
  aura.addColorStop(0.34, "rgba(0, 255, 204, 0.52)");
  aura.addColorStop(1, "rgba(0, 55, 55, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.55 + pulse * 0.18), R * (1.05 + pulse * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#00ffaa";
  ctx.fill();

  ctx.save();
  ctx.rotate(state.frameCount * 0.08);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = "rgba(0, 255, 204, 0.9)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-R * 0.78, -R * 0.42, R * 1.56, R * 0.84, R * 0.26);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(R * 0.12, -R * 0.35, R * 0.72, R * 0.7, R * 0.22);
  ctx.fillStyle = "rgba(0, 255, 204, 0.42)";
  ctx.fill();

  ctx.restore();

  ctx.save();
  ctx.rotate(-state.frameCount * 0.1);
  ctx.strokeStyle = "rgba(255, 51, 85, 0.9)";
  ctx.lineWidth = 2.6;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#ff3355";
  ctx.beginPath();
  ctx.moveTo(-R * 0.22, 0);
  ctx.lineTo(R * 0.22, 0);
  ctx.moveTo(0, -R * 0.22);
  ctx.lineTo(0, R * 0.22);
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(-R * 0.18, -R * 0.08, R * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function drawTankBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.22 + b.x * 0.01) + 1) * 0.5;
  const R = Math.max(8, b.radius * 2.25);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.3 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.3 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.75 + (Math.random() - 0.5) * 0.55,
      vy: -ny * 0.75 + (Math.random() - 0.5) * 0.55,
      life: 20,
      color: Math.random() > 0.35 ? "#bdf6ff" : "#00ffcc",
      size: 2 + Math.random() * 2.8,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 4.2,
    b.y - ny * R * 4.2,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(0, 255, 204, 0)");
  tail.addColorStop(0.42, "rgba(189, 246, 255, 0.28)");
  tail.addColorStop(1, "rgba(255, 255, 255, 0.62)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.25, b.y + ny * R * 1.25);
  ctx.lineTo(b.x - nx * R * 3.6 + px * R * 0.7, b.y - ny * R * 3.6 + py * R * 0.7);
  ctx.lineTo(b.x - nx * R * 3.0 - px * R * 0.7, b.y - ny * R * 3.0 - py * R * 0.7);
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#00ffcc";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.2);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.92)");
  aura.addColorStop(0.34, "rgba(189, 246, 255, 0.52)");
  aura.addColorStop(0.66, "rgba(0, 255, 204, 0.36)");
  aura.addColorStop(1, "rgba(0, 30, 45, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.65 + pulse * 0.16), R * (1.05 + pulse * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.shadowBlur = 26;
  ctx.shadowColor = "#bdf6ff";
  ctx.fill();

  ctx.save();
  ctx.rotate(state.frameCount * 0.08);
  ctx.fillStyle = "rgba(6, 22, 26, 0.88)";
  ctx.strokeStyle = "rgba(189, 246, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-R * 0.92, -R * 0.46, R * 1.84, R * 0.92, R * 0.22);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(R * 0.12, -R * 0.34, R * 0.78, R * 0.68, R * 0.18);
  ctx.fillStyle = "rgba(0, 255, 204, 0.22)";
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(0, 255, 204, 0.75)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#00ffcc";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2 + state.frameCount * 0.06;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7);
    ctx.lineTo(Math.cos(a) * R * (1.35 + pulse * 0.1), Math.sin(a) * R * (1.35 + pulse * 0.1));
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(-R * 0.18, -R * 0.06, R * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function drawMageBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.28 + b.x * 0.01) + 1) * 0.5;
  const R = Math.max(8, b.radius * 2.2);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.65 + (Math.random() - 0.5) * 0.55,
      vy: -ny * 0.65 + (Math.random() - 0.5) * 0.55,
      life: 18,
      color: Math.random() > 0.35 ? "#ffb000" : "#ff5a1f",
      size: 2 + Math.random() * 2.6,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 4.0,
    b.y - ny * R * 4.0,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(255, 90, 31, 0)");
  tail.addColorStop(0.42, "rgba(255, 176, 0, 0.26)");
  tail.addColorStop(1, "rgba(255, 255, 255, 0.58)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.25, b.y + ny * R * 1.25);
  ctx.lineTo(b.x - nx * R * 3.4 + px * R * 0.72, b.y - ny * R * 3.4 + py * R * 0.72);
  ctx.lineTo(b.x - nx * R * 2.85 - px * R * 0.72, b.y - ny * R * 2.85 - py * R * 0.72);
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#ff5a1f";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.25);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.92)");
  aura.addColorStop(0.34, "rgba(255, 176, 0, 0.52)");
  aura.addColorStop(0.66, "rgba(255, 90, 31, 0.36)");
  aura.addColorStop(1, "rgba(30, 12, 0, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.65 + pulse * 0.16), R * (1.15 + pulse * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.shadowBlur = 26;
  ctx.shadowColor = "#ffb000";
  ctx.fill();

  ctx.save();
  ctx.rotate(state.frameCount * 0.12);
  ctx.strokeStyle = "rgba(255, 245, 220, 0.85)";
  ctx.lineWidth = 2.2;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffb000";
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    const rr = i % 2 === 0 ? R * (1.05 + pulse * 0.08) : R * 0.5;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(-R * 0.18, -R * 0.06, R * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function drawAssassinBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.34 + b.x * 0.01) + 1) * 0.5;
  const R = Math.max(7, b.radius * 2.1);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.75 + (Math.random() - 0.5) * 0.55,
      vy: -ny * 0.75 + (Math.random() - 0.5) * 0.55,
      life: 18,
      color: Math.random() > 0.45 ? "#ff3355" : "#00ffcc",
      size: 1.8 + Math.random() * 2.4,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 3.8,
    b.y - ny * R * 3.8,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(10, 15, 26, 0)");
  tail.addColorStop(0.38, "rgba(255, 51, 85, 0.18)");
  tail.addColorStop(0.7, "rgba(0, 255, 204, 0.18)");
  tail.addColorStop(1, "rgba(255, 255, 255, 0.48)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.15, b.y + ny * R * 1.15);
  ctx.lineTo(b.x - nx * R * 3.2 + px * R * 0.65, b.y - ny * R * 3.2 + py * R * 0.65);
  ctx.lineTo(b.x - nx * R * 2.6 - px * R * 0.65, b.y - ny * R * 2.6 - py * R * 0.65);
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#0a0f1a";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  aura.addColorStop(0.34, "rgba(255, 51, 85, 0.42)");
  aura.addColorStop(0.62, "rgba(0, 255, 204, 0.32)");
  aura.addColorStop(1, "rgba(5, 8, 15, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.55 + pulse * 0.16), R * (0.95 + pulse * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.shadowBlur = 24;
  ctx.shadowColor = pulse > 0.5 ? "#ff3355" : "#00ffcc";
  ctx.fill();

  ctx.save();
  ctx.rotate(state.frameCount * 0.1);
  ctx.fillStyle = "rgba(10, 15, 26, 0.92)";
  ctx.strokeStyle = "rgba(255, 245, 220, 0.62)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(R * 1.2, 0);
  ctx.lineTo(-R * 0.12, -R * 0.72);
  ctx.lineTo(-R * 1.05, 0);
  ctx.lineTo(-R * 0.12, R * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const a = i * (Math.PI * 2 / 3) + state.frameCount * 0.08;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6);
    ctx.lineTo(Math.cos(a) * R * (1.25 + pulse * 0.12), Math.sin(a) * R * (1.25 + pulse * 0.12));
    ctx.strokeStyle = i === 0 ? "rgba(0, 255, 204, 0.62)" : "rgba(255, 51, 85, 0.62)";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = i === 0 ? "#00ffcc" : "#ff3355";
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(-R * 0.18, -R * 0.06, R * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function drawOracleBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.24 + b.y * 0.01) + 1) * 0.5;
  const R = Math.max(8, b.radius * 2.2);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.55 + (Math.random() - 0.5) * 0.35,
      vy: -ny * 0.55 + (Math.random() - 0.5) * 0.35,
      life: 20,
      color: Math.random() > 0.35 ? "#ffd36a" : "#4aa3ff",
      size: 1.8 + Math.random() * 2.6,
    });
  }

  const tail = ctx.createLinearGradient(
    b.x - nx * R * 3.8,
    b.y - ny * R * 3.8,
    b.x + nx * R,
    b.y + ny * R,
  );
  tail.addColorStop(0, "rgba(74, 163, 255, 0)");
  tail.addColorStop(0.42, "rgba(74, 163, 255, 0.24)");
  tail.addColorStop(0.72, "rgba(255, 211, 106, 0.22)");
  tail.addColorStop(1, "rgba(255, 255, 255, 0.56)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.2, b.y + ny * R * 1.2);
  ctx.lineTo(b.x - nx * R * 3.2 + px * R * 0.62, b.y - ny * R * 3.2 + py * R * 0.62);
  ctx.lineTo(b.x - nx * R * 2.65 - px * R * 0.62, b.y - ny * R * 2.65 - py * R * 0.62);
  ctx.closePath();
  ctx.fillStyle = tail;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#4aa3ff";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.15);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.92)");
  aura.addColorStop(0.34, "rgba(255, 211, 106, 0.5)");
  aura.addColorStop(0.64, "rgba(74, 163, 255, 0.36)");
  aura.addColorStop(1, "rgba(7, 19, 38, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.55 + pulse * 0.18), R * (1.02 + pulse * 0.12), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.shadowBlur = 26;
  ctx.shadowColor = pulse > 0.45 ? "#ffd36a" : "#4aa3ff";
  ctx.fill();

  ctx.save();
  ctx.rotate(state.frameCount * 0.08);
  ctx.strokeStyle = "rgba(255, 211, 106, 0.9)";
  ctx.fillStyle = "rgba(74, 163, 255, 0.46)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffd36a";
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.12, R * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.rotate(-state.frameCount * 0.12);
  ctx.strokeStyle = "rgba(74, 163, 255, 0.78)";
  ctx.lineWidth = 1.6;
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#4aa3ff";
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72);
    ctx.lineTo(Math.cos(a) * R * (1.25 + pulse * 0.12), Math.sin(a) * R * (1.25 + pulse * 0.12));
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(R * 0.08, -R * 0.04, R * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffffff";
  ctx.fill();

  ctx.restore();
}

function drawHunterBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.24 + b.x * 0.012) + 1) * 0.5;
  const R = b.isHunterHarpoon ? Math.max(22, b.radius * 0.75) : Math.max(8, b.radius * 2.05);
  const shaft = b.isHunterHarpoon ? R * 2.9 : R * 2.35;

  ctx.save();

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.1 + px * (Math.random() - 0.5) * R * 0.9,
      y: b.y - ny * R * 1.1 + py * (Math.random() - 0.5) * R * 0.9,
      vx: -nx * 0.45 + (Math.random() - 0.5) * 0.5,
      vy: -ny * 0.45 + (Math.random() - 0.5) * 0.5,
      life: 18,
      color: Math.random() > 0.42 ? "#caa36a" : "#9a6b3b",
      size: 1.8 + Math.random() * (b.isHunterHarpoon ? 3.6 : 2.2),
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4.1,
    b.y - ny * R * 4.1,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(32, 22, 15, 0)");
  trail.addColorStop(0.36, "rgba(107, 69, 40, 0.2)");
  trail.addColorStop(0.72, "rgba(202, 163, 106, 0.24)");
  trail.addColorStop(1, "rgba(234, 214, 173, 0.52)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 0.9, b.y + ny * R * 0.9);
  ctx.lineTo(b.x - nx * R * 3.6 + px * R * 0.44, b.y - ny * R * 3.6 + py * R * 0.44);
  ctx.lineTo(b.x - nx * R * 3.1 - px * R * 0.44, b.y - ny * R * 3.1 - py * R * 0.44);
  ctx.closePath();
  ctx.fillStyle = trail;
  ctx.fill();

  if (b.isHunterHarpoon) {
    ctx.strokeStyle = "rgba(234, 214, 173, 0.34)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(b.x - nx * R * 0.3, b.y - ny * R * 0.3);
    ctx.quadraticCurveTo(
      b.x - nx * R * 2.3 + px * Math.sin(state.frameCount * 0.16) * R * 0.28,
      b.y - ny * R * 2.3 + py * Math.sin(state.frameCount * 0.16) * R * 0.28,
      b.x - nx * R * 4.8,
      b.y - ny * R * 4.8,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.9);
  glow.addColorStop(0, "rgba(234, 214, 173, 0.36)");
  glow.addColorStop(0.5, "rgba(154, 107, 59, 0.18)");
  glow.addColorStop(1, "rgba(32, 22, 15, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.45 + pulse * 0.08), R * (0.72 + pulse * 0.06), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.lineCap = "round";
  ctx.strokeStyle = "#20160f";
  ctx.lineWidth = b.isHunterHarpoon ? 5 : 3;
  ctx.beginPath();
  ctx.moveTo(-shaft, 0);
  ctx.lineTo(R * 0.55, 0);
  ctx.stroke();

  ctx.strokeStyle = "#9a6b3b";
  ctx.lineWidth = b.isHunterHarpoon ? 2.8 : 2;
  ctx.beginPath();
  ctx.moveTo(-shaft * 0.95, -R * 0.12);
  ctx.lineTo(R * 0.42, -R * 0.12);
  ctx.stroke();

  ctx.fillStyle = "#b8aa90";
  ctx.strokeStyle = "#ead6ad";
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = b.isHunterHarpoon ? 18 : 10;
  ctx.shadowColor = "#caa36a";
  ctx.beginPath();
  ctx.moveTo(R * 1.3, 0);
  ctx.lineTo(R * 0.28, -R * 0.48);
  ctx.lineTo(R * 0.48, 0);
  ctx.lineTo(R * 0.28, R * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (b.isHunterHarpoon) {
    ctx.fillStyle = "#6b4528";
    for (let side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.moveTo(R * 0.32, side * R * 0.18);
      ctx.lineTo(-R * 0.08, side * R * 0.56);
      ctx.lineTo(R * 0.06, side * R * 0.18);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ead6ad";
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.moveTo(-shaft * 0.92, 0);
    ctx.lineTo(-shaft * 0.48, side * R * 0.36);
    ctx.lineTo(-shaft * 0.56, side * R * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawFrostBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.26 + b.y * 0.01) + 1) * 0.5;
  const R = Math.max(8, b.radius * (b.isFrostArmorShard ? 1.7 : 2.1));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R + px * (Math.random() - 0.5) * R * 0.8,
      y: b.y - ny * R + py * (Math.random() - 0.5) * R * 0.8,
      vx: -nx * 0.38 + (Math.random() - 0.5) * 0.32,
      vy: -ny * 0.38 + (Math.random() - 0.5) * 0.32,
      life: 18,
      color: Math.random() > 0.4 ? "#dffbff" : "#8feaff",
      size: 1.5 + Math.random() * 2.2,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 3.6,
    b.y - ny * R * 3.6,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(7, 24, 34, 0)");
  trail.addColorStop(0.36, "rgba(99, 214, 255, 0.2)");
  trail.addColorStop(0.72, "rgba(223, 251, 255, 0.28)");
  trail.addColorStop(1, "rgba(255, 255, 255, 0.62)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.05, b.y + ny * R * 1.05);
  ctx.lineTo(b.x - nx * R * 3.1 + px * R * 0.5, b.y - ny * R * 3.1 + py * R * 0.5);
  ctx.lineTo(b.x - nx * R * 2.65 - px * R * 0.5, b.y - ny * R * 2.65 - py * R * 0.5);
  ctx.closePath();
  ctx.fillStyle = trail;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.54)");
  glow.addColorStop(0.42, "rgba(143, 234, 255, 0.3)");
  glow.addColorStop(1, "rgba(7, 24, 34, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.4 + pulse * 0.14), R * (0.8 + pulse * 0.08), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#8feaff";
  ctx.fill();

  ctx.fillStyle = "rgba(143, 234, 255, 0.78)";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#dffbff";
  ctx.beginPath();
  ctx.moveTo(R * 1.15, 0);
  ctx.lineTo(R * 0.18, -R * 0.52);
  ctx.lineTo(-R * 0.92, 0);
  ctx.lineTo(R * 0.18, R * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(R * 0.78, 0);
  ctx.lineTo(-R * 0.52, 0);
  ctx.moveTo(R * 0.08, -R * 0.34);
  ctx.lineTo(-R * 0.18, 0);
  ctx.lineTo(R * 0.08, R * 0.34);
  ctx.stroke();

  ctx.save();
  ctx.rotate(state.frameCount * 0.08);
  ctx.strokeStyle = "rgba(223, 251, 255, 0.54)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.58, Math.sin(a) * R * 0.58);
    ctx.lineTo(Math.cos(a) * R * (0.92 + pulse * 0.08), Math.sin(a) * R * (0.92 + pulse * 0.08));
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function drawGunnerBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.38 + b.x * 0.01) + 1) * 0.5;
  const R = Math.max(7, b.radius * 1.95);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.15 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.15 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.62 + (Math.random() - 0.5) * 0.42,
      vy: -ny * 0.62 + (Math.random() - 0.5) * 0.42,
      life: 16,
      color: Math.random() > 0.38 ? "#ffbf4d" : "#f5f7ff",
      size: 1.5 + Math.random() * 2.5,
    });
  }

  const tracer = ctx.createLinearGradient(
    b.x - nx * R * 4.2,
    b.y - ny * R * 4.2,
    b.x + nx * R,
    b.y + ny * R,
  );
  tracer.addColorStop(0, "rgba(17, 24, 32, 0)");
  tracer.addColorStop(0.28, "rgba(255, 77, 46, 0.14)");
  tracer.addColorStop(0.68, "rgba(255, 191, 77, 0.32)");
  tracer.addColorStop(1, "rgba(245, 247, 255, 0.72)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.05, b.y + ny * R * 1.05);
  ctx.lineTo(b.x - nx * R * 3.85 + px * R * 0.34, b.y - ny * R * 3.85 + py * R * 0.34);
  ctx.lineTo(b.x - nx * R * 3.25 - px * R * 0.34, b.y - ny * R * 3.25 - py * R * 0.34);
  ctx.closePath();
  ctx.fillStyle = tracer;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.9);
  glow.addColorStop(0, "rgba(245, 247, 255, 0.62)");
  glow.addColorStop(0.44, "rgba(255, 191, 77, 0.32)");
  glow.addColorStop(1, "rgba(17, 24, 32, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.48 + pulse * 0.12), R * (0.62 + pulse * 0.08), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ffbf4d";
  ctx.fill();

  ctx.fillStyle = "#f5f7ff";
  ctx.strokeStyle = "#ffbf4d";
  ctx.lineWidth = 1.7;
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#ffbf4d";
  ctx.beginPath();
  ctx.moveTo(R * 1.18, 0);
  ctx.lineTo(R * 0.12, -R * 0.34);
  ctx.lineTo(-R * 0.9, -R * 0.22);
  ctx.lineTo(-R * 0.58, 0);
  ctx.lineTo(-R * 0.9, R * 0.22);
  ctx.lineTo(R * 0.12, R * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#26313d";
  ctx.beginPath();
  ctx.roundRect(-R * 0.54, -R * 0.18, R * 0.9, R * 0.36, 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(245, 247, 255, 0.62)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-R * 0.46, -R * 0.04);
  ctx.lineTo(R * 0.56, -R * 0.04);
  ctx.moveTo(-R * 0.46, R * 0.08);
  ctx.lineTo(R * 0.42, R * 0.08);
  ctx.stroke();

  ctx.save();
  ctx.rotate(state.frameCount * 0.12);
  ctx.strokeStyle = "rgba(255, 191, 77, 0.42)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, R * (0.96 + pulse * 0.08), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.restore();
}

function drawKnightBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.28 + b.x * 0.01) + 1) * 0.5;
  const R = Math.max(8, b.radius * (b.isKnightRiposte ? 2.1 : 1.95));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 2 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.5 + (Math.random() - 0.5) * 0.36,
      vy: -ny * 0.5 + (Math.random() - 0.5) * 0.36,
      life: 18,
      color: Math.random() > 0.42 ? "#ffd36a" : "#d9e3ec",
      size: 1.6 + Math.random() * 2.4,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 3.8,
    b.y - ny * R * 3.8,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(29, 36, 43, 0)");
  trail.addColorStop(0.36, "rgba(79, 124, 255, 0.16)");
  trail.addColorStop(0.7, "rgba(255, 211, 106, 0.28)");
  trail.addColorStop(1, "rgba(255, 255, 255, 0.65)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.1, b.y + ny * R * 1.1);
  ctx.lineTo(b.x - nx * R * 3.2 + px * R * 0.52, b.y - ny * R * 3.2 + py * R * 0.52);
  ctx.lineTo(b.x - nx * R * 2.7 - px * R * 0.52, b.y - ny * R * 2.7 - py * R * 0.52);
  ctx.closePath();
  ctx.fillStyle = trail;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.58)");
  glow.addColorStop(0.42, b.isKnightRiposte ? "rgba(79, 124, 255, 0.34)" : "rgba(255, 211, 106, 0.3)");
  glow.addColorStop(1, "rgba(29, 36, 43, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.55 + pulse * 0.12), R * (0.72 + pulse * 0.08), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.shadowBlur = 20;
  ctx.shadowColor = b.isKnightRiposte ? "#4f7cff" : "#ffd36a";
  ctx.fill();

  ctx.fillStyle = "#d9e3ec";
  ctx.strokeStyle = "#ffd36a";
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#ffd36a";
  ctx.beginPath();
  ctx.moveTo(R * 1.22, 0);
  ctx.lineTo(R * 0.08, -R * 0.36);
  ctx.lineTo(-R * 0.92, 0);
  ctx.lineTo(R * 0.08, R * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(R * 0.78, 0);
  ctx.lineTo(-R * 0.5, 0);
  ctx.stroke();

  ctx.strokeStyle = "#66717d";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-R * 0.12, -R * 0.66);
  ctx.lineTo(-R * 0.12, R * 0.66);
  ctx.stroke();

  ctx.fillStyle = b.isKnightRiposte ? "#4f7cff" : "#ffd36a";
  ctx.beginPath();
  ctx.arc(-R * 0.42, 0, R * 0.18, 0, Math.PI * 2);
  ctx.fill();

  if (b.isKnightRiposte) {
    ctx.save();
    ctx.rotate(state.frameCount * 0.08);
    ctx.strokeStyle = "rgba(79, 124, 255, 0.56)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (1 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

function drawSharpshooterBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.24 + b.y * 0.01) + 1) * 0.5;
  const R = Math.max(8, b.radius * 2.1);
  const focus = !!b.sharpshooterFocus;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % 3 === 0 || focus) {
    state.particles.push({
      x: b.x - nx * R * 1.1 + px * (Math.random() - 0.5) * R * 0.8,
      y: b.y - ny * R * 1.1 + py * (Math.random() - 0.5) * R * 0.8,
      vx: -nx * 0.48 + (Math.random() - 0.5) * 0.32,
      vy: -ny * 0.48 + (Math.random() - 0.5) * 0.32,
      life: 16,
      color: focus
        ? (Math.random() > 0.35 ? "#ff4b6a" : "#ffd36a")
        : (Math.random() > 0.45 ? "#ffd36a" : "#b875ff"),
      size: 1.4 + Math.random() * 2,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4.2,
    b.y - ny * R * 4.2,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(21, 18, 29, 0)");
  trail.addColorStop(0.36, "rgba(184, 117, 255, 0.16)");
  trail.addColorStop(0.72, focus ? "rgba(255, 75, 106, 0.28)" : "rgba(255, 211, 106, 0.24)");
  trail.addColorStop(1, "rgba(247, 241, 255, 0.62)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.12, b.y + ny * R * 1.12);
  ctx.lineTo(b.x - nx * R * 3.7 + px * R * 0.38, b.y - ny * R * 3.7 + py * R * 0.38);
  ctx.lineTo(b.x - nx * R * 3.1 - px * R * 0.38, b.y - ny * R * 3.1 - py * R * 0.38);
  ctx.closePath();
  ctx.fillStyle = trail;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.9);
  glow.addColorStop(0, "rgba(247, 241, 255, 0.52)");
  glow.addColorStop(0.45, focus ? "rgba(255, 75, 106, 0.28)" : "rgba(255, 211, 106, 0.24)");
  glow.addColorStop(1, "rgba(21, 18, 29, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.44 + pulse * 0.1), R * (0.64 + pulse * 0.08), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.shadowBlur = focus ? 18 : 12;
  ctx.shadowColor = focus ? "#ff4b6a" : "#ffd36a";
  ctx.fill();

  ctx.fillStyle = "#f7f1ff";
  ctx.strokeStyle = focus ? "#ff4b6a" : "#ffd36a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(R * 1.18, 0);
  ctx.lineTo(R * 0.08, -R * 0.28);
  ctx.lineTo(-R * 0.88, -R * 0.16);
  ctx.lineTo(-R * 0.58, 0);
  ctx.lineTo(-R * 0.88, R * 0.16);
  ctx.lineTo(R * 0.08, R * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(21, 18, 29, 0.75)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.5, -R * 0.34);
  ctx.lineTo(-R * 0.18, 0);
  ctx.lineTo(-R * 0.5, R * 0.34);
  ctx.stroke();

  if (b.sharpshooterRicochet || b.sharpshooterVolley || focus) {
    ctx.save();
    ctx.rotate(state.frameCount * (focus ? 0.08 : 0.045));
    ctx.strokeStyle = focus ? "rgba(255, 75, 106, 0.52)" : "rgba(255, 211, 106, 0.42)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.94 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

function drawBerserkerBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.36 + b.x * 0.01) + 1) * 0.5;
  const blood = !!b.berserkerBlood;
  const cleave = !!b.berserkerCleave;
  const frenzy = !!b.berserkerFrenzy;
  const R = Math.max(9, b.radius * (cleave ? 2.45 : blood ? 2.2 : 2));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % (cleave || blood ? 1 : 2) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.1 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.1 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.7 + (Math.random() - 0.5) * 0.62,
      vy: -ny * 0.7 + (Math.random() - 0.5) * 0.62,
      life: cleave ? 22 : 16,
      color: Math.random() > 0.34 ? "#ff263d" : "#ff8a2a",
      size: 1.8 + Math.random() * (cleave ? 3.4 : 2.4),
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * (cleave ? 4.4 : 3.8),
    b.y - ny * R * (cleave ? 4.4 : 3.8),
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(22, 9, 11, 0)");
  trail.addColorStop(0.34, "rgba(168, 7, 24, 0.22)");
  trail.addColorStop(0.72, blood ? "rgba(255, 38, 61, 0.4)" : "rgba(255, 138, 42, 0.28)");
  trail.addColorStop(1, "rgba(255, 241, 234, 0.68)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.18, b.y + ny * R * 1.18);
  ctx.lineTo(b.x - nx * R * 3.35 + px * R * (cleave ? 0.9 : 0.56), b.y - ny * R * 3.35 + py * R * (cleave ? 0.9 : 0.56));
  ctx.lineTo(b.x - nx * R * 2.75 - px * R * (cleave ? 0.9 : 0.56), b.y - ny * R * 2.75 - py * R * (cleave ? 0.9 : 0.56));
  ctx.closePath();
  ctx.fillStyle = trail;
  ctx.shadowBlur = blood ? 24 : 18;
  ctx.shadowColor = blood ? "#ff263d" : "#ff8a2a";
  ctx.fill();

  if (cleave) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, R * (1.7 + pulse * 0.15), angle - 0.9, angle + 0.9);
    ctx.strokeStyle = "rgba(255, 38, 61, 0.56)";
    ctx.lineWidth = Math.max(4, R * 0.28);
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#ff263d";
    ctx.stroke();
  }

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
  glow.addColorStop(0, "rgba(255, 241, 234, 0.62)");
  glow.addColorStop(0.36, blood ? "rgba(255, 38, 61, 0.42)" : "rgba(255, 138, 42, 0.32)");
  glow.addColorStop(1, "rgba(22, 9, 11, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.34 + pulse * 0.15), R * (0.78 + pulse * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.fillStyle = blood ? "#ff263d" : "#a80718";
  ctx.strokeStyle = "#ffe4c0";
  ctx.lineWidth = 1.6;
  ctx.shadowBlur = blood ? 20 : 14;
  ctx.shadowColor = blood ? "#ff263d" : "#ff8a2a";
  ctx.beginPath();
  ctx.moveTo(R * 1.25, 0);
  ctx.quadraticCurveTo(R * 0.18, -R * 0.78, -R * 0.82, -R * 0.14);
  ctx.lineTo(-R * 0.46, 0);
  ctx.lineTo(-R * 0.82, R * 0.14);
  ctx.quadraticCurveTo(R * 0.18, R * 0.78, R * 1.25, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 241, 234, 0.72)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(R * 0.72, 0);
  ctx.lineTo(-R * 0.42, 0);
  ctx.moveTo(R * 0.16, -R * 0.34);
  ctx.lineTo(-R * 0.08, 0);
  ctx.lineTo(R * 0.16, R * 0.34);
  ctx.stroke();

  if (frenzy || blood || cleave) {
    ctx.save();
    ctx.rotate(state.frameCount * (blood ? 0.12 : 0.08));
    ctx.strokeStyle = blood ? "rgba(255, 38, 61, 0.58)" : "rgba(255, 138, 42, 0.44)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.96 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

function drawSummonerBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.22 + b.y * 0.01) + 1) * 0.5;
  const portal = !!b.summonerPortal;
  const ritual = !!b.summonerRitual;
  const sacrifice = !!b.summonerSacrifice;
  const R = Math.max(8, b.radius * (ritual ? 2.25 : portal ? 2.05 : 1.9));

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % (ritual ? 1 : 3) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.42 + (Math.random() - 0.5) * 0.32,
      vy: -ny * 0.42 + (Math.random() - 0.5) * 0.32,
      life: ritual ? 22 : 18,
      color: Math.random() > 0.45 ? "#f2eee7" : "#8b929c",
      size: 1.4 + Math.random() * 2.5,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4.1,
    b.y - ny * R * 4.1,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(7, 8, 9, 0)");
  trail.addColorStop(0.35, "rgba(95, 102, 112, 0.18)");
  trail.addColorStop(0.7, sacrifice ? "rgba(255, 255, 255, 0.34)" : "rgba(139, 146, 156, 0.26)");
  trail.addColorStop(1, "rgba(242, 238, 231, 0.68)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.08, b.y + ny * R * 1.08);
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.6 + px * R * (0.72 + pulse * 0.22),
    b.y - ny * R * 1.6 + py * R * (0.72 + pulse * 0.22),
    b.x - nx * R * 3.65,
    b.y - ny * R * 3.65,
  );
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.6 - px * R * (0.72 + pulse * 0.22),
    b.y - ny * R * 1.6 - py * R * (0.72 + pulse * 0.22),
    b.x + nx * R * 1.08,
    b.y + ny * R * 1.08,
  );
  ctx.fillStyle = trail;
  ctx.shadowBlur = ritual ? 24 : 16;
  ctx.shadowColor = "#f2eee7";
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.58)");
  glow.addColorStop(0.4, ritual ? "rgba(216, 221, 227, 0.36)" : "rgba(139, 146, 156, 0.3)");
  glow.addColorStop(1, "rgba(7, 8, 9, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.18 + pulse * 0.13), R * (0.86 + pulse * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.fillStyle = "#f2eee7";
  ctx.strokeStyle = "#8b929c";
  ctx.lineWidth = 1.4;
  ctx.shadowBlur = ritual ? 18 : 12;
  ctx.shadowColor = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -R * 0.1, R * 0.52, Math.PI * 0.08, Math.PI * 1.92);
  ctx.quadraticCurveTo(R * 0.42, R * 0.56, R * 0.12, R * 0.74);
  ctx.lineTo(-R * 0.12, R * 0.74);
  ctx.quadraticCurveTo(-R * 0.42, R * 0.56, -R * 0.52, -R * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#070809";
  ctx.beginPath();
  ctx.ellipse(-R * 0.18, -R * 0.08, R * 0.1, R * 0.16, -0.15, 0, Math.PI * 2);
  ctx.ellipse(R * 0.18, -R * 0.08, R * 0.1, R * 0.16, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, R * 0.04);
  ctx.lineTo(-R * 0.06, R * 0.2);
  ctx.lineTo(R * 0.06, R * 0.2);
  ctx.closePath();
  ctx.fill();

  if (portal || ritual || sacrifice) {
    ctx.save();
    ctx.rotate(state.frameCount * (ritual ? 0.1 : 0.06));
    ctx.strokeStyle = ritual ? "rgba(255, 255, 255, 0.58)" : "rgba(216, 221, 227, 0.44)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.98 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.65, Math.sin(a) * R * 0.65);
      ctx.lineTo(Math.cos(a) * R * 1.12, Math.sin(a) * R * 1.12);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawSniperBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.3 + b.x * 0.01) + 1) * 0.5;
  const heavy = !!b.sniperHeavy;
  const execute = !!b.sniperExecute;
  const focus = !!b.sniperFocus;
  const R = Math.max(7, b.radius * (heavy ? 2.2 : execute ? 2 : focus ? 1.85 : 1.65));
  const mainColor = execute ? "#ff3855" : heavy ? "#ffc45a" : focus ? "#8affc1" : "#62f3ff";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % (heavy || execute ? 1 : 3) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.15 + px * (Math.random() - 0.5) * R * 0.65,
      y: b.y - ny * R * 1.15 + py * (Math.random() - 0.5) * R * 0.65,
      vx: -nx * 0.58 + (Math.random() - 0.5) * 0.28,
      vy: -ny * 0.58 + (Math.random() - 0.5) * 0.28,
      life: heavy || execute ? 18 : 14,
      color: Math.random() > 0.42 ? mainColor : "#cbd7e3",
      size: 1.2 + Math.random() * 2,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * (heavy ? 5.2 : 4.6),
    b.y - ny * R * (heavy ? 5.2 : 4.6),
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(8, 11, 15, 0)");
  trail.addColorStop(0.35, execute ? "rgba(255, 56, 85, 0.14)" : "rgba(98, 243, 255, 0.12)");
  trail.addColorStop(0.72, heavy ? "rgba(255, 196, 90, 0.34)" : execute ? "rgba(255, 56, 85, 0.3)" : "rgba(98, 243, 255, 0.26)");
  trail.addColorStop(1, "rgba(255, 255, 255, 0.72)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.18, b.y + ny * R * 1.18);
  ctx.lineTo(b.x - nx * R * 4.15 + px * R * 0.28, b.y - ny * R * 4.15 + py * R * 0.28);
  ctx.lineTo(b.x - nx * R * 3.35 - px * R * 0.28, b.y - ny * R * 3.35 - py * R * 0.28);
  ctx.closePath();
  ctx.fillStyle = trail;
  ctx.shadowBlur = heavy || execute ? 22 : 14;
  ctx.shadowColor = mainColor;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.75);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.58)");
  glow.addColorStop(0.42, heavy ? "rgba(255, 196, 90, 0.32)" : execute ? "rgba(255, 56, 85, 0.28)" : "rgba(98, 243, 255, 0.24)");
  glow.addColorStop(1, "rgba(8, 11, 15, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.48 + pulse * 0.1), R * (0.48 + pulse * 0.06), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.fillStyle = "#cbd7e3";
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = heavy || execute ? 1.8 : 1.4;
  ctx.shadowBlur = heavy || execute ? 18 : 12;
  ctx.shadowColor = mainColor;
  ctx.beginPath();
  ctx.moveTo(R * 1.32, 0);
  ctx.lineTo(R * 0.18, -R * 0.24);
  ctx.lineTo(-R * 1.08, -R * 0.14);
  ctx.lineTo(-R * 0.7, 0);
  ctx.lineTo(-R * 1.08, R * 0.14);
  ctx.lineTo(R * 0.18, R * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(8, 11, 15, 0.78)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.62, -R * 0.2);
  ctx.lineTo(R * 0.74, -R * 0.04);
  ctx.moveTo(-R * 0.62, R * 0.2);
  ctx.lineTo(R * 0.52, R * 0.05);
  ctx.stroke();

  if (focus || heavy || execute) {
    ctx.save();
    ctx.rotate(state.frameCount * (execute ? 0.1 : 0.06));
    ctx.strokeStyle = execute ? "rgba(255, 56, 85, 0.55)" : "rgba(98, 243, 255, 0.44)";
    ctx.lineWidth = 1.1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.86 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

function drawSpiritBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.24 + b.y * 0.01) + 1) * 0.5;
  const phased = !!b.spiritPhased;
  const ward = !!b.spiritWard;
  const judgement = !!b.spiritJudgement;
  const R = Math.max(8, b.radius * (judgement ? 2.35 : ward ? 2.08 : phased ? 1.95 : 1.85));
  const mainColor = judgement ? "#ffe58a" : ward ? "#35fff2" : phased ? "#c9b7ff" : "#9ffff8";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % (judgement ? 1 : 2) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.1 + px * (Math.random() - 0.5) * R * 0.9,
      y: b.y - ny * R * 1.1 + py * (Math.random() - 0.5) * R * 0.9,
      vx: -nx * 0.52 + (Math.random() - 0.5) * 0.36,
      vy: -ny * 0.52 + (Math.random() - 0.5) * 0.36,
      life: judgement ? 22 : 18,
      color: Math.random() > 0.38 ? mainColor : "#fff8e8",
      size: 1.5 + Math.random() * 2.4,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4.2,
    b.y - ny * R * 4.2,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(7, 16, 18, 0)");
  trail.addColorStop(0.34, phased ? "rgba(201, 183, 255, 0.18)" : "rgba(53, 255, 242, 0.18)");
  trail.addColorStop(0.72, judgement ? "rgba(255, 229, 138, 0.34)" : "rgba(159, 255, 248, 0.28)");
  trail.addColorStop(1, "rgba(255, 248, 232, 0.74)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.12, b.y + ny * R * 1.12);
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.7 + px * R * (0.62 + pulse * 0.2),
    b.y - ny * R * 1.7 + py * R * (0.62 + pulse * 0.2),
    b.x - nx * R * 3.5,
    b.y - ny * R * 3.5,
  );
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.7 - px * R * (0.62 + pulse * 0.2),
    b.y - ny * R * 1.7 - py * R * (0.62 + pulse * 0.2),
    b.x + nx * R * 1.12,
    b.y + ny * R * 1.12,
  );
  ctx.fillStyle = trail;
  ctx.shadowBlur = judgement ? 26 : 18;
  ctx.shadowColor = mainColor;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.15);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.74)");
  glow.addColorStop(0.38, judgement ? "rgba(255, 229, 138, 0.4)" : "rgba(53, 255, 242, 0.32)");
  glow.addColorStop(1, "rgba(7, 16, 18, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.16 + pulse * 0.12), R * (0.86 + pulse * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.fillStyle = judgement ? "#fff8e8" : "#9ffff8";
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = judgement ? 22 : 14;
  ctx.shadowColor = mainColor;
  ctx.beginPath();
  ctx.moveTo(R * 1.08, 0);
  ctx.quadraticCurveTo(R * 0.22, -R * 0.66, -R * 0.86, -R * 0.32);
  ctx.quadraticCurveTo(-R * 0.44, 0, -R * 0.86, R * 0.32);
  ctx.quadraticCurveTo(R * 0.22, R * 0.66, R * 1.08, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = judgement ? "rgba(255, 229, 138, 0.86)" : "rgba(255, 248, 232, 0.78)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-R * 0.54, 0);
  ctx.lineTo(R * 0.58, 0);
  ctx.moveTo(0, -R * 0.44);
  ctx.lineTo(0, R * 0.44);
  ctx.stroke();

  ctx.save();
  ctx.rotate(state.frameCount * (judgement ? 0.11 : 0.07));
  ctx.strokeStyle = judgement ? "rgba(255, 229, 138, 0.58)" : "rgba(159, 255, 248, 0.46)";
  ctx.lineWidth = 1.3;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, R * (1 + pulse * 0.08), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.58, Math.sin(a) * R * 0.58);
    ctx.lineTo(Math.cos(a) * R * 1.24, Math.sin(a) * R * 1.24);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function drawTimekeeperBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.28 + b.x * 0.01) + 1) * 0.5;
  const blink = !!b.timekeeperBlink;
  const frozen = !!b.timekeeperFrozen;
  const loop = !!b.timekeeperLoop;
  const R = Math.max(8, b.radius * (loop ? 2.1 : frozen ? 2.25 : blink ? 2.05 : 1.9));
  const mainColor = loop ? "#ffe28a" : frozen ? "#e9fbff" : "#9feeff";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % (loop ? 1 : 2) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.15 + px * (Math.random() - 0.5) * R * 0.8,
      y: b.y - ny * R * 1.15 + py * (Math.random() - 0.5) * R * 0.8,
      vx: -nx * 0.5 + (Math.random() - 0.5) * 0.32,
      vy: -ny * 0.5 + (Math.random() - 0.5) * 0.32,
      life: loop ? 20 : 16,
      color: Math.random() > 0.36 ? mainColor : "#5bc8ff",
      size: 1.4 + Math.random() * 2.2,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4.4,
    b.y - ny * R * 4.4,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(7, 19, 31, 0)");
  trail.addColorStop(0.32, "rgba(91, 200, 255, 0.14)");
  trail.addColorStop(0.68, loop ? "rgba(255, 226, 138, 0.28)" : "rgba(159, 238, 255, 0.3)");
  trail.addColorStop(1, "rgba(233, 251, 255, 0.74)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.12, b.y + ny * R * 1.12);
  ctx.lineTo(b.x - nx * R * 3.55 + px * R * 0.42, b.y - ny * R * 3.55 + py * R * 0.42);
  ctx.lineTo(b.x - nx * R * 2.9 - px * R * 0.42, b.y - ny * R * 2.9 - py * R * 0.42);
  ctx.closePath();
  ctx.fillStyle = trail;
  ctx.shadowBlur = loop ? 22 : 16;
  ctx.shadowColor = mainColor;
  ctx.fill();

  if (blink) {
    ctx.strokeStyle = "rgba(233, 251, 255, 0.42)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(b.x - nx * R * 5, b.y - ny * R * 5);
    ctx.lineTo(b.x + nx * R * 1.3, b.y + ny * R * 1.3);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.05);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.68)");
  glow.addColorStop(0.4, loop ? "rgba(255, 226, 138, 0.32)" : "rgba(91, 200, 255, 0.34)");
  glow.addColorStop(1, "rgba(7, 19, 31, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.18 + pulse * 0.1), R * (0.84 + pulse * 0.08), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.save();
  ctx.rotate(state.frameCount * (frozen ? -0.09 : 0.09));
  ctx.strokeStyle = loop ? "rgba(255, 226, 138, 0.74)" : "rgba(159, 238, 255, 0.72)";
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 14;
  ctx.shadowColor = mainColor;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, R * (0.95 + pulse * 0.06), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(233, 251, 255, 0.82)";
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ctx.save();
    ctx.translate(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94);
    ctx.rotate(a);
    ctx.fillRect(-0.8, -3, 1.6, 6);
    ctx.restore();
  }
  ctx.restore();

  ctx.fillStyle = frozen ? "#e9fbff" : "#9feeff";
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 1.6;
  ctx.shadowBlur = loop ? 18 : 12;
  ctx.shadowColor = mainColor;
  ctx.beginPath();
  ctx.moveTo(R * 1.08, 0);
  ctx.lineTo(R * 0.18, -R * 0.48);
  ctx.lineTo(-R * 0.82, 0);
  ctx.lineTo(R * 0.18, R * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(7, 19, 31, 0.62)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-R * 0.45, 0);
  ctx.lineTo(R * 0.62, 0);
  ctx.moveTo(0, -R * 0.34);
  ctx.lineTo(0, R * 0.34);
  ctx.stroke();

  ctx.restore();
}

function drawVoidBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.3 + b.x * 0.01) + 1) * 0.5;
  const singularity = !!b.voidSingularity;
  const devour = !!b.voidDevour;
  const laserFed = !!b.voidLaserFed;
  const R = Math.max(8, b.radius * (laserFed ? 2.25 : devour ? 2.15 : singularity ? 2.05 : 1.9));
  const mainColor = laserFed ? "#ff4dff" : devour ? "#f3dcff" : "#b45cff";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % (laserFed || devour ? 1 : 2) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.1 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.1 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.58 + (Math.random() - 0.5) * 0.45,
      vy: -ny * 0.58 + (Math.random() - 0.5) * 0.45,
      life: laserFed ? 20 : 16,
      color: Math.random() > 0.35 ? mainColor : "#7a18ff",
      size: 1.5 + Math.random() * 2.6,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4.3,
    b.y - ny * R * 4.3,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(5, 0, 9, 0)");
  trail.addColorStop(0.3, "rgba(42, 6, 61, 0.2)");
  trail.addColorStop(0.66, laserFed ? "rgba(255, 77, 255, 0.34)" : "rgba(180, 92, 255, 0.3)");
  trail.addColorStop(1, "rgba(243, 220, 255, 0.7)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.12, b.y + ny * R * 1.12);
  ctx.lineTo(b.x - nx * R * 3.3 + px * R * 0.6, b.y - ny * R * 3.3 + py * R * 0.6);
  ctx.lineTo(b.x - nx * R * 2.75 - px * R * 0.6, b.y - ny * R * 2.75 - py * R * 0.6);
  ctx.closePath();
  ctx.fillStyle = trail;
  ctx.shadowBlur = laserFed ? 24 : 17;
  ctx.shadowColor = mainColor;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.5)");
  glow.addColorStop(0.3, laserFed ? "rgba(255, 77, 255, 0.36)" : "rgba(180, 92, 255, 0.34)");
  glow.addColorStop(0.72, "rgba(18, 0, 31, 0.28)");
  glow.addColorStop(1, "rgba(5, 0, 9, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.22 + pulse * 0.13), R * (0.86 + pulse * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.fillStyle = "#12001f";
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 1.7;
  ctx.shadowBlur = laserFed ? 22 : 14;
  ctx.shadowColor = mainColor;
  ctx.beginPath();
  ctx.moveTo(R * 1.12, 0);
  ctx.quadraticCurveTo(R * 0.28, -R * 0.78, -R * 0.92, -R * 0.42);
  ctx.lineTo(-R * 0.52, 0);
  ctx.lineTo(-R * 0.92, R * 0.42);
  ctx.quadraticCurveTo(R * 0.28, R * 0.78, R * 1.12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.25, "#f3dcff");
  core.addColorStop(0.65, "#7a18ff");
  core.addColorStop(1, "rgba(5, 0, 9, 0)");
  ctx.beginPath();
  ctx.arc(0, 0, R * (0.38 + pulse * 0.04), 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();

  ctx.save();
  ctx.rotate(state.frameCount * (devour ? -0.12 : 0.09));
  ctx.strokeStyle = laserFed ? "rgba(255, 77, 255, 0.62)" : "rgba(180, 92, 255, 0.52)";
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.05 + pulse * 0.08), R * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if (singularity || devour || laserFed) {
    ctx.save();
    ctx.rotate(-state.frameCount * 0.07);
    ctx.strokeStyle = "rgba(243, 220, 255, 0.48)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.82 + pulse * 0.06), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawStormBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.34 + b.x * 0.01) + 1) * 0.5;
  const charged = !!b.stormCharged;
  const gale = !!b.stormGale;
  const tempest = !!b.stormTempest;
  const R = Math.max(8, b.radius * (tempest ? 2.25 : charged ? 2.1 : 1.9));
  const mainColor = tempest ? "#7cffc4" : charged ? "#f4ffff" : "#27d7ff";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % (tempest || charged ? 1 : 2) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.1 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.1 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.62 + (Math.random() - 0.5) * 0.48,
      vy: -ny * 0.62 + (Math.random() - 0.5) * 0.48,
      life: tempest ? 20 : 16,
      color: Math.random() > 0.35 ? mainColor : "#7dfff7",
      size: 1.5 + Math.random() * 2.7,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4.1,
    b.y - ny * R * 4.1,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(5, 21, 29, 0)");
  trail.addColorStop(0.34, "rgba(39, 215, 255, 0.2)");
  trail.addColorStop(0.68, tempest ? "rgba(124, 255, 196, 0.36)" : "rgba(125, 255, 247, 0.3)");
  trail.addColorStop(1, "rgba(244, 255, 255, 0.76)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.12, b.y + ny * R * 1.12);
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.7 + px * R * (0.76 + pulse * 0.22),
    b.y - ny * R * 1.7 + py * R * (0.76 + pulse * 0.22),
    b.x - nx * R * 3.45,
    b.y - ny * R * 3.45,
  );
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.7 - px * R * (0.76 + pulse * 0.22),
    b.y - ny * R * 1.7 - py * R * (0.76 + pulse * 0.22),
    b.x + nx * R * 1.12,
    b.y + ny * R * 1.12,
  );
  ctx.fillStyle = trail;
  ctx.shadowBlur = tempest ? 24 : 18;
  ctx.shadowColor = mainColor;
  ctx.fill();

  if (gale) {
    ctx.strokeStyle = "rgba(124, 255, 196, 0.36)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([8, 8]);
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(b.x - nx * R * 3.4 + px * R * i * 0.8, b.y - ny * R * 3.4 + py * R * i * 0.8);
      ctx.quadraticCurveTo(b.x - nx * R * 1.5, b.y - ny * R * 1.5, b.x + nx * R * 0.8, b.y + ny * R * 0.8);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.76)");
  glow.addColorStop(0.34, tempest ? "rgba(124, 255, 196, 0.42)" : "rgba(39, 215, 255, 0.36)");
  glow.addColorStop(1, "rgba(5, 21, 29, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.2 + pulse * 0.12), R * (0.82 + pulse * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = tempest ? 22 : 14;
  ctx.shadowColor = mainColor;
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = tempest ? 4 : 3;
  ctx.beginPath();
  ctx.moveTo(R * 1.18, 0);
  ctx.lineTo(R * 0.36, -R * 0.24);
  ctx.lineTo(R * 0.08, R * 0.18);
  ctx.lineTo(-R * 0.32, -R * 0.12);
  ctx.lineTo(-R * 0.98, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(244, 255, 255, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(R * 0.86, 0);
  ctx.lineTo(R * 0.2, -R * 0.1);
  ctx.lineTo(0, R * 0.08);
  ctx.lineTo(-R * 0.52, 0);
  ctx.stroke();

  ctx.save();
  ctx.rotate(state.frameCount * (tempest ? 0.12 : 0.08));
  ctx.strokeStyle = tempest ? "rgba(124, 255, 196, 0.58)" : "rgba(39, 215, 255, 0.5)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (0.98 + pulse * 0.08), R * 0.48, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if (charged || tempest) {
    for (let i = 0; i < 2; i++) {
      const a = state.frameCount * 0.16 + i * Math.PI;
      ctx.strokeStyle = "rgba(244, 255, 255, 0.58)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * R * 1.28, Math.sin(a) * R * 1.28);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawReaperBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const pulse = (Math.sin(state.frameCount * 0.28 + b.x * 0.01) + 1) * 0.5;
  const crescent = !!b.reaperCrescent;
  const ghost = !!b.reaperGhost;
  const judgement = !!b.reaperJudgement;
  const R = Math.max(8, b.radius * (judgement ? 2.4 : crescent ? 2.2 : 1.85));
  const crimson = judgement ? "#ff2448" : crescent ? "#ff3b62" : "#c90f33";
  const soul = ghost ? "#baffde" : "#d8fff1";
  const bone = "#efe6cd";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (state.frameCount % (judgement || crescent ? 1 : 2) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.25 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.25 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.42 + (Math.random() - 0.5) * 0.38,
      vy: -ny * 0.42 + (Math.random() - 0.5) * 0.38,
      life: judgement ? 22 : 17,
      color: Math.random() > 0.42 ? crimson : soul,
      size: 1.8 + Math.random() * 2.8,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4.3,
    b.y - ny * R * 4.3,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(4, 0, 6, 0)");
  trail.addColorStop(0.28, "rgba(60, 0, 16, 0.28)");
  trail.addColorStop(0.63, ghost ? "rgba(186, 255, 222, 0.28)" : "rgba(201, 15, 51, 0.34)");
  trail.addColorStop(1, "rgba(255, 36, 72, 0.72)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.1, b.y + ny * R * 1.1);
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.8 + px * R * (0.7 + pulse * 0.18),
    b.y - ny * R * 1.8 + py * R * (0.7 + pulse * 0.18),
    b.x - nx * R * 3.75,
    b.y - ny * R * 3.75,
  );
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.55 - px * R * (0.46 + pulse * 0.14),
    b.y - ny * R * 1.55 - py * R * (0.46 + pulse * 0.14),
    b.x + nx * R * 1.1,
    b.y + ny * R * 1.1,
  );
  ctx.fillStyle = trail;
  ctx.shadowBlur = judgement ? 26 : 18;
  ctx.shadowColor = crimson;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.25);
  aura.addColorStop(0, ghost ? "rgba(216, 255, 241, 0.7)" : "rgba(255, 255, 255, 0.42)");
  aura.addColorStop(0.34, ghost ? "rgba(98, 255, 190, 0.34)" : "rgba(255, 36, 72, 0.34)");
  aura.addColorStop(1, "rgba(5, 0, 8, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.25 + pulse * 0.1), R * (0.82 + pulse * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = judgement ? 24 : 16;
  ctx.shadowColor = ghost ? soul : crimson;
  ctx.strokeStyle = "rgba(6, 0, 9, 0.92)";
  ctx.lineWidth = R * 0.42;
  ctx.beginPath();
  ctx.moveTo(-R * 0.9, R * 0.55);
  ctx.quadraticCurveTo(R * 0.2, -R * 1.05, R * 1.18, -R * 0.12);
  ctx.stroke();

  ctx.strokeStyle = crimson;
  ctx.lineWidth = R * 0.24;
  ctx.beginPath();
  ctx.moveTo(-R * 0.72, R * 0.42);
  ctx.quadraticCurveTo(R * 0.08, -R * 0.82, R * 0.98, -R * 0.14);
  ctx.stroke();

  ctx.strokeStyle = bone;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = bone;
  ctx.beginPath();
  ctx.moveTo(-R * 0.52, R * 0.28);
  ctx.quadraticCurveTo(R * 0.1, -R * 0.58, R * 0.66, -R * 0.18);
  ctx.stroke();

  ctx.fillStyle = "rgba(3, 0, 6, 0.95)";
  ctx.beginPath();
  ctx.moveTo(-R * 0.92, -R * 0.12);
  ctx.lineTo(-R * 0.16, -R * 0.08);
  ctx.lineTo(R * 0.24, R * 0.1);
  ctx.lineTo(-R * 0.28, R * 0.26);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = ghost ? "rgba(186, 255, 222, 0.58)" : "rgba(255, 36, 72, 0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-R * 0.2, 0, R * (0.52 + pulse * 0.08), -Math.PI * 0.1, Math.PI * 1.22);
  ctx.stroke();

  if (ghost || judgement) {
    ctx.save();
    ctx.rotate(state.frameCount * (judgement ? -0.13 : 0.08));
    ctx.strokeStyle = ghost ? "rgba(186, 255, 222, 0.48)" : "rgba(255, 36, 72, 0.46)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * (1.02 + pulse * 0.08), R * 0.46, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (judgement) {
    ctx.strokeStyle = "rgba(239, 230, 205, 0.6)";
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) {
      const a = state.frameCount * 0.11 + i * (Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
      ctx.lineTo(Math.cos(a) * R * 1.25, Math.sin(a) * R * 1.25);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawAlchemistBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const fc = state.frameCount || 0;
  const pulse = (Math.sin(fc * 0.3 + b.x * 0.01) + 1) * 0.5;
  const bomb = !!b.alchemistBomb;
  const elixir = !!b.alchemistElixir;
  const transmuted = !!b.alchemistTransmuted;
  const R = Math.max(8, b.radius * (bomb ? 2.25 : transmuted ? 2.1 : 1.9));
  const liquid = bomb ? "#b8ff2c" : elixir ? "#d7fff4" : transmuted ? "#ffd76a" : "#00ff9d";
  const edge = transmuted ? "#ffd76a" : "#00ff9d";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (!state.particles) state.particles = [];
  if (fc % (bomb || transmuted ? 1 : 2) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.5 + (Math.random() - 0.5) * 0.36,
      vy: -ny * 0.5 + (Math.random() - 0.5) * 0.36,
      life: bomb ? 21 : 16,
      color: Math.random() > 0.38 ? liquid : "#ffd76a",
      size: 1.7 + Math.random() * 2.9,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 4,
    b.y - ny * R * 4,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(7, 8, 14, 0)");
  trail.addColorStop(0.32, transmuted ? "rgba(255, 215, 106, 0.2)" : "rgba(0, 255, 157, 0.18)");
  trail.addColorStop(0.72, bomb ? "rgba(184, 255, 44, 0.34)" : "rgba(215, 255, 244, 0.26)");
  trail.addColorStop(1, transmuted ? "rgba(255, 215, 106, 0.68)" : "rgba(0, 255, 157, 0.68)");
  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 0.95, b.y + ny * R * 0.95);
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.6 + px * R * (0.7 + pulse * 0.16),
    b.y - ny * R * 1.6 + py * R * (0.7 + pulse * 0.16),
    b.x - nx * R * 3.5,
    b.y - ny * R * 3.5,
  );
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.55 - px * R * (0.52 + pulse * 0.14),
    b.y - ny * R * 1.55 - py * R * (0.52 + pulse * 0.14),
    b.x + nx * R * 0.95,
    b.y + ny * R * 0.95,
  );
  ctx.fillStyle = trail;
  ctx.shadowBlur = bomb ? 24 : 18;
  ctx.shadowColor = liquid;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.1);
  aura.addColorStop(0, "rgba(255, 255, 255, 0.58)");
  aura.addColorStop(0.36, transmuted ? "rgba(255, 215, 106, 0.35)" : "rgba(0, 255, 157, 0.3)");
  aura.addColorStop(1, "rgba(7, 8, 14, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.18 + pulse * 0.1), R * (0.88 + pulse * 0.08), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  if (transmuted || bomb) {
    ctx.save();
    ctx.rotate(fc * (transmuted ? 0.09 : -0.08));
    ctx.strokeStyle = transmuted ? "rgba(255, 215, 106, 0.62)" : "rgba(184, 255, 44, 0.52)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * (1.08 + pulse * 0.08), R * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.lineJoin = "round";
  ctx.shadowBlur = bomb ? 20 : 14;
  ctx.shadowColor = liquid;

  ctx.fillStyle = "rgba(191, 255, 234, 0.16)";
  ctx.strokeStyle = "#d7fff4";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-R * 0.34, -R * 0.28, R * 0.68, R * 0.74, 4);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(-R * 0.18, -R * 0.62, R * 0.36, R * 0.36, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = liquid;
  ctx.shadowBlur = 16;
  ctx.shadowColor = liquid;
  ctx.beginPath();
  ctx.roundRect(-R * 0.25, R * 0.02, R * 0.5, R * 0.27, 3);
  ctx.fill();

  ctx.fillStyle = "#ffd76a";
  ctx.shadowBlur = transmuted ? 14 : 8;
  ctx.shadowColor = "#ffd76a";
  ctx.beginPath();
  ctx.roundRect(-R * 0.24, -R * 0.72, R * 0.48, R * 0.14, 3);
  ctx.fill();

  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, -R * 0.02, R * (0.62 + pulse * 0.04), 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-R * 0.16 + i * R * 0.16, R * (0.02 - i * 0.1), R * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  if (bomb) {
    ctx.strokeStyle = "rgba(184, 255, 44, 0.72)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      const a = fc * 0.14 + i * (Math.PI * 2 / 4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.45, Math.sin(a) * R * 0.45);
      ctx.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawPhoenixBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const fc = state.frameCount || 0;
  const pulse = (Math.sin(fc * 0.36 + b.x * 0.01) + 1) * 0.5;
  const sacred = !!b.phoenixSacred;
  const ash = !!b.phoenixAsh;
  const rebirth = !!b.phoenixRebirth;
  const R = Math.max(9, b.radius * (rebirth ? 2.85 : sacred ? 2.45 : 2.1));
  const ember = rebirth ? "#ff2f6d" : ash ? "#ff4b18" : "#ff6a18";
  const gold = sacred || rebirth ? "#fff1ad" : "#ffd45a";
  const core = rebirth ? "#fffdf0" : sacred ? "#fff8cc" : "#ffe08a";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (!state.particles) state.particles = [];
  if (fc % (rebirth || sacred ? 1 : 2) === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.3 + px * (Math.random() - 0.5) * R,
      y: b.y - ny * R * 1.3 + py * (Math.random() - 0.5) * R,
      vx: -nx * 0.65 + (Math.random() - 0.5) * 0.46,
      vy: -ny * 0.65 + (Math.random() - 0.5) * 0.46,
      life: rebirth ? 24 : 18,
      color: Math.random() > 0.42 ? ember : gold,
      size: 2 + Math.random() * 3.4,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 5,
    b.y - ny * R * 5,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(42, 17, 16, 0)");
  trail.addColorStop(0.24, "rgba(255, 75, 24, 0.18)");
  trail.addColorStop(0.55, ash ? "rgba(110, 36, 28, 0.35)" : "rgba(255, 138, 24, 0.32)");
  trail.addColorStop(0.82, rebirth ? "rgba(255, 47, 109, 0.56)" : "rgba(255, 212, 90, 0.48)");
  trail.addColorStop(1, "rgba(255, 253, 240, 0.82)");

  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.06, b.y + ny * R * 1.06);
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.85 + px * R * (0.9 + pulse * 0.22),
    b.y - ny * R * 1.85 + py * R * (0.9 + pulse * 0.22),
    b.x - nx * R * 4.4,
    b.y - ny * R * 4.4,
  );
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.7 - px * R * (0.72 + pulse * 0.18),
    b.y - ny * R * 1.7 - py * R * (0.72 + pulse * 0.18),
    b.x + nx * R * 1.06,
    b.y + ny * R * 1.06,
  );
  ctx.fillStyle = trail;
  ctx.shadowBlur = rebirth ? 34 : 24;
  ctx.shadowColor = ember;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.55);
  aura.addColorStop(0, "rgba(255, 253, 240, 0.82)");
  aura.addColorStop(0.28, sacred ? "rgba(255, 241, 173, 0.48)" : "rgba(255, 212, 90, 0.4)");
  aura.addColorStop(0.62, rebirth ? "rgba(255, 47, 109, 0.32)" : "rgba(255, 75, 24, 0.28)");
  aura.addColorStop(1, "rgba(42, 17, 16, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.28 + pulse * 0.14), R * (0.95 + pulse * 0.1), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  ctx.shadowBlur = rebirth ? 30 : 20;
  ctx.shadowColor = core;

  const feather = ctx.createLinearGradient(-R, 0, R, 0);
  feather.addColorStop(0, "rgba(255, 75, 24, 0.2)");
  feather.addColorStop(0.28, ember);
  feather.addColorStop(0.62, gold);
  feather.addColorStop(1, core);
  ctx.fillStyle = feather;
  ctx.strokeStyle = "rgba(255, 253, 240, 0.88)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(R * 1.22, 0);
  ctx.quadraticCurveTo(R * 0.2, -R * 1.02, -R * 1.0, -R * 0.24);
  ctx.quadraticCurveTo(-R * 0.46, -R * 0.06, -R * 0.18, R * 0.18);
  ctx.quadraticCurveTo(-R * 0.64, R * 0.22, -R * 1.02, R * 0.58);
  ctx.quadraticCurveTo(R * 0.2, R * 0.88, R * 1.22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 253, 240, 0.72)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(R * 0.86, 0);
  ctx.quadraticCurveTo(R * 0.05, -R * 0.1, -R * 0.72, R * 0.4);
  ctx.stroke();

  for (let i = -1; i <= 1; i += 2) {
    ctx.save();
    ctx.scale(1, i);
    ctx.strokeStyle = i < 0 ? "rgba(255, 212, 90, 0.72)" : "rgba(255, 75, 24, 0.64)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(R * 0.28, 0);
    ctx.quadraticCurveTo(-R * 0.1, R * 0.32, -R * 0.72, R * 0.22);
    ctx.stroke();
    ctx.restore();
  }

  if (sacred || rebirth) {
    ctx.save();
    ctx.rotate(fc * (rebirth ? 0.14 : 0.08));
    ctx.strokeStyle = rebirth ? "rgba(255, 47, 109, 0.72)" : "rgba(255, 241, 173, 0.68)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * (1.12 + pulse * 0.1), R * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (rebirth) {
    for (let i = 0; i < 6; i++) {
      const a = fc * 0.12 + i * (Math.PI * 2 / 6);
      ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 253, 240, 0.7)" : "rgba(255, 47, 109, 0.58)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.46, Math.sin(a) * R * 0.46);
      ctx.lineTo(Math.cos(a) * R * 1.35, Math.sin(a) * R * 1.35);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawScoutBullet(ctx, b) {
  const speed = Math.hypot(b.vx, b.vy) || 1;
  const nx = b.vx / speed;
  const ny = b.vy / speed;
  const px = -ny;
  const py = nx;
  const angle = Math.atan2(b.vy, b.vx);
  const fc = state.frameCount || 0;
  const pulse = (Math.sin(fc * 0.34 + b.x * 0.012) + 1) * 0.5;
  const scan = !!b.scoutScan;
  const hook = !!b.scoutHookCharge;
  const overdrive = !!b.scoutOverdrive;
  const R = Math.max(8, b.radius * (overdrive ? 2.65 : hook ? 2.35 : scan ? 2.25 : 2.0));
  const edge = overdrive ? "#ff22d8" : scan ? "#b526ff" : "#43f5ff";
  const core = overdrive || hook ? "#f4ffff" : "#d7fdff";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if ((overdrive || hook || scan) && fc % 3 === 0) {
    state.particles.push({
      x: b.x - nx * R * 1.2 + px * (Math.random() - 0.5) * R * 0.7,
      y: b.y - ny * R * 1.2 + py * (Math.random() - 0.5) * R * 0.7,
      vx: -nx * 0.55 + (Math.random() - 0.5) * 0.32,
      vy: -ny * 0.55 + (Math.random() - 0.5) * 0.32,
      life: overdrive ? 18 : 14,
      color: Math.random() > 0.45 ? edge : "#f4ffff",
      size: 1.8 + Math.random() * 2.4,
    });
  }

  const trail = ctx.createLinearGradient(
    b.x - nx * R * 5.4,
    b.y - ny * R * 5.4,
    b.x + nx * R,
    b.y + ny * R,
  );
  trail.addColorStop(0, "rgba(5, 18, 29, 0)");
  trail.addColorStop(0.25, "rgba(181, 38, 255, 0.14)");
  trail.addColorStop(0.58, "rgba(67, 245, 255, 0.28)");
  trail.addColorStop(0.84, overdrive ? "rgba(255, 34, 216, 0.5)" : "rgba(67, 245, 255, 0.48)");
  trail.addColorStop(1, "rgba(244, 255, 255, 0.82)");

  ctx.beginPath();
  ctx.moveTo(b.x + nx * R * 1.15, b.y + ny * R * 1.15);
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.8 + px * R * (0.75 + pulse * 0.24),
    b.y - ny * R * 1.8 + py * R * (0.75 + pulse * 0.24),
    b.x - nx * R * 4.8,
    b.y - ny * R * 4.8,
  );
  ctx.quadraticCurveTo(
    b.x - nx * R * 1.65 - px * R * (0.6 + pulse * 0.2),
    b.y - ny * R * 1.65 - py * R * (0.6 + pulse * 0.2),
    b.x + nx * R * 1.15,
    b.y + ny * R * 1.15,
  );
  ctx.fillStyle = trail;
  ctx.shadowBlur = overdrive ? 28 : 20;
  ctx.shadowColor = edge;
  ctx.fill();

  ctx.translate(b.x, b.y);
  ctx.rotate(angle);

  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.25);
  aura.addColorStop(0, "rgba(244, 255, 255, 0.78)");
  aura.addColorStop(0.3, "rgba(67, 245, 255, 0.42)");
  aura.addColorStop(0.62, overdrive ? "rgba(255, 34, 216, 0.3)" : "rgba(29, 143, 255, 0.24)");
  aura.addColorStop(1, "rgba(5, 18, 29, 0)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R * (1.18 + pulse * 0.12), R * (0.78 + pulse * 0.08), 0, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  ctx.shadowBlur = overdrive ? 26 : 18;
  ctx.shadowColor = core;
  const coreGrad = ctx.createLinearGradient(-R, 0, R, 0);
  coreGrad.addColorStop(0, "rgba(181, 38, 255, 0.18)");
  coreGrad.addColorStop(0.3, edge);
  coreGrad.addColorStop(0.68, "#43f5ff");
  coreGrad.addColorStop(1, core);
  ctx.fillStyle = coreGrad;
  ctx.strokeStyle = "rgba(244, 255, 255, 0.82)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(R * 1.18, 0);
  ctx.lineTo(-R * 0.48, -R * 0.55);
  ctx.lineTo(-R * 0.2, 0);
  ctx.lineTo(-R * 0.48, R * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = overdrive ? "rgba(255, 34, 216, 0.78)" : "rgba(244, 255, 255, 0.7)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-R * 0.55, -R * 0.78);
  ctx.lineTo(-R * 0.12, -R * 0.28);
  ctx.lineTo(-R * 0.52, R * 0.05);
  ctx.lineTo(-R * 0.08, R * 0.52);
  ctx.stroke();

  if (scan || overdrive) {
    ctx.save();
    ctx.rotate(fc * (overdrive ? 0.16 : 0.09));
    ctx.strokeStyle = overdrive ? "rgba(255, 34, 216, 0.65)" : "rgba(67, 245, 255, 0.62)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.1, R * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

// ===== BULLETS (14+ styles) =====
export function drawBullets(ctx) {
  const { bullets } = state;
  const fastBulletLoad = shouldUseFastBulletDraw(state, bullets.length);
  const extremeBulletLoad = shouldUseExtremeBulletDraw(bullets.length);
  const restoreParticlePush = withParticleSpawnBudget(state);

  try {
  for (let b of bullets) {
    if (!isBulletVisible(b)) continue;
    if (
      fastBulletLoad &&
      !b.isMeteor &&
      !b.isShuriken &&
      (extremeBulletLoad || b.isPlayer || b.visualStyle)
    ) {
      drawFastBullet(ctx, b);
      continue;
    }

    // ===== METEOR =====
    if (b.isMeteor) {
      ctx.save();

      if (state.frameCount % 2 === 0) {
        state.particles.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random(),
          life: 40,
          color: "#222222",
          size: 5 + Math.random() * 10,
        });
      }

      ctx.fillStyle = "#3a1c0d";
      for (let j = 1; j <= 4; j++) {
        let r = b.radius * 0.3;
        let dx = Math.cos(state.frameCount * 0.2 * j) * (b.radius + 15);
        let dy = -10 - j * 15;
        ctx.beginPath();
        ctx.arc(b.x + dx, b.y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#4a2c1d";
      ctx.beginPath();
      const sides = 7;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const r = b.radius * (0.8 + Math.random() * 0.4);
        const px = b.x + Math.cos(angle) * r;
        const py = b.y + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#ff4400";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
      continue;
    }

    // ===== SHURIKEN =====
    if (b.isShuriken) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(state.frameCount * 0.3);

      ctx.beginPath();
      ctx.moveTo(-b.radius, 0);
      ctx.lineTo(b.radius, 0);
      ctx.moveTo(0, -b.radius);
      ctx.lineTo(0, b.radius);

      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.restore();
      continue;
    }

    if (b.isPlayer && b.visualStyle === "speedster_lightning") {
      drawSpeedsterBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "ghost_wisp") {
      drawGhostBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "warden_sigil") {
      drawWardenBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "engineer_plasma") {
      drawEngineerBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "druid_seed") {
      drawDruidBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "brawler_impact") {
      drawBrawlerBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "medic_serum") {
      drawMedicBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "tank_fortress") {
      drawTankBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "mage_fire") {
      drawMageBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "assassin_blade") {
      drawAssassinBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "hunter_bolt") {
      drawHunterBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "frost_crystal") {
      drawFrostBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "gunner_round") {
      drawGunnerBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "knight_blade") {
      drawKnightBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "sharpshooter_mark") {
      drawSharpshooterBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "berserker_rage") {
      drawBerserkerBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "summoner_soul") {
      drawSummonerBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "sniper_round") {
      drawSniperBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "spirit_orb") {
      drawSpiritBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "timekeeper_space") {
      drawTimekeeperBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "void_shard") {
      drawVoidBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "storm_bolt") {
      drawStormBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "reaper_soul") {
      drawReaperBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "oracle_eye") {
      drawOracleBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "alchemist_flask") {
      drawAlchemistBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "phoenix_fire") {
      drawPhoenixBullet(ctx, b);
      continue;
    }

    if (b.isPlayer && b.visualStyle === "scout_arc") {
      drawScoutBullet(ctx, b);
      continue;
    }

    // ===== STYLE SYSTEM =====
    switch (b.style) {
      // 🔥 FIRE
      case 1: {
        ctx.save();

        const pulse = (Math.sin(state.frameCount * 0.3) + 1) * 0.5;
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = "#ff4400";

        if (state.frameCount % 2 === 0) {
          state.particles.push({
            x: b.x,
            y: b.y,
            vx: Math.random() - 0.5,
            vy: Math.random() - 0.5,
            life: 30,
            color: Math.random() > 0.5 ? "#ffaa00" : "#ff4400",
            size: 3 + Math.random() * b.radius,
          });
        }

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.4, "#ffff00");
        grad.addColorStop(1, "#ff4400");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        break;
      }

      // ❄ ICE
      case 2: {
        ctx.save();

        ctx.fillStyle = "#aeefff";
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - b.radius);
        ctx.lineTo(b.x - b.radius / 2, b.y + b.radius);
        ctx.lineTo(b.x + b.radius / 2, b.y + b.radius);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 15;
        ctx.shadowColor = "#66ccff";

        ctx.restore();
        break;
      }

      // ⚡ LIGHTNING
      case 3: {
        ctx.save();

        ctx.strokeStyle = "#ffff66";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(
          b.x - b.vx * (3 + Math.random()),
          b.y - b.vy * (3 + Math.random()),
        );
        ctx.stroke();

        ctx.restore();
        break;
      }

      // 🌪 WIND
      case 4: {
        ctx.save();

        ctx.strokeStyle = "#ccffff";
        let pulse = Math.sin(state.frameCount * 0.3) * 2;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        break;
      }

      // 🌍 EARTH
      case 5: {
        ctx.save();

        ctx.fillStyle = "#8b5a2b";

        ctx.beginPath();
        ctx.arc(
          b.x + (Math.random() - 0.5) * 1.5,
          b.y + (Math.random() - 0.5) * 1.5,
          b.radius,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.strokeStyle = "#5a3b1a";
        ctx.stroke();

        ctx.restore();
        break;
      }

      // 🌌 VOID BULLET
      case 10: {
        ctx.save();
        const pulse = state.frameCount * 0.2;

        ctx.translate(b.x, b.y);
        ctx.rotate(pulse);
        ctx.beginPath();
        ctx.ellipse(0, 0, b.radius * 1.5, b.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(180, 0, 255, 0.6)";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#9900ff";
        ctx.fill();
        ctx.restore();
        break;
      }

      // 👾 GLITCH PIXEL
      case 11: {
        ctx.save();
        const isCyan = state.frameCount % 4 < 2;
        ctx.fillStyle = isCyan ? "#00ffff" : "#ff00ff";

        const glitchOffset = (Math.random() - 0.5) * 4;

        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(
          b.x - b.radius + glitchOffset,
          b.y - b.radius,
          b.radius * 2,
          b.radius * 2,
        );

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          b.x - b.radius / 2 + glitchOffset,
          b.y - b.radius / 2,
          b.radius,
          b.radius,
        );
        ctx.restore();
        break;
      }

      // 💻 DATA STREAM
      case 12: {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));

        ctx.fillStyle = "rgba(0, 255, 150, 0.6)";
        ctx.beginPath();
        ctx.moveTo(b.radius * 2, 0);
        ctx.lineTo(0, b.radius * 0.6);
        ctx.lineTo(-b.radius * 3, 0);
        ctx.lineTo(0, -b.radius * 0.6);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(b.radius, 0);
        ctx.lineTo(0, b.radius * 0.2);
        ctx.lineTo(-b.radius * 1.5, 0);
        ctx.lineTo(0, -b.radius * 0.2);
        ctx.fill();

        ctx.restore();
        break;
      }

      // 👻 PACKET LOSS
      case 13: {
        ctx.save();
        if (state.frameCount % 15 < 7) {
          ctx.fillStyle = "#ff0044";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#ff0044";
          ctx.fillRect(
            b.x - b.radius,
            b.y - b.radius,
            b.radius * 2,
            b.radius * 2,
          );
          ctx.strokeStyle = "#fff";
          ctx.strokeRect(
            b.x - b.radius,
            b.y - b.radius,
            b.radius * 2,
            b.radius * 2,
          );
        }
        ctx.restore();
        break;
      }

      // 🐛 VIRUS NODE
      case 14: {
        ctx.save();
        let pulse = Math.sin(state.frameCount * 0.4) * 5;
        ctx.fillStyle = "#8800ff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ff00ff";

        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          let a = (i * Math.PI) / 4 + state.frameCount * 0.05;
          let r = b.radius + (i % 2 === 0 ? pulse : -pulse);
          ctx.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#00ffcc";
        ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
        ctx.restore();
        break;
      }

      // 🌀 MATRIX SHURIKEN
      case 15: {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(-state.frameCount * 0.2);

        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00ff00";

        ctx.beginPath();
        ctx.moveTo(-b.radius, -b.radius);
        ctx.lineTo(b.radius, b.radius);
        ctx.moveTo(-b.radius, b.radius);
        ctx.lineTo(b.radius, -b.radius);
        ctx.stroke();

        ctx.strokeRect(
          -b.radius * 0.6,
          -b.radius * 0.6,
          b.radius * 1.2,
          b.radius * 1.2,
        );
        ctx.restore();
        break;
      }

      // 🌐 FATAL ORB
      case 16: {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        ctx.beginPath();
        ctx.arc(b.x + Math.random() * 4, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
        ctx.beginPath();
        ctx.arc(b.x - Math.random() * 4, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(0, 0, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(b.x, b.y + Math.random() * 4, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      // ⚡ GLITCH SPARK
      case 17: {
        ctx.save();
        ctx.strokeStyle = Math.random() > 0.5 ? "#ffff00" : "#ffffff";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffff00";

        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(
          b.x - b.vx * 2 + (Math.random() - 0.5) * 10,
          b.y - b.vy * 2 + (Math.random() - 0.5) * 10,
        );
        ctx.stroke();
        ctx.restore();
        break;
      }

      // DEFAULT
      default: {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

        if (b.isPlayer) {
          ctx.fillStyle =
            player.characterId === "elementalist"
              ? state.elementColors[b.element] || "#00ffcc"
              : "#00ffcc";
        } else {
          ctx.fillStyle = "#ff4444";
        }

        ctx.fill();
      }
    }
  }
  } finally {
    restoreParticlePush();
  }
}
