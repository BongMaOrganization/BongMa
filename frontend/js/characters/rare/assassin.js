import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

export const assassin = {
    id: "assassin",

    /**
     * Logic khi nhấn phím Q, E, hoặc R
     */
    onTrigger: (key, state, canvas, changeStateFn) => {
        let { player, mouse, keys } = state;

        if (key === "q") {
            state.activeBuffs.q = 2 * FPS;
            let dx = 0, dy = 0;
            // Xác định hướng lướt
            if (keys["w"] || keys["arrowup"]) dy -= 1;
            if (keys["s"] || keys["arrowdown"]) dy += 1;
            if (keys["a"] || keys["arrowleft"]) dx -= 1;
            if (keys["d"] || keys["arrowright"]) dx += 1;

            if (dx === 0 && dy === 0) {
                let mx = mouse.x - player.x, my = mouse.y - player.y;
                let len = Math.sqrt(mx * mx + my * my);
                if (len > 0) { dx = mx / len; dy = my / len; }
            } else {
                let len = Math.sqrt(dx * dx + dy * dy);
                dx /= len; dy /= len;
            }
            player.dashTimeLeft = 20;
            player.dashDx = dx;
            player.dashDy = dy;
        }

        if (key === "e") {
            state.activeBuffs.e = 10 * FPS;
        }

        if (key === "r") {
            // Chuỗi ám sát: Bắn đạn liên tục trong thời gian ngắn
            for (let i = 0; i < 15; i++) {
                state.delayedTasks.push({
                    delay: Math.round(i * 0.06 * FPS),
                    action: () => {
                        let angOffset = (Math.random() - 0.5) * 0.8;
                        let dirX = mouse.x - player.x, dirY = mouse.y - player.y;
                        let angle = Math.atan2(dirY, dirX) + angOffset;
                        spawnBullet(player.x, player.y, player.x + Math.cos(angle) * 100, player.y + Math.sin(angle) * 100, true, 1.5);
                    },
                });
            }
        }
        return true;
    },

    update: (state, ctx, canvas, buffs) => {
        if (buffs.e > 0) state.assassinE_Active = true;
    },

    draw: (state, ctx, canvas, buffs) => {
        if (buffs.e > 0) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(state.player.x, state.player.y, state.player.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
};