import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { updateHealthUI } from "../../ui.js";

export const medic = {
    id: "medic",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Q: Cứu Thương - Hồi 1 HP cho bản thân
        if (key === "q") {
            if (player.hp < player.maxHp) {
                player.hp++;
                updateHealthUI();

                // Hiển thị text bay lên
                if (!state.floatingTexts) state.floatingTexts = [];
                state.floatingTexts.push({
                    x: player.x,
                    y: player.y - 30,
                    text: "+1 HP",
                    color: "#00ffaa",
                    life: 40
                });
            } else {
                // Cộng một chút EXP nếu máu đã đầy
                state.player.exp = (state.player.exp || 0) + 10;
                if (!state.floatingTexts) state.floatingTexts = [];
                state.floatingTexts.push({ x: player.x, y: player.y - 30, text: "+10 EXP", color: "#ffff00", life: 40 });
            }
            state.activeBuffs.q = 30; // Buff animation ngắn
        }

        // E: Tốc Hành Y Tế - Tăng tốc độ chạy để cứu nguy
        if (key === "e") {
            state.activeBuffs.e = 4 * FPS;
        }

        // R: Vụ Nổ Sinh Học - Stun quái xung quanh và hồi phục nhẹ
        if (key === "r") {
            state.activeBuffs.r = 60; // Animation 1 giây
            state.ghosts.forEach(g => {
                if (dist(player.x, player.y, g.x, g.y) < 250) {
                    g.isStunned = Math.max(g.isStunned, 60);
                    g.hp -= 2;
                }
            });
            state.screenShake = { timer: 10, intensity: 3 };
        }
        return true;
    },

    update: (state) => {
        // Logic E: Tăng tốc độ di chuyển
        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.35;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Vẽ animation Q (Hồi máu)
        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15 + (30 - buffs.q), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 150, ${buffs.q / 30})`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Vẽ Vòng đứt nét E (Tốc hành)
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(100, 255, 150, 0.6)";
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Vẽ Vòng lan tỏa R (Vụ nổ sinh học)
        if (buffs.r > 0) {
            // Phủ xanh màn hình
            ctx.fillStyle = `rgba(0, 255, 150, ${(buffs.r / 60) * 0.15})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Sóng lan tỏa
            const progress = 1 - (buffs.r / 60);
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + progress * 250, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 100, ${buffs.r / 60})`;
            ctx.lineWidth = 8 * (buffs.r / 60);
            ctx.stroke();
        }
    }
};