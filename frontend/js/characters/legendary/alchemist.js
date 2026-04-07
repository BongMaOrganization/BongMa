import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";
import { updateHealthUI } from "../../ui.js";

export const alchemist = {
    id: "alchemist",

    /**
     * Xử lý kích hoạt kỹ năng
     */
    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Q: Bom Độc Tuyệt Đối - Bắn ra một vòng đạn hóa học
        if (key === "q") {
            let prevLen = state.bullets.length;
            // Bắn đạn tỏa tròn xung quanh
            for (let i = 0; i < Math.PI * 2; i += Math.PI / 5) {
                spawnBullet(player.x, player.y, player.x + Math.cos(i), player.y + Math.sin(i), true, 1.5);
            }
            // Gắn thuộc tính đặc biệt cho đạn vừa bắn ra
            for (let i = prevLen; i < state.bullets.length; i++) {
                state.bullets[i].radius = 12;
                state.bullets[i].life = 45;
                state.bullets[i].color = "#00ff88"; // Đạn màu xanh độc
                state.bullets[i].damage = 2;
            }
            state.activeBuffs.q = 15;
        }

        // E: Dược Thủy Trị Thương - Hồi máu hoặc nhận thêm điểm kinh nghiệm
        if (key === "e") {
            if (player.hp < player.maxHp) {
                player.hp++;
                updateHealthUI();
                if (!state.floatingTexts) state.floatingTexts = [];
                state.floatingTexts.push({ x: player.x, y: player.y - 30, text: "+1 HP", color: "#00ff88", life: 40 });
            } else {
                // Cộng exp trực tiếp nếu HP đã đầy
                state.player.exp = (state.player.exp || 0) + 50;
                if (!state.floatingTexts) state.floatingTexts = [];
                state.floatingTexts.push({ x: player.x, y: player.y - 30, text: "+50 EXP", color: "#ffff00", life: 40 });
            }
            state.activeBuffs.e = 20;
        }

        // R: Vòng Tròn Giả Kim - Biến đổi đạn của kẻ địch thành đạn của mình
        if (key === "r") {
            state.activeBuffs.r = 4 * FPS; // Kéo dài 4s
        }

        return true;
    },

    update: (state) => {
        const { player, bullets } = state;

        // Logic kỹ năng R: Reflect / Chuyển hóa đạn
        if (state.activeBuffs.r > 0) {
            bullets.forEach((b) => {
                // Đạn địch bay vào vòng tròn (bán kính 250) sẽ bị hack thành đạn người chơi
                if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 250) {
                    b.isPlayer = true;
                    b.vx *= -1.5; // Bay ngược lại với tốc độ nhanh hơn
                    b.vy *= -1.5;
                    b.damage = (b.damage || 1) * 2; // Gấp đôi sát thương
                    b.color = "#00ff88"; // Nhuộm màu giả kim
                }
            });
        }
    },

    draw: (state, ctx) => {
        const { player } = state;

        // Vẽ Vòng Tròn Giả Kim (R)
        if (state.activeBuffs.r > 0) {
            ctx.save();
            const radius = 250;
            const pulse = Math.sin(state.frameCount * 0.1) * 10;

            ctx.beginPath();
            ctx.arc(player.x, player.y, radius + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 128, 0.6)";
            ctx.lineWidth = 3;
            ctx.setLineDash([15, 15]); // Vòng tròn đứt nét phép thuật
            ctx.stroke();

            // Lớp mờ bên trong vòng
            ctx.beginPath();
            ctx.arc(player.x, player.y, radius + pulse, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 255, 128, 0.08)";
            ctx.fill();
            ctx.restore();
        }

        // Hiệu ứng phát sáng nhẹ khi ấn E
        if (state.activeBuffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 128, 0.8)";
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }
};