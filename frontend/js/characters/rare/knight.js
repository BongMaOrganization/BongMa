import { dist } from "../utils.js";
import { spawnBullet } from "../entities.js";

export const knight = {
    id: "knight",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, boss } = state;

        // --- Kỹ năng R: Rage Mode (Tăng tốc độ bắn) ---
        if (buffs.r > 0) {
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.6;
        }

        // --- Kỹ năng E: Charge (Lướt tấn công) ---
        if (state.knightCharge) {
            state.knightCharge.life--;
            player.x += state.knightCharge.vx;
            player.y += state.knightCharge.vy;

            // Giới hạn trong Map
            player.x = Math.max(player.radius, Math.min(state.world.width - player.radius, player.x));
            player.y = Math.max(player.radius, Math.min(state.world.height - player.radius, player.y));

            // Gây sát thương khi đâm trúng Boss
            if (boss && dist(player.x, player.y, boss.x, boss.y) < boss.radius + player.radius + 20) {
                boss.hp -= 3;
            }

            if (state.knightCharge.life <= 0) state.knightCharge = null;
        }

        // --- Kỹ năng Q: Shield Reflect (Khiên chặn đạn) ---
        if (state.knightShield) {
            state.knightShield.life--;

            // Chặn và xóa đạn địch trong tầm khiên
            state.bullets = state.bullets.filter((b) => {
                if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < 40) {
                    state.knightShield.blockedCount++;
                    return false;
                }
                return true;
            });

            if (state.knightShield.life <= 0) {
                // Phản công: Bắn 8 tia đạn ra xung quanh khi khiên hết thời gian
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    spawnBullet(
                        player.x,
                        player.y,
                        player.x + Math.cos(angle) * 100,
                        player.y + Math.sin(angle) * 100,
                        true,
                        2,
                        "player"
                    );
                }
                state.knightShield = null;
            }
        }

        // Kỹ năng nội tại (Rage CDR - nếu có logic riêng)
        if (state.knightRage) {
            state.knightRage.life--;
            if (state.knightRage.life <= 0) state.knightRage = null;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Khiên Q
        if (state.knightShield) {
            const shieldPulse = Math.sin(state.frameCount * 0.2) * 3;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 35 + shieldPulse, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#00aaff";
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Vẽ Hào quang Rage R
        if (state.knightRage) {
            const pulse = Math.sin(state.frameCount * 0.3) * 5;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 100, 0, 0.6)`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Vẽ Trail khi đang Charge E
        if (state.knightCharge) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 200, 255, 0.7)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
};