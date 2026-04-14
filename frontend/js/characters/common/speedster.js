import { FPS } from "../../config.js";

function drawLightningSegment(ctx, x1, y1, x2, y2, jitter, steps = 4) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
        const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function pushSpeedsterBurst(state, type, radius, life) {
    const player = state.player;
    if (!player) return;
    if (!state.speedsterBursts) state.speedsterBursts = [];
    state.speedsterBursts.push({
        x: player.x,
        y: player.y,
        type,
        radius,
        life,
        maxLife: life,
    });
}

function drawSpeedsterBurst(ctx, burst, frameCount) {
    const progress = 1 - burst.life / burst.maxLife;
    const alpha = Math.max(0, burst.life / burst.maxLife);
    const radius = burst.radius * (0.25 + progress * 0.9);
    const boltCount = burst.type === "r" ? 16 : burst.type === "e" ? 9 : 7;

    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalCompositeOperation = "lighter";

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.38})`);
    glow.addColorStop(0.35, `rgba(255, 220, 0, ${alpha * 0.24})`);
    glow.addColorStop(1, "rgba(255, 150, 0, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    for (let ring = 0; ring < (burst.type === "r" ? 3 : 2); ring++) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * (0.65 + ring * 0.22), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, ${ring === 0 ? 255 : 190}, 40, ${alpha * (0.75 - ring * 0.15)})`;
        ctx.lineWidth = Math.max(1, 4 - ring);
        ctx.shadowBlur = 25;
        ctx.shadowColor = "#ffd400";
        ctx.stroke();
    }

    for (let i = 0; i < boltCount; i++) {
        const a =
            (i / boltCount) * Math.PI * 2 +
            frameCount * (burst.type === "r" ? 0.05 : 0.08);
        const inner = radius * (burst.type === "e" ? 0.25 : 0.12);
        const outer = radius * (0.8 + Math.sin(frameCount * 0.12 + i) * 0.16);

        ctx.strokeStyle =
            i % 3 === 0
                ? `rgba(255, 255, 255, ${alpha * 0.9})`
                : `rgba(255, 210, 0, ${alpha * 0.82})`;
        ctx.lineWidth = burst.type === "r" ? 3 : 2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#ffd400";
        drawLightningSegment(
            ctx,
            Math.cos(a) * inner,
            Math.sin(a) * inner,
            Math.cos(a + Math.sin(i) * 0.18) * outer,
            Math.sin(a + Math.cos(i) * 0.18) * outer,
            burst.type === "r" ? 18 : 10,
            5,
        );
    }

    if (burst.type === "e") {
        ctx.rotate(frameCount * 0.16);
        for (let i = 0; i < 3; i++) {
            const a = i * (Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.arc(
                Math.cos(a) * radius * 0.55,
                Math.sin(a) * radius * 0.55,
                4,
                0,
                Math.PI * 2,
            );
            ctx.fillStyle = `rgba(255, 255, 160, ${alpha})`;
            ctx.shadowBlur = 14;
            ctx.shadowColor = "#ffd400";
            ctx.fill();
        }
    }

    ctx.restore();
}

export function drawSpeedsterPlayer(ctx, state, buffs, isInvulnSkill = false) {
    const { player, frameCount } = state;
    if (!player) return;

    const R = player.radius;
    const fc = frameCount || 0;
    const isDashing = player.dashTimeLeft > 0;
    const isQ = buffs.q > 0;
    const isE = buffs.e > 0;
    const isR = buffs.r > 0;
    const charged = isDashing || isInvulnSkill || isQ || isE || isR;
    const flash = isR || isDashing || Math.sin(fc * 0.28) > 0.72;
    const bodyPulse = 1 + Math.sin(fc * 0.2) * (isR ? 0.18 : 0.08);
    const lightningCore = flash ? "#ffffff" : "#fff36a";
    const lightningMain = "#ffd400";
    const lightningDeep = "#ff9f00";
    const lightningEdge = "#6b3600";

    if (player.gracePeriod > 0 && !charged && Math.floor(fc / 6) % 2 !== 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalCompositeOperation = "lighter";

    if (isDashing || isQ || isR) {
        const trailCount = isR ? 6 : 4;
        const dx = player.dashDx || Math.cos(fc * 0.05);
        const dy = player.dashDy || Math.sin(fc * 0.05);
        for (let i = trailCount; i >= 1; i--) {
            const alpha = (trailCount - i + 1) / trailCount;
            const off = i * (isR ? 12 : 8);
            ctx.beginPath();
            ctx.ellipse(
                -dx * off,
                -dy * off,
                R * (1.25 - alpha * 0.35),
                R * (0.75 - alpha * 0.2),
                Math.atan2(dy, dx),
                0,
                Math.PI * 2,
            );
            ctx.fillStyle = `rgba(255, 210, 0, ${0.08 + alpha * 0.1})`;
            ctx.fill();
        }
    }

    const auraR = R * (isR ? 3.4 : isQ ? 2.6 : isE ? 2.2 : 1.8);
    const aura = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, auraR);
    aura.addColorStop(
        0,
        flash ? "rgba(255, 255, 255, 0.65)" : "rgba(255, 240, 80, 0.42)",
    );
    aura.addColorStop(
        0.45,
        isE ? "rgba(255, 230, 0, 0.28)" : "rgba(255, 190, 0, 0.24)",
    );
    aura.addColorStop(1, "rgba(255, 150, 0, 0)");
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fillStyle = aura;
    ctx.fill();

    for (let ring = 0; ring < (isR ? 3 : charged ? 2 : 1); ring++) {
        const spin = fc * (0.07 + ring * 0.025) * (ring % 2 === 0 ? 1 : -1);
        const ringR =
            R * (1.55 + ring * 0.45 + Math.sin(fc * 0.14 + ring) * 0.08);
        ctx.save();
        ctx.rotate(spin);
        ctx.beginPath();
        ctx.ellipse(0, 0, ringR, ringR * 0.58, Math.PI / 5, 0, Math.PI * 2);
        ctx.strokeStyle = ring % 2 === 0
            ? `rgba(255, 245, 90, ${isR ? 0.85 : 0.55})`
            : `rgba(255, 170, 0, ${isR ? 0.7 : 0.42})`;
        ctx.lineWidth = isR ? 3 : 2;
        ctx.shadowBlur = isR ? 22 : 12;
        ctx.shadowColor = ring % 2 === 0 ? lightningCore : lightningDeep;
        ctx.stroke();
        ctx.restore();
    }

    const boltCount = isR ? 10 : charged ? 7 : 4;
    for (let i = 0; i < boltCount; i++) {
        const a = (i / boltCount) * Math.PI * 2 + fc * 0.08;
        const inner = R * (0.85 + Math.sin(fc * 0.1 + i) * 0.12);
        const outer = R * (isR ? 2.65 : charged ? 2.15 : 1.55);
        ctx.strokeStyle = i % 2 === 0
            ? `rgba(255, 255, ${flash ? 255 : 90}, ${flash ? 0.95 : 0.55})`
            : `rgba(255, 170, 0, ${isR ? 0.85 : 0.5})`;
        ctx.lineWidth = flash ? 2.6 : 1.5;
        ctx.shadowBlur = flash ? 24 : 10;
        ctx.shadowColor = i % 2 === 0 ? lightningCore : lightningDeep;
        drawLightningSegment(
            ctx,
            Math.cos(a) * inner,
            Math.sin(a) * inner,
            Math.cos(a + Math.sin(fc + i) * 0.1) * outer,
            Math.sin(a + Math.cos(fc + i) * 0.1) * outer,
            isR ? 9 : 5,
        );
    }

    const body = ctx.createRadialGradient(
        -R * 0.35,
        -R * 0.35,
        R * 0.05,
        0,
        0,
        R * 1.25,
    );
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.28, "#fff8a8");
    body.addColorStop(0.62, lightningMain);
    body.addColorStop(1, lightningEdge);
    ctx.beginPath();
    ctx.arc(0, 0, R * bodyPulse, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.shadowBlur = flash ? 45 : 24;
    ctx.shadowColor = flash ? lightningCore : lightningMain;
    ctx.fill();

    ctx.lineWidth = flash ? 4 : 2;
    ctx.strokeStyle = flash ? "#ffffff" : lightningMain;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-R * 0.15, -R * 0.8);
    ctx.lineTo(R * 0.35, -R * 0.15);
    ctx.lineTo(R * 0.05, -R * 0.15);
    ctx.lineTo(R * 0.35, R * 0.8);
    ctx.lineTo(-R * 0.35, R * 0.05);
    ctx.lineTo(-R * 0.05, R * 0.05);
    ctx.closePath();
    ctx.fillStyle = flash ? "#ffffff" : lightningMain;
    ctx.shadowBlur = 18;
    ctx.shadowColor = lightningMain;
    ctx.fill();

    if (isE) {
        for (let i = 0; i < 3; i++) {
            const a = fc * 0.16 + i * (Math.PI * 2 / 3);
            const x = Math.cos(a) * R * 1.45;
            const y = Math.sin(a) * R * 1.45;
            ctx.beginPath();
            ctx.arc(x, y, R * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 245, 90, 0.95)";
            ctx.shadowBlur = 15;
            ctx.shadowColor = lightningMain;
            ctx.fill();
        }
    }

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";

    if (player.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, R + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "#00aaff";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    const s = state.playerStatus;
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

export const speedster = {
    id: "speedster",

    onTrigger: (key, state, canvas, changeStateFn) => {
        // Q: Chạy Nước Rút
        if (key === "q") {
            state.activeBuffs.q = 4 * FPS;
            pushSpeedsterBurst(state, "q", 90, 24);
            state.screenShake = { timer: 6, intensity: 1.2 };
        }

        // E: Bắn Tốc Độ Cao
        if (key === "e") {
            state.activeBuffs.e = 4 * FPS;
            pushSpeedsterBurst(state, "e", 75, 28);
            state.screenShake = { timer: 8, intensity: 1.5 };
        }

        // R: Tốc Độ Ánh Sáng (Kết hợp Q và E, tạo bóng mờ và tăng cực đại chỉ số)
        if (key === "r") {
            state.activeBuffs.r = 6 * FPS;
            pushSpeedsterBurst(state, "r", 180, 42);
            state.screenShake = { timer: 18, intensity: 4 };
        }
        return true;
    },

    update: (state) => {
        const { player, frameCount } = state;

        // Logic Q: Tăng 50% tốc độ chạy
        if (state.activeBuffs.q > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.5;

            if (frameCount % 5 === 0) {
                if (!state.phantoms) state.phantoms = [];
                state.phantoms.push({
                    x: player.x,
                    y: player.y,
                    life: 10,
                    color: "rgba(255, 220, 0, 0.22)",
                    radius: player.radius * 0.9
                });
            }
        }

        // Logic E: Giảm mạnh thời gian hồi chiêu súng (bắn cực nhanh)
        if (state.activeBuffs.e > 0) {
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.4;

            if (frameCount % 8 === 0) {
                pushSpeedsterBurst(state, "e", 34, 10);
            }
        }

        // Logic R: Tốc độ tối đa
        if (state.activeBuffs.r > 0) {
            state.playerSpeedMultiplier = (state.playerSpeedMultiplier || 1) * 1.8;
            state.playerFireRateMultiplier = (state.playerFireRateMultiplier || 1) * 0.3;

            // Sinh bóng mờ liên tục khi đang bật R
            if (frameCount % 3 === 0) {
                if (!state.phantoms) state.phantoms = [];
                state.phantoms.push({
                    x: player.x,
                    y: player.y,
                    life: 12,
                    color: "rgba(255, 210, 0, 0.32)",
                    radius: player.radius
                });
            }

            if (frameCount % 10 === 0) {
                pushSpeedsterBurst(state, "r", 110, 18);
            }
        }

        // Dọn dẹp bóng mờ (Phantoms)
        if (state.phantoms) {
            state.phantoms.forEach(p => p.life--);
            state.phantoms = state.phantoms.filter(p => p.life > 0);
        }

        if (state.speedsterBursts) {
            state.speedsterBursts.forEach(b => b.life--);
            state.speedsterBursts = state.speedsterBursts.filter(b => b.life > 0);
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player } = state;

        // Vẽ bóng mờ (R)
        state.phantoms?.forEach(p => {
            const alpha = Math.max(0, p.life / 12);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        state.speedsterBursts?.forEach((burst) => {
            drawSpeedsterBurst(ctx, burst, state.frameCount || 0);
        });

        // Vẽ luồng gió viền quanh người (Q hoặc R)
        if (buffs.q > 0 || buffs.r > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 220, 0, 0.75)";
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Vẽ vũ khí / người phát sáng cam báo hiệu đang bắn nhanh (E)
        if (buffs.e > 0) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate((state.frameCount || 0) * 0.18);
            ctx.strokeStyle = "rgba(255, 230, 0, 0.85)";
            ctx.lineWidth = 2;
            ctx.shadowBlur = 14;
            ctx.shadowColor = "#ffd400";
            for (let i = 0; i < 6; i++) {
                const a = i * (Math.PI * 2 / 6);
                drawLightningSegment(
                    ctx,
                    Math.cos(a) * (player.radius + 4),
                    Math.sin(a) * (player.radius + 4),
                    Math.cos(a + 0.22) * (player.radius + 18),
                    Math.sin(a + 0.22) * (player.radius + 18),
                    5,
                    3,
                );
            }
            ctx.restore();

            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 230, 0, 0.9)";
            ctx.lineWidth = 2;
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#ffd400";
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
};
