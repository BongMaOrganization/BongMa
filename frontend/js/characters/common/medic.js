import { dist } from "../utils.js";

export const medic = {
    id: "medic",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        // Kỹ năng E: Tăng tốc độ di chuyển
        if (buffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.2;
        }

        // Lưu ý: Logic hồi máu thực tế của chiêu Q (Cộng HP) có thể đã được xử lý 
        // bên trong lúc nhấm phím (input.js) hoặc qua hệ thống Buff (updatePlayerBuffs), 
        // ở đây ta chỉ cần vẽ hiệu ứng.
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng Q: Vẽ text "+1 HP" bay lên
        if (buffs.q > 0) {
            ctx.fillStyle = `rgba(0, 255, 100, ${buffs.q / 30})`;
            ctx.font = "bold 20px Arial";
            ctx.fillText("+1 HP", player.x - 25, player.y - 20 - (30 - buffs.q));
        }

        // Kỹ năng E: Vòng tròn đứt nét xanh lá
        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(100, 255, 150, 0.5)";
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Kỹ năng R: Filter màn hình xanh và vòng lan tỏa
        if (buffs.r > 0) {
            ctx.fillStyle = `rgba(0, 255, 150, ${(buffs.r / 60) * 0.2})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.beginPath();
            ctx.arc(
                player.x,
                player.y,
                player.radius + (60 - buffs.r) * 2,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = `rgba(0, 255, 100, ${buffs.r / 60})`;
            ctx.lineWidth = 8;
            ctx.stroke();
        }
    }
};