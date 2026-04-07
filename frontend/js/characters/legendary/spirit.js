import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const spirit = {
    id: "spirit",

    onTrigger: (key, state, canvas, changeStateFn) => {
        // Q: Bất tử / Đi xuyên không gian
        if (key === "q") {
            state.activeBuffs.q = 4 * FPS;
            // isInvulnSkill được xử lý bởi update.js chính nếu activeBuffs.q > 0
        }

        // E: Vùng Không Gian Tâm Linh (Làm chậm quái)
        if (key === "e") {
            state.activeBuffs.e = 6 * FPS;
        }

        // R: Mưa Linh Hồn (Sét Trắng giáng xuống liên tục)
        if (key === "r") {
            state.activeBuffs.r = 8 * FPS;
            state.screenShake = { timer: 15, intensity: 4 };
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, frameCount } = state;

        // Logic Q: Để lại các phân bóng mờ (Phantoms) khi đang tàng hình
        if (state.activeBuffs.q > 0) {
            if (frameCount % 6 === 0) {
                if (!state.phantoms) state.phantoms = [];
                state.phantoms.push({
                    x: player.x, y: player.y,
                    life: 20,
                    color: "rgba(200, 200, 255, 0.4)",
                    radius: player.radius
                });
            }
        }

        // Logic E: Aura 250px hút năng lượng và làm chậm
        if (state.activeBuffs.e > 0) {
            ghosts.forEach(g => {
                if (dist(player.x, player.y, g.x, g.y) < 250) {
                    g.speed *= 0.4; // Làm chậm cực mạnh (Chỉ còn 40% tốc)
                    g.hp -= 0.15; // Rút máu liên tục
                }
            });
        }

        // Logic R: Mưa tia sét trắng liên hoàn
        if (state.activeBuffs.r > 0 && frameCount % 12 === 0) {
            let lx = player.x + (Math.random() - 0.5) * 800;
            let ly = player.y + (Math.random() - 0.5) * 600;

            if (!state.stormLightnings) state.stormLightnings = [];
            state.stormLightnings.push({ x: lx, y: ly, life: 15, color: "white" });

            ghosts.forEach(g => {
                if (dist(lx, ly, g.x, g.y) < 110) {
                    g.hp -= 10;
                    g.isStunned = 50;
                }
            });
            if (boss && dist(lx, ly, boss.x, boss.y) < 110 + boss.radius) boss.hp -= 12;
        }

        // Xóa dần Phantoms
        if (state.phantoms) {
            state.phantoms.forEach(p => p.life--);
            state.phantoms = state.phantoms.filter(p => p.life > 0);
        }

        // Xóa dần Sét Trắng
        if (state.stormLightnings) {
            state.stormLightnings.forEach(l => l.life--);
            state.stormLightnings = state.stormLightnings.filter(l => l.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Vẽ Phantoms (Q)
        state.phantoms?.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color; ctx.fill();
        });

        // Vẽ Vòng Tròn Tâm Linh (E)
        if (buffs.e > 0) {
            ctx.beginPath(); ctx.arc(player.x, player.y, 250, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(150, 150, 255, 0.6)";
            ctx.lineWidth = 3;
            ctx.setLineDash([15, 10]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "rgba(150, 150, 255, 0.08)";
            ctx.fill();
        }

        // Kỹ năng Q đang bật: Bọc sáng nhân vật
        if (buffs.q > 0) {
            ctx.beginPath(); ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(200, 200, 255, 0.9)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Vẽ Mưa Sét Trắng (R)
        state.stormLightnings?.forEach(l => {
            ctx.save();
            // Vẽ Sét
            ctx.beginPath();
            ctx.moveTo(l.x, l.y - 1000);
            ctx.lineTo(l.x + (Math.random() - 0.5) * 60, l.y - 500);
            ctx.lineTo(l.x, l.y);
            ctx.strokeStyle = l.color || "white";
            ctx.lineWidth = 8;
            ctx.shadowBlur = 20;
            ctx.shadowColor = l.color || "white";
            ctx.stroke();

            // Vẽ Vụ Nổ dưới chân
            ctx.beginPath();
            ctx.arc(l.x, l.y, 110, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.fill();
            ctx.restore();
        });
    }
};