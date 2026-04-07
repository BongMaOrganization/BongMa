import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const sniper = {
    id: "sniper",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Chế độ Ngắm Bắn - Làm chậm, đạn cực mạnh
        if (key === "q") {
            state.activeBuffs.q = 8 * FPS;
        }

        // E: Đặt Bẫy Mìn (Caltrop) làm choáng quái vật
        if (key === "e") {
            if (!state.sniperTraps) state.sniperTraps = [];
            state.sniperTraps.push({
                x: player.x,
                y: player.y,
                life: 15 * FPS,
                radius: 100
            });
        }

        // R: Phát Bắn Xuyên Thấu - Tia Laser hủy diệt
        if (key === "r") {
            state.activeBuffs.r = 15; // Tia Laser chớp lên trong 15 frame (0.25s)
            let angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            state.sniperLaser = { x: player.x, y: player.y, angle: angle };
            state.screenShake = { timer: 10, intensity: 10 };

            // Tính sát thương tia Laser (Đoạn thẳng p1 đến p2)
            const p1 = { x: player.x, y: player.y };
            const p2 = { x: player.x + Math.cos(angle) * 2500, y: player.y + Math.sin(angle) * 2500 };

            // Thuật toán tính khoảng cách từ điểm đến đường thẳng
            const distToLine = (p, v, w) => {
                let l2 = dist(v.x, v.y, w.x, w.y) ** 2;
                if (l2 === 0) return dist(p.x, p.y, v.x, v.y);
                let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
                t = Math.max(0, Math.min(1, t));
                return dist(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
            };

            state.ghosts.forEach(g => {
                if (distToLine({ x: g.x, y: g.y }, p1, p2) < g.radius + 25) {
                    g.hp -= 30; // Dame khổng lồ
                    g.isStunned = 120;
                }
            });

            if (state.boss && distToLine({ x: state.boss.x, y: state.boss.y }, p1, p2) < state.boss.radius + 25) {
                state.boss.hp -= 40;
            }
        }
        return true;
    },

    update: (state) => {
        // Logic Buff Q: Đi chậm lại 50%
        if (state.activeBuffs.q > 0) {
            state.playerSpeedMultiplier *= 0.5;
            state.sniperQ_Active = true; // Combat.js sẽ check biến này để tăng dame cho đạn
        }

        // Quản lý Bẫy
        if (state.sniperTraps) {
            state.sniperTraps.forEach(t => {
                t.life--;
                let triggered = false;

                state.ghosts.forEach(g => {
                    if (dist(t.x, t.y, g.x, g.y) < 40) triggered = true;
                });

                if (triggered) {
                    // Nổ bẫy
                    state.ghosts.forEach(g => {
                        if (dist(t.x, t.y, g.x, g.y) < t.radius) {
                            g.hp -= 8;
                            g.isStunned = Math.max(g.isStunned, 120);
                        }
                    });

                    t.life = 0;
                    if (!state.explosions) state.explosions = [];
                    state.explosions.push({ x: t.x, y: t.y, radius: t.radius, life: 15, color: "rgba(100, 100, 100, 0.8)" });
                }
            });
            state.sniperTraps = state.sniperTraps.filter(t => t.life > 0);
        }

        if (state.activeBuffs.r <= 0) {
            state.sniperLaser = null;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, mouse } = state;

        // Vẽ tia Laser ngắm bắn (Q)
        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Vẽ Bẫy Mìn (E)
        if (state.sniperTraps) {
            state.sniperTraps.forEach(t => {
                ctx.beginPath(); ctx.arc(t.x, t.y, 10, 0, Math.PI * 2); ctx.fillStyle = "#444"; ctx.fill();
                ctx.beginPath(); ctx.arc(t.x, t.y, 4, 0, Math.PI * 2); ctx.fillStyle = "red"; ctx.fill();
            });
        }

        // Vẽ Tia Laser Hủy Diệt (R)
        if (buffs.r > 0 && state.sniperLaser) {
            const s = state.sniperLaser;
            const endX = s.x + Math.cos(s.angle) * 3000;
            const endY = s.y + Math.sin(s.angle) * 3000;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = `rgba(255, 50, 50, ${buffs.r / 15})`;
            ctx.lineWidth = 40;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "red";
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 12;
            ctx.stroke();
            ctx.restore();
        }
    }
};