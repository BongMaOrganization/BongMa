import { state } from "../../state.js";
import { drawPuzzle } from "../puzzle_manager.js";

// ===== SWARM ZONES =====
export function drawSwarmZones(ctx) {
  if (state.isBossLevel || state.bossArenaMode) return;
  state.swarmZones.forEach((sz) => {
    if (sz.isCompleted) return;
    ctx.save();
    const pulse = Math.sin(state.frameCount * 0.1) * 20;
    const opacity = sz.active ? 0.3 : 0.15;

    const grad = ctx.createRadialGradient(
      sz.x,
      sz.y,
      0,
      sz.x,
      sz.y,
      sz.radius + pulse,
    );
    grad.addColorStop(0, `rgba(255, 100, 0, ${opacity})`);
    grad.addColorStop(1, "rgba(255, 50, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sz.x, sz.y, sz.radius + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 150, 0, ${opacity + 0.3})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 10]);
    ctx.lineDashOffset = -state.frameCount * 0.5;
    ctx.beginPath();
    ctx.arc(sz.x, sz.y, sz.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("⚠️ SWARM ZONE ⚠️", sz.x, sz.y - sz.radius - 20);
    ctx.restore();
  });
}

// ===== CRATES =====
export function drawCrates(ctx) {
  if (!state.crates) return;
  state.crates.forEach((c) => {
    ctx.save();

    ctx.fillStyle = "#8d6e63";
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 3;

    const x = c.x - c.radius;
    const y = c.y - c.radius;
    const size = c.radius * 2;

    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.fillRect(x, y, size, size);
    ctx.shadowBlur = 0;
    ctx.strokeRect(x, y, size, size);

    ctx.strokeStyle = "#4e342e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + size - 4, y + size - 4);
    ctx.moveTo(x + size - 4, y + 4);
    ctx.lineTo(x + 4, y + size - 4);
    ctx.stroke();

    if (c.hp < c.maxHp) {
      const bw = size * 0.8;
      const bh = 4;
      const bx = c.x - bw / 2;
      const by = y - 10;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = "#ff4444";
      ctx.fillRect(bx, by, bw * (c.hp / c.maxHp), bh);
    }

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    let icon = "?";
    if (c.type === "GOLD") icon = "💰";
    if (c.type === "XP") icon = "✨";
    if (c.type === "FIRE_RATE") icon = "⚡";
    if (c.type === "HP_REGEN") icon = "➕";
    ctx.fillText(icon, c.x, c.y + 6);

    ctx.restore();
  });
}

// ===== CAPTURE POINTS =====
export function drawCapturePoints(ctx) {
  if (!state.capturePoints) return;
  state.capturePoints.forEach((cp) => {
    if (cp.state === "completed") return;

    ctx.save();

    if (cp.state === "locked") {
      ctx.strokeStyle = "rgba(120,120,120,0.5)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#888";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`🔒 CP ${cp.order}`, cp.x, cp.y + 6);
      ctx.font = "13px Arial";
      ctx.fillText("Chiếm CP trước đó", cp.x, cp.y + 28);
      ctx.restore();
      return;
    }

    const pulse = Math.sin(state.frameCount * 0.1) * 10;
    const progressRatio = cp.progress / cp.totalProgress;

    if (cp.state === "charging") {
      const opacity = 0.15 + progressRatio * 0.45;

      ctx.globalCompositeOperation = "lighter";
      const floorGrad = ctx.createRadialGradient(
        cp.x,
        cp.y,
        0,
        cp.x,
        cp.y,
        cp.radius,
      );
      floorGrad.addColorStop(0, `rgba(255, 180, 0, ${opacity * 0.8})`);
      floorGrad.addColorStop(0.5, `rgba(255, 100, 0, ${opacity * 0.4})`);
      floorGrad.addColorStop(1, "rgba(255, 50, 0, 0)");

      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(state.frameCount * 0.015);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const segments = 12;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        ctx.moveTo(
          Math.cos(a1) * (cp.radius * 0.9),
          Math.sin(a1) * (cp.radius * 0.9),
        );
        ctx.lineTo(
          Math.cos(a2) * (cp.radius * 0.9),
          Math.sin(a2) * (cp.radius * 0.9),
        );
      }
      ctx.stroke();
      ctx.restore();

      ctx.globalCompositeOperation = "source-over";

      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(state.frameCount * 0.02);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.3})`;
      ctx.font = "bold 24px Georgia";
      const runeCount = 12;
      for (let i = 0; i < runeCount; i++) {
        const angle = (i / runeCount) * Math.PI * 2;
        const runes = ["᚛", "᚜", "ᚣ", "ᚤ", "ᚥ", "ᚦ"];
        ctx.fillText(
          runes[i % runes.length],
          Math.cos(angle) * (cp.radius - 40),
          Math.sin(angle) * (cp.radius - 40),
        );
      }
      ctx.restore();

      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(-state.frameCount * 0.05);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + progressRatio * 0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 40]);
      ctx.beginPath();
      ctx.arc(0, 0, cp.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (cp.state === "charging") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const beamW = 10 + Math.sin(state.frameCount * 0.2) * 5;
      const beamGrad = ctx.createLinearGradient(
        cp.x - beamW,
        0,
        cp.x + beamW,
        0,
      );
      beamGrad.addColorStop(0, "rgba(255, 100, 0, 0)");
      beamGrad.addColorStop(
        0.5,
        `rgba(255, 255, 255, ${0.4 + progressRatio * 0.6})`,
      );
      beamGrad.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(cp.x - beamW / 2, cp.y - 1000, beamW, 1000);
      ctx.restore();
    }

    const pillarGrad = ctx.createLinearGradient(
      cp.x - 25,
      cp.y,
      cp.x + 25,
      cp.y,
    );
    pillarGrad.addColorStop(0, "#111");
    pillarGrad.addColorStop(0.5, "#333");
    pillarGrad.addColorStop(1, "#111");
    ctx.fillStyle = pillarGrad;
    ctx.beginPath();
    ctx.moveTo(cp.x - 20, cp.y + 20);
    ctx.lineTo(cp.x - 25, cp.y - 80);
    ctx.lineTo(cp.x + 25, cp.y - 80);
    ctx.lineTo(cp.x + 20, cp.y + 20);
    ctx.fill();

    const orbColor =
      cp.state === "charging"
        ? `hsl(${30 + progressRatio * 30}, 100%, 60%)`
        : "#444";
    ctx.save();
    ctx.shadowBlur = cp.state === "charging" ? 25 + pulse : 0;
    ctx.shadowColor = orbColor;
    ctx.fillStyle = orbColor;
    ctx.beginPath();
    ctx.arc(
      cp.x,
      cp.y - 85,
      18 + (cp.state === "charging" ? Math.sin(state.frameCount * 0.2) * 3 : 0),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    if (cp.state === "charging") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.4 + Math.random() * 0.4})`;
      ctx.lineWidth = 4 + Math.random() * 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "red";
      ctx.beginPath();
      ctx.moveTo(cp.x, cp.y - 80);
      ctx.lineTo(
        cp.x + Math.cos(cp.laserAngle) * cp.radius,
        cp.y + Math.sin(cp.laserAngle) * cp.radius,
      );
      ctx.stroke();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (state.frameCount - cp.lastPulseTime < 45) {
        const sRatio = Math.max(
          0,
          Math.min(1, (state.frameCount - cp.lastPulseTime) / 45),
        );
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - sRatio})`;
        ctx.lineWidth = 4 * (1 - sRatio);
        ctx.beginPath();
        const shockRadius = Math.max(0, cp.radius * sRatio * 2);
        ctx.arc(cp.x, cp.y, shockRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const barW = 120;
    const barH = 12;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    if (ctx.roundRect)
      ctx.roundRect(cp.x - barW / 2 - 2, cp.y - 132, barW + 4, barH + 4, 6);
    else ctx.rect(cp.x - barW / 2 - 2, cp.y - 132, barW + 4, barH + 4);
    ctx.fill();

    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    if (ctx.roundRect)
      ctx.roundRect(cp.x - barW / 2, cp.y - 130, barW * progressRatio, barH, 4);
    else ctx.rect(cp.x - barW / 2, cp.y - 130, barW * progressRatio, barH);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    const label =
      cp.state === "guarding"
        ? `🛡️ CP ${cp.order || ""} — DIỆT THỦ VỆ`
        : `⚡ CP ${cp.order || ""} — CHIẾM ĐÓNG...`;
    ctx.fillText(label, cp.x, cp.y - 145);

    ctx.restore();
  });
}

// ===== ITEMS =====
export function drawItems(ctx) {
  if (!state.items) return;
  state.items.forEach((item) => {
    ctx.save();
    const pulse = Math.sin(state.frameCount * 0.1) * 5;
    const grad = ctx.createRadialGradient(
      item.x,
      item.y,
      0,
      item.x,
      item.y,
      item.radius + 20 + pulse,
    );
    grad.addColorStop(0, "rgba(0, 255, 255, 0.4)");
    grad.addColorStop(1, "rgba(0, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius + 20 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0ff";
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - item.radius);
    ctx.lineTo(item.x + item.radius, item.y);
    ctx.lineTo(item.x, item.y + item.radius);
    ctx.lineTo(item.x - item.radius, item.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(item.rewardType, item.x, item.y + item.radius + 25);
    ctx.restore();
  });
}

// ===== STAGE PORTAL =====
export function drawStagePortal(ctx) {
  const portal = state.stagePortal;
  if (!portal || !portal.active) return;

  const { x, y, radius, pulse } = portal;
  const t = pulse || 0;
  const breathe = Math.sin(t * 0.05) * 10;

  ctx.save();
  const outerGrad = ctx.createRadialGradient(
    x,
    y,
    0,
    x,
    y,
    radius * 2.5 + breathe,
  );
  outerGrad.addColorStop(0, "rgba(180,0,255,0.3)");
  outerGrad.addColorStop(0.5, "rgba(80,0,200,0.15)");
  outerGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5 + breathe, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "lighter";
  for (let ring = 0; ring < 3; ring++) {
    const ringR = radius * (0.5 + ring * 0.25) + breathe * 0.3;
    const alpha = 0.7 - ring * 0.2;
    ctx.strokeStyle = `rgba(220,0,255,${alpha})`;
    ctx.lineWidth = 4 - ring;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#cc00ff";
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.04);
  const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.8);
  innerGrad.addColorStop(0, "rgba(255,255,255,0.9)");
  innerGrad.addColorStop(0.4, "rgba(200,0,255,0.8)");
  innerGrad.addColorStop(1, "rgba(60,0,150,0.2)");
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * radius * 0.7, Math.sin(a) * radius * 0.7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#cc00ff";
  ctx.fillText("⚡ CỔNG BOSS ⚡", x, y - radius - 18);
  ctx.restore();
}

// ===== FLOATING TEXTS =====
export function drawFloatingTexts(ctx) {
  state.floatingTexts.forEach((t) => {
    ctx.save();
    ctx.fillStyle = t.color || "#fff";
    ctx.font = `bold ${t.size || 20}px Arial`;
    ctx.textAlign = "center";
    ctx.globalAlpha = t.opacity || 1;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
}

function fmtDmg(v) {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

// Số sát thương bay lên — crit (fire / đòn nặng) tô vàng + to hơn, có phình.
export function drawDamageNumbers(ctx) {
  const arr = state.damageNumbers;
  if (!arr || arr.length === 0) return;
  ctx.save();
  ctx.textAlign = "center";
  for (const d of arr) {
    const alpha = Math.max(0, Math.min(1, d.life / 14));
    const scale = 1 + (d.pop || 0) * 0.3;
    const size = (d.crit ? 16 : 11) * scale;
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${size}px Orbitron, Arial, sans-serif`;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.fillStyle = d.crit ? "#ffd23f" : "#ffffff";
    const txt = (d.crit ? "" : "") + fmtDmg(d.value);
    ctx.strokeText(txt, d.x, d.y);
    ctx.fillText(txt, d.x, d.y);
  }
  ctx.restore();
}

// ===== MAIN ENTRY (non-boss objects) =====
export function drawWorldObjects(ctx) {
  drawSwarmZones(ctx);
  if (!state.isBossLevel && !state.bossArenaMode) {
    drawCrates(ctx);
    drawPuzzle(ctx);
    drawCapturePoints(ctx);
    drawItems(ctx);
    drawStagePortal(ctx);
  }
  drawFloatingTexts(ctx);
  drawDamageNumbers(ctx);
}
