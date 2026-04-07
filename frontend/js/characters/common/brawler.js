import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const brawler = {
    id: "brawler",

    /**
     * onTrigger: Kích hoạt khi bấm phím
     */
    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Q: Cú Đấm Lốc Xoáy - Sát thương quanh bản thân
        if (key === "q") {
            state.activeBuffs.q = 15;
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 120, life: 30, maxLife: 30, color: "#ff6432" });

            state.ghosts.forEach(g => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 120) {
                    g.hp -= 3;
                    g.isStunned = Math.max(g.isStunned, 30);
                }
            });
            if (state.boss && dist(player.x, player.y, state.boss.x, state.boss.y) < 120 + state.boss.radius) {
                state.boss.hp -= 5;
            }
        }

        // E: Tăng tốc cực hạn (Chạy nước rút)
        if (key === "e") {
            state.activeBuffs.e = 4 * FPS;
        }

        // R: Nện Mặt Đất - Gây sóng xung kích diện rộng
        if (key === "r") {
            state.activeBuffs.r = 30;
            state.screenShake = { timer: 10, intensity: 6 };
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 300, life: 40, maxLife: 40, color: "#ffc800" });

            state.ghosts.forEach(g => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 300) {
                    g.hp -= 8;
                    g.isStunned = Math.max(g.isStunned, 90); // Choáng 1.5s
                }
            });
            if (state.boss && dist(player.x, player.y, state.boss.x, state.boss.y) < 300 + state.boss.radius) {
                state.boss.hp -= 15;
            }
        }
        return true;
    },

    /**
     * update: Xử lý hiệu ứng liên tục
     */
    update: (state) => {
        // Tăng tốc độ chạy 30% khi bật E
        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;
        }
    },

    /**
     * draw: Hiệu ứng hình ảnh (VFX)
     */
    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Hiệu ứng Q: Vòng xoáy thu hẹp vào tâm
        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 120 - buffs.q * 8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 100, 50, ${buffs.q / 15})`;
            ctx.lineWidth = 10;
            ctx.stroke();
        }

        // Hiệu ứng E: Vòng hào quang đỏ quanh người
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 6 + Math.random() * 4, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 100, 0, 0.7)";
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Hiệu ứng R: Sóng xung kích khổng lồ dội ra ngoài
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 300 - buffs.r * 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 0, ${buffs.r / 30})`;
            ctx.lineWidth = 15;
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 100, 0, ${(buffs.r / 30) * 0.1})`;
            ctx.fill();
        }
    }
};