import { dist } from "../utils.js";
import { spawnBullet } from "../entities.js";

export const creator = {
    id: "creator",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Quản lý Trụ ánh sáng (Turrets)
        if (state.creatorTurrets) {
            state.creatorTurrets = state.creatorTurrets.filter((t) => {
                t.life--;
                t.fireCD--;
                if (t.fireCD <= 0) {
                    // Tự động ngắm vào mục tiêu gần nhất
                    let targetX = boss ? boss.x : player.x + 100;
                    let targetY = boss ? boss.y : player.y;

                    if (!boss && ghosts.length > 0) {
                        let nearest = null;
                        let nd = Infinity;
                        ghosts.forEach((g) => {
                            let d = dist(t.x, t.y, g.x, g.y);
                            if (d < nd) {
                                nd = d;
                                nearest = g;
                            }
                        });
                        if (nearest) {
                            targetX = nearest.x;
                            targetY = nearest.y;
                        }
                    }

                    spawnBullet(t.x, t.y, targetX, targetY, true, 2, "player");
                    t.fireCD = 30; // 0.5s bắn 1 lần
                }
                return t.life > 0;
            });
        }

        // Vùng thánh đức (Holy Zone)
        if (state.creatorHolyZone) {
            state.creatorHolyZone.life--;
            const zone = state.creatorHolyZone;

            // Làm chậm đạn địch khi bay qua vùng này
            state.bullets.forEach((b) => {
                if (!b.isPlayer && dist(b.x, b.y, zone.x, zone.y) < zone.radius) {
                    b.vx *= 0.3;
                    b.vy *= 0.3;
                }
            });

            if (zone.life <= 0) state.creatorHolyZone = null;
        }

        // Quả cầu hộ mệnh (Orbs)
        if (state.creatorOrbs) {
            state.creatorOrbs = state.creatorOrbs.filter((orb) => {
                orb.life--;
                orb.angle += 0.03;
                orb.fireCD--;

                if (orb.fireCD <= 0) {
                    let target = boss;
                    if (!target || target.hp <= 0) {
                        let nd = Infinity;
                        ghosts.forEach((g) => {
                            let d = dist(player.x, player.y, g.x, g.y);
                            if (d < nd) {
                                nd = d;
                                target = g;
                            }
                        });
                    }

                    if (target) {
                        const ox = player.x + Math.cos(orb.angle) * orb.orbitRadius;
                        const oy = player.y + Math.sin(orb.angle) * orb.orbitRadius;
                        spawnBullet(ox, oy, target.x, target.y, true, 3, "player");
                        orb.fireCD = 40;
                    }
                }
                return orb.life > 0;
            });

            // Nếu hết orb thì mất khả năng bảo hiểm tử vong
            if (state.creatorOrbs.length === 0) {
                state.creatorDeathSave = false;
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Trụ ánh sáng
        if (state.creatorTurrets) {
            state.creatorTurrets.forEach((t) => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 220, 100, 0.8)";
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#ffdd00";
                ctx.fill();
                ctx.shadowBlur = 0;

                // Vẽ dây kết nối với người chơi
                ctx.beginPath();
                ctx.moveTo(player.x, player.y);
                ctx.lineTo(t.x, t.y);
                ctx.strokeStyle = "rgba(255, 220, 100, 0.15)";
                ctx.lineWidth = 1;
                ctx.stroke();
            });
        }

        // Vẽ Vùng thánh đức
        if (state.creatorHolyZone) {
            const z = state.creatorHolyZone;
            const alpha = Math.min(1, z.life / 60);
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.1})`;
            ctx.strokeStyle = `rgba(255, 220, 100, ${alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
        }

        // Vẽ Quả cầu hộ mệnh
        if (state.creatorOrbs) {
            state.creatorOrbs.forEach((orb) => {
                const ox = player.x + Math.cos(orb.angle) * orb.orbitRadius;
                const oy = player.y + Math.sin(orb.angle) * orb.orbitRadius;
                ctx.beginPath();
                ctx.arc(ox, oy, 8, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffaa";
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#ffdd00";
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        }
    },
};