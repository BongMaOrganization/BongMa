import { state } from "../../state.js";
import {
  getPuzzleLayout,
  ringPoints,
  playerNear,
  onPuzzleComplete,
  drawMarker,
  drawLabel,
} from "./puzzleUtils.js";

/** Chuỗi Than Hồng — đi qua 4 đống lửa theo thứ tự nhớ được */
export const emberSequence = {
  id: "ember_sequence",
  map: "fire",
  displayName: "🔥 Chuỗi Than Hồng",
  hint: "Ghi nhớ thứ tự đống lửa sáng lên, rồi chạm theo đúng thứ tự",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.phase = "show"; // show | play
    puzzle.showTimer = 180;
    puzzle.sequence = [1, 3, 0, 2];
    puzzle.step = 0;
    puzzle.solved = false;
    puzzle.braziers = ringPoints(center, radius * 0.85, 4).map((pt, i) => ({
      ...pt,
      id: i,
      lit: false,
    }));
    puzzle.center = center;
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;

    if (puzzle.phase === "show") {
      puzzle.showTimer--;
      if (puzzle.showTimer <= 0) {
        puzzle.phase = "play";
        puzzle.braziers.forEach((b) => { b.lit = false; });
      }
      return;
    }

    const targetIdx = puzzle.sequence[puzzle.step];
    const target = puzzle.braziers[targetIdx];
    if (!target || target.lit) return;

    if (playerNear(target.x, target.y, 58)) {
      target.lit = true;
      puzzle.step++;
      if (puzzle.step >= puzzle.sequence.length) {
        onPuzzleComplete(puzzle, "Chuỗi Than Hồng", "#ff8844");
      }
    }

    for (let i = 0; i < puzzle.braziers.length; i++) {
      const b = puzzle.braziers[i];
      if (b.lit || i === targetIdx) continue;
      if (playerNear(b.x, b.y, 58)) {
        puzzle.step = 0;
        puzzle.braziers.forEach((br) => { br.lit = false; });
        state.floatingTexts.push({
          x: state.player.x,
          y: state.player.y - 60,
          text: "Sai thứ tự! Thử lại",
          color: "#ff4444",
          size: 18,
          life: 90,
          opacity: 1,
        });
        break;
      }
    }
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;

    puzzle.braziers.forEach((b, i) => {
      const showing =
        puzzle.phase === "show" &&
        puzzle.sequence.slice(0, Math.ceil((180 - puzzle.showTimer) / 45)).includes(i);
      const active = b.lit || showing;
      const color = active ? "#ff6622" : "#662211";
      drawMarker(ctx, b.x, b.y, color, active ? 22 : 16, active);

      if (active) {
        ctx.save();
        ctx.fillStyle = `rgba(255,120,30,${0.35 + Math.sin(t * 0.2 + i) * 0.15})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y - 18, 10 + Math.sin(t * 0.3) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      drawLabel(ctx, b.x, b.y + 34, `${i + 1}`, active ? "#ffd0a0" : "#886655");
    });

    if (puzzle.phase === "show") {
      drawLabel(ctx, puzzle.center.x, puzzle.center.y - 30, "GHI NHỚ THỨ TỰ...", "#ffcc88");
    }
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    if (puzzle.phase === "show") return "Đang hiện gợi ý...";
    return `${puzzle.step}/${puzzle.sequence.length}`;
  },

  getMinimapMarkers(puzzle) {
    return puzzle.braziers?.map((b) => ({ x: b.x, y: b.y, color: "#ff6622" })) || [];
  },
};

/** Van Dung Nham — giữ gần 3 van để xả áp lửa */
export const lavaValve = {
  id: "lava_valve",
  map: "fire",
  displayName: "🌋 Van Dung Nham",
  hint: "Đứng gần cả 3 van cho đến khi chúng xả hết áp lửa",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.solved = false;
    puzzle.valves = ringPoints(center, radius * 0.75, 3).map((pt, i) => ({
      ...pt,
      id: i,
      pressure: 100,
    }));
    puzzle.pools = ringPoints(center, radius * 0.45, 3).map((pt) => ({
      ...pt,
      rx: 70,
      ry: 50,
    }));
    puzzle.center = center;
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;

    let allEmpty = true;
    for (const v of puzzle.valves) {
      if (playerNear(v.x, v.y, 72)) {
        v.pressure = Math.max(0, v.pressure - 1.2);
      } else {
        v.pressure = Math.min(100, v.pressure + 0.15);
      }
      if (v.pressure > 5) allEmpty = false;
    }

    puzzle.pools.forEach((pool, i) => {
      const p = puzzle.valves[i]?.pressure ?? 100;
      pool.rx = 30 + (p / 100) * 55;
      pool.ry = 22 + (p / 100) * 40;
    });

    if (allEmpty) onPuzzleComplete(puzzle, "Van Dung Nham", "#ff5522");
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;

    puzzle.pools.forEach((pool) => {
      ctx.save();
      ctx.fillStyle = `rgba(255,60,0,${0.25 + Math.sin(t * 0.08) * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(pool.x, pool.y, pool.rx, pool.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    puzzle.valves.forEach((v) => {
      const color = v.pressure < 20 ? "#88ffaa" : "#ff7733";
      drawMarker(ctx, v.x, v.y, color, 20);
      drawLabel(ctx, v.x, v.y + 30, `${Math.ceil(v.pressure)}%`, "#ffcc99");
    });
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    const avg = puzzle.valves.reduce((s, v) => s + v.pressure, 0) / puzzle.valves.length;
    return `Áp lực ${Math.ceil(avg)}%`;
  },

  getMinimapMarkers(puzzle) {
    return puzzle.valves?.map((v) => ({ x: v.x, y: v.y, color: "#ff4400" })) || [];
  },
};
