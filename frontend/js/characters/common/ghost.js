import { dist } from "../../utils.js";
import { FPS } from "../../config.js";

function pushGhostBurst(state, type, radius, life) {
    const player = state.player;
    if (!player) return;
    if (!state.ghostBursts) state.ghostBursts = [];
    state.ghostBursts.push({
        x: player.x,
        y: player.y,
        type,
        radius,
        life,
        maxLife: life,
    });
}

function pushGhostWisp(state, x, y, radius, life, alpha = 0.3) {
    if (!state.ghostWisps) state.ghostWisps = [];
    state.ghostWisps.push({
        x,
        y,
        radius,
        life,
        maxLife: life,
        alpha,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.45,
        driftY: -0.2 - Math.random() * 0.35,
    });
}

function drawGhostShape(ctx, radius, alpha, frameCount, fillColor = "#d9e7ff") {
    const wave = Math.sin(frameCount * 0.16) * radius * 0.08;

    ctx.beginPath();
    ctx.moveTo(-radius * 0.92, radius * 0.72);
    ctx.bezierCurveTo(
        -radius * 1.12,
        -radius * 0.2 + wave,
        -radius * 0.58,
        -radius * 1.18,
        0,
        -radius * 1.22,
    );
    ctx.bezierCurveTo(
        radius * 0.64,
        -radius * 1.16,
        radius * 1.1,
        -radius * 0.16 - wave,
        radius * 0.86,
        radius * 0.74,
    );
    ctx.quadraticCurveTo(radius * 0.62, radius * 0.48, radius * 0.36, radius * 0.76);
    ctx.quadraticCurveTo(radius * 0.16, radius * 0.98, -radius * 0.04, radius * 0.74);
    ctx.quadraticCurveTo(-radius * 0.28, radius * 0.44, -radius * 0.5, radius * 0.78);
    ctx.quadraticCurveTo(-radius * 0.68, radius * 1.02, -radius * 0.92, radius * 0.72);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.globalAlpha *= alpha;
    ctx.fill();
}

function drawGhostBurst(ctx, burst, frameCount) {
    const progress = 1 - burst.life / burst.maxLife;
    const alpha = Math.max(0, burst.life / burst.maxLife);
    const radius = burst.radius * (0.2 + progress * 0.95);
    const tendrils = burst.type === "r" ? 18 : burst.type === "e" ? 10 : 8;

    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(245, 250, 255, ${alpha * 0.32})`);
    glow.addColorStop(0.45, `rgba(150, 125, 255, ${alpha * 0.22})`);
    glow.addColorStop(1, "rgba(35, 10, 90, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.58 + ring * 0.2), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ring === 0 ? 230 : 145}, ${ring === 0 ? 240 : 120}, 255, ${alpha * (0.72 - ring * 0.14)})`;
        ctx.lineWidth = Math.max(1.5, 5 - ring * 1.4);
        ctx.shadowBlur = 24;
        ctx.shadowColor = "#b8a8ff";
        ctx.stroke();
    }

    ctx.lineCap = "round";
    for (let i = 0; i < tendrils; i++) {
        const a = (i / tendrils) * Math.PI * 2 + Math.sin(frameCount * 0.05 + i) * 0.18;
        const inner = radius * 0.2;
        const outer = radius * (0.78 + Math.sin(frameCount * 0.12 + i) * 0.12);
        const mid = radius * (0.42 + Math.cos(frameCount * 0.1 + i) * 0.1);

        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.quadraticCurveTo(
            Math.cos(a + 0.5) * mid,
            Math.sin(a + 0.5) * mid,
            Math.cos(a + 0.2) * outer,
            Math.sin(a + 0.2) * outer,
        );
        ctx.strokeStyle = i % 3 === 0
            ? `rgba(255, 255, 255, ${alpha * 0.78})`
            : `rgba(168, 140, 255, ${alpha * 0.62})`;
        ctx.lineWidth = burst.type === "r" ? 3 : 2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#9f7cff";
        ctx.stroke();
    }

    ctx.restore();
}

export function drawGhostPlayer(ctx, state, buffs, isInvulnSkill = false) {
    const { player, frameCount } = state;
    if (!player) return;

    const R = player.radius;
    const fc = frameCount || 0;
    const isDashing = player.dashTimeLeft > 0;
    const isQ = buffs.q > 0;
    const isE = buffs.e > 0;
    const isR = buffs.r > 0;
    const spectral = isDashing || isInvulnSkill || isQ || isE || isR;
    const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
    const dx = player.dashDx || Math.cos(fc * 0.04);
    const dy = player.dashDy || Math.sin(fc * 0.04);

    if (player.gracePeriod > 0 && !spectral && Math.floor(fc / 6) % 2 !== 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = "lighter";

    if (spectral) {
        const trailCount = isR ? 7 : isDashing || isE ? 5 : 4;
        for (let i = trailCount; i >= 1; i--) {
            const fade = (trailCount - i + 1) / trailCount;
            const off = i * (isR ? 10 : 8);
            ctx.save();
            ctx.translate(-dx * off, -dy * off + Math.sin(fc * 0.12 + i) * 2);
            ctx.rotate(Math.atan2(dy, dx) * 0.18);
            drawGhostShape(ctx, R * (1.02 - fade * 0.18), 0.08 + fade * 0.08, fc + i * 7, "#b8a8ff");
            ctx.restore();
        }
    }

    const auraR = R * (isR ? 3.6 : isQ ? 2.9 : isE || isDashing ? 2.4 : 1.9);
    const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
    aura.addColorStop(0, spectral ? "rgba(255, 255, 255, 0.48)" : "rgba(225, 235, 255, 0.34)");
    aura.addColorStop(0.42, "rgba(155, 130, 255, 0.24)");
    aura.addColorStop(1, "rgba(35, 10, 90, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    for (let i = 0; i < (isR ? 8 : spectral ? 6 : 4); i++) {
        const a = fc * 0.045 + i * (Math.PI * 2 / (isR ? 8 : spectral ? 6 : 4));
        const wispR = R * (1.35 + Math.sin(fc * 0.11 + i) * 0.18);
        ctx.beginPath();
        ctx.arc(
            Math.cos(a) * wispR,
            Math.sin(a) * wispR,
            R * (0.12 + pulse * 0.08),
            0,
            Math.PI * 2,
        );
        ctx.fillStyle = i % 2 === 0
            ? "rgba(235, 245, 255, 0.55)"
            : "rgba(155, 125, 255, 0.42)";
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#b8a8ff";
        ctx.fill();
    }

    const bodyGrad = ctx.createRadialGradient(
        -R * 0.32,
        -R * 0.45,
        R * 0.08,
        0,
        0,
        R * 1.35,
    );
    bodyGrad.addColorStop(0, "#ffffff");
    bodyGrad.addColorStop(0.34, "#d9e7ff");
    bodyGrad.addColorStop(0.74, "#a18cff");
    bodyGrad.addColorStop(1, "rgba(45, 20, 95, 0.75)");

    ctx.shadowBlur = spectral ? 42 : 25;
    ctx.shadowColor = spectral ? "#d9e7ff" : "#9f7cff";
    drawGhostShape(ctx, R * (1.02 + pulse * 0.06), spectral ? 0.92 : 0.82, fc, bodyGrad);

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    ctx.globalAlpha = spectral ? 0.78 : 0.9;

    ctx.fillStyle = "#081125";
    ctx.beginPath();
    ctx.ellipse(-R * 0.28, -R * 0.2, R * 0.13, R * 0.2, -0.1, 0, Math.PI * 2);
    ctx.ellipse(R * 0.28, -R * 0.2, R * 0.13, R * 0.2, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#f7fbff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ffffff";
    ctx.beginPath();
    ctx.arc(-R * 0.28, -R * 0.24, R * 0.045, 0, Math.PI * 2);
    ctx.arc(R * 0.28, -R * 0.24, R * 0.045, 0, Math.PI * 2);
    ctx.fill();

    if (isQ) {
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 1.75, R * (1.25 + pulse * 0.12), fc * 0.04, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(220, 230, 255, 0.65)";
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#d9e7ff";
        ctx.stroke();
    }

    if (isE || isDashing) {
        ctx.beginPath();
        ctx.moveTo(-dx * R * 0.8, -dy * R * 0.8);
        ctx.quadraticCurveTo(-dx * R * 1.9 - dy * R * 0.5, -dy * R * 1.9 + dx * R * 0.5, -dx * R * 3.1, -dy * R * 3.1);
        ctx.strokeStyle = "rgba(185, 160, 255, 0.75)";
        ctx.lineWidth = 5;
        ctx.shadowBlur = 24;
        ctx.shadowColor = "#b8a8ff";
        ctx.stroke();
    }

    if (isR) {
        ctx.beginPath();
        ctx.arc(0, 0, R * (2.1 + pulse * 0.25), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 7]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
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

export const ghost = {
    id: "ghost",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player, mouse } = state;

        if (key === "q") {
            state.activeBuffs.q = 4 * FPS;
            pushGhostBurst(state, "q", 95, 28);
            state.screenShake = { timer: 5, intensity: 1.2 };
        }

        if (key === "e") {
            const dx = mouse.x - player.x, dy = mouse.y - player.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            player.dashTimeLeft = 15;
            player.dashDx = dx / (len || 1);
            player.dashDy = dy / (len || 1);
            player.isInvincible = true;
            state.activeBuffs.e = 15;
            pushGhostBurst(state, "e", 80, 22);
            pushGhostWisp(state, player.x, player.y, player.radius * 1.4, 22, 0.34);
        }

        if (key === "r") {
            state.activeBuffs.r = 20;
            state.screenShake = { timer: 15, intensity: 5 };
            pushGhostBurst(state, "r", 360, 36);

            state.ghosts.forEach(g => {
                if (g.x > 0 && dist(player.x, player.y, g.x, g.y) < 350) {
                    g.hp -= 6;
                    g.isStunned = Math.max(g.isStunned, 180);
                }
            });

            if (state.boss && dist(player.x, player.y, state.boss.x, state.boss.y) < 350 + state.boss.radius) {
                state.boss.hp -= 12;
            }
        }
        return true;
    },

    update: (state) => {
        const { player, frameCount } = state;
        if (!player) return;

        if (state.activeBuffs.q > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.4;
            player.isInvincible = true;

            if (frameCount % 6 === 0) {
                pushGhostWisp(
                    state,
                    player.x + (Math.random() - 0.5) * player.radius * 0.8,
                    player.y + player.radius * 0.2,
                    player.radius * 1.05,
                    24,
                    0.26,
                );
            }
        }

        if (state.activeBuffs.e > 0 && frameCount % 2 === 0) {
            pushGhostWisp(
                state,
                player.x - (player.dashDx || 0) * player.radius * 1.8,
                player.y - (player.dashDy || 0) * player.radius * 1.8,
                player.radius * 1.15,
                18,
                0.32,
            );
        }

        if (state.activeBuffs.r > 0 && frameCount % 4 === 0) {
            pushGhostWisp(
                state,
                player.x + (Math.random() - 0.5) * 70,
                player.y + (Math.random() - 0.5) * 70,
                player.radius * (0.9 + Math.random() * 0.5),
                26,
                0.28,
            );
        }

        if (state.ghostWisps) {
            state.ghostWisps.forEach(w => {
                w.life--;
                w.x += w.driftX;
                w.y += w.driftY;
                w.phase += 0.08;
            });
            state.ghostWisps = state.ghostWisps.filter(w => w.life > 0);
        }

        if (state.ghostBursts) {
            state.ghostBursts.forEach(b => b.life--);
            state.ghostBursts = state.ghostBursts.filter(b => b.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;
        if (!player) return;

        state.ghostWisps?.forEach(w => {
            const alpha = Math.max(0, w.life / w.maxLife) * w.alpha;
            const radius = w.radius * (1 + (1 - w.life / w.maxLife) * 0.35);

            ctx.save();
            ctx.translate(w.x, w.y + Math.sin(w.phase) * 2);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = alpha;
            drawGhostShape(ctx, radius, 1, frameCount + w.phase * 10, "#b8a8ff");
            ctx.restore();
        });

        state.ghostBursts?.forEach(burst => {
            drawGhostBurst(ctx, burst, frameCount || 0);
        });

        if (buffs.q > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(220, 230, 255, 0.72)";
            ctx.lineWidth = 2;
            ctx.shadowBlur = 16;
            ctx.shadowColor = "#d9e7ff";
            ctx.stroke();
            ctx.restore();
        }

        if (buffs.e > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(
                player.x - (player.dashDx || 0) * 25,
                player.y - (player.dashDy || 0) * 25,
                player.radius * 1.15,
                0,
                Math.PI * 2,
            );
            ctx.fillStyle = "rgba(150, 125, 255, 0.22)";
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#b8a8ff";
            ctx.fill();
            ctx.restore();
        }

        if (buffs.r > 0) {
            const progress = 1 - buffs.r / 20;

            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, 350 * progress, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(216, 216, 255, ${buffs.r / 20})`;
            ctx.lineWidth = 10;
            ctx.shadowBlur = 30;
            ctx.shadowColor = "#b8a8ff";
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(player.x, player.y, 350 * progress, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(70, 30, 150, ${buffs.r / 56})`;
            ctx.fill();
            ctx.restore();
        }
    }
};
