import { dist } from "../../utils.js";

export const sharpshooter = {
    id: "sharpshooter",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player } = state;

        // Kỹ năng Q: Tăng số lần đạn nảy
        if (buffs.q > 0) {
            // Logic này sẽ được áp dụng trực tiếp trong lúc bắn đạn ở update chính.
            // Dùng state để báo cho update chính biết.
            state.playerBouncesModifier = (state.playerBouncesModifier || player.bounces) + 2;
        }

        // Kỹ năng E: Tăng số lượng tia đạn
        if (buffs.e > 0) {
            // Logic này sẽ được áp dụng trực tiếp trong lúc bắn đạn ở update chính.
            // Dùng state để báo cho update chính biết.
            state.playerMultiShotModifier = (state.playerMultiShotModifier || player.multiShot) + 3;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        // Kỹ năng R: Phủ màn hình màu đỏ mờ
        if (buffs.r > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${buffs.r / 20})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};