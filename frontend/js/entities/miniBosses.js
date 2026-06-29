import { state } from "../state.js";
import { FPS } from "../config.js";
import { dist } from "../utils.js";
import {
  spawnBullet,
  spawnHazard,
  spawnBeam,
  spawnWarning,
} from "./helpers.js";

const THEME_ELEMENT = {
  fire: "fire",
  ice: "ice",
  earth: "earth",
  wind: "wind",
  thunder: "lightning",
  omni: "omni",
};

/** CP1 = thủ vệ gác cổng, CP2 = trùm mạnh hơn — mỗi map 2 archetype khác nhau */
const MINI_BOSS_PROFILES = {
  fire: {
    1: {
      name: "Hỏa Giáp",
      icon: "🔥",
      color: "#ff4400",
      glow: "#ff8800",
      accent: "#ffcc00",
      radius: 58,
      hpBase: 900,
      hpPerLevel: 90,
      speed: 1.0,
      pattern: "fire_sentinel",
      attackCd: 48,
    },
    2: {
      name: "Viêm Ma",
      icon: "💥",
      color: "#ff1144",
      glow: "#ff5500",
      accent: "#ffdd00",
      radius: 64,
      hpBase: 1200,
      hpPerLevel: 110,
      speed: 1.25,
      pattern: "fire_warden",
      attackCd: 38,
    },
  },
  ice: {
    1: {
      name: "Băng Giáp",
      icon: "❄️",
      color: "#66ddff",
      glow: "#00ccff",
      accent: "#ccffff",
      radius: 56,
      hpBase: 950,
      hpPerLevel: 95,
      speed: 0.95,
      pattern: "ice_sentinel",
      attackCd: 55,
    },
    2: {
      name: "Bão Tuyết",
      icon: "🌨️",
      color: "#88eeff",
      glow: "#00aaff",
      accent: "#ffffff",
      radius: 62,
      hpBase: 1250,
      hpPerLevel: 115,
      speed: 1.1,
      pattern: "ice_warden",
      attackCd: 42,
    },
  },
  thunder: {
    1: {
      name: "Lôi Sứ",
      icon: "⚡",
      color: "#ffee44",
      glow: "#ffff00",
      accent: "#ffffff",
      radius: 55,
      hpBase: 880,
      hpPerLevel: 88,
      speed: 1.15,
      pattern: "lightning_sentinel",
      attackCd: 52,
    },
    2: {
      name: "Lôi Bá",
      icon: "🌩️",
      color: "#ffcc00",
      glow: "#ffee00",
      accent: "#fff8aa",
      radius: 60,
      hpBase: 1180,
      hpPerLevel: 108,
      speed: 1.3,
      pattern: "lightning_warden",
      attackCd: 35,
    },
  },
  wind: {
    1: {
      name: "Phong Kỵ",
      icon: "🌪️",
      color: "#66ffdd",
      glow: "#00ffcc",
      accent: "#aaffee",
      radius: 54,
      hpBase: 860,
      hpPerLevel: 85,
      speed: 1.35,
      pattern: "wind_sentinel",
      attackCd: 40,
    },
    2: {
      name: "Xoáy Phong",
      icon: "💨",
      color: "#44ffcc",
      glow: "#00ddaa",
      accent: "#ccffee",
      radius: 58,
      hpBase: 1150,
      hpPerLevel: 105,
      speed: 1.45,
      pattern: "wind_warden",
      attackCd: 32,
    },
  },
  earth: {
    1: {
      name: "Thạch Giáp",
      icon: "🪨",
      color: "#aa7744",
      glow: "#886633",
      accent: "#ddbb88",
      radius: 66,
      hpBase: 1100,
      hpPerLevel: 100,
      speed: 0.85,
      pattern: "earth_sentinel",
      attackCd: 65,
    },
    2: {
      name: "Địa Chấn",
      icon: "⛰️",
      color: "#996633",
      glow: "#664422",
      accent: "#ffcc66",
      radius: 70,
      hpBase: 1400,
      hpPerLevel: 120,
      speed: 0.9,
      pattern: "earth_warden",
      attackCd: 50,
    },
  },
  omni: {
    1: {
      name: "Lăng Nguyên Tố",
      icon: "🔮",
      color: "#cc88ff",
      glow: "#ff66cc",
      accent: "#ffffff",
      radius: 60,
      hpBase: 1000,
      hpPerLevel: 100,
      speed: 1.1,
      pattern: "omni_sentinel",
      attackCd: 45,
    },
    2: {
      name: "Hư Không Thủ",
      icon: "🌀",
      color: "#aa66ff",
      glow: "#ff0088",
      accent: "#00ffcc",
      radius: 64,
      hpBase: 1300,
      hpPerLevel: 115,
      speed: 1.2,
      pattern: "omni_warden",
      attackCd: 40,
    },
  },
};

function getMapTheme() {
  return state.selectedMap || state.currentMapTheme || "fire";
}

export function getMiniBossProfile(mapTheme, captureOrder = 1) {
  const theme = MINI_BOSS_PROFILES[mapTheme] ? mapTheme : "fire";
  const order = captureOrder === 2 ? 2 : 1;
  return MINI_BOSS_PROFILES[theme][order];
}

export function getMiniBossDisplayName(captureOrder = 1) {
  const mapTheme = getMapTheme();
  return getMiniBossProfile(mapTheme, captureOrder).name;
}

export function spawnMiniBoss(x, y, id, roomId = null, captureOrder = 1) {
  const mapTheme = getMapTheme();
  const profile = getMiniBossProfile(mapTheme, captureOrder);
  const element = THEME_ELEMENT[mapTheme] || "fire";
  const hp = profile.hpBase + state.currentLevel * profile.hpPerLevel;
  const shield = Math.floor(hp * (captureOrder === 2 ? 0.28 : 0.2));

  state.ghosts.push({
    id,
    isMiniBoss: true,
    isSubBoss: true,
    element,
    mapTheme,
    captureOrder: captureOrder === 2 ? 2 : 1,
    miniBossName: profile.name,
    miniBossIcon: profile.icon,
    attackPattern: profile.pattern,
    attackCooldown: 30,
    specialTimer: 0,
    spinAngle: 0,
    x,
    y,
    radius: profile.radius,
    hp,
    maxHp: hp,
    shield,
    maxShield: shield,
    shieldActive: true,
    speed: profile.speed,
    speedRate: 1.0,
    color: profile.color,
    glowColor: profile.glow,
    accentColor: profile.accent,
    lastHazardDamageTime: 0,
    burnTimer: 0,
    isStunned: 0,
    behavior: "guard",
    originalX: x,
    originalY: y,
    roomId: roomId || null,
    historyPath: [],
    baseAttackCd: profile.attackCd,
  });
}

function fanBullets(g, player, count, spread, style, dmg, speedMult = 1) {
  const base = Math.atan2(player.y - g.y, player.x - g.x);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
    const a = base + t;
    spawnBullet(
      g.x,
      g.y,
      g.x + Math.cos(a) * 120,
      g.y + Math.sin(a) * 120,
      false,
      style,
      g.element || "ghost",
      dmg,
    );
    const b = state.bullets[state.bullets.length - 1];
    if (b && speedMult !== 1) {
      b.vx *= speedMult;
      b.vy *= speedMult;
    }
  }
}

function runPattern(g, player) {
  const p = g.attackPattern;
  const fc = state.frameCount;

  switch (p) {
    case "fire_sentinel":
      fanBullets(g, player, 5, 0.9, 1, 1.8, 1.1);
      if (fc % 3 === 0) {
        spawnHazard("fire", player.x, player.y, 90, 5 * FPS, 0.6, "boss", 90);
      }
      g.attackCooldown = g.baseAttackCd || 48;
      break;

    case "fire_warden":
      if ((g.specialTimer || 0) <= 0) {
        fanBullets(g, player, 3, 0.5, 1, 2.5, 1.3);
        g.specialTimer = 150;
        g.attackCooldown = 28;
      } else {
        g.specialTimer--;
        const a = Math.atan2(player.y - g.y, player.x - g.x);
        for (let i = 0; i < 8; i++) {
          const ang = a + (i / 8) * Math.PI * 2;
          spawnHazard(
            "fire",
            g.x + Math.cos(ang) * 120,
            g.y + Math.sin(ang) * 120,
            45,
            4 * FPS,
            0.5,
            "boss",
          );
        }
        g.attackCooldown = 90;
        g.specialTimer = 0;
      }
      break;

    case "ice_sentinel":
      fanBullets(g, player, 3, 0.7, 2, 1.6, 0.85);
      spawnHazard("frost", player.x, player.y, 70, 4 * FPS, 0.4, "boss", 70);
      g.attackCooldown = g.baseAttackCd || 55;
      break;

    case "ice_warden":
      g.spinAngle = (g.spinAngle || 0) + 0.08;
      for (let i = 0; i < 4; i++) {
        const a = g.spinAngle + (i * Math.PI) / 2;
        spawnBullet(
          g.x + Math.cos(a) * 40,
          g.y + Math.sin(a) * 40,
          g.x + Math.cos(a) * 200,
          g.y + Math.sin(a) * 200,
          false,
          2,
          "ice",
          1.4,
        );
      }
      spawnHazard("frost", player.x, player.y, 110, 5 * FPS, 0.55, "boss", 110);
      g.attackCooldown = g.baseAttackCd || 42;
      break;

    case "lightning_sentinel":
      spawnBeam(g.x, g.y, player.x, player.y, 25, 12);
      fanBullets(g, player, 2, 0.3, 3, 2.0, 2.2);
      g.attackCooldown = g.baseAttackCd || 52;
      break;

    case "lightning_warden":
      spawnWarning(player.x, player.y, 80, 45, "thunder_warn");
      spawnHazard("static", player.x, player.y, 80, 3 * FPS, 0.7, "boss", 80);
      fanBullets(g, player, 4, 1.2, 3, 1.5, 2.5);
      g.attackCooldown = g.baseAttackCd || 35;
      break;

    case "wind_sentinel":
      g.spinAngle = (g.spinAngle || 0) + 0.35;
      for (let i = 0; i < 6; i++) {
        const a = Math.atan2(player.y - g.y, player.x - g.x) + g.spinAngle + i * 0.4;
        spawnBullet(g.x, g.y, g.x + Math.cos(a) * 150, g.y + Math.sin(a) * 150, false, 4, "wind", 1.3);
        const b = state.bullets[state.bullets.length - 1];
        if (b) {
          b.vx *= 1.6;
          b.vy *= 1.6;
        }
      }
      g.attackCooldown = g.baseAttackCd || 40;
      break;

    case "wind_warden": {
      const mx = (g.x + player.x) / 2;
      const my = (g.y + player.y) / 2;
      spawnHazard("vortex", mx, my, 100, 4 * FPS, 0.45, "boss", 100);
      fanBullets(g, player, 8, 1.6, 4, 1.2, 1.8);
      g.attackCooldown = g.baseAttackCd || 32;
      break;
    }

    case "earth_sentinel":
      spawnHazard("rock", player.x, player.y, 55, 5 * FPS, 0.8, "boss", 55);
      fanBullets(g, player, 1, 0, 5, 3.0, 0.55);
      g.attackCooldown = g.baseAttackCd || 65;
      break;

    case "earth_warden":
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + (g.spinAngle || 0);
        const rx = g.x + Math.cos(a) * 160;
        const ry = g.y + Math.sin(a) * 160;
        spawnWarning(rx, ry, 50, 50, "earth_warn");
        spawnHazard("rock", rx, ry, 50, 2.5 * FPS, 0.9, "boss", 50);
      }
      g.spinAngle = (g.spinAngle || 0) + 0.2;
      g.attackCooldown = g.baseAttackCd || 50;
      break;

    case "omni_sentinel": {
      const elems = ["fire", "ice", "lightning", "wind", "earth"];
      const pick = elems[fc % elems.length];
      const styles = { fire: 1, ice: 2, lightning: 3, wind: 4, earth: 5 };
      fanBullets(g, player, 3, 0.8, styles[pick] || 1, 1.7, 1.2);
      spawnHazard(pick === "lightning" ? "static" : pick, player.x, player.y, 75, 3 * FPS, 0.5, "boss", 75);
      g.attackCooldown = g.baseAttackCd || 45;
      break;
    }

    case "omni_warden":
      for (let ring = 0; ring < 2; ring++) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + ring * 0.6 + (g.spinAngle || 0);
          spawnBullet(
            g.x,
            g.y,
            g.x + Math.cos(a) * 250,
            g.y + Math.sin(a) * 250,
            false,
            1 + (i % 5),
            "boss",
            1.5,
          );
        }
      }
      spawnHazard("void_rift", player.x, player.y, 90, 4 * FPS, 0.6, "boss", 90);
      g.spinAngle = (g.spinAngle || 0) + 0.15;
      g.attackCooldown = g.baseAttackCd || 40;
      break;

    default:
      fanBullets(g, player, 1, 0, 2, 1.5);
      g.attackCooldown = 60;
  }
}

/** Gọi khi miniboss đang combat với player trong phòng */
export function updateMiniBossCombat(g, player, engaged) {
  if (!g?.isMiniBoss || !engaged || g.isStunned > 0) return;
  if ((g.attackCooldown || 0) > 0) {
    g.attackCooldown--;
    return;
  }
  runPattern(g, player);
}

export function drawMiniBoss(ctx, g, minimalDraw = false) {
  const t = state.frameCount;
  const r = g.radius || 60;
  const pulse = Math.sin(t * 0.08) * 0.15 + 0.85;
  const color = g.color || "#ff0055";
  const glow = g.glowColor || color;
  const accent = g.accentColor || "#ffffff";

  ctx.save();

  // Vùng gác theo element
  if (g.behavior === "guard" && g.originalX !== undefined) {
    const guardRadius = 520;
    ctx.beginPath();
    ctx.arc(g.originalX, g.originalY, guardRadius, 0, Math.PI * 2);
    ctx.fillStyle = `${glow}0a`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `${glow}55`;
    ctx.setLineDash([12, 14]);
    ctx.lineDashOffset = -(t * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Aura ngoài
  if (!minimalDraw) {
    ctx.shadowBlur = 28;
    ctx.shadowColor = glow;
    ctx.beginPath();
    ctx.arc(g.x, g.y, r + 14 + Math.sin(t * 0.1) * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `${glow}44`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Vòng xoay theo archetype
  const spin = g.spinAngle || t * 0.03;
  const spikes = g.captureOrder === 2 ? 8 : 6;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    const a = spin + (i / spikes) * Math.PI * 2;
    const inner = r * 0.55;
    const outer = r * (g.captureOrder === 2 ? 1.15 : 1.05);
    const x1 = g.x + Math.cos(a) * inner;
    const y1 = g.y + Math.sin(a) * inner;
    const x2 = g.x + Math.cos(a + 0.12) * outer;
    const y2 = g.y + Math.sin(a + 0.12) * outer;
    if (i === 0) ctx.moveTo(x2, y2);
    else ctx.lineTo(x2, y2);
    ctx.lineTo(x1, y1);
  }
  ctx.closePath();
  ctx.fillStyle = `${accent}33`;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Thân lõi
  const grad = ctx.createRadialGradient(g.x, g.y, r * 0.1, g.x, g.y, r);
  grad.addColorStop(0, accent);
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, glow);
  ctx.beginPath();
  ctx.arc(g.x, g.y, r * pulse, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  if (!minimalDraw) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = glow;
  }
  ctx.fill();
  ctx.shadowBlur = 0;

  // Icon / mắt
  ctx.font = `${Math.floor(r * 0.65)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(g.miniBossIcon || "👹", g.x, g.y + 2);

  // HP bar
  if (g.hp !== undefined) {
    const barW = 110;
    const barH = 12;
    const bx = g.x - barW / 2;
    const by = g.y - r - 28;

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(bx, by, barW, barH);

    const hpRatio = Math.max(0, g.hp / g.maxHp);
    ctx.fillStyle = hpRatio > 0.3 ? color : "#ff9900";
    ctx.fillRect(bx, by, barW * hpRatio, barH);

    if (g.shieldActive && (g.shield || 0) > 0) {
      const shieldRatio = Math.max(0, g.shield / g.maxShield);
      ctx.fillStyle = `${accent}bb`;
      ctx.fillRect(bx, by, barW * shieldRatio, barH);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, barW, barH);

    if (g.hp > 0) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px Orbitron, Arial";
      ctx.fillText((g.miniBossName || "MINI BOSS").toUpperCase(), g.x, by - 5);
    }
  }

  // Particles nhẹ
  if (!minimalDraw && t % 5 === 0 && (state.particles?.length || 0) < 140) {
    const a = Math.random() * Math.PI * 2;
    state.particles.push({
      x: g.x + Math.cos(a) * r,
      y: g.y + Math.sin(a) * r,
      vx: Math.cos(a) * 1.5,
      vy: Math.sin(a) * 1.5,
      life: 18,
      color: glow,
      size: 2 + Math.random() * 2,
    });
  }

  ctx.restore();
}
