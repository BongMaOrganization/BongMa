import { dist } from "../utils.js";

export const storm = {
    id: "storm",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Kỹ năng E: Đặt bẫy bão khi lướt (Dash)
        if (player.dashTimeLeft > 0 && buffs.e > 0) {
            if (state.frameCount % 3 === 0) {
                if (!state.stormTraps) state.stormTraps = [];
                state.stormTraps.push({ x: player.x, y: player.y, life: 60 });
            }
        }

        // Cập nhật logic Bẫy bão
        if (state.stormTraps) {
            for (let i = state.stormTraps.length - 1; i >= 0; i--) {
                let t = state.stormTraps[i];
                t.life--;
                ghosts.forEach((g) => {
                    if (g.x > 0 && dist(t.x, t.y, g.x, g.y) < 30) {
                        g.hp -= 1;
                        g.isStunned = Math.max(g.isStunned, 45);
                    }
                });
                if (t.life <= 0) state.stormTraps.splice(i, 1);
            }
        }

        // Kỹ năng R: Mưa sét giật liên tục
        if (buffs.r > 0) {
            if (state.frameCount % 10 === 0) {
                if (!state.stormLightnings) state.stormLightnings = [];
                // Tạo 3 tia sét ngẫu nhiên quanh người chơi
                for (let i = 0; i < 3; i++) {
                    let lx = player.x + (Math.random() - 0.5) * 800;
                    let ly = player.y + (Math.random() - 0.5) * 800;
                    state.stormLightnings.push({ x: lx, y: ly, life: 15 });

                    ghosts.forEach((g) => {
                        if (g.x > 0 && dist(lx, ly, g.x, g.y) < 100) {
                            g.hp -= 5;
                            g.isStunned = Math.max(g.isStunned, 60);
                        }
                    });

                    if (boss && dist(lx, ly, boss.x, boss.y) < 100 + boss.radius) {
                        boss.hp -= 10;
                    }
                }
            }

            // Làm choáng mọi quái vật định kỳ khi R đang hoạt động
            if (state.frameCount % 10 === 0) {
                ghosts.forEach((g) => (g.isStunned = Math.max(g.isStunned, 60)));
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        // Vẽ Tia sét (Lightning)
        if (state.stormLightnings) {
            state.stormLightnings.forEach((l) => {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(l.x, l.y - 1000);
                ctx.lineTo(l.x + (Math.random() - 0.5) * 50, l.y - 500);
                ctx.lineTo(l.x + (Math.random() - 0.5) * 50, l.y);
                ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";
                ctx.lineWidth = 6;
                ctx.shadowBlur = 15;
                ctx.shadowColor = "cyan";
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(l.x, l.y, 100, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
                ctx.fill();
                ctx.restore();
            });
        }

        // Vẽ Bẫy bão (Traps)
        if (state.stormTraps) {
            state.stormTraps.forEach((t) => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
                ctx.fillStyle = state.frameCount % 10 < 5 ? "rgba(0,255,255,0.8)" : "rgba(255,255,255,0.8)";
                ctx.fill();
            });
        }

        // Filter màn hình màu vàng nhẹ khi bật R
        if (buffs.r > 0) {
            ctx.fillStyle = "rgba(255, 255, 0, 0.12)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};