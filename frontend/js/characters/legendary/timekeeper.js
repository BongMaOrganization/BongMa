import { dist } from "../utils.js";

export const timekeeper = {
    id: "timekeeper",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player } = state;

        // Kỹ năng E: Ngưng đọng thời gian (Làm chậm quái vật/đạn)
        if (buffs.e > 0) {
            state.timeFrozenModifier = true;
        }

        // Kỹ năng R: Gia tốc thời gian (Bắn cực nhanh)
        if (buffs.r > 0) {
            // Ép cooldown súng về mức tối thiểu (1 frame)
            player.cooldown = Math.min(player.cooldown, 1);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Hiệu ứng màn hình khi ngưng đọng thời gian (E)
        if (buffs.e > 0) {
            ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Hiệu ứng vòng xoay thời gian quanh người (R)
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
};