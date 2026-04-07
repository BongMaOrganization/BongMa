import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

export const necromancer = {
    id: "necromancer",

    /**
     * onTrigger: Nơi nhận lệnh từ skills.js khi bạn bấm phím
     */
    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Khởi tạo hệ thống Linh Hồn nếu chưa có
        if (state.necroSouls === undefined) state.necroSouls = 0;

        // Q: Triệu hồi đệ tử xoay quanh (Orbit)
        if (key === "q") {
            if (!state.necroMinions) state.necroMinions = [];

            // Số lượng đệ tử tỷ lệ với số linh hồn đang có
            const summonCount = Math.min(4 + Math.floor(state.necroSouls / 10), 8);

            // Xóa đệ tử orbit cũ để triệu hồi mới
            state.necroMinions = state.necroMinions.filter(m => m.type !== "orbit");

            for (let i = 0; i < summonCount; i++) {
                state.necroMinions.push({
                    x: player.x,
                    y: player.y,
                    life: 15 * FPS,
                    type: "orbit",
                    angle: (i * Math.PI * 2) / summonCount,
                    radius: 60,
                    speed: 0.05
                });
            }
            state.necroSouls = Math.max(0, state.necroSouls - 2);
        }

        // E: Kích nổ xác (Explosions)
        if (key === "e") {
            if (!state.necroExplosions) state.necroExplosions = [];

            if (state.necroMinions && state.necroMinions.length > 0) {
                state.necroMinions.forEach(m => {
                    state.necroExplosions.push({ x: m.x, y: m.y, life: 20 });

                    // Gây sát thương và làm choáng quái quanh đệ tử
                    state.ghosts.forEach(g => {
                        if (g.hp > 0 && dist(m.x, m.y, g.x, g.y) < 120) {
                            g.hp -= 5;
                            g.isStunned = 60;
                            g.necroMarked = true; // Đánh dấu để rơi linh hồn
                        }
                    });
                });
                state.necroMinions = []; // Hy sinh đệ tử để nổ
            }
        }

        // R: Lãnh địa tử vong (Necro Zone)
        if (key === "r") {
            state.necroZone = {
                x: player.x,
                y: player.y,
                life: 12 * FPS,
                spawnTick: 0
            };
            state.activeBuffs.r = 12 * FPS;
        }

        return true;
    },

    /**
     * update: Xử lý di chuyển đệ tử và nhặt linh hồn
     */
    update: (state) => {
        const { player, ghosts, boss, frameCount } = state;
        if (state.necroSouls === undefined) state.necroSouls = 0;

        // Logic thu thập linh hồn khi quái chết
        ghosts.forEach(g => {
            if (g.hp <= 0 && !g.soulCollected) {
                if (dist(player.x, player.y, g.x, g.y) < 400) {
                    state.necroSouls++;
                    g.soulCollected = true;
                }
            }
        });

        // Quản lý Đệ tử (Minions)
        if (state.necroMinions) {
            state.necroMinions.forEach((m) => {
                m.life--;

                // Loại Orbit: Xoay quanh người chơi
                if (m.type === "orbit") {
                    m.angle += 0.05;
                    m.x = player.x + Math.cos(m.angle) * m.radius;
                    m.y = player.y + Math.sin(m.angle) * m.radius;
                }

                // Loại Seeker: Tự tìm mục tiêu
                if (m.type === "seeker") {
                    let target = boss || ghosts.find(g => g.x > 0 && g.hp > 0 && dist(m.x, m.y, g.x, g.y) < 600);
                    if (target) {
                        let dx = target.x - m.x, dy = target.y - m.y;
                        let len = Math.hypot(dx, dy) || 1;
                        m.x += (dx / len) * 4;
                        m.y += (dy / len) * 4;

                        if (len < 15) {
                            target.hp -= 2;
                            m.life = 0;
                        }
                    }
                }
            });
            state.necroMinions = state.necroMinions.filter((m) => m.life > 0);
        }

        // Vùng triệu hồi (Necro Zone)
        if (state.necroZone) {
            let z = state.necroZone;
            z.life--;
            z.spawnTick++;

            // Triệu hồi seeker mỗi 20 frame
            if (z.spawnTick % 20 === 0) {
                if (!state.necroMinions) state.necroMinions = [];
                state.necroMinions.push({
                    x: z.x + (Math.random() - 0.5) * 100,
                    y: z.y + (Math.random() - 0.5) * 100,
                    life: 120,
                    type: "seeker",
                });
            }
            if (z.life <= 0) state.necroZone = null;
        }

        // Hiệu ứng nổ xác
        if (state.necroExplosions) {
            state.necroExplosions.forEach((e) => e.life--);
            state.necroExplosions = state.necroExplosions.filter((e) => e.life > 0);
        }
    },

    /**
     * draw: Vẽ đệ tử và hiệu ứng
     */
    draw: (state, ctx, canvas, buffs) => {
        const { player, necroMinions, necroZone, necroExplosions, necroSouls } = state;

        // Vẽ Đệ tử
        necroMinions?.forEach((m) => {
            ctx.beginPath();
            ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = m.type === "orbit" ? "#bb66ff" : "#6600aa";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#aa00ff";
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Vẽ Vùng triệu hồi
        if (necroZone) {
            ctx.beginPath();
            ctx.arc(necroZone.x, necroZone.y, 120, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(150,0,200,0.6)";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = "rgba(150,0,200,0.08)";
            ctx.fill();
        }

        // Vẽ Hiệu ứng nổ
        necroExplosions?.forEach((e) => {
            let t = e.life / 20;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 100 * (1 - t), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(180,0,255,${t})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        });

        // Hiển thị số linh hồn tích lũy trên đầu player
        if (necroSouls > 0) {
            ctx.fillStyle = "#d488ff";
            ctx.font = "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`SOULS: ${necroSouls}`, player.x, player.y - 40);
        }
    },
};