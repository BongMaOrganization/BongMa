import { dist } from "../utils.js";

export const phoenix = {
    id: "phoenix",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Kỹ năng Q: Để lại vệt lửa khi di chuyển
        if (buffs.q > 0) {
            if (!state.phoenixTrails) state.phoenixTrails = [];
            state.phoenixTrails.push({
                x: player.x,
                y: player.y,
                life: 60,
            });
        }

        // Cập nhật và tính sát thương từ vệt lửa
        if (state.phoenixTrails) {
            for (let i = state.phoenixTrails.length - 1; i >= 0; i--) {
                let t = state.phoenixTrails[i];
                t.life--;

                ghosts.forEach((g) => {
                    if (dist(t.x, t.y, g.x, g.y) < 20) {
                        g.hp -= 0.2;
                        g.isStunned = Math.max(g.isStunned, 10);
                    }
                });

                if (boss && dist(t.x, t.y, boss.x, boss.y) < boss.radius) {
                    boss.hp -= 0.05;
                }

                if (t.life <= 0) state.phoenixTrails.splice(i, 1);
            }
        }

        // Logic hiệu ứng hồi sinh/nổ (VFX)
        if (state.phoenixReviveFx > 0) state.phoenixReviveFx--;
        if (state.phoenixEfx) {
            state.phoenixEfx.life--;
            if (state.phoenixEfx.life <= 0) state.phoenixEfx = null;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ các vệt lửa sau lưng
        if (state.phoenixTrails) {
            state.phoenixTrails.forEach((t) => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 120, 0, 0.5)";
                ctx.fill();
            });
        }

        // Vẽ vòng tròn hồi sinh/tỏa năng lượng
        if (state.phoenixReviveFx > 0) {
            let progress = state.phoenixReviveFx / 20;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 150 * (1 - progress), 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 120, 0, 0.9)";
            ctx.lineWidth = 5;
            ctx.stroke();

            ctx.fillStyle = "rgba(255, 150, 0, 0.15)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Vẽ hiệu ứng đặc biệt E/R
        if (state.phoenixEfx && state.phoenixEfx.life > 0) {
            let t = state.phoenixEfx.life / 10;
            ctx.beginPath();
            ctx.arc(state.phoenixEfx.x, state.phoenixEfx.y, 120 * (1 - t), 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 120, 0, 0.9)";
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Vòng aura lửa quanh Phoenix khi bật R
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 200, 0, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
};