import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const destroyer = {
    id: "destroyer",

    onTrigger: (key, state) => {
        const { player, mouse } = state;
        if (key === "q") {
            // Vết nứt không gian: Gây sát thương theo đường thẳng
            const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            const len = 400;
            if (!state.destroyerRifts) state.destroyerRifts = [];
            state.destroyerRifts.push({
                x: player.x, y: player.y, angle,
                endX: player.x + Math.cos(angle) * len, endY: player.y + Math.sin(angle) * len,
                life: 6 * FPS
            });
        }
        if (key === "e") {
            // Hút nội năng: Chuyển đạn địch thành Multi-shot
            state.destroyerAbsorb = { life: 1 * FPS, radius: 180 };
            player.gracePeriod = Math.max(player.gracePeriod, FPS);
            let absorbed = 0;
            state.bullets = state.bullets.filter(b => {
                if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < 180) { absorbed++; return false; }
                return true;
            });
            if (absorbed > 0) {
                const bonus = Math.floor(absorbed / 3);
                state.playerMultiShotModifier += bonus;
                state.destroyerAbsorbBuff = { shots: bonus, life: 8 * FPS };
            }
        }
        if (key === "r") {
            // Trạng thái Hủy Diệt: Phản đạn và gây dame Boss diện rộng
            state.destroyerUlt = { life: 10 * FPS, radius: 150 };
            state.activeBuffs.r = 10 * FPS;
        }
        return true;
    },

    update: (state) => {
        const { player, boss, bullets, ghosts } = state;
        // Xử lý Vết nứt
        if (state.destroyerRifts) {
            state.destroyerRifts = state.destroyerRifts.filter(r => {
                r.life--;
                ghosts.forEach(g => { if (g.hp > 0 && dist(g.x, g.y, r.endX, r.endY) < 100) g.hp -= 0.5; });
                if (boss && r.life % 20 === 0 && dist(boss.x, boss.y, r.endX, r.endY) < 150) boss.hp -= 4;
                return r.life > 0;
            });
        }
        // Xử lý Buff hấp thụ
        if (state.destroyerAbsorbBuff) {
            state.destroyerAbsorbBuff.life--;
            if (state.destroyerAbsorbBuff.life <= 0) state.destroyerAbsorbBuff = null;
        }
        // Logic Ultimate
        if (state.destroyerUlt) {
            state.destroyerUlt.life--;
            bullets.forEach(b => {
                if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < state.destroyerUlt.radius) {
                    b.isPlayer = true; b.vx *= -1; b.vy *= -1; b.damage *= 2;
                }
            });
            if (boss && state.destroyerUlt.life % 10 === 0 && dist(player.x, player.y, boss.x, boss.y) < state.destroyerUlt.radius + 60) boss.hp -= 5;
        }
    },

    draw: (state, ctx) => {
        const { player } = state;
        state.destroyerRifts?.forEach(r => {
            ctx.strokeStyle = `rgba(255, 0, 80, ${r.life / (6 * FPS)})`; ctx.lineWidth = 10;
            ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.endX, r.endY); ctx.stroke();
        });
        if (state.destroyerUlt) {
            ctx.beginPath(); ctx.arc(player.x, player.y, state.destroyerUlt.radius, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 0, 80, 0.8)"; ctx.lineWidth = 4; ctx.stroke();
            ctx.fillStyle = "rgba(255, 0, 80, 0.1)"; ctx.fill();
        }
    }
};