import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";
import { updateHealthUI } from "../../ui.js";

export const creator = {
    id: "creator",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;
        if (key === "q") {
            // Triệu hồi 4 trụ súng bảo vệ quanh vị trí hiện tại
            if (!state.creatorTurrets) state.creatorTurrets = [];
            const offsets = [{ dx: -80, dy: -80 }, { dx: 80, dy: -80 }, { dx: -80, dy: 80 }, { dx: 80, dy: 80 }];
            offsets.forEach(off => {
                state.creatorTurrets.push({ x: player.x + off.dx, y: player.y + off.dy, life: 8 * FPS, fireCD: 0 });
            });
        }
        if (key === "e") {
            // Hồi máu và tạo vùng Thánh Đức làm chậm đạn địch
            player.hp = Math.min(player.maxHp, player.hp + 2);
            updateHealthUI();
            state.creatorHolyZone = { x: player.x, y: player.y, life: 6 * FPS, radius: 150 };
        }
        if (key === "r") {
            // Triệu hồi 6 quả cầu hộ mệnh: Bắn đạn và hồi sinh nếu chết
            if (!state.creatorOrbs) state.creatorOrbs = [];
            for (let i = 0; i < 6; i++) {
                state.creatorOrbs.push({ angle: (i / 6) * Math.PI * 2, orbitRadius: 80, life: 12 * FPS, fireCD: 0 });
            }
            state.creatorDeathSave = true; // Kích hoạt bảo hiểm tử vong
            state.activeBuffs.r = 12 * FPS;
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, bullets } = state;

        // Logic Trụ súng (Turrets)
        if (state.creatorTurrets) {
            state.creatorTurrets = state.creatorTurrets.filter(t => {
                t.life--; t.fireCD--;
                if (t.fireCD <= 0) {
                    let target = boss || ghosts.find(g => g.x > 0 && dist(t.x, t.y, g.x, g.y) < 500);
                    if (target) {
                        spawnBullet(t.x, t.y, target.x, target.y, true, 2, "player");
                        t.fireCD = 30;
                    }
                }
                return t.life > 0;
            });
        }

        // Logic Vùng Thánh Đức (Holy Zone)
        if (state.creatorHolyZone) {
            state.creatorHolyZone.life--;
            bullets.forEach(b => {
                if (!b.isPlayer && dist(b.x, b.y, state.creatorHolyZone.x, state.creatorHolyZone.y) < state.creatorHolyZone.radius) {
                    b.vx *= 0.2; b.vy *= 0.2; // Làm chậm đạn địch cực mạnh
                }
            });
            if (state.creatorHolyZone.life <= 0) state.creatorHolyZone = null;
        }

        // Logic Quả cầu hộ mệnh (Orbs)
        if (state.creatorOrbs) {
            state.creatorOrbs = state.creatorOrbs.filter(orb => {
                orb.life--; orb.angle += 0.04; orb.fireCD--;
                const ox = player.x + Math.cos(orb.angle) * orb.orbitRadius;
                const oy = player.y + Math.sin(orb.angle) * orb.orbitRadius;

                if (orb.fireCD <= 0) {
                    let target = boss || ghosts.find(g => dist(ox, oy, g.x, g.y) < 400);
                    if (target) {
                        spawnBullet(ox, oy, target.x, target.y, true, 3, "player");
                        orb.fireCD = 45;
                    }
                }
                return orb.life > 0;
            });
            if (state.creatorOrbs.length === 0) state.creatorDeathSave = false;
        }
    },

    draw: (state, ctx) => {
        const { player } = state;
        // Vẽ Trụ súng
        state.creatorTurrets?.forEach(t => {
            ctx.beginPath(); ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 220, 100, 0.9)"; ctx.shadowBlur = 15; ctx.shadowColor = "#ffdd00";
            ctx.fill(); ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(t.x, t.y);
            ctx.strokeStyle = "rgba(255, 220, 100, 0.2)"; ctx.stroke();
        });
        // Vẽ Vùng Thánh
        if (state.creatorHolyZone) {
            ctx.beginPath(); ctx.arc(state.creatorHolyZone.x, state.creatorHolyZone.y, state.creatorHolyZone.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 200, 0.1)"; ctx.strokeStyle = "rgba(255, 220, 100, 0.4)"; ctx.fill(); ctx.stroke();
        }
        // Vẽ Orbs
        state.creatorOrbs?.forEach(orb => {
            const ox = player.x + Math.cos(orb.angle) * orb.orbitRadius;
            const oy = player.y + Math.sin(orb.angle) * orb.orbitRadius;
            ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffaa"; ctx.shadowBlur = 20; ctx.shadowColor = "#ffdd00"; ctx.fill(); ctx.shadowBlur = 0;
        });
    }
};