import { state } from "../../state.js";
import {
  spawnBullet,
  spawnHazard,
  spawnBeam,
  spawnWarning,
  spawnMeteor,
  spawnSafeZone,
} from "../helpers.js";
import { dist } from "../../utils.js";

const TAU = Math.PI * 2;

export function activateShield(boss, amount) {}

// Helper bắn theo góc
function fireAngle(sx, sy, angle, style = 0, source = "boss", damage = 1) {
  spawnBullet(
    sx,
    sy,
    sx + Math.cos(angle),
    sy + Math.sin(angle),
    false,
    style,
    source,
    damage,
  );
}

// Helper bắn vòng tròn
function ring(
  sx,
  sy,
  count,
  offset = 0,
  style = 0,
  source = "boss",
  damage = 1,
) {
  for (let i = 0; i < count; i++) {
    fireAngle(sx, sy, offset + (i * TAU) / count, style, source, damage);
  }
}

// Helper bắn hình quạt
function fan(
  sx,
  sy,
  baseAngle,
  count,
  spread,
  style = 0,
  source = "boss",
  damage = 1,
) {
  const start = baseAngle - (spread * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    fireAngle(sx, sy, start + i * spread, style, source, damage);
  }
}

function aim(boss, extraAngle = 0) {
  return (
    Math.atan2(state.player.y - boss.y, state.player.x - boss.x) + extraAngle
  );
}

export const ATTACK_MODES = {
  0: (b) => {
    const a = aim(b);
    for (let i = 0; i < 15; i++) {
      const va = a + (Math.random() - 0.5) * 0.6;
      const vs = 4 + Math.random() * 8;
      state.bullets.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(va) * vs,
        vy: Math.sin(va) * vs,
        isPlayer: false,
        radius: 8 + Math.random() * 15,
        life: 30 + Math.random() * 20,
        style: 1,
        damage: 1,
      });
    }
  },
  1: (b) => fan(b.x, b.y, aim(b), 5, 0.2, 1),
  2: (b) => ring(b.x, b.y, 14, state.frameCount * 0.05, 1),
  3: (b) => ring(b.x, b.y, 8, -state.frameCount * 0.1, 1),
  4: (b) => fan(b.x, b.y, aim(b), 3, 0.4, 1),
  5: (b) => ring(b.x, b.y, 10, state.frameCount * 0.02, 2),
  6: (b) => fan(b.x, b.y, aim(b), 7, 0.1, 2),
  7: (b) => ring(b.x, b.y, 15, -state.frameCount * 0.05, 2),
  8: (b) => fan(b.x, b.y, aim(b), 5, 0.3, 2),
  10: (b) => ring(b.x, b.y, 12, 0, 3),
  11: (b) => fan(b.x, b.y, aim(b), 3, 0.5, 3),
  12: (b) => {
    for (let i = 0; i < 10; i++) fireAngle(b.x, b.y, Math.random() * TAU, 3);
  },
  13: (b) => ring(b.x, b.y, 20, state.frameCount * 0.1, 3),
  15: (b) => ring(b.x, b.y, 8, 0, 0),
  16: (b) => fan(b.x, b.y, aim(b), 11, 0.1, 0),
  17: (b) => ring(b.x, b.y, 12, state.frameCount * 0.04, 0),
  18: (b) => fan(b.x, b.y, aim(b), 7, 0.2, 0),
  20: (b) => ring(b.x, b.y, 10, state.frameCount * 0.08, 4),
  21: (b) => fan(b.x, b.y, aim(b), 15, 0.05, 4),
  22: (b) => ring(b.x, b.y, 18, -state.frameCount * 0.05, 4),
  23: (b) => fan(b.x, b.y, aim(b), 9, 0.15, 4),
  30: (b) => {
    // Lửa + Gió
    fan(b.x, b.y, aim(b), 5, 0.2, 1);
    ring(b.x, b.y, 10, state.frameCount * 0.05, 4);
  },
  31: (b) => {
    // Băng + Sấm
    ring(b.x, b.y, 12, 0, 2);
    fan(b.x, b.y, aim(b) + Math.PI, 6, 0.3, 3); // Bắn sấm về phía sau dội lại
  },
  32: (b) => {
    // Hỗn mang (4 loại đạn)
    fireAngle(b.x, b.y, aim(b), 1);
    fireAngle(b.x, b.y, aim(b) + 0.2, 2);
    fireAngle(b.x, b.y, aim(b) - 0.2, 3);
    fireAngle(b.x, b.y, aim(b) + Math.PI, 4);
  },

  // 33: Grid Laser (bàn cờ)
  33: (b) => {
    const gap = 80;
    const speed = 1.5;
    const cx = state.camera.x;
    const cy = state.camera.y;

    // Hàng ngang
    for (let y = gap; y < 864; y += gap) {
      state.bullets.push({
        x: cx,
        y: cy + y,
        vx: speed,
        vy: 0,
        radius: 8,
        life: 600,
        isPlayer: false,
        style: 4,
        damage: 1,
      });
    }

    // Hàng dọc
    for (let x = gap; x < 1536; x += gap) {
      state.bullets.push({
        x: cx + x,
        y: cy,
        vx: 0,
        vy: speed,
        radius: 8,
        life: 600,
        isPlayer: false,
        style: 4,
        damage: 1,
      });
    }
  },

  // 34: Homing Mine
  34: (b) => {
    for (let i = 0; i < 3; i++) {
      const mx = state.camera.x + Math.random() * 1536;
      const my = state.camera.y + Math.random() * 864;

      const mine = {
        x: mx,
        y: my,
        radius: 15,
        life: 300,
        isMine: true,
      };

      state.hazards.push(mine);

      state.delayedTasks.push({
        delay: 120,
        action: () => {
          // nổ
          for (let j = 0; j < 8; j++) {
            fireAngle(mx, my, (j / 8) * Math.PI * 2, 3);
          }
        },
      });
    }
  },

  // 35: Black Hole Pull
  35: (b) => {
    // hút nhẹ
    const dx = b.x - state.player.x;
    const dy = b.y - state.player.y;

    state.player.x += dx * 0.02;
    state.player.y += dy * 0.02;

    ring(b.x, b.y, 10, state.frameCount * 0.05, 4);
  },

  // 36: Void Rifts (bắn từ viền)
  36: (b) => {
    for (let i = 0; i < 6; i++) {
      let side = Math.floor(Math.random() * 4);
      let x, y;

      if (side === 0) {
        x = state.camera.x;
        y = state.camera.y + Math.random() * 864;
      }
      if (side === 1) {
        x = state.camera.x + 1536;
        y = state.camera.y + Math.random() * 864;
      }
      if (side === 2) {
        x = state.camera.x + Math.random() * 1536;
        y = state.camera.y;
      }
      if (side === 3) {
        x = state.camera.x + Math.random() * 1536;
        y = state.camera.y + 864;
      }

      fireAngle(x, y, Math.atan2(state.player.y - y, state.player.x - x), 4);
    }
  },
  // ===== GLITCH MODES =====

  // 37: Ping-Pong Teleport Bullet
  37: (b) => {
    for (let i = 0; i < 3; i++) {
      let angle = Math.random() * Math.PI * 2;

      let bullet = {
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        radius: 12,
        life: 180,
        isPlayer: false,
        style: 4,
        glitchTimer: 30,
      };

      state.bullets.push(bullet);

      state.delayedTasks.push({
        delay: 30,
        action: () => {
          // teleport + đổi hướng
          bullet.x = state.camera.x + Math.random() * 1536;
          bullet.y = state.camera.y + Math.random() * 864;

          let dir = Math.random() > 0.5 ? 1 : -1;
          let tmp = bullet.vx;
          bullet.vx = -bullet.vy * dir;
          bullet.vy = tmp * dir;
        },
      });
    }
  },

  // 38: Fake Warning
  38: (b) => {
    let a = aim(b);

    // warning 90 độ
    spawnWarning(
      b.x + Math.cos(a) * 200,
      b.y + Math.sin(a) * 200,
      120,
      60,
      "laser",
    );

    state.delayedTasks.push({
      delay: 60,
      action: () => {
        // bắn 270 độ còn lại
        for (let i = 0; i < 12; i++) {
          let angle = a + Math.PI + (i / 12) * Math.PI;
          fireAngle(b.x, b.y, angle, 4);
        }
      },
    });
  },

  // 39: Screen Edge Glitch
  39: () => {
    for (let i = 0; i < 8; i++) {
      let side = Math.floor(Math.random() * 4);
      let x, y;

      if (side === 0) {
        x = state.camera.x;
        y = state.camera.y + Math.random() * 864;
      }
      if (side === 1) {
        x = state.camera.x + 1536;
        y = state.camera.y + Math.random() * 864;
      }
      if (side === 2) {
        x = state.camera.x + Math.random() * 1536;
        y = state.camera.y;
      }
      if (side === 3) {
        x = state.camera.x + Math.random() * 1536;
        y = state.camera.y + 864;
      }

      let speed = 2 + Math.random() * 6;

      state.bullets.push({
        x,
        y,
        vx: ((state.player.x - x) / 100) * speed,
        vy: ((state.player.y - y) / 100) * speed,
        radius: 8,
        life: 200,
        isPlayer: false,
        style: 4,
      });
    }
  },

  // 40: Binary Bounce
  40: (b) => {
    for (let i = 0; i < 8; i++) {
      let angle = aim(b) + (i - 4) * 0.2;

      state.bullets.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        radius: 10,
        life: 200,
        isPlayer: false,
        style: i % 2 === 0 ? 1 : 2,
        bounces: 1,
      });
    }
  },
  41: (b) => {
    // teleport random
    b.x = Math.max(
      100,
      Math.min(
        state.world.width - 100,
        state.player.x + (Math.random() - 0.5) * 800,
      ),
    );
    b.y = Math.max(
      100,
      Math.min(
        state.world.height - 100,
        state.player.y + (Math.random() - 0.5) * 600,
      ),
    );

    // burst
    ring(b.x, b.y, 20, 0, 4);
  },
  42: () => {
    for (let i = 0; i < 20; i++) {
      let x = state.camera.x + Math.random() * 1536;

      state.bullets.push({
        x,
        y: state.camera.y,
        vx: 0,
        vy: 8,
        radius: 6,
        life: 100,
        isPlayer: false,
        style: 4,
      });
    }
  },
  43: () => {
    // random freeze
    state.cinematicEffects.freezeTimer = 20;

    // random push
    state.player.x += (Math.random() - 0.5) * 200;
    state.player.y += (Math.random() - 0.5) * 200;
  },

  // ===== THE ENTITY PHASE =====
  60: (b) => ring(b.x, b.y, 24, state.frameCount * 0.08, 1),
  61: (b) => fan(b.x, b.y, aim(b), 9, 0.15, 3),
  // ===== VOID (HƯ KHÔNG) MỚI =====
  // Bắn đạn bóng tối chậm nhưng xé rách không gian (Style 10)
  70: (b) => {
    const a = aim(b);
    fan(b.x, b.y, a, 5, 0.4, 10, "boss", 1.5);
    ring(b.x, b.y, 8, state.frameCount * 0.05, 10, "boss", 1.5);
  },
  // Bão tinh vân: Đạn xoắn ốc kép
  71: (b) => {
    for (let i = 0; i < 4; i++) {
      fireAngle(
        b.x,
        b.y,
        state.frameCount * 0.1 + (i * Math.PI) / 2,
        10,
        "boss",
        2,
      );
      fireAngle(
        b.x,
        b.y,
        -state.frameCount * 0.1 + (i * Math.PI) / 2,
        10,
        "boss",
        2,
      );
    }
  },

  // ===== GLITCH / ENTITY MỚI =====
  // Mã độc (Corruption): Bắn đạn vuông (Style 11) lan truyền như virus
  80: (b) => {
    const a = aim(b);
    for (let i = 0; i < 8; i++) {
      state.delayedTasks.push({
        delay: i * 5,
        action: () => {
          fireAngle(
            b.x + (Math.random() - 0.5) * 50,
            b.y + (Math.random() - 0.5) * 50,
            a + (Math.random() - 0.5) * 0.3,
            11,
            "boss",
            1.5,
          );
        },
      });
    }
  },
  // Data Stream: Bắn các luồng dữ liệu neon tốc độ cực cao (Style 12)
  81: (b) => {
    const a = aim(b);
    fan(b.x, b.y, a, 15, 0.1, 12, "boss", 2);
  },
};

export const SPECIAL_SKILLS = {
  // --- FIRE ---
  "Meteor Strike": (boss) => {
    const count = 7;
    for (let i = 0; i < count; i++) {
      state.delayedTasks.push({
        delay: i * 15,
        action: () => {
          const tx = state.player.x + (Math.random() - 0.5) * 150;
          const ty = state.player.y + (Math.random() - 0.5) * 150;
          spawnWarning(tx, ty, 70, 90, "laser");
          state.delayedTasks.push({
            delay: 90,
            action: () => spawnMeteor(tx, -100, tx, ty),
          });
        },
      });
    }
  },
  "Inferno Pulse": (boss) => {
    activateShield(boss, 120);
    for (let i = 0; i < 8; i++) {
      state.delayedTasks.push({
        delay: i * 15,
        action: () => {
          const px =
            i % 2 === 0
              ? state.player.x + (Math.random() - 0.5) * 200
              : boss.x + (Math.random() - 0.5) * 300;
          const py =
            i % 2 === 0
              ? state.player.y + (Math.random() - 0.5) * 200
              : boss.y + (Math.random() - 0.5) * 300;
          // THAY ĐỔI: Dùng cảnh báo "geyser" (sủi bọt)
          spawnWarning(px, py, 65, 60, "geyser");
          state.delayedTasks.push({
            delay: 60,
            action: () => {
              spawnHazard("fire", px, py, 10, 240, 0.5, "boss", 75);
              state.screenShake.timer = 8;
              state.screenShake.intensity = 6;
              state.screenShake.type = "earth";
            },
          });
        },
      });
    }
  },
  SUPERNOVA: (boss) => {
    state.screenShake.timer = 200;
    state.screenShake.intensity = 10;
    state.screenShake.type = "wind";
    boss.ultimatePhase = true;
    state.globalHazard = {
      type: "fire",
      active: true,
      timer: 600,
      damage: 1.0,
    };

    // ĐÃ NERF: Vùng an toàn to hơn (250), đi chậm hơn và KHÔNG bị thu nhỏ nữa
    spawnSafeZone(state.player.x - 400, state.player.y - 200, 250, 600, {
      vx: 1.5,
      vy: 1,
      shrinking: false,
    });
    spawnSafeZone(state.player.x + 200, state.player.y + 100, 250, 600, {
      vx: -1.5,
      vy: -1,
      shrinking: false,
    });
  },

  // --- EARTH ---
  "Seismic Rift": (boss) => {
    activateShield(boss, 180);
    const targetAngle = aim(boss);
    for (let i = 0; i < 10; i++) {
      state.delayedTasks.push({
        delay: i * 8,
        action: () => {
          const px = boss.x + Math.cos(targetAngle) * (i * 60 + 50);
          const py = boss.y + Math.sin(targetAngle) * (i * 60 + 50);
          spawnHazard("rock", px, py, 45, 400);
          state.screenShake.timer = 5;
          state.screenShake.intensity = 8;
          state.screenShake.type = "earth";
        },
      });
    }
  },
  "Earth Spikes": (boss) => {
    activateShield(boss, 150);
    for (let i = 0; i < 15; i++) {
      state.delayedTasks.push({
        delay: i * 12,
        action: () => {
          // Đuổi theo vị trí người chơi
          const px = state.player.x + (Math.random() - 0.5) * 40;
          const py = state.player.y + (Math.random() - 0.5) * 40;

          // Dùng loại cảnh báo "spike" (mặt đất nứt nẻ)
          spawnWarning(px, py, 45, 50, "spike");

          state.delayedTasks.push({
            delay: 50,
            action: () => {
              // Trồi đá lên gây choáng nhẹ và thành vật cản
              spawnHazard("rock", px, py, 45, 240);
              state.screenShake.timer = 5;
              state.screenShake.intensity = 8;
              state.screenShake.type = "earth";

              // Sát thương trồi lên nếu player không né
              if (
                dist(state.player.x, state.player.y, px, py) <
                45 + state.player.radius
              ) {
                state.player.hp -= 1;
              }
            },
          });
        },
      });
    }
  },
  EARTHQUAKE: (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 600;
    state.screenShake.intensity = 5;
    state.screenShake.type = "earth";
    state.globalHazard = {
      type: "earth",
      active: true,
      timer: 600,
      damage: 1.2,
    };
    spawnSafeZone(state.player.x, state.player.y, 250, 600, {
      shrinking: false,
    });
  },

  // --- ICE ---
  "Frost Nova": (boss) => {
    activateShield(boss, 100);
    ring(boss.x, boss.y, 36, 0, 2);
    spawnHazard("frost", boss.x, boss.y, 300, 240);
  },
  "Icicle Rain": (boss) => {
    activateShield(boss, 120);
    for (let i = 0; i < 40; i++) {
      state.delayedTasks.push({
        delay: i * 4,
        action: () => {
          const rx = state.camera.x + Math.random() * 1536;
          fireAngle(rx, state.camera.y + 15, Math.PI / 2, 2);
        },
      });
    }
  },
  "GLACIAL AGE": (boss) => {
    boss.ultimatePhase = true;
    state.globalHazard = { type: "ice", active: true, timer: 600, damage: 0.8 };
    spawnSafeZone(boss.x, boss.y, 300, 600, {
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
    });

    // NÂNG CẤP: Liên tục triệu hồi các bãi băng ngẫu nhiên trên mặt đất trong suốt 10 giây
    for (let i = 0; i < 20; i++) {
      state.delayedTasks.push({
        delay: i * 30, // Cứ 0.5s xuất hiện 1 bãi băng
        action: () =>
          spawnHazard(
            "frost",
            state.camera.x + Math.random() * 1536,
            state.camera.y + Math.random() * 864,
            60 + Math.random() * 40,
            180,
          ),
      });
    }
  },

  // --- WIND ---
  "Cyclone Barrage": (boss) => {
    activateShield(boss, 80);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      spawnHazard(
        "vortex",
        boss.x + Math.cos(a) * 200,
        boss.y + Math.sin(a) * 200,
        80,
        480,
      );
    }
  },
  "Vacuum Wave": (boss) => {
    activateShield(boss, 100);
    // Sinh ra Lốc Xoáy siêu to khổng lồ ngay tại Boss hút người chơi lại gần
    spawnHazard("vortex", boss.x, boss.y, 400, 300);

    for (let i = 0; i < 5; i++) {
      state.delayedTasks.push({
        delay: i * 20,
        action: () => fan(boss.x, boss.y, aim(boss), 7, 0.2, 4), // Bắn đạn Gió (Style 4)
      });
    }
  },
  HURRICANE: (boss) => {
    boss.ultimatePhase = true;
    state.globalHazard = {
      type: "wind",
      active: true,
      timer: 600,
      damage: 0.5,
    };
    state.screenShake.timer = 600;
    state.screenShake.intensity = 5; // Rung màn hình mạnh hơn do bão
    state.screenShake.type = "wind";
    spawnSafeZone(state.player.x, state.player.y, 250, 600, { vx: 1.2, vy: 0 });
  },

  // --- THUNDER ---
  "Tesla Field": (boss) => {
    activateShield(boss, 150); // Tăng chút khiên vì chiêu này cast lâu

    // Khóa mục tiêu vị trí hiện tại của người chơi
    const px = state.player.x;
    const py = state.player.y;

    // 1. Tạo ra 6 bãi mìn điện bao vây người chơi (Tạo lồng điện)
    const nodeCount = 6;
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const hx = px + Math.cos(angle) * 130; // Bán kính lồng điện là 130
      const hy = py + Math.sin(angle) * 130;

      // Hiện cảnh báo trước
      spawnWarning(hx, hy, 45, 60, "laser");

      state.delayedTasks.push({
        delay: 60,
        action: () => {
          // Bẫy điện tồn tại khá lâu (300 frame = 5s)
          spawnHazard("static", hx, hy, 45, 300, 0.5, "boss");
        },
      });
    }

    // 2. Bắn một tia laser hủy diệt thẳng vào giữa lồng điện để ép góc
    state.delayedTasks.push({
      delay: 75, // Trễ hơn mìn điện một chút
      action: () => {
        spawnBeam(boss.x, boss.y, px, py, 45, 40);
        state.screenShake.timer = 15;
        state.screenShake.intensity = 8;
        state.screenShake.type = "thunder";
      },
    });
  },
  "Chain Lightning": (boss) => {
    activateShield(boss, 120);
    const totalStrikes = 5; // Số lần giật sét liên tục

    for (let i = 0; i < totalStrikes; i++) {
      state.delayedTasks.push({
        delay: i * 25, // Mỗi 25 frame giật 1 phát (rất nhanh)
        action: () => {
          // Đuổi theo vị trí người chơi hiện tại + một chút ngẫu nhiên để không quá khó né
          const px = state.player.x + (Math.random() - 0.5) * 60;
          const py = state.player.y + (Math.random() - 0.5) * 60;

          // Tia sét giật xuống đất (từ boss đến điểm mục tiêu, charge cực nhanh)
          spawnBeam(boss.x, boss.y, px, py, 15, 10);

          // Ngay khi tia sét vừa dứt, nổ tung ra các viên đạn điện (Style 3)
          state.delayedTasks.push({
            delay: 15 + 10,
            action: () => {
              // ring(x, y, số lượng đạn, góc lệch, style, source, damage)
              ring(px, py, 6, Math.random() * Math.PI, 3, "boss", 0.5);
              state.screenShake.timer = 5;
              state.screenShake.intensity = 4;
              state.screenShake.type = "thunder";
            },
          });
        },
      });
    }
  },
  "HEAVEN'S WRATH": (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 600;
    state.screenShake.intensity = 8; // Giảm từ 20 xuống 8 để bớt rung
    state.screenShake.type = "thunder";
    state.globalHazard = {
      type: "electric",
      active: true,
      timer: 600,
      damage: 1.5,
    };
    spawnSafeZone(
      state.camera.x + Math.random() * 1536,
      state.camera.y + Math.random() * 864,
      250,
      600,
      {
        vx: 1,
        vy: 1,
      },
    );
  },

  // --- OMNI  ---
  // Phase 1:
  Omni_SpatialMatrix: (boss) => {
    activateShield(boss, 150);
    let px = state.player.x;
    let py = state.player.y;
    let s = 130;

    // 1. SẤM: Ép khung bằng 4 tia Laser chớp nhoáng
    spawnBeam(px - s, py - s, px + s, py - s, 30, 40); // Cạnh trên
    spawnBeam(px - s, py + s, px + s, py + s, 30, 40); // Cạnh dưới
    spawnBeam(px - s, py - s, px - s, py + s, 30, 40); // Cạnh trái
    spawnBeam(px + s, py - s, px + s, py + s, 30, 40); // Cạnh phải

    // 2. BĂNG & GIÓ: Vừa làm chậm vừa hút vào giữa
    spawnHazard("frost", px, py, s, 90, 0, "boss");
    spawnHazard("vortex", px, py, s * 1.5, 90, 0, "boss");

    state.delayedTasks.push({
      delay: 40, // Ngay khi Laser chớp lên vây khốn
      action: () => {
        // 3. LỬA: Kích nổ cột lửa lấp kín gần hết cái hộp
        spawnHazard("fire", px, py, s - 10, 60, 1.0, "boss");

        // Rung giật màn hình cực mạnh
        state.screenShake.timer = 15;
        state.screenShake.intensity = 12;
        state.screenShake.type = "earth";

        // 4. HỖN MANG: Bắn đạn tứ sắc khổng lồ văng ra 12 hướng
        for (let j = 0; j < 12; j++) {
          let angle = (j / 12) * Math.PI * 2;
          state.bullets.push({
            x: px,
            y: py,
            vx: Math.cos(angle) * 7,
            vy: Math.sin(angle) * 7,
            isPlayer: false,
            radius: 12,
            life: 150,
            style: (j % 4) + 1,
            damage: 1.5,
          });
        }
      },
    });
  },
  // Phase 2: Lưu Tinh Đa Sắc (Prismatic Meteors) - Bản Dàn Nhạc Nguyên Tố
  Omni_PrismaticMeteors: (boss) => {
    activateShield(boss, 150);

    // Gió: Tạo lốc xoáy khổng lồ giữa bản đồ hút nhẹ người chơi, cản trở việc chạy trốn
    spawnHazard("vortex", state.player.x, state.player.y, 800, 150, 0, "boss");

    for (let i = 0; i < 4; i++) {
      // Tăng lên 4 quả thiên thạch
      state.delayedTasks.push({
        delay: i * 30,
        action: () => {
          let tx = state.player.x;
          let ty = state.player.y;

          // Lửa: Đặt cảnh báo Thiên Thạch
          spawnWarning(tx, ty, 70, 45, "meteor");

          // Sấm: Trong lúc đợi thiên thạch rơi, giật sét ngẫu nhiên khóa góc né
          for (let k = 0; k < 2; k++) {
            let lx = tx + (Math.random() - 0.5) * 200;
            let ly = ty + (Math.random() - 0.5) * 200;
            spawnWarning(lx, ly, 45, 30, "laser");
            state.delayedTasks.push({
              delay: 30,
              action: () => {
                spawnBeam(boss.x, boss.y, lx, ly, 10, 10);
                state.screenShake.timer = 5;
                state.screenShake.intensity = 5;
                state.screenShake.type = "thunder";
              },
            });
          }

          // Thiên thạch chạm đất
          state.delayedTasks.push({
            delay: 45,
            action: () => {
              spawnMeteor(tx, -50, tx, ty);

              // Băng: Sau khi rơi, để lại bãi băng và văng 8 viên đạn 4 màu
              state.delayedTasks.push({
                delay: 18, // Căn đúng lúc thiên thạch chạm mặt đất
                action: () => {
                  spawnHazard("frost", tx, ty, 80, 120, 0, "boss"); // Bãi băng làm chậm
                  state.screenShake.timer = 8;
                  state.screenShake.intensity = 8;
                  state.screenShake.type = "earth";

                  for (let j = 0; j < 8; j++) {
                    let angle = (j / 8) * Math.PI * 2;
                    state.bullets.push({
                      x: tx,
                      y: ty,
                      vx: Math.cos(angle) * 5,
                      vy: Math.sin(angle) * 5,
                      isPlayer: false,
                      radius: 10,
                      life: 150,
                      style: (j % 4) + 1,
                      damage: 1,
                    });
                  }
                },
              });
            },
          });
        },
      });
    }
  },
  // Phase 3: Sát Thủ Ảo Ảnh (Mirage Assault) - Tái Bản Đa Nguyên Tố
  Omni_MirageAssault: (boss) => {
    activateShield(boss, 180); // Tăng chút khiên vì chiêu biểu diễn dài hơn

    // 4 nguyên tố đại diện: Lửa (1), Băng (2), Gió (4), Sấm (3)
    const elements = [
      { style: 1, hazard: "fire", color: "#ff4400" },
      { style: 2, hazard: "frost", color: "#00ffff" },
      { style: 4, hazard: "vortex", color: "#00ffcc" },
      { style: 3, hazard: "static", color: "#ffff00" },
    ];

    for (let i = 0; i < 4; i++) {
      state.delayedTasks.push({
        delay: i * 25, // Tốc độ chớp nhoáng giãn ra một nhịp để kịp nhìn hiệu ứng
        action: () => {
          // Lấy vị trí realtime của người chơi để bám đuổi gắt hơn
          let px = state.player.x;
          let py = state.player.y;
          let angle = (i / 4) * Math.PI * 2 + Math.PI / 4;

          boss.x = px + Math.cos(angle) * 250;
          boss.y = py + Math.sin(angle) * 250;

          // Đổi màu Boss chớp nhoáng theo nguyên tố
          boss.color = elements[i].color;

          // 1. Chém Laser báo hiệu sự xuất hiện
          spawnBeam(boss.x, boss.y, px, py, 12, 10);

          // 2. Xả đạn đan xen: Chẵn thì quạt (fan), Lẻ thì nổ vòng tròn (ring)
          if (i % 2 === 0) {
            fan(
              boss.x,
              boss.y,
              Math.atan2(py - boss.y, px - boss.x),
              7,
              0.2,
              elements[i].style,
              "boss",
              1.5,
            );
          } else {
            ring(boss.x, boss.y, 16, 0, elements[i].style, "boss", 1.5);
          }

          // 3. Để lại bẫy nguyên tố tại chỗ vừa đứng
          spawnHazard(elements[i].hazard, boss.x, boss.y, 60, 180, 1, "boss");

          // Chớp rung nhẹ mỗi cú chém
          state.screenShake.timer = 4;
          state.screenShake.intensity = 5;
        },
      });
    }

    // Đòn chốt hạ: Kích Nổ Tứ Tượng
    state.delayedTasks.push({
      delay: 115,
      action: () => {
        boss.x = 400;
        boss.y = 300;
        boss.color = boss.originalColor; // Trả lại màu trắng tối thượng

        // Nổ 4 vòng đạn 4 màu xen kẽ nhau cực đẹp
        for (let j = 0; j < 4; j++) {
          ring(
            boss.x,
            boss.y,
            12,
            j * (Math.PI / 24),
            elements[j].style,
            "boss",
            2,
          );
        }

        // Khóa mục tiêu giật sét khổng lồ chốt hạ
        spawnHazard(
          "static",
          state.player.x,
          state.player.y,
          150,
          45,
          1.5,
          "boss",
        );

        state.screenShake.timer = 20;
        state.screenShake.intensity = 15;
        state.screenShake.type = "thunder";
      },
    });
  },
  // Phase 4: Chong Chóng Tử Thần (Eternal Carousel) - Bản Đồ Sát
  Omni_EternalCarousel: (boss) => {
    activateShield(boss, 180); // Tăng khiên vì thời gian cast kéo dài
    boss.x = 400;
    boss.y = 300; // Căn giữa bản đồ

    // Gió: Lốc xoáy nhẹ ở giữa hút người chơi về phía trung tâm (và các tia laser)
    spawnHazard("vortex", boss.x, boss.y, 800, 150, 0, "boss");

    // Xoay trong 120 frame (2 giây) quét hình chữ thập
    for (let i = 0; i < 120; i++) {
      state.delayedTasks.push({
        delay: i,
        action: () => {
          let angle = i * 0.05; // Xoay vừa phải để tạo áp lực liên tục

          // 4 tia laser tạo thành hình chữ thập xoay tròn bao trọn màn hình
          spawnBeam(
            boss.x,
            boss.y,
            boss.x + Math.cos(angle) * 1000,
            boss.y + Math.sin(angle) * 1000,
            2,
            5,
          );
          spawnBeam(
            boss.x,
            boss.y,
            boss.x + Math.cos(angle + Math.PI / 2) * 1000,
            boss.y + Math.sin(angle + Math.PI / 2) * 1000,
            2,
            5,
          );
          spawnBeam(
            boss.x,
            boss.y,
            boss.x + Math.cos(angle + Math.PI) * 1000,
            boss.y + Math.sin(angle + Math.PI) * 1000,
            2,
            5,
          );
          spawnBeam(
            boss.x,
            boss.y,
            boss.x + Math.cos(angle + Math.PI * 1.5) * 1000,
            boss.y + Math.sin(angle + Math.PI * 1.5) * 1000,
            2,
            5,
          );

          // Băng: Mỗi nhịp thả vòng đạn băng (Style 2) xen kẽ để làm chậm người chơi
          if (i % 15 === 0) {
            ring(boss.x, boss.y, 8, -angle, 2, "boss", 1);
          }

          // Lửa: Lâu lâu bắn một đạn lửa nảy tường quấy rối
          if (i % 20 === 0) {
            state.bullets.push({
              x: boss.x,
              y: boss.y,
              vx: Math.cos(angle + Math.PI / 4) * 4,
              vy: Math.sin(angle + Math.PI / 4) * 4,
              isPlayer: false,
              radius: 10,
              life: 300,
              style: 1,
              damage: 1,
              bounces: 1,
            });
          }
        },
      });
    }
  },
  // Phase 5 (Ultimate): VÕ ĐÀI TẬN THẾ (DOOMSDAY ARENA)
  OMNI_DOOMSDAY_ARENA: (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 150;
    state.screenShake.intensity = 12;
    boss.x = 400;
    boss.y = 300;

    // 1. Tạo Võ Đài Bát Giác khép kín (Octagon Prison)
    let r = 280; // Bán kính võ đài (vừa in trên màn hình 800x600)
    for (let i = 0; i < 8; i++) {
      let angle1 = (i / 8) * Math.PI * 2;
      let angle2 = ((i + 1) / 8) * Math.PI * 2;
      spawnBeam(
        boss.x + Math.cos(angle1) * r,
        boss.y + Math.sin(angle1) * r,
        boss.x + Math.cos(angle2) * r,
        boss.y + Math.sin(angle2) * r,
        45,
        180,
      );
    }

    // 2. Mắt bão Lỗ Đen hút toàn bộ người chơi vào tâm
    spawnHazard("vortex", boss.x, boss.y, 800, 180, 0, "boss");

    // 3. Pháo Hoa Hủy Diệt: Đạn 4 màu xả ra theo nhịp bass (5 đợt nổ)
    for (let w = 0; w < 6; w++) {
      state.delayedTasks.push({
        delay: 45 + w * 25,
        action: () => {
          let offset = w % 2 === 0 ? 0 : Math.PI / 16;
          for (let i = 0; i < 16; i++) {
            let angle = offset + (i / 16) * Math.PI * 2;
            state.bullets.push({
              x: boss.x,
              y: boss.y,
              vx: Math.cos(angle) * 6,
              vy: Math.sin(angle) * 6,
              isPlayer: false,
              radius: 12,
              life: 150,
              style: (i % 4) + 1,
              damage: 1.5,
            });
          }
          // Chớp rung màn hình mỗi lần nổ đạn
          state.screenShake.timer = 6;
          state.screenShake.intensity = 10;
        },
      });
    }
  },
  // ==========================================
  // 🌌 VOID (CHÚA TỂ HƯ KHÔNG)
  // Theme: Hố đen, trọng lực, rạn nứt không gian
  // ==========================================
  ABYSSAL_RIFT: (boss) => {
    activateShield(boss, 150);
    // Xé rách 4 khe nứt không gian quanh người chơi
    for (let i = 0; i < 4; i++) {
      state.delayedTasks.push({
        delay: i * 20,
        action: () => {
          const px = state.player.x + (Math.random() - 0.5) * 400;
          const py = state.player.y + (Math.random() - 0.5) * 400;
          spawnWarning(px, py, 80, 45, "meteor"); // Cảnh báo nứt không gian

          state.delayedTasks.push({
            delay: 45,
            action: () => {
              // Khe nứt phát nổ thành 12 viên đạn Void (Style 10)
              ring(px, py, 12, 0, 10, "boss", 2);
              state.screenShake.timer = 5;
              state.screenShake.intensity = 8;
            },
          });
        },
      });
    }
  },
  EVENT_HORIZON: (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 200;
    state.screenShake.intensity = 6;

    // Tỏa ra một chân trời sự kiện (Vòng sáng tím khổng lồ)
    state.globalHazard = {
      type: "void_aura",
      active: true,
      timer: 600,
      damage: 1,
    };

    // Boss dồn năng lượng bắn đạn liên tục theo hình bông hoa
    for (let i = 0; i < 150; i++) {
      state.delayedTasks.push({
        delay: i * 4,
        action: () => {
          fireAngle(boss.x, boss.y, i * 0.13, 10, "boss", 1.5);
          fireAngle(boss.x, boss.y, -i * 0.13 + Math.PI, 10, "boss", 1.5);
        },
      });
    }
  },
  DARK_MATTER_BEAM: (boss) => {
    activateShield(boss, 150);
    // Quét tia laser bóng tối cực lớn (Quét ngang màn hình)
    let startAngle = aim(boss) - 0.5;
    for (let i = 0; i < 15; i++) {
      state.delayedTasks.push({
        delay: i * 4,
        action: () => {
          let a = startAngle + i * 0.08;
          spawnBeam(
            boss.x,
            boss.y,
            boss.x + Math.cos(a) * 2000,
            boss.y + Math.sin(a) * 2000,
            20,
            30,
          );
          state.screenShake.timer = 5;
          state.screenShake.intensity = 5;
        },
      });
    }
  },
  GRAVITY_CRUSH: (boss) => {
    activateShield(boss, 120);
    // Bóp nghẹt không gian tại vị trí người chơi
    let px = state.player.x;
    let py = state.player.y;
    spawnWarning(px, py, 150, 60, "meteor");
    state.delayedTasks.push({
      delay: 60,
      action: () => {
        spawnHazard("void_crush", px, py, 150, 120, 1.5, "boss");
        state.screenShake.timer = 15;
        state.screenShake.intensity = 15;
        // Bắn đạn nổ từ tâm vụ bóp nghẹt
        ring(px, py, 16, 0, 10, "boss", 1.5);
      },
    });
  },
  ECLIPSE_RING: (boss) => {
    activateShield(boss, 120);
    // Vòng xuyến hư không (Bắn đạn Void Style 10 liên tiếp)
    for (let i = 0; i < 5; i++) {
      state.delayedTasks.push({
        delay: i * 20,
        action: () => ring(boss.x, boss.y, 24, i * 0.1, 10, "boss", 1),
      });
    }
  },
  COSMIC_FRACTURE: (boss) => {
    activateShield(boss, 150);
    // Vạch những đường nứt trên mặt đất xung quanh người chơi
    for (let i = 0; i < 4; i++) {
      state.delayedTasks.push({
        delay: i * 15,
        action: () => {
          let lx = state.player.x + (Math.random() - 0.5) * 600;
          let ly = state.player.y + (Math.random() - 0.5) * 600;
          spawnWarning(lx, ly, 60, 45, "laser");
          state.delayedTasks.push({
            delay: 45,
            action: () => {
              spawnHazard("void_rift", lx, ly, 60, 180, 1, "boss");
              state.screenShake.timer = 8;
              state.screenShake.intensity = 8;
            },
          });
        },
      });
    }
  },
  STAR_DEVOURER: (boss) => {
    activateShield(boss, 180);
    // Bắn ra một cục Hố đen chậm di chuyển, tự đẻ ra đạn Void
    let angle = aim(boss);
    let devX = boss.x + Math.cos(angle) * 100;
    let devY = boss.y + Math.sin(angle) * 100;

    spawnHazard("void_devourer", devX, devY, 100, 300, 1, "boss");
  },
  EVENT_HORIZON: (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 600;
    state.screenShake.intensity = 8;

    // Đốt máu liên tục toàn map
    state.globalHazard = {
      type: "electric",
      active: true,
      timer: 600,
      damage: 1.5,
    };

    // SPAWN SAFE ZONE NÚP CHIÊU
    spawnSafeZone(
      state.camera.x + 200 + Math.random() * 1100,
      state.camera.y + 200 + Math.random() * 400,
      200,
      600,
      {
        shrinking: false,
        vx: 0.5,
        vy: 0.5,
      },
    );

    // Đạn mưa sao băng bóng tối
    for (let i = 0; i < 150; i++) {
      state.delayedTasks.push({
        delay: i * 4,
        action: () => {
          fireAngle(boss.x, boss.y, i * 0.13, 10, "boss", 1.5);
          fireAngle(boss.x, boss.y, -i * 0.13 + Math.PI, 10, "boss", 1.5);
        },
      });
    }
  },

  // ==========================================
  // 👾 GLITCH & THE ENTITY (THỰC THỂ MA TRẬN)
  // Theme: Mã độc, Lỗi hệ thống, Neon chói lóa
  // KHÔNG TELEPORT - Thay bằng vùng đạn khóa góc
  // ==========================================
  // ==========================================
  // 👾 GLITCH (ERROR_404) - 10 SPECIAL SKILLS (UNIQUE VISUALS)
  // ==========================================

  GLITCH_MEMORY_LEAK: (boss) => {
    activateShield(boss, 150);
    // Virus lây lan (Style 14) bắn liên tục theo vòng xoáy
    for (let i = 0; i < 15; i++) {
      state.delayedTasks.push({
        delay: i * 8,
        action: () => {
          let a = (i * Math.PI * 2) / 15 + state.frameCount * 0.01;
          fireAngle(boss.x, boss.y, a, 14, "boss", 2.5);

          // Thêm các tia lửa điện (Style 17) bay kèm
          if (i % 3 === 0) {
            fireAngle(boss.x, boss.y, aim(boss), 17, "boss", 5);
          }
        },
      });
    }
  },

  GLITCH_SYNTAX_ERROR: (boss) => {
    activateShield(boss, 150);
    // Xuất hiện các khối lỗi hiển thị (Error Box) rải rác
    for (let i = 0; i < 8; i++) {
      let px = state.player.x + (Math.random() - 0.5) * 600;
      let py = state.player.y + (Math.random() - 0.5) * 600;
      spawnWarning(px, py, 60, 45, "laser");
      state.delayedTasks.push({
        delay: 45,
        action: () => {
          spawnHazard("error_box", px, py, 60, 120, 2, "boss");
          state.screenShake.timer = 5;
          state.screenShake.intensity = 5;
        },
      });
    }
  },

  GLITCH_FIREWALL_BREACH: (boss) => {
    activateShield(boss, 180);
    // Dựng lên các bức tường Pixel (Pixel Wall) khổng lồ cản đường
    let px = state.player.x;
    let py = state.player.y;
    spawnWarning(px, py - 300, 300, 60, "laser");
    spawnWarning(px, py + 300, 300, 60, "laser");

    state.delayedTasks.push({
      delay: 60,
      action: () => {
        spawnHazard("pixel_wall", px, py - 300, 300, 200, 1.5, "boss");
        spawnHazard("pixel_wall", px, py + 300, 300, 200, 1.5, "boss");
        state.screenShake.timer = 10;
        state.screenShake.intensity = 8;
      },
    });
  },

  GLITCH_TROJAN_HORSE: (boss) => {
    activateShield(boss, 120);
    // Bắn ra các Shuriken ma trận (Style 15) xoáy về phía người chơi
    for (let i = 0; i < 12; i++) {
      state.delayedTasks.push({
        delay: i * 8,
        action: () => {
          let a = aim(boss) + Math.sin(i) * 0.5;
          fireAngle(boss.x, boss.y, a, 15, "boss", 1.5);
        },
      });
    }
  },

  GLITCH_BUFFER_OVERFLOW: (boss) => {
    activateShield(boss, 150);
    // Xả tia Neon Laser (Style 12) liên thanh, xoay vòng như chong chóng
    for (let i = 0; i < 50; i++) {
      state.delayedTasks.push({
        delay: i * 3,
        action: () => {
          fireAngle(boss.x, boss.y, i * 0.2, 12, "boss", 1.5);
        },
      });
    }
  },

  GLITCH_DEAD_PIXEL_STORM: (boss) => {
    activateShield(boss, 150);
    // Mưa Pixel lệch màu (Style 11) rớt xuống liên tục
    for (let i = 0; i < 60; i++) {
      state.delayedTasks.push({
        delay: i * 2,
        action: () => {
          let sx = state.camera.x + Math.random() * 1536;
          spawnBullet(
            sx,
            state.camera.y - 50,
            sx,
            state.camera.y + 800,
            false,
            11,
            "boss",
            1,
          );
        },
      });
    }
  },

  GLITCH_PACKET_LOSS: (boss) => {
    activateShield(boss, 150);
    // Xả 3 đợt đạn Packet Loss chớp tắt
    for (let wave = 0; wave < 3; wave++) {
      state.delayedTasks.push({
        delay: wave * 25,
        action: () => {
          let centerA = aim(boss);
          // Mỗi đợt bắn 7 viên hình quạt
          for (let i = -3; i <= 3; i++) {
            fireAngle(
              boss.x,
              boss.y,
              centerA + i * 0.2,
              13, // Đạn chớp tắt
              "boss",
              3 + wave, // Tốc độ tăng dần qua mỗi đợt
            );
          }
        },
      });
    }
  },

  GLITCH_DDOS_ATTACK: (boss) => {
    activateShield(boss, 200);
    // Dội bom Binary liên tục (Flood)
    for (let i = 0; i < 20; i++) {
      state.delayedTasks.push({
        delay: i * 8, // Rơi dày đặc hơn
        action: () => {
          // Khóa quanh người chơi nhưng có độ lệch ngẫu nhiên
          let px = state.player.x + (Math.random() - 0.5) * 500;
          let py = state.player.y + (Math.random() - 0.5) * 500;
          spawnHazard("binary_rain", px, py, 120, 180, 2, "boss");

          // Thêm âm thanh hoặc rung nhẹ cho mỗi lần dội
          if (i % 5 === 0) {
            state.screenShake.timer = 2;
            state.screenShake.intensity = 3;
          }
        },
      });
    }
  },

  GLITCH_FATAL_EXCEPTION: (boss) => {
    activateShield(boss, 120);
    // Bắn một vòng tròn 12 quả cầu dữ liệu siêu to (Style 16)
    for (let i = 0; i < 12; i++) {
      let angle = (i * Math.PI * 2) / 12;
      fireAngle(boss.x, boss.y, angle, 16, "boss", 2); // Quả cầu to

      // Thêm đạn bay xen kẽ tạo hiệu ứng "bụi dữ liệu"
      state.delayedTasks.push({
        delay: 30,
        action: () => {
          fireAngle(boss.x, boss.y, angle + 0.1, 11, "boss", 4);
        },
      });
    }
    state.screenShake.timer = 15;
    state.screenShake.intensity = 10;
  },
  GLITCH_CORRUPTED_SECTOR: (boss) => {
    activateShield(boss, 150);
    // Khóa người chơi vào lồng tia chớp nhiễu (Corrupt Laser)
    let px = state.player.x;
    let py = state.player.y;
    let s = 250;

    spawnHazard("corrupt_laser", px - s, py, s, 180, 2, "boss"); // Tường trái
    spawnHazard("corrupt_laser", px + s, py, s, 180, 2, "boss"); // Tường phải
    spawnHazard("corrupt_laser", px, py - s, s, 180, 2, "boss"); // Tường trên
    spawnHazard("corrupt_laser", px, py + s, s, 180, 2, "boss"); // Tường dưới

    // Ném thêm đạn chớp giật (Style 17) vào trong lồng
    for (let i = 0; i < 20; i++) {
      state.delayedTasks.push({
        delay: 60 + i * 5,
        action: () => {
          fireAngle(
            boss.x,
            boss.y,
            aim(boss) + (Math.random() - 0.5) * 0.5,
            17,
            "boss",
            1.5,
          );
        },
      });
    }
  },

  ENTITY_KERNEL_PANIC: (boss) => {
    // Ultimate Của The Entity: Đồ họa cực đỉnh, nổ tung data
    boss.ultimatePhase = true;
    state.glitch.matrixMode = true; // Bật nền code rơi
    state.screenShake.timer = 300;
    state.screenShake.intensity = 8;

    boss.x = 400;
    boss.y = 300; // Đứng giữa

    // Xả 8 tia Data Stream (Style 12) xoay như chong chóng
    for (let i = 0; i < 300; i++) {
      state.delayedTasks.push({
        delay: i,
        action: () => {
          if (i % 5 === 0) {
            for (let j = 0; j < 8; j++) {
              let angle = (j * Math.PI) / 4 + i * 0.02;
              // Bắn đạn Neon dài
              state.bullets.push({
                x: boss.x,
                y: boss.y,
                vx: Math.cos(angle) * 7,
                vy: Math.sin(angle) * 7,
                isPlayer: false,
                radius: 12,
                life: 200,
                style: 12, // Style Data Stream
                damage: 2,
              });
            }
          }
          // Chớp tắt màn hình ngẫu nhiên (Flash bạo loạn)
          if (Math.random() < 0.05) state.cinematicEffects.fogAlpha = 0.8;
          else state.cinematicEffects.fogAlpha = 0;
        },
      });
    }
  },
};
