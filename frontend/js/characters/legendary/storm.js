import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const storm = {
    id: "storm",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Tia Sét Liên Hoàn (Chain Lightning)
        if (key === "q") {
            state.activeBuffs.q = 15; // Hiển thị tia chớp trong 15 frame
            state.stormChain = { origin: { x: player.x, y: player.y }, targets: [], life: 15 };

            let current = player;
            let hitGhosts = []; // Lưu các quái đã giật để không giật lại

            // Nảy tối đa 5 mục tiêu
            for (let i = 0; i < 5; i++) {
                let nearest = null, minDist = 400; // Tầm tìm quái nảy: 400px

                state.ghosts.forEach(g => {
                    if (!hitGhosts.includes(g) && g.hp > 0 && dist(current.x, current.y, g.x, g.y) < minDist) {
                        minDist = dist(current.x, current.y, g.x, g.y);
                        nearest = g;
                    }
                });

                if (nearest) {
                    hitGhosts.push(nearest);
                    nearest.hp -= 8;
                    nearest.isStunned = 60;
                    state.stormChain.targets.push({ x: nearest.x, y: nearest.y });
                    current = nearest; // Lấy mục tiêu này làm gốc cho lần nảy tiếp theo
                } else {
                    break; // Không tìm thấy quái gần nữa thì dừng nảy
                }
            }
        }

        // E: Lướt Sấm Sét - Đặt Bẫy Bão
        if (key === "e") {
            const dx = mouse.x - player.x, dy = mouse.y - player.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            player.dashTimeLeft = 20;
            player.dashDx = dx / (len || 1);
            player.dashDy = dy / (len || 1);
            state.activeBuffs.e = 20; // Trùng với thời gian dash để sinh bẫy
        }

        // R: Cơn Bão Tối Thượng - Bão Sét đánh diện rộng
        if (key === "r") {
            state.activeBuffs.r = 8 * FPS;
            state.screenShake = { timer: 20, intensity: 6 };
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, frameCount } = state;

        // Logic E: Thả bẫy bão trong lúc Lướt
        if (state.activeBuffs.e > 0 && frameCount % 4 === 0) {
            if (!state.stormTraps) state.stormTraps = [];
            state.stormTraps.push({ x: player.x, y: player.y, life: 4 * FPS });
        }

        // Logic Bẫy Bão
        if (state.stormTraps) {
            state.stormTraps.forEach(t => {
                t.life--;
                ghosts.forEach(g => {
                    if (dist(t.x, t.y, g.x, g.y) < 45) {
                        g.hp -= 0.5;
                        g.isStunned = Math.max(g.isStunned, 30);
                    }
                });
            });
            state.stormTraps = state.stormTraps.filter(t => t.life > 0);
        }

        // Logic R: Gọi sấm sét liên tục
        if (state.activeBuffs.r > 0 && frameCount % 8 === 0) {
            for (let i = 0; i < 3; i++) { // Rơi 3 tia sét cùng lúc
                let lx = player.x + (Math.random() - 0.5) * 1200;
                let ly = player.y + (Math.random() - 0.5) * 900;

                if (!state.stormLightnings) state.stormLightnings = [];
                state.stormLightnings.push({ x: lx, y: ly, life: 12, color: "#00ffff" });

                ghosts.forEach(g => {
                    if (dist(lx, ly, g.x, g.y) < 130) { g.hp -= 6; g.isStunned = 60; }
                });
                if (boss && dist(lx, ly, boss.x, boss.y) < 130 + boss.radius) boss.hp -= 10;
            }
        }

        // Giảm time hiển thị Tia chớp liên hoàn
        if (state.stormChain) {
            state.stormChain.life--;
            if (state.stormChain.life <= 0) state.stormChain = null;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        // Vẽ Sét Liên Hoàn (Q)
        if (state.stormChain) {
            const { origin, targets } = state.stormChain;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);

            // Tạo hiệu ứng giật gãy cho tia sét
            targets.forEach(t => {
                ctx.lineTo(t.x + (Math.random() - 0.5) * 15, t.y + (Math.random() - 0.5) * 15);
            });

            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 6;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "cyan";
            ctx.stroke();
            ctx.restore();
        }

        // Vẽ Bẫy Bão (E)
        state.stormTraps?.forEach(t => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
            // Hiệu ứng chớp nháy
            ctx.fillStyle = state.frameCount % 10 < 5 ? "rgba(0, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.7)";
            ctx.fill();
        });

        // Màn hình nhấp nháy bão (R)
        if (buffs.r > 0) {
            if (state.frameCount % 20 < 5) {
                ctx.fillStyle = "rgba(0, 255, 255, 0.15)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }
};