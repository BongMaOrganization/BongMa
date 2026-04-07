import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { updateHealthUI } from "../../ui.js";

export const tank = {
    id: "tank",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Q: Cường Hóa Khiên (Hồi Shield)
        if (key === "q") {
            player.shield = Math.min((player.maxShield || 0) + 1, 5);
            updateHealthUI();
        }

        // E: Dash Bất Tử
        if (key === "e") {
            state.activeBuffs.e = 3 * FPS;
            // flag được update.js chính sử dụng để check isInvulnerable
        }

        // R: Giải Phóng Năng Lượng (Clear đạn địch xung quanh)
        if (key === "r") {
            state.bullets.forEach((b) => {
                if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 250) {
                    b.life = 0;
                }
            });
            state.activeBuffs.r = 20; // Thời gian hiển thị vòng sóng nổ
        }
        return true;
    },

    update: (state, ctx, canvas, buffs) => {
        // Tank không có logic update phức tạp, chủ yếu là flags bất tử
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Vẽ vòng sóng nổ R
        if (buffs.r > 0) {
            const radius = (20 - buffs.r) * 15;
            ctx.beginPath();
            ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 204, ${buffs.r / 20})`;
            ctx.lineWidth = 10;
            ctx.stroke();
        }

        // Hiệu ứng khi đang Dash bất tử (E)
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
};