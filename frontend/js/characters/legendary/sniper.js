import { dist } from "../utils.js";

export const sniper = {
    id: "sniper",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        // Kỹ năng Q: Chế độ ngắm bắn (Giảm tốc độ chạy, đạn mạnh hơn)
        if (buffs.q > 0) {
            // Giảm 50% tốc độ di chuyển
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 0.5;

            // Bật cờ hiệu để update chính (chỗ bắn đạn) biết mà cường hóa đạn
            state.sniperQ_Active = true;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Bản gốc không có hiệu ứng draw cụ thể cho Q/E/R của Sniper.
        // Nếu bạn muốn thêm tia laser ngắm bắn đỏ khi bật Q thì có thể vẽ thêm ở đây:
        /*
        if (buffs.q > 0) {
           ctx.beginPath();
           ctx.moveTo(player.x, player.y);
           ctx.lineTo(state.mouse.x, state.mouse.y);
           ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
           ctx.lineWidth = 2;
           ctx.stroke();
        }
        */
    }
};