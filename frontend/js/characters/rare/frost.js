import { dist } from "../utils.js";

export const frost = {
    id: "frost",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Kỹ năng Q: Đóng băng bản thân (Bất tử nhưng không thể di chuyển/bắn)
        if (buffs.q > 0) {
            state.playerSpeedMultiplier = 0; // Đứng yên
            state.playerCanShootModifier = false; // Không thể bắn
            // Cờ hiệu bất tử được check ở update chính qua isInvulnSkill
        }

        // Kỹ năng R: Vùng cực hàn (Gây sát thương diện rộng mỗi 10 frame)
        if (buffs.r > 0) {
            if (state.frameCount % 10 === 0) {
                ghosts.forEach((g) => {
                    if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 200) {
                        g.hp = (g.hp || 1) - 10;
                    }
                });
                if (boss && dist(player.x, player.y, boss.x, boss.y) < 200 + boss.radius) {
                    boss.hp -= 2;
                }
            }

            // Hiệu ứng làm chậm đạn địch trong vùng R (xử lý ở draw/update đạn)
            state.frostR_Active = true;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // VFX cho kỹ năng Q
        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 200, 255, 0.6)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(player.x, player.y, 100, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 200, 255, 0.1)";
            ctx.fill();
        }

        // VFX cho kỹ năng R
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 200, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(100, 200, 255, 0.15)";
            ctx.fill();
            ctx.strokeStyle = "rgba(200, 255, 255, 0.5)";
            ctx.setLineDash([10, 15]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
};