import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";
import { updateHealthUI } from "../../ui.js";

export const berserker = {
    id: "berserker",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Q: Cuồng Bạo - Tăng cực mạnh tốc độ chạy và tốc độ đánh
        if (key === "q") {
            state.activeBuffs.q = 4 * FPS;
        }

        // E: Bão Đạn Nổi Điên - Bắn tỏa tròn liên tục
        if (key === "e") {
            let prevLen = state.bullets.length;
            for (let i = 0; i < Math.PI * 2; i += Math.PI / 6) {
                spawnBullet(player.x, player.y, player.x + Math.cos(i), player.y + Math.sin(i), true);
            }
            for (let i = prevLen; i < state.bullets.length; i++) {
                state.bullets[i].life = 15; // Đạn bay rất ngắn (đánh gần)
                state.bullets[i].damage = 3;
                state.bullets[i].radius = 12;
                state.bullets[i].color = "#ff3300"; // Đạn đỏ rực
            }
            state.activeBuffs.e = 15; // Frame hiệu ứng draw
            state.screenShake = { timer: 5, intensity: 4 };
        }

        // R: Trạng Thái Quyết Tử - Trừ máu lấy sát thương khổng lồ và Aura áp chế
        if (key === "r") {
            if (player.hp > 1) {
                player.hp--;
                updateHealthUI();
            }
            state.activeBuffs.r = 6 * FPS; // Kéo dài 6s
            state.screenShake = { timer: 15, intensity: 8 };
        }

        return true;
    },

    update: (state) => {
        const { ghosts, player } = state;

        // Áp dụng chỉ số Cuồng bạo (Q)
        if (state.activeBuffs.q > 0) {
            state.playerSpeedMultiplier *= 1.35; // Tăng 35% tốc chạy
            state.playerFireRateMultiplier *= 0.5; // Tốc bắn cực nhanh
        }

        // Áp dụng Quyết tử (R)
        if (state.activeBuffs.r > 0) {
            state.playerMultiShotModifier += 2; // Tăng thêm tia đạn khi bắn

            // Aura Sát Khí: Gây choáng và rút máu quái vật đứng gần
            ghosts.forEach((g) => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 140) {
                    g.isStunned = Math.max(g.isStunned, 60);
                    g.hp -= 0.15; // Sát thương đốt theo thời gian
                }
            });
        }
    },

    draw: (state, ctx, canvas) => {
        const { player, activeBuffs } = state;

        // Draw Q (Cuồng bạo)
        if (activeBuffs.q > 0) {
            ctx.save();
            const jitter = Math.random() * 8 - 4; // Rung rinh viền nhân vật
            ctx.beginPath();
            ctx.arc(player.x + jitter, player.y + jitter, player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 50, 0, 0.8)";
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();
        }

        // Draw R (Quyết Tử)
        if (activeBuffs.r > 0) {
            ctx.save();
            // Aura dưới chân
            ctx.beginPath();
            ctx.arc(player.x, player.y, 140, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
            ctx.lineWidth = 2;
            ctx.setLineDash([20, 15]);
            ctx.stroke();

            // Màn hình nhuốm máu (Filter)
            const rAlpha = Math.min(0.25, activeBuffs.r / (6 * FPS));
            ctx.fillStyle = `rgba(255, 0, 0, ${rAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }
};