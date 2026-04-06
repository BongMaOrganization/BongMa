import { dist } from "../utils.js";

export const necromancer = {
    id: "necromancer",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Quản lý Đệ tử (Minions)
        if (state.necroMinions) {
            state.necroMinions.forEach((m) => {
                m.life--;

                // Đệ tử xoay quanh (Orbit)
                if (m.type === "orbit") {
                    m.angle += 0.05;
                    m.x = player.x + Math.cos(m.angle) * m.radius;
                    m.y = player.y + Math.sin(m.angle) * m.radius;
                }

                // Đệ tử tự tìm mục tiêu (Seeker - Hell Spawn)
                if (m.type === "seeker") {
                    let target = null;
                    let nearest = Infinity;

                    ghosts.forEach((g) => {
                        if (g.x > 0) {
                            let d = dist(m.x, m.y, g.x, g.y);
                            if (d < nearest) {
                                nearest = d;
                                target = g;
                            }
                        }
                    });

                    if (boss) {
                        let d = dist(m.x, m.y, boss.x, boss.y);
                        if (d < nearest) target = boss;
                    }

                    if (target) {
                        let dx = target.x - m.x;
                        let dy = target.y - m.y;
                        let len = Math.hypot(dx, dy) || 1;

                        m.x += (dx / len) * 2;
                        m.y += (dy / len) * 2;

                        if (len < 12) {
                            m.life = 0; // Biến mất khi chạm mục tiêu
                            // Có thể thêm sát thương nổ ở đây nếu muốn
                        }
                    }
                }
            });
            state.necroMinions = state.necroMinions.filter((m) => m.life > 0);
        }

        // Vùng triệu hồi (Necro Zone)
        if (state.necroZone) {
            let z = state.necroZone;
            z.life--;
            z.spawnTick++;

            // Triệu hồi seeker mỗi 20 frame
            if (z.spawnTick % 20 === 0) {
                if (!state.necroMinions) state.necroMinions = [];
                state.necroMinions.push({
                    x: z.x + (Math.random() - 0.5) * 100,
                    y: z.y + (Math.random() - 0.5) * 100,
                    life: 120,
                    type: "seeker",
                });
            }
            if (z.life <= 0) state.necroZone = null;
        }

        // Hiệu ứng nổ xác (Explosions)
        if (state.necroExplosions) {
            state.necroExplosions.forEach((e) => e.life--);
            state.necroExplosions = state.necroExplosions.filter((e) => e.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        // Vẽ Đệ tử
        if (state.necroMinions) {
            state.necroMinions.forEach((m) => {
                ctx.beginPath();
                ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = m.type === "orbit" ? "#bb66ff" : "#6600aa";
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#aa00ff";
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        }

        // Vẽ Vùng triệu hồi
        if (state.necroZone) {
            let z = state.necroZone;
            ctx.beginPath();
            ctx.arc(z.x, z.y, 120, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(150,0,200,0.6)";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = "rgba(150,0,200,0.08)";
            ctx.fill();
        }

        // Vẽ Hiệu ứng nổ xác
        if (state.necroExplosions) {
            state.necroExplosions.forEach((e) => {
                let t = e.life / 15;
                ctx.beginPath();
                ctx.arc(e.x, e.y, 100 * (1 - t), 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(180,0,255,0.8)";
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(e.x, e.y, 50 * (1 - t), 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(255,0,255,0.5)";
                ctx.stroke();
            });
        }
    },
};