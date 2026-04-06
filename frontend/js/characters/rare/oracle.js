import { dist } from "../utils.js";

export const oracle = {
    id: "oracle",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { boss, ghosts, bullets } = state;

        // Kỹ năng R: Đạn tự tìm mục tiêu (Homing Bullets)
        if (buffs.r > 0 && (state.frameCount || 0) % 2 === 0) {
            bullets.forEach((b) => {
                if (b.isPlayer) {
                    let nearestDist = 400; // Tầm nhìn tự tìm mục tiêu của đạn
                    let target = null;

                    if (boss) {
                        let d = dist(b.x, b.y, boss.x, boss.y);
                        if (d < nearestDist && d > boss.radius) {
                            nearestDist = d;
                            target = boss;
                        }
                    }

                    ghosts.forEach((g) => {
                        if (g.x > 0) {
                            let d = dist(b.x, b.y, g.x, g.y);
                            if (d < nearestDist) {
                                nearestDist = d;
                                target = g;
                            }
                        }
                    });

                    if (target) {
                        let currentAngle = Math.atan2(b.vy, b.vx);
                        let targetAngle = Math.atan2(target.y - b.y, target.x - b.x);
                        let diff = targetAngle - currentAngle;

                        // Chuẩn hóa góc quay (-PI đến PI)
                        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                        let maxTurn = 0.25; // Độ bẻ cong tối đa mỗi frame

                        if (diff > maxTurn) diff = maxTurn;
                        if (diff < -maxTurn) diff = -maxTurn;

                        currentAngle += diff;
                        let speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

                        b.vx = Math.cos(currentAngle) * speed;
                        b.vy = Math.sin(currentAngle) * speed;
                    }
                }
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Kỹ năng Q: Phủ filter ánh sáng vàng
        if (buffs.q > 0) {
            ctx.fillStyle = "rgba(255, 200, 0, 0.08)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Kỹ năng R: Vòng hào quang tự ngắm đứt nét
        if (buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 100, 255, 0.8)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
};