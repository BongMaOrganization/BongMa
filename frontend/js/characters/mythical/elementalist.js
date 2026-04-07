import { dist } from "../../utils.js";
import { FPS } from "../../config.js";
import { spawnBullet } from "../../entities/helpers.js";

export const elementalist = {
    id: "elementalist",

    onTrigger: (key, state) => {
        const { player, mouse, element } = state;

        if (key === "q") {
            const elements = ["fire", "ice", "lightning", "earth", "wind"];
            let idx = elements.indexOf(state.element);
            state.element = elements[(idx + 1) % elements.length];
            player.color = state.elementColors[state.element];
        }

        if (key === "e") {
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            const eColors = { fire: "#ff6600", ice: "#00ccff", lightning: "#ffff00", earth: "#8B4513", wind: "#aaffee" };
            const eRadii = { fire: 80, ice: 100, lightning: 200, earth: 60, wind: 140 };
            state.skillRangeIndicators.push({ x: mouse.x, y: mouse.y, radius: eRadii[element] || 100, life: 40, maxLife: 40, color: eColors[element] });

            if (element === "fire") state.hazards.push({ x: mouse.x, y: mouse.y, radius: 80, type: "fire", life: 120, owner: "player" });
            if (element === "ice") state.hazards.push({ x: mouse.x, y: mouse.y, radius: 100, type: "frost", life: 120, owner: "player" });
            if (element === "lightning") {
                state.ghosts.forEach(g => {
                    if (dist(mouse.x, mouse.y, g.x, g.y) < 200) { g.hp -= 2; g.isStunned = 40; }
                });
            }
            if (element === "earth") state.hazards.push({ x: mouse.x, y: mouse.y, radius: 60, type: "rock", life: 180, owner: "player" });
            if (element === "wind") {
                if (!state.windTornadoes) state.windTornadoes = [];
                state.windTornadoes.push({ x: mouse.x, y: mouse.y, radius: 140, life: 120 });
            }
        }

        if (key === "r") {
            if (!state.skillRangeIndicators) state.skillRangeIndicators = [];
            const rColors = { fire: "#ff4400", ice: "#00aaff", lightning: "#ffff00", earth: "#8B4513", wind: "#aaffee" };
            const rRadii = { fire: 400, ice: 500, lightning: 400, earth: 300, wind: 450 };
            state.skillRangeIndicators.push({ x: player.x, y: player.y, radius: rRadii[state.element] || 400, life: 50, maxLife: 50, color: rColors[state.element] });

            state.activeBuffs.r = 6 * FPS;
            state.elementR = {
                type: state.element === "ice" ? "ice_rain" : state.element,
                life: 6 * FPS
            };
            if (state.element === "earth") state.screenShake = { timer: 15, intensity: 6 };
        }
        return true;
    },

    update: (state) => {
        const { player, ghosts, boss, bullets, frameCount } = state;
        if (!state.elementR) return;
        state.elementR.life--;
        const el = state.elementR.type;

        // 🔥 FIRE: Mưa lửa
        if (el === "fire" && frameCount % 10 === 0) {
            state.hazards.push({ x: player.x + (Math.random() - 0.5) * 800, y: player.y + (Math.random() - 0.5) * 600, radius: 60, type: "fire", life: 60, owner: "player" });
        }
        // ⚡ LIGHTNING: Sét đánh
        if (el === "lightning" && frameCount % 8 === 0) {
            let lx = player.x + (Math.random() - 0.5) * 800, ly = player.y + (Math.random() - 0.5) * 600;
            if (!state.stormLightnings) state.stormLightnings = [];
            state.stormLightnings.push({ x: lx, y: ly, life: 15 });
            ghosts.forEach(g => { if (g.x > 0 && dist(lx, ly, g.x, g.y) < 120) { g.hp -= 5; g.isStunned = 60; } });
            if (boss && dist(lx, ly, boss.x, boss.y) < 120 + boss.radius) boss.hp -= 4;
        }
        // 🌪️ WIND: Hút quái
        if (el === "wind") {
            ghosts.forEach(g => {
                let d = dist(player.x, player.y, g.x, g.y);
                if (d < 450) {
                    let pull = (450 - d) * 0.06;
                    let angle = Math.atan2(player.y - g.y, player.x - g.x);
                    g.x += Math.cos(angle) * pull; g.y += Math.sin(angle) * pull;
                    g.isStunned = Math.max(g.isStunned, 5);
                }
            });
        }
        // ❄️ ICE: Mưa băng
        if (el === "ice_rain" && frameCount % 6 === 0) {
            if (!state.icicles) state.icicles = [];
            state.icicles.push({ x: player.x + (Math.random() - 0.5) * 1000, y: player.y - 600, vy: 18, radius: 18, life: 60 });
        }
        // 🪨 EARTH: Sóng xung kích & Phản đạn
        if (el === "earth" && frameCount % 12 === 0) {
            if (!state.explosions) state.explosions = [];
            state.explosions.push({ x: player.x, y: player.y, radius: 300, life: 12, color: "rgba(139, 69, 19, 0.5)" });
            ghosts.forEach(g => {
                let d = dist(player.x, player.y, g.x, g.y);
                if (d < 300) {
                    let force = (300 - d) * 0.6; let angle = Math.atan2(g.y - player.y, g.x - player.x);
                    g.x += Math.cos(angle) * force; g.y += Math.sin(angle) * force;
                    g.isStunned = Math.max(g.isStunned, 30);
                }
            });
            bullets.forEach(b => { if (!b.isPlayer && dist(player.x, player.y, b.x, b.y) < 300) { b.isPlayer = true; b.vx *= -1; b.vy *= -1; } });
        }
        // Icicles physics
        if (state.icicles) {
            state.icicles.forEach(ic => {
                ic.y += ic.vy;
                ghosts.forEach(g => { if (g.hp > 0 && dist(ic.x, ic.y, g.x, g.y) < g.radius + 20) { g.hp -= 6; g.isStunned = 50; ic.life = 0; } });
            });
            state.icicles = state.icicles.filter(ic => ic.y < player.y + 700 && ic.life !== 0);
        }
        if (state.elementR.life <= 0) state.elementR = null;
    },

    draw: (state, ctx, canvas, buffs) => {
        const { player, element, elementColors, frameCount } = state;
        if (buffs.r > 0) {
            ctx.save(); ctx.fillStyle = `${elementColors[element]}18`; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const pulse = Math.sin(frameCount * 0.1) * 12;
            ctx.beginPath(); ctx.arc(player.x, player.y, 110 + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = elementColors[element]; ctx.lineWidth = 4; ctx.stroke();
            state.icicles?.forEach(ic => {
                ctx.beginPath(); ctx.moveTo(ic.x, ic.y); ctx.lineTo(ic.x - 6, ic.y - 25); ctx.lineTo(ic.x + 6, ic.y - 25);
                ctx.fillStyle = "#aaffff"; ctx.fill();
            });
            ctx.restore();
        }
    }
};