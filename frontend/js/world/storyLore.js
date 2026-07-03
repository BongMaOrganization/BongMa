import { state } from "../state.js";

/**
 * Cốt truyện — Asynchronous Echoes
 * Mỗi map là một miền sụp đổ của một Bá Chủ Nguyên Tố.
 */

export const MAP_LORE = {
  fire: {
    realm: "Vực Hỏa Diệm",
    boss: "Hỏa Vương",
    bossTitle: "Bá Chủ Thiêu Đốt",
    bossDesc:
      "Kẻ từng là người bảo vệ lò phản ứng cốt lõi. Khi Trạm Không Gian nứt vỡ, lửa của hắn nuốt chửa cả ký ức lẫn lý trí.",
    intro:
      "Tín hiệu nhiệt độ vượt ngưỡng an toàn. Đây là tàn tích của Vực Hỏa — nơi thời gian bị thiêu cháy thành tro.",
  },
  ice: {
    realm: "Vực Băng Vĩnh Cửu",
    boss: "Băng Hậu",
    bossTitle: "Nữ Hoàng Tuyệt Tự",
    bossDesc:
      "Bà ta đóng băng mọi Echo đi qua để 'bảo vệ' họ khỏi sự tan rã. Không ai thoát khỏi giấc ngủ băng giá.",
    intro:
      "Hơi thở bạn đọng thành sương. Vực Băng giữ ký ức ở trạng thái tĩnh lặng — mãi mãi.",
  },
  earth: {
    realm: "Vực Địa Tầng",
    boss: "Địa Chấn Vương",
    bossTitle: "Kẻ Nắm Giữ Mảnh Vỡ",
    bossDesc:
      "Hắn tin rằng nếu giữ chặt mọi mảnh Trạm Không Gian, thế giới sẽ không sụp. Nhưng trọng lực của lòng tham đã nghiền nát tất cả.",
    intro:
      "Mảnh đá rung nhẹ dưới chân. Vực Đất chìm trong im lặng — im lặng của thứ đang chết dần.",
  },
  wind: {
    realm: "Vực Gió Tận Cùng",
    boss: "Phong Thần",
    bossTitle: "Linh Hồn Cuồng Phong",
    bossDesc:
      "Hắn là cơn bão không bao giờ dứt, thổi tan mọi Echo thành bụi và gom chúng thành ảo ảnh tấn công bạn.",
    intro:
      "Gió rít qua khe nứt không gian. Đây là miền của Phong Thần — nơi không gì tồn tại lâu.",
  },
  thunder: {
    realm: "Vực Lôi Quang",
    boss: "Lôi Thần",
    bossTitle: "Thẩm Phán Điện Quang",
    bossDesc:
      "Hắn phán xét mọi Echo là 'lỗi thời gian' và xoá chúng bằng sét. Bạn cũng chỉ là một lỗi trong mắt hắn.",
    intro:
      "Tĩnh điện bám vào da. Vực Sấm chờ một bản án cuối cùng — và bạn là bị cáo.",
  },
  omni: {
    realm: "Trung Tâm Trạm Không Gian",
    boss: "Chúa Tể Nguyên Tố",
    bossTitle: "Thực Thể Gốc",
    bossDesc:
      "Trước khi Trạm nứt vỡ, hắn giữ cân bằng năm nguyên tố. Khi chia thành năm Bá Chủ, phần còn lại — đau đớn và điên loạn — hợp nhất thành thực thể này. Hắn dùng sức mạnh của cả năm miền.",
    intro:
      "Năm màu nguyên tố xoáy quanh bạn. Đây không phải lãnh địa của một Bá Chủ — đây là trái tim của Trạm, nơi mọi thứ bắt đầu và nơi mọi thứ sẽ kết thúc.",
  },
};

const ROOM_LORE = {
  start: (map) =>
    `[${map.realm}] Bạn là Echo — bóng ma của một vòng lặp thời gian. Mỗi lần chết, một Echo mới thức dậy. Những bóng ma quanh bạn? Là chính bạn, từ các run trước.`,
  combat: (map) =>
    `Tinh linh ${map.realm.split(" ").pop()} bám theo dấu vết năng lượng của bạn. Dọn sạch chúng — cửa mới mở.`,
  swarm: (map) =>
    `Đám đông Echo hỗn loạn tụ lại đây. Chúng không biết mình đã chết. Tiêu diệt đủ số lượng để ổn định vùng.`,
  puzzle: (map) =>
    `${map.boss} khắc phép thử vào từng phòng. Giải xong — bạn mới hiểu cách hắn suy nghĩ.`,
  capture: (map, order) =>
    order === 1
      ? `Cột tín hiệu ${map.realm} còn sót. Chiếm giữ điểm này để lấy lại quyền kiểm soát khu vực.`
      : `Mảnh ghép thứ hai của lưới điều hướng. ${map.boss} không muốn bạn nối liền hai điểm này.`,
  heal: () =>
    "Trạm sơ cứu cũ vẫn còn dấu vết năng lượng sinh mệnh. Ai từng chiến đấu ở đây cũng cần được nghỉ.",
  upgrade: () =>
    "Buồng nghiên cứu Echo. Công nghệ cũ vẫn có thể đúc lại sức mạnh từ dòng thời gian của bạn.",
  treasure: (map) =>
    `Kho đồ bỏ hoang. Những chiến binh trước đã chết trước khi kịp mang theo phần thưởng.`,
  boss_gate: (map) =>
    `「${map.boss} — ${map.bossTitle}」\n${map.bossDesc}\n\nCổng phía trước rung chuyển. Đây là lối vào lãnh địa của hắn.`,
};

const PROGRESS_LORE = {
  fire: [
    "Nghe đồn Trạm Không Gian từng dùng lửa để đốt cháy thời gian thừa — cho phép mọi người sống lại một ngày.",
    "Hỏa Vương là người vận hành lò. Khi lò nứt, hắn chọn thiêu đốt thế giới thay vì tắt nó.",
  ],
  ice: [
    "Băng Hậu từng bảo quản ký ức của toàn Trạm. Bà ấy sợ quên lãng hơn sợ cái chết.",
    "Mỗi Echo bị đóng băng là một câu chuyện bị cắt ngang — kể cả câu chuyện của bạn.",
  ],
  earth: [
    "Địa Chấn Vương giữ mảnh vỡ để vá Trạm. Nhưng càng vá, Trạm càng nặng — và sụp nhanh hơn.",
    "Dưới lớp đá là xương của những Echo không kịp chạy.",
  ],
  wind: [
    "Phong Thần là người đưa tin giữa các chiều không gian. Hắn trở thành bão khi không còn ai nghe.",
    "Những bóng ma quanh bạn? Gió thổi chúng vào mặt bạn — cố tình.",
  ],
  thunder: [
    "Lôi Thần giám sát dòng thời gian. Hắn phát hiện Echo là lỗi — và quyết xóa sạch.",
    "Sét không phân biệt kẻ tốt hay xấu. Chỉ phân biệt tồn tại hay không.",
    "Sau Lôi Thần… không còn miền nguyên tố nào. Chỉ còn Trung Tâm Trạm — và thứ đang thức giấc bên trong.",
  ],
  omni: [
    "Năm Bá Chủ không phải kẻ thù riêng lẻ. Họ là mảnh vỡ của cùng một thực thể — Chúa Tể Nguyên Tố.",
    "Mỗi Echo bạn gặp là một vòng lặp thất bại trước đó. Họ chết ở đây để bạn học cách sống sót lần này.",
    "Trạm Không Gian không sụp vì tai nạn. Nó sụp vì ai đó cố giữ thời gian lại — và thất bại.",
    "Chúa Tể Nguyên Tố không muốn giết bạn. Hắn muốn xóa lỗi thời gian — tức là xóa chính bạn.",
  ],
};

export function getMapLore(mapId) {
  return MAP_LORE[mapId] || MAP_LORE.fire;
}

export function buildStorySigns(rooms, mapId) {
  const map = getMapLore(mapId);
  const signs = [];
  let progressIdx = 0;
  const progressPool = PROGRESS_LORE[mapId] || [];

  const sorted = [...rooms].sort((a, b) => (a.bfsDist || 0) - (b.bfsDist || 0));

  for (const room of sorted) {
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    let text = "";
    let title = "Bia ghi";

    if (room.type === "start") {
      title = `📡 ${map.realm}`;
      text = `${map.intro}\n\n${ROOM_LORE.start(map)}`;
    } else if (ROOM_LORE[room.type]) {
      const fn = ROOM_LORE[room.type];
      title =
        room.type === "boss_gate"
          ? `⚠ ${map.boss}`
          : room.type === "puzzle"
            ? "🧩 Phép thử"
            : room.type === "capture"
              ? `🚩 Cứ điểm ${room.captureOrder || ""}`
              : "◈ Ghi chép";
      text =
        room.type === "capture"
          ? fn(map, room.captureOrder)
          : typeof fn === "function"
            ? fn(map)
            : fn;
    }

    if (progressIdx < progressPool.length && room.bfsDist >= 2 && room.type !== "start") {
      text += `\n\n—\n${progressPool[progressIdx]}`;
      progressIdx++;
    }

    if (!text) continue;

    signs.push({
      id: `sign_${room.id}`,
      roomId: room.id,
      roomType: room.type,
      x: cx,
      y: cy - room.h * 0.28,
      title,
      text,
      read: false,
      mapId,
    });
  }

  return signs;
}

export function updateStorySigns(player) {
  if (!state.storySigns?.length || !player) return;

  for (const sign of state.storySigns) {
    if (sign.read) continue;
    const dx = player.x - sign.x;
    const dy = player.y - sign.y;
    if (Math.hypot(dx, dy) > 90) continue;

    sign.read = true;
    if (!state.storyLog) state.storyLog = [];
    state.storyLog.push({ title: sign.title, text: sign.text, mapId: sign.mapId });

    state.floatingTexts.push({
      x: sign.x,
      y: sign.y - 70,
      text: sign.title,
      color: "#e0c080",
      size: 20,
      life: 140,
      opacity: 1,
    });

    state.storyToast = {
      title: sign.title,
      text: sign.text,
      timer: 360,
    };
    break;
  }

  if (state.storyToast?.timer > 0) state.storyToast.timer--;
  if (state.storyToast?.timer <= 0) state.storyToast = null;
}

export function drawStorySigns(ctx) {
  if (!state.storySigns) return;
  const cx = state.camera.x;
  const cy = state.camera.y;
  const cw = state.camera.width;
  const ch = state.camera.height;

  for (const sign of state.storySigns) {
    if (sign.x < cx - 60 || sign.x > cx + cw + 60 || sign.y < cy - 60 || sign.y > cy + ch + 60) {
      continue;
    }

    ctx.save();
    const read = sign.read;
    ctx.fillStyle = read ? "rgba(80,70,50,0.5)" : "rgba(120,90,40,0.75)";
    ctx.strokeStyle = read ? "#887755" : "#ffd080";
    ctx.lineWidth = 2;
    ctx.fillRect(sign.x - 28, sign.y - 36, 56, 72);
    ctx.strokeRect(sign.x - 28, sign.y - 36, 56, 72);

    ctx.font = "22px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = read ? "#aa9977" : "#ffe8b0";
    ctx.fillText("📜", sign.x, sign.y + 4);

    if (!read) {
      ctx.globalAlpha = 0.5 + Math.sin(state.frameCount * 0.1) * 0.3;
      ctx.strokeStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(sign.x, sign.y, 42, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawStoryToast(ctx, canvas) {
  const toast = state.storyToast;
  if (!toast || toast.timer <= 0) return;

  const alpha = Math.min(1, toast.timer / 60);
  const panelW = Math.min(520, canvas.width - 80);
  const x = (canvas.width - panelW) / 2;
  const y = canvas.height - 200;

  ctx.save();
  ctx.globalAlpha = alpha * 0.95;
  ctx.fillStyle = "rgba(6, 8, 18, 0.92)";
  ctx.strokeStyle = "#c9a050";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, panelW, 130, 10);
  else ctx.fillRect(x, y, panelW, 130);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(201, 160, 80, 0.15)";
  ctx.fillRect(x + 1, y + 1, panelW - 2, 28);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffd080";
  ctx.font = "bold 14px Orbitron, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("📜 " + toast.title, x + 16, y + 20);

  ctx.fillStyle = "#ccc";
  ctx.font = "16px Rajdhani, sans-serif";
  const lines = wrapText(ctx, toast.text.replace(/\n\n/g, " "), panelW - 32);
  lines.slice(0, 4).forEach((line, i) => {
    ctx.fillText(line, x + 16, y + 48 + i * 18);
  });
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
