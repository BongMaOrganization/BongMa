/**
 * drawRemotePlayers.js — Vẽ các remote players lên canvas
 */
import { state } from "../../state.js";
import { mpState } from "../../multiplayer/room.js";

// Màu nhân vật (placeholder — tương lai có thể lấy từ characterRegistry)
const CHARACTER_COLORS = {
  speedster:   "#00ffcc",
  tank:        "#ff8800",
  wizard:      "#aa00ff",
  sniper:      "#ffff00",
  assassin:    "#ff0088",
  ghost:       "#88ffff",
  necromancer: "#00ff44",
  phoenix:     "#ff4400",
  hunter:      "#bbff00",
  storm:       "#4488ff",
  frost:       "#aaffff",
  engineer:    "#ffcc00",
  gunner:      "#ff6600",
  reaper:      "#aa0000",
  summoner:    "#cc00ff",
  painter:     "#ff88ff",
  scout:       "#00ffbb",
  warden:      "#00aaff",
  knight:      "#ffffff",
  destroyer:   "#ff2200",
  creator:     "#ffdd00",
  oracle:      "#88ffcc",
  druid:       "#44ff44",
  spirit:      "#ccaaff",
  elementalist:"#ff0088",
  glitch:      "#00ff00",
  void:        "#5566ff",
};

/**
 * Vẽ tất cả remote players
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawRemotePlayers(ctx) {
  if (!state.isMultiplayer || !state.remotePlayers) return;

  for (const rp of state.remotePlayers) {
    if (rp.x === 0 && rp.y === 0) continue; // Chưa nhận vị trí

    const color = CHARACTER_COLORS[rp.characterId] || "#00ffcc";
    const isDead = rp.isDead;
    const alpha = isDead ? 0.3 : 1.0;

    ctx.save();
    ctx.globalAlpha = alpha;

    // --- Vẽ thân player ---
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = isDead ? "#444" : color;
    ctx.fill();

    // Viền neon
    ctx.strokeStyle = isDead ? "#888" : color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = isDead ? 0 : 10;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dấu X khi chết
    if (isDead) {
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rp.x - 8, rp.y - 8);
      ctx.lineTo(rp.x + 8, rp.y + 8);
      ctx.moveTo(rp.x + 8, rp.y - 8);
      ctx.lineTo(rp.x - 8, rp.y + 8);
      ctx.stroke();
    }

    // --- Tên player ---
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = isDead ? "#888" : "#fff";
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    const label = (rp.isHost ? "👑 " : "") + rp.username;
    ctx.fillText(label, rp.x, rp.y - 20);
    ctx.shadowBlur = 0;

    // --- Mini HP bar ---
    if (!isDead) {
      const barW = 32;
      const barH = 4;
      const bx = rp.x - barW / 2;
      const by = rp.y + 18;
      const hpFrac = Math.max(0, rp.hp / rp.maxHp);

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, barW, barH);

      const hpColor = hpFrac > 0.5 ? "#00ff88" : hpFrac > 0.25 ? "#ffaa00" : "#ff3300";
      ctx.fillStyle = hpColor;
      ctx.fillRect(bx, by, barW * hpFrac, barH);
    }

    ctx.restore();
  }
}

/**
 * Vẽ tất cả revive zones
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawReviveZones(ctx) {
  if (!state.reviveZones || !state.reviveZones.length) return;

  const t = (state.frameCount || 0) * 0.04;

  for (const zone of state.reviveZones) {
    const { x, y, radius, progress, deadPlayerId } = zone;
    const alpha = 0.5 + 0.25 * Math.sin(t * 2);
    const progressFrac = progress / 100;

    ctx.save();

    // Vòng tròn nền
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 80, 80, ${alpha * 0.15})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 80, 80, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vòng tiến độ hồi sinh (màu xanh, arc)
    if (progressFrac > 0) {
      ctx.beginPath();
      ctx.arc(x, y, radius - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progressFrac);
      ctx.strokeStyle = "rgba(0, 255, 160, 0.9)";
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    // Icon hồi sinh
    ctx.font = `${24 + 4 * Math.sin(t)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 120, 120, 0.9)";
    ctx.fillText("💫", x, y);

    // Text "Đứng đây để hồi sinh"
    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255, 200, 200, 0.9)";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Đứng vào để hồi sinh", x, y + radius + 16);

    // Thanh tiến độ ở dưới
    if (progressFrac > 0) {
      const bw = 80;
      const bx = x - bw / 2;
      const by = y + radius + 22;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = `rgba(0, 255, 160, 0.85)`;
      ctx.fillRect(bx, by, bw * progressFrac, 6);
    }

    ctx.restore();
  }
}

/**
 * Vẽ HUD mini (danh sách players góc trên trái, bao gồm bản thân)
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 */
export function drawMpPlayersHUD(ctx, canvas) {
  if (!state.isMultiplayer) return;

  const allPlayers = [
    {
      username: "Bạn" + (mpState.isHost ? " 👑" : ""),
      hp: state.player?.hp || 0,
      maxHp: state.player?.maxHp || 5,
      isDead: state.player?.isDead || false,
      characterId: state.player?.characterId,
      isLocal: true,
    },
    ...state.remotePlayers.map((rp) => ({
      username: (rp.isHost ? "👑 " : "") + rp.username,
      hp: rp.hp,
      maxHp: rp.maxHp,
      isDead: rp.isDead,
      characterId: rp.characterId,
      isLocal: false,
    })),
  ];

  const startX = 12;
  const startY = 80;
  const cardH = 52;
  const cardW = 170;
  const gap = 6;

  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i];
    const px = startX;
    const py = startY + i * (cardH + gap);
    const color = CHARACTER_COLORS[p.characterId] || "#00ffcc";

    ctx.save();
    ctx.globalAlpha = p.isDead ? 0.5 : 0.88;

    // Background
    ctx.fillStyle = "rgba(0, 0, 10, 0.75)";
    roundRect(ctx, px, py, cardW, cardH, 8);
    ctx.fill();

    // Border neon
    ctx.strokeStyle = p.isDead ? "#555" : color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = p.isLocal ? 8 : 4;
    ctx.shadowColor = color;
    roundRect(ctx, px, py, cardW, cardH, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Avatar dot
    ctx.beginPath();
    ctx.arc(px + 22, py + cardH / 2, 13, 0, Math.PI * 2);
    ctx.fillStyle = p.isDead ? "#333" : color;
    ctx.fill();

    if (p.isDead) {
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ff4444";
      ctx.fillText("✕", px + 22, py + cardH / 2);
    }

    // Name
    ctx.font = `bold 12px 'Segoe UI', sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = p.isDead ? "#888" : "#fff";
    ctx.fillText(p.username, px + 40, py + 18);

    // HP bar
    const barW = cardW - 48;
    const bx = px + 40;
    const by = py + 26;
    const hpFrac = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(bx, by, barW, 7);
    const hpColor = hpFrac > 0.5 ? "#00ff88" : hpFrac > 0.25 ? "#ffaa00" : "#ff3300";
    ctx.fillStyle = hpColor;
    ctx.fillRect(bx, by, barW * hpFrac, 7);

    // HP text
    ctx.font = "10px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText(`${Math.max(0, p.hp)} / ${p.maxHp} HP`, bx, py + cardH - 8);

    ctx.restore();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
