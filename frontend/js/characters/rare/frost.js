import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { updateHealthUI } from "../../ui.js";

export const frost = {
    id: "frost",

    onTrigger: (key, state, canvas, changeStateFn) => {
        if (key === "q") {
            state.activeBuffs.q = 2 * FPS;
        }
        if (key === "e") {
            state.player.shield = 1;
            updateHealthUI();
            state.activeBuffs.e = 10 * FPS;
        }
        if (key === "r") {
            state.activeBuffs.r = 5 * FPS;
        }
        return true;
    },

    /**
     * Cập nhật trạng thái liên tục mỗi frame
     */
    update: (state, ctx, canvas, buffs) => {
        let { player, ghosts, boss } = state;

        // Q: Đóng băng bản thân (Bất tử nhưng đứng yên)
        if (buffs.q > 0) {
            state.playerSpeedMultiplier = 0;
            state.playerCanShootModifier = false;
            // Note: Bất tử được xử lý chung qua flag buffs.q trong update.js
        }

        // R: Vùng cực hàn (Damage diện rộng)
        if (buffs.r > 0) {
            state.frostR_Active = true;
            if (state.frameCount % 10 === 0) {
                ghosts.forEach((g) => {
                    if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 200) {
                        g.hp = (g.hp || 1) - 10;
                        g.isStunned = Math.max(g.isStunned, 10);
                    }
                });
                if (boss && dist(player.x, player.y, boss.x, boss.y) < 200 + boss.radius) {
                    boss.hp -= 2;
                }
            }
        }
    },

    /**
     * Vẽ hiệu ứng kỹ năng
     */
    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ khối băng Q
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

        // Vẽ vùng R
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