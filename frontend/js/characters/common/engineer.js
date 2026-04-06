import { dist } from "../utils.js";
import { spawnBullet } from "../entities.js";

export const engineer = {
    id: "engineer",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Kỹ năng E: Tăng tốc độ chạy và tăng tốc độ bắn
        if (buffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.6; // Giảm cooldown = bắn nhanh hơn
        }

        // Logic hoạt động của Trụ súng (Turrets)
        if (state.engineerTurrets) {
            state.engineerTurrets.forEach((t) => {
                t.life--;
                if ((state.frameCount || 0) % 20 === 0) {
                    let target = null;
                    let nearest = 9999;

                    if (boss) {
                        let d = dist(t.x, t.y, boss.x, boss.y);
                        if (d < nearest) {
                            nearest = d;
                            target = boss;
                        }
                    }

                    ghosts.forEach((g) => {
                        if (g.x > 0 && g.isStunned <= 0) {
                            let d = dist(t.x, t.y, g.x, g.y);
                            if (d < nearest) {
                                nearest = d;
                                target = g;
                            }
                        }
                    });

                    if (target) {
                        spawnBullet(t.x, t.y, target.x, target.y, true);
                    }
                }
            });
            state.engineerTurrets = state.engineerTurrets.filter((t) => t.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Trụ Súng (Turrets)
        if (state.engineerTurrets) {
            state.engineerTurrets.forEach((t) => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = "#00ccff";
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00ccff";
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        }

        // Kỹ năng R: Vòng tròn bảo vệ/Aura đứt nét
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 120, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 200, 255, 0.6)";
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
};