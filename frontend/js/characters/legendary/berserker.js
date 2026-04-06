import { dist } from "../../utils.js";

export const berserker = {
    id: "berserker",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts } = state;

        // Kỹ năng Q: Trạng thái cuồng nộ (Tăng tốc chạy, giảm delay bắn)
        if (buffs.q > 0) {
            // Gán hệ số nhân (Multiplier) để update.js chính tính toán
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.2;
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.65;
        }

        // Kỹ năng R: Cuồng nộ tối thượng (Nhân đôi đạn, liên tục làm choáng quái gần)
        if (buffs.r > 0) {
            state.playerMultiShotMultiplier = (state.playerMultiShotMultiplier || 1) * 2;

            // Làm choáng mọi quái vật xung quanh trong bán kính 100
            ghosts.forEach((g) => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 100) {
                    g.isStunned = Math.max(g.isStunned, 60);
                }
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng R: Màn hình đỏ máu mờ dần theo thời gian
        if (buffs.r > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${buffs.r / (5 * 60)})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Kỹ năng Q: Vòng hào quang đỏ giật giật quanh người
        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.arc(
                player.x,
                player.y,
                player.radius + 6 + Math.random() * 4,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
};