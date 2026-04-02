import { state } from "../state.js";
import { dist } from "../utils.js";

export function draw(ctx, canvas) {
  let { player, boss, bullets, ghosts, mouse, activeBuffs } = state;
  let buffs = activeBuffs || { q: 0, e: 0, r: 0 };

  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#1a1a24";
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  if (player.characterId === "timekeeper") {
    if (buffs.e > 0) {
      ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (buffs.r > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (player.characterId === "void") {
    if (state.voidBlackholes) {
      state.voidBlackholes.forEach((bh) => {
        ctx.beginPath();
        ctx.arc(
          bh.x,
          bh.y,
          40 + Math.sin(state.frameCount * 0.2) * 10,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "black";
        ctx.fill();
        ctx.strokeStyle = "purple";
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    }
    if (buffs.e > 0) {
      ctx.fillStyle = "rgba(128, 0, 128, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (buffs.r > 0 && state.voidLaser) {
      ctx.beginPath();
      ctx.moveTo(state.voidLaser.x, state.voidLaser.y);
      ctx.lineTo(
        state.voidLaser.x + Math.cos(state.voidLaser.angle) * 2000,
        state.voidLaser.y + Math.sin(state.voidLaser.angle) * 2000,
      );
      ctx.strokeStyle = `rgba(100, 0, 200, 0.8)`;
      ctx.lineWidth = 40;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`;
      ctx.lineWidth = 15;
      ctx.stroke();
    }
  }

  if (player.characterId === "storm") {
    if (state.stormLightnings) {
      for (let i = state.stormLightnings.length - 1; i >= 0; i--) {
        let l = state.stormLightnings[i];
        ctx.beginPath();
        ctx.moveTo(l.x, l.y - 1000);
        ctx.lineTo(l.x + (Math.random() - 0.5) * 50, l.y - 500);
        ctx.lineTo(l.x + (Math.random() - 0.5) * 50, l.y);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(l.x, l.y, 100, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
        ctx.fill();

        l.life--;
        if (l.life <= 0) state.stormLightnings.splice(i, 1);
      }
    }
    if (state.stormTraps) {
      state.stormTraps.forEach((t) => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
        ctx.fillStyle =
          state.frameCount % 10 < 5
            ? "rgba(0,255,255,0.8)"
            : "rgba(255,255,255,0.8)";
        ctx.fill();
      });
    }
  }

  if (player.characterId === "reaper") {
    if (buffs.q > 0 && state.reaperSlash) {
      let s = state.reaperSlash;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 150, s.angle - Math.PI / 2, s.angle + Math.PI / 2);
      ctx.strokeStyle = `rgba(255, 0, 0, ${buffs.q / 15})`;
      ctx.lineWidth = 30;
      ctx.stroke();
    }
    if (buffs.r > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 300, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 0, 0, ${(1 - buffs.r / (2 * 60)) * 0.3})`;
      ctx.fill();
    }
  }

  if (player.characterId === "oracle") {
    if (buffs.q > 0) {
      ctx.fillStyle = "rgba(255, 200, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
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

  if (player.characterId === "tank" && buffs.r > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 200 + (15 - buffs.r) * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 204, ${buffs.r / 15})`;
    ctx.lineWidth = 10;
    ctx.stroke();
  }
  if (player.characterId === "sharpshooter" && buffs.r > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${buffs.r / 20})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (player.characterId === "mage" && buffs.r > 0) {
    ctx.fillStyle = `rgba(0, 150, 255, 0.15)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (player.characterId === "berserker") {
    if (buffs.r > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${buffs.r / (5 * 60)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (buffs.q > 0) {
      ctx.beginPath();
      ctx.arc(
        player.x,
        player.y,
        player.radius + 6 + Math.random() * 4,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  if (player.characterId === "assassin" && buffs.e > 0) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (player.characterId === "brawler") {
    if (buffs.q > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 120 - buffs.q * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 100, 50, ${buffs.q / 15})`;
      ctx.lineWidth = 10;
      ctx.stroke();
    }
    if (buffs.e > 0) {
      ctx.beginPath();
      ctx.arc(
        player.x,
        player.y,
        player.radius + 6 + Math.random() * 4,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = "rgba(255, 100, 0, 0.7)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    if (buffs.r > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 300 - buffs.r * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 0, ${buffs.r / 30})`;
      ctx.lineWidth = 15;
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 100, 0, ${(buffs.r / 30) * 0.1})`;
      ctx.fill();
    }
  }

  if (player.characterId === "scout") {
    if (buffs.q > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 100, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${buffs.q / 15})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    if (buffs.e > 0 && player.grappleTarget) {
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.grappleTarget.x, player.grappleTarget.y);
      ctx.strokeStyle = "rgba(150, 150, 150, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        player.grappleTarget.x,
        player.grappleTarget.y,
        5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "#aaa";
      ctx.fill();
    }
    if (buffs.r > 0) {
      ctx.beginPath();
      ctx.arc(
        player.x,
        player.y,
        player.radius + 10 + Math.sin(state.frameCount * 0.2) * 5,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  if (player.characterId === "medic") {
    if (buffs.q > 0) {
      ctx.fillStyle = `rgba(0, 255, 100, ${buffs.q / 30})`;
      ctx.font = "bold 20px Arial";
      ctx.fillText("+1 HP", player.x - 25, player.y - 20 - (30 - buffs.q));
    }
    if (buffs.e > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100, 255, 150, 0.5)";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (buffs.r > 0) {
      ctx.fillStyle = `rgba(0, 255, 150, ${(buffs.r / 60) * 0.2})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(
        player.x,
        player.y,
        player.radius + (60 - buffs.r) * 2,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = `rgba(0, 255, 100, ${buffs.r / 60})`;
      ctx.lineWidth = 8;
      ctx.stroke();
    }
  }

  if (player.characterId === "summoner" && buffs.q > 0) {
    let angle = (state.frameCount || 0) * 0.1;
    for (let i = 0; i < 2; i++) {
      let a = angle + i * Math.PI;
      let x = player.x + Math.cos(a) * 40;
      let y = player.y + Math.sin(a) * 40;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#b400ff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#b400ff";
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  if (player.characterId === "alchemist" && buffs.r > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 250, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 128, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0, 255, 128, 0.05)";
    ctx.fill();
  }

  if (player.characterId === "summoner" && buffs.r > 0) {
    ctx.fillStyle = "rgba(180, 0, 255, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (player.characterId === "warden" && buffs.r > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 150, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ffd700";
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 215, 0, 0.05)";
    ctx.fill();
  }

  if (player.characterId === "void" && buffs.r > 0) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (player.characterId === "storm" && buffs.r > 0) {
    ctx.fillStyle = "rgba(255, 255, 0, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (player.characterId === "reaper" && buffs.r > 0) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (player.characterId === "engineer" && buffs.r > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 120, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 200, 255, 0.6)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (player.characterId === "spirit" && buffs.q > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200, 200, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (player.characterId === "spirit" && buffs.e > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 200, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(150, 150, 255, 0.4)";
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (player.characterId === "spirit" && buffs.r > 0) {
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
  if (player.characterId === "druid" && buffs.r > 0) {
    ctx.fillStyle = "rgba(0,255,100,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (player.characterId === "druid" && buffs.e > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,255,100,0.6)";
    ctx.stroke();
  }

  // ===== FROST, GUNNER, HUNTER VISUALS =====
  if (player.characterId === "frost") {
    if (buffs.q > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 200, 255, 0.6)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(player.x, player.y, 100, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 200, 255, 0.1)";
      ctx.fill();
    }
    if (buffs.r > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 200, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(100, 200, 255, 0.15)";
      ctx.fill();
      ctx.strokeStyle = "rgba(200, 255, 255, 0.5)";
      ctx.setLineDash([10, 15]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (player.characterId === "gunner") {
    if (buffs.q > 0 && state.gunnerLaser) {
      ctx.beginPath();
      ctx.moveTo(state.gunnerLaser.x, state.gunnerLaser.y);
      ctx.lineTo(
        state.gunnerLaser.x + Math.cos(state.gunnerLaser.angle) * 2000,
        state.gunnerLaser.y + Math.sin(state.gunnerLaser.angle) * 2000,
      );
      ctx.strokeStyle = `rgba(0, 255, 255, ${buffs.q / 15})`;
      ctx.lineWidth = 15;
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${buffs.q / 15})`;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    if (state.gunnerMines) {
      state.gunnerMines.forEach((m) => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#333";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = state.frameCount % 20 < 10 ? "#ff0000" : "#550000";
        ctx.fill();
      });
    }
    if (state.gunnerAirstrikes) {
      state.gunnerAirstrikes.forEach((strike) => {
        let maxT = 1 * 60;
        let progress = 1 - strike.timer / maxT;
        ctx.beginPath();
        ctx.arc(strike.x, strike.y, 200, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(strike.x, strike.y, 200 * progress, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fill();
      });
    }
  }
  if (state.explosions) {
    for (let i = state.explosions.length - 1; i >= 0; i--) {
      let exp = state.explosions[i];
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fillStyle = exp.color;
      ctx.globalAlpha = exp.life / 15;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      exp.life--;
      if (exp.life <= 0) state.explosions.splice(i, 1);
    }
  }

  if (player.characterId === "hunter") {
    if (buffs.e > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 300, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 100, 0, 0.6)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 100, 0, 0.05)";
      ctx.fill();
    }
    if (state.hunterTraps) {
      state.hunterTraps.forEach((trap) => {
        ctx.beginPath();
        ctx.arc(trap.x, trap.y, 15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(139, 69, 19, 0.8)";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  }
  if (state.phoenixTrails) {
    state.phoenixTrails.forEach((t) => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,120,0,0.5)";
      ctx.fill();
    });
  }
  if (player.characterId === "phoenix" && buffs.r > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,200,0,0.8)";
    ctx.stroke();
  }
  if (state.phoenixReviveFx > 0) {
    let progress = state.phoenixReviveFx / 20;

    ctx.beginPath();
    ctx.arc(player.x, player.y, 150 * (1 - progress), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,120,0,0.9)";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,150,0,0.15)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (state.phoenixEfx && state.phoenixEfx.life > 0) {
    let t = state.phoenixEfx.life / 10;

    ctx.beginPath();
    ctx.arc(
      state.phoenixEfx.x,
      state.phoenixEfx.y,
      120 * (1 - t),
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "rgba(255,120,0,0.9)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // flash giống R
    ctx.fillStyle = "rgba(255,150,0,0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  //Necromancer
  if (state.necroMinions) {
    state.necroMinions.forEach((m) => {
      ctx.beginPath();
      ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = m.type === "orbit" ? "#bb66ff" : "#6600aa";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#aa00ff";
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }
  if (state.necroZone) {
    let z = state.necroZone;

    ctx.beginPath();
    ctx.arc(z.x, z.y, 120, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(150,0,200,0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(150,0,200,0.08)";
    ctx.fill();
  }
  if (state.necroExplosions) {
    state.necroExplosions.forEach((e) => {
      let t = e.life / 15;

      ctx.beginPath();
      ctx.arc(e.x, e.y, 100 * (1 - t), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180,0,255,0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(e.x, e.y, 50 * (1 - t), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,0,255,0.5)";
      ctx.stroke();
    });
  }
  //Painter
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
  // --- Boss ---
  if (boss) {
    const phase = boss.hp <= boss.maxHp / 2 ? 1 : 0;
    const phaseColor = boss.phaseColors?.[phase] || {
      start: boss.color,
      end: boss.color,
    };

    function lerpColor(a, b, t) {
      const ah = parseInt(a.replace("#", ""), 16);
      const bh = parseInt(b.replace("#", ""), 16);
      const ar = (ah >> 16) & 255,
        ag = (ah >> 8) & 255,
        ab = ah & 255;
      const br = (bh >> 16) & 255,
        bg = (bh >> 8) & 255,
        bb = bh & 255;
      return `rgb(${(ar + t * (br - ar)) | 0},${(ag + t * (bg - ag)) | 0},${(ab + t * (bb - ab)) | 0})`;
    }

    const t = (Math.sin(state.frameCount * 0.05) + 1) / 2;
    const color = lerpColor(phaseColor.start, phaseColor.end, t);

    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(state.frameCount * 0.01);

    ctx.beginPath();
    switch (boss.shape) {
      case "triangle":
        for (let i = 0; i < 3; i++) {
          let a = i * ((Math.PI * 2) / 3) - Math.PI / 2;
          let x = Math.cos(a) * boss.radius;
          let y = Math.sin(a) * boss.radius;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      case "square":
        ctx.rect(-boss.radius, -boss.radius, boss.radius * 2, boss.radius * 2);
        break;
      case "hexagon":
        for (let i = 0; i < 6; i++) {
          let a = i * ((Math.PI * 2) / 6);
          let x = Math.cos(a) * boss.radius;
          let y = Math.sin(a) * boss.radius;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      case "star":
        for (let i = 0; i < 10; i++) {
          let r = i % 2 === 0 ? boss.radius : boss.radius / 2;
          let a = i * (Math.PI / 5);
          let x = Math.cos(a) * r;
          let y = Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        break;
      default:
        ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
    }

    ctx.fillStyle = "#111";
    ctx.fill();

    const isRage = boss.hp < boss.maxHp * 0.5;
    ctx.lineWidth = isRage ? 8 : 4;
    ctx.strokeStyle = color;
    ctx.shadowBlur = isRage ? 40 : 25;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = color;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.restore();
  }

  // --- Ghosts ---
  for (let g of ghosts) {
    if (g.x < 0) continue;
    let isDashing =
      g.historyPath &&
      g.historyPath.length > 2 &&
      dist(
        g.historyPath[g.historyPath.length - 1].x,
        g.historyPath[g.historyPath.length - 1].y,
        g.historyPath[g.historyPath.length - 2].x,
        g.historyPath[g.historyPath.length - 2].y,
      ) >
        8 * g.speedRate;

    if (g.historyPath && g.historyPath.length > 0 && g.isStunned <= 0) {
      ctx.beginPath();
      ctx.moveTo(g.historyPath[0].x, g.historyPath[0].y);
      for (let p of g.historyPath) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = isDashing
        ? "rgba(0, 255, 204, 0.5)"
        : "rgba(255, 68, 68, 0.3)";
      ctx.lineWidth = g.radius * 2;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);

    // SỬA LỖI MÀU QUÁI: Nếu quái bị choáng/chậm, làm mờ đi thay vì sơn màu đen
    if (player.characterId === "mage" && buffs.r > 0) {
      ctx.fillStyle = "#00aaff";
    } else {
      ctx.globalAlpha = g.isStunned > 0 ? 0.4 : 1.0;
      ctx.fillStyle = "#ff4444";
    }

    ctx.fill();
    ctx.globalAlpha = 1.0; // Reset lại alpha

    if (g.isStunned <= 0) {
      ctx.strokeStyle = isDashing ? "#00ffcc" : "#ff0000";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // --- Bullets ---
  let isScoutQ = player.characterId === "scout" && buffs.q > 0;
  let isFrostR = player.characterId === "frost" && buffs.r > 0;

  for (let b of bullets) {
    if (b.isShuriken) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(state.frameCount * 0.3);
      ctx.beginPath();
      ctx.moveTo(-b.radius, 0);
      ctx.lineTo(b.radius, 0);
      ctx.moveTo(0, -b.radius);
      ctx.lineTo(0, b.radius);
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.beginPath();
      let drawRadius = b.radius;
      if (!b.isPlayer && isScoutQ) drawRadius += 3;

      ctx.arc(b.x, b.y, drawRadius, 0, Math.PI * 2);
      if (b.isPlayer) {
        ctx.fillStyle = "#00ffcc";
      } else {
        ctx.fillStyle = b.style === 1 ? "#ff00ff" : "#ff4444";

        if (isFrostR && dist(b.x, b.y, player.x, player.y) < 200) {
          ctx.fillStyle = "#00ffff";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#00ffff";
        }

        if (isScoutQ) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#ff0000";
          ctx.fillStyle = "#ffaaaa";
        }
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  if (state.druidOrbs && player.characterId === "druid" && buffs.q > 0) {
    state.druidOrbs.forEach((o) => {
      ctx.beginPath();
      ctx.arc(o.x, o.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#00ff88";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00ff88";
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  if (state.engineerTurrets) {
    state.engineerTurrets.forEach((t) => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#00ccff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00ccff";
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // --- Player ---
  let isInvulnSkill =
    (buffs.e > 0 &&
      (player.characterId === "tank" ||
        player.characterId === "ghost" ||
        player.characterId === "reaper")) ||
    (buffs.q > 0 &&
      (player.characterId === "warden" || player.characterId === "frost"));

  if (player.dashTimeLeft > 0 || isInvulnSkill) {
    ctx.beginPath();
    ctx.arc(
      player.x,
      player.y,
      player.radius + (isInvulnSkill ? 5 : 2),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle =
      player.characterId === "ghost" ? "rgba(100,100,255,0.5)" : "white";

    if (player.characterId === "reaper" && buffs.e > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.shadowBlur = 20;
    ctx.shadowColor = "white";
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (player.gracePeriod > 0) {
    if (Math.floor(state.frameCount / 6) % 2 === 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (player.shield > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 255, 204, 0.5)";
  ctx.stroke();
}
