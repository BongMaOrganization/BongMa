import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";
import { updateHealthUI } from "../../ui.js";
import { addExperience } from "../../game/combat.js";

export const mage = {
    id: "mage",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        // Q: Bạo Kích Ma Pháp (Bắn đạn 8 hướng)
        if (key === "q") {
            for (let i = 0; i < Math.PI * 2; i += Math.PI / 4) {
                spawnBullet(player.x, player.y, player.x + Math.cos(i), player.y + Math.sin(i), true, 1);
            }
        }

        // E: Chuyển Đổi Sinh Mệnh (Đổi HP lấy XP)
        if (key === "e") {
            if (player.hp > 1) {
                player.hp--;
                updateHealthUI();
                addExperience(100, changeStateFn);
            }
        }

        // R: Ngưng Đọng Thời Gian
        if (key === "r") {
            state.activeBuffs.r = 4 * FPS;
        }
        return true;
    },

    update: (state, ctx, canvas, buffs) => {
        if (buffs.r > 0) {
            state.timeFrozenModifier = true;
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        // Hiệu ứng màn hình xanh khi ngưng đọng thời gian
        if (buffs.r > 0) {
            ctx.fillStyle = "rgba(0, 150, 255, 0.15)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Vẽ các hạt ma pháp rơi
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
            }
        }
    }
};