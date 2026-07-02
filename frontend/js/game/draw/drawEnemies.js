import { state } from "../../state.js";
import { dist } from "../../utils.js";
import { shouldUseMinimalEnemyDraw } from "../vfxBudget.js";
import { drawMiniBoss } from "../../entities/miniBosses.js";

function isVisible(x, y, radius = 0, padding = 180) {
  const cam = state.camera;
  if (!cam) return true;
  const width = cam.width || 0;
  const height = cam.height || 0;
  return (
    x + radius >= cam.x - padding &&
    x - radius <= cam.x + width + padding &&
    y + radius >= cam.y - padding &&
    y - radius <= cam.y + height + padding
  );
}

// ===== ECHO MODE (Vòng Lặp): Mộ bia =====
function drawEchoGraves(ctx) {
  const graves = state.echoGraves;
  if (!graves || graves.length === 0) return;
  for (const gr of graves) {
    if (!isVisible(gr.x, gr.y, 30)) continue;
    const bob = Math.sin((gr.pulse || 0) * 0.08) * 3;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "26px serif";
    ctx.globalAlpha = 0.95;
    ctx.fillText("🪦", gr.x, gr.y + bob);
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`${gr.coins} 💰`, gr.x, gr.y + 20 + bob);
    ctx.restore();
  }
}

// ===== ECHO MODE (Vòng Lặp): Bóng Ma replay =====
function drawEchoGhost(ctx, g, minimalDraw) {
  const materializing = (g.spawnProtect || 0) > 0;
  const alpha = materializing ? 0.3 : g.isStunned > 0 ? 0.5 : 0.85;
  // Ưu tiên màu: Nemesis vàng > Rival cam đậm > Remote cam > Tái Chiếu hồng > mình cyan
  const color = g.isNemesis
    ? "#ffd700"
    : g.isRival
      ? "#ff6600"
      : g.isRemote
        ? "#ffaa44"
        : g.isReEcho
          ? "#ff5599"
          : "#00ffcc";

  // Vệt di chuyển — dấu vết vòng lặp
  if (!minimalDraw && g.historyPath && g.historyPath.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(g.historyPath[0].x, g.historyPath[0].y);
    for (let p of g.historyPath) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = g.isNemesis
      ? "rgba(255,215,0,0.3)"
      : "rgba(0,255,204,0.28)";
    ctx.lineWidth = g.radius * 1.6;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  if (!minimalDraw) {
    ctx.shadowBlur = g.isNemesis ? 18 : 10;
    ctx.shadowColor = color;
  }
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
  ctx.fillStyle = g.isNemesis
    ? "#2a2440"
    : g.isRemote
      ? "#3a2410"
      : g.isReEcho
        ? "#401824"
        : "#0a3d38";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Thanh máu nhỏ trên đầu
  if (g.maxHp) {
    const w = g.radius * 2.4;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(g.x - w / 2, g.y - g.radius - 12, w, 4);
    ctx.fillStyle = color;
    ctx.fillRect(
      g.x - w / 2,
      g.y - g.radius - 12,
      w * Math.max(0, Math.min(1, g.hp / g.maxHp)),
      4,
    );
  }

  // Nhãn: Nemesis + ghost người khác phải phân biệt được với "mình-quá-khứ"
  if (g.isNemesis || g.isRemote) {
    ctx.save();
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    const label = g.isNemesis
      ? `👑 ${g.name || "NEMESIS"}`
      : g.isRival
        ? `⚔ ${g.name}`
        : `🌐 ${g.name}`;
    ctx.fillText(label, g.x, g.y - g.radius - 18);
    ctx.restore();
  }
}

// ===== ECHO MODE (Vòng Lặp): Elite "Kẻ Nuốt Vòng Lặp" =====
function drawEchoElite(ctx, g, minimalDraw) {
  ctx.save();
  if (!minimalDraw) {
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#b870ff";
  }
  ctx.globalAlpha = g.isStunned > 0 ? 0.6 : 1.0;
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#241533";
  ctx.fill();
  ctx.strokeStyle = "#b870ff";
  ctx.lineWidth = 3;
  ctx.stroke();
  // Lõi xoáy nhấp nháy
  if (!minimalDraw) {
    ctx.beginPath();
    ctx.arc(
      g.x,
      g.y,
      g.radius * 0.45 + Math.sin(state.frameCount * 0.15) * 2,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "rgba(184,112,255,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // Thanh máu
  if (g.maxHp) {
    const w = g.radius * 2.2;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(g.x - w / 2, g.y - g.radius - 14, w, 5);
    ctx.fillStyle = "#b870ff";
    ctx.fillRect(
      g.x - w / 2,
      g.y - g.radius - 14,
      w * Math.max(0, Math.min(1, g.hp / g.maxHp)),
      5,
    );
  }
}

// ===== GHOSTS =====
export function drawEnemies(ctx) {
  const { ghosts, activeBuffs, player } = state;
  const buffs = activeBuffs || { q: 0, e: 0, r: 0 };
  const char = player?.characterId;
  const minimalDraw = shouldUseMinimalEnemyDraw(state);

  drawEchoGraves(ctx);

  for (let g of ghosts) {
    if (g.x < 0) continue;
    if (!isVisible(g.x, g.y, g.radius || 12)) continue;

    if (g.isMiniBoss) {
      drawMiniBoss(ctx, g, minimalDraw);
      continue;
    }

    if (g.isEchoGhost) {
      drawEchoGhost(ctx, g, minimalDraw);
      continue;
    }

    if (g.isEchoElite) {
      drawEchoElite(ctx, g, minimalDraw);
      continue;
    }

    let isDashing =
      g.historyPath &&
      g.historyPath.length > 2 &&
      dist(
        g.historyPath[g.historyPath.length - 1].x,
        g.historyPath[g.historyPath.length - 1].y,
        g.historyPath[g.historyPath.length - 2].x,
        g.historyPath[g.historyPath.length - 2].y,
      ) >
        8 * g.speedRate;

    // Trail
    if (!minimalDraw && g.historyPath && g.historyPath.length > 0 && g.isStunned <= 0) {
      ctx.beginPath();
      ctx.moveTo(g.historyPath[0].x, g.historyPath[0].y);
      for (let p of g.historyPath) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = isDashing
        ? "rgba(0, 255, 204, 0.5)"
        : "rgba(255, 68, 68, 0.3)";
      ctx.lineWidth = g.radius * 2;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Fire styling
    if (!minimalDraw && g.style === 1) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ff4400";
      if (state.frameCount % 4 === 0 && (state.particles?.length || 0) < 160) {
        state.particles.push({
          x: g.x,
          y: g.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 20,
          color: "#ffaa00",
          size: 2 + Math.random() * 3,
        });
      }
    }

    // Wind styling
    if (!minimalDraw && g.style === 4) {
      ctx.strokeStyle = "rgba(200, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        g.x,
        g.y,
        g.radius + Math.sin(state.frameCount * 0.2) * 3,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }

    // Main body
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);

    if (char === "mage" && buffs.r > 0) {
      ctx.fillStyle = "#00aaff";
    } else {
      ctx.globalAlpha = g.isStunned > 0 ? 0.4 : 1.0;
      ctx.fillStyle = "#ff4444";
    }

    ctx.fill();
    ctx.globalAlpha = 1.0;

    if (!minimalDraw && g.isStunned <= 0) {
      ctx.strokeStyle = isDashing ? "#00ffcc" : "#ff0000";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ===== ELEMENTAL ENEMIES =====
  state.elementalEnemies.forEach((e) => {
    if (!isVisible(e.x, e.y, e.radius || 15)) return;
    ctx.save();

    // 🪨 Đang lặn dưới đất → gò đất mờ + bụi, không vẽ thân (bất khả xâm)
    if (e.burrowed) {
      const r = (e.radius || 14) * 1.1;
      ctx.fillStyle = "rgba(120, 80, 45, 0.5)";
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(60, 40, 20, 0.7)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    if (!minimalDraw) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = state.elementColors[e.element];
    }

    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = state.elementColors[e.element];
    ctx.fill();

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  });
}
