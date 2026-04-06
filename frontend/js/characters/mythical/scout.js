import { dist } from "../utils.js";

export const scout = {
    id: "scout",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        // Kỹ năng R: Tăng mạnh tốc độ chạy và tốc độ bắn
        if (buffs.r > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.4;
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.6; // Giảm cooldown
        }

        // Kỹ năng Q: Bật tầm nhìn phát hiện quái
        if (buffs.q > 0) {
            // Bật cờ hiệu để đoạn code vẽ Đạn (bullets) trong draw.js chính biết
            // và cường hóa hiệu ứng/tầm nhìn cho đạn.
            state.scoutQ_Active = true;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Radar của chiêu Q
        if (buffs.q > 0) {
            // Vòng tròn trắng nhẹ
            ctx.beginPath();
            ctx.arc(player.x, player.y, 100, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${buffs.q / 15})`;
            ctx.lineWidth = 4;
            ctx.stroke();

            // Vòng sáng Radar bự
            ctx.save();
            ctx.beginPath();
            ctx.arc(player.x, player.y, 150, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 15;
            ctx.stroke();

            for (let i = 0; i < 3; i++) {
                let a = (state.frameCount * 0.1 + i) * Math.PI * 0.6;
                ctx.beginPath();
                ctx.arc(player.x, player.y, 150, a, a + 0.5);
                ctx.strokeStyle = "white";
                ctx.lineWidth = 4;
                ctx.stroke();
            }
            ctx.restore();
        }

        // Kỹ năng E: Dây móc (Grappling hook)
        if (buffs.e > 0 && player.grappleTarget) {
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(player.grappleTarget.x, player.grappleTarget.y);
            ctx.strokeStyle = "rgba(150, 150, 150, 0.8)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(player.grappleTarget.x, player.grappleTarget.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#aaa";
            ctx.fill();
        }

        // Kỹ năng R: Phủ viền đỏ mờ và vòng tròn rung động quanh người
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(
                player.x,
                player.y,
                player.radius + 10 + Math.sin(state.frameCount * 0.2) * 5,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = "rgba(255, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};