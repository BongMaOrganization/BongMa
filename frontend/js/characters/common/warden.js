import { dist } from "../utils.js";

export const warden = {
    id: "warden",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts } = state;

        // Kỹ năng E: Tăng số lần nảy
        if (buffs.e > 0) {
            state.playerBouncesModifier = (state.playerBouncesModifier || player.bounces) + 2;
        }

        // Kỹ năng R: Aura đẩy lùi quái vật
        if (buffs.r > 0) {
            ghosts.forEach((g) => {
                let d = dist(player.x, player.y, g.x, g.y);
                if (d < 150) {
                    let dx = g.x - player.x,
                        dy = g.y - player.y,
                        force = (150 - d) * 0.05;
                    // Kháng đẩy cho Boss/MiniBoss (tuỳ chọn)
                    if (!g.isMiniBoss && !g.isSubBoss) {
                        g.x += (dx * force) / d;
                        g.y += (dy * force) / d;
                    }
                }
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng R: Vẽ vòng Aura bảo vệ màu vàng
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 150, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ffd700";
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255, 215, 0, 0.05)";
            ctx.fill();
        }
    }
};