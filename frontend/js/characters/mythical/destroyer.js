import { dist } from "../utils.js";

export const destroyer = {
    id: "destroyer",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, boss, bullets } = state;

        // Kỹ năng Q/E: Vết nứt không gian (Rifts)
        if (state.destroyerRifts) {
            state.destroyerRifts = state.destroyerRifts.filter((r) => {
                r.life--;
                // Gây sát thương theo thời gian lên Boss nếu nằm trong vết nứt
                if (boss && r.life % 30 === 0) {
                    const bx = boss.x, by = boss.y;
                    const dx = bx - r.x, dy = by - r.y;
                    const angle = r.angle;
                    const len = dist(r.x, r.y, r.endX, r.endY);
                    const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
                    const perpDist = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
                    if (proj > 0 && proj < len && perpDist < 50) {
                        boss.hp -= 2;
                    }
                }
                return r.life > 0;
            });
        }

        // Kỹ năng Hút nội năng (Absorb Buff)
        if (state.destroyerAbsorbBuff) {
            state.destroyerAbsorbBuff.life--;
            if (state.destroyerAbsorbBuff.life <= 0) {
                // Trả lại chỉ số gốc khi hết buff
                player.multiShot -= state.destroyerAbsorbBuff.shots || 0;
                state.destroyerAbsorbBuff = null;
            }
        }

        // Kỹ năng R: Tuyệt kỹ Hủy Diệt (Phản đạn + Sát thương vùng)
        if (state.destroyerUlt) {
            state.destroyerUlt.life--;
            const radius = state.destroyerUlt.radius;

            // Chuyển hóa đạn địch thành đạn ta
            bullets.forEach((b) => {
                if (!b.isPlayer && dist(b.x, b.y, player.x, player.y) < radius) {
                    b.isPlayer = true;
                    b.vx *= -1;
                    b.vy *= -1;
                }
            });

            // Gây sát thương liên tục lên Boss xung quanh
            if (boss && state.destroyerUlt.life % 15 === 0) {
                if (dist(player.x, player.y, boss.x, boss.y) < radius + boss.radius) {
                    boss.hp -= 3;
                }
            }

            if (state.destroyerUlt.life <= 0) state.destroyerUlt = null;
        }

        // Tăng tốc độ khi bật R
        if (buffs.r > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Vết nứt
        if (state.destroyerRifts) {
            state.destroyerRifts.forEach((r) => {
                const alpha = Math.min(1, r.life / 60);
                ctx.strokeStyle = `rgba(255, 0, 80, ${alpha * 0.8})`;
                ctx.lineWidth = 8 + Math.sin(state.frameCount * 0.1) * 3;
                ctx.shadowBlur = 20;
                ctx.shadowColor = "#ff0055";
                ctx.beginPath();
                ctx.moveTo(r.x, r.y);
                ctx.lineTo(r.endX, r.endY);
                ctx.stroke();
                ctx.shadowBlur = 0;
            });
        }

        // Vẽ Hào quang Ultimate
        if (state.destroyerUlt) {
            const pulse = Math.sin(state.frameCount * 0.15) * 15;
            const radius = state.destroyerUlt.radius + pulse;
            ctx.beginPath();
            ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 0, 80, 0.6)`;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 30;
            ctx.shadowColor = "#ff0055";
            ctx.stroke();
            ctx.fillStyle = `rgba(255, 0, 80, 0.08)`;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Hiệu ứng E (nếu có)
        if (player.characterId === "destroyer" && buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 0, 80, 0.5)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    },
};