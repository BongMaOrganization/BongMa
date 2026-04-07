import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

export const knight = {
    id: "knight",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Xung Phong (Dash & Damage)
        if (key === "q") {
            const mx = mouse?.x || player.x + 100;
            const my = mouse?.y || player.y;
            const angle = Math.atan2(my - player.y, mx - player.x);

            state.knightCharge = {
                vx: Math.cos(angle) * 12,
                vy: Math.sin(angle) * 12,
                life: 15, // Khoảng 0.25s
            };
            player.gracePeriod = Math.max(player.gracePeriod, 15);

            if (state.boss) {
                const d = dist(player.x, player.y, state.boss.x, state.boss.y);
                if (d < 100) state.boss.hp -= 5;
            }
        }

        // E: Khiên Phản (Chặn đạn)
        if (key === "e") {
            state.knightShield = {
                life: 3 * FPS,
                blockedCount: 0,
            };
            player.gracePeriod = Math.max(player.gracePeriod, 3 * FPS);
        }

        // R: Cuồng Nộ (Tăng tốc bắn)
        if (key === "r") {
            state.knightRage = {
                life: 6 * FPS,
            };
            state.activeBuffs.r = 6 * FPS;
        }
        return true;
    },

    update: (state, ctx, canvas, buffs) => {
        const { player, boss } = state;

        // Xử lý Xung Phong (Charge)
        if (state.knightCharge) {
            state.knightCharge.life--;
            player.x += state.knightCharge.vx;
            player.y += state.knightCharge.vy;

            if (boss && dist(player.x, player.y, boss.x, boss.y) < boss.radius + player.radius + 20) {
                boss.hp -= 0.1; // Damage chạm khi đang lướt
            }
            if (state.knightCharge.life <= 0) state.knightCharge = null;
        }

        // Xử lý Khiên (Shield)
        if (state.knightShield) {
            state.knightShield.life--;
            state.bullets = state.bullets.filter((b) => {
                if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < 40) {
                    state.knightShield.blockedCount++;
                    return false; // Xóa đạn địch
                }
                return true;
            });

            if (state.knightShield.life <= 0) {
                // Phản công khi hết khiên
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * Math.PI * 2;
                    spawnBullet(player.x, player.y, player.x + Math.cos(a) * 100, player.y + Math.sin(a) * 100, true);
                }
                state.knightShield = null;
            }
        }

        // Buff chỉ số
        if (buffs.r > 0) {
            state.playerFireRateMultiplier = 0.6; // Bắn nhanh hơn 40%
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Vẽ Khiên
        if (state.knightShield) {
            const pulse = Math.sin(state.frameCount * 0.2) * 3;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 35 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00aaff";
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Hào quang Cuồng nộ
        if (state.knightRage) {
            const p = Math.sin(state.frameCount * 0.3) * 5;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8 + p, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 100, 0, 0.6)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Vệt mờ khi lướt
        if (state.knightCharge) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 200, 255, 0.5)";
            ctx.stroke();
        }
    }
};