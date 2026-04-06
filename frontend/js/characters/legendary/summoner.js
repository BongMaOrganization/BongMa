import { dist } from "../utils.js";
import { spawnBullet } from "../entities.js";

export const summoner = {
    id: "summoner",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player } = state;

        // Kỹ năng E: Tăng số lượng tia đạn
        if (buffs.e > 0) {
            state.playerMultiShotModifier = (state.playerMultiShotModifier || player.multiShot) + 2;
        }

        // Kỹ năng Q: Tự động bắn đạn ra xung quanh ngẫu nhiên
        if (buffs.q > 0) {
            if (state.frameCount % 20 === 0) {
                spawnBullet(
                    player.x,
                    player.y,
                    player.x + Math.random() * 100,
                    player.y + Math.random() * 100,
                    true
                );
            }
        }

        // Kỹ năng R: Bắn đạn túa ra xung quanh liên tục
        if (buffs.r > 0) {
            if ((state.frameCount || 0) % 15 === 0) {
                for (let i = 0; i < 4; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    spawnBullet(
                        player.x,
                        player.y,
                        player.x + Math.cos(angle) * 100,
                        player.y + Math.sin(angle) * 100,
                        true
                    );
                }
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng Q: Vòng xoáy năng lượng tím
        if (buffs.q > 0) {
            let angle = (state.frameCount || 0) * 0.1;
            for (let i = 0; i < 2; i++) {
                let a = angle + i * Math.PI;
                let x = player.x + Math.cos(a) * 40;
                let y = player.y + Math.sin(a) * 40;
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fillStyle = "#b400ff";
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#b400ff";
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // Kỹ năng R: Phủ màn hình màu tím mờ
        if (buffs.r > 0) {
            ctx.fillStyle = "rgba(180, 0, 255, 0.12)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
};