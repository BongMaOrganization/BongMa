import { dist } from "../utils.js";

export const hunter = {
    id: "hunter",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Kỹ năng E: Vòng quét gây sát thương liên tục
        if (buffs.e > 0) {
            ghosts.forEach((g) => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 300) {
                    if (g.isMiniBoss || g.isSubBoss) {
                        // Gây sát thương theo % máu mỗi 10 frame cho Boss
                        if (state.frameCount % 10 === 0) {
                            g.hp -= g.maxHp * 0.05;
                            g.isStunned = Math.max(g.isStunned, 10);
                        }
                    } else {
                        // Giết lập tức quái thường
                        g.hp = 0;
                    }
                }
            });
            if (boss && dist(player.x, player.y, boss.x, boss.y) < 300 + boss.radius) {
                if (state.frameCount % 15 === 0) boss.hp -= 2;
            }
        }

        // Logic xử lý bẫy của Hunter (Traps)
        if (state.hunterTraps) {
            for (let i = state.hunterTraps.length - 1; i >= 0; i--) {
                let trap = state.hunterTraps[i];
                let triggered = false;

                ghosts.forEach((g) => {
                    if (!triggered && g.x > 0 && dist(trap.x, trap.y, g.x, g.y) < 40) {
                        g.isStunned = 180; // Choáng rất lâu
                        g.hp -= 2;
                        triggered = true;
                    }
                });

                if (triggered) state.hunterTraps.splice(i, 1);
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ vùng kỹ năng E
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 300, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 100, 0, 0.6)";
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "rgba(255, 100, 0, 0.05)";
            ctx.fill();
        }

        // Vẽ bẫy của Hunter
        if (state.hunterTraps) {
            state.hunterTraps.forEach((trap) => {
                ctx.beginPath();
                ctx.arc(trap.x, trap.y, 15, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(139, 69, 19, 0.8)";
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 4;
                ctx.stroke();
                ctx.setLineDash([]);
            });
        }
    }
};