import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const warden = {
    id: "warden",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Q: Chấn Động - Gây choáng hẹp xung quanh bảo vệ bản thân
        if (key === "q") {
            state.activeBuffs.q = 15;
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 120, life: 30, maxLife: 30, color: "#ffd700" });
            state.ghosts.forEach(g => {
                if (dist(player.x, player.y, g.x, g.y) < 120) {
                    g.hp -= 2;
                    g.isStunned = Math.max(g.isStunned, 60);
                }
            });
        }

        // E: Tăng Cường Đạn Nảy
        if (key === "e") {
            state.activeBuffs.e = 6 * FPS;
        }

        // R: Lĩnh Vực Bất Khả Xâm Phạm - Đẩy lùi quái liên tục
        if (key === "r") {
            state.activeBuffs.r = 8 * FPS;
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 180, life: 50, maxLife: 50, color: "#ffd700" });
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts } = state;

        // Logic E: Tăng số lần nảy cho đạn
        if (state.activeBuffs.e > 0) {
            state.playerBouncesModifier = (state.playerBouncesModifier || 0) + 2;
        }

        // Logic R: Aura đẩy lùi
        if (state.activeBuffs.r > 0) {
            ghosts.forEach((g) => {
                let d = dist(player.x, player.y, g.x, g.y);
                // Trong tầm 180px, quái sẽ bị đẩy dội ra
                if (d < 180) {
                    let force = (180 - d) * 0.08;
                    // Kháng đẩy cho Boss và MiniBoss
                    if (!g.isMiniBoss && !g.isSubBoss) {
                        let angle = Math.atan2(g.y - player.y, g.x - player.x);
                        g.x += Math.cos(angle) * force;
                        g.y += Math.sin(angle) * force;
                    }
                }
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;

        // Vẽ Chấn Động (Q)
        if (buffs.q > 0) {
            const progress = 1 - (buffs.q / 15);
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + progress * 100, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 0, ${buffs.q / 15})`;
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // Hiệu ứng Buff Đạn Nảy (E)
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 150, 0, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Vẽ Lĩnh Vực Đẩy Lùi (R) - Golden Dome
        if (buffs.r > 0) {
            const pulse = Math.sin(frameCount * 0.1) * 5;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 180 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 215, 0, 0.7)";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ffd700";
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Lớp màng vàng bảo vệ
            ctx.fillStyle = "rgba(255, 215, 0, 0.08)";
            ctx.fill();
        }
    }
};