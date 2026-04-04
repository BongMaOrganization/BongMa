import { state } from "../state.js";
import { dist } from "../utils.js";

const SCREEN_SHAKE_TYPES = {
  earth: () => ({ x: 0, y: (Math.random() - 0.5) * state.screenShake.intensity }),
  wind: () => ({ x: (Math.random() - 0.5) * state.screenShake.intensity * 0.5, y: (Math.random() - 0.5) * state.screenShake.intensity * 0.5 }),
  thunder: () => {
    return { x: (Math.random() - 0.5) * state.screenShake.intensity * 1.5, y: (Math.random() - 0.5) * state.screenShake.intensity * 1.5 };
  }
};

const fireCanvas = document.createElement('canvas');
const fireCtx = fireCanvas.getContext('2d');
fireCanvas.width = 100 * 10;
fireCanvas.height = 100;

function preRenderFire() {
  for (let i = 0; i < 10; i++) {
    const x = i * 100 + 50;
    const y = 50;
    const grad = fireCtx.createRadialGradient(x, y, 0, x, y, 50);
    // NÂNG CẤP MÀU LỬA LÕI TRẮNG, VIỀN CAM
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.2, "rgba(255, 255, 0, 0.9)");
    grad.addColorStop(0.6, "rgba(255, 60, 0, 0.7)");
    grad.addColorStop(1, "rgba(200, 0, 0, 0)");
    fireCtx.fillStyle = grad;
    fireCtx.beginPath();
    fireCtx.arc(x, y, 50, 0, Math.PI * 2);
    fireCtx.fill();
  }
}

preRenderFire();

function getShakeOffset() {
  if (!state.screenShake || state.screenShake.timer <= 0) return { x: 0, y: 0 };
  const type = state.screenShake.type || 'earth';
  return (SCREEN_SHAKE_TYPES[type] || SCREEN_SHAKE_TYPES.earth)();
}

function drawGrid(ctx, canvas) {
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
}

function drawLavaFloor(ctx, canvas) {
  // SỬA ĐỔI: Làm nền mặt đất tối đi (dung nham nguội), chỉ chừa lại các kẽ nứt nham thạch
  // Giúp màn hình không bị đỏ chót và dễ nhìn hơn rất nhiều.
  const pulse = (Math.sin(state.frameCount * 0.05) + 1) * 0.5;
  ctx.save();

  // Background glow (Tối đen, ám đỏ cực nhẹ)
  ctx.fillStyle = `rgba(15, 5, 0, 0.9)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Glowing Lava Grid (Chỉ sáng ở đường kẻ)
  ctx.strokeStyle = `rgba(255, 60, 0, ${0.2 + pulse * 0.4})`;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ff2200";

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
  ctx.restore();
}

function drawBurnVignette(ctx, canvas) {
  const pulse = (Math.sin(state.frameCount * 0.1) + 1) * 0.5;
  const grad = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.8
  );
  grad.addColorStop(0, "rgba(0, 0, 0, 0)");
  // Chỉ đỏ mờ ở ngoài viền
  grad.addColorStop(1, `rgba(100, 10, 0, ${0.1 + pulse * 0.1})`);

  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export function draw(ctx, canvas) {
  let { player, boss, bullets, ghosts, mouse, activeBuffs } = state;
  let buffs = activeBuffs || { q: 0, e: 0, r: 0 };
  const char = player?.characterId;

  if (!state.particles) state.particles = [];

  // --- Background & Global Hazards ---
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.globalHazard && state.globalHazard.active && state.globalHazard.type === "fire") {
    drawLavaFloor(ctx, canvas);
  } else {
    drawGrid(ctx, canvas);
  }

  const shake = getShakeOffset();
  ctx.save();
  // SAFEGUARD: Đảm bảo không bị NaN khi rung màn hình (nguyên nhân gây lệch màn hình vĩnh viễn)
  if (!isNaN(shake.x) && !isNaN(shake.y)) {
    ctx.translate(shake.x, shake.y);
  }

  if (state.globalHazard && state.globalHazard.active && state.globalHazard.type === "fire") {
    drawBurnVignette(ctx, canvas);
  }

  // --- Draw Hazards (Under entities) ---
  state.hazards.forEach(h => {
    ctx.save();
    if (h.type === "fire") {
      // TẠO ĐỘ RỰC (BLOOM) NHƯ ĐÈN NEON BẰNG LIGHTER
      ctx.globalCompositeOperation = "lighter";

      const pulse = (Math.sin(state.frameCount * 0.2) + 1) * 0.5;
      const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
      grad.addColorStop(0, `rgba(255, 255, 100, ${0.8 + pulse * 0.2})`);
      grad.addColorStop(0.5, "rgba(255, 60, 0, 0.6)");
      grad.addColorStop(1, "rgba(255, 0, 0, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();

      // TRẢ LẠI TRẠNG THÁI VẼ BÌNH THƯỜNG
      ctx.globalCompositeOperation = "source-over";
    } else if (h.type === "fire_ring") {
      // SỬA ĐỔI: Vẽ Sóng Lửa (Fire Ring) rỗng, đẹp mắt
      const lifeRatio = Math.max(0, h.life / h.maxLife);
      const pulse = (Math.sin(state.frameCount * 0.2) + 1) * 0.5;

      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);

      // Viền ngoài bùng cháy
      ctx.lineWidth = 15 + pulse * 5;
      ctx.strokeStyle = `rgba(255, 60, 0, ${lifeRatio})`;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff0000";
      ctx.stroke();

      // Viền lõi cực nóng (Trắng/Vàng sáng)
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(255, 255, 150, ${lifeRatio})`;
      ctx.shadowBlur = 5;
      ctx.shadowColor = "#ffffff";
      ctx.stroke();
    } else if (h.type === "rock") {
      const alpha = h.active ? 1.0 : 0.4;
      ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
      ctx.strokeStyle = `rgba(200, 150, 100, ${alpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = h.radius * (0.9 + Math.random() * 0.3);
        const px = h.x + Math.cos(a) * r;
        const py = h.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (h.type === "frost") {
      const alpha = Math.min(0.4, h.life / 60);
      ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(h.x + (Math.random() - 0.5) * 70, h.y + (Math.random() - 0.5) * 70);
        ctx.lineTo(h.x + (Math.random() - 0.5) * 70, h.y + (Math.random() - 0.5) * 70);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.stroke();
      }
    } else if (h.type === "static") {
      const pulse = state.frameCount % 10 < 5 ? 1 : 0.5;
      ctx.strokeStyle = `rgba(255, 255, 0, ${pulse * (h.life / 60)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(h.x + (Math.random() - 0.5) * h.radius * 2, h.y + (Math.random() - 0.5) * h.radius * 2);
        ctx.stroke();
      }
    } else if (h.type === "vortex") {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(state.frameCount * 0.3); // Xoay cực nhanh
      ctx.strokeStyle = `rgba(180, 255, 255, ${0.4 + Math.random() * 0.3})`;
      ctx.lineWidth = 6;
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00ffff";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        // Vẽ các dải gió cuộn vào trong
        ctx.arc(0, 0, (h.radius / 5) * (i + 1), 0, Math.PI * (1 + Math.random() * 0.5));
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  });

  // --- Draw Global Hazard Overlay ---
  if (state.globalHazard.active) {
    ctx.save();
    if (state.globalHazard.type === "fire") {
      // SỬA ĐỔI: Xóa màng đỏ che toàn màn hình gây nhức mắt
      // Thêm tàn tro (embers) bay lên để tạo cảm giác chảo lửa
      if (state.frameCount % 2 === 0) {
        state.particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vx: (Math.random() - 0.5) * 2,
          vy: -2 - Math.random() * 3,
          life: 60,
          color: Math.random() > 0.5 ? "#ffaa00" : "#ff4400",
          size: 2 + Math.random() * 3
        });
      }
    } else if (state.globalHazard.type === "electric") {
      // 1. Tạo hiệu ứng chớp tắt màn hình mạnh hơn (Strobe effect)
      if (state.frameCount % 10 === 0 && Math.random() < 0.4) {
        ctx.fillStyle = "rgba(200, 255, 255, 0.15)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Vẽ các tia sét đánh xuống ngẫu nhiên toàn bản đồ
      if (state.frameCount % 8 === 0) { // Tần suất xuất hiện tia sét
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 2 + Math.random() * 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ffff";

        let startX = Math.random() * canvas.width;
        let curY = 0;
        ctx.beginPath();
        ctx.moveTo(startX, 0);

        // Vẽ đường ziczac của tia sét
        while (curY < canvas.height) {
          startX += (Math.random() - 0.5) * 80; // Độ lệch ngang
          curY += 30 + Math.random() * 40;     // Độ dài mỗi đoạn ziczac
          ctx.lineTo(startX, curY);
        }
        ctx.stroke();
        ctx.restore();
      }
    } else if (state.globalHazard.type === "ice") {
      // THÊM MỚI TẠI ĐÂY: Hiệu ứng sương giá và tuyết rơi bão bùng
      ctx.fillStyle = "rgba(0, 200, 255, 0.15)"; // Phủ sương xanh mờ
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (state.frameCount % 2 === 0) {
        state.particles.push({
          x: Math.random() * canvas.width,
          y: -10, // Tuyết rơi từ trên xuống
          vx: (Math.random() - 0.5) * 4, // Gió thổi ngang mạnh
          vy: 2 + Math.random() * 4,     // Tốc độ rơi
          life: 240,
          color: "#ffffff",
          size: 2 + Math.random() * 3
        });
      }
    } else if (state.globalHazard.type === "wind") {
      // Sương gió mờ mờ toàn map
      ctx.fillStyle = "rgba(200, 255, 255, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Phóng các hạt bụi với tốc độ cực kì xé gió (đảo chiều liên tục)
      if (state.frameCount % 1 === 0) { // Mỗi frame đẻ ra 1 hạt
        state.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: Math.cos(state.frameCount * 0.05) * 20, // Tốc độ đạn bắn
          vy: Math.sin(state.frameCount * 0.05) * 20,
          life: 20,
          color: "#ccffff",
          size: 1 + Math.random() * 3
        });
      }
    }
    ctx.restore();
  }

  // --- Draw Safe Zones ---
  state.safeZones.forEach(sz => {
    ctx.save();
    const pulse = 0.8 + Math.sin(state.frameCount * 0.1) * 0.2;
    const gradient = ctx.createRadialGradient(sz.x, sz.y, 0, sz.x, sz.y, sz.radius);
    gradient.addColorStop(0, "rgba(0, 255, 255, 0.4)");
    gradient.addColorStop(1, "rgba(0, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sz.x, sz.y, sz.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  });

  // --- Draw Boss Beams (Lightning) ---
  state.bossBeams.forEach(beam => {
    ctx.save();
    if (beam.state === "charge") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#00ffff";

      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      let dx = beam.x2 - beam.x1;
      let dy = beam.y2 - beam.y1;
      let distVal = Math.sqrt(dx * dx + dy * dy);
      let steps = Math.floor(distVal / 20);

      for (let i = 1; i < steps; i++) {
        let t = i / steps;
        let px = beam.x1 + dx * t + (Math.random() - 0.5) * 30;
        let py = beam.y1 + dy * t + (Math.random() - 0.5) * 30;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    }
    ctx.restore();
  });

  if (char === "timekeeper") {
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

  if (char === "void") {
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

  if (char === "destroyer") {
    if (state.destroyerRifts) {
      state.destroyerRifts.forEach((r) => {
        const opacity = r.life / (5 * 60);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.endX, r.endY);
        ctx.strokeStyle = `rgba(255, 0, 100, ${opacity})`;
        ctx.lineWidth = 15;
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      });
    }

    if (state.destroyerAbsorb) {
      const field = state.destroyerAbsorb;
      const pulse = Math.sin(state.frameCount * 0.2) * 10;
      const alpha = (field.life / 60) * 0.3;

      ctx.beginPath();
      ctx.arc(player.x, player.y, field.radius + pulse, 0, Math.PI * 2);

      ctx.strokeStyle = `rgba(180, 0, 255, ${alpha})`;
      ctx.lineWidth = 8;
      ctx.stroke();

      ctx.fillStyle = `rgba(100, 0, 200, ${alpha * 0.5})`;
      ctx.fill();

      for (let i = 0; i < 4; i++) {
        let a = (state.frameCount * 0.05 + i * (Math.PI / 2));
        ctx.beginPath();
        ctx.arc(player.x, player.y, field.radius + pulse - 5, a, a + 0.8);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  if (char === "storm") {
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

  if (char === "reaper") {
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

  if (char === "oracle") {
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

  if (char === "tank" && buffs.r > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 200 + (15 - buffs.r) * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 204, ${buffs.r / 15})`;
    ctx.lineWidth = 10;
    ctx.stroke();
  }
  if (char === "sharpshooter" && buffs.r > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${buffs.r / 20})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (player.characterId === "mage" && buffs.r > 0) {
    ctx.fillStyle = `rgba(0, 150, 255, 0.15)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (char === "berserker") {
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

  if (char === "assassin" && buffs.e > 0) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (char === "brawler") {
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

  if (char === "scout") {
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

  if (char === "medic") {
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

  if (char === "summoner" && buffs.q > 0) {
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

  if (char === "alchemist" && buffs.r > 0) {
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

  if (char === "summoner" && buffs.r > 0) {
    ctx.fillStyle = "rgba(180, 0, 255, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (char === "warden" && buffs.r > 0) {
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

  if (char === "void" && buffs.r > 0) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (char === "storm" && buffs.r > 0) {
    ctx.fillStyle = "rgba(255, 255, 0, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (char === "reaper" && buffs.r > 0) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (char === "engineer" && buffs.r > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 120, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 200, 255, 0.6)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (char === "spirit" && buffs.q > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(200, 200, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (char === "spirit" && buffs.e > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 200, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(150, 150, 255, 0.4)";
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (char === "spirit" && buffs.r > 0) {
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
  if (char === "druid" && buffs.r > 0) {
    ctx.fillStyle = "rgba(0,255,100,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (char === "druid" && buffs.e > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,255,100,0.6)";
    ctx.stroke();
  }

  if (char === "frost") {
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

  if (char === "gunner") {
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

  if (char === "hunter") {
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
  if (char === "phoenix" && buffs.r > 0) {
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

    ctx.fillStyle = "rgba(255,150,0,0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

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
  if (boss) {
    let phase;
    const ratio = boss.hp / boss.maxHp;
    if (boss.phaseCount === 3) {
      phase = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;
    } else {
      phase = ratio > 0.5 ? 0 : 1;
    }
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

    // --- Fire Styling ---
    if (g.style === 1) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ff4400";
      // Simple sparks
      if (state.frameCount % 2 === 0) {
        state.particles.push({
          x: g.x, y: g.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
          life: 20, color: "#ffaa00", size: 2 + Math.random() * 3
        });
      }
    }

    // --- Wind Styling ---
    if (g.style === 4) {
      ctx.strokeStyle = "rgba(200, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius + Math.sin(state.frameCount * 0.2) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);

    if (char === "mage" && buffs.r > 0) {
      ctx.fillStyle = "#00aaff";
    } else {
      ctx.globalAlpha = g.isStunned > 0 ? 0.4 : 1.0;
      ctx.fillStyle = "#ff4444";
    }

    ctx.fill();
    ctx.globalAlpha = 1.0;

    if (g.isStunned <= 0) {
      ctx.strokeStyle = isDashing ? "#00ffcc" : "#ff0000";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  let isScoutQ = char === "scout" && buffs.q > 0;
  let isFrostR = char === "frost" && buffs.r > 0;

  for (let b of bullets) {
    // --- Fire Styling ---
    if (b.style === 1) {
      ctx.save();
      const pulse = (Math.sin(state.frameCount * 0.3) + 1) * 0.5;
      ctx.shadowBlur = 10 + pulse * 10;
      ctx.shadowColor = "#ff4400";

      // Dynamic Flame Trail
      if (state.frameCount % 2 === 0) {
        state.particles.push({
          x: b.x, y: b.y, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5),
          life: 30, color: Math.random() > 0.5 ? "#ffaa00" : "#ff4400",
          size: 3 + Math.random() * b.radius
        });
      }

      // Heat core
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.4, "#ffff00");
      grad.addColorStop(1, "#ff4400");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue; // Handled fire specifically
    }
    // --- Meteor Styling ---
    if (b.isMeteor) {
      ctx.save();
      // 1. Khói và Lửa hạt
      if (state.frameCount % 2 === 0) {
        state.particles.push({
          x: b.x + (Math.random() - 0.5) * b.radius,
          y: b.y + (Math.random() - 0.5) * b.radius,
          vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 1,
          life: 40, color: "#222222", size: 5 + Math.random() * 10
        });
      }

      // 2. Các mảnh đá vụn bay xung quanh
      ctx.fillStyle = "#3a1c0d";
      for (let j = 1; j <= 4; j++) {
        let r = b.radius * 0.3;
        let dx = Math.cos(state.frameCount * 0.2 * j) * (b.radius + 15); // Xoay quanh
        let dy = -10 - j * 15; // Kéo dài ra phía sau
        ctx.beginPath();
        ctx.arc(b.x + dx, b.y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Đá chính (Khối đa giác)
      ctx.fillStyle = "#4a2c1d";
      ctx.beginPath();
      const sides = 7;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const r = b.radius * (0.8 + Math.random() * 0.4);
        const px = b.x + Math.cos(angle) * r;
        const py = b.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Viền nham thạch
      ctx.strokeStyle = "#ff4400";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.shadowBlur = 40;
      ctx.shadowColor = "#ff2200";
      ctx.restore();
      continue;
    }

    // --- Wind Styling ---
    if (b.style === 4) {
      ctx.strokeStyle = "rgba(200, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius + Math.sin(state.frameCount * 0.2) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    } else if (b.style === 5) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fillStyle = "#00ffff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00ffff";
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      let drawRadius = b.radius;
      if (!b.isPlayer && isScoutQ) drawRadius += 3;

      ctx.arc(b.x, b.y, drawRadius, 0, Math.PI * 2);
      if (b.isPlayer) {
        ctx.fillStyle = "#00ffcc";
      } else {
        // Color based on style
        ctx.fillStyle = "#ff4444";
        if (b.style === 1) ctx.fillStyle = "#ff0000"; // Fire
        if (b.style === 2) ctx.fillStyle = "#00ffff"; // Ice
        if (b.style === 3) ctx.fillStyle = "#ffff00"; // Thunder
        if (b.style === 0) ctx.fillStyle = "#8b4513"; // Earth
        if (b.style === 4) ctx.fillStyle = "rgba(180, 255, 255, 0.6)";

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

  if (state.druidOrbs && char === "druid" && buffs.q > 0) {
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
      (char === "tank" ||
        char === "ghost" ||
        char === "reaper")) ||
    (buffs.q > 0 &&
      (char === "warden" || char === "frost"));

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
      char === "ghost" ? "rgba(100,100,255,0.5)" : "white";

    if (char === "reaper" && buffs.e > 0) {
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

    // Status Debuff Overlays
    const s = state.playerStatus;
    if (s.slowTimer > 0) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (s.stunTimer > 0) {
      ctx.fillStyle = "#ffff00";
      for (let i = 0; i < 3; i++) {
        const a = state.frameCount * 0.2 + i * 2;
        ctx.beginPath();
        ctx.arc(player.x + Math.cos(a) * 20, player.y + Math.sin(a) * 20, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // ===== NEW CHARACTER VFX =====

  // --- Destroyer: Rift ---
  if (state.destroyerRifts) {
    state.destroyerRifts.forEach(r => {
      const alpha = Math.min(1, r.life / 60);
      ctx.strokeStyle = `rgba(255, 0, 80, ${alpha * 0.8})`;
      ctx.lineWidth = 8 + Math.sin(state.frameCount * 0.1) * 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff0055";
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.endX, r.endY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  // --- Destroyer: Ult aura ---
  if (state.destroyerUlt) {
    const pulse = Math.sin(state.frameCount * 0.15) * 15;
    const radius = state.destroyerUlt.radius + pulse;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 0, 80, 0.6)`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 30;
    ctx.shadowColor = "#ff0055";
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 0, 80, 0.08)`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // --- Destroyer: E aura ---
  if (char === "destroyer" && buffs.e > 0) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 0, 80, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // --- Creator: Turrets ---
  if (state.creatorTurrets) {
    state.creatorTurrets.forEach(t => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 220, 100, 0.8)";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ffdd00";
      ctx.fill();
      ctx.shadowBlur = 0;
      // Line to player
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = "rgba(255, 220, 100, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // --- Creator: Holy Zone ---
  if (state.creatorHolyZone) {
    const z = state.creatorHolyZone;
    const alpha = Math.min(1, z.life / 60);
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.1})`;
    ctx.strokeStyle = `rgba(255, 220, 100, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  // --- Creator: Orbs ---
  if (state.creatorOrbs) {
    state.creatorOrbs.forEach(orb => {
      const ox = player.x + Math.cos(orb.angle) * orb.orbitRadius;
      const oy = player.y + Math.sin(orb.angle) * orb.orbitRadius;
      ctx.beginPath();
      ctx.arc(ox, oy, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffaa";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ffdd00";
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // --- Knight: Charge trail ---
  if (state.knightCharge) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 200, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // --- Ground Warnings (Energy Beams & Bloom) ---
  if (state.groundWarnings) {
    state.groundWarnings.forEach(w => {

      const progress = Math.max(0, 1 - (w.timer / (w.maxTimer || 60)));

      // SAFEGUARD: Bỏ qua nếu tọa độ bị NaN để tránh treo renderer và làm lệch màn hình
      if (isNaN(w.x) || isNaN(w.y)) {
        return;
      }

      ctx.save();

      if (w.type === "meteor") {
        // ==========================================
        // 1. HIỆU ỨNG BOSS LỬA: CẢNH BÁO THIÊN THẠCH
        // ==========================================
        ctx.fillStyle = `rgba(15, 0, 0, ${progress * 0.6})`;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius * progress, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 50, 0, ${0.5 + progress * 0.5})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 15]);
        ctx.lineDashOffset = -state.frameCount * 5;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = `rgba(255, 0, 0, ${0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w.x - 15, w.y); ctx.lineTo(w.x + 15, w.y);
        ctx.moveTo(w.x, w.y - 15); ctx.lineTo(w.x, w.y + 15);
        ctx.stroke();

      } else if (w.type === "geyser") {
        // ==========================================
        // 2. HIỆU ỨNG BOSS LỬA: CỘT LỬA PHUN TRÀO (Sủi bọt)
        // ==========================================
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 60, 0, ${0.1 + progress * 0.3})`;
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 100, 0, 0.8)`;
        ctx.lineWidth = 4 + Math.sin(state.frameCount * 0.5) * 3;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius * (0.4 + progress * 0.6), 0, Math.PI * 2);
        ctx.stroke();

        if (progress > 0.5 && state.frameCount % 3 === 0) {
          state.particles.push({
            x: w.x + (Math.random() - 0.5) * w.radius,
            y: w.y + (Math.random() - 0.5) * w.radius,
            vx: (Math.random() - 0.5) * 0.5, vy: -1 - Math.random(),
            life: 20, color: "#ffaa00", size: 2 + Math.random() * 3
          });
        }
      } else if (w.type === "spike") {
        // ==========================================
        // 3. HIỆU ỨNG BOSS ĐẤT: GAI ĐÁ TRỒI LÊN
        // ==========================================
        const alpha = 0.2 + progress * 0.6;
        ctx.beginPath();
        ctx.arc(w.x + (Math.random() - 0.5) * 3, w.y + (Math.random() - 0.5) * 3, w.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 50, 20, ${alpha * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(139, 69, 19, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(50, 20, 0, ${alpha})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          let a = (i * Math.PI * 2 / 3) + progress;
          ctx.beginPath();
          ctx.moveTo(w.x, w.y);
          ctx.lineTo(w.x + Math.cos(a) * w.radius * 0.8, w.y + Math.sin(a) * w.radius * 0.8);
          ctx.stroke();
        }

        if (progress > 0.7 && state.frameCount % 2 === 0) {
          state.particles.push({
            x: w.x + (Math.random() - 0.5) * w.radius,
            y: w.y + (Math.random() - 0.5) * w.radius,
            vx: (Math.random() - 0.5), vy: -1 - Math.random(),
            life: 20, color: "#8b4513", size: 2 + Math.random() * 3
          });
        }
      } else {
        // ==========================================
        // 4. HIỆU ỨNG BOSS LỬA: CỘT LASER (Mặc định)
        // ==========================================
        ctx.fillStyle = `rgba(255, 0, 0, ${0.05 + progress * 0.15})`;
        ctx.fillRect(w.x - w.radius, 0, w.radius * 2, w.y);

        ctx.beginPath();
        ctx.moveTo(w.x, 0);
        ctx.lineTo(w.x, w.y);
        ctx.strokeStyle = "rgba(255, 50, 0, 0.3)";
        ctx.lineWidth = w.radius * 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w.x, 0);
        ctx.lineTo(w.x, w.y);
        ctx.setLineDash([10, 20]);
        ctx.lineDashOffset = -state.frameCount * 30;
        ctx.strokeStyle = "rgba(255, 200, 0, 0.9)";
        ctx.lineWidth = 6;
        ctx.stroke();

        const bloomSize = Math.max(0.1, 40 + progress * 100);
        const grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, bloomSize);
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.5 * progress})`);
        grad.addColorStop(0.3, `rgba(255, 50, 0, ${0.5 * progress})`);
        grad.addColorStop(1, "rgba(255, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w.x, w.y, bloomSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 50, 0, ${0.5 + progress * 0.5})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  // --- Environmental Hazards (Drawing) ---
  if (state.hazards) {
    state.hazards.forEach(h => {
      ctx.save();
      if (h.type === "fire") {
        const pulse = (Math.sin(state.frameCount * 0.1) + 1) * 0.5;
        const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
        grad.addColorStop(0, `rgba(255, 255, 0, ${0.5 + pulse * 0.2})`);
        grad.addColorStop(0.5, "rgba(255, 68, 0, 0.4)");
        grad.addColorStop(1, "rgba(255, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      // Ice/Frost visual
      if (h.type === "frost") {
        ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  // --- Knight: Shield ---
  if (state.knightShield) {
    const shieldPulse = Math.sin(state.frameCount * 0.2) * 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 35 + shieldPulse, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00aaff";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // --- Knight: Rage aura ---
  if (state.knightRage) {
    const pulse = Math.sin(state.frameCount * 0.3) * 5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 100, 0, 0.6)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Scout Q Visual Effect
  if (state.isScoutQ) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, 150, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 15;
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      let a = (state.frameCount * 0.1 + i) * Math.PI * 0.6;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 150, a, a + 0.5);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Boss Phase Transition Effect
  if (state.phaseTransitionTimer > 0) {
    let alpha = (Math.sin(state.frameCount * 0.2) * 0.1) + 0.1;
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.font = "bold 60px sans-serif";
    ctx.fillStyle = "#ff4444";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 10;
    ctx.fillText(state.currentPhaseName, canvas.width / 2, canvas.height / 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeText(state.currentPhaseName, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 255, 204, 0.5)";
  ctx.stroke();

  ctx.restore();

  // --- HUD & Vignette ---
  // --- Particles ---
  if (state.particles) {
    state.particles.forEach(p => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color || "white";
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fill();
      ctx.restore();
    });
  }

  drawHUD(ctx, canvas);

  if (state.playerStatus.burnTimer > 0) {
    drawFireVignette(ctx, canvas);
  }

  // Effect Helpers
  if (state.boss && state.boss.ultimatePhase) {
    drawSuctionParticles(ctx);
  }
}

function drawSuctionParticles(ctx) {
  if (!state.cinematicEffects.suctionParticles) {
    state.cinematicEffects.suctionParticles = [];
    for (let i = 0; i < 30; i++) {
      state.cinematicEffects.suctionParticles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        speed: 2 + Math.random() * 5
      });
    }
  }

  ctx.fillStyle = state.boss.elementColor || "#fff";
  state.cinematicEffects.suctionParticles.forEach(p => {
    const dx = state.boss.x - p.x;
    const dy = state.boss.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) {
      p.x = Math.random() * 800;
      p.y = Math.random() * 600;
    } else {
      p.x += dx / dist * p.speed;
      p.y += dy / dist * p.speed;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFireVignette(ctx, canvas) {
  const pulse = (Math.sin(Date.now() / 100) + 1) * 0.5;
  const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 200, canvas.width / 2, canvas.height / 2, 500);
  grad.addColorStop(0, "rgba(255, 0, 0, 0)");
  grad.addColorStop(1, `rgba(255, 50, 0, ${0.1 + pulse * 0.2})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawHUD(ctx, canvas) {
  const boss = state.boss;
  const s = state.bossSpecial;

  // --- Special Skill (Stance/Warning Bar) ---
  if (s && s.timer > 0) {
    const centerX = canvas.width / 2;
    const centerY = 140;
    const pulse = Math.sin(state.frameCount * 0.2) * 0.5 + 0.5;

    if (s.type === "ULTIMATE") {
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(255, 50, 50, ${0.7 + pulse * 0.3})`;
      ctx.fillText("!!! TẤT SÁT !!!", centerX, centerY - 60);
    } else {
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffcc00";
      ctx.fillText("ĐANG GỒNG CHIÊU", centerX, centerY - 60);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px Arial";
    ctx.fillText(s.name.toUpperCase(), centerX, centerY - 15);

    const barWidth = 360;
    const progress = s.timer / s.duration;
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(centerX - barWidth / 2, centerY + 10, barWidth, 6);
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(centerX - barWidth / 2, centerY + 10, barWidth * progress, 6);
  }

  // --- Boss Shield (Dynamic Cyan Bar) ---
  if (boss && boss.shieldActive && boss.shield > 0) {
    const barWidth = 300;
    const progress = Math.max(0, boss.shield / boss.maxShield);
    const centerX = canvas.width / 2;
    const centerY = 45;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(centerX - barWidth / 2, centerY, barWidth, 14);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect(centerX - barWidth / 2, centerY, barWidth * progress, 14);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - barWidth / 2, centerY, barWidth, 14);

    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "white";
    ctx.fillText("SHIELD / STANCE", centerX, centerY + 11);
  }
}
