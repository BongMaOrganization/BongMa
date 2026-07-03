import { state } from "../../state.js";
import {
  getPuzzleLayout,
  ringPoints,
  playerNear,
  onPuzzleComplete,
  drawMarker,
  drawLabel,
} from "./puzzleUtils.js";

const SYMBOLS = ["◆", "●", "▲", "■"];

/** Nghi Lễ Địa Chấn — đứng đúng vùng an toàn khi đất rung */
export const seismicRitual = {
  id: "seismic_ritual",
  map: "earth",
  displayName: "🪨 Nghi Lễ Địa Chấn",
  hint: "Khi đất rung, đứng trong vùng sáng an toàn — lặp 4 lần",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.solved = false;
    puzzle.waves = 0;
    puzzle.wavesNeeded = 4;
    puzzle.phase = "idle"; // idle | warn | strike
    puzzle.timer = 120;
    puzzle.safeSpots = ringPoints(center, radius * 0.72, 4);
    puzzle.activeSafe = 0;
    puzzle.center = center;
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;

    puzzle.timer--;

    if (puzzle.phase === "idle" && puzzle.timer <= 0) {
      puzzle.phase = "warn";
      puzzle.timer = 90;
      puzzle.activeSafe = Math.floor(Math.random() * puzzle.safeSpots.length);
    } else if (puzzle.phase === "warn" && puzzle.timer <= 0) {
      puzzle.phase = "strike";
      puzzle.timer = 20;
      const spot = puzzle.safeSpots[puzzle.activeSafe];
      if (playerNear(spot.x, spot.y, 70)) {
        puzzle.waves++;
      } else {
        puzzle.waves = Math.max(0, puzzle.waves - 1);
        state.floatingTexts.push({
          x: state.player.x,
          y: state.player.y - 60,
          text: "Sai vị trí!",
          color: "#cc8844",
          size: 18,
          life: 80,
          opacity: 1,
        });
      }
    } else if (puzzle.phase === "strike" && puzzle.timer <= 0) {
      puzzle.phase = "idle";
      puzzle.timer = 150;
      if (puzzle.waves >= puzzle.wavesNeeded) {
        onPuzzleComplete(puzzle, "Nghi Lễ Địa Chấn", "#ccaa66");
      }
    }
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;

    puzzle.safeSpots.forEach((spot, i) => {
      const isActive = puzzle.phase !== "idle" && i === puzzle.activeSafe;
      const color = isActive
        ? puzzle.phase === "strike"
          ? "#ffdd88"
          : "#88cc66"
        : "#554433";
      drawMarker(ctx, spot.x, spot.y, color, isActive ? 24 : 14, isActive);

      if (isActive && puzzle.phase === "warn") {
        ctx.save();
        ctx.strokeStyle = `rgba(200,255,100,${0.5 + Math.sin(t * 0.25) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(spot.x, spot.y, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

    if (puzzle.phase === "warn") {
      drawLabel(ctx, puzzle.center.x, puzzle.center.y - 20, "CHUẨN BỊ!", "#ffeeaa");
    }
    if (puzzle.phase === "strike") {
      drawLabel(ctx, puzzle.center.x, puzzle.center.y - 20, "RUNG!", "#ff8844");
    }
    drawLabel(ctx, puzzle.center.x, puzzle.center.y + 50, `${puzzle.waves}/${puzzle.wavesNeeded}`, "#ddcc99");
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    if (puzzle.phase === "warn") return "Tìm vùng an toàn!";
    if (puzzle.phase === "strike") return "Đứng yên!";
    return `${puzzle.waves}/${puzzle.wavesNeeded} nhịp`;
  },

  getMinimapMarkers(puzzle) {
    return puzzle.safeSpots?.map((s) => ({ x: s.x, y: s.y, color: "#aa8844" })) || [];
  },
};

/** Trụ Đá Xoay — xoay biểu tượng trụ cho khớp bia trung tâm */
export const stonePillars = {
  id: "stone_pillars",
  map: "earth",
  displayName: "⛰️ Trụ Đá Xoay",
  hint: "Đứng gần trụ đá để xoay biểu tượng cho khớp bia giữa phòng",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.solved = false;
    puzzle.center = center;
    puzzle.target = [1, 3, 2];
    puzzle.pillars = ringPoints(center, radius * 0.75, 3).map((pt, i) => ({
      ...pt,
      id: i,
      symbol: Math.floor(Math.random() * 4),
      hover: 0,
    }));
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;

    for (const p of puzzle.pillars) {
      if (playerNear(p.x, p.y, 70)) {
        p.hover++;
        if (p.hover >= 45) {
          p.symbol = (p.symbol + 1) % 4;
          p.hover = 0;
        }
      } else {
        p.hover = Math.max(0, p.hover - 1);
      }
    }

    const matched = puzzle.pillars.every((p, i) => p.symbol === puzzle.target[i]);
    if (matched) onPuzzleComplete(puzzle, "Trụ Đá Xoay", "#ddbb77");
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;

    drawMarker(ctx, puzzle.center.x, puzzle.center.y, "#aa9955", 26, false);
    drawLabel(ctx, puzzle.center.x, puzzle.center.y - 8, "BIA", "#ffeebb");
    puzzle.target.forEach((sym, i) => {
      const angle = -Math.PI / 2 + (i / 3) * Math.PI * 2;
      drawLabel(
        ctx,
        puzzle.center.x + Math.cos(angle) * 18,
        puzzle.center.y + Math.sin(angle) * 18 + 14,
        SYMBOLS[sym],
        "#ffe8a0",
      );
    });

    puzzle.pillars.forEach((p) => {
      drawMarker(ctx, p.x, p.y, p.symbol === puzzle.target[p.id] ? "#aaff88" : "#887755", 22);
      drawLabel(ctx, p.x, p.y + 4, SYMBOLS[p.symbol], "#fff");
      if (p.hover > 0) {
        const pct = p.hover / 45;
        drawLabel(ctx, p.x, p.y - 36, `Xoay ${Math.floor(pct * 100)}%`, "#ddccaa");
      }
    });
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    const ok = puzzle.pillars.filter((p, i) => p.symbol === puzzle.target[i]).length;
    return `${ok}/3 trụ khớp`;
  },

  getMinimapMarkers(puzzle) {
    return [
      { x: puzzle.center.x, y: puzzle.center.y, color: "#ccaa66" },
      ...(puzzle.pillars?.map((p) => ({ x: p.x, y: p.y, color: "#997744" })) || []),
    ];
  },
};
