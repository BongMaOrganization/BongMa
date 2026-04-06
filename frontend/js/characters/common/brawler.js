import { dist } from "../utils.js";

export const brawler = {
    id: "brawler",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        // Kỹ năng E: Tăng tốc độ chạy lên 1.3
        if (buffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 120 - buffs.q * 8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 100, 50, ${buffs.q / 15})`;
            ctx.lineWidth = 10;
            ctx.stroke();
        }

        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(
                player.x,
                player.y,
                player.radius + 6 + Math.random() * 4,
                0,
                Math.PI * 2,
            );
            ctx.strokeStyle = "rgba(255, 100, 0, 0.7)";
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 300 - buffs.r * 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 0, ${buffs.r / 30})`;
            ctx.lineWidth = 15;
            ctx.stroke();
            ctx.fillStyle = `rgba(255, 100, 0, ${(buffs.r / 30) * 0.1})`;
            ctx.fill();
        }
    }
};