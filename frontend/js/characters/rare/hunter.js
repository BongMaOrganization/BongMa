import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

export const hunter = {
    id: "hunter",

    onTrigger: (key, state, canvas, changeStateFn) => {
        let { player, mouse } = state;

        if (key === "q") {
            if (!state.hunterTraps) state.hunterTraps = [];
            state.hunterTraps.push({ x: player.x, y: player.y });
        }
        if (key === "e") {
            state.activeBuffs.e = 5 * FPS;
        }
        if (key === "r") {
            // Bắn Shuriken khổng lồ
            let prevLen = state.bullets.length;
            spawnBullet(player.x, player.y, mouse.x, mouse.y, true);
            if (state.bullets.length > prevLen) {
                let b = state.bullets[state.bullets.length - 1];
                b.radius = 40;
                b.damage = 3;
                b.pierce = true;
                b.vx *= 0.5; b.vy *= 0.5;
                b.life = 120;
                b.isShuriken = true;
            }
        }
        return true;
    },

    update: (state, ctx, canvas, buffs) => {
        let { player, ghosts, boss } = state;

        // E: Vùng sát thương quanh Hunter
        if (buffs.e > 0) {
            ghosts.forEach((g) => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 300) {
                    if (g.isMiniBoss || g.isSubBoss) {
                        if (state.frameCount % 10 === 0) g.hp -= g.maxHp * 0.05;
                    } else { g.hp = 0; }
                }
            });
            if (boss && dist(player.x, player.y, boss.x, boss.y) < 300 + boss.radius) {
                if (state.frameCount % 15 === 0) boss.hp -= 2;
            }
        }

        // Bẫy Hunter
        if (state.hunterTraps) {
            for (let i = state.hunterTraps.length - 1; i >= 0; i--) {
                let trap = state.hunterTraps[i];
                let triggered = false;
                ghosts.forEach(g => {
                    if (!triggered && g.x > 0 && dist(trap.x, trap.y, g.x, g.y) < 40) {
                        g.isStunned = 180; g.hp -= 2; triggered = true;
                    }
                });
                if (triggered) state.hunterTraps.splice(i, 1);
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Aura E
        if (buffs.e > 0) {
            ctx.beginPath(); ctx.arc(player.x, player.y, 300, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 100, 0, 0.6)"; ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = "rgba(255, 100, 0, 0.05)"; ctx.fill();
        }

        // Vẽ Bẫy Q
        if (state.hunterTraps) {
            state.hunterTraps.forEach(trap => {
                ctx.beginPath(); ctx.arc(trap.x, trap.y, 15, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(139, 69, 19, 0.8)"; ctx.setLineDash([5, 5]);
                ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
            });
        }
    }
};