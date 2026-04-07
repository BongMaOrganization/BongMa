import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

export const summoner = {
    id: "summoner",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Cổng Phép Thuật - Triệu hồi các ụ súng ma thuật tại vị trí chuột
        if (key === "q") {
            if (!state.summonerPortals) state.summonerPortals = [];
            state.summonerPortals.push({
                x: mouse.x,
                y: mouse.y,
                life: 8 * FPS,
                fireCD: 0
            });
            state.activeBuffs.q = 15; // Animation chớp sáng
        }

        // E: Khuếch Đại Ma Pháp - Tăng số lượng tia đạn bắn ra lên cực cao
        if (key === "e") {
            state.activeBuffs.e = 6 * FPS;
        }

        // R: Bão Đạn Càn Quét (Bullet Hell) - Xoay và bắn đạn 360 độ liên tục
        if (key === "r") {
            state.activeBuffs.r = 6 * FPS;
            state.screenShake = { timer: 20, intensity: 4 };
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, frameCount } = state;

        // Logic Q: Cổng Phép Thuật tự động bắn
        if (state.summonerPortals) {
            state.summonerPortals.forEach(p => {
                p.life--;
                p.fireCD--;
                if (p.fireCD <= 0) {
                    // Tìm mục tiêu gần cổng nhất
                    let nearest = null, minDist = 400;
                    ghosts.forEach(g => {
                        if (g.hp > 0 && dist(p.x, p.y, g.x, g.y) < minDist) {
                            minDist = dist(p.x, p.y, g.x, g.y);
                            nearest = g;
                        }
                    });

                    if (boss && dist(p.x, p.y, boss.x, boss.y) < 400) nearest = boss;

                    if (nearest) {
                        spawnBullet(p.x, p.y, nearest.x, nearest.y, true, 1.5, "player");
                        p.fireCD = 20; // Tốc độ bắn của cổng
                    }
                }
            });
            state.summonerPortals = state.summonerPortals.filter(p => p.life > 0);
        }

        // Logic E: Tăng MultiShot
        if (state.activeBuffs.e > 0) {
            state.playerMultiShotModifier = (state.playerMultiShotModifier || player.multiShot || 1) + 4; // Bắn thêm 4 tia
        }

        // Logic R: Bullet Hell (Xoắn ốc)
        if (state.activeBuffs.r > 0 && frameCount % 3 === 0) {
            // 6 tia đạn xoay vòng liên tục
            const angleOffset = frameCount * 0.15;
            for (let i = 0; i < 6; i++) {
                let angle = angleOffset + (i * Math.PI * 2) / 6;
                spawnBullet(
                    player.x,
                    player.y,
                    player.x + Math.cos(angle) * 100,
                    player.y + Math.sin(angle) * 100,
                    true
                );
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;

        // Vẽ Cổng Phép Thuật (Q)
        state.summonerPortals?.forEach(p => {
            ctx.save();
            const pulse = Math.sin(frameCount * 0.1) * 5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 15 + pulse, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(180, 0, 255, 0.4)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(p.x, p.y, 10 + pulse * 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = "#b400ff";
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#b400ff";
            ctx.stroke();
            ctx.restore();
        });

        // Hiệu ứng Aura (E)
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Màn hình mờ tím khi gồng R
        if (buffs.r > 0) {
            ctx.fillStyle = "rgba(180, 0, 255, 0.15)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Vòng sáng ma pháp dưới chân
            ctx.beginPath();
            ctx.arc(player.x, player.y, 60, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 0, 255, 0.5)";
            ctx.lineWidth = 5;
            ctx.stroke();
        }
    }
};