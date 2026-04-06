import { dist } from "../../utils.js";

export const painter = {
    id: "painter",
    update: (state, ctx, canvas, buffs) => {
        let { player, boss, ghosts, mouse } = state;

        // ===== PAINTER DRAW (PAINT STYLE) =====
        if (state.painterDrawing) {
            state.painterDrawTime--;

            // detect bắt đầu giữ chuột
            if (mouse.isDown && !state.prevMouseDown) {
                state.painterTrails.push({ points: [], life: 5 * 60 }); // 60 FPS
            }

            // đang giữ chuột → vẽ
            if (mouse.isDown) {
                let trail = state.painterTrails[state.painterTrails.length - 1];
                if (trail) {
                    let last = trail.points[trail.points.length - 1];
                    if (!last || dist(last.x, last.y, mouse.x, mouse.y) > 5) {
                        trail.points.push({ x: mouse.x, y: mouse.y });
                    }
                }
            }

            state.prevMouseDown = mouse.isDown;
            if (state.painterDrawTime <= 0) state.painterDrawing = false;
        }

        // ===== BOMB =====
        if (state.painterBomb) {
            state.painterBomb.life--;
            if (state.painterBomb.life <= 0) {
                let x = state.painterBomb.x;
                let y = state.painterBomb.y;

                ghosts.forEach((g) => {
                    if (dist(x, y, g.x, g.y) < 120) {
                        g.hp -= 2;
                        g.isStunned = Math.max(g.isStunned, 40);
                    }
                });

                if (boss && dist(x, y, boss.x, boss.y) < 120) {
                    boss.hp -= 2;
                }

                state.bullets = state.bullets.filter((b) => dist(b.x, b.y, x, y) > 120);

                if (!state.painterZones) state.painterZones = [];
                state.painterZones.push({ x, y, radius: 60, life: 4 * 60 });

                if (!state.painterExplosions) state.painterExplosions = [];
                state.painterExplosions.push({ x, y, life: 20 });

                state.painterBomb = null;
            }
        }

        // ===== ULTIMATE (R) =====
        if (buffs.r > 0 && state.frameCount % 10 === 0 && state.painterTrails) {
            let newTrails = [];
            state.painterTrails.forEach((t) => {
                if (t.generation === undefined) t.generation = 0;
                if (t.generation >= 2) return;
                if (!t.spawnCount) t.spawnCount = 0;
                if (t.spawnCount >= 2) return;
                if (!t.points || t.points.length === 0) return;

                t.spawnCount++;
                let last = t.points[t.points.length - 1];

                for (let i = 0; i < 3; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let newTrail = {
                        points: [{ x: last.x, y: last.y }],
                        life: 60,
                        generation: t.generation + 1,
                        spawnCount: 0,
                    };
                    for (let j = 1; j <= 5; j++) {
                        newTrail.points.push({
                            x: last.x + Math.cos(angle) * j * 20,
                            y: last.y + Math.sin(angle) * j * 20,
                        });
                    }
                    newTrails.push(newTrail);
                }
            });

            if (state.painterTrails.length < 300) {
                state.painterTrails.push(...newTrails);
            }
        }

        // ===== TRAILS DAMAGE & CLEANUP =====
        if (state.painterTrails) {
            state.painterTrails.forEach((t) => t.life--);
            state.painterTrails = state.painterTrails.filter((t) => t.life > 0);

            state.painterTrails.forEach((t) => {
                let hitOnce = false;
                for (let i = 0; i < t.points.length; i += 3) {
                    let p = t.points[i];
                    if (hitOnce) break;

                    ghosts.forEach((g) => {
                        if (!hitOnce && dist(p.x, p.y, g.x, g.y) < g.radius + 4) {
                            g.hp -= 0.1;
                            g.isStunned = Math.max(g.isStunned, 60);
                            hitOnce = true;
                        }
                    });

                    if (boss && !hitOnce && dist(p.x, p.y, boss.x, boss.y) < boss.radius + 4) {
                        boss.hp -= 0.05;
                        hitOnce = true;
                    }
                }
            });
        }

        // ===== ZONES DAMAGE & CLEANUP =====
        if (state.painterZones) {
            state.painterZones.forEach((z) => {
                z.life--;
                ghosts.forEach((g) => {
                    if (dist(z.x, z.y, g.x, g.y) < z.radius) {
                        g.hp -= 0.1;
                        g.isStunned = Math.max(g.isStunned, 60);
                    }
                });

                if (boss && dist(z.x, z.y, boss.x, boss.y) < z.radius) {
                    boss.hp -= 0.05;
                }
            });
            state.painterZones = state.painterZones.filter((z) => z.life > 0);
        }
    },

    draw: (state, ctx) => {
        if (state.painterTrails) {
            state.painterTrails.forEach((t) => {
                ctx.beginPath();
                for (let i = 0; i < t.points.length; i++) {
                    let p = t.points[i];
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }
                ctx.strokeStyle = "rgba(255,100,200,0.8)";
                ctx.lineWidth = 6;
                ctx.stroke();
            });
        }
        if (state.painterZones) {
            state.painterZones.forEach((z) => {
                ctx.beginPath();
                ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,150,200,0.2)";
                ctx.fill();
            });
        }
        if (state.painterBomb) {
            ctx.beginPath();
            ctx.arc(state.painterBomb.x, state.painterBomb.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = "pink";
            ctx.fill();
        }
    },
};