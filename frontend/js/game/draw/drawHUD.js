import { state } from "../../state.js";
import {
  getMapObjectiveLabel,
  isMapObjectiveDone,
} from "../mapMechanics.js";

// ===== GLITCH EFFECTS (matrix mode, decoys, overload) =====
export function drawGlitchEffects(ctx, canvas) {
  if (state.glitch.matrixMode) {
    for (let i = 0; i < 40; i++) {
      let x = Math.random() * canvas.width;
      let y = Math.random() * canvas.height;
      ctx.fillStyle = `rgba(0,255,0,${Math.random() * 0.15})`;
      ctx.fillRect(x, y, 2, 10);
    }
  }

  if (state.glitch.decoys) {
    state.glitch.decoys.forEach((d) => {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#fff";
      ctx.fillRect(d.x - 20, d.y - 20, 40, 40);
    });
    ctx.globalAlpha = 1;
  }

  if (state.glitch.matrixMode && Math.random() < 0.3) {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (state.glitch.fakeUI) {
    ctx.fillStyle = "red";
    ctx.font = "30px monospace";
    ctx.fillText("ERROR: INPUT CORRUPTED", 200, 300);
  }
}

// ===== PHASE TRANSITION =====
export function drawPhaseTransition(ctx, canvas) {
  if (!state.phaseTransitionTimer || state.phaseTransitionTimer <= 0) return;

  let alpha = Math.sin(state.frameCount * 0.2) * 0.1 + 0.1;
  ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.font = "bold 60px sans-serif";
  ctx.fillStyle = "#ff4444";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 10;
  ctx.fillText(state.currentPhaseName, canvas.width / 2, canvas.height / 2);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeText(state.currentPhaseName, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

// ===== NUKE FLASH =====
export function drawNukeFlash(ctx, canvas) {
  if (!state.nukeFlash || state.nukeFlash <= 0) return;
  ctx.fillStyle = `rgba(255, 255, 255, ${state.nukeFlash / 20})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  state.nukeFlash--;
}

// ===== MAIN HUD =====
export function drawHUD(ctx, canvas) {
  const boss = state.boss;
  const s = state.bossSpecial;

  // Boss special skill warning
  if (s && s.timer > 0) {
    const centerX = canvas.width / 2;
    const centerY = 140;
    const pulse = Math.sin(state.frameCount * 0.2) * 0.5 + 0.5;

    if (s.type === "ULTIMATE") {
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(255, 50, 50, ${0.7 + pulse * 0.3})`;
      ctx.fillText("!!! TẤT SÁT !!!", centerX, centerY - 60);
    } else {
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffcc00";
      ctx.fillText("ĐANG GỒNG CHIÊU", centerX, centerY - 60);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px Arial";
    ctx.fillText(s.name.toUpperCase(), centerX, centerY - 15);

    const barWidth = 360;
    const progress = s.timer / s.duration;
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(centerX - barWidth / 2, centerY + 10, barWidth, 6);
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(centerX - barWidth / 2, centerY + 10, barWidth * progress, 6);
  }

  // Boss shield bar
  if (boss && boss.shieldActive && boss.shield > 0) {
    const barWidth = 300;
    const progress = Math.max(0, boss.shield / boss.maxShield);
    const centerX = canvas.width / 2;
    const centerY = 45;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(centerX - barWidth / 2, centerY, barWidth, 14);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(centerX - barWidth / 2, centerY, barWidth * progress, 14);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - barWidth / 2, centerY, barWidth, 14);

    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "white";
    ctx.fillText("SHIELD / STANCE", centerX, centerY + 11);
  }

  // Swarm Zone HUD
  if (!state.isBossLevel && state.swarmZones && state.swarmZones.length > 0) {
    const activeZone = state.swarmZones.find(
      (sz) => sz.active && !sz.isCompleted,
    );

    if (activeZone) {
      const hudX = canvas.width / 2;
      const hudY = canvas.height - 150;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(hudX - 150, hudY, 300, 40);
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 2;
      ctx.strokeRect(hudX - 150, hudY, 300, 40);

      const progress = activeZone.currentKills / activeZone.requiredKills;
      ctx.fillStyle = "#ffaa00";
      ctx.fillRect(hudX - 145, hudY + 5, 290 * progress, 30);

      ctx.fillStyle = "white";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        `⚔️ TIÊU DIỆT: ${activeZone.currentKills}/${activeZone.requiredKills}`,
        hudX,
        hudY + 26,
      );
    }
  }
}

// ===== STAGE CONDITIONS HUD =====
export function drawStageConditionsHUD(ctx, canvas) {
  const pz = state.currentPuzzle;
  const type = state.currentPuzzleType;

  const cp = state.capturePoints || [];
  const sz = state.swarmZones || [];

  const puzzleDone = pz?.solved === true;
  const swarmCount = sz.filter((z) => z.isCompleted).length;
  const swarmTotal = sz.length;
  const specialCount = cp.filter((c) => c.state === "completed").length;

  const allDone =
    puzzleDone &&
    swarmCount >= swarmTotal &&
    swarmTotal > 0 &&
    specialCount >= 2;

  if (allDone && state.stagePortal?.active) return;

  ctx.save();

  const lines = [];

  const nameMap = {
    domino: "⚡ Domino",
    melody: "🎵 Melody",
    torch: "🔥 Torch",
    rune: "🔮 Rune",
  };
  const pzName = nameMap[type] || "🧩 Puzzle";

  if (pz && type) {
    if (puzzleDone) {
      lines.push({ text: `${pzName}: Hoàn thành ✔️`, color: "#00ffcc" });
    } else {
      if (type === "rune") {
        const activatedCount = pz.runes
          ? pz.runes.filter((r) => r.activated).length
          : 0;
        const totalCount = pz.runes ? pz.runes.length : 4;

        if (!pz.clueRevealed) {
          lines.push({
            text: `${pzName}: Tìm Bia Đá (Obelisk)`,
            color: "#ffaa00",
          });
        } else {
          lines.push({
            text: `${pzName}: ${activatedCount}/${totalCount}`,
            color: "#fff",
          });

          const RECIPES = {
            steam: "Fire + Ice",
            plasma: "Fire + Lightning",
            blaze: "Fire + Wind",
            magma: "Fire + Earth",
            frostbite: "Ice + Lightning",
            blizzard: "Ice + Wind",
            glacier: "Ice + Earth",
            storm: "Lightning + Wind",
            magnet: "Lightning + Earth",
            sandstorm: "Wind + Earth",
          };

          if (pz.runes) {
            pz.runes.forEach((r) => {
              const formula = RECIPES[r.element] || "? + ?";
              const elName =
                r.element.charAt(0).toUpperCase() + r.element.slice(1);

              const isDone = r.activated;
              const status = isDone ? "1/1 ✔️" : "0/1";
              const color = isDone ? "#00ffcc" : "#aaaaaa";

              lines.push({
                text: `  ↳ ${elName} = ${formula} (${status})`,
                color: color,
              });
            });
          }
        }
      } else {
        let puzzleLabel = "...";
        switch (type) {
          case "domino":
            puzzleLabel = `${pz.currentIndex || 0}/${pz.tiles?.length || 0}`;
            break;
          case "melody":
            puzzleLabel = `${pz.input?.length || 0}/${pz.sequence?.length || 0}`;
            break;
          case "torch":
            const lit = pz.torches?.filter((t) => t.lit).length || 0;
            puzzleLabel = `${lit}/${pz.torches?.length || 0}`;
            break;
        }
        lines.push({ text: `${pzName}: ${puzzleLabel}`, color: "#fff" });
      }
    }
  }

  const swarmColor = swarmCount >= swarmTotal ? "#00ffcc" : "#fff";
  lines.push({
    text: `💀 Swarm Zone: ${swarmCount}/${swarmTotal}`,
    color: swarmColor,
  });

  const specialColor = specialCount >= 2 ? "#00ffcc" : "#fff";
  lines.push({ text: `🚩 Cứ điểm: ${specialCount}/2`, color: specialColor });

  // Điều kiện đặc thù của map (sống sót N đợt sự kiện)
  const mapLabel = getMapObjectiveLabel();
  if (mapLabel) {
    lines.push({
      text: mapLabel,
      color: isMapObjectiveDone() ? "#00ffcc" : "#ff9955",
    });
  }

  const lineHeight = 20;
  const padding = 15;
  const panelW = 270;
  const panelH = padding * 2 + (lines.length - 1) * lineHeight;

  const panelX = canvas.width - panelW - 10;
  const panelY = 310;

  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  else ctx.rect(panelX, panelY, panelW, panelH);
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";

  let currentY = panelY + padding + 10;
  lines.forEach((line) => {
    ctx.fillStyle = line.color;
    if (line.color === "#00ffcc") {
      ctx.shadowBlur = 5;
      ctx.shadowColor = "#00ffcc";
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillText(line.text, panelX + 15, currentY);
    currentY += lineHeight;
  });

  ctx.restore();
}
