import { dist } from "../utils.js";
import { spawnBullet } from "../entities.js";

export const druid = {
    id: "druid",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss, bullets } = state;

        // Kỹ năng E: Tăng tốc chạy 1.3
        if (buffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;
        }

        // Kỹ năng Q: Các quả cầu xoay quanh người gây sát thương
        if (buffs.q > 0 && state.druidOrbs) {
            state.druidOrbs.forEach((o) => {
                o.angle += 0.05;
                o.x = player.x + Math.cos(o.angle) * o.radius;
                o.y = player.y + Math.sin(o.angle) * o.radius;

                ghosts.forEach((g) => {
                    if (g.x > 0 && dist(o.x, o.y, g.x, g.y) < g.radius + 6) {
                        g.isStunned = 30;
                        g.hp = (g.hp || 1) - 1;
                    }
                });

                if (boss && dist(o.x, o.y, boss.x, boss.y) < boss.radius + 6) {
                    boss.hp -= 0.2;
                }
            });
        }

        // Kỹ năng R: Đạn tự tách đôi
        if (buffs.r > 0) {
            let newLen = bullets.length;
            for (let i = 0; i < newLen; i++) {
                let b = bullets[i];
                if (b.isSplit || !b.isPlayer) continue;

                for (let j = -1; j <= 1; j += 2) {
                    let angle = Math.atan2(b.vy, b.vx) + j * 0.4;
                    spawnBullet(
                        b.x,
                        b.y,
                        b.x + Math.cos(angle) * 100,
                        b.y + Math.sin(angle) * 100,
                        true,
                    );
                    let newB = bullets[bullets.length - 1];
                    newB.isSplit = true;
                    newB.damage = 0.5;
                }
                b.isSplit = true;
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Orbs (Q)
        if (state.druidOrbs && buffs.q > 0) {
            state.druidOrbs.forEach((o) => {
                ctx.beginPath();
                ctx.arc(o.x, o.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = "#00ff88";
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00ff88";
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        }

        if (buffs.r > 0) {
            ctx.fillStyle = "rgba(0,255,100,0.08)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0,255,100,0.6)";
            ctx.stroke();
        }
    }
};