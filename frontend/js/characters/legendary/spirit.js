import { dist } from "../utils.js";

export const spirit = {
    id: "spirit",
    update: (state, ctx, canvas, buffs, changeStateFn) => {
        let { player, ghosts, boss } = state;

        // Kỹ năng Q: Trở nên tàng hình/bất tử 
        // Được xử lý qua isInvulnSkill ở update.js chính dựa trên buffs.q

        // Xử lý Phantoms
        if (state.phantoms) {
            for (let i = state.phantoms.length - 1; i >= 0; i--) {
                state.phantoms[i].life--;
                if (state.phantoms[i].life <= 0) state.phantoms.splice(i, 1);
            }
        }
    },

    draw: (state, ctx, canvas, buffs) => {
        let { player } = state;

        // Vẽ Phantoms
        if (state.phantoms) {
            state.phantoms.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / (2 * 60);
                ctx.fill();
                ctx.globalAlpha = 1.0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
                ctx.globalAlpha = p.life / (2 * 60);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            });
        }

        if (buffs.q > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(200, 200, 255, 0.8)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (buffs.e > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 200, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(150, 150, 255, 0.4)";
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (buffs.r > 0) {
            for (let i = 0; i < 10; i++) {
                let x = Math.random() * canvas.width;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x + (Math.random() - 0.5) * 50, canvas.height);
                ctx.strokeStyle = "rgba(255,255,255,0.7)";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
};