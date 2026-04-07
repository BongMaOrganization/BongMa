import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const ghost = {
    id: "ghost",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Trạng Thái Vô Ảnh (Tàng hình & Bất tử)
        if (key === "q") {
            state.activeBuffs.q = 4 * FPS;
        }

        // E: Lướt Bóng Ma (Xuyên thấu)
        if (key === "e") {
            const dx = mouse.x - player.x, dy = mouse.y - player.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            player.dashTimeLeft = 15;
            player.dashDx = dx / (len || 1);
            player.dashDy = dy / (len || 1);
            player.isInvincible = true; // Bất tử khi lướt
            state.activeBuffs.e = 15;
        }

        // R: Tiếng Thét Oán Hận (Stun và Damage toàn khu vực)
        if (key === "r") {
            state.activeBuffs.r = 20; // 20 frames animation nổ
            state.screenShake = { timer: 15, intensity: 5 };

            state.ghosts.forEach(g => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 350) {
                    g.hp -= 6;
                    g.isStunned = Math.max(g.isStunned, 180); // Stun mạnh 3 giây
                }
            });

            if (state.boss && dist(player.x, player.y, state.boss.x, state.boss.y) < 350 + state.boss.radius) {
                state.boss.hp -= 12;
            }
        }
        return true;
    },

    update: (state) => {
        const { player } = state;

        // Logic Q: Bất tử và di chuyển nhanh
        if (state.activeBuffs.q > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.4;
            player.isInvincible = true; // Không nhận sát thương
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Hiệu ứng Q: Nhân vật trở nên trong suốt và có màu tím lam
        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(120, 100, 255, 0.4)";
            ctx.fill();
        }

        // Hiệu ứng E: Bóng mờ khi lướt
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x - player.dashDx * 25, player.y - player.dashDy * 25, player.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(100, 100, 255, 0.25)";
            ctx.fill();
        }

        // Hiệu ứng R: Vụ nổ sóng âm đen/tím
        if (buffs.r > 0) {
            const progress = 1 - (buffs.r / 20); // 0 -> 1

            ctx.beginPath();
            ctx.arc(player.x, player.y, 350 * progress, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(150, 0, 255, ${buffs.r / 20})`;
            ctx.lineWidth = 15;
            ctx.stroke();

            ctx.fillStyle = `rgba(50, 0, 100, ${buffs.r / 40})`;
            ctx.fill();
        }
    }
};