import { state } from "../../state.js";
import {
  getPuzzleLayout,
  ringPoints,
  playerNear,
  playerStill,
  onPuzzleComplete,
  drawMarker,
  drawLabel,
} from "./puzzleUtils.js";

/** Đường Băng — bước qua các ô theo thứ tự nhớ được */
export const frostPath = {
  id: "frost_path",
  map: "ice",
  displayName: "❄️ Đường Băng",
  hint: "Ghi nhớ các ô sáng, rồi bước qua theo đúng thứ tự",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.phase = "show";
    puzzle.showTimer = 200;
    puzzle.replayTimer = 0;
    puzzle.step = 0;
    puzzle.solved = false;
    puzzle.tiles = ringPoints(center, radius * 0.65, 5).map((pt, i) => ({
      ...pt,
      id: i,
      active: false,
    }));
    puzzle.sequence = [0, 2, 4, 1, 3];
    puzzle.center = center;
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
      if (puzzle.showTimer <= 0) puzzle.phase = "play";
      return;
    }

    puzzle.replayTimer++;
    if (puzzle.replayTimer > 420 && puzzle.step === 0) {
      puzzle.phase = "show";
      puzzle.showTimer = 120;
      puzzle.replayTimer = 0;
    }

    const idx = puzzle.sequence[puzzle.step];
    const tile = puzzle.tiles[idx];
    if (!tile || tile.active) return;

    if (playerNear(tile.x, tile.y, 52)) {
      tile.active = true;
      puzzle.step++;
      puzzle.replayTimer = 0;
      puzzle.touchLock = 25;
      if (puzzle.step >= puzzle.sequence.length) {
        onPuzzleComplete(puzzle, "Đường Băng", "#88eeff");
      }
      return;
    }

    for (const t of puzzle.tiles) {
      if (t.active || t.id === idx) continue;
      if (playerNear(t.x, t.y, 52)) {
        puzzle.step = 0;
        puzzle.touchLock = 30;
        puzzle.tiles.forEach((tl) => { tl.active = false; });
        puzzle.replayTimer = 0;
        break;
      }
    }
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;
    const litCount =
      puzzle.phase === "show"
        ? Math.ceil((200 - puzzle.showTimer) / 40)
        : 0;

    puzzle.tiles.forEach((tile, i) => {
      const showHint = puzzle.phase === "show" && puzzle.sequence.indexOf(i) < litCount;
      const done = tile.active;
      const isNext = puzzle.phase === "play" && puzzle.sequence[puzzle.step] === i;
      const glow = showHint || done || isNext;
      const color = glow ? "#66ddff" : "#224466";
      drawMarker(ctx, tile.x, tile.y, color, glow ? 20 : 14, glow);

      if (glow) {
        ctx.save();
        ctx.strokeStyle = `rgba(180,240,255,${0.4 + Math.sin(t * 0.15 + i) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(tile.x - 16, tile.y - 16, 32, 32);
        ctx.restore();
      }
    });
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    if (puzzle.phase === "show") return "Đang hiện đường...";
    return `${puzzle.step}/${puzzle.sequence.length}`;
  },

  getMinimapMarkers(puzzle) {
    return puzzle.tiles?.map((t) => ({ x: t.x, y: t.y, color: "#66ccff" })) || [];
  },
};

/** Tượng Băng — đứng yên cạnh từng tượng để khai mở */
export const iceStatues = {
  id: "ice_statues",
  map: "ice",
  displayName: "🗿 Tượng Băng",
  hint: "Đứng yên bên cạnh mỗi tượng băng để khai mở (3 tượng)",

  init(puzzle) {
    const { center, radius } = getPuzzleLayout();
    puzzle.solved = false;
    puzzle.statues = ringPoints(center, radius * 0.7, 3).map((pt, i) => ({
      ...pt,
      id: i,
      charge: 0,
      opened: false,
    }));
    puzzle.activeId = -1;
    puzzle.center = center;
  },

  update(puzzle) {
    if (puzzle.solved || state.isBossLevel) return;

    let nearId = -1;
    for (const s of puzzle.statues) {
      if (playerNear(s.x, s.y, 64)) nearId = s.id;
    }

    if (nearId !== puzzle.activeId) {
      puzzle.statues.forEach((s) => {
        if (!s.opened) s.charge = 0;
      });
      puzzle.activeId = nearId;
    }

    if (nearId >= 0) {
      const st = puzzle.statues[nearId];
      if (!st.opened && playerStill()) {
        st.charge++;
        if (st.charge >= 120) {
          st.opened = true;
          st.charge = 120;
        }
      } else if (!playerStill()) {
        st.charge = Math.max(0, st.charge - 2);
      }
    }

    if (puzzle.statues.every((s) => s.opened)) {
      onPuzzleComplete(puzzle, "Tượng Băng", "#aaeeff");
    }
  },

  draw(puzzle, ctx) {
    if (puzzle.solved) return;
    const t = state.frameCount;

    puzzle.statues.forEach((s) => {
      const pct = s.opened ? 1 : s.charge / 120;
      const color = s.opened ? "#aaffff" : "#4488aa";
      drawMarker(ctx, s.x, s.y, color, 22, !s.opened);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 28, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (!s.opened && s.charge > 0 && playerStill()) {
        drawLabel(ctx, s.x, s.y - 40, "Giữ yên...", "#ccffff");
      }
      if (s.opened) {
        ctx.save();
        ctx.fillStyle = `rgba(170,240,255,${0.3 + Math.sin(t * 0.1) * 0.1})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  },

  getProgress(puzzle) {
    if (puzzle.solved) return "Hoàn thành";
    const done = puzzle.statues.filter((s) => s.opened).length;
    return `${done}/3 tượng`;
  },

  getMinimapMarkers(puzzle) {
    return puzzle.statues?.map((s) => ({ x: s.x, y: s.y, color: "#88ddff" })) || [];
  },
};
