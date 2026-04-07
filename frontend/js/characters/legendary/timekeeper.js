import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const timekeeper = {
    id: "timekeeper",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Bom Thời Gian (Time Dilation Zone) - Làm chậm quái vật
        if (key === "q") {
            if (!state.timeZones) state.timeZones = [];
            state.timeZones.push({
                x: mouse.x,
                y: mouse.y,
                radius: 150,
                life: 6 * FPS
            });
        }

        // E: Ngưng Đọng Tuyệt Đối - Dừng thời gian toàn bản đồ
        if (key === "e") {
            state.activeBuffs.e = 3 * FPS; // Đóng băng 3s
            state.screenShake = { timer: 10, intensity: 5 };
        }

        // R: Tua Nhanh Thời Gian (Haste) - Tốc độ bàn thờ
        if (key === "r") {
            state.activeBuffs.r = 6 * FPS;
        }
        return true;
    },

    update: (state) => {
        const { ghosts, boss } = state;

        // Logic Q: Vùng làm chậm
        if (state.timeZones) {
            state.timeZones.forEach(z => {
                z.life--;
                ghosts.forEach(g => {
                    if (dist(z.x, z.y, g.x, g.y) < z.radius) {
                        g.speed *= 0.3; // Giảm tốc độ còn 30%
                        g.hp -= 0.1; // Chịu sát thương do méo mó không gian
                    }
                });
                if (boss && dist(z.x, z.y, boss.x, boss.y) < z.radius) {
                    boss.hp -= 0.05;
                }
            });
            state.timeZones = state.timeZones.filter(z => z.life > 0);
        }

        // Logic E: Kích hoạt cờ hiệu Đóng băng thời gian
        if (state.activeBuffs.e > 0) {
            state.timeFrozenModifier = true; // Update.js chính sẽ dùng biến này để dừng quái
        }

        // Logic R: Tăng tốc cực hạn
        if (state.activeBuffs.r > 0) {
            state.playerSpeedMultiplier *= 1.6;
            state.playerFireRateMultiplier *= 0.3; // Giảm cooldown -> bắn như súng máy
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;

        // Vẽ Vùng Thời Gian (Q) với họa tiết mặt đồng hồ
        state.timeZones?.forEach(z => {
            ctx.save();
            const alpha = Math.min(0.5, z.life / 60);

            // Vẽ nền
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 200, 255, ${alpha * 0.3})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Vẽ kim đồng hồ xoay ngược
            ctx.translate(z.x, z.y);
            ctx.rotate(-frameCount * 0.05);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -z.radius * 0.8); ctx.lineWidth = 4; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(z.radius * 0.5, 0); ctx.lineWidth = 6; ctx.stroke();
            ctx.restore();
        });

        // Vẽ hiệu ứng Ngưng đọng (E) - Filter xám/xanh
        if (buffs.e > 0) {
            ctx.fillStyle = "rgba(0, 100, 150, 0.25)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Các hạt bụi thời gian đứng im
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            for (let i = 0; i < 50; i++) {
                // Pseudo-random cố định dựa trên kích thước canvas để tạo hạt đứng im
                let hx = (Math.sin(i * 123) * 0.5 + 0.5) * canvas.width;
                let hy = (Math.cos(i * 321) * 0.5 + 0.5) * canvas.height;
                ctx.fillRect(hx, hy, 2, 2);
            }
        }

        // Vẽ hiệu ứng Tua Nhanh (R)
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
};