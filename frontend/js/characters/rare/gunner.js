import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const gunner = {
    id: "gunner",

    onTrigger: (key, state, canvas, changeStateFn) => {
        let { player, mouse, ghosts, boss } = state;

        if (key === "q") {
            state.activeBuffs.q = 15; // Thời gian hiển thị tia laser
            let angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            state.gunnerLaser = { x: player.x, y: player.y, angle: angle };

            // Gây sát thương tức thì trên đường thẳng laser
            const p1 = { x: player.x, y: player.y };
            const p2 = { x: player.x + Math.cos(angle) * 1000, y: player.y + Math.sin(angle) * 1000 };

            const distToLine = (p, v, w) => {
                let l2 = dist(v.x, v.y, w.x, w.y) ** 2;
                if (l2 === 0) return dist(p.x, p.y, v.x, v.y);
                let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
                t = Math.max(0, Math.min(1, t));
                return dist(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
            };

            ghosts.forEach((g) => {
                if (g.x > 0 && distToLine({ x: g.x, y: g.y }, p1, p2) < g.radius + 15) {
                    g.hp -= 3;
                    g.isStunned = 60;
                }
            });
            if (boss && distToLine({ x: boss.x, y: boss.y }, p1, p2) < boss.radius + 15) {
                boss.hp -= 15;
            }
        }

        if (key === "e") {
            if (!state.gunnerMines) state.gunnerMines = [];
            state.gunnerMines.push({ x: player.x, y: player.y });
        }

        if (key === "r") {
            if (!state.gunnerAirstrikes) state.gunnerAirstrikes = [];
            state.gunnerAirstrikes.push({ x: mouse.x, y: mouse.y, timer: 1 * FPS });
        }
        return true;
    },

    update: (state, ctx, canvas, buffs) => {
        let { ghosts, boss, bullets } = state;

        // Xử lý Mìn
        if (state.gunnerMines) {
            for (let i = state.gunnerMines.length - 1; i >= 0; i--) {
                let m = state.gunnerMines[i];
                let triggered = ghosts.some(g => g.x > 0 && dist(m.x, m.y, g.x, g.y) < 40) ||
                    (boss && dist(m.x, m.y, boss.x, boss.y) < boss.radius + 40);

                if (triggered) {
                    ghosts.forEach(g => {
                        if (g.x > 0 && dist(m.x, m.y, g.x, g.y) < 100) {
                            g.hp = (g.hp || 1) - 1;
                            g.isStunned = 45;
                        }
                    });
                    if (boss && dist(m.x, m.y, boss.x, boss.y) < 100) boss.hp -= 5;
                    if (!state.explosions) state.explosions = [];
                    state.explosions.push({ x: m.x, y: m.y, radius: 100, life: 10, color: "rgba(255,100,0,0.8)" });
                    state.gunnerMines.splice(i, 1);
                }
            }
        }

        // Xử lý Không kích
        if (state.gunnerAirstrikes) {
            for (let i = state.gunnerAirstrikes.length - 1; i >= 0; i--) {
                let s = state.gunnerAirstrikes[i];
                s.timer--;
                if (s.timer <= 0) {
                    ghosts.forEach(g => {
                        if (g.x > 0 && dist(s.x, s.y, g.x, g.y) < 200) { g.hp -= 5; g.isStunned = 120; }
                    });
                    if (boss && dist(s.x, s.y, boss.x, boss.y) < 200) boss.hp -= 30;
                    bullets.forEach(b => { if (!b.isPlayer && dist(s.x, s.y, b.x, b.y) < 200) b.life = 0; });
                    if (!state.explosions) state.explosions = [];
                    state.explosions.push({ x: s.x, y: s.y, radius: 200, life: 15, color: "rgba(255,0,0,1)" });
                    state.gunnerAirstrikes.splice(i, 1);
                }
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        // Vẽ Laser Q
        if (buffs.q > 0 && state.gunnerLaser) {
            ctx.beginPath();
            ctx.moveTo(state.gunnerLaser.x, state.gunnerLaser.y);
            ctx.lineTo(state.gunnerLaser.x + Math.cos(state.gunnerLaser.angle) * 2000, state.gunnerLaser.y + Math.sin(state.gunnerLaser.angle) * 2000);
            ctx.strokeStyle = `rgba(0, 255, 255, ${buffs.q / 15})`;
            ctx.lineWidth = 15;
            ctx.stroke();
            ctx.strokeStyle = `rgba(255, 255, 255, ${buffs.q / 15})`;
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // Vẽ Mìn E
        if (state.gunnerMines) {
            state.gunnerMines.forEach(m => {
                ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI * 2); ctx.fillStyle = "#333"; ctx.fill();
                ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, Math.PI * 2); ctx.fillStyle = state.frameCount % 20 < 10 ? "#f00" : "#500"; ctx.fill();
            });
        }

        // Vẽ cảnh báo R
        if (state.gunnerAirstrikes) {
            state.gunnerAirstrikes.forEach(s => {
                let progress = 1 - s.timer / (1 * FPS);
                ctx.beginPath(); ctx.arc(s.x, s.y, 200, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"; ctx.lineWidth = 2; ctx.stroke();
                ctx.beginPath(); ctx.arc(s.x, s.y, 200 * progress, 0, Math.PI * 2); ctx.fillStyle = "rgba(255, 0, 0, 0.2)"; ctx.fill();
            });
        }
    }
};