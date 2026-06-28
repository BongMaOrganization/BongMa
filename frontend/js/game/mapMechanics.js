import { state } from "../state.js";
import { dist } from "../utils.js";
import { playerTakeDamage } from "./combat.js";
import { pushParticles } from "./elementalZone.js";
import { getCurrentRoom } from "../world/dungeonLayout.js";

function isEnvDamageImmune(player) {
  if (!player) return true;
  if ((player.gracePeriod || 0) > 0) return true;
  const room = getCurrentRoom(player.x, player.y);
  return room && (room.type === "start" || room.type === "heal" || room.type === "upgrade");
}

// ============================================================================
// MAP IDENTITY SYSTEM
// Mỗi map nguyên tố có bản sắc cơ chế riêng ảnh hưởng 3 lớp:
//   - Player  : hazard môi trường (lava/băng/sét/gió/động đất) qua playerStatus
//   - Quái    : khoá hệ + chỉnh chỉ số (applyMapEnemyModifier)
//   - Qua màn : điều kiện đặc thù (sống sót N đợt sự kiện) — isMapObjectiveDone
// Boss KHÔNG bị đụng tới.
//
// Tái dùng tối đa hạ tầng sẵn có:
//   - state.globalHazard : đã tự gây damage + né safeZone + vẽ + sync MP
//   - state.groundWarnings: telegraph (chỉ vẽ) — damage do scheduler ở đây xử lý
//   - state.playerStatus  : burnTimer / slowTimer / stunTimer (đã được tiêu thụ)
//   - state.mapThemeData  : geometry trang trí sẵn (lavaPools, mistFields, ...)
// ============================================================================

// Map theme ↔ hệ nguyên tố quái (thunder map dùng element "lightning")
const THEME_ELEMENT = {
  fire: "fire",
  ice: "ice",
  earth: "earth",
  wind: "wind",
  thunder: "lightning",
};

export function getMapElement() {
  return THEME_ELEMENT[state.currentMapTheme] || null;
}

// --- Helpers hình học ---------------------------------------------------------

function inEllipse(px, py, cx, cy, rx, ry, angle) {
  const dx = px - cx;
  const dy = py - cy;
  const cos = Math.cos(-angle || 0);
  const sin = Math.sin(-angle || 0);
  const rxp = dx * cos - dy * sin;
  const ryp = dx * sin + dy * cos;
  return (rxp * rxp) / (rx * rx || 1) + (ryp * ryp) / (ry * ry || 1) <= 1;
}

// Đặt một đòn AoE có telegraph: groundWarnings lo phần hiển thị, scheduler lo damage
function scheduleStrike(mm, x, y, radius, fuse, warnType, dmg, stun = 0) {
  if (!state.groundWarnings) state.groundWarnings = [];
  state.groundWarnings.push({
    x,
    y,
    radius,
    timer: fuse,
    maxTimer: fuse,
    type: warnType,
  });
  mm.strikes.push({ x, y, radius, fuse, dmg, stun });
}

// Xử lý nổ của các strike đã hẹn giờ (chung cho mọi map)
function resolveStrikes(mm, player, ctx, canvas, changeStateFn) {
  for (let i = mm.strikes.length - 1; i >= 0; i--) {
    const s = mm.strikes[i];
    s.fuse--;
    if (s.fuse > 0) continue;

    // Nổ: trúng player → damage (qua playerTakeDamage để tôn trọng i-frame)
    if (!isEnvDamageImmune(player) && dist(player.x, player.y, s.x, s.y) < s.radius) {
      playerTakeDamage(ctx, canvas, changeStateFn, s.dmg);
      if (s.stun) {
        state.playerStatus.stunTimer = Math.max(
          state.playerStatus.stunTimer || 0,
          s.stun,
        );
      }
    }
    pushParticles({
      x: s.x,
      y: s.y,
      color: "#ff8800",
      count: 10,
      speed: 3,
      life: 18,
      size: 3,
    });
    mm.strikes.splice(i, 1);
  }
}

// Bật một field-event toàn map qua globalHazard (nó tự lo damage/né/vẽ/sync).
// Chỉ gọi khi globalHazard đang rảnh. Trả true nếu vừa kích hoạt.
function triggerGlobalHazard(type, durationFrames, damage) {
  state.globalHazard = {
    type,
    active: true,
    timer: durationFrames,
    damage,
    graceTimer: 30, // 0.5s cho player kịp phản ứng
  };
  return true;
}

const movedThreshold = 1.2;

// ============================================================================
// REGISTRY — mỗi theme định nghĩa updateEnv / modifyEnemy / objective
// ============================================================================

const MAP_MECHANICS = {
  // 🔥 LỬA — Lò Dung Nham ----------------------------------------------------
  fire: {
    onStageInit(mm) {
      mm.meterMax = 280;
      mm.eventTimer = 14 * 60;
      mm.eruptTimer = 12 * 60;
      mm.objectiveTarget = 3;
    },
    updateEnv(player, mm, frame, isAuthority) {
      if (isEnvDamageImmune(player)) {
        mm.meter = Math.max(0, mm.meter - 4);
        mm.lastX = player.x;
        mm.lastY = player.y;
        return;
      }

      const data = state.mapThemeData || {};
      const moved =
        Math.hypot(player.x - mm.lastX, player.y - mm.lastY) > movedThreshold;

      // Lava pools = vùng bỏng thật (giảm DoT, tick chậm hơn)
      let inLava = false;
      if (frame % 2 === 0) {
        for (const p of data.lavaPools || []) {
          if (inEllipse(player.x, player.y, p.x, p.y, p.rx * 0.85, p.ry * 0.85, p.angle)) {
            inLava = true;
            break;
          }
        }
      }
      if (inLava) {
        player.hp -= 0.012;
        state.playerStatus.burnTimer = Math.max(state.playerStatus.burnTimer, 30);
      }

      // Heat meter: đứng yên → nóng lên chậm hơn, di chuyển → hạ nhiệt
      if (moved) mm.meter = Math.max(0, mm.meter - 2.5);
      else mm.meter = Math.min(mm.meterMax, mm.meter + 0.55);
      if (mm.meter >= mm.meterMax && frame % 3 === 0) {
        player.hp -= 0.018;
        state.playerStatus.burnTimer = Math.max(state.playerStatus.burnTimer, 20);
      }

      if (!isAuthority) return;

      // Field-event: sóng lửa toàn map (reuse globalHazard fire)
      if (!state.globalHazard.active) {
        mm.eventTimer--;
        if (mm.eventTimer <= 0) {
          triggerGlobalHazard("fire", 2 * 60, 0.5);
          state.cinematicEffects.fieldBurn = 1;
          mm.eventTimer = 8 * 60;
        }
      }

      // Đợt phun trào (objective): telegraph dọc một fissure rồi nổ
      mm.eruptTimer--;
      if (mm.eruptTimer <= 0) {
        const fissures = data.fissures || [];
        const f = fissures[Math.floor(Math.random() * fissures.length)];
        if (f) {
          f.points.forEach((pt, idx) => {
            if (idx % 2 === 0)
              scheduleStrike(mm, pt.x, pt.y, 80, 75, "geyser", 1, 0);
          });
        }
        mm.objectiveProgress++; // sống sót thêm một đợt
        mm.eruptTimer = 6 * 60;
      }
    },
    modifyEnemy(e) {
      // Cuồng nhiệt: nhanh hơn
      if (typeof e.speed === "number") e.speed *= 1.15;
      if (typeof e.speedRate === "number") e.speedRate *= 1.1;
    },
    objectiveLabel(mm) {
      return `🔥 Sống sót đợt phun: ${Math.min(mm.objectiveProgress, mm.objectiveTarget)}/${mm.objectiveTarget}`;
    },
  },

  // ❄️ BĂNG — Băng Nguyên ----------------------------------------------------
  ice: {
    onStageInit(mm) {
      mm.meterMax = 260; // cold
      mm.eventTimer = 9 * 60;
      mm.eruptTimer = 7 * 60;
      mm.objectiveTarget = 3;
    },
    updateEnv(player, mm, frame, isAuthority) {
      const data = state.mapThemeData || {};

      // Mặt băng trơn: tích quán tính từ chuyển động vừa rồi rồi trượt thêm
      const dx = player.x - mm.lastX;
      const dy = player.y - mm.lastY;
      mm.inertiaX = mm.inertiaX * 0.9 + dx * 0.18;
      mm.inertiaY = mm.inertiaY * 0.9 + dy * 0.18;
      player.x += mm.inertiaX;
      player.y += mm.inertiaY;

      // Sương mù = vùng làm chậm + tích lạnh
      let inMist = false;
      for (const m of data.mistFields || []) {
        if (dist(player.x, player.y, m.x, m.y) < m.radius) {
          inMist = true;
          break;
        }
      }
      if (inMist) {
        state.playerStatus.slowTimer = Math.max(state.playerStatus.slowTimer, 10);
        mm.meter = Math.min(mm.meterMax, mm.meter + 1.5);
      } else {
        mm.meter = Math.max(0, mm.meter - 0.5);
      }
      // Lạnh thấu xương → đóng băng (freeze = stun thật)
      if (mm.meter >= mm.meterMax) {
        state.playerStatus.stunTimer = Math.max(state.playerStatus.stunTimer, 24);
        mm.meter = mm.meterMax * 0.55;
      }

      if (!isAuthority) return;

      // Field-event: bão tuyết toàn map (globalHazard ice → damage + slow)
      if (!state.globalHazard.active) {
        mm.eventTimer--;
        if (mm.eventTimer <= 0) {
          triggerGlobalHazard("ice", 3 * 60, 0.4);
          state.cinematicEffects.fogAlpha = 0.4;
          mm.objectiveProgress++;
          mm.eventTimer = 9 * 60;
        }
      }
    },
    modifyEnemy(e) {
      // Chậm mà trâu: thêm giáp băng
      if (typeof e.speed === "number") e.speed *= 0.85;
      if (typeof e.speedRate === "number") e.speedRate *= 0.92;
      if (typeof e.maxHp === "number") {
        const bonus = Math.ceil(e.maxHp * 0.3);
        e.maxShield = (e.maxShield || 0) + bonus;
        e.shield = e.maxShield;
        e.shieldActive = true;
      }
    },
    objectiveLabel(mm) {
      return `❄️ Sống sót bão tuyết: ${Math.min(mm.objectiveProgress, mm.objectiveTarget)}/${mm.objectiveTarget}`;
    },
  },

  // 🪨 ĐẤT — Vực Địa Chấn ----------------------------------------------------
  earth: {
    onStageInit(mm) {
      mm.eventTimer = 7 * 60;
      mm.eruptTimer = 7 * 60;
      mm.objectiveTarget = 3;
    },
    updateEnv(player, mm, frame, isAuthority) {
      const data = state.mapThemeData || {};

      // Khe nứt = vùng damage khi đứng gần đường nứt
      for (const fl of data.faultLines || []) {
        if (
          player.x < fl.minX - 40 ||
          player.x > fl.maxX + 40 ||
          player.y < fl.minY - 40 ||
          player.y > fl.maxY + 40
        )
          continue;
        let near = false;
        for (const pt of fl.points) {
          if (dist(player.x, player.y, pt.x, pt.y) < 34) {
            near = true;
            break;
          }
        }
        if (near) {
          player.hp -= 0.025;
          break;
        }
      }

      if (!isAuthority) return;

      // Động đất (objective): rung màn hình + đá rơi telegraph quanh player
      mm.eruptTimer--;
      if (mm.eruptTimer <= 0) {
        state.screenShake = { x: 0, y: 0, timer: 80, intensity: 14 };
        for (let i = 0; i < 5; i++) {
          const ang = Math.random() * Math.PI * 2;
          const r = 120 + Math.random() * 360;
          scheduleStrike(
            mm,
            player.x + Math.cos(ang) * r,
            player.y + Math.sin(ang) * r,
            90,
            90,
            "stone_warn",
            1,
            18,
          );
        }
        mm.objectiveProgress++;
        mm.eruptTimer = 7 * 60;
      }
    },
    modifyEnemy(e) {
      // Golem: trâu, chậm
      if (typeof e.speed === "number") e.speed *= 0.8;
      if (typeof e.speedRate === "number") e.speedRate *= 0.88;
      if (typeof e.maxHp === "number") {
        e.maxHp = Math.ceil(e.maxHp * 1.4);
        e.hp = e.maxHp;
      }
    },
    objectiveLabel(mm) {
      return `🪨 Sống sót động đất: ${Math.min(mm.objectiveProgress, mm.objectiveTarget)}/${mm.objectiveTarget}`;
    },
  },

  // 🌪️ GIÓ — Cuồng Phong -----------------------------------------------------
  wind: {
    onStageInit(mm) {
      mm.eventTimer = 6 * 60;
      mm.objectiveTarget = 3;
      mm.windAngle = Math.random() * Math.PI * 2;
    },
    updateEnv(player, mm, frame, isAuthority) {
      const data = state.mapThemeData || {};

      // Gió thổi liên tục: đẩy đạn (qua windForce — đã có sẵn) + đẩy player
      const fx = Math.cos(mm.windAngle) * 0.18;
      const fy = Math.sin(mm.windAngle) * 0.18;
      state.windForce = { x: fx * 0.6, y: fy * 0.6, timer: 4 };
      player.x += fx * 7;
      player.y += fy * 7;

      // Xoáy: hút player vào tâm nếu trong vùng
      for (const v of data.vortexFields || []) {
        const d = dist(player.x, player.y, v.x, v.y);
        if (d < v.radius && d > 1) {
          const pull = (1 - d / v.radius) * 2.4;
          player.x += ((v.x - player.x) / d) * pull;
          player.y += ((v.y - player.y) / d) * pull;
        }
      }

      if (!isAuthority) return;

      // Sự kiện: đổi hướng gió + cơn giật mạnh (vẽ vortex cinematic)
      mm.eventTimer--;
      if (mm.eventTimer <= 0) {
        mm.windAngle = Math.random() * Math.PI * 2;
        state.cinematicEffects.vortexPower = 1;
        state.cinematicEffects.vortexCenter = { x: player.x, y: player.y };
        mm.objectiveProgress++;
        mm.eventTimer = 6 * 60;
      }
    },
    modifyEnemy(e) {
      // Lượn nhanh
      if (typeof e.speed === "number") e.speed *= 1.2;
      if (typeof e.speedRate === "number") e.speedRate *= 1.15;
    },
    objectiveLabel(mm) {
      return `🌪️ Trụ qua cơn lốc: ${Math.min(mm.objectiveProgress, mm.objectiveTarget)}/${mm.objectiveTarget}`;
    },
  },

  // ⚡ SẤM — Tháp Sấm ---------------------------------------------------------
  thunder: {
    onStageInit(mm) {
      mm.eventTimer = 9 * 60;
      mm.eruptTimer = 2.2 * 60;
      mm.objectiveTarget = 3;
    },
    updateEnv(player, mm, frame, isAuthority) {
      const data = state.mapThemeData || {};

      // Vùng nhiễm điện: đứng lâu → tick stun nhẹ + damage
      let charged = false;
      for (const c of data.chargeFields || []) {
        if (dist(player.x, player.y, c.x, c.y) < c.radius) {
          charged = true;
          break;
        }
      }
      if (charged && frame % 30 === 0) {
        player.hp -= 0.15;
        state.playerStatus.stunTimer = Math.max(state.playerStatus.stunTimer, 6);
      }

      if (!isAuthority) return;

      // Sét đánh ngẫu nhiên có telegraph quanh player
      mm.eruptTimer--;
      if (mm.eruptTimer <= 0) {
        const bx = player.x + (Math.random() - 0.5) * 700;
        const by = player.y + (Math.random() - 0.5) * 700;
        scheduleStrike(mm, bx, by, 75, 50, "thunder_warn", 1, 30);
        mm.eruptTimer = Math.floor((1.4 + Math.random() * 1.2) * 60);
      }

      // Sự kiện surge: quá tải field (globalHazard electric)
      if (!state.globalHazard.active) {
        mm.eventTimer--;
        if (mm.eventTimer <= 0) {
          triggerGlobalHazard("electric", 2.5 * 60, 0.5);
          mm.objectiveProgress++;
          mm.eventTimer = 9 * 60;
        }
      }
    },
    modifyEnemy(e) {
      if (typeof e.speed === "number") e.speed *= 1.1;
    },
    objectiveLabel(mm) {
      return `⚡ Sống sót surge: ${Math.min(mm.objectiveProgress, mm.objectiveTarget)}/${mm.objectiveTarget}`;
    },
  },
};

// ============================================================================
// WRAPPERS — gọi từ vòng đời game
// ============================================================================

export function initMapMechanic() {
  const theme = state.currentMapTheme;
  const mm = state.mapMechanic;

  // Reset trạng thái runtime mỗi màn
  mm.theme = theme;
  mm.element = getMapElement();
  mm.meter = 0;
  mm.meterMax = 240;
  mm.eventTimer = 300;
  mm.eruptTimer = 360;
  mm.objectiveProgress = 0;
  mm.objectiveTarget = 3;
  mm.lastX = state.player?.x || 0;
  mm.lastY = state.player?.y || 0;
  mm.inertiaX = 0;
  mm.inertiaY = 0;
  mm.windAngle = 0;
  mm.strikes = [];

  MAP_MECHANICS[theme]?.onStageInit?.(mm);
}

export function updateMapMechanic(player, ctx, canvas, changeStateFn) {
  if (!player) return;
  // Chỉ chạy ở màn thường. Boss/arena dùng globalHazard riêng (sync MP) — tránh xung đột.
  if (state.isBossLevel || state.bossArenaMode) return;

  const mm = state.mapMechanic;
  const def = MAP_MECHANICS[mm.theme];
  // Màn thường trong MP là per-client (swarm/cổng/crate đều tính cục bộ) →
  // mỗi client tự chạy cơ chế map của mình. isAuthority luôn true ở đây.
  const isAuthority = true;

  if (def?.updateEnv) {
    def.updateEnv(player, mm, state.frameCount, isAuthority);
  }
  resolveStrikes(mm, player, ctx, canvas, changeStateFn);

  mm.lastX = player.x;
  mm.lastY = player.y;
}

export function applyMapEnemyModifier(enemy) {
  if (!enemy) return;
  const mm = state.mapMechanic;
  // Khoá hệ: mọi quái mang hệ của map (đồng nhất zone khi chết)
  if (mm.element) enemy.element = mm.element;
  MAP_MECHANICS[mm.theme]?.modifyEnemy?.(enemy);
}

export function isMapObjectiveDone() {
  const mm = state.mapMechanic;
  if (!MAP_MECHANICS[mm.theme]) return true; // map không có cơ chế → mở cổng như cũ
  return mm.objectiveProgress >= mm.objectiveTarget;
}

export function getMapObjectiveLabel() {
  const mm = state.mapMechanic;
  return MAP_MECHANICS[mm.theme]?.objectiveLabel?.(mm) || "";
}
