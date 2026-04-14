import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

function pushBrawlerBurst(state, type, x, y, radius, life) {
    if (!state.brawlerBursts) state.brawlerBursts = [];
    state.brawlerBursts.push({
        x,
        y,
        type,
        radius,
        life,
        maxLife: life,
    });
}

function pushBrawlerShard(state, x, y, radius, life, angle = 0, color = "#ff6432") {
    if (!state.brawlerShards) state.brawlerShards = [];
    state.brawlerShards.push({
        x,
        y,
        radius,
        life,
        maxLife: life,
        angle,
        color,
        spin: (Math.random() - 0.5) * 0.16,
        vx: Math.cos(angle) * (0.8 + Math.random() * 1.4),
        vy: Math.sin(angle) * (0.8 + Math.random() * 1.4),
    });
}

function drawImpactArc(ctx, radius, start, end, jitter, frameCount) {
    const steps = 10;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = start + (end - start) * t;
        const r = radius + Math.sin(frameCount * 0.12 + i) * jitter;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function drawFistMark(ctx, radius) {
    ctx.beginPath();
    ctx.roundRect(-radius * 0.48, -radius * 0.5, radius * 0.96, radius * 0.8, radius * 0.18);
    ctx.fill();

    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.roundRect(-radius * 0.54 + i * radius * 0.27, -radius * 0.86, radius * 0.22, radius * 0.5, radius * 0.09);
        ctx.fill();
    }

    ctx.beginPath();
    ctx.ellipse(-radius * 0.6, radius * 0.02, radius * 0.22, radius * 0.34, -0.35, 0, Math.PI * 2);
    ctx.fill();
}

function drawBrawlerBurst(ctx, burst, frameCount) {
    const progress = 1 - burst.life / burst.maxLife;
    const alpha = Math.max(0, burst.life / burst.maxLife);
    const radius = burst.radius * (0.2 + progress * 0.98);
    const arcs = burst.type === "r" ? 16 : burst.type === "q" ? 10 : 8;

    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.34})`);
    glow.addColorStop(0.34, burst.type === "r"
        ? `rgba(255, 200, 0, ${alpha * 0.28})`
        : `rgba(255, 100, 50, ${alpha * 0.26})`);
    glow.addColorStop(1, "rgba(90, 20, 0, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
        const ringR = radius * (0.52 + ring * 0.2);
        ctx.strokeStyle = ring === 0
            ? `rgba(255, 240, 170, ${alpha * 0.82})`
            : `rgba(255, 100, 50, ${alpha * 0.64})`;
        ctx.lineWidth = Math.max(1.6, 7 - ring * 2);
        ctx.shadowBlur = 24;
        ctx.shadowColor = ring === 0 ? "#ffc800" : "#ff6432";
        drawImpactArc(ctx, ringR, 0, Math.PI * 2, burst.type === "r" ? 8 : 5, frameCount + ring * 13);
    }

    ctx.lineCap = "round";
    for (let i = 0; i < arcs; i++) {
        const a = (i / arcs) * Math.PI * 2 + frameCount * 0.035;
        const inner = radius * 0.2;
        const outer = radius * (0.78 + Math.sin(frameCount * 0.11 + i) * 0.1);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.strokeStyle = i % 3 === 0
            ? `rgba(255, 255, 255, ${alpha * 0.78})`
            : `rgba(255, 120, 45, ${alpha * 0.66})`;
        ctx.lineWidth = burst.type === "r" ? 4 : 2.5;
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#ff6432";
        ctx.stroke();
    }

    if (burst.type === "q") {
        ctx.save();
        ctx.rotate(frameCount * 0.18);
        ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.9})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#ff6432";
        drawFistMark(ctx, radius * 0.24);
        ctx.restore();
    }

    ctx.restore();
}

export function drawBrawlerPlayer(ctx, state, buffs, isInvulnSkill = false) {
    const { player, frameCount } = state;
    if (!player) return;

    const R = player.radius;
    const fc = frameCount || 0;
    const isQ = buffs.q > 0;
    const isE = buffs.e > 0;
    const isR = buffs.r > 0;
    const enraged = isQ || isE || isR || isInvulnSkill;
    const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
    const red = "#ff3b1f";
    const orange = "#ff8a1c";
    const gold = "#ffc800";

    if (player.gracePeriod > 0 && !enraged && Math.floor(fc / 6) % 2 !== 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = "lighter";

    const auraR = R * (isR ? 3.4 : isQ ? 2.75 : isE ? 2.45 : 1.85);
    const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
    aura.addColorStop(0, enraged ? "rgba(255, 255, 255, 0.48)" : "rgba(255, 100, 50, 0.22)");
    aura.addColorStop(0.42, isR ? "rgba(255, 200, 0, 0.28)" : "rgba(255, 80, 30, 0.2)");
    aura.addColorStop(1, "rgba(90, 20, 0, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    for (let ring = 0; ring < (isR ? 3 : enraged ? 2 : 1); ring++) {
        ctx.save();
        ctx.rotate(fc * (0.035 + ring * 0.016) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = ring === 0
            ? `rgba(255, 100, 50, ${enraged ? 0.82 : 0.48})`
            : `rgba(255, 200, 0, ${isR ? 0.62 : 0.38})`;
        ctx.lineWidth = ring === 0 ? 3 : 1.8;
        ctx.shadowBlur = enraged ? 18 : 10;
        ctx.shadowColor = ring === 0 ? red : gold;
        drawImpactArc(ctx, R * (1.5 + ring * 0.45 + pulse * 0.1), 0, Math.PI * 2, 2.5 + ring, fc + ring * 20);
        ctx.restore();
    }

    const trailDir = isE ? { x: Math.cos(fc * 0.08), y: Math.sin(fc * 0.08) } : null;
    if (trailDir) {
        for (let i = 4; i >= 1; i--) {
            ctx.beginPath();
            ctx.ellipse(-trailDir.x * i * 8, -trailDir.y * i * 8, R * (1 - i * 0.08), R * 0.65, Math.atan2(trailDir.y, trailDir.x), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 50, ${0.12 - i * 0.018})`;
            ctx.fill();
        }
    }

    const body = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.08, 0, 0, R * 1.25);
    body.addColorStop(0, "#ffe4c0");
    body.addColorStop(0.3, orange);
    body.addColorStop(0.66, red);
    body.addColorStop(1, "#4d1208");

    ctx.beginPath();
    ctx.arc(0, 0, R * (1 + pulse * 0.05), 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.shadowBlur = enraged ? 40 : 24;
    ctx.shadowColor = enraged ? "#ffc800" : red;
    ctx.fill();
    ctx.lineWidth = enraged ? 3 : 2;
    ctx.strokeStyle = enraged ? "#ffe4c0" : "#ff6432";
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#260a05";
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#fff2c8";
    ctx.shadowBlur = 12;
    ctx.shadowColor = gold;
    ctx.beginPath();
    ctx.arc(-R * 0.22, -R * 0.16, R * 0.075, 0, Math.PI * 2);
    ctx.arc(R * 0.22, -R * 0.16, R * 0.075, 0, Math.PI * 2);
    ctx.fill();

    for (let i = -1; i <= 1; i += 2) {
        ctx.save();
        ctx.translate(i * R * 0.95, R * 0.1 + Math.sin(fc * 0.12 + i) * 1.5);
        ctx.rotate(i * 0.35);
        ctx.fillStyle = isQ || isR ? "#ffc800" : "#ff6432";
        ctx.strokeStyle = "#ffe4c0";
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = isQ || isR ? 20 : 12;
        ctx.shadowColor = isQ || isR ? gold : red;
        drawFistMark(ctx, R * 0.5);
        ctx.stroke();
        ctx.restore();
    }

    if (isQ) {
        ctx.save();
        ctx.rotate(fc * 0.2);
        ctx.strokeStyle = "rgba(255, 100, 50, 0.86)";
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = red;
        drawImpactArc(ctx, R * 2.05, -Math.PI * 0.15, Math.PI * 1.28, 4, fc);
        ctx.restore();
    }

    if (isE) {
        ctx.strokeStyle = "rgba(255, 138, 28, 0.84)";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = orange;
        ctx.beginPath();
        ctx.arc(0, 0, R * (1.9 + pulse * 0.16), 0, Math.PI * 2);
        ctx.stroke();
    }

    if (isR) {
        ctx.save();
        ctx.rotate(-fc * 0.035);
        ctx.strokeStyle = "rgba(255, 200, 0, 0.68)";
        ctx.lineWidth = 2.4;
        ctx.setLineDash([10, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, R * 2.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;

    if (player.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, R + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "#00aaff";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    const s = state.playerStatus || {};
    if (s.slowTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, R + 12, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    if (s.stunTimer > 0) {
        ctx.fillStyle = "#ffff00";
        for (let i = 0; i < 3; i++) {
            const a = fc * 0.2 + i * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}

export const brawler = {
    id: "brawler",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        if (key === "q") {
            state.activeBuffs.q = 15;
            pushBrawlerBurst(state, "q", player.x, player.y, 120, 24);
            state.screenShake = { timer: 8, intensity: 2.4 };
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 120, life: 30, maxLife: 30, color: "#ff6432" });

            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2;
                pushBrawlerShard(state, player.x, player.y, 4 + Math.random() * 4, 22, a, i % 2 === 0 ? "#ff6432" : "#ffc800");
            }

            state.ghosts.forEach(g => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 120) {
                    g.hp -= 3;
                    g.isStunned = Math.max(g.isStunned, 30);
                }
            });
            if (state.boss && dist(player.x, player.y, state.boss.x, state.boss.y) < 120 + state.boss.radius) {
                state.boss.hp -= 5;
            }
        }

        if (key === "e") {
            state.activeBuffs.e = 4 * FPS;
            pushBrawlerBurst(state, "e", player.x, player.y, 90, 26);
            state.screenShake = { timer: 5, intensity: 1.2 };
        }

        if (key === "r") {
            state.activeBuffs.r = 30;
            state.screenShake = { timer: 10, intensity: 6 };
            pushBrawlerBurst(state, "r", player.x, player.y, 300, 38);
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: 300, life: 40, maxLife: 40, color: "#ffc800" });

            for (let i = 0; i < 18; i++) {
                const a = (i / 18) * Math.PI * 2;
                pushBrawlerShard(state, player.x, player.y, 5 + Math.random() * 5, 30, a, i % 3 === 0 ? "#ffc800" : "#ff6432");
            }

            state.ghosts.forEach(g => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 300) {
                    g.hp -= 8;
                    g.isStunned = Math.max(g.isStunned, 90);
                }
            });
            if (state.boss && dist(player.x, player.y, state.boss.x, state.boss.y) < 300 + state.boss.radius) {
                state.boss.hp -= 15;
            }
        }
        return true;
    },

    update: (state) => {
        const { player, frameCount } = state;
        if (!player) return;

        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.3;

            if (frameCount % 4 === 0) {
                pushBrawlerShard(
                    state,
                    player.x + (Math.random() - 0.5) * player.radius,
                    player.y + player.radius * 0.6,
                    3 + Math.random() * 3,
                    18,
                    Math.random() * Math.PI * 2,
                    "#ff8a1c",
                );
            }
        }

        if (state.activeBuffs.r > 0 && frameCount % 5 === 0) {
            const a = Math.random() * Math.PI * 2;
            pushBrawlerShard(
                state,
                player.x + Math.cos(a) * (70 + Math.random() * 120),
                player.y + Math.sin(a) * (70 + Math.random() * 120),
                4 + Math.random() * 4,
                20,
                a,
                "#ffc800",
            );
        }

        if (state.brawlerShards) {
            state.brawlerShards.forEach(s => {
                s.life--;
                s.x += s.vx;
                s.y += s.vy;
                s.vx *= 0.94;
                s.vy *= 0.94;
                s.angle += s.spin;
            });
            state.brawlerShards = state.brawlerShards.filter(s => s.life > 0);
        }

        if (state.brawlerBursts) {
            state.brawlerBursts.forEach(b => b.life--);
            state.brawlerBursts = state.brawlerBursts.filter(b => b.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;
        if (!player) return;

        state.brawlerShards?.forEach(s => {
            const alpha = Math.max(0, s.life / s.maxLife);
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.angle);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = alpha;
            ctx.fillStyle = s.color;
            ctx.strokeStyle = "rgba(255, 240, 200, 0.7)";
            ctx.lineWidth = 1;
            ctx.shadowBlur = 14;
            ctx.shadowColor = s.color;
            ctx.beginPath();
            ctx.moveTo(s.radius, 0);
            ctx.lineTo(-s.radius * 0.4, s.radius * 0.7);
            ctx.lineTo(-s.radius * 0.65, -s.radius * 0.55);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        state.brawlerBursts?.forEach(burst => {
            drawBrawlerBurst(ctx, burst, frameCount || 0);
        });

        if (buffs.q > 0) {
            const progress = 1 - buffs.q / 15;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, 120 - buffs.q * 8, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 100, 50, ${buffs.q / 15})`;
            ctx.lineWidth = 10;
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff6432";
            ctx.stroke();

            ctx.translate(player.x, player.y);
            ctx.rotate((frameCount || 0) * 0.16);
            ctx.strokeStyle = `rgba(255, 200, 0, ${0.7 - progress * 0.25})`;
            ctx.lineWidth = 4;
            drawImpactArc(ctx, 40 + progress * 85, -Math.PI * 0.2, Math.PI * 1.25, 6, frameCount || 0);
            ctx.restore();
        }

        if (buffs.e > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8 + Math.sin((frameCount || 0) * 0.25) * 3, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 120, 20, 0.82)";
            ctx.lineWidth = 4;
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#ff8a1c";
            ctx.stroke();
            ctx.restore();
        }

        if (buffs.r > 0) {
            const progress = 1 - buffs.r / 30;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, 300 - buffs.r * 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 200, 0, ${buffs.r / 30})`;
            ctx.lineWidth = 15;
            ctx.shadowBlur = 28;
            ctx.shadowColor = "#ffc800";
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(player.x, player.y, 80 + progress * 220, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${(buffs.r / 30) * 0.1})`;
            ctx.fill();
            ctx.restore();
        }
    }
};
