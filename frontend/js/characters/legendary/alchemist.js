import { dist } from "../utils.js";

export const alchemist = {
    id: "alchemist",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, bullets } = state;

        // Kỹ năng R: Vòng tròn chuyển hóa đạn (Reflect)
        if (buffs.r > 0) {
            bullets.forEach((b) => {
                if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 250) {
                    b.isPlayer = true;
                    b.vx *= -1;
                    b.vy *= -1;
                }
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng R: Vẽ vòng tròn giả kim
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 250, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 128, 0.4)";
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "rgba(0, 255, 128, 0.05)";
            ctx.fill();
        }
    }
};