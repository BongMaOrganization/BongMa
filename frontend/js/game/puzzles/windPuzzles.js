import { state } from "../../state.js";
import {
  getPuzzleLayout,
  ringPoints,
  playerNear,
  onPuzzleComplete,
  drawMarker,
  drawLabel,
} from "./puzzleUtils.js";

/** Trụ Gió — lướt vào trụ để xoay hướng gió về tâm */
export const windTotems = {
  id: "wind_totems",
  map: "wind",
  displayName: "🌪️ Trụ Gió",
  hint: "Lướt (Space) vào trụ gió để xoay — cho tất cả hướng về tâm phòng",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.solved = false;
    puzzle.center = center;
    puzzle.totems = ringPoints(center, radius * 0.78, 4).map((pt, i) => ({
      ...pt,
      id: i,
      dir: Math.floor(Math.random() * 4),
      targetDir: (i + 2) % 4,
    }));
    puzzle.dashCooldown = 0;
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;
    const p = state.player;
    if (!p) return;

    if (puzzle.dashCooldown > 0) puzzle.dashCooldown--;

    if (p.dashTimeLeft === 12 && puzzle.dashCooldown <= 0) {
      for (const totem of puzzle.totems) {
        if (playerNear(totem.x, totem.y, 55)) {
          totem.dir = (totem.dir + 1) % 4;
          puzzle.dashCooldown = 30;
          break;
        }
      }
    }

    const aligned = puzzle.totems.every((t) => t.dir === t.targetDir);
    if (aligned) onPuzzleComplete(puzzle, "Trụ Gió", "#66ffcc");
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;

    puzzle.totems.forEach((totem) => {
      const ok = totem.dir === totem.targetDir;
      drawMarker(ctx, totem.x, totem.y, ok ? "#66ffcc" : "#338877", 20, !ok);

      ctx.save();
      ctx.translate(totem.x, totem.y);
      ctx.rotate((totem.dir * Math.PI) / 2);
      ctx.strokeStyle = ok ? "#ccffee" : "#88ddcc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, -22);
      ctx.lineTo(-8, -10);
      ctx.moveTo(0, -22);
      ctx.lineTo(8, -10);
      ctx.stroke();
      ctx.restore();

      if (!ok) {
        ctx.save();
        ctx.globalAlpha = 0.2 + Math.sin(t * 0.12 + totem.id) * 0.1;
        ctx.strokeStyle = "#88ffdd";
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(totem.x, totem.y);
        ctx.lineTo(puzzle.center.x, puzzle.center.y);
        ctx.stroke();
        ctx.restore();
      }
    });

    drawLabel(ctx, puzzle.center.x, puzzle.center.y, "TÂM", "#aaffee");
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    const ok = puzzle.totems.filter((t) => t.dir === t.targetDir).length;
    return `${ok}/4 trụ đúng hướng`;
  },

  getMinimapMarkers(puzzle) {
    return puzzle.totems?.map((t) => ({ x: t.x, y: t.y, color: "#55ddbb" })) || [];
  },
};

/** Quả Cầu Lốc — chạm quả cầu khi nó sáng (xoay vòng) */
export const cycloneOrbs = {
  id: "cyclone_orbs",
  map: "wind",
  displayName: "💨 Quả Cầu Lốc",
  hint: "Chạm 3 quả cầu khi chúng sáng — mỗi quả chỉ có thời gian ngắn",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.solved = false;
    puzzle.center = center;
    puzzle.collected = 0;
    puzzle.needed = 3;
    puzzle.orbs = [
      { angle: 0, speed: 0.035, radius: radius * 0.55, active: true, got: false },
      { angle: 2.1, speed: 0.048, radius: radius * 0.68, active: false, got: false },
      { angle: 4.5, speed: 0.04, radius: radius * 0.62, active: false, got: false },
    ];
    puzzle.activeIndex = 0;
    puzzle.windowTimer = 150;
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;

    puzzle.orbs.forEach((orb) => {
      orb.angle += orb.speed;
    });

    const orb = puzzle.orbs[puzzle.activeIndex];
    if (!orb || orb.got) return;

    orb.active = true;
    puzzle.windowTimer--;

    const x = puzzle.center.x + Math.cos(orb.angle) * orb.radius;
    const y = puzzle.center.y + Math.sin(orb.angle) * orb.radius;

    if (playerNear(x, y, 50)) {
      orb.got = true;
      orb.active = false;
      puzzle.collected++;
      puzzle.activeIndex = (puzzle.activeIndex + 1) % puzzle.orbs.length;
      puzzle.windowTimer = 150;

      if (puzzle.collected >= puzzle.needed) {
        onPuzzleComplete(puzzle, "Quả Cầu Lốc", "#88ffee");
      }
      return;
    }

    if (puzzle.windowTimer <= 0) {
      puzzle.activeIndex = (puzzle.activeIndex + 1) % puzzle.orbs.length;
      puzzle.windowTimer = 150;
    }
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;

    puzzle.orbs.forEach((orb, i) => {
      const x = puzzle.center.x + Math.cos(orb.angle) * orb.radius;
      const y = puzzle.center.y + Math.sin(orb.angle) * orb.radius;
      const isActive = i === puzzle.activeIndex && !orb.got;
      const color = orb.got ? "#335544" : isActive ? "#66ffdd" : "#226655";
      drawMarker(ctx, x, y, color, isActive ? 22 : 14, isActive);

      if (isActive) {
        ctx.save();
        ctx.strokeStyle = `rgba(120,255,220,${0.4 + Math.sin(t * 0.2) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

    drawLabel(
      ctx,
      puzzle.center.x,
      puzzle.center.y + 60,
      `${puzzle.collected}/${puzzle.needed}`,
      "#aaeedd",
    );
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    return `${puzzle.collected}/${puzzle.needed} cầu`;
  },

  getMinimapMarkers(puzzle) {
    if (!puzzle.center) return [];
    return puzzle.orbs.map((orb) => ({
      x: puzzle.center.x + Math.cos(orb.angle) * orb.radius,
      y: puzzle.center.y + Math.sin(orb.angle) * orb.radius,
      color: orb.got ? "#335544" : "#66ffdd",
    }));
  },
};
