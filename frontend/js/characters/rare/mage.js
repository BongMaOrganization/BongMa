import { dist } from "../../utils.js";

export const mage = {
    id: "mage",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        // Mage chủ yếu dùng R để ngưng đọng thời gian.
        // Q và E có thể có logic khác trong combat (bắn ra cầu lửa/băng),
        // nhưng kỹ năng R tác động trực tiếp đến toàn thế giới.
        if (buffs.r > 0) {
            // Báo cho update.js chính biết thời gian đang bị đóng băng
            state.timeFrozenModifier = true;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng R: Phủ màn hình màu xanh lam mờ biểu thị ngưng đọng thời gian
        if (buffs.r > 0) {
            ctx.fillStyle = `rgba(0, 150, 255, 0.15)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Quái vật khi bị đóng băng cũng sẽ được đổi màu ở phần vẽ chung trong draw.js
    }
};