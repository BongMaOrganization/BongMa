import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { updateHealthUI } from "../../ui.js";

function pushMedicBurst(state, type, x, y, radius, life) {
    if (!state.medicBursts) state.medicBursts = [];
    state.medicBursts.push({
        x,
        y,
        type,
        radius,
        life,
        maxLife: life,
    });
}

function pushMedicMote(state, x, y, radius, life, vx = 0, vy = 0, color = "#00ffaa") {
    if (!state.medicMotes) state.medicMotes = [];
    state.medicMotes.push({
        x,
        y,
        vx,
        vy,
        radius,
        life,
        maxLife: life,
        color,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.22,
        angle: Math.random() * Math.PI * 2,
    });
}

function drawPlus(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.stroke();
}

function drawMedicBurst(ctx, burst, frameCount) {
    const progress = 1 - burst.life / burst.maxLife;
    const alpha = Math.max(0, burst.life / burst.maxLife);
    const radius = burst.radius * (0.2 + progress * 0.95);
    const teal = "#00ffcc";
    const mint = "#00ffaa";
    const red = "#ff3355";

    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.32})`);
    glow.addColorStop(
        0.42,
        burst.type === "r"
            ? `rgba(0, 255, 204, ${alpha * 0.26})`
            : `rgba(0, 255, 170, ${alpha * 0.24})`,
    );
    glow.addColorStop(1, "rgba(0, 55, 55, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
        const rr = radius * (0.55 + ring * 0.2);
        ctx.save();
        ctx.rotate(frameCount * (0.03 + ring * 0.012) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle =
            ring === 0
                ? `rgba(235, 255, 255, ${alpha * 0.82})`
                : `rgba(0, 255, 204, ${alpha * 0.6})`;
        ctx.lineWidth = Math.max(1.4, 4.5 - ring);
        ctx.shadowBlur = 22;
        ctx.shadowColor = teal;
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    const spokes = burst.type === "r" ? 14 : burst.type === "e" ? 10 : 8;
    ctx.lineCap = "round";
    for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2 + frameCount * 0.04;
        const inner = radius * 0.2;
        const outer = radius * (0.78 + Math.sin(frameCount * 0.1 + i) * 0.1);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.strokeStyle =
            i % 3 === 0
                ? `rgba(255, 255, 255, ${alpha * 0.72})`
                : `rgba(0, 255, 170, ${alpha * 0.56})`;
        ctx.lineWidth = burst.type === "r" ? 3 : 2;
        ctx.shadowBlur = 16;
        ctx.shadowColor = mint;
        ctx.stroke();
    }

    if (burst.type === "q") {
        ctx.save();
        ctx.rotate(frameCount * 0.12);
        ctx.strokeStyle = `rgba(255, 51, 85, ${alpha * 0.75})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = red;
        drawPlus(ctx, Math.max(8, radius * 0.12));
        ctx.restore();
    }

    if (burst.type === "r") {
        ctx.save();
        ctx.rotate(-frameCount * 0.1);
        ctx.strokeStyle = `rgba(255, 51, 85, ${alpha * 0.55})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    ctx.restore();
}

export function drawMedicPlayer(ctx, state, buffs, isInvulnSkill = false) {
    const { player, frameCount } = state;
    if (!player) return;

    const R = player.radius;
    const fc = frameCount || 0;
    const isQ = buffs.q > 0;
    const isE = buffs.e > 0;
    const isR = buffs.r > 0;
    const energized = isQ || isE || isR || isInvulnSkill;
    const pulse = (Math.sin(fc * 0.18) + 1) * 0.5;
    const teal = "#00ffcc";
    const mint = "#00ffaa";
    const red = "#ff3355";

    if (player.gracePeriod > 0 && !energized && Math.floor(fc / 6) % 2 !== 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = "lighter";

    const auraR = R * (isR ? 3.15 : isE ? 2.45 : isQ ? 2.3 : 1.8);
    const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
    aura.addColorStop(0, energized ? "rgba(255, 255, 255, 0.46)" : "rgba(0, 255, 204, 0.2)");
    aura.addColorStop(0.45, isE ? "rgba(0, 255, 170, 0.26)" : "rgba(0, 255, 204, 0.18)");
    aura.addColorStop(1, "rgba(0, 55, 55, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    for (let ring = 0; ring < (isR ? 3 : energized ? 2 : 1); ring++) {
        ctx.save();
        ctx.rotate(fc * (0.03 + ring * 0.014) * (ring % 2 === 0 ? 1 : -1));
        ctx.strokeStyle =
            ring === 0
                ? `rgba(0, 255, 204, ${energized ? 0.82 : 0.46})`
                : `rgba(255, 51, 85, ${isQ || isR ? 0.5 : 0.26})`;
        ctx.lineWidth = ring === 0 ? 2.6 : 1.6;
        ctx.shadowBlur = energized ? 18 : 10;
        ctx.shadowColor = ring === 0 ? teal : red;
        ctx.beginPath();
        ctx.arc(0, 0, R * (1.55 + ring * 0.42 + pulse * 0.08), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    const suit = ctx.createRadialGradient(-R * 0.35, -R * 0.42, R * 0.06, 0, 0, R * 1.3);
    suit.addColorStop(0, "#ffffff");
    suit.addColorStop(0.3, "#eaffff");
    suit.addColorStop(0.7, "#167a7a");
    suit.addColorStop(1, "#062626");

    ctx.shadowBlur = energized ? 36 : 22;
    ctx.shadowColor = energized ? mint : teal;
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.roundRect(-R * 0.84, -R * 0.84, R * 1.68, R * 1.68, R * 0.28);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = energized ? "#ffffff" : "rgba(0, 255, 204, 0.8)";
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#0a1b1b";
    ctx.beginPath();
    ctx.roundRect(-R * 0.56, -R * 0.52, R * 1.12, R * 0.72, R * 0.14);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#f7ffff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = teal;
    ctx.beginPath();
    ctx.arc(-R * 0.22, -R * 0.16, R * 0.08, 0, Math.PI * 2);
    ctx.arc(R * 0.22, -R * 0.16, R * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, R * 0.1);
    ctx.strokeStyle = red;
    ctx.lineWidth = 3;
    ctx.shadowBlur = energized ? 18 : 12;
    ctx.shadowColor = red;
    drawPlus(ctx, R * 0.22);
    ctx.restore();

    if (isQ) {
        ctx.strokeStyle = "rgba(0, 255, 170, 0.85)";
        ctx.lineWidth = 3.2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = mint;
        ctx.beginPath();
        ctx.arc(0, 0, R * (1.95 + pulse * 0.16), 0, Math.PI * 2);
        ctx.stroke();
    }

    if (isE) {
        for (let i = 0; i < 4; i++) {
            const a = fc * 0.12 + i * Math.PI / 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * R * 1.75, Math.sin(a) * R * 1.75, R * 0.16, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 255, 204, 0.85)";
            ctx.shadowBlur = 16;
            ctx.shadowColor = teal;
            ctx.fill();
        }
    }

    if (isR) {
        ctx.save();
        ctx.rotate(-fc * 0.04);
        ctx.strokeStyle = "rgba(0, 255, 204, 0.62)";
        ctx.lineWidth = 2.2;
        ctx.setLineDash([9, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, R * 2.65, 0, Math.PI * 2);
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

export const medic = {
    id: "medic",

    onTrigger: (key, state, canvas, changeStateFn) => {
        const { player } = state;

        if (key === "q") {
            if (player.hp < player.maxHp) {
                player.hp++;
                updateHealthUI();

                if (!state.floatingTexts) state.floatingTexts = [];
                state.floatingTexts.push({
                    x: player.x,
                    y: player.y - 30,
                    text: "+1 HP",
                    color: "#00ffaa",
                    life: 40,
                });
            } else {
                state.player.exp = (state.player.exp || 0) + 10;
                if (!state.floatingTexts) state.floatingTexts = [];
                state.floatingTexts.push({
                    x: player.x,
                    y: player.y - 30,
                    text: "+10 EXP",
                    color: "#ffff00",
                    life: 40,
                });
            }
            state.activeBuffs.q = 30;
            pushMedicBurst(state, "q", player.x, player.y, 90, 26);
            state.screenShake = { timer: 6, intensity: 1.2 };
        }

        if (key === "e") {
            state.activeBuffs.e = 4 * FPS;
            pushMedicBurst(state, "e", player.x, player.y, 105, 30);
            state.screenShake = { timer: 5, intensity: 1.0 };
        }

        if (key === "r") {
            state.activeBuffs.r = 60;
            state.ghosts.forEach(g => {
                if (dist(player.x, player.y, g.x, g.y) < 250) {
                    g.isStunned = Math.max(g.isStunned, 60);
                    g.hp -= 2;
                }
            });
            state.player.hp = Math.min(player.maxHp, player.hp + 5);
            updateHealthUI();
            state.screenShake = { timer: 10, intensity: 3 };
            pushMedicBurst(state, "r", player.x, player.y, 250, 44);
        }
        return true;
    },

    update: (state) => {
        const { player, frameCount } = state;
        if (!player) return;

        if (state.activeBuffs.e > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.35;

            if (frameCount % 4 === 0) {
                pushMedicMote(
                    state,
                    player.x + (Math.random() - 0.5) * player.radius * 2,
                    player.y + player.radius * 0.8,
                    3 + Math.random() * 3,
                    18,
                    (Math.random() - 0.5) * 0.6,
                    -0.2 - Math.random() * 0.4,
                    Math.random() > 0.2 ? "#00ffcc" : "#00ffaa",
                );
            }
        }

        if (state.activeBuffs.q > 0 && frameCount % 3 === 0) {
            const a = Math.random() * Math.PI * 2;
            pushMedicMote(
                state,
                player.x + Math.cos(a) * (18 + Math.random() * 22),
                player.y + Math.sin(a) * (18 + Math.random() * 22),
                3 + Math.random() * 3,
                22,
                Math.cos(a) * 0.2,
                Math.sin(a) * 0.2 - 0.25,
                "#00ffaa",
            );
        }

        if (state.activeBuffs.r > 0 && frameCount % 2 === 0) {
            const a = Math.random() * Math.PI * 2;
            pushMedicMote(
                state,
                player.x + Math.cos(a) * (70 + Math.random() * 170),
                player.y + Math.sin(a) * (70 + Math.random() * 170),
                4 + Math.random() * 4,
                24,
                -Math.cos(a) * (0.25 + Math.random() * 0.35),
                -Math.sin(a) * (0.25 + Math.random() * 0.35),
                Math.random() > 0.25 ? "#00ffcc" : "#ff3355",
            );
        }

        if (state.medicMotes) {
            state.medicMotes.forEach(m => {
                m.life--;
                m.x += m.vx;
                m.y += m.vy;
                m.vx *= 0.94;
                m.vy *= 0.94;
                m.phase += 0.12;
                m.angle += m.spin;
            });
            state.medicMotes = state.medicMotes.filter(m => m.life > 0);
        }

        if (state.medicBursts) {
            state.medicBursts.forEach(b => b.life--);
            state.medicBursts = state.medicBursts.filter(b => b.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, frameCount } = state;
        if (!player) return;

        state.medicMotes?.forEach(m => {
            const alpha = Math.max(0, m.life / m.maxLife);
            ctx.save();
            ctx.translate(m.x, m.y);
            ctx.rotate(m.angle);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = m.color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 14;
            ctx.shadowColor = m.color;
            drawPlus(ctx, m.radius);
            ctx.restore();
        });

        state.medicBursts?.forEach(burst => {
            drawMedicBurst(ctx, burst, frameCount || 0);
        });

        if (buffs.q > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15 + (30 - buffs.q), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 150, ${buffs.q / 30})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 18;
            ctx.shadowColor = "#00ffaa";
            ctx.stroke();
            ctx.restore();
        }

        if (buffs.e > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0, 255, 204, 0.6)";
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 3;
            ctx.shadowBlur = 16;
            ctx.shadowColor = "#00ffcc";
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        if (buffs.r > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = `rgba(0, 255, 170, ${(buffs.r / 60) * 0.14})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const progress = 1 - buffs.r / 60;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + progress * 250, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 204, ${buffs.r / 60})`;
            ctx.lineWidth = 10 * (buffs.r / 60);
            ctx.shadowBlur = 26;
            ctx.shadowColor = "#00ffcc";
            ctx.stroke();
            ctx.restore();
        }
    },
};
