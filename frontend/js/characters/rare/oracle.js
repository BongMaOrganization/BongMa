import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const oracle = {
    id: "oracle",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Radar Tầm Nhìn
        if (key === "q") {
            state.activeBuffs.q = 3 * FPS;
        }

        // E: Dịch Chuyển Tức Thời (Để lại ảo ảnh)
        if (key === "e") {
            const mx = Math.max(player.radius, Math.min(canvas.width - player.radius, mouse.x));
            const my = Math.max(player.radius, Math.min(canvas.height - player.radius, mouse.y));

            if (!state.phantoms) state.phantoms = [];
            state.phantoms.push({
                x: player.x,
                y: player.y,
                life: 2 * FPS,
                color: player.color,
                radius: player.radius,
            });
            player.x = mx;
            player.y = my;
        }

        // R: Đạn Tự Tìm Mục Tiêu
        if (key === "r") {
            state.activeBuffs.r = 4 * FPS;
        }
        return true;
    },

    update: (state, ctx, canvas, buffs) => {
        const { player, boss, ghosts, bullets } = state;

        // Xử lý Ảo ảnh
        if (state.phantoms) {
            for (let i = state.phantoms.length - 1; i >= 0; i--) {
                state.phantoms[i].life--;
                if (state.phantoms[i].life <= 0) state.phantoms.splice(i, 1);
            }
        }

        // Xử lý Đạn đuổi (Homing)
        if (buffs.r > 0 && state.frameCount % 2 === 0) {
            bullets.forEach((b) => {
                if (b.isPlayer) {
                    let nearestDist = 400;
                    let target = null;
                    if (boss && dist(b.x, b.y, boss.x, boss.y) < nearestDist) {
                        target = boss;
                    }
                    ghosts.forEach(g => {
                        const d = dist(b.x, b.y, g.x, g.y);
                        if (g.x > 0 && d < nearestDist) { nearestDist = d; target = g; }
                    });

                    if (target) {
                        const angle = Math.atan2(target.y - b.y, target.x - b.x);
                        const curAngle = Math.atan2(b.vy, b.vx);
                        let diff = angle - curAngle;
                        while (diff > Math.PI) diff -= Math.PI * 2;
                        while (diff < -Math.PI) diff += Math.PI * 2;

                        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                        const nextAngle = curAngle + diff * 0.2;
                        b.vx = Math.cos(nextAngle) * speed;
                        b.vy = Math.sin(nextAngle) * speed;
                    }
                }
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Vẽ Radar Q
        if (buffs.q > 0) {
            ctx.fillStyle = "rgba(255, 200, 0, 0.08)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Vẽ Ảo ảnh E
        if (state.phantoms) {
            state.phantoms.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.life / (2 * FPS);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                ctx.strokeStyle = "white";
                ctx.stroke();
                ctx.restore();
            });
        }

        // Vòng định vị R
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 100, 255, 0.8)";
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
};