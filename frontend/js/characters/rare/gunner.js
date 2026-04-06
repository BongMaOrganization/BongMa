import { dist } from "../utils.js";

export const gunner = {
    id: "gunner",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss, mouse } = state;

        // Kỹ năng Q: Laser hội tụ
        if (buffs.q > 0) {
            let angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
            state.gunnerLaser = { x: player.x, y: player.y, angle: angle };
            // Logic gây sát thương laser thường nằm trong update đạn/combat
        } else {
            state.gunnerLaser = null;
        }

        // Cập nhật logic Mìn (Mines)
        if (state.gunnerMines) {
            for (let i = state.gunnerMines.length - 1; i >= 0; i--) {
                let m = state.gunnerMines[i];
                let triggered = false;

                ghosts.forEach((g) => {
                    if (g.x > 0 && dist(m.x, m.y, g.x, g.y) < 40) triggered = true;
                });
                if (boss && dist(m.x, m.y, boss.x, boss.y) < boss.radius + 40) triggered = true;

                if (triggered) {
                    ghosts.forEach((g) => {
                        if (g.x > 0 && dist(m.x, m.y, g.x, g.y) < 100) {
                            g.hp = (g.hp || 1) - 1;
                            g.isStunned = 45;
                        }
                    });
                    if (boss && dist(m.x, m.y, boss.x, boss.y) < 100) boss.hp -= 5;

                    if (!state.explosions) state.explosions = [];
                    state.explosions.push({
                        x: m.x, y: m.y, radius: 100, life: 10, color: "rgba(255,100,0,0.8)"
                    });
                    state.gunnerMines.splice(i, 1);
                }
            }
        }

        // Cập nhật Không kích (Airstrikes)
        if (state.gunnerAirstrikes) {
            for (let i = state.gunnerAirstrikes.length - 1; i >= 0; i--) {
                let strike = state.gunnerAirstrikes[i];
                strike.timer--;
                if (strike.timer <= 0) {
                    ghosts.forEach((g) => {
                        if (g.x > 0 && dist(strike.x, strike.y, g.x, g.y) < 200) {
                            g.hp -= 5;
                            g.isStunned = 120;
                        }
                    });
                    if (boss && dist(strike.x, strike.y, boss.x, boss.y) < 200) boss.hp -= 30;

                    state.bullets.forEach((b) => {
                        if (!b.isPlayer && dist(strike.x, strike.y, b.x, b.y) < 200) b.life = 0;
                    });

                    if (!state.explosions) state.explosions = [];
                    state.explosions.push({
                        x: strike.x, y: strike.y, radius: 200, life: 15, color: "rgba(255,0,0,1)"
                    });
                    state.gunnerAirstrikes.splice(i, 1);
                }
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Laser của chiêu Q
        if (buffs.q > 0 && state.gunnerLaser) {
            ctx.beginPath();
            ctx.moveTo(state.gunnerLaser.x, state.gunnerLaser.y);
            ctx.lineTo(
                state.gunnerLaser.x + Math.cos(state.gunnerLaser.angle) * 2000,
                state.gunnerLaser.y + Math.sin(state.gunnerLaser.angle) * 2000
            );
            ctx.strokeStyle = `rgba(0, 255, 255, ${buffs.q / 15})`;
            ctx.lineWidth = 15;
            ctx.stroke();
            ctx.strokeStyle = `rgba(255, 255, 255, ${buffs.q / 15})`;
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // Vẽ Mìn
        if (state.gunnerMines) {
            state.gunnerMines.forEach((m) => {
                ctx.beginPath();
                ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = "#333";
                ctx.fill();
                ctx.beginPath();
                ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = state.frameCount % 20 < 10 ? "#ff0000" : "#550000";
                ctx.fill();
            });
        }

        // Vẽ vùng cảnh báo Không kích
        if (state.gunnerAirstrikes) {
            state.gunnerAirstrikes.forEach((strike) => {
                let maxT = 60; // 1s
                let progress = 1 - strike.timer / maxT;
                ctx.beginPath();
                ctx.arc(strike.x, strike.y, 200, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(strike.x, strike.y, 200 * progress, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
                ctx.fill();
            });
        }
    }
};