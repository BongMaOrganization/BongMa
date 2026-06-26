/**
 * drawRemotePlayers.js — Vẽ các remote players lên canvas
 * Remote players được vẽ bằng đúng hàm animation của từng nhân vật (như local player).
 */
import { state } from "../../state.js";
import { mpState } from "../../multiplayer/room.js";
import { drawPlayerByCharId } from "./drawPlayer.js";
import { drawFastBullet } from "./drawBullets.js";

// Màu nhân vật (dùng cho fallback và HUD)
const CHARACTER_COLORS = {
  speedster:    "#00ffcc",
  tank:         "#ff8800",
  sniper:       "#ffff00",
  assassin:     "#ff0088",
  ghost:        "#88ffff",
  necromancer:  "#00ff44",
  phoenix:      "#ff4400",
  hunter:       "#bbff00",
  storm:        "#4488ff",
  frost:        "#aaffff",
  engineer:     "#ffcc00",
  gunner:       "#ff6600",
  reaper:       "#aa0000",
  summoner:     "#cc00ff",
  painter:      "#ff88ff",
  scout:        "#00ffbb",
  warden:       "#00aaff",
  knight:       "#ffffff",
  destroyer:    "#ff2200",
  creator:      "#ffdd00",
  oracle:       "#88ffcc",
  druid:        "#44ff44",
  spirit:       "#ccaaff",
  elementalist: "#ff0088",
  void:         "#5566ff",
  mage:         "#ff44ff",
  brawler:      "#ffaa44",
  medic:        "#00ffaa",
  alchemist:    "#aaff44",
  berserker:    "#ff4422",
  sharpshooter: "#ffeeaa",
  timekeeper:   "#aaddff",
};

// Element colors (cần cho Elementalist)
const ELEMENT_COLORS = {
  fire: "#ff4400", ice: "#aaffff", lightning: "#ffff00",
  wind: "#00ff88", earth: "#884400",
};

/**
 * Tạo fakeState giả lập cho remote player.
 * Dùng buffs rỗng nên nhân vật sẽ vẽ ở trạng thái idle/thường.
 */
function buildFakeState(rp) {
  const color = CHARACTER_COLORS[rp.characterId] || "#00ffcc";
  return {
    player: {
      x: rp.x,
      y: rp.y,
      radius: 14,
      characterId: rp.characterId,
      hp: rp.hp,
      maxHp: rp.maxHp,
      isDead: rp.isDead,
      shield: 0,
      maxShield: 0,
      gracePeriod: 0,
      dashTimeLeft: 0,
      dashDx: 0,
      dashDy: 0,
      isInvincible: false,
      color,
      multiShot: 1,
      bounces: 0,
    },
    frameCount: state.frameCount || 0,
    playerStatus: { slowTimer: 0, stunTimer: 0, burnTimer: 0 },
    element: "fire",
    elementColors: ELEMENT_COLORS,
    activeBuffs: { q: 0, e: 0, r: 0 },
    // Character-specific state — empty defaults
    particles: state.particles || [],
    speedsterBursts: [],
    phantoms: [],
    glitch: { matrixMode: false, invertControls: false },
    cinematicEffects: { fogAlpha: 0 },
    boss: null,
  };
}

/**
 * Vẽ tất cả remote players với animation đúng nhân vật
 */
export function drawRemotePlayers(ctx) {
  if (!state.isMultiplayer || !state.remotePlayers) return;

  const emptyBuffs = { q: 0, e: 0, r: 0 };

  for (const rp of state.remotePlayers) {
    if (rp.x === 0 && rp.y === 0) continue; // Chưa nhận vị trí

    const isDead = rp.isDead;
    const color = CHARACTER_COLORS[rp.characterId] || "#00ffcc";

    ctx.save();
    if (isDead) ctx.globalAlpha = 0.3;

    // --- Vẽ thân player bằng đúng hàm animation ---
    const fakeState = buildFakeState(rp);
    drawPlayerByCharId(ctx, rp.characterId, fakeState, emptyBuffs, false);

    // --- Overlay dấu X khi chết ---
    if (isDead) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rp.x - 9, rp.y - 9);
      ctx.lineTo(rp.x + 9, rp.y + 9);
      ctx.moveTo(rp.x + 9, rp.y - 9);
      ctx.lineTo(rp.x - 9, rp.y + 9);
      ctx.stroke();
    }

    ctx.globalAlpha = isDead ? 0.5 : 1.0;

    // --- Tên player ---
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = isDead ? "#888" : "#fff";
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    const label = (rp.isHost ? "👑 " : "") + rp.username;
    ctx.fillText(label, rp.x, rp.y - 22);
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
 * Vẽ bullets của remote players với visual style đúng nhân vật.
 * state.remoteBullets là snapshot 60ms/lần, mỗi viên tự di chuyển với vx/vy giữa các update.
 */
export function drawRemoteBullets(ctx) {
  if (!state.isMultiplayer || !state.remoteBullets || !state.remoteBullets.length) return;

  const now = performance.now();
  const STALE_MS = 200;

  for (let i = state.remoteBullets.length - 1; i >= 0; i--) {
    const b = state.remoteBullets[i];

    // Di chuyển bullet theo vận tốc giữa các snapshot
    b.x += (b.vx || 0) * 0.5;
    b.y += (b.vy || 0) * 0.5;
    b.life = (b.life || 30) - 1;

    if (b.life <= 0 || (now - b._born) > STALE_MS) {
      state.remoteBullets.splice(i, 1);
      continue;
    }

    // Dùng drawFastBullet — có trail, màu theo visualStyle của nhân vật
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life / 15);
    drawFastBullet(ctx, b);
    ctx.restore();
  }
}

/**
 * Vẽ tất cả revive zones
 */
export function drawReviveZones(ctx) {
  if (!state.reviveZones || !state.reviveZones.length) return;

  const t = (state.frameCount || 0) * 0.04;

  for (const zone of state.reviveZones) {
    const { x, y, radius, progress } = zone;
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

    // Vòng tiến độ hồi sinh
    if (progressFrac > 0) {
      ctx.beginPath();
      ctx.arc(x, y, radius - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progressFrac);
      ctx.strokeStyle = "rgba(0, 255, 160, 0.9)";
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    // Icon
    ctx.font = `${24 + 4 * Math.sin(t)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 120, 120, 0.9)";
    ctx.fillText("💫", x, y);

    // Label
    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255, 200, 200, 0.9)";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Đứng vào để hồi sinh", x, y + radius + 16);

    // Thanh tiến độ
    if (progressFrac > 0) {
      const bw = 80;
      const bx = x - bw / 2;
      const by = y + radius + 22;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = "rgba(0, 255, 160, 0.85)";
      ctx.fillRect(bx, by, bw * progressFrac, 6);
    }

    ctx.restore();
  }
}

/**
 * Vẽ HUD mini (danh sách players góc trên trái)
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
