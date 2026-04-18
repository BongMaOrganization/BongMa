import { state } from "../../state.js";
import { drawAlchemistPlayer } from "../../characters/legendary/alchemist.js";
import { drawBerserkerPlayer } from "../../characters/legendary/berserker.js";
import { drawBrawlerPlayer } from "../../characters/common/brawler.js";
import { drawDruidPlayer } from "../../characters/common/druid.js";
import { drawEngineerPlayer } from "../../characters/common/engineer.js";
import { drawGhostPlayer } from "../../characters/common/ghost.js";
import { drawAssassinPlayer } from "../../characters/rare/assassin.js";
import { drawFrostPlayer } from "../../characters/rare/frost.js";
import { drawGunnerPlayer } from "../../characters/rare/gunner.js";
import { drawHunterPlayer } from "../../characters/rare/hunter.js";
import { drawKnightPlayer } from "../../characters/rare/knight.js";
import { drawMagePlayer } from "../../characters/rare/mage.js";
import { drawMedicPlayer } from "../../characters/common/medic.js";
import { drawOraclePlayer } from "../../characters/rare/oracle.js";
import { drawPhoenixPlayer } from "../../characters/mythical/phoenix.js";
import { drawReaperPlayer } from "../../characters/legendary/reaper.js";
import { drawScoutPlayer } from "../../characters/mythical/scout.js";
import { drawSharpshooterPlayer } from "../../characters/legendary/sharpshooter.js";
import { drawSniperPlayer } from "../../characters/legendary/sniper.js";
import { drawSpeedsterPlayer } from "../../characters/common/speedster.js";
import { drawSpiritPlayer } from "../../characters/legendary/spirit.js";
import { drawStormPlayer } from "../../characters/legendary/storm.js";
import { drawSummonerPlayer } from "../../characters/legendary/summoner.js";
import { drawTankPlayer } from "../../characters/rare/tank.js";
import { drawTimekeeperPlayer } from "../../characters/legendary/timekeeper.js";
import { drawVoidPlayer } from "../../characters/legendary/void.js";
import { drawWardenPlayer } from "../../characters/common/warden.js";

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
    const fc = state.frameCount || 0;
    const pulse = (Math.sin(fc * 0.18 + t.x * 0.01) + 1) * 0.5;
    const lifeRatio = t.maxLife ? Math.max(0, t.life / t.maxLife) : 1;
    const deploy = Math.max(0, t.deployPulse || 0) / 26;
    const angle = t.angle || fc * 0.04;

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.globalCompositeOperation = "lighter";

    if (deploy > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 42 * (1 - deploy * 0.35), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 204, ${deploy * 0.7})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 24;
      ctx.shadowColor = "#00ffcc";
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(0, 9, 18, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 80, 95, 0.45)";
    ctx.fill();

    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(0, 255, 204, 0.34)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 22 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI * 2 / 3);
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = "rgba(0, 217, 255, 0.8)";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#00d9ff";
      ctx.fillRect(4, -3, 18, 6);
      ctx.restore();
    }

    ctx.rotate(-angle);
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#063038";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#00d9ff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00ffcc";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 5 + pulse * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = lifeRatio < 0.18 ? "#ff6688" : "#eaffff";
    ctx.shadowBlur = 18;
    ctx.shadowColor = lifeRatio < 0.18 ? "#ff6688" : "#00ffcc";
    ctx.fill();

    ctx.strokeStyle = `rgba(157, 255, 106, ${0.25 + lifeRatio * 0.35})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, -24);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -27, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#9dff6a";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#9dff6a";
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
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
    (buffs.q > 0 && (char === "warden" || char === "frost" || char === "spirit"));

  if (char === "speedster") {
    drawSpeedsterPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "ghost") {
    drawGhostPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "warden") {
    drawWardenPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "engineer") {
    drawEngineerPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "druid") {
    drawDruidPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "brawler") {
    drawBrawlerPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "assassin") {
    drawAssassinPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "hunter") {
    drawHunterPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "frost") {
    drawFrostPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "gunner") {
    drawGunnerPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "knight") {
    drawKnightPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "mage") {
    drawMagePlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "oracle") {
    drawOraclePlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "medic") {
    drawMedicPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "tank") {
    drawTankPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "sharpshooter") {
    drawSharpshooterPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "alchemist") {
    drawAlchemistPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "berserker") {
    drawBerserkerPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "summoner") {
    drawSummonerPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "sniper") {
    drawSniperPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "spirit") {
    drawSpiritPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "timekeeper") {
    drawTimekeeperPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "void") {
    drawVoidPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "storm") {
    drawStormPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "reaper") {
    drawReaperPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "phoenix") {
    drawPhoenixPlayer(ctx, state, buffs, isInvulnSkill);
    return;
  }

  if (char === "scout") {
    drawScoutPlayer(ctx, state, buffs, isInvulnSkill);
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
