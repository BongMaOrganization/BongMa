import { dist } from "../utils.js";

export const reaper = {
    id: "reaper",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Kỹ năng E: Tăng tốc độ di chuyển
        if (buffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.5;
        }

        // Kỹ năng R: Tuyệt kỹ trảm - Tiêu diệt quái thường ngay lập tức (Nuke)
        // Chỉ kích hoạt tại frame đầu tiên của buffs.r
        if (buffs.r === 1) {
            ghosts.forEach((g) => {
                if (g.x > 0) {
                    if (g.isMiniBoss || g.isSubBoss) {
                        // Boss/Elite chỉ mất 25% máu
                        g.shield = 0;
                        g.shieldActive = false;
                        g.hp -= g.maxHp * 0.25;
                        g.isStunned = Math.max(g.isStunned, 120);
                    } else {
                        g.hp = 0; // Quái thường chết luôn
                    }
                }
            });

            if (boss) boss.hp -= boss.maxHp * 0.25;

            // Hiệu ứng nổ đen toàn màn hình
            if (!state.explosions) state.explosions = [];
            state.explosions.push({
                x: state.world.width / 2,
                y: state.world.height / 2,
                radius: 2000,
                life: 20,
                color: "rgba(0, 0, 0, 0.8)",
            });
        }

        // Làm choáng quái gần người khi R hoạt động
        if (buffs.r > 0) {
            ghosts.forEach((g) => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 180) {
                    g.isStunned = Math.max(g.isStunned, 60);
                }
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ hiệu ứng Trảm (Q/E)
        if (buffs.q > 0 && state.reaperSlash) {
            let s = state.reaperSlash;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 150, s.angle - Math.PI / 2, s.angle + Math.PI / 2);
            ctx.strokeStyle = `rgba(255, 0, 0, ${buffs.q / 15})`;
            ctx.lineWidth = 30;
            ctx.stroke();
        }

        // Vẽ Aura của R
        if (buffs.r > 0) {
            // Vòng tròn đỏ mờ báo hiệu phạm vi sát thương
            ctx.beginPath();
            ctx.arc(player.x, player.y, 300, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 0, 0, ${(1 - buffs.r / (2 * 60)) * 0.3})`;
            ctx.fill();

            // Filter màn hình đỏ
            ctx.fillStyle = "rgba(255, 0, 0, 0.18)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};