import { state } from "../state.js";
import { BOSS_TYPES } from "../entities/bosses/boss_manager.js";
import { MAP_LORE } from "../world/storyLore.js";
import { setupBossArenaVisual } from "../world/bossArenaVisual.js";
import {
  getBossGateRoom,
  getRoomCenter,
  getRoomBossArenaRadius,
} from "../world/dungeonLayout.js";

const EXTRA_LORE = {
  void: {
    realm: "Vực Hư Không",
    bossTitle: "Chúa Tể Bóng Tối",
    bossDesc: "Kẻ nuốt chửng không gian và ánh sáng.",
  },
  glitch: {
    realm: "Vùng Lỗi Hệ Thống",
    bossTitle: "ERROR_404",
    bossDesc: "Mã lỗi sống sót sau khi Trạm sụp — không bao giờ dừng.",
  },
};

const CUTSCENE_LINES = {
  fire: [
    "Tín hiệu nhiệt độ vượt ngưỡng an toàn…",
    "Hỏa Vương thức giấc — mọi Echo đều là củi.",
    "Đấu trường lửa đang hình thành quanh bạn.",
  ],
  ice: [
    "Hơi thở đọng thành sương giá…",
    "Băng Hậu muốn đóng băng thời gian của bạn mãi mãi.",
    "Không gian co lại thành đấu trường băng.",
  ],
  earth: [
    "Mảnh đá rung — trọng lực tăng vọt.",
    "Địa Chấn Vương giữ chặt mọi thứ, kể cả hy vọng.",
    "Đấu trường địa tầng dựng lên từ lòng đất.",
  ],
  wind: [
    "Gió rít qua khe nứt không gian…",
    "Phong Thần thổi tan mọi Echo thành bụi.",
    "Vòng gió khép lại — không lối thoát.",
  ],
  thunder: [
    "Tĩnh điện bám vào da bạn…",
    "Lôi Thần phán: Echo là lỗi thời gian.",
    "Đấu trường sấm sét kích hoạt.",
  ],
  omni: [
    "Năm màu nguyên tố xoáy quanh Trung Tâm Trạm…",
    "Chúa Tể Nguyên Tố — thực thể gốc trước khi bị chia.",
    "Mọi sức mạnh hội tụ. Đây là trận cuối.",
  ],
  void: [
    "Không gian sụp vào một điểm…",
    "Hư Không Chúa nuốt ánh sáng và ký ức.",
    "Đấu trường hư vô mở ra.",
  ],
  glitch: [
    "WARNING: REALITY_BUFFER_OVERFLOW",
    "Mã Lỗi Vĩnh Cửu đã thoát khỏi hệ thống.",
    "Đấu trường dữ liệu hỏng kích hoạt.",
  ],
};

const CUTSCENE_DURATION = {
  fire: 360,
  ice: 360,
  earth: 390,
  wind: 330,
  thunder: 390,
  omni: 480,
  void: 420,
  glitch: 360,
};

const OMNI_RING_COLORS = ["#ff4400", "#66ccff", "#b88844", "#55ffcc", "#ffee55"];

export function getCutsceneData(bossType) {
  const cfg = BOSS_TYPES[bossType] || BOSS_TYPES.fire;
  const lore = MAP_LORE[bossType] || EXTRA_LORE[bossType] || MAP_LORE.fire;
  return {
    title: cfg.name,
    subtitle: lore.bossTitle || lore.realm,
    lines: CUTSCENE_LINES[bossType] || CUTSCENE_LINES.fire,
    duration: CUTSCENE_DURATION[bossType] || 360,
    color: cfg.color,
    icon: cfg.icon || "👹",
    arenaIntro: lore.realm || "Đấu trường",
    phaseCount: cfg.phaseCount || cfg.phases?.length || 3,
    hp: cfg.hp,
  };
}

function showSkipButton() {
  document.getElementById("boss-cutscene-skip")?.classList.remove("hidden");
}

function hideSkipButton() {
  document.getElementById("boss-cutscene-skip")?.classList.add("hidden");
}

export function beginBossCutscene(bossType, onComplete) {
  const data = getCutsceneData(bossType);
  const p = state.player;
  const bossRoom = state.dungeon && !state.bossArenaMode ? getBossGateRoom() : null;
  const center = bossRoom
    ? getRoomCenter(bossRoom)
    : { x: p?.x ?? state.world.width / 2, y: p?.y ?? state.world.height / 2 };

  setupBossArenaVisual(bossType, center.x, center.y, {
    roomId: bossRoom?.id || null,
    maxRadius: bossRoom ? getRoomBossArenaRadius(bossRoom, bossType) : undefined,
  });

  if (bossRoom && p) {
    p.x = center.x;
    p.y = center.y + 100;
  }

  state.elementalEnemies = [];
  state.elementalZones = [];

  state.bossCutscene = {
    bossType,
    timer: 0,
    maxTimer: data.duration,
    lines: data.lines,
    lineIndex: 0,
    lineTimer: 0,
    charIndex: 0,
    onComplete,
    title: data.title,
    subtitle: data.subtitle,
    color: data.color,
    icon: data.icon,
    arenaIntro: data.arenaIntro,
    phaseCount: data.phaseCount,
    hp: data.hp,
    flash: 0,
    shake: 0,
  };

  state.screenShake = { timer: 30, intensity: 6, x: 0, y: 0 };
  showSkipButton();
}

export function skipBossCutscene() {
  if (!state.bossCutscene) return;
  finishBossCutscene();
}

function finishBossCutscene() {
  const cb = state.bossCutscene?.onComplete;
  state.bossCutscene = null;
  hideSkipButton();
  if (typeof cb === "function") cb();
}

export function isBossCutsceneActive() {
  return !!state.bossCutscene;
}

export function updateBossCutscene() {
  const cs = state.bossCutscene;
  if (!cs) return;

  const keys = state.keys || {};
  if (keys.escape || keys.enter || keys.space) {
    skipBossCutscene();
    return;
  }

  cs.timer++;
  cs.lineTimer++;

  if (cs.flash > 0) cs.flash--;
  if (cs.shake > 0) cs.shake--;

  const lineDuration = Math.max(80, Math.floor(cs.maxTimer / cs.lines.length));
  const fullLine = cs.lines[cs.lineIndex] || "";

  if (cs.charIndex < fullLine.length && cs.lineTimer % 2 === 0) {
    cs.charIndex++;
  }

  if (cs.lineTimer >= lineDuration && cs.lineIndex < cs.lines.length - 1) {
    cs.lineIndex++;
    cs.lineTimer = 0;
    cs.charIndex = 0;
    cs.flash = 12;
    cs.shake = 8;
    state.screenShake = { timer: 12, intensity: 10, x: 0, y: 0 };
  }

  if (cs.timer >= cs.maxTimer) finishBossCutscene();
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "255,100,50";
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}

export function drawBossCutscene(ctx, canvas) {
  const cs = state.bossCutscene;
  if (!cs) return;

  const w = canvas.width;
  const h = canvas.height;
  const progress = cs.timer / cs.maxTimer;
  const fadeIn = Math.min(1, cs.timer / 35);
  const fadeOut = cs.timer > cs.maxTimer - 35 ? (cs.maxTimer - cs.timer) / 35 : 1;
  const alpha = fadeIn * fadeOut;
  const t = state.frameCount;
  const rgb = hexToRgb(cs.color);
  const cx = w / 2;
  const shakeX = cs.shake > 0 ? Math.sin(t * 2.5) * cs.shake * 0.4 : 0;
  const shakeY = cs.shake > 0 ? Math.cos(t * 3.1) * cs.shake * 0.3 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Letterbox
  const barH = h * 0.09;
  ctx.fillStyle = `rgba(0,0,0,${0.95 * alpha})`;
  ctx.fillRect(0, 0, w, barH);
  ctx.fillRect(0, h - barH, w, barH);

  // Vignette + color wash
  const vig = ctx.createRadialGradient(cx, h * 0.42, 0, cx, h * 0.42, w * 0.65);
  vig.addColorStop(0, `rgba(${rgb},${0.18 * alpha})`);
  vig.addColorStop(0.5, `rgba(0,0,0,${0.55 * alpha})`);
  vig.addColorStop(1, `rgba(0,0,0,${0.92 * alpha})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, barH, w, h - barH * 2);

  if (cs.flash > 0) {
    ctx.fillStyle = `rgba(${rgb},${(cs.flash / 12) * 0.25})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Scanlines
  ctx.globalAlpha = alpha * 0.04;
  for (let y = barH; y < h - barH; y += 4) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, y, w, 1);
  }
  ctx.globalAlpha = alpha;

  // "BOSS INCOMING" stamp
  if (cs.timer < 90) {
    const stampA = Math.min(1, cs.timer / 20) * (cs.timer > 70 ? (90 - cs.timer) / 20 : 1);
    ctx.save();
    ctx.globalAlpha = stampA * alpha;
    ctx.font = "bold 13px Orbitron, sans-serif";
    ctx.fillStyle = cs.color;
    ctx.textAlign = "center";
    ctx.translate(cx, barH + 28);
    ctx.rotate(-0.08);
    ctx.fillText("◆ BOSS INCOMING ◆", 0, 0);
    ctx.restore();
  }

  // Boss portrait ring
  const portraitY = h * 0.36;
  const pulse = 1 + Math.sin(t * 0.1) * 0.06;
  const ringR = 78 * pulse;

  for (let ring = 3; ring >= 0; ring--) {
    ctx.strokeStyle = `rgba(${rgb},${(0.15 + ring * 0.08) * alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, portraitY, ringR + ring * 18 + Math.sin(t * 0.05 + ring) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(${rgb},${0.12 * alpha})`;
  ctx.beginPath();
  ctx.arc(cx, portraitY, ringR + 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `${Math.floor(64 * pulse)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cs.icon, cx, portraitY);

  // Title block
  ctx.shadowColor = cs.color;
  ctx.shadowBlur = 28;
  ctx.font = "900 36px Orbitron, sans-serif";
  ctx.fillStyle = cs.color;
  ctx.fillText(cs.title.toUpperCase(), cx, h * 0.52);

  ctx.shadowBlur = 10;
  ctx.font = "600 18px Rajdhani, sans-serif";
  ctx.fillStyle = "#e8e8f0";
  ctx.fillText(cs.subtitle, cx, h * 0.57);

  ctx.shadowBlur = 0;
  ctx.font = "500 14px Rajdhani, sans-serif";
  ctx.fillStyle = `rgba(${rgb},0.9)`;
  ctx.fillText(`⚔ ${cs.arenaIntro}`, cx, h * 0.62);

  // Stats row
  ctx.font = "600 12px Rajdhani, sans-serif";
  ctx.fillStyle = "#888";
  ctx.fillText(`${cs.phaseCount} PHASE · HP ${cs.hp}`, cx, h * 0.665);

  // VS divider
  const vsY = h * 0.71;
  ctx.strokeStyle = `rgba(${rgb},0.35)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 180, vsY);
  ctx.lineTo(cx - 40, vsY);
  ctx.moveTo(cx + 40, vsY);
  ctx.lineTo(cx + 180, vsY);
  ctx.stroke();
  ctx.font = "bold 14px Orbitron, sans-serif";
  ctx.fillStyle = `rgba(${rgb},0.8)`;
  ctx.fillText("VS", cx, vsY + 5);

  ctx.font = "11px Rajdhani, sans-serif";
  ctx.fillStyle = "#666";
  ctx.fillText("ECHO", cx - 110, vsY + 4);
  ctx.fillText("BOSS", cx + 110, vsY + 4);

  // Typewriter dialogue
  const fullLine = cs.lines[cs.lineIndex] || "";
  const typed = fullLine.slice(0, cs.charIndex);
  ctx.font = "18px Rajdhani, sans-serif";
  ctx.fillStyle = "#fff";
  wrapText(ctx, `"${typed}${cs.charIndex < fullLine.length ? "▌" : ""}"`, cx, h * 0.76, w - 160, 24);

  // Progress bar
  const barW = 320;
  const barX = cx - barW / 2;
  const barY = h * 0.84;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(barX, barY, barW, 5);
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  if (cs.bossType === "omni") {
    OMNI_RING_COLORS.forEach((c, i) => grad.addColorStop(i / (OMNI_RING_COLORS.length - 1), c));
  } else {
    grad.addColorStop(0, cs.color);
    grad.addColorStop(1, "#fff");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(barX, barY, barW * progress, 5);

  ctx.globalAlpha = alpha * 0.55;
  ctx.font = "11px Rajdhani, sans-serif";
  ctx.fillStyle = "#777";
  ctx.fillText("Esc · Space · Enter — bỏ qua", cx, h - barH - 16);

  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let dy = 0;
  ctx.textAlign = "center";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + dy);
      line = word;
      dy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + dy);
}
