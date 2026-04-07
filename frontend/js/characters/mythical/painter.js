import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

export const painter = {
    id: "painter",

    /**
     * Kích hoạt khi bấm phím
     */
    onTrigger: (key, state, canvas, changeStateFn) => {
        const { mouse } = state;

        // Q: Bắt đầu vẽ
        if (key === "q") {
            state.painterDrawing = true;
            state.painterDrawTime = 5 * FPS;
            if (!state.painterTrails) state.painterTrails = [];
        }

        // E: Quăng bom mực
        if (key === "e") {
            state.painterBomb = {
                x: mouse.x,
                y: mouse.y,
                life: 30, // Thời gian bay/delay trước khi nổ
            };
        }

        // R: Tuyệt tác (Kích hoạt nảy nhánh trong update)
        if (key === "r") {
            state.activeBuffs.r = 8 * FPS;
            state.screenShake = { timer: 20, intensity: 8 }; // Thêm hiệu ứng rung màn hình
        }
        return true;
    },

    /**
     * Xử lý vật lý và sát thương mỗi khung hình
     */
    update: (state, ctx, canvas, buffs) => {
        let { boss, ghosts, mouse, frameCount } = state;

        // Chỉ khóa bắn đạn thường khi đang trong chế độ vẽ (Q)
        if (state.painterDrawing) state.playerCanShootModifier = false;

        // ===== 1. PAINTER DRAW (Q) =====
        if (state.painterDrawing) {
            state.painterDrawTime--;

            // detect bắt đầu giữ chuột
            if (mouse.isDown && !state.prevMouseDown) {
                if (!state.painterTrails) state.painterTrails = [];
                state.painterTrails.push({
                    points: [],
                    life: 5 * FPS,
                    color: `hsl(${(frameCount % 360)}, 95%, 65%)`, // Màu đổi liên tục
                    width: 8 + Math.random() * 6 // Nét cọ to nhỏ tự nhiên
                });
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

        // ===== 2. BOMB (E) =====
        if (state.painterBomb) {
            state.painterBomb.life--;
            if (state.painterBomb.life <= 0) {
                let x = state.painterBomb.x;
                let y = state.painterBomb.y;

                // Sát thương nổ
                ghosts.forEach((g) => {
                    if (dist(x, y, g.x, g.y) < 120) {
                        g.hp -= 3;
                        g.isStunned = Math.max(g.isStunned, 60);
                    }
                });

                if (boss && dist(x, y, boss.x, boss.y) < 120) {
                    boss.hp -= 5;
                }

                // Xóa đạn địch
                state.bullets = state.bullets.filter((b) => !(!b.isPlayer && dist(b.x, b.y, x, y) <= 120));

                // Tạo vũng mực (Zone)
                if (!state.painterZones) state.painterZones = [];
                state.painterZones.push({ x, y, radius: 80, life: 5 * FPS });

                // Tạo hiệu ứng nổ
                if (!state.painterExplosions) state.painterExplosions = [];
                state.painterExplosions.push({ x, y, life: 25 });

                state.painterBomb = null;
            }
        }

        // ===== 3. ULTIMATE NẢY NHÁNH (R) =====
        if (buffs.r > 0 && frameCount % 10 === 0 && state.painterTrails) {
            let newTrails = [];
            state.painterTrails.forEach((t) => {
                if (t.generation === undefined) t.generation = 0;
                if (t.generation >= 2) return; // Chỉ nảy 2 đời
                if (!t.spawnCount) t.spawnCount = 0;
                if (t.spawnCount >= 2) return; // Mỗi trail nảy tối đa 2 lần
                if (!t.points || t.points.length === 0) return;

                t.spawnCount++;
                let last = t.points[t.points.length - 1];

                // Tỏa ra 3 nhánh mới
                for (let i = 0; i < 3; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let newTrail = {
                        points: [{ x: last.x, y: last.y }],
                        life: 60,
                        generation: t.generation + 1,
                        spawnCount: 0,
                        color: t.color || `hsl(${(frameCount % 360)}, 95%, 65%)`,
                        width: (t.width || 10) * 0.7, // Nhánh nhỏ dần
                        isExploding: true // Đánh dấu là nhánh nổ (VFX)
                    };
                    // Vẽ trước 5 điểm cho nhánh mới
                    for (let j = 1; j <= 5; j++) {
                        newTrail.points.push({
                            x: last.x + Math.cos(angle) * j * 20,
                            y: last.y + Math.sin(angle) * j * 20,
                        });
                    }
                    newTrails.push(newTrail);
                }
            });

            // Giới hạn số lượng trail để chống giật lag
            if (state.painterTrails.length < 300) {
                state.painterTrails.push(...newTrails);
            }
        }

        // ===== 4. TRAILS DAMAGE & CLEANUP =====
        if (state.painterTrails) {
            state.painterTrails.forEach((t) => t.life--);
            state.painterTrails = state.painterTrails.filter((t) => t.life > 0);

            state.painterTrails.forEach((t) => {
                let hitOnce = false;
                let dmgMultiplier = t.isExploding ? 2 : 1; // Nhánh R gây sát thương gấp đôi

                // Check va chạm mỗi 3 điểm để tối ưu hiệu năng
                for (let i = 0; i < t.points.length; i += 3) {
                    let p = t.points[i];
                    if (hitOnce) break;

                    ghosts.forEach((g) => {
                        if (!hitOnce && dist(p.x, p.y, g.x, g.y) < g.radius + 10) {
                            g.hp -= 0.15 * dmgMultiplier;
                            g.isStunned = Math.max(g.isStunned, 60);
                            hitOnce = true;
                        }
                    });

                    if (boss && !hitOnce && dist(p.x, p.y, boss.x, boss.y) < boss.radius + 10) {
                        boss.hp -= 0.05 * dmgMultiplier;
                        hitOnce = true;
                    }
                }
            });
        }

        // ===== 5. ZONES DAMAGE & CLEANUP =====
        if (state.painterZones) {
            state.painterZones.forEach((z) => {
                z.life--;
                ghosts.forEach((g) => {
                    if (dist(z.x, z.y, g.x, g.y) < z.radius) {
                        g.hp -= 0.1;
                        g.isStunned = Math.max(g.isStunned, 60);
                        g.speed *= 0.5; // Mực nhầy làm chậm quái
                    }
                });

                if (boss && dist(z.x, z.y, boss.x, boss.y) < z.radius) {
                    boss.hp -= 0.05;
                }
            });
            state.painterZones = state.painterZones.filter((z) => z.life > 0);
        }
    },

    /**
     * draw: Hiển thị lên màn hình
     */
    draw: (state, ctx, canvas, buffs) => {
        // Vẽ vũng mực (Vẽ dưới cùng)
        if (state.painterZones) {
            state.painterZones.forEach((z) => {
                const alpha = Math.min(0.3, z.life / 60);
                ctx.beginPath();
                ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 50, 180, ${alpha})`;
                ctx.fill();
                ctx.strokeStyle = `rgba(255, 180, 220, ${alpha * 2})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 10]);
                ctx.stroke();
                ctx.setLineDash([]);
            });
        }

        // Vẽ nét mực
        if (state.painterTrails) {
            state.painterTrails.forEach((t) => {
                if (t.points.length < 2) return;
                ctx.save();
                ctx.beginPath();
                for (let i = 0; i < t.points.length; i++) {
                    let p = t.points[i];
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                }

                ctx.lineJoin = "round";
                ctx.lineCap = "round";

                // Hiệu ứng sáng rực nếu là nhánh của chiêu R
                if (t.isExploding) {
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = "white";
                    ctx.strokeStyle = "white";
                    ctx.lineWidth = (t.width || 6) + Math.sin(state.frameCount * 0.5) * 5;
                } else {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = t.color || "rgba(255,100,200,0.8)";
                    ctx.strokeStyle = t.color || "rgba(255,100,200,0.8)";
                    ctx.lineWidth = t.width || 6;
                }
                ctx.stroke();
                ctx.restore();
            });
        }

        // Vẽ bom đang bay
        if (state.painterBomb) {
            ctx.save();
            const jump = Math.sin(state.painterBomb.life * 0.2) * 20; // Hiệu ứng bom tâng lên
            ctx.beginPath();
            ctx.arc(state.painterBomb.x, state.painterBomb.y + jump, 12, 0, Math.PI * 2);
            ctx.fillStyle = "#ff0088";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#ff0088";
            ctx.fill();
            ctx.restore();
        }

        // Vẽ hiệu ứng nổ bom
        if (state.painterExplosions) {
            state.painterExplosions.forEach(e => {
                const progress = 1 - (e.life / 25);
                ctx.beginPath();
                ctx.arc(e.x, e.y, 100 * progress, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 50, 150, ${1 - progress})`;
                ctx.lineWidth = 5 * (1 - progress);
                ctx.stroke();
            });
        }

        // Filter màn hình khi bật R
        if (buffs.r > 0) {
            ctx.fillStyle = `rgba(255, 200, 255, 0.15)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },
};