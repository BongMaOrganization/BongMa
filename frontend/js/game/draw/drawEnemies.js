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

// ===== GHOSTS =====
export function drawEnemies(ctx) {
  const { ghosts, activeBuffs, player } = state;
  const buffs = activeBuffs || { q: 0, e: 0, r: 0 };
  const char = player?.characterId;
  const minimalDraw = shouldUseMinimalEnemyDraw(state);

  for (let g of ghosts) {
    if (g.x < 0) continue;
    if (!isVisible(g.x, g.y, g.radius || 12)) continue;

    if (g.isMiniBoss) {
      drawMiniBoss(ctx, g, minimalDraw);
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
