import { state } from "./state.js";
import { FPS } from "./config.js";
import { dist } from "./utils.js";

// =======================
// UTILITIES & HELPER FUNCTIONS
// =======================
const TAU = Math.PI * 2;

export function activateShield(boss, amount) {
}

export function spawnMeteor(tx, ty, destX, destY) {
  state.bullets.push({
    x: tx,
    y: ty,
    destX: destX,
    destY: destY,
    vx: 0, // Rơi thẳng đứng
    vy: 25, // Tốc độ rơi cực nhanh
    radius: 35,
    isMeteor: true,
    life: 120,
    isPlayer: false,
    style: 1
  });
}

function fireAngle(sx, sy, angle, style = 0, source = "boss", damage = 1) {
  spawnBullet(sx, sy, sx + Math.cos(angle), sy + Math.sin(angle), false, style, source, damage);
}

export function spawnHazard(type, x, y, radius = 40, duration = 300, damage = 0.5, owner = "boss", targetRadius = 0) {
  state.hazards.push({
    x, y, radius, type,
    life: duration,
    maxLife: duration,
    damage,
    owner,
    targetRadius: targetRadius || radius,
    expanding: targetRadius > radius,
    firstEnterTime: 0,
    active: type !== "rock"
  });
}

function spawnSafeZone(x, y, radius, duration, options = {}) {
  state.safeZones.push({
    x, y, radius,
    timer: duration,
    maxTimer: duration,
    vx: options.vx || 0,
    vy: options.vy || 0,
    shrinking: options.shrinking || false
  });
}

function spawnBeam(x1, y1, x2, y2, chargeTime, fireTime) {
  const beam = { x1, y1, x2, y2, state: "charge", timer: chargeTime + fireTime, chargeTime, fireTime };
  state.bossBeams.push(beam);

  state.delayedTasks.push({
    delay: chargeTime,
    action: () => { beam.state = "fire"; }
  });

  state.delayedTasks.push({
    delay: chargeTime + fireTime,
    action: () => {
      const idx = state.bossBeams.indexOf(beam);
      if (idx > -1) state.bossBeams.splice(idx, 1);
    }
  });
}

function ring(sx, sy, count, offset = 0, style = 0, source = "boss", damage = 1) {
  for (let i = 0; i < count; i++) {
    fireAngle(sx, sy, offset + (i * TAU) / count, style, source, damage);
  }
}

function fan(sx, sy, baseAngle, count, spread, style = 0, source = "boss", damage = 1) {
  const start = baseAngle - (spread * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    fireAngle(sx, sy, start + i * spread, style, source, damage);
  }
}

function aim(boss, extraAngle = 0) {
  return Math.atan2(state.player.y - boss.y, state.player.x - boss.x) + extraAngle;
}

function spawnWarning(x, y, radius, duration, type = "laser") {
  state.groundWarnings.push({ x, y, radius, timer: duration, maxTimer: duration, type });
}

// =======================
// BOSS SKILL DEFINITIONS
// =======================

export const SPECIAL_SKILLS = {
  // --- FIRE ---
  "Meteor Strike": (boss) => {
    activateShield(boss, 150);
    const count = 7;
    for (let i = 0; i < count; i++) {
      state.delayedTasks.push({
        delay: i * 15,
        action: () => {
          const tx = state.player.x + (Math.random() - 0.5) * 150;
          const ty = state.player.y + (Math.random() - 0.5) * 150;
          // THAY ĐỔI: Dùng cảnh báo "meteor" (bóng đen)
          spawnWarning(tx, ty, 70, 90, "laser");
          state.delayedTasks.push({
            delay: 90,
            action: () => spawnMeteor(tx, -100, tx, ty)
          });
        }
      });
    }
  },
  "Inferno Pulse": (boss) => {
    activateShield(boss, 120);
    for (let i = 0; i < 8; i++) {
      state.delayedTasks.push({
        delay: i * 15,
        action: () => {
          const px = (i % 2 === 0) ? state.player.x + (Math.random() - 0.5) * 200 : boss.x + (Math.random() - 0.5) * 300;
          const py = (i % 2 === 0) ? state.player.y + (Math.random() - 0.5) * 200 : boss.y + (Math.random() - 0.5) * 300;
          // THAY ĐỔI: Dùng cảnh báo "geyser" (sủi bọt)
          spawnWarning(px, py, 65, 60, "geyser");
          state.delayedTasks.push({
            delay: 60,
            action: () => {
              spawnHazard("fire", px, py, 10, 240, 0.5, "boss", 75);
              state.screenShake.timer = 8;
              state.screenShake.intensity = 6;
              state.screenShake.type = 'earth';
            }
          });
        }
      });
    }
  },
  "SUPERNOVA": (boss) => {
    state.screenShake.timer = 200;
    state.screenShake.intensity = 10;
    state.screenShake.type = 'wind';
    boss.ultimatePhase = true;
    state.globalHazard = { type: "fire", active: true, timer: 600, damage: 1.0 };

    // ĐÃ NERF: Vùng an toàn to hơn (250), đi chậm hơn và KHÔNG bị thu nhỏ nữa
    spawnSafeZone(200, 200, 250, 600, { vx: 1.5, vy: 1, shrinking: false });
    spawnSafeZone(600, 400, 250, 600, { vx: -1.5, vy: -1, shrinking: false });
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
          state.screenShake.type = 'earth';
        }
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
              state.screenShake.type = 'earth';

              // Sát thương trồi lên nếu player không né
              if (dist(state.player.x, state.player.y, px, py) < 45 + state.player.radius) {
                state.player.hp -= 1;
              }
            }
          });
        }
      });
    }
  },
  "EARTHQUAKE": (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 600;
    state.screenShake.intensity = 5;
    state.screenShake.type = 'earth';
    state.globalHazard = { type: "earth", active: true, timer: 600, damage: 1.2 };
    spawnSafeZone(400, 300, 250, 600, { shrinking: false });
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
          const rx = Math.random() * 800;
          // SỬA LỖI: Đổi y từ -20 thành 15 để đạn không bị dội ngược ra ngoài bản đồ
          fireAngle(rx, 15, Math.PI / 2, 2);
        }
      });
    }
  },
  "GLACIAL AGE": (boss) => {
    boss.ultimatePhase = true;
    state.globalHazard = { type: "ice", active: true, timer: 600, damage: 0.8 };
    spawnSafeZone(boss.x, boss.y, 300, 600, { vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5 });

    // NÂNG CẤP: Liên tục triệu hồi các bãi băng ngẫu nhiên trên mặt đất trong suốt 10 giây
    for (let i = 0; i < 20; i++) {
      state.delayedTasks.push({
        delay: i * 30, // Cứ 0.5s xuất hiện 1 bãi băng
        action: () => spawnHazard("frost", Math.random() * 800, Math.random() * 600, 60 + Math.random() * 40, 180)
      });
    }
  },

  // --- WIND ---
  "Cyclone Barrage": (boss) => {
    activateShield(boss, 80);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      spawnHazard("vortex", boss.x + Math.cos(a) * 200, boss.y + Math.sin(a) * 200, 80, 480);
    }
  },
  "Vacuum Wave": (boss) => {
    activateShield(boss, 100);
    // Sinh ra Lốc Xoáy siêu to khổng lồ ngay tại Boss hút người chơi lại gần
    spawnHazard("vortex", boss.x, boss.y, 400, 300);

    for (let i = 0; i < 5; i++) {
      state.delayedTasks.push({
        delay: i * 20,
        action: () => fan(boss.x, boss.y, aim(boss), 7, 0.2, 4) // Bắn đạn Gió (Style 4)
      });
    }
  },
  "HURRICANE": (boss) => {
    boss.ultimatePhase = true;
    state.globalHazard = { type: "wind", active: true, timer: 600, damage: 0.5 };
    state.screenShake.timer = 600;
    state.screenShake.intensity = 5; // Rung màn hình mạnh hơn do bão
    state.screenShake.type = 'wind';
    spawnSafeZone(400, 300, 250, 600, { vx: 1.2, vy: 0 });
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
        }
      });
    }

    // 2. Bắn một tia laser hủy diệt thẳng vào giữa lồng điện để ép góc
    state.delayedTasks.push({
      delay: 75, // Trễ hơn mìn điện một chút
      action: () => {
        spawnBeam(boss.x, boss.y, px, py, 45, 40);
        state.screenShake.timer = 15;
        state.screenShake.intensity = 8;
        state.screenShake.type = 'thunder';
      }
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
              state.screenShake.type = 'thunder';
            }
          });
        }
      });
    }
  },
  "HEAVEN'S WRATH": (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 600;
    state.screenShake.intensity = 8; // Giảm từ 20 xuống 8 để bớt rung
    state.screenShake.type = 'thunder';
    state.globalHazard = { type: "electric", active: true, timer: 600, damage: 1.5 };
    spawnSafeZone(Math.random() * 800, Math.random() * 600, 250, 600, { vx: 1, vy: 1 });
  },

  "ABSOLUTE DOMINATION": (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 60; // Giảm xuống 1s để đỡ giật lag khung hình
    state.screenShake.intensity = 10;
    state.screenShake.type = 'thunder';
    state.globalHazard = { type: "electric", active: true, timer: 9999, damage: 1.0 };

    // THÊM ĐIỀU KIỆN: Chỉ gọi phân thân nếu trên sân đang có ít hơn 2 con
    let subBossCount = state.ghosts.filter(g => g.isSubBoss).length;
    if (subBossCount < 2) {
      const cloneHp = boss.maxHp * 0.15; // Giảm nhẹ HP đệ xuống 15% cho dễ thở
      for (let i = 0; i < 2 - subBossCount; i++) {
        state.ghosts.push({
          isSubBoss: true,
          x: Math.random() > 0.5 ? 150 : 650,
          y: 150,
          radius: 35,
          hp: cloneHp,
          maxHp: cloneHp,
          color: i === 0 ? "#ff4400" : "#00ffff",
          timer: 0,
          isStunned: 0,
          speedRate: 1.5,
          record: [],
          historyPath: []
        });
      }
    }

    for (let i = 0; i < 8; i++) {
      state.delayedTasks.push({
        delay: i * 25,
        action: () => {
          let angle = aim(boss) + (i * 0.4 - 1.4); // Quét quét như rẻ quạt
          let tx = boss.x + Math.cos(angle) * 1000;
          let ty = boss.y + Math.sin(angle) * 1000;
          spawnBeam(boss.x, boss.y, tx, ty, 20, 15);
        }
      });
    }
  },
  // --- OMNI EXCLUSIVE SKILLS (SIÊU CẤP ĐIỆN ẢNH - WOW FACTOR) ---

  // Phase 1: Hộp Giam Tử Hình (Spatial Matrix) -> Nâng cấp thành Ngục Tù Tứ Tượng
  "Omni_SpatialMatrix": (boss) => {
    activateShield(boss, 150); // Tăng khiên vì chiêu này giờ rất rát
    let px = state.player.x;
    let py = state.player.y;
    let s = 130; // Nới rộng hộp giam ra một chút để người chơi có hy vọng lách

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
        state.screenShake.type = 'earth';

        // 4. HỖN MANG: Bắn đạn tứ sắc khổng lồ văng ra 12 hướng
        for (let j = 0; j < 12; j++) {
          let angle = (j / 12) * Math.PI * 2;
          state.bullets.push({
            x: px, y: py,
            vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
            isPlayer: false, radius: 12, life: 150, style: (j % 4) + 1, damage: 1.5
          });
        }
      }
    });
  },

  // Phase 2: Lưu Tinh Đa Sắc (Prismatic Meteors)
  // Cơ chế: Gọi 3 Thiên thạch nhắm thẳng vào đầu bạn. NHƯNG khi thiên thạch chạm đất, 
  // thay vì chỉ nổ lửa, nó sẽ VỠ VỤN ra thành 8 viên đạn đủ 4 màu bay tứ tung!
  // Phase 2: Lưu Tinh Đa Sắc (Prismatic Meteors) - Bản Dàn Nhạc Nguyên Tố
  "Omni_PrismaticMeteors": (boss) => {
    activateShield(boss, 150);

    // Gió: Tạo lốc xoáy khổng lồ giữa bản đồ hút nhẹ người chơi, cản trở việc chạy trốn
    spawnHazard("vortex", 400, 300, 800, 150, 0, "boss");

    for (let i = 0; i < 4; i++) { // Tăng lên 4 quả thiên thạch
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
                state.screenShake.type = 'thunder';
              }
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
                  state.screenShake.type = 'earth';

                  for (let j = 0; j < 8; j++) {
                    let angle = (j / 8) * Math.PI * 2;
                    state.bullets.push({
                      x: tx, y: ty, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                      isPlayer: false, radius: 10, life: 150, style: (j % 4) + 1, damage: 1
                    });
                  }
                }
              });
            }
          });
        }
      });
    }
  },

  // Phase 3: Sát Thủ Ảo Ảnh (Mirage Assault) - Tái Bản Đa Nguyên Tố
  "Omni_MirageAssault": (boss) => {
    activateShield(boss, 180); // Tăng chút khiên vì chiêu biểu diễn dài hơn

    // 4 nguyên tố đại diện: Lửa (1), Băng (2), Gió (4), Sấm (3)
    const elements = [
      { style: 1, hazard: "fire", color: "#ff4400" },
      { style: 2, hazard: "frost", color: "#00ffff" },
      { style: 4, hazard: "vortex", color: "#00ffcc" },
      { style: 3, hazard: "static", color: "#ffff00" }
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
            fan(boss.x, boss.y, Math.atan2(py - boss.y, px - boss.x), 7, 0.2, elements[i].style, "boss", 1.5);
          } else {
            ring(boss.x, boss.y, 16, 0, elements[i].style, "boss", 1.5);
          }

          // 3. Để lại bẫy nguyên tố tại chỗ vừa đứng
          spawnHazard(elements[i].hazard, boss.x, boss.y, 60, 180, 1, "boss");

          // Chớp rung nhẹ mỗi cú chém
          state.screenShake.timer = 4;
          state.screenShake.intensity = 5;
        }
      });
    }

    // Đòn chốt hạ: Kích Nổ Tứ Tượng
    state.delayedTasks.push({
      delay: 115,
      action: () => {
        boss.x = 400; boss.y = 300;
        boss.color = boss.originalColor; // Trả lại màu trắng tối thượng

        // Nổ 4 vòng đạn 4 màu xen kẽ nhau cực đẹp
        for (let j = 0; j < 4; j++) {
          ring(boss.x, boss.y, 12, j * (Math.PI / 24), elements[j].style, "boss", 2);
        }

        // Khóa mục tiêu giật sét khổng lồ chốt hạ
        spawnHazard("static", state.player.x, state.player.y, 150, 45, 1.5, "boss");

        state.screenShake.timer = 20;
        state.screenShake.intensity = 15;
        state.screenShake.type = 'thunder';
      }
    });
  },

  // Phase 4: Chong Chóng Tử Thần (Eternal Carousel) - Bản Đồ Sát
  "Omni_EternalCarousel": (boss) => {
    activateShield(boss, 180); // Tăng khiên vì thời gian cast kéo dài
    boss.x = 400; boss.y = 300; // Căn giữa bản đồ

    // Gió: Lốc xoáy nhẹ ở giữa hút người chơi về phía trung tâm (và các tia laser)
    spawnHazard("vortex", boss.x, boss.y, 800, 150, 0, "boss");

    // Xoay trong 120 frame (2 giây) quét hình chữ thập
    for (let i = 0; i < 120; i++) {
      state.delayedTasks.push({
        delay: i,
        action: () => {
          let angle = i * 0.05; // Xoay vừa phải để tạo áp lực liên tục

          // 4 tia laser tạo thành hình chữ thập xoay tròn bao trọn màn hình
          spawnBeam(boss.x, boss.y, boss.x + Math.cos(angle) * 1000, boss.y + Math.sin(angle) * 1000, 2, 5);
          spawnBeam(boss.x, boss.y, boss.x + Math.cos(angle + Math.PI / 2) * 1000, boss.y + Math.sin(angle + Math.PI / 2) * 1000, 2, 5);
          spawnBeam(boss.x, boss.y, boss.x + Math.cos(angle + Math.PI) * 1000, boss.y + Math.sin(angle + Math.PI) * 1000, 2, 5);
          spawnBeam(boss.x, boss.y, boss.x + Math.cos(angle + Math.PI * 1.5) * 1000, boss.y + Math.sin(angle + Math.PI * 1.5) * 1000, 2, 5);

          // Băng: Mỗi nhịp thả vòng đạn băng (Style 2) xen kẽ để làm chậm người chơi
          if (i % 15 === 0) {
            ring(boss.x, boss.y, 8, -angle, 2, "boss", 1);
          }

          // Lửa: Lâu lâu bắn một đạn lửa nảy tường quấy rối
          if (i % 20 === 0) {
            state.bullets.push({
              x: boss.x, y: boss.y,
              vx: Math.cos(angle + Math.PI / 4) * 4, vy: Math.sin(angle + Math.PI / 4) * 4,
              isPlayer: false, radius: 10, life: 300, style: 1, damage: 1, bounces: 1
            });
          }
        }
      });
    }
  },

  // Phase 5 (Ultimate): VÕ ĐÀI TẬN THẾ (DOOMSDAY ARENA)
  // Cơ chế "WOW" tối thượng: Boss dùng 8 tia Laser Khổng Lồ vẽ ra một VÕ ĐÀI HÌNH BÁT GIÁC nhốt bạn vào giữa bản đồ.
  // Ở tâm võ đài, một lỗ đen xuất hiện liên tục hút bạn lại gần trong khi Boss xả đạn pháo hoa ngập màn hình!
  "OMNI_DOOMSDAY_ARENA": (boss) => {
    boss.ultimatePhase = true;
    state.screenShake.timer = 150;
    state.screenShake.intensity = 12;
    boss.x = 400; boss.y = 300;

    // 1. Tạo Võ Đài Bát Giác khép kín (Octagon Prison)
    let r = 280; // Bán kính võ đài (vừa in trên màn hình 800x600)
    for (let i = 0; i < 8; i++) {
      let angle1 = (i / 8) * Math.PI * 2;
      let angle2 = ((i + 1) / 8) * Math.PI * 2;
      spawnBeam(boss.x + Math.cos(angle1) * r, boss.y + Math.sin(angle1) * r,
        boss.x + Math.cos(angle2) * r, boss.y + Math.sin(angle2) * r, 45, 180);
    }

    // 2. Mắt bão Lỗ Đen hút toàn bộ người chơi vào tâm
    spawnHazard("vortex", boss.x, boss.y, 800, 180, 0, "boss");

    // 3. Pháo Hoa Hủy Diệt: Đạn 4 màu xả ra theo nhịp bass (5 đợt nổ)
    for (let w = 0; w < 6; w++) {
      state.delayedTasks.push({
        delay: 45 + w * 25,
        action: () => {
          let offset = (w % 2 === 0) ? 0 : Math.PI / 16;
          for (let i = 0; i < 16; i++) {
            let angle = offset + (i / 16) * Math.PI * 2;
            state.bullets.push({
              x: boss.x, y: boss.y,
              vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
              isPlayer: false, radius: 12, life: 150, style: (i % 4) + 1, damage: 1.5
            });
          }
          // Chớp rung màn hình mỗi lần nổ đạn
          state.screenShake.timer = 6;
          state.screenShake.intensity = 10;
        }
      });
    }
  },
};

export const BOSS_TYPES = {
  "fire": {
    name: "Hỏa Vương",
    hp: 600, maxHp: 600, speed: 2, color: "#ff4400", originalColor: "#ff4400", elementColor: "#ffaa00", icon: "🔥",
    phases: [
      { attackModes: [0, 1, 2], special: "Inferno Pulse", speedMult: 1.0 },
      { attackModes: [3, 4], special: "Meteor Strike", speedMult: 1.3 },
      // THÊM MỚI: Trộn các chiêu mạnh nhất lại
      { attackModes: [0, 2, 4], ultimate: "SUPERNOVA", speedMult: 1.6 }
    ]
  },
  "earth": {
    name: "Địa Chấn Vương",
    hp: 800, maxHp: 800, speed: 1.2, color: "#8b4513", originalColor: "#8b4513", elementColor: "#d2b48c", icon: "⛰️",
    phases: [
      { attackModes: [15, 16], special: "Seismic Rift", speedMult: 1.0 },
      { attackModes: [17, 18], special: "Earth Spikes", speedMult: 1.3 },
      // THÊM MỚI:
      { attackModes: [16, 18], ultimate: "EARTHQUAKE", speedMult: 1.5 }
    ]
  },
  "ice": {
    name: "Băng Hậu",
    hp: 500, maxHp: 500, speed: 1.8, color: "#00ffff", originalColor: "#00ffff", elementColor: "#aaffff", icon: "❄️",
    phases: [
      { attackModes: [5, 6], special: "Frost Nova", speedMult: 1.0 },
      { attackModes: [7, 8], special: "Icicle Rain", speedMult: 1.4 },
      // THÊM MỚI:
      { attackModes: [6, 8], ultimate: "GLACIAL AGE", speedMult: 1.6 }
    ]
  },
  "wind": {
    name: "Phong Thần",
    hp: 450, maxHp: 450, speed: 3.2, color: "#00ffcc", originalColor: "#00ffcc", elementColor: "#ccfff5", icon: "🌪️",
    phases: [
      { attackModes: [20, 21], special: "Cyclone Barrage", speedMult: 1.0 },
      { attackModes: [22, 23], special: "Vacuum Wave", speedMult: 1.5 },
      // THÊM MỚI:
      { attackModes: [21, 23], ultimate: "HURRICANE", speedMult: 2.0 }
    ]
  },
  "thunder": {
    name: "Lôi Thần",
    hp: 550, maxHp: 550, speed: 2.8, color: "#ffff00", originalColor: "#ffff00", elementColor: "#ffffaa", icon: "⚡",
    phases: [
      { attackModes: [10, 11], special: "Tesla Field", speedMult: 1.0 },
      { attackModes: [12, 13], special: "Chain Lightning", speedMult: 1.5 },
      // THÊM MỚI:
      { attackModes: [11, 13], ultimate: "HEAVEN'S WRATH", speedMult: 1.8 }
    ]
  },
  "omni": {
    name: "Chúa Tể Nguyên Tố",
    hp: 800, maxHp: 800, speed: 2.5, color: "#ffffff", originalColor: "#ffffff", elementColor: "#ff00ff", icon: "👑",
    phaseCount: 5,
    phases: [
      { attackModes: [1, 21], special: ["Omni_SpatialMatrix"], speedMult: 1.0 },
      { attackModes: [6, 16], special: ["Omni_SpatialMatrix", "Omni_PrismaticMeteors"], speedMult: 1.2 },
      { attackModes: [11, 20], special: ["Omni_SpatialMatrix", "Omni_PrismaticMeteors", "Omni_MirageAssault"], speedMult: 1.4 },
      { attackModes: [8, 13, 23], special: ["Omni_SpatialMatrix", "Omni_PrismaticMeteors", "Omni_MirageAssault", "Omni_EternalCarousel"], speedMult: 1.6 },
      {
        attackModes: [30, 31, 32],
        special: ["Omni_SpatialMatrix", "Omni_PrismaticMeteors", "Omni_MirageAssault", "Omni_EternalCarousel", "OMNI_DOOMSDAY_ARENA"],
        ultimate: "OMNI_DOOMSDAY_ARENA",
        speedMult: 2.0
      }
    ]
  }
};

// =======================
// CORE ENTITY LOGIC
// =======================

export function getInitialPlayerState() {
  return {
    x: 400, y: 300, radius: 12, speed: 4.5, color: "#00ffcc", hp: 10, maxHp: 10, coins: 0,
    dashTimeLeft: 0, dashCooldownTimer: 0, dashMaxCooldown: 90, dashDx: 0, dashDy: 0,
    isInvincible: false, experience: 0, experienceToLevel: 100, multiShot: 1, bounces: 0,
    fireRate: 8, cooldown: 0 // RESTORED
  };
}

export function spawnBullet(sx, sy, tx, ty, isPlayer, style = 0, source = "enemy", damage = 1) {
  const angle = Math.atan2(ty - sy, tx - sx);
  const speed = isPlayer ? 10 : 4.5;
  state.bullets.push({
    x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    isPlayer, radius: isPlayer ? 4 : 8, life: 240, style, damage,
    // SỬA LỖI Ở ĐÂY: Truyền chỉ số nảy và xuyên từ người chơi vào viên đạn
    bounces: isPlayer ? (state.player.bounces || 0) : 0,
    pierce: isPlayer ? (state.player.pierce || false) : false
  });
}

export function createBoss(type) {
  const cfg = BOSS_TYPES[type];
  if (!cfg) return null;
  return {
    ...cfg,
    x: 400, y: 150, radius: 45, attackTimer: 0, moveTimer: 0, moveTargetX: 400, moveTargetY: 150,
    shield: 0, maxShield: 0, shieldActive: false, stunTimer: 0, ultimatePhase: false,
    bossType: type,
    phaseCount: cfg.phaseCount || 3,
    skillCooldown: 180,

    summonCooldown: 10 * 60, // (Tương đương 10 * FPS)
    ghostsActive: false
  };
}

export function updateBoss(boss) {
  if (boss.stunTimer > 0) return;

  boss.attackTimer++;
  boss.moveTimer++;

  // Movement
  if (boss.moveTimer % 120 === 0) {
    boss.moveTargetX = 100 + Math.random() * 600;
    boss.moveTargetY = 100 + Math.random() * 200;
  }
  const phaseIdx = getBossPhase(boss);
  const speed = boss.speed * (boss.phases[phaseIdx]?.speedMult || 1.0);
  boss.x += (boss.moveTargetX - boss.x) * 0.02 * speed;
  boss.y += (boss.moveTargetY - boss.y) * 0.02 * speed;

  // ==========================================
  // LOGIC 1: XỬ LÝ KHI ĐANG GỒNG CHIÊU
  // ==========================================
  if (state.bossSpecial.timer > 0) {
    state.bossSpecial.timer--;

    if (state.bossSpecial.timer === 0) {
      boss.shieldActive = false;
      if (SPECIAL_SKILLS[state.bossSpecial.name]) SPECIAL_SKILLS[state.bossSpecial.name](boss);
      state.bossSpecial.name = "";

      // SỬA LỖI LAG: Ép Boss phải nghỉ 6-8 giây (400-500 frame) sau khi tung chiêu 
      // để đợi hiệu ứng Cinematic trên màn hình chạy xong hoàn toàn
      boss.skillCooldown = 400 + Math.random() * 100;
    }
    return; // Đứng yên khi đang gồng
  }

  if (boss.skillCooldown > 0) {
    boss.skillCooldown--;
  }

  // ==========================================
  // LOGIC 2: BẮT ĐẦU GỒNG CHIÊU MỚI
  // ==========================================
  if (boss.skillCooldown <= 0) {
    const phase = boss.phases[phaseIdx];
    let nextSkill = "";

    if (phase.ultimate && Math.random() < 0.4) {
      nextSkill = Array.isArray(phase.ultimate) ? phase.ultimate[Math.floor(Math.random() * phase.ultimate.length)] : phase.ultimate;
    } else if (phase.special) {
      nextSkill = Array.isArray(phase.special) ? phase.special[Math.floor(Math.random() * phase.special.length)] : phase.special;
    }

    if (nextSkill) {
      const isUlt = (phase.ultimate === nextSkill) || (Array.isArray(phase.ultimate) && phase.ultimate.includes(nextSkill));
      state.bossSpecial = {
        name: nextSkill,
        timer: isUlt ? 120 : 90,
        duration: isUlt ? 120 : 90,
        type: isUlt ? "ULTIMATE" : "SPECIAL",
        color: boss.color
      };

      boss.shield = isUlt ? 150 : 100;
      boss.maxShield = boss.shield;
      boss.shieldActive = true;
      return;
    }
  }

  // ==========================================
  // SỬA LỖI SPIRAL LAG: Chỉ cho phép xả đạn thường khi hàng đợi hiệu ứng trống!
  // ==========================================
  if (boss.attackTimer % 60 === 0 && state.delayedTasks.length < 5) {
    const modes = boss.phases[phaseIdx].attackModes || [0];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    if (ATTACK_MODES[mode]) ATTACK_MODES[mode](boss);
  }
}

function getBossPhase(boss) {
  if (!boss || !boss.maxHp) return 0;
  const r = (boss.hp || 0) / boss.maxHp;

  if (boss.phaseCount === 5) {
    if (r > 0.8) return 0;
    if (r > 0.6) return 1;
    if (r > 0.4) return 2;
    if (r > 0.2) return 3;
    return 4; // Giai đoạn cuối
  }

  if (boss.phaseCount === 3) {
    if (r > 0.6) return 0;
    if (r > 0.3) return 1;
    return 2;
  }
  return r > 0.5 ? 0 : 1;
}

export const ATTACK_MODES = {
  0: (b) => {
    const a = aim(b);
    for (let i = 0; i < 15; i++) {
      const va = a + (Math.random() - 0.5) * 0.6; // Góc phun hình nón (cone)
      const vs = 4 + Math.random() * 8;         // Tốc độ bay cuồn cuộn
      state.bullets.push({
        x: b.x, y: b.y,
        vx: Math.cos(va) * vs, vy: Math.sin(va) * vs,
        isPlayer: false,
        radius: 8 + Math.random() * 15, // Cục lửa to nhỏ lộn xộn tạo cảm giác thật
        life: 30 + Math.random() * 20,  // Tầm bay vừa phải (cháy ngắn)
        style: 1, damage: 1
      });
    }
  },
  // Chiêu 1: CẦU LỬA TỐC ĐỘ CAO
  1: (b) => fan(b.x, b.y, aim(b), 5, 0.2, 1),
  // Chiêu 2: BÃO LỬA XOAY VÒNG
  2: (b) => ring(b.x, b.y, 14, state.frameCount * 0.05, 1),
  3: (b) => ring(b.x, b.y, 8, -state.frameCount * 0.1, 1),
  4: (b) => fan(b.x, b.y, aim(b), 3, 0.4, 1),
  5: (b) => ring(b.x, b.y, 10, state.frameCount * 0.02, 2),
  6: (b) => fan(b.x, b.y, aim(b), 7, 0.1, 2),
  7: (b) => ring(b.x, b.y, 15, -state.frameCount * 0.05, 2),
  8: (b) => fan(b.x, b.y, aim(b), 5, 0.3, 2),
  10: (b) => ring(b.x, b.y, 12, 0, 3),
  11: (b) => fan(b.x, b.y, aim(b), 3, 0.5, 3),
  12: (b) => { for (let i = 0; i < 10; i++) fireAngle(b.x, b.y, Math.random() * TAU, 3); },
  13: (b) => ring(b.x, b.y, 20, state.frameCount * 0.1, 3),
  15: (b) => ring(b.x, b.y, 8, 0, 0),
  16: (b) => fan(b.x, b.y, aim(b), 11, 0.1, 0),
  17: (b) => ring(b.x, b.y, 12, state.frameCount * 0.04, 0),
  18: (b) => fan(b.x, b.y, aim(b), 7, 0.2, 0),
  20: (b) => ring(b.x, b.y, 10, state.frameCount * 0.08, 4), // Style 4: Wind
  21: (b) => fan(b.x, b.y, aim(b), 15, 0.05, 4),
  22: (b) => ring(b.x, b.y, 18, -state.frameCount * 0.05, 4),
  23: (b) => fan(b.x, b.y, aim(b), 9, 0.15, 4),
  30: (b) => { // Lửa + Gió
    fan(b.x, b.y, aim(b), 5, 0.2, 1);
    ring(b.x, b.y, 10, state.frameCount * 0.05, 4);
  },
  31: (b) => { // Băng + Sấm
    ring(b.x, b.y, 12, 0, 2);
    fan(b.x, b.y, aim(b) + Math.PI, 6, 0.3, 3); // Bắn sấm về phía sau dội lại
  },
  32: (b) => { // Hỗn mang (4 loại đạn)
    fireAngle(b.x, b.y, aim(b), 1);
    fireAngle(b.x, b.y, aim(b) + 0.2, 2);
    fireAngle(b.x, b.y, aim(b) - 0.2, 3);
    fireAngle(b.x, b.y, aim(b) + Math.PI, 4);
  },
};

// =======================
// DUMMY (FIX LAG)
// =======================
export function generateDummy(targetFrames = 600) {
  targetFrames = Math.min(targetFrames, 5000);
  let dummy = [];
  let speedMult = state.currentLevel <= 2 ? 0.5 : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);

  for (let i = 0; i < targetFrames; i++) {
    let x = 400 + Math.cos(i * 0.02 * speedMult) * 250;
    let y = 300 + Math.sin(i * 0.03 * speedMult) * 200;
    dummy.push([Math.round(x), Math.round(y)]);
  }
  return dummy;
}

// =======================
// GHOST SUMMONING
// =======================
export function bossSummonGhosts() {
  state.ghosts = [];
  let ghostLimit = Math.min(state.currentLevel, 10);
  let runsToUse = [];

  if (state.pastRuns.length > 0) {
    let shuffled = [...state.pastRuns].sort(() => 0.5 - Math.random());
    runsToUse = shuffled.slice(0, Math.min(ghostLimit, shuffled.length));
  }

  runsToUse.push(generateDummy(5000));
  let currentSpeedRate = state.currentLevel <= 2 ? 0.5 : Math.min(1.0, 0.5 + (state.currentLevel - 2) * 0.1);

  runsToUse.forEach((runData, idx) => {
    state.ghosts.push({
      record: runData,
      speedRate: currentSpeedRate,
      burnTimer: 0,
      lastHazardDamageTime: 0,
      lastIdx: -1,
      x: state.boss.x,
      y: state.boss.y,
      radius: 12,
      isStunned: 0,
      historyPath: [],
      isDummy: idx === runsToUse.length - 1,
    });
  });
}