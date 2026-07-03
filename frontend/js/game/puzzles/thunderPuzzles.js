import { state } from "../../state.js";
import {
  getPuzzleLayout,
  ringPoints,
  playerNear,
  onPuzzleComplete,
  drawMarker,
  drawLabel,
} from "./puzzleUtils.js";

/** Chuỗi Sét — đi qua các nút dẫn theo thứ tự tia chớp */
export const lightningNodes = {
  id: "lightning_nodes",
  map: "thunder",
  displayName: "⚡ Chuỗi Sét",
  hint: "Ghi nhớ tia sét nối các nút, rồi đi theo đúng thứ tự",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.phase = "show";
    puzzle.showTimer = 220;
    puzzle.solved = false;
    puzzle.step = 0;
    puzzle.nodes = ringPoints(center, radius * 0.72, 5).map((pt, i) => ({
      ...pt,
      id: i,
      visited: false,
    }));
    puzzle.sequence = [0, 2, 4, 1, 3];
    puzzle.center = center;
    puzzle.flashStep = 0;
    puzzle.touchLock = 0;
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;
    if (puzzle.touchLock > 0) {
      puzzle.touchLock--;
      if (puzzle.phase === "play") return;
    }

    if (puzzle.phase === "show") {
      puzzle.showTimer--;
      puzzle.flashStep = Math.floor((220 - puzzle.showTimer) / 44);
      if (puzzle.showTimer <= 0) puzzle.phase = "play";
      return;
    }

    const idx = puzzle.sequence[puzzle.step];
    const node = puzzle.nodes[idx];
    if (!node || node.visited) return;

    if (playerNear(node.x, node.y, 55)) {
      node.visited = true;
      puzzle.step++;
      puzzle.touchLock = 25;
      if (puzzle.step >= puzzle.sequence.length) {
        onPuzzleComplete(puzzle, "Chuỗi Sét", "#ffee55");
      }
      return;
    }

    for (const n of puzzle.nodes) {
      if (n.visited || n.id === idx) continue;
      if (playerNear(n.x, n.y, 55)) {
        puzzle.step = 0;
        puzzle.touchLock = 30;
        puzzle.nodes.forEach((nd) => { nd.visited = false; });
        state.floatingTexts.push({
          x: state.player.x,
          y: state.player.y - 60,
          text: "Sai nút!",
          color: "#ffff44",
          size: 18,
          life: 80,
          opacity: 1,
        });
        break;
      }
    }
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;

    if (puzzle.phase === "show" && puzzle.flashStep > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,100,${0.6 + Math.sin(t * 0.4) * 0.3})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ffff00";
      ctx.beginPath();
      for (let i = 0; i < puzzle.flashStep && i < puzzle.sequence.length; i++) {
        const n = puzzle.nodes[puzzle.sequence[i]];
        if (i === 0) ctx.moveTo(n.x, n.y);
        else ctx.lineTo(n.x, n.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    puzzle.nodes.forEach((n, i) => {
      const lit =
        puzzle.phase === "show" &&
        puzzle.sequence.slice(0, puzzle.flashStep).includes(i);
      const done = n.visited;
      const isNext = puzzle.phase === "play" && puzzle.sequence[puzzle.step] === i;
      const glow = lit || done || isNext;
      drawMarker(ctx, n.x, n.y, glow ? "#ffee44" : "#555522", glow ? 20 : 14, glow);
      drawLabel(ctx, n.x, n.y + 30, `${i + 1}`, glow ? "#ffffaa" : "#888844");
    });
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    if (puzzle.phase === "show") return "Đang hiện chuỗi sét...";
    return `${puzzle.step}/${puzzle.sequence.length}`;
  },

  getMinimapMarkers(puzzle) {
    return puzzle.nodes?.map((n) => ({ x: n.x, y: n.y, color: "#ffee44" })) || [];
  },
};

/** Tụ Điện — đứng trên bệ khi sét đánh xuống */
export const capacitorSurge = {
  id: "capacitor_surge",
  map: "thunder",
  displayName: "🔋 Tụ Điện",
  hint: "Đứng trên bệ tụ điện khi sét đánh — nạp đủ 2 bệ",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.solved = false;
    puzzle.center = center;
    puzzle.phase = "idle";
    puzzle.timer = 100;
    puzzle.strikeTarget = 0;
    puzzle.pads = [
      { x: center.x - radius * 0.45, y: center.y, charge: 0 },
      { x: center.x + radius * 0.45, y: center.y, charge: 0 },
    ];
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;

    puzzle.timer--;

    if (puzzle.phase === "idle" && puzzle.timer <= 0) {
      puzzle.phase = "warn";
      puzzle.timer = 75;
      puzzle.strikeTarget = Math.floor(Math.random() * puzzle.pads.length);
    } else if (puzzle.phase === "warn" && puzzle.timer <= 0) {
      puzzle.phase = "strike";
      puzzle.timer = 15;
      const pad = puzzle.pads[puzzle.strikeTarget];
      if (playerNear(pad.x, pad.y, 65)) {
        pad.charge = Math.min(100, pad.charge + 50);
      }
    } else if (puzzle.phase === "strike" && puzzle.timer <= 0) {
      puzzle.phase = "idle";
      puzzle.timer = 110 + Math.floor(Math.random() * 60);
    }

    if (puzzle.pads.every((p) => p.charge >= 100)) {
      onPuzzleComplete(puzzle, "Tụ Điện", "#ffff66");
    }
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;

    puzzle.pads.forEach((pad, i) => {
      const isTarget = puzzle.phase !== "idle" && i === puzzle.strikeTarget;
      const color = pad.charge >= 100 ? "#aaff44" : isTarget ? "#ffff44" : "#666633";
      drawMarker(ctx, pad.x, pad.y, color, 26, isTarget);

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(pad.x - 30, pad.y + 28, 60, 8);
      ctx.fillStyle = pad.charge >= 100 ? "#88ff44" : "#ffff44";
      ctx.fillRect(pad.x - 30, pad.y + 28, (pad.charge / 100) * 60, 8);
      ctx.restore();

      if (isTarget && puzzle.phase === "warn") {
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,0,${0.5 + Math.sin(t * 0.3) * 0.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pad.x, pad.y - 80);
        ctx.lineTo(pad.x, pad.y - 20);
        ctx.stroke();
        drawLabel(ctx, pad.x, pad.y - 90, "⚡ SÉT!", "#ffff88");
        ctx.restore();
      }
    });
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    if (puzzle.phase === "warn") return "Chuẩn bị đứng bệ!";
    const avg = puzzle.pads.reduce((s, p) => s + p.charge, 0) / puzzle.pads.length;
    return `Nạp ${Math.ceil(avg)}%`;
  },

  getMinimapMarkers(puzzle) {
    return puzzle.pads?.map((p) => ({ x: p.x, y: p.y, color: "#ffee44" })) || [];
  },
};
