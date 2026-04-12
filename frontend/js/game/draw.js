import { state } from "../state.js";
import { dist } from "../utils.js";
import { drawPuzzle, getPuzzleMinimapMarkers } from "./puzzle_manager.js";
import { drawActiveCharacter } from "../characters/characterRegistry.js";

const SCREEN_SHAKE_TYPES = {
  earth: () => ({
    x: 0,
    y: (Math.random() - 0.5) * state.screenShake.intensity,
  }),
  wind: () => ({
    x: (Math.random() - 0.5) * state.screenShake.intensity * 0.5,
    y: (Math.random() - 0.5) * state.screenShake.intensity * 0.5,
  }),
  thunder: () => {
    return {
      x: (Math.random() - 0.5) * state.screenShake.intensity * 1.5,
      y: (Math.random() - 0.5) * state.screenShake.intensity * 1.5,
    };
  },
};

const fireCanvas = document.createElement("canvas");
const fireCtx = fireCanvas.getContext("2d");
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
  const type = state.screenShake.type || "earth";
  return (SCREEN_SHAKE_TYPES[type] || SCREEN_SHAKE_TYPES.earth)();
}

function drawLavaFloor(ctx) {
  const t = state.frameCount * 0.02;

  ctx.save();

  // ===== 1. NỀN GỐC (BASE GRADIENT) =====
  // Nền tối ở giữa, tối đen ở viền để tạo chiều sâu (Vignette)
  const baseGrad = ctx.createRadialGradient(
    state.world.width / 2,
    state.world.height / 2,
    0,
    state.world.width / 2,
    state.world.height / 2,
    state.world.width * 0.8,
  );
  baseGrad.addColorStop(0, "#1a0800");
  baseGrad.addColorStop(1, "#050100");

  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, state.world.width, state.world.height);

  // Chuyển sang chế độ hòa trộn ánh sáng để vẽ dung nham & lửa
  ctx.globalCompositeOperation = "lighter";

  // ===== 2. MẠCH DUNG NHAM CÓ SỨC SỐNG (MAGMA VEINS) =====
  // Thay vì vẽ hình tròn tĩnh, ta dùng sóng sin để tạo các luồng chảy mềm mại
  const numVeins = 4;
  for (let i = 0; i < numVeins; i++) {
    ctx.beginPath();
    // Mỗi mạch chảy ở một độ cao khác nhau
    const startY = (state.world.height / numVeins) * i + 100;
    ctx.moveTo(0, startY);

    for (let x = 0; x <= state.world.width; x += 100) {
      // Tính toán độ uốn lượn dựa trên x và thời gian t
      const wave1 = Math.sin(x * 0.005 + t + i) * 60;
      const wave2 = Math.cos(x * 0.01 - t * 0.5) * 40;
      ctx.lineTo(x, startY + wave1 + wave2);
    }

    // Vẽ luồng sáng mờ, rộng
    ctx.strokeStyle =
      i % 2 === 0 ? "rgba(255, 60, 0, 0.04)" : "rgba(200, 20, 0, 0.03)";
    ctx.lineWidth = 120 + Math.sin(t * 2 + i) * 20; // Hơi nhịp thở nhẹ
    ctx.stroke();

    // Lõi mạch sáng hơn và nhỏ hơn
    ctx.strokeStyle = "rgba(255, 120, 0, 0.05)";
    ctx.lineWidth = 40;
    ctx.stroke();
  }

  // ===== 3. HỆ THỐNG HẠT TÀN LỬA (EMBER PARTICLES) =====
  // Khởi tạo mảng chứa hạt nếu chưa có
  if (!state.lavaParticles) state.lavaParticles = [];

  // Spawn hạt mới ngẫu nhiên (khoảng 30% mỗi frame)
  if (Math.random() < 0.3) {
    state.lavaParticles.push({
      x: Math.random() * state.world.width,
      y: state.world.height + 20, // Sinh ra từ đáy màn hình
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(Math.random() * 2 + 0.5), // Bay lên trên
      size: Math.random() * 3 + 1,
      life: 1.0, // Tuổi thọ từ 1.0 giảm dần về 0
      decay: Math.random() * 0.01 + 0.005,
      seed: Math.random() * Math.PI * 2,
    });
  }

  // Cập nhật và vẽ hạt lửa
  for (let i = state.lavaParticles.length - 1; i >= 0; i--) {
    let p = state.lavaParticles[i];

    // Chuyển động lượn lờ cản gió
    p.x += Math.sin(t * 5 + p.seed) * 0.5 + p.vx;
    p.y += p.vy;
    p.life -= p.decay;

    // Xóa hạt nếu hết tuổi thọ
    if (p.life <= 0) {
      state.lavaParticles.splice(i, 1);
      continue;
    }

    // Hạt lửa sẽ chuyển từ vàng/trắng sang cam và mờ dần
    const greenScale = Math.floor(150 * p.life);
    ctx.fillStyle = `rgba(255, ${greenScale}, 0, ${p.life})`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trả lại chế độ vẽ bình thường cho Grid
  ctx.globalCompositeOperation = "source-over";

  // ===== 4. LƯỚI KHÔNG GIAN (GRID) RẤT NHẸ =====
  const gridSize = 100;
  ctx.strokeStyle = "rgba(255, 80, 0, 0.04)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let x = 0; x <= state.world.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.world.height);
  }
  for (let y = 0; y <= state.world.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(state.world.width, y);
  }
  ctx.stroke();

  ctx.restore();
}

function drawBurnVignette(ctx, canvas) {
  const pulse = (Math.sin(state.frameCount * 0.1) + 1) * 0.5;
  const grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.3,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.8,
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Dịch chuyển bối cảnh ngược chiều camera để tạo cảm giác di chuyển
  ctx.translate(-state.camera.x, -state.camera.y);
  // Vẽ Nền Theo Theme Cực Xịn
  drawThemedBackground(ctx);
  // Vẽ vết cháy vĩnh viễn (nằm dưới cùng)
  drawPermanentScars(ctx);

  // --- DRAW SWARM ZONES (chỉ map thường) ---
  if (!state.isBossLevel && !state.bossArenaMode)
    state.swarmZones.forEach((sz) => {
      if (sz.isCompleted) return;
      ctx.save();
      const pulse = Math.sin(state.frameCount * 0.1) * 20;
      const opacity = sz.active ? 0.3 : 0.15;

      // Vẽ vùng tròn mờ
      const grad = ctx.createRadialGradient(
        sz.x,
        sz.y,
        0,
        sz.x,
        sz.y,
        sz.radius + pulse,
      );
      grad.addColorStop(0, `rgba(255, 100, 0, ${opacity})`);
      grad.addColorStop(1, "rgba(255, 50, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sz.x, sz.y, sz.radius + pulse, 0, Math.PI * 2);
      ctx.fill();

      // Vẽ viền đứt đoạn
      ctx.strokeStyle = `rgba(255, 150, 0, ${opacity + 0.3})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 10]);
      ctx.lineDashOffset = -state.frameCount * 0.5;
      ctx.beginPath();
      ctx.arc(sz.x, sz.y, sz.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Vẽ text tiêu đề
      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚠️ SWARM ZONE ⚠️", sz.x, sz.y - sz.radius - 20);
      ctx.restore();
    });
  if (!state.isBossLevel && !state.bossArenaMode) {
    drawCrates(ctx);
    drawPuzzle(ctx);
    drawCapturePoints(ctx);
    drawItems(ctx);
    //drawPuzzleZone(ctx);
    drawStagePortal(ctx);
  }
  drawSatellite(ctx);
  drawGodMode(ctx);
  drawFloatingTexts(ctx); // Thêm hàm vẽ chữ bay ở đây

  let { player, boss, bullets, ghosts, mouse, activeBuffs } = state;
  let buffs = activeBuffs || { q: 0, e: 0, r: 0 };
  const char = player?.characterId;

  if (!state.particles) state.particles = [];

  const shake = getShakeOffset();
  ctx.save();
  // SAFEGUARD: Đảm bảo không bị NaN khi rung màn hình (nguyên nhân gây lệch màn hình vĩnh viễn)
  if (!isNaN(shake.x) && !isNaN(shake.y)) {
    ctx.translate(shake.x, shake.y);
  }

  if (
    state.globalHazard &&
    state.globalHazard.active &&
    state.globalHazard.type === "fire"
  ) {
    drawBurnVignette(ctx, canvas);
  }

  // --- Draw Hazards (Under entities) ---
  state.hazards.forEach((h) => {
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
        ctx.moveTo(
          h.x + (Math.random() - 0.5) * 70,
          h.y + (Math.random() - 0.5) * 70,
        );
        ctx.lineTo(
          h.x + (Math.random() - 0.5) * 70,
          h.y + (Math.random() - 0.5) * 70,
        );
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
        ctx.lineTo(
          h.x + (Math.random() - 0.5) * h.radius * 2,
          h.y + (Math.random() - 0.5) * h.radius * 2,
        );
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
        ctx.arc(
          0,
          0,
          (h.radius / 5) * (i + 1),
          0,
          Math.PI * (1 + Math.random() * 0.5),
        );
        ctx.stroke();
      }
      ctx.restore();
    } else if (h.type === "void_crush") {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(-state.frameCount * 0.05);
      let pulse = Math.sin(state.frameCount * 0.2) * 20;

      let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, h.radius);
      grad.addColorStop(0, "#000000");
      grad.addColorStop(0.8, "rgba(70,0,150, 0.8)");
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(180, 0, 255, 0.5)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    } else if (h.type === "void_devourer" || h.type === "void_rift") {
      ctx.save();
      ctx.fillStyle = "#0a001a";
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#aa00ff";
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#cc00ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        h.x,
        h.y,
        h.radius * 1.2,
        h.radius * 0.3,
        state.frameCount * 0.1,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();
    } else if (h.type === "glitch_zone") {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle =
        state.frameCount % 10 < 5
          ? "rgba(0,255,255,0.2)"
          : "rgba(255,0,255,0.2)";
      ctx.fillRect(h.x - h.radius, h.y - h.radius, h.radius * 2, h.radius * 2);

      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -state.frameCount;
      ctx.strokeRect(
        h.x - h.radius,
        h.y - h.radius,
        h.radius * 2,
        h.radius * 2,
      );

      // Vẽ kí tự ma trận nhấp nháy
      ctx.fillStyle = "#00ff00";
      ctx.font = "20px monospace";
      ctx.fillText("01001", h.x, h.y);
      ctx.restore();
    } else if (h.type === "error_box") {
      ctx.save();
      ctx.fillStyle = "rgba(200,0,0,0.5)";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "red";
      ctx.fillRect(h.x - h.radius, h.y - h.radius, h.radius * 2, h.radius * 2);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("FATAL", h.x, h.y);
      ctx.restore();
    }
    // 🧱 BỨC TƯỜNG PIXEL
    else if (h.type === "pixel_wall") {
      ctx.save();
      let isCyan = Math.random() > 0.5;
      ctx.fillStyle = isCyan
        ? "rgba(0, 255, 255, 0.4)"
        : "rgba(255, 0, 255, 0.4)";
      // Vẽ tường bằng các dải pixel đứt nét
      for (let i = -h.radius; i < h.radius; i += 20) {
        if (Math.random() > 0.2) {
          ctx.fillRect(h.x + i, h.y - 20, 18, 40);
        }
      }
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(h.x - h.radius, h.y - 20, h.radius * 2, 40);
      ctx.restore();
    }

    // 🌧 MƯA MÃ NHỊ PHÂN
    else if (h.type === "binary_rain") {
      ctx.save();
      ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#00ff00";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      // Rơi chữ loạn cào cào
      for (let i = 0; i < 8; i++) {
        let px = h.x + (Math.random() - 0.5) * h.radius * 1.5;
        let py =
          h.y +
          (Math.random() - 0.5) * h.radius * 1.5 +
          (state.frameCount % 20) * 2;
        ctx.fillText(Math.random() > 0.5 ? "0" : "1", px, py);
      }
      ctx.restore();
    }

    // ⚡ TIA LASER NHIỄU SÓNG
    else if (h.type === "corrupt_laser") {
      ctx.save();
      ctx.strokeStyle =
        state.frameCount % 6 < 3
          ? "rgba(255, 0, 0, 0.8)"
          : "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 10 + Math.random() * 5;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#ff0000";

      ctx.beginPath();
      // Tâm Laser
      ctx.moveTo(h.x - h.radius, h.y);
      ctx.lineTo(h.x + h.radius, h.y);
      ctx.stroke();

      // Vẽ giật điện xung quanh
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.x - h.radius, h.y);
      for (let i = -h.radius; i < h.radius; i += 30) {
        ctx.lineTo(h.x + i, h.y + (Math.random() - 0.5) * 40);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  });
  // Thay vì tự ctx.arc() ở đây, hãy truyền vào hàm VFX
  if (state.elementalZones) {
    state.elementalZones.forEach((z) => {
      drawElementalZoneVFX(ctx, z);
    });
  }
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
          size: 2 + Math.random() * 3,
          screenSpace: true,
        });
      }
    } else if (state.globalHazard.type === "electric") {
      // 1. Tạo hiệu ứng chớp tắt màn hình mạnh hơn (Strobe effect)
      if (state.frameCount % 10 === 0 && Math.random() < 0.4) {
        ctx.fillStyle = "rgba(200, 255, 255, 0.15)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Vẽ các tia sét đánh xuống ngẫu nhiên toàn bản đồ
      if (state.frameCount % 8 === 0) {
        // Tần suất xuất hiện tia sét
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
          curY += 30 + Math.random() * 40; // Độ dài mỗi đoạn ziczac
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
          vy: 2 + Math.random() * 4, // Tốc độ rơi
          life: 240,
          color: "#ffffff",
          size: 2 + Math.random() * 3,
          screenSpace: true,
        });
      }
    } else if (state.globalHazard.type === "wind") {
      // Sương gió mờ mờ toàn map
      ctx.fillStyle = "rgba(200, 255, 255, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Phóng các hạt bụi với tốc độ cực kì xé gió (đảo chiều liên tục)
      if (state.frameCount % 1 === 0) {
        // Mỗi frame đẻ ra 1 hạt
        state.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: Math.cos(state.frameCount * 0.05) * 20, // Tốc độ đạn bắn
          vy: Math.sin(state.frameCount * 0.05) * 20,
          life: 20,
          color: "#ccffff",
          size: 1 + Math.random() * 3,
          screenSpace: true,
        });
      }
    }
    ctx.restore();
  }

  // --- Draw Safe Zones ---
  state.safeZones.forEach((sz) => {
    ctx.save();
    const pulse = 0.8 + Math.sin(state.frameCount * 0.1) * 0.2;
    const gradient = ctx.createRadialGradient(
      sz.x,
      sz.y,
      0,
      sz.x,
      sz.y,
      sz.radius,
    );
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

  // --- Draw Boss Beams (Lightning) TỐI ƯU ---
  state.bossBeams.forEach((beam) => {
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
      ctx.lineWidth = 8 + Math.random() * 4; // Vẽ 1 đường thẳng có độ dày nhấp nháy thay vì tính toán ziczac
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00ffff";
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();

      // Lõi tia sét
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
    ctx.restore();
  });

  if (boss && boss.entityPhase) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(boss.x - 25, boss.y - 25, 50, 50);

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(boss.x, boss.y, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (boss && boss.entityPhase) {
    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.fillText("SURVIVE: " + Math.ceil(boss.entityTimer / 60), 20, 40);
  }
  if (state.glitch.matrixMode) {
    for (let i = 0; i < 40; i++) {
      let x = Math.random() * canvas.width;
      let y = Math.random() * canvas.height;

      ctx.fillStyle = `rgba(0,255,0,${Math.random() * 0.15})`;
      ctx.fillRect(x, y, 2, 10);
    }
  }
  // decoy boss
  if (state.glitch.decoys) {
    state.glitch.decoys.forEach((d) => {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#fff";
      ctx.fillRect(d.x - 20, d.y - 20, 40, 40);
    });
    ctx.globalAlpha = 1;
  }
  // 🔥 overload overlay
  if (state.glitch.matrixMode && Math.random() < 0.3) {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Hiệu ứng nhân vật - mỗi nhân vật tự vẽ hiệu ứng của mình
  drawActiveCharacter(state, ctx, canvas, buffs);

  // Vẽ chỉ báo phạm vi skill (shared)
  if (state.skillRangeIndicators) {
    for (let i = state.skillRangeIndicators.length - 1; i >= 0; i--) {
      const ind = state.skillRangeIndicators[i];
      const alpha = ind.life / ind.maxLife;
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        ind.x,
        ind.y,
        ind.radius * (1 + (1 - alpha) * 0.15),
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = ind.color || "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.8;
      ctx.setLineDash([12, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Fill mờ bên trong
      ctx.beginPath();
      ctx.arc(ind.x, ind.y, ind.radius, 0, Math.PI * 2);
      ctx.fillStyle = ind.color || "rgba(255,255,255,0.8)";
      ctx.globalAlpha = alpha * 0.06;
      ctx.fill();
      ctx.restore();
      ind.life--;
      if (ind.life <= 0) state.skillRangeIndicators.splice(i, 1);
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

  if (boss && !boss.entityPhase) {
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
    
    // Ngoại hình VOID: Hố đen bẻ cong ánh sáng
    if (boss.id === "void" || boss.bossType === "void") {
      ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#050011"; // Tối đen như mực
      ctx.fill();

      // Vòng nhẫn Accretion Disk (giống Interstellar)
      ctx.rotate(-state.frameCount * 0.05);
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        boss.radius * 2.2,
        boss.radius * 0.6,
        Math.PI / 4,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = "rgba(180, 0, 255, 0.8)";
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    // Ngoại hình GLITCH: Tùy thuộc vào Phase
    else if (boss.id === "glitch" || boss.bossType === "glitch") {
      if (boss.ultimatePhase) {
        // ===================================================
        // 👁️ THE ENTITY (PHASE CUỐI) - THỰC THỂ TỐI THƯỢNG
        // ===================================================
        ctx.save();
        const pulse = Math.sin(state.frameCount * 0.1) * 10;

        // Hào quang rực rỡ chói lòa
        ctx.shadowBlur = 40 + pulse;
        ctx.shadowColor = "#ffffff";

        // Lõi năng lượng trắng sáng chói
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, boss.radius * 0.8 + pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Hiệu ứng nhiều vòng xoay đồng tâm (Như thiên sứ kỹ thuật số)
        ctx.shadowBlur = 20;

        // 1. Vòng xoay ma trận bên trong (Hình Vuông - Xanh Cyan)
        ctx.shadowColor = "#00ffff";
        ctx.rotate(state.frameCount * 0.05);
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 4;
        ctx.strokeRect(
          -boss.radius,
          -boss.radius,
          boss.radius * 2,
          boss.radius * 2,
        );

        // 2. Vòng xoay ma trận bên ngoài (Hình Thoi - Hồng Magenta xoay ngược chiều)
        ctx.shadowColor = "#ff00ff";
        ctx.rotate(-state.frameCount * 0.1);
        ctx.strokeStyle = "#ff00ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -boss.radius * 1.5);
        ctx.lineTo(boss.radius * 1.5, 0);
        ctx.lineTo(0, boss.radius * 1.5);
        ctx.lineTo(-boss.radius * 1.5, 0);
        ctx.closePath();
        ctx.stroke();

        // 3. Con Mắt Hư Vô ở chính giữa lõi
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          boss.radius * 0.2,
          boss.radius * 0.5,
          state.frameCount * 0.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.restore();
      } else {
        // ===================================================
        // 👾 GLITCH BÌNH THƯỜNG (PHASE 1 & 2)
        // ===================================================
        ctx.save();
        // Hiệu ứng bóng ma tách màu (Cyan / Magenta)
        ctx.globalCompositeOperation = "screen";

        const offset = (Math.random() - 0.5) * 10;
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(
          -boss.radius + offset,
          -boss.radius,
          boss.radius * 2,
          boss.radius * 2,
        );

        ctx.fillStyle = "#ff00ff";
        ctx.fillRect(
          -boss.radius - offset,
          -boss.radius,
          boss.radius * 2,
          boss.radius * 2,
        );

        ctx.fillStyle = "#111111";
        ctx.fillRect(
          -boss.radius,
          -boss.radius,
          boss.radius * 2,
          boss.radius * 2,
        );

        // Mã nhị phân chạy trên mặt boss
        ctx.fillStyle = "#00ff00";
        ctx.font = "bold 16px monospace";
        ctx.fillText(Math.random() > 0.5 ? "010" : "101", -12, 5);
        ctx.restore();
      }
    }
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

    // --- THÊM MỚI: VẼ TẦM HOẠT ĐỘNG CỦA MINIBOSS (GUARD ZONE) ---
    if (g.isMiniBoss && g.behavior === "guard") {
      const guardRadius = 800; // Phải bằng với bán kính tránh người chơi trong logic spawn

      ctx.save();
      ctx.beginPath();
      // Chú ý: Vẽ từ originalX và originalY (tâm của điểm chiếm đóng)
      ctx.arc(g.originalX, g.originalY, guardRadius, 0, Math.PI * 2);

      // Vẽ vùng nền mờ nhạt cảnh báo
      ctx.fillStyle = "rgba(255, 0, 85, 0.04)";
      ctx.fill();

      // Vẽ đường viền đứt nét
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 0, 85, 0.3)";
      ctx.setLineDash([15, 15]);

      // Xoay viền tạo cảm giác vùng năng lượng nguy hiểm
      ctx.lineDashOffset = -(state.frameCount * 0.5);
      ctx.stroke();

      ctx.restore();
    }
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
          x: g.x,
          y: g.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 20,
          color: "#ffaa00",
          size: 2 + Math.random() * 3,
        });
      }
    }

    // --- Wind Styling ---
    if (g.style === 4) {
      ctx.strokeStyle = "rgba(200, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        g.x,
        g.y,
        g.radius + Math.sin(state.frameCount * 0.2) * 3,
        0,
        Math.PI * 2,
      );
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

    // --- DRAW MINI-BOSS HP BAR (UPGRADED) ---
    if (g.isMiniBoss && g.hp !== undefined) {
      const barWidth = 100;
      const barHeight = 12;
      const bx = g.x - barWidth / 2;
      const by = g.y - g.radius - 25;

      // 1. Black Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(bx, by, barWidth, barHeight);

      // 2. HP Fill (Red/Orange)
      const hpRatio = Math.max(0, g.hp / g.maxHp);
      ctx.fillStyle = g.hp > g.maxHp * 0.3 ? "#ff1144" : "#ff9900";
      ctx.fillRect(bx, by, barWidth * hpRatio, barHeight);

      // 3. Shield Fill (Cyan Overlay)
      if (g.shieldActive && (g.shield || 0) > 0) {
        const shieldRatio = Math.max(0, g.shield / g.maxShield);
        ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
        ctx.fillRect(bx, by, barWidth * shieldRatio, barHeight);

        // Pulsing border for shield
        const pulse = (Math.sin(state.frameCount * 0.2) + 1) * 0.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, barWidth * shieldRatio, barHeight);
      }

      // 4. Outer Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, barWidth, barHeight);

      // 5. Boss Label (Optional check)
      if (g.hp > 0) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MINI BOSS", g.x, by - 5);
      }
    }
  }
  // ===== ELEMENTAL ENEMIES (VẼ TRÊN GHOST) =====
  state.elementalEnemies.forEach((e) => {
    ctx.save();

    // glow nhẹ
    ctx.shadowBlur = 15;
    ctx.shadowColor = state.elementColors[e.element];

    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = state.elementColors[e.element];
    ctx.fill();

    // outline
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  });
  let isScoutQ = char === "scout" && buffs.q > 0;
  let isFrostR = char === "frost" && buffs.r > 0;

  for (let b of bullets) {
    // ===== METEOR (ưu tiên trước) =====
    if (b.isMeteor) {
      ctx.save();

      if (state.frameCount % 2 === 0) {
        state.particles.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -Math.random(),
          life: 40,
          color: "#222222",
          size: 5 + Math.random() * 10,
        });
      }

      ctx.fillStyle = "#3a1c0d";
      for (let j = 1; j <= 4; j++) {
        let r = b.radius * 0.3;
        let dx = Math.cos(state.frameCount * 0.2 * j) * (b.radius + 15);
        let dy = -10 - j * 15;
        ctx.beginPath();
        ctx.arc(b.x + dx, b.y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#4a2c1d";
      ctx.beginPath();
      const sides = 7;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const r = b.radius * (0.8 + Math.random() * 0.4);
        const px = b.x + Math.cos(angle) * r;
        const py = b.y + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#ff4400";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
      continue;
    }

    // ===== SHURIKEN =====
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
      continue;
    }

    // ===== STYLE SYSTEM =====
    switch (b.style) {
      // 🔥 FIRE
      case 1: {
        ctx.save();

        const pulse = (Math.sin(state.frameCount * 0.3) + 1) * 0.5;
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = "#ff4400";

        if (state.frameCount % 2 === 0) {
          state.particles.push({
            x: b.x,
            y: b.y,
            vx: Math.random() - 0.5,
            vy: Math.random() - 0.5,
            life: 30,
            color: Math.random() > 0.5 ? "#ffaa00" : "#ff4400",
            size: 3 + Math.random() * b.radius,
          });
        }

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.4, "#ffff00");
        grad.addColorStop(1, "#ff4400");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        break;
      }

      // ❄ ICE
      case 2: {
        ctx.save();

        ctx.fillStyle = "#aeefff";
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - b.radius);
        ctx.lineTo(b.x - b.radius / 2, b.y + b.radius);
        ctx.lineTo(b.x + b.radius / 2, b.y + b.radius);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 15;
        ctx.shadowColor = "#66ccff";

        ctx.restore();
        break;
      }

      // ⚡ LIGHTNING
      case 3: {
        ctx.save();

        ctx.strokeStyle = "#ffff66";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(
          b.x - b.vx * (3 + Math.random()),
          b.y - b.vy * (3 + Math.random()),
        );
        ctx.stroke();

        ctx.restore();
        break;
      }

      // 🌪 WIND
      case 4: {
        ctx.save();

        ctx.strokeStyle = "#ccffff";
        let pulse = Math.sin(state.frameCount * 0.3) * 2;

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        break;
      }

      // 🌍 EARTH (FIX CHUẨN)
      case 5: {
        ctx.save();

        ctx.fillStyle = "#8b5a2b";

        ctx.beginPath();
        ctx.arc(
          b.x + (Math.random() - 0.5) * 1.5,
          b.y + (Math.random() - 0.5) * 1.5,
          b.radius,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.strokeStyle = "#5a3b1a";
        ctx.stroke();

        ctx.restore();
        break;
      }
      // 🌌 STYLE 10: VOID BULLET (Hố đen thu nhỏ)
      case 10: {
        ctx.save();
        const pulse = state.frameCount * 0.2;

        // Vòng xoáy đĩa không gian
        ctx.translate(b.x, b.y);
        ctx.rotate(pulse);
        ctx.beginPath();
        ctx.ellipse(0, 0, b.radius * 1.5, b.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(180, 0, 255, 0.6)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Lõi hố đen
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "#000000";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#9900ff";
        ctx.fill();
        ctx.restore();
        break;
      }

      // 👾 STYLE 11: GLITCH PIXEL (Lỗi hiển thị)
      case 11: {
        ctx.save();
        // Lệch màu (Chromatic Aberration)
        const isCyan = state.frameCount % 4 < 2;
        ctx.fillStyle = isCyan ? "#00ffff" : "#ff00ff";

        // Quỹ đạo zic-zac
        const glitchOffset = (Math.random() - 0.5) * 4;

        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(
          b.x - b.radius + glitchOffset,
          b.y - b.radius,
          b.radius * 2,
          b.radius * 2,
        );

        // Lõi trắng
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          b.x - b.radius / 2 + glitchOffset,
          b.y - b.radius / 2,
          b.radius,
          b.radius,
        );
        ctx.restore();
        break;
      }

      // 💻 STYLE 12 OPTIMIZED: DATA STREAM (Tia Neon Dài - Siêu mượt 60FPS)
      case 12: {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));

        // 1. Vẽ quầng sáng bên ngoài bằng màu trong suốt (Fake shadowBlur)
        ctx.fillStyle = "rgba(0, 255, 150, 0.6)";
        ctx.beginPath();
        ctx.moveTo(b.radius * 2, 0);
        ctx.lineTo(0, b.radius * 0.6);
        ctx.lineTo(-b.radius * 3, 0);
        ctx.lineTo(0, -b.radius * 0.6);
        ctx.fill();

        // 2. Vẽ lõi sáng trắng gắt ở giữa (Fake Gradient)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(b.radius, 0);
        ctx.lineTo(0, b.radius * 0.2);
        ctx.lineTo(-b.radius * 1.5, 0);
        ctx.lineTo(0, -b.radius * 0.2);
        ctx.fill();

        ctx.restore();
        break;
      }
      // 👻 13. PACKET LOSS (Đạn tàng hình chớp tắt)
      case 13: {
        ctx.save();
        if (state.frameCount % 15 < 7) {
          ctx.fillStyle = "#ff0044";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "#ff0044";
          ctx.fillRect(
            b.x - b.radius,
            b.y - b.radius,
            b.radius * 2,
            b.radius * 2,
          );
          ctx.strokeStyle = "#fff";
          ctx.strokeRect(
            b.x - b.radius,
            b.y - b.radius,
            b.radius * 2,
            b.radius * 2,
          );
        }
        ctx.restore();
        break;
      }
      // 🐛 14. VIRUS NODE (Khối u nhọt phình to)
      case 14: {
        ctx.save();
        let pulse = Math.sin(state.frameCount * 0.4) * 5;
        ctx.fillStyle = "#8800ff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ff00ff";

        ctx.beginPath();
        // Vẽ khối gai góc dị hợm
        for (let i = 0; i < 8; i++) {
          let a = (i * Math.PI) / 4 + state.frameCount * 0.05;
          let r = b.radius + (i % 2 === 0 ? pulse : -pulse);
          ctx.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#00ffcc";
        ctx.fillRect(b.x - 2, b.y - 2, 4, 4); // Lõi bé xíu
        ctx.restore();
        break;
      }

      // 🌀 15. MATRIX SHURIKEN (Phi tiêu lưới)
      case 15: {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(-state.frameCount * 0.2);

        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00ff00";

        ctx.beginPath();
        ctx.moveTo(-b.radius, -b.radius);
        ctx.lineTo(b.radius, b.radius);
        ctx.moveTo(-b.radius, b.radius);
        ctx.lineTo(b.radius, -b.radius);
        ctx.stroke();

        ctx.strokeRect(
          -b.radius * 0.6,
          -b.radius * 0.6,
          b.radius * 1.2,
          b.radius * 1.2,
        );
        ctx.restore();
        break;
      }

      // 🌐 16. FATAL ORB (Quả cầu nhiễu sóng to đùng)
      case 16: {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        // 3 vòng tròn tách màu lắc lư
        ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        ctx.beginPath();
        ctx.arc(b.x + Math.random() * 4, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
        ctx.beginPath();
        ctx.arc(b.x - Math.random() * 4, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(0, 0, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(b.x, b.y + Math.random() * 4, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      // ⚡ 17. GLITCH SPARK (Tia lửa điện nhiễu chớp nhoáng)
      case 17: {
        ctx.save();
        ctx.strokeStyle = Math.random() > 0.5 ? "#ffff00" : "#ffffff";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffff00";

        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        // Tia vẽ giật lùi tạo cảm giác chớp
        ctx.lineTo(
          b.x - b.vx * 2 + (Math.random() - 0.5) * 10,
          b.y - b.vy * 2 + (Math.random() - 0.5) * 10,
        );
        ctx.stroke();
        ctx.restore();
        break;
      }
      // DEFAULT
      default: {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);

        if (b.isPlayer) {
          ctx.fillStyle =
            player.characterId === "elementalist"
              ? state.elementColors[b.element] || "#00ffcc"
              : "#00ffcc";
        } else {
          ctx.fillStyle = "#ff4444";
        }

        ctx.fill();
      }
    }
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
      (char === "tank" || char === "ghost" || char === "reaper")) ||
    (buffs.q > 0 && (char === "warden" || char === "frost"));

  if (player.dashTimeLeft > 0 || isInvulnSkill) {
    ctx.beginPath();
    ctx.arc(
      player.x,
      player.y,
      player.radius + (isInvulnSkill ? 5 : 2),
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = char === "ghost" ? "rgba(100,100,255,0.5)" : "white";

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
    if (player.characterId === "elementalist") {
      ctx.fillStyle = state.elementColors[state.element];
    } else {
      ctx.fillStyle = player.color;
    }
    ctx.shadowBlur = 15;
    if (player.characterId === "elementalist") {
      ctx.shadowColor = state.elementColors[state.element];
    } else {
      ctx.shadowColor = player.color;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    if (player.characterId === "elementalist") {
      let color = state.elementColors[state.element];

      ctx.beginPath();
      ctx.arc(
        player.x,
        player.y,
        player.radius + 6 + Math.sin(state.frameCount * 0.2) * 3,
        0,
        Math.PI * 2,
      );

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
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
        ctx.arc(
          player.x + Math.cos(a) * 20,
          player.y + Math.sin(a) * 20,
          3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  // ===== NEW CHARACTER VFX =====

  // --- Destroyer: Rift ---

  // --- Destroyer: Ult aura ---

  // --- Destroyer: E aura ---

  // --- Creator: Turrets ---
  if (state.creatorTurrets) {
    state.creatorTurrets.forEach((t) => {
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
    state.creatorOrbs.forEach((orb) => {
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

  ctx.restore();

  // --- Ground Warnings (Energy Beams & Bloom) ---
  if (state.groundWarnings) {
    state.groundWarnings.forEach((w) => {
      const progress = Math.max(0, 1 - w.timer / (w.maxTimer || 60));

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
        ctx.moveTo(w.x - 15, w.y);
        ctx.lineTo(w.x + 15, w.y);
        ctx.moveTo(w.x, w.y - 15);
        ctx.lineTo(w.x, w.y + 15);
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
            vx: (Math.random() - 0.5) * 0.5,
            vy: -1 - Math.random(),
            life: 20,
            color: "#ffaa00",
            size: 2 + Math.random() * 3,
          });
        }
      } else if (w.type === "spike") {
        // ==========================================
        // 3. HIỆU ỨNG BOSS ĐẤT: GAI ĐÁ TRỒI LÊN
        // ==========================================
        const alpha = 0.2 + progress * 0.6;
        ctx.beginPath();
        ctx.arc(
          w.x + (Math.random() - 0.5) * 3,
          w.y + (Math.random() - 0.5) * 3,
          w.radius,
          0,
          Math.PI * 2,
        );
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
          let a = (i * Math.PI * 2) / 3 + progress;
          ctx.beginPath();
          ctx.moveTo(w.x, w.y);
          ctx.lineTo(
            w.x + Math.cos(a) * w.radius * 0.8,
            w.y + Math.sin(a) * w.radius * 0.8,
          );
          ctx.stroke();
        }

        if (progress > 0.7 && state.frameCount % 2 === 0) {
          state.particles.push({
            x: w.x + (Math.random() - 0.5) * w.radius,
            y: w.y + (Math.random() - 0.5) * w.radius,
            vx: Math.random() - 0.5,
            vy: -1 - Math.random(),
            life: 20,
            color: "#8b4513",
            size: 2 + Math.random() * 3,
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
    state.hazards.forEach((h) => {
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
  if (state.stormLightnings) {
    state.stormLightnings = state.stormLightnings.filter((l) => {
      l.life--;

      // ⚡ vẽ tia sét
      ctx.strokeStyle = "#ffff66";
      ctx.lineWidth = 3;
      ctx.beginPath();

      let x = l.x;
      let y = l.y;

      ctx.moveTo(x, y - 80);

      for (let i = 0; i < 5; i++) {
        let offsetX = (Math.random() - 0.5) * 20;
        let offsetY = i * 20;
        ctx.lineTo(x + offsetX, y - 80 + offsetY);
      }

      ctx.stroke();

      // ⚡ glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#ffff00";

      // ⚡ impact circle
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,150,0.6)";
      ctx.fill();

      ctx.shadowBlur = 0;

      return l.life > 0;
    });
  }
  //wwindd
  if (state.windParticles) {
    state.windParticles = state.windParticles.filter((p) => {
      p.life--;

      p.angle += 0.2;
      p.radius *= 0.97;

      let x = state.player.x + Math.cos(p.angle) * p.radius;
      let y = state.player.y + Math.sin(p.angle) * p.radius;

      ctx.fillStyle = "rgba(180,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      return p.life > 0;
    });
  }
  if (state.windTornadoes) {
    state.windTornadoes.forEach((t) => {
      // vòng xoáy chính
      ctx.strokeStyle = "rgba(180,255,255,0.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.stroke();

      // xoáy animation
      for (let i = 0; i < 5; i++) {
        let angle = (state.frameCount * 0.1 + i) % (Math.PI * 2);
        let r = t.radius * (i / 5);

        let x = t.x + Math.cos(angle) * r;
        let y = t.y + Math.sin(angle) * r;

        ctx.fillStyle = "rgba(200,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
  // ❄️ ICICLE DRAW
  if (state.icicles) {
    state.icicles.forEach((ic) => {
      ctx.save();

      // ❄️ thân băng
      ctx.fillStyle = "#aeefff";

      ctx.beginPath();
      ctx.moveTo(ic.x, ic.y - ic.radius);
      ctx.lineTo(ic.x - ic.radius / 2, ic.y + ic.radius);
      ctx.lineTo(ic.x + ic.radius / 2, ic.y + ic.radius);
      ctx.closePath();
      ctx.fill();

      // ✨ glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#66ccff";

      ctx.restore();
    });
  }
  if (!state.particles) state.particles = [];

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

  if (state.scoutSlash && state.scoutSlash.life > 0) {
    const s = state.scoutSlash;
    const progress = 1 - s.life / s.maxLife; // 0.0 -> 1.0

    ctx.save();

    // Đẩy gốc tọa độ về tâm người chơi để dễ xoay
    ctx.translate(player.x, player.y);

    // Blend mode làm vệt kiếm sáng rực rỡ như năng lượng
    ctx.globalCompositeOperation = "lighter";

    // 1. Quán tính chém (Xoay lưỡi kiếm theo tiến trình)
    // Chém một vòng rưỡi (Math.PI * 3) tạo cảm giác cuồng phong
    ctx.rotate(progress * Math.PI * 3);

    // 2. Easing out: Bung ra cực nhanh lúc đầu, chững lại lúc sau
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentRadius = s.radius * easeProgress;

    // 3. VẼ VỆT KIẾM CHÍNH (Core Slash)
    // Dùng vòng lặp vẽ các vệt lùi dần về sau để tạo hình lưỡi liềm (đầu to, đuôi nhọn)
    const numTrails = 12;
    for (let i = 0; i < numTrails; i++) {
      const trailRatio = i / numTrails; // 0.0 -> 1.0

      // Đuôi mờ dần và biến mất theo life
      const opacity = (1 - trailRatio) * Math.max(0, 1 - progress);
      // Đầu lưỡi kiếm to, đuôi thu nhỏ lại tạo độ sắc
      const thickness = (1 - trailRatio) * 15 * Math.max(0, 1 - progress);

      ctx.beginPath();

      // Đảm bảo bán kính không bao giờ bị âm
      const safeRadius = Math.max(0.1, currentRadius - i * 0.5);

      // Vẽ cung tròn khoảng 240 độ (Math.PI * 1.3)
      ctx.arc(
        0,
        0,
        safeRadius,
        0 - trailRatio * 1.5,
        Math.PI * 1.3 - trailRatio * 1.5,
      );

      ctx.strokeStyle = `rgba(0, 255, 255, ${opacity})`; // Màu Cyan đặc trưng
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // 4. LÕI CHỚP SÁNG (Glow Lưỡi kiếm)
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, Math.PI * 1.0, Math.PI * 1.3);
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.stroke();

    // 5. TIA GIÓ VĂNG RA TỪ CÚ CHÉM (Impact lines)
    if (progress < 0.4) {
      for (let j = 0; j < 5; j++) {
        const angle = ((Math.PI * 2) / 5) * j + progress;
        const lineStart = currentRadius * 0.6;
        const lineEnd = currentRadius * (1.2 + Math.random() * 0.5);

        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * lineStart, Math.sin(angle) * lineStart);
        ctx.lineTo(Math.cos(angle) * lineEnd, Math.sin(angle) * lineEnd);
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.6 - progress * 1.5})`;
        ctx.lineWidth = 2 + Math.random() * 2;
        ctx.stroke();
      }
    }

    ctx.restore();

    s.life--;
  }

  // Boss Phase Transition Effect
  if (state.phaseTransitionTimer > 0) {
    let alpha = Math.sin(state.frameCount * 0.2) * 0.1 + 0.1;
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
  // --- Particles (world-space only, inside camera translation) ---
  if (state.particles) {
    state.particles.forEach((p) => {
      if (p.screenSpace) return;
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      p.life--;
      if (p.life <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color || "white";
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fill();
      ctx.restore();
    });
  }

  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 255, 204, 0.5)";
  ctx.stroke();

  ctx.restore();

  // --- Particles (screen-space, after camera restore) ---
  if (state.particles) {
    state.particles = state.particles.filter((p) => {
      if (!p.screenSpace) return p.life > 0;
      p.x += p.vx || 0;
      p.y += p.vy || 0;
      p.life--;
      if (p.life <= 0) return false;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color || "white";
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fill();
      ctx.restore();
      return true;
    });
  }

  // --- HUD & Vignette ---
  drawHUD(ctx, canvas);
  if (!state.isBossLevel && !state.bossArenaMode)
    drawStageConditionsHUD(ctx, canvas);

  if (state.playerStatus.burnTimer > 0) {
    drawFireVignette(ctx, canvas);
  }

  // Effect Helpers
  if (state.boss && state.boss.ultimatePhase) {
    drawSuctionParticles(ctx);
  }
  if (state.glitch.fakeUI) {
    ctx.fillStyle = "red";
    ctx.font = "30px monospace";
    ctx.fillText("ERROR: INPUT CORRUPTED", 200, 300);
  }

  drawMinimap(ctx, canvas);

  if (state.nukeFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${state.nukeFlash / 20})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    state.nukeFlash--;
  }
}

function drawSuctionParticles(ctx) {
  if (!state.cinematicEffects.suctionParticles) {
    state.cinematicEffects.suctionParticles = [];
    for (let i = 0; i < 30; i++) {
      state.cinematicEffects.suctionParticles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        speed: 2 + Math.random() * 5,
      });
    }
  }

  ctx.fillStyle = state.boss.elementColor || "#fff";
  state.cinematicEffects.suctionParticles.forEach((p) => {
    const dx = state.boss.x - p.x;
    const dy = state.boss.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) {
      p.x = Math.random() * 800;
      p.y = Math.random() * 600;
    } else {
      p.x += (dx / dist) * p.speed;
      p.y += (dy / dist) * p.speed;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFireVignette(ctx, canvas) {
  const pulse = (Math.sin(Date.now() / 100) + 1) * 0.5;
  const grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    200,
    canvas.width / 2,
    canvas.height / 2,
    500,
  );
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

  // --- Swarm Zone HUD ---
  if (!state.isBossLevel && state.swarmZones && state.swarmZones.length > 0) {
    const activeZone = state.swarmZones.find(
      (sz) => sz.active && !sz.isCompleted,
    );
    const completedCount = state.swarmZones.filter(
      (sz) => sz.isCompleted,
    ).length;
    const totalZones = state.swarmZones.length;

    // HUD lớn ở dưới khi đang trong zone active
    if (activeZone) {
      const hudX = canvas.width / 2;
      const hudY = canvas.height - 150;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(hudX - 150, hudY, 300, 40);
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 2;
      ctx.strokeRect(hudX - 150, hudY, 300, 40);

      const progress = activeZone.currentKills / activeZone.requiredKills;
      ctx.fillStyle = "#ffaa00";
      ctx.fillRect(hudX - 145, hudY + 5, 290 * progress, 30);

      ctx.fillStyle = "white";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        `⚔️ TIÊU DIỆT: ${activeZone.currentKills}/${activeZone.requiredKills}`,
        hudX,
        hudY + 26,
      );
    }
  }
}

function drawMapGrid(ctx) {
  const gridSize = 100;

  ctx.save();

  // ===== GRID NHẠT =====
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)"; // 👈 giảm từ 0.05 → 0.03
  ctx.lineWidth = 1;

  ctx.beginPath();

  for (let x = 0; x <= state.world.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.world.height);
  }

  for (let y = 0; y <= state.world.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(state.world.width, y);
  }

  ctx.stroke();

  // ===== BORDER (laser nhẹ, không gắt) =====
  const pulse = (Math.sin(state.frameCount * 0.05) + 1) * 0.5;

  ctx.strokeStyle = `rgba(255, 80, 80, ${0.2 + pulse * 0.2})`; // 👈 mềm hơn
  ctx.lineWidth = 3;

  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(255,80,80,0.5)";

  ctx.strokeRect(0, 0, state.world.width, state.world.height);

  ctx.restore();
}

// Hàm vẽ Minimap
function drawMinimap(ctx, canvas) {
  const mmSize = 220; // Kích thước Minimap
  const padding = 20;
  const mmX = canvas.width - mmSize - padding; // Góc phải
  const mmY = padding + 60; // Dịch xuống 1 xíu để không đè lên Timer

  // Nền Minimap (Trong suốt 50%)
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 2;
  ctx.fillRect(mmX, mmY, mmSize, mmSize);
  ctx.strokeRect(mmX, mmY, mmSize, mmSize);

  // Tỷ lệ thu nhỏ
  const scaleX = mmSize / state.world.width;
  const scaleY = mmSize / state.world.height;

  // Hàm phụ: Vẽ chấm tròn
  const drawDot = (obj, color, size) => {
    if (!obj || (obj.hp <= 0 && obj !== state.player)) return;
    const x = mmX + obj.x * scaleX;
    const y = mmY + obj.y * scaleY;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  };

  // 1. Kẻ thù (Chấm đỏ nhỏ)
  state.ghosts.forEach((g) => drawDot(g, "#ff4444", 2));

  // 2. Boss (Chấm tím/đỏ to có aura)
  if (state.boss && state.boss.hp > 0) {
    drawDot(state.boss, state.boss.color || "#ff00ff", 4);
    // Aura viền
    ctx.strokeStyle = state.boss.color || "#ff00ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(
      mmX + state.boss.x * scaleX,
      mmY + state.boss.y * scaleY,
      7,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  // 3. Người chơi (Chấm lục lam)
  if (state.player && state.player.hp > 0) {
    drawDot(state.player, "#00ffcc", 3);
  }

  // 3.5. Swarm Zones (chỉ map thường)
  if (!state.isBossLevel && !state.bossArenaMode)
    state.swarmZones.forEach((sz) => {
      if (sz.isCompleted) return;
      const color = state.frameCount % 40 < 20 ? "#ffaa00" : "#aa5500";
      const x = mmX + sz.x * scaleX;
      const y = mmY + sz.y * scaleY;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.stroke();
    });

  // 4. Khung Camera (Hiển thị phần map người chơi đang nhìn thấy)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mmX + state.camera.x * scaleX,
    mmY + state.camera.y * scaleY,
    state.camera.width * scaleX,
    state.camera.height * scaleY,
  );

  // 5. Thùng vật phẩm (chỉ map thường)
  if (!state.isBossLevel && !state.bossArenaMode && state.crates) {
    state.crates.forEach((c) => {
      const x = mmX + c.x * scaleX;
      const y = mmY + c.y * scaleY;
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 6. Điểm chiếm đóng (chỉ map thường)
  if (!state.isBossLevel && !state.bossArenaMode && state.capturePoints) {
    state.capturePoints.forEach((cp) => {
      if (cp.state === "completed") return;
      const x = mmX + cp.x * scaleX;
      const y = mmY + cp.y * scaleY;
      const size = 6; // To hơn

      // Vẽ bóng đổ/halo
      ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
      ctx.beginPath();
      ctx.arc(x, y, size + 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Nếu còn boss canh giữ, vẽ chữ "B" nhỏ
      if (cp.state === "guarding") {
        ctx.fillStyle = "#ff0000";
        ctx.font = "bold 8px Arial";
        ctx.textAlign = "center";
        ctx.fillText("B", x, y + 3);
      }
    });
  }

  // 7. Puzzle minimap (NEW SYSTEM)
  if (!state.isBossLevel && !state.bossArenaMode) {
    const markers = getPuzzleMinimapMarkers();

    markers.forEach((m) => {
      const mx = mmX + m.x * scaleX;
      const my = mmY + m.y * scaleY;

      // --- OBELISK ---
      if (m.type === "clue") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(mx - 6, my - 9, 12, 18);

        ctx.fillStyle = m.revealed ? "#FFD700" : "#aaaaaa";
        ctx.fillRect(mx - 4, my - 7, 8, 14);

        ctx.fillStyle = m.revealed ? "#000" : "#fff";
        ctx.font = "bold 8px Arial";
        ctx.textAlign = "center";
        ctx.fillText(m.revealed ? "!" : "?", mx, my + 3.5);
      }

      // --- RUNE ---
      if (m.type === "rune") {
        const isPending = m.state === "pending";

        const fillColor = isPending
          ? "#ff9900"
          : m.isNext
            ? "#ffff00"
            : "#cc44ff";

        // nền đen
        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fill();

        // vòng màu
        ctx.beginPath();
        ctx.arc(mx, my, 6, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.stroke();

        // symbol
        ctx.fillStyle = "#000";
        ctx.font = "bold 8px Arial";
        ctx.textAlign = "center";
        ctx.fillText(m.symbol, mx, my + 3);
      }
      if (m.type === "domino") {
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);

        ctx.fillStyle = m.isNext ? "#ffff00" : "#888";
        ctx.fill();

        ctx.strokeStyle = "#000";
        ctx.stroke();
      }
      if (m.type === "melody") {
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);

        ctx.fillStyle = "#00ccff";
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.font = "bold 7px Arial";
        ctx.textAlign = "center";
        ctx.fillText("♪", mx, my + 2);
      }
      if (m.type === "torch") {
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);

        ctx.fillStyle = "#ff8800";
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.font = "bold 7px Arial";
        ctx.textAlign = "center";
        ctx.fillText("🔥", mx, my + 2);
      }
      if (m.type === "source") {
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // 8. Cổng dịch chuyển trên minimap
  if (!state.isBossLevel && state.stagePortal?.active) {
    const x = mmX + state.stagePortal.x * scaleX;
    const y = mmY + state.stagePortal.y * scaleY;
    const blink = Math.sin(state.frameCount * 0.15) > 0;
    if (blink) {
      ctx.fillStyle = "#cc00ff";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚡", x, y + 3);
    }
  }
}

function drawFloatingTexts(ctx) {
  state.floatingTexts.forEach((t) => {
    ctx.save();
    ctx.fillStyle = t.color || "#fff";
    ctx.font = `bold ${t.size || 20}px Arial`;
    ctx.textAlign = "center";
    ctx.globalAlpha = t.opacity || 1;
    // Vẽ chữ theo tọa độ thế giới (vì camera đã dịch chuyển)
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
}

function drawCrates(ctx) {
  if (!state.crates) return;
  state.crates.forEach((c) => {
    ctx.save();

    // Thùng gỗ (Hình vuông gỗ)
    ctx.fillStyle = "#8d6e63"; // Màu gỗ sáng
    ctx.strokeStyle = "#5d4037"; // Màu gỗ đậm làm viền
    ctx.lineWidth = 3;

    const x = c.x - c.radius;
    const y = c.y - c.radius;
    const size = c.radius * 2;

    // Bóng đổ nhẹ
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.fillRect(x, y, size, size);
    ctx.shadowBlur = 0;
    ctx.strokeRect(x, y, size, size);

    // Vẽ khung chéo 'X' kiểu thùng gỗ cổ điển
    ctx.strokeStyle = "#4e342e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + size - 4, y + size - 4);
    ctx.moveTo(x + size - 4, y + 4);
    ctx.lineTo(x + 4, y + size - 4);
    ctx.stroke();

    // Thanh máu mini khi bị đánh
    if (c.hp < c.maxHp) {
      const bw = size * 0.8;
      const bh = 4;
      const bx = c.x - bw / 2;
      const by = y - 10;

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = "#ff4444";
      ctx.fillRect(bx, by, bw * (c.hp / c.maxHp), bh);
    }

    // Icon hiển thị phần thưởng mờ mờ
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    let icon = "?";
    if (c.type === "GOLD") icon = "💰";
    if (c.type === "XP") icon = "✨";
    if (c.type === "FIRE_RATE") icon = "⚡";
    if (c.type === "HP_REGEN") icon = "➕";
    ctx.fillText(icon, c.x, c.y + 6);

    ctx.restore();
  });
}

function drawCapturePoints(ctx) {
  if (!state.capturePoints) return;
  state.capturePoints.forEach((cp) => {
    if (cp.state === "completed") return;

    ctx.save();
    const pulse = Math.sin(state.frameCount * 0.1) * 10;
    const progressRatio = cp.progress / cp.totalProgress;

    // 1. Vòng tròn sạc (Enhanced)
    if (cp.state === "charging") {
      const opacity = 0.15 + progressRatio * 0.45;

      // 1a. VùNG NăNG LƯỢNG NỀN (Vibrant Floor)
      ctx.globalCompositeOperation = "lighter";
      const floorGrad = ctx.createRadialGradient(
        cp.x,
        cp.y,
        0,
        cp.x,
        cp.y,
        cp.radius,
      );
      floorGrad.addColorStop(0, `rgba(255, 180, 0, ${opacity * 0.8})`);
      floorGrad.addColorStop(0.5, `rgba(255, 100, 0, ${opacity * 0.4})`);
      floorGrad.addColorStop(1, "rgba(255, 50, 0, 0)");

      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
      ctx.fill();

      // 1b. HEX-GRID / RUNE CIRCLE (Vibrant Visuals)
      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(state.frameCount * 0.015);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const segments = 12;
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        ctx.moveTo(
          Math.cos(a1) * (cp.radius * 0.9),
          Math.sin(a1) * (cp.radius * 0.9),
        );
        ctx.lineTo(
          Math.cos(a2) * (cp.radius * 0.9),
          Math.sin(a2) * (cp.radius * 0.9),
        );
      }
      ctx.stroke();
      ctx.restore();

      ctx.globalCompositeOperation = "source-over";

      // Runes
      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(state.frameCount * 0.02);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.3})`;
      ctx.font = "bold 24px Georgia";
      const runeCount = 12;
      for (let i = 0; i < runeCount; i++) {
        const angle = (i / runeCount) * Math.PI * 2;
        const runes = ["᚛", "᚜", "ᚣ", "ᚤ", "ᚥ", "ᚦ"];
        ctx.fillText(
          runes[i % runes.length],
          Math.cos(angle) * (cp.radius - 40),
          Math.sin(angle) * (cp.radius - 40),
        );
      }
      ctx.restore();

      // Inner spinning ring
      ctx.save();
      ctx.translate(cp.x, cp.y);
      ctx.rotate(-state.frameCount * 0.05);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + progressRatio * 0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 40]);
      ctx.beginPath();
      ctx.arc(0, 0, cp.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Pillar (Enhanced Fortress Style)
    // Energy Beam piercing through
    if (cp.state === "charging") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const beamW = 10 + Math.sin(state.frameCount * 0.2) * 5;
      const beamGrad = ctx.createLinearGradient(
        cp.x - beamW,
        0,
        cp.x + beamW,
        0,
      );
      beamGrad.addColorStop(0, "rgba(255, 100, 0, 0)");
      beamGrad.addColorStop(
        0.5,
        `rgba(255, 255, 255, ${0.4 + progressRatio * 0.6})`,
      );
      beamGrad.addColorStop(1, "rgba(255, 100, 0, 0)");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(cp.x - beamW / 2, cp.y - 1000, beamW, 1000); // Beam lên trời
      ctx.restore();
    }

    const pillarGrad = ctx.createLinearGradient(
      cp.x - 25,
      cp.y,
      cp.x + 25,
      cp.y,
    );
    pillarGrad.addColorStop(0, "#111");
    pillarGrad.addColorStop(0.5, "#333");
    pillarGrad.addColorStop(1, "#111");
    ctx.fillStyle = pillarGrad;
    ctx.beginPath();
    ctx.moveTo(cp.x - 20, cp.y + 20);
    ctx.lineTo(cp.x - 25, cp.y - 80);
    ctx.lineTo(cp.x + 25, cp.y - 80);
    ctx.lineTo(cp.x + 20, cp.y + 20);
    ctx.fill();

    // Orb with Pulsing Core
    const orbColor =
      cp.state === "charging"
        ? `hsl(${30 + progressRatio * 30}, 100%, 60%)`
        : "#444";
    ctx.save();
    ctx.shadowBlur = cp.state === "charging" ? 25 + pulse : 0;
    ctx.shadowColor = orbColor;
    ctx.fillStyle = orbColor;
    ctx.beginPath();
    ctx.arc(
      cp.x,
      cp.y - 85,
      18 + (cp.state === "charging" ? Math.sin(state.frameCount * 0.2) * 3 : 0),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    // 3. Laser & Shockwave
    if (cp.state === "charging") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.4 + Math.random() * 0.4})`;
      ctx.lineWidth = 4 + Math.random() * 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "red";
      ctx.beginPath();
      ctx.moveTo(cp.x, cp.y - 80);
      ctx.lineTo(
        cp.x + Math.cos(cp.laserAngle) * cp.radius,
        cp.y + Math.sin(cp.laserAngle) * cp.radius,
      );
      ctx.stroke();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (state.frameCount - cp.lastPulseTime < 45) {
        const sRatio = Math.max(
          0,
          Math.min(1, (state.frameCount - cp.lastPulseTime) / 45),
        );
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - sRatio})`;
        ctx.lineWidth = 4 * (1 - sRatio);
        ctx.beginPath();
        const shockRadius = Math.max(0, cp.radius * sRatio * 2);
        ctx.arc(cp.x, cp.y, shockRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 4. Progress bar
    const barW = 120;
    const barH = 12;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.beginPath();
    if (ctx.roundRect)
      ctx.roundRect(cp.x - barW / 2 - 2, cp.y - 132, barW + 4, barH + 4, 6);
    else ctx.rect(cp.x - barW / 2 - 2, cp.y - 132, barW + 4, barH + 4);
    ctx.fill();

    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    if (ctx.roundRect)
      ctx.roundRect(cp.x - barW / 2, cp.y - 130, barW * progressRatio, barH, 4);
    else ctx.rect(cp.x - barW / 2, cp.y - 130, barW * progressRatio, barH);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    const label =
      cp.state === "guarding" ? "🛡️ DIỆT THỦ VỆ" : "⚡ ĐANG CHIẾM ĐỨNG...";
    ctx.fillText(label, cp.x, cp.y - 145);

    ctx.restore();
  });
}

function drawPermanentScars(ctx) {
  if (!state.permanentScars) return;
  state.permanentScars.forEach((s) => {
    ctx.save();
    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
    grad.addColorStop(0, "rgba(20, 10, 0, 0.8)");
    grad.addColorStop(0.7, "rgba(40, 20, 0, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawItems(ctx) {
  if (!state.items) return;
  state.items.forEach((item) => {
    ctx.save();
    const pulse = Math.sin(state.frameCount * 0.1) * 5;
    const grad = ctx.createRadialGradient(
      item.x,
      item.y,
      0,
      item.x,
      item.y,
      item.radius + 20 + pulse,
    );
    grad.addColorStop(0, "rgba(0, 255, 255, 0.4)");
    grad.addColorStop(1, "rgba(0, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius + 20 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0ff";
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - item.radius);
    ctx.lineTo(item.x + item.radius, item.y);
    ctx.lineTo(item.x, item.y + item.radius);
    ctx.lineTo(item.x - item.radius, item.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(item.rewardType, item.x, item.y + item.radius + 25);
    ctx.restore();
  });
}

function drawSatellite(ctx) {
  const d = state.satelliteDrone;
  if (!d) return;

  ctx.save();
  ctx.fillStyle = "#0af";
  ctx.beginPath();
  ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(d.x - 15, d.y);
  ctx.lineTo(d.x + 15, d.y);
  ctx.stroke();
  ctx.restore();
}

function drawGodMode(ctx) {
  const gm = state.godMode;
  if (!gm || !gm.active) return;

  const p = state.player;
  ctx.save();
  const pulse = Math.sin(state.frameCount * 0.2) * 10;
  const grad = ctx.createRadialGradient(
    p.x,
    p.y,
    p.radius,
    p.x,
    p.y,
    p.radius + 40 + pulse,
  );
  grad.addColorStop(0, "rgba(255, 215, 0, 0.6)");
  grad.addColorStop(0.5, "rgba(255, 100, 0, 0.2)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = grad;
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius + 40 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ===== VẼ PUZZLE ZONE (RUNE STONES) =====
function drawPuzzleZone(ctx) {
  const pz = state.puzzleZone;
  if (!pz || pz.solved) return;

  // Vẽ Obelisk Gợi Ý
  const ox = pz.clueX,
    oy = pz.clueY;
  ctx.save();
  const obeliskPulse = Math.sin(state.frameCount * 0.05) * 6;
  const obeliskColor = pz.clueRevealed ? "#FFD700" : "#888888";
  ctx.shadowBlur = pz.clueRevealed ? 25 : 8;
  ctx.shadowColor = obeliskColor;
  ctx.strokeStyle = obeliskColor;
  ctx.lineWidth = 3;
  ctx.fillStyle = pz.clueRevealed
    ? "rgba(80,60,0,0.85)"
    : "rgba(30,30,30,0.85)";
  // Thân obelisk (hình thang đứng)
  const ow = 22,
    oh = 60 + obeliskPulse;
  ctx.beginPath();
  ctx.moveTo(ox - ow, oy + oh);
  ctx.lineTo(ox + ow, oy + oh);
  ctx.lineTo(ox + ow * 0.5, oy - oh * 0.5);
  ctx.lineTo(ox, oy - oh);
  ctx.lineTo(ox - ow * 0.5, oy - oh * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Icon
  ctx.shadowBlur = 0;
  ctx.fillStyle = obeliskColor;
  ctx.font = `bold 20px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pz.clueRevealed ? "!" : "?", ox, oy);
  // Label
  ctx.font = "13px Arial";
  ctx.fillStyle = obeliskColor;
  ctx.fillText(
    pz.clueRevealed ? pz.orderDisplay : "ĐẾN GẦN ĐỂ XEM GỢI Ý",
    ox,
    oy + oh + 18,
  );
  ctx.restore();

  // Vẽ các Rune
  pz.runes.forEach((rune) => {
    ctx.save();
    const pulse = Math.sin(state.frameCount * 0.08 + rune.step) * 8;
    const isPending = rune.runeState === "pending";
    const isActivated = rune.runeState === "activated" || rune.activated;
    const isNext = rune.step === pz.currentStep && !isActivated && !isPending;
    const color = isActivated
      ? "#00ffcc"
      : isPending
        ? "#ff9900"
        : isNext
          ? "#ffff00"
          : "#9933ff";

    // Vòng sáng nền
    const grad = ctx.createRadialGradient(
      rune.x,
      rune.y,
      0,
      rune.x,
      rune.y,
      65 + pulse,
    );
    grad.addColorStop(
      0,
      isActivated
        ? "rgba(0,255,200,0.35)"
        : isPending
          ? "rgba(255,100,0,0.35)"
          : "rgba(150,0,255,0.2)",
    );
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rune.x, rune.y, 65 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Hình thoi
    ctx.shadowBlur = isActivated ? 28 : isPending ? 20 : 12;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = isPending ? 4 : 3;
    ctx.fillStyle = isActivated
      ? "rgba(0,255,200,0.5)"
      : isPending
        ? "rgba(120,50,0,0.85)"
        : "rgba(60,0,120,0.8)";
    const s = 30 + pulse * 0.3;
    ctx.beginPath();
    ctx.moveTo(rune.x, rune.y - s);
    ctx.lineTo(rune.x + s * 0.7, rune.y);
    ctx.lineTo(rune.x, rune.y + s);
    ctx.lineTo(rune.x - s * 0.7, rune.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ký hiệu rune (A/B/C/D) — luôn hiển thị
    ctx.shadowBlur = 0;
    ctx.fillStyle = isActivated ? "#00ffcc" : isPending ? "#ffcc66" : "#fff";
    ctx.font = `bold 22px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rune.symbol, rune.x, rune.y);

    // Label trạng thái
    ctx.font = "13px Arial";
    ctx.fillStyle = color;
    if (isActivated) ctx.fillText("✔ KẾT NẠP", rune.x, rune.y + s + 18);
    else if (isPending)
      ctx.fillText("⚔ TIÊU DIỆT CANH GIỮ!", rune.x, rune.y + s + 18);

    ctx.restore();
  });
}

// ===== VẼ CỔNG DỊCH CHUYỂN =====
function drawStagePortal(ctx) {
  const portal = state.stagePortal;
  if (!portal || !portal.active) return;

  const { x, y, radius, pulse } = portal;
  const t = pulse || 0;
  const breathe = Math.sin(t * 0.05) * 10;

  ctx.save();
  // Vùng sáng ngoài
  const outerGrad = ctx.createRadialGradient(
    x,
    y,
    0,
    x,
    y,
    radius * 2.5 + breathe,
  );
  outerGrad.addColorStop(0, "rgba(180,0,255,0.3)");
  outerGrad.addColorStop(0.5, "rgba(80,0,200,0.15)");
  outerGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5 + breathe, 0, Math.PI * 2);
  ctx.fill();

  // Vòng xoáy portal
  ctx.globalCompositeOperation = "lighter";
  for (let ring = 0; ring < 3; ring++) {
    const ringR = radius * (0.5 + ring * 0.25) + breathe * 0.3;
    const alpha = 0.7 - ring * 0.2;
    ctx.strokeStyle = `rgba(220,0,255,${alpha})`;
    ctx.lineWidth = 4 - ring;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#cc00ff";
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  // Lõi portal xoay
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.04);
  const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.8);
  innerGrad.addColorStop(0, "rgba(255,255,255,0.9)");
  innerGrad.addColorStop(0.4, "rgba(200,0,255,0.8)");
  innerGrad.addColorStop(1, "rgba(60,0,150,0.2)");
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
  // Hình sao xoay trong lõi
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * radius * 0.7, Math.sin(a) * radius * 0.7);
    ctx.stroke();
  }
  ctx.restore();

  // Label
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#cc00ff";
  ctx.fillText("⚡ CỔNG BOSS ⚡", x, y - radius - 18);
  ctx.restore();
}

// ===== HUD: ĐIỀU KIỆN QUA MÀN =====
function drawStageConditionsHUD(ctx, canvas) {
  const pz = state.currentPuzzle;
  const type = state.currentPuzzleType;

  const cp = state.capturePoints || [];
  const sz = state.swarmZones || [];

  const puzzleDone = pz?.solved === true;
  const swarmCount = sz.filter((z) => z.isCompleted).length;
  const swarmTotal = sz.length;
  const specialCount = cp.filter((c) => c.state === "completed").length;

  const allDone =
    puzzleDone &&
    swarmCount >= swarmTotal &&
    swarmTotal > 0 &&
    specialCount >= 2;

  // Nếu xong hết và cổng đã mở thì ẩn HUD này đi
  if (allDone && state.stagePortal?.active) return;

  ctx.save();

  // --- 1. CHUẨN BỊ MẢNG CHỨA CÁC DÒNG TEXT ---
  const lines = [];

  const nameMap = {
    domino: "⚡ Domino",
    melody: "🎵 Melody",
    torch: "🔥 Torch",
    rune: "🔮 Rune",
  };
  const pzName = nameMap[type] || "🧩 Puzzle";

  // Xử lý logic text cho Puzzle
  if (pz && type) {
    if (puzzleDone) {
      lines.push({ text: `${pzName}: Hoàn thành ✔️`, color: "#00ffcc" });
    } else {
      if (type === "rune") {
        // --- LOGIC MỚI CHO RUNE ---
        const activatedCount = pz.runes
          ? pz.runes.filter((r) => r.activated).length
          : 0;
        const totalCount = pz.runes ? pz.runes.length : 4;

        if (!pz.clueRevealed) {
          lines.push({
            text: `${pzName}: Tìm Bia Đá (Obelisk)`,
            color: "#ffaa00",
          });
        } else {
          lines.push({
            text: `${pzName}: ${activatedCount}/${totalCount}`,
            color: "#fff",
          });

          // Từ điển công thức để HUD tự động build text
          const RECIPES = {
            steam: "Fire + Ice",
            plasma: "Fire + Lightning",
            blaze: "Fire + Wind",
            magma: "Fire + Earth",
            frostbite: "Ice + Lightning",
            blizzard: "Ice + Wind",
            glacier: "Ice + Earth",
            storm: "Lightning + Wind",
            magnet: "Lightning + Earth",
            sandstorm: "Wind + Earth",
          };

          // Push từng dòng công thức của 4 Rune vào mảng
          if (pz.runes) {
            pz.runes.forEach((r) => {
              const formula = RECIPES[r.element] || "? + ?";
              // Viết hoa chữ cái đầu (VD: magnet -> Magnet)
              const elName =
                r.element.charAt(0).toUpperCase() + r.element.slice(1);

              const isDone = r.activated;
              const status = isDone ? "1/1 ✔️" : "0/1";
              const color = isDone ? "#00ffcc" : "#aaaaaa"; // Đã xong thì sáng màu lục, chưa thì màu xám

              lines.push({
                text: `  ↳ ${elName} = ${formula} (${status})`,
                color: color,
              });
            });
          }
        }
      } else {
        // --- LOGIC CHO CÁC PUZZLE KHÁC ---
        let puzzleLabel = "...";
        switch (type) {
          case "domino":
            puzzleLabel = `${pz.currentIndex || 0}/${pz.tiles?.length || 0}`;
            break;
          case "melody":
            puzzleLabel = `${pz.input?.length || 0}/${pz.sequence?.length || 0}`;
            break;
          case "torch":
            const lit = pz.torches?.filter((t) => t.lit).length || 0;
            puzzleLabel = `${lit}/${pz.torches?.length || 0}`;
            break;
        }
        lines.push({ text: `${pzName}: ${puzzleLabel}`, color: "#fff" });
      }
    }
  }

  // Xử lý logic text cho Swarm và Cứ Điểm
  const swarmColor = swarmCount >= swarmTotal ? "#00ffcc" : "#fff";
  lines.push({
    text: `💀 Swarm Zone: ${swarmCount}/${swarmTotal}`,
    color: swarmColor,
  });

  const specialColor = specialCount >= 2 ? "#00ffcc" : "#fff";
  lines.push({ text: `🚩 Cứ điểm: ${specialCount}/2`, color: specialColor });

  // --- 2. TÍNH TOÁN KÍCH THƯỚC PANEL LINH HOẠT ---
  const lineHeight = 20;
  const padding = 15;
  const panelW = 270; // Mở rộng chiều ngang một chút để chữ không bị tràn
  const panelH = padding * 2 + (lines.length - 1) * lineHeight;

  const panelX = canvas.width - panelW - 10;
  const panelY = 310;

  // Vẽ Background Panel
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  else ctx.rect(panelX, panelY, panelW, panelH);
  ctx.fill();
  ctx.stroke();

  // --- 3. VẼ TỪNG DÒNG TEXT ---
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";

  let currentY = panelY + padding + 10; // Căn chỉnh dòng đầu tiên
  lines.forEach((line) => {
    ctx.fillStyle = line.color;
    // Highlight bóng mờ nhẹ nếu dòng text đó đã hoàn thành
    if (line.color === "#00ffcc") {
      ctx.shadowBlur = 5;
      ctx.shadowColor = "#00ffcc";
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillText(line.text, panelX + 15, currentY);
    currentY += lineHeight;
  });

  ctx.restore();
}

export function hexToRgba(hex, alpha) {
  const v = hex.replace("#", "");
  const n = parseInt(v, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const bl = n & 255;
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}
function drawElementalZoneVFX(ctx, z) {
  const lifeRatio = Math.max(0, z.life / z.maxLife);
  const t = state.frameCount * 0.05 + z.pulseSeed;
  const pulse = 0.85 + Math.sin(t * 2) * 0.15;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // outer glow
  const glow = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.radius * 1.35);
  glow.addColorStop(0, hexToRgba(z.color, 0.35 * lifeRatio));
  glow.addColorStop(0.35, hexToRgba(z.color, 0.18 * lifeRatio));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(z.x, z.y, z.radius * pulse, 0, Math.PI * 2);
  ctx.fill();

  // core
  ctx.fillStyle = hexToRgba(z.color, 0.08 + 0.06 * lifeRatio);
  ctx.beginPath();
  ctx.arc(z.x, z.y, z.radius * 0.72, 0, Math.PI * 2);
  ctx.fill();

  // rotating ring
  ctx.strokeStyle = hexToRgba(z.color, 0.6 * lifeRatio);
  ctx.lineWidth = z.isMerged ? 4 : 2.5;
  ctx.setLineDash(z.isMerged ? [12, 8] : [8, 10]);
  ctx.lineDashOffset = -state.frameCount * (z.isMerged ? 1.6 : 0.9);
  ctx.beginPath();
  ctx.arc(z.x, z.y, z.radius * 0.98, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // inner orbit sparks
  const sparkCount = z.isMerged ? 14 : 8;
  for (let i = 0; i < sparkCount; i++) {
    const a = t * (z.isMerged ? 1.8 : 1.2) + (i / sparkCount) * Math.PI * 2;
    const r = z.radius * (0.35 + (i % 2) * 0.25);
    const sx = z.x + Math.cos(a) * r;
    const sy = z.y + Math.sin(a) * r;

    ctx.fillStyle = hexToRgba(z.color, 0.8 - i / (sparkCount * 1.2));
    ctx.beginPath();
    ctx.arc(sx, sy, z.isMerged ? 2.2 : 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // merged text / label
  if (z.isMerged) {
    ctx.globalAlpha = 0.75 * lifeRatio;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.strokeText(z.element.toUpperCase(), z.x, z.y - z.radius - 10);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(z.element.toUpperCase(), z.x, z.y - z.radius - 10);
  }

  ctx.restore();
}
function drawThemedBackground(ctx) {
  const theme = state.currentMapTheme || "fire";
  const w = state.world.width;
  const h = state.world.height;
  const cx = state.camera.x;
  const cy = state.camera.y;
  const cw = state.camera.width;
  const ch = state.camera.height;
  const t = state.frameCount;

  ctx.save();

  // ==========================================
  // 1. TÔ NỀN GỐC (Tối ưu: Chỉ fill vùng Camera)
  // ==========================================
  let colors = {
    fire: ["#1a0500", "#050100"],
    earth: ["#1a1000", "#050300"],
    ice: ["#001122", "#00050a"],
    wind: ["#001a1a", "#000505"],
    thunder: ["#0a001a", "#05000a"],
    void: ["#030005", "#000000"],
    glitch: ["#050505", "#000000"],
    omni: [`hsla(${(t * 0.5) % 360}, 50%, 8%, 1)`, "#000000"],
  };

  let cSet = colors[theme] || colors.fire;
  let bgGrad = ctx.createRadialGradient(
    cx + cw / 2,
    cy + ch / 2,
    0,
    cx + cw / 2,
    cy + ch / 2,
    cw,
  );
  bgGrad.addColorStop(0, cSet[0]);
  bgGrad.addColorStop(1, cSet[1]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(cx, cy, cw, ch);

  // ==========================================
  // 2. LƯỚI KHÔNG GIAN ĐỔI MÀU THEO THEME
  // ==========================================
  const gridSize = 100;
  // Căn chỉnh điểm bắt đầu để lưới di chuyển trơn tru theo camera
  const startX = Math.floor(cx / gridSize) * gridSize;
  const startY = Math.floor(cy / gridSize) * gridSize;

  let gridAlpha = 0.05;
  let gridColor = "255, 255, 255";

  if (theme === "fire") gridColor = "255, 60, 0";
  if (theme === "earth") gridColor = "200, 100, 0";
  if (theme === "ice") gridColor = "0, 200, 255";
  if (theme === "wind") gridColor = "0, 255, 200";
  if (theme === "thunder") gridColor = "200, 0, 255";
  if (theme === "void") {
    gridColor = "100, 0, 255";
    gridAlpha = 0.03;
  }
  if (theme === "glitch") {
    gridColor = t % 10 < 2 ? "255, 0, 255" : "0, 255, 0";
    gridAlpha = 0.1;
    // Hiệu ứng giật hình ma trận nhẹ
    if (t % 20 < 2)
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  }
  if (theme === "omni") {
    gridColor = `${Math.floor((Math.sin(t * 0.05) + 1) * 127)}, ${Math.floor((Math.cos(t * 0.05) + 1) * 127)}, 255`;
    gridAlpha = 0.08;
  }

  ctx.strokeStyle = `rgba(${gridColor}, ${gridAlpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();

  // Chỉ vẽ những đoạn thẳng đi ngang qua màn hình người chơi
  for (let x = startX; x <= cx + cw; x += gridSize) {
    ctx.moveTo(x, Math.max(0, cy));
    ctx.lineTo(x, Math.min(h, cy + ch));
  }
  for (let y = startY; y <= cy + ch; y += gridSize) {
    ctx.moveTo(Math.max(0, cx), y);
    ctx.lineTo(Math.min(w, cx + cw), y);
  }
  ctx.stroke();

  // ==========================================
  // 3. HIỆU ỨNG TRANG TRÍ ĐỘC QUYỀN THEO BẢN ĐỒ
  // ==========================================
  ctx.globalCompositeOperation = "lighter";

  if (theme === "fire") {
    // Mạch dung nham tĩnh lặng
    const numVeins = 3;
    for (let i = 0; i < numVeins; i++) {
      ctx.beginPath();
      const vY = (h / numVeins) * i + 200;
      if (vY > cy - 300 && vY < cy + ch + 300) {
        // Render culling
        ctx.moveTo(cx, vY);
        for (let x = cx; x <= cx + cw; x += 100) {
          const wave = Math.sin(x * 0.005 + t * 0.02 + i) * 60;
          ctx.lineTo(x, vY + wave);
        }
        ctx.strokeStyle = `rgba(255, 60, 0, ${0.05 + Math.sin(t * 0.05) * 0.02})`;
        ctx.lineWidth = 80;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 150, 0, 0.1)";
        ctx.lineWidth = 20;
        ctx.stroke();
      }
    }
  } else if (theme === "wind") {
    // Vệt gió lốc vờn xung quanh
    ctx.strokeStyle = "rgba(0, 255, 200, 0.05)";
    ctx.lineWidth = 40;
    for (let i = 0; i < 5; i++) {
      let wx = cx + ((t * 2 + i * 500) % (cw + 1000)) - 500;
      ctx.beginPath();
      ctx.arc(wx, cy + ch / 2 + Math.sin(t * 0.02 + i) * 300, 200, 0, Math.PI);
      ctx.stroke();
    }
  } else if (theme === "glitch") {
    // Code rơi hắt mờ ở phía xa
    ctx.fillStyle = "rgba(0, 255, 0, 0.15)";
    ctx.font = "bold 20px monospace";
    for (let i = 0; i < 15; i++) {
      let bx = cx + ((Math.sin(i * 77) * cw) / 2 + cw / 2);
      let by = cy + ((t * 8 + i * 200) % (ch + 100)) - 50;
      ctx.fillText(Math.random() > 0.5 ? "1" : "0", bx, by);
    }
  } else if (theme === "void") {
    // Đám mây tinh vân tím đen
    ctx.fillStyle = "rgba(100, 0, 255, 0.1)";
    for (let i = 0; i < 10; i++) {
      let nx = cx + ((Math.sin(i * 99) * cw) / 2 + cw / 2);
      let ny = cy + ((Math.cos(i * 88) * ch) / 2 + ch / 2);
      ctx.beginPath();
      ctx.arc(nx, ny, Math.sin(t * 0.05 + i) * 30 + 50, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === "ice") {
    // Lớp sương giá lạnh lẽo bay bồng bềnh
    ctx.fillStyle = "rgba(0, 200, 255, 0.02)";
    for (let i = 0; i < 3; i++) {
      let ix = cx + Math.sin(t * 0.01 + i) * 100;
      let iy = cy + Math.cos(t * 0.01 + i) * 100;
      ctx.beginPath();
      ctx.ellipse(
        ix + cw / 2,
        iy + ch / 2,
        cw * 0.8,
        ch * 0.8,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  ctx.restore();
}
