import { state } from "../../state.js";
import { getPuzzleMinimapMarkers } from "../puzzle_manager.js";
import { drawDungeonMinimap } from "../../world/dungeonLayout.js";

export function drawMinimap(ctx, canvas) {
  const mmSize = 220;
  const padding = 20;
  const mmX = canvas.width - mmSize - padding;
  const mmY = padding + 60;

  const tower = state.gameMode === "tower" && state.tower;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 2;
  ctx.fillRect(mmX, mmY, mmSize, mmSize);
  ctx.strokeRect(mmX, mmY, mmSize, mmSize);

  if (!tower) drawDungeonMinimap(ctx, mmX, mmY, mmSize);

  const scaleX = mmSize / state.world.width;
  const scaleY = mmSize / state.world.height;

  const drawDot = (obj, color, size) => {
    if (!obj || (obj.hp <= 0 && obj !== state.player)) return;
    const x = mmX + obj.x * scaleX;
    const y = mmY + obj.y * scaleY;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  };

  // 1. Enemies (echo: Bóng Ma tô màu riêng để phân biệt trên minimap)
  state.ghosts.forEach((g) => {
    let color = "#ff4444";
    if (g.isEchoGhost) {
      color = g.isNemesis
        ? "#ffd700"
        : g.isRival
          ? "#ff6600"
          : g.isRemote
            ? "#ffaa44"
            : g.isReEcho
              ? "#ff5599"
              : "#00ffcc";
    }
    drawDot(g, color, g.isNemesis ? 3 : 2);
  });

  // 1.5. Echo graves (mộ bia — chấm vàng)
  if (state.gameMode === "echo" && state.echoGraves) {
    state.echoGraves.forEach((gr) => {
      const x = mmX + gr.x * scaleX;
      const y = mmY + gr.y * scaleY;
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 1.7. Tower mode (Công Thành): công trình + lính đồng minh
  if (state.gameMode === "tower" && state.tower) {
    state.tower.structures.forEach((s) => {
      const x = mmX + s.x * scaleX;
      const y = mmY + s.y * scaleY;
      const color = !s.alive
        ? "#555"
        : s.team === "ally"
          ? "#00ffcc"
          : "#ff4455";
      const size = s.kind === "nexus" ? 5 : 3.5;
      ctx.fillStyle = color;
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
      if (s.kind === "nexus" && s.alive) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - size - 2, y - size - 2, (size + 2) * 2, (size + 2) * 2);
      }
    });
    state.tower.allyMinions.forEach((m) => {
      ctx.fillStyle = "#00ffcc";
      ctx.beginPath();
      ctx.arc(mmX + m.x * scaleX, mmY + m.y * scaleY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    // Đồng minh AI (hero) — chấm to hơn, màu theo độ hiếm
    state.tower.allyHeroes.forEach((h) => {
      if (h.respawnTimer > 0) return;
      ctx.fillStyle = h.color;
      ctx.beginPath();
      ctx.arc(mmX + h.x * scaleX, mmY + h.y * scaleY, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 2. Boss
  if (state.boss && state.boss.hp > 0) {
    drawDot(state.boss, state.boss.color || "#ff00ff", 4);
    ctx.strokeStyle = state.boss.color || "#ff00ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      mmX + state.boss.x * scaleX,
      mmY + state.boss.y * scaleY,
      7,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  // 3. Player
  if (state.player && state.player.hp > 0) {
    drawDot(state.player, "#00ffcc", 3);
  }

  // 3.5. Swarm zones
  if (!state.isBossLevel && !state.bossArenaMode && !tower)
    state.swarmZones.forEach((sz) => {
      if (sz.isCompleted) return;
      const color = state.frameCount % 40 < 20 ? "#ffaa00" : "#aa5500";
      const x = mmX + sz.x * scaleX;
      const y = mmY + sz.y * scaleY;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
    });

  // 4. Camera frame
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mmX + state.camera.x * scaleX,
    mmY + state.camera.y * scaleY,
    state.camera.width * scaleX,
    state.camera.height * scaleY,
  );

  // 5. Crates
  if (!state.isBossLevel && !state.bossArenaMode && !tower && state.crates) {
    state.crates.forEach((c) => {
      const x = mmX + c.x * scaleX;
      const y = mmY + c.y * scaleY;
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 6. Capture points
  if (!state.isBossLevel && !state.bossArenaMode && !tower && state.capturePoints) {
    state.capturePoints.forEach((cp) => {
      if (cp.state === "completed") return;
      const x = mmX + cp.x * scaleX;
      const y = mmY + cp.y * scaleY;
      const size = 6;

      ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
      ctx.beginPath();
      ctx.arc(x, y, size + 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (cp.state === "guarding") {
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 8px Arial";
        ctx.textAlign = "center";
        ctx.fillText("B", x, y + 3);
      }
    });
  }

  // 7. Puzzle markers
  if (!state.isBossLevel && !state.bossArenaMode && !tower) {
    const markers = getPuzzleMinimapMarkers();
    markers.forEach((m) => {
      const mx = mmX + m.x * scaleX;
      const my = mmY + m.y * scaleY;
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fillStyle = m.color || "#cc44ff";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // 8. Stage portal
  if (!state.isBossLevel && state.stagePortal?.active) {
    const x = mmX + state.stagePortal.x * scaleX;
    const y = mmY + state.stagePortal.y * scaleY;
    const blink = Math.sin(state.frameCount * 0.15) > 0;
    if (blink) {
      ctx.fillStyle = "#cc00ff";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚡", x, y + 3);
    }
  }
}
