import { dist } from "../../utils.js";

export const tank = {
    id: "tank",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng R: Vẽ vòng khiên bảo vệ siêu to
        if (buffs.r > 0) {
            ctx.beginPath();
            // Vòng khiên thu hẹp dần theo thời gian (15 -> 0)
            ctx.arc(player.x, player.y, 200 + (15 - buffs.r) * 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 204, ${buffs.r / 15})`;
            ctx.lineWidth = 10;
            ctx.stroke();
        }
    }
};