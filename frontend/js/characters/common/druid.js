import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

export const druid = {
    id: "druid",

    onTrigger: (key, state, canvas, changeStateFn) => {
        // Q: Triệu hồi 3 Quả Cầu Tự Nhiên xoay quanh người
        if (key === "q") {
            state.activeBuffs.q = 8 * FPS;
            if (!state.druidOrbs) state.druidOrbs = [];
            for (let i = 0; i < 3; i++) {
                state.druidOrbs.push({ angle: (i * Math.PI * 2) / 3, radius: 60 });
            }
        }

        // E: Tốc Hành Rừng Sâu (Tăng 30% tốc chạy)
        if (key === "e") {
            state.activeBuffs.e = 5 * FPS;
        }

        // R: Mầm Sống Lan Tỏa (Tự động tách đạn làm 3)
        if (key === "r") {
            state.activeBuffs.r = 6 * FPS;
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, bullets } = state;

        // Logic E: Tăng tốc
        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;
        }

        // Logic Q: Điều khiển Quả cầu xoay và Sát thương
        if (state.activeBuffs.q > 0 && state.druidOrbs) {
            state.druidOrbs.forEach(o => {
                o.angle += 0.05;
                o.x = player.x + Math.cos(o.angle) * o.radius;
                o.y = player.y + Math.sin(o.angle) * o.radius;

                ghosts.forEach(g => {
                    if (g.x > 0 && dist(o.x, o.y, g.x, g.y) < g.radius + 8) {
                        g.isStunned = Math.max(g.isStunned, 20); // Choáng nhẹ liên tục
                        g.hp -= 0.15; // Rút máu
                    }
                });

                if (boss && dist(o.x, o.y, boss.x, boss.y) < boss.radius + 8) {
                    boss.hp -= 0.05;
                }
            });
        } else {
            state.druidOrbs = null; // Xóa orb khi hết thời gian
        }

        // Logic R: Tách Đạn (Phân chia đạn mới bay ra thành 3 tia)
        if (state.activeBuffs.r > 0) {
            let newLen = bullets.length;
            for (let i = 0; i < newLen; i++) {
                let b = bullets[i];
                // Chỉ tách những viên đạn người chơi bắn ra và chưa bị tách bao giờ
                if (b.isSplit || !b.isPlayer || b.life < b.maxLife - 3) continue;

                // Tạo thêm 2 viên đạn tỏa ra 2 bên
                for (let j = -1; j <= 1; j += 2) {
                    let angle = Math.atan2(b.vy, b.vx) + j * 0.4;
                    spawnBullet(b.x, b.y, b.x + Math.cos(angle) * 100, b.y + Math.sin(angle) * 100, true);
                    let newB = bullets[bullets.length - 1];
                    newB.isSplit = true;
                    newB.damage = (b.damage || 1) * 0.6; // Đạn tách bị giảm một chút sát thương
                    newB.color = "#00ff88"; // Đổi màu đạn tách thành xanh lá
                }
                b.isSplit = true;
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Vẽ Orbs (Q)
        if (state.druidOrbs && buffs.q > 0) {
            state.druidOrbs.forEach(o => {
                ctx.beginPath();
                ctx.arc(o.x, o.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = "#00ff88";
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#00ff88";
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        }

        // Phủ xanh màn hình (R)
        if (buffs.r > 0) {
            ctx.fillStyle = "rgba(0, 255, 100, 0.08)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Hào quang (E)
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 100, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
};