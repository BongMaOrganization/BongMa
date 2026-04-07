import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const reaper = {
    id: "reaper",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse, ghosts, boss } = state;

        // Q: Trảm Hồn - Cắt một nhát bán nguyệt phía trước
        if (key === "q") {
            state.activeBuffs.q = 15;
            let angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

            state.reaperSlash = {
                x: player.x,
                y: player.y,
                angle: angle,
                life: 15,
            };

            // Gây sát thương và Stun cho quái nằm trong góc chém (180 độ phía trước)
            ghosts.forEach((g) => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 180) {
                    let a = Math.atan2(g.y - player.y, g.x - player.x);
                    let diff = Math.abs(a - angle);
                    if (diff > Math.PI) diff = 2 * Math.PI - diff;
                    // Góc chém rộng 180 độ (Math.PI / 2 mỗi bên)
                    if (diff < Math.PI / 2) {
                        g.hp -= 15;
                        g.isStunned = 80;
                    }
                }
            });
            // Sát thương lên Boss
            if (boss && dist(player.x, player.y, boss.x, boss.y) < 180 + boss.radius) {
                let a = Math.atan2(boss.y - player.y, boss.x - player.x);
                let diff = Math.abs(a - angle);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;
                if (diff < Math.PI / 2) boss.hp -= 25;
            }
        }

        // E: Bóng Đêm (Tăng tốc di chuyển và để lại tàn ảnh)
        if (key === "e") {
            state.activeBuffs.e = 3 * FPS;
        }

        // R: Án Tử Hình - Giết tất cả quái nhỏ toàn bản đồ, trừ máu % Boss
        if (key === "r") {
            state.activeBuffs.r = 2 * FPS; // Thời gian hiển thị aura đen
            state.screenShake = { timer: 30, intensity: 12 };
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 1800, life: 45, maxLife: 45, color: "rgba(200,0,0,1)" });

            ghosts.forEach(g => {
                if (g.x > 0) {
                    if (g.isMiniBoss || g.isSubBoss) {
                        g.shield = 0;
                        g.shieldActive = false;
                        g.hp -= g.maxHp * 0.25; // Elite mất 25% máu
                        g.isStunned = Math.max(g.isStunned, 120);
                    } else {
                        g.hp = 0; // Quái thường chết lập tức
                    }
                }
            });
            if (boss) boss.hp -= boss.maxHp * 0.15; // Boss mất 15% máu

            // Tạo hiệu ứng nổ khổng lồ giữa bản đồ
            if (!state.explosions) state.explosions = [];
            state.explosions.push({
                x: player.x,
                y: player.y,
                radius: 2000,
                life: 30,
                color: "rgba(0, 0, 0, 0.8)",
            });
        }
        return true;
    },

    update: (state) => {
        // Tăng tốc E và tạo bóng
        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier *= 1.5;
            if (state.frameCount % 4 === 0) {
                if (!state.phantoms) state.phantoms = [];
                state.phantoms.push({
                    x: state.player.x, y: state.player.y,
                    life: 15, color: "rgba(0, 0, 0, 0.5)", radius: state.player.radius
                });
            }
        }

        // Giảm thời gian hiển thị nhát chém Q
        if (state.reaperSlash) {
            state.reaperSlash.life--;
            if (state.reaperSlash.life <= 0) state.reaperSlash = null;
        }

        // Quản lý bóng Phantoms từ chiêu E
        if (state.phantoms) {
            state.phantoms.forEach(p => p.life--);
            state.phantoms = state.phantoms.filter(p => p.life > 0);
        }
    },

    draw: (state, ctx, canvas) => {
        const { player, activeBuffs } = state;

        // Vẽ Nhát Chém (Q)
        if (state.reaperSlash) {
            const s = state.reaperSlash;
            ctx.save();
            ctx.beginPath();
            // Vẽ vòng cung chém
            ctx.arc(s.x, s.y, 180, s.angle - Math.PI / 2, s.angle + Math.PI / 2);
            ctx.strokeStyle = `rgba(255, 0, 0, ${s.life / 15})`;
            ctx.lineWidth = 45;
            ctx.lineCap = "round";
            ctx.shadowBlur = 20;
            ctx.shadowColor = "red";
            ctx.stroke();
            ctx.restore();
        }

        // Vẽ Bóng Ma (E)
        state.phantoms?.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(30, 0, 30, ${p.life / 15})`;
            ctx.fill();
        });

        // Vẽ Aura Tuyệt Sát (R)
        if (activeBuffs.r > 0) {
            // Aura đen đỏ to dần rồi nhỏ lại
            ctx.beginPath();
            ctx.arc(player.x, player.y, 350 + Math.sin(state.frameCount * 0.5) * 20, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 0, ${(activeBuffs.r / (2 * FPS)) * 0.25})`;
            ctx.fill();

            // Bôi đen mờ toàn màn hình
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};