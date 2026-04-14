import { state } from "../../state.js";
import { drawSpeedsterPlayer } from "../../characters/common/speedster.js";

// ===== SKILL RANGE INDICATORS =====
export function drawSkillIndicators(ctx) {
  if (!state.skillRangeIndicators) return;
  for (let i = state.skillRangeIndicators.length - 1; i >= 0; i--) {
    const ind = state.skillRangeIndicators[i];
    const alpha = ind.life / ind.maxLife;
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      ind.x,
      ind.y,
      ind.radius * (1 + (1 - alpha) * 0.15),
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = ind.color || "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.8;
    ctx.setLineDash([12, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(ind.x, ind.y, ind.radius, 0, Math.PI * 2);
    ctx.fillStyle = ind.color || "rgba(255,255,255,0.8)";
    ctx.globalAlpha = alpha * 0.06;
    ctx.fill();
    ctx.restore();
    ind.life--;
    if (ind.life <= 0) state.skillRangeIndicators.splice(i, 1);
  }
}

// ===== ENGINEER TURRETS =====
export function drawEngineerTurrets(ctx) {
  if (!state.engineerTurrets) return;
  state.engineerTurrets.forEach((t) => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#00ccff";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00ccff";
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

// ===== PLAYER =====
export function drawPlayer(ctx) {
  const { player, activeBuffs } = state;
  const buffs = activeBuffs || { q: 0, e: 0, r: 0 };
  const char = player?.characterId;
  if (!player) return;

  let isInvulnSkill =
    (buffs.e > 0 &&
      (char === "tank" || char === "ghost" || char === "reaper")) ||
    (buffs.q > 0 && (char === "warden" || char === "frost"));

  if (char === "speedster") {
    drawSpeedsterPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (player.dashTimeLeft > 0 || isInvulnSkill) {
    ctx.beginPath();
    ctx.arc(
      player.x,
      player.y,
      player.radius + (isInvulnSkill ? 5 : 2),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = char === "ghost" ? "rgba(100,100,255,0.5)" : "white";

    if (char === "reaper" && buffs.e > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.shadowBlur = 20;
    ctx.shadowColor = "white";
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (player.gracePeriod > 0) {
    if (Math.floor(state.frameCount / 6) % 2 === 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    if (player.characterId === "elementalist") {
      ctx.fillStyle = state.elementColors[state.element];
    } else {
      ctx.fillStyle = player.color;
    }
    ctx.shadowBlur = 15;
    if (player.characterId === "elementalist") {
      ctx.shadowColor = state.elementColors[state.element];
    } else {
      ctx.shadowColor = player.color;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Elementalist ring
    if (player.characterId === "elementalist") {
      let color = state.elementColors[state.element];

      ctx.beginPath();
      ctx.arc(
        player.x,
        player.y,
        player.radius + 6 + Math.sin(state.frameCount * 0.2) * 3,
        0,
        Math.PI * 2,
      );

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Shield ring
    if (player.shield > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Status debuff overlays
    const s = state.playerStatus;
    if (s.slowTimer > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (s.stunTimer > 0) {
      ctx.fillStyle = "#ffff00";
      for (let i = 0; i < 3; i++) {
        const a = state.frameCount * 0.2 + i * 2;
        ctx.beginPath();
        ctx.arc(
          player.x + Math.cos(a) * 20,
          player.y + Math.sin(a) * 20,
          3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
}
