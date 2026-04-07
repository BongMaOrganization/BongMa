import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const sharpshooter = {
    id: "sharpshooter",

    onTrigger: (key, state, canvas, changeStateFn) => {
        // Q: Tăng số lần nảy của đạn
        if (key === "q") {
            state.activeBuffs.q = 5 * FPS;
        }

        // E: Tăng số lượng tia đạn bắn ra
        if (key === "e") {
            state.activeBuffs.e = 5 * FPS;
        }

        // R: Mắt Đại Bàng - Buff tốc bắn điên cuồng và đạn xuyên thấu
        if (key === "r") {
            state.activeBuffs.r = 8 * FPS;
            state.screenShake = { timer: 15, intensity: 5 };
        }

        return true;
    },

    update: (state) => {
        const { player, bullets } = state;

        // Buff Q: Tăng Nảy (Bounces)
        if (state.activeBuffs.q > 0) {
            state.playerBouncesModifier = (state.playerBouncesModifier || player.bounces || 0) + 3;
        }

        // Buff E: Tăng Tia Đạn (MultiShot)
        if (state.activeBuffs.e > 0) {
            state.playerMultiShotModifier = (state.playerMultiShotModifier || player.multiShot || 1) + 4;
        }

        // Buff R: Xạ Thủ Tối Thượng
        if (state.activeBuffs.r > 0) {
            // Giảm thời gian hồi chiêu để bắn như súng máy
            state.playerFireRateMultiplier *= 0.35;

            // Ép đạn được bắn ra trong trạng thái R có khả năng xuyên thấu và tăng damage
            bullets.forEach(b => {
                if (b.isPlayer && b.life === b.maxLife) { // Đạn vừa mới sinh ra
                    b.pierce = true;
                    b.damage = (b.damage || 1) * 1.5;
                }
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Hiệu ứng Q: Vòng sáng Xanh lam
        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "cyan";
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Hiệu ứng E: Vòng sáng Tím đứt nét
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 16, 0, Math.PI * 2);
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Hiệu ứng R: Màn hình đỏ ngắm bắn và Crosshair tâm ruồi
        if (buffs.r > 0) {
            // Đỏ màn hình mờ
            const rAlpha = 0.1 + Math.sin(state.frameCount * 0.2) * 0.05;
            ctx.fillStyle = `rgba(255, 0, 0, ${rAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Tâm ngắm crosshair bao quanh người chơi
            ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
            ctx.lineWidth = 2;

            ctx.beginPath(); ctx.moveTo(player.x - 40, player.y); ctx.lineTo(player.x - 15, player.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(player.x + 15, player.y); ctx.lineTo(player.x + 40, player.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(player.x, player.y - 40); ctx.lineTo(player.x, player.y - 15); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(player.x, player.y + 15); ctx.lineTo(player.x, player.y + 40); ctx.stroke();

            ctx.beginPath(); ctx.arc(player.x, player.y, 25, 0, Math.PI * 2); ctx.stroke();
        }
    }
};