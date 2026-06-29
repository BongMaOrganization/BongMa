import { state } from "../../state.js";
import { lerpColor } from "./drawUtils.js";

// ===== BOSS BEAMS (Lightning) =====
export function drawBossBeams(ctx) {
  state.bossBeams.forEach((beam) => {
    ctx.save();
    if (beam.state === "charge") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 8 + Math.random() * 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00ffff";
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
    ctx.restore();
  });
}

// ===== BOSS ENTITY PHASE (survive mode) =====
export function drawBossEntityPhase(ctx, canvas, boss) {
  if (!boss || !boss.entityPhase) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boss.x - 25, boss.y - 25, 50, 50);

  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(boss.x, boss.y, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "20px monospace";
  ctx.fillText("SURVIVE: " + Math.ceil(boss.entityTimer / 60), 20, 40);
}

// ===== DEATH ANIMATION =====
export function drawBossDeathAnimation(ctx) {
  const boss = state.boss;
  if (!boss || !boss.deathTimer) return;

  const t = boss.deathTimer; // counts down from 120 to 0
  const progress = 1 - t / 120; // 0→1
  const bossType = boss.bossType || boss.id;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  switch (bossType) {
    case "fire": {
      // Cầu lửa bùng nổ, vỡ ra thành tro than
      const blastR = progress * 300;
      const alpha = Math.max(0, 1 - progress * 1.2);
      // Vòng nổ chính
      const grad = ctx.createRadialGradient(0, 0, blastR * 0.1, 0, 0, blastR);
      grad.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
      grad.addColorStop(0.4, `rgba(255, 120, 0, ${alpha * 0.8})`);
      grad.addColorStop(1, `rgba(80, 0, 0, 0)`);
      ctx.beginPath();
      ctx.arc(0, 0, blastR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // Những mảnh lửa văng ra
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + progress;
        const r = progress * 250 * (0.7 + ((i * 37) % 1) * 0.6);
        const sz = (1 - progress) * 18 + 4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${100 + i * 10}, 0, ${alpha * 0.9})`;
        ctx.fill();
      }
      // Shockwave ring
      ctx.beginPath();
      ctx.arc(0, 0, blastR * 0.9, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 50, ${alpha * 0.6})`;
      ctx.lineWidth = 6 * (1 - progress);
      ctx.stroke();
      break;
    }

    case "earth": {
      // Nứt vỡ, đá vỡ văng ra
      const crackAlpha = Math.max(0, 1 - progress * 1.3);
      // Hố nứt nẻ mở rộng
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const len = progress * 200;
        const w = (1 - progress) * 12 + 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.strokeStyle = `rgba(60, 30, 10, ${crackAlpha})`;
        ctx.lineWidth = w;
        ctx.stroke();
        // Đá văng
        const stoneR = progress * 220 * (0.8 + (i * 0.03));
        const sz = (1 - progress) * 20 + 5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * stoneR, Math.sin(a) * stoneR, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${100 + i * 10}, ${60 + i * 5}, 30, ${crackAlpha})`;
        ctx.fill();
      }
      // Bụi đất nâu lan rộng
      const dustR = progress * 280;
      const dustGrad = ctx.createRadialGradient(0, 0, dustR * 0.3, 0, 0, dustR);
      dustGrad.addColorStop(0, `rgba(139, 90, 43, ${crackAlpha * 0.5})`);
      dustGrad.addColorStop(1, "rgba(139, 90, 43, 0)");
      ctx.beginPath();
      ctx.arc(0, 0, dustR, 0, Math.PI * 2);
      ctx.fillStyle = dustGrad;
      ctx.fill();
      break;
    }

    case "ice": {
      // Vỡ thành mảnh băng lấp lánh
      const iceAlpha = Math.max(0, 1 - progress * 1.1);
      // Tia sáng trắng xanh
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + progress * 0.5;
        const len = progress * (150 + (i % 4) * 50);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.strokeStyle = `rgba(200, 240, 255, ${iceAlpha * (i % 2 === 0 ? 0.9 : 0.4)})`;
        ctx.lineWidth = i % 3 === 0 ? 4 : 1.5;
        ctx.stroke();
      }
      // Mảnh băng lớn
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const r = progress * 200 * (0.6 + (i * 7 % 10) * 0.04);
        ctx.save();
        ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
        ctx.rotate(a + progress * 2);
        const sw = (1 - progress) * 20 + 5;
        ctx.fillStyle = `rgba(180, 230, 255, ${iceAlpha})`;
        ctx.fillRect(-sw / 2, -sw * 0.3, sw, sw * 0.6);
        ctx.restore();
      }
      // Vòng sáng lạnh
      ctx.beginPath();
      ctx.arc(0, 0, progress * 250, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(150, 220, 255, ${iceAlpha * 0.5})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }

    case "wind": {
      // Vòng lốc xoáy tan biến
      const windAlpha = Math.max(0, 1 - progress * 1.2);
      for (let ring = 1; ring <= 4; ring++) {
        const ringR = progress * ring * 70;
        const startA = state.frameCount * 0.2 * ring;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, startA, startA + Math.PI * 1.5);
        ctx.strokeStyle = `rgba(180, 255, 240, ${windAlpha * (1 - ring * 0.2)})`;
        ctx.lineWidth = (5 - ring) * 2 * (1 - progress);
        ctx.stroke();
      }
      // Vòng nổ xanh lam
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 + progress * 3;
        const r = progress * 300;
        const sz = (1 - progress) * 8 + 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 200, ${windAlpha * 0.7})`;
        ctx.fill();
      }
      break;
    }

    case "thunder": {
      // Sét đánh toàn màn hình, tia sáng vàng trắng
      const tAlpha = Math.max(0, 1 - progress * 1.1);
      // Nhiều tia sét từ tâm ra ngoài
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + (i % 2 === 0 ? 0.1 : -0.1) * state.frameCount;
        const len = progress * (200 + Math.sin(i * 7) * 80);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Tia sét gấp khúc
        const mid1X = Math.cos(a + 0.3) * len * 0.4;
        const mid1Y = Math.sin(a + 0.3) * len * 0.4;
        const mid2X = Math.cos(a - 0.2) * len * 0.7;
        const mid2Y = Math.sin(a - 0.2) * len * 0.7;
        ctx.lineTo(mid1X, mid1Y);
        ctx.lineTo(mid2X, mid2Y);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.strokeStyle = `rgba(255, 255, 100, ${tAlpha})`;
        ctx.lineWidth = 3 + (i % 3);
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ffff00";
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Flash trắng trung tâm
      const flashR = (1 - progress) * 100;
      const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
      flashGrad.addColorStop(0, `rgba(255, 255, 255, ${tAlpha})`);
      flashGrad.addColorStop(1, "rgba(255, 255, 0, 0)");
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(0, 0, flashR, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "omni": {
      // Nổ đa sắc – tất cả màu nguyên tố cùng một lúc
      const omniAlpha = Math.max(0, 1 - progress * 1.0);
      const omniColors = ["#ff4400", "#00ffff", "#00ffcc", "#ffff00", "#ffffff"];
      for (let ring = 0; ring < 5; ring++) {
        const rR = progress * (80 + ring * 50);
        ctx.beginPath();
        ctx.arc(0, 0, rR, 0, Math.PI * 2);
        ctx.strokeStyle = omniColors[ring].replace(")", `, ${omniAlpha * (1 - ring * 0.15)})`).replace("rgb", "rgba").replace("#", "rgba(").replace(/rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}), /, (_, r, g, b) => `rgba(${parseInt(r,16)}, ${parseInt(g,16)}, ${parseInt(b,16)}, `);
        ctx.strokeStyle = `${omniColors[ring]}${Math.round(omniAlpha * 200).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 6 * (1 - progress) + 2;
        ctx.stroke();
      }
      // Mảnh đạn 4 màu văng ra nổ
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + progress;
        const r = progress * 280;
        const color = omniColors[i % 5];
        const sz = (1 - progress) * 12 + 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, sz, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = omniAlpha * 0.85;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Flash trắng lớn ngay đầu
      if (progress < 0.3) {
        const flashAlpha = (0.3 - progress) / 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
        ctx.fillRect(-400, -400, 800, 800);
      }
      break;
    }

    case "void": {
      // Hố đen sụp vào chính mình, không gian vỡ
      const voidAlpha = Math.max(0, 1 - progress * 1.1);
      // Vòng tím co lại
      for (let i = 0; i < 3; i++) {
        const ringR = (1 - progress) * boss.radius * (3 - i);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${120 + i * 50}, 0, 255, ${voidAlpha})`;
        ctx.lineWidth = 4 + i * 2;
        ctx.stroke();
      }
      // Ánh sáng tím bùng lên
      if (progress > 0.3) {
        const burstR = (progress - 0.3) / 0.7 * 350;
        const burstAlpha = Math.max(0, 1 - (progress - 0.3) / 0.7);
        const vGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, burstR);
        vGrad.addColorStop(0, `rgba(200, 100, 255, ${burstAlpha})`);
        vGrad.addColorStop(0.5, `rgba(100, 0, 200, ${burstAlpha * 0.5})`);
        vGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = vGrad;
        ctx.beginPath();
        ctx.arc(0, 0, burstR, 0, Math.PI * 2);
        ctx.fill();
      }
      // Vết nứt không gian
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + progress;
        const len = progress * 180;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.strokeStyle = `rgba(180, 0, 255, ${voidAlpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      break;
    }

    case "glitch": {
      // Màn hình glitch vỡ, pixel tan rã
      const gAlpha = Math.max(0, 1 - progress * 1.1);
      // Pixel blocks văng tứ tung
      for (let i = 0; i < 30; i++) {
        const seed = i * 137.5 % 360;
        const a = (seed / 360) * Math.PI * 2;
        const r = progress * 250 * (0.4 + (i % 5) * 0.14);
        const w = (1 - progress) * 25 + 4;
        const h = w * (0.5 + (i % 3) * 0.3);
        ctx.save();
        ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
        ctx.rotate(progress * i * 0.3);
        ctx.fillStyle = ["#00ffff", "#ff00ff", "#00ff00", "#ffffff", "#000000"][i % 5];
        ctx.globalAlpha = gAlpha * 0.9;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // Horizontal scan lines (glitch effect)
      if (progress < 0.6) {
        const lineAlpha = (0.6 - progress) / 0.6 * gAlpha;
        for (let i = 0; i < 5; i++) {
          const y = -boss.radius + i * (boss.radius * 0.4) + Math.sin(state.frameCount + i) * 20;
          ctx.fillStyle = `rgba(0, 255, 255, ${lineAlpha * 0.3})`;
          ctx.fillRect(-boss.radius * 2, y, boss.radius * 4, 6);
        }
      }
      // Text error cuối
      if (progress > 0.5 && progress < 0.85) {
        const txtAlpha = Math.sin((progress - 0.5) * Math.PI / 0.35);
        ctx.fillStyle = `rgba(255, 0, 100, ${txtAlpha * gAlpha})`;
        ctx.font = `bold ${Math.round(20 * (1 - progress) + 10)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText("FATAL ERROR", 0, 10);
      }
      break;
    }

    default: {
      // Generic explosion
      const defAlpha = Math.max(0, 1 - progress * 1.2);
      const defR = progress * 250;
      const defGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, defR);
      defGrad.addColorStop(0, `rgba(255, 255, 255, ${defAlpha})`);
      defGrad.addColorStop(0.5, `rgba(255, 150, 0, ${defAlpha * 0.7})`);
      defGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = defGrad;
      ctx.beginPath();
      ctx.arc(0, 0, defR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ===== BOSS MAIN DRAW =====
export function drawBoss(ctx) {
  const boss = state.boss;
  if (!boss) return;

  // Death animation takes over
  if (boss.deathTimer > 0) {
    drawBossDeathAnimation(ctx);
    return;
  }

  if (boss.entityPhase) return;

  let phase;
  const ratio = boss.hp / boss.maxHp;
  if (boss.phaseCount === 3) {
    phase = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;
  } else {
    phase = ratio > 0.5 ? 0 : 1;
  }
  const phaseColor = boss.phaseColors?.[phase] || {
    start: boss.color,
    end: boss.color,
  };

  const t = (Math.sin(state.frameCount * 0.05) + 1) / 2;
  const color = lerpColor(phaseColor.start, phaseColor.end, t);
  const fc = state.frameCount;
  const isRage = boss.hp < boss.maxHp * 0.5;
  const bossType = boss.bossType || boss.id;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  // ============================================================
  // UNIQUE BOSS APPEARANCES
  // ============================================================
  if (bossType === "fire") {
    _drawFireBoss(ctx, boss, color, fc, isRage);
  } else if (bossType === "earth") {
    _drawEarthBoss(ctx, boss, color, fc, isRage);
  } else if (bossType === "ice") {
    _drawIceBoss(ctx, boss, color, fc, isRage);
  } else if (bossType === "wind") {
    _drawWindBoss(ctx, boss, color, fc, isRage);
  } else if (bossType === "thunder") {
    _drawThunderBoss(ctx, boss, color, fc, isRage);
  } else if (bossType === "omni") {
    _drawOmniBoss(ctx, boss, color, fc, isRage);
  } else if (bossType === "void") {
    _drawVoidBoss(ctx, boss, color, fc, isRage);
  } else if (bossType === "glitch") {
    _drawGlitchBoss(ctx, boss, color, fc, isRage);
  } else {
    _drawDefaultBoss(ctx, boss, color, fc, isRage);
  }

  // Nhấp nháy trắng khi trúng đạn (combat.js set boss.hitFlashFrame)
  const sinceHit = fc - (boss.hitFlashFrame ?? -999);
  if (sinceHit >= 0 && sinceHit < 6) {
    const a = (1 - sinceHit / 6) * 0.55;
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// FIRE BOSS — Hỏa Vương: cầu lửa xoáy, vầng hào quang cam đỏ
// ─────────────────────────────────────────────────────────────
function _drawFireBoss(ctx, boss, color, fc, isRage) {
  const R = boss.radius;

  // ===== SUPERNOVA PHASE =====
  if (boss.ultimatePhase) {
    // Biến thành mặt trời thu nhỏ — trắng vàng chói + solar flares
    const pulse = (Math.sin(fc * 0.15) + 1) / 2;

    // Corona ngoài (hào quang mặt trời)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + fc * 0.02;
      const flareLen = R * (1.2 + Math.sin(fc * 0.1 + i * 1.7) * 0.8);
      const flareW = R * 0.18;
      ctx.save();
      ctx.translate(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05);
      ctx.rotate(a + Math.PI / 2);
      const sg = ctx.createLinearGradient(0, 0, 0, -flareLen);
      sg.addColorStop(0, `rgba(255, 255, 180, ${0.9 - i % 3 * 0.1})`);
      sg.addColorStop(0.5, `rgba(255, 140, 0, 0.6)`);
      sg.addColorStop(1, "rgba(255, 80, 0, 0)");
      ctx.beginPath();
      ctx.moveTo(-flareW / 2, 0);
      ctx.quadraticCurveTo(flareW * 0.8, -flareLen * 0.5, 0, -flareLen);
      ctx.quadraticCurveTo(-flareW * 0.8, -flareLen * 0.5, flareW / 2, 0);
      ctx.closePath();
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.restore();
    }

    // Vòng hào quang trắng bẩy sáng
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.5 + pulse * 0.3), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 200, ${0.3 + pulse * 0.4})`;
    ctx.lineWidth = 6 + pulse * 4;
    ctx.shadowBlur = 40;
    ctx.shadowColor = "#ffffff";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Thân mặt trời: lõi trắng trứng
    const sunGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    sunGrad.addColorStop(0, "#ffffff");
    sunGrad.addColorStop(0.3, `rgba(255, 255, 150, ${0.9 + pulse * 0.1})`);
    sunGrad.addColorStop(0.7, "#ff8800");
    sunGrad.addColorStop(1, "#cc2200");
    ctx.beginPath();
    ctx.arc(0, 0, R * (1 + pulse * 0.08), 0, Math.PI * 2);
    ctx.fillStyle = sunGrad;
    ctx.shadowBlur = 80;
    ctx.shadowColor = "#ffaa00";
    ctx.fill();
    ctx.shadowBlur = 0;
    return;
  }

  // ===== NORMAL PHASE =====
  const pulse = Math.sin(fc * 0.08) * 0.15 + 1;

  // Các vòng ngọn lửa quanh thân
  for (let ring = 0; ring < (isRage ? 4 : 3); ring++) {
    const ringR = R * (1.4 + ring * 0.4) * pulse;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + fc * (0.03 + ring * 0.01) * (ring % 2 === 0 ? 1 : -1);
      const flameH = R * 0.5 + Math.sin(fc * 0.15 + i) * R * 0.2;
      ctx.save();
      ctx.translate(Math.cos(a) * ringR, Math.sin(a) * ringR);
      ctx.rotate(a + Math.PI / 2);
      const flameGrad = ctx.createLinearGradient(0, 0, 0, -flameH);
      flameGrad.addColorStop(0, `rgba(255, 60, 0, ${0.9 - ring * 0.15})`);
      flameGrad.addColorStop(0.4, `rgba(255, 180, 0, ${0.7 - ring * 0.1})`);
      flameGrad.addColorStop(1, "rgba(255, 255, 200, 0)");
      ctx.beginPath();
      ctx.moveTo(-R * 0.12, 0);
      ctx.quadraticCurveTo(R * 0.18, -flameH * 0.5, 0, -flameH);
      ctx.quadraticCurveTo(-R * 0.18, -flameH * 0.5, R * 0.12, 0);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.fill();
      ctx.restore();
    }
  }

  const bodyGrad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.05, 0, 0, R * pulse);
  bodyGrad.addColorStop(0, "#fff5d0");
  bodyGrad.addColorStop(0.3, "#ff8800");
  bodyGrad.addColorStop(0.7, "#cc2200");
  bodyGrad.addColorStop(1, "#550000");
  ctx.beginPath();
  ctx.arc(0, 0, R * pulse, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.shadowBlur = isRage ? 60 : 35;
  ctx.shadowColor = "#ff4400";
  ctx.fill();
  ctx.shadowBlur = 0;

  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + fc * 0.005;
    const crackLen = R * (0.4 + Math.sin(fc * 0.1 + i) * 0.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * crackLen, Math.sin(a) * crackLen);
    ctx.strokeStyle = `rgba(255, 200, 0, ${0.4 + Math.sin(fc * 0.2 + i) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, R * 0.25 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = "#ffff88";
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────
// EARTH BOSS — Địa Chấn Vương: khối đá nặng nề, nhô lên từ đất
// ─────────────────────────────────────────────────────────────
function _drawEarthBoss(ctx, boss, color, fc, isRage) {
  const R = boss.radius;

  // ===== EARTHQUAKE PHASE =====
  if (boss.ultimatePhase) {
    // Khối đá khổng lồ nổi lên từ mặt đất, xoay chậm, vết nứt phát sáng
    const quakeShake = Math.sin(fc * 0.4) * 6;

    // Mảnh đá vây phát sáng quanh cấu xung
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + fc * 0.01;
      const orbitR = R * (1.5 + Math.sin(fc * 0.08 + i) * 0.3);
      ctx.save();
      ctx.translate(Math.cos(a) * orbitR, Math.sin(a) * orbitR + quakeShake);
      ctx.rotate(fc * 0.03 * (i % 2 === 0 ? 1 : -1));
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${80 + i * 8}, ${45 + i * 4}, 15, 0.85)`;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ff6600";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Vết nứt phát sáng cam đỏ (dung nạm)
    ctx.save();
    ctx.translate(0, quakeShake);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + fc * 0.005;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9);
      ctx.strokeStyle = `rgba(255, ${100 + i * 15}, 0, ${0.7 + Math.sin(fc * 0.15 + i) * 0.3})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff4400";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Thân đá chính + nối sáng nứt
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * (Math.PI / 4) + fc * 0.008;
      const r = R * (1 + Math.sin(fc * 0.2 + i) * 0.08);
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
               : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    const eqGrad = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
    eqGrad.addColorStop(0, "#ff6600");
    eqGrad.addColorStop(0.4, "#8b4513");
    eqGrad.addColorStop(1, "#3e2010");
    ctx.fillStyle = eqGrad;
    ctx.shadowBlur = 50;
    ctx.shadowColor = "#ff4400";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  // ===== NORMAL PHASE =====
  const bob = Math.sin(fc * 0.04) * 4;

  ctx.beginPath();
  ctx.ellipse(0, R * 0.9, R * 1.1, R * 0.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();

  const outerR = R * 1.15;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + fc * 0.008;
    const spR = outerR + Math.sin(fc * 0.06 + i) * 8;
    const spW = R * 0.38;
    ctx.save();
    ctx.translate(Math.cos(a) * spR * 0.6, Math.sin(a) * spR * 0.6 + bob);
    ctx.rotate(a + fc * 0.01);
    ctx.beginPath();
    ctx.arc(0, 0, spW, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80, 45, 15, 0.75)`;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(fc * 0.007);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * (Math.PI / 3);
    const hex = R * (1 + Math.sin(fc * 0.05 + i) * 0.04);
    i === 0 ? ctx.moveTo(Math.cos(a) * hex, Math.sin(a) * hex)
             : ctx.lineTo(Math.cos(a) * hex, Math.sin(a) * hex);
  }
  ctx.closePath();
  const stoneGrad = ctx.createRadialGradient(-R * 0.25, -R * 0.25, 5, 0, 0, R);
  stoneGrad.addColorStop(0, "#b8a080");
  stoneGrad.addColorStop(0.5, "#7a5230");
  stoneGrad.addColorStop(1, "#3e2010");
  ctx.fillStyle = stoneGrad;
  ctx.shadowBlur = isRage ? 40 : 20;
  ctx.shadowColor = "#8b4513";
  ctx.fill();
  ctx.strokeStyle = "#d2b48c";
  ctx.lineWidth = isRage ? 4 : 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let i = 0; i < 4; i++) {
    const a = i * 0.8 + 0.3;
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3,
      R * (0.25 + i * 0.06), 0.4, 2.5
    );
    ctx.strokeStyle = `rgba(200, 170, 120, ${0.25 + i * 0.05})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  if (isRage) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + fc * 0.02;
      const spikeR = R * 1.05;
      const spikeH = R * 0.55;
      ctx.save();
      ctx.translate(Math.cos(a) * spikeR, Math.sin(a) * spikeR + bob);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(0, -spikeH);
      ctx.lineTo(8, 0);
      ctx.closePath();
      ctx.fillStyle = "#6b3a1a";
      ctx.fill();
      ctx.restore();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// ICE BOSS — Băng Hậu: quả cầu pha lê, tia băng, snowflake
// ─────────────────────────────────────────────────────────────
function _drawIceBoss(ctx, boss, color, fc, isRage) {
  const R = boss.radius;
  const glimmer = (Math.sin(fc * 0.07) + 1) / 2;

  // ===== GLACIAL AGE PHASE =====
  if (boss.ultimatePhase) {
    // Biến thành khối tinh thể băng khổng lồ + bão tuyết quanh
    const spin = fc * 0.04;

    // Bão tuyết: muggót băng quay quanh nhanh
    for (let layer = 0; layer < 4; layer++) {
      const layerR = R * (1.4 + layer * 0.45);
      const numFlakes = 6 + layer * 2;
      for (let i = 0; i < numFlakes; i++) {
        const a = (i / numFlakes) * Math.PI * 2 + spin * (layer % 2 === 0 ? 2 : -1.5);
        const fx = Math.cos(a) * layerR;
        const fy = Math.sin(a) * layerR;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(a + fc * 0.08);
        const flakeSize = R * 0.1 + (layer % 2) * R * 0.05;
        for (let s = 0; s < 6; s++) {
          const sa = s * (Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(sa) * flakeSize, Math.sin(sa) * flakeSize);
          ctx.strokeStyle = `rgba(220, 245, 255, ${0.7 - layer * 0.1})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Tinh thể lớn: hình sao 12 cạnh
    ctx.save();
    ctx.rotate(spin * 0.5);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 === 0 ? R * 1.1 : R * 0.65;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
               : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    const glacialGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    glacialGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    glacialGrad.addColorStop(0.4, "rgba(100, 200, 255, 0.9)");
    glacialGrad.addColorStop(0.8, "rgba(0, 80, 200, 0.85)");
    glacialGrad.addColorStop(1, "rgba(0, 20, 120, 0.9)");
    ctx.fillStyle = glacialGrad;
    ctx.shadowBlur = 70;
    ctx.shadowColor = "#aaddff";
    ctx.fill();
    ctx.shadowBlur = 0;
    // Viền tinh thể sáng
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Laser tinh thể ra ngoài
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + spin * 0.3;
      const len = R * (1.4 + Math.sin(fc * 0.08 + i) * 0.4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.strokeStyle = `rgba(200, 240, 255, 0.8)`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00ccff";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    return;
  }

  // ===== NORMAL PHASE =====
  for (let i = 0; i < (isRage ? 3 : 2); i++) {
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.3 + i * 0.35), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(200, 240, 255, ${0.2 - i * 0.05})`;
    ctx.lineWidth = 3 - i;
    ctx.stroke();
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2 + fc * 0.015 * (i % 2 === 0 ? 1 : -1);
      const rr = R * (1.3 + i * 0.35);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (rr - 10), Math.sin(a) * (rr - 10));
      ctx.lineTo(Math.cos(a) * (rr + 10), Math.sin(a) * (rr + 10));
      ctx.strokeStyle = `rgba(220, 250, 255, ${0.4 - i * 0.1})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.rotate(fc * 0.02);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const iceLen = R * (0.9 + glimmer * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * iceLen, Math.sin(a) * iceLen);
    ctx.strokeStyle = `rgba(180, 240, 255, 0.6)`;
    ctx.lineWidth = 3;
    ctx.stroke();
    const bLen = iceLen * 0.45;
    const bA1 = a + Math.PI / 6;
    const bA2 = a - Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * bLen, Math.sin(a) * bLen);
    ctx.lineTo(Math.cos(bA1) * (bLen + R * 0.2), Math.sin(bA1) * (bLen + R * 0.2));
    ctx.moveTo(Math.cos(a) * bLen, Math.sin(a) * bLen);
    ctx.lineTo(Math.cos(bA2) * (bLen + R * 0.2), Math.sin(bA2) * (bLen + R * 0.2));
    ctx.strokeStyle = `rgba(200, 245, 255, 0.4)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  const iceGrad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.05, 0, 0, R);
  iceGrad.addColorStop(0, `rgba(255, 255, 255, 0.95)`);
  iceGrad.addColorStop(0.4, `rgba(130, 220, 255, 0.85)`);
  iceGrad.addColorStop(0.8, `rgba(0, 160, 220, 0.8)`);
  iceGrad.addColorStop(1, `rgba(0, 80, 160, 0.9)`);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = iceGrad;
  ctx.shadowBlur = isRage ? 50 : 30;
  ctx.shadowColor = "#00ccff";
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.ellipse(-R * 0.28, -R * 0.28, R * 0.28, R * 0.12, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + glimmer * 0.3})`;
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────
// WIND BOSS — Phong Thần: vòng lốc, cơ thể mờ ảo xanh lam
// ─────────────────────────────────────────────────────────────
function _drawWindBoss(ctx, boss, color, fc, isRage) {
  const R = boss.radius;
  const spin = fc * 0.06;

  // ===== HURRICANE PHASE =====
  if (boss.ultimatePhase) {
    // Biến thành cơn bão thuần túy — vô hình gần như + toàn phần
    const stormSpin = fc * 0.1;

    // Nhiều vòng xoáy nhanh hơn
    for (let ring = 0; ring < 7; ring++) {
      const ringR = R * (0.5 + ring * 0.4);
      const speed = (ring % 2 === 0 ? 1 : -1.4) * stormSpin;
      const arc = Math.PI * 2 - 0.3 - ring * 0.05;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, speed, speed + arc);
      ctx.strokeStyle = `rgba(${0}, ${200 + ring * 8}, ${180 - ring * 10}, ${0.6 - ring * 0.06})`;
      ctx.lineWidth = 7 - ring * 0.7;
      ctx.lineCap = "round";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00ffcc";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Mắt bão — trắng thuần phát sáng
    const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.4);
    eyeGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    eyeGrad.addColorStop(0.6, "rgba(180, 255, 240, 0.7)");
    eyeGrad.addColorStop(1, "rgba(0, 200, 160, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = eyeGrad;
    ctx.shadowBlur = 40;
    ctx.shadowColor = "#ffffff";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Sấm sét gọi từ mối đang bão
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + stormSpin * 0.5;
      const from = R * (0.5 + Math.sin(fc * 0.2 + i) * 0.15);
      const to = R * (1.3 + Math.sin(fc * 0.15 + i) * 0.3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * from, Math.sin(a) * from);
      ctx.lineTo(Math.cos(a + 0.15) * (from + to) * 0.5, Math.sin(a + 0.15) * (from + to) * 0.5);
      ctx.lineTo(Math.cos(a) * to, Math.sin(a) * to);
      ctx.strokeStyle = `rgba(200, 255, 240, 0.7)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    return;
  }

  // ===== NORMAL PHASE =====
  for (let ring = 0; ring < (isRage ? 5 : 3); ring++) {
    const ringR = R * (0.7 + ring * 0.45);
    const gap = Math.PI * 0.4 + ring * 0.1;
    const speed = (ring % 2 === 0 ? 1 : -1.3) * 0.04;
    const startA = fc * speed + ring * Math.PI * 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, startA, startA + Math.PI * 2 - gap);
    ctx.strokeStyle = `rgba(${0 + ring * 20}, 255, ${200 - ring * 20}, ${0.5 - ring * 0.07})`;
    ctx.lineWidth = 5 - ring * 0.6;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  ctx.save();
  ctx.rotate(spin);
  const windGrad = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
  windGrad.addColorStop(0, "rgba(200, 255, 240, 0.9)");
  windGrad.addColorStop(0.5, "rgba(0, 200, 160, 0.55)");
  windGrad.addColorStop(1, "rgba(0, 100, 80, 0.15)");
  ctx.beginPath();
  ctx.ellipse(0, 0, R, R * 0.75, 0, 0, Math.PI * 2);
  ctx.fillStyle = windGrad;
  ctx.shadowBlur = isRage ? 50 : 30;
  ctx.shadowColor = "#00ffcc";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.beginPath();
  ctx.arc(0, 0, R * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(240, 255, 250, 0.8)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 180, 140, 0.9)";
  ctx.fill();

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + spin * 1.5;
    const dr = R * (0.6 + (i % 4) * 0.22);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dr, Math.sin(a) * dr, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 200, ${0.6 - (i % 4) * 0.1})`;
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────
// THUNDER BOSS — Lôi Thần: cầu sét, hào quang vàng chớp
// ─────────────────────────────────────────────────────────────
function _drawThunderBoss(ctx, boss, color, fc, isRage) {
  const R = boss.radius;
  const flash = Math.sin(fc * 0.2) > 0.7;

  // ===== HEAVEN'S WRATH PHASE =====
  if (boss.ultimatePhase) {
    // Biến thành cột sét thuần túy — cơ thể vỡ tan thành năng lượng
    const wrath = Math.sin(fc * 0.3);
    const burstFlash = Math.sin(fc * 0.25) > 0.6;

    // Vnăng lượng điện phun tứ phía
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + fc * 0.05 * (i % 2 === 0 ? 1 : -1);
      const len = R * (1.5 + Math.sin(fc * 0.12 + i * 0.7) * 0.7);
      const mid1A = a + 0.4;
      const mid2A = a - 0.3;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(mid1A) * len * 0.35, Math.sin(mid1A) * len * 0.35);
      ctx.lineTo(Math.cos(mid2A) * len * 0.7, Math.sin(mid2A) * len * 0.7);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.strokeStyle = `rgba(255, 255, ${burstFlash ? 255 : 100}, ${burstFlash ? 0.9 : 0.5})`;
      ctx.lineWidth = burstFlash ? 4 : 1.5;
      ctx.shadowBlur = burstFlash ? 30 : 10;
      ctx.shadowColor = "#ffff00";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Core điện tía sáng lóa — hình tia laze vô định
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.7 + wrath * 0.3), 0, Math.PI * 2);
    const wrathGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    wrathGrad.addColorStop(0, `rgba(255, 255, 255, ${burstFlash ? 1 : 0.85})`);
    wrathGrad.addColorStop(0.3, `rgba(255, 255, 0, 0.9)`);
    wrathGrad.addColorStop(0.7, `rgba(200, 100, 0, 0.6)`);
    wrathGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = wrathGrad;
    ctx.shadowBlur = burstFlash ? 100 : 60;
    ctx.shadowColor = "#ffff00";
    ctx.fill();
    ctx.shadowBlur = 0;
    return;
  }

  // ===== NORMAL PHASE =====
  for (let i = 0; i < (isRage ? 10 : 6); i++) {
    const a = (i / (isRage ? 10 : 6)) * Math.PI * 2 + fc * 0.03;
    const dist = R * (1.15 + Math.sin(fc * 0.12 + i) * 0.2);
    const len = R * (0.3 + Math.sin(fc * 0.08 + i * 1.7) * 0.15);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * dist, Math.sin(a) * dist);
    const midA = a + 0.2;
    ctx.lineTo(Math.cos(midA) * (dist + len * 0.5), Math.sin(midA) * (dist + len * 0.5));
    ctx.lineTo(Math.cos(a) * (dist + len), Math.sin(a) * (dist + len));
    ctx.strokeStyle = `rgba(255, 255, 80, ${flash ? 0.9 : 0.5})`;
    ctx.lineWidth = flash ? 3 : 1.5;
    ctx.shadowBlur = flash ? 20 : 8;
    ctx.shadowColor = "#ffff00";
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.rotate(fc * 0.04);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * (Math.PI / 4);
    const jitter = Math.sin(fc * 0.3 + i * 7) * (isRage ? 5 : 2);
    const r = R + jitter;
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
             : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  const ltGrad = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.1);
  ltGrad.addColorStop(0, "#ffffaa");
  ltGrad.addColorStop(0.3, "#ffff00");
  ltGrad.addColorStop(0.7, "#cc8800");
  ltGrad.addColorStop(1, "#441100");
  ctx.fillStyle = ltGrad;
  ctx.shadowBlur = flash ? 60 : 30;
  ctx.shadowColor = "#ffff00";
  ctx.fill();
  ctx.strokeStyle = flash ? "#ffffff" : "#ffee00";
  ctx.lineWidth = flash ? 5 : 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2) + fc * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7);
    ctx.strokeStyle = `rgba(255, 255, 200, ${flash ? 0.8 : 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ─────────────────────────────────────────────────────────────
// OMNI BOSS — Chúa Tể Nguyên Tố: vòng nguyên tố xoay, cầu trắng
// ─────────────────────────────────────────────────────────────
function _drawOmniBoss(ctx, boss, color, fc, isRage) {
  const R = boss.radius;
  const elementColors = ["#ff4400", "#8b4513", "#00ccff", "#00ffcc", "#ffff00"];

  // ===== OMNI_DOOMSDAY_ARENA PHASE =====
  if (boss.ultimatePhase) {
    // Tất cả nguyên tố nổ tung trong cái hộp bát giác
    const doom = fc * 0.06;

    // Vòng nguyên tố 5 lớp quay khác tốc độ
    for (let ring = 0; ring < 5; ring++) {
      const ringR = R * (0.8 + ring * 0.55);
      const speed = (ring % 2 === 0 ? 1 : -1.3) * doom;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + speed;
        const sz = R * (0.18 + Math.sin(fc * 0.1 + i + ring) * 0.06);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * ringR, Math.sin(a) * ringR, sz, 0, Math.PI * 2);
        ctx.fillStyle = elementColors[(ring + i) % 5];
        ctx.shadowBlur = 20;
        ctx.shadowColor = elementColors[(ring + i) % 5];
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Thân phát sáng trắng bạo lực
    const doomed = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.2);
    doomed.addColorStop(0, "rgba(255, 255, 255, 1)");
    doomed.addColorStop(0.3, "rgba(200, 150, 255, 0.9)");
    doomed.addColorStop(0.7, "rgba(100, 0, 200, 0.7)");
    doomed.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = doomed;
    ctx.shadowBlur = 80;
    ctx.shadowColor = "#ffffff";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tên giao chéo 4 màu từ tâm ra
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + doom * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * R * 1.5, Math.sin(a) * R * 1.5);
      ctx.strokeStyle = elementColors[i];
      ctx.lineWidth = 5;
      ctx.shadowBlur = 25;
      ctx.shadowColor = elementColors[i];
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    return;
  }

  // ===== NORMAL PHASE =====
  const orbitR = R * 1.8;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + fc * 0.025;
    const ox = Math.cos(a) * orbitR;
    const oy = Math.sin(a) * orbitR;
    const orbSize = R * 0.32;
    ctx.beginPath();
    ctx.arc(ox, oy, orbSize * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = elementColors[i] + "30";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ox, oy, orbSize, 0, Math.PI * 2);
    ctx.fillStyle = elementColors[i];
    ctx.shadowBlur = 20;
    ctx.shadowColor = elementColors[i];
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.save();
  ctx.rotate(-fc * 0.018);
  for (let i = 0; i < 5; i++) {
    const rr = R * (0.8 + i * 0.1);
    ctx.beginPath();
    ctx.arc(0, 0, rr, (i / 5) * Math.PI * 2, (i / 5 + 0.18) * Math.PI * 2);
    ctx.strokeStyle = elementColors[i];
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();

  const omniGrad = ctx.createRadialGradient(-R * 0.2, -R * 0.2, R * 0.05, 0, 0, R);
  omniGrad.addColorStop(0, "#ffffff");
  omniGrad.addColorStop(0.5, `rgba(200, 200, 255, 0.9)`);
  omniGrad.addColorStop(1, `rgba(100, 50, 200, 0.7)`);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = omniGrad;
  ctx.shadowBlur = isRage ? 70 : 45;
  ctx.shadowColor = "#cc88ff";
  ctx.fill();
  ctx.shadowBlur = 0;

  if (isRage) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + fc * 0.01;
      const spikeLen = R * (0.4 + Math.sin(fc * 0.1 + i) * 0.1);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      ctx.lineTo(Math.cos(a) * (R + spikeLen), Math.sin(a) * (R + spikeLen));
      ctx.strokeStyle = elementColors[i % 5];
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = elementColors[i % 5];
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// VOID BOSS — Giữ nguyên, enhance thêm
// ─────────────────────────────────────────────────────────────
function _drawVoidBoss(ctx, boss, color, fc, isRage) {
  const R = boss.radius;

  // ===== EVENT_HORIZON PHASE =====
  if (boss.ultimatePhase) {
    // Hố đen thực sự với các vòng sáng accretion disk chẫm đầu
    const horizonSpin = fc * 0.03;

    // Accretion disk (vòng vật chất quay quanh)
    for (let disk = 0; disk < 4; disk++) {
      const diskR = R * (1.2 + disk * 0.55);
      const diskSpeed = horizonSpin * (1 + disk * 0.3) * (disk % 2 === 0 ? 1 : -1);
      const arcLen = Math.PI * (1.5 - disk * 0.15);
      ctx.save();
      ctx.rotate(diskSpeed);
      ctx.beginPath();
      ctx.arc(0, 0, diskR, 0, arcLen);
      const diskAlpha = 0.7 - disk * 0.12;
      ctx.strokeStyle = `rgba(${100 + disk * 30}, 0, 255, ${diskAlpha})`;
      ctx.lineWidth = 8 - disk * 1.5;
      ctx.shadowBlur = 25;
      ctx.shadowColor = "#6600ff";
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Photon sphere — vnăng sáng xanh cực mạnh tại biên
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200, 100, 255, 0.8)";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 50;
    ctx.shadowColor = "#aa00ff";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Lỗ đen: tối hoàn toàn pha gradient
    const ehGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    ehGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
    ehGrad.addColorStop(0.6, "rgba(0, 0, 0, 1)");
    ehGrad.addColorStop(0.9, "rgba(50, 0, 100, 0.8)");
    ehGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = ehGrad;
    ctx.fill();

    // Hawking radiation particles (hạt nhỏ phóng từ biên)
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + fc * 0.04;
      const pr = R * (1.05 + Math.sin(fc * 0.1 + i) * 0.1);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * pr, Math.sin(a) * pr, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${150 + (i % 3) * 35}, 0, 255, 0.8)`;
      ctx.fill();
    }
    return;
  }

  // ===== NORMAL PHASE =====
  if (isRage) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, R * (1.4 + i * 0.3), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${100 + i * 40}, 0, 255, 0.25)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = "#050011";
  ctx.fill();

  ctx.save();
  ctx.rotate(-fc * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 2.2, R * 0.6, Math.PI / 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(180, 0, 255, 0.8)";
  ctx.lineWidth = 6;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#8800ff";
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.save();
  ctx.rotate(fc * 0.03);
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.8, R * 0.5, -Math.PI / 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(100, 0, 200, 0.5)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(0, 0, R * 0.35, 0, Math.PI * 2);
  const eyeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.35);
  eyeGrad.addColorStop(0, "rgba(180, 0, 255, 0.9)");
  eyeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = eyeGrad;
  ctx.fill();

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + fc * 0.04;
    const dist = R * (0.7 + Math.sin(fc * 0.07 + i) * 0.2);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180, 20, 255, 0.8)";
    ctx.fill();
  }
}

// ─────────────────────────────────────────────────────────────
// GLITCH BOSS — Giữ nguyên
// ─────────────────────────────────────────────────────────────
function _drawGlitchBoss(ctx, boss, color, fc, isRage) {
  if (boss.ultimatePhase) {
    ctx.save();
    const pulse = Math.sin(fc * 0.1) * 10;
    ctx.shadowBlur = 40 + pulse;
    ctx.shadowColor = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius * 0.8 + pulse * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00ffff";
    ctx.rotate(fc * 0.05);
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 4;
    ctx.strokeRect(-boss.radius, -boss.radius, boss.radius * 2, boss.radius * 2);
    ctx.shadowColor = "#ff00ff";
    ctx.rotate(-fc * 0.1);
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -boss.radius * 1.5);
    ctx.lineTo(boss.radius * 1.5, 0);
    ctx.lineTo(0, boss.radius * 1.5);
    ctx.lineTo(-boss.radius * 1.5, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.radius * 0.2, boss.radius * 0.5, fc * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const offset = (Math.random() - 0.5) * 10;
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(-boss.radius + offset, -boss.radius, boss.radius * 2, boss.radius * 2);
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(-boss.radius - offset, -boss.radius, boss.radius * 2, boss.radius * 2);
    ctx.fillStyle = "#111111";
    ctx.fillRect(-boss.radius, -boss.radius, boss.radius * 2, boss.radius * 2);
    ctx.fillStyle = "#00ff00";
    ctx.font = "bold 16px monospace";
    ctx.fillText(Math.random() > 0.5 ? "010" : "101", -12, 5);
    ctx.restore();
  }
}

// ─────────────────────────────────────────────────────────────
// DEFAULT — Fallback
// ─────────────────────────────────────────────────────────────
function _drawDefaultBoss(ctx, boss, color, fc, isRage) {
  const R = boss.radius;
  ctx.rotate(fc * 0.01);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.lineWidth = isRage ? 8 : 4;
  ctx.strokeStyle = color;
  ctx.shadowBlur = isRage ? 40 : 25;
  ctx.shadowColor = color;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.fillRect(-8, -8, 16, 16);
}

// ===== SUCTION PARTICLES (boss ultimate phase) =====
export function drawSuctionParticles(ctx) {
  if (!state.cinematicEffects.suctionParticles) {
    state.cinematicEffects.suctionParticles = [];
    for (let i = 0; i < 30; i++) {
      state.cinematicEffects.suctionParticles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        speed: 2 + Math.random() * 5,
      });
    }
  }

  ctx.fillStyle = state.boss.elementColor || "#fff";
  state.cinematicEffects.suctionParticles.forEach((p) => {
    const dx = state.boss.x - p.x;
    const dy = state.boss.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) {
      p.x = Math.random() * 800;
      p.y = Math.random() * 600;
    } else {
      p.x += (dx / dist) * p.speed;
      p.y += (dy / dist) * p.speed;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}
