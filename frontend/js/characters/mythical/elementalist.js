import { dist } from "../../utils.js";

export const elementalist = {
    id: "elementalist",
    update: (state, ctx, canvas, buffs) => {
        let { player, ghosts, boss, mouse } = state;

        // Thay đổi nguyên tố liên tục khi Q hoạt động
        if (buffs.q > 0) {
            const elements = ["fire", "ice", "lightning", "earth", "wind"];
            let idx = elements.indexOf(state.element);
            state.element = elements[(idx + 1) % elements.length];
            player.color = state.elementColors[state.element];
        }

        // Xử lý E
        if (buffs.e > 0) {
            let el = state.element;
            if (el === "fire") state.hazards.push({ type: "fire", x: mouse.x, y: mouse.y, radius: 80, life: 120 });
            if (el === "ice") state.hazards.push({ type: "frost", x: mouse.x, y: mouse.y, radius: 100, life: 120 });
            if (el === "lightning") {
                ghosts.forEach((g) => {
                    if (dist(mouse.x, mouse.y, g.x, g.y) < 200) {
                        g.hp -= 2;
                        g.isStunned = 40;
                    }
                });
            }
            if (el === "earth") state.hazards.push({ type: "rock", x: mouse.x, y: mouse.y, radius: 60, life: 180, active: true });
            if (el === "wind") {
                if (!state.windTornadoes) state.windTornadoes = [];
                state.windTornadoes.push({ x: mouse.x, y: mouse.y, radius: 150, life: 120 });
            }
            buffs.e = 0; // Reset
        }

        // Xử lý Ultimate R (elementR)
        if (state.elementR) {
            state.elementR.life--;
            let el = state.elementR.type;

            if (el === "fire" && state.frameCount % 10 === 0) {
                state.hazards.push({ type: "fire", x: Math.random() * 800, y: Math.random() * 600, radius: 60, life: 60, owner: "player" });
            }
            if (el === "lightning" && state.frameCount % 8 === 0) {
                let x = Math.random() * 800, y = Math.random() * 600;
                if (!state.stormLightnings) state.stormLightnings = [];
                state.stormLightnings.push({ x, y, life: 12 });
                ghosts.forEach((g) => {
                    if (dist(x, y, g.x, g.y) < 100) { g.hp -= 4; g.isStunned = 50; }
                });
                if (boss && dist(x, y, boss.x, boss.y) < 100 + boss.radius) boss.hp -= 3;
                state.screenShake = { timer: 4, intensity: 3 };
            }
            if (el === "wind") {
                if (!state.windParticles) state.windParticles = [];
                for (let i = 0; i < 5; i++) state.windParticles.push({ angle: Math.random() * Math.PI * 2, radius: Math.random() * 150, life: 30 });
                ghosts.forEach((g) => {
                    let d = dist(player.x, player.y, g.x, g.y);
                    if (d < 300) {
                        let pull = (300 - d) * 0.04;
                        let angle = Math.atan2(player.y - g.y, player.x - g.x) + 0.6;
                        g.x += Math.cos(angle) * pull;
                        g.y += Math.sin(angle) * pull;
                        g.isStunned = Math.max(g.isStunned, 5);
                    }
                });
            }
            if (el === "ice_rain" && state.frameCount % 6 === 0) {
                if (!state.icicles) state.icicles = [];
                state.icicles.push({ x: Math.random() * 800, y: -20, vy: 12, radius: 12, life: 60 });
            }
            if (el === "earth" && state.frameCount % 6 === 0) {
                if (!state.explosions) state.explosions = [];
                state.explosions.push({ x: player.x, y: player.y, radius: 180, life: 8, color: "rgba(150,100,50,0.4)" });
                ghosts.forEach((g) => {
                    let d = dist(player.x, player.y, g.x, g.y);
                    if (d < 200) {
                        let force = (200 - d) * 0.8;
                        g.x += ((g.x - player.x) / (d || 1)) * force;
                        g.y += ((g.y - player.y) / (d || 1)) * force;
                        g.isStunned = Math.max(g.isStunned, 10);
                    }
                });
                state.bullets.forEach((b) => {
                    if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 200) b.isPlayer = true;
                });
                state.screenShake = { timer: 6, intensity: 4 };
            }
            if (state.elementR.life <= 0) state.elementR = null;
        }

        // Xử lý Tornado (Lốc xoáy của hệ Gió)
        if (state.windTornadoes) {
            state.windTornadoes = state.windTornadoes.filter((t) => {
                t.life--;
                ghosts.forEach((g) => {
                    let d = dist(t.x, t.y, g.x, g.y);
                    if (d < t.radius) {
                        let pull = Math.min(3, (t.radius - d) * 0.05);
                        let angle = Math.atan2(t.y - g.y, t.x - g.x) + 0.8;
                        g.x += Math.cos(angle) * pull;
                        g.y += Math.sin(angle) * pull;
                        g.isStunned = Math.max(g.isStunned, 5);
                    }
                });
                return t.life > 0;
            });
        }

        // Xử lý Icicles
        if (state.icicles) {
            state.icicles = state.icicles.filter((ic) => {
                ic.y += ic.vy;
                ic.life--;
                ghosts.forEach((g) => {
                    if (dist(ic.x, ic.y, g.x, g.y) < g.radius + ic.radius) { g.hp -= 3; g.isStunned = 40; }
                });
                if (boss && dist(ic.x, ic.y, boss.x, boss.y) < boss.radius + ic.radius) boss.hp -= 2;
                return ic.life > 0 && ic.y < 650;
            });
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;
        let el = state.element;

        if (buffs.e > 0) {
            if (el === "fire") { ctx.fillStyle = "rgba(255,80,0,0.1)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            if (el === "ice") { ctx.fillStyle = "rgba(0,200,255,0.1)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            if (el === "lightning" && state.frameCount % 10 < 5) { ctx.fillStyle = "rgba(255,255,200,0.1)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            if (el === "earth") {
                ctx.beginPath(); ctx.arc(player.x, player.y, 120, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(150,100,50,0.6)"; ctx.lineWidth = 5; ctx.stroke();
            }
            if (el === "wind") {
                ctx.beginPath(); ctx.arc(player.x, player.y, 100, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(200,255,255,0.6)"; ctx.setLineDash([5, 10]); ctx.stroke(); ctx.setLineDash([]);
            }
        }

        if (buffs.r > 0) {
            if (el === "fire") { ctx.fillStyle = "rgba(255,50,0,0.2)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            if (el === "ice") { ctx.fillStyle = "rgba(0,200,255,0.2)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            if (el === "lightning") { ctx.fillStyle = "rgba(255,255,0,0.15)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            if (el === "wind") { ctx.fillStyle = "rgba(200,255,255,0.1)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
            if (el === "earth") {
                ctx.beginPath(); ctx.arc(player.x, player.y, 250, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(150,100,50,0.5)"; ctx.lineWidth = 10; ctx.stroke();
            }
        }
    }
};