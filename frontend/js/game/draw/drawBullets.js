import { state } from "../../state.js";

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

// ===== BULLETS (14+ styles) =====
export function drawBullets(ctx) {
  const { bullets, player } = state;
  const isScoutQ = player?.characterId === "scout" && (state.activeBuffs?.q || 0) > 0;
  const isFrostR = player?.characterId === "frost" && (state.activeBuffs?.r || 0) > 0;

  for (let b of bullets) {
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
}
