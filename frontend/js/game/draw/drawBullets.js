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
