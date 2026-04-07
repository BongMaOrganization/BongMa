import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

export const engineer = {
    id: "engineer",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Q: Triệu hồi Trụ Súng (Turret)
        if (key === "q") {
            if (!state.engineerTurrets) state.engineerTurrets = [];
            state.engineerTurrets.push({
                x: player.x,
                y: player.y,
                life: 12 * FPS, // Tồn tại 12 giây
                fireCD: 0
            });
        }

        // E: Kích Thích Thần Kinh - Tăng tốc chạy và xả đạn
        if (key === "e") {
            state.activeBuffs.e = 6 * FPS;
        }

        // R: Màng Chắn Từ Trường - Cản đạn và giật sét quái gần
        if (key === "r") {
            state.activeBuffs.r = 8 * FPS;
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, bullets } = state;

        // Logic E: Tăng tốc độ
        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.6;
        }

        // Logic Q: Trụ súng tự động tìm và bắn quái
        if (state.engineerTurrets) {
            state.engineerTurrets.forEach((t) => {
                t.life--;
                t.fireCD--;

                if (t.fireCD <= 0) {
                    let target = boss || ghosts.find(g => g.x > 0 && g.hp > 0 && dist(t.x, t.y, g.x, g.y) < 400);
                    if (target) {
                        spawnBullet(t.x, t.y, target.x, target.y, true, 1.2, "player"); // Đạn trụ bắn ra
                        t.fireCD = 25; // 0.4s bắn 1 lần
                    }
                }
            });
            state.engineerTurrets = state.engineerTurrets.filter((t) => t.life > 0);
        }

        // Logic R: Màng chắn đẩy lùi và phá đạn
        if (state.activeBuffs.r > 0) {
            // Sát thương và làm choáng quái xâm nhập vào vòng
            ghosts.forEach(g => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 120) {
                    g.hp -= 0.15;
                    g.isStunned = Math.max(g.isStunned, 10);
                }
            });

            // Phá đạn địch khi bay vào bán kính 120px
            state.bullets = bullets.filter(b => b.isPlayer || dist(player.x, player.y, b.x, b.y) > 120);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;

        // Vẽ Trụ Súng (Q)
        if (state.engineerTurrets) {
            state.engineerTurrets.forEach((t) => {
                ctx.beginPath();
                ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = "#00ccff";
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00ccff";
                ctx.fill();
                ctx.shadowBlur = 0;

                // Vẽ ăng-ten của trụ súng
                ctx.beginPath();
                ctx.moveTo(t.x, t.y);
                ctx.lineTo(t.x, t.y - 15);
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        // Vẽ Vòng Tròn Bảo Vệ Đứt Nét (R)
        if (buffs.r > 0) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(frameCount * 0.05); // Xoay vòng màng chắn

            ctx.beginPath();
            ctx.arc(0, 0, 120, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 200, 255, 0.7)";
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 15]);
            ctx.stroke();

            ctx.fillStyle = "rgba(0, 200, 255, 0.05)";
            ctx.fill();
            ctx.restore();
        }

        // Hiệu ứng tăng tốc chớp sáng (E)
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 200, 255, 0.4)";
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }
};