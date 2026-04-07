import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const scout = {
    id: "scout",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        // Q: Radar quét quái (Bật cờ hiệu scoutQ_Active)
        if (key === "q") {
            state.scoutQ_Active = true;
            state.activeBuffs.q = 1.5 * FPS; // Buff kéo dài 1.5s

            // Stun quái trong tầm radar
            state.ghosts.forEach(g => {
                if (dist(player.x, player.y, g.x, g.y) < 300) {
                    g.isStunned = Math.max(g.isStunned, 150); // Stun mạnh
                }
            });

            // Tắt radar sau 1.5s
            if (!state.delayedTasks) state.delayedTasks = [];
            state.delayedTasks.push({ delay: 1.5 * FPS, action: () => state.scoutQ_Active = false });
        }

        // E: Dây móc (Grappling Hook)
        if (key === "e") {
            const dx = mouse.x - player.x, dy = mouse.y - player.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                // Tính toán tốc độ bay bằng dash
                player.dashTimeLeft = Math.min(40, Math.floor(len / 15));
                player.dashDx = dx / len;
                player.dashDy = dy / len;
                player.grappleTarget = { x: mouse.x, y: mouse.y };
            }
        }

        // R: Quá tải (Overdrive)
        if (key === "r") {
            state.activeBuffs.r = 10 * FPS;
        }
        return true;
    },

    update: (state) => {
        // Logic Buff R: Tăng mạnh tốc độ chạy và tốc độ bắn
        if (state.activeBuffs.r > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.8;
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.4; // Giảm cooldown mạnh
        }
    },

    draw: (state, ctx, canvas) => {
        const { player } = state;

        // Vẽ Radar của chiêu Q
        if (state.activeBuffs.q > 0 || state.scoutQ_Active) {
            // Vòng quét bự
            ctx.beginPath();
            ctx.arc(player.x, player.y, 300, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 255, 0.6)";
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 15]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = "rgba(0, 255, 255, 0.08)";
            ctx.fill();

            // Vẽ vòng sóng radar lan tỏa 
            const pulse = (state.frameCount % 60) / 60;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 300 * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${1 - pulse})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Kỹ năng E: Vẽ dây móc
        if (player.grappleTarget && player.dashTimeLeft > 0) {
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(player.grappleTarget.x, player.grappleTarget.y);
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(player.grappleTarget.x, player.grappleTarget.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = "#00ffff";
            ctx.fill();
        }

        // Kỹ năng R: Phủ viền đỏ mờ và vòng tròn rung động quanh người
        if (state.activeBuffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 10 + Math.sin(state.frameCount * 0.3) * 5, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = "rgba(255, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};