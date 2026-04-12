import { state } from "../state.js";
import { spawnHazard } from "../entities/helpers.js";

export function initMapTheme() {
  // Lấy Theme chuẩn dựa trên chế độ đang chơi
  let bossType = "fire";
  if (state.bossArenaMode && state.bossArenaType) {
    bossType = state.bossArenaType;
  } else {
    bossType = state.selectedMap || state.pendingBossType || "fire";
  }

  state.currentMapTheme = bossType;

  // Dọn dẹp rác bẫy trang trí nếu có sót từ version cũ
  state.hazards = state.hazards.filter(h => h.owner !== "map");

  // Tắt các hiệu ứng toàn bản đồ mặc định
  state.globalHazard = {
    type: null,
    active: false,
    damage: 0,
  };
}