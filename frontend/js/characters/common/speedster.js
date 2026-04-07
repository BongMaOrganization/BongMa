import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const speedster = {
    id: "speedster",

    onTrigger: (key, state, canvas, changeStateFn) => {
        // Q: Chạy Nước Rút
        if (key === "q") {
            state.activeBuffs.q = 4 * FPS;
        }

        // E: Bắn Tốc Độ Cao
        if (key === "e") {
            state.activeBuffs.e = 4 * FPS;
        }

        // R: Tốc Độ Ánh Sáng (Kết hợp Q và E, tạo bóng mờ và tăng cực đại chỉ số)
        if (key === "r") {
            state.activeBuffs.r = 6 * FPS;
            state.screenShake = { timer: 10, intensity: 2 };
        }
        return true;
    },

    update: (state) => {
        const { player, frameCount } = state;

        // Logic Q: Tăng 50% tốc độ chạy
        if (state.activeBuffs.q > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.5;
        }

        // Logic E: Giảm mạnh thời gian hồi chiêu súng (bắn cực nhanh)
        if (state.activeBuffs.e > 0) {
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.4;
        }

        // Logic R: Tốc độ tối đa
        if (state.activeBuffs.r > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.8;
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.3;

            // Sinh bóng mờ liên tục khi đang bật R
            if (frameCount % 3 === 0) {
                if (!state.phantoms) state.phantoms = [];
                state.phantoms.push({
                    x: player.x,
                    y: player.y,
                    life: 12,
                    color: "rgba(0, 255, 255, 0.3)",
                    radius: player.radius
                });
            }
        }

        // Dọn dẹp bóng mờ (Phantoms)
        if (state.phantoms) {
            state.phantoms.forEach(p => p.life--);
            state.phantoms = state.phantoms.filter(p => p.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Vẽ bóng mờ (R)
        state.phantoms?.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });

        // Vẽ luồng gió viền quanh người (Q hoặc R)
        if (buffs.q > 0 || buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 255, 0.6)";
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Vẽ vũ khí / người phát sáng cam báo hiệu đang bắn nhanh (E)
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 150, 0, 0.8)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
};