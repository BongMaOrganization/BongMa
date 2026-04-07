import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

// Khai báo là voidChar để tránh trùng keyword 'void' của JavaScript
export const voidChar = {
    id: "void",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Hố Đen Vũ Trụ (Hút quái vật vào tâm)
        if (key === "q") {
            if (!state.voidBlackholes) state.voidBlackholes = [];
            state.voidBlackholes.push({
                x: mouse.x,
                y: mouse.y,
                radius: 200,
                life: 5 * FPS
            });
        }

        // E: Bước Nhảy Không Gian (Blink & Gây sát thương tại vị trí cũ)
        if (key === "e") {
            // Để lại vụ nổ Void ở vị trí cũ
            if (!state.explosions) state.explosions = [];
            state.explosions.push({
                x: player.x,
                y: player.y,
                radius: 150,
                life: 20,
                color: "rgba(100, 0, 200, 0.8)"
            });

            // Sát thương vụ nổ E
            state.ghosts.forEach(g => {
                if (dist(player.x, player.y, g.x, g.y) < 150) { g.hp -= 5; g.isStunned = 60; }
            });

            // Dịch chuyển
            player.x = mouse.x;
            player.y = mouse.y;
            state.activeBuffs.e = 15; // Animation lóe sáng
        }

        // R: Tia Laser Hủy Diệt Cõi Hư Vô
        if (key === "r") {
            state.activeBuffs.r = 3 * FPS; // Kéo dài 3 giây
            state.screenShake = { timer: 3 * FPS, intensity: 3 }; // Rung liên tục
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, bullets, mouse } = state;

        // Logic Q: Hố đen hút quái
        if (state.voidBlackholes) {
            state.voidBlackholes.forEach(bh => {
                bh.life--;
                ghosts.forEach(g => {
                    let d = dist(bh.x, bh.y, g.x, g.y);
                    if (d < bh.radius) {
                        let force = (bh.radius - d) * 0.05; // Càng gần tâm hút càng mạnh
                        let angle = Math.atan2(bh.y - g.y, bh.x - g.x);
                        g.x += Math.cos(angle) * force;
                        g.y += Math.sin(angle) * force;
                        g.isStunned = Math.max(g.isStunned, 5);
                        g.hp -= 0.1; // Sát thương xé rách của hố đen
                    }
                });
            });
            state.voidBlackholes = state.voidBlackholes.filter(bh => bh.life > 0);
        }

        // Logic R: Siêu Tia Laser (Cập nhật góc ngắm liên tục theo chuột)
        if (state.activeBuffs.r > 0) {
            state.playerCanShootModifier = false; // Khóa bắn đạn thường khi xài Laser

            let angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            state.voidLaser = { x: player.x, y: player.y, angle: angle };

            const p1 = { x: player.x, y: player.y };
            const p2 = { x: player.x + Math.cos(angle) * 2000, y: player.y + Math.sin(angle) * 2000 };

            // Helper tính khoảng cách tới Laser
            const distToLine = (p, v, w) => {
                let l2 = dist(v.x, v.y, w.x, w.y) ** 2;
                if (l2 === 0) return dist(p.x, p.y, v.x, v.y);
                let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
                t = Math.max(0, Math.min(1, t));
                return dist(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
            };

            // Gây sát thương mỗi 5 frame
            if (state.frameCount % 5 === 0) {
                ghosts.forEach(g => {
                    if (g.x > 0 && distToLine({ x: g.x, y: g.y }, p1, p2) < g.radius + 30) {
                        g.hp -= 2.5;
                        g.isStunned = 20;
                    }
                });
                if (boss && distToLine({ x: boss.x, y: boss.y }, p1, p2) < boss.radius + 30) boss.hp -= 3;
            }

            // Xóa toàn bộ đạn địch bay trúng tia Laser
            bullets.forEach(b => {
                if (!b.isPlayer && distToLine({ x: b.x, y: b.y }, p1, p2) < 30) b.life = 0;
            });
        } else {
            state.voidLaser = null;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;

        // Vẽ Hố Đen (Q)
        state.voidBlackholes?.forEach(bh => {
            ctx.save();
            const pulse = Math.sin(frameCount * 0.2) * 10;

            // Viền tím hút vật chất
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(100, 0, 200, 0.1)";
            ctx.fill();

            // Tâm hố đen tối đen như mực
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, 40 + pulse, 0, Math.PI * 2);
            ctx.fillStyle = "#0a0a0a";
            ctx.shadowBlur = 30;
            ctx.shadowColor = "#8800ff";
            ctx.fill();
            ctx.shadowBlur = 0;

            // Vòng Accretion Disk xoay
            ctx.translate(bh.x, bh.y);
            ctx.rotate(frameCount * 0.1);
            ctx.strokeStyle = "rgba(180, 50, 255, 0.7)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(0, 0, 60 + pulse, 20, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // Vẽ Laser Hủy Diệt (R)
        if (buffs.r > 0 && state.voidLaser) {
            ctx.save();
            const s = state.voidLaser;
            const endX = s.x + Math.cos(s.angle) * 2500;
            const endY = s.y + Math.sin(s.angle) * 2500;

            // Màn hình tối lại
            ctx.fillStyle = "rgba(20, 0, 40, 0.3)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Viền tia Laser to màu tím/đen
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = "rgba(100, 0, 255, 0.7)";
            ctx.lineWidth = 60 + Math.sin(frameCount * 0.5) * 10;
            ctx.shadowBlur = 30;
            ctx.shadowColor = "#8800ff";
            ctx.stroke();

            // Lõi Laser trắng sáng rực
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 20;
            ctx.shadowBlur = 0;
            ctx.stroke();
            ctx.restore();
        }
    }
};