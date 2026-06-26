import { state } from "../../../state.js";
import { spawnWarning } from "../../helpers.js";
import { fireAngle, ring, fan, aim, TAU } from "./patternHelpers.js";
import { getBossTarget } from "../boss_manager.js";

export const ATTACK_MODES_MAP = {
  // ===== FIRE (style 1) =====
  0: (b) => {
    const a = aim(b);
    for (let i = 0; i < 15; i++) {
      const va = a + (Math.random() - 0.5) * 0.6;
      const vs = 4 + Math.random() * 8;
      state.bullets.push({
        x: b.x, y: b.y,
        vx: Math.cos(va) * vs, vy: Math.sin(va) * vs,
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

  // ===== ICE (style 2) =====
  5: (b) => ring(b.x, b.y, 10, state.frameCount * 0.02, 2),
  6: (b) => fan(b.x, b.y, aim(b), 7, 0.1, 2),
  7: (b) => ring(b.x, b.y, 15, -state.frameCount * 0.05, 2),
  8: (b) => fan(b.x, b.y, aim(b), 5, 0.3, 2),

  // ===== THUNDER (style 3) =====
  10: (b) => ring(b.x, b.y, 12, 0, 3),
  11: (b) => fan(b.x, b.y, aim(b), 3, 0.5, 3),
  12: (b) => {
    for (let i = 0; i < 10; i++) fireAngle(b.x, b.y, Math.random() * TAU, 3);
  },
  13: (b) => ring(b.x, b.y, 20, state.frameCount * 0.1, 3),

  // ===== EARTH (style 0/default) =====
  15: (b) => ring(b.x, b.y, 8, 0, 0),
  16: (b) => fan(b.x, b.y, aim(b), 11, 0.1, 0),
  17: (b) => ring(b.x, b.y, 12, state.frameCount * 0.04, 0),
  18: (b) => fan(b.x, b.y, aim(b), 7, 0.2, 0),

  // ===== WIND (style 4) =====
  20: (b) => ring(b.x, b.y, 10, state.frameCount * 0.08, 4),
  21: (b) => fan(b.x, b.y, aim(b), 15, 0.05, 4),
  22: (b) => ring(b.x, b.y, 18, -state.frameCount * 0.05, 4),
  23: (b) => fan(b.x, b.y, aim(b), 9, 0.15, 4),

  // ===== COMBO / MIXED =====
  30: (b) => {
    // Lửa + Gió
    fan(b.x, b.y, aim(b), 5, 0.2, 1);
    ring(b.x, b.y, 10, state.frameCount * 0.05, 4);
  },
  31: (b) => {
    // Băng + Sấm
    ring(b.x, b.y, 12, 0, 2);
    fan(b.x, b.y, aim(b) + Math.PI, 6, 0.3, 3);
  },
  32: (b) => {
    // Hỗn mang (4 loại đạn)
    fireAngle(b.x, b.y, aim(b), 1);
    fireAngle(b.x, b.y, aim(b) + 0.2, 2);
    fireAngle(b.x, b.y, aim(b) - 0.2, 3);
    fireAngle(b.x, b.y, aim(b) + Math.PI, 4);
  },

  // ===== 33: Grid Laser (bàn cờ) =====
  33: (b) => {
    const gap = 80;
    const speed = 1.5;
    const cx = state.camera.x;
    const cy = state.camera.y;

    for (let y = gap; y < 864; y += gap) {
      state.bullets.push({ x: cx, y: cy + y, vx: speed, vy: 0, radius: 8, life: 600, isPlayer: false, style: 4, damage: 1 });
    }
    for (let x = gap; x < 1536; x += gap) {
      state.bullets.push({ x: cx + x, y: cy, vx: 0, vy: speed, radius: 8, life: 600, isPlayer: false, style: 4, damage: 1 });
    }
  },

  // ===== 34: Homing Mine =====
  34: (b) => {
    for (let i = 0; i < 3; i++) {
      const mx = state.camera.x + Math.random() * 1536;
      const my = state.camera.y + Math.random() * 864;
      state.hazards.push({ x: mx, y: my, radius: 15, life: 300, isMine: true });
      state.delayedTasks.push({
        delay: 120,
        action: () => {
          for (let j = 0; j < 8; j++) fireAngle(mx, my, (j / 8) * Math.PI * 2, 3);
        },
      });
    }
  },

  // ===== 35: Black Hole Pull =====
  35: (b) => {
    const target = getBossTarget(b);
    const dx = b.x - target.x;
    const dy = b.y - target.y;
    // Kéo local player nếu còn sống
    if (state.player && !state.player.isDead) {
      state.player.x += dx * 0.02;
      state.player.y += dy * 0.02;
    }
    ring(b.x, b.y, 10, state.frameCount * 0.05, 4);
  },

  // ===== 36: Void Rifts (bắn từ viền) =====
  36: (b) => {
    const target = getBossTarget(b);
    for (let i = 0; i < 6; i++) {
      let side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = state.camera.x; y = state.camera.y + Math.random() * 864; }
      if (side === 1) { x = state.camera.x + 1536; y = state.camera.y + Math.random() * 864; }
      if (side === 2) { x = state.camera.x + Math.random() * 1536; y = state.camera.y; }
      if (side === 3) { x = state.camera.x + Math.random() * 1536; y = state.camera.y + 864; }
      fireAngle(x, y, Math.atan2(target.y - y, target.x - x), 4);
    }
  },

  // ===== GLITCH MODES =====

  // 37: Ping-Pong Teleport Bullet
  37: (b) => {
    for (let i = 0; i < 3; i++) {
      let angle = Math.random() * Math.PI * 2;
      let bullet = { x: b.x, y: b.y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, radius: 12, life: 180, isPlayer: false, style: 4, glitchTimer: 30 };
      state.bullets.push(bullet);
      state.delayedTasks.push({
        delay: 30,
        action: () => {
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
    spawnWarning(b.x + Math.cos(a) * 200, b.y + Math.sin(a) * 200, 120, 60, "laser");
    state.delayedTasks.push({
      delay: 60,
      action: () => {
        for (let i = 0; i < 12; i++) {
          fireAngle(b.x, b.y, a + Math.PI + (i / 12) * Math.PI, 4);
        }
      },
    });
  },

  // 39: Screen Edge Glitch
  39: (b) => {
    const target = getBossTarget(b);
    for (let i = 0; i < 8; i++) {
      let side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = state.camera.x; y = state.camera.y + Math.random() * 864; }
      if (side === 1) { x = state.camera.x + 1536; y = state.camera.y + Math.random() * 864; }
      if (side === 2) { x = state.camera.x + Math.random() * 1536; y = state.camera.y; }
      if (side === 3) { x = state.camera.x + Math.random() * 1536; y = state.camera.y + 864; }
      let speed = 2 + Math.random() * 6;
      state.bullets.push({ x, y, vx: ((target.x - x) / 100) * speed, vy: ((target.y - y) / 100) * speed, radius: 8, life: 200, isPlayer: false, style: 4 });
    }
  },

  // 40: Binary Bounce
  40: (b) => {
    for (let i = 0; i < 8; i++) {
      let angle = aim(b) + (i - 4) * 0.2;
      state.bullets.push({ x: b.x, y: b.y, vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6, radius: 10, life: 200, isPlayer: false, style: i % 2 === 0 ? 1 : 2, bounces: 1 });
    }
  },

  // 41: Teleport Burst
  41: (b) => {
    const target = getBossTarget(b);
    b.x = Math.max(100, Math.min(state.world.width - 100, target.x + (Math.random() - 0.5) * 800));
    b.y = Math.max(100, Math.min(state.world.height - 100, target.y + (Math.random() - 0.5) * 600));
    ring(b.x, b.y, 20, 0, 4);
  },

  // 42: Rain from top
  42: () => {
    for (let i = 0; i < 20; i++) {
      let x = state.camera.x + Math.random() * 1536;
      state.bullets.push({ x, y: state.camera.y, vx: 0, vy: 8, radius: 6, life: 100, isPlayer: false, style: 4 });
    }
  },

  // 43: Random Freeze + Push (chỉ ảnh hưởng local player nếu còn sống)
  43: () => {
    state.cinematicEffects.freezeTimer = 20;
    if (state.player && !state.player.isDead) {
      state.player.x += (Math.random() - 0.5) * 200;
      state.player.y += (Math.random() - 0.5) * 200;
    }
  },

  // ===== THE ENTITY PHASE =====
  60: (b) => ring(b.x, b.y, 24, state.frameCount * 0.08, 1),
  61: (b) => fan(b.x, b.y, aim(b), 9, 0.15, 3),

  // ===== VOID ADVANCED (style 10) =====
  70: (b) => {
    const a = aim(b);
    fan(b.x, b.y, a, 5, 0.4, 10, "boss", 1.5);
    ring(b.x, b.y, 8, state.frameCount * 0.05, 10, "boss", 1.5);
  },
  // Bão tinh vân: Đạn xoắn ốc kép
  71: (b) => {
    for (let i = 0; i < 4; i++) {
      fireAngle(b.x, b.y, state.frameCount * 0.1 + (i * Math.PI) / 2, 10, "boss", 2);
      fireAngle(b.x, b.y, -state.frameCount * 0.1 + (i * Math.PI) / 2, 10, "boss", 2);
    }
  },

  // ===== GLITCH ADVANCED (style 11, 12) =====
  // 80: Mã độc lan truyền (virus)
  80: (b) => {
    const a = aim(b);
    for (let i = 0; i < 8; i++) {
      state.delayedTasks.push({
        delay: i * 5,
        action: () => {
          fireAngle(b.x + (Math.random() - 0.5) * 50, b.y + (Math.random() - 0.5) * 50, a + (Math.random() - 0.5) * 0.3, 11, "boss", 1.5);
        },
      });
    }
  },
  // 81: Data Stream liên thanh
  81: (b) => {
    const a = aim(b);
    fan(b.x, b.y, a, 15, 0.1, 12, "boss", 2);
  },
};
