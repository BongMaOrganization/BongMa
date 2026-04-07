import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const phoenix = {
    id: "phoenix",

    /**
     * Kích hoạt kỹ năng (Thay thế cho triggerSkill cũ)
     */
    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Dấu Cháy - Bắt đầu để lại vệt lửa
        if (key === "q") {
            state.activeBuffs.q = 6 * FPS;
        }

        // E: Phượng Hoàng Chuyển Thế (Dịch chuyển và nổ)
        if (key === "e") {
            // 1. Lưu vị trí cũ trước khi bay để tạo hướng nổ
            const ex = player.x, ey = player.y;

            // 2. Gây sát thương và Stun quái ở điểm ĐẾN (chuẩn logic cũ của bạn)
            state.ghosts.forEach(g => {
                if (dist(mouse.x, mouse.y, g.x, g.y) < 200) {
                    g.hp -= 5;
                    g.isStunned = Math.max(g.isStunned, 100);
                }
            });

            // 3. Tạo hiệu ứng nổ Efx
            state.phoenixEfx = { x: mouse.x, y: mouse.y, life: 20 };

            // 4. Dịch chuyển player
            player.x = mouse.x;
            player.y = mouse.y;

            // Thêm rung màn hình cho đã mắt
            state.screenShake = { timer: 10, intensity: 5 };
        }

        // R: Tái sinh & Hỏa Cuồng (Bắn cực nhanh)
        if (key === "r") {
            state.activeBuffs.r = 10 * FPS;
            state.phoenixReviveReady = true; // Cờ hồi sinh (xử lý lúc chết ở combat.js)
        }
        return true;
    },

    /**
     * Cập nhật sát thương và hiệu ứng vật lý
     */
    update: (state) => {
        const { player, ghosts, boss } = state;

        // Tăng tốc khi bật Q và để lại vệt lửa (Trails)
        if (state.activeBuffs.q > 0) {
            if (!state.phoenixTrails) state.phoenixTrails = [];
            state.phoenixTrails.push({ x: player.x, y: player.y, life: 60 });
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.4;
        }

        // Tăng tốc bắn khi bật R
        if (state.activeBuffs.r > 0) {
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.5; // Bắn siêu nhanh
        }

        // Tính sát thương từ vệt lửa (chuẩn logic cũ của bạn: trừ 0.2 HP và stun 10)
        if (state.phoenixTrails) {
            state.phoenixTrails.forEach(t => {
                t.life--;
                ghosts.forEach(g => {
                    if (dist(t.x, t.y, g.x, g.y) < 30) {
                        g.hp -= 0.2;
                        g.isStunned = Math.max(g.isStunned, 10);
                    }
                });
                if (boss && dist(t.x, t.y, boss.x, boss.y) < boss.radius + 10) boss.hp -= 0.05;
            });
            state.phoenixTrails = state.phoenixTrails.filter(t => t.life > 0);
        }

        // Giảm thời gian sống của vụ nổ E
        if (state.phoenixEfx) {
            state.phoenixEfx.life--;
            if (state.phoenixEfx.life <= 0) state.phoenixEfx = null;
        }
    },

    /**
     * Vẽ VFX
     */
    draw: (state, ctx, canvas) => {
        // Vẽ vệt lửa (Trails)
        state.phoenixTrails?.forEach(t => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 80, 0, ${t.life / 60})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "orange";
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Vẽ hiệu ứng nổ E
        if (state.phoenixEfx && state.phoenixEfx.life > 0) {
            const progress = 1 - (state.phoenixEfx.life / 20);
            ctx.beginPath();
            ctx.arc(state.phoenixEfx.x, state.phoenixEfx.y, 200 * progress, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 120, 0, ${(1 - progress) * 0.5})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 30, 0, ${1 - progress})`;
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // Vẽ hào quang R
        if (state.activeBuffs.r > 0) {
            ctx.beginPath();
            ctx.arc(state.player.x, state.player.y, state.player.radius + 10 + Math.sin(state.frameCount * 0.3) * 4, 0, Math.PI * 2);
            ctx.strokeStyle = "gold";
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.fillStyle = "rgba(255, 150, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};